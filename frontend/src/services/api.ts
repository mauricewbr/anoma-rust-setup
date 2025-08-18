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
   * Execute a counter action on the ARM backend
   */
  static async executeCounterAction(
    action: CounterAction,
    currentValue: number = 0,
    userAccount: string
  ): Promise<CounterResult> {
    const request: ExecuteRequest = {
      value1: action,
      value2: currentValue.toString(),
      value3: userAccount,
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
   * Initialize a new counter
   */
  static async initializeCounter(userAccount: string): Promise<CounterResult> {
    return this.executeCounterAction('initialize', 0, userAccount);
  }

  /**
   * Increment the counter
   */
  static async incrementCounter(currentValue: number, userAccount: string): Promise<CounterResult> {
    return this.executeCounterAction('increment', currentValue, userAccount);
  }

  /**
   * Decrement the counter
   */
  static async decrementCounter(currentValue: number, userAccount: string): Promise<CounterResult> {
    return this.executeCounterAction('decrement', currentValue, userAccount);
  }
}

export default ApiService;
