# Threading Model

`correlation.threadKey` provides a **provider‑agnostic conversation identity**.

## Rules

1. **Email**
   - If `inReplyTo` or `references` present: derive **root** from the earliest `Message-ID` in the chain.
   - Else: compute a stable key:
     ```
     threadKey = hash(
       "email:" +
       normalizeSubject(subject) + "|" +
       normalizeAddr(participants.fromEmail) + "|" +
       normalizeAddr(participants.toEmail)
     )
     ```
   - `normalizeSubject` strips common reply/forward prefixes: `re:`, `fw:`, `fwd:` (case/locale‑insensitive), collapses whitespace.
   - `normalizeAddr` lowercases and trims.
2. **SMS**
   - Use the unordered pair of E.164 endpoints:
     ```
     threadKey = hash("sms:" + sort([fromPhoneE164, toPhoneE164]).join("|"))
     ```

> **Note:** Hash function MUST be stable with low collision rate (e.g., SHA‑256 → hex, then truncate to 32 chars for storage/display). The exact algorithm is an implementation detail; the invariant is **stability** for the same conversation.

## Acceptance

- Email reply chains MUST map to the same `threadKey`.
- New subjects from the same participants MUST yield a different `threadKey`.
