import React, { useRef, useEffect } from 'react';
import { 
  FlatList, StyleSheet, Text, 
  TouchableOpacity, View, ActivityIndicator,
  RefreshControl, Animated, Easing
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { FinancialCardSkeleton } from '@/ui/core/skeletons/FinancialCardSkeleton';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

interface FinancialListTemplateProps {
    title: string;
    data: any[];
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    onLoadMore: () => void;
    isSyncing: boolean;
    isFetchingMore: boolean;
    renderItem: ({ item }: { item: any }) => React.ReactElement;
    emptyText?: string;
    accentColor: string;
}

export const FinancialListTemplate = ({
    title, data, loading, refreshing, onRefresh, onLoadMore,
    isSyncing, isFetchingMore, renderItem, emptyText = 'لا توجد بيانات',
    accentColor
}: FinancialListTemplateProps) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const lineWidth = useRef(new Animated.Value(25)).current;
    const isInitialLoading = loading && data.length === 0;

    useEffect(() => {
        Animated.timing(lineWidth, {
            toValue: isSyncing ? 120 : 25,
            duration: 800,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false
        }).start();
    }, [isSyncing]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]}>{title}</Text>
                        <Animated.View style={[styles.titleLine, { backgroundColor: '#FF7043', alignSelf: 'flex-end', width: lineWidth }]} />
                    </View>
                </View>
            </View>

            <FlatList
                data={isInitialLoading ? [1, 2, 3, 4, 5, 6] : data}
                keyExtractor={(item, idx) => isInitialLoading ? `sk-${idx}` : (item.id + idx)}
                renderItem={isInitialLoading ? () => <FinancialCardSkeleton accentColor={accentColor} /> : renderItem}
                contentContainerStyle={data.length === 0 && !isInitialLoading ? { flexGrow: 1, justifyContent: 'center' } : [styles.list, { paddingBottom: insets.bottom + 20 }]}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={true}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                updateCellsBatchingPeriod={50}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
                ListFooterComponent={() => isFetchingMore ? <View style={{ padding: 20 }}><ActivityIndicator color={theme.primary} /></View> : null}
                ListEmptyComponent={
                    !isInitialLoading ? (
                        <View style={styles.empty}>
                            <LottieView source={require('@/assets/json/NoTransactionHistory.json')} autoPlay loop style={{ width: 250, height: 250 }} />
                            <Text style={{ color: theme.muted, fontSize: 18, fontWeight: '800' }}>{emptyText}</Text>
                        </View>
                    ) : null
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: '5%', justifyContent: 'space-between' },
    headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    headerTitleContainer: { alignItems: 'flex-end', flex: 1 },
    title: { fontSize: 18, fontWeight: '900' },
    titleLine: { width: 25, height: 4, borderRadius: 2, marginTop: -2 },
    backBtn: { padding: 4, marginLeft: -4 },
    list: { paddingVertical: 24 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 50 }
});

