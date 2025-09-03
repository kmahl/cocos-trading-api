import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { Order } from './';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  accountnumber!: string;

  // Relaciones
  @OneToMany('Order', 'user')
  orders!: Order[];
}
