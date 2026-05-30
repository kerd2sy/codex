import React, { useState } from 'react';
import { 
  ScrollView, StyleSheet, Text, 
  TextInput, TouchableOpacity, View, 
  ActivityIndicator, Modal, Animated, 
  LayoutAnimation, Platform, UIManager,
  KeyboardAvoidingView, Alert
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import * as Updates from 'expo-updates';
import { usePharmacySettings } from '../../hooks/usePharmacySettings';
import { BaseScreen } from '../../components/BaseScreen';
import { StatusModal } from '../../../../ui/shared/StatusModal';
import { useSystemBars } from '@/hooks/useSystemBars';

const PharmacyAccordion = ({ pharmacy, theme, onUpdateLocation, onSendRequest, onShowStatus }: any) => {
    const [expanded, setExpanded] = useState(false);
    const [name, setName] = useState('');
    const [phone1, setPhone1] = useState('');
    const [phone2, setPhone2] = useState('');
    const [address, setAddress] = useState('');

    return (
        <View style={[styles.accBox, { borderColor: expanded ? theme.primary + '40' : theme.border }]}>
            <TouchableOpacity 
                style={[styles.accHead, { backgroundColor: expanded ? theme.primary + '03' : theme.surface }]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(!expanded); }}
            >
                <View style={styles.accTitleRow}>
                    <View style={[styles.iconBox, { backgroundColor: theme.primary + '10' }]}><Ionicons name="business" size={20} color={theme.primary} /></View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.phName, { color: theme.text }]}>{pharmacy.name}</Text>
                        <Text style={[styles.phCode, { color: theme.muted }]}>كود: {pharmacy.code}</Text>
                    </View>
                </View>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.muted} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.accContent}>
                    {[
                        { label: 'اسم الصيدلية', placeholder: 'ادخل اسم الصيدلية الجديد', value: name, setter: setName, field: 'تعديل الاسم', old: pharmacy.name },
                        { label: 'العنوان', placeholder: 'ادخل العنوان الجديد او الصحيح', value: address, setter: setAddress, field: 'تعديل العنوان', old: pharmacy.address },
                        { label: 'الهاتف الرئيسي', placeholder: 'ادخل هاتف الصيدلية الصحيح', value: phone1, setter: setPhone1, field: 'تغير رقم الهاتف', old: pharmacy.phone || '' },
                        { label: 'الهاتف الإضافي', placeholder: 'ادخل رقم اخر للصيدلية', value: phone2, setter: setPhone2, field: 'تعديل رقم الهاتف الإضافي', old: pharmacy.phone2 || '' },
                    ].map((item, i) => (
                        <View key={i} style={styles.inputGrp}>
                            <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
                            <View style={[styles.inputWrap, { borderColor: theme.border }]}>
                                <TextInput 
                                    style={[styles.input, { color: theme.text }]} 
                                    value={item.value} 
                                    onChangeText={item.setter} 
                                    placeholder={item.placeholder}
                                    placeholderTextColor={theme.muted}
                                    textAlign="right" 
                                />
                                <TouchableOpacity onPress={async () => { if (await onSendRequest(pharmacy.id, item.field, item.value, item.old)) onShowStatus('success', 'تم إرسال الطلب بنجاح'); else onShowStatus('error', 'فشل إرسال الطلب'); }}>
                                    <Text style={[styles.reqTxt, { color: theme.primary }]}>طلب تعديل</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

export const PharmacySettings = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { pharmacies, currentUser, loading, updateLocation, sendUpdateRequest } = usePharmacySettings();
    const [status, setStatus] = useState<any>({ visible: false, type: 'success', title: '', message: '' });

    const handleAddPharmacy = () => {
        if (currentUser && currentUser.is_email_verified === false) {
            setStatus({
                visible: true,
                type: 'warning',
                title: 'تنبيه التحقق',
                message: 'برجاء تفعيل الحساب أولاً لتتمكن من إضافة صيدلياتك'
            });
        } else {
            router.push('/(pharmacy)/add-pharmacy' as any);
        }
    };

    return (
        <BaseScreen 
            title="بيانات الصيدلية"
            status={status.visible ? {
                visible: true,
                type: status.type,
                title: status.title,
                message: status.message,
                onConfirm: () => {
                    setStatus({ ...status, visible: false });
                    if (status.type === 'warning') {
                        router.push(`/(auth)/verify-email?email=${currentUser?.email}`);
                    }
                },
                onCancel: () => setStatus({ ...status, visible: false })
            } : undefined}
        >
            {pharmacies.length > 0 && (
                <View style={[styles.note, { backgroundColor: theme.primary + '05', borderColor: theme.primary + '20' }]}>
                    <Ionicons name="information-circle" size={24} color={theme.primary} />
                    <Text style={[styles.noteTxt, { color: theme.text }]}>يمكنك طلب تعديل بيانات الصيدلية للمراجعة من قبل الإدارة.</Text>
                </View>
            )}
            
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} />
            ) : pharmacies.length > 0 ? (
                pharmacies.map(p => (
                    <PharmacyAccordion 
                        key={p.id} 
                        pharmacy={p} 
                        theme={theme} 
                        onUpdateLocation={async (id: string) => { 
                            const res = await updateLocation(id); 
                            if (res?.success) setStatus({ visible: true, type: 'success', title: 'تم التحديث', message: res.success }); 
                            else if (res?.error) setStatus({ visible: true, type: 'error', title: 'فشل التحديث', message: res.error }); 
                        }} 
                        onSendRequest={sendUpdateRequest} 
                        onShowStatus={(type: any, message: any) => {
                            const title = type === 'success' ? 'تم إرسال الطلب' : 'تنبيه';
                            setStatus({ visible: true, type, title, message });
                        }} 
                    />
                ))
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={[styles.emptyIconBox, { backgroundColor: theme.primary + '10' }]}>
                            <Ionicons name="business" size={40} color={theme.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>لا توجد صيدليات مرتبطة</Text>
                        <Text style={[styles.emptySub, { color: theme.muted }]}>
                            قم بإضافة صيدليتك الآن لتتمكن من متابعة الفواتير، الطلبيات، وكشف الحساب الخاص بك.
                        </Text>
                        
                        <TouchableOpacity 
                            style={[styles.addBtn, { backgroundColor: theme.primary }]} 
                            onPress={handleAddPharmacy}
                        >
                            <Ionicons name="add-circle" size={22} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>أضف صيدليتك الآن</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 24 },
    headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    headerTitleContainer: { alignItems: 'flex-end', flex: 1 },
    title: { fontSize: 18, fontWeight: '900' },
    titleLine: { width: 25, height: 4, borderRadius: 2, marginTop: -2 },
    backBtn: { padding: 4, marginLeft: -4 },
    scroll: { padding: 20 },
    note: { padding: 15, borderRadius: 16, borderWidth: 1, flexDirection: 'row-reverse', gap: 10, marginBottom: 20 },
    noteTxt: { flex: 1, fontSize: 13, textAlign: 'right', fontWeight: '600' },
    accBox: { borderRadius: 20, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
    accHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
    accTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    phName: { fontSize: 16, fontWeight: '800' },
    emptyContainer: { 
        paddingHorizontal: '5%', 
        paddingTop: 40,
        alignItems: 'center' 
    },
    emptyCard: {
        width: '100%',
        padding: 30,
        borderRadius: 32,
        borderWidth: 1,
        alignItems: 'center',
        elevation: 2,
        shadowOpacity: 0.05
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center'
    },
    emptySub: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        opacity: 0.8
    },
    addBtn: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: 55, 
        borderRadius: 18, 
        paddingHorizontal: 30, 
        gap: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8
    },
    phCode: { fontSize: 12, fontWeight: '600' },
    accContent: { padding: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 15 },
    inputGrp: { gap: 5 },
    label: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
    inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 50 },
    input: { flex: 1, height: '100%', textAlign: 'right', fontSize: 14, fontWeight: '700' },
    reqTxt: { fontSize: 12, fontWeight: '900', paddingLeft: 5 },
    locBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', height: 45, borderRadius: 12, gap: 8 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
    modal: { borderRadius: 24, padding: 30, alignItems: 'center', gap: 15 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    closeBtn: { width: '100%', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    updateCard: { 
        flexDirection: 'row-reverse', 
        padding: 16, 
        borderRadius: 24, 
        borderWidth: 1, 
        alignItems: 'center', 
        marginTop: 10,
        marginBottom: 20 
    },
    updateIconBox: { 
        width: 50, 
        height: 50, 
        borderRadius: 15, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginLeft: 15 
    },
    updateInfo: { flex: 1, alignItems: 'flex-end' },
    updateTitle: { fontSize: 16, fontWeight: '800' },
    updateSub: { fontSize: 12, fontWeight: '600' }
});

