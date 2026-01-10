import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- Runtime Environment Polyfill ---
  // Ensure process.env.API_KEY is populated from Vercel's VITE_API_KEY before usage.
  try {
    // 1. Ensure 'process' global exists
    if (typeof process === 'undefined') {
      (window as any).process = { env: {} };
    } else if (!process.env) {
      (window as any).process.env = {};
    }

    // 2. If process.env.API_KEY is missing, try to grab it from Vite/Vercel env
    if (!process.env.API_KEY) {
      // @ts-ignore - import.meta is a Vite/ESM feature
      const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
      
      if (viteEnv && viteEnv.VITE_API_KEY) {
        process.env.API_KEY = viteEnv.VITE_API_KEY;
      }
    }
  } catch (e) {
    console.warn("Environment variable sync failed:", e);
  }
  // ------------------------------------

  // Explicit check to provide a clear error message to the user/developer
  if (!process.env.API_KEY) {
    throw new Error("API Key ontbreekt. Controleer of de environment variable 'VITE_API_KEY' is ingesteld in Vercel.");
  }

  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Modified prompt to explicitly forbid introductory text
  const promptText = `Genereer de werkbeschrijving op basis van deze audio. Geef ENKEL de werkbeschrijving terug. GEEN inleidende tekst zoals "Zeker! Hier is het stappenplan". Start direct met de inhoud.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: promptText
          }
        ]
      },
      config: {
        systemInstruction: SOP_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText);
      }
    }

    return fullText || "Geen resultaat gegenereerd.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};