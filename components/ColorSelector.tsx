import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Select, Typography, Button, Alert, Space } from 'antd';
import { Color } from '@/types';
import { BENJAMIN_MOORE_COLORS } from '@/constants';
import { Box, Snackbar } from '@mui/material';
import AddColorModal from './AddColorModal';
import { useCustomColors } from '@/hooks/useCustomColors';
import { RootState } from '@/stores/store';

interface ColorSelectorProps {
  title?: string;
  selectedColor: Color | null;
  onSelectColor: (color: Color) => void;
}

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
        description: color.description,
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
      <Typography.Title level={5} className="mb-2 mt-0" style={{ margin: 0 }}>
        {title}
      </Typography.Title>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoadingColors ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading colors...</span>
        </div>
      ) : (
        <Space orientation="vertical" style={{ width: '100%' }} size="small">
          {/* Color Select */}
          <Select
            placeholder="Select a color"
            size="large"
            value={selectedColor?.id || undefined}
            onChange={(value) => {
              const color = availableColors.find((c) => c.id === value);
              if (color) onSelectColor(color);
            }}
            options={availableColors.map((color) => ({
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      border: '1px solid #d1d5db',
                      backgroundColor: color.hex,
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                      {color.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {color.hex}
                      {color.description && ` • ${color.description}`}
                    </div>
                  </Box>
                </Box>
              ),
              value: color.id,
            }))}
            style={{ width: '100%' }}
          />

          {/* Add Color Button */}
          <Button type="dashed" size="large" block onClick={() => setIsAddColorModalOpen(true)}>
            Add Custom Color
          </Button>

          {/* Add Color Modal */}
          {isAddColorModalOpen && (
            <AddColorModal
              open={isAddColorModalOpen}
              onClose={() => setIsAddColorModalOpen(false)}
              onAdd={handleAddColor}
              existingColors={availableColors}
            />
          )}
        </Space>
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
          message={toast.message}
        />
      </Snackbar>
    </div>
  );
};

export default ColorSelector;
