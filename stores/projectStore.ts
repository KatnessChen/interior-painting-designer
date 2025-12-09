import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { imageDownloadUrlToBase64 } from '@/utils';
import { Project } from '@/types';

/**
 * Traverse all projects > spaces > images and pre-cache their base64 data
 * This runs in the background without blocking the Redux state update
 */
async function cacheAllImageBase64s(projects: Project[]): Promise<void> {
  const totalImages = projects.reduce(
    (sum, project) =>
      sum + project.spaces.reduce((spaceSum, space) => spaceSum + space.images.length, 0),
    0
  );

  if (totalImages === 0) {
    console.log('[Cache] No images to cache');
    return;
  }

  console.log(`[Cache] Starting to cache ${totalImages} images...`);
  let cachedCount = 0;

  for (const project of projects) {
    for (const space of project.spaces) {
      for (const image of space.images) {
        try {
          // Fire and forget - we don't need to wait for each one sequentially
          // But we'll track progress
          imageDownloadUrlToBase64(image.imageDownloadUrl)
            .then(() => {
              cachedCount++;
              if (cachedCount % 5 === 0) {
                console.log(`[Cache] Progress: ${cachedCount}/${totalImages} images cached`);
              }
            })
            .catch((error) => {
              console.warn(`[Cache] Failed to cache image ${image.id}:`, error);
            });
        } catch (error) {
          console.warn(`[Cache] Error caching image ${image.id}:`, error);
        }
      }
    }
  }

  console.log(`[Cache] Queued ${totalImages} images for caching`);
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  activeSpaceId: string | null;
}

const initialState: ProjectState = {
  projects: [],
  activeProjectId: null,
  activeSpaceId: null,
};

export const projectStore = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Projects actions
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;

      // Kick off async images caching in the background without blocking state update
      void cacheAllImageBase64s(action.payload);
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
    },
    updateProject: (state, action: PayloadAction<{ projectId: string; name: string }>) => {
      const project = state.projects.find((p) => p.id === action.payload.projectId);
      if (project) {
        project.name = action.payload.name;
      }
    },
    removeProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
      if (state.activeProjectId === action.payload) {
        state.activeProjectId = null;
        state.activeSpaceId = null;
      }
    },

    // Spaces actions
    addSpace: (state, action: PayloadAction<{ projectId: string; space: any }>) => {
      const project = state.projects.find((p) => p.id === action.payload.projectId);
      if (project) {
        project.spaces.push(action.payload.space);
      }
    },
    updateSpace: (
      state,
      action: PayloadAction<{ projectId: string; spaceId: string; name: string }>
    ) => {
      const project = state.projects.find((p) => p.id === action.payload.projectId);
      if (project) {
        const space = project.spaces.find((s) => s.id === action.payload.spaceId);
        if (space) {
          space.name = action.payload.name;
        }
      }
    },
    removeSpace: (state, action: PayloadAction<{ projectId: string; spaceId: string }>) => {
      const project = state.projects.find((p) => p.id === action.payload.projectId);
      if (project) {
        project.spaces = project.spaces.filter((s) => s.id !== action.payload.spaceId);
      }
      if (state.activeSpaceId === action.payload.spaceId) {
        state.activeSpaceId = null;
      }
    },

    // Selection actions
    setActiveProjectId: (state, action: PayloadAction<string | null>) => {
      state.activeProjectId = action.payload;
    },
    setActiveSpaceId: (state, action: PayloadAction<string | null>) => {
      state.activeSpaceId = action.payload;
    },
  },
  selectors: {
    selectProjects: (state) => state.projects,
    selectActiveProjectId: (state) => state.activeProjectId,
    selectActiveSpaceId: (state) => state.activeSpaceId,
    selectActiveProject: (state) =>
      state.activeProjectId
        ? state.projects.find((p) => p.id === state.activeProjectId)
        : undefined,
    selectActiveSpace: (state) => {
      const activeProject = state.activeProjectId
        ? state.projects.find((p) => p.id === state.activeProjectId)
        : undefined;
      return activeProject && state.activeSpaceId
        ? activeProject.spaces.find((s) => s.id === state.activeSpaceId)
        : undefined;
    },
  },
});

export const {
  setProjects,
  addProject,
  updateProject,
  removeProject,
  addSpace,
  updateSpace,
  removeSpace,
  setActiveProjectId,
  setActiveSpaceId,
} = projectStore.actions;

export const {
  selectProjects,
  selectActiveProjectId,
  selectActiveSpaceId,
  selectActiveProject,
  selectActiveSpace,
} = projectStore.selectors;

export default projectStore.reducer;
