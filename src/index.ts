import './aliasSetup'; // DEBE ser lo primero
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppDataSource } from './data-source';
import { serverConfig } from '@config/database';
import { Logger } from '@utils';
import { globalErrorHandler } from '@middlewares';
import apiRoutes from './routes';

const app = express();

// Middlewares de seguridad y parsing
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routesasdsad
app.use('/api', apiRoutes);

// Global error handler (debe ir al final)
app.use(globalErrorHandler);

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
