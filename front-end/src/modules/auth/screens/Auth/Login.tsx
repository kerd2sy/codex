import React, { useRef, useEffect } from 'react';
import LottieView from 'lottie-react-native';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
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
                if (userData.role === 'admin') router.replace('/(admin)/dashboard');
                else if (userData.role === 'gomla') router.replace('/(gomla)/dashboard');
                else router.replace('/(pharmacy)');
            } else if (!user || !token) {
                console.log("[Login] No session. Auto-login check:", hasLoggedOut !== 'true');
                // Only trigger auto-google login if the user has NOT explicitly logged out (e.g. first run)
                if (hasLoggedOut !== 'true') {
                    setTimeout(() => { 
                        console.log("[Login] Triggering auto-google login...");
                        if (!loading) handleGoogleLogin(); 
                    }, 1500);
                }
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

                <View style={styles.footer}>
                    <Text style={styles.footerText}>ليس لديك حساب؟</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text style={styles.registerLink}> إنشاء حساب </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.googleSection}>
                    <View style={styles.separatorRow}>
                        <View style={styles.line} /><Text style={styles.googleLabel}>الدخول بواسطة جوجل</Text><View style={styles.line} />
                    </View>
                    <TouchableOpacity style={styles.googleBtn} activeOpacity={0.6} onPress={handleGoogleLogin}>
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
    googleAnim: { width: 150, height: 150 }
});

