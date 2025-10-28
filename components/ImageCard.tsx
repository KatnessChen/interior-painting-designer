import React from "react";
import { ImageData } from "../types";

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
                  ${onSelect ? "cursor-pointer hover:shadow-lg" : ""}
                  ${isSelected ? "ring-4 ring-blue-500 ring-offset-2" : ""}`}
      onClick={onSelect ? handleCardClick : undefined} // Only add onClick if selectable
    >
      {/* Image container with overlay buttons */}
      <div className="relative">
        <img
          src={`data:${image.mimeType};base64,${image.base64}`}
          alt={image.name}
          className="w-full h-48 object-cover object-center"
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
                <svg
                  className="w-6 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  ></path>
                </svg>
                View Photo
              </button>
            )}
            {showDownloadButton && onDownload && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors w-40"
                aria-label={`Download image ${image.name}`}
              >
                <svg
                  className="w-6 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  ></path>
                </svg>
                Download
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image info and controls below the image */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          {!isEditing ? (
            <p className="text-sm font-medium text-gray-800 truncate">
              {image.name}
            </p>
          ) : (
            <input
              aria-label={`Rename ${image.name}`}
              className="block w-full rounded-md border border-gray-300 p-1 text-sm"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") commitEdit();
                if (ev.key === "Escape") cancelEdit();
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
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z"
                  ></path>
                </svg>
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
        <div className="absolute top-2 right-2 p-1 rounded-full bg-blue-500 text-white">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-2 left-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          aria-label="Remove image"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ImageCard;
