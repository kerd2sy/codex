import { storage } from '../utils/storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://backend.tabarak-pharma.com";


export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `/api/v1/auth/login`,
    REGISTER: `/api/v1/auth/register`,
    PROFILE: `/api/v1/auth/profile`, // Removed userId as backend is now zero-trust
    AVATAR: `/api/v1/auth/avatar`,   // Removed userId
    CHANGE_PASSWORD: `/api/v1/auth/change-password`,
    LINK_PHARMACY: `/api/v1/auth/link-pharmacy`,
    SEND_OTP: `/api/v1/auth/send-otp`,
    VERIFY_OTP: `/api/v1/auth/login-otp-verify`,
    PUSH_TOKEN: '/api/v1/auth/push-token',
    TWO_FA_SETUP: '/api/v1/auth/2fa/setup',
    TWO_FA_ENABLE: '/api/v1/auth/2fa/enable',
    TWO_FA_DISABLE: '/api/v1/auth/2fa/disable',
    DISABLE_2FA: '/api/v1/auth/2fa/disable', // Alias or specific 
    REFRESH: '/api/v1/auth/refresh',
    REVOKE: '/api/v1/auth/revoke',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
    UPDATE_LOCATION: (id: number | string) => `/api/v1/auth/pharmacies/${id}/location`,
    UPDATE_USER_LOCATION: `/api/v1/auth/profile/location`,
    LOG_USER_ACTIVITY: `/api/v1/auth/log-activity`,
    REQUEST_UPDATE: (id: number | string) => `/api/v1/auth/pharmacy/${id}/request-update`,
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications/',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
    MARK_READ: (id: number | string) => `/api/v1/notifications/${id}/read`,
    MARK_ALL_READ: '/api/v1/notifications/mark-all-read',
    CLEAR_ALL: '/api/v1/notifications/clear-all',
  },
  PRODUCTS: {
    SEARCH: '/api/v1/products',
    HISTORY: '/api/v1/products/history',
    HISTORY_LIST: '/api/v1/products/history/list',
    HISTORY_CLEAR: '/api/v1/products/history/clear',
  },
  ORDERS: {
    LIST: '/api/v1/orders/my-orders',
    SALES: '/api/v1/orders/my-sales',
  },
  PURCHASES: {
    LIST: '/api/v1/purchases/my-purchases',
    DETAIL: (id: string) => `/api/v1/purchases/${id}`,
    BALANCE: '/api/v1/purchases/balance',
    STATEMENT: '/api/v1/purchases/statement',
    RETURNS: '/api/v1/purchases/returns',
    CASH: '/api/v1/purchases/cash',
  },
  DEVICES: '/api/v1/devices',
  DELETE_DEVICE: (id: string) => `/api/v1/devices/${id}`,
  LOGIN_ACTIVITY: '/api/v1/login-activity',
  CHAT: {
    HMAC: '/api/v1/chat/hmac',
  }
};

// --- Token Refresh State Management ---
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Secure wrapper for fetch that automatically injects the Bearer token from SecureStore.
 * Now includes AUTOMATIC TOKEN ROTATION (Refresh Flow).
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let token = await storage.getItem('access_token');
  
  // High-reliability token retrieval for race conditions
  if (!token && !endpoint.includes('register') && !endpoint.includes('login') && !endpoint.includes('send-otp') && !endpoint.includes('refresh')) {
    for (let i = 0; i < 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        token = await storage.getItem('access_token');
        if (token) break;
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options.headers as any) || {}),
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const sanitizedEndpoint = endpoint.trim();
    const url = sanitizedEndpoint.startsWith('http') ? sanitizedEndpoint : `${API_URL}${sanitizedEndpoint}`;
    
    let response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);

  // --- AUTOMATIC REFRESH LOGIC ---
  if (response.status === 401 && !url.includes('/login') && !url.includes('/refresh') && !url.includes('/register')) {
    
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = await storage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`
            }
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            await storage.setItem('access_token', data.access_token);
            await storage.setItem('refresh_token', data.refresh_token);
            
            isRefreshing = false;
            onTokenRefreshed(data.access_token);

            // Retry the original request
            const retryHeaders = {
                ...headers,
                'Authorization': `Bearer ${data.access_token}`
            };
            return fetch(url, { ...options, headers: retryHeaders });
          }
        } catch (err) {
            // Silently handle or handle via some error reporting service if available
        }
      }
      
      isRefreshing = false;
      // We don't automatically delete tokens here to avoid loops, 
      // but the app should ideally redirect to login if refresh fails.
    } else {
      // Wait for existing refresh to finish
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
           const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${newToken}`
           };
           resolve(fetch(url, { ...options, headers: retryHeaders }));
        });
      });
    }
  }

  return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  } finally {
    clearTimeout(id);
  }
}
