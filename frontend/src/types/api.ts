// API Types based on existing Rust backend
export interface ExecuteRequest {
  action: string; // initialize, increment, decrement
  user_account: string; // wallet address
  signature: string; // MetaMask signature
  signed_message: string; // The message that was signed
  timestamp: string; // When the signature was created
}

export interface ExecuteResponse {
  result: string; // JSON string containing the actual response
}

export interface ErrorResponse {
  error: string;
}

// Parsed result from ExecuteResponse.result
export interface CounterResult {
  inputs: {
    action: string;
    requested_value?: number;
    final_value: number;
    user_account: string;
  };
  transaction: any; // ARM transaction structure
  message_to_sign: string;
  status: string;
  next_step: string;
  protocol_adapter: {
    verification: string;
    submission: {
      status: string;
      tx_hash?: string;
      pa_contract?: string;
      chain_id?: number;
      error?: string;
    };
  };
  timestamp: string;
  message?: string;
}

// MetaMask signature data
export interface SignedTransaction {
  signature: string;
  message: string;
  signer: string;
  timestamp: string;
}

export interface EmitTransactionRequest {
  user_account: string;
  signature: string;
  signed_message: string;
  timestamp: string;
}

export interface EmitTransactionResponse {
  transaction_hash: string;
  success: boolean;
  message: string;
  transaction_data?: any; // ARM transaction data for ethers.js execution
}

export type CounterAction = 'initialize' | 'increment' | 'decrement';
