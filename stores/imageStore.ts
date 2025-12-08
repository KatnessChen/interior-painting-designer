import { createSlice, createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { ImageData, Space } from '../types';

interface ImageState {
  // Empty state - we compute images from projects in projectStore
}

const initialState: ImageState = {};

export const imageStore = createSlice({
  name: 'image',
  initialState,
  reducers: {},
});

/**
 * Selector to get all images (both original and updated) for the active space
 */
export const selectAllImages = createSelector(
  (state: RootState) => state.project.projects,
  (state: RootState) => state.project.activeProjectId,
  (state: RootState) => state.project.activeSpaceId,
  (projects, activeProjectId, activeSpaceId): ImageData[] => {
    if (!activeProjectId || !activeSpaceId) return [];
    const activeProject = projects.find((p) => p.id === activeProjectId);
    if (!activeProject) return [];
    const activeSpace = activeProject.spaces.find((s: Space) => s.id === activeSpaceId);
    return activeSpace?.images || [];
  }
);

/**
 * Selector to get only original images (without parentImageId) for the active space
 */
export const selectOriginalImages = createSelector(selectAllImages, (allImages): ImageData[] =>
  allImages.filter((img) => !img.parentImageId)
);

/**
 * Selector to get only updated images (with parentImageId) for the active space
 */
export const selectUpdatedImages = createSelector(selectAllImages, (allImages): ImageData[] =>
  allImages.filter((img) => img.parentImageId)
);

export default imageStore.reducer;
