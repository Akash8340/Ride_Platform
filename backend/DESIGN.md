# Design Notes — Failure Modes & Trade-offs

This documents every failure mode this system was deliberately built to survive,
which file handles it, and — just as importantly — the gaps we know about and
haven't closed yet. Updated as the project progresses.

## 1. Duplicate ride requests (client retries)

**Problem:** A rider's app times out waiting for a response and retries the same
`POST /rides` call. Without protection, this creates two rides for one intent.

**Fix:** `idempotencyKey` is a unique-indexed field on the `Ride` document
(`ride.model.js`). `createRide` (`ride.service.js`) creates the ride directly —
no "check if it exists, then create" — and catches Mongo's duplicate-key error
(`err.code === 11000`) to return the existing ride instead. Create-then-catch,
not check-then-create, because the latter has a race window between the check
and the write.

## 2. Lost events between services (the outbox pattern)

**Problem:** `booking-service` writes a ride to Mongo, then needs to tell
`matching-service` about it via RabbitMQ. If the Mongo write succeeds and the
publish fails, the ride exists but is invisible to the rest of the system.

**Fix:** The event payload is written into the *same* Mongo document
(`outbox.payload`, `outbox.published: false`) as part of the ride's creation —
one atomic write, so the event can never exist without the ride or vice versa.
A separate background poller (`outbox.poller.js`) finds unpublished events every
2 seconds and publishes them, retrying forever until RabbitMQ is reachable.

**Trade-off documented:** a true outbox pattern usually uses a separate table +
a database transaction. Our MongoDB isn't a replica set, so multi-document
transactions aren't available — embedding the outbox in the ride document gets
the same atomicity guarantee without needing one.

## 3. No drivers available

**Problem:** Not every ride request can be matched. This isn't an error — it's
a legitimate outcome that needs to reach the rider.

**Fix:** `rideRequested.consumer.js` detects both "zero candidates in radius"
and "every candidate already locked," updates the ride to
`RideStatus.NO_DRIVERS_AVAILABLE`, and publishes a `ride.no_drivers_available`
event. `notification-service` dispatches on `msg.fields.routingKey` and pushes
a real-time message to the rider.

## 4. Driver double-booking

**Problem:** Two ride requests could both find the same nearby driver and both
try to assign them.

**Fix:** `lock.service.js`'s `acquireDriverLock` uses `SET key value NX EX` — a
single atomic Redis command, not a check-then-set — so only one caller can ever
win the lock for a given driver. On a successful match, the driver is also
structurally removed from the `drivers:active` GEO set (`markDriverBusy` in
`redis.service.js`), so they stop being a search result at all, not just
temporarily locked.

**Known gap:** `releaseDriverLock` deletes by key without checking the lock's
value first — in a rare timing edge case this could delete a lock a different
process legitimately acquired after the original expired. The fully-correct
version needs a small Lua script (check-then-delete atomically). Not yet done.

## 5. Malformed or malicious input

**Problem:** Every external entry point (driver telemetry, ride creation, ride
status updates, WebSocket registration) accepts client-controlled data.

**Fix:** `zod` schemas validate every one of these before the data reaches any
business logic — `ride.schema.js`, `telemetry.schema.js`, `register.schema.js`.
`ingestion-service` and `notification-service` specifically use `.safeParse()`,
not `.parse()`, because their handlers are long-lived (one bad message shouldn't
crash a connection serving many other clients).

## 6. Processing failures that would otherwise retry forever

**Problem:** `matching-service`'s consumer originally requeued failed messages
unconditionally (`channel.nack(msg, false, true)`) — a permanently-failing
message (e.g. malformed payload) would loop forever, blocking the queue.

**Fix:** `retryOrDeadLetter` (`rabbitmq.service.js`) tracks a retry count via a
message header, requeues up to `MAX_RETRIES` times, then routes the message to
a dead-letter queue (`matching_service.ride_requested.dlq`) instead of retrying
indefinitely — a human can inspect it later.

## 7. Reconnect storms

**Problem:** All three services' RabbitMQ connections originally retried on a
flat 5-second timer — if RabbitMQ went down for any length of time, every
service would hammer it in perfect lockstep the instant it came back.

**Fix:** `shared/utils/backoff.js`'s `getBackoffDelay` grows the retry delay
exponentially (capped at 30s) with random jitter, so retries spread out instead
of arriving in a synchronized burst. Used identically across all three
services' `rabbitmq.service.js`.

## 8. API abuse / accidental request floods

**Problem:** Nothing stopped a client (buggy or malicious) from hammering
`POST /rides` repeatedly.

**Fix:** `rateLimiter.js` — a Redis fixed-window counter (`INCR` + `EXPIRE`),
per-IP, capped at 20 requests/60s on the `/api/v1/rides` routes specifically
(not `/health`).

**Trade-off documented:** this is a fixed-window counter, not a true token
bucket — a client could burst up to ~2x the limit right at a window boundary.
Fails *open* (lets requests through) if Redis itself is unreachable, prioritizing
API availability over strict rate enforcement.

## 9. Cross-service ordering bug (found during testing, not designed in)

**Problem:** `matching-service` originally called `markDriverBusy()` *before*
calling back into `booking-service` to update the ride status. When the
`booking-service` call failed (e.g. it was down) and the message got requeued,
the driver had already been removed from Redis's searchable set on the first
attempt — so the retry found zero candidates, a different failure than the
original one.

**Fix:** Reordered so the HTTP call to `booking-service` happens *before* the
Redis mutation. If the HTTP call fails, nothing has been mutated yet, so a
retry behaves like a genuinely fresh attempt.

**Known gap:** this reduces the specific bug above but the two operations still
aren't atomic as a pair — if the HTTP call succeeds and *then* `markDriverBusy`
fails, the ride would show `ACCEPTED` with a driver still sitting in the
searchable pool. Fully solving this needs a saga/compensating-transaction
pattern, not yet built.

## Known gaps not yet addressed (honest list, not hidden)

- No authentication anywhere — `notification-service`'s `REGISTER` message
  trusts whatever `userId` a client claims to be.
- `notification-service`'s socket registry is in-memory and single-instance —
  running two replicas would mean a client connected to instance A is
  invisible to instance B.
- Dropped notifications (rider/driver not connected when an event fires) are
  logged and discarded, not queued for later delivery.
- No automated tests yet.