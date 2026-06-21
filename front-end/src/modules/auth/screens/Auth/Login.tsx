import React, { useRef, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { AuthContainer } from '@/ui/core/layout/AuthContainer';
import { Button } from '@/ui/core/form/Button';
import { Input } from '@/ui/core/form/Input';
import { StatusModal } from '@/ui/shared/StatusModal';
import { Ionicons } from '@expo/vector-icons';
import { useLogin } from '../../hooks/useLogin';
import { storage } from '@/utils/storage';
import { useRouter } from '@/hooks/useRouter';

const InlineTooltip = ({ text, visible, onNext, isTop = false, theme }: any) => {
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(translateY, { toValue: isTop ? -5 : 5, duration: 500, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true })
                ])
            ).start();
        }
    }, [visible]);

    if (!visible) return null;
    return (
        <Animated.View style={[
            styles.tooltipBox, 
            { backgroundColor: theme.surface, transform: [{ translateY }] },
            isTop ? { top: '100%', marginTop: 20 } : { bottom: '100%', marginBottom: 20 }
        ]}>
            {!isTop && (
                <View style={{ position: 'absolute', bottom: -18 }}>
                    <Ionicons name="arrow-down" size={24} color={theme.surface} />
                </View>
            )}
            
            {isTop && (
                <View style={{ position: 'absolute', top: -18 }}>
                    <Ionicons name="arrow-up" size={24} color={theme.surface} />
                </View>
            )}
            
            <Text style={[styles.tooltipText, { color: theme.text }]}>{text}</Text>
            <TouchableOpacity onPress={onNext} style={[styles.tooltipBtn, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.tooltipBtnText, { color: theme.primary }]}>حسناً، فهمت</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const Login = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const googleRef = useRef<LottieView>(null);
    const emailRef = useRef<any>(null);
    const passwordRef = useRef<any>(null);
    const router = useRouter();

    const {
        email, setEmail,
        password, setPassword,
        loading, modal, setModal,
        isBioSupported, isBioEnabled,
        handleLogin, handleGoogleLogin, handleBiometricLogin,
        processAuthUrl
    } = useLogin(googleRef);

    const [tourStep, setTourStep] = useState(0);

    useEffect(() => {
        const checkTour = async () => {
            const hasSeen = await AsyncStorage.getItem('@has_seen_login_tour');
            if (hasSeen !== 'true') {
                setTourStep(1);
            }
        };
        checkTour();
    }, []);

    const nextTour = async () => {
        if (tourStep === 1) {
            setTourStep(2);
        } else if (tourStep === 2) {
            setTourStep(0);
            await AsyncStorage.setItem('@has_seen_login_tour', 'true');
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            console.log("[Login] Checking auth state...");
            const user = await storage.getItem('user');
            const token = await storage.getItem('access_token');
            const bioEnabled = await storage.getItem('user_biometric_enabled');
            const hasLoggedOut = await storage.getItem('user_has_logged_out');
            
            console.log("[Login] State:", { hasUser: !!user, hasToken: !!token, hasLoggedOut });

            if (user && token && bioEnabled !== 'true') {
                console.log("[Login] Valid session found, redirecting to dashboard...");
                const userData = JSON.parse(user);
                
                const empRole = userData.employee_role || '';
                const userRoles = userData.roles || [];
                const hasRole = (role: string) => userRoles.includes(role) || empRole === role;

                if (hasRole('admin')) router.replace('/(admin)/dashboard');
                else if (hasRole('gomla')) router.replace('/(gomla)/dashboard');
                else if (hasRole('employee') || ['employee', 'reviewer', 'preparation', 'control', 'distribution'].some(hasRole)) router.replace('/(employee)/dashboard');
                else router.replace('/(pharmacy)');
            } else if (!user || !token) {
                console.log("[Login] No session. Manual login required.");
            }
        };
        checkAuth();

        const subscription = Linking.addEventListener('url', ({ url }) => {
            console.log("[Login] Deep link received:", url);
            processAuthUrl(url);
        });
        return () => subscription.remove();
    }, []);

    return (
        <AuthContainer title="تسجيل الدخول" subtitle="يرجى تسجيل الدخول إلى حسابك الحالي" showBack={false}>
            <View style={styles.form}>
                {tourStep > 0 && (
                    <TouchableOpacity 
                        activeOpacity={1}
                        style={{
                            position: 'absolute',
                            top: -2000, bottom: -2000, left: -1000, right: -1000,
                            backgroundColor: 'rgba(0,0,0,0.75)',
                            zIndex: 90
                        }} 
                    />
                )}

                <Input
                    ref={emailRef}
                    label="البريد الإلكتروني"
                    placeholder="ph@tabarak-pharma.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <Input
                    ref={passwordRef}
                    label="كلمة المرور"
                    placeholder="••••••••••••"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    showPasswordToggle={true}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                />

                <View style={styles.optionsRow}>
                    <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                        <Text style={styles.forgotPass}>نسيت كلمة المرور؟</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.loginActionsRow}>
                    <Button
                        title="تسجيل الدخول"
                        onPress={handleLogin}
                        loading={loading}
                        variant="primary"
                        style={styles.btnFlex}
                    />
                    {isBioSupported && isBioEnabled && (
                        <TouchableOpacity 
                            style={[styles.bioIconBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                            onPress={handleBiometricLogin}
                        >
                            <Ionicons name="finger-print" size={28} color={theme.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={[
                    styles.footer, 
                    tourStep === 1 && { zIndex: 100, backgroundColor: theme.surface, padding: 10, borderRadius: 12 }
                ]}>
                    <Text style={styles.footerText}>ليس لديك حساب؟</Text>
                    <View style={{ position: 'relative' }}>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={tourStep > 0}>
                            <Text style={styles.registerLink}> إنشاء حساب </Text>
                        </TouchableOpacity>
                        <InlineTooltip 
                            text="قم بإنشاء حساب جديد بواسطة الإيميل"
                            visible={tourStep === 1}
                            onNext={nextTour}
                            isTop={false}
                            theme={theme}
                        />
                    </View>
                </View>

                <View style={[
                    styles.googleSection, 
                    tourStep === 2 && { zIndex: 100, backgroundColor: theme.surface, paddingVertical: 15, borderRadius: 20 }
                ]}>
                    <View style={styles.separatorRow}>
                        <View style={styles.line} /><Text style={styles.googleLabel}>الدخول بواسطة جوجل</Text><View style={styles.line} />
                    </View>
                    <View style={{ position: 'relative', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.googleBtn} activeOpacity={0.6} onPress={handleGoogleLogin} disabled={tourStep > 0}>
                            <LottieView
                                ref={googleRef}
                                source={require('@/assets/json/RemixGoogleLogo.json')}
                                autoPlay={false} 
                                loop={false} 
                                style={styles.googleAnim}
                                onAnimationFinish={() => {
                                    googleRef.current?.reset();
                                }}
                            />
                        </TouchableOpacity>
                        <InlineTooltip 
                            text="أو الدخول مباشرة بواسطة جوجل، الأسهل والأسرع!"
                            visible={tourStep === 2}
                            onNext={nextTour}
                            isTop={false}
                            theme={theme}
                        />
                    </View>
                </View>
            </View>

            <StatusModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={() => setModal({ ...modal, visible: false })}
            />
        </AuthContainer>
    );
};

const styles = StyleSheet.create({
    form: { paddingTop: 10 },
    optionsRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginBottom: 35, alignItems: 'center' },
    forgotPass: { fontSize: 13, fontWeight: '900', color: '#FF7E47' }, 
    loginActionsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, width: '100%' },
    btnFlex: { flex: 1, backgroundColor: '#FF7E47', height: 58, borderRadius: 15, elevation: 8, shadowColor: '#FF7E47', shadowOpacity: 0.4, shadowRadius: 15 },
    bioIconBtn: { width: 58, height: 58, borderRadius: 15, borderWidth: 1, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    footer: { marginTop: 35, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: 14, color: '#666', fontWeight: '800' },
    registerLink: { fontSize: 14, fontWeight: '900', color: '#FF7E47' },
    googleSection: { marginTop: 45, alignItems: 'center' },
    separatorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
    line: { flex: 1, height: 1, backgroundColor: '#F1F4F9' },
    googleLabel: { fontSize: 12, fontWeight: '800', color: '#BBB', marginHorizontal: 15, textAlign: 'center' },
    googleBtn: { width: 150, height: 150, marginTop: -35, marginBottom: -35, alignItems: 'center', justifyContent: 'center' },
    googleAnim: { width: 150, height: 150 },
    tooltipBox: {
        position: 'absolute',
        width: 180,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        zIndex: 999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        alignSelf: 'center',
    },
    tooltipArrow: {
        position: 'absolute',
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    tooltipText: {
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 20,
    },
    tooltipBtn: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    tooltipBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
    }
});

