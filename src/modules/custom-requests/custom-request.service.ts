import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Role } from '../auth/enums/role.enum';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { UserEntity } from '../users/user.entity';
import { CustomRequestBidEntity } from './custom-request-bid.entity';
import { CustomRequestEntity } from './custom-request.entity';
import { EventsGateway } from '../events/events.gateway';
import {
  CreateCustomRequestDto,
  SubmitBidDto,
} from './dto/custom-request.dto';

@Injectable()
export class CustomRequestService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CustomRequestEntity)
    private readonly customReqRepo: Repository<CustomRequestEntity>,
    @InjectRepository(CustomRequestBidEntity)
    private readonly bidRepo: Repository<CustomRequestBidEntity>,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepo: Repository<DeliveryPartnerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createRequest(customerId: string, dto: CreateCustomRequestDto) {
    const customer = await this.userRepo.findOne({
      where: { id: customerId },
      select: { id: true, role: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (customer.role !== Role.CUSTOMER) {
      throw new BadRequestException('Only customers can create custom requests');
    }

    const saved = await this.customReqRepo.save(
      this.customReqRepo.create({
        customer_id: customer.id,
        item_description: dto.item_description,
        offered_price: this.toMoney(dto.offered_price),
        status: 'BROADCASTING',
      }),
    );
    this.eventsGateway.broadcastCustomRequest({
      request_id: saved.id,
      item_description: saved.item_description,
      offered_price: saved.offered_price,
      created_at: saved.created_at,
    });

    return {
      success: true,
      message: 'Custom request broadcasted to nearby partners',
      request_id: saved.id,
    };
  }

  getBroadcastingRequests() {
    return this.customReqRepo.find({
      where: { status: 'BROADCASTING' },
      order: { created_at: 'DESC' },
    });
  }

  async getCustomerRequests(customerId: string) {
    const requests = await this.customReqRepo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
    if (requests.length === 0) return [];
    const bids = await this.bidRepo.find({
      where: { request_id: In(requests.map((request) => request.id)) },
      order: { created_at: 'ASC' },
    });
    const bidsByRequest = new Map<string, CustomRequestBidEntity[]>();
    for (const bid of bids) {
      const grouped = bidsByRequest.get(bid.request_id) ?? [];
      grouped.push(bid);
      bidsByRequest.set(bid.request_id, grouped);
    }
    return requests.map((request) => ({
      ...request,
      bids: bidsByRequest.get(request.id) ?? [],
    }));
  }

  async submitBid(requestId: string, partnerId: string, dto: SubmitBidDto) {
    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(CustomRequestEntity);
      const bids = manager.getRepository(CustomRequestBidEntity);
      const partners = manager.getRepository(DeliveryPartnerEntity);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :requestId', { requestId })
        .getOne();

      if (!request) {
        throw new NotFoundException('Custom request not found');
      }
      if (request.status !== 'BROADCASTING') {
        throw new BadRequestException('Request is no longer accepting bids');
      }

      const partner = await partners.findOne({
        where: {
          user_id: partnerId,
          is_online: true,
          kyc_status: 'VERIFIED',
        },
        select: { id: true },
      });
      if (!partner) {
        throw new BadRequestException(
          'Partner must be onboarded, verified, and online to submit bids',
        );
      }

      const existingBid = await bids.findOne({
        where: { request_id: requestId, partner_id: partnerId },
      });
      if (existingBid) {
        throw new ConflictException(
          'Partner has already submitted a bid for this request',
        );
      }

      const bid = await bids.save(
        bids.create({
          request_id: requestId,
          partner_id: partnerId,
          bid_amount: this.toMoney(dto.bid_amount),
        }),
      );

      return {
        success: true,
        message: 'Bid submitted successfully to customer',
        bid,
      };
    });
  }

  async getBids(requestId: string, userId: string, isAdmin: boolean) {
    const request = await this.customReqRepo.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Custom request not found');
    }

    if (!isAdmin && request.customer_id !== userId) {
      const partnerBid = await this.bidRepo.findOne({
        where: { request_id: requestId, partner_id: userId },
        select: { id: true },
      });
      if (!partnerBid) {
        throw new ForbiddenException('You cannot view bids for this request');
      }
    }

    const bids = await this.bidRepo.find({
      where: { request_id: requestId },
      order: { created_at: 'ASC' },
    });
    return { request_id: requestId, bids };
  }

  async acceptBid(
    requestId: string,
    partnerId: string,
    customerId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(CustomRequestEntity);
      const bids = manager.getRepository(CustomRequestBidEntity);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :requestId', { requestId })
        .getOne();

      if (!request) {
        throw new NotFoundException('Custom request not found');
      }
      if (request.customer_id !== customerId) {
        throw new BadRequestException(
          'Only the customer who created this request can accept a bid',
        );
      }
      if (request.status !== 'BROADCASTING') {
        throw new ConflictException('Request has already been resolved');
      }

      const acceptedBid = await bids.findOne({
        where: {
          request_id: requestId,
          partner_id: partnerId,
          status: 'SUBMITTED',
        },
      });
      if (!acceptedBid) {
        throw new NotFoundException('Bid not found for this partner');
      }

      await bids
        .createQueryBuilder()
        .update(CustomRequestBidEntity)
        .set({ status: 'REJECTED' })
        .where('request_id = :requestId', { requestId })
        .andWhere('status = :status', { status: 'SUBMITTED' })
        .execute();

      acceptedBid.status = 'ACCEPTED';
      await bids.save(acceptedBid);

      request.assigned_partner_id = partnerId;
      request.status = 'BID_ACCEPTED';
      await requests.save(request);

      return {
        success: true,
        message: `Bid from partner ${partnerId} accepted successfully`,
      };
    });
  }

  private toMoney(amount: number): string {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Invalid monetary amount');
    }
    return amount.toFixed(2);
  }
}
