import React, { useState } from 'react';
import { BenjaminMooreColor } from '../types';
import { BENJAMIN_MOORE_COLORS } from '../constants';

interface ColorSelectorProps {
  selectedColor: BenjaminMooreColor | null;
  onSelectColor: (color: BenjaminMooreColor) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ selectedColor, onSelectColor }) => {
  const [availableColors, setAvailableColors] = useState<BenjaminMooreColor[]>(BENJAMIN_MOORE_COLORS);
  const [newColorName, setNewColorName] = useState('');
  const [newColorCode, setNewColorCode] = useState('');
  const [newColorHex, setNewColorHex] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddColor = () => {
    setAddError(null);
    if (!newColorName.trim() || !newColorCode.trim() || !newColorHex.trim()) {
      setAddError('All fields are required.');
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/i.test(newColorHex.trim())) { // Case-insensitive hex check
      setAddError('HEX code must be in the format #RRGGBB (e.g., #FFFFFF).');
      return;
    }

    const newColor: BenjaminMooreColor = {
      name: newColorName.trim(),
      code: newColorCode.trim(),
      hex: newColorHex.trim().toUpperCase(), // Store in uppercase for consistency
    };

    // Check for duplicates by code or hex
    if (availableColors.some(c => c.code === newColor.code || c.hex.toLowerCase() === newColor.hex.toLowerCase())) {
      setAddError('A color with this code or HEX already exists.');
      return;
    }

    setAvailableColors(prevColors => [...prevColors, newColor]);
    setNewColorName('');
    setNewColorCode('');
    setNewColorHex('');
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Select a Benjamin Moore Color</h2>
      {/* Adjusted grid for full compactness, no gaps */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-13 gap-0">
        {availableColors.map((color) => (
          <div
            key={color.code}
            // Removed horizontal padding and hover effect to ensure no visual gaps, minimal vertical padding
            className={`flex flex-col items-center px-0 py-1 cursor-pointer transition-all duration-200
                        ${selectedColor?.code === color.code ? 'relative z-10 ring-2 ring-blue-500 ring-offset-0' : ''}`}
            onClick={() => onSelectColor(color)}
          >
            <div
              className="w-8 h-8 rounded-sm border border-gray-300 shadow-sm flex items-center justify-center"
              style={{ backgroundColor: color.hex }}
            >
              {selectedColor?.code === color.code && (
                <svg className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700 text-center leading-tight">{color.name}</p>
            <p className="text-xs text-gray-500 text-center">{color.code}</p>
          </div>
        ))}
      </div>
      {selectedColor && (
        <p className="mt-4 text-center text-md text-gray-700">
          Selected: <span className="font-semibold" style={{ color: selectedColor.hex }}>{selectedColor.name}</span> ({selectedColor.code})
        </p>
      )}

      {/* New section for adding custom colors */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Add Custom Color</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="newColorName" className="block text-sm font-medium text-gray-700">Color Name</label>
            <input
              type="text"
              id="newColorName"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="e.g., Sky Blue"
              aria-label="New color name"
            />
          </div>
          <div>
            <label htmlFor="newColorCode" className="block text-sm font-medium text-gray-700">Color Code</label>
            <input
              type="text"
              id="newColorCode"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              value={newColorCode}
              onChange={(e) => setNewColorCode(e.target.value)}
              placeholder="e.g., SB-001"
              aria-label="New color code"
            />
          </div>
          <div>
            <label htmlFor="newColorHex" className="block text-sm font-medium text-gray-700">HEX Code</label>
            <input
              type="text"
              id="newColorHex"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              value={newColorHex}
              onChange={(e) => setNewColorHex(e.target.value)}
              placeholder="e.g., #87CEEB"
              aria-label="New color HEX code"
            />
          </div>
          {addError && (
            <p className="text-sm text-red-600 mt-2" role="alert">{addError}</p>
          )}
          <button
            onClick={handleAddColor}
            className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Color
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorSelector;