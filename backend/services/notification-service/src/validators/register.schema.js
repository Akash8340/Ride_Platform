import { z } from 'zod';

export const registerMessageSchema = z.object({
  type: z.literal('REGISTER'),
  userId: z.string().min(1, 'userId is required'),
});