import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');
    const options = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt: number) =>
        attempt <= 3 ? attempt * 250 : null,
    };

    this.client = redisUrl
      ? new Redis(redisUrl, options)
      : new Redis({
          ...options,
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: Number(configService.get<string>('REDIS_PORT')) || 6379,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async set(key: string, value: string, ttl = 300): Promise<void> {
    if (!Number.isSafeInteger(ttl) || ttl <= 0) {
      throw new RangeError('Redis TTL must be a positive integer in seconds');
    }
    await this.client.set(key, value, 'EX', ttl);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }
    this.client.disconnect();
  }
}
