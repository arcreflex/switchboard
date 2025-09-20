# Configuration

## Workers (logical)

- **Bindings** (names are logical; concrete names live in `wrangler.toml`)
  - `QUEUE_INBOX` → Cloudflare Queue (producer)
  - `R2_INGRESS` → R2 bucket binding
  - `ACCESS_AUD` / `ACCESS_POLICY` → if using Cloudflare Access for `outbound`
- **Secrets**
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
  - `EMAIL_PROVIDER_API_KEY` (e.g., SES/Postmark) if Worker proxies outbound
- **Policy**
  - `PRESIGNED_TTL_DAYS` (default 7)
  - `MMS_MAX_FILES` (default 10), `MMS_MAX_TOTAL_BYTES` (policy cap)

## Local Consumer

- **Queue HTTP consumer**
  - `QUEUE_HTTP_ENDPOINT`
  - `QUEUE_HTTP_TOKEN`
  - `QUEUE_MAX_BATCH` (default 32)
  - `QUEUE_VISIBILITY_SECONDS` (default 30)
  - `QUEUE_MAX_ATTEMPTS` (default 10)
- **Providers**
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_E164`
  - `EMAIL_PROVIDER=ses|postmark|...`
  - `EMAIL_FROM`, `EMAIL_REPLY_TO?`
- **Observability**
  - `LOG_LEVEL=info|debug`
  - `METRICS_ENABLE=true|false`

## Configuration Rules

- All configuration MUST be read at startup and validated; fail fast on missing required keys.
- No configuration value may contain PII unless strictly necessary.
