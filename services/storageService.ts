import { BenjaminMooreColor, ImageData } from '../types';

// Constants for storage keys
const STORAGE_KEYS = {
  CUSTOM_COLORS: 'interior_designer_custom_colors',
  USER_PHOTOS: 'interior_designer_user_photos',
  UPDATED_PHOTOS: 'interior_designer_updated_photos',
} as const;

// IndexedDB configuration
const DB_NAME = 'InteriorDesignerDB';
const DB_VERSION = 1;
const STORES = {
  IMAGES: 'images',
  COLORS: 'colors',
} as const;

// IndexedDB wrapper class
class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create images store (only need image store)
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          const imageStore = db.createObjectStore(STORES.IMAGES, {
            keyPath: 'id',
          });
          imageStore.createIndex('type', 'type', { unique: false });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
          imageStore.createIndex('size', 'size', { unique: false }); // Track file size
        }
      };
    });
  }

  async saveImage(imageData: ImageData, type: 'original' | 'updated'): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.IMAGES], 'readwrite');
      const store = transaction.objectStore(STORES.IMAGES);

      // Convert base64 to Blob for more efficient storage
      const binaryString = atob(imageData.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: imageData.mimeType });

      const dataToStore = {
        id: imageData.id,
        name: imageData.name,
        mimeType: imageData.mimeType,
        blob: blob, // Store as Blob instead of base64 string
        type,
        timestamp: Date.now(),
        size: blob.size, // Track file size
      };

      const request = store.put(dataToStore);

      request.onerror = () => {
        console.error('Failed to save image to IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => resolve();
    });
  }

  async getImages(type?: 'original' | 'updated'): Promise<ImageData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.IMAGES], 'readonly');
      const store = transaction.objectStore(STORES.IMAGES);

      let request: IDBRequest;

      if (type) {
        const index = store.index('type');
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }

      request.onerror = () => {
        console.error('Failed to get images from IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = async () => {
        const results = await Promise.all(
          request.result.map(async (item: any) => {
            // Convert Blob back to base64 for compatibility with existing components
            let base64 = '';
            if (item.blob) {
              const arrayBuffer = await item.blob.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              const binaryString = bytes.reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              );
              base64 = btoa(binaryString);
            } else if (item.base64) {
              // Fallback for old data stored as base64
              base64 = item.base64;
            }

            return {
              id: item.id,
              name: item.name,
              base64: base64,
              mimeType: item.mimeType,
            };
          })
        );
        resolve(results);
      };
    });
  }

  async updateImageName(imageId: string, newName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.IMAGES], 'readwrite');
      const store = transaction.objectStore(STORES.IMAGES);
      const getRequest = store.get(imageId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (!entry) {
          reject(new Error('Image not found in IndexedDB'));
          return;
        }
        entry.name = newName;
        const putReq = store.put(entry);
        putReq.onerror = () => reject(putReq.error);
        putReq.onsuccess = () => resolve();
      };
    });
  }

  async deleteImage(imageId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.IMAGES], 'readwrite');
      const store = transaction.objectStore(STORES.IMAGES);

      const request = store.delete(imageId);

      request.onerror = () => {
        console.error('Failed to delete image from IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => resolve();
    });
  }
}

// Storage Service class
class StorageService {
  private indexedDB: IndexedDBManager;
  private isIndexedDBSupported: boolean;

  constructor() {
    this.indexedDB = new IndexedDBManager();
    this.isIndexedDBSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  // Initialize the storage service
  async init(): Promise<void> {
    if (this.isIndexedDBSupported) {
      try {
        await this.indexedDB.init();
      } catch (error) {
        console.warn('IndexedDB initialization failed, falling back to localStorage only:', error);
        this.isIndexedDBSupported = false;
      }
    }
  }

  // Custom Colors Management
  async saveCustomColors(colors: BenjaminMooreColor[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COLORS, JSON.stringify(colors));
    } catch (error) {
      console.error('Failed to save custom colors to localStorage:', error);
      throw new Error('Failed to save custom colors');
    }
  }

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

  // Original Images Management
  async saveOriginalImages(images: ImageData[]): Promise<void> {
    if (!this.isIndexedDBSupported) {
      throw new Error('IndexedDB not supported - cannot save images');
    }

    try {
      await Promise.all(images.map((img) => this.indexedDB.saveImage(img, 'original')));
    } catch (error) {
      console.error('Failed to save images to IndexedDB:', error);
      throw error;
    }
  }

  async getOriginalImages(): Promise<ImageData[]> {
    if (!this.isIndexedDBSupported) {
      return [];
    }

    try {
      return await this.indexedDB.getImages('original');
    } catch (error) {
      console.error('Failed to get images from IndexedDB:', error);
      return [];
    }
  }

  async addOriginalImage(image: ImageData): Promise<void> {
    if (!this.isIndexedDBSupported) {
      throw new Error('IndexedDB not supported - cannot save images');
    }

    try {
      await this.indexedDB.saveImage(image, 'original');
    } catch (error) {
      console.error('Failed to save image to IndexedDB:', error);
      throw error;
    }
  }

  async removeOriginalImage(imageId: string): Promise<void> {
    if (!this.isIndexedDBSupported) {
      return;
    }

    try {
      await this.indexedDB.deleteImage(imageId);
    } catch (error) {
      console.error('Failed to delete image from IndexedDB:', error);
      throw error;
    }
  }

  // Rename original image metadata (keeps blob intact)
  async renameOriginalImage(imageId: string, newName: string): Promise<void> {
    if (!this.isIndexedDBSupported) {
      // nothing to do if no IndexedDB; original images are not persisted
      return;
    }

    try {
      await this.indexedDB.updateImageName(imageId, newName);
    } catch (error) {
      console.error('Failed to rename image in IndexedDB:', error);
      throw error;
    }
  }

  // Rename updated image metadata (keeps blob intact)
  async renameUpdatedImage(imageId: string, newName: string): Promise<void> {
    if (!this.isIndexedDBSupported) {
      // nothing to do if no IndexedDB; updated images are not persisted
      return;
    }

    try {
      await this.indexedDB.updateImageName(imageId, newName);
    } catch (error) {
      console.error('Failed to rename updated image in IndexedDB:', error);
      throw error;
    }
  }

  // Updated Images Management
  async saveUpdatedImages(images: ImageData[]): Promise<void> {
    if (!this.isIndexedDBSupported) {
      throw new Error('IndexedDB not supported - cannot save images');
    }

    try {
      await Promise.all(images.map((img) => this.indexedDB.saveImage(img, 'updated')));
    } catch (error) {
      console.error('Failed to save updated images to IndexedDB:', error);
      throw error;
    }
  }

  async getUpdatedImages(): Promise<ImageData[]> {
    if (!this.isIndexedDBSupported) {
      return [];
    }

    try {
      return await this.indexedDB.getImages('updated');
    } catch (error) {
      console.error('Failed to get updated images from IndexedDB:', error);
      return [];
    }
  }

  async addUpdatedImage(image: ImageData): Promise<void> {
    if (!this.isIndexedDBSupported) {
      throw new Error('IndexedDB not supported - cannot save images');
    }

    try {
      await this.indexedDB.saveImage(image, 'updated');
    } catch (error) {
      console.error('Failed to save updated image to IndexedDB:', error);
      throw error;
    }
  }

  async removeUpdatedImage(imageId: string): Promise<void> {
    if (!this.isIndexedDBSupported) {
      return;
    }

    try {
      await this.indexedDB.deleteImage(imageId);
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

    // Clear IndexedDB (clear all image data)
    if (this.isIndexedDBSupported) {
      try {
        // Delete and recreate the database for a clean slate
        if (this.indexedDB['db']) {
          this.indexedDB['db'].close();
        }

        await new Promise<void>((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onsuccess = () => resolve();
        });

        // Reinitialize
        await this.indexedDB.init();
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
    }
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{
    customColorsCount: number;
    originalImagesCount: number;
    updatedImagesCount: number;
    isIndexedDBSupported: boolean;
  }> {
    const customColors = await this.getCustomColors();
    const originalImages = await this.getOriginalImages();
    const updatedImages = await this.getUpdatedImages();

    return {
      customColorsCount: customColors.length,
      originalImagesCount: originalImages.length,
      updatedImagesCount: updatedImages.length,
      isIndexedDBSupported: this.isIndexedDBSupported,
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
