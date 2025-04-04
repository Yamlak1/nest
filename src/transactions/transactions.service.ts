import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { transactions } from './entities/transaction.entity';
import { DepositDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { PlayersService } from 'src/players/players.service';
import axios from 'axios';
import * as crypto from 'crypto';

const MIN_DEPOSIT_AMOUNT = 5;
const MAX_DEPOSIT_AMOUNT = 25_000;
const PLAYER_DAILY_MAX_DEPOSIT = 200_000;

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(transactions)
    private transactionRepository: Repository<transactions>,
    private readonly configService: ConfigService,
    private readonly playersService: PlayersService,
  ) {}

  async getTotalDepositByPlayerToday(telegramId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const transactionsToday = await this.transactionRepository.find({
      where: {
        telegramId,
        createdAt: Between(startOfToday, endOfToday),
        status: 'success',
      },
    });

    return transactionsToday.reduce(
      (total, tx) => total + (tx.amount ? Number(tx.amount) : 0),
      0,
    );
  }

  async deposit(dto: DepositDto): Promise<transactions> {
    const { amount, telegramId, firstName, lastName, phone } = dto;

    // Convert amount to a primitive number
    const depositAmount = Number(amount);
    if (isNaN(depositAmount)) {
      throw new BadRequestException('Invalid amount');
    }

    // Validate deposit amount constraints
    if (depositAmount < MIN_DEPOSIT_AMOUNT) {
      throw new BadRequestException(
        `Deposit amount must be at least ${MIN_DEPOSIT_AMOUNT}`,
      );
    }
    if (depositAmount > MAX_DEPOSIT_AMOUNT) {
      throw new BadRequestException(
        `Deposit amount must not exceed ${MAX_DEPOSIT_AMOUNT}`,
      );
    }

    // Check if player exists and is not banned
    const player = await this.playersService.getPlayer(telegramId);
    if (!player) {
      throw new BadRequestException('UNKNOWN_PLAYER');
    }
    if (player.isBanned) {
      throw new BadRequestException('BANNED_PLAYER');
    }

    // Check player's daily deposit limit
    const totalDepositsToday =
      await this.getTotalDepositByPlayerToday(telegramId);
    if (totalDepositsToday + depositAmount > PLAYER_DAILY_MAX_DEPOSIT) {
      throw new BadRequestException('PLAYER_REACHED_DAILY_MAX_LIMIT');
    }

    const tx_ref = `txn-${Date.now()}`;

    const transaction = this.transactionRepository.create({
      tx_ref,
      telegramId,
      amount: depositAmount,
      currency: 'ETB',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const savedTransaction = await this.transactionRepository.save(transaction);

    try {
      // Call Chapa API to initialize the transaction
      const chapaResponse = await axios.post(
        'https://api.chapa.co/v1/transaction/initialize',
        {
          amount: depositAmount,
          currency: 'ETB',
          email: 'placeholder@gmail.com',
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          tx_ref,
          payment_method: 'telebirr',
          callback_url:
            'https://sports-backend-nest-584017102322.us-central1.run.app/transactions/callback', // Update with your callback URL
          return_url:
            'https://sports-frontend-584017102322.us-central1.run.app', // Update with your success URL
        },
        {
          headers: {
            Authorization: `Bearer CHASECK_TEST-QcecnrQcvalCH2Kn42r5Harqr1dnt4Ig`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Update the transaction record with the payment URL
      savedTransaction.payment_url = chapaResponse.data.data.checkout_url;
      const updatedTransaction =
        await this.transactionRepository.save(savedTransaction);

      return updatedTransaction;
    } catch (err: any) {
      throw new BadRequestException(err.response?.data?.message || err.message);
    }
  }

  async verifyDeposit(body: any, headers: any): Promise<any> {
    try {
      const secret = '55a8f9a0a3b6ad0bc3f91bf64a57694b52aca5eb';

      const computedHash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      // const chapaSignature = headers['chapa-signature'];
      // const xChapaSignature = headers['x-chapa-signature'];

      // const isValidChapaSignature =
      //   (chapaSignature && computedHash === chapaSignature) ||
      //   (xChapaSignature && computedHash === xChapaSignature);

      // if (!isValidChapaSignature) {
      //   throw new BadRequestException('Invalid Chapa signature');
      // }

      const { tx_ref } = body;
      if (!tx_ref) {
        throw new BadRequestException('Missing transaction reference');
      }

      console.log('4444444444444');

      const chapaApiKey =
        this.configService.get<string>('CHAPA_API_KEY') ||
        'CHASECK_TEST-QcecnrQcvalCH2Kn42r5Harqr1dnt4Ig';
      const verificationResponse = await axios.get(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
          headers: {
            Authorization: `Bearer CHASECK_TEST-QcecnrQcvalCH2Kn42r5Harqr1dnt4Ig`,
          },
        },
      );

      console.log(verificationResponse);

      const { status, data } = verificationResponse.data;

      console.log(status);
      console.log(data);
      if (status === 'success') {
        console.log('9999999999');
        const transaction = await this.transactionRepository.findOne({
          where: { tx_ref },
        });

        if (!transaction) {
          throw new BadRequestException('Transaction not found');
        }

        transaction.status = 'success';
        transaction.updatedAt = new Date();
        await this.transactionRepository.save(transaction);

        const amountPaid = parseFloat(data.amount);
        const userChatId = transaction.telegramId;
        const updatedUser = await this.playersService.incrementBalance(
          userChatId,
          amountPaid,
        );

        console.log(updatedUser);

        return {
          message: 'Payment verified and balance updated successfully',
          transaction,
          user: updatedUser,
        };
      }

      throw new BadRequestException('Payment verification failed');
    } catch (err: any) {
      throw new BadRequestException(err.response?.data?.message || err.message);
    }
  }

  async withdraw(body: any): Promise<any> {
    const {
      amount,
      email = 'placeholder@gmail.com',
      account_name,
      phone,
      telegramId,
      bank_code,
      account_number,
    } = body;

    // Validate required fields.
    if (
      !account_name ||
      !account_number ||
      !amount ||
      !bank_code ||
      !phone ||
      !telegramId
    ) {
      throw new BadRequestException('Missing required transfer fields');
    }

    const normalizedPhone = phone.startsWith('0')
      ? `251${phone.substring(1)}`
      : phone.startsWith('9') || phone.startsWith('7')
        ? `251${phone}`
        : phone;

    const tx_ref = `withdraw-${Date.now()}`;

    const player = await this.playersService.getPlayer(telegramId);
    if (!player) {
      throw new BadRequestException(
        `User with telegram id ${telegramId} not found`,
      );
    }

    const currentBalance = player.balance ? Number(player.balance) : 0;
    if (currentBalance < Number(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Deduct the amount from the user's balance.
    await this.playersService.decrementBalance(telegramId, Number(amount));

    const transaction = this.transactionRepository.create({
      tx_ref,
      telegramId,
      email,
      amount: Number(amount),
      currency: 'ETB',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      payment_url: '',
      type: 'withdrawal',
    });
    const savedTransaction = await this.transactionRepository.save(transaction);

    let chapaResponse;
    try {
      chapaResponse = await axios.post(
        'https://api.chapa.co/v1/transfers',
        {
          amount: Number(amount),
          currency: 'ETB',
          email,
          account_name,
          phone_number: normalizedPhone,
          tx_ref,
          account_number,
          bank_code,
        },
        {
          headers: {
            Authorization: `Bearer CHASECK_TEST-QcecnrQcvalCH2Kn42r5Harqr1dnt4Ig`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log(chapaResponse);
    } catch (error: any) {
      await this.playersService.incrementBalance(telegramId, Number(amount));
      throw new BadRequestException(
        'Withdrawal request failed: ' + error.message,
      );
    }

    if (chapaResponse.data && chapaResponse.data.status === 'success') {
      console.log('3333333333333');
      savedTransaction.status = 'success';
      await this.transactionRepository.save(savedTransaction);
      return {
        message: 'Withdrawal submitted successfully.',
        transactionRecord: savedTransaction,
      };
    } else {
      await this.playersService.incrementBalance(telegramId, Number(amount));
      throw new BadRequestException('Withdrawal request failed.');
    }
  }

  async verifyWithdraw(body: any, headers: any): Promise<any> {
    try {
      const secret = '55a8f9a0a3b6ad0bc3f91bf64a57694b52aca5eb';
      const computedHash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      const { tx_ref } = body;
      if (!tx_ref) {
        throw new BadRequestException('Missing transaction reference');
      }

      console.log('4444444444422222222', tx_ref);

      const verificationResponse = await axios.get(
        `https://api.chapa.co/v1/transfers/verify/${tx_ref}`,
        {
          headers: {
            Authorization: `Bearer CHASECK_TEST-QcecnrQcvalCH2Kn42r5Harqr1dnt4Ig`,
          },
        },
      );

      const { status, data } = verificationResponse.data;
      console.log(verificationResponse);
      if (status === 'success') {
        const transaction = await this.transactionRepository.findOne({
          where: { tx_ref },
        });

        if (!transaction) {
          throw new NotFoundException('Transaction not found');
        }

        transaction.status = 'completed';
        await this.transactionRepository.save(transaction);

        return { message: 'Withdrawal completed successfully.' };
      }

      throw new BadRequestException('Withdrawal verification failed');
    } catch (err: any) {
      throw new BadRequestException(err.response?.data?.message || err.message);
    }
  }

  async getBanks(): Promise<any> {
    try {
      const chapaResponse = await axios.get('https://api.chapa.co/v1/banks', {
        headers: {
          Authorization: `Bearer CHASECK_TEST-QcecnrQcvalCH2Kn42r5Harqr1dnt4Ig`,
          'Content-Type': 'application/json',
        },
      });

      return {
        message: 'Banks retrieved successfully',
        data: chapaResponse.data,
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.response ? error.response.data : error.message,
      );
    }
  }
}
