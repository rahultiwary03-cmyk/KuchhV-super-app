import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../auth/enums/role.enum';
import { OrderEntity } from '../orders/order.entity';
import { UserEntity } from '../users/user.entity';
import { DeliveryPartnerEntity } from './delivery-partner.entity';
import { EventsGateway } from '../events/events.gateway';
import { WorkflowOtpType } from '../../common/entities/otp-challenge.entity';
import { WorkflowOtpService } from '../../common/services/workflow-otp.service';
import { VerifyWorkflowOtpDto } from '../../common/dto/verify-workflow-otp.dto';
import {
  OnboardPartnerDto,
  ToggleOnlineDto,
  UpdateLocationDto,
} from './dto/delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepo: Repository<DeliveryPartnerEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly eventsGateway: EventsGateway,
    private readonly otpService: WorkflowOtpService,
  ) {}

  async onboardPartner(userId: string, dto: OnboardPartnerDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== Role.DELIVERY_PARTNER) {
      throw new BadRequestException(
        'User must have the DELIVERY_PARTNER role to onboard',
      );
    }

    const existing = await this.partnerRepo.findOne({
      where: { user_id: userId },
    });
    if (existing) {
      existing.vehicle_type = dto.vehicle_type;
      existing.vehicle_number = dto.vehicle_number;
      return this.partnerRepo.save(existing);
    }

    return this.partnerRepo.save(
      this.partnerRepo.create({
        user_id: userId,
        vehicle_type: dto.vehicle_type,
        vehicle_number: dto.vehicle_number,
      }),
    );
  }

  async toggleOnline(
    partnerId: string,
    userId: string,
    isAdmin: boolean,
    dto: ToggleOnlineDto,
  ) {
    const partner = await this.findPartner(partnerId, userId, isAdmin);
    if (dto.is_online && partner.kyc_status !== 'VERIFIED') {
      throw new BadRequestException(
        'Delivery partner KYC must be verified before going online',
      );
    }

    partner.is_online = dto.is_online;
    return this.partnerRepo.save(partner);
  }

  async updateLocation(
    partnerId: string,
    userId: string,
    isAdmin: boolean,
    dto: UpdateLocationDto,
  ) {
    const partner = await this.findPartner(partnerId, userId, isAdmin);
    partner.current_lat = String(dto.latitude);
    partner.current_lng = String(dto.longitude);
    return this.partnerRepo.save(partner);
  }

  async assignNearestPartner(orderId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(OrderEntity);
      const partners = manager.getRepository(DeliveryPartnerEntity);
      const order = await orders
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();

      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.partner_id || order.status !== 'PREPARING') {
        throw new ConflictException('Order is not available for assignment');
      }

      const onlinePartners = await partners
        .createQueryBuilder('partner')
        .setLock('pessimistic_write')
        .where('partner.is_online = :isOnline', { isOnline: true })
        .andWhere('partner.kyc_status = :kycStatus', {
          kycStatus: 'VERIFIED',
        })
        .getMany();
      if (onlinePartners.length === 0) {
        return {
          success: false,
          message: 'No online delivery partners available right now',
        };
      }

      const orderHasLocation = order.latitude !== null && order.longitude !== null;
      const eligiblePartners = onlinePartners.filter(
        (partner) =>
          !orderHasLocation ||
          (partner.current_lat !== null && partner.current_lng !== null),
      );
      if (eligiblePartners.length === 0) {
        return {
          success: false,
          message: 'No online delivery partners with a known location are available',
        };
      }

      eligiblePartners.sort((left, right) => {
        if (orderHasLocation) {
          const distanceDifference =
            this.distanceInKilometers(order, left) -
            this.distanceInKilometers(order, right);
          if (distanceDifference !== 0) {
            return distanceDifference;
          }
        }
        return left.id.localeCompare(right.id);
      });

      const assignedPartner = eligiblePartners[0];
      order.partner_id = assignedPartner.user_id;
      order.status = 'READY_FOR_PICKUP';
      await orders.save(order);

      return {
        success: true,
        message: `Order assigned to partner ${assignedPartner.id}`,
        partner_id: assignedPartner.user_id,
      };
    });
    if (result.success) {
      this.eventsGateway.sendOrderStatusUpdate(orderId, 'READY_FOR_PICKUP');
    }
    return result;
  }

  async verifyPickupOtp(
    orderId: string,
    partnerId: string,
    dto: VerifyWorkflowOtpDto,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(OrderEntity);
      const order = await orders
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.partner_id !== partnerId) {
        throw new ForbiddenException(
          'Only the assigned delivery partner can verify pickup',
        );
      }
      if (order.status !== 'READY_FOR_PICKUP') {
        throw new ConflictException('Order is not awaiting pickup');
      }

      const verified = await this.otpService.consume(
        {
          challengeId: dto.challenge_id,
          code: dto.otp,
          type: WorkflowOtpType.PICKUP,
          orderId,
        },
        manager,
      );
      if (!verified) return false;

      order.status = 'OUT_FOR_DELIVERY';
      await orders.save(order);
      return true;
    });
    if (!result) {
      throw new BadRequestException('Invalid, expired, or already used OTP');
    }
    this.eventsGateway.sendOrderStatusUpdate(orderId, 'OUT_FOR_DELIVERY');
    return { success: true, status: 'OUT_FOR_DELIVERY' };
  }

  async verifyHandoverOtp(
    orderId: string,
    partnerId: string,
    dto: VerifyWorkflowOtpDto,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(OrderEntity);
      const order = await orders
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.partner_id !== partnerId) {
        throw new ForbiddenException(
          'Only the assigned delivery partner can verify delivery',
        );
      }
      if (order.status !== 'OUT_FOR_DELIVERY') {
        throw new ConflictException('Order is not awaiting handover');
      }

      const verified = await this.otpService.consume(
        {
          challengeId: dto.challenge_id,
          code: dto.otp,
          type: WorkflowOtpType.HANDOVER,
          orderId,
        },
        manager,
      );
      if (!verified) return false;

      order.status = 'DELIVERED';
      await orders.save(order);
      return true;
    });
    if (!result) {
      throw new BadRequestException('Invalid, expired, or already used OTP');
    }
    this.eventsGateway.sendOrderStatusUpdate(orderId, 'DELIVERED');
    return { success: true, status: 'DELIVERED' };
  }

  private findPartner(id: string, userId: string, isAdmin: boolean) {
    return this.partnerRepo.findOne({ where: { id } }).then((partner) => {
      if (!partner) {
        throw new NotFoundException('Delivery partner not found');
      }
      if (!isAdmin && partner.user_id !== userId) {
        throw new ForbiddenException('You cannot manage this delivery partner');
      }
      return partner;
    });
  }

  private distanceInKilometers(
    order: OrderEntity,
    partner: DeliveryPartnerEntity,
  ): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitude = Number(order.latitude);
    const longitude = Number(order.longitude);
    const partnerLatitude = Number(partner.current_lat);
    const partnerLongitude = Number(partner.current_lng);
    const latitudeDifference = toRadians(partnerLatitude - latitude);
    const longitudeDifference = toRadians(partnerLongitude - longitude);
    const haversine =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(toRadians(latitude)) *
        Math.cos(toRadians(partnerLatitude)) *
        Math.sin(longitudeDifference / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }
}
