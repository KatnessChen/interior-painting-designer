/**
 * Centralized prompt templates for Gemini API requests
 * Organized by task type for easy expansion
 */

import { GeminiTask, GEMINI_TASKS } from './geminiTasks';

// ═══════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════

export const wallRecolorPrompts = (
  colorName: string,
  colorHex: string,
  customPrompt: string | undefined
) => `
  You are an expert interior designer and professional image editor specializing in photorealistic wall recoloring.

  Your task is to transform the walls in this interior photo to ${colorName} (HEX: ${colorHex}) with maximum visual impact and realism.

  CRITICAL INSTRUCTIONS:
  1. Change ALL wall surfaces to ${colorName} (HEX: ${colorHex})
  2. Apply UNIFORM color transformation across 100% of wall areas
  3. Preserve authentic lighting, shadows, and 3D depth on walls
  4. Maintain original lighting direction and intensity
  5. Retain wall texture, grain, and surface details
  6. EXCLUDE: furniture, floor, ceiling, windows, doors, decorations, fixtures
  7. Ensure saturation and brightness match realistic matte/semi-gloss paint
  ${
    customPrompt
      ? `CUSTOM USER INSTRUCTIONS (THESE TAKE PRIORITY):
     ${customPrompt}
    `
      : ''
  }
  FINAL OUTPUT REQUIREMENT:
  Deliver: A high-quality, photorealistic recolored image where ALL walls display ${colorName} (${colorHex}) with maximum visual distinction from the original.
`;

export const texturePrompts = {
  // TODO: Add texture enhancement prompts
};

// ═══════════════════════════════════════════════════════════
// PROMPT SELECTOR
// ═══════════════════════════════════════════════════════════

/**
 * Get the appropriate prompt template based on task type
 * @param task - The task type (e.g., RECOLOR_WALL, ADD_TEXTURE)
 * @param colorName - Color name (required for recolor tasks)
 * @param colorHex - Color hex code (required for recolor tasks)
 * @param customPrompt - Custom user instructions (optional for recolor tasks)
 * @returns The formatted prompt string
 */
export const getPromptByTask = (
  task: GeminiTask,
  options: {
    colorName?: string;
    colorHex?: string;
    customPrompt?: string;
  }
): string => {
  const { colorName, colorHex, customPrompt } = options;

  switch (task) {
    case GEMINI_TASKS.RECOLOR_WALL:
      if (!colorName || !colorHex) {
        throw new Error('colorName and colorHex are required for RECOLOR_WALL task');
      }
      return wallRecolorPrompts(colorName, colorHex, customPrompt);

    case GEMINI_TASKS.ADD_TEXTURE:
      // TODO: Implement ADD_TEXTURE prompt selection
      throw new Error('ADD_TEXTURE task not yet implemented');

    default:
      const exhaustiveCheck: never = task;
      return exhaustiveCheck;
  }
};
