import React from 'react';
import { 
  View, Text, StyleSheet, 
  TouchableOpacity, ActivityIndicator, FlatList
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/constants/HeaderConstants';

interface InvoiceDetailsTemplateProps {
    title: string;
    loading: boolean;
    details: any;
    items: any[];
    renderHeaderInfo: () => React.ReactElement | null;
    renderItem: ({ item, index }: { item: any, index: number }) => React.ReactElement;
    accentColor: string;
    onPrint?: () => void;
    onInfo?: () => void;
    footer?: React.ReactElement;
}

export const InvoiceDetailsTemplate = ({
    title, loading, details, items,
    renderHeaderInfo, renderItem,
    accentColor, onPrint, onInfo, footer
}: InvoiceDetailsTemplateProps) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    if (loading && !details) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={accentColor} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Standardized Header matching BaseScreen */}
            <View style={[
                styles.header, 
                { 
                    paddingTop: insets.top + HEADER_TOP_GAP, 
                    height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border + '20'
                }
            ]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]}>{title}</Text>
                        <View style={[styles.titleLine, { backgroundColor: '#FF7E47' }]} />
                    </View>
                </View>
                
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={onInfo} style={styles.iconBtn}>
                        <Ionicons name="information-circle-outline" size={26} color={theme.primary} />
                    </TouchableOpacity>
                    {onPrint && (
                        <TouchableOpacity onPress={onPrint} style={styles.iconBtn}>
                            <Ionicons name="print-outline" size={24} color={theme.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={renderItem}
                ListHeaderComponent={renderHeaderInfo}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + (footer ? 120 : 20) }]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={!loading ? (
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.muted, fontSize: 16, fontWeight: '700' }}>لا توجد أصناف في هذه الفاتورة</Text>
                    </View>
                ) : null}
            />

            {footer && (
                <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 20 }]}>
                    {footer}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        paddingHorizontal: 24, 
        justifyContent: 'space-between',
        zIndex: 10
    },
    headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    headerLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    headerTitleContainer: { alignItems: 'flex-end', flex: 1 },
    title: { fontSize: 18, fontWeight: '900' },
    titleLine: { width: 25, height: 4, borderRadius: 2, marginTop: -2, alignSelf: 'flex-end' },
    iconBtn: { padding: 4 },
    listContent: { paddingVertical: 10, paddingTop: 20 },
    footerContainer: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        paddingHorizontal: 20,
        backgroundColor: 'transparent'
    },
    emptyContainer: { padding: 40, alignItems: 'center' }
});

