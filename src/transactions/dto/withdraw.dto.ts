import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class WithdrawDto {
  @IsString()
  @IsNotEmpty()
  account_name: string;

  // @IsString()
  // email: string;

  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}
