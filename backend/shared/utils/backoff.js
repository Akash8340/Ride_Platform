const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

/**
 * Exponential backoff with jitter.
 * attempt 0 → roughly 0.5–1s
 * attempt 3 → roughly 4–7s
 * attempt 6+ → capped around 25–30s
 *
 * The jitter (randomness) matters as much as the exponential growth: without
 * it, if 3 services all lose their connection to the same RabbitMQ at the
 * same moment, they'd all retry at exactly 1s, 2s, 4s... in perfect
 * lockstep forever — hammering RabbitMQ the instant it comes back up.
 * Jitter staggers them so retries spread out instead of arriving in a burst.
 */
export function getBackoffDelay(attempt) {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const jitter = Math.random() * exponential * 0.5;
  return Math.floor(exponential / 2 + jitter);
}