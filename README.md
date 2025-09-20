# Switchboard

Local-first switchboard that unifies email and SMS/MMS ingress, delivers events to a durable queue, and lets a local TypeScript daemon process and reply on the originating channel.

This repository contains npm workspaces for Cloudflare Workers (`packages/workers/*`), the Node-based local consumer (`packages/local-consumer`), and supporting infrastructure/configuration assets under `infra/` and `docs/`.
