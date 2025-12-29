import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Color } from '@/types';
import { BENJAMIN_MOORE_COLORS } from '@/constants';
import { Check as CheckIcon } from '@mui/icons-material';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import AddColorModal from './AddColorModal';
import { useCustomColors } from '@/hooks/useCustomColors';
import { RootState } from '@/stores/store';

interface ColorSelectorProps {
  title?: string;
  selectedColor: Color | null;
  onSelectColor: (color: Color) => void;
}

// Reusable Color Option Display Component
const ColorOptionDisplay: React.FC<{
  color: Color;
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

const ColorSelector: React.FC<ColorSelectorProps> = ({
  title = 'Select New Wall Color',
  selectedColor,
  onSelectColor,
}) => {
  const activeProjectId = useSelector((state: RootState) => state.project.activeProjectId);
  const { customColors, isLoadingColors, addColor } = useCustomColors(activeProjectId);
  const [isAddColorModalOpen, setIsAddColorModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const availableColors = [...customColors, ...BENJAMIN_MOORE_COLORS];

  const handleAddColor = async (color: Color) => {
    try {
      setError(null);
      const newColor = await addColor({
        name: color.name,
        hex: color.hex,
        notes: color.notes,
      });

      onSelectColor(newColor);
      setIsAddColorModalOpen(false);
      setToast({
        open: true,
        message: `Color "${newColor.name}" added successfully!`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to save custom color:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save custom color. Please try again.';
      setError(errorMessage);
      setToast({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  return (
    <div>
      <Typography variant="h6" gutterBottom fontWeight="medium">
        {title}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoadingColors ? (
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
              onClick={() => setIsAddColorModalOpen(true)}
              sx={{ alignSelf: 'flex-end' }}
            >
              Add Custom Color
            </Button>
          </div>

          {/* Add Color Modal */}
          {isAddColorModalOpen && (
            <AddColorModal
              open={isAddColorModalOpen}
              onClose={() => setIsAddColorModalOpen(false)}
              onAdd={handleAddColor}
              existingColors={availableColors}
            />
          )}
        </>
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ColorSelector;
