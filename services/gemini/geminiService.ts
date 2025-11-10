import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ImageData } from '../../types';
import { getPromptByTask } from './prompts';
import { GeminiTask, GEMINI_TASKS } from './geminiTasks';
import { ref } from 'firebase/storage';
import { getBytes } from 'firebase/storage';
import { storage } from '../firestoreService';

export { GEMINI_TASKS };
export type { GeminiTask };

// TODO: explore more model solutions and make this selectable to users
const defaultModel = 'gemini-2.5-flash-image';

export const recolorWalls = async (
  userId: string,
  imageData: ImageData,
  colorName: string,
  colorHex: string,
  customPrompt?: string
): Promise<{ base64: string; mimeType: string }> => {
  return processImageWithTask(GEMINI_TASKS.RECOLOR_WALL, imageData, {
    colorName,
    colorHex,
    customPrompt,
    userId,
  });
};

export const addTexture = async (
  userId: string,
  parentImage: ImageData,
  textureImage: ImageData,
  textureName: string,
  customPrompt?: string
): Promise<{ base64: string; mimeType: string }> => {
  return processImageWithTask(GEMINI_TASKS.ADD_TEXTURE, parentImage, {
    textureName,
    customPrompt,
    userId,
  });
};

/**
 * Generic image processing function with task-based prompt selection
 * @param task - The task type (RECOLOR_WALL, ADD_TEXTURE, etc.)
 * @param imageData - The image to process
 * @param options - Task-specific options
 * @returns Object with base64 and mimeType of processed image
 */
export const processImageWithTask = async (
  task: GeminiTask,
  imageData: ImageData,
  options: {
    customPrompt?: string;
    model?: string;
    colorName?: string;
    colorHex?: string;
    textureName?: string;
    userId?: string;
  } = {}
): Promise<{ base64: string; mimeType: string }> => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set in environment variables.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = getPromptByTask(task, options);
  const model = options.model ?? defaultModel;

  try {
    // Fetch the image from Firebase Storage using SDK
    // TODO: image dependency inversion
    const extension = imageData.mimeType.split('/')[1] || 'jpg';
    const storagePath = options.userId
      ? `users/${options.userId}/images/${imageData.id}.${extension}`
      : imageData.storagePath;
    const storageRef = ref(storage, storagePath);
    const bytes = await getBytes(storageRef);
    const blob = new Blob([bytes], { type: imageData.mimeType });
    const base64String = await blobToBase64(blob);

    // Build parts array with the image
    const parts: any[] = [
      {
        inlineData: {
          data: base64String,
          mimeType: imageData.mimeType,
        },
      },
      { text: prompt },
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: {
        parts,
      },
      config: {
        responseModalities: [Modality.IMAGE],
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

    return {
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

/**
 * Convert Blob to Base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 string without data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
