import { useState, useCallback } from 'react';
import { ResultState, ResultAction } from '@/components/session/SessionReducers';

interface UseResultReportingProps {
  resultState: ResultState;
  dispatchResult: React.Dispatch<ResultAction>;
  onSubmitResult: () => Promise<void>;
  isSubmitted: boolean;
}

interface ResultReportingState {
  isSubmitting: boolean;
  handleSubmitResults: () => Promise<void>;
}

export function useResultReporting({
  resultState,
  dispatchResult,
  onSubmitResult,
  isSubmitted
}: UseResultReportingProps): ResultReportingState {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Function to handle form submission
  const handleSubmitResults = useCallback(async () => {
    if (isSubmitted || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Call the provided submit function
      await onSubmitResult();
    } catch (error) {
      console.error('Error in handleSubmitResults:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitted, isSubmitting, onSubmitResult]);
  
  return {
    isSubmitting,
    handleSubmitResults
  };
} 