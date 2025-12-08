import React, { useState, useCallback } from 'react';
import { ImageData } from '../types';
import ImageCard from './ImageCard';
import UploadCard from './UploadCard';
import ImageDisplayModal from './ImageDisplayModal';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface GalleryProps {
  title: string;
  images: ImageData[];
  selectedImageId?: string | null;
  selectedImageIds?: Set<string>; // For multi-select mode
  onSelectImage?: (imageId: string) => void;
  onSelectMultiple?: (imageId: string) => void; // For multi-select
  onRenameImage?: (imageId: string, newName: string) => void;
  showDownloadButtons?: boolean;
  onRemoveImage?: (imageId: string) => void;
  showRemoveButtons?: boolean;
  emptyMessage: string;
  onUploadImage?: (file: File) => void; // Prop for uploading files
  showUploadCard?: boolean; // Show upload card as first item
  onUploadError?: (message: string) => void; // Prop for upload errors
  enableMultiSelect?: boolean; // Enable multi-select mode
  onBulkDelete?: () => void; // Callback for bulk delete
  onBulkDownload?: () => void; // Callback for bulk download
  onClearSelection?: () => void; // Callback for clearing all selections
  showDownloadIcon?: boolean; // Show Download buttons in multi-select
}

const Gallery: React.FC<GalleryProps> = ({
  title,
  images,
  selectedImageId,
  selectedImageIds = new Set(),
  onSelectImage,
  onSelectMultiple,
  onRenameImage,
  showDownloadButtons = false,
  onRemoveImage,
  showRemoveButtons = false,
  emptyMessage,
  onUploadImage,
  showUploadCard = false,
  onUploadError,
  enableMultiSelect = false,
  onBulkDelete,
  onBulkDownload,
  onClearSelection,
  showDownloadIcon = false,
}) => {
  // State for ImageDisplayModal
  const [showImageDisplayModal, setShowImageDisplayModal] = useState<boolean>(false);
  const [imageToDisplayInModal, setImageToDisplayInModal] = useState<ImageData | null>(null);

  const handleViewImage = useCallback((imageData: ImageData) => {
    setImageToDisplayInModal(imageData);
    setShowImageDisplayModal(true);
  }, []);

  const handleCloseImageDisplayModal = useCallback(() => {
    setShowImageDisplayModal(false);
    setImageToDisplayInModal(null);
  }, []);

  // Calculate current image index
  const currentImageIndex = imageToDisplayInModal
    ? images.findIndex((img) => img.id === imageToDisplayInModal.id)
    : -1;

  const handlePrevious = useCallback(() => {
    if (currentImageIndex > 0) {
      setImageToDisplayInModal(images[currentImageIndex - 1]);
    }
  }, [currentImageIndex, images]);

  const handleNext = useCallback(() => {
    if (currentImageIndex >= 0 && currentImageIndex < images.length - 1) {
      setImageToDisplayInModal(images[currentImageIndex + 1]);
    }
  }, [currentImageIndex, images]);

  const hasSelection = selectedImageIds.size > 0;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-gray-800">{title}</h2>
        {enableMultiSelect && hasSelection && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedImageIds.size} selected</span>
            {showDownloadIcon && (
              <>
                <button
                  onClick={onBulkDownload}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  title="Download selected photos"
                >
                  <DownloadIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                  Download
                </button>
              </>
            )}
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              title="Delete selected photos"
            >
              <DeleteIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
              Delete
            </button>
            <button
              onClick={onClearSelection}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              title="Clear all selections"
            >
              <ClearIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
              Clear
            </button>
          </div>
        )}
      </div>

      {images.length === 0 && !showUploadCard ? (
        <div className="text-center py-8 text-gray-500 italic">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {showUploadCard && onUploadImage && onUploadError && (
            <UploadCard onImageUpload={onUploadImage} onError={onUploadError} />
          )}
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              isSelected={
                enableMultiSelect ? selectedImageIds.has(image.id) : selectedImageId === image.id
              }
              onSelect={enableMultiSelect ? onSelectMultiple : onSelectImage}
              showDownloadButton={showDownloadButtons && !enableMultiSelect}
              onRemove={showRemoveButtons && !enableMultiSelect ? onRemoveImage : undefined}
              onViewButtonClick={handleViewImage}
              onRename={onRenameImage}
            />
          ))}
        </div>
      )}

      {/* Image Display Modal */}
      {imageToDisplayInModal && (
        <ImageDisplayModal
          isOpen={showImageDisplayModal}
          image={imageToDisplayInModal}
          onClose={handleCloseImageDisplayModal}
          currentImageIndex={currentImageIndex}
          totalImages={images.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}
    </div>
  );
};

export default Gallery;
