import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- 1. ROBUST ENVIRONMENT POLYFILL & KEY DISCOVERY ---
  // We need to robustly find the API key from various potential environment variable locations
  // and ensure 'process.env.API_KEY' is populated as expected by the Google GenAI SDK conventions.
  
  let foundKey = '';

  // Check Vite's import.meta.env
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) foundKey = import.meta.env.VITE_API_KEY;
      // @ts-ignore
      else if (import.meta.env.API_KEY) foundKey = import.meta.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not supported
  }

  // Check standard global process.env (Next.js, standard Node, or explicitly replaced globals)
  if (!foundKey && typeof process !== 'undefined' && process.env) {
    foundKey = process.env.API_KEY || 
               process.env.NEXT_PUBLIC_API_KEY || 
               process.env.REACT_APP_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               '';
  }

  // Polyfill the global process for the SDK if it's completely missing (Browser environment)
  // @ts-ignore
  if (typeof process === 'undefined') {
    // @ts-ignore
    window.process = { env: {} };
  }
  
  // Ensure process.env exists
  // @ts-ignore
  if (!process.env) { 
    // @ts-ignore
    process.env = {}; 
  }
  
  // 2. Set the key back to process.env.API_KEY if we found it elsewhere
  if (foundKey) {
    process.env.API_KEY = foundKey;
  }

  // 3. FINAL VALIDATION
  if (!process.env.API_KEY) {
    console.error("DEBUG: Failed to find API Key. Checked VITE_API_KEY, NEXT_PUBLIC_API_KEY, REACT_APP_API_KEY, and process.env.API_KEY.");
    throw new Error(
      "API Key ontbreekt. \n\n" +
      "Instructie voor Vercel:\n" +
      "1. Ga naar Settings > Environment Variables.\n" +
      "2. Voeg 'VITE_API_KEY' toe met je Google AI Studio key.\n" +
      "3. BELANGRIJK: Ga naar Deployments en klik op 'Redeploy' bij de laatste versie."
    );
  }

  // 4. INITIALIZATION
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
      if (error.message.includes('403') || error.message.includes('API key')) {
         throw new Error("API Key ongeldig of niet gemachtigd. Controleer je VITE_API_KEY in Vercel.");
      }
      if (error.message.includes('429')) {
        throw new Error("Te veel verzoeken. Probeer het later opnieuw.");
      }
    }
    throw error;
  }
};