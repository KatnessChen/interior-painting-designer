import { GeminiTaskName } from './services/gemini/geminiTasks';

export interface BenjaminMooreColor {
  code: string;
  name: string;
  hex: string;
}

export interface ImageData {
  id: string;
  name: string;

  // The room this image belongs to (null if not yet assigned to a room)
  roomId: string | null;

  // Evolution chain
  evolutionChain: ImageOperation[];
  parentImageId: string | null;

  // Firebase Storage
  storageUrl: string; // Firebase Storage download URL
  storagePath: string; // Storage Path

  // Other metadata
  mimeType: string;

  // Soft delete
  isDeleted: boolean;
  deletedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
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
    colorSnapshot?: {
      name: string;
      hex: string;
    };

    /**
     * The ID of the texture used, if applicable.
     */
    textureId: string | null;

    /**
     * A snapshot of the texture's details at the time of the operation.
     */
    textureSnapshot?: {
      name: string;
      url: string; // The URL of the texture image at that time
    };
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

export interface Room {
  id: string;
  homeId: string;
  name: string;
  images: ImageData[];
  createdAt: string; // ISO 8601 date string for Redux serialization
}

export interface Home {
  id: string;
  name: string;
  rooms: Room[];
  createdAt: string; // ISO 8601 date string for Redux serialization
}
