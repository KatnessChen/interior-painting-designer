
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImageData } from '../types';

export const recolorImage = async (
  imageData: ImageData,
  colorName: string,
  colorHex: string,
): Promise<ImageData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set in environment variables.");
  }

  // Ensure a new instance of GoogleGenAI is created for each API call
  // to pick up the latest API key if it changes via `window.aistudio.openSelectKey()`.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Change the wall color in this image to ${colorName} (${colorHex}). Ensure the color is applied only to the walls and maintains realistic lighting and shadows.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Model for general image generation and editing tasks
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData.base64,
              mimeType: imageData.mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE], // Must be an array with a single `Modality.IMAGE` element.
      },
    });

    const generatedImagePart = response.candidates?.[0]?.content?.parts?.[0];

    if (!generatedImagePart || !generatedImagePart.inlineData) {
      throw new Error("No image data received from Gemini API.");
    }

    const newImageBase64: string = generatedImagePart.inlineData.data;
    const newImageMimeType: string = generatedImagePart.inlineData.mimeType;

    return {
      id: crypto.randomUUID(),
      name: `recolored-${imageData.name}`,
      base64: newImageBase64,
      mimeType: newImageMimeType,
    };
  } catch (error) {
    console.error("Error recoloring image with Gemini API:", error);
    throw new Error(`Failed to recolor image: ${error instanceof Error ? error.message : String(error)}`);
  }
};
