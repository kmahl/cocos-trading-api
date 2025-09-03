import { DataSource } from 'typeorm';
import { config } from '../config/database';
import { User, Instrument, Order, MarketData } from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  synchronize: false, // En producción siempre false
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Instrument, Order, MarketData],
  migrations: [],
  subscribers: [],
  ssl: {
    rejectUnauthorized: false, // Para Neon DB
  },
});
