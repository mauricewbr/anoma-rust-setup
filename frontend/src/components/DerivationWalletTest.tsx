/**
 * Derivation Wallet Test Component
 * 
 * Tests the new stateless key derivation approach and compares it
 * with the current encrypted blob storage approach.
 * 
 * Features:
 * - Test key derivation consistency across multiple attempts
 * - Compare performance between derivation vs. storage approaches
 * - Test different wallet adapters (PassKey, MetaMask, Phantom)
 * - Verify that derived keys match cryptographic requirements
 */

import React, { useState } from 'react';
import { 
  derivationWallet, 
  PassKeyAdapter, 
  MetaMaskAdapter, 
  PhantomAdapter,
  type WalletAdapter,
  type DerivedStaticKeys,
  ANOMA_DOMAIN_SEPARATORS
} from '../services/derivationWallet';
import { embeddedWallet } from '../services/embeddedWallet';
import { formatKeyForDisplay } from '../services/cryptography';

interface TestResult {
  walletType: string;
  operation: string;
  success: boolean;
  duration: number;
  details: string;
  error?: string;
  data?: any;
}

interface DerivationWalletTestProps {
  className?: string;
}

export const DerivationWalletTest: React.FC<DerivationWalletTestProps> = ({ className }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentAdapter, setCurrentAdapter] = useState<WalletAdapter | null>(null);
  const [derivedKeys, setDerivedKeys] = useState<DerivedStaticKeys | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
    setDerivedKeys(null);
    setUserKey(null);
  };

  // Test key derivation consistency
  const testDerivationConsistency = async (adapter: WalletAdapter, iterations: number = 3) => {
    const startTime = Date.now();
    
    try {
      derivationWallet.setAdapter(adapter);
      
      const derivationResults: any[] = [];
      
      for (let i = 0; i < iterations; i++) {
        derivationWallet.clearCache(); // Force re-derivation
        const keys = await derivationWallet.deriveStaticKeys();
        const userKey = await derivationWallet.getUserKeyForSharing();
        
        derivationResults.push({
          iteration: i + 1,
          identityPublicKey: formatKeyForDisplay(keys.identity.publicKey),
          nullifierCommitment: formatKeyForDisplay(keys.nullifier.cnk),
          staticEncryptionPublicKey: formatKeyForDisplay(keys.staticEncryption.publicKey),
          staticDiscoveryPublicKey: formatKeyForDisplay(keys.staticDiscovery.publicKey),
          userKey: userKey.slice(0, 50) + '...'
        });
      }
      
      // Check if all derivations are identical
      const firstResult = derivationResults[0];
      const allMatch = derivationResults.every(result => 
        result.identityPublicKey === firstResult.identityPublicKey &&
        result.nullifierCommitment === firstResult.nullifierCommitment &&
        result.staticEncryptionPublicKey === firstResult.staticEncryptionPublicKey &&
        result.staticDiscoveryPublicKey === firstResult.staticDiscoveryPublicKey &&
        result.userKey === firstResult.userKey
      );
      
      const duration = Date.now() - startTime;
      
      addTestResult({
        walletType: adapter.name,
        operation: 'Derivation Consistency',
        success: allMatch,
        duration,
        details: allMatch 
          ? `All ${iterations} derivations produced identical keys`
          : `Derivations were inconsistent - key generation is not deterministic`,
        data: {
          iterations,
          results: derivationResults,
          consistent: allMatch
        }
      });
      
      if (allMatch) {
        setDerivedKeys(await derivationWallet.deriveStaticKeys());
        setUserKey(await derivationWallet.getUserKeyForSharing());
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      addTestResult({
        walletType: adapter.name,
        operation: 'Derivation Consistency',
        success: false,
        duration,
        details: 'Test failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test derivation performance
  const testDerivationPerformance = async (adapter: WalletAdapter) => {
    try {
      derivationWallet.setAdapter(adapter);
      
      // Test single derivation
      const singleStart = Date.now();
      derivationWallet.clearCache();
      await derivationWallet.deriveStaticKeys();
      const singleDuration = Date.now() - singleStart;
      
      // Test cached derivation
      const cachedStart = Date.now();
      await derivationWallet.deriveStaticKeys(); // Should use cache
      const cachedDuration = Date.now() - cachedStart;
      
      // Test User Key generation
      const userKeyStart = Date.now();
      await derivationWallet.getUserKeyForSharing();
      const userKeyDuration = Date.now() - userKeyStart;
      
      addTestResult({
        walletType: adapter.name,
        operation: 'Performance Benchmark',
        success: true,
        duration: singleDuration,
        details: `Fresh derivation: ${singleDuration}ms, Cached: ${cachedDuration}ms, User Key: ${userKeyDuration}ms`,
        data: {
          freshDerivation: singleDuration,
          cachedDerivation: cachedDuration,
          userKeyGeneration: userKeyDuration
        }
      });
      
    } catch (error) {
      addTestResult({
        walletType: adapter.name,
        operation: 'Performance Benchmark',
        success: false,
        duration: 0,
        details: 'Performance test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Compare with current embedded wallet approach
  const compareWithEmbeddedWallet = async () => {
    try {
      // Test current embedded wallet
      const embeddedStart = Date.now();
      let embeddedUserKey: string;
      let embeddedSuccess = false;
      
      try {
        embeddedUserKey = embeddedWallet.getUserKeyForSharing();
        embeddedSuccess = true;
      } catch (error) {
        // Try loading account
        await embeddedWallet.loadAccount();
        embeddedUserKey = embeddedWallet.getUserKeyForSharing();
        embeddedSuccess = true;
      }
      const embeddedDuration = Date.now() - embeddedStart;
      
      // Test derivation wallet with PassKey
      const derivationStart = Date.now();
      const passKeyAdapter = new PassKeyAdapter();
      derivationWallet.setAdapter(passKeyAdapter);
      derivationWallet.clearCache();
      const derivationUserKey = await derivationWallet.getUserKeyForSharing();
      const derivationDuration = Date.now() - derivationStart;
      
      addTestResult({
        walletType: 'Comparison',
        operation: 'Embedded vs Derivation',
        success: embeddedSuccess,
        duration: embeddedDuration + derivationDuration,
        details: `Embedded: ${embeddedDuration}ms vs Derivation: ${derivationDuration}ms`,
        data: {
          embedded: {
            duration: embeddedDuration,
            userKey: embeddedUserKey.slice(0, 50) + '...',
            success: embeddedSuccess
          },
          derivation: {
            duration: derivationDuration,
            userKey: derivationUserKey.slice(0, 50) + '...',
            success: true
          },
          keysMatch: embeddedUserKey === derivationUserKey
        }
      });
      
    } catch (error) {
      addTestResult({
        walletType: 'Comparison',
        operation: 'Embedded vs Derivation',
        success: false,
        duration: 0,
        details: 'Comparison test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test specific wallet adapter
  const testWalletAdapter = async (adapterType: 'passkey' | 'metamask' | 'phantom') => {
    setIsRunning(true);
    
    try {
      let adapter: WalletAdapter;
      
      switch (adapterType) {
        case 'passkey':
          adapter = new PassKeyAdapter();
          break;
        case 'metamask':
          adapter = new MetaMaskAdapter();
          break;
        case 'phantom':
          adapter = new PhantomAdapter();
          break;
      }
      
      setCurrentAdapter(adapter);
      
      // Test availability
      const available = await adapter.isAvailable();
      if (!available) {
        addTestResult({
          walletType: adapter.name,
          operation: 'Availability Check',
          success: false,
          duration: 0,
          details: `${adapter.name} is not available`,
          error: 'Wallet not detected'
        });
        return;
      }
      
      // Test connection
      let connected = await adapter.isConnected();
      if (!connected) {
        if (adapterType !== 'passkey') {
          await adapter.connect();
          connected = await adapter.isConnected();
        }
      }
      
      if (!connected && adapterType !== 'passkey') {
        addTestResult({
          walletType: adapter.name,
          operation: 'Connection',
          success: false,
          duration: 0,
          details: `Failed to connect to ${adapter.name}`,
          error: 'Connection failed'
        });
        return;
      }
      
      // Test derivation consistency
      await testDerivationConsistency(adapter);
      
      // Test performance
      await testDerivationPerformance(adapter);
      
    } catch (error) {
      addTestResult({
        walletType: adapterType,
        operation: 'Wallet Test',
        success: false,
        duration: 0,
        details: 'Wallet test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    try {
      // Test PassKey
      await testWalletAdapter('passkey');
      
      // Test MetaMask if available
      const metamaskAdapter = new MetaMaskAdapter();
      if (await metamaskAdapter.isAvailable()) {
        await testWalletAdapter('metamask');
      }
      
      // Test Phantom if available
      const phantomAdapter = new PhantomAdapter();
      if (await phantomAdapter.isAvailable()) {
        await testWalletAdapter('phantom');
      }
      
      // Compare with embedded wallet
      await compareWithEmbeddedWallet();
      
    } catch (error) {
      console.error('Error running all tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={`derivation-wallet-test ${className || ''}`}>
      <div className="test-header">
        <h2>🔑 Stateless Key Derivation Test</h2>
        <p>
          Test the new stateless key derivation approach that generates keys from wallet signatures 
          instead of storing encrypted blobs.
        </p>
        
        <div className="test-info">
          <div className="domain-separators">
            <h4>Domain Separators:</h4>
            <ul>
              <li><code>NULLIFIER</code>: {ANOMA_DOMAIN_SEPARATORS.NULLIFIER}</li>
              <li><code>ENCRYPTION</code>: {ANOMA_DOMAIN_SEPARATORS.STATIC_ENCRYPTION}</li>
              <li><code>DISCOVERY</code>: {ANOMA_DOMAIN_SEPARATORS.STATIC_DISCOVERY}</li>
              <li><code>IDENTITY</code>: {ANOMA_DOMAIN_SEPARATORS.IDENTITY_VERIFICATION}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="test-controls">
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="run-all-button"
        >
          {isRunning ? '🔄 Running All Tests...' : '🚀 Run All Tests'}
        </button>
        
        <div className="individual-tests">
          <button 
            onClick={() => testWalletAdapter('passkey')} 
            disabled={isRunning}
            className="test-button passkey-button"
          >
            🔐 Test PassKey
          </button>
          <button 
            onClick={() => testWalletAdapter('metamask')} 
            disabled={isRunning}
            className="test-button metamask-button"
          >
            🦊 Test MetaMask
          </button>
          <button 
            onClick={() => testWalletAdapter('phantom')} 
            disabled={isRunning}
            className="test-button phantom-button"
          >
            👻 Test Phantom
          </button>
          <button 
            onClick={compareWithEmbeddedWallet} 
            disabled={isRunning}
            className="test-button comparison-button"
          >
            ⚖️ Compare Approaches
          </button>
        </div>

        <button 
          onClick={clearResults}
          className="clear-button"
        >
          🗑️ Clear Results
        </button>
      </div>

      {/* Display derived keys if available */}
      {derivedKeys && userKey && (
        <div className="derived-keys-display">
          <h3>✅ Successfully Derived Keys</h3>
          <div className="keys-grid">
            <div className="key-section">
              <h4>Identity Public Key</h4>
              <code>{formatKeyForDisplay(derivedKeys.identity.publicKey)}</code>
            </div>
            <div className="key-section">
              <h4>Nullifier Commitment (cnk)</h4>
              <code>{formatKeyForDisplay(derivedKeys.nullifier.cnk)}</code>
            </div>
            <div className="key-section">
              <h4>Static Encryption Public Key</h4>
              <code>{formatKeyForDisplay(derivedKeys.staticEncryption.publicKey)}</code>
            </div>
            <div className="key-section">
              <h4>Static Discovery Public Key</h4>
              <code>{formatKeyForDisplay(derivedKeys.staticDiscovery.publicKey)}</code>
            </div>
          </div>
          
          <div className="user-key-section">
            <h4>Generated User Key</h4>
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
        </div>
      )}

      <div className="test-results">
        {testResults.length === 0 && (
          <div className="no-results">
            <p>No test results yet. Run a test to see derivation wallet analysis.</p>
          </div>
        )}

        {testResults.map((result, index) => (
          <div key={index} className={`test-result ${result.success ? 'success' : 'failure'}`}>
            <div className="result-header">
              <h3>
                {result.success ? '✅' : '❌'} {result.walletType} - {result.operation}
              </h3>
              <div className="duration-badge">
                {result.duration}ms
              </div>
            </div>

            {result.error && (
              <div className="error-message">
                <strong>Error:</strong> {result.error}
              </div>
            )}

            <div className="result-details">
              <p><strong>Result:</strong> {result.details}</p>
              
              {result.data && (
                <div className="result-data">
                  <h4>Detailed Data:</h4>
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="approach-comparison">
        <h3>📊 Approach Comparison</h3>
        <div className="comparison-grid">
          <div className="approach-card current">
            <h4>❌ Current: Encrypted Blob Storage</h4>
            <ul>
              <li>Complex authentication flows</li>
              <li>Storage management overhead</li>
              <li>Cache invalidation issues</li>
              <li>PassKey-only support</li>
              <li>Backup/recovery complexity</li>
            </ul>
          </div>
          
          <div className="approach-card derivation">
            <h4>✅ New: Stateless Key Derivation</h4>
            <ul>
              <li>Zero storage overhead</li>
              <li>Universal wallet support</li>
              <li>Deterministic and reliable</li>
              <li>Simplified authentication</li>
              <li>No cache management needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
