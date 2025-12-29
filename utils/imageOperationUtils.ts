import { ImageOperation, ImageData, Color } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { GeminiTaskName } from '@/services/gemini/geminiTasks';

interface Texture {
  name: string;
  description?: string;
}

/**
 * Formats image operation data for the evolution chain.
 * Sets null values for task-specific fields that are not applicable.
 *
 * @param imageId The ID of the image being processed
 * @param taskName The name of the task being performed
 * @param customPrompt Optional custom prompt provided by the user
 * @param selectedColor Optional color selected for recoloring
 * @param selectedTexture Optional texture selected for adding texture
 * @returns A properly formatted ImageOperation object
 */
function formatImageOperationData(
  image: ImageData,
  taskName: GeminiTaskName,
  customPrompt: string | undefined,
  selectedColor: Color | null,
  selectedTexture: Texture | null
): ImageOperation {
  // Base operation structure
  const operation: ImageOperation = {
    imageId: image.id,
    imageDownloadUrl: image.imageDownloadUrl,
    taskName,
    customPrompt: customPrompt || null,
    options: {
      colorId: null,
      colorSnapshot: null,
      textureId: null,
      textureSnapshot: null,
    },
    timestamp: Timestamp.fromDate(new Date()),
  };

  // Set color-related fields if recoloring
  if (selectedColor) {
    operation.options.colorId = selectedColor.id || null;
    operation.options.colorSnapshot = {
      name: selectedColor.name,
      hex: selectedColor.hex,
    };
  }

  // Set texture-related fields if adding texture
  if (selectedTexture) {
    operation.options.textureId = null; // Can be set if texture IDs are available
    operation.options.textureSnapshot = {
      name: selectedTexture.name,
      url: '', // TODO: get texture URL if needed
    };
  }

  return operation;
}

export { formatImageOperationData };
