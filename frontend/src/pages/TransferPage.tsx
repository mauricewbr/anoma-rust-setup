/**
 * Transfer Page Component
 * 
 * Resource transfer interface for logged-in users
 */

import React, { useState, useEffect } from 'react';
import { derivationWallet } from '../services/derivationWallet';

interface TransferPageProps {
  userKey: string;
  walletType: string;
}

interface TransferForm {
  recipientUserKey: string;
  resourceType: string;
  amount: number;
  message: string;
}

export const TransferPage: React.FC<TransferPageProps> = ({ userKey, walletType }) => {
  const [transferForm, setTransferForm] = useState<TransferForm>({
    recipientUserKey: '',
    resourceType: 'ANOMA',
    amount: 0,
    message: ''
  });
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');

  useEffect(() => {
    loadWalletInfo();
  }, []);

  const loadWalletInfo = async () => {
    try {
      const address = await derivationWallet.getAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error('Failed to load wallet info:', error);
    }
  };

  const handleInputChange = (field: keyof TransferForm, value: string | number) => {
    setTransferForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTransfer = async () => {
    try {
      setIsTransferring(true);
      setTransferResult(null);

      // Validate form
      if (!transferForm.recipientUserKey.trim()) {
        throw new Error('Recipient User Key is required');
      }
      if (transferForm.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // TODO: Implement actual transfer logic
      // For now, simulate the transfer process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResult = {
        success: true,
        transactionId: `tx_${Date.now()}`,
        recipient: transferForm.recipientUserKey.slice(0, 20) + '...',
        amount: transferForm.amount,
        resourceType: transferForm.resourceType,
        message: transferForm.message,
        timestamp: new Date().toISOString()
      };

      setTransferResult(mockResult);
      
      // Reset form
      setTransferForm({
        recipientUserKey: '',
        resourceType: 'ANOMA',
        amount: 0,
        message: ''
      });

    } catch (error) {
      setTransferResult({
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const fillWithCurrentUserKey = () => {
    setTransferForm(prev => ({
      ...prev,
      recipientUserKey: userKey
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">💸 Send Resources</h1>
        <p className="text-xl text-gray-600">Transfer resources to other Anoma users</p>
      </div>

      <div className="transfer-container">
        {/* User Info */}
        <div className="user-info">
          <h3>👤 Your Account</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Wallet Type:</label>
              <span>{walletType}</span>
            </div>
            <div className="info-item">
              <label>Wallet Address:</label>
              <span>{walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : 'Loading...'}</span>
            </div>
            <div className="info-item">
              <label>Your User Key:</label>
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
        </div>

        {/* Transfer Form */}
        <div className="transfer-form">
          <h3>📤 Send Resources</h3>
          
          <div className="form-group">
            <label htmlFor="recipientUserKey">
              Recipient's User Key *
              <button 
                type="button"
                onClick={fillWithCurrentUserKey}
                className="helper-button"
                title="Use your own User Key for testing"
              >
                Use My Key (Test)
              </button>
            </label>
            <textarea
              id="recipientUserKey"
              value={transferForm.recipientUserKey}
              onChange={(e) => handleInputChange('recipientUserKey', e.target.value)}
              placeholder="Paste the recipient's User Key here..."
              rows={3}
              className="user-key-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="resourceType">Resource Type</label>
              <select
                id="resourceType"
                value={transferForm.resourceType}
                onChange={(e) => handleInputChange('resourceType', e.target.value)}
              >
                <option value="ANOMA">ANOMA</option>
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="DAI">DAI</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount *</label>
              <input
                type="number"
                id="amount"
                value={transferForm.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message (Optional)</label>
            <input
              type="text"
              id="message"
              value={transferForm.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Add a message for the recipient..."
              maxLength={100}
            />
          </div>

          <div className="transfer-actions">
            <button
              onClick={handleTransfer}
              disabled={isTransferring || !transferForm.recipientUserKey.trim() || transferForm.amount <= 0}
              className="primary-button transfer-button"
            >
              {isTransferring ? '🔄 Processing Transfer...' : '💸 Send Resources'}
            </button>
          </div>
        </div>

        {/* Transfer Result */}
        {transferResult && (
          <div className={`transfer-result ${transferResult.success ? 'success' : 'error'}`}>
            <h3>{transferResult.success ? '✅ Transfer Successful' : '❌ Transfer Failed'}</h3>
            
            {transferResult.success ? (
              <div className="success-details">
                <div className="result-grid">
                  <div className="result-item">
                    <label>Transaction ID:</label>
                    <code>{transferResult.transactionId}</code>
                  </div>
                  <div className="result-item">
                    <label>Recipient:</label>
                    <span>{transferResult.recipient}</span>
                  </div>
                  <div className="result-item">
                    <label>Amount:</label>
                    <span>{transferResult.amount} {transferResult.resourceType}</span>
                  </div>
                  {transferResult.message && (
                    <div className="result-item">
                      <label>Message:</label>
                      <span>{transferResult.message}</span>
                    </div>
                  )}
                  <div className="result-item">
                    <label>Timestamp:</label>
                    <span>{new Date(transferResult.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="next-steps">
                  <h4>What happens next?</h4>
                  <ul>
                    <li>🔐 Your resource is encrypted with the recipient's keys</li>
                    <li>📡 Transaction is broadcast to the Anoma network</li>
                    <li>🔍 Recipient can discover it using their discovery key</li>
                    <li>🔓 Only the recipient can decrypt and access the resource</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="error-details">
                <p><strong>Error:</strong> {transferResult.error}</p>
                <p>Please check your inputs and try again.</p>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="how-it-works">
          <h3>🔬 How Resource Transfer Works</h3>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Key Exchange</h4>
                <p>Your wallet derives ephemeral keys and performs Diffie-Hellman with recipient's User Key</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Encryption</h4>
                <p>Resource is encrypted with derived keys, ensuring only recipient can decrypt</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Discovery</h4>
                <p>Discovery message is encrypted and broadcast, allowing recipient to find the transaction</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Delivery</h4>
                <p>Recipient scans network, discovers transaction, and decrypts resource with their keys</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
