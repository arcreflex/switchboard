# Queues

## Purpose

Durable handoff from edge Workers to the local consumer using HTTP pull semantics, with retries and a dead‑letter queue (DLQ).

## Bindings and Logical Names

- **Primary queue:** `switchboard-inbox`
- **DLQ:** `switchboard-inbox-dlq`
- **Producer binding (Workers):** `"QUEUE_INBOX"` (logical)
- **HTTP pull consumer:** Local daemon uses access token bound via local config (see [configuration.md](configuration.md))

> Exact binding names live in `infra/wrangler/README.md` and `wrangler.toml`. This spec defines logical intent.

## Delivery Semantics

- **At‑least‑once** delivery from queue to consumer.
- Consumer MUST set a `visibility_timeout` sufficiently greater than expected processing time.
- Each message is ACKed individually.

## Retry Model

- Worker‑to‑Queue publish: if publish fails, Worker MUST return an error (5xx) to upstream and rely on upstream retry (Cloudflare Email Routing / Twilio).
- Queue‑to‑Consumer: on handler error, the consumer MUST NOT ACK. The message becomes visible again after the visibility timeout and increments `attempt`.

### Backoff and Limits (defaults)

- `initialVisibility`: 30s
- `maxAttempts` (before DLQ): 10
- `maxBatch`: 32
- `maxConcurrentBatches`: 4 (local setting)
- These are **policy defaults**; see [configuration.md](configuration.md).

## Envelope Expectations

- Message body MUST be a `SwitchboardEvent` per `docs/SCHEMA.md`.
- `receivedAt` MUST be ISO 8601 UTC.
- `priority` MAY influence consumer scheduling when implemented (not required for MVP).

## DLQ Content

- DLQ message MUST include the original payload and failure metadata `{ lastError, attempts, firstSeenAt, lastSeenAt }`.

## Idempotency at Consumer

- Consumer MUST protect against duplicate deliveries using a short‑lived in‑memory de‑dupe (LRU keyed by `event.id`) during the current process lifetime.
- This does not replace upstream idempotency at ingress; it minimizes accidental duplicate processing under race.

## Acceptance

- Pushing N malformed events MUST result in N DLQ messages with a non‑empty `lastError`.
- Killing the consumer mid‑batch MUST return un‑ACKed messages to the queue after visibility timeout.
