import { createSlice, createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { ImageData, Room } from '../types';

interface ImageState {
  // Empty state - we compute images from homes in homeStore
}

const initialState: ImageState = {};

export const imageStore = createSlice({
  name: 'image',
  initialState,
  reducers: {},
});

/**
 * Selector to get all images (both original and updated) for the active room
 */
export const selectAllImages = createSelector(
  (state: RootState) => state.home.homes,
  (state: RootState) => state.home.activeHomeId,
  (state: RootState) => state.home.activeRoomId,
  (homes, activeHomeId, activeRoomId): ImageData[] => {
    if (!activeHomeId || !activeRoomId) return [];
    const activeHome = homes.find((h) => h.id === activeHomeId);
    if (!activeHome) return [];
    const activeRoom = activeHome.rooms.find((r: Room) => r.id === activeRoomId);
    return activeRoom?.images || [];
  }
);

/**
 * Selector to get only original images (without parentImageId) for the active room
 */
export const selectOriginalImages = createSelector(selectAllImages, (allImages): ImageData[] =>
  allImages.filter((img) => !img.parentImageId)
);

/**
 * Selector to get only updated images (with parentImageId) for the active room
 */
export const selectUpdatedImages = createSelector(selectAllImages, (allImages): ImageData[] =>
  allImages.filter((img) => img.parentImageId)
);

export default imageStore.reducer;
