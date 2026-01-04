/**
 * Centralized prompt templates for Gemini API requests
 * Organized by task type for easy expansion
 */

import { GeminiTask, GEMINI_TASKS } from './geminiTasks';

// ═══════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════

export const wallRecolorPrompts = (
  colorName: string | undefined,
  colorHex: string | undefined,
  customPrompt: string | undefined
) => `
  You are an expert interior designer and professional image editor specializing in photorealistic wall recoloring.

  Your task is to transform the walls in this interior photo to ${colorName} (HEX: ${colorHex}) with maximum visual impact and realism.

  CRITICAL INSTRUCTIONS:
  1. Change ALL wall surfaces to ${colorName || 'YOUR COLOR'} (HEX: ${colorHex || 'COLOR HEX'})
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

export const texturePrompts = (textureName: string, customPrompt: string | undefined) => `
  You are an expert interior designer and professional image editor specializing in applying textures to wall surfaces.

  You will receive TWO images:
  1. FIRST IMAGE: A texture sample (${textureName})
  2. SECOND IMAGE: An interior photo where you need to apply the texture

  Your task is to seamlessly apply the texture from the first image to the specified wall surface(s) in the interior photo, based on the user's instructions in the custom prompt.

  CRITICAL INSTRUCTIONS:
  1. Analyze the texture from the FIRST image carefully.
  2. Apply this texture ONLY to the specific wall surface(s) the user specifies in their custom instructions
  3. Leave all other walls and surfaces UNCHANGED - do not modify them
  4. Match texture direction and perspective to wall angles and lighting in the interior photo
  5. Blend the texture naturally with existing lighting, shadows, and 3D depth
  6. Preserve wall imperfections and maintain realistic appearance
  7. Ensure texture coverage is uniform and professional on the specified surface
  8. EXCLUDE: furniture, floor, ceiling, windows, doors, decorations, fixtures
  9. Maintain color consistency between the textured wall and original ambiance

  CUSTOM USER INSTRUCTIONS:
  ${customPrompt || ''}

  FINAL OUTPUT REQUIREMENT:
  Deliver: A high-quality, photorealistic image where the specified wall surface(s) display the ${textureName} texture (sampled from the first image) applied seamlessly and professionally, while all other walls and surfaces remain exactly as they were in the original interior photo.
`;

// ═══════════════════════════════════════════════════════════
// PROMPT SELECTOR
// ═══════════════════════════════════════════════════════════

/**
 * Get the appropriate prompt template based on task type
 * @param task - The task type (e.g., RECOLOR_WALL, ADD_TEXTURE)
 * @param options - Task-specific options (colorName, colorHex, textureName, customPrompt, etc.)
 * @returns The formatted prompt string
 */
export const getPromptByTask = (
  task: GeminiTask,
  options: {
    colorName?: string;
    colorHex?: string;
    textureName?: string;
    customPrompt?: string;
  }
): string => {
  const { colorName, colorHex, textureName, customPrompt } = options;

  switch (task.task_name) {
    case GEMINI_TASKS.RECOLOR_WALL.task_name:
      if (!colorName || !colorHex) {
        throw new Error('colorName and colorHex are required for RECOLOR_WALL task');
      }
      return wallRecolorPrompts(colorName, colorHex, customPrompt);

    case GEMINI_TASKS.ADD_TEXTURE.task_name:
      if (!textureName) {
        throw new Error('textureName is required for ADD_TEXTURE task');
      }
      return texturePrompts(textureName, customPrompt);

    default:
      throw new Error(`Unknown task: ${(task as any).task_name}`);
  }
};
