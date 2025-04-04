import {
  BadRequestException,
  Body,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { player } from './entities/player.entity';
import { AuthDto } from './dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(player)
    private playerRepository: Repository<player>,
  ) {}

  async createPlayer(dto: AuthDto): Promise<player> {
    // 1. Validate phone number
    const phoneRegex = new RegExp('^\\+?[1-9]\\d{1,14}$');
    if (!phoneRegex.test(dto.phoneNumber)) {
      throw new BadRequestException('INVALID_PHONE_NUMBER');
    }

    // 2. Validate name
    if (!dto.name || dto.name.trim().length < 2) {
      throw new BadRequestException('INVALID_NAME');
    }

    // 3. Validate telegramId
    if (!dto.telegramId || dto.telegramId.trim().length === 0) {
      throw new BadRequestException('INVALID_TELEGRAM_ID');
    }

    // 4. Check if a player already exists with the same telegramId
    const existingByTelegramId = await this.playerRepository.findOne({
      where: { telegramId: dto.telegramId },
    });
    if (existingByTelegramId) {
      // If you specifically only want to block *telegramId* duplicates:
      throw new BadRequestException('PLAYER_ALREADY_EXISTS');
    }

    // 5. (Optional) Check phoneNumber if you also want to prevent duplicates on phone number
    //    If that’s required, you can do a similar check here:
    const existingByPhoneNumber = await this.playerRepository.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existingByPhoneNumber) {
      throw new BadRequestException('PLAYER_ALREADY_EXISTS');
    }

    // 6. Otherwise, create a brand new player
    const currentPlayer = this.playerRepository.create({
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      telegramId: dto.telegramId,
      isBanned: false,
      inviterId: dto.inviterId,
      preferredLanguage: dto.preferredLanguage,
      balance: 0.0,
      registeredAt: dto.registeredAt ?? new Date(),
    });

    const savedPlayer = await this.playerRepository.save(currentPlayer);
    return savedPlayer;
  }

  async getPlayer(telegramId: string) {
    if (!telegramId) {
      throw new BadRequestException('telegramId is required');
    }

    const player = await this.playerRepository.findOne({
      where: { telegramId },
    });

    if (!player) {
      throw new NotFoundException(
        `Player with telegramId "${telegramId}" not found`,
      );
    }

    return player;
  }

  async incrementBalance(telegramId: string, amount: number): Promise<player> {
    const player = await this.playerRepository.findOne({
      where: { telegramId },
    });
    if (!player) {
      throw new NotFoundException('User not found');
    }
    const currentBalance = Number(player.balance) || 0;
    player.balance = currentBalance + amount;
    return await this.playerRepository.save(player);
  }

  async decrementBalance(telegramId: string, amount: number): Promise<player> {
    const player = await this.playerRepository.findOne({
      where: { telegramId },
    });
    if (!player) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = Number(player.balance) || 0;
    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    player.balance = currentBalance - amount;
    return await this.playerRepository.save(player);
  }
}
