import React from 'react';
import Tooltip from '@mui/material/Tooltip';

const AsideSection: React.FC = () => {
  return (
    <aside className="w-[240px] bg-indigo-200 shadow-lg border-r border-slate-200 p-6">
      <Tooltip title="Add a Home to organize your images" arrow>
        <button className="w-full py-2 px-4 bg-indigo-400 hover:bg-indigo-600 text-white rounded-md font-semibold transition">
          Add Home
        </button>
      </Tooltip>
    </aside>
  );
};

export default AsideSection;
