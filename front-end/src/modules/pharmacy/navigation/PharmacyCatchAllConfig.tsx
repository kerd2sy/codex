import React from 'react';
// Main Screens
import { PharmacyDashboard } from '../screens/Pharmacy/PharmacyDashboard';
import { OrderTracking } from '../screens/Operations/Tracking';
import { RecentProducts } from '../screens/Operations/RecentProducts';
import { Search } from '../screens/Operations/Search';
import { AccountStatement } from '../screens/Account/AccountStatement';
import { AddPharmacy } from '../screens/Pharmacy/AddPharmacy';
import { AccountSettingsHub } from '../screens/Account/AccountSettingsHub';
import { BackupSettings } from '../screens/Account/BackupSettings';

// Unified Screens
import { TransactionsList } from '../screens/Transactions/TransactionsList';
import { TransactionDetails } from '../screens/Transactions/TransactionDetails';
import { AccountActivityList } from '../screens/Account/AccountActivityList';

// Profile & Settings (Internal Screens)
import { Profile } from '../screens/Account/Profile';
import { EditProfile } from '../screens/Account/EditProfile';
import { Notifications } from '../screens/Operations/Notifications';
import { PharmacySettings } from '../screens/Pharmacy/PharmacySettings';
import { Security } from '../screens/Account/Security';
import { ChangePassword } from '../screens/Account/ChangePassword';

export type RouteHandler = React.ComponentType<any>;

export interface RouteConfig {
  component: RouteHandler;
  paramName?: string;
}

// --- List Wrappers ---
const PurchasesList = () => <TransactionsList type="purchases" title="سجل المشتريات" accentColor="#2196F3" emptyText="لا توجد مشتريات" />;
const SalesList = () => <TransactionsList type="sales" title="سجل المبيعات" accentColor="#795548" emptyText="لا توجد مبيعات" />;
const ReturnsList = () => <TransactionsList type="returns" title="سجل المرتجعات" accentColor="#F44336" emptyText="لا توجد مرتجعات" />;
const CashList = () => <TransactionsList type="cash" title="سجل النقدية" accentColor="#FF9800" emptyText="لا يوجد سجل نقدية" />;

// --- Detail Wrappers ---
const PurchaseDetailsWrapper = (props: any) => <TransactionDetails type="purchase" titlePrefix="فاتورة شراء" accentColor="#2196F3" {...props} />;
const SalesDetailsWrapper = (props: any) => <TransactionDetails type="sales" titlePrefix="فاتورة بيع" accentColor="#795548" {...props} />;
const ReturnDetailsWrapper = (props: any) => {
    const isSalesReturn = String(props.id || '').startsWith('OR_');
    return <TransactionDetails type="return" titlePrefix={isSalesReturn ? "مردود مبيعات" : "فاتورة مرتجع"} accentColor="#F44336" {...props} />;
};

// --- Activity Wrappers ---
const DevicesList = () => <AccountActivityList type="devices" />;
const LoginActivityList = () => <AccountActivityList type="login_activity" />;

export const PHARMACY_CATCHALL_MAP: Record<string, RouteConfig> = {
  // 1-level routes
  'dashboard': { component: PharmacyDashboard },
  'cash': { component: CashList },
  'orders': { component: OrderTracking },
  'products': { component: RecentProducts },
  'search': { component: Search },
  'account-statement': { component: AccountStatement },
  'add-pharmacy': { component: AddPharmacy },
  'settings': { component: AccountSettingsHub },
  'backup': { component: BackupSettings },
  
  // Feature Groups
  'purchases': { component: PurchasesList },
  'purchases/[id]': { component: PurchaseDetailsWrapper, paramName: 'id' },
  
  'returns': { component: ReturnsList },
  'returns/[id]': { component: ReturnDetailsWrapper, paramName: 'id' },
  
  'sales': { component: SalesList },
  'sales/[id]': { component: SalesDetailsWrapper, paramName: 'id' },

  // Sub-settings routes (reachable via Hub)
  'profile': { component: Profile },
  'profile/edit': { component: EditProfile },
  'profile/change-password': { component: ChangePassword },
  'profile/security': { component: Security },
  'profile/devices': { component: DevicesList },
  
  'pharmacy-settings': { component: PharmacySettings },
  'settings/pharmacy': { component: PharmacySettings },
  
  'notifications': { component: Notifications },
  'login-activity': { component: LoginActivityList },
  'tracking': { component: OrderTracking },
};

/**
 * Resolves a path array to a component and its parameters
 */
export const resolvePharmacyRoute = (rest: string[]) => {
  if (!rest || rest.length === 0) return null;

  // Filter out empty segments or group markers like '(pharmacy)'
  const cleanSegments = rest.filter(s => s && s !== '(pharmacy)' && s !== 'pharmacy');
  const path = cleanSegments.join('/');
  
  // Direct match in the map
  if (PHARMACY_CATCHALL_MAP[path]) {
    return { config: PHARMACY_CATCHALL_MAP[path], params: {} };
  }

  // Parameterized match (e.g. purchases/123)
  if (cleanSegments.length === 2) {
    const pattern = `${cleanSegments[0]}/[id]`;
    if (PHARMACY_CATCHALL_MAP[pattern]) {
      const config = PHARMACY_CATCHALL_MAP[pattern];
      return { 
        config, 
        params: { [config.paramName || 'id']: cleanSegments[1] } 
      };
    }
  }

  // Final fallback: try just the first segment if there are many
  if (cleanSegments.length > 1 && PHARMACY_CATCHALL_MAP[cleanSegments[0]]) {
      return { config: PHARMACY_CATCHALL_MAP[cleanSegments[0]], params: {} };
  }
  
  return null;
};
