import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);
  
  const handleError = useCallback((error: Error, context: string) => {
    console.error(`[${context}]:`, error);
    setError(`${context}: ${error.message}`);
    // TODO: Add error reporting service (Sentry, LogRocket, etc.)
  }, []);
  
  const clearError = useCallback(() => setError(null), []);
  
  return { error, handleError, clearError };
};