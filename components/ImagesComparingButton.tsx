import React from 'react';
import { Tooltip } from '@mui/material';
import { CompareArrows as CompareIcon } from '@mui/icons-material';

interface ImagesComparingButtonProps {
  totalSelectedPhotos: number;
  isEnabled: boolean;
  onClick: () => void;
}

const ImagesComparingButton: React.FC<ImagesComparingButtonProps> = ({
  totalSelectedPhotos,
  isEnabled,
  onClick,
}) => {
  return (
    <Tooltip title="Select 2-4 photos to compare side by side" arrow>
      {/* Avoiding MUI error: You are providing a disabled `button` child to the Tooltip component. */}
      <button
        onClick={onClick}
        disabled={!isEnabled}
        className={`px-4 py-2 font-semibold rounded-md transition-all duration-300
                    flex items-center justify-center gap-2 whitespace-nowrap min-w-max
                    ${
                      isEnabled
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-blue-300'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
      >
        <CompareIcon sx={{ fontSize: 28 }} />
        <span>Compare ({totalSelectedPhotos}/4)</span>
      </button>
    </Tooltip>
  );
};

export default ImagesComparingButton;
