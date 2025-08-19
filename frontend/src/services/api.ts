import axios from 'axios';
import type { ExecuteRequest, ExecuteResponse, CounterResult, CounterAction } from '../types/api';

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

  // Note: These helper methods are removed - use executeCounterAction directly with signatures
}

export default ApiService;
