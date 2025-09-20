# Prelude: intent & purpose

Create a **local-first switchboard** that accepts inbound **email** and **SMS/MMS**, normalizes them into one event shape, enqueues to a **durable cloud queue**, and lets a **local Node/TS daemon** pull, process (LM Studio, Obsidian, Home Assistant, etc.), and **send a deferred reply** on the original channel. Priorities: privacy (work happens locally), durability (queue + DLQ), and simplicity (Cloudflare for ingress/queue, Twilio for messaging).

---

# High-level architecture

- **Email ingress:** Cloudflare **Email Routing → Email Worker → Queue**. Email Workers can parse inbound mail; replying inline is possible but we will not use it here. ([Cloudflare Docs][1])
- **SMS/MMS ingress:** **Twilio → Cloudflare Worker (webhook) → Queue**. Twilio posts sender, text, and media URLs; verify via `X-Twilio-Signature`. ([Twilio][2])
- **Storage:** **R2** for raw `.eml`/HTML and attachments; expose **presigned GET** URLs when needed (e.g., for MMS). ([Cloudflare Docs][3])
- **Queue:** **Cloudflare Queues (HTTP pull)** for your local consumer to poll/ack over HTTPS; configure DLQ. ([Cloudflare Docs][4])
- **Local processing:** Node 24 runs `.ts` files **natively** for erasable TypeScript (type-stripping). Use external sender (SES/Postmark) or Twilio for deferred replies. ([Node.js][5])
- **Deferred replies:**
  - **Email:** send later via SES/Postmark (any recipient) with proper threading headers; Cloudflare “send” from Workers exists but only to **verified destinations**. ([Cloudflare Docs][6])
  - **SMS/MMS:** **Twilio Messages API**; stay within **5 MB** total, ≤10 media; delivery via StatusCallback. ([Twilio][7])

---

# Repo layout

```
switchboard/
  packages/
    workers/
      email-ingress/     # Email Worker
      sms-ingress/       # Twilio webhook Worker
      outbound/          # optional: centralize send (SMS/email) behind Access
    local-consumer/      # Node 24 TS daemon (HTTP pull)
  infra/
    wrangler/            # wrangler.* & bindings
    twilio/              # console steps/checklists
  docs/
    SCHEMA.md
    OPERATIONS.md
    RUNBOOK.md
```

---

# Initialize repo (commands/spec for codex)

1. **Root package**
   - `npm init -y`
   - `package.json`:
     - `"type": "module"`
     - `"engines": { "node": ">=24" }`
     - Scripts:
       - `"dev": "node --watch ./packages/local-consumer/src/main.ts"`
       - `"start": "node ./packages/local-consumer/src/main.ts"`
       - `"lint": "eslint ."`

   - Dev deps: `typescript@latest` (types only, no emit), `@types/node`, `eslint`, `prettier`.
   - `tsconfig.json` (type-check only): `noEmit: true`, `target: "esnext"`, `module: "nodenext"`, `verbatimModuleSyntax: true`, `rewriteRelativeImportExtensions: true`, `erasableSyntaxOnly: true`. Node 24 executes `.ts` with erasable TS; enable `--experimental-transform-types` only if you later use non-erasable TS (e.g., `enum`). ([Node.js][5])

2. **Workspaces**
   - Create package folders listed above; each with its own `package.json` (private), and minimal `src/` with `index.ts`/`main.ts`.

3. **Node execution**
   - Run with `node ./path/to/file.ts` (no build); add `--experimental-transform-types` only if needed. ([Node.js][5])

---

# Unified event schema (single plugin hook)

- **Envelope**
  - `id: string` (UUID)
  - `source: "email" | "sms"`
  - `receivedAt: string` (ISO)
  - `priority?: "low" | "normal" | "high"`
  - `tags?: string[]`

- **Participants**
  - Email: `fromEmail`, `fromName?`, `toEmail`
  - SMS: `fromPhoneE164`, `toPhoneE164`

- **Content**
  - `subject?: string`
  - `text?: string`
  - `htmlR2?: { bucket, key, presignedGetUrl, expiresAt }`
  - `attachments?: { id, filename, contentType, size, r2: { bucket, key, presignedGetUrl, expiresAt } }[]`

- **Correlation / threading**
  - Email: `messageId`, `inReplyTo?`, `references?`
  - SMS: `twilioMessageSid`
  - `threadKey: string` (your own stable key)

- **Reply hints**
  - `reply: { channel: "email" | "sms", toEmail?: string[], toPhoneE164?: string }`

> Keep queue items under the product’s message size ceiling; store bodies/attachments in R2 and reference via presigned URLs. ([Cloudflare Docs][3])

---

# Cloudflare setup (console + config)

1. **Email Routing**
   - Enable for your domain; create `tools@yourdomain`; enable **catch-all** and **subaddressing** to reach the same Worker; action: **Send to Worker**. ([Cloudflare Docs][8])

2. **Email Worker (`email-ingress`)**
   - Parse `message.raw` with a Worker-friendly parser; extract headers (`Message-ID`, `In-Reply-To`, `References`), `subject`, `text`, `html`, attachments.
   - Store large parts in **R2**; generate **presigned GET** URLs.
   - Publish **normalized JSON** to **Queues** (producer binding). (Skip inline replies.)
   - Docs: Email Workers + reply/send/runtime API. ([Cloudflare Docs][1])

3. **R2**
   - Bucket `switchboard-ingress`; use **presigned URLs** for any media Twilio must fetch for outbound MMS. ([Cloudflare Docs][3])

4. **Queues**
   - Queue `switchboard-inbox` + DLQ.
   - Configure **HTTP pull consumer**; create an API token with queues read/ack (optionally IP-restrict). ([Cloudflare Docs][4])

5. **Wrangler bindings**
   - Each Worker: R2 binding (`switchboard-ingress`) + Queues producer (`switchboard-inbox`).
   - Optional `outbound` Worker: credentials for Twilio or SES/Postmark; protect with **Cloudflare Access** if exposed. (Access service tokens/mTLS recommended.)

---

# Twilio setup (console)

1. Buy an **MMS-capable** number; for US, complete **A2P 10DLC** if you expect more than hobby traffic.
2. Configure **Incoming Message Webhook** → your **`sms-ingress` Worker** URL (POST). ([Twilio][2])
3. Implement signature validation using `X-Twilio-Signature` and your Auth Token. ([Twilio][9])
4. Outbound: use **Messages API** (optionally set **StatusCallback**). Respect **5 MB** total size, ≤10 media. ([Twilio][7])

---

# Workers (edge) specs

## `email-ingress`

- Input: Email Routing event.
- Steps:
  - Dispatch by recipient (subaddressing like `tools+label@…`).
  - Parse; persist HTML/attachments to R2; capture `Message-ID`/`References`.
  - Build normalized event; publish to queue.

## `sms-ingress`

- Input: Twilio webhook (`application/x-www-form-urlencoded`).
- Steps:
  - Validate signature.
  - Normalize `From`, `To`, `Body`, `MessageSid`.
  - If `NumMedia>0`, fetch each `MediaUrlN` and store in R2 (keep content type/size).
  - Build normalized event; publish to queue. ([Twilio][10])

## `outbound` (optional)

- `POST /sms`: `{ to, body, mediaUrls?, statusCallback? }` → Twilio Messages API.
- `POST /email`:
  - `external`: proxy to SES/Postmark; set `In-Reply-To` and `References` for threading.
  - `cf-verified`: send via Email Workers **send** only to verified destinations (good for “notify me”). ([Cloudflare Docs][6])

- Protect with Cloudflare Access.

---

# Local consumer (Node 24 TS; single plugin hook)

- **HTTP pull loop:** poll in batches (e.g., 10–50), set `visibility_timeout` for long work, `ack` on success, retry/route to DLQ on failure. ([Cloudflare Docs][4])
- **Hook:**
  - `handle(event, ctx) => { reply?: { channel: "sms" | "email", body: string, media?: R2Refs[] }, artifacts?: ArtifactRef[] }`
  - `ctx` exposes helpers (R2 download, Twilio send, email send, Obsidian writer, Home Assistant client, logger).

- **Deferred reply:**
  - **SMS/MMS:** Twilio Messages API using original `fromPhoneE164`; attach R2 presigned URLs; keep under **5 MB**. ([Twilio][7])
  - **Email:** SES/Postmark from local; set `In-Reply-To` = original `messageId`, include `References` to thread under the original conversation.

- **Config:** `.env.local` with queue credentials, Twilio SID/token, SES/Postmark keys.

---

# Threading rules

- **Email:** preserve `Message-ID` at ingress; set `In-Reply-To` and `References` in the deferred reply so clients thread correctly. (Email Workers can also `reply()` during the inbound event; not used here.) ([Cloudflare Docs][11])
- **SMS:** no explicit thread token; use the same Twilio number and the sender’s E.164.

---

# Test plan

- **Email path:** send to `tools+demo@…`; verify R2 objects, queue item fields, local processing; send deferred email reply and confirm client threading.
- **SMS/MMS path:** send SMS then MMS; confirm R2 storage for media and that outbound MMS with R2 presigned URLs delivers; monitor StatusCallback events. ([Twilio][7])
- **Resilience:** kill the consumer mid-batch; ensure processed are acked and unacked reappear after visibility timeout; push a malformed item and verify DLQ.

---

# One-time checklists

**Cloudflare**

- Email Routing: route `tools@…` to Email Worker; enable catch-all + subaddressing. ([Cloudflare Docs][8])
- R2: create `switchboard-ingress`; use presigned URLs for media. ([Cloudflare Docs][3])
- Queues: create `switchboard-inbox` + DLQ; configure **HTTP pull**; create API token. ([Cloudflare Docs][4])
- (Optional) Outbound Worker protected with Access.

**Twilio**

- MMS-capable number; (US) A2P if needed.
- Inbound webhook → `sms-ingress` Worker. ([Twilio][2])
- Validate signatures; set StatusCallback; respect MMS limits. ([Twilio][9])

---

[1]: https://developers.cloudflare.com/email-routing/email-workers/?utm_source=chatgpt.com "Email Workers · Cloudflare Email Routing docs"
[2]: https://www.twilio.com/docs/usage/webhooks/messaging-webhooks?utm_source=chatgpt.com "Messaging Webhooks"
[3]: https://developers.cloudflare.com/r2/api/s3/presigned-urls/?utm_source=chatgpt.com "Presigned URLs · Cloudflare R2 docs"
[4]: https://developers.cloudflare.com/queues/configuration/pull-consumers/?utm_source=chatgpt.com "Cloudflare Queues - Pull consumers"
[5]: https://nodejs.org/api/typescript.html?utm_source=chatgpt.com "Modules: TypeScript | Node.js v24.8.0 Documentation"
[6]: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/?utm_source=chatgpt.com "Send emails from Workers"
[7]: https://www.twilio.com/docs/messaging/guides/accepted-mime-types?utm_source=chatgpt.com "Accepted content types for media"
[8]: https://developers.cloudflare.com/email-routing/setup/email-routing-addresses/?utm_source=chatgpt.com "Configure rules and addresses · Cloudflare Email Routing ..."
[9]: https://www.twilio.com/docs/usage/webhooks/webhooks-security?utm_source=chatgpt.com "Webhooks Security"
[10]: https://www.twilio.com/docs/messaging/guides/webhook-request?utm_source=chatgpt.com "Twilio's request to your incoming message Webhook URL"
[11]: https://developers.cloudflare.com/email-routing/email-workers/runtime-api/?utm_source=chatgpt.com "Runtime API - Email Routing"
