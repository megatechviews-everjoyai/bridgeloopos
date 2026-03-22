import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import http from 'http';

// 1. Configuration & Environment Validation
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const resendKey = process.env.VITE_RESEND_API_KEY;

if (!token || !supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing environment variables. Deployment halted.");
  process.exit(1);
}

// 2. Initialize Clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const bot = new TelegramBot(token, { polling: true });

console.log("🚀 Bridgeloop OS is active using your VITE configuration!");

// 3. Essential Features for EverjoyAi & Lave Gallery

/**
 * Health Check / Status Command
 */
bot.onText(/\/status/, (msg) => {
  const statusMessage = `✅ EverjoyAi Bridge is online.\n\n` +
                        `Environment: Production (Fly.io)\n` +
                        `Region: Sydney (SYD)`;
  bot.sendMessage(msg.chat.id, statusMessage);
});

/**
 * Audit Log Integration:
 * Captures all non-command messages and syncs them to Supabase
 * for your "Business Health Diagnostic" or gallery records.
 */
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const { error } = await supabase
      .from('audit_logs') // Ensure this table exists in your Supabase project
      .insert([
        { 
          content: msg.text, 
          user_id: msg.from?.id, 
          username: msg.from?.username,
          created_at: new Date().toISOString() 
        }
      ]);

    if (error) {
      console.error("❌ Supabase Sync Error:", error.message);
    }
  }
});

/**
 * Error Handling for Polling
 * Prevents the bot from crashing during network blips.
 */
bot.on('polling_error', (error) => {
  console.error(`⚠️ Polling error: ${error.message}`);
});

// 4. Fly.io Health Check Server
/**
 * Fly.io requires an application to listen on a port.
 * This prevents the 'Health Check' from failing and restarting your bot.
 */
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Everjoy Bridge Status: ONLINE');
}).listen(port, '0.0.0.0', () => {
  console.log(`📡 Health check server listening on port ${port}`);
});