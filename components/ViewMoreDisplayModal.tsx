import React, { useEffect, useState } from 'react';
import { Modal, Box } from '@mui/material';
import { Close as CloseIcon, ArrowDownward as ArrowDownwardIcon } from '@mui/icons-material';
import { ImageData } from '@/types';
import { imageCache, formatTimestamp } from '@/utils';

interface ViewMoreDisplayModalProps {
  isOpen: boolean;
  image: ImageData;
  onClose: () => void;
}

const ViewMoreDisplayModal: React.FC<ViewMoreDisplayModalProps> = ({ isOpen, image, onClose }) => {
  const [imageSources, setImageSources] = useState<Record<string, string>>({});

  const hasEvolutionChain = image.evolutionChain && image.evolutionChain.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    const loadImages = async () => {
      const sources: Record<string, string> = {};

      // Load current image
      if (image.imageDownloadUrl) {
        try {
          const base64 = await imageCache.get(image.imageDownloadUrl);
          if (base64) {
            sources[image.imageDownloadUrl] = `data:${image.mimeType};base64,${base64}`;
          }
        } catch (error) {
          console.warn('[ViewMoreDisplayModal] Failed to load current image from cache:', error);
        }
      }

      // Load sources images from evolution chain
      if (hasEvolutionChain) {
        for (const operation of image.evolutionChain) {
          if (operation.imageDownloadUrl && !sources[operation.imageDownloadUrl]) {
            try {
              const base64 = await imageCache.get(operation.imageDownloadUrl);
              if (base64) {
                // Use operation's mimeType if available, fallback to image.mimeType, then default to image/jpeg
                const mimeType = (operation as any).mimeType || image.mimeType || 'image/jpeg';
                sources[operation.imageDownloadUrl] = `data:${mimeType};base64,${base64}`;
              }
            } catch (error) {
              console.warn('[ViewMoreDisplayModal] Failed to load source image from cache:', error);
            }
          }
        }
      }

      setImageSources(sources);
    };

    loadImages();
  }, [isOpen, image, hasEvolutionChain]);

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto"
        sx={{ outline: 'none' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-800">Image Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon sx={{ fontSize: 24, color: '#6b7280' }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Section A: Basic Image Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">
                  Image Name:
                </span>
                <span className="text-sm text-gray-800">{image.name}</span>
              </div>
              <div className="flex items-start">
                <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">
                  Generation Time:
                </span>
                <span className="text-sm text-gray-800">{formatTimestamp(image.createdAt)}</span>
              </div>
              {image.updatedAt && image.updatedAt !== image.createdAt && (
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">
                    Last Updated:
                  </span>
                  <span className="text-sm text-gray-800">{formatTimestamp(image.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Evolution Chain */}
          {hasEvolutionChain && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Generation History
              </h3>

              {image.evolutionChain.map((operation, index) => (
                <React.Fragment key={index}>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Generation {index + 1}:
                        </h4>
                      </div>
                      {operation.timestamp && (
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(operation.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row">
                      {/* Left Column - Source Image (60%) */}
                      {operation.imageDownloadUrl && (
                        <div className="md:w-[60%] p-4 bg-gray-100">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-600">Source Image:</span>
                            <img
                              src={
                                imageSources[operation.imageDownloadUrl] ||
                                operation.imageDownloadUrl
                              }
                              alt="Source image"
                              className="w-full object-contain rounded-md border border-gray-300 bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Right Column - Details (40%) */}
                      <div
                        className={`${
                          operation.imageDownloadUrl ? 'md:w-[40%]' : 'w-full'
                        } p-4 space-y-3`}
                      >
                        {/* 1. Custom Prompt */}
                        {operation.customPrompt && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-gray-600">
                              Custom Prompt:
                            </span>
                            <div className="text-sm text-gray-800 italic bg-blue-50 px-3 py-2 rounded border-l-4 border-blue-400">
                              "{operation.customPrompt}"
                            </div>
                          </div>
                        )}

                        {/* 2. Options */}
                        {operation.options && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium text-gray-600">Options:</span>
                            <div className="bg-white rounded p-3 space-y-2 border border-gray-200">
                              {/* Color Option */}
                              {operation.options.colorSnapshot && (
                                <div className="space-y-1">
                                  <span className="text-xs text-gray-600">New Color:</span>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded border-2 border-gray-300 shadow-sm flex-shrink-0"
                                      style={{
                                        backgroundColor: operation.options.colorSnapshot.hex,
                                      }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-medium text-gray-800 truncate">
                                        {operation.options.colorSnapshot.name}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">
                                        {operation.options.colorSnapshot.hex}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Texture Option */}
                              {operation.options.textureSnapshot && (
                                <div className="space-y-1">
                                  <span className="text-xs text-gray-600">Texture:</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-800">
                                      {operation.options.textureSnapshot.name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow between generations and current image */}
                  <div className="flex justify-center py-2">
                    <ArrowDownwardIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
                  </div>
                </React.Fragment>
              ))}

              {/* Section C: Current Image */}
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="flex justify-between items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Generation {image.evolutionChain.length + 1} (Current Image)
                    </h4>
                    {image.createdAt && (
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(image.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <img
                      src={imageSources[image.imageDownloadUrl] || image.imageDownloadUrl}
                      alt={image.name}
                      className="w-full object-contain rounded-md border border-gray-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Evolution Chain Message */}
          {!hasEvolutionChain && (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500 italic">
                This is an original image with no processing history.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </Box>
    </Modal>
  );
};

export default ViewMoreDisplayModal;
