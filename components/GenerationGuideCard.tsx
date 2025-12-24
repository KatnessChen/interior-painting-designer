import React from 'react';
import {
  AutoAwesome as AutoAwesomeIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

interface GenerationGuideCardProps {
  showGenerationTip: boolean;
  showUploadTip: boolean;
}

const GenerationGuideCard: React.FC<GenerationGuideCardProps> = ({
  showUploadTip,
  showGenerationTip,
}) => {
  if (!showUploadTip && !showGenerationTip) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-white to-purple-200 text-white p-4 rounded-xl shadow-sm text-xs font-medium flex items-center gap-3 border border-gray-200">
        {showUploadTip && (
          <p className="text-gray-600 text-sm leading-loose m-0">
            <CloudUploadIcon
              sx={{ fontSize: 18, marginRight: 1, marginBottom: 0.5, color: '#4f46e5' }}
            />
            Upload your image to get started!
          </p>
        )}
        {showGenerationTip && (
          <p className="text-gray-600 text-sm leading-loose m-0">
            Hover over any image and click{' '}
            <span className="font-semibold text-purple-700">
              <AutoAwesomeIcon sx={{ fontSize: 18, marginRight: 1, color: 'inherit' }} />
              Generate
            </span>{' '}
            to start creating variations!
          </p>
        )}
      </div>
    </>
  );
};

export default GenerationGuideCard;
