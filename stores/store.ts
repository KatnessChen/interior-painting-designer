import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './projectStore';
import imageReducer from './imageStore';

export const store = configureStore({
  reducer: {
    project: projectReducer,
    image: imageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
