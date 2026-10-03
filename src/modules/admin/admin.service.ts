import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../auth/enums/role.enum';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { UserEntity } from '../users/user.entity';
import { PartnerKycAction } from './dto/review-partner-kyc.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepo: Repository<DeliveryPartnerEntity>,
  ) {}

  getPendingPartners() {
    return this.userRepo.find({
      where: {
        role: Role.DELIVERY_PARTNER,
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
      },
      order: { created_at: 'ASC' },
    });
  }

  async reviewPartnerKyc(userId: string, action: PartnerKycAction) {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const partners = manager.getRepository(DeliveryPartnerEntity);
      const user = await users
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (user.role !== Role.DELIVERY_PARTNER) {
        throw new ConflictException('User is not a delivery partner');
      }
      if (user.status !== 'PENDING_APPROVAL') {
        throw new ConflictException('Partner KYC has already been reviewed');
      }

      const partner = await partners.findOne({
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!partner) {
        throw new NotFoundException('Delivery partner profile not found');
      }

      const approved = action === PartnerKycAction.APPROVE;
      user.status = approved ? 'APPROVED' : 'REJECTED';
      partner.kyc_status = approved ? 'VERIFIED' : 'REJECTED';
      if (!approved) {
        partner.is_online = false;
      }

      await users.save(user);
      await partners.save(partner);

      return {
        success: true,
        message: `Partner KYC ${approved ? 'APPROVED' : 'REJECTED'} successfully`,
      };
    });
  }
}
