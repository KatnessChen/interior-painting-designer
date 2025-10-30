import React, { useState } from 'react';
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { wallRecolorPrompts } from '@/services/gemini/prompts';

interface CustomPromptModalProps {
  isOpen: boolean;
  onConfirm: (prompt: string) => void;
  onCancel: () => void;
  colorName: string;
  colorHex: string;
}

const CustomPromptModal: React.FC<CustomPromptModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  colorName,
  colorHex,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isDefaultPromptExpanded, setIsDefaultPromptExpanded] = useState<boolean>(false);

  const handleConfirm = () => {
    onConfirm(prompt);
    setPrompt('');
  };

  const handleCancel = () => {
    setPrompt('');
    onCancel();
  };

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
          Fine-tune the recoloring to control exactly how your walls appear in{' '}
          <span className="font-semibold">{colorName}</span>. Leave blank to use the default
          settings.
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

        <div className="mb-6">
          <button
            onClick={() => setIsDefaultPromptExpanded(!isDefaultPromptExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <p className="text-xs font-semibold text-gray-700">Default Prompt</p>
            <ExpandMoreIcon
              sx={{
                fontSize: 20,
                color: 'text.secondary',
                transform: isDefaultPromptExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isDefaultPromptExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-1 bg-gray-50 rounded-lg border border-gray-200 border-t-0 rounded-t-none">
              <pre className="text-xs text-gray-600 leading-relaxed overflow-scroll">
                {wallRecolorPrompts(colorName, colorHex, undefined)}
              </pre>
            </div>
          </div>
        </div>

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
