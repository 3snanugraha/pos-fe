import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpClient } from './httpClient';
import { DEBUG_MODE } from './config';
import { NetworkState } from './types';

// Network monitoring service
export class NetworkService {
  private static instance: NetworkService;
  private isConnected: boolean = true;
  private listeners: Array<(state: NetworkState) => void> = [];
  private pingInterval: NodeJS.Timeout | null = null;
  private lastConnectivityCheck: number = 0;
  private connectivityCheckInterval: number = 30000; // 30 seconds

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  // Initialize network monitoring
  private async initializeNetworkMonitoring(): Promise<void> {
    // Check initial connectivity
    this.isConnected = await this.checkApiConnectivity();
    
    // Start periodic connectivity checks
    this.startConnectivityMonitoring();

    if (DEBUG_MODE) {
      console.log('🌐 Network monitoring initialized. Connected:', this.isConnected);
    }
  }

  // Start periodic connectivity monitoring
  private startConnectivityMonitoring(): void {
    this.pingInterval = setInterval(async () => {
      const now = Date.now();
      if (now - this.lastConnectivityCheck < this.connectivityCheckInterval) {
        return;
      }

      this.lastConnectivityCheck = now;
      const wasConnected = this.isConnected;
      this.isConnected = await this.checkApiConnectivity();

      if (wasConnected !== this.isConnected) {
        if (DEBUG_MODE) {
          console.log('🌐 Network status changed:', this.isConnected ? 'Online' : 'Offline');
        }
        this.notifyListeners();
      }
    }, 5000); // Check every 5 seconds, but respect the interval
  }

  // Check API connectivity
  private async checkApiConnectivity(): Promise<boolean> {
    try {
      return await httpClient.checkStatus();
    } catch (error) {
      return false;
    }
  }

  // Stop connectivity monitoring
  private stopConnectivityMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Add connectivity listener
  addListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current state
    listener(this.getNetworkState());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    const state = this.getNetworkState();
    this.listeners.forEach(listener => listener(state));
  }

  // Get current network state
  getNetworkState(): NetworkState {
    return {
      isConnected: this.isConnected,
      isInternetReachable: this.isConnected, // For simplicity, assuming internet is reachable if API is reachable
      type: this.isConnected ? 'wifi' : 'none', // Simplified type detection
    };
  }

  // Check if currently online
  isOnline(): boolean {
    return this.isConnected;
  }

  // Check if currently offline
  isOffline(): boolean {
    return !this.isConnected;
  }

  // Force connectivity check
  async checkConnectivity(): Promise<boolean> {
    const wasConnected = this.isConnected;
    this.isConnected = await this.checkApiConnectivity();
    this.lastConnectivityCheck = Date.now();

    if (wasConnected !== this.isConnected) {
      this.notifyListeners();
    }

    return this.isConnected;
  }

  // Set connectivity check interval
  setConnectivityCheckInterval(intervalMs: number): void {
    this.connectivityCheckInterval = intervalMs;
  }

  // Cleanup when app is destroyed
  destroy(): void {
    this.stopConnectivityMonitoring();
    this.listeners = [];
  }
}

// Offline Queue Service for storing failed requests
export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private readonly QUEUE_KEY = 'offline_queue';
  private queue: Array<{
    id: string;
    endpoint: string;
    method: string;
    data?: any;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
  }> = [];

  private constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  // Load queue from storage
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        if (DEBUG_MODE) {
          console.log('📱 Offline queue loaded:', this.queue.length, 'items');
        }
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to load offline queue:', error);
      }
    }
  }

  // Save queue to storage
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
      if (DEBUG_MODE) {
        console.log('💾 Offline queue saved:', this.queue.length, 'items');
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to save offline queue:', error);
      }
    }
  }

  // Setup network listener to process queue when online
  private setupNetworkListener(): void {
    NetworkService.getInstance().addListener(async (state) => {
      if (state.isConnected && this.queue.length > 0) {
        await this.processQueue();
      }
    });
  }

  // Add request to offline queue
  async addToQueue(
    endpoint: string,
    method: string,
    data?: any,
    maxRetries: number = 3
  ): Promise<string> {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const queueItem = {
      id,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.queue.push(queueItem);
    await this.saveQueue();

    if (DEBUG_MODE) {
      console.log('📱 Added to offline queue:', method, endpoint);
    }

    return id;
  }

  // Process offline queue
  async processQueue(): Promise<void> {
    if (this.queue.length === 0 || NetworkService.getInstance().isOffline()) {
      return;
    }

    const successfulItems: string[] = [];
    const failedItems: string[] = [];

    if (DEBUG_MODE) {
      console.log('🔄 Processing offline queue:', this.queue.length, 'items');
    }

    // Process each item in the queue
    for (const item of this.queue) {
      try {
        // Determine HTTP method and make request
        let response;
        switch (item.method.toUpperCase()) {
          case 'GET':
            response = await httpClient.get(item.endpoint, true);
            break;
          case 'POST':
            response = await httpClient.post(item.endpoint, item.data, true);
            break;
          case 'PUT':
            response = await httpClient.put(item.endpoint, item.data, true);
            break;
          case 'DELETE':
            response = await httpClient.delete(item.endpoint, true);
            break;
          default:
            throw new Error(`Unsupported method: ${item.method}`);
        }

        successfulItems.push(item.id);

        if (DEBUG_MODE) {
          console.log('✅ Offline queue item processed:', item.method, item.endpoint);
        }

      } catch (error) {
        item.retryCount++;

        if (item.retryCount >= item.maxRetries) {
          failedItems.push(item.id);
          
          if (DEBUG_MODE) {
            console.log('❌ Offline queue item failed permanently:', item.method, item.endpoint);
          }
        } else {
          if (DEBUG_MODE) {
            console.log('⏳ Offline queue item failed, will retry:', item.method, item.endpoint, 
                       `(${item.retryCount}/${item.maxRetries})`);
          }
        }
      }
    }

    // Remove processed items from queue
    this.queue = this.queue.filter(
      item => !successfulItems.includes(item.id) && !failedItems.includes(item.id)
    );

    await this.saveQueue();

    if (DEBUG_MODE && (successfulItems.length > 0 || failedItems.length > 0)) {
      console.log('📱 Queue processing complete:', 
                 successfulItems.length, 'successful,', 
                 failedItems.length, 'failed permanently,',
                 this.queue.length, 'remaining');
    }
  }

  // Get queue status
  getQueueStatus(): {
    count: number;
    oldestItem: number | null;
    newestItem: number | null;
  } {
    if (this.queue.length === 0) {
      return { count: 0, oldestItem: null, newestItem: null };
    }

    const timestamps = this.queue.map(item => item.timestamp);
    return {
      count: this.queue.length,
      oldestItem: Math.min(...timestamps),
      newestItem: Math.max(...timestamps),
    };
  }

  // Clear queue
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    
    if (DEBUG_MODE) {
      console.log('🧹 Offline queue cleared');
    }
  }

  // Remove specific item from queue
  async removeFromQueue(id: string): Promise<boolean> {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.id !== id);
    
    if (this.queue.length < initialLength) {
      await this.saveQueue();
      return true;
    }
    
    return false;
  }

  // Get queue items (for debugging/monitoring)
  getQueueItems(): Array<{
    id: string;
    endpoint: string;
    method: string;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
  }> {
    return this.queue.map(item => ({
      id: item.id,
      endpoint: item.endpoint,
      method: item.method,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      maxRetries: item.maxRetries,
    }));
  }
}

// Singleton instances
export const networkService = NetworkService.getInstance();
export const offlineQueueService = OfflineQueueService.getInstance();

// Helper functions for network-related operations
export const networkHelpers = {
  // Check if request should be queued for offline
  shouldQueueRequest: (method: string, endpoint: string): boolean => {
    // Only queue write operations (POST, PUT, DELETE)
    const writeMethods = ['POST', 'PUT', 'DELETE'];
    if (!writeMethods.includes(method.toUpperCase())) {
      return false;
    }

    // Don't queue authentication requests
    if (endpoint.includes('/login') || endpoint.includes('/logout')) {
      return false;
    }

    // Don't queue file uploads (they're typically too large)
    if (endpoint.includes('/upload')) {
      return false;
    }

    return true;
  },

  // Format connectivity status for UI
  formatConnectivityStatus: (isConnected: boolean): {
    text: string;
    color: string;
    icon: string;
  } => {
    if (isConnected) {
      return {
        text: 'Online',
        color: '#22C55E', // green
        icon: 'wifi',
      };
    } else {
      return {
        text: 'Offline',
        color: '#EF4444', // red
        icon: 'wifi-off',
      };
    }
  },

  // Get retry delay based on attempt number
  getRetryDelay: (attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  },

  // Check if error is network-related
  isNetworkError: (error: any): boolean => {
    if (!error) return false;
    
    const networkErrorMessages = [
      'network request failed',
      'connection error',
      'timeout',
      'unable to connect',
      'network error',
      'fetch failed',
      'aborted',
    ];

    const errorMessage = (error.message || '').toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  },

  // Format time since last connectivity check
  formatTimeSince: (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Baru saja';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} menit yang lalu`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} jam yang lalu`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days} hari yang lalu`;
    }
  },

  // Create offline-aware fetch wrapper
  createOfflineAwareRequest: async (
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> => {
    try {
      // Try to make the request
      switch (method.toUpperCase()) {
        case 'GET':
          return await httpClient.get(endpoint, true);
        case 'POST':
          return await httpClient.post(endpoint, data, true);
        case 'PUT':
          return await httpClient.put(endpoint, data, true);
        case 'DELETE':
          return await httpClient.delete(endpoint, true);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      // If it's a network error and request should be queued, add to offline queue
      if (networkHelpers.isNetworkError(error) && 
          networkHelpers.shouldQueueRequest(method, endpoint)) {
        
        const queueId = await offlineQueueService.addToQueue(endpoint, method, data);
        
        // Return a special response indicating the request was queued
        return {
          success: false,
          queued: true,
          queueId,
          message: 'Request queued for when connection is restored',
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  },
};
