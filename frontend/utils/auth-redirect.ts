/**
 * Utility functions for handling authentication redirects
 */

/**
 * Saves the current URL to localStorage for redirecting back after login
 * This is useful for shared links that require authentication
 */
export const saveRedirectUrl = (url: string): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('redirectAfterLogin', url);
  }
};

/**
 * Gets and clears the saved redirect URL
 * Returns the URL to redirect to or null if none exists
 */
export const getAndClearRedirectUrl = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  
  const redirectUrl = localStorage.getItem('redirectAfterLogin');
  if (redirectUrl) {
    localStorage.removeItem('redirectAfterLogin');
    return redirectUrl;
  }
  
  return null;
}; 