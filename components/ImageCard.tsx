import { useState, useEffect } from 'react';
import { ImageData } from '@/types';
import { imageCache } from '@/utils/imageCache';
import {
  Visibility as EyeIcon,
  Edit as PencilIcon,
  CheckCircle as CheckmarkBadgeIcon,
  Info as InfoIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';

interface ImageCardProps {
  image: ImageData;
  isSelected?: boolean;
  onSelect?: (imageId: string) => void;
  onViewPhotoButtonClick?: (imageData: ImageData) => void;
  onViewMoreButtonClick?: (imageData: ImageData) => void;
  onGenerateMoreClick?: (image: ImageData) => void;
  onRename?: (imageId: string, newName: string) => void;
  userId?: string | undefined;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isSelected = false,
  onSelect,
  onViewPhotoButtonClick,
  onViewMoreButtonClick,
  onGenerateMoreClick,
  onRename,
}) => {
  // Rename state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(image.name);

  // Cached image state
  const [cachedImageSrc, setCachedImageSrc] = useState<string | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  // Load cached base64 on mount
  useEffect(() => {
    const loadCachedImage = async () => {
      try {
        setIsLoadingCache(true);
        const base64 = await imageCache.get(image.imageDownloadUrl);
        if (base64) {
          // Convert base64 to data URL
          setCachedImageSrc(`data:${image.mimeType};base64,${base64}`);
        }
      } catch (error) {
        console.warn('[ImageCard] Failed to load cached image:', error);
      } finally {
        setIsLoadingCache(false);
      }
    };

    loadCachedImage();
  }, [image.imageDownloadUrl, image.mimeType]);

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

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(image.id); // Main card click now solely for selection
    }
  };

  return (
    <div
      className={`relative group rounded-xl overflow-hidden shadow-md bg-white transition-all duration-200
                  ${onSelect ? 'cursor-pointer hover:shadow-lg' : ''}
                  ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      onClick={onSelect ? handleCardClick : undefined} // Only add onClick if selectable
    >
      {/* Image container with overlay buttons */}
      <div className="relative bg-gray-100">
        <img
          src={cachedImageSrc || image.imageDownloadUrl}
          alt={image.name}
          className="w-full h-48 object-contain object-center"
        />
        {/* Loading indicator while fetching from cache */}
        {isLoadingCache && (
          <div className="absolute inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center">
            <div className="text-gray-600 text-sm">Loading...</div>
          </div>
        )}
        {/* Overlay buttons - appear on hover */}
        {onViewPhotoButtonClick && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
            {onViewPhotoButtonClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPhotoButtonClick(image);
                }}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-40"
                aria-label={`View full image of ${image.name}`}
              >
                <EyeIcon sx={{ fontSize: 20, marginRight: 1, color: 'inherit' }} />
                Expand
              </button>
            )}
            {onGenerateMoreClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateMoreClick(image);
                }}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors w-40"
                aria-label={`Generate more variations of ${image.name}`}
              >
                <AutoAwesomeIcon sx={{ fontSize: 20, marginRight: 1, color: 'inherit' }} />
                Generate
              </button>
            )}
            {onViewMoreButtonClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMoreButtonClick(image);
                }}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors w-40"
                aria-label={`View more information about ${image.name}`}
              >
                <InfoIcon sx={{ fontSize: 20, marginRight: 1, color: '#374151' }} />
                More Info
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
                className="p-1 rounded text-gray-600 hover:text-gray-800 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
          <CheckmarkBadgeIcon sx={{ fontSize: 24, color: '#6366f1' }} />
        </div>
      )}
    </div>
  );
};

export default ImageCard;
