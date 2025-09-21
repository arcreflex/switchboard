# Outbound Messaging (Deferred Replies)

## Purpose

Send replies after local processing on the original channel (email or SMS/MMS). The local consumer MAY call providers directly or go through the optional `@switchboard/outbound` Worker (protected behind Cloudflare Access).

## Contracts

- **Email replies**
  - MUST preserve threading by setting `In-Reply-To = correlation.messageId` and including `References` when available.
  - From address MUST be configured; reply‑to MAY be configured.
  - Large attachments MUST be uploaded to R2 or sent inline per provider capability (policy‑gated).
- **SMS/MMS replies**
  - MUST be sent from `participants.toPhoneE164` (the Twilio number that received the message) to `participants.fromPhoneE164`.
  - For MMS, total media size and count MUST satisfy provider limits; attachments may reference R2 presigned URLs if supported by provider.

## Optional Outbound Worker

- **Endpoints**
  - `POST /sms` → `{ to, body, mediaUrls?, statusCallback? }`
  - `POST /email` → `{ to[], subject?, text?, html?, attachments? }` (threading headers derived from event)
- **Security**: Cloudflare Access or service token required; no public unauthenticated access.
- **Observability**: MUST log with `eventId`, `providerMessageId`, and provider result.

## Acceptance

- Replying to an email with `correlation.messageId` present MUST thread under the original message in common clients.
- Replying to an SMS MUST succeed for plain text; an MMS exceeding policy limits MUST be rejected locally with a clear error.
