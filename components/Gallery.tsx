import React from 'react';
import { ImageData } from '../types';
import ImageCard from './ImageCard';
import UploadCard from './UploadCard';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  SwapHoriz as MoveIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface GalleryProps {
  title: string;
  images: ImageData[];
  selectedImageId?: string | null;
  selectedImageIds?: Set<string>; // For multi-select mode
  onSelectImage?: (imageId: string) => void;
  onSelectMultiple?: (imageId: string) => void; // For multi-select
  onDownloadImage?: (imageData: ImageData) => void;
  onRenameImage?: (imageId: string, newName: string) => void;
  showDownloadButtons?: boolean;
  onRemoveImage?: (imageId: string) => void;
  showRemoveButtons?: boolean;
  emptyMessage: string;
  onViewImage?: (imageData: ImageData) => void; // Prop for viewing images
  onUploadImage?: (imageData: ImageData) => void; // Prop for uploading images
  showUploadCard?: boolean; // Show upload card as first item
  onUploadError?: (message: string) => void; // Prop for upload errors
  enableMultiSelect?: boolean; // Enable multi-select mode
  onBulkDelete?: () => void; // Callback for bulk delete
  onBulkDownload?: () => void; // Callback for bulk download
  onBulkMove?: () => void; // Callback for bulk move
  onClearSelection?: () => void; // Callback for clearing all selections
  hideDownloadAndMove?: boolean; // Hide Download and Move buttons in multi-select
}

const Gallery: React.FC<GalleryProps> = ({
  title,
  images,
  selectedImageId,
  selectedImageIds = new Set(),
  onSelectImage,
  onSelectMultiple,
  onDownloadImage,
  onRenameImage,
  showDownloadButtons = false,
  onRemoveImage,
  showRemoveButtons = false,
  emptyMessage,
  onViewImage,
  onUploadImage,
  showUploadCard = false,
  onUploadError,
  enableMultiSelect = false,
  onBulkDelete,
  onBulkDownload,
  onBulkMove,
  onClearSelection,
  hideDownloadAndMove = false,
}) => {
  const hasSelection = selectedImageIds.size > 0;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {enableMultiSelect && hasSelection && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedImageIds.size} selected</span>
            {!hideDownloadAndMove && (
              <>
                <button
                  onClick={onBulkDownload}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  title="Download selected photos"
                >
                  <DownloadIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                  Download
                </button>
                <button
                  onClick={onBulkMove}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title="Move selected photos"
                >
                  <MoveIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                  Move to Original
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
              onDownload={onDownloadImage}
              showDownloadButton={showDownloadButtons && !enableMultiSelect}
              onRemove={showRemoveButtons && !enableMultiSelect ? onRemoveImage : undefined}
              onViewButtonClick={onViewImage}
              onRename={onRenameImage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
