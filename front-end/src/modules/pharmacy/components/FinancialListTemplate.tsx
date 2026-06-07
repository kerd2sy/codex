import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  SectionList, StyleSheet, Text, 
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

    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const groupedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        const groups: Record<string, any[]> = {};
        
        // Month names mapping
        const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
        
        data.forEach(item => {
            let monthKey = "أخرى";
            if (item.date && item.date !== '---') {
                const parts = item.date.split('/');
                if (parts.length === 3) {
                    const m = parseInt(parts[1], 10);
                    const y = parts[2];
                    if (m >= 1 && m <= 12) {
                        monthKey = `${monthNames[m - 1]} ${y}`;
                    }
                } else if (item.date.includes('-')) {
                    const parts = item.date.split('-');
                    if (parts.length >= 2) {
                        const m = parseInt(parts[1], 10);
                        const y = parts[0];
                        if (m >= 1 && m <= 12) {
                            monthKey = `${monthNames[m - 1]} ${y}`;
                        }
                    }
                }
            }
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(item);
        });

        return Object.keys(groups).map(key => ({
            title: key,
            data: groups[key]
        }));
    }, [data]);

    const sections = useMemo(() => {
        if (isInitialLoading) {
            return [{ title: 'جاري التحميل...', data: [1, 2, 3, 4], originalCount: 4, isCollapsed: false }];
        }
        return groupedData.map((group, index) => {
            // Expand first month by default, collapse others
            const isCollapsed = collapsedSections[group.title] !== undefined 
                ? collapsedSections[group.title] 
                : index !== 0; 
                
            return {
                title: group.title,
                data: isCollapsed ? [] : group.data,
                originalCount: group.data.length,
                isCollapsed
            };
        });
    }, [groupedData, collapsedSections, isInitialLoading]);

    const toggleSection = (sectionTitle: string) => {
        setCollapsedSections(prev => {
            const currentState = prev[sectionTitle] !== undefined ? prev[sectionTitle] : false; // false = expanded if first, but we need to track it properly. Wait, index 0 is expanded by default.
            // If it's undefined, we need to know its index. 
            // Better to just flip whatever it computes to.
            const isCurrentlyCollapsed = sections.find(s => s.title === sectionTitle)?.isCollapsed;
            return { ...prev, [sectionTitle]: !isCurrentlyCollapsed };
        });
    };

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

            <SectionList
                sections={sections}
                keyExtractor={(item, idx) => isInitialLoading ? `sk-${idx}` : (item.id + idx)}
                renderItem={isInitialLoading ? () => <FinancialCardSkeleton accentColor={accentColor} /> : renderItem}
                renderSectionHeader={({ section }) => (
                    <TouchableOpacity 
                        style={[styles.sectionHeader, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                        onPress={() => toggleSection(section.title)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="calendar" size={18} color={theme.primary} />
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.countBadge, { backgroundColor: theme.primary + '15' }]}>
                                <Text style={[styles.countText, { color: theme.primary }]}>{section.originalCount}</Text>
                            </View>
                            <Ionicons 
                                name={section.isCollapsed ? "chevron-down" : "chevron-up"} 
                                size={20} 
                                color={theme.muted} 
                            />
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={data.length === 0 && !isInitialLoading ? { flexGrow: 1, justifyContent: 'center' } : [styles.list, { paddingBottom: insets.bottom + 20 }]}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={true}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                updateCellsBatchingPeriod={50}
                stickySectionHeadersEnabled={false}
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
    list: { paddingVertical: 12 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    sectionHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginHorizontal: '5%',
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800' },
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    countText: { fontSize: 13, fontWeight: '800' }
});

