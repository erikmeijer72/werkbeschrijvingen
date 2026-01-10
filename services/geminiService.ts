import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- 1. ENVIRONMENT POLYFILL ---
  // The Google SDK and our configuration rules require 'process.env.API_KEY'.
  // In browser environments (like Vite on Vercel), 'process' is undefined.
  // We must shim it to prevent crashes and to provide a place to store the key.
  
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

  // --- 2. API KEY DISCOVERY ---
  // We check standard Vite environment variables. 
  // IMPORTANT: Vite statically replaces 'import.meta.env.VITE_API_KEY' at build time.
  // We must reference it exactly like that.
  
  let foundKey = '';

  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      foundKey = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore errors in non-module environments
  }

  // Fallback: Check if it's already in process.env (e.g. from a different build system)
  if (!foundKey && process.env.API_KEY) {
    foundKey = process.env.API_KEY;
  }

  // --- 3. SET API KEY ---
  // Ensure the key is available where the SDK expects it (and where strict rules require it).
  if (foundKey) {
    process.env.API_KEY = foundKey;
  }

  // --- 4. VALIDATION ---
  if (!process.env.API_KEY) {
    console.error("DEBUG: API Key retrieval failed. Checked VITE_API_KEY and process.env.API_KEY.");
    throw new Error(
      "API Key is missing.\n\n" +
      "ACTION REQUIRED (Vercel):\n" +
      "1. Go to your Vercel Project Settings > Environment Variables.\n" +
      "2. Add a new variable named 'VITE_API_KEY' with your Google AI Studio key.\n" +
      "3. IMPORTANT: Go to Deployments and click 'Redeploy' for the changes to take effect."
    );
  }

  // --- 5. INITIALIZE SDK ---
  // We use process.env.API_KEY as strictly required by the coding guidelines.
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
      // Handle standard API errors
      if (error.message.includes('403') || error.message.includes('API key')) {
         throw new Error("API Key ongeldig of niet gemachtigd. Controleer of VITE_API_KEY correct is in Vercel.");
      }
      if (error.message.includes('429')) {
        throw new Error("Te veel verzoeken. Probeer het later opnieuw.");
      }
    }
    throw error;
  }
};