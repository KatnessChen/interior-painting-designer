import { useState, useEffect, useMemo } from 'react';
import { ImageData } from '@/types';
import { imageCache } from '@/utils/imageCache';

import { getFileExtension } from '@/utils/downloadUtils';
import { Button } from '@mui/material';
import { removeExtension, generateTimestamp } from '@/utils/fileNameUtils';

const MAX_IMAGE_NAME_LENGTH = 50;

interface ConfirmImageUpdateModalProps {
  isOpen: boolean;
  originalImage: ImageData;
  generatedImage: { base64: string; mimeType: string } | null;
  onConfirm: (imageData: { base64: string; mimeType: string }, customName: string) => void;
  onCancel: () => void;
  colorName: string;
}

const ConfirmImageUpdateModal: React.FC<ConfirmImageUpdateModalProps> = ({
  isOpen,
  originalImage,
  generatedImage,
  onConfirm,
  onCancel,
  colorName,
}) => {
  // Cached image state for original image
  const [cachedImageSrc, setCachedImageSrc] = useState<string | null>(null);

  // Image naming states
  const [baseName, setBaseName] = useState<string>('');
  const [prefixTimestamp, setPrefixTimestamp] = useState<boolean>(false);
  const [suffixMimeType, setSuffixMimeType] = useState<boolean>(false);
  const [suffixColorName, setSuffixColorName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>('');

  // Initialize base name (remove extension from original image name)
  useEffect(() => {
    setBaseName(removeExtension(originalImage.name));
  }, [originalImage.name]);

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

  // Generate final name based on checkbox options
  const finalName = useMemo(() => {
    let name = baseName.trim();

    // Prefix timestamp
    if (prefixTimestamp) {
      const timestamp = generateTimestamp();
      name = `${timestamp}_${name}`;
    }

    // Suffix color name
    if (suffixColorName) {
      name = `${name}_${colorName}`;
    }

    // Suffix mime type extension
    if (suffixMimeType && generatedImage) {
      const extension = getFileExtension(generatedImage.mimeType);
      name = `${name}${extension}`;
    }

    return name;
  }, [baseName, prefixTimestamp, suffixMimeType, suffixColorName, colorName, generatedImage]);

  // Validate name and update error
  useEffect(() => {
    const trimmedBase = baseName.trim();

    if (trimmedBase === '') {
      setNameError('Image name cannot be empty');
    } else if (finalName.length > MAX_IMAGE_NAME_LENGTH) {
      setNameError(
        `Name is too long (${finalName.length}/${MAX_IMAGE_NAME_LENGTH} characters). Please shorten the base name.`
      );
    } else {
      setNameError('');
    }
  }, [baseName, finalName]);

  // Handle confirm
  const handleConfirm = () => {
    if (nameError || !generatedImage) return;
    onConfirm(generatedImage, finalName);
  };

  if (!isOpen || !generatedImage || !originalImage) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] p-6 relative flex flex-col overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Is this new wall color satisfactory?
        </h3>
        <p className="text-gray-600 text-center mb-6">
          The walls have been recolored to <span className="font-semibold">{colorName}</span>.
        </p>

        {/* Image Comparison Section */}
        <div className="flex flex-col md:flex-row gap-6 mb-6 flex-1 h-0 min-h-[400px]">
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
          {/* Recolored Photo */}
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

        {/* Image Naming Section */}
        <div className="border-t border-gray-200 pt-4 pb-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">Customize Image Name</h4>

          {/* Base Name Input */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Name</label>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              maxLength={MAX_IMAGE_NAME_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter image name"
            />
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>

          {/* Checkbox Options */}
          <div className="mb-3 flex flex-col sm:flex-row sm:flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={prefixTimestamp}
                onChange={(e) => setPrefixTimestamp(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Prefix with timestamp</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={suffixMimeType}
                onChange={(e) => setSuffixMimeType(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Suffix with file extension</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={suffixColorName}
                onChange={(e) => setSuffixColorName(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Suffix with color name</span>
            </label>
          </div>

          {/* Final Name Preview */}
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Final Name Preview:</span>
              <span
                className={`text-sm ${
                  finalName.length > MAX_IMAGE_NAME_LENGTH
                    ? 'text-red-600 font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {finalName.length} / {MAX_IMAGE_NAME_LENGTH} characters
              </span>
            </div>
            <p
              className={`text-sm font-mono break-all ${
                nameError ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {finalName || '(empty)'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-4">
          <Button
            onClick={handleConfirm}
            disabled={!!nameError}
            variant="contained"
            color="success"
          >
            Yes, I'm Satisfied!
          </Button>
          {/* MUI Button for Cancel */}
          <Button onClick={onCancel} variant="outlined" color="inherit" size="large">
            No, Discard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmImageUpdateModal;
