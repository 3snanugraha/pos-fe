import { logout } from '../services/auth';
import { router } from 'expo-router';

/**
 * Handle authentication errors by clearing storage and redirecting to login
 */
export const handleAuthError = async (error: any, showDelay: boolean = true) => {
  // console.log('Handling auth error:', error.message);
  
  if (error.message === 'Token expired or invalid' || error.message === 'Not authenticated') {
    // Clear all auth data
    await logout();
    
    // Redirect to login
    if (showDelay) {
      setTimeout(() => {
        router.replace('/auth/login');
      }, 1500);
    } else {
      router.replace('/auth/login');
    }
    
    return true; // Indicates auth error was handled
  }
  
  return false; // Not an auth error
};

/**
 * Get user-friendly error message for API errors
 */
export const getErrorMessage = (error: any): string => {
  if (error.message === 'Not authenticated') {
    return 'Silakan login terlebih dahulu';
  } else if (error.message === 'Token expired or invalid') {
    return 'Sesi Anda telah berakhir, akan diarahkan ke halaman login';
  } else if (error.message === 'Network error or server unavailable') {
    return 'Tidak dapat terhubung ke server';
  } else if (error.message && error.message.includes('fetch')) {
    return 'Tidak dapat terhubung ke server';
  } else {
    return 'Terjadi kesalahan, silakan coba lagi';
  }
};
