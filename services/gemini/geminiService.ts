import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ImageData } from '../../types';
import { getPromptByTask } from './prompts';
import { GeminiTask, GEMINI_TASKS } from './geminiTasks';

export { GEMINI_TASKS };
export type { GeminiTask };

// For backward compatibility - export getDefaultPrompt for existing code
export const getRecolorDefaultPrompt = (colorName: string, colorHex: string) =>
  getPromptByTask(GEMINI_TASKS.RECOLOR_WALL, { colorName, colorHex });

export const recolorImage = async (
  imageData: ImageData,
  colorName: string,
  colorHex: string,
  customPrompt?: string
): Promise<ImageData> => {
  return processImageWithTask(imageData, GEMINI_TASKS.RECOLOR_WALL, {
    colorName,
    colorHex,
    customPrompt,
  });
};

/**
 * Generic image processing function with task-based prompt selection
 * @param imageData - The image to process
 * @param task - The task type (RECOLOR_WALL, ADD_TEXTURE, etc.)
 * @param options - Task-specific options
 * @returns Processed image data
 */
export const processImageWithTask = async (
  imageData: ImageData,
  task: GeminiTask,
  options: {
    colorName?: string;
    colorHex?: string;
    customPrompt?: string;
  } = {}
): Promise<ImageData> => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set in environment variables.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = getPromptByTask(task, options);

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
    console.error('Error processing image with Gemini API:', error);
    throw new Error(
      `Failed to process image: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
