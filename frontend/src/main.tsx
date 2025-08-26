import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Setup crypto polyfills for @noble/secp256k1
import * as secp256k1 from '@noble/secp256k1';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

// Set up the required hash function for secp256k1 v2.x
secp256k1.etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) => {
  return hmac(sha256, key, secp256k1.etc.concatBytes(...messages));
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
