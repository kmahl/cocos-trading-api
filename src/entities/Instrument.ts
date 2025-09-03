import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { Order, MarketData } from './';

@Entity('instruments')
export class Instrument {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 10, nullable: false })
  ticker!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 10, nullable: false })
  type!: string;

  // Relaciones
  @OneToMany('Order', 'instrument')
  orders!: Order[];

  @OneToMany('MarketData', 'instrument')
  marketData!: MarketData[];
}
