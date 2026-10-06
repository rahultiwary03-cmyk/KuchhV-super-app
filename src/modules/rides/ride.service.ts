import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { WorkflowOtpType } from '../../common/entities/otp-challenge.entity';
import { WorkflowOtpService } from '../../common/services/workflow-otp.service';
import { EventsGateway } from '../events/events.gateway';
import { Role } from '../auth/enums/role.enum';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { WalletService } from '../wallet/wallet.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import {
  WalletTransactionDirection,
  WalletTransactionType,
} from '../wallet/wallet-transaction.entity';
import { UserEntity } from '../users/user.entity';
import { BookRideDto, VerifyRideOtpDto } from './dto/ride.dto';
import { RideEntity, RideStatus, RideVehicleType } from './ride.entity';

const FARE_DEFAULTS: Record<RideVehicleType, { base: number; perKm: number }> = {
  [RideVehicleType.BIKE]: { base: 20, perKm: 8 },
  [RideVehicleType.AUTO]: { base: 30, perKm: 12 },
  [RideVehicleType.CAB]: { base: 50, perKm: 18 },
};

@Injectable()
export class RideService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(RideEntity)
    private readonly rideRepo: Repository<RideEntity>,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepo: Repository<DeliveryPartnerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly eventsGateway: EventsGateway,
    private readonly otpService: WorkflowOtpService,
    private readonly walletService: WalletService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async book(customerId: string, dto: BookRideDto) {
    const customer = await this.userRepo.findOne({
      where: { id: customerId, role: Role.CUSTOMER },
      select: { id: true },
    });
    if (!customer) {
      throw new ForbiddenException('Only customers can book rides');
    }

    const distanceKm = this.distanceKm(
      dto.pickup_latitude,
      dto.pickup_longitude,
      dto.drop_latitude,
      dto.drop_longitude,
    );
    if (distanceKm <= 0) {
      throw new BadRequestException('Pickup and drop locations must differ');
    }
    const estimatedFare = this.calculateFare(dto.vehicle_type, distanceKm);
    const ride = await this.rideRepo.save(
      this.rideRepo.create({
        customer_id: customerId,
        driver_id: null,
        vehicle_type: dto.vehicle_type,
        pickup_latitude: String(dto.pickup_latitude),
        pickup_longitude: String(dto.pickup_longitude),
        drop_latitude: String(dto.drop_latitude),
        drop_longitude: String(dto.drop_longitude),
        distance_km: distanceKm.toFixed(2),
        estimated_fare: estimatedFare.toFixed(2),
        final_fare: null,
        driver_earnings: null,
        platform_commission: null,
        settled_at: null,
        status: RideStatus.REQUESTED,
      }),
    );

    const matchingPartners = await this.partnerRepo.find({
      where: {
        vehicle_type: dto.vehicle_type,
        is_online: true,
        kyc_status: 'VERIFIED',
      },
      select: {
        user_id: true,
        current_lat: true,
        current_lng: true,
      },
    });
    const matchRadiusKm = this.getPositiveConfigNumber(
      'RIDE_MATCH_RADIUS_KM',
      5,
    );
    const nearbyDriverIds = matchingPartners
      .filter(
        (partner) =>
          partner.current_lat !== null &&
          partner.current_lng !== null &&
          this.distanceKm(
            dto.pickup_latitude,
            dto.pickup_longitude,
            Number(partner.current_lat),
            Number(partner.current_lng),
          ) <= matchRadiusKm,
      )
      .map((partner) => partner.user_id);

    if (nearbyDriverIds.length) {
      this.eventsGateway.broadcastRideRequest(nearbyDriverIds, {
        ride_id: ride.id,
        vehicle_type: ride.vehicle_type,
        pickup_latitude: ride.pickup_latitude,
        pickup_longitude: ride.pickup_longitude,
        drop_latitude: ride.drop_latitude,
        drop_longitude: ride.drop_longitude,
        distance_km: ride.distance_km,
        estimated_fare: ride.estimated_fare,
        created_at: ride.created_at,
      });
    }

    return {
      ride,
      nearby_drivers_notified: nearbyDriverIds.length,
    };
  }

  async accept(rideId: string, driverId: string) {
    const acceptedRide = await this.dataSource.transaction(async (manager) => {
      const rides = manager.getRepository(RideEntity);
      const ride = await rides
        .createQueryBuilder('ride')
        .setLock('pessimistic_write')
        .where('ride.id = :rideId', { rideId })
        .getOne();
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }
      if (ride.status !== RideStatus.REQUESTED || ride.driver_id) {
        throw new ConflictException('Ride is no longer available');
      }

      const partner = await manager
        .getRepository(DeliveryPartnerEntity)
        .createQueryBuilder('partner')
        .setLock('pessimistic_write')
        .where('partner.user_id = :driverId', { driverId })
        .andWhere('partner.vehicle_type = :vehicleType', {
          vehicleType: ride.vehicle_type,
        })
        .andWhere('partner.is_online = :isOnline', { isOnline: true })
        .andWhere('partner.kyc_status = :kycStatus', {
          kycStatus: 'VERIFIED',
        })
        .getOne();
      if (!partner) {
        throw new ForbiddenException(
          'An online, verified driver with the requested vehicle is required',
        );
      }
      const pickupDistance = this.distanceKm(
        Number(ride.pickup_latitude),
        Number(ride.pickup_longitude),
        Number(partner.current_lat),
        Number(partner.current_lng),
      );
      if (
        partner.current_lat === null ||
        partner.current_lng === null ||
        pickupDistance >
          this.getPositiveConfigNumber('RIDE_MATCH_RADIUS_KM', 5)
      ) {
        throw new ForbiddenException(
          'Driver is no longer within the ride matching radius',
        );
      }

      const activeRide = await rides.findOne({
        where: [
          { driver_id: driverId, status: RideStatus.ACCEPTED },
          { driver_id: driverId, status: RideStatus.IN_PROGRESS },
        ],
        select: { id: true },
      });
      if (activeRide) {
        throw new ConflictException('Driver already has an active ride');
      }

      ride.driver_id = driverId;
      ride.status = RideStatus.ACCEPTED;
      return rides.save(ride);
    });
    this.eventsGateway.broadcastRideStatus(
      [acceptedRide.customer_id, driverId],
      acceptedRide,
    );
    return acceptedRide;
  }

  async generateStartOtp(rideId: string, customerId: string) {
    const ride = await this.rideRepo.findOne({
      where: { id: rideId, customer_id: customerId },
      relations: { customer: true },
    });
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }
    if (ride.status !== RideStatus.ACCEPTED || !ride.driver_id) {
      throw new ConflictException('Ride must be accepted before issuing its OTP');
    }
    return this.otpService.issue({
      type: WorkflowOtpType.RIDE_START,
      rideId: ride.id,
      createdById: customerId,
      destinationPhone: ride.customer.phone,
      codeDigits: 4,
    });
  }

  async start(rideId: string, driverId: string, dto: VerifyRideOtpDto) {
    const startedRide = await this.dataSource.transaction(async (manager) => {
      const rides = manager.getRepository(RideEntity);
      const ride = await rides
        .createQueryBuilder('ride')
        .setLock('pessimistic_write')
        .where('ride.id = :rideId', { rideId })
        .getOne();
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }
      if (ride.driver_id !== driverId) {
        throw new ForbiddenException('Only the assigned driver can start this ride');
      }
      if (ride.status !== RideStatus.ACCEPTED) {
        throw new ConflictException('Ride is not awaiting its start OTP');
      }
      const verified = await this.otpService.consume(
        {
          challengeId: dto.challenge_id,
          code: dto.otp,
          type: WorkflowOtpType.RIDE_START,
          rideId,
        },
        manager,
      );
      if (!verified) return null;
      ride.status = RideStatus.IN_PROGRESS;
      return rides.save(ride);
    });
    if (!startedRide) {
      throw new BadRequestException('Invalid, expired, or already used OTP');
    }
    this.eventsGateway.broadcastRideStatus(
      [startedRide.customer_id, driverId],
      startedRide,
    );
    return { success: true, status: RideStatus.IN_PROGRESS };
  }

  async complete(rideId: string, driverId: string) {
    const settlement = await this.dataSource.transaction(async (manager) => {
      const rides = manager.getRepository(RideEntity);
      const ride = await rides
        .createQueryBuilder('ride')
        .setLock('pessimistic_write')
        .where('ride.id = :rideId', { rideId })
        .getOne();
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }
      if (ride.driver_id !== driverId) {
        throw new ForbiddenException('Only the assigned driver can complete this ride');
      }
      if (ride.status !== RideStatus.IN_PROGRESS || ride.settled_at) {
        throw new ConflictException('Ride is not eligible for settlement');
      }

      const commissionPercent = this.getNonNegativeConfigNumber(
        'RIDE_PLATFORM_COMMISSION_PERCENT',
        20,
      );
      if (commissionPercent > 100) {
        throw new BadRequestException(
          'RIDE_PLATFORM_COMMISSION_PERCENT must not exceed 100',
        );
      }
      const finalFareCents = this.toCents(ride.estimated_fare);
      const commissionCents = Math.round(
        (finalFareCents * commissionPercent) / 100,
      );
      const earningsCents = finalFareCents - commissionCents;

      const partner = await manager
        .getRepository(DeliveryPartnerEntity)
        .createQueryBuilder('partner')
        .setLock('pessimistic_write')
        .where('partner.user_id = :driverId', { driverId })
        .getOne();
      if (!partner) {
        throw new NotFoundException('Driver wallet not found');
      }

      partner.wallet_balance = (
        (this.toCents(partner.wallet_balance) + earningsCents) /
        100
      ).toFixed(2);
      if (earningsCents > 0) {
        await this.walletService.postTransaction(manager, {
          userId: driverId,
          type: WalletTransactionType.RIDE_EARNING,
          direction: WalletTransactionDirection.CREDIT,
          amount: this.walletService.fromCents(earningsCents),
          idempotencyKey: `ride-earning:${ride.id}`,
          referenceId: ride.id,
          description: `Driver earnings for completed ride ${ride.id}`,
        });
      }
      ride.final_fare = (finalFareCents / 100).toFixed(2);
      ride.platform_commission = (commissionCents / 100).toFixed(2);
      ride.driver_earnings = (earningsCents / 100).toFixed(2);
      ride.settled_at = new Date();
      ride.status = RideStatus.COMPLETED;
      await manager.getRepository(DeliveryPartnerEntity).save(partner);
      const completed = await rides.save(ride);
      await this.loyaltyService.awardCompletedRide(
        manager,
        ride.customer_id,
        ride.id,
        ride.final_fare,
      );
      return {
        success: true,
        ride: completed,
        wallet_balance: partner.wallet_balance,
      };
    });
    this.eventsGateway.broadcastRideStatus(
      [settlement.ride.customer_id, driverId],
      settlement.ride,
    );
    return settlement;
  }

  getCustomerRides(customerId: string) {
    return this.rideRepo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
  }

  async getDriverDispatchQueue(driverId: string) {
    const partner = await this.partnerRepo.findOne({
      where: {
        user_id: driverId,
        is_online: true,
        kyc_status: 'VERIFIED',
      },
    });
    if (!partner) {
      throw new ForbiddenException(
        'Verified delivery partners must be online to view ride requests',
      );
    }
    if (partner.current_lat === null || partner.current_lng === null) {
      return [];
    }
    const radiusKm = this.getPositiveConfigNumber('RIDE_MATCH_RADIUS_KM', 5);
    const requests = await this.rideRepo.find({
      where: {
        driver_id: IsNull(),
        status: RideStatus.REQUESTED,
        vehicle_type: partner.vehicle_type as RideVehicleType,
      },
      order: { created_at: 'ASC' },
      take: 50,
    });
    const activeRides = await this.rideRepo.find({
      where: [
        { driver_id: driverId, status: RideStatus.ACCEPTED },
        { driver_id: driverId, status: RideStatus.IN_PROGRESS },
      ],
      order: { created_at: 'ASC' },
    });
    const nearbyRequests = requests.filter(
      (ride) =>
        this.distanceKm(
          Number(ride.pickup_latitude),
          Number(ride.pickup_longitude),
          Number(partner.current_lat),
          Number(partner.current_lng),
        ) <= radiusKm,
    );
    return [...activeRides, ...nearbyRequests];
  }

  async getRide(rideId: string, user: JwtPayload) {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }
    if (
      user.role !== Role.ADMIN &&
      ride.customer_id !== user.sub &&
      ride.driver_id !== user.sub
    ) {
      throw new ForbiddenException('You cannot access this ride');
    }
    return ride;
  }

  private calculateFare(vehicleType: RideVehicleType, distanceKm: number) {
    const defaults = FARE_DEFAULTS[vehicleType];
    const baseFare = this.getNonNegativeConfigNumber(
      `RIDE_${vehicleType}_BASE_FARE`,
      defaults.base,
    );
    const perKmRate = this.getNonNegativeConfigNumber(
      `RIDE_${vehicleType}_PER_KM`,
      defaults.perKm,
    );
    return Math.max(1, this.toCents(baseFare + distanceKm * perKmRate)) / 100;
  }

  private getPositiveConfigNumber(key: string, fallback: number) {
    const value = this.getNonNegativeConfigNumber(key, fallback);
    if (value <= 0) {
      throw new BadRequestException(`${key} must be greater than zero`);
    }
    return value;
  }

  private getNonNegativeConfigNumber(key: string, fallback: number) {
    const configured = this.configService.get<string>(key);
    if (configured === undefined) return fallback;
    const value = Number(configured);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${key} must be a non-negative number`);
    }
    return value;
  }

  private toCents(amount: number | string): number {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Invalid monetary amount');
    }
    return Math.round(value * 100);
  }

  private distanceKm(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
  ): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDifference = radians(latitudeB - latitudeA);
    const longitudeDifference = radians(longitudeB - longitudeA);
    const haversine =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(radians(latitudeA)) *
        Math.cos(radians(latitudeB)) *
        Math.sin(longitudeDifference / 2) ** 2;
    return (
      6371 *
      2 *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
    );
  }
}
