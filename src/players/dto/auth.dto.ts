import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AuthDto {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  inviterId: string;

  @IsBoolean()
  isBanned: boolean;

  @IsString()
  preferredLanguage: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registeredAt?: Date;
}
