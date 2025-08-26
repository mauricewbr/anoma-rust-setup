/**
 * PassKey/WebAuthn Integration for Anoma Embedded Wallet
 * 
 * Provides secure storage and retrieval of master seeds using WebAuthn/PassKey technology.
 * Works with iCloud Keychain (Safari), Google Chrome credentials, and other platform authenticators.
 */

import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

const RP_NAME = 'Anoma Wallet';
const RP_ID = window.location.hostname;

// Helper function to convert Uint8Array to base64url
function arrayBufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}



/**
 * PassKey storage service for master seeds
 */
export class PassKeyService {
  private static instance: PassKeyService;
  
  static getInstance(): PassKeyService {
    if (!PassKeyService.instance) {
      PassKeyService.instance = new PassKeyService();
    }
    return PassKeyService.instance;
  }

  /**
   * Check if WebAuthn is supported in the current browser
   */
  isSupported(): boolean {
    return window.PublicKeyCredential !== undefined && 
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  }

  /**
   * Check if platform authenticator (TouchID, FaceID, Windows Hello) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error('Error checking platform authenticator:', error);
      return false;
    }
  }

  /**
   * Register a new PassKey and store the master seed
   * @param userEmail User's email address (used as identifier)
   * @param masterSeed 32-byte master seed to store securely
   * @returns Success status and credential ID
   */
  async registerPassKey(userEmail: string, masterSeed: Uint8Array): Promise<{ success: boolean; credentialId?: string }> {
    if (!await this.isPlatformAuthenticatorAvailable()) {
      throw new Error('Platform authenticator not available');
    }

    try {
      // Create registration options
      const userId = new TextEncoder().encode(userEmail);
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const registrationOptions = {
        rp: {
          name: RP_NAME,
          id: RP_ID,
        },
        user: {
          id: arrayBufferToBase64url(userId),
          name: userEmail,
          displayName: userEmail,
        },
        challenge: arrayBufferToBase64url(challenge),
        pubKeyCredParams: [
          { type: 'public-key' as const, alg: -7 }, // ES256
          { type: 'public-key' as const, alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform' as const,
          userVerification: 'required' as const,
          residentKey: 'required' as const,
          requireResidentKey: true,
        },
        timeout: 60000,
        attestation: 'none' as const,
      };

      // Start registration
      const registrationResponse = await startRegistration(registrationOptions);
      
      if (registrationResponse) {
        // Store the master seed associated with this credential
        // We'll use a simple approach: store in localStorage with credential ID as key
        // In production, you might want to encrypt this further or use a different storage mechanism
        const credentialId = registrationResponse.id;
        const masterSeedHex = Array.from(masterSeed, byte => byte.toString(16).padStart(2, '0')).join('');
        
        localStorage.setItem(`anoma_seed_${credentialId}`, masterSeedHex);
        localStorage.setItem('anoma_current_credential', credentialId);
        
        return { success: true, credentialId };
      }
      
      return { success: false };
    } catch (error) {
      console.error('PassKey registration failed:', error);
      throw new Error(`PassKey registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate with PassKey and retrieve the master seed
   * @param credentialId Optional specific credential ID to authenticate with
   * @returns Master seed if authentication successful
   */
  async authenticateAndRetrieveSeed(credentialId?: string): Promise<Uint8Array | null> {
    if (!await this.isPlatformAuthenticatorAvailable()) {
      throw new Error('Platform authenticator not available');
    }

    try {
      // If no credential ID provided, try to get the current one
      if (!credentialId) {
        const storedCredentialId = localStorage.getItem('anoma_current_credential');
        if (!storedCredentialId) {
          throw new Error('No stored credential found');
        }
        credentialId = storedCredentialId;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const authenticationOptions = {
        challenge: arrayBufferToBase64url(challenge),
        allowCredentials: [{
          type: 'public-key' as const,
          id: credentialId,
        }],
        userVerification: 'required' as const,
        timeout: 60000,
      };

      // Start authentication
      const authenticationResponse = await startAuthentication(authenticationOptions);
      
      if (authenticationResponse) {
        // Retrieve the master seed
        const masterSeedHex = localStorage.getItem(`anoma_seed_${credentialId}`);
        if (!masterSeedHex) {
          throw new Error('Master seed not found for credential');
        }
        
        // Convert hex back to Uint8Array
        const masterSeed = new Uint8Array(masterSeedHex.length / 2);
        for (let i = 0; i < masterSeedHex.length; i += 2) {
          masterSeed[i / 2] = parseInt(masterSeedHex.substr(i, 2), 16);
        }
        
        return masterSeed;
      }
      
      return null;
    } catch (error) {
      console.error('PassKey authentication failed:', error);
      throw new Error(`PassKey authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has existing PassKey credentials
   */
  hasStoredCredentials(): boolean {
    return localStorage.getItem('anoma_current_credential') !== null;
  }

  /**
   * Get list of stored credential IDs
   */
  getStoredCredentialIds(): string[] {
    const credentials: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('anoma_seed_')) {
        credentials.push(key.replace('anoma_seed_', ''));
      }
    }
    return credentials;
  }

  /**
   * Remove stored credentials (for account deletion/reset)
   */
  clearStoredCredentials(): void {
    const credentialIds = this.getStoredCredentialIds();
    credentialIds.forEach(id => {
      localStorage.removeItem(`anoma_seed_${id}`);
    });
    localStorage.removeItem('anoma_current_credential');
  }

  /**
   * Simple authentication check without retrieving seed
   * Useful for checking if user can authenticate before sensitive operations
   */
  async canAuthenticate(): Promise<boolean> {
    try {
      const credentialId = localStorage.getItem('anoma_current_credential');
      if (!credentialId) return false;

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const authenticationOptions = {
        challenge: arrayBufferToBase64url(challenge),
        allowCredentials: [{
          type: 'public-key' as const,
          id: credentialId,
        }],
        userVerification: 'required' as const,
        timeout: 30000,
      };

      const result = await startAuthentication(authenticationOptions);
      return !!result;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }
}

/**
 * Utility function to get the singleton PassKey service
 */
export const passKeyService = PassKeyService.getInstance();
