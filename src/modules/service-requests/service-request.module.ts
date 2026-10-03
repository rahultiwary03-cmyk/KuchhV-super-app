import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../users/user.entity';
import { ServiceRequestController } from './service-request.controller';
import { ServiceRequestEntity } from './service-request.entity';
import { ServiceRequestService } from './service-request.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ServiceRequestEntity, UserEntity]),
  ],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}
