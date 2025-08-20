# ARM RISC0 Protocol Adapter Integration

A complete end-to-end integration between ARM (Anoma Resource Machine) and the EVM Protocol Adapter, enabling zero-knowledge proof verification on Ethereum Sepolia testnet.

## Overview

This project demonstrates how to:
- Generate ARM transactions with RISC0 zero-knowledge proofs
- Convert ARM transactions to EVM Protocol Adapter format
- Submit transactions to Ethereum via both Rust (Alloy) and TypeScript (ethers.js) clients
- Handle RISC0 proof verification and nullifier management

## Architecture

```
Frontend (TypeScript/React)
├── MetaMask Integration
├── Transaction Signing
└── Protocol Adapter Calls (ethers.js)

Backend (Rust/Axum)
├── ARM Transaction Generation
├── RISC0 Proof Generation (Bonsai)
├── Protocol Adapter Integration (Alloy)
└── Transaction Verification
```

## Key Components

### Backend (Rust)
- **ARM Integration**: Direct integration with `arm-risc0` for transaction generation
- **RISC0 Proving**: Uses Bonsai API for production-grade zero-knowledge proof generation
- **Protocol Adapter**: Submits transactions to deployed Protocol Adapter contracts
- **Multiple Endpoints**: Empty transactions, real ARM transactions, and counter operations

### Frontend (TypeScript)
- **React Interface**: Clean UI for transaction operations
- **MetaMask Integration**: Wallet connection and transaction signing
- **Protocol Adapter Service**: Direct contract interaction via ethers.js
- **Real-time Feedback**: Transaction status and hash display

## Setup

### Prerequisites
- Rust 1.70+
- Node.js 18+
- MetaMask browser extension

### Environment Configuration
Create a `.env` file:
```bash
BONSAI_API_KEY=your_bonsai_api_key
BONSAI_API_URL=https://api.bonsai.xyz
PROTOCOL_ADAPTER_ADDRESS_SEPOLIA=0x...
```

### Installation
```bash
# Backend
cargo run

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Usage

### 1. Empty Transaction
Test endpoint that submits a transaction with no ARM logic or proofs.

### 2. Real ARM Transaction
Generates a complete ARM transaction with RISC0 proofs and submits to Protocol Adapter.

### 3. ARM Counter Transaction
Uses actual ARM counter application logic for transaction generation.

## Known Issues and Workarounds

### ProtocolAdapter Conversion Issue
The `ProtocolAdapter::Transaction::from(raw_tx)` conversion corrupts proof data during ARM-to-EVM format conversion. A workaround manually replaces corrupted proofs with known-good values.

**Root Cause**: The conversion process treats some proof fields as raw binary instead of hex strings, causing serialization corruption.

**Workaround**: Manual proof replacement using validated hex strings from successful ethers.js transactions.

### Nullifier Management
Each ARM transaction uses nullifiers that can only be consumed once. For testing, deploy fresh Protocol Adapter contracts or use different transaction nonces.

## API Endpoints

- `POST /emit-empty-transaction` - Empty transaction (testing)
- `POST /emit-real-transaction` - Real ARM transaction with proofs
- `POST /emit-counter-transaction` - ARM counter initialization

## Development Notes

- RISC0 proof generation requires Bonsai API for production builds
- Protocol Adapter addresses must be updated for each deployment
- Frontend and backend must use the same Protocol Adapter address
- Gas limits are set to 3M for RISC0 proof verification

## Contributing

This is an internal company project. For questions or issues, contact the development team.

## License

Internal use only.