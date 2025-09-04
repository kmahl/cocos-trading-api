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
  // Logging configurado específicamente
  logging: false, // Cambiar a 'all', ['query'], o false según necesites
  logger: 'simple-console', // Formato limpio de logs
  entities: [User, Instrument, Order, MarketData],
  migrations: [],
  subscribers: [],
  ssl: {
    rejectUnauthorized: false, // Para Neon DB
  },
});
