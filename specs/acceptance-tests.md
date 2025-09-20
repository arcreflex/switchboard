# Acceptance Tests

Acceptance criteria are expressed as behavior; implementation may vary. Use fixtures and synthetic events.

## Email Ingress

- **Parse + Persist**
  - Given an email with HTML and 2 attachments,
  - When processed by `email-ingress`,
  - Then R2 contains 3 objects, and the queue message contains references with valid presigned URLs.
- **Idempotency**
  - Given the same message delivered twice (same `Message-ID`),
  - Then only one queue message exists.

## SMS/MMS Ingress

- **Signature**
  - Given a webhook with an invalid `X-Twilio-Signature`,
  - Then the Worker returns `401` and nothing is published.
- **Media**
  - Given an MMS with 3 images,
  - Then R2 has 3 objects, and the queue message lists 3 attachments with content type/size set.

## Queue + Consumer

- **Visibility Timeout**
  - Given the consumer processes a batch and crashes before ACK,
  - Then un‑ACKed messages reappear after `visibility_timeout`.
- **DLQ**
  - Given a poisoned message that always fails,
  - Then after `maxAttempts` it appears in DLQ with `lastError`.

## Deferred Replies

- **Email Threading**
  - Given an event with `correlation.messageId`,
  - When the consumer replies via email,
  - Then common clients thread the reply beneath the original.
- **MMS Policy**
  - Given a reply with media exceeding policy,
  - Then the send is rejected locally with a clear error and no provider call is made.
