import { useState, useCallback } from 'react';
import { storageService } from '../services/storageService';

interface StorageInfo {
  customColorsCount: number;
  originalImagesCount: number;
  updatedImagesCount: number;
  isIndexedDBSupported: boolean;
}

interface UseStorageReturn {
  storageInfo: StorageInfo | null;
  isLoading: boolean;
  error: string | null;
  refreshStorageInfo: () => Promise<void>;
  clearAllData: () => Promise<boolean>;
}

export const useStorage = (): UseStorageReturn => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStorageInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await storageService.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to get storage info:', err);
      setError('Failed to get storage information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllData = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await storageService.clearAllData();
      await refreshStorageInfo(); // Refresh info after clearing
      return true;
    } catch (err) {
      console.error('Failed to clear storage:', err);
      setError('Failed to clear storage');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStorageInfo]);

  return {
    storageInfo,
    isLoading,
    error,
    refreshStorageInfo,
    clearAllData,
  };
};

export default useStorage;
