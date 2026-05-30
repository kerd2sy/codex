import { useState, useEffect } from 'react';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';

export const useSearch = (initialQuery?: string) => {
    const [searchText, setSearchText] = useState(initialQuery || '');
    const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [noResults, setNoResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const loadRecentSearches = async () => {
        try {
            const res = await apiFetch(API_ENDPOINTS.PRODUCTS.HISTORY_LIST);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setRecentKeywords(data.map((h: any) => h.query));
                }
            }
        } catch (e) {}
    };

    const handleSearch = async (text: string) => {
        if (!text.trim()) return;
        const keyword = text.trim();
        setIsSearching(true);
        setNoResults(false);
        setSearchResults([]);
        
        try {
            await apiFetch(API_ENDPOINTS.PRODUCTS.HISTORY, {
                method: 'POST',
                body: JSON.stringify({ query: keyword })
            });
            const res = await apiFetch(`${API_ENDPOINTS.PRODUCTS.SEARCH}?search=${encodeURIComponent(keyword)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setSearchResults(data);
                    setNoResults(data.length === 0);
                } else {
                    setNoResults(true);
                }
            } else {
                setNoResults(true);
            }
        } catch (e) {
            setNoResults(true);
        } finally {
            setIsSearching(false);
            loadRecentSearches();
        }
    };

    const clearHistory = async () => {
        setRecentKeywords([]);
        try {
            await apiFetch(API_ENDPOINTS.PRODUCTS.HISTORY_CLEAR, { method: 'DELETE' });
        } catch (e) {}
    };

    useEffect(() => {
        loadRecentSearches();
        if (initialQuery) {
            setSearchText(initialQuery);
            handleSearch(initialQuery);
        }
    }, [initialQuery]);

    return { 
        searchText, setSearchText, 
        recentKeywords, searchResults, 
        noResults, isSearching, 
        handleSearch, clearHistory 
    };
};
