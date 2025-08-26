/**
 * Anoma Resource Machine Cryptographic Key Management
 * 
 * Implements the key hierarchy as specified in the cryptography team's post:
 * - Identity key pair (idsk, idpk)
 * - Static encryption key pair (sesk, sepk) 
 * - Static discovery key pair (sdsk, sdpk)
 * 
 * Uses PRF with domain separation to derive all keys from a master seed.
 */

import * as secp256k1 from '@noble/secp256k1';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

// Domain separators for PRF key derivation
const DOMAIN_IDENTITY = 'ANOMA_IDENTITY_KEY';
const DOMAIN_NULLIFIER = 'ANOMA_NULLIFIER_KEY';
const DOMAIN_ENCRYPTION = 'ANOMA_STATIC_ENCRYPTION_KEY';
const DOMAIN_DISCOVERY = 'ANOMA_STATIC_DISCOVERY_KEY';
const DOMAIN_NULLIFIER_COMMITMENT = 'ANOMA_NULLIFIER_COMMITMENT';

/**
 * Key pair structure for secp256k1 keys
 */
export interface KeyPair {
  privateKey: Uint8Array; // 32 bytes
  publicKey: Uint8Array;  // 33 bytes (compressed)
}

/**
 * Nullifier key pair structure
 */
export interface NullifierKeyPair {
  nk: Uint8Array;   // Nullifier key (32 bytes)
  cnk: Uint8Array;  // Nullifier key commitment (32 bytes)
}

/**
 * Complete static key set for a user
 */
export interface StaticKeys {
  identity: KeyPair;
  nullifier: NullifierKeyPair;
  staticEncryption: KeyPair;
  staticDiscovery: KeyPair;
}

/**
 * User Key structure as specified - contains public keys + signature
 */
export interface UserKey {
  idpk: Uint8Array;     // Identity public key
  cnk: Uint8Array;      // Nullifier key commitment (derived from nk)
  sepk: Uint8Array;     // Static encryption public key
  sdpk: Uint8Array;     // Static discovery public key
  signature: Uint8Array; // Identity signature over (cnk, sepk, sdpk)
}

/**
 * PRF implementation using HMAC-SHA256
 * @param seed Master seed (32 bytes)
 * @param domain Domain separator string
 * @returns Derived key material (32 bytes)
 */
function prf(seed: Uint8Array, domain: string): Uint8Array {
  const domainBytes = new TextEncoder().encode(domain);
  return hmac(sha256, seed, domainBytes);
}

/**
 * Generate a secp256k1 key pair from seed material
 * @param keyMaterial 32-byte key material
 * @returns Key pair with private and compressed public key
 */
function generateKeyPair(keyMaterial: Uint8Array): KeyPair {
  if (keyMaterial.length !== 32) {
    throw new Error('Key material must be exactly 32 bytes');
  }
  
  const privateKey = keyMaterial;
  const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed format
  
  return {
    privateKey,
    publicKey
  };
}

/**
 * Generate nullifier key pair using PRF
 * @param masterSeed Master seed (32 bytes)
 * @returns Nullifier key pair with nk and cnk
 */
function generateNullifierKeyPair(masterSeed: Uint8Array): NullifierKeyPair {
  // Derive nullifier key using PRF with domain separation
  const nk = prf(masterSeed, DOMAIN_NULLIFIER);
  
  // Generate commitment using PRF (more secure than simple hash)
  const cnk = prf(nk, DOMAIN_NULLIFIER_COMMITMENT);
  
  return { nk, cnk };
}

/**
 * Generate all static keys from a master seed using PRF with domain separation
 * @param masterSeed 32-byte master seed
 * @returns Complete static key set
 */
export function generateStaticKeys(masterSeed: Uint8Array): StaticKeys {
  if (masterSeed.length !== 32) {
    throw new Error('Master seed must be exactly 32 bytes');
  }

  // Derive key material for each key type using PRF
  const identityMaterial = prf(masterSeed, DOMAIN_IDENTITY);
  const encryptionMaterial = prf(masterSeed, DOMAIN_ENCRYPTION);
  const discoveryMaterial = prf(masterSeed, DOMAIN_DISCOVERY);

  // Generate key pairs
  const identity = generateKeyPair(identityMaterial);
  const nullifier = generateNullifierKeyPair(masterSeed);
  const staticEncryption = generateKeyPair(encryptionMaterial);
  const staticDiscovery = generateKeyPair(discoveryMaterial);

  return {
    identity,
    nullifier,
    staticEncryption,
    staticDiscovery
  };
}

/**
 * Create User Key structure with identity signature
 * @param staticKeys Complete static key set
 * @returns User Key ready for sharing/storage
 */
export function createUserKey(staticKeys: StaticKeys): UserKey {
  const { identity, nullifier, staticEncryption, staticDiscovery } = staticKeys;
  
  // Use the properly derived nullifier key commitment
  const cnk = nullifier.cnk;
  
  // Create message to sign: concatenate cnk, sdpk, sepk (CORRECT ORDER per spec)
  const messageToSign = new Uint8Array(
    cnk.length + 
    staticDiscovery.publicKey.length + 
    staticEncryption.publicKey.length
  );
  
  messageToSign.set(cnk, 0);
  messageToSign.set(staticDiscovery.publicKey, cnk.length);
  messageToSign.set(staticEncryption.publicKey, cnk.length + staticDiscovery.publicKey.length);
  
  // Sign with identity private key
  const messageHash = sha256(messageToSign);
  const signature = secp256k1.sign(messageHash, identity.privateKey);
  
  return {
    idpk: identity.publicKey,
    cnk,
    sepk: staticEncryption.publicKey,
    sdpk: staticDiscovery.publicKey,
    signature: signature.toCompactRawBytes()
  };
}

/**
 * Generate a new master seed using cryptographically secure randomness
 * @returns 32-byte random seed
 */
export function generateMasterSeed(): Uint8Array {
  return randomBytes(32);
}

/**
 * Verify a User Key signature
 * @param userKey User Key to verify
 * @returns True if signature is valid
 */
export function verifyUserKey(userKey: UserKey): boolean {
  try {
    // Reconstruct the message that was signed: cnk, sdpk, sepk (CORRECT ORDER)
    const messageToSign = new Uint8Array(
      userKey.cnk.length + 
      userKey.sdpk.length + 
      userKey.sepk.length
    );
    
    messageToSign.set(userKey.cnk, 0);
    messageToSign.set(userKey.sdpk, userKey.cnk.length);
    messageToSign.set(userKey.sepk, userKey.cnk.length + userKey.sdpk.length);
    
    const messageHash = sha256(messageToSign);
    
    // Verify signature
    return secp256k1.verify(userKey.signature, messageHash, userKey.idpk);
  } catch (error) {
    console.error('User Key verification failed:', error);
    return false;
  }
}

/**
 * Convert User Key to a shareable string format
 * @param userKey User Key to serialize
 * @returns Base64-encoded string
 */
export function serializeUserKey(userKey: UserKey): string {
  const totalLength = userKey.idpk.length + userKey.cnk.length + userKey.sepk.length + userKey.sdpk.length + userKey.signature.length;
  const buffer = new Uint8Array(totalLength + 5 * 4); // 5 length prefixes
  
  let offset = 0;
  
  // Write lengths and data
  const writeField = (data: Uint8Array) => {
    const view = new DataView(buffer.buffer);
    view.setUint32(offset, data.length, true); // little-endian
    offset += 4;
    buffer.set(data, offset);
    offset += data.length;
  };
  
  writeField(userKey.idpk);
  writeField(userKey.cnk);
  writeField(userKey.sepk);
  writeField(userKey.sdpk);
  writeField(userKey.signature);
  
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Parse User Key from shareable string format
 * @param serialized Base64-encoded User Key string
 * @returns Parsed User Key
 */
export function deserializeUserKey(serialized: string): UserKey {
  const buffer = new Uint8Array(atob(serialized).split('').map(c => c.charCodeAt(0)));
  const view = new DataView(buffer.buffer);
  
  let offset = 0;
  
  const readField = (): Uint8Array => {
    const length = view.getUint32(offset, true); // little-endian
    offset += 4;
    const data = buffer.slice(offset, offset + length);
    offset += length;
    return data;
  };
  
  return {
    idpk: readField(),
    cnk: readField(),
    sepk: readField(),
    sdpk: readField(),
    signature: readField()
  };
}

/**
 * Utility to convert bytes to hex string for debugging
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility to convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Generate ephemeral encryption key pair for transaction-level encryption
 */
export function generateEphemeralEncryptionKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed
  return { privateKey, publicKey };
}

/**
 * Generate ephemeral discovery key pair for transaction-level discovery
 */
export function generateEphemeralDiscoveryKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed
  return { privateKey, publicKey };
}

/**
 * Key Derivation Function using HMAC-SHA256
 * @param sharedSecret Shared secret from DH operation
 * @param info Additional info (usually ephemeral public key)
 * @returns Derived key material (32 bytes)
 */
export function kdf(sharedSecret: Uint8Array, info: Uint8Array): Uint8Array {
  return hmac(sha256, sharedSecret, info);
}

/**
 * Diffie-Hellman operation using secp256k1
 * @param privateKey Private key (32 bytes)
 * @param publicKey Public key (33 bytes compressed)
 * @returns Shared secret (32 bytes)
 */
export function diffieHellman(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  try {
    // Validate inputs
    if (privateKey.length !== 32) {
      throw new Error(`Invalid private key length: ${privateKey.length}, expected 32`);
    }
    if (publicKey.length !== 33) {
      throw new Error(`Invalid public key length: ${publicKey.length}, expected 33`);
    }
    
    // Validate that the public key is on the curve
    if (!secp256k1.Point.fromHex(publicKey)) {
      throw new Error('Invalid public key: not on curve');
    }
    
    const sharedPoint = secp256k1.getSharedSecret(privateKey, publicKey);
    // Return only the x-coordinate (first 32 bytes after the prefix)
    return sharedPoint.slice(1, 33);
  } catch (error) {
    console.error('Diffie-Hellman error:', {
      privateKeyLength: privateKey.length,
      publicKeyLength: publicKey.length,
      privateKeyHex: bytesToHex(privateKey).slice(0, 16) + '...',
      publicKeyHex: bytesToHex(publicKey).slice(0, 16) + '...',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Simple AES-GCM encryption using WebCrypto API
 * @param key Encryption key (32 bytes)
 * @param plaintext Data to encrypt
 * @returns Encrypted data with IV prepended
 */
export async function encrypt(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  // Create a clean ArrayBuffer copy to avoid TypeScript issues
  const keyBuffer = new ArrayBuffer(key.length);
  new Uint8Array(keyBuffer).set(key);
  
  const plaintextBuffer = new ArrayBuffer(plaintext.length);
  new Uint8Array(plaintextBuffer).set(plaintext);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintextBuffer
  );
  
  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return result;
}

/**
 * Simple AES-GCM decryption using WebCrypto API
 * @param key Decryption key (32 bytes)
 * @param ciphertext Encrypted data with IV prepended
 * @returns Decrypted data
 */
export async function decrypt(key: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  // Create a clean ArrayBuffer copy to avoid TypeScript issues
  const keyBuffer = new ArrayBuffer(key.length);
  new Uint8Array(keyBuffer).set(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Extract IV and encrypted data
  const iv = ciphertext.slice(0, 12);
  const encryptedData = ciphertext.slice(12);
  
  // Create clean buffer for encrypted data
  const encryptedBuffer = new ArrayBuffer(encryptedData.length);
  new Uint8Array(encryptedBuffer).set(encryptedData);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBuffer
  );
  
  return new Uint8Array(decrypted);
}

/**
 * Format a key for display (first 8 chars + ... + last 8 chars)
 */
export function formatKeyForDisplay(key: Uint8Array, fullLength: boolean = false): string {
  const hex = bytesToHex(key);
  if (fullLength || hex.length <= 24) {
    return hex;
  }
  return `${hex.slice(0, 8)}...${hex.slice(-8)}`;
}

/**
 * Get verbose key information for display
 */
export function getVerboseKeyInfo(staticKeys: StaticKeys) {
  return {
    identity: {
      publicKey: formatKeyForDisplay(staticKeys.identity.publicKey),
      publicKeyFull: bytesToHex(staticKeys.identity.publicKey),
      // Note: We intentionally don't expose the private key for security
    },
    nullifier: {
      nk: formatKeyForDisplay(staticKeys.nullifier.nk),
      nkFull: bytesToHex(staticKeys.nullifier.nk),
      cnk: formatKeyForDisplay(staticKeys.nullifier.cnk),
      cnkFull: bytesToHex(staticKeys.nullifier.cnk),
    },
    staticEncryption: {
      privateKey: formatKeyForDisplay(staticKeys.staticEncryption.privateKey),
      privateKeyFull: bytesToHex(staticKeys.staticEncryption.privateKey),
      publicKey: formatKeyForDisplay(staticKeys.staticEncryption.publicKey),
      publicKeyFull: bytesToHex(staticKeys.staticEncryption.publicKey),
    },
    staticDiscovery: {
      privateKey: formatKeyForDisplay(staticKeys.staticDiscovery.privateKey),
      privateKeyFull: bytesToHex(staticKeys.staticDiscovery.privateKey),
      publicKey: formatKeyForDisplay(staticKeys.staticDiscovery.publicKey),
      publicKeyFull: bytesToHex(staticKeys.staticDiscovery.publicKey),
    }
  };
}
