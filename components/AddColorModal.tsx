import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import { Color } from '@/types';

interface AddColorModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (color: Color) => void;
  existingColors: Color[];
}

// Convert RGB/RGBA format to HEX format
const rgbaToHex = (rgba: string): string | null => {
  const match = rgba.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  // Validate RGB values are in range 0-255
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return null;
  }

  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Validate and normalize color input (accepts HEX or RGB/RGBA format)
const normalizeColorInput = (input: string): string | null => {
  const trimmed = input.trim();

  // Check if it's HEX format
  if (/^#[0-9A-Fa-f]{6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Check if it's RGB/RGBA format
  const hexFromRgba = rgbaToHex(trimmed);
  if (hexFromRgba) {
    return hexFromRgba;
  }

  return null;
};

const DEFAULT_COLOR_PICKER_VALUE = '#FFFFF0';
const MAX_COLOR_NAME_LENGTH = 15;
const MAX_NOTES_LENGTH = 50;

const AddColorModal: React.FC<AddColorModalProps> = ({ open, onClose, onAdd, existingColors }) => {
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    hex?: string;
    notes?: string;
  }>({});

  const handleClose = () => {
    // Reset form
    setColorName('');
    setColorHex('');
    setNotes('');
    setErrors({});
    onClose();
  };

  const handleReset = () => {
    setColorName('');
    setColorHex('');
    setNotes('');
    setErrors({});
  };

  // Handle color name input; rely on validateForm for length enforcement
  const handleColorNameChange = (value: string) => {
    setColorName(value);
  };

  // Handle notes input; rely on validateForm for length enforcement
  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  // ...
  // (rest of the component remains unchanged)
  // ...
  const validateForm = (): boolean => {
    const newErrors: { name?: string; hex?: string; notes?: string } = {};

    // Validate Color Name (required, max 15 characters)
    if (!colorName.trim()) {
      newErrors.name = 'Color name is required';
    } else if (colorName.trim().length > MAX_COLOR_NAME_LENGTH) {
      newErrors.name = `Color name must be ${MAX_COLOR_NAME_LENGTH} characters or less`;
    } else if (
      existingColors.some((c) => c.name.toLowerCase() === colorName.trim().toLowerCase())
    ) {
      newErrors.name = 'A color with this name already exists';
    }

    // Validate HEX (required)
    if (!colorHex.trim()) {
      newErrors.hex = 'Color value is required';
    } else {
      const normalizedHex = normalizeColorInput(colorHex.trim());
      if (!normalizedHex) {
        newErrors.hex =
          'Color must be in HEX (#RRGGBB) or RGB/RGBA (rgb(r,g,b) or rgba(r,g,b,a)) format';
      }
    }

    // Validate Notes (optional, max 50 characters)
    if (notes.length > MAX_NOTES_LENGTH) {
      newErrors.notes = `Notes must be ${MAX_NOTES_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) {
      return;
    }

    const normalizedHex = normalizeColorInput(colorHex.trim());
    if (!normalizedHex) return;

    const newColor: Color = {
      id: crypto.randomUUID(),
      name: colorName.trim(),
      hex: normalizedHex,
      notes: notes.trim() || '',
    };

    // Check for duplicates by hex
    if (existingColors.some((c) => c.hex.toLowerCase() === newColor.hex.toLowerCase())) {
      setErrors({ hex: 'A color with this HEX value already exists' });
      return;
    }

    onAdd(newColor);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Custom Color</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Color Name"
            value={colorName}
            onChange={(e) => handleColorNameChange(e.target.value)}
            error={!!errors.name}
            helperText={errors.name || `${colorName.length}/${MAX_COLOR_NAME_LENGTH} characters`}
            required
            fullWidth
            placeholder="e.g., Sky Blue"
          />

          <Box>
            <TextField
              label="Color Value"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              error={!!errors.hex}
              helperText={errors.hex || 'Accepts HEX (#RRGGBB) or RGB/RGBA format'}
              required
              fullWidth
              placeholder="e.g., #87CEEB or rgba(135, 206, 235, 1)"
              InputProps={{
                startAdornment: (
                  <input
                    type="color"
                    value={normalizeColorInput(colorHex) || DEFAULT_COLOR_PICKER_VALUE}
                    onChange={(e) => setColorHex(e.target.value)}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '8px',
                    }}
                  />
                ),
              }}
            />
          </Box>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            error={!!errors.notes}
            helperText={errors.notes || `${notes.length}/${MAX_NOTES_LENGTH} characters`}
            fullWidth
            multiline
            rows={2}
            placeholder="Optional notes (max 50 characters)"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleReset} color="primary" variant="outlined">
          Reset
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleAdd} variant="contained">
          Add Color
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddColorModal;
