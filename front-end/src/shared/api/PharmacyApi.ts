import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { Product, Invoice } from '@/api/types';

export interface PharmacyBalance {
  current_balance: number;
  balance_type: 'Debit' | 'Credit';
  credit_limit: number;
  usage_percentage: number;
  net_balance: number;
}

export const pharmacyApi = {
  getBalance: async (pharmacyId: string): Promise<PharmacyBalance | null> => {
    const res = await apiFetch<PharmacyBalance>(`${API_ENDPOINTS.PURCHASES.BALANCE}?pharmacy_id=${pharmacyId}`);
    if (res.ok) {
      const data = await res.json();
      return (data as any).detail ? null : data;
    }
    throw new Error(`Balance API error: ${res.status}`);
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await apiFetch<{ count: number }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      if (res.ok) {
        const data = await res.json();
        return data.count || 0;
      }
      return 0;
    } catch (e) {
      return 0;
    }

  },

  updateLocation: async (pharmacyId: string, locationUrl: string): Promise<boolean> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.PHARMACY.UPDATE_LOCATION(pharmacyId), {
        method: 'PUT',
        body: JSON.stringify({ location_url: locationUrl })
      });
      return res.ok;
    } catch (e) {
      return false;
    }

  },

  getRecentProducts: async (pharmacyId?: string, limit: number = 10): Promise<Product[]> => {
    try {
      const baseUrl = pharmacyId 
        ? `${API_ENDPOINTS.PRODUCTS.SEARCH}/recent?pharmacy_id=${pharmacyId}`
        : `${API_ENDPOINTS.PRODUCTS.SEARCH}/recent`;
      const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}limit=${limit}`;
      const res = await apiFetch<Product[]>(url);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (e) {
      return [];
    }

  },

  getStatement: async (pharmacyId: string, dateFrom: string): Promise<any[]> => {
    const res = await apiFetch<any[]>(`${API_ENDPOINTS.PURCHASES.STATEMENT}?pharmacy_id=${pharmacyId}&date_from=${dateFrom}&limit=100000`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    throw new Error(`Statement API error: ${res.status}`);
  },

  initiatePayment: async (pharmacyId: string, amount: number, method: 'card' | 'wallet', identifier?: string): Promise<any | null> => {
    try {
      const res = await apiFetch<any>(API_ENDPOINTS.PAYMENTS.INITIATE, {
        method: 'POST',
        body: JSON.stringify({ 
          pharmacy_id: parseInt(pharmacyId), 
          amount, 
          method,
          identifier
        })
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  },

  createPaymentLink: async (amount: number, pharmacyId: string | number, method: 'card' | 'wallet' | 'both', description?: string): Promise<any | null> => {
    try {
      const res = await apiFetch<any>('/api/v1/payments/link', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          pharmacy_id: parseInt(String(pharmacyId)),
          payment_methods: method === 'card' ? '5403810' : method === 'wallet' ? '5403813' : '5403810,5403813',
          is_live: false,
          description: description || "Test Payment Link"
        })
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }

  }
};
