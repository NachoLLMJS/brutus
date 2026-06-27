/// <reference types="vite/client" />

import type { EthereumProvider } from '@/lib/web3';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
