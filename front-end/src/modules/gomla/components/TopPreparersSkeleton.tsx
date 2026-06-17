import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../../core/theme';
import { useTheme } from '@/context/ThemeContext';

export const TopPreparersSkeleton = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const fadeAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [fadeAnim]);

    const cards = [1, 2, 3];

    return (
        <View style={styles.container}>
            {cards.map((key) => (
                <Animated.View 
                    key={key} 
                    style={[
                        styles.card, 
                        { 
                            backgroundColor: theme.surface, 
                            borderColor: theme.border,
                            opacity: fadeAnim 
                        }
                    ]}
                >
                    {/* Avatar Circle Skeleton */}
                    <View style={[styles.avatarSkeleton, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                    
                    {/* Info Container Skeleton */}
                    <View style={styles.infoContainer}>
                        <View style={[styles.nameSkeleton, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                        <View style={styles.statsContainer}>
                            <View style={[styles.lineSkeleton, { backgroundColor: isDark ? '#333' : '#E0E0E0', width: 60 }]} />
                            <View style={[styles.lineSkeleton, { backgroundColor: isDark ? '#333' : '#E0E0E0', width: 70 }]} />
                        </View>
                    </View>
                </Animated.View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: '5%',
        gap: 12,
        marginBottom: 16,
    },
    card: {
        flexDirection: 'row-reverse',
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    avatarSkeleton: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    infoContainer: {
        flex: 1,
        marginRight: 16,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    nameSkeleton: {
        height: 14,
        width: 120,
        borderRadius: 4,
        marginBottom: 10,
    },
    statsContainer: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    lineSkeleton: {
        height: 10,
        borderRadius: 3,
    },
});
