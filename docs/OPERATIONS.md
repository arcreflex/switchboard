# Operations Checklist

## Cloudflare

- Configure Email Routing with a catch-all and send-to-Worker action for `tools@domain`.
- Deploy the `email-ingress` Worker and bind it to the routing rule.
- Provision an R2 bucket (`switchboard-ingress`) for message bodies and media via presigned URLs.
- Create the `switchboard-inbox` queue and attach a DLQ plus an HTTP pull consumer token.
- (Optional) Deploy an `outbound` Worker behind Cloudflare Access.

## Twilio

- Use an MMS-capable number and point the webhook at the `sms-ingress` Worker endpoint.
- Enable request signature validation and set a StatusCallback for delivery events.
- Respect the 5 MB total media cap and the 10-media-per-message limit.

## Local Consumer

- Poll the HTTP consumer binding in batches, setting an appropriate `visibility_timeout`.
- Persist R2 references from queue items when downloading or sending media.
- Build deferred replies via SES/Postmark (email) or the Twilio Messages API (SMS/MMS).
