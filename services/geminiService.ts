import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- Environment Variable Polyfill ---
  // The SDK requires process.env.API_KEY. In Vite/Vercel environments, this is often exposed
  // via import.meta.env.VITE_API_KEY. We bridge this gap here.
  
  // @ts-ignore
  if (typeof process === 'undefined') {
    // @ts-ignore
    window.process = { env: {} };
  }
  
  // @ts-ignore
  if (!process.env) {
    // @ts-ignore
    process.env = {};
  }

  // explicit check for VITE_API_KEY to allow bundler replacement
  // @ts-ignore
  if (!process.env.API_KEY && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    process.env.API_KEY = import.meta.env.VITE_API_KEY;
  }
  // --- End Polyfill ---

  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("DEBUG: API Key missing. Checked process.env.API_KEY and import.meta.env.VITE_API_KEY.");
    throw new Error(
      "API Key is missing. \n" + 
      "For Vercel/Vite: Ensure variable is named 'VITE_API_KEY' in Settings > Environment Variables and redeploy."
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('API key')) {
         throw new Error("API Key ongeldig of niet gemachtigd. Controleer VITE_API_KEY in Vercel.");
      }
    }
    throw error;
  }
};