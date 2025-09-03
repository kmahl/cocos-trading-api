import './aliasSetup'; // DEBE ser lo primero
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppDataSource } from './data-source';
import { serverConfig } from '@config/database';
import { Logger } from '@utils/logger';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'cocos-trading-api',
  });
});

// Inicializar base de datos y servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos
    await AppDataSource.initialize();
    Logger.database('Database connected successfully');

    // Iniciar servidor
    app.listen(serverConfig.port, () => {
      Logger.info(`Server running on port ${serverConfig.port}`, {
        port: serverConfig.port,
        environment: serverConfig.nodeEnv,
        healthCheck: `http://localhost:${serverConfig.port}/health`,
      });
    });
  } catch (error) {
    Logger.error('Error starting server', error as Error);
    process.exit(1);
  }
};

startServer().catch(error => {
  Logger.error('Unhandled startup error', error);
});
