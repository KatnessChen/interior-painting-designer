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

export { base64ToFile };
