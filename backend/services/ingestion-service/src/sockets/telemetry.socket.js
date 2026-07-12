import { locationUpdateSchema } from '../validators/telemetry.schema.js';
import { updateDriverLocation } from '../services/redis.service.js';
import logger from '../utils/logger.js';

export function handleTelemetryConnection(ws) {
  logger.info('Driver connected');

  ws.on('message', async (data) => {
    let parsed;

    try {
      parsed = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
      return;
    }

    const result = locationUpdateSchema.safeParse(parsed);

    if (!result.success) {
      // .safeParse (not .parse) here on purpose — a malformed ping from one
      // driver should tell that driver "bad data, try again," not crash
      // this handler and disconnect every other driver connected to the
      // same process.
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          message: 'Invalid location payload',
          details: result.error.errors,
        })
      );
      return;
    }

    try {
      await updateDriverLocation(result.data);
    } catch (err) {
      logger.error({ err }, 'Failed to update driver location in Redis');
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to process update' }));
    }
  });

  ws.on('close', () => {
    logger.info('Driver disconnected');
  });
}