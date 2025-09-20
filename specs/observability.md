# Observability

## Logging (structured)

- Every log line includes:

```

{ ts, level, component, eventId?, source?, attempt?, msg, err? }

```

- PII redaction:
- Emails → redact local part partially (e.g., `a***@example.com`)
- Phones → redact middle digits (e.g., `+1*******1234`)

## Metrics (suggested)

- **Ingress**
- `ingress_events_total{source}` counter
- `ingress_media_bytes_total{source}`
- **Queue**
- `queue_messages_inflight`
- `queue_ack_total`
- `queue_nack_total`
- `queue_dlq_total`
- `queue_lag_seconds` (if derivable)
- **Processing**
- `handle_duration_seconds` histogram
- `reply_send_total{channel,outcome}`

## Correlation

- `eventId` is the primary correlation key across Workers, consumer, and outbound providers.
- When sending replies, record and log provider message IDs (e.g., Twilio SID) linked to `eventId`.

## Acceptance

- A single event’s journey can be reconstructed across components by `eventId` within 7 days.
