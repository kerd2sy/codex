import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pharmacyApi } from '@/api/PharmacyApi';
import { cacheManager } from '../utils/cache-manager';
import { PharmacyVault } from '../utils/vault';

export function useAccountStatement(selectedPeriod: number) {
  // Read from memory cache immediately if available
  // Initialize state as empty to prevent cross-pharmacy data leakage
  const [statement, setStatement] = useState<any[]>([]);
  const [balance, setBalance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("صيدليتك");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadCachedData = async (pharmId: string) => {
    try {
      const cachedStmt = await PharmacyVault.get(pharmId, 'statement', `data_p${selectedPeriod}`);
      const cachedBal = await PharmacyVault.get(pharmId, 'statement', 'balance');
      const cachedSync = await PharmacyVault.get(pharmId, 'sync', `statement_p${selectedPeriod}`);
      
      if (cachedStmt) {
        setStatement(cachedStmt);
        if (cachedBal) setBalance(cachedBal);
        if (cachedSync) setLastUpdated(cachedSync);
        
        cacheManager.setStatement(pharmId, { data: cachedStmt, balance: cachedBal, sync: cachedSync, pName: pharmacyName }, selectedPeriod);
        setLoading(false);
        return cachedStmt;
      }
    } catch (e) {
      console.warn("useAccountStatement: Vault load error", e);
    }
    return null;
  };

  const fetchAllDataWithId = useCallback(async (activePharmId: string, isBackground: boolean) => {
    try {
      if (!activePharmId || activePharmId === '0') {
        if (!isBackground) setLoading(false);
        return;
      }

      setIsFetching(true);
      let pName = await AsyncStorage.getItem('@active_pharmacy_name') || "صيدليتك";
      
      const userStr = await AsyncStorage.getItem('user');
      if (userStr && pName === "صيدليتك") {
        try {
            const user = JSON.parse(userStr);
            const pharm = user.pharmacies?.find((p: any) => p.id.toString() === activePharmId);
            if (pharm && pharm.name) pName = pharm.name;
        } catch(e) {}
      }
      setPharmacyName(pName);

      const existing = await loadCachedData(activePharmId);
      
      if (!isBackground && (!existing || existing.length === 0)) {
        setLoading(true);
      }

      const dateFromObj = new Date();
      dateFromObj.setMonth(dateFromObj.getMonth() - selectedPeriod);
      const dateFrom = dateFromObj.toISOString().split('T')[0];

      const [stmtData, balData] = await Promise.all([
        pharmacyApi.getStatement(activePharmId, dateFrom),
        pharmacyApi.getBalance(activePharmId)
      ]);
      
      setStatement(stmtData);
      setBalance(balData);
      
      let finalName = pName;
      if ((!finalName || finalName === "صيدليتك") && stmtData.length > 0) {
          finalName = stmtData[0].pharmacy_name || "صيدليتك";
          setPharmacyName(finalName);
      }

      const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(now);
      
      cacheManager.setStatement(activePharmId, { data: stmtData, balance: balData, sync: now, pName: finalName }, selectedPeriod);
      
      await PharmacyVault.set(activePharmId, 'statement', `data_p${selectedPeriod}`, stmtData);
      await PharmacyVault.set(activePharmId, 'statement', 'balance', balData);
      await PharmacyVault.set(activePharmId, 'sync', `statement_p${selectedPeriod}`, now);
      
    } catch (error) {
      console.error("useAccountStatement: fetchAllDataWithId failed", error);
    } finally {
      if (!isBackground) setLoading(false);
      setIsFetching(false);
    }
  }, [selectedPeriod]);

  const fetchAllData = useCallback(async (isBackground = false) => {
    if (isFetching) return;

    try {
      setIsFetching(true);
      const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
      
      if (!activePharmId || activePharmId === '0') {
        setLoading(false);
        setIsFetching(false);
        return;
      }

      await fetchAllDataWithId(activePharmId, isBackground);
    } catch (error) {
      console.error("useAccountStatement: fetchAllData failed", error);
      setIsFetching(false);
    }
  }, [fetchAllDataWithId, isFetching]);

  useEffect(() => {
    let isMounted = true;
    
    const resolveAndInit = async () => {
        const pharmId = await AsyncStorage.getItem('@active_pharmacy_id');
        if (!isMounted) return;
        
        if (!pharmId || pharmId === '0') {
            setLoading(false);
            setStatement([]);
            setBalance(null);
            return;
        }

        const mc = cacheManager.getStatement(pharmId, selectedPeriod);
        const savedName = await AsyncStorage.getItem('@active_pharmacy_name');
        
        if (mc) {
            setStatement(mc.data);
            setBalance(mc.balance);
            setPharmacyName(savedName || mc.pName || "صيدليتك");
            setLastUpdated(mc.sync);
            setLoading(false);
        } else {
            const existing = await loadCachedData(pharmId);
            if (!existing) {
                setStatement([]);
                setBalance(null);
                setPharmacyName(savedName || "صيدليتك");
                setLoading(true);
            }
        }
        
        fetchAllDataWithId(pharmId, true);
    };

    resolveAndInit();

    const interval = setInterval(() => {
        AsyncStorage.getItem('@active_pharmacy_id').then(id => {
            if (id && isMounted) fetchAllDataWithId(id, true);
        });
    }, 60000);

    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [selectedPeriod, fetchAllDataWithId]);

  return {
    statement,
    balance,
    pharmacyName,
    loading,
    isFetching,
    refreshing: isPullRefreshing,
    lastUpdated,
    refresh: async () => { 
        setIsPullRefreshing(true);
        const task = fetchAllData();
        const timeout = new Promise(res => setTimeout(res, 5000));
        await Promise.race([task, timeout]);
        setIsPullRefreshing(false);
    }
  };
}

