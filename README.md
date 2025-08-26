`# Anoma Resource Machine Protocol Adapter

A full-stack application demonstrating the integration between Anoma's Resource Machine (ARM) and Ethereum, enabling zero-knowledge proof verification and privacy-preserving transactions on Ethereum networks.

## Overview

This project showcases a complete implementation of ARM-to-EVM transaction bridging, featuring:

- **Zero-Knowledge Proof Generation**: RISC0-powered proof generation for ARM transactions
- **Cross-Chain Integration**: Seamless conversion between ARM and EVM transaction formats
- **Full-Stack Architecture**: Rust backend with TypeScript frontend
- **Production-Ready Components**: Built with modern tooling (Alloy, ethers.js, React)

## Architecture

```
┌─────────────────────────────────┐
│     Frontend (React/TypeScript) │
│  ┌─────────────────────────────┐ │
│  │   MetaMask Integration      │ │
│  │   Transaction Signing       │ │
│  │   Protocol Adapter UI       │ │
│  └─────────────────────────────┘ │
└─────────────┬───────────────────┘
              │
              │ HTTP/WebSocket
              │
┌─────────────▼───────────────────┐
│      Backend (Rust/Axum)       │
│  ┌─────────────────────────────┐ │
│  │   ARM Transaction Engine    │ │
│  │   RISC0 Proof Generation    │ │
│  │   Protocol Adapter Bridge   │ │
│  │   Ethereum Integration      │ │
│  └─────────────────────────────┘ │
└─────────────┬───────────────────┘
              │
              │ RPC Calls
              │
┌─────────────▼───────────────────┐
│      Ethereum Network          │
│   Protocol Adapter Contracts   │
└─────────────────────────────────┘
```

## Features

### Core Capabilities
- **ARM Transaction Generation**: Create privacy-preserving resource transactions
- **ZK Proof Integration**: RISC0-based zero-knowledge proof generation and verification  
- **Protocol Adaptation**: Convert ARM transactions to EVM-compatible format
- **Counter Application**: Reference implementation with state management

### Technical Highlights
- **Modern Rust Stack**: Built with Axum, Alloy, and async/await patterns
- **Type Safety**: End-to-end type safety from Rust backend to TypeScript frontend
- **Production Cryptography**: Integration with Bonsai API for scalable proof generation
- **Ethereum Integration**: Direct interaction with deployed Protocol Adapter contracts

## Quick Start

### Prerequisites
- **Rust**: 1.70 or later ([Install Rust](https://rustup.rs/))
- **Node.js**: 18+ ([Install Node.js](https://nodejs.org/))
- **MetaMask**: Browser extension for wallet integration

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arm-rust-server
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration:
   # BONSAI_API_KEY=your_bonsai_api_key
   # BONSAI_API_URL=https://api.bonsai.xyz
   # PROTOCOL_ADAPTER_ADDRESS_SEPOLIA=0x...
   ```

3. **Start the application**

   **Option A: One-command startup (recommended)**
   ```bash
   ./start-dev.sh
   ```
   This script handles both backend and frontend startup with proper configuration.

   **Option B: Manual startup**
   ```bash
   # Terminal 1: Start backend
   cargo run

   # Terminal 2: Start frontend
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend UI: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

## API Reference

The backend exposes REST endpoints for ARM transaction operations:

### Transaction Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/emit-empty-transaction` | POST | Submit test transaction without ARM logic |
| `/emit-real-transaction` | POST | Generate and submit ARM transaction with ZK proofs |
| `/emit-counter-transaction` | POST | Create counter application transaction |

### Request Format

All endpoints accept JSON payloads with user authentication:

```json
{
  "user_account": "0x...",
  "signature": "0x...",
  "signed_message": "message",
  "timestamp": "ISO8601"
}
```

### Response Format

```json
{
  "transaction_hash": "0x...",
  "success": true,
  "message": "Transaction submitted successfully",
  "transaction_data": { ... }
}
```

## Development

### Project Structure

```
├── src/
│   └── main.rs              # Backend server and API endpoints
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API and wallet services
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── Cargo.toml               # Rust dependencies
└── README.md
```

### Key Dependencies

- **Backend**: `axum`, `alloy`, `risc0-zkvm`, `arm-risc0`
- **Frontend**: `react`, `ethers`, `axios`
- **ZK Proving**: RISC0 with Bonsai API integration

### Configuration

Environment variables required for operation:

- `BONSAI_API_KEY`: RISC0 Bonsai API key for proof generation
- `BONSAI_API_URL`: Bonsai service endpoint
- `PROTOCOL_ADAPTER_ADDRESS_SEPOLIA`: Deployed contract address

## Technology Stack

### Backend (Rust)
- **Web Framework**: Axum for async HTTP server
- **Ethereum Client**: Alloy for type-safe blockchain interactions
- **Zero-Knowledge**: RISC0 for proof generation and verification
- **ARM Integration**: Direct integration with Anoma Resource Machine

### Frontend (TypeScript/React)
- **UI Framework**: React with modern hooks
- **Ethereum Integration**: ethers.js for wallet and contract interactions
- **HTTP Client**: Axios for API communication
- **Wallet**: MetaMask integration for transaction signing

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests where appropriate
5. Submit a pull request

## License

This project is licensed under [LICENSE](./LICENSE). See the LICENSE file for details.

## Links

- [Anoma Protocol](https://anoma.net)
- [RISC0](https://risczero.com)
- [ARM Specification](https://github.com/anoma/arm-risc0)