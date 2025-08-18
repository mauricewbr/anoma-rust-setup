import { useState, useEffect, useCallback } from 'react';
import { WalletService } from '../services/wallet';
import type { WalletState } from '../types/metamask';

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    account: null,
    chainId: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize wallet state
  useEffect(() => {
    const initWallet = async () => {
      const state = await WalletService.getWalletState();
      setWalletState(state);
    };

    initWallet();

    // Set up event listeners
    const handleAccountsChanged = (accounts: string[]) => {
      setWalletState(prev => ({
        ...prev,
        connected: accounts.length > 0,
        account: accounts[0] || null
      }));
    };

    const handleChainChanged = (chainId: string) => {
      setWalletState(prev => ({
        ...prev,
        chainId
      }));
    };

    WalletService.onAccountsChanged(handleAccountsChanged);
    WalletService.onChainChanged(handleChainChanged);

    return () => {
      WalletService.removeAllListeners();
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setWalletState(prev => ({ ...prev, error: null }));

    try {
      const state = await WalletService.connectWallet();
      setWalletState(state);
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletState.account) {
      throw new Error('Wallet not connected');
    }

    return WalletService.signMessage(message, walletState.account);
  }, [walletState.account]);

  return {
    walletState,
    isLoading,
    connectWallet,
    signMessage,
    isMetaMaskInstalled: WalletService.isMetaMaskInstalled()
  };
};
