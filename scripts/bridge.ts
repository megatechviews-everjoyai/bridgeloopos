import { Telegraf } from "telegraf";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import * as http from "http";
import * as dotenv from "dotenv";

dotenv.config();

// --- Init ---
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);
// --- Auth Guard ---
const ALLOWED_ID = Number(process.env.ALLOWED_USER_ID);

function isAuthorized(userId: number): boolean {
  return userId === ALLOWED_ID;
}

// --- Supabase: Log message ---
async function logToSupabase(role: string, content: string) {
  await supabase.from("chat_history").insert({ role, content });
}

// --- Supabase: Get recent history ---
async function getHistory(limit = 10) {
  const { data } = await supabase
    .from("chat_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data?.reverse() ?? [];
}

// --- Telegram Bot ---
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAuthorized(userId)) {
    console.warn(`Unauthorized access attempt by ID: ${userId}`);
    return ctx.reply("⛔ Access Denied. This terminal is private.");
  }

  const message = ctx.message.text;
  await logToSupabase("user", message);

  // Run as terminal command if prefixed with /run
  if (message.startsWith("/run ")) {
    const cmd = message.replace("/run ", "").trim();
    try {
      const output = execSync(cmd, { encoding: "utf-8" });
      await logToSupabase("assistant", output);
      return ctx.reply(`\`\`\`\n${output}\n\`\`\``, { parse_mode: "Markdown" });
    } catch (err: any) {
      return ctx.reply(`Error: ${err.message}`);
    }
  }

  // Echo history command
  if (message === "/history") {
    const history = await getHistory();
    const formatted = history.map((m: any) => `[${m.role}]: ${m.content}`).join("\n");
    return ctx.reply(formatted || "No history yet.");
  }

  // Default: log and acknowledge
  await ctx.reply(`Logged: "${message}"`);
});

bot.launch();
console.log("Telegram bot running.");

// --- HTTP Server for Lovable Web App ---
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // POST /message — Lovable sends a message to the bridge
  if (req.method === "POST" && req.url === "/message") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { role, content } = JSON.parse(body);
        await logToSupabase(role ?? "user", content);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
    return;
  }

  // GET /history — Lovable fetches chat history
  if (req.method === "GET" && req.url === "/history") {
    const history = await getHistory(20);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(history));
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Bridge HTTP server listening on port ${PORT}`);
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
