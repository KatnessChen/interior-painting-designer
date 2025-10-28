import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ImageData } from '../types';

export const recolorImage = async (
  imageData: ImageData,
  colorName: string,
  colorHex: string,
  customPrompt?: string
): Promise<ImageData> => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set in environment variables.');
  }

  // Ensure a new instance of GoogleGenAI is created for each API call
  // to pick up the latest API key if it changes via `window.aistudio.openSelectKey()`.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert interior designer and professional image editor specializing in photorealistic wall recoloring. Your task is to transform the walls in this interior photo to ${colorName} (HEX: ${colorHex}) with maximum visual impact and realism.

    ═══════════════════════════════════════════════════════════
    CRITICAL INSTRUCTIONS
    ═══════════════════════════════════════════════════════════
    1. Change ALL wall surfaces to ${colorName} (HEX: ${colorHex})
    2. Apply UNIFORM color transformation across 100% of wall areas
    3. Preserve authentic lighting, shadows, and 3D depth on walls
    4. Maintain original lighting direction and intensity
    5. Retain wall texture, grain, and surface details
    6. EXCLUDE: furniture, floor, ceiling, windows, doors, decorations, fixtures
    7. Ensure saturation and brightness match realistic matte/semi-gloss paint

    ${
      customPrompt &&
      `
      ═══════════════════════════════════════════════════════════
      CUSTOM USER INSTRUCTIONS (THESE TAKE PRIORITY)
      ═══════════════════════════════════════════════════════════
      ${customPrompt}`
    }

    ═══════════════════════════════════════════════════════════
    FINAL OUTPUT REQUIREMENT
    ═══════════════════════════════════════════════════════════
    Deliver: A high-quality, photorealistic recolored image where ALL walls display ${colorName} (${colorHex}) with maximum visual distinction from the original, while maintaining perfect lighting, shadows, and architectural detail.
  `;

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
      throw new Error('No image data received from Gemini API.');
    }

    const newImageBase64: string = generatedImagePart.inlineData.data;
    const newImageMimeType: string = generatedImagePart.inlineData.mimeType;

    return {
      id: crypto.randomUUID(),
      name: imageData.name,
      base64: newImageBase64,
      mimeType: newImageMimeType,
    };
  } catch (error) {
    console.error('Error recoloring image with Gemini API:', error);
    throw new Error(
      `Failed to recolor image: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
