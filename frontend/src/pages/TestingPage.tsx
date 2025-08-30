/**
 * Testing Page Component
 * 
 * Contains all our test components for development and debugging
 */

import React from 'react';
import { VerboseKeyDisplay } from '../components/VerboseKeyDisplay';
import { AliceBobTest } from '../components/AliceBobTest';
import { SignatureDeterminismTest } from '../components/SignatureDeterminismTest';
import { DerivationWalletTest } from '../components/DerivationWalletTest';
import { Counter } from '../components/Counter';

export const TestingPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">🧪 Testing & Development</h1>
        <p className="text-xl text-gray-600">Comprehensive testing suite for Anoma wallet components</p>
      </div>

      {/* Testing Sections */}
      <div className="space-y-12">
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🔑 Key Derivation Testing</h2>
          <p className="text-gray-600 mb-6">Test the new stateless key derivation approach across different wallet types.</p>
          <DerivationWalletTest />
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🔬 Signature Determinism Analysis</h2>
          <p className="text-gray-600 mb-6">Analyze signature determinism across PassKey, MetaMask, and Phantom wallets.</p>
          <SignatureDeterminismTest />
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">💸 Alice-Bob Resource Transfer</h2>
          <p className="text-gray-600 mb-6">Complete end-to-end test of the resource sharing protocol.</p>
          <AliceBobTest />
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🔍 Verbose Key Display</h2>
          <p className="text-gray-600 mb-6">Display all generated key pairs for debugging and verification.</p>
          <VerboseKeyDisplay />
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🔢 Counter (Legacy)</h2>
          <p className="text-gray-600 mb-6">Original counter component for backend connectivity testing.</p>
          <Counter />
        </div>
      </div>

      {/* Testing Guide */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">📚 Testing Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">🎯 Key Derivation Tests</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Test consistency across multiple derivations</li>
              <li>• Compare performance vs. current approach</li>
              <li>• Verify universal wallet compatibility</li>
              <li>• Validate cryptographic correctness</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">🔐 Signature Analysis</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Determine if wallets use deterministic signing</li>
              <li>• Compare signature patterns across wallet types</li>
              <li>• Understand security implications</li>
              <li>• Validate reproducibility</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">💫 Resource Transfer</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Test complete Alice-Bob user story</li>
              <li>• Verify encryption/decryption flows</li>
              <li>• Validate key exchange protocols</li>
              <li>• Test discovery mechanisms</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">🔧 Development Tools</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Inspect generated key hierarchies</li>
              <li>• Debug authentication flows</li>
              <li>• Monitor performance metrics</li>
              <li>• Validate protocol compliance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="mt-16 bg-yellow-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">⚠️ Important Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg">
            <h4 className="text-lg font-bold text-gray-900 mb-3">🔒 Security</h4>
            <p className="text-gray-600">
              These tests display sensitive key material for development purposes. 
              In production, private keys should never be displayed or logged.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg">
            <h4 className="text-lg font-bold text-gray-900 mb-3">🌐 Network</h4>
            <p className="text-gray-600">
              Some tests require wallet connections (MetaMask, Phantom). 
              Ensure your wallets are properly configured and connected.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg">
            <h4 className="text-lg font-bold text-gray-900 mb-3">🔄 State</h4>
            <p className="text-gray-600">
              Tests may modify global wallet state. Use the "Clear Session" button 
              or refresh the page to reset between tests.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg">
            <h4 className="text-lg font-bold text-gray-900 mb-3">📊 Performance</h4>
            <p className="text-gray-600">
              Performance measurements may vary based on device capabilities 
              and network conditions. Run multiple iterations for accurate results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
