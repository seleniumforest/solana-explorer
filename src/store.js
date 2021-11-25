import { configureStore } from '@reduxjs/toolkit';
import walletExplorerSlice from './Slices/WalletExplorerSlice';

export const store = configureStore({
  reducer: {
    explorer: walletExplorerSlice,
  },
});
