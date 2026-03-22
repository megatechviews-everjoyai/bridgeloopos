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

console.log("🚀 Bridgeloop OS: Smart Engine Active...");

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").toLowerCase();
  const username = msg.from?.username || "Guest";

  // 1. Audit to Supabase (Lovable Managed)
  await supabase.from('audit_logs').insert([{ 
    user_handle: username, 
    message_content: text, 
    platform: 'telegram' 
  }]);

  // 2. Search 'brand_knowledge' for a keyword match
  const { data: knowledge } = await supabase
    .from('brand_knowledge')
    .select('response_text')
    .ilike('keyword', `%${text}%`) 
    .maybeSingle();

  if (knowledge) {
    bot.sendMessage(chatId, knowledge.response_text);
  } else if (text === '/start' || text.includes('help')) {
    bot.sendMessage(chatId, "Welcome to EverjoyAi. Ask me about our 'services', 'music', or 'vibe'.");
  }
});

// Render Health Check
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Everjoy Bridge Status: ONLINE');
}).listen(port);