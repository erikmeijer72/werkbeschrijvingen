import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- Runtime Environment Polyfill ---
  // Ensure global process object exists for the SDK
  if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
  } else if (!process.env) {
    (window as any).process.env = {};
  }

  // --- API Key Discovery ---
  let resolvedKey = '';

  try {
    // Explicitly check Vite env var. 
    // We use direct property access so bundlers can statically replace it.
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      resolvedKey = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // import.meta might not be available in all environments, ignore error
  }

  // Fallback checks for other environments (Next.js, CRA, Node)
  if (!resolvedKey && process.env.NEXT_PUBLIC_API_KEY) resolvedKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!resolvedKey && process.env.REACT_APP_API_KEY) resolvedKey = process.env.REACT_APP_API_KEY;
  if (!resolvedKey && process.env.API_KEY) resolvedKey = process.env.API_KEY;

  // Set the key for the SDK
  if (resolvedKey) {
    process.env.API_KEY = resolvedKey;
  }

  if (!process.env.API_KEY) {
    throw new Error(
      "API Key ontbreekt. Controleer of 'VITE_API_KEY' correct is ingesteld in Vercel Environment Variables en of je opnieuw hebt gedeployed."
    );
  }

  // Initialize SDK with the key from process.env.API_KEY
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