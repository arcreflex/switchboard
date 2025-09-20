# Runbook

## Email Ingress

1. Send test mail to `tools+demo@domain`.
2. Confirm Worker persisted large bodies and attachments to R2 with presigned URLs.
3. Verify normalized queue payload matches `SwitchboardEvent` schema.
4. Trigger the local consumer and ensure deferred reply headers thread to the original message.

## SMS/MMS Ingress

1. Send SMS and MMS samples to the Twilio number.
2. Check that media is downloaded and stored in R2, recording content metadata.
3. Inspect queue events and ensure Twilio SIDs flow through to threading metadata.
4. Submit a deferred SMS/MMS reply and confirm StatusCallback delivery updates.

## Resilience

- Interrupt the consumer mid-processing and ensure visibility timeouts return unfinished work.
- Push malformed payloads to exercise DLQ routing.
