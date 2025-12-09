import { GeminiTaskName } from './services/gemini/geminiTasks';

export interface BenjaminMooreColor {
  code: string;
  name: string;
  hex: string;
}

export interface ImageData {
  id: string;
  name: string;

  // The space this image belongs to
  spaceId: string | null;

  // Evolution chain
  evolutionChain: ImageOperation[];
  parentImageId: string | null;

  // Firebase Storage
  imageDownloadUrl: string; // Firebase Storage download URL
  storageFilePath: string; // Storage Path

  // Other metadata
  mimeType: string;

  // Soft delete
  isDeleted: boolean;
  deletedAt: string | null; // ISO 8601 date string for Redux serialization

  // Timestamps (ISO 8601 date strings for Redux serialization)
  createdAt: string;
  updatedAt: string;
}

/**
 * Record of an image operations
 */
export interface ImageOperation {
  /**
   * The ID of the image *before* this operation was applied.
   * This is the source image for the operation.
   */
  imageId: string;

  taskName: string; // e.g., "recolor_wall" or "add_texture".

  customPrompt: string | null;

  /**
   * A container for any options specific to the task, such as the color or texture used.
   */
  options: {
    /**
     * The ID of the color used, if applicable (e.g., "HC-170").
     */
    colorId: string | null;

    /**
     * A snapshot of the color's details at the time of the operation.
     * This is to preserve the color information even if the original color definition changes later.
     */
    colorSnapshot: {
      name: string;
      hex: string;
    } | null;

    /**
     * The ID of the texture used, if applicable.
     */
    textureId: string | null;

    /**
     * A snapshot of the texture's details at the time of the operation.
     */
    textureSnapshot: {
      name: string;
      url: string; // The URL of the texture image at that time
    } | null;
  };

  timestamp: Date;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  usage: {
    [key in GeminiTaskName]: number;
  };
  lastLoginAt: Date;
}

export interface Space {
  id: string;
  projectId: string;
  name: string;
  images: ImageData[];
  createdAt: string; // ISO 8601 date string for Redux serialization
}

export interface Project {
  id: string;
  name: string;
  spaces: Space[];
  createdAt: string; // ISO 8601 date string for Redux serialization
}
