import React, { useEffect, useState, useCallback } from 'react';
import ColorSelector from '../components/ColorSelector';
import ConfirmationModal from '../components/ConfirmationModal';
import CustomPromptModal from '../components/CustomPromptModal';
import Gallery from '../components/Gallery';
import ProcessButton from '../components/ProcessButton';
import TaskSelector from '../components/TaskSelector';
import TextureSelector from '../components/TextureSelector';
import ImagesComparingModal from '../components/ImagesComparingModal';
import ImagesComparingButton from '../components/ImagesComparingButton';
import AlertModal from '../components/AlertModal';
import { GEMINI_TASKS, GeminiTaskName, GeminiTask } from '../services/gemini/geminiTasks';
import { BenjaminMooreColor, ImageData } from '../types';
import { createImage, fetchUserImages } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useImageProcessing } from '../hooks/useImageProcessing';

interface Texture {
  name: string;
  description?: string;
}

const LandingPage: React.FC = () => {
  // Get authenticated user
  const { user } = useAuth();

  // Task selection
  const [selectedTaskName, setSelectedTaskName] = useState<GeminiTaskName>(
    GEMINI_TASKS.RECOLOR_WALL.task_name
  );

  // Recolor task state
  const [selectedColor, setSelectedColor] = useState<BenjaminMooreColor | null>(null);

  // Add texture task state
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);

  const [originalImages, setOriginalImages] = useState<ImageData[]>([]);
  const [selectedOriginalImageIds, setSelectedOriginalImageIds] = useState<Set<string>>(new Set());

  const [generatedImage, setGeneratedImage] = useState<ImageData | null>(null);

  const [updatedImages, setUpdatedImages] = useState<ImageData[]>([]);
  const [selectedUpdatedImageIds, setSelectedUpdatedImageIds] = useState<Set<string>>(new Set());

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(true);

  // State for custom prompt modal
  const [showCustomPromptModal, setShowCustomPromptModal] = useState<boolean>(false);

  // State for compare photos modal
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  // State for alert modal
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info' | 'warning'>('error');
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');

  // Helper function to show alert
  const showAlertModal = useCallback(
    (type: 'error' | 'success' | 'info' | 'warning', title: string, message: string) => {
      setAlertType(type);
      setAlertTitle(title);
      setAlertMessage(message);
      setShowAlert(true);
    },
    []
  );

  // Use image processing hook
  const { processImage, processingImage, errorMessage, setErrorMessage } = useImageProcessing({
    userId: user?.uid,
    selectedTaskName,
    selectedColor,
    selectedTexture,
  });

  // Show alert when errorMessage changes
  useEffect(() => {
    if (errorMessage) {
      showAlertModal('error', 'Error', errorMessage);
    }
  }, [errorMessage, showAlertModal]);

  // Load images from storage on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoadingData(true);

        if (!user) {
          // User not authenticated, start with empty arrays
          setOriginalImages([]);
          setUpdatedImages([]);
        } else {
          // Fetch user's images from Firestore
          const images = await fetchUserImages(user.uid);

          // Separate images into original and updated based on parentImageId
          const originalImgs = images.filter((img) => !img.parentImageId);
          const updatedImgs = images.filter((img) => img.parentImageId);

          setOriginalImages(originalImgs);
          setUpdatedImages(updatedImgs);
          console.log(
            `Loaded ${originalImgs.length} original and ${updatedImgs.length} updated images`
          );
        }
      } catch (error) {
        console.error('Failed to load images from storage:', error);
        setErrorMessage('Failed to load saved images. Starting fresh.');
        setOriginalImages([]);
        setUpdatedImages([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadImages();
  }, [user]);

  const handleSelectTask = useCallback((task: GeminiTask) => {
    setSelectedTaskName(task);

    // Reset UI state when switching tasks
    setSelectedColor(null);
    setSelectedTexture(null);
    setSelectedOriginalImageIds(new Set());
    setSelectedUpdatedImageIds(new Set());
    setGeneratedImage(null);
    setShowConfirmationModal(false);
    setErrorMessage(null);
  }, []);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!user) {
        // TODO: redirect user to login steps instead of error
        setErrorMessage('Please log in to upload images.');
        return;
      }

      try {
        // Call firestoreService.createImage() to upload the file to Firebase Storage
        // and create the image document in Firestore
        const imageData = await createImage(user.uid, file, {
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
        });

        // Update local state
        setOriginalImages((prev) => [...prev, imageData]);
        setErrorMessage(null); // Clear error on successful upload
      } catch (error) {
        console.error('Failed to upload image:', error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to upload image to Firebase.'
        );
      }
    },
    [user]
  );

  const handleDownload = useCallback((imageData: ImageData) => {
    const link = document.createElement('a');
    link.href = imageData.storageUrl; // Use storageUrl from Firebase Storage
    const mimeTypeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const extension = mimeTypeMap[imageData.mimeType] || '.jpg';
    link.download = `${imageData.name}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleRemoveUpdatedImage = useCallback(async (imageId: string) => {
    try {
      // TODO: Delete image from Firestore
      // Update local state
      setUpdatedImages((prev) => prev.filter((image) => image.id !== imageId));
    } catch (error) {
      console.error('Failed to remove image:', error);
      setErrorMessage('Failed to remove image.');
    }
  }, []);

  const handleRemoveOriginalImage = useCallback(
    async (imageId: string) => {
      try {
        // TODO: Delete image from Firestore
        // Update local state
        setOriginalImages((prev) => prev.filter((image) => image.id !== imageId));

        // Clear selection if the removed image was selected
        if (selectedOriginalImageIds.has(imageId)) {
          setSelectedOriginalImageIds(new Set());
        }
      } catch (error) {
        console.error('Failed to remove image:', error);
        setErrorMessage('Failed to remove image.');
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
      // TODO: Update image name in Firestore
    } catch (error) {
      console.error('Failed to rename image:', error);
      setErrorMessage('Failed to save renamed image. Changes may not persist.');
    }
  }, []);

  const handleRenameUpdatedImage = useCallback(async (imageId: string, newName: string) => {
    // Optimistically update UI
    setUpdatedImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, name: newName } : img))
    );

    try {
      // TODO: Update image name in Firestore
    } catch (error) {
      console.error('Failed to rename image:', error);
      setErrorMessage('Failed to save renamed image. Changes may not persist.');
    }
  }, []);

  const handleProcessImage = useCallback(
    async (customPrompt: string | undefined) => {
      // Get the first (and only) selected image
      const selectedImageId = Array.from(selectedOriginalImageIds)[0];
      const selectedImage = originalImages.find((img) => img.id === selectedImageId);
      if (!selectedImage) {
        setErrorMessage('Please select an original photo.');
        return;
      }

      setShowCustomPromptModal(false);

      const generatedImage = await processImage(selectedImage, customPrompt);

      if (generatedImage) {
        setGeneratedImage(generatedImage);
        setShowConfirmationModal(true);
      }
    },
    [selectedOriginalImageIds, originalImages, processImage]
  );

  const handleOpenCustomPromptModal = useCallback(async () => {
    // Get the first (and only) selected image
    const selectedImageId = Array.from(selectedOriginalImageIds)[0];
    const selectedImage = originalImages.find((img) => img.id === selectedImageId);
    if (!selectedImage) {
      setErrorMessage('Please select an original photo.');
      return;
    }

    if (selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      if (!selectedColor) {
        setErrorMessage('Please select a color first.');
        return;
      }
    } else if (selectedTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      if (!selectedTexture) {
        setErrorMessage('Please select a texture first.');
        return;
      }
    }

    // Show custom prompt modal
    setShowCustomPromptModal(true);
  }, [selectedColor, selectedTexture, originalImages, selectedOriginalImageIds, selectedTaskName]);

  const handleConfirmPrompt = useCallback(
    async (image: ImageData) => {
      try {
        // TODO: Save processed image to Firestore
        // Append descriptor to the image name based on task
        let imageName = image.name;
        if (selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && selectedColor) {
          imageName = `${image.name} (${selectedColor.name})`;
        } else if (selectedTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && selectedTexture) {
          imageName = `${image.name} (${selectedTexture.name})`;
        }

        const imageWithDescriptor: ImageData = {
          ...image,
          name: imageName,
        };

        // Update local state
        setUpdatedImages((prev) => [...prev, imageWithDescriptor]);
        setShowConfirmationModal(false);
        setGeneratedImage(null);
      } catch (error) {
        console.error('Failed to save result image:', error);
        setErrorMessage('Failed to save result image.');
        setShowConfirmationModal(false);
        setGeneratedImage(null);
      }
    },
    [selectedColor, selectedTexture, selectedTaskName]
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
      // TODO: Delete images from Firestore
      // Update local state
      setOriginalImages((prev) => prev.filter((img) => !selectedOriginalImageIds.has(img.id)));
      setSelectedOriginalImageIds(new Set());
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to delete images:', error);
      setErrorMessage('Failed to delete images.');
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
      // TODO: Delete images from Firestore
      // Update local state
      setUpdatedImages((prev) => prev.filter((img) => !selectedUpdatedImageIds.has(img.id)));
      setSelectedUpdatedImageIds(new Set());
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to delete images:', error);
      setErrorMessage('Failed to delete images.');
    }
  }, [selectedUpdatedImageIds]);

  const handleBulkDownloadUpdated = useCallback(() => {
    if (selectedUpdatedImageIds.size === 0) return;

    // Download each selected image
    updatedImages.forEach((img) => {
      if (selectedUpdatedImageIds.has(img.id)) {
        const link = document.createElement('a');
        link.href = img.storageUrl; // Use storageUrl from Firebase Storage
        const mimeTypeMap: { [key: string]: string } = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
        };
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

      // TODO: Add images to original images in Firestore
      // Update local state - add to original and remove from updated
      setOriginalImages((prev) => [...prev, ...imagesToMove]);
      setUpdatedImages((prev) => prev.filter((img) => !selectedUpdatedImageIds.has(img.id)));
      setSelectedUpdatedImageIds(new Set());
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to move images:', error);
      setErrorMessage('Failed to move images. Please try again.');
    }
  }, [selectedUpdatedImageIds, updatedImages]);

  const handleClearUpdatedSelection = useCallback(() => {
    setSelectedUpdatedImageIds(new Set());
  }, []);

  const selectedOriginalImageId = Array.from(selectedOriginalImageIds)[0] || null;
  const selectedOriginalImage = originalImages.find((img) => img.id === selectedOriginalImageId);

  const isProcessingButtonEnabled =
    selectedOriginalImageIds.size === 1 &&
    !processingImage &&
    ((selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && selectedColor) ||
      (selectedTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && selectedTexture));

  // Compare functionality
  const totalSelectedPhotos = selectedOriginalImageIds.size + selectedUpdatedImageIds.size;
  const isCompareButtonEnabled = totalSelectedPhotos >= 2 && totalSelectedPhotos <= 4;

  const getSelectedPhotosForComparison = useCallback(() => {
    const selectedPhotos: ImageData[] = [];

    // Add selected original images
    selectedOriginalImageIds.forEach((id) => {
      const img = originalImages.find((img) => img.id === id);
      if (img) selectedPhotos.push(img);
    });

    // Add selected updated images
    selectedUpdatedImageIds.forEach((id) => {
      const img = updatedImages.find((img) => img.id === id);
      if (img) selectedPhotos.push(img);
    });

    return selectedPhotos;
  }, [selectedOriginalImageIds, selectedUpdatedImageIds, originalImages, updatedImages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 mt-4">
      <div className="container mx-auto max-w-6xl">
        {isLoadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading your saved data...</span>
          </div>
        )}

        {!isLoadingData && (
          <>
            <div className="mb-8">
              <TaskSelector selectedTaskName={selectedTaskName} onSelectTask={handleSelectTask} />
            </div>

            <div className="mb-8">
              {selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name ? (
                <ColorSelector selectedColor={selectedColor} onSelectColor={setSelectedColor} />
              ) : (
                <TextureSelector onTextureSelect={setSelectedTexture} onError={setErrorMessage} />
              )}
            </div>

            <div className="mb-8">
              <Gallery
                title="2. Original Photos (Select one to process, or multiple to delete)"
                images={originalImages}
                selectedImageIds={selectedOriginalImageIds}
                onSelectImage={handleSelectOriginalImage}
                onSelectMultiple={handleSelectMultipleOriginal}
                onRemoveImage={handleRemoveOriginalImage}
                onRenameImage={handleRenameOriginalImage}
                showRemoveButtons={selectedOriginalImageIds.size === 0}
                emptyMessage="No photos uploaded yet."
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
              <div className="flex flex-row gap-3 items-center justify-center">
                <ProcessButton
                  isEnabled={isProcessingButtonEnabled}
                  isProcessing={processingImage}
                  selectedTaskName={selectedTaskName}
                  onOpenCustomPrompt={handleOpenCustomPromptModal}
                />

                {/* Compare Photos Button */}
                <ImagesComparingButton
                  totalSelectedPhotos={totalSelectedPhotos}
                  isEnabled={isCompareButtonEnabled}
                  onClick={() => setShowCompareModal(true)}
                />
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
          onConfirm={handleConfirmPrompt}
          onCancel={handleCancelRecolor}
          colorName={selectedColor?.name || 'N/A'}
        />

        {/* Custom Prompt Modal */}
        <CustomPromptModal
          isOpen={showCustomPromptModal}
          onConfirm={handleProcessImage}
          onCancel={() => setShowCustomPromptModal(false)}
          taskName={selectedTaskName}
          colorName={selectedColor?.name}
          colorHex={selectedColor?.hex}
          textureName={selectedTexture?.name}
        />

        {/* Compare Photos Modal */}
        <ImagesComparingModal
          isOpen={showCompareModal}
          images={getSelectedPhotosForComparison()}
          onClose={() => setShowCompareModal(false)}
        />

        {/* Alert Modal */}
        <AlertModal
          isOpen={showAlert}
          type={alertType}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      </div>
    </div>
  );
};

export default LandingPage;
