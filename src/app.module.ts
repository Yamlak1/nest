import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersModule } from './players/players.module';
import { player } from './players/entities/player.entity';
import { ApiFootballModule } from './api-football/api-football.module';
import { ConfigModule } from '@nestjs/config';
import { RedisProvider } from './redis.provider';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentGatewaysModule } from './payment-gateways/payment-gateways.module';
import { transactions } from './transactions/entities/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PlayersModule,
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: 'mongodb://admin:Admin%401234@34.47.44.215:27017/telegram-bot-registration?authSource=admin',
      synchronize: true,
      entities: [player, transactions],
    }),
    ApiFootballModule,
    TransactionsModule,
    PaymentGatewaysModule,
  ],
  providers: [RedisProvider],
})
export class AppModule {}
