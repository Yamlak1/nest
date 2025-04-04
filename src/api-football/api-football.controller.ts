import { Controller, Get, Param } from '@nestjs/common';
import { ApiFootballService } from './api-football.service';

@Controller('api-football')
export class ApiFootballController {
  constructor(private apiFootballService: ApiFootballService) {}

  @Get('liveMatches')
  getLiveMatches() {
    return this.apiFootballService.liveMatch();
  }

  @Get('leagues')
  getLeagues() {
    return this.apiFootballService.league();
  }

  @Get('fixtureOdds/:fixtureId')
  getFixtureOdds(@Param('fixtureId') fixtureId: string) {
    return this.apiFootballService.fixtureOdds(fixtureId);
  }

  @Get('fixtureByDate/:date')
  getfixtureByDate(@Param('date') date: string) {
    return this.apiFootballService.fixtureByDate(date);
  }

  @Get('todaysFixture')
  getTodaysFixture(@Param('date') date?: string) {
    return this.apiFootballService.todaysFixture(date);
  }
}
