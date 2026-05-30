import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';

export const NotificationSkeleton = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.iconContainer}>
                <BaseSkeleton width={56} height={56} borderRadius={18} />
            </View>
            
            <View style={styles.details}>
                <View style={styles.topRow}>
                    <BaseSkeleton width={60} height={12} />
                    <BaseSkeleton width={120} height={16} />
                </View>
                
                <View style={styles.descContainer}>
                    <BaseSkeleton width="90%" height={12} style={{ marginBottom: 6 }} />
                    <BaseSkeleton width="70%" height={12} />
                </View>

                <View style={styles.bottomRow}>
                    <BaseSkeleton width={80} height={18} borderRadius={10} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { 
        flexDirection: 'row-reverse',
        borderRadius: 24, 
        padding: 16, 
        marginBottom: 16, 
        alignItems: 'center', 
        borderWidth: 1 
    },
    iconContainer: { 
        marginLeft: 16 
    },
    details: { 
        flex: 1 
    },
    topRow: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 8 
    },
    descContainer: { 
        marginBottom: 12,
        alignItems: 'flex-end'
    },
    bottomRow: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    }
});
