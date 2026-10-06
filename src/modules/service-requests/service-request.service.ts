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
import { VerifyWorkflowOtpDto } from '../../common/dto/verify-workflow-otp.dto';
import { WorkflowOtpService } from '../../common/services/workflow-otp.service';
import { WorkflowOtpType } from '../../common/entities/otp-challenge.entity';
import { Role } from '../auth/enums/role.enum';
import { UserEntity } from '../users/user.entity';
import { getShopCommissionPercentage } from '../shops/shop-commission';
import { CreateServiceRequestDto } from './dto/service-request.dto';
import {
  ServiceRequestEntity,
  ServiceRequestStatus,
} from './service-request.entity';

@Injectable()
export class ServiceRequestService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly otpService: WorkflowOtpService,
    @InjectRepository(ServiceRequestEntity)
    private readonly requestRepo: Repository<ServiceRequestEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(customerId: string, dto: CreateServiceRequestDto) {
    const customer = await this.userRepo.findOne({
      where: { id: customerId, role: Role.CUSTOMER },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const request = await this.requestRepo.save(
      this.requestRepo.create({
        customer_id: customerId,
        service_provider_id: null,
        service_category: dto.service_category.trim(),
        description: dto.description.trim(),
        service_address: dto.service_address.trim(),
        agreed_price: null,
        commission_percentage: getShopCommissionPercentage(
          'Home Services & Repairs',
          this.configService,
        ).toFixed(2),
        status: ServiceRequestStatus.REQUESTED,
      }),
    );
    return { success: true, service_request: request };
  }

  getCustomerRequests(customerId: string) {
    return this.requestRepo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
  }

  getProviderRequests(providerId: string) {
    return this.requestRepo.find({
      where: { service_provider_id: providerId },
      order: { created_at: 'DESC' },
    });
  }

  getProviderFeed() {
    return this.requestRepo.find({
      where: {
        status: ServiceRequestStatus.REQUESTED,
        service_provider_id: IsNull(),
      },
      order: { created_at: 'ASC' },
    });
  }

  async accept(requestId: string, providerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(ServiceRequestEntity);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :requestId', { requestId })
        .getOne();
      if (!request) {
        throw new NotFoundException('Service request not found');
      }
      if (
        request.status !== ServiceRequestStatus.REQUESTED ||
        request.service_provider_id !== null
      ) {
        throw new ConflictException('Service request is no longer available');
      }

      const provider = await manager.getRepository(UserEntity).findOne({
        where: { id: providerId, role: Role.SERVICE_PROVIDER },
        select: { id: true },
      });
      if (!provider) {
        throw new ForbiddenException('A Service Provider account is required');
      }

      request.service_provider_id = provider.id;
      request.status = ServiceRequestStatus.ACCEPTED;
      return requests.save(request);
    });
  }

  async start(requestId: string, providerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(ServiceRequestEntity);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :requestId', { requestId })
        .getOne();
      if (!request) {
        throw new NotFoundException('Service request not found');
      }
      if (request.service_provider_id !== providerId) {
        throw new ForbiddenException(
          'Only the assigned Service Provider can manage this request',
        );
      }
      if (request.status !== ServiceRequestStatus.ACCEPTED) {
        throw new ConflictException('Only accepted services can be started');
      }
      request.status = ServiceRequestStatus.IN_PROGRESS;
      return requests.save(request);
    });
  }

  async generateCompletionOtp(requestId: string, customerId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId, customer_id: customerId },
      relations: { customer: true },
    });
    if (!request) {
      throw new NotFoundException('Service request not found');
    }
    if (request.status !== ServiceRequestStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Service completion OTP is available only while service is in progress',
      );
    }

    return this.otpService.issue({
      type: WorkflowOtpType.SERVICE_COMPLETION,
      serviceRequestId: request.id,
      createdById: customerId,
      destinationPhone: request.customer.phone,
    });
  }

  async verifyCompletionOtp(
    requestId: string,
    providerId: string,
    dto: VerifyWorkflowOtpDto,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(ServiceRequestEntity);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :requestId', { requestId })
        .getOne();
      if (!request) {
        throw new NotFoundException('Service request not found');
      }
      if (request.service_provider_id !== providerId) {
        throw new ForbiddenException(
          'Only the assigned Service Provider can complete this service',
        );
      }
      if (request.status !== ServiceRequestStatus.IN_PROGRESS) {
        throw new ConflictException('Service is not awaiting completion');
      }

      const verified = await this.otpService.consume(
        {
          challengeId: dto.challenge_id,
          code: dto.otp,
          type: WorkflowOtpType.SERVICE_COMPLETION,
          serviceRequestId: requestId,
        },
        manager,
      );
      if (!verified) {
        return false;
      }

      request.status = ServiceRequestStatus.COMPLETED;
      await requests.save(request);
      return true;
    });
    if (!result) {
      throw new BadRequestException('Invalid, expired, or already used OTP');
    }
    return { success: true, status: ServiceRequestStatus.COMPLETED };
  }

}
