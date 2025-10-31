import React from 'react';
import { CircularProgress } from '@mui/material';
import { ColorLens as RecolorIcon } from '@mui/icons-material';
import { GeminiTask, getTaskEntry } from '../services/gemini/geminiTasks';

interface ProcessButtonProps {
  isEnabled: boolean;
  isProcessing: boolean;
  selectedTaskName: GeminiTask;
  onProcess: (customPrompt?: string) => void;
  onOpenCustomPrompt: () => void;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({
  isEnabled,
  isProcessing,
  selectedTaskName,
  onOpenCustomPrompt,
}) => {
  const [_, task] = getTaskEntry(selectedTaskName);

  const getButtonLabel = () => {
    if (isProcessing) return 'Processing...';

    if (task) return task.label_name;

    return 'Process';
  };

  return (
    <div className="sticky bottom-4 w-full flex justify-center p-2">
      <button
        onClick={onOpenCustomPrompt}
        disabled={!isEnabled}
        className={`px-8 py-4 text-xl font-semibold rounded-full shadow-lg transition-all duration-300
                    flex items-center justify-center space-x-2
                    ${
                      isEnabled
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-blue-300'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
      >
        {isProcessing ? (
          <>
            <CircularProgress size={24} sx={{ color: 'white', marginRight: 1, marginLeft: -0.5 }} />
            Processing...
          </>
        ) : (
          <>
            <RecolorIcon sx={{ fontSize: 28, marginRight: 0.5 }} />
            {getButtonLabel()}
          </>
        )}
      </button>
    </div>
  );
};

export default ProcessButton;
