# Architecture

## Purpose

A local‑first switchboard that unifies email and SMS/MMS ingress, emits normalized events into a durable queue, and lets a local TypeScript daemon process and send **deferred replies** on the originating channel.

## Components (logical)

- **Email ingress (Cloudflare Email Worker)** → normalizes inbound mail and publishes to queue.
- **SMS/MMS ingress (Cloudflare Worker)** → validates Twilio webhook, fetches media, publishes to queue.
- **R2 storage** → raw HTML, attachments, MMS media (retrieved at ingress; referenced, not embedded).
- **Queue (HTTP pull)** → durable handoff to the local consumer; DLQ for poison messages.
- **Local consumer (Node 24, TS)** → pulls batches, runs user logic (tools/agents), persists artifacts as needed, optionally triggers deferred replies.
- **Outbound (optional Worker)** → centralized HTTP facade to Twilio/Email providers, protected behind Cloudflare Access. Local consumer MAY bypass this and call providers directly.

## Data Flow (happy path)

1. **Inbound**
   - Email → Email Worker → R2 (bodies/attachments as needed) → `SwitchboardEvent` → Queue.
   - SMS/MMS → SMS Worker → fetch Twilio media → R2 → `SwitchboardEvent` → Queue.
2. **Processing**
   - Local consumer pulls N events (visibility timeout set), executes handler, emits logs/metrics, and **ACKs** on success.
3. **Deferred Reply (optional per event)**
   - Local consumer (or Outbound Worker) sends reply via Twilio or mail provider with threading metadata.
4. **Observability**
   - `SwitchboardEvent.id` is the **correlation ID** across logs, metrics, and provider requests.

## Scope (MVP)

- Email + SMS/MMS ingress
- R2 persistence and presigned GET URLs
- Queue with HTTP pull and DLQ
- Local consumer with single `handle(event, ctx)` hook
- Deferred replies via Twilio and external email provider
- Basic observability and error catalog

## Out of Scope (initially)

- Inline email replies inside the Email Worker
- Rich policy engine for routing/priority
- Multi-tenant isolation
- GUI

## Authoritative References

- Unified schema: `docs/SCHEMA.md`
- Operations and Runbook: `docs/OPERATIONS.md`, `docs/RUNBOOK.md`

## Current vs Intended (2025‑09‑20)

**Current:** Worker stubs and a minimal local consumer entrypoint.  
**Intended:** Full behavior per specs below, including storage, queueing, signature validation, retries, and deferred replies.
