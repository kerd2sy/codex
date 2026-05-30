import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authApi = {
  getProfile: async (): Promise<any> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.ME);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  },

  verifyEmail: async (email: string, code: string): Promise<boolean> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });
      return res.ok;
    } catch (e) {
      return false;
    }

  },

  updatePushToken: async (token: string): Promise<boolean> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.PUSH_TOKEN, {
        method: 'PUT',
        body: JSON.stringify({ expo_push_token: token })
      });
      return res.ok;
    } catch (e) {
      return false;
    }

  },

  requestPasswordReset: async (email: string): Promise<boolean> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.REQUEST_PASSWORD_RESET, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      return res.ok;
    } catch (e) {
      return false;
    }

  },

  verifyPasswordResetOTP: async (email: string, otp: string): Promise<boolean> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.VERIFY_PASSWORD_RESET_OTP, {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });
      return res.ok;
    } catch (e) {
      return false;
    }

  },

  confirmPasswordReset: async (data: any): Promise<any> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.CONFIRM_PASSWORD_RESET, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  },
  
  updateProfile: async (data: any): Promise<any> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.PROFILE, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  },

  updateAvatar: async (formData: FormData): Promise<any> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.AVATAR, {
        method: 'POST',
        body: formData,
        // FormData handles headers automatically in most fetch implementations, 
        // but apiFetch might need specific handling if it sets Content-Type to JSON by default.
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  },
  
  syncTiers: async (): Promise<any> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.AUTH.SYNC_TIERS);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  }
};
