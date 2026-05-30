import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '@/shared/api/api-client';

export interface SearchResult {
    id: string;
    name: string;
    price: number;
    qty: number;
    discount_percent: number;
    disc_c?: number; disc_c2?: number;
    disc_r?: number; disc_r2?: number;
    disc_w?: number; disc_w2?: number;
    disc_p?: number; disc_p2?: number;
    disc_l?: number; disc_l2?: number;
}

const PAGE_SIZE = 20;

export const useInvoiceSearch = () => {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    
    const pageRef = useRef(0);
    const lastQueryRef = useRef('');

    const fetchWarehouseProducts = useCallback(async (query: string, skip: number, append: boolean) => {
        if (skip === 0) setSearchLoading(true);
        else setIsLoadingMore(true);

        try {
            const url = `/api/v1/products/warehouse/search?search=${encodeURIComponent(query)}&skip=${skip}&limit=${PAGE_SIZE}`;
            const res = await apiFetch(url);
            
            if (res.ok) {
                const data = await res.json();
                const newResults = data || [];
                
                setHasMore(newResults.length === PAGE_SIZE);

                if (append) setSearchResults(prev => [...prev, ...newResults]);
                else setSearchResults(newResults);
            }
        } catch (error) {
            console.error('Fetch failed:', error);
        } finally {
            setSearchLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchWarehouseProducts('', 0, false);
    }, [fetchWarehouseProducts]);

    const searchProducts = useCallback((query: string) => {
        lastQueryRef.current = query;
        pageRef.current = 0;
        setHasMore(true);
        fetchWarehouseProducts(query, 0, false);
    }, [fetchWarehouseProducts]);

    const loadMore = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        pageRef.current += 1;
        fetchWarehouseProducts(lastQueryRef.current, pageRef.current * PAGE_SIZE, true);
    }, [fetchWarehouseProducts, isLoadingMore, hasMore]);

    return {
        searchResults, setSearchResults,
        searchLoading, isLoadingMore,
        searchProducts, loadMore
    };
};
