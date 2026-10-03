import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Role } from '../auth/enums/role.enum';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { OrderEntity } from '../orders/order.entity';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { UserEntity } from '../users/user.entity';

interface SocketAuthData {
  user?: JwtPayload;
}

interface JoinOrderMessage {
  orderId: string;
}

interface LocationUpdateMessage {
  orderId: string;
  latitude: number;
  longitude: number;
}

interface CustomRequestBroadcast {
  request_id: string;
  item_description: string;
  offered_price: string;
  created_at: Date;
}

const ONLINE_PARTNERS_ROOM = 'online_verified_partners';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowedOrigins = (
        process.env.WEBSOCKET_CORS_ORIGINS ??
        'http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080'
      )
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      callback(null, allowedOrigins.includes(origin));
    },
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepo: Repository<DeliveryPartnerEntity>,
  ) {}

  afterInit(server: Server) {
    server.use((client, next) => {
      void this.authenticate(client).then(
        () => next(),
        () => next(new Error('Unauthorized')),
      );
    });
  }

  handleConnection(client: Socket) {
    client.emit('connected', { userId: this.getUser(client)?.sub });
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @MessageBody() data: JoinOrderMessage,
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.requireUser(client);
    if (!this.isUuid(data?.orderId)) {
      throw new WsException('A valid orderId is required');
    }

    const order = await this.orderRepo.findOne({
      where: { id: data.orderId },
      select: {
        id: true,
        customer_id: true,
        partner_id: true,
      },
    });
    if (!order) {
      throw new WsException('Order not found');
    }
    if (
      user.role !== Role.ADMIN &&
      order.customer_id !== user.sub &&
      order.partner_id !== user.sub
    ) {
      throw new WsException('You cannot access this order');
    }

    await client.join(this.orderRoom(order.id));
    return { event: 'joined_order', status: 'success' };
  }

  @SubscribeMessage('join_partner_feed')
  async handleJoinPartnerFeed(@ConnectedSocket() client: Socket) {
    await this.assertOnlineVerifiedPartner(this.requireUser(client));
    await client.join(ONLINE_PARTNERS_ROOM);
    return { event: 'joined_partner_feed', status: 'success' };
  }

  @SubscribeMessage('update_location')
  async handleLocationUpdate(
    @MessageBody() data: LocationUpdateMessage,
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.requireUser(client);
    if (user.role !== Role.DELIVERY_PARTNER) {
      throw new WsException('Only delivery partners can share their location');
    }
    if (
      !this.isUuid(data?.orderId) ||
      !Number.isFinite(data?.latitude) ||
      !Number.isFinite(data?.longitude) ||
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new WsException('Valid orderId, latitude, and longitude are required');
    }

    await this.assertOnlineVerifiedPartner(user);
    const order = await this.orderRepo.findOne({
      where: { id: data.orderId },
      select: { id: true, partner_id: true },
    });
    if (!order) {
      throw new WsException('Order not found');
    }
    if (order.partner_id !== user.sub) {
      throw new WsException('You are not assigned to this order');
    }

    this.server.to(this.orderRoom(order.id)).emit('partner_location_updated', {
      partnerId: user.sub,
      lat: data.latitude,
      lng: data.longitude,
    });
    return { status: 'success' };
  }

  sendOrderStatusUpdate(orderId: string, status: string) {
    this.server
      .to(this.orderRoom(orderId))
      .emit('order_status_changed', { orderId, status });
  }

  broadcastCustomRequest(request: CustomRequestBroadcast) {
    this.server
      .to(ONLINE_PARTNERS_ROOM)
      .emit('new_custom_request', request);
  }

  broadcastRideRequest(
    driverIds: string[],
    ride: Record<string, unknown>,
  ) {
    for (const driverId of driverIds) {
      this.server.to(this.userRoom(driverId)).emit('new_ride_request', ride);
    }
  }

  broadcastRideStatus(
    userIds: string[],
    ride: { id: string; status: string; customer_id: string; driver_id: string | null },
  ) {
    const update = {
      ride_id: ride.id,
      status: ride.status,
      customer_id: ride.customer_id,
      driver_id: ride.driver_id,
    };
    for (const userId of userIds) {
      this.server.to(this.userRoom(userId)).emit('ride_status_changed', update);
    }
  }

  private async authenticate(
    client: Socket,
  ): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      throw new Error('Missing token');
    }

    let payload: unknown;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new Error('Invalid access token');
    }
    if (!this.isJwtPayload(payload)) {
      throw new Error('Invalid access token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: { id: true, phone: true, role: true, status: true },
    });
    if (
      !user ||
      user.phone !== payload.phone ||
      user.role !== payload.role ||
      user.status === 'BLOCKED' ||
      user.status === 'REJECTED'
    ) {
      throw new Error('Inactive account');
    }

    (client.data as SocketAuthData).user = payload;
    await client.join(this.userRoom(payload.sub));
    if (payload.role === Role.DELIVERY_PARTNER) {
      await this.joinPartnerFeed(client);
    }
  }

  private extractToken(client: Socket): string | null {
    const auth: unknown = client.handshake.auth;
    if (
      typeof auth === 'object' &&
      auth !== null &&
      'token' in auth &&
      typeof auth.token === 'string'
    ) {
      return auth.token.replace(/^Bearer\s+/i, '');
    }

    const authorization = client.handshake.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }
    return null;
  }

  private getUser(client: Socket): JwtPayload | null {
    const user = (client.data as SocketAuthData).user;
    return this.isJwtPayload(user) ? user : null;
  }

  private requireUser(client: Socket): JwtPayload {
    const user = this.getUser(client);
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  private async joinPartnerFeed(client: Socket): Promise<void> {
    const user = this.getUser(client);
    if (!user) {
      return;
    }

    const partner = await this.partnerRepo.findOne({
      where: {
        user_id: user.sub,
        is_online: true,
        kyc_status: 'VERIFIED',
      },
      select: { id: true },
    });
    if (partner) {
      await client.join(ONLINE_PARTNERS_ROOM);
    }
  }

  private async assertOnlineVerifiedPartner(user: JwtPayload): Promise<void> {
    if (user.role !== Role.DELIVERY_PARTNER) {
      throw new WsException('Only delivery partners can join this feed');
    }
    const partner = await this.partnerRepo.findOne({
      where: {
        user_id: user.sub,
        is_online: true,
        kyc_status: 'VERIFIED',
      },
      select: { id: true },
    });
    if (!partner) {
      throw new WsException('Partner must be verified and online');
    }
  }

  private isJwtPayload(value: unknown): value is JwtPayload {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    if (!('sub' in value) || !('phone' in value) || !('role' in value)) {
      return false;
    }
    return (
      typeof value.sub === 'string' &&
      typeof value.phone === 'string' &&
      Object.values(Role).some((role) => role === value.role)
    );
  }

  private isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_PATTERN.test(value);
  }

  private orderRoom(orderId: string): string {
    return `order_${orderId}`;
  }

  private userRoom(userId: string): string {
    return `user_${userId}`;
  }
}
