
import { useState, useEffect } from 'react';
import { WalletSetup } from './components/WalletSetup';
import { Counter } from './components/Counter';
import { VerboseKeyDisplay } from './components/VerboseKeyDisplay';
import { embeddedWallet, type WalletState } from './services/embeddedWallet';
import './App.css';

function App() {
  const [walletState, setWalletState] = useState<WalletState>({ 
    isInitialized: false, 
    hasPassKey: false 
  });
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet is already initialized
    const state = embeddedWallet.getState();
    setWalletState(state);
    
    if (state.isInitialized && state.userKey) {
      setUserKey(embeddedWallet.getUserKeyForSharing());
    }
  }, []);

  const handleWalletReady = (userKeyString: string) => {
    setUserKey(userKeyString);
    setWalletState(embeddedWallet.getState());
  };

  const handleLogout = () => {
    embeddedWallet.logout();
    setUserKey(null);
    setWalletState(embeddedWallet.getState());
  };

  const handleClearSession = () => {
    // Clear everything including PassKey credentials for testing
    embeddedWallet.deleteAccount();
    setUserKey(null);
    setWalletState(embeddedWallet.getState());
  };

  // Show wallet setup if not initialized
  if (!walletState.isInitialized || !userKey) {
    return (
      <div className="app">
        <div className="container">
          <WalletSetup onWalletReady={handleWalletReady} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <header className="app-header">
          <h1>🔐 Anoma Resource Machine</h1>
          <p>Privacy-Preserving Transactions with Zero-Knowledge Proofs</p>
          
          <div className="wallet-info">
            <div className="wallet-status">
              <span className="status-indicator">🟢</span>
              <span>Wallet Connected</span>
            </div>
            <div className="user-identity">
              <strong>Identity:</strong> {embeddedWallet.getIdentityAddress().slice(0, 8)}...
            </div>
            <div className="wallet-controls">
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
              <button onClick={handleClearSession} className="clear-session-button">
                🗑️ Clear Session
              </button>
            </div>
          </div>
        </header>

        <main className="app-main">
          <div className="user-key-section">
            <h3>📋 Your User Key</h3>
            <p>Share this with others so they can send you resources:</p>
            <div className="user-key-display">
              <code>{userKey}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(userKey)}
                className="copy-button"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>

          <VerboseKeyDisplay />

          <Counter />
        </main>

        <footer className="app-footer">
          <p>
            Frontend: <code>http://localhost:5173</code> | 
            Backend: <code>http://localhost:3000</code>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
