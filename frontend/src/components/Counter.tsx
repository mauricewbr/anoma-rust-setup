import { useState, type FC } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useCounter } from '../hooks/useCounter';

export const Counter: FC = () => {
  const { walletState, signMessage } = useWallet();
  const { counterState, initializeCounter, incrementCounter, decrementCounter, resetError } = useCounter();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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
