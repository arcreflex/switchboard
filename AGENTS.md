# Repository Guidelines

## Project Structure & Module Organization

- `packages/local-consumer`: Node 24 TypeScript daemon (`src/main.ts`).
- `packages/workers/{email-ingress,sms-ingress,outbound}`: Cloudflare Workers (stubs; `src/` to be implemented).
- `specs/`: Source of truth for contracts and behavior.
- `docs/`: Schema and runbooks (see `docs/SCHEMA.md`).
- `infra/`: Wrangler and Twilio setup notes.

## Build, Test, and Development Commands

- `npm run dev` — runs local consumer with watch: `node --watch packages/local-consumer/src/main.ts`.
- `npm start` — runs the consumer once.
- `npm run lint` — ESLint over the repo (Prettier via lint‑staged).
- Pre‑commit hook runs: `tsc --noEmit`, `lint-staged`, `eslint .`.

## Coding Style & Naming Conventions

- Language: TypeScript (Node 24, ESM). Compile options: `noEmit`, strict; erasable TS only.
- Formatting: Prettier (`.prettierrc.json`), semicolons on, singleQuote=false, trailingComma=es5.
- Linting: ESLint (typescript‑eslint recommended config).
- Naming: packages `@switchboard/*`; dirs/files kebab‑case; classes PascalCase; functions/vars camelCase.

## Testing Guidelines

- No formal runner yet. Add unit tests near code as `*.test.ts` when adding logic.
- Aim for focused tests on parsing/normalization and queue/ACK behavior; follow acceptance criteria in `specs/acceptance-tests.md`.
- Keep tests hermetic; avoid network calls (mock providers).

## Commit & Pull Request Guidelines

- Commits: short, imperative subject; explain why in the body; reference issues.
- Keep PRs small and scoped. Include: problem statement, changes, validation steps, and any logs/screenshots.
- Update specs when behavior or contracts change; the specs are authoritative.

## Security & Configuration Tips

- Never log secrets or raw message bodies; redact PII per `specs/privacy-retention.md`.
- Bind secrets via Wrangler (Workers) or `.env.local` (consumer). See `specs/configuration.md`.
- Enforce Twilio signature validation and SSRF allow‑listing for media.

## Specification

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

Authoritative schema: see `docs/SCHEMA.md` for the `SwitchboardEvent` type. Specs refer to fields by path and define invariants rather than restating types.
