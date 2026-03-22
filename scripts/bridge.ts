import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import http from 'http';

// 1. Load Environment Variables from your Render Dashboard / .env
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Safety check to ensure the engine has its fuel
if (!token || !supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Missing environment variables in Render Dashboard.");
  process.exit(1);
}

// 2. Initialize Supabase & Telegram
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const bot = new TelegramBot(token, { polling: true });

console.log("🚀 Bridgeloop OS: Engine Started...");

// 3. Main Logic: Listen for any message and log to Supabase
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const username = msg.from?.username || "Unknown User";

  console.log(`📩 Received message from @${username}: ${text}`);

  // Auto-responder for Status check
  if (text === '/status') {
    bot.sendMessage(chatId, "✅ EverjoyAi Bridge is online and auditing to Supabase.");
    return;
  }

  // Audit the interaction to your Supabase 'audit_logs' table
  try {
    const { error } = await supabase
      .from('audit_logs') // Ensure this table exists in your Supabase project
      .insert([
        { 
          user_handle: username, 
          message_content: text, 
          platform: 'telegram',
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    console.log("✅ Interaction successfully audited to Supabase.");
  } catch (err) {
    console.error("❌ Supabase Audit Failed:", err);
  }
});

// 4. MANDATORY: Render Health Check Server
// This prevents Render from timing out and restarting your bot.
const port = process.env.PORT || 10000;

http.createServer((req, res) => {
  // Respond to the /status ping from Cron-job.org or Render
  if (req.url === '/status' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Everjoy Bridge Status: ONLINE');
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`📡 Health check server listening on port ${port}`);
});