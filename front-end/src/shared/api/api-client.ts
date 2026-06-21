import { storage } from '../utils/storage';
import { emitForceLogout } from '../guards/auth-events';
import { APIError } from './types';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://apis.tabarak-pharma.com";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `/api/v1/auth/login`,
    REGISTER: `/api/v1/auth/register`,
    ME: `/api/v1/auth/me`,
    PROFILE: `/api/v1/auth/profile`,
    AVATAR: `/api/v1/auth/avatar`,
    CHANGE_PASSWORD: `/api/v1/auth/change-password`,
    SEND_OTP: `/api/v1/auth/send-otp`,
    SEND_OTP_SMS: `/api/v1/auth/send-otp-sms`,
    VERIFY_OTP: `/api/v1/auth/login-otp-verify`,
    PUSH_TOKEN: '/api/v1/auth/push-token',
    REFRESH: '/api/v1/auth/refresh',

    REVOKE: '/api/v1/auth/revoke',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
    REQUEST_PASSWORD_RESET: '/api/v1/auth/request-password-reset',
    VERIFY_PASSWORD_RESET_OTP: '/api/v1/auth/verify-password-reset-otp',
    CONFIRM_PASSWORD_RESET: '/api/v1/auth/confirm-password-reset',
    SYNC_TIERS: '/api/v1/auth/sync-tiers',
  },
  PHARMACY: {
    LINK: '/api/v1/pharmacy/link',
    UPDATE_LOCATION: (id: number | string) => `/api/v1/pharmacy/${id}/location`,
    REQUEST_UPDATE: (id: number | string) => `/api/v1/pharmacy/${id}/request-update`,
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications/',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
    MARK_READ: (id: number | string) => `/api/v1/notifications/mark-read/${id}`,
    MARK_ALL_READ: '/api/v1/notifications/mark-all-read',
    CLEAR_ALL: '/api/v1/notifications/clear',
    MASS_NOTIFICATION: '/api/v1/admin/notifications/mass',
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
    DETAIL: (id: string) => {
        if (id.startsWith('R') || id.startsWith('RR') || id.startsWith('OR')) return `/api/v1/purchases/return/${id}`;
        if (id.startsWith('O')) return `/api/v1/purchases/sale/${id}`;
        return `/api/v1/purchases/invoice/${id}`;
    },
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
  },
  PAYMENTS: {
    INITIATE: '/api/v1/payments/initiate',
    WEBHOOK: '/api/v1/payments/webhook',
    METHODS: '/api/v1/payments/methods',
    WALLET: '/api/v1/payments/methods/wallet',
  }
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

function decodeBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';
  for (let i = 0, bc = 0, bs = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const idx = chars.indexOf(char);
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

function isTokenExpired(token: string): boolean {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      decodeBase64(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const { exp } = JSON.parse(jsonPayload);
    return Date.now() >= (exp * 1000) - 30000;
  } catch (e) {
    return true;
  }
}

/**
 * Enhanced API Client with Proactive Token Rotation and Generics
 */
export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<Response & { json(): Promise<T> }> {
  const isAuthEndpoint = endpoint.includes('register') || endpoint.includes('login') || endpoint.includes('google-native') || endpoint.includes('exchange') || endpoint.includes('send-otp') || endpoint.includes('refresh');
  
  let token = await storage.getItem('access_token');
  
  if (token && !isAuthEndpoint && isTokenExpired(token)) {
    if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = await storage.getItem('refresh_token');
        if (refreshToken) {
            try {
                const refreshRes = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${refreshToken}` }
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    await storage.setItem('access_token', data.access_token);
                    await storage.setItem('refresh_token', data.refresh_token);
                    token = data.access_token;
                    isRefreshing = false;
                    onTokenRefreshed(data.access_token);
                } else {
                    isRefreshing = false;
                    emitForceLogout();
                }
            } catch (err) {
                isRefreshing = false;
                emitForceLogout();
            }
        } else {
            isRefreshing = false;
            emitForceLogout();
        }
    } else {
        token = await new Promise((resolve) => {
            subscribeTokenRefresh((newToken) => resolve(newToken));
        });
    }
  }

  if (!token && !isAuthEndpoint) {
    for (let i = 0; i < 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        token = await storage.getItem('access_token');
        if (token) break;
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': Platform.OS,
    'X-Client-Version': Constants.nativeAppVersion || '1.0.0',
    ...(options.headers as Record<string, string>),
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds max wait
  
  // Robust check for FormData to handle RN polyfills
  const isFormData = options.body && (options.body instanceof FormData || (options.body as any)?.append !== undefined);

  if (isFormData) {
      delete headers['Content-Type'];
  }
  
  if (token && !isAuthEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    
    // React Native's fetch polyfill crashes with "Unsupported FormDataPart implementation" 
    // if AbortSignal is passed alongside a FormData body.
    const fetchOptions = { ...options, headers };
    if (!isFormData) {
        (fetchOptions as any).signal = controller.signal;
    }

    let response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (response.status === 401 && !isAuthEndpoint) {
      console.log(`[API] 401 received for ${url}. isRefreshing: ${isRefreshing}`);
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = await storage.getItem('refresh_token');
        console.log(`[API] Retrieved refreshToken: ${refreshToken ? 'YES' : 'NO'}`);
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${refreshToken}` }
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              await storage.setItem('access_token', data.access_token);
              await storage.setItem('refresh_token', data.refresh_token);
              isRefreshing = false;
              onTokenRefreshed(data.access_token);
              return fetch(url, { ...options, headers: { ...headers, 'Authorization': `Bearer ${data.access_token}` } }) as any;
            } else {
              console.warn(`[API] 401 on ${url} - Refresh failed. Triggering force logout.`);
              emitForceLogout();
            }
          } catch (err) {
            console.error(`[API] 401 on ${url} - Refresh error.`, err);
            emitForceLogout();
          }
        } else {
          console.warn(`[API] 401 on ${url} - No refresh token. Triggering force logout.`);
          emitForceLogout();
        }
        isRefreshing = false;
      } else {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            resolve(fetch(url, { ...options, headers: { ...headers, 'Authorization': `Bearer ${newToken}` } }) as any);
          });
        });
      }
    }

    return response as Response & { json(): Promise<T> };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
       console.log(`[API] Info: Request to ${endpoint} was aborted after 30s.`);
    }
    throw error;
  }
}

export function parseApiError(data: any): string {
    if (!data) return 'حدث خطأ غير متوقع. يرجى مراجعة الدعم الفني.';
    const errorMsg = data.detail || data.message || data.error;
    if (typeof errorMsg === 'string' && errorMsg.length > 0) {
        if (errorMsg.includes('/') || errorMsg.includes('\\') || errorMsg.includes(':')) {
             return 'حدث خطأ برمي في السيرفر. يرجى المحاولة لاحقاً.';
        }
        return errorMsg;
    }
    return 'تعذر إكمال الطلب حالياً. يرجى التأكد من اتصال الإنترنت.';
}
