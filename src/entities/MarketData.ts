import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Instrument } from './';

@Entity('marketdata')
export class MarketData {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'instrumentid', nullable: false })
  instrumentid!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  high!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  low!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  open!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  close!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousclose!: number | null;

  @Column({ type: 'date', nullable: false })
  date!: Date;

  // Relaciones
  @ManyToOne(() => Instrument, instrument => instrument.marketData)
  @JoinColumn({ name: 'instrumentid' })
  instrument!: Instrument;
}
