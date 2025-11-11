import { configureStore } from '@reduxjs/toolkit';
import homeReducer from './homeStore';
import imageReducer from './imageStore';

export const store = configureStore({
  reducer: {
    home: homeReducer,
    image: imageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
