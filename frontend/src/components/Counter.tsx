import { useState, type FC } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useCounter } from '../hooks/useCounter';
import { ApiService } from '../services/api';
import { ProtocolAdapterService } from '../services/protocolAdapter';
import type { EmitTransactionResponse } from '../types/api';

export const Counter: FC = () => {
  const { walletState, signMessage } = useWallet();
  const { counterState, initializeCounter, incrementCounter, decrementCounter, resetError } = useCounter();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [emitResult, setEmitResult] = useState<EmitTransactionResponse | null>(null);

  const handleAction = async (action: 'initialize' | 'increment' | 'decrement') => {
    if (!walletState.connected || !walletState.account) {
      alert('Please connect your wallet first');
      return;
    }

    setActionInProgress(action);
    resetError();

    try {
      let result;
      switch (action) {
        case 'initialize':
          result = await initializeCounter(walletState.account, signMessage);
          break;
        case 'increment':
          result = await incrementCounter(walletState.account, signMessage);
          break;
        case 'decrement':
          result = await decrementCounter(walletState.account, signMessage);
          break;
      }

      console.log('Action completed:', result);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEmitEmptyTransaction = async () => {
    if (!walletState.connected || !walletState.account) {
      alert('Please connect your wallet first');
      return;
    }

    setActionInProgress('emit_empty');
    setEmitResult(null);

    try {
      // Step 1: Generate message to sign
      const timestamp = new Date().toISOString();
      const messageToSign = ApiService.generateEmitTransactionMessage(walletState.account, timestamp);

      // Step 2: Get signature from MetaMask
      const signature = await signMessage(messageToSign);

      // Step 3: Send to backend to emit empty transaction
      const result = await ApiService.emitEmptyTransaction(
        walletState.account,
        signature,
        messageToSign,
        timestamp
      );

      setEmitResult(result);
      console.log('✅ Empty transaction emitted:', result);
    } catch (error) {
      console.error('❌ Failed to emit empty transaction:', error);
      alert(`Failed to emit empty transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEmitRealTransaction = async () => {
    if (!walletState.connected || !walletState.account) {
      alert('Please connect your wallet first');
      return;
    }

    setActionInProgress('emit_real');
    setEmitResult(null);

    try {
      // 🔧 HARDCODED TEST: Skip backend, directly test ethers.js with known working data
      console.log('🔧 HARDCODED TEST: Bypassing backend, testing ethers.js directly...');
      
      // Step 1: Execute hardcoded transaction with ethers.js (same as Etherscan)
      console.log('🔧 Executing hardcoded transaction with ethers.js...');
      const signer = await ProtocolAdapterService.getSigner();
      const txHash = await ProtocolAdapterService.executeTransaction(signer); // Pass null since we're using hardcoded data

      console.log('✅ Hardcoded transaction successful!');
      setEmitResult({
        transaction_hash: txHash,
        success: true,
        message: 'Hardcoded transaction successfully executed on Ethereum Sepolia via ethers.js (same data as Etherscan)'
      });

    } catch (error) {
      console.error('❌ Failed to emit hardcoded transaction:', error);
      setEmitResult({
        transaction_hash: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEmitRealTransactionAlloy = async () => {
    if (!walletState.connected || !walletState.account) {
      alert('Please connect your wallet first');
      return;
    }

    setActionInProgress('emit_real_alloy');
    setEmitResult(null);

    try {
      // Step 1: Generate message to sign
      const timestamp = new Date().toISOString();
      const messageToSign = ApiService.generateEmitTransactionMessage(walletState.account, timestamp);

      // Step 2: Get signature from MetaMask
      const signature = await signMessage(messageToSign);

      // Step 3: Call backend Alloy implementation
      console.log('⚡ Testing Alloy backend implementation...');
      const response = await ApiService.emitRealTransaction(
        walletState.account,
        signature,
        messageToSign,
        timestamp
      );

      console.log('✅ Alloy backend response:', response);
      setEmitResult({
        transaction_hash: response.transaction_hash,
        success: response.success,
        message: `Alloy backend result: ${response.message}`
      });

    } catch (error) {
      console.error('❌ Failed to emit real transaction via Alloy:', error);
      setEmitResult({
        transaction_hash: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEmitCounterTransaction = async () => {
    if (!walletState.connected || !walletState.account) {
      alert('Please connect your wallet first');
      return;
    }

    setActionInProgress('emit_counter');
    setEmitResult(null);

    try {
      // Step 1: Generate message to sign
      const timestamp = new Date().toISOString();
      const messageToSign = ApiService.generateEmitTransactionMessage(walletState.account, timestamp);

      // Step 2: Get signature from MetaMask
      const signature = await signMessage(messageToSign);

      // Step 3: Send to backend to emit ARM counter transaction
      const result = await ApiService.emitCounterTransaction(
        walletState.account,
        signature,
        messageToSign,
        timestamp
      );

      setEmitResult(result);
      console.log('✅ ARM counter transaction emitted:', result);
    } catch (error) {
      console.error('❌ Failed to emit counter transaction:', error);
      alert(`Failed to emit counter transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const isDisabled = (action: string) => {
    if (!walletState.connected || counterState.isLoading || actionInProgress) {
      return true;
    }
    
    if (action === 'initialize') {
      return counterState.isInitialized;
    }
    
    if (action === 'increment' || action === 'decrement') {
      return !counterState.isInitialized;
    }
    
    if (action === 'decrement') {
      return counterState.value <= 0;
    }
    
    return false;
  };

  return (
    <div className="counter-container">
      <h2>🎯 Anoma Counter dApp</h2>
      
      <div className="counter-display">
        <span className="counter-value">{counterState.value}</span>
      </div>

      <div className="counter-status">
        {counterState.isInitialized ? (
          <span className="status-initialized">✅ Counter Initialized</span>
        ) : (
          <span className="status-uninitialized">⏳ Counter Not Initialized</span>
        )}
      </div>

      <div className="counter-controls">
        <button
          onClick={() => handleAction('initialize')}
          disabled={isDisabled('initialize')}
          className="btn btn-init"
        >
          {actionInProgress === 'initialize' ? 'Initializing...' : 'Initialize Counter'}
        </button>

        <div className="counter-actions">
          <button
            onClick={() => handleAction('decrement')}
            disabled={isDisabled('decrement')}
            className="btn btn-decrement"
          >
            {actionInProgress === 'decrement' ? '⏳' : '−'}
          </button>
          
          <button
            onClick={() => handleAction('increment')}
            disabled={isDisabled('increment')}
            className="btn btn-increment"
          >
            {actionInProgress === 'increment' ? '⏳' : '+'}
          </button>
        </div>
      </div>

      <div className="protocol-adapter-section">
        <h3>🌐 Protocol Adapter</h3>
        <p>Test different transaction types with the Ethereum Sepolia Protocol Adapter</p>
        
        <div className="transaction-buttons">
          <button
            onClick={handleEmitEmptyTransaction}
            disabled={!walletState.connected || actionInProgress !== null}
            className="btn btn-emit btn-empty"
          >
            {actionInProgress === 'emit_empty' ? 'Emitting Empty...' : '📝 Emit Empty Transaction'}
          </button>
          
                  <button
          onClick={handleEmitRealTransaction}
          disabled={!walletState.connected || actionInProgress !== null}
          className="btn btn-emit btn-real"
        >
          {actionInProgress === 'emit_real' ? 'Emitting Real ARM...' : '🚀 Emit Real ARM (Ethers.js)'}
        </button>
        
        <button
          onClick={handleEmitRealTransactionAlloy}
          disabled={!walletState.connected || actionInProgress !== null}
          className="btn btn-emit btn-alloy"
        >
          {actionInProgress === 'emit_real_alloy' ? 'Emitting Real ARM...' : '⚡ Emit Real ARM (Alloy)'}
        </button>

          <button
            onClick={handleEmitCounterTransaction}
            disabled={!walletState.connected || actionInProgress !== null}
            className="btn btn-emit btn-counter"
          >
            {actionInProgress === 'emit_counter' ? 'Emitting Counter...' : '🔢 Emit ARM Counter Transaction'}
          </button>
        </div>
        
        <div className="transaction-info">
          <p><strong>📝 Empty Transaction:</strong> Simple test transaction (works with any Protocol Adapter)</p>
          <p><strong>🚀 Real ARM (Ethers.js):</strong> ✅ Working hardcoded transaction via ethers.js</p>
          <p><strong>⚡ Real ARM (Alloy):</strong> Backend Alloy implementation test (comparing vs ethers.js)</p>
          <p><strong>🔢 ARM Counter Transaction:</strong> Real ARM counter initialization with actual logic</p>
        </div>

        {emitResult && (
          <div className="emit-result">
            <h4>✅ Transaction Emitted Successfully!</h4>
            <div className="transaction-details">
              <p><strong>Transaction Hash:</strong> 
                <a 
                  href={`https://sepolia.etherscan.io/tx/${emitResult.transaction_hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  {emitResult.transaction_hash}
                </a>
              </p>
              <p><strong>Message:</strong> {emitResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {counterState.isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Processing transaction...</p>
        </div>
      )}

      {counterState.error && (
        <div className="error-message">
          ❌ {counterState.error}
          <button onClick={resetError} className="btn-link">Dismiss</button>
        </div>
      )}

      {counterState.lastSignedTransaction && (
        <div className="transaction-info">
          <h4>✅ Last Signed Transaction</h4>
          <div className="transaction-details">
            <p><strong>Signature:</strong> {counterState.lastSignedTransaction.signature.slice(0, 20)}...</p>
            <p><strong>Signer:</strong> {counterState.lastSignedTransaction.signer}</p>
            <p><strong>Timestamp:</strong> {new Date(counterState.lastSignedTransaction.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}

      {counterState.lastResult && (
        <details className="result-details">
          <summary>🔍 Last Backend Response</summary>
          <pre>{JSON.stringify(counterState.lastResult, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
