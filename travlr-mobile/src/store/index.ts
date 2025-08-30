import { configureStore } from '@reduxjs/toolkit';

// Simple store for now
export const store = configureStore({
  reducer: {
    // Add your reducers here later
    app: (state = { initialized: true }, action: any) => state,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;