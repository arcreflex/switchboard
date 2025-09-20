# Unified Event Schema

```ts
export interface SwitchboardEvent {
  id: string;
  source: "email" | "sms";
  receivedAt: string;
  priority?: "low" | "normal" | "high";
  tags?: string[];
  participants: {
    fromEmail?: string;
    fromName?: string;
    toEmail?: string;
    fromPhoneE164?: string;
    toPhoneE164?: string;
  };
  content: {
    subject?: string;
    text?: string;
    htmlR2?: {
      bucket: string;
      key: string;
      presignedGetUrl: string;
      expiresAt: string;
    };
    attachments?: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      r2: {
        bucket: string;
        key: string;
        presignedGetUrl: string;
        expiresAt: string;
      };
    }>;
  };
  correlation: {
    messageId?: string;
    inReplyTo?: string;
    references?: string;
    twilioMessageSid?: string;
    threadKey: string;
  };
  reply?: {
    channel: "email" | "sms";
    toEmail?: string[];
    toPhoneE164?: string;
  };
}
```

This schema normalizes email and SMS/MMS ingress so the local consumer can process events with a single hook.
