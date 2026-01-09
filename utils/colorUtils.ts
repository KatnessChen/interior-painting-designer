import { Color } from '@/types';

/**
 * Calculate hue value from hex color (0-360 degrees)
 */
export const getHue = (hexColor: string): number => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      hue = ((b - r) / delta + 2) / 6;
    } else {
      hue = ((r - g) / delta + 4) / 6;
    }
  }

  return hue * 360;
};

/**
 * Calculate saturation value from hex color (0-1)
 */
export const getSaturation = (hexColor: string): number => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max === 0) return 0;
  return (max - min) / max;
};

/**
 * Calculate lightness/luminance value from hex color (0-1)
 */
export const getLightness = (hexColor: string): number => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/**
 * Determine color category for sorting
 * 0: White, 1: Color, 2: Black
 */
export const getColorCategory = (hexColor: string): number => {
  const saturation = getSaturation(hexColor);
  const lightness = getLightness(hexColor);

  // Low saturation means it's grayscale (white, gray, black)
  if (saturation < 0.1) {
    if (lightness > 0.85) return 0; // White
    if (lightness < 0.2) return 2; // Black
    return 1; // Gray - treat as color
  }

  return 1; // Color
};

/**
 * Sort colors by spectrum: white first, then by hue, then black last
 */
export const sortColorsBySpectrum = (colors: Color[]): Color[] => {
  return [...colors].sort((a, b) => {
    const categoryA = getColorCategory(a.hex);
    const categoryB = getColorCategory(b.hex);

    // Different categories
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    // Same category - sort by hue
    if (categoryA === 1) {
      return getHue(a.hex) - getHue(b.hex);
    }

    // For white and black, no need to sort further
    return 0;
  });
};

/**
 * Determine text color based on background luminance
 * Returns dark text for light backgrounds, white text for dark backgrounds
 */
export const getTextColor = (hexColor: string): string => {
  const lightness = getLightness(hexColor);
  return lightness > 0.5 ? '#111827' : '#ffffff';
};
