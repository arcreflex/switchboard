# Specification

Detailed specifications for each domain live in the `specs/` directory.

| Topic                  | Description                                         | Link                                                 |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| Architecture           | End‑to‑end system design and scope                  | [architecture.md](specs/architecture.md)             |
| System Invariants      | Cross‑cutting rules the whole system must uphold    | [invariants.md](specs/invariants.md)                 |
| Queues                 | Contracts for enqueue, delivery, retries, and DLQ   | [queues.md](specs/queues.md)                         |
| Email Ingress Worker   | Contract for `@switchboard/email-ingress`           | [ingress-email.md](specs/ingress-email.md)           |
| SMS/MMS Ingress Worker | Contract for `@switchboard/sms-ingress`             | [ingress-sms.md](specs/ingress-sms.md)               |
| Outbound Messaging     | Contract for deferred replies (Worker optional)     | [outbound-messaging.md](specs/outbound-messaging.md) |
| Local Consumer         | Local-first daemon behavior and plugin hook         | [local-consumer.md](specs/local-consumer.md)         |
| R2 Storage Layout      | Bucket, object keys, metadata, presigned URL policy | [r2-storage.md](specs/r2-storage.md)                 |
| Threading Model        | Conversation identity and `threadKey` rules         | [threading.md](specs/threading.md)                   |
| Security Model         | AuthN/Z, signing, secrets, SSRF and abuse controls  | [security.md](specs/security.md)                     |
| Configuration          | Environment bindings and configuration surfaces     | [configuration.md](specs/configuration.md)           |
| Observability          | Logging, metrics, correlation, structured events    | [observability.md](specs/observability.md)           |
| Acceptance Tests       | End‑to‑end and component acceptance criteria        | [acceptance-tests.md](specs/acceptance-tests.md)     |
| Error Catalog          | Error codes, retryability, operator guidance        | [error-catalog.md](specs/error-catalog.md)           |
| Privacy & Retention    | Data minimization, retention, redaction             | [privacy-retention.md](specs/privacy-retention.md)   |

**Authoritative schema:** See `docs/SCHEMA.md` for the `SwitchboardEvent` type. Specs below refer to fields by path (e.g., `content.attachments[*].r2.key`) and define invariants around them rather than restating types.
