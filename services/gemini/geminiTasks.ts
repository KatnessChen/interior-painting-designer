/**
 * Gemini API Task Types
 * Use these constants to specify which task/prompt template to use
 */

export const GEMINI_TASKS = {
  RECOLOR_WALL: {
    task_name: 'recolor_wall',
    customPromptRequired: false,
  },
  ADD_TEXTURE: {
    task_name: 'add_texture',
    customPromptRequired: true,
  },
  // Add more tasks as needed
} as const;

export type GeminiTask = (typeof GEMINI_TASKS)[keyof typeof GEMINI_TASKS];
export type GeminiTaskName = GeminiTask['task_name'];
