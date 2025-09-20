# System Invariants

This file declares **must‑hold** properties across the entire system. Any breach is a bug.

## Identity and Correlation

- `SwitchboardEvent.id` MUST be globally unique and collision‑resistant.
- All logs/metrics/traces MUST include `eventId` = `SwitchboardEvent.id`.

## Event Size and Externalization

- Queue payloads MUST exclude large bodies and media. Bodies and media MUST live in R2 and be referenced via `content.htmlR2` and `content.attachments[*].r2`.
- Target payload budget: **p99 ≤ 32 KiB** (soft limit to ensure portability), even if the underlying queue allows more.

## Idempotency

- Email ingress MUST deduplicate by `correlation.messageId` when present.
- SMS ingress MUST deduplicate by `correlation.twilioMessageSid`.
- Repeated deliveries MUST NOT create duplicate queue events (at‑least‑once inputs become effectively exactly‑once in the queue).

## Threading

- Every event MUST carry a stable `correlation.threadKey` per [threading.md](threading.md).
- Deferred replies MUST preserve provider‑specific threading metadata (e.g., `In‑Reply‑To`, `References` for email).

## Storage

- Every R2 object referenced by an event MUST be retrievable by the consumer until at least `content.*.expiresAt`.
- Presigned URLs MUST NOT exceed the configured max lifetime ([privacy‑retention.md](privacy-retention.md)).

## Security

- Twilio webhooks MUST be signature‑validated.
- Media fetching MUST be restricted to Twilio‑owned hosts to prevent SSRF.
- Secrets MUST never be logged; structured logs MUST redact email addresses and phone numbers per [privacy‑retention.md](privacy-retention.md).

## Reliability

- The queue consumer MUST either ACK or allow re‑delivery after visibility timeout. Partial batch progress MUST be safe (per‑message ACK).
- After **max attempts** (see [queues.md](queues.md)), messages MUST route to DLQ with diagnostic context.

## Observability

- Structured logs MUST include `{ component, eventId, source, outcome, attempt }`.
- Metrics MUST cover: ingress counts, queue lag, processing latency, reply success/failure, DLQ rate.
