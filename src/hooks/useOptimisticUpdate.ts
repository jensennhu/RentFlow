import { useState, useCallback } from 'react';

export const useOptimisticUpdate = <T>(
  updateFn: (data: T) => void,
  rollbackFn: () => void,
  serverUpdateFn: (data: T) => Promise<void>
) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const optimisticUpdate = useCallback(async (data: T) => {
    setIsUpdating(true);
    
    // Apply optimistic update immediately
    updateFn(data);
    
    try {
      await serverUpdateFn(data);
    } catch (error) {
      // Rollback on error
      rollbackFn();
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [updateFn, rollbackFn, serverUpdateFn]);
  
  return { optimisticUpdate, isUpdating };
};