import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DepositDto } from './dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionsService) {}

  @Post('deposit')
  deposit(@Body() dto: DepositDto) {
    return this.transactionService.deposit(dto);
  }

  @Post('callback')
  callback(@Body() body: any, @Headers() headers: any) {
    return this.transactionService.verifyDeposit(body, headers);
  }

  @Post('withdraw')
  withdraw(@Body() dto: WithdrawDto) {
    return this.transactionService.withdraw(dto);
  }

  @Post('withdraw/callback')
  verifyWithdraw(@Body() body: any, @Headers() headers: any) {
    return this.transactionService.verifyWithdraw(body, headers);
  }
  @Get('getBanks')
  getBanks() {
    return this.transactionService.getBanks();
  }
}
