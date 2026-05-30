import React, { useCallback } from 'react';
import { 
  Dimensions, FlatList, StyleSheet, 
  Text, View 
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import LottieView from 'lottie-react-native';
import { useProducts } from '../../hooks/useProducts';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Product } from '@/api/types';
import { BaseScreen } from '../../components/BaseScreen';
import { ProductCard } from '../../components';
import { ProductCardSkeleton } from '../../../../ui/core/skeletons/ProductCardSkeleton';

const { width } = Dimensions.get('window');

export const RecentProducts = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const { products, loading } = useProducts();
    const { loadUserData } = useDashboardData();

    useFocusEffect(
        useCallback(() => {
            loadUserData();
        }, [loadUserData])
    );

    const isInitialLoading = loading && products.length === 0;

    return (
        <BaseScreen title="اصناف حديثة" scrollable={false}>
            <FlatList
                data={isInitialLoading ? [1, 2, 3, 4, 5, 6] : products}
                numColumns={1}
                keyExtractor={(item, index) => isInitialLoading ? `sk-${index}` : (item.id || index.toString())}
                renderItem={({ item }) => {
                    if (isInitialLoading) return <ProductCardSkeleton />;
                    return <ProductCard item={item as Product} onPress={() => {}} showStatus={false} />;
                }}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={(!loading && products.length === 0) ? (
                    <View style={styles.emptyContainer}>
                        <LottieView 
                            source={require('@/assets/json/Searching.json')} 
                            autoPlay 
                            loop 
                            style={styles.emptyLottie} 
                            resizeMode="contain" 
                        />
                        <Text style={[styles.emptyText, { color: theme.text }]}>لا يوجد نتائج</Text>
                        <Text style={[styles.emptySubText, { color: theme.muted }]}>لم نتمكن من العثور على أي كروت مطابقة لبحثك</Text>
                    </View>
                ) : null}
            />
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    list: { paddingHorizontal: '5%', paddingBottom: 40 },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyLottie: {
        width: width * 0.8,
        height: 250,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 10,
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

