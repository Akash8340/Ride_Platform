import { WebSocketServer } from 'ws';
import env from './config/env.js';
import { connectRabbitMQ } from './services/rabbitmq.service.js';
import { onRideMatched } from './consumers/rideMatched.consumer.js';
import { registerClient, getConnectedCount } from './sockets/registry.js';
import logger from './utils/logger.js';

const wss = new WebSocketServer({ port: env.PORT });

wss.on('connection', (ws) => {
  logger.info({ connectedCount: getConnectedCount() + 1 }, 'Client connected');

  ws.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      logger.warn('Received non-JSON message, ignoring');
      return;
    }

    if (parsed.type === 'REGISTER' && parsed.userId) {
      registerClient(parsed.userId, ws);
      logger.info({ userId: parsed.userId }, 'Client registered');
    }
  });

  ws.on('close', () => {
    logger.info('Client disconnected');
  });
});

async function start() {
  await connectRabbitMQ(onRideMatched);
  logger.info(`notification-service listening on ws://localhost:${env.PORT}`);
}

start();