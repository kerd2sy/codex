import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    colors: readonly [string, string, ...string[]];
    style?: ViewStyle;
}

export const StatCard = ({ title, value, icon, colors, style }: StatCardProps) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    return (
        <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, style]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={24} color="#FFF" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.value}>{value}</Text>
                    <Text style={styles.title}>{title}</Text>
                </View>
            </View>
            {/* Glass effect overlays */}
            <View style={styles.glassOverlay} />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 20,
        minWidth: 150,
        flex: 1,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    content: {
        zIndex: 2,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    textContainer: {
        alignItems: 'flex-end',
    },
    value: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    title: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 4,
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        zIndex: 1,
    }
});
