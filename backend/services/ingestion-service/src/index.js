import { WebSocketServer } from 'ws';
import env from './config/env.js';
import { handleTelemetryConnection } from './sockets/telemetry.socket.js';
import logger from './utils/logger.js';

const wss = new WebSocketServer({ port: env.PORT });

wss.on('connection', handleTelemetryConnection);

logger.info(`ingestion-service listening on ws://localhost:${env.PORT}`);