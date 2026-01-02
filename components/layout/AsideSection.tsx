import React from 'react';
import TaskSelector from '@/components/TaskSelector';

const AsideSection: React.FC = () => {
  return (
    <aside
      className="w-[240px] p-6 bg-white flex flex-col shadow-lg border-r border-gray-200"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      <TaskSelector />
    </aside>
  );
};

export default AsideSection;
