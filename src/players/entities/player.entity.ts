import { Column, Entity, NumericType, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity()
export class player {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  telegramId: string;

  @Column()
  name: string;

  @Column()
  phoneNumber: string;

  @Column()
  inviterId: string | null;

  @Column()
  isBanned: boolean;

  @Column()
  preferredLanguage: string | null;

  @Column()
  balance: NumericType | null;

  @Column()
  rewardBalance: NumericType | null;

  @Column()
  registeredAt: Date;
}
