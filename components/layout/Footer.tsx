import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>© {currentYear} Vizion. All rights reserved.</p>
          <p className="font-semibold">v.0.3.0</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
