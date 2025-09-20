# Privacy & Retention

## Principles

- **Local‑first processing**: heavy/language processing happens on the local consumer.
- **Minimize**: do not store more than needed; prefer references (R2) to embedding.

## Retention

- **Queue payloads**: ephemeral by the queue’s retention.
- **R2 objects**:
  - Default retention: 30 days (configurable).
  - Presigned URLs: 7 days; can be regenerated if the underlying object persists.
- **Logs**: retain 14 days; logs MUST redact PII.

## Redaction

- Redact email local parts and phone middle digits in logs.
- Do not include message bodies in logs.

## Data Subject Rights (manual)

- Given an `eventId`, operators can:
  - Find related R2 objects via metadata.
  - Delete objects and, if necessary, purge DLQ copies.
- Provide a simple script under `infra/` to perform object lookup and purge (future).

## Acceptance

- No presigned URL exceeds the configured TTL.
- Deleting an R2 object makes associated presigned URLs unusable immediately.
