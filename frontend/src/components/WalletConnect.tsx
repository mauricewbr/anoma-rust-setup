
import type { FC } from 'react';
import { useWallet } from '../hooks/useWallet';

export const WalletConnect: FC = () => {
  const { walletState, isLoading, connectWallet, isMetaMaskInstalled } = useWallet();

  if (!isMetaMaskInstalled) {
    return (
      <div className="wallet-section error">
        <h3>⚠️ MetaMask Required</h3>
        <p>Please install MetaMask browser extension to continue.</p>
        <a 
          href="https://metamask.io/download/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  return (
    <div className={`wallet-section ${walletState.connected ? 'connected' : ''}`}>
      <h3>🦊 MetaMask Connection</h3>
      
      {!walletState.connected ? (
        <button 
          onClick={connectWallet}
          disabled={isLoading}
          className="btn btn-primary"
        >
          <span className="status-indicator status-disconnected"></span>
          {isLoading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      ) : (
        <div className="wallet-info">
          <button className="btn btn-success" disabled>
            <span className="status-indicator status-connected"></span>
            Connected
          </button>
          <p className="account-info">
            <strong>Account:</strong> {walletState.account?.slice(0, 6)}...{walletState.account?.slice(-4)}
          </p>
          <p className="chain-info">
            <strong>Chain ID:</strong> {walletState.chainId}
          </p>
        </div>
      )}

      {walletState.error && (
        <div className="error-message">
          ❌ {walletState.error}
        </div>
      )}
    </div>
  );
};
