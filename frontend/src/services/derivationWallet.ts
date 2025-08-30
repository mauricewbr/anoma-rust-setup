/**
 * Stateless Key Derivation Wallet Service
 * 
 * This is an alternative approach to the encrypted blob model.
 * Instead of storing keys, we derive them deterministically from wallet signatures.
 * 
 * Benefits:
 * - Zero storage overhead
 * - Works with any deterministic signing wallet
 * - Massive simplification of authentication flows
 * - Eliminates key loading/caching complexity
 * 
 * Trade-offs:
 * - No independent key rotation
 * - Requires signing operations on each derivation
 */

import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { generateKeyPairFromPrivateKey, type KeyPair, type UserKey, createUserKey, verifyUserKey, serializeUserKey } from './cryptography';

// Domain separators for Anoma key hierarchy
export const ANOMA_DOMAIN_SEPARATORS = {
  NULLIFIER: "ANOMA::DERIVE_NULLIFIER_KEY_V1",
  STATIC_ENCRYPTION: "ANOMA::DERIVE_STATIC_ENCRYPTION_KEY_V1", 
  STATIC_DISCOVERY: "ANOMA::DERIVE_STATIC_DISCOVERY_KEY_V1",
  IDENTITY_VERIFICATION: "ANOMA::VERIFY_IDENTITY_KEY_V1"
} as const;

// Wallet adapter interface for different wallet types
export interface WalletAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  connect(): Promise<void>;
  getAddress(): Promise<string>;
  signMessage(message: string): Promise<string>;
}

// PassKey adapter using existing PassKey service
export class PassKeyAdapter implements WalletAdapter {
  name = 'PassKey (WebAuthn)';

  async isAvailable(): Promise<boolean> {
    const { passKeyService } = await import('./passkey');
    return passKeyService.isSupported() && await passKeyService.isPlatformAuthenticatorAvailable();
  }

  async isConnected(): Promise<boolean> {
    const { passKeyService } = await import('./passkey');
    return passKeyService.hasStoredCredentials();
  }

  async connect(): Promise<void> {
    // For PassKey, connection means creating or authenticating
    // This should be handled by the UI calling the appropriate method
    throw new Error('PassKey connection must be handled by explicit create/load account calls');
  }

  async getAddress(): Promise<string> {
    const { passKeyService } = await import('./passkey');
    const masterSeed = await passKeyService.authenticateAndRetrieveSeed();
    if (!masterSeed) {
      throw new Error('Failed to authenticate PassKey');
    }
    
    // Generate identity key from master seed for address
    const identityPrivateKey = sha256(new Uint8Array([...masterSeed, ...new TextEncoder().encode('IDENTITY')]));
    const identityPublicKey = secp256k1.getPublicKey(identityPrivateKey, true);
    
    // Use first 20 bytes of public key hash as address (Ethereum-style)
    const addressHash = sha256(identityPublicKey);
    return `0x${Array.from(addressHash.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  }

  async signMessage(message: string): Promise<string> {
    const { passKeyService } = await import('./passkey');
    const masterSeed = await passKeyService.authenticateAndRetrieveSeed();
    if (!masterSeed) {
      throw new Error('Failed to authenticate PassKey');
    }
    
    // Generate identity private key from master seed
    const identityPrivateKey = sha256(new Uint8Array([...masterSeed, ...new TextEncoder().encode('IDENTITY')]));
    
    // Sign the message
    const messageHash = sha256(new TextEncoder().encode(message));
    const signature = secp256k1.sign(messageHash, identityPrivateKey);
    
    return signature.toCompactHex();
  }
}

// MetaMask adapter
export class MetaMaskAdapter implements WalletAdapter {
  name = 'MetaMask (Ethereum)';

  async isAvailable(): Promise<boolean> {
    return !!(window as any).ethereum?.isMetaMask;
  }

  async isConnected(): Promise<boolean> {
    if (!await this.isAvailable()) return false;
    
    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0;
  }

  async connect(): Promise<void> {
    if (!await this.isAvailable()) {
      throw new Error('MetaMask not available');
    }
    
    const ethereum = (window as any).ethereum;
    await ethereum.request({ method: 'eth_requestAccounts' });
  }

  async getAddress(): Promise<string> {
    if (!await this.isConnected()) {
      await this.connect();
    }
    
    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    return accounts[0];
  }

  async signMessage(message: string): Promise<string> {
    if (!await this.isConnected()) {
      await this.connect();
    }
    
    const ethereum = (window as any).ethereum;
    const address = await this.getAddress();
    
    // Convert message to hex
    const messageHex = `0x${Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    
    return await ethereum.request({
      method: 'personal_sign',
      params: [messageHex, address]
    });
  }
}

// Phantom (EVM) adapter
export class PhantomAdapter implements WalletAdapter {
  name = 'Phantom (Ethereum/EVM)';

  async isAvailable(): Promise<boolean> {
    return !!(window as any).phantom?.ethereum;
  }

  async isConnected(): Promise<boolean> {
    if (!await this.isAvailable()) return false;
    
    const phantom = (window as any).phantom.ethereum;
    const accounts = await phantom.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0;
  }

  async connect(): Promise<void> {
    if (!await this.isAvailable()) {
      throw new Error('Phantom (Ethereum) not available');
    }
    
    const phantom = (window as any).phantom.ethereum;
    await phantom.request({ method: 'eth_requestAccounts' });
  }

  async getAddress(): Promise<string> {
    if (!await this.isConnected()) {
      await this.connect();
    }
    
    const phantom = (window as any).phantom.ethereum;
    const accounts = await phantom.request({ method: 'eth_accounts' });
    return accounts[0];
  }

  async signMessage(message: string): Promise<string> {
    if (!await this.isConnected()) {
      await this.connect();
    }
    
    const phantom = (window as any).phantom.ethereum;
    const address = await this.getAddress();
    
    // Convert message to hex
    const messageHex = `0x${Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    
    return await phantom.request({
      method: 'personal_sign',
      params: [messageHex, address]
    });
  }
}

// Derived static keys structure
export interface DerivedStaticKeys {
  identity: KeyPair;
  nullifier: {
    nk: Uint8Array;
    cnk: Uint8Array;
  };
  staticEncryption: KeyPair;
  staticDiscovery: KeyPair;
}

// Main derivation wallet service
export class DerivationWalletService {
  private static instance: DerivationWalletService;
  private currentAdapter: WalletAdapter | null = null;
  private cachedKeys: DerivedStaticKeys | null = null;
  private cachedUserKey: UserKey | null = null;
  private cachedAddress: string | null = null;

  private constructor() {}

  static getInstance(): DerivationWalletService {
    if (!DerivationWalletService.instance) {
      DerivationWalletService.instance = new DerivationWalletService();
    }
    return DerivationWalletService.instance;
  }

  // Get available wallet adapters
  getAvailableAdapters(): WalletAdapter[] {
    return [
      new PassKeyAdapter(),
      new MetaMaskAdapter(),
      new PhantomAdapter()
    ];
  }

  // Set current wallet adapter
  setAdapter(adapter: WalletAdapter): void {
    this.currentAdapter = adapter;
    this.clearCache();
  }

  // Get current adapter
  getCurrentAdapter(): WalletAdapter | null {
    return this.currentAdapter;
  }

  // Clear cached keys (useful when switching wallets)
  clearCache(): void {
    this.cachedKeys = null;
    this.cachedUserKey = null;
    this.cachedAddress = null;
  }

  // Convert signature to private key seed
  private signatureToPrivateKey(signature: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    
    // Convert hex to bytes
    const sigBytes = new Uint8Array(cleanSig.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Hash to get 32-byte private key
    const privateKey = sha256(sigBytes);
    
    // Ensure it's a valid private key (not zero, not >= curve order)
    if (privateKey.every(b => b === 0)) {
      throw new Error('Invalid private key: all zeros');
    }
    
    return privateKey;
  }

  // Derive all static keys from wallet signatures
  async deriveStaticKeys(): Promise<DerivedStaticKeys> {
    if (!this.currentAdapter) {
      throw new Error('No wallet adapter set');
    }

    if (this.cachedKeys) {
      return this.cachedKeys;
    }

    try {
      // Get signatures for each domain separator
      const nullifierSig = await this.currentAdapter.signMessage(ANOMA_DOMAIN_SEPARATORS.NULLIFIER);
      const encryptionSig = await this.currentAdapter.signMessage(ANOMA_DOMAIN_SEPARATORS.STATIC_ENCRYPTION);
      const discoverySig = await this.currentAdapter.signMessage(ANOMA_DOMAIN_SEPARATORS.STATIC_DISCOVERY);
      const identitySig = await this.currentAdapter.signMessage(ANOMA_DOMAIN_SEPARATORS.IDENTITY_VERIFICATION);

      // Convert signatures to private keys
      const nullifierPrivateKey = this.signatureToPrivateKey(nullifierSig);
      const encryptionPrivateKey = this.signatureToPrivateKey(encryptionSig);
      const discoveryPrivateKey = this.signatureToPrivateKey(discoverySig);
      const identityPrivateKey = this.signatureToPrivateKey(identitySig);

      // Generate key pairs
      const identity = generateKeyPairFromPrivateKey(identityPrivateKey);
      const staticEncryption = generateKeyPairFromPrivateKey(encryptionPrivateKey);
      const staticDiscovery = generateKeyPairFromPrivateKey(discoveryPrivateKey);
      
      // For nullifier, derive both nk and cnk
      const nk = nullifierPrivateKey;
      const cnk = sha256(new Uint8Array([...nk, ...new TextEncoder().encode('CNK')]));

      this.cachedKeys = {
        identity,
        nullifier: { nk, cnk },
        staticEncryption,
        staticDiscovery
      };

      return this.cachedKeys;

    } catch (error) {
      throw new Error(`Failed to derive static keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create and cache User Key
  async getUserKey(): Promise<UserKey> {
    if (this.cachedUserKey) {
      return this.cachedUserKey;
    }

    const staticKeys = await this.deriveStaticKeys();
    
    // Convert to the format expected by createUserKey
    const keysForUserKey = {
      identity: staticKeys.identity,
      nullifier: staticKeys.nullifier,
      staticEncryption: staticKeys.staticEncryption,
      staticDiscovery: staticKeys.staticDiscovery
    };

    this.cachedUserKey = createUserKey(keysForUserKey);
    
    // Verify the user key is valid
    if (!verifyUserKey(this.cachedUserKey)) {
      throw new Error('Generated User Key failed verification');
    }

    return this.cachedUserKey;
  }

  // Get serialized User Key for sharing
  async getUserKeyForSharing(): Promise<string> {
    const userKey = await this.getUserKey();
    return serializeUserKey(userKey);
  }

  // Get wallet address
  async getAddress(): Promise<string> {
    if (!this.currentAdapter) {
      throw new Error('No wallet adapter set');
    }

    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    this.cachedAddress = await this.currentAdapter.getAddress();
    return this.cachedAddress;
  }

  // Check if wallet is connected and ready
  async isReady(): Promise<boolean> {
    if (!this.currentAdapter) {
      return false;
    }

    try {
      return await this.currentAdapter.isConnected();
    } catch {
      return false;
    }
  }

  // Connect current wallet
  async connect(): Promise<void> {
    if (!this.currentAdapter) {
      throw new Error('No wallet adapter set');
    }

    await this.currentAdapter.connect();
    this.clearCache(); // Clear cache after connecting
  }

  // Sign a message with the derived identity key
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const staticKeys = await this.deriveStaticKeys();
    const messageHash = sha256(message);
    const signature = secp256k1.sign(messageHash, staticKeys.identity.privateKey);
    return signature.toCompactRawBytes();
  }
}

// Export singleton instance
export const derivationWallet = DerivationWalletService.getInstance();
