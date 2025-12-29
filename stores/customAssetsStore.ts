import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Color } from '@/types';

interface ProjectCustomAssets {
  customColors: Color[];
  isLoadingColors: boolean;
  loadColorsError: string | null;
}

interface CustomAssetsState {
  // Key: projectId, Value: project's custom assets
  projects: {
    [projectId: string]: ProjectCustomAssets;
  };
}

const initialState: CustomAssetsState = {
  projects: {},
};

// Helper function to get or create project assets state
const getOrCreateProjectAssets = (
  state: CustomAssetsState,
  projectId: string
): ProjectCustomAssets => {
  if (!state.projects[projectId]) {
    state.projects[projectId] = {
      customColors: [],
      isLoadingColors: false,
      loadColorsError: null,
    };
  }
  return state.projects[projectId];
};

export const customAssetsStore = createSlice({
  name: 'customAssets',
  initialState,
  reducers: {
    // Custom Colors
    setCustomColors: (state, action: PayloadAction<{ projectId: string; colors: Color[] }>) => {
      const projectAssets = getOrCreateProjectAssets(state, action.payload.projectId);
      projectAssets.customColors = action.payload.colors;
      projectAssets.isLoadingColors = false;
      projectAssets.loadColorsError = null;
    },

    addCustomColor: (state, action: PayloadAction<{ projectId: string; color: Color }>) => {
      const projectAssets = getOrCreateProjectAssets(state, action.payload.projectId);
      projectAssets.customColors.unshift(action.payload.color);
    },

    updateCustomColor: (
      state,
      action: PayloadAction<{
        projectId: string;
        colorId: string;
        updates: Partial<Color>;
      }>
    ) => {
      const projectAssets = getOrCreateProjectAssets(state, action.payload.projectId);
      const index = projectAssets.customColors.findIndex((c) => c.id === action.payload.colorId);
      if (index !== -1) {
        projectAssets.customColors[index] = {
          ...projectAssets.customColors[index],
          ...action.payload.updates,
        };
      }
    },

    removeCustomColor: (state, action: PayloadAction<{ projectId: string; colorId: string }>) => {
      const projectAssets = getOrCreateProjectAssets(state, action.payload.projectId);
      projectAssets.customColors = projectAssets.customColors.filter(
        (c) => c.id !== action.payload.colorId
      );
    },

    // Loading states
    setLoadingColors: (
      state,
      action: PayloadAction<{ projectId: string; isLoadingColors: boolean }>
    ) => {
      const projectAssets = getOrCreateProjectAssets(state, action.payload.projectId);
      projectAssets.isLoadingColors = action.payload.isLoadingColors;
    },

    setLoadColorsError: (
      state,
      action: PayloadAction<{ projectId: string; error: string | null }>
    ) => {
      const projectAssets = getOrCreateProjectAssets(state, action.payload.projectId);
      projectAssets.loadColorsError = action.payload.error;
      projectAssets.isLoadingColors = false;
    },

    // Clear state for a specific project
    clearProjectAssets: (state, action: PayloadAction<string>) => {
      delete state.projects[action.payload];
    },

    // Clear state for all projects
    clearAllAssets: (state) => {
      state.projects = {};
    },
  },
});

export const {
  setCustomColors,
  addCustomColor,
  updateCustomColor,
  removeCustomColor,
  setLoadingColors,
  setLoadColorsError,
  clearProjectAssets,
  clearAllAssets,
} = customAssetsStore.actions;

export default customAssetsStore.reducer;
