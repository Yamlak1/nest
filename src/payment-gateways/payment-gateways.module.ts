import { Module } from '@nestjs/common';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentGatewaysController } from './payment-gateways.controller';

@Module({
  providers: [PaymentGatewaysService],
  controllers: [PaymentGatewaysController]
})
export class PaymentGatewaysModule {}
