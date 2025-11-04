import { BenjaminMooreColor, ImageData } from '../types';
import { Texture } from '../components/TextureSelector';

// Constants for storage keys
const STORAGE_KEYS = {
  CUSTOM_COLORS: 'interior_designer_custom_colors',
  USER_PHOTOS: 'interior_designer_user_photos',
  UPDATED_PHOTOS: 'interior_designer_updated_photos',
} as const;

// Storage Service class
class StorageService {
  constructor() {}

  // Initialize the storage service
  async init(): Promise<void> {
    // Init Firestore
  }

  // Custom Colors Management
  // TODO: save custom color to Firestore
  async saveCustomColors(colors: BenjaminMooreColor[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COLORS, JSON.stringify(colors));
    } catch (error) {
      console.error('Failed to save custom colors to localStorage:', error);
      throw new Error('Failed to save custom colors');
    }
  }

  // TODO: get custom color from Firestore
  async getCustomColors(): Promise<BenjaminMooreColor[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_COLORS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get custom colors from localStorage:', error);
      return [];
    }
  }

  async addCustomColor(color: BenjaminMooreColor): Promise<void> {
    const existingColors = await this.getCustomColors();
    const updatedColors = [...existingColors, color];
    await this.saveCustomColors(updatedColors);
  }

  async removeCustomColor(colorCode: string): Promise<void> {
    const existingColors = await this.getCustomColors();
    const updatedColors = existingColors.filter((c) => c.code !== colorCode);
    await this.saveCustomColors(updatedColors);
  }

  // TODO: Images Management by Firestore
  async saveOriginalImages(images: ImageData[]): Promise<void> {
    try {
    } catch (error) {
      console.error('', error);
      throw error;
    }
  }

  async getOriginalImages(): Promise<ImageData[]> {
    try {
    } catch (error) {
      console.error('', error);
      return [];
    }
  }

  async addOriginalImage(image: ImageData): Promise<void> {
    try {
    } catch (error) {
      console.error('', error);
      throw error;
    }
  }

  async removeOriginalImage(imageId: string): Promise<void> {
    try {
    } catch (error) {
      console.error('', error);
      throw error;
    }
  }

  // Rename original image metadata (keeps blob intact)
  async renameOriginalImage(imageId: string, newName: string): Promise<void> {
    try {
    } catch (error) {
      console.error('', error);
      throw error;
    }
  }

  // Rename updated image metadata (keeps blob intact)
  async renameUpdatedImage(imageId: string, newName: string): Promise<void> {
    try {
    } catch (error) {
      console.error('', error);
      throw error;
    }
  }

  // Updated Images Management
  async saveUpdatedImages(images: ImageData[]): Promise<void> {
    try {
    } catch (error) {
      console.error('Failed to save updated images to IndexedDB:', error);
      throw error;
    }
  }

  async getUpdatedImages(): Promise<ImageData[]> {
    try {
    } catch (error) {
      console.error('Failed to get updated images from IndexedDB:', error);
      return [];
    }
  }

  async addUpdatedImage(image: ImageData): Promise<void> {
    try {
    } catch (error) {
      console.error('Failed to save updated image to IndexedDB:', error);
      throw error;
    }
  }

  async removeUpdatedImage(imageId: string): Promise<void> {
    try {
    } catch (error) {
      console.error('Failed to delete updated image from IndexedDB:', error);
      throw error;
    }
  }

  // Clear all stored data
  async clearAllData(): Promise<void> {
    // Clear localStorage (only clear color data)
    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_COLORS);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }

    // TODO: Clear Images
  }

  // Textures Management
  async addTexture(texture: Texture): Promise<void> {
    try {
    } catch (error) {
      console.error('Failed to save texture to IndexedDB:', error);
      throw error;
    }
  }

  async getTextures(): Promise<Texture[]> {
    try {
    } catch (error) {
      console.error('Failed to get textures from IndexedDB:', error);
      return [];
    }
  }

  async removeTexture(textureId: string): Promise<void> {
    try {
    } catch (error) {
      console.error('Failed to delete texture from IndexedDB:', error);
      throw error;
    }
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{
    customColorsCount: number;
    originalImagesCount: number;
    updatedImagesCount: number;
    texturesCount: number;
  }> {
    const customColors = await this.getCustomColors();
    const originalImages = await this.getOriginalImages();
    const updatedImages = await this.getUpdatedImages();
    const textures = await this.getTextures();

    return {
      customColorsCount: customColors.length,
      originalImagesCount: originalImages.length,
      updatedImagesCount: updatedImages.length,
      texturesCount: textures.length,
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
