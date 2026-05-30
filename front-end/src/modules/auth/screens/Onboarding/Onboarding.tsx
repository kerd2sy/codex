import React, { useRef, useState } from 'react';
import { 
  Dimensions, Image, ScrollView, StyleSheet, 
  Text, View, TouchableOpacity 
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Button } from '@/ui/core/form/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/utils/storage';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: 'Ambulance',
        title: '3 دورات توزيع يومياً',
        description: 'وفرنا 3 دورات توزيع بتلف الدنيا عشانك. فريقنا بيشتغل بروح قتالية عشان يوصلك طلبك بدون تأخير.',
        animation: require('@/assets/json/Ambulance.json'),
        button: 'ابدأ الآن',
        scale: 0.95
    },
    {
        id: 'boxes',
        title: 'طلبيتك في أيدٍ أمينة',
        description: 'بنراجع ونفحص كل علبة دواء بكل طاقتنا عشان نوصل لك جودة عالمية وصيدلية ناجحة.',
        animation: require('@/assets/json/boxes.json'),
        button: 'التالي',
        scale: 0.75
    },
    {
        id: 'live',
        title: 'رد سريع.. صيدلية ناجحة',
        description: 'سرعة الرد عندنا وعد؛ فريقنا مدرب ينجز طلباتك فورا وباحترافية عشان تفضل مركز في صيدليتك.',
        animation: require('@/assets/json/live.json'),
        button: 'التالي',
        scale: 0.75
    },
    {
        id: 'welcome',
        title: 'تبارك فارما.. تيم بِيخدمك',
        description: 'فريقنا بالكامل سخر خبرته التكنولوجية عشان يخلي إدارة صيدليتك تجربة ممتعة وسهلة.',
        animation: require('@/assets/json/team_work.json'),
        button: 'التالي',
        scale: 0.95
    }
];

export const Onboarding = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    const [activeIndex, setActiveIndex] = useState(3);
    const scrollRef = useRef<ScrollView>(null);
    const isInitialScrollDone = useRef(false);

    const initialScroll = () => {
        if (!isInitialScrollDone.current) {
            scrollRef.current?.scrollTo({ x: (SLIDES.length - 1) * width, animated: false });
            isInitialScrollDone.current = true;
        }
    };

    const handleComplete = async () => {
        await storage.setItem('@onboarded', 'true');
        router.replace('/(auth)/login');
    };

    const handleNext = () => {
        if (activeIndex === 0) handleComplete();
        else scrollRef.current?.scrollTo({ x: (activeIndex - 1) * width, animated: true });
    };

    const handleScroll = (event: any) => {
        const xOffset = event.nativeEvent.contentOffset.x;
        setActiveIndex(Math.round(xOffset / width));
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                onLayout={initialScroll}
            >
                {SLIDES.map((slide, index) => (
                    <View key={slide.id} style={styles.slide}>
                        <View style={[styles.mediaContainer, { paddingTop: insets.top + 20 }]}>
                            {slide.animation ? (
                                <LottieView 
                                    source={slide.animation} 
                                    autoPlay 
                                    loop 
                                    style={[
                                        styles.animation, 
                                        slide.scale ? { width: width * slide.scale, height: width * slide.scale } : null
                                    ]}
                                    resizeMode="contain"
                                />
                            ) : null}
                        </View>
                        
                        <View style={styles.textContent}>
                            <Text style={[styles.title, { color: theme.primary }]}>{slide.title}</Text>
                            <Text style={[styles.description, { color: theme.muted }]}>{slide.description}</Text>
                            
                            <View style={styles.dots}>
                                {SLIDES.map((_, i) => (
                                    <View key={i} style={[styles.dot, (SLIDES.length - 1 - activeIndex) === i && [styles.activeDot, { backgroundColor: theme.primary }]]} />
                                ))}
                            </View>
                        </View>

                        <View style={[styles.footer, { paddingBottom: insets.bottom + 30 }]}>
                            <Button title={slide.button} onPress={handleNext} style={styles.button} />
                            {index > 0 ? (
                                <TouchableOpacity onPress={handleComplete} style={styles.skip}>
                                    <Text style={{ color: theme.muted }}>تخطي</Text>
                                </TouchableOpacity>
                            ) : <View style={styles.skip} />}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    slide: { width, height, alignItems: 'center' },
    mediaContainer: { 
        flex: 0.6, 
        justifyContent: 'center', 
        alignItems: 'center', 
        width: '100%',
    },
    animation: { 
        width: width * 0.85, 
        height: width * 0.85,
        alignSelf: 'center'
    },
    textContent: { 
        flex: 0.25, 
        alignItems: 'center', 
        width: '100%', 
        paddingHorizontal: 24,
        justifyContent: 'center'
    },
    title: { 
        fontSize: 22, 
        fontWeight: '900', 
        marginBottom: 10, 
        textAlign: 'center' 
    },
    description: { 
        fontSize: 15, 
        textAlign: 'center', 
        lineHeight: 22, 
        marginBottom: 25, 
        fontWeight: '600'
    },
    dots: { 
        flexDirection: 'row-reverse', 
        gap: 8 
    },
    dot: { 
        width: 7, 
        height: 7, 
        borderRadius: 4, 
        backgroundColor: '#EEE' 
    },
    activeDot: { 
        width: 18 
    },
    footer: { 
        flex: 0.15, 
        width: '100%', 
        paddingHorizontal: 24, 
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    button: { 
        width: '100%' 
    },
    skip: { 
        marginTop: 15,
        height: 20
    }
});

