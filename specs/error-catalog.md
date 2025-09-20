# Error Catalog

Codes are stable strings for logs/metrics and operator runbooks.

| Code                       | When                                        | Retryable | Notes                                         |
| -------------------------- | ------------------------------------------- | :-------: | --------------------------------------------- |
| `EMAIL_PARSE_FAILED`       | Email Worker cannot parse MIME              |     N     | Move to DLQ; attach `rawHeaderSample` if safe |
| `R2_PUT_FAILED`            | Upload to R2 fails                          |     Y     | Transient; log `contentType`, `size`          |
| `QUEUE_PUBLISH_FAILED`     | Worker→Queue publish fails                  |     Y     | Upstream (CF/Twilio) will retry based on 5xx  |
| `TWILIO_SIGNATURE_INVALID` | Webhook signature invalid                   |     N     | Return `401`; drop                            |
| `MMS_MEDIA_TOO_LARGE`      | Inbound media exceeds policy                |     N     | Reject; publish event without media? (policy) |
| `MMS_FETCH_FAILED`         | Media fetch error                           |     Y     | Treat as transient if network/5xx             |
| `CONSUMER_HANDLER_ERROR`   | Handler throws                              |     Y     | Increment attempts; may DLQ                   |
| `REPLY_EMAIL_SEND_FAILED`  | Email provider error                        |     Y     | Report provider status; include code          |
| `REPLY_SMS_SEND_FAILED`    | Twilio send error                           |     Y     | Include Twilio error code                     |
| `OUTBOUND_UNAUTHORIZED`    | Access to Outbound Worker denied            |     N     | Config issue                                  |
| `POLICY_VIOLATION`         | Any policy breach (limits, host allow‑list) |     N     | Include `policyName`                          |
| `MALFORMED_EVENT`          | Payload doesn't satisfy schema invariants   |     N     | Move to DLQ                                   |
