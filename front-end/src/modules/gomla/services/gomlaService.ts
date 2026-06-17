import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '../../../shared/api/api-client';

export interface GomlaInvoiceItem {
    id: string;
    prod_id: string;
    name: string;
    qty: number;
    price: number;
    total: number;
    batch: string;
    expire_date: string;
    suggested_batch?: string;
    suggested_expiry?: string;
    barcode: string;
    location?: string;
    audited_by_name?: string;
    modified_by_name?: string;
}

export interface GomlaInvoiceDetails {
    id: string;
    date: string;
    time: string;
    total: number;
    writer: string;
    pharmacy_name: string;
    pharmacy_code?: string;
    items: GomlaInvoiceItem[];
}

export const fetchGomlaInvoice = async (invoiceId: string): Promise<GomlaInvoiceDetails> => {
    const cacheKey = `@gomla_invoice_cache_${invoiceId}`;
    try {
        const timestamp = new Date().getTime();
        const res = await apiFetch(`/api/v1/gomla/invoice/${invoiceId}?_t=${timestamp}`);
        if (!res.ok) {
            throw new Error("Failed to fetch invoice");
        }
        const data = await res.json();
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
        return data;
    } catch (error) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        throw error;
    }
};

export const fetchRecentGomlaInvoices = async (limit: number = 10, date?: string): Promise<any[]> => {
    const cacheKey = `@gomla_recent_invoices_cache_${date || 'latest'}`;
    try {
        const timestamp = new Date().getTime();
        let url = `/api/v1/gomla/invoices/recent?limit=${limit}&_t=${timestamp}`;
        if (date) {
            url += `&date=${date}`;
        }
        const res = await apiFetch(url);
        if (!res.ok) {
            throw new Error("Failed to fetch recent invoices");
        }
        const data = await res.json();
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
        return data;
    } catch (error) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        throw error;
    }
};
export const updateGomlaInvoiceItem = async (
    itemId: string,
    prodId: string,
    batch: string,
    expiry: string,
    qty?: number
): Promise<{ message: string }> => {
    const res = await apiFetch(`/api/v1/gomla/invoice/item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ prod_id: prodId, batch, expiry, qty }),
    });
    if (!res.ok) {
        let errText = "Failed to update item";
        try {
            const errBody = await res.json();
            if (errBody && errBody.message) errText = errBody.message;
        } catch (e) {
            errText = await res.text().catch(() => "Failed to update item");
        }
        const error: any = new Error(errText);
        error.status = res.status;
        throw error;
    }
    return await res.json();
};

export const saveGomlaInvoiceCache = async (invoiceId: string, data: GomlaInvoiceDetails) => {
    const cacheKey = `@gomla_invoice_cache_${invoiceId}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
};

export const fetchProductBatchHistory = async (prodId: string): Promise<{ batch: string, expiry: string } | null> => {
    try {
        const res = await apiFetch(`/api/v1/gomla/product/${prodId}/batch-history`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.batch && data.expiry) {
                return { batch: data.batch, expiry: data.expiry };
            }
        }
        return null;
    } catch {
        return null;
    }
};

export const fetchProductStockBalance = async (prodId: string): Promise<any[]> => {
    try {
        const timestamp = new Date().getTime();
        const res = await apiFetch(`/api/v1/gomla/product/${prodId}/stock?_t=${timestamp}`);
        if (res.ok) {
            const data = await res.json();
            return data || [];
        }
        return [];
    } catch (e) {
        console.error("Failed to fetch product stock balance:", e);
        return [];
    }
};

export const updateInvoiceAuditStatus = async (invoiceId: string, status: 'editing' | 'audited' | 'clear'): Promise<boolean> => {
	try {
		const res = await apiFetch(`/api/v1/gomla/invoice/${invoiceId}/status`, {
			method: 'POST',
			body: JSON.stringify({ status })
		});
		return res.ok;
	} catch (e) {
		console.error("Failed to update audit status", e);
		return false;
	}
};

export const fetchTopPreparers = async (date?: string): Promise<any[]> => {
    try {
        const timestamp = new Date().getTime();
        let url = `/api/v1/gomla/preparers?_t=${timestamp}`;
        if (date) {
            url += `&date=${date}`;
        }
        const res = await apiFetch(url);
        if (!res.ok) {
            throw new Error("Failed to fetch top preparers");
        }
        return await res.json();
    } catch (error) {
        console.error("fetchTopPreparers error:", error);
        return [];
    }
};

