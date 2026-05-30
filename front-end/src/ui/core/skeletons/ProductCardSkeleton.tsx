import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';

export const ProductCardSkeleton = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.imgContainer, { backgroundColor: theme.surface }]}>
                <BaseSkeleton width={70} height={70} borderRadius={15} />
            </View>

            <View style={styles.info}>
                <View style={styles.topRow}>
                    <BaseSkeleton width="80%" height={18} borderRadius={4} />
                    <View style={{ height: 6 }} />
                    <BaseSkeleton width="50%" height={14} borderRadius={4} />
                </View>

                <View style={styles.bottomRow}>
                    <View style={styles.priceContainer}>
                        <BaseSkeleton width={60} height={20} borderRadius={4} />
                    </View>
                    <BaseSkeleton width={80} height={25} borderRadius={8} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderRadius: 20,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
    },
    imgContainer: {
        width: 90,
        height: 90,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15,
    },
    info: {
        flex: 1,
        height: 90,
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    topRow: {
        alignItems: 'flex-end',
    },
    bottomRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'baseline',
    },
});
