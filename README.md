# 🚀 Anoma Counter dApp

A modern TypeScript frontend communicating with a Rust ARM/RISC0 backend for counter operations with MetaMask integration.

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/JSON    ┌──────────────────┐
│  TypeScript     │ ─────────────── │  Rust Backend    │
│  Frontend       │                 │  (ARM/RISC0)     │
│  (React + Vite) │                 │  (Axum Server)   │
└─────────────────┘                 └──────────────────┘
     Port 5173                           Port 3000
```

## 🛠️ Setup & Running

### Backend (Rust)
```bash
# In the root directory
cargo run
```
- Runs on: `http://127.0.0.1:3000`
- API endpoint: `POST /execute`
- CORS enabled for frontend communication

### Frontend (TypeScript)
```bash
# In the frontend directory
cd frontend
npm install
npm run dev
```
- Runs on: `http://localhost:5173`
- Auto-proxies API calls to backend
- Hot module reloading enabled

## 🎯 Features

### Frontend
- ✅ **TypeScript + React** with modern hooks
- ✅ **MetaMask Integration** - wallet connection & message signing
- ✅ **Counter Operations** - initialize, increment, decrement
- ✅ **Real-time UI** - loading states, error handling
- ✅ **Transaction Display** - shows signed data and backend responses

### Backend
- ✅ **Rust + Axum** web server
- ✅ **CORS Support** for frontend communication
- ✅ **Counter Logic** with proper state management
- ✅ **ARM Transaction Structure** ready for integration
- ✅ **Protocol Adapter** simulation (Arbitrum Sepolia)

## 🔄 Data Flow

1. **Frontend**: User clicks counter action (initialize/increment/decrement)
2. **API Call**: Frontend sends action to `POST /execute` with:
   ```json
   {
     "value1": "initialize|increment|decrement",
     "value2": "current_counter_value",
     "value3": "user_wallet_address"
   }
   ```
3. **Backend Processing**: Creates ARM transaction and generates signing message
4. **MetaMask Signing**: Frontend prompts user to sign the message
5. **Result Display**: Shows signed transaction and backend response

## 🧪 Testing

### Test Backend API
```bash
curl -X POST http://127.0.0.1:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"value1":"initialize","value2":"0","value3":"0x1234567890123456789012345678901234567890"}'
```

### Test Frontend
1. Open `http://localhost:5173` in browser
2. Connect MetaMask wallet
3. Initialize counter
4. Try increment/decrement operations

## 📁 Project Structure

```
arm-rust-server/
├── src/
│   ├── main.rs              # Rust backend with CORS
│   ├── main_backup.rs       # Full ARM integration (needs dependencies)
│   └── main_simple.rs       # Minimal test version
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API & wallet services
│   │   ├── types/           # TypeScript type definitions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json         # Frontend dependencies
│   └── vite.config.ts       # Vite configuration with proxy

├── Cargo.toml               # Rust dependencies
└── README.md                # This file
```

## 🔧 Development Commands

### Frontend
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # TypeScript type checking
```

### Backend
```bash
cargo run        # Start server
cargo check      # Quick compilation check
cargo build      # Build binary
```

## 🚀 Next Steps

1. **ARM Integration**: Add real ARM crate dependencies to `Cargo.toml`
2. **RISC0 Integration**: Add zero-knowledge proof generation
3. **Database**: Replace in-memory state with persistent storage
4. **Production**: Docker containers and deployment configuration

## 💡 Key Benefits

- **Type Safety**: Full TypeScript integration
- **Modern Tooling**: Vite for fast development
- **Clean Architecture**: Separated concerns
- **MetaMask Ready**: Production-ready wallet integration
- **ARM Compatible**: Backend structure ready for ARM integration
