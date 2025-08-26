/**
 * Anoma Embedded Wallet Service
 * 
 * Combines cryptographic key management with PassKey storage to provide
 * a complete embedded wallet solution for Anoma Resource Machine.
 */

import { 
  generateMasterSeed, 
  generateStaticKeys, 
  createUserKey, 
  verifyUserKey,
  serializeUserKey,
  deserializeUserKey,
  getVerboseKeyInfo,
  type StaticKeys, 
  type UserKey,
  type KeyPair,
  type NullifierKeyPair
} from './cryptography';
import { passKeyService } from './passkey';

export interface WalletState {
  isInitialized: boolean;
  hasPassKey: boolean;
  userKey?: UserKey;
  userEmail?: string;
}

/**
 * Embedded wallet service for Anoma ARM
 */
export class EmbeddedWalletService {
  private static instance: EmbeddedWalletService;
  private staticKeys: StaticKeys | null = null;
  private userKey: UserKey | null = null;
  private userEmail: string | null = null;

  static getInstance(): EmbeddedWalletService {
    if (!EmbeddedWalletService.instance) {
      EmbeddedWalletService.instance = new EmbeddedWalletService();
      // Try to restore from cached data on initialization
      EmbeddedWalletService.instance.tryRestoreFromCache();
    }
    return EmbeddedWalletService.instance;
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    // Check if we have cached data even if instance variables are not set
    const hasCachedData = localStorage.getItem('anoma_user_key') !== null && 
                          localStorage.getItem('anoma_user_email') !== null;
    
    return {
      isInitialized: this.staticKeys !== null || (passKeyService.hasStoredCredentials() && hasCachedData),
      hasPassKey: passKeyService.hasStoredCredentials(),
      userKey: this.userKey || undefined,
      userEmail: this.userEmail || undefined,
    };
  }

  /**
   * Try to restore wallet state from cached data (without authentication)
   * This allows us to show the correct UI state on page refresh
   */
  private tryRestoreFromCache(): void {
    try {
      const cachedUserKey = localStorage.getItem('anoma_user_key');
      const cachedEmail = localStorage.getItem('anoma_user_email');
      
      if (cachedUserKey && cachedEmail && passKeyService.hasStoredCredentials()) {
        // Only restore the user key and email, not the static keys
        // Static keys will be regenerated when user authenticates
        this.userKey = deserializeUserKey(cachedUserKey);
        this.userEmail = cachedEmail;
      }
    } catch (error) {
      console.warn('Failed to restore wallet from cache:', error);
      // Clear invalid cached data
      localStorage.removeItem('anoma_user_key');
      localStorage.removeItem('anoma_user_email');
    }
  }

  /**
   * Create a new Anoma account with embedded wallet
   * @param userEmail User's email address for PassKey identification
   * @returns User Key for sharing with others
   */
  async createAccount(userEmail: string): Promise<UserKey> {
    try {
      // Check if PassKey is supported
      if (!passKeyService.isSupported()) {
        throw new Error('PassKey/WebAuthn not supported in this browser');
      }

      if (!await passKeyService.isPlatformAuthenticatorAvailable()) {
        throw new Error('Platform authenticator (TouchID/FaceID/Windows Hello) not available');
      }

      // Generate new master seed
      console.log('Generating master seed...');
      const masterSeed = generateMasterSeed();

      // Register PassKey and store master seed
      console.log('Registering PassKey...');
      const { success, credentialId } = await passKeyService.registerPassKey(userEmail, masterSeed);
      
      if (!success || !credentialId) {
        throw new Error('Failed to register PassKey');
      }

      // Generate static keys from master seed
      console.log('Generating static keys...');
      this.staticKeys = generateStaticKeys(masterSeed);

      // Create User Key
      console.log('Creating User Key...');
      this.userKey = createUserKey(this.staticKeys);
      this.userEmail = userEmail;

      // Store User Key in localStorage for quick access
      localStorage.setItem('anoma_user_key', serializeUserKey(this.userKey));
      localStorage.setItem('anoma_user_email', userEmail);

      console.log('Account created successfully!');
      return this.userKey;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw error;
    }
  }

  /**
   * Load existing account using PassKey authentication
   * @returns User Key if authentication successful
   */
  async loadAccount(): Promise<UserKey> {
    try {
      // Check if we have stored credentials
      if (!passKeyService.hasStoredCredentials()) {
        throw new Error('No stored PassKey credentials found');
      }

      // Load cached user data
      const cachedUserKey = localStorage.getItem('anoma_user_key');
      const cachedEmail = localStorage.getItem('anoma_user_email');

      if (cachedUserKey && cachedEmail) {
        // Try to authenticate with PassKey to verify user
        console.log('Authenticating with PassKey...');
        const masterSeed = await passKeyService.authenticateAndRetrieveSeed();
        
        if (!masterSeed) {
          throw new Error('PassKey authentication failed');
        }

        // Regenerate keys from master seed
        this.staticKeys = generateStaticKeys(masterSeed);
        this.userKey = deserializeUserKey(cachedUserKey);
        this.userEmail = cachedEmail;

        // Verify the User Key is valid
        if (!verifyUserKey(this.userKey)) {
          throw new Error('Invalid User Key signature');
        }

        console.log('Account loaded successfully!');
        return this.userKey;
      } else {
        throw new Error('No cached user data found');
      }
    } catch (error) {
      console.error('Failed to load account:', error);
      throw error;
    }
  }

  /**
   * Authenticate for transaction signing
   * @returns True if authentication successful
   */
  async authenticateForTransaction(): Promise<boolean> {
    try {
      if (!this.staticKeys) {
        throw new Error('Wallet not initialized');
      }

      // Authenticate with PassKey
      const masterSeed = await passKeyService.authenticateAndRetrieveSeed();
      
      if (!masterSeed) {
        return false;
      }

      // Regenerate keys to ensure we have current keys
      this.staticKeys = generateStaticKeys(masterSeed);
      return true;
    } catch (error) {
      console.error('Transaction authentication failed:', error);
      return false;
    }
  }

  /**
   * Get User Key for sharing (copy/paste)
   * @returns Serialized User Key string
   */
  getUserKeyForSharing(): string {
    if (!this.userKey) {
      throw new Error('Wallet not initialized');
    }
    return serializeUserKey(this.userKey);
  }

  /**
   * Import a User Key from another user (for sending transactions)
   * @param serializedUserKey Serialized User Key string
   * @returns Parsed and verified User Key
   */
  importUserKey(serializedUserKey: string): UserKey {
    try {
      const userKey = deserializeUserKey(serializedUserKey);
      
      if (!verifyUserKey(userKey)) {
        throw new Error('Invalid User Key signature');
      }
      
      return userKey;
    } catch (error) {
      console.error('Failed to import User Key:', error);
      throw new Error('Invalid User Key format or signature');
    }
  }

  /**
   * Get current user's static keys (for signing)
   * Requires recent authentication
   */
  getStaticKeys(): StaticKeys {
    if (!this.staticKeys) {
      throw new Error('Wallet not initialized');
    }
    return this.staticKeys;
  }

  /**
   * Get identity key pair for signing
   */
  getIdentityKeyPair(): KeyPair {
    if (!this.staticKeys) {
      throw new Error('Wallet not initialized');
    }
    return this.staticKeys.identity;
  }

  /**
   * Get static encryption key pair
   */
  getStaticEncryptionKeyPair(): KeyPair {
    if (!this.staticKeys) {
      throw new Error('Wallet not initialized');
    }
    return this.staticKeys.staticEncryption;
  }

  /**
   * Get static discovery key pair  
   */
  getStaticDiscoveryKeyPair(): KeyPair {
    if (!this.staticKeys) {
      throw new Error('Wallet not initialized');
    }
    return this.staticKeys.staticDiscovery;
  }

  /**
   * Get nullifier key pair
   */
  getNullifierKeyPair(): NullifierKeyPair {
    if (!this.staticKeys) {
      throw new Error('Wallet not initialized');
    }
    return this.staticKeys.nullifier;
  }

  /**
   * Sign a message with the identity key
   * @param message Message to sign
   * @returns Signature bytes
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // Authenticate first
    const authenticated = await this.authenticateForTransaction();
    if (!authenticated) {
      throw new Error('Authentication failed');
    }

    const identityKey = this.getIdentityKeyPair();
    const secp256k1 = await import('@noble/secp256k1');
    const { sha256 } = await import('@noble/hashes/sha256');
    
    const messageHash = sha256(message);
    const signature = secp256k1.sign(messageHash, identityKey.privateKey);
    
    return signature.toCompactRawBytes();
  }

  /**
   * Clear wallet data (logout)
   */
  logout(): void {
    this.staticKeys = null;
    this.userKey = null;
    this.userEmail = null;
    
    // Don't clear PassKey credentials, just session data
    localStorage.removeItem('anoma_user_key');
    localStorage.removeItem('anoma_user_email');
  }

  /**
   * Delete account completely (removes PassKey credentials)
   */
  deleteAccount(): void {
    this.logout();
    passKeyService.clearStoredCredentials();
  }

  /**
   * Check if wallet is ready for use
   */
  isReady(): boolean {
    return this.staticKeys !== null && this.userKey !== null;
  }

  /**
   * Get user's identity public key as hex string (like an Ethereum address)
   */
  getIdentityAddress(): string {
    if (!this.userKey) {
      throw new Error('Wallet not initialized');
    }
    
    // Return the identity public key as a hex string
    return Array.from(this.userKey.idpk, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get verbose key information for debugging/display purposes
   * WARNING: This exposes private keys - only use for testing/debugging
   */
  getVerboseKeyInfo() {
    if (!this.staticKeys) {
      throw new Error('Wallet not initialized');
    }
    return getVerboseKeyInfo(this.staticKeys);
  }
}

/**
 * Singleton wallet service instance
 */
export const embeddedWallet = EmbeddedWalletService.getInstance();

/**
 * Wallet event types for UI updates
 */
export type WalletEvent = 'initialized' | 'authenticated' | 'logout' | 'error';

/**
 * Event listener for wallet state changes
 */
export type WalletEventListener = (event: WalletEvent, data?: any) => void;
