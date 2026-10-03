import { Global, Module } from '@nestjs/common';
import { FcmService } from './services/fcm.service';
import { RedisService } from './redis/redis.service';

@Global()
@Module({
  providers: [FcmService, RedisService],
  exports: [FcmService, RedisService],
})
export class CommonModule {}
