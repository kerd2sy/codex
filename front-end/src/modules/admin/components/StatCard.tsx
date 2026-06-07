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
            {/* Soft inner glow overlay */}
            <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.content}>
                <View style={styles.topRow}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={icon} size={26} color="#FFF" />
                    </View>
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                    <Text style={styles.title}>{title}</Text>
                </View>
            </View>

            {/* Decorative background circle */}
            <View style={styles.decorativeCircle} />
            <View style={styles.decorativeCircleSmall} />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 28,
        padding: 20,
        minWidth: 160,
        flex: 1,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
    content: {
        zIndex: 2,
        flex: 1,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    textContainer: {
        alignItems: 'flex-start',
        marginTop: 15,
    },
    value: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    decorativeCircle: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        top: -40,
        right: -40,
        zIndex: 1,
    },
    decorativeCircleSmall: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        bottom: -20,
        left: -20,
        zIndex: 1,
    }
});
