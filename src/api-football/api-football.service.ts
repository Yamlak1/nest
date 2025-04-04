import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class ApiFootballService {
  private liveMatchCache: { data: any; timestamp: number } = {
    data: null,
    timestamp: 0,
  };

  private leagueCache: { data: any; timestamp: number } = {
    data: null,
    timestamp: 0,
  };

  private oddsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private fixtureByDateCache: Map<string, { data: any; timestamp: number }> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  async liveMatch() {
    const CACHE_DURATION = 3 * 1000; // 3 seconds
    const { data, timestamp } = this.liveMatchCache;

    // Check cache
    if (data && Date.now() - timestamp < CACHE_DURATION) {
      return { data };
    }

    try {
      // Retrieve your API key from config
      const apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY');
      if (!apiKey) {
        throw new Error('API key not set in environment variables.');
      }

      const response = await axios.get(
        'https://v3.football.api-sports.io/fixtures?live=all',
        {
          headers: {
            'x-apisports-key': apiKey,
          },
        },
      );

      // Update cache
      this.liveMatchCache = {
        data: response.data,
        timestamp: Date.now(),
      };

      return { data: response.data };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.message || error.message,
      );
    }
  }

  async league() {
    // 7 days in milliseconds
    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 604,800,000 ms
    const { data, timestamp } = this.leagueCache;

    // Check if we have valid cached data (less than 7 days old)
    if (data && Date.now() - timestamp < CACHE_DURATION) {
      return { data };
    }

    try {
      const apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY');
      if (!apiKey) {
        throw new Error('API key not set in environment variables.');
      }

      const response = await axios.get(
        'https://v3.football.api-sports.io/leagues',
        {
          headers: {
            'x-apisports-key': apiKey,
          },
        },
      );

      // Update cache with new data + timestamp
      this.leagueCache = {
        data: response.data,
        timestamp: Date.now(),
      };

      return { data: response.data };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.message || error.message,
      );
    }
  }

  async fixtureOdds(fixtureId: string) {
    if (!fixtureId) {
      throw new BadRequestException('Fixture ID is required');
    }

    const CACHE_DURATION = 3 * 60 * 60 * 1000;
    const cacheKey = `match_odds_${fixtureId}`;

    const cached = this.oddsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { data: cached.data };
    }

    try {
      const apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY');
      if (!apiKey) {
        throw new Error('API key not set in environment variables.');
      }

      const response = await axios.get(
        `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`,
        {
          headers: {
            'x-apisports-key': apiKey,
          },
        },
      );

      const oddsData = response.data?.response;

      this.oddsCache.set(cacheKey, {
        data: oddsData,
        timestamp: Date.now(),
      });

      return { data: oddsData };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.message || error.message,
      );
    }
  }

  async fixtureByDate(date: string) {
    if (!date) {
      throw new BadRequestException('Fixture Date is required');
    }

    let fixtureDate: string;
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
      fixtureDate = parsedDate.toISOString().split('T')[0];
    } catch (error) {
      throw new BadRequestException('Invalid Fixture Date format');
    }

    // Define cache duration (e.g., 3 seconds; adjust as needed)
    const CACHE_DURATION = 3 * 60 * 60 * 1000;
    const cacheKey = `match_fixture_${fixtureDate}`;

    const cached = this.fixtureByDateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { data: cached.data };
    }

    try {
      const apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY');
      if (!apiKey) {
        throw new Error('API key not set in environment variables.');
      }

      // Fetch fixtures for the given date
      const fixtureResponse = await axios.get(
        'https://v3.football.api-sports.io/fixtures',
        {
          params: { date: fixtureDate },
          headers: { 'x-apisports-key': apiKey },
        },
      );
      let fixtures = fixtureResponse.data.response;

      // Fetch odds for the same date
      const oddsResponse = await axios.get(
        'https://v3.football.api-sports.io/odds',
        {
          params: { date: fixtureDate },
          headers: { 'x-apisports-key': apiKey },
        },
      );

      // Create a set of fixture IDs that have odds available
      const oddsFixtures = new Set(
        oddsResponse.data.response.map((odds: any) => odds.fixture.id),
      );

      // Filter fixtures to include only those that have odds
      fixtures = fixtures.filter((fixture: any) =>
        oddsFixtures.has(fixture.fixture.id),
      );

      // Cache the filtered fixtures
      this.fixtureByDateCache.set(cacheKey, {
        data: fixtures,
        timestamp: Date.now(),
      });

      return { data: fixtures };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.message || error.message,
      );
    }
  }

  async todaysFixture(date?: string) {
    const inputDate = date ? new Date(date) : new Date();
    if (isNaN(inputDate.getTime())) {
      throw new BadRequestException('Invalid Fixture Date format');
    }
    const fixtureDate = inputDate.toISOString().split('T')[0];
    const cacheKey = `todays_fixture_${fixtureDate}`;

    const cachedDataStr = await this.redisClient.get(cacheKey);
    if (cachedDataStr) {
      console.log('From redis');
      const cachedData = JSON.parse(cachedDataStr);
      return { data: cachedData.data };
    }

    try {
      console.log('From api');
      const apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY');
      if (!apiKey) {
        throw new Error('API key not set in environment variables.');
      }

      const fixtureResponse = await axios.get(
        'https://v3.football.api-sports.io/fixtures',
        {
          params: { date: fixtureDate },
          headers: { 'x-apisports-key': apiKey },
        },
      );
      let fixtures = fixtureResponse.data.response;

      const oddsResponse = await axios.get(
        'https://v3.football.api-sports.io/odds',
        {
          params: { date: fixtureDate },
          headers: { 'x-apisports-key': apiKey },
        },
      );

      const oddsFixtures = new Set(
        oddsResponse.data.response.map((odds: any) => odds.fixture.id),
      );
      fixtures = fixtures.filter((fixture: any) =>
        oddsFixtures.has(fixture.fixture.id),
      );

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const secondsUntilMidnight = Math.floor(
        (tomorrow.getTime() - now.getTime()) / 1000,
      );
      const ttl = Math.min(180, secondsUntilMidnight);

      const storeData = { data: fixtures, timestamp: Date.now() };
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(storeData),
        'EX',
        ttl,
      );

      return { data: fixtures };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.message || error.message,
      );
    }
  }
}
