import { Column, Entity, NumericType, ObjectId, ObjectIdColumn } from 'typeorm';

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity()
export class transactions {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  amount: number | null;

  @Column()
  telegramId: string;

  @Column()
  createdAt: Date;

  @Column()
  currency: string;

  @Column()
  email: string;

  @Column()
  payment_url: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: string;

  @Column()
  tx_ref: string;

  @Column()
  type: string;

  @Column()
  updatedAt: Date;
}
