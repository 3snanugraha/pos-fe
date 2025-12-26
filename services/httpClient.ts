import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_CONFIG, HTTP_STATUS, ERROR_MESSAGES, DEBUG_MODE } from './config';
import { ApiResponse, NetworkState } from './types';

// HTTP Client class with comprehensive error handling
export class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.timeout = API_CONFIG.timeout;
    this.retryAttempts = API_CONFIG.retryAttempts;
    this.retryDelay = API_CONFIG.retryDelay;
  }

  // Get authentication token
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to get auth token:', error);
      }
      return null;
    }
  }

  // Clear authentication token
  private async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to clear auth data:', error);
      }
    }
  }

  // Handle authentication errors
  private async handleAuthError(): Promise<void> {
    await this.clearAuthToken();
    router.replace('/auth/login');
  }

  // Create timeout controller
  private createTimeoutController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  // Sleep utility for retry delay
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Log request/response for debugging
  private logRequest(method: string, url: string, data?: any): void {
    if (DEBUG_MODE) {
      console.log(`🌐 HTTP ${method.toUpperCase()} ${url}`);
      if (data) {
        console.log('📤 Request data:', data);
      }
    }
  }

  private logResponse(method: string, url: string, response: any, duration: number): void {
    if (DEBUG_MODE) {
      console.log(`✅ HTTP ${method.toUpperCase()} ${url} (${duration}ms)`);
      console.log('📥 Response:', response);
    }
  }

  private logError(method: string, url: string, error: any, duration: number): void {
    if (DEBUG_MODE) {
      console.error(`❌ HTTP ${method.toUpperCase()} ${url} (${duration}ms)`);
      console.error('Error details:', error);
    }
  }

  // Make HTTP request with retry logic
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    options: {
      data?: any;
      headers?: Record<string, string>;
      requireAuth?: boolean;
      skipRetry?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { data, headers = {}, requireAuth = false, skipRetry = false } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    this.logRequest(method, url, data);

    // Set default headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // Add authentication header if required
    if (requireAuth) {
      const token = await this.getAuthToken();
      if (!token) {
        throw new ApiError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
      }
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: requestHeaders,
      signal: this.createTimeoutController(this.timeout).signal,
    };

    // Add body for POST, PUT, PATCH requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(data);
    }

    // Retry logic
    let lastError: any;
    const maxRetries = skipRetry ? 1 : this.retryAttempts;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        // Get response text and clean BOM character if present
        const responseText = await response.text();
        const cleanedResponseText = responseText.replace(/^\uFEFF/, ''); // Remove BOM
        const responseData = JSON.parse(cleanedResponseText);
        const duration = Date.now() - startTime;

        // Handle different response statuses
        if (response.ok) {
          this.logResponse(method, url, responseData, duration);
          return responseData;
        }

        // Handle authentication errors
        if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          if (requireAuth) {
            await this.handleAuthError();
          }
          throw new ApiError(
            ERROR_MESSAGES.UNAUTHORIZED,
            HTTP_STATUS.UNAUTHORIZED,
            responseData.errors
          );
        }

        // Handle validation errors
        if (response.status === HTTP_STATUS.VALIDATION_ERROR) {
          throw new ApiError(
            responseData.message || ERROR_MESSAGES.VALIDATION_ERROR,
            HTTP_STATUS.VALIDATION_ERROR,
            responseData.errors
          );
        }

        // Handle other client errors
        if (response.status >= 400 && response.status < 500) {
          throw new ApiError(
            responseData.message || ERROR_MESSAGES.UNKNOWN,
            response.status,
            responseData.errors
          );
        }

        // Handle server errors (retry these)
        if (response.status >= 500) {
          throw new ApiError(
            responseData.message || ERROR_MESSAGES.SERVER_ERROR,
            response.status
          );
        }

        // Unknown status
        throw new ApiError(
          responseData.message || ERROR_MESSAGES.UNKNOWN,
          response.status
        );

      } catch (error: any) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        // Handle timeout errors
        if (error.name === 'AbortError') {
          lastError = new ApiError(ERROR_MESSAGES.TIMEOUT, 408);
        }
        
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('Network request failed')) {
          lastError = new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0);
        }

        this.logError(method, url, lastError, duration);

        // Don't retry for client errors (4xx) except timeout
        if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 408) {
          throw lastError;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        await this.sleep(this.retryDelay * attempt);
        
        // Create new timeout controller for retry
        fetchOptions.signal = this.createTimeoutController(this.timeout).signal;
      }
    }

    // This should never be reached, but just in case
    throw lastError || new ApiError(ERROR_MESSAGES.UNKNOWN);
  }

  // Public HTTP methods
  async get<T>(endpoint: string, requireAuth = false): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, { requireAuth });
  }

  async post<T>(endpoint: string, data: any, requireAuth = false): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, { data, requireAuth });
  }

  async put<T>(endpoint: string, data: any, requireAuth = false): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, { data, requireAuth });
  }

  async patch<T>(endpoint: string, data: any, requireAuth = false): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', endpoint, { data, requireAuth });
  }

  async delete<T>(endpoint: string, requireAuth = false): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, { requireAuth });
  }

  // Upload file method
  async upload<T>(
    endpoint: string,
    formData: FormData,
    requireAuth = true,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    this.logRequest('POST', url, '[FormData]');

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (requireAuth) {
      const token = await this.getAuthToken();
      if (!token) {
        throw new ApiError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: this.createTimeoutController(this.timeout * 3).signal, // Longer timeout for uploads
      });

      // Handle BOM character that may be present in response
      const responseText = await response.text();
      const cleanedResponseText = responseText.replace(/^\uFEFF/, ''); // Remove BOM
      const responseData = JSON.parse(cleanedResponseText);
      const duration = Date.now() - startTime;

      if (response.ok) {
        this.logResponse('POST', url, responseData, duration);
        return responseData;
      }

      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        if (requireAuth) {
          await this.handleAuthError();
        }
        throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }

      throw new ApiError(
        responseData.message || ERROR_MESSAGES.UNKNOWN,
        response.status,
        responseData.errors
      );

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        error = new ApiError(ERROR_MESSAGES.TIMEOUT, 408);
      }

      this.logError('POST', url, error, duration);
      throw error;
    }
  }

  // Check API status
  async checkStatus(): Promise<boolean> {
    try {
      const response = await this.get('/status');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  // Test authentication
  async testAuth(): Promise<boolean> {
    try {
      const response = await this.get('/customer/profile', true);
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

// Custom API Error class
export class ApiError extends Error {
  public status?: number;
  public errors?: Record<string, string[]>;
  public code?: string;

  constructor(message: string, status?: number, errors?: Record<string, string[]>, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }

  // Get user-friendly error message
  getUserMessage(): string {
    if (this.status === HTTP_STATUS.UNAUTHORIZED) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    
    if (this.status === HTTP_STATUS.VALIDATION_ERROR) {
      return ERROR_MESSAGES.VALIDATION_ERROR;
    }
    
    if (this.status === 0) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    if (this.status === 408) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    
    if (this.status && this.status >= 500) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
    
    return this.message || ERROR_MESSAGES.UNKNOWN;
  }

  // Get validation errors as flat array
  getValidationErrors(): string[] {
    if (!this.errors) return [];
    
    const errors: string[] = [];
    Object.values(this.errors).forEach(fieldErrors => {
      errors.push(...fieldErrors);
    });
    
    return errors;
  }

  // Check if error is retryable
  isRetryable(): boolean {
    return !this.status || this.status >= 500 || this.status === 408 || this.status === 0;
  }
}

// Singleton instance
export const httpClient = new HttpClient();
