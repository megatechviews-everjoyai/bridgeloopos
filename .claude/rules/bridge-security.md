# Bridgeloop Security & Architecture
Scope: scripts/bridge.ts, .env, .gitignore

## Constraints
- **Secrets:** Never read, echo, or modify values in `.env` unless explicitly asked to rotate a key.
- **Bridge Logic:** The `bridge.ts` file is the "Central Nervous System." Before changing it, verify how it will affect the Telegram webhook.
- **Dependencies:** Always use `telegraf` for Telegram and `@supabase/supabase-js` for the shared brain sync.
- **Environment:** If a new variable is needed, add it to `env.txt` (the template) first, never just the hidden `.env`.
