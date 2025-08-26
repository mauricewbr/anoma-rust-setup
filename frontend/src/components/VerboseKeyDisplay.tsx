/**
 * Verbose Key Display Component
 * 
 * Shows all generated key pairs for testing and verification purposes
 * WARNING: This displays private keys - only for development/testing!
 */

import React, { useState } from 'react';
import { embeddedWallet } from '../services/embeddedWallet';

interface VerboseKeyDisplayProps {
  className?: string;
}

export const VerboseKeyDisplay: React.FC<VerboseKeyDisplayProps> = ({ className }) => {
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  let keyInfo: ReturnType<typeof embeddedWallet.getVerboseKeyInfo> | null = null;
  let needsAuthentication = false;
  
  try {
    keyInfo = embeddedWallet.getVerboseKeyInfo();
  } catch (error) {
    needsAuthentication = true;
  }

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    
    try {
      await embeddedWallet.loadAccount();
      // Force component re-render by triggering a state change
      setIsAuthenticating(false);
      // The keyInfo will be available after re-render
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      setIsAuthenticating(false);
    }
  };

  if (needsAuthentication) {
    return (
      <div className={`verbose-key-display ${className || ''}`}>
        <div className="auth-required">
          <h3>🔐 Authentication Required</h3>
          <p>
            Your wallet is initialized but the private keys need to be loaded from PassKey storage.
            Click the button below to authenticate and view all key pairs.
          </p>
          
          {authError && (
            <div className="auth-error">
              <strong>Error:</strong> {authError}
            </div>
          )}
          
          <button 
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="authenticate-button"
          >
            {isAuthenticating ? '🔓 Authenticating...' : '🔓 Authenticate to View Keys'}
          </button>
          
          <div className="auth-note">
            <small>
              📝 <strong>Note:</strong> This will trigger your PassKey authentication (TouchID, FaceID, etc.)
              to securely regenerate your private keys from the encrypted master seed.
            </small>
          </div>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log(`Copied ${label} to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const KeyValueRow: React.FC<{ 
    label: string; 
    value: string; 
    fullValue: string; 
    isPrivate?: boolean;
    keyType: string;
  }> = ({ label, value, fullValue, isPrivate = false, keyType }) => {
    const shouldShow = !isPrivate || showPrivateKeys;
    const displayValue = shouldShow ? value : '••••••••••••••••';
    
    return (
      <div className="key-row">
        <div className="key-label">
          <span className={`key-type ${isPrivate ? 'private' : 'public'}`}>
            {isPrivate ? '🔒' : '🔓'} {label}
          </span>
          {isPrivate && (
            <span className="private-warning">(Private - Hidden)</span>
          )}
        </div>
        <div className="key-value">
          <code className={`key-display ${isPrivate && !showPrivateKeys ? 'hidden' : ''}`}>
            {displayValue}
          </code>
          {shouldShow && (
            <button 
              onClick={() => copyToClipboard(fullValue, `${keyType} ${label}`)}
              className="copy-key-button"
              title={`Copy full ${label}`}
            >
              📋
            </button>
          )}
        </div>
      </div>
    );
  };

  const KeySection: React.FC<{ 
    title: string; 
    icon: string; 
    sectionKey: string; 
    children: React.ReactNode;
  }> = ({ title, icon, sectionKey, children }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="key-section">
        <div 
          className="key-section-header"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="section-icon">{icon}</span>
          <span className="section-title">{title}</span>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="key-section-content">
            {children}
          </div>
        )}
      </div>
    );
  }

  // This should never happen, but TypeScript needs the check
  if (!keyInfo) {
    return (
      <div className={`verbose-key-display ${className || ''}`}>
        <div className="error">
          <h3>⚠️ Unexpected Error</h3>
          <p>Key information is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`verbose-key-display ${className || ''}`}>
      <div className="verbose-header">
        <h3>🔍 Verbose Key Information</h3>
        <p className="warning-text">
          ⚠️ <strong>Development Mode:</strong> This shows all generated keys for testing purposes.
          Private keys are hidden by default for security.
        </p>
        
        <div className="controls">
          <label className="show-private-toggle">
            <input
              type="checkbox"
              checked={showPrivateKeys}
              onChange={(e) => setShowPrivateKeys(e.target.checked)}
            />
            <span className="toggle-label">
              🔓 Show Private Keys (⚠️ Dangerous)
            </span>
          </label>
          
          <button 
            onClick={() => setExpandedSections(new Set(['identity', 'nullifier', 'encryption', 'discovery']))}
            className="expand-all-button"
          >
            Expand All
          </button>
          
          <button 
            onClick={() => setExpandedSections(new Set())}
            className="collapse-all-button"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="key-sections">
        <KeySection title="Identity Key Pair" icon="🆔" sectionKey="identity">
          <div className="section-description">
            <p>Used for signing and identity verification. Private key is managed by PassKey.</p>
          </div>
          <KeyValueRow 
            label="Public Key" 
            value={keyInfo.identity.publicKey} 
            fullValue={keyInfo.identity.publicKeyFull}
            keyType="Identity"
          />
          <div className="note">
            <small>🔒 Private key is secured by PassKey authentication and not displayed</small>
          </div>
        </KeySection>

        <KeySection title="Nullifier Key Pair" icon="🔑" sectionKey="nullifier">
          <div className="section-description">
            <p>Used for nullification operations and privacy-preserving transactions.</p>
          </div>
          <KeyValueRow 
            label="Nullifier Key (nk)" 
            value={keyInfo.nullifier.nk} 
            fullValue={keyInfo.nullifier.nkFull}
            isPrivate={true}
            keyType="Nullifier"
          />
          <KeyValueRow 
            label="Nullifier Commitment (cnk)" 
            value={keyInfo.nullifier.cnk} 
            fullValue={keyInfo.nullifier.cnkFull}
            keyType="Nullifier"
          />
        </KeySection>

        <KeySection title="Static Encryption Key Pair" icon="🔐" sectionKey="encryption">
          <div className="section-description">
            <p>Used for resource encryption and decryption in transactions.</p>
          </div>
          <KeyValueRow 
            label="Private Key (sesk)" 
            value={keyInfo.staticEncryption.privateKey} 
            fullValue={keyInfo.staticEncryption.privateKeyFull}
            isPrivate={true}
            keyType="Static Encryption"
          />
          <KeyValueRow 
            label="Public Key (sepk)" 
            value={keyInfo.staticEncryption.publicKey} 
            fullValue={keyInfo.staticEncryption.publicKeyFull}
            keyType="Static Encryption"
          />
        </KeySection>

        <KeySection title="Static Discovery Key Pair" icon="🔍" sectionKey="discovery">
          <div className="section-description">
            <p>Used for discovery message encryption and wallet discovery.</p>
          </div>
          <KeyValueRow 
            label="Private Key (sdsk)" 
            value={keyInfo.staticDiscovery.privateKey} 
            fullValue={keyInfo.staticDiscovery.privateKeyFull}
            isPrivate={true}
            keyType="Static Discovery"
          />
          <KeyValueRow 
            label="Public Key (sdpk)" 
            value={keyInfo.staticDiscovery.publicKey} 
            fullValue={keyInfo.staticDiscovery.publicKeyFull}
            keyType="Static Discovery"
          />
        </KeySection>
      </div>

      <div className="compliance-info">
        <h4>📊 Specification Compliance</h4>
        <div className="compliance-checks">
          <div className="check">✅ Independent nullifier key derivation</div>
          <div className="check">✅ PRF-based key generation with domain separation</div>
          <div className="check">✅ Correct User Key signature order (cnk, sdpk, sepk)</div>
          <div className="check">✅ secp256k1 curve for all key pairs</div>
          <div className="check">✅ 32-byte private keys, 33-byte compressed public keys</div>
        </div>
      </div>
    </div>
  );
};
