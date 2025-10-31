/**
 * Gemini API Task Types
 * Use these constants to specify which task/prompt template to use
 */

export const GEMINI_TASKS = {
  RECOLOR_WALL: {
    task_name: 'recolor_wall',
    label_name: 'Recolor Walls',
    customPromptRequired: false,
  },
  ADD_TEXTURE: {
    task_name: 'add_texture',
    label_name: 'Add Texture',
    customPromptRequired: true,
  },
  // Add more tasks as needed
} as const;

export type GeminiTask = (typeof GEMINI_TASKS)[keyof typeof GEMINI_TASKS];
export type GeminiTaskName = GeminiTask['task_name'];

/**
 * Helper function to find a task entry by task_name
 * @param taskName - The task_name value to search for
 * @returns The task entry [key, task] or undefined if not found
 */
export const getTaskEntry = (taskName: GeminiTaskName) => {
  return Object.entries(GEMINI_TASKS).find(([_, task]) => task.task_name === taskName);
};
