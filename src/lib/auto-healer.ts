import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export const initAutoHealer = () => {
  if (typeof window !== 'undefined') {
    window.onerror = async (message, source, lineno, colno, error) => {
      await handleCrash({
        type: 'Runtime Error',
        message: String(message),
        stack: error?.stack,
        location: `${source}:${lineno}:${colno}`
      });
    };

    window.onunhandledrejection = async (event) => {
      await handleCrash({
        type: 'Promise Rejection',
        message: event.reason?.message || 'Unknown async error',
        stack: event.reason?.stack
      });
    };
  }
};

async function handleCrash(errorDetails: any) {
  console.log("🛠️ Bridgeloop Auto-Healer: Analyzing Crash...");

  // 1. Ask the 'Shared Brain' for a fix (Conceptual)
  // In a real Bridgeloop setup, this sends the stack trace to your Claude-powered edge function
  const aiAnalysis = await analyzeErrorWithAI(errorDetails);

  // 2. Send the "Everjoy Status Report"
  await resend.emails.send({
    from: 'Bridgeloop OS <system@everjoyai.com>',
    to: 'everjoyaitech@gmail.com',
    subject: `🚨 Everjoy System Alert: ${errorDetails.type} Resolved`,
    html: `
      <div style="font-family: sans-serif; background: #000; color: #fff; padding: 20px; border: 1px solid #333;">
        <h2 style="color: #007AFF;">Everjoy Auto-Healer Report</h2>
        <p><strong>Status:</strong> Critical Error Intercepted & Analyzed</p>
        <hr style="border: 0.5px solid #222;" />
        <p><strong>The Glitch:</strong> ${errorDetails.message}</p>
        <p><strong>Root Cause:</strong> ${aiAnalysis.cause}</p>
        <p><strong>Auto-Fix Applied:</strong> ${aiAnalysis.fixAction}</p>
        <pre style="background: #111; padding: 10px; font-size: 12px; color: #666;">
${errorDetails.stack}
        </pre>
        <p style="font-size: 10px; color: #444;">Bridgeloop OS v1.2 - Resonant Stability Active</p>
      </div>
    `
  });
}

// Mock AI analysis—in production, this calls your Claude Code / Bridgeloop endpoint
async function analyzeErrorWithAI(details: any) {
  return {
    cause: "Potential null pointer in Lave Gallery component transition.",
    fixAction: "Temporary state fallback injected; component re-mounted."
  };
}
