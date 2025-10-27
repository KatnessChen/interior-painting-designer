
import React from 'react';
import { ImageData } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  originalImage: ImageData | null; // New prop for the original image
  image: ImageData | null; // This is the generated/recolored image
  onConfirm: (imageData: ImageData) => void;
  onCancel: () => void;
  colorName: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  originalImage, // Destructure new prop
  image,
  onConfirm,
  onCancel,
  colorName, // Removed trailing comma here
}) => {
  if (!isOpen || !image || !originalImage) return null; // Ensure both images are available

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative"> {/* Increased max-w for side-by-side */}
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Is this new wall color satisfactory?
        </h3>
        <p className="text-gray-600 text-center mb-6">
          The walls have been recolored to <span className="font-semibold">{colorName}</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-6"> {/* Flex container for images */}
          {/* Original Photo */}
          <div className="flex-1 flex flex-col items-center">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Original Photo</h4>
            <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={`data:${originalImage.mimeType};base64,${originalImage.base64}`}
                alt="Original"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>

          {/* Recolor Photo */}
          <div className="flex-1 flex flex-col items-center">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Recolored Photo</h4>
            <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={`data:${image.mimeType};base64,${image.base64}`}
                alt="Generated Recolor"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => onConfirm(image)}
            className="flex-1 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Yes, I'm Satisfied!
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            No, Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
