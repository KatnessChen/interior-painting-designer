import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Home } from '../types';

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

export const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    // Homes actions
    setHomes: (state, action: PayloadAction<Home[]>) => {
      state.homes = action.payload;
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
} = homeSlice.actions;

export const {
  selectHomes,
  selectActiveHomeId,
  selectActiveRoomId,
  selectActiveHome,
  selectActiveRoom,
} = homeSlice.selectors;

export default homeSlice.reducer;
