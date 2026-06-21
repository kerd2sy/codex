import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { usePharmacyStore } from '../store/usePharmacyStore';
import { PharmacyVault } from '../utils/vault';

export const useOrders = (orderId?: string, pharmacyId?: string, noFilter: boolean = false) => {
    const store = usePharmacyStore();
    const [loading, setLoading] = useState(store.orders.data.length === 0);
    const requestTokenRef = useRef(0);
    const dataLengthRef = useRef(store.orders.data.length);

    dataLengthRef.current = store.orders.data.length;

    const parseOrderDateTime = (dStr: string, tStr?: string) => {
        if (!dStr) return 0;
        try {
            const cleanD = dStr.replace(/[^\d\-/ :]/g, '').replace(/\//g, '-').trim();
            const parts = cleanD.split(/[- :]/);
            if (parts.length < 3) return 0;

            let year = 0, month = 0, day = 0;
            if (parts[0].length === 4) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
            } else if (parts[2].length === 4) {
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
            } else return 0;

            let time = (tStr || '00:00').trim();
            let hours = 0, minutes = 0;
            const tMatch = time.match(/(\d+):(\d+)/);
            if (tMatch) {
                hours = parseInt(tMatch[1], 10);
                minutes = parseInt(tMatch[2], 10);
                const isPM = time.includes('م') || time.toLowerCase().includes('pm');
                const isAM = time.includes('ص') || time.toLowerCase().includes('am');
                if (isPM && hours < 12) hours += 12;
                if (isAM && hours === 12) hours = 0;
            }
            const tt = new Date(year, month - 1, day, hours, minutes, 0).getTime();
            return isNaN(tt) ? 0 : tt;
        } catch { return 0; }
    };

    const fetchOrders = useCallback(async (isBackground = false) => {
        const currentToken = ++requestTokenRef.current;
        try {
            if (!isBackground && dataLengthRef.current === 0) setLoading(true);
            
            let activeId = pharmacyId;
            if (!activeId || activeId === '0') {
                activeId = await AsyncStorage.getItem('@active_pharmacy_id') || '0';
            }

            if (!activeId || activeId === '0') {
                setLoading(false);
                return;
            }

            const response = await apiFetch(`${API_ENDPOINTS.ORDERS.LIST}?pharmacy_id=${activeId}`);
            if (requestTokenRef.current !== currentToken) return;

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const trackingStr = await AsyncStorage.getItem('@orders_tracking_times');
                    let tracking = trackingStr ? JSON.parse(trackingStr) : {};
                    const now = Date.now();
                    let changed = false;

                    data.forEach((order: any) => {
                        if (!tracking[order.id]) tracking[order.id] = {};
                        const t = tracking[order.id];
                        if (order.currentStep === 1 && (t.step3Time || t.step4Time)) {
                            delete tracking[order.id];
                            changed = true;
                            return;
                        }
                        if (order.currentStep >= 3 && !t.step3Time) {
                            t.step3Time = now;
                            changed = true;
                        }
                        if (order.currentStep >= 4 && !t.step4Time) {
                            const orderTime = parseOrderDateTime(order.date, order.time || order.TIME_T);
                            if (orderTime && (now - orderTime) / 3600000 > 24) t.step4Time = orderTime;
                            changed = true;
                        }
                    });

                    const processed = data.map((order: any) => {
                        const t = tracking[order.id] || {};
                        const o = { ...order };
                        const isClosed = Number(o.IS_CLOSE || o.is_close || 0) !== 0;
                        if (t.step3Time && isClosed) {
                            const secsSinceStep3 = (now - t.step3Time) / 1000;
                            if (secsSinceStep3 < 120) o.currentStep = 3;
                            else {
                                if (o.currentStep < 4) o.currentStep = 4;
                                if (!t.step4Time) {
                                    t.step4Time = now;
                                    tracking[order.id].step4Time = now;
                                    changed = true;
                                }
                            }
                        }
                        return o;
                    });

                    if (changed) {
                        await AsyncStorage.setItem('@orders_tracking_times', JSON.stringify(tracking));
                    }

                    const unified = processed.map((o: any) => ({
                        ...o,
                        id: String(o.id || ''),
                        amount: Number(o.price || o.total || 0),
                        date: o.date || '---',
                        time: o.time || '',
                        title: o.supplier || 'غير معروف'
                    }));

                    store.setListData('orders', unified);
                    await PharmacyVault.set(activeId, 'orders', 'recent_orders', unified);
                }
            }
        } catch (error) {
            console.error("useOrders: fetch error", error);
        } finally {
            if (requestTokenRef.current === currentToken) setLoading(false);
        }
    }, [pharmacyId, store.setListData]);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            const id = pharmacyId || await AsyncStorage.getItem('@active_pharmacy_id');
            // Clear current orders to prevent showing previous pharmacy's data
            store.setListData('orders', []);
            setLoading(true);
            
            if (id && isMounted) {
                const cached = await PharmacyVault.get<any[]>(id, 'orders', 'recent_orders');
                if (cached && isMounted) {
                    store.setListData('orders', cached);
                    setLoading(false);
                }
            }
            fetchOrders(true);
        };
        init();
        const interval = setInterval(() => fetchOrders(true), 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [pharmacyId, fetchOrders]);

    const filtered = useMemo(() => {
        let list = store.orders.data;
        if (orderId) {
            return list.filter((o: any) => o.id === orderId || o.id === `#${orderId}`);
        }
        
        if (!noFilter) {
            const active = list.filter((o: any) => o.currentStep < 4);
            const completed = list.filter((o: any) => o.currentStep >= 4)
                .sort((a: any, b: any) => {
                    const dtA = parseOrderDateTime(a.date, a.time);
                    const dtB = parseOrderDateTime(b.date, b.time);
                    return dtB - dtA;
                });
            return [...active, ...completed.slice(0, 4)];
        }
        return list;
    }, [store.orders.data, noFilter, orderId]);

    return { orders: filtered, loading, refresh: () => fetchOrders(false) };
};
