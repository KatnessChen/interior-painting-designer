import React, { useRef, useState } from 'react';
import { ImageData } from '../types';
import { MAX_FILE_SIZE_MB } from '../constants';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface ImageUploaderProps {
  onImageUpload: (imageData: ImageData) => void;
  onError: (message: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // TODO: extract file upload handler to utils
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]); // Get base64 part only
        } else {
          reject('Failed to read file as base64');
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        onError('Please upload an image file (e.g., JPG, PNG, GIF).');
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        onError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        // Remove file extension from name
        const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const imageData: ImageData = {
          id: crypto.randomUUID(),
          name: fileName,
          base64: base64,
          mimeType: file.type,
        };
        onImageUpload(imageData);
      } catch (error) {
        onError('Failed to process image file.');
        console.error('File upload error:', error);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Upload Interior Photo</h2>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
                    ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <UploadIcon
          sx={{
            fontSize: 48,
            color: 'text.secondary',
            margin: '0 auto',
            display: 'block',
          }}
        />
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB</p>
      </div>
    </div>
  );
};

export default ImageUploader;
