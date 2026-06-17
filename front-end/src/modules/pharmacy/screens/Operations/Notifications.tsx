import React, { useRef, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl, InteractionManager } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { BaseScreen } from '../../components/BaseScreen';
import { NotificationSkeleton } from '../../../../ui/core/skeletons/NotificationSkeleton';

export const Notifications = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { notifications, loading, markRead, clearAll, refetch, clearBadge } = useNotifications();
    const [refreshing, setRefreshing] = useState(false);
    const trashRef = useRef<LottieView>(null);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                refetch(true); 
                clearBadge();  
            });
            return () => task.cancel();
        }, [refetch, clearBadge])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch(true);
        setRefreshing(false);
    };

    const handleClearAll = () => {
        trashRef.current?.play();
        setTimeout(async () => {
            await clearAll();
            router.push('/(pharmacy)/dashboard' as any);
        }, 1200); 
    };

    const renderItem = ({ item }: any) => {
        const isUnread = !!item.unread;
        
        return (
            <TouchableOpacity 
                style={[
                    styles.card, 
                    { backgroundColor: theme.surface, borderColor: theme.border }, 
                    isUnread && { 
                        backgroundColor: colorScheme === 'light' ? '#F4F7FF' : '#1A1D3D',
                        borderColor: colorScheme === 'light' ? theme.primary + '30' : theme.primary + '50',
                        borderWidth: 1.2,
                        elevation: 6,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 10
                    }
                ]} 
                onPress={async () => {
                    markRead(item);
                    let targetId = item.target_id || item.id;
                    const type = item.type;

                    if ((type === 'purchase' || type === 'purchase_order' || type === 'return' || type === 'return_order') && 
                        !/^[A-Za-z]+_/.test(String(targetId))) {
                        targetId = `H_${targetId}`;
                    }

                    if (type === 'purchase' || type === 'purchase_order') router.push(`/(pharmacy)/purchases/${targetId}` as any);
                    else if (type === 'return' || type === 'return_order') router.push(`/(pharmacy)/returns/${targetId}` as any);
                    else if (type === 'sale' || type === 'sale_order') router.push(`/(pharmacy)/sales/${targetId}` as any);
                }} 
                activeOpacity={0.7}
            >
                <View style={[styles.icon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                
                <View style={styles.details}>
                    <View style={styles.row}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
                            <Text 
                                style={[
                                    styles.itemTit, 
                                    { color: theme.text },
                                    !isUnread && { color: theme.muted, fontWeight: '500' }
                                ]}
                                numberOfLines={1}
                            >
                                {item.title}
                            </Text>
                            {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
                        </View>
                        <Text style={[styles.time, { color: theme.muted }]}>
                            {new Date(item.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' })}
                        </Text>
                    </View>
                    
                    <Text 
                        style={[
                            styles.desc, 
                            { color: theme.text + 'CC' },
                            !isUnread && { color: theme.muted + '99' }
                        ]}
                    >
                        {item.description}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <BaseScreen 
            title="الإشعارات"
            scrollable={false}
            headerAction={
                <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
                    <LottieView 
                        ref={trashRef}
                        source={require('@/assets/json/Trash.json')}
                        autoPlay={false}
                        loop={false}
                        style={styles.trashLottie}
                    />
                </TouchableOpacity>
            }
        >
            <FlatList 
                data={loading && notifications.length === 0 ? [1, 2, 3, 4, 5, 6] : notifications} 
                keyExtractor={(item, index) => (loading && notifications.length === 0) ? `sk-${index}` : item.id.toString()} 
                renderItem={({ item }) => {
                    if (loading && notifications.length === 0) return <NotificationSkeleton />;
                    return renderItem({ item });
                }}
                contentContainerStyle={[
                    styles.list,
                    notifications.length === 0 && !loading && { flexGrow: 1, justifyContent: 'center' }
                ]}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
                ListEmptyComponent={!loading ? (
                    <View style={styles.empty}>
                        <LottieView source={require('@/assets/json/EmptyNotifications.json')} autoPlay loop style={{ width: 280, height: 280 }} />
                        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>لا توجد إشعارات</Text>
                    </View>
                ) : null} 
            />
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    clearBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    trashLottie: { width: 40, height: 40 },
    list: { padding: 20 },
    card: { flexDirection: 'row-reverse', borderRadius: 24, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1 },
    icon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
    details: { flex: 1 },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemTit: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    time: { fontSize: 11, fontWeight: '600' },
    desc: { fontSize: 13, textAlign: 'right', lineHeight: 20, marginBottom: 8 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

