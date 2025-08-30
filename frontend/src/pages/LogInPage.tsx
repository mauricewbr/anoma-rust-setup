/**
 * Log In Page Component
 * 
 * Complete log in flow using stateless key derivation
 */

import React, { useState } from 'react';
import { 
  derivationWallet, 
  PassKeyAdapter, 
  MetaMaskAdapter, 
  PhantomAdapter,
  type WalletAdapter 
} from '../services/derivationWallet';

interface LogInPageProps {
  onLogInComplete: (userKey: string, walletType: string) => void;
}

interface LoginStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  error?: string;
}

export const LogInPage: React.FC<LogInPageProps> = ({ onLogInComplete }) => {
  const [selectedWallet, setSelectedWallet] = useState<WalletAdapter | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<LoginStep[]>([
    {
      id: 'wallet-selection',
      title: 'Select Wallet',
      description: 'Choose the wallet you used to sign up',
      completed: false
    },
    {
      id: 'authentication',
      title: 'Authenticate',
      description: 'Authenticate with your wallet',
      completed: false
    },
    {
      id: 'key-derivation',
      title: 'Derive Keys',
      description: 'Regenerate your key hierarchy',
      completed: false
    },
    {
      id: 'data-fetch',
      title: 'Load Data',
      description: 'Fetch your account data and resources',
      completed: false
    }
  ]);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<any>(null);

  const availableWallets = [
    {
      adapter: new PassKeyAdapter(),
      name: 'PassKey (WebAuthn)',
      icon: '🔐',
      description: 'Use your device\'s built-in authentication'
    },
    {
      adapter: new MetaMaskAdapter(),
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with your MetaMask wallet'
    },
    {
      adapter: new PhantomAdapter(),
      name: 'Phantom (EVM)',
      icon: '👻',
      description: 'Connect with Phantom wallet'
    }
  ];

  const updateStep = (stepId: string, updates: Partial<LoginStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleWalletSelection = async (walletOption: typeof availableWallets[0]) => {
    try {
      setIsProcessing(true);
      setSelectedWallet(walletOption.adapter);
      
      // Check if wallet is available
      const isAvailable = await walletOption.adapter.isAvailable();
      if (!isAvailable) {
        throw new Error(`${walletOption.name} is not available. Please install it first.`);
      }

      updateStep('wallet-selection', { completed: true });
      setCurrentStep(1);
      
      // Automatically proceed to authentication
      await handleAuthentication(walletOption.adapter);
      
    } catch (error) {
      updateStep('wallet-selection', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAuthentication = async (adapter: WalletAdapter) => {
    try {
      setIsProcessing(true);
      derivationWallet.setAdapter(adapter);

      // Authenticate with wallet
      const isConnected = await adapter.isConnected();
      
      if (!isConnected && adapter.name !== 'PassKey (WebAuthn)') {
        await adapter.connect();
      }

      // Get wallet address
      const address = await adapter.getAddress();
      setWalletAddress(address);

      updateStep('authentication', { completed: true });
      setCurrentStep(2);
      
      // Automatically proceed to key derivation
      await handleKeyDerivation();
      
    } catch (error) {
      updateStep('authentication', { 
        error: error instanceof Error ? error.message : 'Authentication failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDerivation = async () => {
    try {
      setIsProcessing(true);
      
      // Clear any cached keys to force fresh derivation
      derivationWallet.clearCache();
      
      // Derive all static keys
      await derivationWallet.deriveStaticKeys();
      
      // Generate User Key
      const derivedUserKey = await derivationWallet.getUserKeyForSharing();
      setUserKey(derivedUserKey);
      
      updateStep('key-derivation', { completed: true });
      setCurrentStep(3);
      
      // Automatically proceed to data fetching
      await handleDataFetch(derivedUserKey);
      
    } catch (error) {
      updateStep('key-derivation', { 
        error: error instanceof Error ? error.message : 'Key derivation failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDataFetch = async (userKey: string) => {
    try {
      setIsProcessing(true);
      
      // TODO: Fetch real data from backend/indexer
      // For now, simulate data fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock account data
      const mockData = {
        resources: [
          { type: 'ANOMA', amount: 100, encrypted: false },
          { type: 'ETH', amount: 0.5, encrypted: true },
        ],
        transactions: [
          { id: 'tx1', type: 'receive', amount: 100, from: 'Alice' },
          { id: 'tx2', type: 'send', amount: 25, to: 'Bob' },
        ],
        lastUpdated: new Date().toISOString()
      };
      
      setAccountData(mockData);
      
      updateStep('data-fetch', { completed: true });
      setCurrentStep(4);
      
      // Complete login
      onLogInComplete(userKey, selectedWallet?.name || 'Unknown');
      
    } catch (error) {
      updateStep('data-fetch', { 
        error: error instanceof Error ? error.message : 'Data fetch failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetLogin = () => {
    setSelectedWallet(null);
    setCurrentStep(0);
    setUserKey(null);
    setWalletAddress(null);
    setAccountData(null);
    setSteps(prev => prev.map(step => ({ ...step, completed: false, error: undefined })));
    derivationWallet.clearCache();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">🔑 Log In to Anoma</h1>
        <p className="text-xl text-gray-600">Access your account using stateless key derivation</p>
      </div>

      <div className="card p-8">
        {/* Progress Steps */}
        <div className="mb-8 space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors ${
                step.completed 
                  ? 'border-green-200 bg-green-50' 
                  : step.error 
                    ? 'border-red-200 bg-red-50'
                    : index === currentStep 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.completed 
                  ? 'bg-green-500 text-white' 
                  : step.error 
                    ? 'bg-red-500 text-white'
                    : index === currentStep 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
              }`}>
                {step.completed ? '✓' : step.error ? '✗' : index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{step.title}</h4>
                <p className="text-sm text-gray-600">{step.description}</p>
                {step.error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-100 px-3 py-1 rounded">
                    <strong>Error:</strong> {step.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div>
          {currentStep === 0 && (
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Wallet</h3>
              <p className="text-gray-600 mb-6">Select the same wallet you used when signing up:</p>
              
              <div className="wallet-options">
                {availableWallets.map((wallet, index) => (
                  <button
                    key={index}
                    onClick={() => handleWalletSelection(wallet)}
                    disabled={isProcessing}
                    className="wallet-option"
                  >
                    <div className="wallet-icon">{wallet.icon}</div>
                    <div className="wallet-info">
                      <h4>{wallet.name}</h4>
                      <p>{wallet.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="login-note">
                <h4>💡 How It Works</h4>
                <p>
                  Your keys are derived deterministically from your wallet signatures. 
                  Using the same wallet will regenerate the exact same keys every time.
                </p>
              </div>
            </div>
          )}

          {currentStep > 0 && currentStep < 4 && (
            <div className="processing-step">
              <div className="processing-content">
                <div className="spinner">🔄</div>
                <h3>Processing Step {currentStep}</h3>
                <p>{steps[currentStep]?.description}</p>
                {selectedWallet && (
                  <div className="selected-wallet">
                    Using: <strong>{selectedWallet.name}</strong>
                  </div>
                )}
                {walletAddress && (
                  <div className="wallet-address">
                    Address: <code>{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && userKey && accountData && (
            <div className="login-complete">
              <div className="success-message">
                <h3>🎉 Login Successful!</h3>
                <p>Welcome back! Your keys have been regenerated and your account data loaded.</p>
              </div>

              <div className="account-summary">
                <div className="user-key-section">
                  <h4>Your User Key</h4>
                  <div className="user-key-box">
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

                <div className="account-data">
                  <h4>Account Overview</h4>
                  <div className="data-grid">
                    <div className="data-item">
                      <h5>Resources</h5>
                      <ul>
                        {accountData.resources.map((resource: any, index: number) => (
                          <li key={index}>
                            {resource.amount} {resource.type} 
                            {resource.encrypted && <span className="encrypted-badge">🔒</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="data-item">
                      <h5>Recent Transactions</h5>
                      <ul>
                        {accountData.transactions.map((tx: any) => (
                          <li key={tx.id}>
                            {tx.type === 'receive' ? '📥' : '📤'} {tx.amount} 
                            {tx.from && ` from ${tx.from}`}
                            {tx.to && ` to ${tx.to}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="next-steps">
                <h4>What's Next?</h4>
                <ul>
                  <li>💸 Send resources to other users</li>
                  <li>📥 Receive resources using your User Key</li>
                  <li>🔍 View your transaction history</li>
                  <li>🧪 Test the cryptographic components</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 text-center">
          {currentStep === 4 ? (
            <button 
              onClick={resetLogin}
              className="btn-secondary"
            >
              🔄 Log In Different Account
            </button>
          ) : (
            <button 
              onClick={resetLogin}
              disabled={isProcessing}
              className="btn-secondary"
            >
              🔄 Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
