import './aliasSetup'; // DEBE ser lo primero
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppDataSource } from '@/data-source';
import { serverConfig } from '@config/database';

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
    console.log('✅ Database connected successfully');

    // Iniciar servidor
    app.listen(serverConfig.port, () => {
      console.log(`🚀 Server running on port ${serverConfig.port}`);
      console.log(`🌍 Environment: ${serverConfig.nodeEnv}`);
      console.log(
        `🔗 Health check: http://localhost:${serverConfig.port}/health`
      );
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer().catch(console.error);
