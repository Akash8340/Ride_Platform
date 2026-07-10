import { Router } from 'express';
import {
  createRideHandler,
  updateRideStatusHandler,
  getRideHandler,
} from '../controllers/ride.controller.js';

const router = Router();

router.post('/', createRideHandler);
router.get('/:id', getRideHandler);
router.patch('/:id/status', updateRideStatusHandler);

export default router;