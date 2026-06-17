import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Pressable } from 'react-native';
import { Colors } from '../../../core/theme';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { Ionicons } from '@expo/vector-icons';

interface TopPreparer {
    userId: string;
    userName: string;
    avatar?: string;
    invoicesCount: number;
    itemsCount: number;
}

interface PreparerAvatarCardProps {
    preparer: TopPreparer;
    rank: number;
}

export const PreparerAvatarCard: React.FC<PreparerAvatarCardProps> = ({ preparer, rank }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const avatarUri = getAvatarUrl(preparer.avatar);

    return (
        <Animated.View style={[
            styles.animatedContainer, 
            { transform: [{ scale: scaleAnim }] }
        ]}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.card, 
                    { 
                        backgroundColor: theme.surface, 
                        borderColor: theme.border,
                        shadowColor: theme.primary,
                        elevation: isDark ? 2 : 3,
                    }
                ]}
            >
                {/* Avatar area */}
                <View style={styles.avatarWrapper}>
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '15' }]}>
                            <Ionicons name="person" size={24} color={theme.primary} />
                        </View>
                    )}
                    
                    {/* Rank badge for top 3 */}
                    {rank <= 3 && (
                        <View style={[
                            styles.rankBadge, 
                            { 
                                backgroundColor: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32' 
                            }
                        ]}>
                            <Text style={styles.rankText}>{rank}</Text>
                        </View>
                    )}
                </View>

                {/* Right side info */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                        {preparer.userName}
                    </Text>

                    {/* Statistics */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statRow}>
                            <Ionicons name="document-text-outline" size={12} color={theme.muted} style={{ marginLeft: 3 }} />
                            <Text style={[styles.statValue, { color: theme.text }]}>
                                {preparer.invoicesCount} {preparer.invoicesCount === 1 ? 'فاتورة' : 'فواتير'}
                            </Text>
                        </View>
                        
                        <View style={[styles.statRow, { marginRight: 12 }]}>
                            <Ionicons name="cube-outline" size={12} color={theme.primary} style={{ marginLeft: 3 }} />
                            <Text style={[styles.statValue, { color: theme.primary, fontWeight: 'bold' }]}>
                                {preparer.itemsCount} صنف
                            </Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    animatedContainer: {
        width: '100%',
        marginVertical: 4,
    },
    card: {
        flexDirection: 'row-reverse',
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'flex-start',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    rankText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
    },
    infoContainer: {
        flex: 1,
        marginRight: 16,
        alignItems: 'flex-end',
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'right',
        marginBottom: 6,
        width: '100%',
    },
    statsContainer: {
        flexDirection: 'row-reverse',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    statRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 12,
    },
});
