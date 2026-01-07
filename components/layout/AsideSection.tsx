import React from 'react';
import TaskSelector from '@/components/TaskSelector';
import SelectedAssets from '@/components/SelectedAssets';
import ToolkitPanel from './ToolkitPanel';

const AsideSection: React.FC = () => {
  return (
    <aside className="h-full w-[250px] bg-white flex flex-col shadow-lg border-r border-gray-200 overflow-y-auto gap-6">
      <TaskSelector />

      <div className="px-6">
        <SelectedAssets />
      </div>

      {/* Toolkit Panel at the bottom */}
      <div className="mt-auto border-t border-gray-200">
        <ToolkitPanel />
      </div>
    </aside>
  );
};

export default AsideSection;
