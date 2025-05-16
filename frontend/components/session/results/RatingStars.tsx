import React, { memo } from 'react';

interface RatingStarsProps {
  rating: number;
  onSetRating: (rating: number) => void;
}

const RatingStarsComponent = ({ rating, onSetRating }: RatingStarsProps) => {
  return (
    <div>
      <p className="text-muted-foreground mb-2">Rate Session Experience:</p>
      <div className="flex justify-between sm:justify-start sm:space-x-2">
        {[1, 2, 3, 4, 5].map((star) => {
          // Determine color based on rating value
          let colorClass = '';
          if (star <= rating) {
            if (rating === 1) {
              colorClass = 'bg-red-500 text-white';
            } else if (rating <= 3) {
              colorClass = 'bg-amber-500 text-white';
            } else {
              colorClass = 'bg-emerald-500 text-white';
            }
          } else {
            colorClass = 'bg-secondary text-muted-foreground';
          }
          
          return (
            <button 
              key={star} 
              className={`w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${colorClass}`}
              onClick={() => onSetRating(star)}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
};

RatingStarsComponent.displayName = 'RatingStars';

export const RatingStars = memo(RatingStarsComponent); 