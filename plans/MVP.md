# Detailed Implementation Plan (by GPT-5 Pro)

## 0) What changed recently that affects us

- **Wrangler config:** As of Wrangler **v3.91+**, Cloudflare supports both TOML and JSON **and recommends `wrangler.jsonc`** for new projects (some newer features are JSON‑only). We’ll adopt `wrangler.jsonc` per worker, kept inside each package. ([Cloudflare Docs][1])
- **Queues pull consumers:** Cloudflare now ships first‑class **HTTP pull consumers** with CLI support (`wrangler queues consumer http add <QUEUE>`). You can switch a queue between push (Worker) and pull (HTTP) consumer, but **only one consumer type** can be active at a time. We’ll use the pull mode for the local daemon. ([Cloudflare Docs][2])
- **Email Workers (local dev + sending):** Email Workers have official **local development** support via `wrangler dev` (you can POST a raw email to a local endpoint to trigger `email()`), and Workers may **send mail** to **verified** addresses once Email Routing is enabled and a `send_email` binding is configured. We’ll rely on local dev for fast iteration and keep production sending to verified destinations only. ([Cloudflare Docs][3])

---

## 1) Milestones & deliverables (build order that reduces risk)

> Each milestone yields a demoable artifact and updates docs & runbook.

**M0. Foundation (Cloudflare/Twilio)**

- Create **R2** bucket `switchboard-ingress`. Bind it to Workers. ([Cloudflare Docs][4])
- Create **Queues** `switchboard-inbox` + DLQ. Enable **HTTP pull consumer** and capture its endpoint + token for the local daemon. ([Cloudflare Docs][5])
- Enable **Email Routing** on your domain and add a rule **Send to Worker** for `tools@…`. ([Cloudflare Docs][6])
- In Twilio, provision an **MMS‑capable number**, set the **incoming webhook** to the `sms-ingress` Worker URL, and **enable webhook signature validation**. (We’ll validate `X‑Twilio‑Signature`.) ([Twilio][7])
- Set **Wrangler secrets** (Twilio, email provider) via `wrangler secret put`. ([Cloudflare Docs][8])

**M1. Workers (edge)**

- **`@switchboard/email-ingress`**: parse MIME, persist large parts to R2, publish **normalized** `SwitchboardEvent` to queue, dedupe by `Message‑ID`.
- **`@switchboard/sms-ingress`**: validate Twilio signature, fetch & store MMS media to R2 (with Basic Auth if Twilio media auth is enforced), publish event, dedupe by `MessageSid`. (When **sending** MMS later, URLs must be **publicly accessible**—we’ll use **R2 presigned GET** URLs.) ([Twilio][9])

**M2. Local daemon (`@switchboard/local-consumer`)**

- Implement **HTTP pull** loop (batching, visibility timeout, ACK/NACK, DLQ) driven by `.env.local` fields already defined in `specs/configuration.md`. Implement the single `handle(event, ctx)` hook described in the specs.&#x20;

**M3. Deferred replies (providers)**

- **SMS/MMS** via Twilio Messages API (respect ≤10 media and \~5MB aggregate). ([Cloudflare Docs][10])
- **Email** via SES/Postmark or (optionally) via Email Workers for **verified** recipients. Always set `In‑Reply‑To` & `References`. ([Cloudflare Docs][10])

**M4. Observability & hardening**

- Enable **Workers Logs** (Wrangler `observability`), add structured logs with `eventId`. ([Cloudflare Docs][11])
- Wire up acceptance tests mapped to `specs/acceptance-tests.md`.&#x20;

---

## 2) Repository layout (affirm & fill gaps)

Keep the repo as‑is (workspaces per Worker + local daemon). Add **one `wrangler.jsonc` per Worker** under `packages/workers/*`, and extend `infra/wrangler/README.md` with the CLI checklists in this plan. Specs remain the **source of truth** for contracts and invariants; keep them in sync as behavior lands.&#x20;

---

## 3) Cloudflare setup (authoritative, copy/paste friendly)

### 3.1 Create storage and queues

```bash
# R2 bucket
npx wrangler r2 bucket create switchboard-ingress
# Queues (primary + DLQ)
npx wrangler queues create switchboard-inbox
npx wrangler queues create switchboard-inbox-dlq
# Enable HTTP pull consumer for the primary queue
npx wrangler queues consumer http add switchboard-inbox
# (Wrangler prints the consumer endpoint + token; store as QUEUE_HTTP_ENDPOINT/QUEUE_HTTP_TOKEN)
```

Refs: Create R2 buckets (CLI), Queues getting started, Pull consumer CLI. ([Cloudflare Docs][4])

### 3.2 Email Routing (+ local dev)

- In Cloudflare, enable **Email Routing** and add an address/rule **“Send to Worker”** for `tools@yourdomain`. For local testing, Wrangler exposes `/cdn-cgi/handler/email` so you can `curl` a raw message to trigger your `email()` handler. ([Cloudflare Docs][6])

### 3.3 Secrets

```bash
# Run inside each worker’s package folder (sms-ingress / outbound if used)
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
# If using a provider behind the outbound worker:
npx wrangler secret put EMAIL_PROVIDER_API_KEY
```

Wrangler secrets documentation. ([Cloudflare Docs][8])

---

## 4) Per‑Worker wrangler.jsonc (vetted with current schema)

> We’ll use **JSONC** (comment‑tolerant) config per Cloudflare guidance. ([Cloudflare Docs][1])

### 4.1 `packages/workers/email-ingress/wrangler.jsonc`

```jsonc
{
  "name": "switchboard-email-ingress",
  "main": "src/index.ts",
  "compatibility_date": "2025-09-01",
  "observability": { "enabled": true },
  // Bind R2 for bodies/attachments
  "r2_buckets": [
    { "binding": "R2_INGRESS", "bucket_name": "switchboard-ingress" },
  ],
  // Bind queue producer
  "queues": {
    "producers": [{ "binding": "QUEUE_INBOX", "queue": "switchboard-inbox" }],
  },
  // Optional: enable sending in dev / verified-send in prod
  "send_email": [{ "name": "EMAIL" }],
}
```

R2 binding & Queue producer binding syntax. ([Cloudflare Docs][12])

### 4.2 `packages/workers/sms-ingress/wrangler.jsonc`

```jsonc
{
  "name": "switchboard-sms-ingress",
  "main": "src/index.ts",
  "compatibility_date": "2025-09-01",
  "observability": { "enabled": true },
  "r2_buckets": [
    { "binding": "R2_INGRESS", "bucket_name": "switchboard-ingress" },
  ],
  "queues": {
    "producers": [{ "binding": "QUEUE_INBOX", "queue": "switchboard-inbox" }],
  },
}
```

### 4.3 (Optional) `packages/workers/outbound/wrangler.jsonc`

```jsonc
{
  "name": "switchboard-outbound",
  "main": "src/index.ts",
  "compatibility_date": "2025-09-01",
  "observability": { "enabled": true },
  "vars": { "ALLOW_ORIGINS": "https://your-access-gateway" },
}
```

> **Observability:** `observability.enabled = true` persists Worker logs in the dashboard; you can adjust `head_sampling_rate` later. ([Cloudflare Docs][11])

---

## 5) Worker implementations (edge)

### 5.1 `@switchboard/email-ingress`

**Handler:** implement `email(message, env, ctx)` (runtime API). Parse MIME with `postal-mime`, persist large parts to R2, then `env.QUEUE_INBOX.send(event)`. Keep queue payload small; put HTML + attachments in R2 and include **presigned GET** URLs with bounded TTL. ([Cloudflare Docs][13])

**Skeleton (TypeScript, module Worker):**

```ts
// packages/workers/email-ingress/src/index.ts
import PostalMime from "postal-mime";
import type { SwitchboardEvent } from "../../../docs/SCHEMA"; // or a local types file

export interface Env {
  R2_INGRESS: R2Bucket;
  QUEUE_INBOX: Queue;
}

export default {
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext) {
    const parsed = await PostalMime.parse(message.raw);
    // 1) Extract participants + headers
    const fromAddr = parsed.from?.address ?? "";
    const toAddr = parsed.to?.[0]?.address ?? "";
    const msgId =
      message.headers.get("message-id") ??
      parsed.messageId ??
      crypto.randomUUID();

    // 2) Persist large parts to R2 (html, attachments)
    const eventId = crypto.randomUUID();
    const date = new Date();
    const base = `email/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${eventId}`;
    let htmlRef: any;
    if (parsed.html) {
      const key = `${base}/body.html`;
      await env.R2_INGRESS.put(key, parsed.html, {
        httpMetadata: { contentType: "text/html" },
      });
      htmlRef = {
        bucket: "switchboard-ingress",
        key /* presigned URL created later by consumer or here if you prefer */,
      };
    }
    const attachments = [];
    for (let i = 0; i < (parsed.attachments?.length ?? 0); i++) {
      const a = parsed.attachments![i];
      const key = `${base}/att/${i}-${(a.filename ?? "file").replace(/[^\w.-]+/g, "_")}`;
      await env.R2_INGRESS.put(key, a.content, {
        httpMetadata: { contentType: a.mimeType },
      });
      attachments.push({
        id: crypto.randomUUID(),
        filename: a.filename ?? "attachment",
        contentType: a.mimeType,
        size: a.size,
        r2: { bucket: "switchboard-ingress", key },
      });
    }

    // 3) Build normalized event (keep text/plain inline only)
    const event: SwitchboardEvent = {
      id: eventId,
      source: "email",
      receivedAt: new Date().toISOString(),
      participants: { fromEmail: fromAddr, toEmail: toAddr },
      content: {
        subject: parsed.subject ?? "",
        text: parsed.text ?? "",
        htmlR2: htmlRef,
        attachments,
      },
      correlation: {
        messageId: msgId,
        inReplyTo: message.headers.get("in-reply-to") ?? undefined,
        references: message.headers.get("references") ?? undefined,
        threadKey: "<compute>",
      },
      reply: { channel: "email", toEmail: [fromAddr] },
    };

    // 4) Publish to queue
    await env.QUEUE_INBOX.send(event);

    // Optionally set dedupe (KV) here; see §7.3
  },
};
```

- **Parsing & handler shape**: Email runtime (`email()`) and parsing with postal‑mime are idiomatic for Email Workers today. ([Cloudflare Docs][13])
- **Send to queue** uses the Queue binding (`env.MY_QUEUE.send`). ([Cloudflare Docs][14])

### 5.2 `@switchboard/sms-ingress`

**Handler:** `fetch(request, env, ctx)`. Steps: (1) validate `X‑Twilio‑Signature` (HMAC‑SHA1 of URL + sorted params using your Auth Token), (2) normalize fields, (3) fetch media if `NumMedia>0` (Twilio **may enforce HTTP Basic Auth** for media; use Account SID/API Key + secret), (4) persist media to R2, (5) publish normalized event to queue. ([Twilio][7])

**Signature validation outline (Workers):**

```ts
async function isValidTwilioSignature(
  req: Request,
  authToken: string
): Promise<boolean> {
  // Twilio signature spec: base string is full URL + concatenated POST params (x-www-form-urlencoded) sorted by key
  // 1) Read URL and body params
  const url = new URL(req.url);
  const contentType = req.headers.get("content-type") || "";
  const params = contentType.includes("application/x-www-form-urlencoded")
    ? Array.from(new URLSearchParams(await req.text()))
    : [];
  // 2) Build canonical string: url + key1value1 + key2value2 ...
  params.sort(([a], [b]) => a.localeCompare(b));
  const base = url.toString() + params.map(([k, v]) => k + v).join("");
  // 3) Compute HMAC-SHA1(base, authToken) and compare (constant time) to header
  const signature =
    req.headers.get("X-Twilio-Signature") ??
    req.headers.get("x-twilio-signature") ??
    "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(base)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes))); // Twilio uses base64 output
  return timingSafeEqual(signature, expected);
}
```

Twilio webhook signature rules (HMAC‑SHA1 & header), including lower‑cased header in some transports. ([Twilio][7])

**Inbound media fetching:** If **HTTP Basic Auth** for media is enabled in your Twilio Console (Twilio began enforcing this; many accounts have it on), fetch with `Authorization: Basic base64( SID:AUTH_TOKEN )` (or API Key/Secret). For **outbound MMS**, Twilio requires **publicly accessible** media URLs; we’ll use **R2 presigned URLs** with short TTL. ([Twilio][9])

---

## 6) Local daemon (`@switchboard/local-consumer`)

**Execution model** (pull/ACK):

- Read `QUEUE_HTTP_ENDPOINT`, `QUEUE_HTTP_TOKEN`, batch size, visibility timeout, and max attempts from `.env.local` (these are already specified in `specs/configuration.md`). Implement a loop that: (1) pulls up to N messages, (2) processes each with `handle(event, ctx)`, (3) ACKs on success, (4) NACK or omit ACK on failure to trigger retry after visibility timeout, and (5) sends to DLQ after max attempts (server‑side).&#x20;

> Cloudflare exposes **HTTP pull consumer** endpoints and a bearer token you generate via `wrangler queues consumer http add <queue>`. Keep the token scoped to the one queue. ([Cloudflare Docs][2])

**Node TypeScript (no build):** Node 24+ can execute TypeScript files containing only **erasable** TS syntax; for non‑erasable TS (e.g., `enum`), enable `--experimental-transform-types`. Your repo’s `tsconfig.json` already opts into erasable‑only TS. ([Node.js][15])

---

## 7) Cross‑cutting details you’ll want right the first time

### 7.1 Presigned URLs (R2)

Use **S3‑compatible SigV4** to create **time‑boxed presigned GET** URLs (e.g., via `aws4fetch`) for HTML and attachments (email) and media (MMS). Keep TTL ≤ 7 days (policy). ([Cloudflare Docs][16])

### 7.2 Queue publish & content type

Workers publish with `env.MY_QUEUE.send(body)`; default content type is JSON, which matches our event payload. (Avoid `waitUntil()` swallowing errors; publish directly and check for failure.) ([Cloudflare Docs][14])

### 7.3 Idempotency at ingress

To strictly dedupe duplicate inbound deliveries, add a tiny **KV namespace** and `put(key, value, {expirationTtl: …})` keyed by `Message‑ID` (email) or `MessageSid` (SMS). TTL can match your operational replay horizon (e.g., 7 days). In Workers, bind KV via `kv_namespaces` and use the KV write API TTL. ([Cloudflare Docs][17])

### 7.4 Observability

Enable Worker logs (`observability.enabled = true`) and use structured lines `{ ts, level, component, eventId, source, outcome }`. Tail locally with `wrangler dev` and in prod view Workers Logs. ([Cloudflare Docs][11])

### 7.5 Email Worker local testing

During dev, you can **POST a raw email** to `http://localhost:8787/cdn-cgi/handler/email` (wrangler dev) to trigger your `email()` handler and iterate on parsing and R2 upload logic quickly. ([Cloudflare Docs][3])

### 7.6 Twilio MMS limits (for replies)

When sending **MMS**, keep within Twilio’s **accepted MIME types** and size/count caps (commonly ≤10 media, ≤\~5MB total). Enforce **outbound** checks locally before calling Twilio. ([Cloudflare Docs][10])

---

## 8) Acceptance tests (map to your `specs/acceptance-tests.md`)

- **Email parse+persist**: send HTML+2 attachments → confirm **3 objects in R2**; queue event holds presigned refs.
- **Email idempotency**: resend same `Message-ID` → no duplicate published.
- **SMS signature**: bad signature → `401` and no publish.
- **MMS media**: inbound with 3 images → **3 objects in R2**, queue event lists them with type/size.
- **Visibility timeout**: crash during batch → un‑ACKed messages reappear.
- **DLQ**: poison message → routes to DLQ with lastError after maxAttempts.
- **Email threading**: reply preserves `In-Reply-To`/`References`.
- **MMS policy**: oversized outbound MMS is rejected locally with a clear error before provider call.
  (These are already authored in `specs/acceptance-tests.md`—keep them as your running contract.)&#x20;

---

## 9) Security & privacy checklist

- **Twilio signature validation** (HMAC‑SHA1) on every webhook; reject on mismatch. ([Twilio][7])
- **Media fetching allow‑list**: only Twilio media hosts; block private IPs (SSRF).
- **Twilio media auth**: if “enforce HTTP Basic Auth” is on, use Basic Auth for **inbound** media. **Outbound** MMS must use **publicly accessible URLs** (use short‑lived R2 presigned URLs). ([Twilio][9])
- **Secrets** only via Wrangler/secret store; never log raw bodies/PII; redact per `specs/privacy-retention.md`.&#x20;

---

## 10) Dev ergonomics (commands you will actually run)

```bash
# Root: quick dev for the local daemon
npm run dev

# Email worker: iterate locally + test via local email endpoint
cd packages/workers/email-ingress
npx wrangler dev
# then, in another shell, post a sample:
# curl -XPOST 'http://localhost:8787/cdn-cgi/handler/email?from=a@x&to=tools@domain' \
#   -H 'content-type: text/plain' --data-binary @fixtures/sample.eml

# SMS worker: iterate locally with a sample x-www-form-urlencoded payload
cd ../sms-ingress
npx wrangler dev
# curl -d 'From=%2B15551234567&To=%2B15557654321&Body=hi&MessageSid=SM123...' \
#   -H 'content-type: application/x-www-form-urlencoded' http://localhost:8787/

# Deploy Workers
npx wrangler deploy  # run inside each worker package
```

Local Email Worker dev + send/receive simulation, powered by current `wrangler dev`. ([Cloudflare Docs][3])

---

## 11) Example: minimal publish from a Worker (Queue API today)

```ts
// inside any Worker with a producer binding:
export interface Env {
  QUEUE_INBOX: Queue;
}
export default {
  async fetch(req: Request, env: Env) {
    await env.QUEUE_INBOX.send({ hello: "world", ts: Date.now() });
    return new Response("ok");
  },
};
```

Queue producer API (`env.MY_QUEUE.send`, JSON by default). ([Cloudflare Docs][14])

---

## 12) Open decisions (keep small, explicit)

1. **Where to generate presigned URLs?**
   - **Option A (Workers at ingress):** generate presigned GET on write; URLs flow through events.
   - **Option B (Local daemon):** carry _keys only_ in events; generate presigned URLs **on demand** when sending or displaying.

   > Choose B for least exposure; A only if consumers outside the daemon need immediate access. ([Cloudflare Docs][16])

2. **Idempotency store:** Use **Workers KV** with 7‑day TTL per correlation key (`Message-ID`, `MessageSid`), bound only to ingress Workers. (Cheap, simple, good enough.) ([Cloudflare Docs][17])

3. **Outbound email path:** Prefer **SES/Postmark** from the daemon for unverified recipients; use Email Workers **send** only for **verified addresses** or notifications. ([Cloudflare Docs][10])

---

## 13) Wiring this into the repo (PR checklist)

- [ ] Add `wrangler.jsonc` in each `packages/workers/*` per §4.
- [ ] Implement `email()`/`fetch()` handlers per §5 with TODOs flagged for: R2 key layout, presign policy, KV idempotency.
- [ ] Add **KV namespace** (optional but recommended) for dedupe and bind it only to ingress Workers. ([Cloudflare Docs][17])
- [ ] Add `.env.local` template for the daemon with `QUEUE_HTTP_ENDPOINT`, `QUEUE_HTTP_TOKEN`, Twilio creds, email provider creds (names match `specs/configuration.md`).&#x20;
- [ ] Document runbooks under `docs/RUNBOOK.md` and ops steps under `docs/OPERATIONS.md` with the exact CLI we used here.&#x20;
- [ ] Add acceptance test fixtures (sample `.eml`, sample MMS form payloads).
- [ ] Enable **Workers Logs** and confirm we see structured `eventId` flow in logs end‑to‑end. ([Cloudflare Docs][11])

---

## 14) Appendix: snippets you can reuse

### A. Typical R2 key layout (already in specs; included here for convenience)

```
email/{yyyy}/{mm}/{dd}/{uuid}/body.html
email/{yyyy}/{mm}/{dd}/{uuid}/att/{n}-{safe-filename}
sms/{yyyy}/{mm}/{dd}/{sid}/media-{n}
```

Keys avoid PII and are deterministic by day/event.&#x20;

### B. Minimal `sms-ingress` media GET with Basic Auth (if enabled)

```ts
const authHeader = "Basic " + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
const mediaUrl = form.get("MediaUrl0"); // example
const resp = await fetch(mediaUrl!, { headers: { Authorization: authHeader } });
if (!resp.ok) throw new Error(`MMS fetch failed: ${resp.status}`);
const contentType =
  resp.headers.get("content-type") ?? "application/octet-stream";
const buf = await resp.arrayBuffer();
await env.R2_INGRESS.put(r2Key, buf, { httpMetadata: { contentType } });
```

Twilio media auth enforcement (Basic Auth) + outbound MMS’s public URL requirement. ([Twilio][9])

---

### Why this plan is low‑friction

- **No heavy frameworks**: Workers + tiny libs only where necessary (`postal-mime`), plain TS for the daemon.
- **Future‑proof Wrangler config**: `wrangler.jsonc`, Observability on, per‑worker bindings. ([Cloudflare Docs][1])
- **Provider‑correct edges**: Twilio signature, Twilio media auth, R2 presigned URLs, Email Workers verified‑send constraints. ([Twilio][7])

If you want, I can follow up with **ready‑to‑drop `wrangler.jsonc` files** for each Worker tailored to your Cloudflare account IDs and the exact var/secret names you prefer, plus a **KV binding** snippet for ingress dedupe.

[1]: https://developers.cloudflare.com/workers/wrangler/configuration/?utm_source=chatgpt.com "Configuration - Wrangler · Cloudflare Workers docs"
[2]: https://developers.cloudflare.com/queues/configuration/pull-consumers/?utm_source=chatgpt.com "Cloudflare Queues - Pull consumers"
[3]: https://developers.cloudflare.com/email-routing/email-workers/local-development/?utm_source=chatgpt.com "Local Development - Email Routing"
[4]: https://developers.cloudflare.com/workers/wrangler/commands/?utm_source=chatgpt.com "Commands - Wrangler · Cloudflare Workers docs"
[5]: https://developers.cloudflare.com/queues/get-started/?utm_source=chatgpt.com "Getting started · Cloudflare Queues docs"
[6]: https://developers.cloudflare.com/email-routing/email-workers/?utm_source=chatgpt.com "Email Workers · Cloudflare Email Routing docs"
[7]: https://www.twilio.com/docs/usage/webhooks/webhooks-security?utm_source=chatgpt.com "Webhooks Security"
[8]: https://developers.cloudflare.com/workers/configuration/secrets/?utm_source=chatgpt.com "Secrets - Workers"
[9]: https://www.twilio.com/en-us/changelog/upcoming-security-changes-enforcing-http-authentication-for-media?utm_source=chatgpt.com "Enforcing HTTP Basic Authentication for Voice and Messaging Media"
[10]: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/?utm_source=chatgpt.com "Send emails from Workers"
[11]: https://developers.cloudflare.com/workers/observability/logs/workers-logs/?utm_source=chatgpt.com "Workers Logs - Cloudflare Docs"
[12]: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/?utm_source=chatgpt.com "Workers API reference - R2"
[13]: https://developers.cloudflare.com/email-routing/email-workers/runtime-api/?utm_source=chatgpt.com "Runtime API - Email Routing"
[14]: https://developers.cloudflare.com/queues/configuration/javascript-apis/?utm_source=chatgpt.com "JavaScript APIs - Queues"
[15]: https://nodejs.org/api/typescript.html?utm_source=chatgpt.com "Modules: TypeScript | Node.js v24.8.0 Documentation"
[16]: https://developers.cloudflare.com/r2/api/s3/presigned-urls/?utm_source=chatgpt.com "Presigned URLs · Cloudflare R2 docs"
[17]: https://developers.cloudflare.com/kv/concepts/kv-namespaces/?utm_source=chatgpt.com "KV namespaces"
