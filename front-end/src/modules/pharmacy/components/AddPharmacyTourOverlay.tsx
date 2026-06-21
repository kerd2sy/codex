import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

interface AddPharmacyTourOverlayProps {
    visible: boolean;
    onClose: () => void;
    theme: any;
    tourType?: 'first_pharmacy' | 'multi_pharmacy';
}

const { width } = Dimensions.get('window');

export const AddPharmacyTourOverlay = ({ visible, onClose, theme, tourType = 'first_pharmacy' }: AddPharmacyTourOverlayProps) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(translateY, { toValue: -5, duration: 500, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: 5, duration: 500, useNativeDriver: true })
                ])
            ).start();
        } else {
            translateY.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    // Calculate approximate position of the header text "اضغط هنا"
    const headerHeight = insets.top + HEADER_TOP_GAP + HEADER_CONTENT_HEIGHT;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View 
                    style={[
                        styles.tooltipContainer, 
                        { 
                            top: headerHeight,
                            transform: [{ translateY }],
                            backgroundColor: theme.surface
                        }
                    ]}
                >
                    <View style={{ position: 'absolute', top: -18, right: 20 }}>
                        <Ionicons name="arrow-up" size={24} color={theme.surface} />
                    </View>

                    <View style={styles.headerRow}>
                        <Ionicons name={tourType === 'multi_pharmacy' ? 'layers' : 'business'} size={20} color={theme.primary} />
                        <Text style={[styles.title, { color: theme.text }]}>
                            {tourType === 'multi_pharmacy' ? 'هل تملك أكثر من صيدلية؟' : 'أهلاً بك'}
                        </Text>
                    </View>
                    
                    <Text style={[styles.description, { color: theme.muted }]}>
                        {tourType === 'multi_pharmacy' 
                            ? 'يمكنك الضغط على اسم الصيدلية بالأعلى لإضافة صيدليات أخرى والتبديل بينها.'
                            : 'اضغط هنا لإضافة صيدليتك الآن'
                        }
                    </Text>

                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: theme.primary + '15' }]}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.btnText, { color: theme.primary }]}>حسناً، فهمت</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    tooltipContainer: {
        position: 'absolute',
        maxWidth: width * 0.75,
        right: '5%',
        zIndex: 1000,
        borderRadius: 12,
        padding: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        marginRight: 6,
    },
    description: {
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'right',
        marginBottom: 12,
        fontWeight: '500'
    },
    btn: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        fontSize: 14,
        fontWeight: 'bold',
    }
});
