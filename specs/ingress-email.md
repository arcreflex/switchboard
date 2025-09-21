# Email Ingress Worker (`@switchboard/email-ingress`)

## Contract

**Input:** Cloudflare Email Routing event.  
**Output:** A `SwitchboardEvent` enqueued to `switchboard-inbox` and (when needed) R2 objects for HTML/attachments.

## Responsibilities

1. **Parse**
   - Extract envelope participants (`from`, `to`), subject, plain text, HTML, attachments.
   - Extract headers for correlation (`Message-ID`, `In-Reply-To`, `References`).
2. **Persist**
   - Large parts (HTML, attachments) MUST be stored in R2 with metadata (content type, size).
   - Generate presigned GET URLs with bounded expiry (see [r2-storage.md](r2-storage.md), [privacy-retention.md](privacy-retention.md)).
3. **Normalize**
   - Construct `SwitchboardEvent`:
     - `source = "email"`
     - `participants.fromEmail`, `participants.fromName?`, `participants.toEmail`
     - `content.subject`, `content.text` (plain only), `content.htmlR2?`
     - `content.attachments[]` describing R2 artifacts
     - `correlation.messageId`, `inReplyTo?`, `references?`, and computed `threadKey` ([threading.md](threading.md))
     - `reply.channel = "email"` with `reply.toEmail[]` defaulting to the original sender (configurable)
4. **Publish**
   - Publish the event to the queue. On publish failure, return 5xx so upstream retries.

## Idempotency

- If `Message-ID` is present, it MUST be used as the dedupe key. Duplicate deliveries MUST NOT create new queue messages.

## Size Discipline

- Worker MUST keep the event body small; no raw HTML or binary parts inline.

## Security

- Never include presigned URLs with excessive lifetime.
- Strip potentially dangerous HTML before deriving `content.text` (no need to sanitize HTML itself since it is stored, not rendered here).

## Acceptance (examples)

- **Given** an email with HTML + 2 attachments (1 MB total), **when** processed, **then** the queue event references R2 for HTML and both attachments, and total event payload remains under the budget.
- **Given** a duplicate email delivery with the same `Message-ID`, **then** only one queue event exists.
