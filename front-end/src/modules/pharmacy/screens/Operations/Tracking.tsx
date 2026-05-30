import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import LottieView from 'lottie-react-native';
import { useOrders } from '../../hooks/useOrders';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { BaseScreen } from '../../components/BaseScreen';
import { SmallOrderCard } from '../../components/SmallOrderCard';

export const OrderTracking = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const { activePharmacyId } = usePharmacyStore();
    const theme = Colors[colorScheme];
    const { orders, loading } = useOrders(undefined, activePharmacyId, true);

    const handleOrderPress = (order: any) => {
        router.push({ 
            pathname: '/(pharmacy)/purchases/[id]', 
            params: { 
                id: order.id, 
                count: order.items_count || order.count || order.items_qty || order.QTY_ROWS 
            }
        } as any);
    };

    return (
        <BaseScreen title="تتبع الطلبيات" scrollable={true} contentContainerStyle={{ paddingHorizontal: 0 }}>
            <View style={styles.content}>
                {loading && orders.length === 0 ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
                ) : orders.length === 0 ? (
                    <View style={styles.empty}>
                        <LottieView 
                            source={require('@/assets/json/TrackDelivery.json')} 
                            autoPlay 
                            loop 
                            style={{ width: 300, height: 300 }} 
                        />
                        <Text style={[styles.emptyTxt, { color: theme.text }]}>لا توجد طلبيات قيد التتبع</Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {orders.map((o, idx) => (
                            <SmallOrderCard 
                                key={o.id || idx}
                                order={o}
                                theme={theme}
                                onPress={() => handleOrderPress(o)}
                            />
                        ))}
                    </View>
                )}
            </View>
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    content: { 
        flex: 1,
        paddingTop: 10,
    },
    listContainer: {
        paddingBottom: 20,
    },
    empty: { 
        alignItems: 'center', 
        paddingVertical: 40 
    },
    emptyTxt: { 
        fontSize: 18, 
        fontWeight: '900', 
        marginTop: 10,
        textAlign: 'center'
    }
});

