import { textModel } from '../utils/ai';

export async function runAuthorityAudit(url: string) {
  try {
    const prompt = `
      System: You are the EverjoyAi Authority Auditor.
      Task: Conduct a high-level "Authority & Trust" audit of this URL: ${url}
      
      Analyze through these 4 Lenses:
      1. **Trust Signals (E-E-A-T):** Does the site show real human experience and expertise?
      2. **Conversion Friction:** Is the "Hero Section" optimized or is it losing 88% of traffic?
      3. **The "Authority Gap":** Is the brand positioned as a commodity or a category leader?
      4. **AI Visibility:** How likely is an AI (like Gemini or Search) to cite this site as a primary source?

      Output Format:
      - 🔴 **Critical Gaps** (Fix these to stop losing money)
      - 🟡 **Optimization Opportunities** (The "Authority" low-hanging fruit)
      - 🟢 **The Everjoy Solution** (How our tools close these gaps)
      
      Keep it punchy for a Telegram message.
    `;

    const result = await textModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    return `❌ Audit Error: ${error.message}`;
  }
}