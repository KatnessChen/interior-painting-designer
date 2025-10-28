import React, { useRef, useState } from "react";
import { ImageData } from "../types";
import { MAX_FILE_SIZE_MB } from "../constants";

interface UploadCardProps {
  onImageUpload: (imageData: ImageData) => void;
  onError: (message: string) => void;
}

const UploadCard: React.FC<UploadCardProps> = ({ onImageUpload, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]); // Get base64 part only
        } else {
          reject("Failed to read file as base64");
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        onError("Please upload an image file (e.g., JPG, PNG, GIF).");
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        onError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        const imageData: ImageData = {
          id: crypto.randomUUID(),
          name: file.name,
          base64: base64,
          mimeType: file.type,
        };
        onImageUpload(imageData);
      } catch (error) {
        onError("Failed to process image file.");
        console.error("File upload error:", error);
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
    <div
      className={`relative group rounded-lg overflow-hidden shadow-md bg-white transition-all duration-200 cursor-pointer hover:shadow-lg
                  ${isDragOver ? "ring-2 ring-blue-500" : ""}`}
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

      {/* Upload area matching ImageCard height */}
      <div className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-t-lg hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all duration-200">
        <svg
          className="h-12 w-12 text-gray-400 group-hover:text-blue-400 transition-colors"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4V8m-12 8h.02"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600 group-hover:text-blue-600 transition-colors font-semibold">
          Click or Drop
        </p>
        <p className="text-xs text-gray-500 mt-1">{MAX_FILE_SIZE_MB}MB max</p>
      </div>

      {/* Info section matching ImageCard layout */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 text-center">
          Add Photo
        </p>
      </div>
    </div>
  );
};

export default UploadCard;
