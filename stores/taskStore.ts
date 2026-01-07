import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GeminiTaskName } from '@/services/gemini/geminiTasks';
import { Color, Texture, Item, ImageData } from '@/types';

interface TaskState {
  // Task selection
  selectedTaskNames: GeminiTaskName[];

  // Task-specific options
  selectedColor: Color | null;
  selectedTexture: Texture | null;
  selectedItem: Item | null;

  // Generate modal state
  sourceImage: ImageData | null;
}

const initialState: TaskState = {
  selectedTaskNames: [],
  selectedColor: null,
  selectedTexture: null,
  selectedItem: null,
  sourceImage: null,
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

    setSelectedItem: (state, action: PayloadAction<Item | null>) => {
      state.selectedItem = action.payload;
    },

    // Generate modal actions
    setSourceImage: (state, action: PayloadAction<ImageData | null>) => {
      state.sourceImage = action.payload;
    },

    // Reset all task-related state
    resetTaskState: (state) => {
      state.selectedTaskNames = [];
      state.selectedColor = null;
      state.selectedTexture = null;
      state.selectedItem = null;
      state.sourceImage = null;
    },
  },
});

export const {
  setSelectedTaskNames,
  setSelectedColor,
  setSelectedTexture,
  setSelectedItem,
  setSourceImage,
  resetTaskState,
} = taskSlice.actions;

// Selectors
export const selectSelectedTaskNames = (state: { task: TaskState }) => state.task.selectedTaskNames;
export const selectSelectedColor = (state: { task: TaskState }) => state.task.selectedColor;
export const selectSelectedTexture = (state: { task: TaskState }) => state.task.selectedTexture;
export const selectSelectedItem = (state: { task: TaskState }) => state.task.selectedItem;
export const selectSourceImage = (state: { task: TaskState }) => state.task.sourceImage;

export default taskSlice.reducer;
