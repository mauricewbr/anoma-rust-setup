/**
 * Home Page Component
 * 
 * Welcome page with overview of the Anoma wallet system
 */

import React from 'react';
import { type PageType } from '../components/Navigation';

interface HomePageProps {
  isLoggedIn: boolean;
  onNavigate: (page: PageType) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ isLoggedIn, onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold gradient-text mb-6">
          🔗 Welcome to Anoma Wallet
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Experience the future of privacy-preserving transactions with stateless key derivation
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-3">🔑 Stateless Key Derivation</h3>
          <p className="text-gray-600 leading-relaxed">
            No more complex key storage or backup procedures. Your keys are derived 
            deterministically from your wallet signatures.
          </p>
        </div>
        
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-3">🌐 Universal Wallet Support</h3>
          <p className="text-gray-600 leading-relaxed">
            Works with PassKey (WebAuthn), MetaMask, Phantom, and any wallet that 
            supports deterministic signing.
          </p>
        </div>
        
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-3">🔒 Privacy-First Design</h3>
          <p className="text-gray-600 leading-relaxed">
            Built on Anoma's privacy-preserving architecture with nullifiers, 
            encrypted resources, and discovery mechanisms.
          </p>
        </div>
        
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-3">⚡ Zero Storage Overhead</h3>
          <p className="text-gray-600 leading-relaxed">
            No encrypted blobs, no session management, no cache invalidation. 
            Keys are generated fresh every time, instantly.
          </p>
        </div>
      </div>

      {/* Getting Started */}
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">🚀 Getting Started</h2>
        
        {!isLoggedIn ? (
          <div>
            <p className="text-lg text-gray-600 mb-8">Choose how you'd like to get started:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => onNavigate('signup')}
                className="btn-primary"
              >
                📝 Sign Up - Create New Account
              </button>
              <button 
                onClick={() => onNavigate('login')}
                className="btn-secondary"
              >
                🔑 Log In - Access Existing Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-lg text-gray-600 mb-8">✅ You're logged in! Here's what you can do:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => onNavigate('transfer')}
                className="btn-primary"
              >
                💸 Send Resources
              </button>
              <button 
                onClick={() => onNavigate('testing')}
                className="btn-secondary"
              >
                🧪 Test Components
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Technical Overview */}
      <div className="bg-gray-100 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">🔬 Technical Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-3">Key Hierarchy</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Identity Key (from wallet signature)</li>
              <li>• Nullifier Key (nk, cnk)</li>
              <li>• Static Encryption Key (sesk, sepk)</li>
              <li>• Static Discovery Key (sdsk, sdpk)</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-3">Domain Separators</h4>
            <ul className="text-xs text-gray-600 space-y-1 font-mono">
              <li>• <code className="bg-gray-100 px-1 rounded">ANOMA::DERIVE_NULLIFIER_KEY_V1</code></li>
              <li>• <code className="bg-gray-100 px-1 rounded">ANOMA::DERIVE_STATIC_ENCRYPTION_KEY_V1</code></li>
              <li>• <code className="bg-gray-100 px-1 rounded">ANOMA::DERIVE_STATIC_DISCOVERY_KEY_V1</code></li>
              <li>• <code className="bg-gray-100 px-1 rounded">ANOMA::VERIFY_IDENTITY_KEY_V1</code></li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-3">Supported Wallets</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>🔐 PassKey (WebAuthn)</li>
              <li>🦊 MetaMask (Ethereum)</li>
              <li>👻 Phantom (EVM)</li>
              <li>🔧 Any deterministic signing wallet</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-3">Cryptographic Primitives</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• secp256k1 elliptic curve</li>
              <li>• HMAC-SHA256 for PRF</li>
              <li>• AES-GCM for encryption</li>
              <li>• Diffie-Hellman key exchange</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
