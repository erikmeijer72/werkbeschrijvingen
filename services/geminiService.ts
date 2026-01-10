import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // --- Runtime Environment Polyfill ---
  // Ensure process.env exists for the SDK and for our checks below.
  if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
  } else if (!process.env) {
    (window as any).process.env = {};
  }

  // --- Robust API Key Retrieval ---
  // We check multiple common patterns to support Vite, Next.js, and CRA deployments on Vercel.
  let apiKey = process.env.API_KEY;

  if (!apiKey) {
    try {
      // 1. Vite / Vercel (VITE_API_KEY)
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_API_KEY;
      }
    } catch (e) {
      // Ignore reference errors if import.meta is not supported
    }
  }

  if (!apiKey) {
    // 2. Next.js (NEXT_PUBLIC_API_KEY)
    if (process.env.NEXT_PUBLIC_API_KEY) {
      apiKey = process.env.NEXT_PUBLIC_API_KEY;
    }
    // 3. Create React App (REACT_APP_API_KEY)
    else if (process.env.REACT_APP_API_KEY) {
      apiKey = process.env.REACT_APP_API_KEY;
    }
  }

  // Inject the found key back into process.env.API_KEY for the SDK to use
  if (apiKey) {
    process.env.API_KEY = apiKey;
  }
  // ------------------------------------

  if (!process.env.API_KEY) {
    throw new Error(
      "API Key ontbreekt. Controleer je Vercel instellingen.\n" +
      "Zorg dat je 'VITE_API_KEY' (voor Vite) hebt toegevoegd aan de Environment Variables en een nieuwe deployment hebt gedaan."
    );
  }

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