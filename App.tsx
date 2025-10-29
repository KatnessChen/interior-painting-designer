import React, { useState, useCallback, useEffect } from 'react';
import { Storage as StorageIcon, ColorLens as RecolorIcon } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import ColorSelector from './components/ColorSelector';
import Gallery from './components/Gallery';
import ConfirmationModal from './components/ConfirmationModal';
import CustomPromptModal from './components/CustomPromptModal';
import ImageDisplayModal from './components/ImageDisplayModal'; // Import the new modal component
import StorageManager from './components/StorageManager';
import { BenjaminMooreColor, ImageData } from './types';
import { recolorImage } from './services/geminiService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<BenjaminMooreColor | null>(null);
  const [originalImages, setOriginalImages] = useState<ImageData[]>([]);
  const [selectedOriginalImageIds, setSelectedOriginalImageIds] = useState<Set<string>>(new Set());
  const [updatedImages, setUpdatedImages] = useState<ImageData[]>([]);
  const [selectedUpdatedImageIds, setSelectedUpdatedImageIds] = useState<Set<string>>(new Set());
  const [processingImage, setProcessingImage] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // State for ImageDisplayModal
  const [showImageDisplayModal, setShowImageDisplayModal] = useState<boolean>(false);
  const [imageToDisplayInModal, setImageToDisplayInModal] = useState<ImageData | null>(null);

  // State for StorageManager
  const [showStorageManager, setShowStorageManager] = useState<boolean>(false);

  // State for custom prompt modal
  const [showCustomPromptModal, setShowCustomPromptModal] = useState<boolean>(false);

  // Initialize storage and load persisted data on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize storage service
        await storageService.init();

        // Load persisted images
        const [originalImagesData, updatedImagesData] = await Promise.all([
          storageService.getOriginalImages(),
          storageService.getUpdatedImages(),
        ]);

        setOriginalImages(originalImagesData);
        setUpdatedImages(updatedImagesData);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setErrorMessage('Failed to load saved data. Some features may not work properly.');
      } finally {
        setIsLoadingData(false);
      }
    };

    initializeApp();
  }, []);

  const handleImageUpload = useCallback(async (imageData: ImageData) => {
    try {
      // Save to storage
      await storageService.addOriginalImage(imageData);

      // Update local state
      setOriginalImages((prev) => [...prev, imageData]);
      setErrorMessage(null); // Clear error on successful upload
    } catch (error) {
      console.error('Failed to save uploaded image:', error);
      setErrorMessage('Failed to save uploaded image. It may not be available after page refresh.');

      // Still add to local state for current session
      setOriginalImages((prev) => [...prev, imageData]);
    }
  }, []);

  const handleDownload = useCallback((imageData: ImageData) => {
    const link = document.createElement('a');
    link.href = `data:${imageData.mimeType};base64,${imageData.base64}`;
    const mimeTypeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const extension = mimeTypeMap[imageData.mimeType] || '.jpg';
    link.download = `recolored_${imageData.name}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleRemoveUpdatedImage = useCallback(async (imageId: string) => {
    try {
      // Remove from storage
      await storageService.removeUpdatedImage(imageId);

      // Update local state
      setUpdatedImages((prev) => prev.filter((image) => image.id !== imageId));
    } catch (error) {
      console.error('Failed to remove image from storage:', error);

      // Still remove from local state
      setUpdatedImages((prev) => prev.filter((image) => image.id !== imageId));
    }
  }, []);

  const handleRemoveOriginalImage = useCallback(
    async (imageId: string) => {
      try {
        // Remove from storage
        await storageService.removeOriginalImage(imageId);

        // Update local state
        setOriginalImages((prev) => prev.filter((image) => image.id !== imageId));

        // Clear selection if the removed image was selected
        if (selectedOriginalImageIds.has(imageId)) {
          setSelectedOriginalImageIds(new Set());
        }
      } catch (error) {
        console.error('Failed to remove original image from storage:', error);

        // Still remove from local state
        setOriginalImages((prev) => prev.filter((image) => image.id !== imageId));
        if (selectedOriginalImageIds.has(imageId)) {
          setSelectedOriginalImageIds(new Set());
        }
      }
    },
    [selectedOriginalImageIds]
  );

  const handleRenameOriginalImage = useCallback(async (imageId: string, newName: string) => {
    // Optimistically update UI
    setOriginalImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, name: newName } : img))
    );

    try {
      await storageService.renameOriginalImage(imageId, newName);
    } catch (error) {
      console.error('Failed to persist renamed image:', error);
      setErrorMessage('Failed to save renamed image. Changes may not persist.');
      // Keep optimistic UI change for the session
    }
  }, []);

  const handleRenameUpdatedImage = useCallback(async (imageId: string, newName: string) => {
    // Optimistically update UI
    setUpdatedImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, name: newName } : img))
    );

    try {
      await storageService.renameUpdatedImage(imageId, newName);
    } catch (error) {
      console.error('Failed to persist renamed image:', error);
      setErrorMessage('Failed to save renamed image. Changes may not persist.');
      // Keep optimistic UI change for the session
    }
  }, []);

  // Generic handler to open the ImageDisplayModal for any image
  const handleViewImage = useCallback((imageData: ImageData) => {
    setImageToDisplayInModal(imageData);
    setShowImageDisplayModal(true);
  }, []);

  // Handler to close the ImageDisplayModal
  const handleCloseImageDisplayModal = useCallback(() => {
    setShowImageDisplayModal(false);
    setImageToDisplayInModal(null);
  }, []);

  const handleRecolor = useCallback(
    async (customPrompt: string | undefined) => {
      if (!selectedColor) {
        setErrorMessage('Please select a color first.');
        return;
      }

      // Get the first (and only) selected image for recolor
      const selectedImageId = Array.from(selectedOriginalImageIds)[0];
      const selectedImage = originalImages.find((img) => img.id === selectedImageId);
      if (!selectedImage) {
        setErrorMessage('Please select an original photo to recolor.');
        return;
      }

      setProcessingImage(true);
      setErrorMessage(null);
      setShowCustomPromptModal(false);

      try {
        const recolored = await recolorImage(
          selectedImage,
          selectedColor.name,
          selectedColor.hex,
          customPrompt
        );
        setGeneratedImage(recolored);
        setShowConfirmationModal(true);
      } catch (error: any) {
        console.error('Recolor failed:', error);
        let msg = error instanceof Error ? error.message : String(error);
        let displayMessage = `Recolor failed: ${msg}.`;

        let apiError: any = null;
        try {
          const jsonStringMatch = msg.match(/\{"error":\{.*\}\}/);
          if (jsonStringMatch) {
            apiError = JSON.parse(jsonStringMatch[0]);
          }
        } catch (e) {
          console.warn('Failed to parse error message as JSON:', e);
        }

        if (apiError?.error?.status === 'RESOURCE_EXHAUSTED' || apiError?.error?.code === 429) {
          const rateLimitDocsLink =
            apiError?.error?.details?.[1]?.links?.[0]?.url ||
            'https://ai.google.dev/gemini-api/docs/rate-limits';
          const usageLink = 'https://ai.dev/usage?tab=rate-limit';
          displayMessage = `Recolor failed due to quota limits. You've exceeded your current usage limit for the Gemini API. Please check your plan and billing details. For more information, visit: ${rateLimitDocsLink} or monitor your usage at: ${usageLink}`;
        } else if (msg.includes('Requested entity was not found.')) {
          displayMessage = `Recolor failed: ${msg}. This might indicate an invalid API key or an issue with model availability. Please try again.`;
        } else {
          displayMessage = `Recolor failed: ${msg}. If this error persists, try again or contact support.`;
        }

        setErrorMessage(displayMessage);
      } finally {
        setProcessingImage(false);
      }
    },
    [selectedOriginalImageIds, originalImages, selectedColor]
  );

  const handleOpenCustomPromptModal = useCallback(async () => {
    if (!selectedColor) {
      setErrorMessage('Please select a color first.');
      return;
    }

    // Get the first (and only) selected image for recolor
    const selectedImageId = Array.from(selectedOriginalImageIds)[0];
    const selectedImage = originalImages.find((img) => img.id === selectedImageId);
    if (!selectedImage) {
      setErrorMessage('Please select an original photo to recolor.');
      return;
    }

    // Show custom prompt modal
    setShowCustomPromptModal(true);
  }, [selectedColor, originalImages, selectedOriginalImageIds]);

  const handleConfirmRecolor = useCallback(
    async (image: ImageData) => {
      try {
        // Append color name to the image name
        const imageWithColorName: ImageData = {
          ...image,
          name: selectedColor ? `${image.name} (${selectedColor.name})` : image.name,
        };

        // Save to storage
        await storageService.addUpdatedImage(imageWithColorName);

        // Update local state
        setUpdatedImages((prev) => [...prev, imageWithColorName]);
        setShowConfirmationModal(false);
        setGeneratedImage(null);
      } catch (error) {
        console.error('Failed to save recolored image:', error);
        setErrorMessage(
          'Failed to save recolored image. It may not be available after page refresh.'
        );

        // Still add to local state for current session
        setUpdatedImages((prev) => [
          ...prev,
          {
            ...image,
            name: selectedColor ? `${image.name} (${selectedColor.name})` : image.name,
          },
        ]);
        setShowConfirmationModal(false);
        setGeneratedImage(null);
      }
    },
    [selectedColor]
  );

  const handleCancelRecolor = useCallback(() => {
    setShowConfirmationModal(false);
    setGeneratedImage(null);
  }, []);

  // Multi-select handlers for original photos
  const handleSelectOriginalImage = useCallback((imageId: string) => {
    // Single-select mode: toggle selection, max 1 image
    setSelectedOriginalImageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        // Clear and add only this one
        newSet.clear();
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const handleSelectMultipleOriginal = useCallback((imageId: string) => {
    setSelectedOriginalImageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDeleteOriginal = useCallback(async () => {
    if (selectedOriginalImageIds.size === 0) return;

    try {
      // Delete from storage
      const deletePromises = Array.from(selectedOriginalImageIds).map((id: string) =>
        storageService.removeOriginalImage(id)
      );
      await Promise.all(deletePromises);

      // Update local state
      setOriginalImages((prev) => prev.filter((img) => !selectedOriginalImageIds.has(img.id)));
      setSelectedOriginalImageIds(new Set());
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to delete images from storage:', error);
      setErrorMessage('Failed to delete images. They may still exist.');
      // Still try to remove from local state
      setOriginalImages((prev) => prev.filter((img) => !selectedOriginalImageIds.has(img.id)));
      setSelectedOriginalImageIds(new Set());
    }
  }, [selectedOriginalImageIds]);

  const handleClearOriginalSelection = useCallback(() => {
    setSelectedOriginalImageIds(new Set());
  }, []);

  // Multi-select handlers for updated photos
  const handleSelectUpdatedImage = useCallback((imageId: string) => {
    setSelectedUpdatedImageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDeleteUpdated = useCallback(async () => {
    if (selectedUpdatedImageIds.size === 0) return;

    try {
      // Delete from storage
      const deletePromises = Array.from(selectedUpdatedImageIds).map((id: string) =>
        storageService.removeUpdatedImage(id)
      );
      await Promise.all(deletePromises);

      // Update local state
      setUpdatedImages((prev) => prev.filter((img) => !selectedUpdatedImageIds.has(img.id)));
      setSelectedUpdatedImageIds(new Set());
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to delete images from storage:', error);
      setErrorMessage('Failed to delete images. They may still exist.');
      // Still try to remove from local state
      setUpdatedImages((prev) => prev.filter((img) => !selectedUpdatedImageIds.has(img.id)));
      setSelectedUpdatedImageIds(new Set());
    }
  }, [selectedUpdatedImageIds]);

  const handleBulkDownloadUpdated = useCallback(() => {
    if (selectedUpdatedImageIds.size === 0) return;

    // Map mimeType to extension
    const mimeTypeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    // Download each selected image
    updatedImages.forEach((img) => {
      if (selectedUpdatedImageIds.has(img.id)) {
        const link = document.createElement('a');
        link.href = `data:${img.mimeType};base64,${img.base64}`;
        const extension = mimeTypeMap[img.mimeType] || '.jpg';
        link.download = `${img.name}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }, [selectedUpdatedImageIds, updatedImages]);

  const handleBulkMoveToOriginal = useCallback(async () => {
    if (selectedUpdatedImageIds.size === 0) return;

    try {
      const imagesToMove = updatedImages.filter((img) => selectedUpdatedImageIds.has(img.id));

      // Add to original images storage
      const addPromises = imagesToMove.map((img) => storageService.addOriginalImage(img));
      await Promise.all(addPromises);

      // Update local state - add to original and remove from updated
      setOriginalImages((prev) => [...prev, ...imagesToMove]);
      setUpdatedImages((prev) => prev.filter((img) => !selectedUpdatedImageIds.has(img.id)));
      setSelectedUpdatedImageIds(new Set());
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to move images to original:', error);
      setErrorMessage('Failed to move images. Please try again.');
    }
  }, [selectedUpdatedImageIds, updatedImages]);

  const handleClearUpdatedSelection = useCallback(() => {
    setSelectedUpdatedImageIds(new Set());
  }, []);

  const selectedOriginalImageId = Array.from(selectedOriginalImageIds)[0] || null;
  const selectedOriginalImage = originalImages.find((img) => img.id === selectedOriginalImageId);
  const isRecolorButtonEnabled =
    selectedColor && selectedOriginalImageIds.size === 1 && !processingImage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-10 mt-4">
          <h1 className="text-4xl font-extrabold text-gray-900 drop-shadow-sm flex-grow text-center">
            AI Interior Designer
          </h1>
          <button
            onClick={() => setShowStorageManager(true)}
            className="ml-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            title="Manage Storage"
          >
            <StorageIcon sx={{ fontSize: 24, color: 'inherit' }} />
          </button>
        </div>

        {isLoadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading your saved data...</span>
          </div>
        )}

        {!isLoadingData && errorMessage && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm"
            role="alert"
          >
            <p className="font-bold">Error!</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {!isLoadingData && (
          <>
            <div className="mb-8">
              <ColorSelector selectedColor={selectedColor} onSelectColor={setSelectedColor} />
            </div>

            <div className="mb-8">
              <Gallery
                title="2. Original Photos (Select one to recolor, or multiple to delete)"
                images={originalImages}
                selectedImageIds={selectedOriginalImageIds}
                onSelectImage={handleSelectOriginalImage}
                onSelectMultiple={handleSelectMultipleOriginal}
                onRemoveImage={handleRemoveOriginalImage}
                onRenameImage={handleRenameOriginalImage}
                showRemoveButtons={selectedOriginalImageIds.size === 0}
                emptyMessage="No photos uploaded yet."
                onViewImage={handleViewImage}
                onUploadImage={handleImageUpload}
                showUploadCard={true}
                onUploadError={setErrorMessage}
                enableMultiSelect={true}
                onBulkDelete={handleBulkDeleteOriginal}
                onClearSelection={handleClearOriginalSelection}
                hideDownloadAndMove={true}
              />
            </div>

            <div className="sticky bottom-4 w-full flex justify-center z-40 p-2">
              {/* Container with group for hover effects */}
              <div className="group relative">
                {/* Main "Recolor Walls" button */}
                <button
                  onClick={handleRecolor}
                  disabled={!isRecolorButtonEnabled}
                  className={`px-8 py-4 text-xl font-semibold rounded-full shadow-lg transition-all duration-300
                              flex items-center justify-center space-x-2
                              ${
                                isRecolorButtonEnabled
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-blue-300'
                                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              }`}
                >
                  {processingImage ? (
                    <>
                      <CircularProgress
                        size={24}
                        sx={{ color: 'white', marginRight: 1, marginLeft: -0.5 }}
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RecolorIcon sx={{ fontSize: 28, marginRight: 0.5 }} />
                      Recolor Walls
                    </>
                  )}
                </button>
                {/* Overlay "With Custom Prompt" button - appears on hover */}
                {isRecolorButtonEnabled && !processingImage && (
                  <button
                    onClick={handleOpenCustomPromptModal}
                    className="absolute h-12 left-1/2 -bottom-16 -translate-x-1/2 -translate-y-1/2 px-8 py-2 text-sm font-semibold rounded-full
                             bg-gradient-to-r from-amber-500 to-orange-600 text-white
                             shadow-lg transition-all duration-300
                             opacity-0 group-hover:opacity-100
                             pointer-events-none group-hover:pointer-events-auto
                             hover:from-amber-600 hover:to-orange-700
                             focus:outline-none focus:ring-4 focus:ring-amber-300
                             whitespace-nowrap"
                  >
                    With Custom Prompt
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Gallery
                title="3. Updated Photos (Download your favorites)"
                images={updatedImages}
                selectedImageIds={selectedUpdatedImageIds}
                onSelectMultiple={handleSelectUpdatedImage}
                onDownloadImage={handleDownload}
                onRemoveImage={handleRemoveUpdatedImage}
                onRenameImage={handleRenameUpdatedImage}
                emptyMessage="Satisfied recolored photos will appear here."
                onViewImage={handleViewImage}
                enableMultiSelect={true}
                onBulkDelete={handleBulkDeleteUpdated}
                onBulkDownload={handleBulkDownloadUpdated}
                onBulkMove={handleBulkMoveToOriginal}
                onClearSelection={handleClearUpdatedSelection}
              />
            </div>
          </>
        )}

        <ConfirmationModal
          isOpen={showConfirmationModal}
          originalImage={selectedOriginalImage}
          image={generatedImage}
          onConfirm={handleConfirmRecolor}
          onCancel={handleCancelRecolor}
          colorName={selectedColor?.name || 'N/A'}
        />

        {/* Custom Prompt Modal */}
        <CustomPromptModal
          isOpen={showCustomPromptModal}
          onConfirm={(customPrompt: string) => handleRecolor(customPrompt)}
          onCancel={() => setShowCustomPromptModal(false)}
          colorName={selectedColor?.name || 'N/A'}
        />

        {/* New Image Display Modal */}
        <ImageDisplayModal
          isOpen={showImageDisplayModal}
          image={imageToDisplayInModal}
          onClose={handleCloseImageDisplayModal}
        />

        {/* Storage Manager Modal */}
        <StorageManager isOpen={showStorageManager} onClose={() => setShowStorageManager(false)} />
      </div>
    </div>
  );
};

export default App;
