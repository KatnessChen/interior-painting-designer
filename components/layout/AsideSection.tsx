import React from 'react';

const AsideSection: React.FC = () => {
  return (
    <aside
      className="w-[240px] p-6 bg-white flex flex-col shadow-lg border-r border-gray-200"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      {/* This section is intentionally left blank after refactoring. */}
      {/* Project and Space management has been moved to Breadcrumb. */}
    </aside>
  );
};

export default AsideSection;
