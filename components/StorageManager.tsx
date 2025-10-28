import React, { useEffect, useState } from 'react';
import { Close as CloseIcon } from '@mui/icons-material';
import { useStorage } from '../hooks/useStorage';

interface StorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const StorageManager: React.FC<StorageManagerProps> = ({ isOpen, onClose }) => {
  const { storageInfo, isLoading, error, refreshStorageInfo, clearAllData } = useStorage();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshStorageInfo();
    }
  }, [isOpen, refreshStorageInfo]);

  const handleClearData = async () => {
    setIsClearing(true);
    const success = await clearAllData();
    setIsClearing(false);
    setShowConfirmClear(false);

    if (success) {
      // Close the modal after successful clear
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Storage Manager</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <CloseIcon sx={{ fontSize: 24, color: 'inherit' }} />
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading storage info...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Storage Info Section */}
          {storageInfo && !isLoading && (
            <>
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Storage Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custom Colors:</span>
                      <span className="font-medium">{storageInfo.customColorsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Original Photos:</span>
                      <span className="font-medium">{storageInfo.originalImagesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Updated Photos:</span>
                      <span className="font-medium">{storageInfo.updatedImagesCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Actions */}
              <div className="space-y-3">
                <button
                  onClick={refreshStorageInfo}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Refresh Storage Info
                </button>

                {!showConfirmClear ? (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                  >
                    Clear All Data
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800 font-medium mb-2">⚠️ Are you sure?</p>
                      <p className="text-xs text-red-600">
                        This will permanently delete all your custom colors, original photos, and
                        updated photos. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowConfirmClear(false)}
                        disabled={isClearing}
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearData}
                        disabled={isClearing}
                        className="flex-1 px-3 py-2 border border-red-300 text-white bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {isClearing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Clearing...
                          </>
                        ) : (
                          'Delete All'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageManager;
