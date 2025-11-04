import React, { useState, useCallback } from 'react';
import { deprecatedStorageService } from '../services/deprecatedStorageService';

export interface Texture {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
}

interface TextureSelectorProps {
  onTextureSelect: (texture: Texture) => void;
  onError?: (error: string) => void;
}

const TextureSelector: React.FC<TextureSelectorProps> = ({ onTextureSelect, onError }) => {
  // Local state management
  const [availableTextures, setAvailableTextures] = useState<Texture[]>([]);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [textureName, setTextureName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [isLoadingTextures, setIsLoadingTextures] = useState(false);

  // Load textures on mount
  React.useEffect(() => {
    const loadTextures = async () => {
      try {
        setIsLoadingTextures(true);
        const textures = await deprecatedStorageService.getTextures();
        setAvailableTextures(textures || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load textures';
        setUploadError(message);
        onError?.(message);
      } finally {
        setIsLoadingTextures(false);
      }
    };

    loadTextures();
  }, [onError]);

  // Handle texture upload to storage
  const handleTextureUpload = useCallback(
    async (texture: Texture) => {
      try {
        // Save to storage
        await deprecatedStorageService.addTexture(texture);

        // Update local state
        setAvailableTextures((prev) => [...prev, texture]);
        setUploadError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save texture';
        setUploadError(message);
        onError?.(message);
        // Still add to local state for current session
        setAvailableTextures((prev) => [...prev, texture]);
      }
    },
    [onError]
  );

  const existingNames = new Set(availableTextures.map((t) => t.name.toLowerCase()));

  const validateTextureName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Texture name cannot be empty';
    }
    if (name.length > 20) {
      return 'Texture name must be 20 characters or less';
    }
    if (existingNames.has(name.toLowerCase())) {
      return 'This texture name already exists';
    }
    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file size (max 5MB for texture)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Texture file must be smaller than 5MB');
      event.target.value = '';
      return;
    }

    // Set default name from file name
    const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setTextureName(defaultName.substring(0, 20)); // Limit initial name to 20 chars
    setPendingFile(file);
    setShowNameInput(true);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    const nameError = validateTextureName(textureName);
    if (nameError) {
      setUploadError(nameError);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      // Read file as base64
      // TODO: extract file upload handler to utils
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;
        const base64Data = base64String.split(',')[1] || base64String; // Get base64 part only

        const texture: Texture = {
          id: crypto.randomUUID(),
          name: textureName.trim(),
          base64: base64Data,
          mimeType: pendingFile.type || 'image/jpeg',
        };

        await handleTextureUpload(texture);

        // Select the newly uploaded texture
        setSelectedTexture(texture);
        onTextureSelect(texture);

        // Reset state
        setPendingFile(null);
        setTextureName('');
        setShowNameInput(false);
      };

      reader.readAsDataURL(pendingFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload texture';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setPendingFile(null);
    setTextureName('');
    setShowNameInput(false);
    setUploadError(null);
  };

  const handleSelectTexture = (texture: Texture) => {
    setSelectedTexture(texture);
    onTextureSelect(texture);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Select or Upload Texture</h2>

      {uploadError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md">
          <p className="font-bold">Upload Error</p>
          <p>{uploadError}</p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Available Textures</label>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {availableTextures.map((texture) => (
            <button
              key={texture.id}
              onClick={() => handleSelectTexture(texture)}
              className={`relative group overflow-hidden rounded-lg border-2 transition-all ${
                selectedTexture?.id === texture.id
                  ? 'border-blue-600 shadow-lg'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <img
                src={`data:${texture.mimeType};base64,${texture.base64}`}
                alt={texture.name}
                className="w-full h-24 object-cover group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                {selectedTexture?.id === texture.id && <div className="text-white text-2xl">✓</div>}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 text-center truncate">
                {texture.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Upload New Texture</label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading || showNameInput}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">Recommended: PNG or JPG, max 5MB</p>
      </div>

      {selectedTexture && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-blue-900">Selected Texture</p>
          <p className="text-sm text-blue-800">{selectedTexture.name}</p>
        </div>
      )}

      {/* Texture Name Input Modal */}
      {showNameInput && pendingFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Name Your Texture</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texture Name
                <span className="text-gray-500 text-xs ml-2">{textureName.length}/20</span>
              </label>
              <input
                type="text"
                value={textureName}
                onChange={(e) => setTextureName(e.target.value.substring(0, 20))}
                placeholder="Enter texture name (e.g., Faux Brick - Dark Red)"
                maxLength={20}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {uploadError && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
                {uploadError}
              </div>
            )}

            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">File Preview</p>
              <p className="text-sm text-gray-700">{pendingFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelUpload}
                disabled={isUploading}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isUploading || !textureName.trim()}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Uploading...
                  </>
                ) : (
                  'Upload Texture'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextureSelector;
