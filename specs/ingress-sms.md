# SMS/MMS Ingress Worker (`@switchboard/sms-ingress`)

## Contract

**Input:** Twilio Messaging Webhook (`application/x-www-form-urlencoded`).  
**Output:** A `SwitchboardEvent` enqueued to `switchboard-inbox` and R2 objects for any inbound media.

## Responsibilities

1. **Validate**
   - Verify `X-Twilio-Signature` using Account SID/Auth Token (see [security.md](security.md)).
   - Reject (`401`) on signature failure.
2. **Normalize**
   - Map `From` → `participants.fromPhoneE164`, `To` → `participants.toPhoneE164`.
   - Map text body `Body` → `content.text`.
   - Set `correlation.twilioMessageSid = MessageSid`.
   - Compute `threadKey` ([threading.md](threading.md)).
   - `reply.channel = "sms"`, `reply.toPhoneE164 = participants.fromPhoneE164`.
3. **Fetch Media (if `NumMedia > 0`)**
   - For each `MediaUrl{N}`:
     - Enforce host allow‑list (Twilio media domains).
     - HEAD to read `Content‑Type` and length, reject files beyond configured per‑file and total limits.
     - GET and store in R2 with metadata.
4. **Publish**
   - Publish the event to the queue. On publish failure, return 5xx so Twilio retries.

## Idempotency

- Use `correlation.twilioMessageSid` as dedupe key.

## Limits

- Enforce **max media count** and **total bytes** per message per [privacy-retention.md](privacy-retention.md).  
  (Outbound MMS has stricter limits; inbound is still bounded by policy.)

## Acceptance

- **Given** a signed MMS with 3 images, **then** R2 holds 3 objects with accurate content type/size, and the queue event lists them in `attachments`.
- **Given** an unsigned webhook, **then** return `401` without publishing.
