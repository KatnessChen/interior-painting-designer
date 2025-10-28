import React, { useState } from 'react';
import { Close as CloseIcon } from '@mui/icons-material';

interface CustomPromptModalProps {
  isOpen: boolean;
  onConfirm: (prompt: string) => void;
  onCancel: () => void;
  colorName: string;
}

const CustomPromptModal: React.FC<CustomPromptModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  colorName,
}) => {
  const [prompt, setPrompt] = useState<string>('');

  const handleConfirm = () => {
    onConfirm(prompt);
    setPrompt('');
  };

  const handleCancel = () => {
    setPrompt('');
    onCancel();
  };

  // const defaultPrompt = `You are an expert interior designer and professional image editor specializing in photorealistic wall recoloring. Transform the walls in this interior photo to ${colorName} with maximum visual impact and realism. Preserve authentic lighting, shadows, and texture. Exclude furniture, floor, ceiling, windows, doors, and decorations.`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Customize Recolor Prompt</h3>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 24 }} />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Customize the prompt to control how Gemini recolors your walls to{' '}
          <span className="font-semibold">{colorName}</span>. Leave blank to use the default prompt.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Prompt (Optional)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your custom prompt here..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            Tip: Include specific instructions like "make the walls warm/cool", "preserve artwork on
            walls", or "make the color rich and saturated"
          </p>
        </div>

        {/* <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Default Prompt:
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            {defaultPrompt}
          </p>
        </div> */}

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {prompt.trim() ? 'Use Custom Prompt' : 'Use Default Prompt'}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPromptModal;
