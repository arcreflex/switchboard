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
