/**
 * Signature Determinism Test Component
 * 
 * Tests whether different wallet types provide deterministic signatures:
 * 1. PassKeys (WebAuthn) - ECDSA signatures from embedded wallet
 * 2. MetaMask - Ethereum wallet signatures  
 * 3. Phantom - Solana wallet signatures
 * 
 * For each wallet type, we:
 * - Sign the same message multiple times
 * - Check if signatures are identical (deterministic) or different (non-deterministic)
 * - Analyze the cryptographic behavior and implications
 */

import React, { useState } from 'react';
import { embeddedWallet } from '../services/embeddedWallet';
import { useWallet } from '../hooks/useWallet';

interface TestResult {
  walletType: string;
  testMessage: string;
  signatures: string[];
  isDeterministic: boolean;
  details: string;
  error?: string;
}

interface SignatureDeterminismTestProps {
  className?: string;
}

export const SignatureDeterminismTest: React.FC<SignatureDeterminismTestProps> = ({ className }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testMessage] = useState('Test message for signature determinism: Hello World! 🌍');
  const [numTests] = useState(5); // Number of signatures to generate per wallet
  const { walletState, signMessage } = useWallet();

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test PassKey (WebAuthn) signature determinism
  const testPassKeyDeterminism = async (): Promise<TestResult> => {
    const signatures: string[] = [];
    let error: string | undefined;

    try {
      // Check if PassKey wallet is available
      if (!embeddedWallet.getState().isInitialized) {
        throw new Error('PassKey wallet not initialized. Please create or load an account first.');
      }

      // Ensure wallet is properly loaded (authenticate if needed)
      try {
        embeddedWallet.getStaticKeys();
      } catch (error) {
        // Keys not loaded, need to authenticate
        await embeddedWallet.loadAccount();
      }

      // Generate multiple signatures of the same message
      const messageBytes = new TextEncoder().encode(testMessage);
      
      for (let i = 0; i < numTests; i++) {
        const signatureBytes = await embeddedWallet.signMessage(messageBytes);
        // Convert Uint8Array to hex string for comparison
        const signature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        signatures.push(signature);
      }

      // Check if all signatures are identical
      const isDeterministic = signatures.every(sig => sig === signatures[0]);
      
      return {
        walletType: 'PassKey (WebAuthn)',
        testMessage,
        signatures,
        isDeterministic,
        details: isDeterministic 
          ? 'All signatures are identical - PassKey provides deterministic signatures'
          : 'Signatures differ - PassKey uses non-deterministic signing (likely includes random nonce)',
      };

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      return {
        walletType: 'PassKey (WebAuthn)',
        testMessage,
        signatures,
        isDeterministic: false,
        details: 'Test failed due to error',
        error,
      };
    }
  };

  // Test MetaMask signature determinism
  const testMetaMaskDeterminism = async (): Promise<TestResult> => {
    const signatures: string[] = [];
    let error: string | undefined;

    try {
      // Check if MetaMask is available and connected
      if (!walletState.connected || !walletState.account) {
        throw new Error('MetaMask not connected. Please connect MetaMask first.');
      }

      // Generate multiple signatures of the same message
      for (let i = 0; i < numTests; i++) {
        const signature = await signMessage(testMessage);
        signatures.push(signature);
      }

      // Check if all signatures are identical
      const isDeterministic = signatures.every(sig => sig === signatures[0]);
      
      return {
        walletType: 'MetaMask (Ethereum)',
        testMessage,
        signatures,
        isDeterministic,
        details: isDeterministic 
          ? 'All signatures are identical - MetaMask provides deterministic signatures'
          : 'Signatures differ - MetaMask uses non-deterministic signing (likely includes random nonce)',
      };

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      return {
        walletType: 'MetaMask (Ethereum)',
        testMessage,
        signatures,
        isDeterministic: false,
        details: 'Test failed due to error',
        error,
      };
    }
  };

  // Test Phantom wallet signature determinism (EVM-compatible)
  const testPhantomDeterminism = async (): Promise<TestResult> => {
    const signatures: string[] = [];
    let error: string | undefined;

    try {
      // Check if Phantom wallet is available (EVM mode)
      if (!(window as any).phantom?.ethereum) {
        throw new Error('Phantom wallet (Ethereum) not detected. Please install Phantom wallet and enable Ethereum support.');
      }

      const phantom = (window as any).phantom.ethereum;
      
      // Check if connected, if not request connection
      let accounts = await phantom.request({ method: 'eth_accounts' });
      
      if (!accounts || accounts.length === 0) {
        // Request connection
        accounts = await phantom.request({ method: 'eth_requestAccounts' });
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('Phantom wallet not connected properly.');
      }

      const account = accounts[0];

      // Generate multiple signatures of the same message
      for (let i = 0; i < numTests; i++) {
        // Use personal_sign for consistent message signing (like MetaMask)
        const signature = await phantom.request({
          method: 'personal_sign',
          params: [
            `0x${Array.from(new TextEncoder().encode(testMessage)).map(b => b.toString(16).padStart(2, '0')).join('')}`,
            account
          ]
        });
        signatures.push(signature);
      }

      // Check if all signatures are identical
      const isDeterministic = signatures.every(sig => sig === signatures[0]);
      
      return {
        walletType: 'Phantom (Ethereum/EVM)',
        testMessage,
        signatures,
        isDeterministic,
        details: isDeterministic 
          ? 'All signatures are identical - Phantom provides deterministic signatures'
          : 'Signatures differ - Phantom uses non-deterministic signing (likely includes random nonce)',
      };

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      return {
        walletType: 'Phantom (Ethereum/EVM)',
        testMessage,
        signatures,
        isDeterministic: false,
        details: 'Test failed due to error',
        error,
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // Test PassKey determinism
      console.log('Testing PassKey signature determinism...');
      const passKeyResult = await testPassKeyDeterminism();
      addTestResult(passKeyResult);

      // Test MetaMask determinism
      console.log('Testing MetaMask signature determinism...');
      const metaMaskResult = await testMetaMaskDeterminism();
      addTestResult(metaMaskResult);

      // Test Phantom determinism
      console.log('Testing Phantom signature determinism...');
      const phantomResult = await testPhantomDeterminism();
      addTestResult(phantomResult);

    } catch (error) {
      console.error('Error running signature determinism tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTest = async (walletType: 'passkey' | 'metamask' | 'phantom') => {
    setIsRunning(true);

    try {
      let result: TestResult;
      
      switch (walletType) {
        case 'passkey':
          result = await testPassKeyDeterminism();
          break;
        case 'metamask':
          result = await testMetaMaskDeterminism();
          break;
        case 'phantom':
          result = await testPhantomDeterminism();
          break;
      }
      
      addTestResult(result);
    } catch (error) {
      console.error(`Error testing ${walletType}:`, error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={`signature-determinism-test ${className || ''}`}>
      <div className="test-header">
        <h2>🔬 Signature Determinism Test</h2>
        <p>Test whether different wallet types produce deterministic signatures when signing the same message multiple times.</p>
        
        <div className="test-info">
          <div className="test-message">
            <strong>Test Message:</strong> <code>{testMessage}</code>
          </div>
          <div className="test-params">
            <strong>Number of signatures per wallet:</strong> {numTests}
          </div>
        </div>
      </div>

      <div className="test-controls">
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="run-all-button"
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
        </button>
        
        <div className="individual-tests">
          <button 
            onClick={() => runIndividualTest('passkey')} 
            disabled={isRunning}
            className="test-button passkey-button"
          >
            🔐 Test PassKey
          </button>
          <button 
            onClick={() => runIndividualTest('metamask')} 
            disabled={isRunning}
            className="test-button metamask-button"
          >
            🦊 Test MetaMask
          </button>
          <button 
            onClick={() => runIndividualTest('phantom')} 
            disabled={isRunning}
            className="test-button phantom-button"
          >
            👻 Test Phantom
          </button>
        </div>

        <button 
          onClick={clearResults}
          className="clear-button"
        >
          🗑️ Clear Results
        </button>
      </div>

      <div className="test-results">
        {testResults.length === 0 && (
          <div className="no-results">
            <p>No test results yet. Run a test to see signature determinism analysis.</p>
          </div>
        )}

        {testResults.map((result, index) => (
          <div key={index} className={`test-result ${result.isDeterministic ? 'deterministic' : 'non-deterministic'}`}>
            <div className="result-header">
              <h3>
                {result.isDeterministic ? '✅' : '❌'} {result.walletType}
              </h3>
              <div className="determinism-badge">
                {result.isDeterministic ? 'DETERMINISTIC' : 'NON-DETERMINISTIC'}
              </div>
            </div>

            {result.error && (
              <div className="error-message">
                <strong>Error:</strong> {result.error}
              </div>
            )}

            <div className="result-details">
              <p><strong>Analysis:</strong> {result.details}</p>
              
              <div className="signatures-section">
                <h4>Generated Signatures ({result.signatures.length}):</h4>
                <div className="signatures-list">
                  {result.signatures.map((signature, sigIndex) => (
                    <div key={sigIndex} className="signature-item">
                      <span className="signature-index">#{sigIndex + 1}:</span>
                      <code className="signature-value">{signature.slice(0, 50)}...</code>
                      {sigIndex > 0 && (
                        <span className={`signature-comparison ${signature === result.signatures[0] ? 'same' : 'different'}`}>
                          {signature === result.signatures[0] ? '(same)' : '(different)'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {result.signatures.length > 1 && (
                <div className="summary">
                  <strong>Summary:</strong> {
                    result.isDeterministic 
                      ? `All ${result.signatures.length} signatures are identical`
                      : `${result.signatures.filter((sig, i) => i === 0 || sig !== result.signatures[0]).length} unique signatures out of ${result.signatures.length}`
                  }
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="test-explanation">
        <h3>📚 Understanding Signature Determinism</h3>
        <div className="explanation-content">
          <div className="deterministic-explanation">
            <h4>✅ Deterministic Signatures</h4>
            <ul>
              <li>Same private key + same message = same signature every time</li>
              <li>Predictable and reproducible</li>
              <li>Useful for certain cryptographic protocols</li>
              <li>May use RFC 6979 deterministic nonce generation</li>
            </ul>
          </div>
          
          <div className="non-deterministic-explanation">
            <h4>❌ Non-Deterministic Signatures</h4>
            <ul>
              <li>Same private key + same message = different signature each time</li>
              <li>Uses random nonce for each signature</li>
              <li>More secure against certain attacks (nonce reuse)</li>
              <li>Standard for most ECDSA implementations</li>
            </ul>
          </div>

          <div className="security-note">
            <h4>🔒 Security Implications</h4>
            <p>
              <strong>Non-deterministic signatures are generally more secure</strong> because they prevent 
              nonce reuse attacks. However, deterministic signatures can be useful in specific protocols 
              where reproducibility is required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
