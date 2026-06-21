import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pharmacyApi, PharmacyBalance } from '@/api/PharmacyApi';
import { authApi } from '@/api/AuthApi';
import { storage } from '@/utils/storage';
import { User, Pharmacy, Product } from '@/api/types';
import { startSmartSync, performFullSync, performDeepSync } from '../utils/sync-utils';
import { cacheManager } from '../utils/cache-manager';
import { PharmacyVault } from '../utils/vault';
import { usePharmacyStore } from '../store/usePharmacyStore';


export function useDashboardData() {
  const store = usePharmacyStore();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<{id: string, name: string, kind: number, tier: number}>({ id: '0', name: 'أضف صيدليتك الآن', kind: 4, tier: 1 }); // Default to Pharmacies (4)
  const [userPharmacies, setUserPharmacies] = useState<Pharmacy[]>([]);
  
  // Initialize from memory cache if available - using last known active ID if possible
  const [balance, setBalance] = useState<PharmacyBalance | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  
  const hasCheckedLocationRef = useRef<Record<string, boolean>>({});
  const hasSyncedRef = useRef<Record<string, boolean>>({});
  const appState = useRef(AppState.currentState);
  const profileTokenRef = useRef<number>(0);
  const dataTokenRef = useRef<number>(0);
  const prevIdRef = useRef<string>('0');

  const loadUserData = useCallback(async (pharmId?: string) => {
    try {
      // 1. Load User Profile
      const userJson = await storage.getItem('user');
      if (userJson) {
        const cachedUser = JSON.parse(userJson);
        setCurrentUser(cachedUser);
        setIsInitializing(false);
        
        // Background Profile Sync
        const currentToken = ++profileTokenRef.current;
        authApi.getProfile().then(async (latestUser) => {
          if (latestUser && profileTokenRef.current === currentToken) {
            setCurrentUser(latestUser);
            await storage.setItem('user', JSON.stringify(latestUser));
          }
        }).catch(() => {});
      } else if (await storage.getItem('access_token')) {
        const latestUser = await authApi.getProfile();
        if (latestUser) {
          setCurrentUser(latestUser);
          await storage.setItem('user', JSON.stringify(latestUser));
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }

      // 2. Load Cached Dashboard Data from Vault
      const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
      const targetId = pharmId || activePharmId;

      if (targetId && targetId !== '0') {
        const vaultData = await PharmacyVault.get(targetId, 'dashboard', 'main');
        
        if (vaultData) {
          const { balance: cBal, products: cProd, timestamp: cTime } = vaultData;
          if (cBal) setBalance(cBal); // Only set if we actually have data to avoid clearing UI
          if (cProd) setRecentProducts(cProd);
          setLastUpdated(cTime || null);
          
          // Populate memory cache for next navigations
          cacheManager.setDashboard(targetId, { balance: cBal, products: cProd, lastUpdated: cTime });
        } else if (targetId !== prevIdRef.current) {
          // Only clear if we are actually switching to a pharmacy with NO vault data
          setBalance(null);
          setRecentProducts([]);
          setLastUpdated(null);
        }
      }
    } catch (e) {
      console.error('useDashboardData: loadUserData failed', e);
      setIsInitializing(false);
    }
  }, []);

  const syncPharmacyTiers = useCallback(async () => {
    try {
      const tiers = await authApi.syncTiers();
      if (!tiers || !Array.isArray(tiers)) return;

      const userJson = await storage.getItem('user');
      if (!userJson) return;

      const user = JSON.parse(userJson);
      if (!user.pharmacies) return;

      // Optimize: Break large updates to prevent blocking the UI
      requestAnimationFrame(async () => {
        let changed = false;
        const updatedPharmacies = user.pharmacies.map((p: Pharmacy) => {
            const tierData = tiers.find(t => t.id === p.id);
            if (tierData && (tierData.kind !== p.kind || tierData.tier !== p.tier)) {
              changed = true;
              return { ...p, kind: tierData.kind, tier: tierData.tier };
            }
            return p;
        });

        if (changed) {
            const updatedUser = { ...user, pharmacies: updatedPharmacies };
            setCurrentUser(updatedUser);
            await storage.setItem('user', JSON.stringify(updatedUser));
            
            const activeId = await AsyncStorage.getItem('@active_pharmacy_id');
            const activeTierData = tiers.find(t => t.id.toString() === activeId);
            if (activeTierData) {
                setSelectedPharmacy(prev => ({
                    ...prev,
                    kind: activeTierData.kind,
                    tier: activeTierData.tier
                }));
            }
        }
      });
      } catch (e) {
        // Silent fail for background sync
      }

  }, [selectedPharmacy.id]);


  // Sync selection when currentUser changes (Live Tier Sync)
  useEffect(() => {
    if (currentUser?.pharmacies && currentUser.pharmacies.length > 0) {
      const pharmacies = currentUser.pharmacies; // Capture for TS
      setUserPharmacies(pharmacies);
      
      const syncActive = async () => {
        const savedId = await AsyncStorage.getItem('@active_pharmacy_id');
        const active = pharmacies.find((p: Pharmacy) => p.id.toString() === savedId) || pharmacies[0];
        
        const pharmacyName = active.name || active.username || `صيدلية ${active.id}`;
        
        setSelectedPharmacy({
          id: active.id.toString(),
          name: pharmacyName,
          kind: active.kind || 4,
          tier: active.tier || 1
        });

        // Always ensure persistent storage is updated when we sync active pharmacy
        await AsyncStorage.setItem('@active_pharmacy_id', active.id.toString());
        await AsyncStorage.setItem('@active_pharmacy_name', pharmacyName);

        // Silent prefetch for all pharmacies so they load instantly when switched
        pharmacies.forEach((p: Pharmacy) => {
            const pId = p.id.toString();
            if (pId !== '0') {
                const BackgroundSyncManager = require('../utils/BackgroundSyncManager').BackgroundSyncManager;
                BackgroundSyncManager.prefetchFirstPage(pId, 'purchases', '/api/v1/purchases/my-purchases');
            }
        });
      };
      syncActive();
    }
  }, [currentUser]);

  // Sync AsyncStorage whenever selectedPharmacy changes manually
  useEffect(() => {
    if (selectedPharmacy.id !== '0') {
        AsyncStorage.setItem('@active_pharmacy_id', selectedPharmacy.id);
        if (selectedPharmacy.name) {
            AsyncStorage.setItem('@active_pharmacy_name', selectedPharmacy.name);
        }
        store.setActivePharmacy(selectedPharmacy.id, selectedPharmacy.name || '');
    }
  }, [selectedPharmacy.id, selectedPharmacy.name, store.setActivePharmacy]);

  const fetchData = useCallback(async () => {
    if (selectedPharmacy.id !== '0') {
      const currentToken = ++dataTokenRef.current;
      const targetId = selectedPharmacy.id;

      try {
        setFetchError(null);
        const [balRes, countRes, productsRes] = await Promise.allSettled([
          pharmacyApi.getBalance(targetId),
          pharmacyApi.getUnreadCount(),
          pharmacyApi.getRecentProducts(targetId)
        ]);
        
        if (dataTokenRef.current !== currentToken) return;
        
        // Start with the cached values for the CURRENTLY selected pharmacy, not the stale state 'balance'
        const cachedForId = cacheManager.getDashboard(selectedPharmacy.id);
        let newBalance = cachedForId?.balance || null;
        let newProducts = cachedForId?.products || [];
        let success = false;

        if (balRes.status === 'fulfilled' && balRes.value) {
          newBalance = balRes.value;
          setBalance(prev => {
            // Include credit_limit in the equality check to ensure UI updates when limit changes
            if (prev && 
                prev.current_balance === newBalance.current_balance && 
                prev.balance_type === newBalance.balance_type &&
                prev.credit_limit === newBalance.credit_limit) {
                return prev;
            }
            return newBalance;
          });
          success = true;
        } else if (balRes.status === 'rejected') {
          setFetchError('balance');
        } else if (balRes.status === 'fulfilled' && !balRes.value) {
           // If API returned null/empty, DO NOT clear the existing balance
           // This prevents the "zeroing out" effect
           success = false; 
        }

        if (countRes.status === 'fulfilled') {
          setUnreadCount(countRes.value);
        }

        if (productsRes.status === 'fulfilled') {
          newProducts = productsRes.value || [];
          setRecentProducts(newProducts);
          success = true;
        }

        if (success) {
          const now = Date.now();
          setLastUpdated(now);
          
          // Update memory cache for instant next re-open
          cacheManager.setDashboard(selectedPharmacy.id, { balance: newBalance, products: newProducts, lastUpdated: now });
          
          // Persist successful fetch in the Vault
          await PharmacyVault.set(selectedPharmacy.id, 'dashboard', 'main', {
            balance: newBalance,
            products: newProducts,
            timestamp: now
          });
        }

        // If any core request failed due to background network error, mark as offline
        const anyRejected = balRes.status === 'rejected' || productsRes.status === 'rejected';
        if (anyRejected) setIsOffline(true);
        else if (success) setIsOffline(false);

      } catch (e) {
        setIsOffline(true);
      }

    }
  }, [selectedPharmacy.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Hide spinner after 5s even if request is hanging, for "As if working" feel
    const refreshTask = Promise.all([loadUserData(), fetchData()]);
    const timeoutTask = new Promise(resolve => setTimeout(resolve, 5000));
    
    await Promise.race([refreshTask, timeoutTask]);
    performFullSync(selectedPharmacy.id); // Also trigger on pull-to-refresh
    setRefreshing(false);
  }, [loadUserData, fetchData]);


  useEffect(() => {
    let isMounted = true;
    
    const isSwitching = selectedPharmacy.id !== prevIdRef.current;
    
    // SYNC Step: Immediately set from memory cache if available to prevent "ghost" data
    if (selectedPharmacy.id !== '0') {
      const cachedMem = cacheManager.getDashboard(selectedPharmacy.id);
      if (cachedMem) {
        setBalance(cachedMem.balance);
        setRecentProducts(cachedMem.products);
        setLastUpdated(cachedMem.lastUpdated);
      } else {
        setBalance(null);
        setRecentProducts([]);
        setLastUpdated(null);
      }
      
      // Clear Global Store to prevent stale transactions from other pharmacies
      store.clearAll();
    }
    
    prevIdRef.current = selectedPharmacy.id;


    const init = async () => {
      // 0. Cleanup Legacy Cache (Once per initialization)
      await PharmacyVault.purgeLegacy();
      
      // 1. Initial Load Cache & Trigger Fetch
      if (selectedPharmacy.id !== '0') {
        if (isMounted) {
          await loadUserData(selectedPharmacy.id);
          fetchData();
          syncPharmacyTiers(); // Instant Tier Check
          
          // Background Sync Strategy: 
          // 1. Smart Sync (Fast & Network Aware)
          if (!hasSyncedRef.current[selectedPharmacy.id]) {
            startSmartSync(selectedPharmacy.id);
            hasSyncedRef.current[selectedPharmacy.id] = true;
          }
        }
      }
    };
    init();

    // 2. Polling Profile & Dashboard Data - Optimized to 40s and only when active
    const syncInterval = setInterval(() => {
      if (isMounted && appState.current === 'active') {
        loadUserData(selectedPharmacy.id);
        fetchData();
        syncPharmacyTiers(); // Regular Tier Check
      }
    }, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (isMounted && appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadUserData();
        fetchData();
        syncPharmacyTiers(); // Check on Return
      }
      appState.current = nextAppState;
    });

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      subscription.remove();
    };
  }, [selectedPharmacy.id, fetchData, loadUserData]);

  return {
    currentUser,
    setCurrentUser,
    selectedPharmacy,
    setSelectedPharmacy,
    userPharmacies,
    setUserPharmacies,
    balance,
    setBalance,
    unreadCount,
    recentProducts,
    refreshing,
    onRefresh,
    loadUserData,
    fetchData,
    isInitializing,
    fetchError,
    isOffline,
    lastUpdated,
    hasCheckedLocationRef
  };
}


