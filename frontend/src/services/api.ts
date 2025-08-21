import axios from 'axios';
import type { 
  ExecuteRequest, 
  ExecuteResponse, 
  CounterResult, 
  CounterAction,
  EmitTransactionRequest,
  EmitTransactionResponse
} from '../types/api';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiService {
  /**
   * Generate message for user to sign
   */
  static generateSigningMessage(action: CounterAction, userAccount: string, timestamp: string): string {
    return `Anoma Counter Authorization

Action: ${action.toUpperCase()}
Account: ${userAccount}
Timestamp: ${timestamp}
App: Anoma Counter dApp

By signing this message, I authorize the execution of this action on the Anoma network.`;
  }

  /**
   * Generate message for emitting transaction to sign
   */
  static generateEmitTransactionMessage(userAccount: string, timestamp: string): string {
    return `Anoma Protocol Adapter Transaction

Action: EMIT_TRANSACTION
Account: ${userAccount}
Timestamp: ${timestamp}
App: Anoma Counter dApp

By signing this message, I authorize the emission of an empty transaction to the Ethereum Sepolia Protocol Adapter.`;
  }

  /**
   * Execute a counter action on the ARM backend (with signature)
   */
  static async executeCounterAction(
    action: CounterAction,
    userAccount: string,
    signature: string,
    signedMessage: string,
    timestamp: string
  ): Promise<CounterResult> {
    const request: ExecuteRequest = {
      action,
      user_account: userAccount,
      signature,
      signed_message: signedMessage,
      timestamp,
    };

    try {
      const response = await apiClient.post<ExecuteResponse>('/execute', request);
      
      // Parse the JSON string result
      const result: CounterResult = JSON.parse(response.data.result);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMsg = error.response.data?.error || 'API request failed';
        throw new Error(errorMsg);
      }
      throw new Error('Network error occurred');
    }
  }

  /**
   * Emit an empty transaction to the Protocol Adapter (works with any adapter)
   */
  static async emitEmptyTransaction(
    userAccount: string,
    signature: string,
    signedMessage: string,
    timestamp: string
  ): Promise<EmitTransactionResponse> {
    const request: EmitTransactionRequest = {
      user_account: userAccount,
      signature,
      signed_message: signedMessage,
      timestamp,
    };

    try {
      const response = await apiClient.post<EmitTransactionResponse>('/emit-empty-transaction', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMsg = error.response.data?.error || 'Failed to emit empty transaction';
        throw new Error(errorMsg);
      }
      throw new Error('Network error occurred');
    }
  }

  /**
   * Emit a real ARM transaction with ZK proofs (debugging)
   */
  static async emitRealTransaction(
    userAccount: string,
    signature: string,
    signedMessage: string,
    timestamp: string
  ): Promise<EmitTransactionResponse> {
    const request: EmitTransactionRequest = {
      user_account: userAccount,
      signature,
      signed_message: signedMessage,
      timestamp,
    };

    try {
      const response = await apiClient.post<EmitTransactionResponse>('/emit-real-transaction', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMsg = error.response.data?.error || 'Failed to emit real transaction';
        throw new Error(errorMsg);
      }
      throw new Error('Network error occurred');
    }
  }

  /**
   * Emit an ARM counter initialization transaction with ZK proofs
   */
  static async emitCounterTransaction(
    userAccount: string,
    signature: string,
    signedMessage: string,
    timestamp: string
  ): Promise<EmitTransactionResponse> {
    const request: EmitTransactionRequest = {
      user_account: userAccount,
      signature,
      signed_message: signedMessage,
      timestamp,
    };

    try {
      const response = await apiClient.post<EmitTransactionResponse>('/emit-counter-transaction', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMsg = error.response.data?.error || 'Failed to emit counter transaction';
        throw new Error(errorMsg);
      }
      throw new Error('Network error occurred');
    }
  }

  /**
   * Emit an ARM counter increment transaction with ZK proofs
   */
  static async emitIncrementTransaction(
    userAccount: string,
    signature: string,
    signedMessage: string,
    timestamp: string
  ): Promise<EmitTransactionResponse> {
    const request: EmitTransactionRequest = {
      user_account: userAccount,
      signature,
      signed_message: signedMessage,
      timestamp,
    };

    try {
      const response = await apiClient.post<EmitTransactionResponse>('/emit-increment-transaction', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMsg = error.response.data?.error || 'Failed to emit increment transaction';
        throw new Error(errorMsg);
      }
      throw new Error('Network error occurred');
    }
  }

  // Note: Counter helper methods are removed - use executeCounterAction directly with signatures
}

export default ApiService;
