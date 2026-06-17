import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { PharmacyBalance } from '@/api/PharmacyApi';

interface BalanceCardProps {
  balance: PharmacyBalance | null;
  error?: string | null;
  onPress: () => void;
  onPay?: () => void;
}

export const BalanceCard = React.memo(({ balance, error, onPress, onPay }: BalanceCardProps) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];

  const consumptionPercent = React.useMemo(() => {
    if (!balance) return 0;
    const usage = balance.usage_percentage ?? (balance as any).usagePercentage;
    if (typeof usage === 'number') return Math.round(usage);
    
    const curBal = balance.current_balance ?? (balance as any).currentBalance ?? 0;
    const limit = balance.credit_limit ?? (balance as any).creditLimit ?? 0;
    
    if (!limit || limit === 0) return 0;
    const percent = (curBal / limit) * 100;
    return Math.min(Math.max(Math.round(percent), 0), 100);
  }, [balance]);

  return (
    <TouchableOpacity 
      style={styles.balanceCard} 
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image source={require('@/assets/images/balance_bg.png')} style={styles.balanceBg} resizeMode="cover" />
      <View style={styles.balanceOverlay} />
      <View style={styles.balanceContent}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>
            الرصيد الحالي { (balance && Math.abs(balance.current_balance ?? (balance as any).currentBalance ?? 0) >= 1) ? `(${ (balance.balance_type ?? (balance as any).balanceType) === 'Debit' ? 'مدين' : 'دائن' })` : ''}
          </Text>
          <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.balanceMain}>
          {(error === 'balance' && !balance) ? (
            <Text style={[styles.balanceAmount, { fontSize: 18, opacity: 0.9 }]}>خطأ في الاتصال بنظام أورجا</Text>
          ) : (
            <>
              <Text style={styles.balanceAmount}>
                {((balance?.balance_type ?? (balance as any)?.balanceType) === 'Credit' && Math.abs(balance?.current_balance ?? (balance as any).currentBalance ?? 0) >= 1) ? '-' : ''}
                {Math.abs(balance?.current_balance ?? (balance as any)?.currentBalance ?? 0) < 1 ? '0' : (balance?.current_balance ?? (balance as any)?.currentBalance)?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.currency}>ج.م</Text>
            </>
          )}
        </View>
        <View style={styles.balanceFooter}>
          <View style={styles.consumptionContainer}>
             <Text style={styles.consumptionLabel}>نسبة الاستهلاك:</Text>
             <Text style={styles.consumptionValue}>{consumptionPercent}%</Text>
          </View>
          <Text style={styles.lastUpdate}>الحد الائتماني: {(balance?.credit_limit ?? (balance as any)?.creditLimit)?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'} ج.م</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});


const styles = StyleSheet.create({
  balanceCard: {
    marginHorizontal: '5%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: '#1E88E5',
  },
  balanceBg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  balanceOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  balanceContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  balanceHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  balanceMain: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 8,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  currency: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  balanceFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastUpdate: {
    color: '#FFFFFF',
    fontSize: 11,
    opacity: 0.7,
    fontWeight: '500',
  },
  consumptionContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  consumptionLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.9,
  },
  consumptionValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});

