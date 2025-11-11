/**
 * Converts a base64 string to a File object.
 *
 * @param base64 The base64-encoded image data (without data URL prefix).
 * @param mimeType The MIME type of the image.
 * @param filename The name for the file.
 * @returns A File object.
 */
function base64ToFile(base64: string, mimeType: string, filename: string): File {
  // Convert base64 to binary string
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  // Create a Blob from the binary data
  const blob = new Blob([bytes], { type: mimeType });
  // Create and return a File object
  return new File([blob], filename, { type: mimeType });
}

import { imageCache } from './imageCache';

/**
 * Fetches an image from a Firebase Storage URL and converts it to base64.
 * Results are cached in-memory and IndexedDB to improve performance on subsequent calls.
 *
 * @param storagePath The Firebase Storage URL.
 * @returns A promise that resolves to the base64-encoded image data (without data URL prefix).
 * @throws Error if the fetch fails or the response is not an image.
 */
async function storagePathToBase64(storagePath: string): Promise<string> {
  // Check cache first (memory + IndexedDB)
  const cached = await imageCache.get(storagePath);
  if (cached) {
    console.log('[storagePathToBase64] Retrieved from cache:', storagePath.substring(0, 50));
    return cached;
  }

  try {
    console.log('[storagePathToBase64] Fetching and converting:', storagePath.substring(0, 50));
    const response = await fetch(storagePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'image/png';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        // Remove 'data:image/...;base64,' prefix if present
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;

        // Store in cache
        await imageCache.set(storagePath, base64, mimeType);
        console.log('[storagePathToBase64] Stored in cache');

        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert blob to base64'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(
      `Error converting storage path to base64: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { base64ToFile, storagePathToBase64 };
