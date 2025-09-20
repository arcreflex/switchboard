# Local Consumer (`@switchboard/local-consumer`)

## Role

A local Node 24 (TypeScript) daemon that pulls from the HTTP consumer, executes a single pluggable handler, and optionally issues deferred replies.

## Execution Model

- **Batch pull**: fetch up to `maxBatch` messages; set `visibility_timeout` to `processingBudget + margin`.
- **Concurrency**: up to `maxConcurrentBatches` batches in flight; per‑message processing is sequential within a batch unless explicitly enabled.
- **ACK discipline**: ACK only after the handler completes successfully.

## Handler Contract

- Logical signature:

```

handle(event: SwitchboardEvent, ctx: Context) => Promise<Result>

```

- **Context** provides:
- `download(r2Ref) => Readable` (convenience for R2 downloads)
- `sendEmail(replySpec)` / `sendSms(replySpec)` (may call providers directly or via Outbound Worker)
- `logger` (structured), `metrics`, `now()`
- **Result** MAY contain:
- `reply?: { channel: "email" | "sms"; ... }` (if the handler wants the framework to send)
- `artifacts?: Array<{ kind: string; r2?: Ref; note?: string }>`
- **Error handling**:
- Throwing marks the message as failed; it will be retried after visibility timeout.

## Scheduling and Priority

- `event.priority` MAY be used to bias scheduling when implemented (e.g., higher priority first). Default FIFO by queue arrival.

## Configuration

See [configuration.md](configuration.md) for queue endpoint, tokens, and provider credentials.

## Acceptance

- Killing the process mid‑run MUST result in re‑delivery after visibility timeout for un‑ACKed messages.
- A handler‑thrown error MUST increment `attempt` and eventually route to DLQ after `maxAttempts`.

## Current vs Intended (2025‑09‑20)

Daemon entrypoint exists (logs “ready”). Implement HTTP pull loop, ACK logic, context helpers, and basic metrics.

````

---

**Create: `specs/r2-storage.md`**

```md
# R2 Storage Layout

## Bucket
- **Name:** `switchboard-ingress` (see `docs/OPERATIONS.md`)
- Objects are immutable after write (treat as append‑only).

## Key Strategy
Keys MUST be deterministic and collision‑resistant; never leak PII in keys.

- Email HTML:
````

email/{yyyy}/{mm}/{dd}/{uuid}/body.html

```
- Email attachment:
```

email/{yyyy}/{mm}/{dd}/{uuid}/att/{n}-{safe-filename}

```
- SMS/MMS media:
```

sms/{yyyy}/{mm}/{dd}/{sid}/media-{n}

```
- Where `{uuid}` is event `id` or a generated payload‑scoped UUID; `{sid}` is Twilio Message SID.

## Metadata
- Each object MUST persist:
```

{ eventId, source, contentType, size, createdAt }

```
- Optional:
```

{ filename?, sha256?, mediaWidth?, mediaHeight? }

```

## Presigned URL Policy
- Default lifetime: **7 days**
- Soft cap: 30 days (never exceed)
- Regeneration: local consumer MAY request regeneration via a small helper endpoint or by re‑signing locally if credentials allow.

## Validation
- Worker MUST validate `contentType` and `size` before upload.
- For MMS media, enforce per‑file and aggregate limits (see [privacy-retention.md](privacy-retention.md)).

## Acceptance
- Any `r2.*.presignedGetUrl` referenced in an event MUST be retrievable until `expiresAt`.
- Keys MUST not contain email addresses or phone numbers.
```
