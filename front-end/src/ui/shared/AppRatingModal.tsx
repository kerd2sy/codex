import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, View, Text, TouchableOpacity, 
    Modal, Platform, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';
import * as StoreReview from 'expo-store-review';
import { storage } from '@/utils/storage';

interface AppRatingModalProps {
    visible: boolean;
    onClose: () => void;
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tabarak.pharma&hl=ar';

export const AppRatingModal: React.FC<AppRatingModalProps> = ({ visible, onClose }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const [step, setStep] = useState<1 | 2>(1);
    const [rating, setRating] = useState(0);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setStep(1);
            setRating(0);
        }
    }, [visible]);

    const handleLater = async () => {
        // Record that they deferred, ask again later (e.g. after a week)
        const nextPromptDate = new Date();
        nextPromptDate.setDate(nextPromptDate.getDate() + 7);
        await storage.setItem('next_rating_prompt_date', nextPromptDate.toISOString());
        onClose();
    };

    const handleNever = async () => {
        await storage.setItem('has_rated_app', 'true'); // Treat as completed to never show again
        onClose();
    };

    const handleRateStar = (star: number) => {
        setRating(star);
        setTimeout(() => {
            if (star >= 4) {
                // If they gave 4 or 5 stars, ask them to rate on the store
                setStep(2);
            } else {
                // If 1-3 stars, just thank them (keeps bad reviews internal)
                submitInternalFeedback();
            }
        }, 500);
    };

    const submitInternalFeedback = async () => {
        // You could send the low rating to your API here
        await storage.setItem('has_rated_app', 'true');
        onClose();
    };

    const openStoreRating = async () => {
        await storage.setItem('has_rated_app', 'true');
        
        try {
            await Linking.openURL(PLAY_STORE_URL);
        } catch (e) {
            console.log('Could not open Play Store', e);
        }
        
        onClose();
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={handleLater}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                    
                    {step === 1 ? (
                        <>
                            <View style={styles.iconContainer}>
                                <Ionicons name="heart" size={50} color="#EF4444" />
                            </View>
                            <Text style={[styles.title, { color: theme.text }]}>هل يعجبك تطبيق تبارك فارما؟</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                تقييمك يساعدنا على تقديم تجربة أفضل وتطوير المزيد من الميزات لك.
                            </Text>

                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity 
                                        key={star} 
                                        onPress={() => handleRateStar(star)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name={rating >= star ? "star" : "star-outline"} 
                                            size={40} 
                                            color={rating >= star ? "#FBBF24" : theme.border} 
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.laterButton} onPress={handleLater}>
                                <Text style={[styles.laterText, { color: theme.textSecondary }]}>ذكرني لاحقاً</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.iconContainer}>
                                <Ionicons name="logo-google-playstore" size={50} color="#10B981" />
                            </View>
                            <Text style={[styles.title, { color: theme.text }]}>شكراً لدعمك! 🎉</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                هل تمانع في تقييمنا على متجر جوجل بلاي؟ لن يأخذ ذلك سوى لحظات.
                            </Text>

                            <TouchableOpacity style={[styles.rateButton, { backgroundColor: theme.primary }]} onPress={openStoreRating}>
                                <Text style={styles.rateButtonText}>تقييم الآن على المتجر</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.laterButton} onPress={handleNever}>
                                <Text style={[styles.laterText, { color: theme.textSecondary }]}>لا، شكراً</Text>
                            </TouchableOpacity>
                        </>
                    )}

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    starsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 30,
    },
    laterButton: {
        padding: 10,
    },
    laterText: {
        fontSize: 15,
        fontWeight: '500',
    },
    rateButton: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    rateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
