/**
 * MIME type to file extension mapping
 */
const MIME_TYPE_MAP: { [key: string]: string } = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/**
 * Downloads a file from a URL with the specified filename
 *
 * @param url The URL to download from
 * @param filename The name to save the file as
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Gets the file extension for a given MIME type
 *
 * @param mimeType The MIME type of the file
 * @returns The file extension (e.g., '.jpg')
 */
export function getFileExtension(mimeType: string): string {
  return MIME_TYPE_MAP[mimeType] || '.jpg';
}

/**
 * Builds the filename with extension for download
 *
 * @param name The base filename (without extension)
 * @param mimeType The MIME type of the file
 * @returns The complete filename with extension
 */
export function buildDownloadFilename(name: string, mimeType: string): string {
  const extension = getFileExtension(mimeType);
  return `${name}${extension}`;
}
