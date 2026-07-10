import express from 'express';
import pinoHttp from 'pino-http';
import rideRoutes from './routes/ride.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/rides', rideRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;