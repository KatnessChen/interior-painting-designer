import React, { useState, useCallback, useEffect } from "react";
import ColorSelector from "./components/ColorSelector";
import ImageUploader from "./components/ImageUploader";
import Gallery from "./components/Gallery";
import ConfirmationModal from "./components/ConfirmationModal";
import ImageDisplayModal from "./components/ImageDisplayModal"; // Import the new modal component
import StorageManager from "./components/StorageManager";
import { BenjaminMooreColor, ImageData } from "./types";
import { recolorImage } from "./services/geminiService";
import { storageService } from "./services/storageService";

const App: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<BenjaminMooreColor | null>(
    null
  );
  const [originalImages, setOriginalImages] = useState<ImageData[]>([]);
  const [selectedOriginalImageId, setSelectedOriginalImageId] = useState<
    string | null
  >(null);
  const [updatedImages, setUpdatedImages] = useState<ImageData[]>([]);
  const [processingImage, setProcessingImage] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // State for ImageDisplayModal
  const [showImageDisplayModal, setShowImageDisplayModal] =
    useState<boolean>(false);
  const [imageToDisplayInModal, setImageToDisplayInModal] =
    useState<ImageData | null>(null);

  // State for StorageManager
  const [showStorageManager, setShowStorageManager] = useState<boolean>(false);

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

        // Check API key
        if (
          (window as any).aistudio &&
          (window as any).aistudio.hasSelectedApiKey
        ) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setApiKeySelected(hasKey);
        } else {
          // Assume API key is available in typical development environments without the studio extension
          setApiKeySelected(true);
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setErrorMessage(
          "Failed to load saved data. Some features may not work properly."
        );
      } finally {
        setIsLoadingData(false);
      }
    };

    initializeApp();
  }, []);

  const handleSelectApiKey = useCallback(async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume selection was successful to avoid race condition and immediately enable functionality
      setApiKeySelected(true);
      setErrorMessage(null); // Clear any previous API key errors
    } else {
      setErrorMessage(
        "API Key selection utility not available. Please ensure you're running in a compatible environment."
      );
    }
  }, []);

  const handleImageUpload = useCallback(async (imageData: ImageData) => {
    try {
      // Save to storage
      await storageService.addOriginalImage(imageData);

      // Update local state
      setOriginalImages((prev) => [...prev, imageData]);
      setErrorMessage(null); // Clear error on successful upload
    } catch (error) {
      console.error("Failed to save uploaded image:", error);
      setErrorMessage(
        "Failed to save uploaded image. It may not be available after page refresh."
      );

      // Still add to local state for current session
      setOriginalImages((prev) => [...prev, imageData]);
    }
  }, []);

  const handleDownload = useCallback((imageData: ImageData) => {
    const link = document.createElement("a");
    link.href = `data:${imageData.mimeType};base64,${imageData.base64}`;
    link.download = `recolored_${imageData.name}`;
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
      console.error("Failed to remove image from storage:", error);

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
        setOriginalImages((prev) =>
          prev.filter((image) => image.id !== imageId)
        );

        // Clear selection if the removed image was selected
        if (selectedOriginalImageId === imageId) {
          setSelectedOriginalImageId(null);
        }
      } catch (error) {
        console.error("Failed to remove original image from storage:", error);

        // Still remove from local state
        setOriginalImages((prev) =>
          prev.filter((image) => image.id !== imageId)
        );
        if (selectedOriginalImageId === imageId) {
          setSelectedOriginalImageId(null);
        }
      }
    },
    [selectedOriginalImageId]
  );

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

  const handleRecolor = useCallback(async () => {
    if (!selectedColor) {
      setErrorMessage("Please select a color first.");
      return;
    }
    const selectedImage = originalImages.find(
      (img) => img.id === selectedOriginalImageId
    );
    if (!selectedImage) {
      setErrorMessage("Please select an original photo to recolor.");
      return;
    }

    setProcessingImage(true);
    setErrorMessage(null); // Clear previous errors

    try {
      const recolored = await recolorImage(
        selectedImage,
        selectedColor.name,
        selectedColor.hex
      );
      setGeneratedImage(recolored);
      setShowConfirmationModal(true);
    } catch (error: any) {
      // Cast to any to access potential custom error properties
      console.error("Recolor failed:", error);
      let msg = error instanceof Error ? error.message : String(error);
      let displayMessage = `Recolor failed: ${msg}.`;
      let shouldResetApiKey = false;

      // Attempt to parse API specific error details from the message
      let apiError: any = null;
      try {
        const jsonStringMatch = msg.match(/\{"error":\{.*\}\}/);
        if (jsonStringMatch) {
          apiError = JSON.parse(jsonStringMatch[0]);
        }
      } catch (e) {
        console.warn("Failed to parse error message as JSON:", e);
      }

      if (
        apiError?.error?.status === "RESOURCE_EXHAUSTED" ||
        apiError?.error?.code === 429
      ) {
        const rateLimitDocsLink =
          apiError?.error?.details?.[1]?.links?.[0]?.url ||
          "https://ai.google.dev/gemini-api/docs/rate-limits";
        const usageLink = "https://ai.dev/usage?tab=rate-limit"; // General usage link if not in details
        displayMessage = `Recolor failed due to quota limits. You've exceeded your current usage limit for the Gemini API. Please check your plan and billing details. For more information, visit: ${rateLimitDocsLink} or monitor your usage at: ${usageLink}`;
        // No need to reset API key selection for quota errors as the key is valid but limited.
      } else if (msg.includes("Requested entity was not found.")) {
        displayMessage = `Recolor failed: ${msg}. This might indicate an invalid API key or an issue with model availability. Please re-select your API key.`;
        shouldResetApiKey = true;
      } else {
        displayMessage = `Recolor failed: ${msg}. If this error persists, try re-selecting your API key or contact support.`;
      }

      setErrorMessage(displayMessage);
      if (shouldResetApiKey) {
        setApiKeySelected(false);
      }
    } finally {
      setProcessingImage(false);
    }
  }, [selectedColor, originalImages, selectedOriginalImageId]);

  const handleConfirmRecolor = useCallback(async (image: ImageData) => {
    try {
      // Save to storage
      await storageService.addUpdatedImage(image);

      // Update local state
      setUpdatedImages((prev) => [...prev, image]);
      setShowConfirmationModal(false);
      setGeneratedImage(null);
    } catch (error) {
      console.error("Failed to save recolored image:", error);
      setErrorMessage(
        "Failed to save recolored image. It may not be available after page refresh."
      );

      // Still add to local state for current session
      setUpdatedImages((prev) => [...prev, image]);
      setShowConfirmationModal(false);
      setGeneratedImage(null);
    }
  }, []);

  const handleCancelRecolor = useCallback(() => {
    setShowConfirmationModal(false);
    setGeneratedImage(null);
  }, []);

  const selectedOriginalImage = originalImages.find(
    (img) => img.id === selectedOriginalImageId
  );
  const isRecolorButtonEnabled =
    selectedColor &&
    selectedOriginalImageId &&
    !processingImage &&
    apiKeySelected;

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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4M4 7h16m-4-4v4m-8-4v4"
              />
            </svg>
          </button>
        </div>

        {isLoadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">
              Loading your saved data...
            </span>
          </div>
        )}

        {!isLoadingData && !apiKeySelected && (
          <div
            className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md shadow-sm"
            role="alert"
          >
            <p className="font-bold">API Key Required</p>
            <p className="text-sm">
              Please select your Gemini API key to use the AI features.
              <button
                onClick={handleSelectApiKey}
                className="ml-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Select API Key
              </button>
            </p>
            <p className="text-xs mt-2">
              Learn about billing for Gemini API:{" "}
              <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900"
              >
                ai.google.dev/gemini-api/docs/billing
              </a>
            </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <ColorSelector
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
              />
              <ImageUploader
                onImageUpload={handleImageUpload}
                onError={setErrorMessage}
              />
            </div>

            <div className="mb-8">
              <Gallery
                title="3. Original Photos (Select one to recolor)"
                images={originalImages}
                selectedImageId={selectedOriginalImageId}
                onSelectImage={setSelectedOriginalImageId}
                onRemoveImage={handleRemoveOriginalImage}
                showRemoveButtons={true}
                emptyMessage="Upload photos above to get started."
                onViewImage={handleViewImage}
              />
            </div>

            <div className="sticky bottom-4 w-full flex justify-center z-40 p-2">
              <button
                onClick={handleRecolor}
                disabled={!isRecolorButtonEnabled}
                className={`px-8 py-4 text-xl font-semibold rounded-full shadow-lg transition-all duration-300
                            flex items-center justify-center space-x-2
                            ${
                              isRecolorButtonEnabled
                                ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
                                : "bg-gray-300 text-gray-600 cursor-not-allowed"
                            }`}
              >
                {processingImage ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.257-1.257m0 0l1.257 1.257M11 7.343V4m0 0h.007"
                      ></path>
                    </svg>
                    Recolor Walls
                  </>
                )}
              </button>
            </div>

            <div className="mt-8">
              <Gallery
                title="4. Updated Photos (Download your favorites)"
                images={updatedImages}
                onDownloadImage={handleDownload}
                showDownloadButtons={true}
                onRemoveImage={handleRemoveUpdatedImage}
                showRemoveButtons={true}
                emptyMessage="Satisfied recolored photos will appear here."
                onViewImage={handleViewImage}
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
          colorName={selectedColor?.name || "N/A"}
        />

        {/* New Image Display Modal */}
        <ImageDisplayModal
          isOpen={showImageDisplayModal}
          image={imageToDisplayInModal}
          onClose={handleCloseImageDisplayModal}
        />

        {/* Storage Manager Modal */}
        <StorageManager
          isOpen={showStorageManager}
          onClose={() => setShowStorageManager(false)}
        />
      </div>
    </div>
  );
};

export default App;
