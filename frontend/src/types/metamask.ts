// MetaMask and Web3 types
export interface MetaMaskProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (data: any) => void) => void;
  removeListener: (event: string, callback: (data: any) => void) => void;
  isMetaMask: boolean;
}

export interface WalletState {
  connected: boolean;
  account: string | null;
  chainId: string | null;
  error: string | null;
}

declare global {
  interface Window {
    ethereum?: MetaMaskProvider;
  }
}
