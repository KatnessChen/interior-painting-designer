import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GeminiTaskName } from '@/services/gemini/geminiTasks';
import { Color, Texture } from '@/types';

interface TaskState {
  // Task selection
  selectedTaskNames: GeminiTaskName[];

  // Task-specific options
  selectedColor: Color | null;
  selectedTexture: Texture | null;
}

const initialState: TaskState = {
  selectedTaskNames: [],
  selectedColor: null,
  selectedTexture: null,
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    // Task selection actions
    setSelectedTaskNames: (state, action: PayloadAction<GeminiTaskName[]>) => {
      state.selectedTaskNames = action.payload;
    },

    // Task option actions
    setSelectedColor: (state, action: PayloadAction<Color | null>) => {
      state.selectedColor = action.payload;
    },

    setSelectedTexture: (state, action: PayloadAction<Texture | null>) => {
      state.selectedTexture = action.payload;
    },

    // Reset all task-related state
    resetTaskState: (state) => {
      state.selectedTaskNames = [];
      state.selectedColor = null;
      state.selectedTexture = null;
    },
  },
});

export const { setSelectedTaskNames, setSelectedColor, setSelectedTexture, resetTaskState } =
  taskSlice.actions;

// Selectors
export const selectSelectedTaskNames = (state: { task: TaskState }) => state.task.selectedTaskNames;
export const selectSelectedColor = (state: { task: TaskState }) => state.task.selectedColor;
export const selectSelectedTexture = (state: { task: TaskState }) => state.task.selectedTexture;

export default taskSlice.reducer;
