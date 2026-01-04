import React, { useState, useCallback } from 'react';
import { ImageData } from '@/types';
import ImageCard from './ImageCard';
import UploadCard from './UploadCard';
import ImageDisplayModal from './ImageDisplayModal';
import ViewMoreDisplayModal from './ViewMoreDisplayModal';
import GenerationGuideCard from './GenerationGuideCard';
import { Button, Tooltip } from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

interface GalleryProps {
  title: string;
  images: ImageData[];
  selectedImageId?: string | null;
  selectedImageIds?: Set<string>;
  onSelectImage?: (imageId: string) => void;
  onSelectMultiple?: (imageId: string) => void;
  onRenameImage?: (imageId: string, newName: string) => void;
  showDownloadButtons?: boolean;
  onRemoveImage?: (imageId: string) => void;
  showRemoveButtons?: boolean;
  emptyMessage: string;
  onUploadImage?: (file: File) => void;
  showUploadCard?: boolean;
  onUploadError?: (message: string) => void;
  onBulkDelete?: () => void;
  onBulkDownload?: () => void;
  onBulkCopy?: () => void;
  onClearSelection?: () => void;
  onGenerateMoreSuccess?: () => void;
  onGenerateMoreClick?: (image: ImageData) => void;
  userId?: string | undefined;
}

const Gallery: React.FC<GalleryProps> = ({
  title,
  images,
  selectedImageIds = new Set(),
  onSelectMultiple,
  onRenameImage,
  emptyMessage,
  onUploadImage,
  showUploadCard = false,
  onUploadError,
  onBulkDelete,
  onBulkDownload,
  onBulkCopy,
  onClearSelection,
  onGenerateMoreClick,
  userId,
}) => {
  // State for ImageDisplayModal
  const [showImageDisplayModal, setShowImageDisplayModal] = useState<boolean>(false);
  const [imageToDisplayInModal, setImageToDisplayInModal] = useState<ImageData | null>(null);

  // State for ViewMoreDisplayModal
  const [showViewMoreModal, setShowViewMoreModal] = useState<boolean>(false);
  const [imageForViewMore, setImageForViewMore] = useState<ImageData | null>(null);

  const handleViewPhotoImage = useCallback((imageData: ImageData) => {
    setImageToDisplayInModal(imageData);
    setShowImageDisplayModal(true);
  }, []);

  const handleCloseImageDisplayModal = useCallback(() => {
    setShowImageDisplayModal(false);
    setImageToDisplayInModal(null);
  }, []);

  const onViewMoreButtonClick = useCallback((imageData: ImageData) => {
    setImageForViewMore(imageData);
    setShowViewMoreModal(true);
  }, []);

  const handleCloseViewMoreModal = useCallback(() => {
    setShowViewMoreModal(false);
    setImageForViewMore(null);
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
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <span className="text-sm text-gray-600">{selectedImageIds.size} selected</span>
          )}
          {images.length > 0 && (
            <>
              {onBulkDownload && (
                <Button
                  onClick={onBulkDownload}
                  disabled={!hasSelection}
                  variant="outlined"
                  color="secondary"
                  startIcon={<DownloadIcon />}
                  size="small"
                >
                  Download
                </Button>
              )}
              {onBulkCopy && (
                <Tooltip title="Copy the selected photos">
                  <Button
                    onClick={onBulkCopy}
                    disabled={!hasSelection}
                    variant="outlined"
                    color="secondary"
                    startIcon={<CopyIcon />}
                    size="small"
                  >
                    Copy
                  </Button>
                </Tooltip>
              )}
              {onBulkDelete && (
                <Button
                  onClick={onBulkDelete}
                  disabled={!hasSelection}
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  size="small"
                >
                  Delete
                </Button>
              )}
              {onClearSelection && (
                <Button
                  onClick={onClearSelection}
                  disabled={!hasSelection}
                  variant="outlined"
                  color="inherit"
                  startIcon={<ClearIcon />}
                  size="small"
                >
                  Deselect
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {images.length === 0 && !showUploadCard ? (
        <div className="text-center py-8 text-gray-500 italic">{emptyMessage}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {showUploadCard && onUploadImage && onUploadError && (
              <UploadCard onImageUpload={onUploadImage} onError={onUploadError} />
            )}
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                isSelected={selectedImageIds.has(image.id)}
                onSelect={onSelectMultiple}
                onViewPhotoButtonClick={handleViewPhotoImage}
                onViewMoreButtonClick={onViewMoreButtonClick}
                onRename={onRenameImage}
                onGenerateMoreClick={onGenerateMoreClick}
                userId={userId}
              />
            ))}
            <GenerationGuideCard
              showGenerationTip={images.length > 0}
              showUploadTip={showUploadCard && images.length === 0}
            />
          </div>
        </>
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

      {/* View More Display Modal */}
      {imageForViewMore && (
        <ViewMoreDisplayModal
          isOpen={showViewMoreModal}
          image={imageForViewMore}
          onClose={handleCloseViewMoreModal}
        />
      )}
    </div>
  );
};

export default Gallery;
