// Authentication utilities for error handling
export function isUnauthorizedError(error: any): boolean {
  return error?.response?.status === 401 || /^401/.test(error?.message);
}

export function handleAuthError(error: any, onUnauthorized?: () => void) {
  if (isUnauthorizedError(error)) {
    console.log('Authentication error detected, redirecting to login');
    if (onUnauthorized) {
      onUnauthorized();
    } else {
      window.location.href = '/auth';
    }
    return true;
  }
  return false;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('auth_token');
}