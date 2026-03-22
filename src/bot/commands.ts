import TelegramBot from 'node-telegram-bot-api';
import { supabase } from '../services/supabase';

export const registerCommands = (bot: TelegramBot) => {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome to the EverjoyAi Bridge.");
  });

  // Add your /generate and /approve logic here...
};