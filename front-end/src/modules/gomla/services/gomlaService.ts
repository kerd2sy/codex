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
    const res = await apiFetch(`/api/v1/gomla/invoice/${invoiceId}`);
    if (!res.ok) {
        throw new Error("Failed to fetch invoice");
    }
    return await res.json();
};

export const updateGomlaInvoiceItem = async (
    itemId: string,
    batch: string,
    expiry: string,
    qty?: number
): Promise<{ message: string }> => {
    const res = await apiFetch(`/api/v1/gomla/invoice/item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ batch, expiry, qty }),
    });
    if (!res.ok) {
        throw new Error("Failed to update item");
    }
    return await res.json();
};
