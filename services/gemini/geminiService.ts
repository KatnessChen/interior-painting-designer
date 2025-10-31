import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ImageData } from '../../types';
import { getPromptByTask } from './prompts';
import { GeminiTask, GEMINI_TASKS } from './geminiTasks';

export { GEMINI_TASKS };
export type { GeminiTask };

// TODO: explore more model solutions and make this selectable to users
const defaultModel = 'gemini-2.5-flash-image';

export const recolorWalls = async (
  imageData: ImageData,
  colorName: string,
  colorHex: string,
  customPrompt?: string
): Promise<ImageData> => {
  return processImageWithTask(GEMINI_TASKS.RECOLOR_WALL, [imageData], {
    colorName,
    colorHex,
    customPrompt,
  });
};

export const addTexture = async (
  imageList: ImageData[],
  textureName: string,
  customPrompt?: string
): Promise<ImageData> => {
  return processImageWithTask(GEMINI_TASKS.ADD_TEXTURE, imageList, {
    textureName,
    customPrompt,
  });
};

/**
 * Generic image processing function with task-based prompt selection
 * @param imageList - Array of images to process
 * @param task - The task type (RECOLOR_WALL, ADD_TEXTURE, etc.)
 * @param options - Task-specific options
 * @returns Array of processed image data
 */
export const processImageWithTask = async (
  task: GeminiTask,
  imageList: ImageData[],
  options: {
    customPrompt?: string;
    model?: string;
    colorName?: string;
    colorHex?: string;
    textureName?: string;
  } = {}
): Promise<ImageData> => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set in environment variables.');
  }

  if (imageList.length === 0) {
    throw new Error('At least one image is required for processing.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = getPromptByTask(task, options);
  const model = options.model ?? defaultModel;

  try {
    // Build parts array with all images
    const parts: any[] = imageList.map((imageData) => ({
      inlineData: {
        data: imageData.base64,
        mimeType: imageData.mimeType,
      },
    }));

    // Add the prompt as the last part
    parts.push({ text: prompt });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: {
        parts,
      },
      config: {
        responseModalities: [Modality.IMAGE], // Must be an array with a single `Modality.IMAGE` element.
      },
    });

    const generatedImagePart = response.candidates?.[0]?.content?.parts?.[0];

    if (!generatedImagePart || !generatedImagePart.inlineData) {
      throw new Error('No image data received from Gemini API.');
    }

    const newImageBase64: string = generatedImagePart.inlineData.data ?? '';
    const newImageMimeType: string = generatedImagePart.inlineData.mimeType ?? 'image/png';

    if (!newImageBase64) {
      throw new Error('No base64 image data received from Gemini API.');
    }

    // Use the first image's name as reference
    return {
      id: crypto.randomUUID(),
      name: imageList[0].name,
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
