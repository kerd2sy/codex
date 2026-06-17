import { useState, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin: any = null;
let statusCodes: any = {};

if (!isExpoGo) {
    try {
        const GoogleModule = require('@react-native-google-signin/google-signin');
        GoogleSignin = GoogleModule.GoogleSignin;
        statusCodes = GoogleModule.statusCodes;
    } catch (e) {
        console.warn("[Auth] Failed to load Google Signin module:", e);
    }
}
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Linking from 'expo-linking';
import { useRouter } from '@/hooks/useRouter';
import { storage } from '@/utils/storage';
import { apiFetch, API_ENDPOINTS, parseApiError, API_URL } from '@/api/api-client';
import { AuthResponse, User } from '@/api/types';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

export const useLogin = (googleRef: React.RefObject<any>) => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ 
        visible: false, 
        type: 'error' as ModalType, 
        title: '', 
        message: '' 
    });

    const [isBioSupported, setIsBioSupported] = useState(false);
    const [isBioEnabled, setIsBioEnabled] = useState(false);

    useEffect(() => {
        if (GoogleSignin) {
            try {
                GoogleSignin.configure({
                    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '704097706178-ke9jk5vn9p2862pg04535u8qm63fmfbp.apps.googleusercontent.com',
                    offlineAccess: true,
                });
            } catch (err) {
                console.warn("[Auth] Google Signin configuration failed:", err);
            }
        }

        const checkBio = async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            const enabled = await storage.getItem('user_biometric_enabled');
            setIsBioSupported(compatible && enrolled);
            setIsBioEnabled(enabled === 'true');
        };
        checkBio();
    }, []);

    const saveSession = async (data: AuthResponse) => {
        await storage.setItem('access_token', data.access_token);
        if (data.refresh_token) await storage.setItem('refresh_token', data.refresh_token);
        
        const user = { ...data.user, provider: data.user.provider || 'email' };
        await storage.setItem('user', JSON.stringify(user));
        const now = Date.now().toString();
        await storage.setItem('last_login_timestamp', now);
        await storage.setItem('last_biometric_auth_timestamp', now);
        await storage.setItem('user_has_logged_out', 'false');

        const empRole = user.employee_role || '';
        const userRoles = user.roles || [];

        const hasRole = (role: string) => userRoles.includes(role) || empRole === role;

        if (hasRole('admin')) {
            router.replace('/(admin)/dashboard');
        } else if (hasRole('gomla')) {
            router.replace('/(gomla)/dashboard');
        } else if (hasRole('employee') || ['employee', 'reviewer', 'preparation', 'control', 'distribution'].some(hasRole)) {
            router.replace('/(employee)/dashboard');
        } else {
            router.replace('/(pharmacy)');
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setModal({ visible: true, type: 'warning', title: 'بيانات ناقصة', message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور للمتابعة' });
            return;
        }

        setLoading(true);
        try {
            const deviceInfo = {
                name: Device.deviceName || 'جهاز غير معروف',
                model: Device.modelName || 'N/A',
                platform: Platform.OS,
                location: 'غير محدد'
            };

            const res = await apiFetch<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, password, device_info: deviceInfo })
            });
            const data = await res.json();
            
            if (res.ok) {
                await saveSession(data);
            } else {
                if (res.status === 401) {
                    setModal({ visible: true, type: 'error', title: 'كلمة السر خطأ', message: 'تأكد من كتابة كلمة المرور بشكل صحيح وأعد المحاولة' });
                } else if (res.status === 404) {
                    setModal({ visible: true, type: 'error', title: 'بريد غير مسجل', message: 'هذا البريد الإلكتروني غير مرتبط بأي حساب لدينا' });
                } else {
                    setModal({ visible: true, type: 'error', title: 'فشل الدخول', message: parseApiError(data) });
                }
            }
        } catch (e) {
            setModal({ visible: true, type: 'error', title: 'خطأ في الاتصال', message: 'تعذر الوصول للسيرفر، يرجى التحقق من اتصال الإنترنت' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!GoogleSignin) {
            Alert.alert("تنبيه", "تسجيل الدخول بواسطة جوجل غير متوفر في بيئة المطور (Expo Go). يرجى تسجيل الدخول بالبريد الإلكتروني.");
            return;
        }
        googleRef.current?.play(0, 150);
        
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            
            if (userInfo.data?.idToken) {
                setLoading(true);
                try {
                    const response = await apiFetch<AuthResponse>('/api/v1/auth/google-native', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            idToken: userInfo.data.idToken,
                            user: userInfo.data.user
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        await saveSession(data);
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        Alert.alert("خطأ", "فشل التحقق من الحساب مع السيرفر: " + (errorData.detail || "كود غير صالح"));
                    }
                } catch (e: any) {
                    Alert.alert("خطأ تقني", `فشلت عملية المصافحة الآمنة مع السيرفر: ${e.message || String(e)}`);
                } finally {
                    setLoading(false);
                }
            }
        } catch (error: any) {
            if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
                const msg = error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE 
                    ? "خدمات جوجل بلاي غير متوفرة" 
                    : "حدث خطأ أثناء الاتصال بجوجل: " + error.message;
                Alert.alert("خطأ", msg);
            }
        }
    };

    const handleBiometricLogin = async () => {
        const auth = await LocalAuthentication.authenticateAsync({
            promptMessage: 'قم بتأكيد هويتك لتسجيل الدخول',
            cancelLabel: 'إلغاء',
        });

        if (auth.success) {
            setLoading(true);
            try {
                let token = await storage.getItem('access_token');
                if (!token) {
                    const refreshToken = await storage.getItem('refresh_token');
                    if (refreshToken) {
                        try {
                            const refreshRes = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${refreshToken}` }
                            });
                            if (refreshRes.ok) {
                                const data = await refreshRes.json();
                                await storage.setItem('access_token', data.access_token);
                                await storage.setItem('refresh_token', data.refresh_token);
                            } else {
                                Alert.alert("الجلسة منتهية", "يرجى تسجيل الدخول مجدداً (بجوجل أو البريد) لتجديد جلستك.");
                                return;
                            }
                        } catch (e) {
                            Alert.alert("خطأ في الاتصال", "تعذر الاتصال بالسيرفر. تأكد من الإنترنت وحاول مجدداً.");
                            return;
                        }
                    } else {
                        Alert.alert("الجلسة منتهية", "انتهت صلاحية الجلسة بالكامل. يرجى تسجيل الدخول مجدداً (بجوجل أو البريد).");
                        return;
                    }
                }

                const res = await apiFetch<User>(API_ENDPOINTS.AUTH.ME);
                if (res.ok) {
                    const userData = await res.json();
                    await storage.setItem('user', JSON.stringify(userData));
                    await storage.setItem('last_biometric_auth_timestamp', Date.now().toString());

                    const empRole = userData.employee_role || '';
                    const userRoles = userData.roles || [];
                    const hasRole = (role: string) => userRoles.includes(role) || empRole === role;

                    if (hasRole('admin')) router.replace('/(admin)/dashboard');
                    else if (hasRole('gomla')) router.replace('/(gomla)/dashboard');
                    else if (hasRole('employee') || ['employee', 'reviewer', 'preparation', 'control', 'distribution'].some(hasRole)) router.replace('/(employee)/dashboard');
                    else router.replace('/(pharmacy)');
                    return;
                } else {
                    Alert.alert("الجلسة منتهية", "يرجى تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور لتجديد جلستك قبل استخدام البصمة.");
                }
            } catch (e) {
                Alert.alert("خطأ في الاتصال", "تعذر الاتصال بالسيرفر. تأكد من الإنترنت وحاول مجدداً.");
            } finally {
                setLoading(false);
            }


            setModal({ 
                visible: true, 
                type: 'error', 
                title: 'انتهت الجلسة', 
                message: 'يرجى تسجيل الدخول يدوياً بكلمة المرور هذه المرة' 
            });
        }
    };

    const processAuthUrl = async (url: string) => {
        if (url.includes('/auth') && url.includes('exchange_code=')) {
            const { queryParams } = Linking.parse(url);
            const code = queryParams?.exchange_code as string;
            
            if (code) {
                setLoading(true);
                try {
                    const response = await apiFetch<AuthResponse>('/api/v1/auth/exchange', {
                        method: 'POST',
                        body: JSON.stringify({ code })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        await saveSession(data);
                    } else {
                        Alert.alert("خطأ في المصافحة", "كود التوثيق منتهي أو غير صالح");
                    }
                } catch (e: any) {
                    Alert.alert("خطأ تقني", `فشلت عملية المصافحة الآمنة: ${e.message || String(e)}`);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    return {
        email, setEmail,
        password, setPassword,
        loading, modal, setModal,
        isBioSupported, isBioEnabled,
        handleLogin, handleGoogleLogin, handleBiometricLogin,
        processAuthUrl
    };
};


