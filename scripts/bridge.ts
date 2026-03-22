import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!token || !supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const bot = new TelegramBot(token, { polling: true });

console.log("🚀 Bridgeloop OS is active!");

// Health Check / Status Command
bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ EverjoyAi Bridge is online on Render!");
});

// MANDATORY: Render Health Check Server
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Everjoy Bridge Status: ONLINE');
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`📡 Health check server listening on port ${port}`);
});