import React, { useEffect, useCallback } from 'react';
import { ImageData } from '../types';
import {
  Close as CloseIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';

interface ImageDisplayModalProps {
  isOpen: boolean;
  image: ImageData | null;
  onClose: () => void;
  currentImageIndex?: number;
  totalImages?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const ImageDisplayModal: React.FC<ImageDisplayModalProps> = ({
  isOpen,
  image,
  onClose,
  currentImageIndex = -1,
  totalImages = 0,
  onPrevious,
  onNext,
}) => {
  const hasPrevious = currentImageIndex > 0;
  const hasNext = currentImageIndex >= 0 && currentImageIndex < totalImages - 1;

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      onPrevious?.();
    }
  }, [hasPrevious, onPrevious]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNext?.();
    }
  }, [hasNext, onNext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    },
    [isOpen, onClose, handlePrevious, handleNext]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling of the background
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !image) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-2 z-50 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Image viewer"
    >
      <div
        className="bg-white rounded-lg shadow-xl sm:p-3 lg:p-2 max-w-4xl w-full max-h-[95vh] flex flex-col bg-gray-100"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
      >
        <div className="relative">
          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            {/* Previous Button */}
            {hasPrevious && (
              <button
                onClick={handlePrevious}
                className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-white hover:bg-gray-700 hover:bg-opacity-50 focus:outline-none transition-colors duration-200 z-10 group"
                aria-label="Previous image"
                title="Previous image (← arrow key)"
              >
                <PrevIcon
                  sx={{
                    fontSize: 36,
                    color: 'white',
                    opacity: 0,
                    groupHover: { opacity: 1 },
                    transition: 'opacity 0.2s',
                  }}
                  className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
                />
              </button>
            )}

            <img
              src={`data:${image.mimeType};base64,${image.base64}`}
              alt={image.name}
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: '-webkit-fill-available',
                maxHeight: '-webkit-fill-available',
              }}
            />

            {/* Next Button */}
            {hasNext && (
              <button
                onClick={handleNext}
                className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-white hover:bg-gray-700 hover:bg-opacity-50 focus:outline-none transition-colors duration-200 z-10 group"
                aria-label="Next image"
                title="Next image (→ arrow key)"
              >
                <NextIcon
                  sx={{
                    fontSize: 36,
                    color: 'white',
                    opacity: 0,
                    groupHover: { opacity: 1 },
                    transition: 'opacity 0.2s',
                  }}
                  className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
                />
              </button>
            )}
          </div>
        </div>

        {/* Photo Name Footer */}
        <div className="border-t border-gray-300 pt-1 text-center">
          <p className="text-sm font-medium text-gray-700 truncate">{image.name}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageDisplayModal;
