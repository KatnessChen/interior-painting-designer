import React from 'react';
import { ImageData } from '../types';
import ImageCard from './ImageCard';

interface GalleryProps {
  title: string;
  images: ImageData[];
  selectedImageId?: string | null;
  onSelectImage?: (imageId: string) => void;
  onDownloadImage?: (imageData: ImageData) => void;
  showDownloadButtons?: boolean;
  onRemoveImage?: (imageId: string) => void;
  showRemoveButtons?: boolean;
  emptyMessage: string;
  onViewImage?: (imageData: ImageData) => void; // Prop for viewing images
}

const Gallery: React.FC<GalleryProps> = ({
  title,
  images,
  selectedImageId,
  onSelectImage,
  onDownloadImage,
  showDownloadButtons = false,
  onRemoveImage,
  showRemoveButtons = false,
  emptyMessage,
  onViewImage, // Destructure prop
}) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-500 italic">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              isSelected={selectedImageId === image.id}
              onSelect={onSelectImage}
              onDownload={onDownloadImage}
              showDownloadButton={showDownloadButtons}
              onRemove={showRemoveButtons ? onRemoveImage : undefined}
              onViewButtonClick={onViewImage} // Pass onViewImage to ImageCard's new prop
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;