# R2 Storage Layout

## Bucket

- **Name:** `switchboard-ingress` (see `docs/OPERATIONS.md`)
- Objects are immutable after write (treat as append‑only).

## Key Strategy

Keys MUST be deterministic and collision‑resistant; never leak PII in keys.

- Email HTML:

```

email/{yyyy}/{mm}/{dd}/{uuid}/body.html

```

- Email attachment:

```

email/{yyyy}/{mm}/{dd}/{uuid}/att/{n}-{safe-filename}

```

- SMS/MMS media:

```

sms/{yyyy}/{mm}/{dd}/{sid}/media-{n}

```

- Where `{uuid}` is event `id` or a generated payload‑scoped UUID; `{sid}` is Twilio Message SID.

## Metadata

- Each object MUST persist:

```

{ eventId, source, contentType, size, createdAt }

```

- Optional:

```

{ filename?, sha256?, mediaWidth?, mediaHeight? }

```

## Presigned URL Policy

- Default lifetime: **7 days**
- Soft cap: 30 days (never exceed)
- Regeneration: local consumer MAY request regeneration via a small helper endpoint or by re‑signing locally if credentials allow.

## Validation

- Worker MUST validate `contentType` and `size` before upload.
- For MMS media, enforce per‑file and aggregate limits (see [privacy-retention.md](privacy-retention.md)).

## Acceptance

- Any `r2.*.presignedGetUrl` referenced in an event MUST be retrievable until `expiresAt`.
- Keys MUST not contain email addresses or phone numbers.
