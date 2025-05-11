/**
 * Format a duration in seconds to a human-readable string
 * @param totalSeconds Duration in seconds
 * @returns Formatted string like "5m 30s" or "1h 20m 15s"
 */
export function formatDuration(totalSeconds: number): string {
  // Check for invalid values
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    // Only log error for development, return default value for production
    if (process.env.NODE_ENV === 'development') {
      console.error('Invalid time value for formatting:', totalSeconds);
    }
    return '0m 00s';
  }
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Format a date to a human-readable string
 * @param dateString ISO date string
 * @returns Formatted string like "Jan 15, 2023"
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date to include time
 * @param dateString ISO date string
 * @returns Formatted string like "Jan 15, 2023, 3:45 PM"
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid date';
  }
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param dateString ISO date string
 * @returns Relative time string
 */
export function getRelativeTimeString(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Convert to seconds
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) {
      return diffSec <= 5 ? 'just now' : `${diffSec} seconds ago`;
    }
    
    // Convert to minutes
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffMin < 60) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Convert to hours
    const diffHours = Math.floor(diffMin / 60);
    
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Convert to days
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
    
    // If more than a week ago, just return the formatted date
    return formatDate(dateString);
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Unknown time';
  }
} 