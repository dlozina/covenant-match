import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResultState, ResultAction, SessionState } from '@/components/session/SessionReducers';
import { ResultButton } from './ResultButton';
import { RatingStars } from './RatingStars';
import { useResultReporting } from './useResultReporting';

interface ResultReportingSectionProps {
  resultState: ResultState;
  dispatchResult: React.Dispatch<ResultAction>;
  sessionState: SessionState;
  formatTime: (seconds: number) => string;
  onSubmitResult: () => Promise<void>;
  isSubmitted: boolean;
  submissionError: string | null;
}

const ResultReportingSectionComponent = ({ 
  resultState, 
  dispatchResult, 
  sessionState, 
  formatTime,
  onSubmitResult,
  isSubmitted,
  submissionError
}: ResultReportingSectionProps) => {
  const { isSubmitting, handleSubmitResults } = useResultReporting({
    resultState,
    dispatchResult,
    onSubmitResult,
    isSubmitted
  });
  
  return (
    <Card className="flex flex-col flex-grow">
      <CardHeader>
        <CardTitle>Report Your Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow flex flex-col justify-between">
        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-green-500 mb-2">✓</div>
            <h3 className="text-xl font-medium mb-2">Results Submitted</h3>
            <p className="text-center text-muted-foreground">
              Thank you for submitting your results. 
              Once majority of players have reported, the session will be saved in statistics.
            </p>
          </div>
        ) : (
          <>
            {/* Result Options */}
            <div className="grid grid-cols-3 gap-3">
              <ResultButton 
                type="win" 
                isSelected={resultState.selectedResult === 'win'}
                onSelect={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'win' })}
              />
              <ResultButton 
                type="loss" 
                isSelected={resultState.selectedResult === 'loss'}
                onSelect={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'loss' })}
              />
              <ResultButton 
                type="dc" 
                isSelected={resultState.selectedResult === 'dc'}
                onSelect={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'dc' })}
              />
            </div>

            {/* Session Timer */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Session Duration:</span>
              <span className="text-foreground font-medium">
                {formatTime(sessionState.finalDuration || sessionState.elapsedSeconds)}
              </span>
            </div>

            {/* Rating Stars */}
            <RatingStars 
              rating={resultState.rating} 
              onSetRating={(rating) => dispatchResult({ type: 'SET_RATING', payload: rating })}
            />
            
            {/* Error message display */}
            {submissionError && (
              <div className="text-red-500 text-sm">
                Error: {submissionError}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              className="w-full h-12 mt-auto bg-emerald-600 hover:bg-emerald-700 animate-pulse" 
              onClick={handleSubmitResults}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : '➤ Submit Results'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

ResultReportingSectionComponent.displayName = 'ResultReportingSection';

export const ResultReportingSection = memo(ResultReportingSectionComponent); 