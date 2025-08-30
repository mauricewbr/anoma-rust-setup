/**
 * Sign Up Page Component
 * 
 * Complete sign up flow using stateless key derivation
 */

import React, { useState } from 'react';
import { 
  derivationWallet, 
  PassKeyAdapter, 
  MetaMaskAdapter, 
  PhantomAdapter,
  type WalletAdapter 
} from '../services/derivationWallet';

interface SignUpPageProps {
  onSignUpComplete: (userKey: string, walletType: string) => void;
}

interface SignUpStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  error?: string;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpComplete }) => {
  const [selectedWallet, setSelectedWallet] = useState<WalletAdapter | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SignUpStep[]>([
    {
      id: 'wallet-selection',
      title: 'Select Wallet',
      description: 'Choose your preferred wallet for key derivation',
      completed: false
    },
    {
      id: 'wallet-connection',
      title: 'Connect Wallet',
      description: 'Authenticate with your chosen wallet',
      completed: false
    },
    {
      id: 'key-derivation',
      title: 'Derive Keys',
      description: 'Generate your Anoma key hierarchy',
      completed: false
    },
    {
      id: 'user-key-creation',
      title: 'Create User Key',
      description: 'Generate your shareable User Key',
      completed: false
    },
    {
      id: 'registration',
      title: 'Register Account',
      description: 'Register with the Anoma network',
      completed: false
    }
  ]);
  const [generatedUserKey, setGeneratedUserKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const availableWallets = [
    {
      adapter: new PassKeyAdapter(),
      name: 'PassKey (WebAuthn)',
      icon: '🔐',
      description: 'Use your device\'s built-in authentication (TouchID, FaceID, Windows Hello)',
      recommended: true
    },
    {
      adapter: new MetaMaskAdapter(),
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with your MetaMask wallet',
      recommended: false
    },
    {
      adapter: new PhantomAdapter(),
      name: 'Phantom (EVM)',
      icon: '👻',
      description: 'Connect with Phantom wallet in Ethereum mode',
      recommended: false
    }
  ];

  const updateStep = (stepId: string, updates: Partial<SignUpStep>) => {
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
      
      // Automatically proceed to connection
      await handleWalletConnection(walletOption.adapter);
      
    } catch (error) {
      updateStep('wallet-selection', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletConnection = async (adapter: WalletAdapter) => {
    try {
      setIsProcessing(true);
      derivationWallet.setAdapter(adapter);

      // Check if already connected
      const isConnected = await adapter.isConnected();
      
      if (!isConnected && adapter.name !== 'PassKey (WebAuthn)') {
        await adapter.connect();
      }

      // Get wallet address
      const address = await adapter.getAddress();
      setWalletAddress(address);

      updateStep('wallet-connection', { completed: true });
      setCurrentStep(2);
      
      // Automatically proceed to key derivation
      await handleKeyDerivation();
      
    } catch (error) {
      updateStep('wallet-connection', { 
        error: error instanceof Error ? error.message : 'Connection failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDerivation = async () => {
    try {
      setIsProcessing(true);
      
      // Derive all static keys
      await derivationWallet.deriveStaticKeys();
      
      updateStep('key-derivation', { completed: true });
      setCurrentStep(3);
      
      // Automatically proceed to User Key creation
      await handleUserKeyCreation();
      
    } catch (error) {
      updateStep('key-derivation', { 
        error: error instanceof Error ? error.message : 'Key derivation failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUserKeyCreation = async () => {
    try {
      setIsProcessing(true);
      
      // Create User Key
      const userKey = await derivationWallet.getUserKeyForSharing();
      setGeneratedUserKey(userKey);
      
      updateStep('user-key-creation', { completed: true });
      setCurrentStep(4);
      
      // Automatically proceed to registration
      await handleRegistration(userKey);
      
    } catch (error) {
      updateStep('user-key-creation', { 
        error: error instanceof Error ? error.message : 'User Key creation failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegistration = async (userKey: string) => {
    try {
      setIsProcessing(true);
      
      // TODO: Send to backend/Transaction Service
      // For now, simulate registration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateStep('registration', { completed: true });
      setCurrentStep(5);
      
      // Complete sign up
      onSignUpComplete(userKey, selectedWallet?.name || 'Unknown');
      
    } catch (error) {
      updateStep('registration', { 
        error: error instanceof Error ? error.message : 'Registration failed',
        completed: false 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSignUp = () => {
    setSelectedWallet(null);
    setCurrentStep(0);
    setGeneratedUserKey(null);
    setWalletAddress(null);
    setSteps(prev => prev.map(step => ({ ...step, completed: false, error: undefined })));
    derivationWallet.clearCache();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">📝 Sign Up for Anoma</h1>
        <p className="text-xl text-gray-600">Create your account using stateless key derivation</p>
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
              <p className="text-gray-600 mb-6">Select how you'd like to authenticate and derive your keys:</p>
              
              <div className="space-y-4">
                {availableWallets.map((wallet, index) => (
                  <button
                    key={index}
                    onClick={() => handleWalletSelection(wallet)}
                    disabled={isProcessing}
                    className={`w-full p-6 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      wallet.recommended 
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-300' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{wallet.icon}</div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                          <span>{wallet.name}</span>
                          {wallet.recommended && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              Recommended
                            </span>
                          )}
                        </h4>
                        <p className="text-gray-600">{wallet.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep > 0 && currentStep < 5 && (
            <div className="text-center py-8">
              <div className="spinner text-4xl mb-4">🔄</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Step {currentStep}</h3>
              <p className="text-gray-600 mb-4">{steps[currentStep]?.description}</p>
              {selectedWallet && (
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg inline-block mb-2">
                  Using: <strong>{selectedWallet.name}</strong>
                </div>
              )}
              {walletAddress && (
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg inline-block">
                  Address: <code className="font-mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</code>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && generatedUserKey && (
            <div className="text-center">
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-green-600 mb-2">🎉 Sign Up Complete!</h3>
                <p className="text-gray-600">Your Anoma account has been successfully created.</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Your User Key</h4>
                <p className="text-gray-600 mb-4">Share this key with others so they can send you resources:</p>
                <div className="flex items-center space-x-2 bg-white border border-green-300 rounded-lg p-3">
                  <code className="flex-1 text-sm font-mono text-gray-800 break-all">{generatedUserKey}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(generatedUserKey)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">What's Next?</h4>
                <ul className="text-left space-y-2 text-gray-700">
                  <li className="flex items-center space-x-2">
                    <span>✅</span>
                    <span>Your keys are now derived and ready to use</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>💸</span>
                    <span>You can receive resources from other users</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>🔄</span>
                    <span>You can log in anytime with the same wallet</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span>🔑</span>
                    <span>No backup needed - keys are always derivable</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 text-center">
          {currentStep === 5 ? (
            <button 
              onClick={resetSignUp}
              className="btn-secondary"
            >
              🔄 Sign Up Another Account
            </button>
          ) : (
            <button 
              onClick={resetSignUp}
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
