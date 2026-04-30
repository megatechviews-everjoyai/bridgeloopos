import { textModel } from '../utils/ai';

export async function generateEverjoyAds(platform: string, niche: string) {
  try {
    const prompt = `
      System: You are the EverjoyAi Ad Strategist.
      Platform: ${platform}
      Target Niche: ${niche}
      
      Task: Generate 3 Ad Variations:
      1. **The Pattern Interrupt:** A bold, "Hot Take" style ad that stops the scroll.
      2. **The Case Study:** A results-oriented ad highlighting a move from the "Icky Zone" to "Authority."
      3. **The Quick Win:** A short, punchy ad offering an immediate solution (Gapfinder/VibeCheck).

      Include:
      - Primary Copy
      - Headline
      - Image/Video Description (Creative Direction)
      
      Format for Telegram with bold headers.
    `;

    const result = await textModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    return `❌ Ad Engine Error: ${error.message}`;
  }
}