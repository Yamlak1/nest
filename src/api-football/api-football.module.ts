import { Module } from '@nestjs/common';
import { ApiFootballController } from './api-football.controller';
import { ApiFootballService } from './api-football.service';
import { RedisProvider } from 'src/redis.provider';

@Module({
  controllers: [ApiFootballController],
  providers: [ApiFootballService, RedisProvider],
})
export class ApiFootballModule {}
