import React, { useState, useRef, useCallback } from 'react';
import { 
  StyleSheet, Text, TextInput, 
  TouchableOpacity, View, ActivityIndicator,
  FlatList, Platform
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import BarcodeLottie from '../../../../ui/shared/BarcodeLottie';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import BarcodeScannerModal from '../../../../ui/shared/BarcodeScannerModal';
import { useSearch } from '../../hooks/useSearch';
import { BaseScreen } from '../../components/BaseScreen';
import { ProductCard } from '../../components';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Product } from '@/api/types';

export const Search = () => {
    const router = useRouter();
    const { q } = useLocalSearchParams<{ q?: string }>();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { loadUserData } = useDashboardData();

    useFocusEffect(
        useCallback(() => {
            loadUserData();
        }, [loadUserData])
    );

    const { 
        searchText, setSearchText, 
        recentKeywords, searchResults, 
        noResults, isSearching, 
        handleSearch, clearHistory 
    } = useSearch(q);

    const [scannerVisible, setScannerVisible] = useState(false);
    const scannerRef = useRef<LottieView>(null);

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={20} color={theme.muted} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="ابحث عن أدوية..."
                    placeholderTextColor={theme.muted}
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={() => handleSearch(searchText)}
                    returnKeyType="search"
                    textAlign="right"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearInputBtn}>
                        <Ionicons name="close-circle" size={20} color={theme.muted} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setScannerVisible(true)}>
                    <BarcodeLottie style={{ width: 40, height: 40 }} />
                </TouchableOpacity>
            </View>

            {recentKeywords.length > 0 && !isSearching && searchResults.length === 0 && (
                <View style={styles.historyFixed}>
                    <View style={styles.sectionHeader}>
                        <TouchableOpacity onPress={clearHistory}>
                            <Text style={styles.clearText}>مسح الكل</Text>
                        </TouchableOpacity>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>الأبحاث الأخيرة</Text>
                    </View>
                    <View style={styles.chipsRow}>
                        {recentKeywords.slice(0, 8).map((k, i) => (
                            <TouchableOpacity 
                                key={i} 
                                style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                                onPress={() => { setSearchText(k); handleSearch(k); }}
                            >
                                <Text style={[styles.chipText, { color: theme.muted }]}>{k}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {isSearching && (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
            )}
        </View>
    );

    const renderEmpty = () => (
        noResults && !isSearching ? (
            <View style={styles.emptyContainer}>
                <LottieView 
                    source={require('@/assets/json/Searching.json')} 
                    autoPlay 
                    loop 
                    style={styles.emptyLottie} 
                    resizeMode="contain"
                />
                <Text style={[styles.emptyText, { color: theme.text }]}>لم نجد نتائج مطابقة</Text>
                <Text style={[styles.emptySubText, { color: theme.muted }]}>تعذر البحث عن هذا الصنف</Text>
            </View>
        ) : null
    );

    return (
        <BaseScreen title="البحث" scrollable={false}>
            <View style={styles.mainContent}>
                {searchResults.length > 0 ? (
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        numColumns={1}
                        ListHeaderComponent={renderHeader()}
                        contentContainerStyle={styles.content}
                        renderItem={({ item }) => (
                            <ProductCard 
                                item={item as Product} 
                                onPress={() => {}} 
                            />
                        )}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={{ flex: 1 }}>
                        {renderHeader()}
                        {renderEmpty()}
                    </View>
                )}
            </View>

            <BarcodeScannerModal
                isVisible={scannerVisible}
                onClose={() => setScannerVisible(false)}
                onScan={(data) => { setScannerVisible(false); setSearchText(data); handleSearch(data); }}
            />
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    headerContent: { paddingVertical: 20 },
    content: { paddingBottom: 40 },
    mainContent: { flex: 1, paddingHorizontal: 20 },
    searchBox: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 15, height: 60, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
    input: { flex: 1, height: '100%', fontSize: 15, paddingHorizontal: 10 },
    clearInputBtn: { padding: 5, marginHorizontal: 5 },
    historyFixed: { height: 120, marginBottom: 10 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    clearText: { fontSize: 13, color: '#FF5252' },
    chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, height: 80, overflow: 'hidden' },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1 },
    chipText: { fontSize: 13 },
    center: { alignItems: 'center', marginTop: 50 },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    emptyLottie: {
        width: 250,
        height: 250,
        alignSelf: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 0,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 5,
        opacity: 0.7,
        textAlign: 'center',
    },
});

