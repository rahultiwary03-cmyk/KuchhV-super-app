import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CustomRequestEntity } from './modules/custom-requests/custom-request.entity';
import { CustomRequestBidEntity } from './modules/custom-requests/custom-request-bid.entity';
import { CustomRequestModule } from './modules/custom-requests/custom-request.module';
import { CommonModule } from './common/common.module';
import { DeliveryPartnerEntity } from './modules/delivery/delivery-partner.entity';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { OrderItemEntity } from './modules/orders/order-item.entity';
import { OrderEntity } from './modules/orders/order.entity';
import { OrderModule } from './modules/orders/order.module';
import { PaymentEntity } from './modules/payments/payment.entity';
import { PaymentModule } from './modules/payments/payment.module';
import { ProductEntity } from './modules/products/product.entity';
import { ShopEntity } from './modules/shops/shop.entity';
import { UserEntity } from './modules/users/user.entity';
import { VendorModule } from './modules/vendor/vendor.module';
import { EventsModule } from './modules/events/events.module';
import { ServiceRequestEntity } from './modules/service-requests/service-request.entity';
import { ServiceRequestModule } from './modules/service-requests/service-request.module';
import { OtpChallengeEntity } from './common/entities/otp-challenge.entity';
import { WorkflowOtpModule } from './common/workflow-otp.module';
import { RideEntity } from './modules/rides/ride.entity';
import { RideModule } from './modules/rides/ride.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 10_000, limit: 20 }]),
    CommonModule,
    AuthModule,
    WorkflowOtpModule,
    EventsModule,
    AdminModule,
    VendorModule,
    OrderModule,
    DeliveryModule,
    CustomRequestModule,
    ServiceRequestModule,
    RideModule,
    WalletModule,
    PaymentModule,
    TypeOrmModule.forFeature([
      UserEntity,
      ShopEntity,
      ProductEntity,
      OrderEntity,
      OrderItemEntity,
      DeliveryPartnerEntity,
      PaymentEntity,
      CustomRequestEntity,
      CustomRequestBidEntity,
      ServiceRequestEntity,
      OtpChallengeEntity,
      RideEntity,
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        return {
          type: 'postgres' as const,
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: configService.get<string>('DB_HOST'),
                port: Number(configService.get<string>('DB_PORT')) || 5432,
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_DATABASE'),
              }),
          autoLoadEntities: true,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: true,
          synchronize:
            configService.get<string>('DB_SYNCHRONIZE') === 'true' ||
            (configService.get<string>('DB_SYNCHRONIZE') !== 'false' &&
              configService.get<string>('NODE_ENV') !== 'production'),
        };
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
