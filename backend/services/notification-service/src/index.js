import { WebSocketServer } from 'ws';
import env from './config/env.js';
import { connectRabbitMQ } from './services/rabbitmq.service.js';
import { onRideEvent } from './consumers/rideMatched.consumer.js';
import { registerClient, getConnectedCount } from './sockets/registry.js';
import { registerMessageSchema } from './validators/register.schema.js';
import logger from './utils/logger.js';

const wss = new WebSocketServer({ port: env.PORT });

wss.on('connection', (ws) => {
  logger.info({ connectedCount: getConnectedCount() + 1 }, 'Client connected');

  ws.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
      return;
    }

    const result = registerMessageSchema.safeParse(parsed);

    if (!result.success) {
      logger.warn({ errors: result.error.errors }, 'Invalid REGISTER message, ignoring');
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          message: 'Invalid REGISTER payload',
          details: result.error.errors,
        })
      );
      return;
    }

    registerClient(result.data.userId, ws);
    logger.info({ userId: result.data.userId }, 'Client registered');
  });

  ws.on('close', () => {
    logger.info('Client disconnected');
  });
});

async function start() {
  await connectRabbitMQ(onRideEvent);
  logger.info(`notification-service listening on ws://localhost:${env.PORT}`);
}

start();