import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { Order } from './';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email!: string;

  @Column({
    name: 'accountnumber',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  accountNumber!: string;

  // Relaciones
  @OneToMany('Order', 'user')
  orders!: Order[];
}
