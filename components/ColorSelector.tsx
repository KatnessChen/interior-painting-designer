import React, { useState, useEffect } from 'react';
import { BenjaminMooreColor } from '@/types';
import { BENJAMIN_MOORE_COLORS } from '@/constants';
import { Check as CheckIcon } from '@mui/icons-material';
import { Select, MenuItem, FormControl, InputLabel, Box, Button } from '@mui/material';
import AddColorModal from './AddColorModal';

interface ColorSelectorProps {
  title: string;
  selectedColor: BenjaminMooreColor | null;
  onSelectColor: (color: BenjaminMooreColor) => void;
}

// Reusable Color Option Display Component
const ColorOptionDisplay: React.FC<{
  color: BenjaminMooreColor;
  showCheckmark?: boolean;
}> = ({ color, showCheckmark = false }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <Box
        sx={{
          width: 80,
          height: 32,
          borderRadius: 1,
          border: '1px solid #d1d5db',
          backgroundColor: color.hex,
          flexShrink: 0,
        }}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{color.name}</Box>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          <span style={{ fontFamily: 'monospace' }}>{color.hex}</span>
          {color.notes && <span>{color.notes}</span>}
        </Box>
      </Box>
      {showCheckmark && <CheckIcon sx={{ fontSize: 18, color: '#3b82f6' }} />}
    </Box>
  );
};

const ColorSelector: React.FC<ColorSelectorProps> = ({ title, selectedColor, onSelectColor }) => {
  const [availableColors, setAvailableColors] =
    useState<BenjaminMooreColor[]>(BENJAMIN_MOORE_COLORS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom colors on component mount
  useEffect(() => {
    const loadCustomColors = async () => {
      try {
        const allColors = [...BENJAMIN_MOORE_COLORS];
        setAvailableColors(allColors);
      } catch (error) {
        console.error('Failed to load custom colors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomColors();
  }, []);

  const handleAddColor = (color: BenjaminMooreColor) => {
    // TODO: Persist custom colors to localStorage or Firestore to prevent loss on page refresh
    setAvailableColors((prevColors) => [...prevColors, color]);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6">
      <h2 className="text-lg mb-4 text-gray-800">{title}</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading colors...</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {/* Color Dropdown Selector */}
            <FormControl fullWidth>
              <InputLabel id="color-select-label">Select Color</InputLabel>
              <Select
                labelId="color-select-label"
                value={selectedColor?.id || ''}
                label="Select Color"
                onChange={(e) => {
                  const color = availableColors.find((c) => c.id === e.target.value);
                  if (color) onSelectColor(color);
                }}
                renderValue={(value) => {
                  const color = availableColors.find((c) => c.id === value);
                  if (!color) return '';
                  return <ColorOptionDisplay color={color} />;
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 400,
                    },
                  },
                }}
              >
                {availableColors.map((color) => (
                  <MenuItem key={color.id} value={color.id}>
                    <ColorOptionDisplay
                      color={color}
                      showCheckmark={selectedColor?.id === color.id}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Add Color Button */}
            <Button
              variant="outlined"
              onClick={() => setIsModalOpen(true)}
              sx={{ alignSelf: 'flex-end' }}
            >
              Add Custom Color
            </Button>
          </div>

          {/* Add Color Modal */}
          <AddColorModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddColor}
            existingColors={availableColors}
          />
        </>
      )}
    </div>
  );
};

export default ColorSelector;
