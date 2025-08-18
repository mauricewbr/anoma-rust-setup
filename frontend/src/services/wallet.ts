import type { MetaMaskProvider, WalletState } from '../types/metamask';

export class WalletService {
  private static provider: MetaMaskProvider | null = null;

  /**
   * Get MetaMask provider
   */
  static getProvider(): MetaMaskProvider | null {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = window.ethereum;
      return this.provider;
    }
    return null;
  }

  /**
   * Check if MetaMask is installed
   */
  static isMetaMaskInstalled(): boolean {
    const provider = this.getProvider();
    return provider?.isMetaMask ?? false;
  }

  /**
   * Connect to MetaMask wallet
   */
  static async connectWallet(): Promise<WalletState> {
    const provider = this.getProvider();
    
    if (!provider) {
      throw new Error('MetaMask not installed');
    }

    try {
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      const chainId = await provider.request({
        method: 'eth_chainId'
      });

      return {
        connected: true,
        account: accounts[0] || null,
        chainId,
        error: null
      };
    } catch (error: any) {
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Get current wallet state
   */
  static async getWalletState(): Promise<WalletState> {
    const provider = this.getProvider();
    
    if (!provider) {
      return {
        connected: false,
        account: null,
        chainId: null,
        error: 'MetaMask not installed'
      };
    }

    try {
      const accounts = await provider.request({
        method: 'eth_accounts'
      });

      const chainId = await provider.request({
        method: 'eth_chainId'
      });

      return {
        connected: accounts.length > 0,
        account: accounts[0] || null,
        chainId,
        error: null
      };
    } catch (error: any) {
      return {
        connected: false,
        account: null,
        chainId: null,
        error: error.message
      };
    }
  }

  /**
   * Sign a message with MetaMask
   */
  static async signMessage(message: string, account: string): Promise<string> {
    const provider = this.getProvider();
    
    if (!provider) {
      throw new Error('MetaMask not available');
    }

    try {
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, account]
      });

      return signature;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User denied message signature');
      }
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Listen for account changes
   */
  static onAccountsChanged(callback: (accounts: string[]) => void): void {
    const provider = this.getProvider();
    if (provider) {
      provider.on('accountsChanged', callback);
    }
  }

  /**
   * Listen for chain changes
   */
  static onChainChanged(callback: (chainId: string) => void): void {
    const provider = this.getProvider();
    if (provider) {
      provider.on('chainChanged', callback);
    }
  }

  /**
   * Remove event listeners
   */
  static removeAllListeners(): void {
    const provider = this.getProvider();
    if (provider) {
      provider.removeListener('accountsChanged', () => {});
      provider.removeListener('chainChanged', () => {});
    }
  }
}

export default WalletService;
