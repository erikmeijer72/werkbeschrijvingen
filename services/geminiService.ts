import { GoogleGenAI } from "@google/genai";
import { SOP_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

export const generateSOP = async (
  base64Data: string, 
  mimeType: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

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
         throw new Error("API Key ongeldig of niet gemachtigd. Controleer je configuratie.");
      }
    }
    throw error;
  }
};