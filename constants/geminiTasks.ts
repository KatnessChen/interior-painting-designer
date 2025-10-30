/**
 * Gemini API Task Types
 * Use these constants to specify which task/prompt template to use
 */

export const GEMINI_TASKS = {
  RECOLOR_WALL: 'recolor_wall',
  ADD_TEXTURE: 'add_texture',
  ADJUST_LIGHTING: 'adjust_lighting',
  ADD_DECORATION: 'add_decoration',
  // Add more tasks as needed
} as const;

export type GeminiTask = (typeof GEMINI_TASKS)[keyof typeof GEMINI_TASKS];
