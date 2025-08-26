/**
 * Wallet Setup Component
 * 
 * Handles account creation and loading for the Anoma embedded wallet
 */

import React, { useState, useEffect } from 'react';
import { embeddedWallet, type WalletState } from '../services/embeddedWallet';
import { passKeyService } from '../services/passkey';

interface WalletSetupProps {
  onWalletReady: (userKey: string) => void;
}

export const WalletSetup: React.FC<WalletSetupProps> = ({ onWalletReady }) => {
  const [walletState, setWalletState] = useState<WalletState>({ 
    isInitialized: false, 
    hasPassKey: false 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isPassKeySupported, setIsPassKeySupported] = useState(false);

  useEffect(() => {
    checkSupport();
    checkExistingWallet();
  }, []);

  const checkSupport = async () => {
    const supported = passKeyService.isSupported();
    const platformAvailable = await passKeyService.isPlatformAuthenticatorAvailable();
    setIsPassKeySupported(supported && platformAvailable);
  };

  const checkExistingWallet = () => {
    const state = embeddedWallet.getState();
    setWalletState(state);
  };

  const handleCreateAccount = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await embeddedWallet.createAccount(email);
      const userKeyString = embeddedWallet.getUserKeyForSharing();
      
      setWalletState(embeddedWallet.getState());
      onWalletReady(userKeyString);
    } catch (error) {
      console.error('Account creation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      await embeddedWallet.loadAccount();
      const userKeyString = embeddedWallet.getUserKeyForSharing();
      
      setWalletState(embeddedWallet.getState());
      onWalletReady(userKeyString);
    } catch (error) {
      console.error('Account loading failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  if (!isPassKeySupported) {
    return (
      <div className="wallet-setup">
        <div className="error-container">
          <h2>⚠️ PassKey Not Supported</h2>
          <p>
            Your browser or device doesn't support PassKey/WebAuthn technology, 
            which is required for the Anoma embedded wallet.
          </p>
          <div className="requirements">
            <h3>Requirements:</h3>
            <ul>
              <li>Modern browser (Chrome 67+, Safari 14+, Firefox 60+)</li>
              <li>Platform authenticator (TouchID, FaceID, Windows Hello, etc.)</li>
              <li>Secure context (HTTPS or localhost)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (walletState.isInitialized && walletState.userKey) {
    return (
      <div className="wallet-setup">
        <div className="wallet-ready">
          <h2>🎉 Wallet Ready!</h2>
          <p>Your Anoma wallet is initialized and ready to use.</p>
          <div className="user-info">
            <p><strong>Email:</strong> {walletState.userEmail}</p>
            <p><strong>Identity:</strong> {embeddedWallet.getIdentityAddress()}</p>
          </div>
          <button 
            onClick={() => onWalletReady(embeddedWallet.getUserKeyForSharing())}
            className="primary-button"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-setup">
      <div className="setup-container">
        <h1>🔐 Anoma Wallet Setup</h1>
        <p>
          Create a secure, embedded wallet using PassKey technology. 
          Your keys will be protected by your device's biometric authentication.
        </p>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {walletState.hasPassKey ? (
          <div className="existing-account">
            <h2>Welcome Back!</h2>
            <p>We found an existing Anoma account on this device.</p>
            <button 
              onClick={handleLoadAccount}
              disabled={loading}
              className="primary-button"
            >
              {loading ? '🔓 Authenticating...' : '🔓 Load Account'}
            </button>
            <div className="divider">
              <span>or</span>
            </div>
          </div>
        ) : null}

        <div className="new-account">
          <h2>{walletState.hasPassKey ? 'Create New Account' : 'Create Account'}</h2>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              disabled={loading}
              className="email-input"
            />
            <small>Used to identify your PassKey credential</small>
          </div>
          
          <button 
            onClick={handleCreateAccount}
            disabled={loading || !email.trim()}
            className="primary-button"
          >
            {loading ? '🔑 Creating...' : '🔑 Create Wallet'}
          </button>
        </div>

        <div className="security-info">
          <h3>🛡️ Security Features</h3>
          <ul>
            <li>Keys protected by PassKey/WebAuthn</li>
            <li>Biometric authentication required</li>
            <li>No passwords to remember</li>
            <li>Keys never leave your device</li>
          </ul>
        </div>
      </div>


    </div>
  );
};
