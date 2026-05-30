import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';

interface SmallOrderCardProps {
    order: any;
    theme: any;
    onPress: () => void;
    isInsideCard?: boolean;
}

const STEPS = ['كتابة', 'تحضير', 'جرد'];

export const SmallOrderCard: React.FC<SmallOrderCardProps> = ({ order, theme, onPress, isInsideCard }) => {
    return (
        <TouchableOpacity 
            style={[
                styles.card, 
                { backgroundColor: theme.surface, borderColor: theme.border },
                isInsideCard && { marginHorizontal: 0, elevation: 0, shadowOpacity: 0, marginBottom: 10, borderWidth: 0 }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.headerRow}>
                <Text style={[styles.supplierName, { color: theme.primary }]} numberOfLines={1}>{order.supplier}</Text>
                <View style={[styles.idBadge, { backgroundColor: theme.primary + '10' }]}>
                    <Text style={[styles.idText, { color: theme.primary }]}>#{String(order.id || '').replace(/^[A-Za-z]_|^#/, '')}</Text>
                </View>
            </View>


            <View style={styles.progressContainer}>
                <View style={styles.stepsRow}>
                    {STEPS.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = stepNum < order.currentStep;
                        const isActive = stepNum === order.currentStep;
                        
                        return (
                            <React.Fragment key={idx}>
                                <View style={styles.stepItem}>
                                    <View style={[
                                        styles.dot, 
                                        { borderColor: theme.border },
                                        isCompleted && { backgroundColor: theme.primary, borderColor: theme.primary },
                                        isActive && { backgroundColor: theme.accent, borderColor: theme.accent }
                                    ]}>
                                        {isCompleted ? (
                                            <Ionicons name="checkmark" size={10} color="#FFF" />
                                        ) : (
                                            <Text style={[styles.dotText, isActive && { color: '#FFF' }]}>{stepNum}</Text>
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.stepLabel, 
                                        { color: theme.muted },
                                        (isActive || isCompleted) && { color: theme.primary, fontWeight: '800' }
                                    ]}>{step}</Text>
                                </View>
                                {idx < STEPS.length - 1 && (() => {
                                    const seed = (parseInt(String(order.id).replace(/\D/g, '')) || 0) + idx;
                                    const segments = [
                                        { w: (seed % 5) + 3, m: (seed % 3) + 2 },
                                        { w: ((seed * 3) % 7) + 4, m: ((seed * 2) % 3) + 2 },
                                        { w: ((seed * 7) % 6) + 3, m: ((seed * 5) % 4) + 1 },
                                        { w: ((seed * 11) % 8) + 4, m: ((seed * 7) % 3) + 2 },
                                        { w: ((seed * 13) % 5) + 3, m: ((seed * 11) % 4) + 1 },
                                        { w: ((seed * 17) % 7) + 4, m: 0 },
                                    ];
                                    return (
                                        <View style={styles.randomConnector}>
                                            {segments.map((s, i) => (
                                                <View 
                                                    key={i} 
                                                    style={{ 
                                                        width: s.w, 
                                                        height: 2, 
                                                        borderRadius: 1,
                                                        backgroundColor: (stepNum < order.currentStep) ? theme.primary : theme.border,
                                                        marginRight: i === segments.length - 1 ? 0 : s.m
                                                    }} 
                                                />
                                            ))}
                                        </View>
                                    );
                                })()}
                            </React.Fragment>
                        );
                    })}
                </View>
            </View>

            <View style={[styles.financialFooter, { borderTopColor: theme.border }]}>
                <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color={theme.muted} style={{ marginLeft: 4 }} />
                    <Text style={[styles.orderIdValue, { color: theme.text }]}>{(order.date || '').split(' ')[0] || '---'}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Ionicons name="cash-outline" size={14} color={theme.accent} style={{ marginLeft: 4 }} />
                    <Text style={[styles.priceText, { color: theme.accent }]}>{order.price} ج.م</Text>
                </View>
            </View>


        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
        marginHorizontal: '5%',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    financialFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
    },

    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    supplierName: {
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'right',
        flex: 1,
    },
    idBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    idText: {
        fontSize: 12,
        fontWeight: '800',
    },
    footerItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    orderIdValue: {
        fontSize: 11,
        fontWeight: '800',
    },

    priceText: {
        fontSize: 14,
        fontWeight: '900',
    },
    progressContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginVertical: 4,
        paddingHorizontal: 4,
    },
    stepsRow: {
        flex: 1,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepItem: {
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    dotText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#999',
    },
    stepLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    randomConnector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around', // Spread segments
        marginTop: -16,
        marginHorizontal: -2, // Overlap the circles for seamless connection
    },
});
