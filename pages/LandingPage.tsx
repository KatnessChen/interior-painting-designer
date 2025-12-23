import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Timestamp } from 'firebase/firestore';
import ColorSelector from '@/components/ColorSelector';
import ConfirmImageUpdateModal from '@/components/ConfirmImageUpdateModal';
import CustomPromptModal from '@/components/CustomPromptModal';
import Gallery from '@/components/Gallery';
import ProcessButton from '@/components/ProcessButton';
import TaskSelector from '@/components/TaskSelector';
import TextureSelector from '@/components/TextureSelector';
import ImagesComparingModal from '@/components/ImagesComparingModal';
import ImagesComparingButton from '@/components/ImagesComparingButton';
import AlertModal from '@/components/AlertModal';
import EmptyState from '@/components/EmptyState';
import GenericConfirmModal from '@/components/GenericConfirmModal';
import { GEMINI_TASKS, GeminiTaskName } from '@/services/gemini/geminiTasks';
import { BenjaminMooreColor, ImageData, ImageOperation } from '@/types';
import {
  createImage,
  deleteImages,
  fetchSpaceImages,
  updateImageName,
} from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { useAppInit } from '@/hooks/useAppInit';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { formatImageOperationData, downloadFile, buildDownloadFilename } from '@/utils';
import { selectOriginalImages, selectUpdatedImages } from '@/stores/imageStore';
import {
  setSpaceImages,
  selectProjects,
  selectActiveProjectId,
  selectActiveSpaceId,
  selectIsAppInitiated,
  selectInitError,
  addImageOptimistic,
  removeImageOptimistic,
  removeImagesOptimistic,
  updateImageOptimistic,
} from '@/stores/projectStore';

interface Texture {
  name: string;
  description?: string;
}

const LandingPage: React.FC = () => {
  // Get authenticated user
  const { user } = useAuth();
  const dispatch = useDispatch();

  const isAppInitiated = useSelector(selectIsAppInitiated);
  const initError = useSelector(selectInitError);

  // Get active space from store
  const projects = useSelector(selectProjects);
  const activeProjectId = useSelector(selectActiveProjectId);
  const activeSpaceId = useSelector(selectActiveSpaceId);

  // Get images from store (computed from rooms)
  const originalImages = useSelector(selectOriginalImages);
  const updatedImages = useSelector(selectUpdatedImages);

  // Task selection
  const [selectedTaskName, setSelectedTaskName] = useState<GeminiTaskName>(
    GEMINI_TASKS.RECOLOR_WALL.task_name
  );

  // Recolor task state
  const [selectedColor, setSelectedColor] = useState<BenjaminMooreColor | null>(null);

  // Add texture task state
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);

  const [selectedOriginalImageIds, setSelectedOriginalImageIds] = useState<Set<string>>(new Set());

  const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(
    null
  );

  const [selectedUpdatedImageIds, setSelectedUpdatedImageIds] = useState<Set<string>>(new Set());

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // State for custom prompt modal
  const [showCustomPromptModal, setShowCustomPromptModal] = useState<boolean>(false);

  // State for processing context (to track source image and custom prompt)
  const [processingContext, setProcessingContext] = useState<{
    selectedImage: ImageData | null;
    customPrompt: string | undefined;
  }>({
    selectedImage: null,
    customPrompt: undefined,
  });

  // State for compare photos modal
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  // State for alert modal
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info' | 'warning'>('error');
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');

  // State for generic confirm modal (for delete operations)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isDeletingImages, setIsDeletingImages] = useState<boolean>(false);

  // Initialize app on mount
  useAppInit();

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
    options: {
      selectedColor,
      selectedTexture,
    },
  });

  // Show alert when errorMessage changes
  useEffect(() => {
    if (errorMessage) {
      showAlertModal('error', 'Error', errorMessage);
    }
  }, [errorMessage, showAlertModal]);

  const handleSelectTask = useCallback((taskName: GeminiTaskName) => {
    setSelectedTaskName(taskName);

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

      if (!activeProjectId || !activeSpaceId) {
        setErrorMessage('Please select project/space to upload image.');
        return;
      }

      const tempImageId = crypto.randomUUID();
      const now = Timestamp.fromDate(new Date());

      // Optimistic update - add image immediately to UI
      const optimisticImage = {
        id: tempImageId,
        name: file.name,
        mimeType: file.type,
        spaceId: activeSpaceId,
        evolutionChain: [],
        parentImageId: null,
        imageDownloadUrl: URL.createObjectURL(file), // Temporary local URL
        storageFilePath: '',
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      dispatch(
        addImageOptimistic({
          projectId: activeProjectId,
          spaceId: activeSpaceId,
          image: optimisticImage,
        })
      );

      try {
        // Call firestoreService.createImage() to upload the file to Firebase Storage
        // and create the image document in Firestore
        await createImage(user.uid, activeProjectId, activeSpaceId, file, {
          id: tempImageId,
          name: file.name,
          mimeType: file.type,
        });

        // Fetch updated space images
        const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
        dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));

        setErrorMessage(null); // Clear error on successful upload
      } catch (error) {
        console.error('Failed to upload image:', error);

        // Rollback optimistic update on error
        dispatch(
          removeImageOptimistic({
            projectId: activeProjectId,
            spaceId: activeSpaceId,
            imageId: tempImageId,
          })
        );

        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to upload image to Firebase.'
        );
      }
    },
    [user, activeProjectId, activeSpaceId, dispatch]
  );

  const handleRenameImage = useCallback(
    async (imageId: string, newName: string) => {
      if (!user) {
        setErrorMessage('Please log in to rename images.');
        return;
      }

      if (!activeProjectId || !activeSpaceId) {
        setErrorMessage('No project and space selected.');
        return;
      }

      if (!newName.trim()) {
        setErrorMessage('Image name cannot be empty.');
        return;
      }

      // Optimistic update - update immediately in UI
      dispatch(
        updateImageOptimistic({
          projectId: activeProjectId,
          spaceId: activeSpaceId,
          imageId,
          newName: newName.trim(),
        })
      );

      try {
        // Update image name in Firestore
        await updateImageName(user.uid, activeProjectId, activeSpaceId, imageId, newName.trim());

        // Fetch updated space images to sync
        const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
        dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));

        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to rename image:', error);

        // Rollback - refresh from server
        const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
        dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));

        setErrorMessage('Failed to save renamed image. Please try again.');
      }
    },
    [user, activeProjectId, activeSpaceId, dispatch]
  );

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

      // Save context for later use in handleImageSatisfied
      setProcessingContext({ selectedImage, customPrompt });

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

  const handleImageSatisfied = useCallback(
    async (processedImageResult: { base64: string; mimeType: string }) => {
      if (!user) {
        setErrorMessage('Please log in to save images.');
        return;
      }

      if (!processingContext.selectedImage) {
        setErrorMessage('Processing context lost. Please try again.');
        return;
      }

      if (!activeProjectId || !activeSpaceId) {
        setErrorMessage('No project and space selected. Please try again.');
        return;
      }

      const tempImageId = crypto.randomUUID();
      const now = Timestamp.fromDate(new Date());

      // Append descriptor to the image name based on task
      let imageName = processingContext.selectedImage.name;
      if (selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && selectedColor) {
        imageName = `${processingContext.selectedImage.name} (${selectedColor.name})`;
      } else if (selectedTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && selectedTexture) {
        imageName = `${processingContext.selectedImage.name} (${selectedTexture.name})`;
      }

      // Create ImageOperation for evolution chain using utility function
      const operation: ImageOperation = formatImageOperationData(
        processingContext.selectedImage,
        selectedTaskName,
        processingContext.customPrompt,
        selectedColor,
        selectedTexture
      );

      // Optimistic update - show processed image immediately
      const optimisticImage = {
        id: tempImageId,
        name: imageName,
        mimeType: processedImageResult.mimeType,
        spaceId: activeSpaceId,
        evolutionChain: [operation],
        parentImageId: processingContext.selectedImage.id,
        imageDownloadUrl: `data:${processedImageResult.mimeType};base64,${processedImageResult.base64}`,
        storageFilePath: '',
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      dispatch(
        addImageOptimistic({
          projectId: activeProjectId!,
          spaceId: activeSpaceId!,
          image: optimisticImage,
        })
      );

      setShowConfirmationModal(false);
      setGeneratedImage(null);
      setProcessingContext({ selectedImage: null, customPrompt: undefined });

      try {
        // Save processed image to Firestore
        await createImage(
          user.uid,
          activeProjectId,
          activeSpaceId,
          null,
          {
            id: tempImageId,
            name: imageName,
            mimeType: processedImageResult.mimeType,
          },
          {
            base64: processedImageResult.base64,
            base64MimeType: processedImageResult.mimeType,
            parentImage: processingContext.selectedImage,
            operation,
          }
        );

        // Fetch updated space images to get real Firebase Storage URL
        const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
        dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));
      } catch (error) {
        console.error('Failed to save processed image:', error);

        // Rollback on error
        dispatch(
          removeImageOptimistic({
            projectId: activeProjectId!,
            spaceId: activeSpaceId!,
            imageId: tempImageId,
          })
        );

        setErrorMessage(error instanceof Error ? error.message : 'Failed to save processed image.');
      }
    },
    [
      user,
      selectedColor,
      selectedTexture,
      selectedTaskName,
      processingContext,
      activeProjectId,
      activeSpaceId,
      dispatch,
    ]
  );

  const handleCancelRecolor = useCallback(() => {
    setShowConfirmationModal(false);
    setGeneratedImage(null);
  }, []);

  const handleGenerateMoreSuccess = useCallback(async () => {
    if (!user || !activeProjectId || !activeSpaceId) return;

    try {
      // Fetch updated space images from Firestore
      const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
      dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));
    } catch (error) {
      console.error('Failed to refresh images:', error);
      setErrorMessage('Failed to refresh images. Please reload the page.');
    }
  }, [user, activeProjectId, activeSpaceId, dispatch]);

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

  const handleBulkDelete = useCallback(
    async (imageType: 'original' | 'updated') => {
      const selectedImageIds =
        imageType === 'original' ? selectedOriginalImageIds : selectedUpdatedImageIds;
      const setSelectedImageIds =
        imageType === 'original' ? setSelectedOriginalImageIds : setSelectedUpdatedImageIds;

      if (selectedImageIds.size === 0) return;

      if (!user) {
        setErrorMessage('Please log in to delete images.');
        return;
      }

      if (!activeProjectId || !activeSpaceId) {
        setErrorMessage('No project and space selected. Please try again.');
        return;
      }

      setDeleteConfirmConfig({
        title: 'Delete Photo',
        message: `Are you sure you want to delete ${selectedImageIds.size} selected ${imageType} photo(s)?\n\nThis action cannot be undone.`,
        onConfirm: async () => {
          try {
            setIsDeletingImages(true);

            // Optimistic update - remove immediately from UI
            dispatch(
              removeImagesOptimistic({
                projectId: activeProjectId!,
                spaceId: activeSpaceId!,
                imageIds: Array.from(selectedImageIds),
              })
            );

            setSelectedImageIds(new Set());

            // Delete images from Firestore and Firebase Storage
            await deleteImages(
              user.uid,
              activeProjectId,
              activeSpaceId,
              Array.from(selectedImageIds)
            );

            // Fetch updated space images to sync
            const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
            dispatch(
              setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images })
            );

            setErrorMessage(null);

            setShowDeleteConfirmModal(false);
            setDeleteConfirmConfig(null);
          } catch (error) {
            console.error('Failed to delete images:', error);

            // Rollback - refresh from server
            const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
            dispatch(
              setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images })
            );

            setErrorMessage('Failed to delete images.');
          } finally {
            setIsDeletingImages(false);
          }
        },
      });
      setShowDeleteConfirmModal(true);
    },
    [
      selectedOriginalImageIds,
      selectedUpdatedImageIds,
      user,
      activeProjectId,
      activeSpaceId,
      dispatch,
    ]
  );

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

  const handleBulkDownloadUpdated = useCallback(() => {
    if (selectedUpdatedImageIds.size === 0) return;

    // Download each selected image
    updatedImages.forEach((img) => {
      if (selectedUpdatedImageIds.has(img.id)) {
        const filename = buildDownloadFilename(img.name, img.mimeType);
        downloadFile(img.imageDownloadUrl, filename).catch((error) => {
          console.error('Download failed for image:', img.id, error);
          setErrorMessage('Failed to download one or more images. Please try again.');
        });
      }
    });
  }, [selectedUpdatedImageIds, updatedImages]);

  const handleClearUpdatedSelection = useCallback(() => {
    setSelectedUpdatedImageIds(new Set());
  }, []);

  const getEmptyStateComponent = useMemo(() => {
    const hasNoProject = projects.length === 0 || !activeProjectId;
    const hasNoSpace = !activeSpaceId;

    if (hasNoProject) {
      return (
        <EmptyState
          title="No Project Yet"
          message="Create or select a project to start designing!"
        />
      );
    } else if (hasNoSpace) {
      return <EmptyState title="No Space Yet" message="Create or select a space to get started!" />;
    }

    return null;
  }, [activeProjectId, activeSpaceId]);

  const selectedOriginalImageId = Array.from(selectedOriginalImageIds)[0] || null;
  const selectedOriginalImage =
    originalImages.find((img) => img.id === selectedOriginalImageId) || null;

  const isProcessingButtonEnabled =
    selectedOriginalImageIds.size === 1 &&
    !processingImage &&
    ((selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && !!selectedColor) ||
      (selectedTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && !!selectedTexture));

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
    <div className="bg-gray-100">
      <div className="h-full container mx-auto max-w-6xl">
        {!isAppInitiated ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : initError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <div className="text-red-600 text-5xl mb-4">🤯</div>
              <h2 className="text-xl text-gray-600 mb-2">Sorry, something went wrong.</h2>
              <p className="text-gray-600 mb-4">{initError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {getEmptyStateComponent}

            {activeSpaceId && (
              <>
                <div className="mb-8">
                  <TaskSelector
                    selectedTaskName={selectedTaskName}
                    onSelectTask={handleSelectTask}
                  />
                </div>

                <div className="mb-8">
                  <Gallery
                    title="1. Select Original Photo"
                    images={originalImages}
                    selectedImageIds={selectedOriginalImageIds}
                    onSelectImage={handleSelectOriginalImage}
                    onSelectMultiple={handleSelectMultipleOriginal}
                    onRenameImage={handleRenameImage}
                    showRemoveButtons={selectedOriginalImageIds.size === 0}
                    emptyMessage="No photos uploaded yet."
                    onUploadImage={handleImageUpload}
                    showUploadCard={true}
                    onUploadError={setErrorMessage}
                    enableMultiSelect={true}
                    onBulkDelete={() => handleBulkDelete('original')}
                    onClearSelection={handleClearOriginalSelection}
                  />
                </div>

                <div className="mb-8">
                  {selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name ? (
                    <ColorSelector
                      title="2. Select a Color to Recolor Wall"
                      selectedColor={selectedColor}
                      onSelectColor={setSelectedColor}
                    />
                  ) : (
                    <TextureSelector
                      onTextureSelect={setSelectedTexture}
                      onError={setErrorMessage}
                    />
                  )}
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
                    title="3. Generated Photos"
                    images={updatedImages}
                    selectedImageIds={selectedUpdatedImageIds}
                    onSelectMultiple={handleSelectUpdatedImage}
                    onRenameImage={handleRenameImage}
                    emptyMessage="Satisfied recolored photos will appear here."
                    enableMultiSelect={true}
                    onBulkDelete={() => handleBulkDelete('updated')}
                    onBulkDownload={handleBulkDownloadUpdated}
                    onClearSelection={handleClearUpdatedSelection}
                    showDownloadIcon={true}
                    onGenerateMoreSuccess={handleGenerateMoreSuccess}
                    userId={user?.uid}
                  />
                </div>
              </>
            )}
          </>
        )}

        {selectedOriginalImage && (
          <ConfirmImageUpdateModal
            isOpen={showConfirmationModal}
            originalImage={selectedOriginalImage}
            generatedImage={generatedImage}
            onConfirm={handleImageSatisfied}
            onCancel={handleCancelRecolor}
            colorName={selectedColor?.name || 'N/A'}
          />
        )}

        {/* Custom Prompt Modal */}
        <CustomPromptModal
          isOpen={showCustomPromptModal}
          onConfirm={handleProcessImage}
          onCancel={() => setShowCustomPromptModal(false)}
          task={
            GEMINI_TASKS[
              selectedTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name
                ? 'RECOLOR_WALL'
                : 'ADD_TEXTURE'
            ]
          }
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

        {/* Generic Delete Confirmation Modal */}
        {deleteConfirmConfig && (
          <GenericConfirmModal
            isOpen={showDeleteConfirmModal}
            title={deleteConfirmConfig.title}
            message={deleteConfirmConfig.message}
            confirmButtonText="Delete"
            cancelButtonText="Cancel"
            confirmButtonColor="red"
            onConfirm={deleteConfirmConfig.onConfirm}
            onCancel={() => {
              setShowDeleteConfirmModal(false);
              setDeleteConfirmConfig(null);
            }}
            isLoading={isDeletingImages}
          />
        )}

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
