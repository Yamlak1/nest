import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const RedisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT
      ? parseInt(process.env.REDIS_PORT, 10)
      : 6379;
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    return new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    });
  },
};
