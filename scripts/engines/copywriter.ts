import { textModel } from '../utils/ai';

export async function generateEverjoyCopy(niche: string, magnet: string) {
  try {
    const prompt = `
      System: You are the EverjoyAi Lead Copywriter.
      Framework: Authority Positioning (Lead Generation).
      
      Target Niche: ${niche}
      Lead Magnet/Angle: ${magnet}
      
      Generate these 4 High-Authority Assets:
      1. 📧 Cold Email: Focus on the "Gap" between their current state and ${magnet}.
      2. 🎙️ Webinar Intro: A 60-second hook focusing on industry "Authority."
      3. 📞 Cold Call Script: A 30-second "VibeCheck" opener to book a meeting.
      4. 💬 Social DM: A short, non-spammy pattern-interrupt for LinkedIn/IG.

      Tone: High-conviction, professional, zero-fluff.
      Format: Clean Markdown with bold headers for Telegram.
    `;

    const result = await textModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    return `❌ Engine Error: ${error.message}`;
  }
}