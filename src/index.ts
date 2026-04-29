import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { DirectorService } from './services/director';
import { SocialsService } from './services/socials';
import { CodeReviewer } from './services/reviewer';
import { SecurityAuditor } from './services/security';
import { MarketingService } from './services/marketing';
import { DesignerService, DesignBrand } from './services/designer';
import { WorldBuilderService, WorldBrand, WorldSceneType } from './services/worldbuilder';
import { SecretScrubber } from './utils/scrubber';

dotenv.config();

// ── ENVIRONMENT & AUTH ────────────────────────────────────────────────────────
const token         = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl   = process.env.SUPABASE_URL;
const supabaseKey   = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const geminiKey     = process.env.GEMINI_API_KEY;
const ADMIN_ID      = Number(process.env.ADMIN_TELEGRAM_ID);

if (!token || !supabaseUrl || !supabaseKey || !geminiKey || !ADMIN_ID) {
  console.error("❌ Critical Error: Missing security configuration in .env");
  process.exit(1);
}

// ── SERVICES ─────────────────────────────────────────────────────────────────
const supabase      = createClient(supabaseUrl, supabaseKey);
const bot           = new TelegramBot(token, { polling: true });
const director      = new DirectorService(geminiKey);
const socials       = new SocialsService(geminiKey, process.env.LINKEDIN_ACCESS_TOKEN, process.env.LINKEDIN_PERSON_ID);
const reviewer      = new CodeReviewer(geminiKey);
const security      = new SecurityAuditor(supabase);
const marketing     = new MarketingService(geminiKey);
const designer      = new DesignerService(geminiKey);
const worldBuilder  = new WorldBuilderService(geminiKey);

const draftCache    = new Map<number, string>();
// State: { mode, step, data }
const userState: Record<number, { mode: string; step?: string; data?: any }> = {};
const BASE_DIR      = process.cwd();
const SKILL_RUNNER  = path.join(BASE_DIR, 'scripts', 'skill_runner.py');

// Delegate to a Python skill subagent via skill_runner.py
function runPythonSkill(skill: string, prompt: string): string {
  try {
    return execFileSync('python3', [SKILL_RUNNER, skill, prompt], {
      cwd: BASE_DIR, timeout: 30000, encoding: 'utf8'
    }).trim();
  } catch (e: any) {
    return `❌ Skill error: ${e.stderr || e.message}`;
  }
}

console.log("🚀 Bridgeloop OS: Hardened Command Center Online.");

// ── SUPABASE OUTPUT (Bridgeloop Platform) ─────────────────────────────────────
async function saveToolOutput(tool: string, prompt: string, result: string) {
  // Write to Supabase so the Lovable dashboard can display it
  await supabase.from('tool_outputs').insert([{
    tool,
    prompt: prompt.slice(0, 500),
    result: SecretScrubber.scrub(result).slice(0, 3000),
    created_at: new Date().toISOString()
  }]);
  // Also write to local backend/data.json
  try {
    const p = path.join(BASE_DIR, 'backend', 'data.json');
    const db: any[] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    db.push({ id: Date.now(), category: tool, result, timestamp: new Date().toISOString(), metadata: { prompt } });
    fs.writeFileSync(p, JSON.stringify(db, null, 2));
  } catch {}
}

// ── KEYBOARDS ─────────────────────────────────────────────────────────────────
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📽️ Video Director",  callback_data: "start_video"    }, { text: "🎙️ Webinar Agent",  callback_data: "start_webinar"   }],
      [{ text: "🎬 Signature Deck",   callback_data: "start_signature"}, { text: "🎨 Brand Kit",      callback_data: "start_brand"      }],
      [{ text: "📈 Gapfinder",        callback_data: "start_gap"      }, { text: "🔨 Executer",       callback_data: "start_exec"       }],
      [{ text: "✍️ Copywriter",       callback_data: "start_copy"     }, { text: "📢 Create Ad",      callback_data: "start_ad"         }],
      [{ text: "🖼️ Thumbnail",        callback_data: "start_thumb"    }, { text: "📊 Stats",          callback_data: "run_stats"        }],
      [{ text: "🔍 Run Audit",        callback_data: "run_audit"      }, { text: "🌐 Webbuilder",     callback_data: "start_web"        }],
      [{ text: "📣 Marketing",        callback_data: "open_marketing" }, { text: "🎨 Design",         callback_data: "open_design"      }],
      [{ text: "🌍 3D World",         callback_data: "open_world"     }],
      [{ text: "🖥️ Bridgeloop Status",callback_data: "bridgeloop_status" }]
    ]
  }
};

const marketingMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "✍️ Page Copy",        callback_data: "mkt_copy"       }, { text: "📱 Social Post",    callback_data: "mkt_social"      }],
      [{ text: "💰 Paid Ads",         callback_data: "mkt_ads"        }, { text: "📧 Cold Email",     callback_data: "mkt_email"       }],
      [{ text: "🕵️ Competitor Intel", callback_data: "mkt_competitor" }, { text: "🚀 Launch Plan",   callback_data: "mkt_launch"      }],
      [{ text: "📅 Content Strategy", callback_data: "mkt_content"    }]
    ]
  }
};

const designRoomMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🏠 Living Room",    callback_data: "dsn_living"    }, { text: "🛏️ Bedroom",        callback_data: "dsn_bedroom"   }],
      [{ text: "💻 Studio/Office", callback_data: "dsn_office"    }, { text: "🍳 Kitchen",         callback_data: "dsn_kitchen"   }],
      [{ text: "🖼️ Gallery Space", callback_data: "dsn_gallery"   }, { text: "🎨 Mood Board",      callback_data: "dsn_moodboard" }],
      [{ text: "✨ Transform Space",callback_data: "dsn_transform" }]
    ]
  }
};

const worldTypeMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🌐 World Build",   callback_data: "wld_world"     }, { text: "🎬 Cinematic",       callback_data: "wld_cinematic" }],
      [{ text: "🧍 Character",     callback_data: "wld_character" }, { text: "🏛️ Scene",           callback_data: "wld_scene"     }]
    ]
  }
};

const brandMenu = (prefix: string) => ({
  reply_markup: {
    inline_keyboard: [[
      { text: "💜 EverjoyAI",  callback_data: `${prefix}_everjoy` },
      { text: "⬜ CurateAI",  callback_data: `${prefix}_curate`  },
      { text: "🥇 Lave",      callback_data: `${prefix}_lave`    }
    ]]
  }
});

// ── GUARD ─────────────────────────────────────────────────────────────────────
function isAdmin(msg: TelegramBot.Message): boolean {
  if (msg.from?.id !== ADMIN_ID) {
    console.warn(`🛡️ Unauthorized attempt by ${msg.from?.id}`);
    return false;
  }
  return true;
}

// ── MAIN MESSAGE HANDLER ──────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  if (!isAdmin(msg)) return;

  const chatId = msg.chat.id;
  const text   = SecretScrubber.scrub(msg.text || "");

  // ── /start & /menu ──
  if (text === '/start' || text === '/menu') {
    userState[chatId] = { mode: 'idle' };
    return bot.sendMessage(chatId, "💎 *Everjoy Workspace Online*\nSelect a tool to begin:", { ...mainMenu, parse_mode: 'Markdown' });
  }

  // ── Supabase audit log ──
  let category = "General";
  if (text.startsWith('/youtube'))        category = "YouTube";
  else if (text.startsWith('/admaker'))   category = "Advert Maker";
  else if (text.startsWith('/review'))    category = "Code Audit";
  else if (text.startsWith('/check_security')) category = "Security";

  await supabase.from('audit_logs').insert([{
    user_handle:     msg.from?.username || "Admin",
    message_content: text,
    platform:        'telegram_bot',
    category
  }]);

  // ── Slash commands ──────────────────────────────────────────────────────────
  if (text === '/check_security') {
    bot.sendMessage(chatId, "🛡️ Initiating Full System Audit...");
    const report = await security.runFullAudit(ADMIN_ID);
    return bot.sendMessage(chatId,
      `🛡️ *SECURITY REPORT*\n\nStatus: ${report.status}\nUnauthorized attempts: ${report.findings.unauthorizedAttempts}\n\nSteps:\n${report.steps.join('\n')}`,
      { parse_mode: 'Markdown' });
  }

  if (text.startsWith('/youtube ')) {
    const brief = await director.getCreativeBrief(text.replace('/youtube ', '').trim());
    if (brief) bot.sendMessage(chatId, `📺 *YT BRIEF*\n\nTitles: ${brief.titles}\n\nRef: ${brief.sheet}\n\nPose: ${brief.pose}`, { parse_mode: 'Markdown' });
    return;
  }

  if (text.startsWith('/admaker ')) {
    const ads = await director.generateAdFactory(text.replace('/admaker ', '').trim());
    return bot.sendMessage(chatId, ads);
  }

  if (text.startsWith('/review ')) {
    bot.sendMessage(chatId, "🛡️ Auditor scanning...");
    const audit = await reviewer.auditChange("Manual_Input.ts", text.replace('/review ', '').trim());
    return bot.sendMessage(chatId, `🛡️ *AUDIT REPORT*\n\n${SecretScrubber.scrub(audit)}`, { parse_mode: 'Markdown' });
  }

  if (text.startsWith('/world ')) {
    const parts = text.replace('/world ', '').trim().split(' ');
    const brand     = (parts[0] || 'everjoy') as WorldBrand;
    const sceneType = (parts[1] || 'world')   as WorldSceneType;
    const rest = parts.slice(2).join(' ');
    const [sceneDesc, subjectDesc] = rest.split('|').map(s => s.trim());
    bot.sendMessage(chatId, `🌍 *Building ${brand.toUpperCase()} ${sceneType}...*\n⏳ ~60s`, { parse_mode: 'Markdown' });
    const result = await worldBuilder.buildWorld(brand, sceneType, sceneDesc || 'cinematic environment', subjectDesc || undefined);
    await deliverWorldResult(chatId, result, brand, sceneType);
    return;
  }

  if (text.startsWith('/design ')) {
    const parts = text.replace('/design ', '').trim().split(' ');
    const brand        = (parts[0] || 'everjoy') as DesignBrand;
    const room         = parts[1] || 'living';
    const customPrompt = parts.slice(2).join(' ') || undefined;
    bot.sendMessage(chatId, `🎨 *Rendering ${brand.toUpperCase()} ${room}...*`, { parse_mode: 'Markdown' });
    let result;
    if (room === 'transform')      result = await designer.generateTransform(customPrompt || 'modern space', brand);
    else if (room === 'moodboard') result = await designer.generateMoodBoard(brand, customPrompt || 'luxury interior');
    else                           result = await designer.generateDesign(room, brand, customPrompt);
    await deliverDesignResult(chatId, result, brand, room);
    return;
  }

  if (text.startsWith('/marketing ')) {
    const [tool, ...args] = text.replace('/marketing ', '').trim().split(' ');
    bot.sendMessage(chatId, `📣 *Running ${tool}...*`, { parse_mode: 'Markdown' });
    const result = await runMarketingTool(tool, args);
    bot.sendMessage(chatId, SecretScrubber.scrub(result), { parse_mode: 'Markdown' });
    await saveToolOutput(`marketing_${tool}`, args.join(' '), result);
    return;
  }

  if (text.startsWith('/socials ')) {
    const draft = await socials.generateSlayPost(text.replace('/socials ', '').trim(), "LinkedIn");
    if (draft) {
      draftCache.set(chatId, draft);
      bot.sendMessage(chatId, `🟦 *LINKEDIN DRAFT*\n\n${draft}`, {
        reply_markup: { inline_keyboard: [[{ text: '🚀 Post Now', callback_data: 'confirm_post' }, { text: '🗑️ Discard', callback_data: 'discard_post' }]] }
      });
    }
    return;
  }

  // ── STATE MACHINE: prompt routing ──────────────────────────────────────────
  const state = userState[chatId];
  if (!state || state.mode === 'idle') {
    return bot.sendMessage(chatId, "Send /start to open the menu.");
  }

  bot.sendChatAction(chatId, 'typing');
  const { mode, step, data } = state;

  // ── Simple single-step modes ────────────────────────────────────────────────
  // Python skill subagents are called via skill_runner.py (execFileSync)
  // TypeScript services handle marketing, design, worldbuilder, director, security
  const simpleRoutes: Record<string, () => Promise<string>> = {
    video:      () => director.getCreativeBrief(text).then(b => `📽️ *Video Brief*\n\n${b?.titles || 'Processing'}\n\n${b?.pose || ''}`),
    webinar:    () => marketing.runLaunchStrategy(text),
    signature:  () => marketing.runLaunchStrategy(`Signature founder deck: ${text}`),
    gapfinder:  () => Promise.resolve(runPythonSkill('gapfinder',  text)),  // → skills/gapfinder.py
    executer:   () => Promise.resolve(runPythonSkill('executer',   text)),  // → skills/executer.py
    copywriter: () => marketing.runCopywriter('homepage', text),
    create_ad:  () => marketing.runPaidAds(text, 'Meta'),
    webbuilder: () => Promise.resolve(runPythonSkill('webbuilder', text)),  // → skills/web_builder.py
  };

  if (simpleRoutes[mode]) {
    const result = await simpleRoutes[mode]();
    bot.sendMessage(chatId, SecretScrubber.scrub(result), { parse_mode: 'Markdown' });
    await saveToolOutput(mode, text, result);
    userState[chatId] = { mode: 'idle' };
    return;
  }

  // ── Thumbnail → skills/calli_art.py (CalliArt subagent) ──
  if (mode === 'thumbnail') {
    bot.sendMessage(chatId, "🖼️ *Generating thumbnail style guide...*", { parse_mode: 'Markdown' });
    const result = runPythonSkill('thumbnail', text);
    bot.sendMessage(chatId, SecretScrubber.scrub(result), { parse_mode: 'Markdown' });
    await saveToolOutput('thumbnail', text, result);
    userState[chatId] = { mode: 'idle' };
    return;
  }

  // ── Brand Kit ──
  if (mode === 'brand_kit') {
    bot.sendMessage(chatId, `🎨 *Generating ${text} Brand Kit...*`, { parse_mode: 'Markdown' });
    const result = await designer.generateMoodBoard('everjoy', text);
    await deliverDesignResult(chatId, result, 'everjoy', `${text} brand kit`);
    await saveToolOutput('brand_kit', text, result.imagePath || result.error || '');
    userState[chatId] = { mode: 'idle' };
    return;
  }

  // ── Marketing multi-step ────────────────────────────────────────────────────
  if (mode.startsWith('mkt_')) {
    const result = await handleMarketingStep(chatId, mode, step, text, data);
    if (result) {
      bot.sendMessage(chatId, SecretScrubber.scrub(result), { parse_mode: 'Markdown' });
      await saveToolOutput(mode, text, result);
      userState[chatId] = { mode: 'idle' };
    }
    return;
  }

  // ── Design multi-step ───────────────────────────────────────────────────────
  if (mode.startsWith('dsn_')) {
    await handleDesignStep(chatId, mode, step, text, data);
    return;
  }

  // ── 3D World multi-step ─────────────────────────────────────────────────────
  if (mode.startsWith('wld_')) {
    await handleWorldStep(chatId, mode, step, text, data);
    return;
  }
});

// ── CALLBACK / BUTTON HANDLER ─────────────────────────────────────────────────
bot.on('callback_query', async (q) => {
  const chatId = q.message?.chat.id;
  if (!chatId) return;
  const data = q.data || "";

  // LinkedIn post
  if (data === 'confirm_post') {
    const draft = draftCache.get(chatId);
    if (draft) {
      const r = await socials.postToLinkedIn(draft);
      bot.sendMessage(chatId, r.success ? "✅ Posted!" : `❌ ${r.error}`);
    }
    return bot.answerCallbackQuery(q.id);
  }
  if (data === 'discard_post') {
    draftCache.delete(chatId);
    bot.sendMessage(chatId, "🗑️ Draft discarded.");
    return bot.answerCallbackQuery(q.id);
  }

  // Immediate stats
  if (data === 'run_stats') {
    let count = 0;
    try { const p = path.join(BASE_DIR, 'backend', 'data.json'); if (fs.existsSync(p)) count = JSON.parse(fs.readFileSync(p, 'utf8')).length; } catch {}
    bot.sendMessage(chatId, `📊 *Studio Stats:* ${count} total entries in Bridgeloop OS.`, { parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }

  if (data === 'run_audit') {
    bot.sendMessage(chatId, "🛡️ Initiating Full System Audit...");
    const report = await security.runFullAudit(ADMIN_ID);
    bot.sendMessage(chatId, `🛡️ *SECURITY REPORT*\n\nStatus: ${report.status}\nUnauthorized attempts: ${report.findings.unauthorizedAttempts}`, { parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }

  if (data === 'bridgeloop_status') {
    let count = 0, last = 'none';
    try {
      const p = path.join(BASE_DIR, 'backend', 'data.json');
      if (fs.existsSync(p)) { const db = JSON.parse(fs.readFileSync(p, 'utf8')); count = db.length; last = db[db.length - 1]?.category || 'none'; }
    } catch {}
    bot.sendMessage(chatId,
      `🖥️ *Bridgeloop OS Status*\nTotal entries: \`${count}\`\nLast tool: \`${last}\`\nStatus: \`Online\``,
      { parse_mode: 'Markdown' }
    );
    return bot.answerCallbackQuery(q.id);
  }

  // ── Sub-menus ──────────────────────────────────────────────────────────────
  if (data === 'open_marketing') {
    bot.sendMessage(chatId, "📣 *Marketing Agent Online.* Select your weapon:", { ...marketingMenu, parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }
  if (data === 'open_design') {
    bot.sendMessage(chatId, "🎨 *Interior Design Agent Online.* Select room type:", { ...designRoomMenu, parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }
  if (data === 'open_world') {
    bot.sendMessage(chatId, "🌍 *3D World Builder Online.* Select scene type:", { ...worldTypeMenu, parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }

  // ── Simple mode-setting buttons ─────────────────────────────────────────────
  const simpleModes: Record<string, { mode: string; prompt: string }> = {
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

  if (simpleModes[data]) {
    const { mode, prompt } = simpleModes[data];
    userState[chatId] = { mode };
    bot.sendMessage(chatId, prompt, { parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }

  // ── Marketing sub-menu callbacks ────────────────────────────────────────────
  const marketingRoutes: Record<string, { mode: string; step: string; prompt: string }> = {
    mkt_copy:       { mode: 'mkt_copy',       step: 'page_type',  prompt: "📝 What type of page? (homepage, landing, pricing, feature)" },
    mkt_social:     { mode: 'mkt_social',     step: 'topic',      prompt: "📱 What topic or product to post about?" },
    mkt_ads:        { mode: 'mkt_ads',        step: 'niche',      prompt: "💰 Target niche for ads? (e.g. Auckland coaches)" },
    mkt_email:      { mode: 'mkt_email',      step: 'niche',      prompt: "📧 Who are you cold emailing? (e.g. SaaS founders)" },
    mkt_competitor: { mode: 'mkt_competitor', step: 'competitor', prompt: "🕵️ Competitor name or URL?" },
    mkt_launch:     { mode: 'mkt_launch',     step: 'product',    prompt: "🚀 Product name and one-line description?" },
    mkt_content:    { mode: 'mkt_content',    step: 'niche',      prompt: "📅 Niche or brand to create content for?" },
  };

  if (marketingRoutes[data]) {
    const r = marketingRoutes[data];
    userState[chatId] = { mode: r.mode, step: r.step };
    bot.sendMessage(chatId, r.prompt);
    return bot.answerCallbackQuery(q.id);
  }

  // ── Design: room selection → brand selection ────────────────────────────────
  const designRooms = ["dsn_living","dsn_bedroom","dsn_office","dsn_kitchen","dsn_gallery","dsn_moodboard","dsn_transform"];
  if (designRooms.includes(data)) {
    const room = data.replace("dsn_", "");
    bot.sendMessage(chatId, `🎨 *${room.toUpperCase()}* — Choose brand aesthetic:`, brandMenu(`dbrand_${room}`));
    return bot.answerCallbackQuery(q.id);
  }

  if (data.startsWith("dbrand_")) {
    // dbrand_[room]_[brand]
    const parts  = data.replace("dbrand_", "").split("_");
    const brand  = parts[parts.length - 1] as DesignBrand;
    const room   = parts.slice(0, parts.length - 1).join("_");

    if (room === 'transform') {
      userState[chatId] = { mode: 'dsn_transform', data: { brand } };
      bot.sendMessage(chatId, `✨ *${brand.toUpperCase()} Transform* — Describe the current space or what you want changed:`, { parse_mode: 'Markdown' });
    } else if (room === 'moodboard') {
      userState[chatId] = { mode: 'dsn_moodboard', data: { brand } };
      bot.sendMessage(chatId, `🎨 *${brand.toUpperCase()} Mood Board* — What theme or concept? (e.g. "Japandi living room")`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `🎨 *Generating ${brand.toUpperCase()} ${room} design...*`, { parse_mode: 'Markdown' });
      const result = await designer.generateDesign(room, brand);
      await deliverDesignResult(chatId, result, brand, room);
      await saveToolOutput('design', `${brand} ${room}`, result.imagePath || result.error || '');
    }
    return bot.answerCallbackQuery(q.id);
  }

  // ── 3D World: type selection → brand selection ──────────────────────────────
  const worldTypes = ["wld_world","wld_cinematic","wld_character","wld_scene"];
  if (worldTypes.includes(data)) {
    const sceneType = data.replace("wld_", "");
    bot.sendMessage(chatId, `🌍 *${sceneType.toUpperCase()}* — Choose brand world:`, brandMenu(`wbrand_${sceneType}`));
    return bot.answerCallbackQuery(q.id);
  }

  if (data.startsWith("wbrand_")) {
    // wbrand_[type]_[brand]
    const parts     = data.replace("wbrand_", "").split("_");
    const brand     = parts[parts.length - 1] as WorldBrand;
    const sceneType = parts.slice(0, parts.length - 1).join("_") as WorldSceneType;
    userState[chatId] = { mode: `wld_build`, data: { brand, sceneType } };
    bot.sendMessage(chatId, `🌍 *Describe the world/environment:*\n_(e.g. "rain-soaked megacity at night" or "sun-drenched Moroccan courtyard")_`, { parse_mode: 'Markdown' });
    return bot.answerCallbackQuery(q.id);
  }

  bot.answerCallbackQuery(q.id);
});

// ── MARKETING STEP HANDLER ────────────────────────────────────────────────────
async function handleMarketingStep(chatId: number, mode: string, step: string | undefined, text: string, data: any): Promise<string | null> {
  if (mode === 'mkt_copy') {
    if (step === 'page_type') {
      userState[chatId] = { mode, step: 'product', data: { pageType: text } };
      bot.sendMessage(chatId, "📝 Describe your product/offer:");
      return null;
    }
    return marketing.runCopywriter(data?.pageType || 'homepage', text);
  }
  if (mode === 'mkt_social') {
    if (step === 'topic') {
      userState[chatId] = { mode, step: 'platform', data: { topic: text } };
      bot.sendMessage(chatId, "📱 Which platform? (LinkedIn, Instagram, TikTok, Twitter)");
      return null;
    }
    return marketing.runSocialContent(data?.topic || text, text);
  }
  if (mode === 'mkt_ads') {
    if (step === 'niche') {
      userState[chatId] = { mode, step: 'platform', data: { niche: text } };
      bot.sendMessage(chatId, "💰 Which ad platform? (Meta, Google, LinkedIn, TikTok)");
      return null;
    }
    return marketing.runPaidAds(data?.niche || text, text);
  }
  if (mode === 'mkt_email')      return marketing.runColdEmail(text);
  if (mode === 'mkt_competitor') return marketing.runCompetitorProfiler(text);
  if (mode === 'mkt_launch')     return marketing.runLaunchStrategy(text);
  if (mode === 'mkt_content')    return marketing.runContentStrategy(text);
  return null;
}

// ── DESIGN STEP HANDLER ────────────────────────────────────────────────────────
async function handleDesignStep(chatId: number, mode: string, step: string | undefined, text: string, data: any) {
  const brand = data?.brand as DesignBrand || 'everjoy';
  let result;
  if (mode === 'dsn_transform') {
    bot.sendMessage(chatId, `✨ *Transforming space to ${brand} aesthetic...*`, { parse_mode: 'Markdown' });
    result = await designer.generateTransform(text, brand);
  } else if (mode === 'dsn_moodboard') {
    bot.sendMessage(chatId, `🎨 *Generating ${brand} Mood Board...*`, { parse_mode: 'Markdown' });
    result = await designer.generateMoodBoard(brand, text);
  } else {
    return;
  }
  await deliverDesignResult(chatId, result, brand, mode);
  await saveToolOutput(mode, text, result.imagePath || result.error || '');
  userState[chatId] = { mode: 'idle' };
}

// ── 3D WORLD STEP HANDLER ──────────────────────────────────────────────────────
async function handleWorldStep(chatId: number, mode: string, step: string | undefined, text: string, data: any) {
  if (mode === 'wld_build') {
    const { brand, sceneType } = data || {};
    if (!step) {
      // First prompt = scene description
      if (sceneType === 'cinematic') {
        bot.sendMessage(chatId, `🌍 *Building ${brand?.toUpperCase()} cinematic world...*\n⏳ ~60s`, { parse_mode: 'Markdown' });
        const result = await worldBuilder.buildWorld(brand, sceneType, text);
        await deliverWorldResult(chatId, result, brand, sceneType);
        await saveToolOutput('3d_world', text, result.videoPath || result.bgPath || result.error || '');
        userState[chatId] = { mode: 'idle' };
      } else {
        userState[chatId] = { mode, step: 'subject', data: { ...data, sceneDesc: text } };
        bot.sendMessage(chatId, `🧍 *Describe the subject/character* to place in the world:\n_(or send "default" for brand preset)_`, { parse_mode: 'Markdown' });
      }
    } else if (step === 'subject') {
      const { sceneDesc } = data;
      const subjectDesc = text === 'default' ? undefined : text;
      bot.sendMessage(chatId, `🌍 *Building ${brand?.toUpperCase()} ${sceneType} world...*\n⏳ Generating layers + composite... (~60s)`, { parse_mode: 'Markdown' });
      const result = await worldBuilder.buildWorld(brand, sceneType, sceneDesc, subjectDesc);
      await deliverWorldResult(chatId, result, brand, sceneType);
      await saveToolOutput('3d_world', sceneDesc, result.videoPath || result.bgPath || result.error || '');
      userState[chatId] = { mode: 'idle' };
    }
  }
}

// ── DELIVERY HELPERS ──────────────────────────────────────────────────────────
async function deliverDesignResult(chatId: number, result: any, brand: string, room: string) {
  if (result.success && result.imagePath) {
    await bot.sendPhoto(chatId, result.imagePath, {
      caption: `🎨 *${brand.toUpperCase()} ${room}*\n_Nano Banana Pro 2 | ${result.resolution} | ${result.aspectRatio}_`,
      parse_mode: 'Markdown'
    });
  } else {
    bot.sendMessage(chatId, `❌ Design failed: ${SecretScrubber.scrub(result.error || 'Unknown error')}`);
  }
}

async function deliverWorldResult(chatId: number, result: any, brand: string, sceneType: string) {
  if (!result.success) {
    return bot.sendMessage(chatId, `❌ World build failed: ${SecretScrubber.scrub(result.error || 'Unknown error')}`);
  }
  if (result.bgPath)      await bot.sendPhoto(chatId, result.bgPath,      { caption: '🌐 Background World Layer' });
  if (result.subjectPath) await bot.sendPhoto(chatId, result.subjectPath, { caption: '🧍 Transparent Subject Layer' });
  if (result.videoPath) {
    await bot.sendVideo(chatId, result.videoPath, {
      caption: `🌍 *${brand.toUpperCase()} ${sceneType}* | Nano Banana 2 + Remotion`,
      parse_mode: 'Markdown'
    });
  } else {
    bot.sendMessage(chatId, `✅ Layers generated. Remotion engine needed for MP4 output.`);
  }
}

async function runMarketingTool(tool: string, args: string[]): Promise<string> {
  if (tool === 'copy')            return marketing.runCopywriter(args[0] || 'homepage', args.slice(1).join(' ') || 'EverjoyAI');
  if (tool === 'social')          return marketing.runSocialContent(args[0] || 'AI tools', args[1] || 'LinkedIn');
  if (tool === 'ads')             return marketing.runPaidAds(args[0] || 'tech brands', args[1] || 'Meta');
  if (tool === 'email')           return marketing.runColdEmail(args.join(' ') || 'SaaS founders');
  if (tool === 'competitor')      return marketing.runCompetitorProfiler(args.join(' '));
  if (tool === 'launch')          return marketing.runLaunchStrategy(args.join(' '));
  if (tool === 'content')         return marketing.runContentStrategy(args.join(' '));
  return "❌ Unknown tool. Options: copy | social | ads | email | competitor | launch | content";
}

// ── HTTP HEALTH CHECK ─────────────────────────────────────────────────────────
http.createServer((req, res) => { res.end('Bridgeloop OS Online'); }).listen(process.env.PORT || 10000);
