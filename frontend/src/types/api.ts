// API Types based on existing Rust backend
export interface ExecuteRequest {
  value1: string; // action: initialize, increment, decrement
  value2: string; // current value
  value3: string; // user account address
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

export type CounterAction = 'initialize' | 'increment' | 'decrement';
