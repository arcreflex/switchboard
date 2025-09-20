# Security Model

## Inputs

- **Twilio Webhooks**
  - Validate `X-Twilio-Signature` using the canonical base string (method + URL + params).
  - Reject invalid signatures with `401` and do not publish to queue.
  - Media fetch **host allow‑list**: only Twilio media domains.
- **Email Routing**
  - Cloudflare invokes the Worker internally; no public unauthenticated endpoint required.

## Secrets

- Secrets live in platform secret stores (Wrangler for Workers; local `.env.local` for consumer).
- Secrets MUST never be logged. Redact tokens in error messages.

## SSRF and Egress

- When fetching Twilio media, deny private IP ranges and non‑Twilio hosts.
- Set sane timeouts and size caps on media HTTP requests.

## Abuse Controls

- Rate‑limit inbound SMS/MMS by source (`fromPhoneE164`) if necessary (future).
- Drop overly large or too many attachments, with clear error semantics.

## Access Controls

- Optional Outbound Worker MUST be protected by Cloudflare Access or service tokens.
- Queue HTTP consumer token MUST be scoped to read/ack the specific queue only.

## Data Protection

- R2 data is considered sensitive; presigned URLs have bounded lifetime (see [r2-storage.md](r2-storage.md)).
- Logs/metrics MUST minimize PII (phone numbers and emails may be partially redacted).

## Acceptance

- Unsigned or improperly signed Twilio requests MUST be rejected and observable.
- Attempted media fetch to a non‑allow‑listed host MUST be blocked and logged.
