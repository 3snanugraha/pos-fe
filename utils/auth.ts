import { logout } from '../services/auth';
import { ApiError } from '../services/httpClient';
import { router } from 'expo-router';

/** True bila error berasal dari lapisan HTTP kita dan berstatus 401. */
const isUnauthorized = (error: any): boolean =>
  error instanceof ApiError && error.status === 401;

/**
 * Handle authentication errors by clearing storage and redirecting to login
 */
export const handleAuthError = async (error: any, showDelay: boolean = true) => {
  // `ApiError` dari httpClient memakai pesan "Authentication required" (dibuang
  // sebelum request dikirim karena token tidak ada), bukan "Not authenticated"
  // milik services/api.ts. Tanpa cek status, layar yang butuh login berhenti di
  // pesan galat generik padahal masalahnya cuma belum masuk.
  const perluLogin =
    error?.message === 'Token expired or invalid' ||
    error?.message === 'Not authenticated' ||
    isUnauthorized(error);

  if (perluLogin) {
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
 *
 * Urutan penting: `ApiError` membawa `status` yang jauh lebih informatif
 * daripada teks `message` mentah. Sebelumnya semua error selain tiga string
 * khusus jatuh ke "Terjadi kesalahan, silakan coba lagi", sehingga gangguan
 * yang penyebabnya jelas (server 500, timeout, koneksi mati, 404) tampil
 * sebagai pesan generik yang tidak bisa ditindaklanjuti pengguna.
 *
 * Pesan ditulis Indonesia di sini (bukan memakai `ApiError.getUserMessage()`
 * yang berbahasa Inggris) supaya konsisten dengan seluruh copy aplikasi.
 */
export const getErrorMessage = (error: any): string => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Sesi Anda telah berakhir, silakan login kembali';
    }
    if (error.status === 422) {
      return error.message || 'Data yang dikirim belum valid';
    }
    if (error.status === 0) {
      return 'Tidak dapat terhubung ke server';
    }
    if (error.status === 408) {
      return 'Server terlalu lama merespons, silakan coba lagi';
    }
    if (error.status === 404) {
      return 'Data yang diminta tidak ditemukan';
    }
    if (error.status && error.status >= 500) {
      return 'Server sedang bermasalah, silakan coba beberapa saat lagi';
    }
    return error.message || 'Terjadi kesalahan, silakan coba lagi';
  }

  if (error?.message === 'Not authenticated') {
    return 'Silakan login terlebih dahulu';
  } else if (error?.message === 'Token expired or invalid') {
    return 'Sesi Anda telah berakhir, akan diarahkan ke halaman login';
  } else if (error?.message === 'Network error or server unavailable') {
    return 'Tidak dapat terhubung ke server';
  } else if (error?.message && error.message.includes('fetch')) {
    return 'Tidak dapat terhubung ke server';
  } else {
    return 'Terjadi kesalahan, silakan coba lagi';
  }
};
