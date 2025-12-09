import { useState, useEffect } from 'react';
import { ImageData } from '@/types';
import { imageCache } from '@/utils/imageCache';

interface ConfirmImageUpdateModalProps {
  isOpen: boolean;
  originalImage: ImageData;
  generatedImage: { base64: string; mimeType: string } | null;
  onConfirm: (imageData: { base64: string; mimeType: string }) => void;
  onCancel: () => void;
  colorName: string;
}

const ConfirmImageUpdateModal: React.FC<ConfirmImageUpdateModalProps> = ({
  isOpen,
  originalImage,
  generatedImage,
  onConfirm,
  onCancel,
  colorName, // Removed trailing comma here
}) => {
  // Cached image state for original image
  const [cachedImageSrc, setCachedImageSrc] = useState<string | null>(null);

  // Load cached base64 on mount
  useEffect(() => {
    const loadCachedImage = async () => {
      try {
        const base64 = await imageCache.get(originalImage.imageDownloadUrl);
        if (base64) {
          // Convert base64 to data URL
          setCachedImageSrc(`data:${originalImage.mimeType};base64,${base64}`);
        }
      } catch (error) {
        console.warn('[ImageCard] Failed to load cached image:', error);
      }
    };

    loadCachedImage();
  }, [originalImage.imageDownloadUrl, originalImage.mimeType]);

  if (!isOpen || !generatedImage || !originalImage) return null; // Ensure both images are available

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] p-6 relative flex flex-col">
        {' '}
        {/* Expanded to 90vw and 90vh */}
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Is this new wall color satisfactory?
        </h3>
        <p className="text-gray-600 text-center mb-6">
          The walls have been recolored to <span className="font-semibold">{colorName}</span>.
        </p>
        <div className="flex flex-col lg:flex-row gap-6 mb-6 flex-1 h-0">
          {' '}
          {/* Flex container for images, flex-1 to take remaining space */}
          {/* Original Photo */}
          <div className="flex-1 flex flex-col items-center min-h-0">
            <h4 className="text-xl font-semibold text-gray-700 mb-3">Original Photo</h4>
            <div className="relative w-full flex-1 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={cachedImageSrc || originalImage.imageDownloadUrl}
                alt="Original"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
          {/* Recolor Photo */}
          <div className="flex-1 flex flex-col items-center min-h-0">
            <h4 className="text-xl font-semibold text-gray-700 mb-3">Recolored Photo</h4>
            <div className="relative w-full flex-1 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                alt="Generated Recolor"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
          <button
            onClick={() => onConfirm(generatedImage)}
            className="flex-1 max-w-xs px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Yes, I'm Satisfied!
          </button>
          <button
            onClick={onCancel}
            className="flex-1 max-w-xs px-8 py-4 border border-gray-300 text-lg font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            No, Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmImageUpdateModal;
