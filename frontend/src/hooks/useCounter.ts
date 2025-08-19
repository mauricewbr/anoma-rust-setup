import { useState, useCallback } from 'react';
import { ApiService } from '../services/api';
import type { CounterResult, CounterAction, SignedTransaction } from '../types/api';

interface CounterState {
  value: number;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  lastResult: CounterResult | null;
  lastSignedTransaction: SignedTransaction | null;
}

export const useCounter = () => {
  const [counterState, setCounterState] = useState<CounterState>({
    value: 0,
    isInitialized: false,
    isLoading: false,
    error: null,
    lastResult: null,
    lastSignedTransaction: null
  });

  const executeAction = useCallback(async (
    action: CounterAction,
    userAccount: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    setCounterState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Generate message to sign BEFORE backend call
      const timestamp = new Date().toISOString();
      const messageToSign = ApiService.generateSigningMessage(action, userAccount, timestamp);

      // Step 2: Get signature from MetaMask FIRST
      const signature = await signMessage(messageToSign);

      // Step 3: Send signed data to backend for ARM execution
      const result = await ApiService.executeCounterAction(
        action,
        userAccount,
        signature,
        messageToSign,
        timestamp
      );

      // Step 4: Create signed transaction object
      const signedTransaction: SignedTransaction = {
        signature,
        message: messageToSign,
        signer: userAccount,
        timestamp
      };

      // Step 5: Update counter state
      setCounterState(prev => ({
        ...prev,
        value: result.inputs.final_value,
        isInitialized: action === 'initialize' ? true : prev.isInitialized,
        isLoading: false,
        lastResult: result,
        lastSignedTransaction: signedTransaction
      }));

      return { result, signedTransaction };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setCounterState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const initializeCounter = useCallback(async (
    userAccount: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    return executeAction('initialize', userAccount, signMessage);
  }, [executeAction]);

  const incrementCounter = useCallback(async (
    userAccount: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    return executeAction('increment', userAccount, signMessage);
  }, [executeAction]);

  const decrementCounter = useCallback(async (
    userAccount: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    return executeAction('decrement', userAccount, signMessage);
  }, [executeAction]);

  const resetError = useCallback(() => {
    setCounterState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    counterState,
    initializeCounter,
    incrementCounter,
    decrementCounter,
    resetError
  };
};
