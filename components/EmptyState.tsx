import React from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Space Yet',
  message = 'Create or select a space to get started!',
  icon = '💡',
}) => {
  return (
    <div className="h-full -mt-8 bg-gray-100 p-6 flex items-center justify-center">
      <div className="container mx-auto max-w-2xl text-center">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl text-gray-800 mb-4">{title}</h2>
          <div className="inline-block bg-indigo-50 border-l-4 border-indigo-600 p-4">
            <p className="text-sm text-indigo-800">
              {icon} {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
