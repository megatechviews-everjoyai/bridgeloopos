import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import http from 'http';

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

console.log("🚀 Bridgeloop OS: Hardened Command Center Online.");

// 3. MAIN MESSAGE HANDLER
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const rawText = msg.text || "";

  // ANTI-HACKING: SILENT LOCKOUT (Rule 1: Determinism)
  if (userId !== ADMIN_ID) {
    console.warn(`🛡️ Security: Unauthorized access attempt by ID ${userId}`);
    return; 
  }

  // SELF-IMPROVING GUARDRAIL: Scrub sensitive data before processing
  const text = SecretScrubber.scrub(rawText);

  // ADMIN DASHBOARD ROUTING
  let category = "General";
  if (text.startsWith('/youtube')) category = "YouTube";
  else if (text.startsWith('/admaker')) category = "Advert Maker";
  else if (text.startsWith('/review')) category = "Code Audit";
  else if (text.startsWith('/check_security')) category = "Security";

  // LOG TO SUPABASE (Post-Scrubbing)
  await supabase.from('audit_logs').insert([{ 
    user_handle: msg.from?.username || "Admin", 
    message_content: text, 
    platform: 'telegram_bot',
    category: category 
  }]);

  // --- COMMAND: /check_security ---
  if (text === '/check_security') {
    bot.sendMessage(chatId, "🛡️ Initiating Full System Audit...");
    const report = await security.runFullAudit(ADMIN_ID);
    bot.sendMessage(chatId, `🛡️ **SECURITY REPORT**\n\nStatus: ${report.status}\n\nFindings: ${report.findings.unauthorizedAttempts} unauthorized attempts.\n\nSteps: ${report.steps.join('\n')}`);
  }

  // --- COMMAND: /youtube [topic] ---
  if (text.startsWith('/youtube ')) {
    const brief = await director.getCreativeBrief(text.replace('/youtube ', '').trim());
    if (brief) {
      bot.sendMessage(chatId, `📺 **YT BRIEF**\n\nTitles: ${brief.titles}\n\nRef: ${brief.sheet}\n\nPose: ${brief.pose}`);
    }
  }

  // --- COMMAND: /admaker [niche] ---
  if (text.startsWith('/admaker ')) {
    const ads = await director.generateAdFactory(text.replace('/admaker ', '').trim());
    bot.sendMessage(chatId, ads);
  }

  // --- COMMAND: /review [code] (Rule 4 Implementation) ---
  if (text.startsWith('/review ')) {
    bot.sendMessage(chatId, "🛡️ Auditor: Scanning code in fresh context...");
    const audit = await reviewer.auditChange("Manual_Input.ts", text.replace('/review ', '').trim());
    bot.sendMessage(chatId, `🛡️ **AUDIT REPORT**\n\n${SecretScrubber.scrub(audit)}`);
  }

  // --- COMMAND: /world [brand] [type] [scene] | [subject] ---
  // Usage: /world everjoy world "cyberpunk megacity at night" | "EverjoyAI character"
  //        /world lave cinematic "golden hour Moroccan riad courtyard"
  //        /world curate character "abstract marble sculpture" | "editorial figure"
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
  }

  // --- COMMAND: /design [brand] [room] [custom prompt?] ---
  // Usage: /design everjoy living
  //        /design lave bedroom "warm sanctuary with reading nook"
  //        /design curate moodboard "japandi kitchen"
  //        /design everjoy transform "dark cluttered office with IKEA furniture"
  if (text.startsWith('/design ')) {
    const parts = text.replace('/design ', '').trim().split(' ');
    const brand = (parts[0] || 'everjoy') as DesignBrand;
    const room = parts[1] || 'living';
    const customPrompt = parts.slice(2).join(' ') || undefined;

    bot.sendMessage(chatId, `🎨 **Design Agent: Rendering ${brand.toUpperCase()} ${room} with Nano Banana Pro 2...**`);

    let result;
    if (room === 'transform') {
      result = await designAgent.generateTransform(customPrompt || 'modern living space', brand);
    } else if (room === 'moodboard') {
      result = await designAgent.generateMoodBoard(brand, customPrompt || 'luxury interior');
    } else {
      result = await designAgent.generateDesign(room, brand, customPrompt);
    }

    if (result.success && result.imagePath) {
      await bot.sendPhoto(chatId, result.imagePath, {
        caption: `🎨 **${brand.toUpperCase()} ${room} Design**\n\n_Nano Banana Pro 2 | ${result.resolution} | ${result.aspectRatio}_`,
        parse_mode: 'Markdown'
      });
    } else {
      bot.sendMessage(chatId, `❌ ${SecretScrubber.scrub(result.error || 'Design generation failed')}`);
    }
  }

  // --- COMMAND: /marketing [tool] [input] ---
  // Usage: /marketing copy "homepage" "EverjoyAI automation platform"
  //        /marketing social "AI tools" "LinkedIn"
  //        /marketing ads "wellness coaches" "Meta"
  //        /marketing email "SaaS founders"
  //        /marketing competitor "Jasper AI"
  //        /marketing launch "CurateAI v2"
  //        /marketing content "Lave Gallery"
  if (text.startsWith('/marketing ')) {
    const parts = text.replace('/marketing ', '').trim();
    const [tool, ...args] = parts.split(' ');
    bot.sendMessage(chatId, `📣 **Marketing Agent: Running "${tool}"...**`);
    let result = "";
    if (tool === 'copy')       result = await marketingAgent.runCopywriter(args[0] || 'homepage', args.slice(1).join(' ') || 'EverjoyAI');
    else if (tool === 'social')      result = await marketingAgent.runSocialContent(args[0] || 'AI tools', args[1] || 'LinkedIn');
    else if (tool === 'ads')         result = await marketingAgent.runPaidAds(args[0] || 'tech brands', args[1] || 'Meta');
    else if (tool === 'email')       result = await marketingAgent.runColdEmail(args.join(' ') || 'SaaS founders');
    else if (tool === 'competitor')  result = await marketingAgent.runCompetitorProfiler(args.join(' '));
    else if (tool === 'launch')      result = await marketingAgent.runLaunchStrategy(args.join(' '));
    else if (tool === 'content')     result = await marketingAgent.runContentStrategy(args.join(' '));
    else result = "❌ Unknown tool. Options: copy | social | ads | email | competitor | launch | content";
    bot.sendMessage(chatId, SecretScrubber.scrub(result), { parse_mode: 'Markdown' });
  }

  // --- COMMAND: /socials [topic] ---
  if (text.startsWith('/socials ')) {
    const draft = await socials.generateSlayPost(text.replace('/socials ', '').trim(), "LinkedIn");
    if (draft) {
      draftCache.set(chatId, draft);
      const opts = { reply_markup: { inline_keyboard: [[{ text: '🚀 Post Now', callback_data: 'confirm_post' }, { text: '🗑️ Discard', callback_data: 'discard_post' }]] } };
      bot.sendMessage(chatId, `🟦 **LINKEDIN DRAFT**\n\n${draft}`, opts);
    }
  }
});

// 4. DETERMINISM HOOKS (Rule 1)
bot.on('callback_query', async (q) => {
  const chatId = q.message?.chat.id;
  if (!chatId) return;

  if (q.data === 'confirm_post') {
    const draft = draftCache.get(chatId);
    if (draft) {
      const result = await socials.postToLinkedIn(draft);
      bot.sendMessage(chatId, result.success ? "✅ Posted!" : `❌ Error: ${result.error}`);
    }
  } else if (q.data === 'discard_post') {
    draftCache.delete(chatId);
    bot.sendMessage(chatId, "🗑️ Draft discarded.");
  }
  bot.answerCallbackQuery(q.id);
});

http.createServer((req, res) => { res.end('Bridgeloop OS Online'); }).listen(process.env.PORT || 10000);