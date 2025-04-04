import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthDto } from './dto';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Post('register')
  register(@Body() dto: AuthDto) {
    console.log({ dto });
    return this.playersService.createPlayer(dto);
  }

  @Get('getPlayer/:telegramId')
  getPlayer(@Param('telegramId') telegramId: string) {
    console.log({ telegramId });
    return this.playersService.getPlayer(telegramId);
  }
}
