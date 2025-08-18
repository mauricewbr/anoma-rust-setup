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
      // Step 1: Call backend to create ARM transaction
      const result = await ApiService.executeCounterAction(
        action,
        counterState.value,
        userAccount
      );

      // Step 2: Sign the message with MetaMask
      const signature = await signMessage(result.message_to_sign);

      // Step 3: Create signed transaction object
      const signedTransaction: SignedTransaction = {
        signature,
        message: result.message_to_sign,
        signer: userAccount,
        timestamp: new Date().toISOString()
      };

      // Step 4: Update counter state
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
  }, [counterState.value]);

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
