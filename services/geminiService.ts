import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

// Helper to safely access environment variables across different build tools (Vite, CRA, Next.js)
const getEnvVar = (key: string): string | undefined => {
  // 1. Check import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Check process.env (Webpack, Next.js, Node)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- Robust API Key Retrieval ---
  // We explicitly look for VITE_API_KEY as the primary source for Vite apps on Vercel
  const apiKey = getEnvVar('VITE_API_KEY') || 
                 getEnvVar('NEXT_PUBLIC_API_KEY') || 
                 getEnvVar('REACT_APP_API_KEY') || 
                 getEnvVar('API_KEY');

  // --- Runtime Environment Polyfill ---
  // The SDK requires process.env to exist and often looks for API_KEY there directly.
  if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
  } else if (!process.env) {
    (window as any).process.env = {};
  }

  // Inject the found key so process.env.API_KEY is available
  if (apiKey) {
    process.env.API_KEY = apiKey;
  }

  // Debugging: Log status (without revealing full key) if missing
  if (!process.env.API_KEY) {
    console.error("Debug Info - Environment:", {
      vite_available: typeof import.meta !== 'undefined' && !!(import.meta as any).env,
      process_available: typeof process !== 'undefined',
      found_vite_key: !!getEnvVar('VITE_API_KEY'),
    });
    
    throw new Error(
      "API Key ontbreekt. Controleer of 'VITE_API_KEY' is ingesteld in Vercel Environment Variables. " +
      "Belangrijk: Na het toevoegen van de key moet je een 'Redeploy' uitvoeren in Vercel."
    );
  }

  // Initialize SDK using the standard process.env.API_KEY as required
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
    if (error instanceof Error && (error.message.includes('403') || error.message.includes('API key'))) {
       throw new Error("API Key ongeldig of niet gemachtigd. Controleer je Google AI Studio key.");
    }
    throw error;
  }
};