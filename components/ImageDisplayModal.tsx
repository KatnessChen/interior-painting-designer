import React, { useEffect, useCallback } from 'react';
import { ImageData } from '../types';
import { Close as CloseIcon } from '@mui/icons-material';

interface ImageDisplayModalProps {
  isOpen: boolean;
  image: ImageData | null;
  onClose: () => void;
}

const ImageDisplayModal: React.FC<ImageDisplayModalProps> = ({ isOpen, image, onClose }) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
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
      className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Image viewer"
    >
      <div
        className="relative bg-white rounded-lg shadow-xl p-4 sm:p-6 lg:p-8 max-w-4xl w-full max-h-[90vh] overflow-hidden flex items-center justify-center bg-gray-100"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
      >
        <img
          src={`data:${image.mimeType};base64,${image.base64}`}
          alt={image.name}
          className="max-w-full max-h-full object-contain"
          style={{
            maxWidth: '-webkit-fill-available',
            maxHeight: '-webkit-fill-available',
          }}
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
          aria-label="Close image viewer"
        >
          <CloseIcon sx={{ fontSize: 24, color: 'inherit' }} />
        </button>
      </div>
    </div>
  );
};

export default ImageDisplayModal;
