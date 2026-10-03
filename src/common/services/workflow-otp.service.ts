import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OtpChallengeEntity,
  WorkflowOtpType,
} from '../entities/otp-challenge.entity';

interface IssueOtpInput {
  type: WorkflowOtpType;
  orderId?: string;
  serviceRequestId?: string;
  rideId?: string;
  createdById: string;
  destinationPhone: string;
  codeDigits?: number;
}

interface ConsumeOtpInput {
  challengeId: string;
  code: string;
  type: WorkflowOtpType;
  orderId?: string;
  serviceRequestId?: string;
  rideId?: string;
}

@Injectable()
export class WorkflowOtpService {
  private readonly logger = new Logger(WorkflowOtpService.name);

  constructor(
    @InjectRepository(OtpChallengeEntity)
    private readonly challengeRepo: Repository<OtpChallengeEntity>,
    private readonly configService: ConfigService,
  ) {}

  async issue(
    input: IssueOtpInput,
    manager?: EntityManager,
  ): Promise<{ challenge_id: string; expires_at: Date; mock_otp?: string }> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException(
        'Workflow OTP delivery is not configured for production',
      );
    }

    const repository =
      manager?.getRepository(OtpChallengeEntity) ?? this.challengeRepo;
    const digits = input.codeDigits ?? 6;
    const minimum = 10 ** (digits - 1);
    const code = randomInt(minimum, minimum * 10).toString();
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const codeHash = this.hashCode(challengeId, code);

    await repository
      .createQueryBuilder()
      .update(OtpChallengeEntity)
      .set({ consumed_at: new Date() })
      .where('type = :type', { type: input.type })
      .andWhere('consumed_at IS NULL')
      .andWhere(
        this.subjectColumn(input),
        { subjectId: this.subjectId(input) },
      )
      .execute();

    await repository.save(
      repository.create({
        id: challengeId,
        type: input.type,
        order_id: input.orderId ?? null,
        service_request_id: input.serviceRequestId ?? null,
        ride_id: input.rideId ?? null,
        created_by_id: input.createdById,
        destination_phone: input.destinationPhone,
        code_hash: codeHash,
        expires_at: expiresAt,
        failed_attempts: 0,
        consumed_at: null,
      }),
    );

    this.logger.warn(
      `Development-only ${input.type} OTP for challenge ${challengeId}: ${code}`,
    );

    return {
      challenge_id: challengeId,
      expires_at: expiresAt,
      mock_otp: code,
    };
  }

  async consume(
    input: ConsumeOtpInput,
    manager: EntityManager,
  ): Promise<boolean> {
    const challenge = await manager
      .getRepository(OtpChallengeEntity)
      .createQueryBuilder('challenge')
      .setLock('pessimistic_write')
      .where('challenge.id = :challengeId', {
        challengeId: input.challengeId,
      })
      .andWhere('challenge.type = :type', { type: input.type })
      .andWhere(
        `challenge.${this.subjectColumn(input)}`,
        { subjectId: this.subjectId(input) },
      )
      .getOne();

    if (!challenge || challenge.consumed_at) {
      return false;
    }
    if (challenge.expires_at.getTime() <= Date.now()) {
      challenge.consumed_at = new Date();
      await manager.getRepository(OtpChallengeEntity).save(challenge);
      return false;
    }
    if (challenge.failed_attempts >= 5) {
      challenge.consumed_at = new Date();
      await manager.getRepository(OtpChallengeEntity).save(challenge);
      return false;
    }

    const suppliedHash = Buffer.from(
      this.hashCode(challenge.id, input.code),
      'hex',
    );
    const expectedHash = Buffer.from(challenge.code_hash, 'hex');
    if (
      suppliedHash.length !== expectedHash.length ||
      !timingSafeEqual(suppliedHash, expectedHash)
    ) {
      challenge.failed_attempts += 1;
      if (challenge.failed_attempts >= 5) {
        challenge.consumed_at = new Date();
      }
      await manager.getRepository(OtpChallengeEntity).save(challenge);
      return false;
    }

    challenge.consumed_at = new Date();
    await manager.getRepository(OtpChallengeEntity).save(challenge);
    return true;
  }

  private hashCode(challengeId: string, code: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    return createHmac('sha256', secret)
      .update(`${challengeId}:${code}`)
      .digest('hex');
  }

  private subjectColumn(
    input: Pick<IssueOtpInput, 'orderId' | 'serviceRequestId' | 'rideId'>,
  ): string {
    if (input.orderId) return 'order_id = :subjectId';
    if (input.serviceRequestId) return 'service_request_id = :subjectId';
    if (input.rideId) return 'ride_id = :subjectId';
    throw new Error('An OTP subject is required');
  }

  private subjectId(
    input: Pick<IssueOtpInput, 'orderId' | 'serviceRequestId' | 'rideId'>,
  ): string {
    const id = input.orderId ?? input.serviceRequestId ?? input.rideId;
    if (!id) throw new Error('An OTP subject is required');
    return id;
  }
}
