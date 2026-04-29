import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Service & Utility Imports
import { DirectorService } from './services/director';
import { SocialsService } from './services/socials';
import { CodeReviewer } from './services/reviewer';
import { SecurityAuditor } from './services/security';
import { MarketingService } from './services/marketing';
import { DesignerService, DesignBrand } from './services/designer';
import { WorldBuilderService, WorldBrand, WorldSceneType } from './services/worldbuilder';
import { SecretScrubber } from './utils/scrubber';

dotenv.config();

// 1. ENVIRONMENT & SECURITY SETUP
const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const ADMIN_ID = Number(process.env.ADMIN_TELEGRAM_ID);

if (!token || !supabaseUrl || !supabaseAnonKey || !geminiKey || !ADMIN_ID) {
  console.error("❌ Critical Error: Missing security configuration in .env");
  process.exit(1);
}

// 2. INITIALIZE SERVICES
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const bot = new TelegramBot(token, { polling: true });
const director = new DirectorService(geminiKey);
const socials = new SocialsService(geminiKey, process.env.LINKEDIN_ACCESS_TOKEN, process.env.LINKEDIN_PERSON_ID);
const reviewer = new CodeReviewer(geminiKey);
const security = new SecurityAuditor(supabase);
const marketingAgent = new MarketingService(geminiKey);
const designAgent = new DesignerService(geminiKey);
const worldAgent = new WorldBuilderService(geminiKey);

const draftCache = new Map<number, string>();
const userState: Record<number, { mode: string; data?: any }> = {};
const BASE_DIR = process.cwd();

console.log("🚀 Bridgeloop OS: Hardened Command Center Online.");

// 3. MAIN MENU KEYBOARD (mirrors everjoy_manager.py)
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📽️ Video Director", callback_data: "start_video"   }, { text: "🎙️ Webinar Agent",  callback_data: "start_webinar"   }],
      [{ text: "🎬 Signature Deck",  callback_data: "start_signature"}, { text: "🎨 Brand Kit",      callback_data: "start_brand"      }],
      [{ text: "📈 Gapfinder",       callback_data: "start_gap"      }, { text: "🔨 Executer",       callback_data: "start_exec"       }],
      [{ text: "✍️ Copywriter",      callback_data: "start_copy"     }, { text: "📢 Create Ad",      callback_data: "start_ad"         }],
      [{ text: "🖼️ Thumbnail",       callback_data: "start_thumb"    }, { text: "📊 Stats",          callback_data: "run_stats"        }],
      [{ text: "🔍 Run Audit",       callback_data: "run_audit"      }, { text: "🌐 Webbuilder",     callback_data: "start_web"        }],
      [{ text: "🖥️ Bridgeloop Status", callback_data: "bridgeloop_status" }]
    ]
  }
};

// 4. HELPERS
function readBridgeloopData(): any[] {
  try {
    const p = path.join(BASE_DIR, 'backend', 'data.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return [];
}

function saveToBridgeloop(category: string, result: string, metadata: any = {}) {
  try {
    const p = path.join(BASE_DIR, 'backend', 'data.json');
    const db: any[] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    db.push({ id: Date.now(), category, result, timestamp: new Date().toISOString(), metadata });
    fs.writeFileSync(p, JSON.stringify(db, null, 2));
  } catch {}
}

// 5. MAIN MESSAGE HANDLER
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const rawText = msg.text || "";

  // ANTI-HACKING: SILENT LOCKOUT (Rule 1: Determinism)
  if (userId !== ADMIN_ID) {
    console.warn(`🛡️ Security: Unauthorized access attempt by ID ${userId}`);
    return;
  }

  const text = SecretScrubber.scrub(rawText);

  // --- /start and /menu ---
  if (text === '/start' || text === '/menu') {
    userState[chatId] = { mode: 'idle' };
    return bot.sendMessage(chatId, "💎 **Everjoy Workspace Online**\nSelect a tool to begin:", { ...mainMenu, parse_mode: 'Markdown' });
  }

  // LOG TO SUPABASE
  let category = "General";
  if (text.startsWith('/youtube'))       category = "YouTube";
  else if (text.startsWith('/admaker'))  category = "Advert Maker";
  else if (text.startsWith('/review'))   category = "Code Audit";
  else if (text.startsWith('/check_security')) category = "Security";

  await supabase.from('audit_logs').insert([{
    user_handle: msg.from?.username || "Admin",
    message_content: text,
    platform: 'telegram_bot',
    category
  }]);

  // --- SLASH COMMANDS ---
  if (text === '/check_security') {
    bot.sendMessage(chatId, "🛡️ Initiating Full System Audit...");
    const report = await security.runFullAudit(ADMIN_ID);
    bot.sendMessage(chatId, `🛡️ **SECURITY REPORT**\n\nStatus: ${report.status}\n\nFindings: ${report.findings.unauthorizedAttempts} unauthorized attempts.\n\nSteps: ${report.steps.join('\n')}`);
    return;
  }

  if (text.startsWith('/youtube ')) {
    const brief = await director.getCreativeBrief(text.replace('/youtube ', '').trim());
    if (brief) bot.sendMessage(chatId, `📺 **YT BRIEF**\n\nTitles: ${brief.titles}\n\nRef: ${brief.sheet}\n\nPose: ${brief.pose}`);
    return;
  }

  if (text.startsWith('/admaker ')) {
    const ads = await director.generateAdFactory(text.replace('/admaker ', '').trim());
    bot.sendMessage(chatId, ads);
    return;
  }

  if (text.startsWith('/review ')) {
    bot.sendMessage(chatId, "🛡️ Auditor: Scanning code in fresh context...");
    const audit = await reviewer.auditChange("Manual_Input.ts", text.replace('/review ', '').trim());
    bot.sendMessage(chatId, `🛡️ **AUDIT REPORT**\n\n${SecretScrubber.scrub(audit)}`);
    return;
  }

  if (text.startsWith('/world ')) {
    const raw = text.replace('/world ', '').trim();
    const parts = raw.split(' ');
    const brand = (parts[0] || 'everjoy') as WorldBrand;
    const sceneType = (parts[1] || 'world') as WorldSceneType;
    const rest = parts.slice(2).join(' ');
    const [sceneDesc, subjectDesc] = rest.split('|').map(s => s.trim());
    bot.sendMessage(chatId, `🌍 **3D World: Building ${brand.toUpperCase()} ${sceneType}...**\n⏳ Nano Banana 2 generating layers... (~60s)`);
    const result = await worldAgent.buildWorld(brand, sceneType, sceneDesc || 'cinematic environment', subjectDesc || undefined);
    if (!result.success) {
      bot.sendMessage(chatId, `❌ ${SecretScrubber.scrub(result.error || 'World build failed')}`);
    } else {
      if (result.bgPath)      await bot.sendPhoto(chatId, result.bgPath, { caption: '🌐 Background World' });
      if (result.subjectPath) await bot.sendPhoto(chatId, result.subjectPath, { caption: '🧍 Transparent Subject' });
      if (result.videoPath)   await bot.sendVideo(chatId, result.videoPath, { caption: `🌍 ${brand.toUpperCase()} ${sceneType} | Nano Banana 2 + Remotion` });
      else bot.sendMessage(chatId, `✅ Layers generated. Set up remotion-engine for MP4 output.`);
    }
    return;
  }

  if (text.startsWith('/design ')) {
    const parts = text.replace('/design ', '').trim().split(' ');
    const brand = (parts[0] || 'everjoy') as DesignBrand;
    const room = parts[1] || 'living';
    const customPrompt = parts.slice(2).join(' ') || undefined;
    bot.sendMessage(chatId, `🎨 **Design Agent: Rendering ${brand.toUpperCase()} ${room} with Nano Banana Pro 2...**`);
    let result;
    if (room === 'transform')       result = await designAgent.generateTransform(customPrompt || 'modern living space', brand);
    else if (room === 'moodboard')  result = await designAgent.generateMoodBoard(brand, customPrompt || 'luxury interior');
    else                            result = await designAgent.generateDesign(room, brand, customPrompt);
    if (result.success && result.imagePath) {
      await bot.sendPhoto(chatId, result.imagePath, {
        caption: `🎨 **${brand.toUpperCase()} ${room} Design**\n\n_Nano Banana Pro 2 | ${result.resolution} | ${result.aspectRatio}_`,
        parse_mode: 'Markdown'
      });
    } else {
      bot.sendMessage(chatId, `❌ ${SecretScrubber.scrub(result.error || 'Design generation failed')}`);
    }
    return;
  }

  if (text.startsWith('/marketing ')) {
    const parts = text.replace('/marketing ', '').trim();
    const [tool, ...args] = parts.split(' ');
    bot.sendMessage(chatId, `📣 **Marketing Agent: Running "${tool}"...**`);
    let result = "";
    if (tool === 'copy')            result = await marketingAgent.runCopywriter(args[0] || 'homepage', args.slice(1).join(' ') || 'EverjoyAI');
    else if (tool === 'social')     result = await marketingAgent.runSocialContent(args[0] || 'AI tools', args[1] || 'LinkedIn');
    else if (tool === 'ads')        result = await marketingAgent.runPaidAds(args[0] || 'tech brands', args[1] || 'Meta');
    else if (tool === 'email')      result = await marketingAgent.runColdEmail(args.join(' ') || 'SaaS founders');
    else if (tool === 'competitor') result = await marketingAgent.runCompetitorProfiler(args.join(' '));
    else if (tool === 'launch')     result = await marketingAgent.runLaunchStrategy(args.join(' '));
    else if (tool === 'content')    result = await marketingAgent.runContentStrategy(args.join(' '));
    else result = "❌ Unknown tool. Options: copy | social | ads | email | competitor | launch | content";
    bot.sendMessage(chatId, SecretScrubber.scrub(result), { parse_mode: 'Markdown' });
    return;
  }

  if (text.startsWith('/socials ')) {
    const draft = await socials.generateSlayPost(text.replace('/socials ', '').trim(), "LinkedIn");
    if (draft) {
      draftCache.set(chatId, draft);
      bot.sendMessage(chatId, `🟦 **LINKEDIN DRAFT**\n\n${draft}`, {
        reply_markup: { inline_keyboard: [[{ text: '🚀 Post Now', callback_data: 'confirm_post' }, { text: '🗑️ Discard', callback_data: 'discard_post' }]] }
      });
    }
    return;
  }

  // --- STATE MACHINE: Route prompt based on active mode ---
  const state = userState[chatId];
  if (!state || state.mode === 'idle') {
    return bot.sendMessage(chatId, "Send /start to open the menu.");
  }

  const { mode } = state;
  bot.sendChatAction(chatId, 'typing');

  if (mode === 'video') {
    bot.sendMessage(chatId, "📽️ *Rendering video brief...*", { parse_mode: 'Markdown' });
    const brief = await director.getCreativeBrief(text);
    const output = brief?.titles || 'Processing...';
    saveToBridgeloop("video", output, { prompt: text });
    bot.sendMessage(chatId, `📽️ **Video Brief Ready**\n\n${output}\n\nScene: ${brief?.pose || ''}`, { parse_mode: 'Markdown' });
  }
  else if (mode === 'webinar') {
    bot.sendMessage(chatId, "🎙️ *Webinar Agent processing...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runLaunchStrategy(text);
    saveToBridgeloop("webinar", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }
  else if (mode === 'signature') {
    bot.sendMessage(chatId, "🎬 *Generating Signature Deck...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runLaunchStrategy(`Signature founder deck: ${text}`);
    saveToBridgeloop("signature_deck", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }
  else if (mode === 'brand_kit') {
    bot.sendMessage(chatId, `🎨 *Generating ${text} Brand Kit...*`, { parse_mode: 'Markdown' });
    const result = await designAgent.generateMoodBoard('everjoy', text);
    saveToBridgeloop("brand_kit", text, { prompt: text });
    if (result.success && result.imagePath) {
      await bot.sendPhoto(chatId, result.imagePath, { caption: `🎨 **${text} Brand Kit** | Nano Banana Pro 2`, parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `❌ ${result.error}`);
    }
  }
  else if (mode === 'gapfinder') {
    bot.sendMessage(chatId, "📈 *Analyzing market gaps...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runCompetitorProfiler(text);
    saveToBridgeloop("gapfinder", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }
  else if (mode === 'executer') {
    bot.sendMessage(chatId, "🔨 *Executing task...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runContentStrategy(text);
    saveToBridgeloop("executer", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }
  else if (mode === 'copywriter') {
    bot.sendMessage(chatId, "✍️ *Writing copy...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runCopywriter('homepage', text);
    saveToBridgeloop("copywriter", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }
  else if (mode === 'create_ad') {
    bot.sendMessage(chatId, "📢 *Building ads...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runPaidAds(text, 'Meta');
    saveToBridgeloop("create_ad", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }
  else if (mode === 'thumbnail') {
    bot.sendMessage(chatId, "🖼️ *Generating thumbnail...*", { parse_mode: 'Markdown' });
    const result = await designAgent.generateDesign('gallery', 'everjoy', text);
    saveToBridgeloop("thumbnail", text, { prompt: text });
    if (result.success && result.imagePath) {
      await bot.sendPhoto(chatId, result.imagePath, { caption: `🖼️ **Thumbnail: ${text}**`, parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `❌ ${result.error}`);
    }
  }
  else if (mode === 'webbuilder') {
    bot.sendMessage(chatId, "🌐 *Building web component...*", { parse_mode: 'Markdown' });
    const result = await marketingAgent.runCopywriter('landing', text);
    saveToBridgeloop("webbuilder", result, { prompt: text });
    bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  }

  userState[chatId] = { mode: 'idle' };
});

// 6. CALLBACK / BUTTON HANDLER
bot.on('callback_query', async (q) => {
  const chatId = q.message?.chat.id;
  if (!chatId) return;
  const data = q.data || "";

  // --- LinkedIn post actions ---
  if (data === 'confirm_post') {
    const draft = draftCache.get(chatId);
    if (draft) {
      const result = await socials.postToLinkedIn(draft);
      bot.sendMessage(chatId, result.success ? "✅ Posted!" : `❌ Error: ${result.error}`);
    }
    bot.answerCallbackQuery(q.id);
    return;
  }
  if (data === 'discard_post') {
    draftCache.delete(chatId);
    bot.sendMessage(chatId, "🗑️ Draft discarded.");
    bot.answerCallbackQuery(q.id);
    return;
  }

  // --- Immediate actions (no prompt needed) ---
  if (data === 'run_stats') {
    const db = readBridgeloopData();
    bot.sendMessage(chatId, `📊 **Studio Stats:** ${db.length} total entries in Bridgeloop OS.`);
    bot.answerCallbackQuery(q.id);
    return;
  }

  if (data === 'run_audit') {
    bot.sendMessage(chatId, "🛡️ Initiating Full System Audit...");
    const report = await security.runFullAudit(ADMIN_ID);
    bot.sendMessage(chatId, `🛡️ **SECURITY REPORT**\n\nStatus: ${report.status}\n\nFindings: ${report.findings.unauthorizedAttempts} unauthorized attempts.\n\nSteps: ${report.steps.join('\n')}`);
    bot.answerCallbackQuery(q.id);
    return;
  }

  if (data === 'bridgeloop_status') {
    const db = readBridgeloopData();
    const last = db[db.length - 1];
    bot.sendMessage(chatId,
      `🖥️ *Bridgeloop OS Status*\nTotal entries: \`${db.length}\`\nLast entry: \`${last?.category || 'none'}\`\nStatus: \`Online\``,
      { parse_mode: 'Markdown' }
    );
    bot.answerCallbackQuery(q.id);
    return;
  }

  // --- Mode-setting buttons: set state and ask for prompt ---
  const modeMap: Record<string, { mode: string; prompt: string }> = {
    start_video:     { mode: 'video',      prompt: "📽️ Describe the cinematic scene to render:" },
    start_webinar:   { mode: 'webinar',    prompt: "🎙️ *WEBINAR AGENT ACTIVE*\n\nDescribe your webinar topic:" },
    start_signature: { mode: 'signature',  prompt: "🎬 *SIGNATURE DECK ACTIVE*\n\nAdd context or send `go` to run the full deck:" },
    start_brand:     { mode: 'brand_kit',  prompt: "🎨 Enter the Brand Name to generate a kit for:" },
    start_gap:       { mode: 'gapfinder',  prompt: "📈 Enter the industry or niche to analyze:" },
    start_exec:      { mode: 'executer',   prompt: "🔨 What task should I execute?" },
    start_copy:      { mode: 'copywriter', prompt: "✍️ What are we writing copy for?" },
    start_ad:        { mode: 'create_ad',  prompt: "📢 Describe the product for the Ad:" },
    start_thumb:     { mode: 'thumbnail',  prompt: "🖼️ Describe the thumbnail style or topic:" },
    start_web:       { mode: 'webbuilder', prompt: "🌐 Describe the web component or vibe:" },
  };

  if (modeMap[data]) {
    const { mode, prompt } = modeMap[data];
    userState[chatId] = { mode };
    bot.sendMessage(chatId, prompt, { parse_mode: 'Markdown' });
    bot.answerCallbackQuery(q.id);
    return;
  }

  bot.answerCallbackQuery(q.id);
});

http.createServer((req, res) => { res.end('Bridgeloop OS Online'); }).listen(process.env.PORT || 10000);
