# Bridgeloop OS: Unified Agent Manager
You are the lead engineer for **Bridgeloop**, a custom OS built on Lovable that acts as a command center for multiple AI agents and Claude Code itself.

## Project Vision
- **EverjoyAI Ecosystem:** Bridgeloop manages assets for EverjoyAI, CurateAI, and Lave Gallery.
- **Unified Brain:** Synchronization between the Lovable Web App and the Telegram Bot via Supabase.

## Tech Stack & Structure
- **Frontend:** Lovable (React + Vite)
- **Backend Bridge:** `scripts/bridge.ts` (Node.js + Telegraf)
- **Database:** Supabase (`chat_history` table)
- **Deployment:** Vibe-coding methodology; high-fidelity, cinematic standards.

## Development Rules
- **Memory:** Always check `scripts/bridge.ts` before modifying the connection logic.
- **Security:** Never touch or reveal values in `.env`.
- **Style:** Prioritize modular, "vibecoded" functions that can be easily repurposed.
- **Commands:** Run the bridge with `ts-node scripts/bridge.ts`.

## Active Context
- Current Goal: Ensuring the Telegram bot can trigger local terminal commands via this CLI.
