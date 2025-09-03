import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, Instrument } from './';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}

export enum OrderStatus {
  NEW = 'NEW',
  FILLED = 'FILLED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'instrumentid', nullable: false })
  instrumentid!: number;

  @Column({ name: 'userid', nullable: false })
  userid!: number;

  @Column({ type: 'varchar', length: 10, nullable: false })
  side!: string;

  @Column({ type: 'int', nullable: false })
  size!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price!: number | null;

  @Column({ type: 'varchar', length: 10, nullable: false })
  type!: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status!: string;

  @Column({ type: 'timestamp', nullable: false })
  datetime!: Date;

  // Relaciones
  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'userid' })
  user!: User;

  @ManyToOne(() => Instrument, instrument => instrument.orders)
  @JoinColumn({ name: 'instrumentid' })
  instrument!: Instrument;
}
