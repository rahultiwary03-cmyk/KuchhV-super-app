import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpChallengeEntity } from './entities/otp-challenge.entity';
import { WorkflowOtpService } from './services/workflow-otp.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OtpChallengeEntity])],
  providers: [WorkflowOtpService],
  exports: [WorkflowOtpService],
})
export class WorkflowOtpModule {}
