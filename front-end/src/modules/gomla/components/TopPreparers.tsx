import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Colors } from '../../../core/theme';
import { useTheme } from '@/context/ThemeContext';
import { fetchTopPreparers } from '../services/gomlaService';
import { PreparerAvatarCard } from './PreparerAvatarCard';
import { TopPreparersSkeleton } from './TopPreparersSkeleton';
import { Ionicons } from '@expo/vector-icons';

export interface TopPreparer {
    userId: string;
    userName: string;
    avatar?: string;
    invoicesCount: number;
    itemsCount: number;
}

interface TopPreparersProps {
    selectedDate: string;
    refreshTrigger?: number; // Pass a counter/timestamp to force refresh
}

export const TopPreparers: React.FC<TopPreparersProps> = React.memo(({ selectedDate, refreshTrigger }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const [preparers, setPreparers] = useState<TopPreparer[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPreparers = async () => {
        setLoading(true);
        try {
            const data = await fetchTopPreparers(selectedDate);
            setPreparers(data || []);
        } catch (error) {
            console.error("Failed to load top preparers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPreparers();
    }, [selectedDate, refreshTrigger]);

    // Sorting in descending order by itemsCount (client-side safety check & memoization)
    const sortedPreparers = useMemo(() => {
        const list = [...preparers];
        return list.sort((a, b) => b.itemsCount - a.itemsCount);
    }, [preparers]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={[styles.title, { color: theme.text }]}>أكثر المستخدمين تحضيراً للأصناف اليوم</Text>
                <TopPreparersSkeleton />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: theme.text }]}>أكثر المستخدمين تحضيراً للأصناف اليوم</Text>
            
            {sortedPreparers.length > 0 ? (
                <FlatList<TopPreparer>
                    data={sortedPreparers}
                    keyExtractor={(prep) => prep.userId || prep.userName}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    style={styles.scrollView}
                    renderItem={({ item: prep, index }: { item: TopPreparer, index: number }) => (
                        <PreparerAvatarCard 
                            preparer={prep} 
                            rank={index + 1}
                        />
                    )}
                />
            ) : (
                <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="people-outline" size={24} color={theme.muted} style={{ marginBottom: 6 }} />
                    <Text style={[styles.emptyText, { color: theme.muted }]}>
                        لا يوجد تحضير أصناف اليوم.
                    </Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 10,
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'right',
        paddingHorizontal: '5%',
        marginBottom: 12,
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingHorizontal: '5%',
        gap: 12,
        paddingBottom: 8,
    },
    emptyState: {
        marginHorizontal: '5%',
        paddingVertical: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
