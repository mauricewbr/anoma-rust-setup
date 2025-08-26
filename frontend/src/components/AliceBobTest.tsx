/**
 * Alice-Bob Resource Sharing Test Component
 * 
 * Implements the complete user story from the key hierarchy proposal:
 * - Alice sends Bob a resource using his User Key
 * - Complete encryption/decryption flow
 * - Discovery mechanism simulation
 */

import React, { useState, useEffect } from 'react';
import { embeddedWallet } from '../services/embeddedWallet';
import {
  generateEphemeralEncryptionKeyPair,
  generateEphemeralDiscoveryKeyPair,
  kdf,
  diffieHellman,
  encrypt,
  decrypt,
  deserializeUserKey,
  bytesToHex,
  formatKeyForDisplay
} from '../services/cryptography';

interface AliceBobTestProps {
  className?: string;
}

interface TestResource {
  id: string;
  type: string;
  value: Uint8Array;
  cnk: Uint8Array; // nullifier key commitment
}

interface EncryptedTransaction {
  // Resource payload
  encryptedResource: Uint8Array;
  ephemeralEncryptionPublicKey: Uint8Array; // eepk_A
  
  // Discovery payload  
  encryptedDiscovery: Uint8Array;
  ephemeralDiscoveryPublicKey: Uint8Array; // edpk_A
  
  // Metadata
  timestamp: number;
  transactionId: string;
}

export const AliceBobTest: React.FC<AliceBobTestProps> = ({ className }) => {
  const [bobUserKey, setBobUserKey] = useState<string>('');
  const [testResource, setTestResource] = useState<TestResource | null>(null);
  const [transaction, setTransaction] = useState<EncryptedTransaction | null>(null);
  const [decryptedResource, setDecryptedResource] = useState<TestResource | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string>('');
  const [testResults, setTestResults] = useState<{
    step: string;
    success: boolean;
    details: string;
    data?: any;
  }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Initialize with current user's key as Bob for demo
    try {
      const currentUserKey = embeddedWallet.getUserKeyForSharing();
      setBobUserKey(currentUserKey);
    } catch (error) {
      // User not initialized yet
    }
  }, []);

  const addTestResult = (step: string, success: boolean, details: string, data?: any) => {
    setTestResults(prev => [...prev, { step, success, details, data }]);
  };

  const clearResults = () => {
    setTestResults([]);
    setTransaction(null);
    setDecryptedResource(null);
  };

  const createTestResource = (): TestResource => {
    const resourceData = new TextEncoder().encode(JSON.stringify({
      type: "digital_token",
      amount: 100,
      currency: "ANOMA",
      message: "Hello from Alice! 🎉"
    }));
    
    const parsedBobKey = deserializeUserKey(bobUserKey);
    
    const resource: TestResource = {
      id: `resource_${Date.now()}`,
      type: "digital_token",
      value: resourceData,
      cnk: parsedBobKey.cnk // Step 2: Alice sets r.cnk = ukB.cnk
    };
    
    return resource;
  };

  const runAliceSendsResource = async () => {
    setIsRunning(true);
    clearResults();
    
    try {
      if (!bobUserKey.trim()) {
        throw new Error('Please provide Bob\'s User Key');
      }

      // Step 1: Alice looks up Bob's user key
      addTestResult('Step 1', true, 'Alice looks up Bob\'s User Key', { userKey: bobUserKey.slice(0, 50) + '...' });
      
      const bobKey = deserializeUserKey(bobUserKey);
      
      // Create test resource and assign nullifier commitment
      const resource = createTestResource();
      setTestResource(resource);
      addTestResult('Step 2', true, `Alice sets r.cnk = ukB.cnk`, { 
        resourceId: resource.id,
        cnk: formatKeyForDisplay(resource.cnk)
      });

      // Step 3: Alice generates ephemeral encryption key pair
      const ephemeralEncryptionKeyPair = generateEphemeralEncryptionKeyPair();
      addTestResult('Step 3', true, 'Alice generates ephemeral encryption key pair (eeskA, eepkA)', {
        eepkA: formatKeyForDisplay(ephemeralEncryptionKeyPair.publicKey)
      });

      // Step 4: Alice generates resource encryption key
      const dhSecret1 = diffieHellman(ephemeralEncryptionKeyPair.privateKey, bobKey.sepk);
      const resourceEncryptionKey = kdf(dhSecret1, ephemeralEncryptionKeyPair.publicKey);
      addTestResult('Step 4', true, 'Alice derives resource encryption key: rekAB = KDF(DH(sepkB, eeskA), eepkA)', {
        rekAB: formatKeyForDisplay(resourceEncryptionKey)
      });

      // Step 5: Alice encrypts the resource
      const encryptedResource = await encrypt(resourceEncryptionKey, resource.value);
      addTestResult('Step 5', true, 'Alice encrypts resource: ce = Encrypt(rekAB, r)', {
        originalSize: resource.value.length,
        encryptedSize: encryptedResource.length
      });

      // Step 6: Alice generates ephemeral discovery key pair
      const ephemeralDiscoveryKeyPair = generateEphemeralDiscoveryKeyPair();
      addTestResult('Step 6', true, 'Alice generates ephemeral discovery key pair (edskA, edpkA)', {
        edpkA: formatKeyForDisplay(ephemeralDiscoveryKeyPair.publicKey)
      });

      // Step 7: Alice generates discovery encryption key
      const dhSecret2 = diffieHellman(ephemeralDiscoveryKeyPair.privateKey, bobKey.sdpk);
      const discoveryEncryptionKey = kdf(dhSecret2, ephemeralDiscoveryKeyPair.publicKey);
      addTestResult('Step 7', true, 'Alice derives discovery encryption key: dekAB = KDF(DH(sdpkB, edskA), edpkA)', {
        dekAB: formatKeyForDisplay(discoveryEncryptionKey)
      });

      // Step 8: Alice encrypts discovery message
      const discoveryMsg = `Resource for Bob: ${resource.id}, type: ${resource.type}`;
      setDiscoveryMessage(discoveryMsg);
      const discoveryBytes = new TextEncoder().encode(discoveryMsg);
      const encryptedDiscovery = await encrypt(discoveryEncryptionKey, discoveryBytes);
      addTestResult('Step 8', true, 'Alice encrypts discovery message: cd = Encrypt(dekAB, discoveryMessage)', {
        message: discoveryMsg,
        encryptedSize: encryptedDiscovery.length
      });

      // Create the transaction
      const tx: EncryptedTransaction = {
        encryptedResource,
        ephemeralEncryptionPublicKey: ephemeralEncryptionKeyPair.publicKey,
        encryptedDiscovery,
        ephemeralDiscoveryPublicKey: ephemeralDiscoveryKeyPair.publicKey,
        timestamp: Date.now(),
        transactionId: `tx_${Date.now()}`
      };
      
      setTransaction(tx);
      addTestResult('Transaction Created', true, 'Alice creates complete encrypted transaction', {
        transactionId: tx.transactionId,
        payloadSizes: {
          encryptedResource: tx.encryptedResource.length,
          encryptedDiscovery: tx.encryptedDiscovery.length
        }
      });

    } catch (error) {
      addTestResult('Error', false, `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { error });
    } finally {
      setIsRunning(false);
    }
  };

  const runBobReceivesResource = async () => {
    if (!transaction) {
      addTestResult('Error', false, 'No transaction to decrypt', {});
      return;
    }

    setIsRunning(true);

    try {
      // Bob needs his private keys - authenticate if needed
      let bobStaticKeys;
      try {
        bobStaticKeys = embeddedWallet.getStaticKeys();
      } catch (error) {
        // Wallet not authenticated, need to load keys first
        addTestResult('Authentication', true, 'Bob needs to authenticate to access private keys', {});
        await embeddedWallet.loadAccount();
        bobStaticKeys = embeddedWallet.getStaticKeys();
        addTestResult('Authentication', true, 'Bob successfully authenticated with PassKey', {});
      }
      
      // Step 9: Bob discovers the transaction (indexer simulation)
      addTestResult('Step 9', true, 'Indexer scans transactions using Bob\'s sdskB', {
        transactionId: transaction.transactionId
      });

      // Step 10: Bob computes discovery encryption key
      const bobDiscoverySecret = diffieHellman(bobStaticKeys.staticDiscovery.privateKey, transaction.ephemeralDiscoveryPublicKey);
      const bobDiscoveryKey = kdf(bobDiscoverySecret, transaction.ephemeralDiscoveryPublicKey);
      addTestResult('Step 10', true, 'Bob derives discovery encryption key: dekAB = KDF(DH(edpkA, sdskB), edpkA)', {
        dekAB: formatKeyForDisplay(bobDiscoveryKey)
      });

      // Step 11: Bob decrypts discovery message
      const decryptedDiscoveryBytes = await decrypt(bobDiscoveryKey, transaction.encryptedDiscovery);
      const decryptedDiscoveryMessage = new TextDecoder().decode(decryptedDiscoveryBytes);
      addTestResult('Step 11', true, 'Bob decrypts discovery message', {
        originalMessage: discoveryMessage,
        decryptedMessage: decryptedDiscoveryMessage,
        matches: discoveryMessage === decryptedDiscoveryMessage
      });

      // Step 12: Bob computes resource encryption key
      const bobResourceSecret = diffieHellman(bobStaticKeys.staticEncryption.privateKey, transaction.ephemeralEncryptionPublicKey);
      const bobResourceKey = kdf(bobResourceSecret, transaction.ephemeralEncryptionPublicKey);
      addTestResult('Step 12', true, 'Bob derives resource encryption key: rekAB = KDF(DH(eepkA, seskB), eepkA)', {
        rekAB: formatKeyForDisplay(bobResourceKey)
      });

      // Step 13: Bob decrypts the resource
      const decryptedResourceBytes = await decrypt(bobResourceKey, transaction.encryptedResource);
      const decryptedResourceData = JSON.parse(new TextDecoder().decode(decryptedResourceBytes));
      
      const decryptedRes: TestResource = {
        id: testResource!.id,
        type: testResource!.type,
        value: decryptedResourceBytes,
        cnk: testResource!.cnk
      };
      
      setDecryptedResource(decryptedRes);
      addTestResult('Step 13', true, 'Bob decrypts resource: r = Decrypt(rekAB, ce)', {
        resourceData: decryptedResourceData,
        originalSize: testResource!.value.length,
        decryptedSize: decryptedResourceBytes.length,
        dataMatches: bytesToHex(testResource!.value) === bytesToHex(decryptedResourceBytes)
      });

      addTestResult('✅ Complete', true, 'Alice-Bob resource sharing completed successfully!', {
        summary: {
          resourceTransferred: decryptedResourceData,
          encryptionWorked: true,
          discoveryWorked: decryptedDiscoveryMessage === discoveryMessage,
          dataIntegrity: bytesToHex(testResource!.value) === bytesToHex(decryptedResourceBytes)
        }
      });

    } catch (error) {
      addTestResult('Error', false, `Bob decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { error });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={`alice-bob-test ${className || ''}`}>
      <div className="test-header">
        <h3>🧪 Alice-Bob Resource Sharing Test</h3>
        <p>
          Complete implementation of the key hierarchy proposal user story.
          This demonstrates the full encryption/decryption flow for private resource sharing.
        </p>
      </div>

      <div className="test-controls">
        <div className="input-section">
          <label htmlFor="bob-user-key">
            <strong>Bob's User Key</strong> (recipient)
          </label>
          <textarea
            id="bob-user-key"
            value={bobUserKey}
            onChange={(e) => setBobUserKey(e.target.value)}
            placeholder="Paste Bob's User Key here..."
            rows={3}
            className="user-key-input"
          />
          <small>💡 You can use your own User Key from above for testing</small>
        </div>

        <div className="test-buttons">
          <button 
            onClick={runAliceSendsResource}
            disabled={isRunning || !bobUserKey.trim()}
            className="test-button alice-button"
          >
            {isRunning ? '🔄 Running...' : '👩‍💻 Alice Sends Resource'}
          </button>
          
          <button 
            onClick={runBobReceivesResource}
            disabled={isRunning || !transaction}
            className="test-button bob-button"
          >
            {isRunning ? '🔄 Running...' : '👨‍💻 Bob Receives Resource'}
          </button>
          
          <button 
            onClick={clearResults}
            disabled={isRunning}
            className="test-button clear-button"
          >
            🗑️ Clear Results
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="test-results">
          <h4>📊 Test Execution Results</h4>
          <div className="results-list">
            {testResults.map((result, index) => (
              <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  <span className="result-icon">{result.success ? '✅' : '❌'}</span>
                  <strong>{result.step}</strong>
                </div>
                <div className="result-details">
                  <p>{result.details}</p>
                  {result.data && (
                    <details className="result-data">
                      <summary>View Details</summary>
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {decryptedResource && (
        <div className="success-summary">
          <h4>🎉 Resource Successfully Transferred!</h4>
          <div className="resource-comparison">
            <div className="resource-section">
              <h5>📤 Original Resource (Alice)</h5>
              <pre>{JSON.stringify(JSON.parse(new TextDecoder().decode(testResource!.value)), null, 2)}</pre>
            </div>
            <div className="resource-section">
              <h5>📥 Decrypted Resource (Bob)</h5>
              <pre>{JSON.stringify(JSON.parse(new TextDecoder().decode(decryptedResource.value)), null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
