import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "./config";

// Demo mode for development when server is not available
const DEMO_MODE = false; // Set to true to enable demo mode

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    customer: {
      id: number;
      nama_pelanggan: string;
      email: string;
      telepon: string;
      kode_pelanggan: string;
      total_poin: number;
      grup?: string;
    };
  };
  message?: string;
  errors?: Record<string, string[]>;
}

export interface RegisterData {
  nama_pelanggan: string;
  telepon: string;
  email: string;
  password: string;
  alamat: string;
}

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    // console.log('Attempting login to:', `${API_CONFIG.baseUrl}/customer/login`);
    const response = await fetch(`${API_CONFIG.baseUrl}/customer/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        device_name: "mobile-app",
      }),
    });

    // console.log('Login response status:', response.status);
    // Handle BOM character that may be present in response
    const responseText = await response.text();
    const cleanedResponseText = responseText.replace(/^\uFEFF/, ""); // Remove BOM
    const result = JSON.parse(cleanedResponseText);
    // console.log('Login result:', result);

    if (result.success && result.data?.token) {
      await AsyncStorage.setItem("auth_token", result.data.token);
      if (result.data.customer) {
        await AsyncStorage.setItem(
          "user_data",
          JSON.stringify(result.data.customer)
        );
      }
    }

    return result;
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("Network error or server unavailable");
  }
};

export const register = async (data: RegisterData): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/customer/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    // Handle BOM character that may be present in response
    const responseText = await response.text();
    const cleanedResponseText = responseText.replace(/^\uFEFF/, ""); // Remove BOM
    const result = JSON.parse(cleanedResponseText);

    if (result.success && result.data?.token) {
      await AsyncStorage.setItem("auth_token", result.data.token);
      if (result.data.customer) {
        await AsyncStorage.setItem(
          "user_data",
          JSON.stringify(result.data.customer)
        );
      }
    }

    return result;
  } catch (error) {
    console.error("Register error:", error);
    throw new Error("Network error or server unavailable");
  }
};

export const logout = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      await fetch(`${API_CONFIG.baseUrl}/customer/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    await AsyncStorage.multiRemove(["auth_token", "user_data"]);
  }
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem("auth_token");
};

export const getUserData = async () => {
  const userData = await AsyncStorage.getItem("user_data");
  return userData ? JSON.parse(userData) : null;
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};

export const verifyToken = async (): Promise<boolean> => {
  const token = await getToken();

  if (!token) {
    return false;
  }

  try {
    // Create timeout controller manually for compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_CONFIG.baseUrl}/customer/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      // Token is invalid, clear storage
      await logout();
      return false;
    }

    return response.ok;
  } catch (error) {
    console.warn("Token verification failed:", error);
    // If it's a network error, assume token is still valid to allow offline usage
    // In production, you might want to be more strict
    if (
      error instanceof TypeError &&
      error.message.includes("Network request failed")
    ) {
      console.warn(
        "Network unavailable, keeping existing token for offline mode"
      );
      return true; // Keep user logged in during network issues
    }
    return false;
  }
};
