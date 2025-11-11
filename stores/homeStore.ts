import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storagePathToBase64 } from '../utils';
import { Home } from '../types';

/**
 * Traverse all homes > rooms > images and pre-cache their base64 data
 * This runs in the background without blocking the Redux state update
 */
async function cacheAllImageBase64s(homes: Home[]): Promise<void> {
  const totalImages = homes.reduce(
    (sum, home) => sum + home.rooms.reduce((roomSum, room) => roomSum + room.images.length, 0),
    0
  );

  if (totalImages === 0) {
    console.log('[Cache] No images to cache');
    return;
  }

  console.log(`[Cache] Starting to cache ${totalImages} images...`);
  let cachedCount = 0;

  for (const home of homes) {
    for (const room of home.rooms) {
      for (const image of room.images) {
        try {
          // Fire and forget - we don't need to wait for each one sequentially
          // But we'll track progress
          storagePathToBase64(image.storageUrl)
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

interface HomeState {
  homes: Home[];
  activeHomeId: string | null;
  activeRoomId: string | null;
}

const initialState: HomeState = {
  homes: [],
  activeHomeId: null,
  activeRoomId: null,
};

export const homeStore = createSlice({
  name: 'home',
  initialState,
  reducers: {
    // Homes actions
    setHomes: (state, action: PayloadAction<Home[]>) => {
      state.homes = action.payload;

      // Kick off async images caching in the background without blocking state update
      void cacheAllImageBase64s(action.payload);
    },
    addHome: (state, action: PayloadAction<Home>) => {
      state.homes.push(action.payload);
    },
    updateHome: (state, action: PayloadAction<{ homeId: string; name: string }>) => {
      const home = state.homes.find((h) => h.id === action.payload.homeId);
      if (home) {
        home.name = action.payload.name;
      }
    },
    removeHome: (state, action: PayloadAction<string>) => {
      state.homes = state.homes.filter((h) => h.id !== action.payload);
      if (state.activeHomeId === action.payload) {
        state.activeHomeId = null;
        state.activeRoomId = null;
      }
    },

    // Rooms actions
    addRoom: (state, action: PayloadAction<{ homeId: string; room: any }>) => {
      const home = state.homes.find((h) => h.id === action.payload.homeId);
      if (home) {
        home.rooms.push(action.payload.room);
      }
    },
    updateRoom: (
      state,
      action: PayloadAction<{ homeId: string; roomId: string; name: string }>
    ) => {
      const home = state.homes.find((h) => h.id === action.payload.homeId);
      if (home) {
        const room = home.rooms.find((r) => r.id === action.payload.roomId);
        if (room) {
          room.name = action.payload.name;
        }
      }
    },
    removeRoom: (state, action: PayloadAction<{ homeId: string; roomId: string }>) => {
      const home = state.homes.find((h) => h.id === action.payload.homeId);
      if (home) {
        home.rooms = home.rooms.filter((r) => r.id !== action.payload.roomId);
      }
      if (state.activeRoomId === action.payload.roomId) {
        state.activeRoomId = null;
      }
    },

    // Selection actions
    setActiveHomeId: (state, action: PayloadAction<string | null>) => {
      state.activeHomeId = action.payload;
    },
    setActiveRoomId: (state, action: PayloadAction<string | null>) => {
      state.activeRoomId = action.payload;
    },
  },
  selectors: {
    selectHomes: (state) => state.homes,
    selectActiveHomeId: (state) => state.activeHomeId,
    selectActiveRoomId: (state) => state.activeRoomId,
    selectActiveHome: (state) =>
      state.activeHomeId ? state.homes.find((h) => h.id === state.activeHomeId) : undefined,
    selectActiveRoom: (state) => {
      const activeHome = state.activeHomeId
        ? state.homes.find((h) => h.id === state.activeHomeId)
        : undefined;
      return activeHome && state.activeRoomId
        ? activeHome.rooms.find((r) => r.id === state.activeRoomId)
        : undefined;
    },
  },
});

export const {
  setHomes,
  addHome,
  updateHome,
  removeHome,
  addRoom,
  updateRoom,
  removeRoom,
  setActiveHomeId,
  setActiveRoomId,
} = homeStore.actions;

export const {
  selectHomes,
  selectActiveHomeId,
  selectActiveRoomId,
  selectActiveHome,
  selectActiveRoom,
} = homeStore.selectors;

export default homeStore.reducer;
