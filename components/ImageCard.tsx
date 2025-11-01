import React from 'react';
import { ImageData } from '../types';
import {
  Visibility as EyeIcon,
  Download as DownloadIcon,
  Edit as PencilIcon,
  CheckCircle as CheckmarkBadgeIcon,
  Cancel as XBadgeIcon,
} from '@mui/icons-material';

interface ImageCardProps {
  image: ImageData;
  isSelected?: boolean;
  onSelect?: (imageId: string) => void;
  onDownload?: (imageData: ImageData) => void;
  showDownloadButton?: boolean;
  onRemove?: (imageId: string) => void;
  onViewButtonClick?: (imageData: ImageData) => void; // Renamed for clarity, now for a specific button
  onRename?: (imageId: string, newName: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isSelected = false,
  onSelect,
  onDownload,
  showDownloadButton = false,
  onRemove,
  onViewButtonClick, // Destructure new prop
  onRename,
}) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent other card actions when clicking download
    if (onDownload) {
      onDownload(image);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent other card actions when clicking remove
    if (onRemove) {
      onRemove(image.id);
    }
  };

  // Rename state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(image.name);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(image.name);
    setIsEditing(true);
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditValue(image.name);
  };

  const commitEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = editValue.trim();
    if (trimmed && onRename && trimmed !== image.name) {
      onRename(image.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent other card actions when clicking view
    if (onViewButtonClick) {
      onViewButtonClick(image);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(image.id); // Main card click now solely for selection
    }
  };

  return (
    <div
      className={`relative group rounded-lg overflow-hidden shadow-md bg-white transition-all duration-200
                  ${onSelect ? 'cursor-pointer hover:shadow-lg' : ''}
                  ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
      onClick={onSelect ? handleCardClick : undefined} // Only add onClick if selectable
    >
      {/* Image container with overlay buttons */}
      <div className="relative bg-gray-100">
        <img
          src={`data:${image.mimeType};base64,${image.base64}`}
          alt={image.name}
          className="w-full h-48 object-contain object-center"
        />
        {/* Overlay buttons - appear on hover */}
        {(onViewButtonClick || (showDownloadButton && onDownload)) && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            {onViewButtonClick && (
              <button
                onClick={handleView}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-40"
                aria-label={`View full image of ${image.name}`}
              >
                <EyeIcon sx={{ fontSize: 20, marginRight: 1, color: 'inherit' }} />
                View Photo
              </button>
            )}
            {showDownloadButton && onDownload && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors w-40"
                aria-label={`Download image ${image.name}`}
              >
                <DownloadIcon sx={{ fontSize: 20, marginRight: 1, color: 'inherit' }} />
                Download
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image info and controls below the image */}
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between gap-2">
          {!isEditing ? (
            <p className="text-sm font-medium text-gray-800 truncate">{image.name}</p>
          ) : (
            <input
              aria-label={`Rename ${image.name}`}
              className="block w-full rounded-md border border-gray-300 p-1 text-sm"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') commitEdit();
                if (ev.key === 'Escape') cancelEdit();
              }}
              autoFocus
            />
          )}
          <div className="flex items-center space-x-1 ml-2">
            {!isEditing && onRename && (
              <button
                onClick={startEdit}
                className="p-1 rounded text-gray-600 hover:text-gray-800 focus:outline-none"
                title="Rename image"
                aria-label={`Rename ${image.name}`}
              >
                <PencilIcon sx={{ fontSize: 16, color: 'inherit' }} />
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={commitEdit}
                  className="p-1 rounded text-green-600 hover:text-green-800 focus:outline-none"
                  title="Save name"
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 rounded text-red-600 hover:text-red-800 focus:outline-none"
                  title="Cancel"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckmarkBadgeIcon sx={{ fontSize: 24, color: '#3b82f6' }} />
        </div>
      )}
      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
          aria-label="Remove image"
        >
          <XBadgeIcon sx={{ fontSize: 24, color: '#ef4444' }} />
        </button>
      )}
    </div>
  );
};

export default ImageCard;
