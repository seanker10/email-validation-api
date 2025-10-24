/**
 * Disposable Email Detection Utility
 * Simplified stub for initial deployment
 */

export async function initializeDisposableDomains(): Promise<void> {
  // Stub implementation - will be enhanced later
  console.log('Disposable domains list initialization skipped (basic validation only)');
  return Promise.resolve();
}

export function isDisposable(email: string): boolean {
  // Basic check for common disposable domains
  const disposableDomains = [
    'tempmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'throwaway.email'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}
