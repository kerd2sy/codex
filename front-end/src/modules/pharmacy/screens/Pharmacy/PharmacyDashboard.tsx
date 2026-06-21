import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Animated, StyleSheet, Text, TouchableOpacity, ScrollView, BackHandler, Dimensions, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
const Notifications = Constants.appOwnership === 'expo' ? null : require('expo-notifications');


import { useRouter } from '@/hooks/useRouter';
import { Colors } from '../../../../core/theme';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Modular Imports
import { useDashboardData } from '../../hooks/useDashboardData';
import { useLocationUpdate } from '../../hooks/useLocationUpdate';
import { 
    BalanceCard, CategoryGrid, RecentProductCard,
    DashboardSearch, PharmacySwitchModal,
    SmallOrderCard, VerificationBanner, UpdateBanner,
    AddPharmacyTourOverlay
} from '../../components';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { useOrders } from '../../hooks/useOrders';
import { getEffectiveDiscount } from '@/utils/product-utils';
import BarcodeScannerModal from '../../../../ui/shared/BarcodeScannerModal';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { StatusModal } from '../../../../ui/shared/StatusModal';
import { DevelopingModal } from '../../../../ui/shared/DevelopingModal';
import { Pharmacy } from '@/api/types';
import { DashboardSkeleton } from '../../../../ui/core/skeletons/DashboardSkeleton';
import { AppRatingModal } from '@/ui/shared/AppRatingModal';

// Using @/assets alias
const CATEGORIES = [
    { id: '1', title: 'المشتريات', imageSource: require('@/assets/images/category_purchases.png') },
    { id: '2', title: 'المرتجعات', imageSource: require('@/assets/images/category_returns.png') },
    { id: '3', title: 'النقدية', imageSource: require('@/assets/images/category_cash.png') },
    { id: '4', title: 'المبيعات', imageSource: require('@/assets/images/category_sales.png') },
];

export const PharmacyDashboard = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    // Hooks
    const {
        currentUser, setCurrentUser,
        selectedPharmacy, setSelectedPharmacy,
        userPharmacies,
        balance, unreadCount,
        recentProducts, refreshing, onRefresh,
        loadUserData, fetchData,
        isInitializing,
        fetchError,
        lastUpdated,
        hasCheckedLocationRef
    } = useDashboardData();
    const { orders, loading: ordersLoading, refresh: ordersRefresh } = useOrders(undefined, selectedPharmacy.id, true);
    const { updateAvailable } = useAppUpdates();

    useEffect(() => {
        if (Notifications) {
            Notifications.setBadgeCountAsync(0);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setDashboardSearchText('');
        loadUserData();
        fetchData();

        const onBackPress = () => {
            BackHandler.exitApp();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [loadUserData, fetchData]));

    const { isUpdatingLocation, handleUpdateLocation } = useLocationUpdate(
        selectedPharmacy.id,
        (updatedUser: any) => setCurrentUser(updatedUser)
    );

    // Module-level variable to keep track of session state
    // This will reset when the app is fully restarted
    
    // Local UI State
    const [locationPromptStep, setLocationPromptStep] = useState(0); 
    const [scannerVisible, setScannerVisible] = useState(false);
    const [dashboardSearchText, setDashboardSearchText] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [verificationAlert, setVerificationAlert] = useState({ visible: false, title: '', message: '' });
    const [isDevelopingModalVisible, setDevelopingModalVisible] = useState(false);
    const [isAccountModalVisible, setAccountModalVisible] = useState(false);
    const [isTourVisible, setIsTourVisible] = useState(false);
    const [tourType, setTourType] = useState<'first_pharmacy' | 'multi_pharmacy'>('first_pharmacy');
    const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
    
    const scrollY = useRef(new Animated.Value(0)).current;
    const locationTimeoutRef = useRef<any>(null);
    const isNavigating = useRef(false);


    // Effects for Modals
    useEffect(() => {
        if (selectedPharmacy.id !== '0' && currentUser) {
            const activePharm = currentUser.pharmacies?.find((p: Pharmacy) => p.id.toString() === selectedPharmacy.id);
            if (activePharm && !activePharm.location_url && !hasCheckedLocationRef.current[selectedPharmacy.id]) {
                const checkLocation = async () => {
                    const dismissed = await AsyncStorage.getItem(`@dismissed_location_${selectedPharmacy.id}`);
                    if (dismissed !== 'true') {
                        if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
                        locationTimeoutRef.current = setTimeout(() => setLocationPromptStep(2), 180 * 1000);
                    }
                };
                checkLocation();
                hasCheckedLocationRef.current[selectedPharmacy.id] = true;
            }
        }
        return () => {
            if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
        };
    }, [selectedPharmacy.id, currentUser]);

    // Tour Logic
    useEffect(() => {
        if (!isInitializing && currentUser) {
            const checkTour = async () => {
                try {
                    if (selectedPharmacy.id === '0') {
                        // Use session variable from global scope
                        const hasPharmacies = currentUser.pharmacies && currentUser.pharmacies.length > 0;
                        if (!hasPharmacies && !(global as any).hasSeenFirstPharmacyTourThisSession) {
                            setTourType('first_pharmacy');
                            setIsTourVisible(true);
                        }
                    } else {
                        const countStr = await AsyncStorage.getItem(`@multi_pharmacy_tour_count_${currentUser.id}`);
                        const count = parseInt(countStr || '0', 10);
                        if (count < 5) {
                            setTourType('multi_pharmacy');
                            setIsTourVisible(true);
                            await AsyncStorage.setItem(`@multi_pharmacy_tour_count_${currentUser.id}`, (count + 1).toString());
                        }
                    }
                } catch (e) {
                    console.error('Error checking tour state:', e);
                }
            };
            checkTour();
        }
    }, [isInitializing, currentUser, selectedPharmacy.id]);

    const handleCloseTour = async () => {
        if (tourType === 'first_pharmacy' && currentUser) {
            (global as any).hasSeenFirstPharmacyTourThisSession = true;
        }
        setIsTourVisible(false);
    };

    // Rating Prompt Logic
    useEffect(() => {
        const checkRatingPrompt = async () => {
            try {
                const hasRated = await AsyncStorage.getItem('has_rated_app');
                if (hasRated === 'true') return;

                const nextPromptStr = await AsyncStorage.getItem('next_rating_prompt_date');
                const now = new Date();
                
                if (nextPromptStr) {
                    const nextPromptDate = new Date(nextPromptStr);
                    if (now >= nextPromptDate) {
                        setIsRatingModalVisible(true);
                    }
                } else {
                    // Show it immediately the first time (or you could delay it)
                    setIsRatingModalVisible(true);
                }
            } catch (e) {
                console.log('Error checking rating prompt:', e);
            }
        };
        
        if (currentUser && !isInitializing) {
            setTimeout(checkRatingPrompt, 3000); // 3 seconds delay so it doesn't block UI rendering
        }
    }, [currentUser, isInitializing]);

    const handlePharmacySwitch = async (pharmacy: Pharmacy) => {
        setAccountModalVisible(false);
        
        setTimeout(async () => {
            setSelectedPharmacy({ 
                id: pharmacy.id.toString(), 
                name: pharmacy.username || pharmacy.name || '',
                kind: pharmacy.kind || 4,
                tier: pharmacy.tier || 1
            });
            await AsyncStorage.setItem('@active_pharmacy_id', pharmacy.id.toString());
            const nameToSave = pharmacy.username || pharmacy.name;
            if (nameToSave) {
                await AsyncStorage.setItem('@active_pharmacy_name', nameToSave);
            }
        }, 300);
    };

    const handleSearch = () => {
        if (dashboardSearchText.trim()) {
            router.push({ pathname: '/(pharmacy)/search', params: { q: dashboardSearchText.trim() } } as any);
        }
    };

    const handleCategoryPress = useCallback((cat: any) => {
        const routes: Record<string, string> = {
            '1': '/(pharmacy)/purchases',
            '2': '/(pharmacy)/returns',
            '3': '/(pharmacy)/cash',
            '4': '/(pharmacy)/sales'
        };
        const path = routes[cat.id];
        if (path) router.push(path as any);
    }, [router]);

    const handleOrderPress = useCallback((order: any) => {
        router.push({ 
            pathname: '/(pharmacy)/purchases/[id]', 
            params: { 
                id: order.id, 
                count: order.items_count || order.count || order.items_qty || order.QTY_ROWS 
            }
        } as any);
    }, [router]);

    if (isInitializing || (ordersLoading && orders.length === 0) || !currentUser) {
        return <DashboardSkeleton />;
    }

    const currentHour = new Date().getHours();
    const isWorkingHours = currentHour >= 9 || currentHour < 5; // 9:00 AM to 4:59 AM

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                currentUser={currentUser}
                selectedPharmacy={selectedPharmacy}
                unreadCount={unreadCount}
                lastUpdated={lastUpdated}
                onPressSwitch={() => {
                    if (selectedPharmacy.id === '0' && currentUser && currentUser.is_email_verified === false) {
                        setVerificationAlert({
                            visible: true,
                            title: 'تنبيه التحقق',
                            message: 'برجاء تفعيل الحساب أولاً لتتمكن من إضافة صيدلياتك'
                        });
                    } else {
                        setAccountModalVisible(true);
                    }
                }}
                onPressProfile={() => router.push('/(pharmacy)/settings')}
                onPressNotifications={() => router.push('/(pharmacy)/notifications')}
            />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            onRefresh();
                            if (typeof ordersRefresh === 'function') ordersRefresh();
                        }}
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
            >
                <VerificationBanner currentUser={currentUser} colorScheme={colorScheme} />
                <UpdateBanner updateAvailable={updateAvailable} colorScheme={colorScheme} />



                <DashboardSearch 
                    theme={theme}
                    value={dashboardSearchText}
                    onChangeText={setDashboardSearchText}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    isFocused={isSearchFocused}
                    onScanPress={() => setScannerVisible(true)}
                    onSubmit={handleSearch}
                />

                <BalanceCard 
                    balance={balance} 
                    error={fetchError}
                    onPress={() => router.push('/(pharmacy)/account-statement')} 
                />
                
                <CategoryGrid 
                    categories={CATEGORIES} 
                    onCategoryPress={handleCategoryPress} 
                />

                {isWorkingHours && selectedPharmacy.id !== '0' && recentProducts.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>اصناف حديثة</Text>
                            {selectedPharmacy.id !== '0' && (
                                <TouchableOpacity onPress={() => router.push('/(pharmacy)/products')}>
                                    <Text style={[styles.viewAll, { color: theme.primary }]}>عرض الكل</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={[styles.recentWrapper, { transform: [{ scaleX: -1 }] }]}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recentList}
                            >
                                {recentProducts.slice(0, 10).map((item) => (
                                    <View key={item.id.toString()} style={{ transform: [{ scaleX: -1 }] }}>
                                        <RecentProductCard 
                                            item={item} 
                                            onPress={() => {}}
                                            effectiveDiscount={getEffectiveDiscount(item, selectedPharmacy)}
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </>
                )}

                { (orders.length > 0 || selectedPharmacy.id === '0') ? (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>تتبع الطلبيات (آخر 5)</Text>
                        </View>
                        {orders.length > 0 ? (
                            orders.slice(0, 5).map((order) => (
                                <SmallOrderCard 
                                    key={order.id} 
                                    order={order} 
                                    theme={theme} 
                                    onPress={() => handleOrderPress(order)}
                                    isInsideCard={false} 
                                />
                            ))
                        ) : (
                            <View 
                                style={[
                                    styles.placeholderCard, 
                                    { backgroundColor: theme.primary + '08', borderColor: theme.primary + '30' }
                                ]}
                            >
                                <Text style={[styles.noPharmacyOrdersText, { color: theme.primary }]}>أضف صيدليتك لعرض آخر الطلبيات هنا</Text>
                            </View>
                        )}
                    </>
                ) : (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>تتبع الطلبيات</Text>
                        </View>
                        <View style={[styles.placeholderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Text style={[styles.noPharmacyOrdersText, { color: theme.muted }]}>لا توجد طلبيات نشطة حالياً</Text>
                        </View>
                    </>
                )}
            </Animated.ScrollView>

            <BarcodeScannerModal 
                isVisible={scannerVisible} 
                onScan={(data) => { 
                    setScannerVisible(false); 
                    router.push({ pathname: '/(pharmacy)/search', params: { q: data } } as any); 
                }} 
                onClose={() => setScannerVisible(false)} 
            />
            
            <PharmacySwitchModal 
                isVisible={isAccountModalVisible}
                onClose={() => setAccountModalVisible(false)}
                pharmacies={userPharmacies}
                onSwitch={handlePharmacySwitch}
                activePharmacyId={selectedPharmacy.id}
                onAdd={() => {
                    if (currentUser && currentUser.is_email_verified === false) {
                        setAccountModalVisible(false);
                        setVerificationAlert({
                            visible: true,
                            title: 'تفعيل الحساب',
                            message: 'برجاء تفعيل حسابك لتتمكن من إضافة صيدليتك وكتابة فاتورتك'
                        });
                    } else {
                        setAccountModalVisible(false);
                        router.push('/(pharmacy)/add-pharmacy');
                    }
                }}
                theme={theme}
            />

            <StatusModal
                visible={verificationAlert.visible}
                type="warning"
                title={verificationAlert.title}
                message={verificationAlert.message}
                confirmLabel="فعل الآن"
                cancelLabel="لاحقاً"
                onConfirm={() => {
                    setVerificationAlert(prev => ({ ...prev, visible: false }));
                    router.push(`/(auth)/verify-email?email=${currentUser?.email}&autoResend=true`);
                }}
                onCancel={() => setVerificationAlert(prev => ({ ...prev, visible: false }))}
            />

            <StatusModal
                visible={locationPromptStep === 2}
                type="location"
                title="أضف موقع الصيدلية"
                message="لتحسين خدمة التوصيل وتسهيل وصول المندوبين"
                confirmLabel="أضف الموقع الآن"
                cancelLabel="لاحقاً"
                loading={isUpdatingLocation}
                onConfirm={async () => {
                    const res = await handleUpdateLocation();
                    if (res) setLocationPromptStep(0);
                }}
                onCancel={() => setLocationPromptStep(0)}
            />

            <DevelopingModal 
                visible={isDevelopingModalVisible} 
                onClose={() => setDevelopingModalVisible(false)} 
                title="الأصناف الحديثة"
                icon="medkit"
                message="جميع ميزات تصفح الأصناف ستكون متاحة قريباً."
            />

            <AddPharmacyTourOverlay 
                visible={isTourVisible} 
                onClose={handleCloseTour} 
                theme={theme} 
                tourType={tourType}
            />

            <AppRatingModal 
                visible={isRatingModalVisible} 
                onClose={() => setIsRatingModalVisible(false)} 
            />
        </View>
    );
};

// ... imported useOrders ...
// ... 

const styles = StyleSheet.create({
    container: { flex: 1 },
    greetingText: {
        fontSize: 16,
        fontWeight: '900',
        marginHorizontal: '5%',
        marginTop: 0,
        marginBottom: 5,
        textAlign: 'right'
    },
    sectionHeader: { 
        flexDirection: 'row-reverse', 
        marginHorizontal: '5%', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: 5, 
        marginBottom: 10 
    },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: '800' 
    },
    viewAll: { 
        fontSize: 14, 
        fontWeight: '700'
    },
    noRecent: {
        paddingHorizontal: 24,
        alignItems: 'center'
    },
    placeholderCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 35,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'solid',
        marginHorizontal: '5%',
        minHeight: 120
    },
    recentWrapper: { 
        marginBottom: 10 
    },
    recentList: { 
        flexDirection: 'row',
        paddingHorizontal: '5%', 
        paddingVertical: 12,
        gap: 16 
    },
    ordersHeaderInside: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    noPharmacyOrdersText: {
        fontSize: 15,
        fontWeight: '800',
    }
});



