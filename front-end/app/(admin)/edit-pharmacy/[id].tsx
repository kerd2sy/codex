import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
    TextInput, ScrollView, StatusBar, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/api/api-client';

const CustomSelect = ({ label, value, options, onSelect, theme }: any) => {
    const [modalVisible, setModalVisible] = useState(false);
    
    const selectedOption = options?.find((o: any) => o.id === value);
    const displayValue = selectedOption ? selectedOption.name : 'بدون تحديد';

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <TouchableOpacity 
                style={[styles.selectBox, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="chevron-down" size={20} color={theme.muted} />
                <Text style={[styles.selectText, { color: theme.text }]}>{displayValue}</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
                        <View style={styles.sheetHeader}>
                            <Text style={[styles.sheetTitle, { color: theme.text }]}>اختر {label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color={theme.muted} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                            {options?.map((opt: any) => (
                                <TouchableOpacity 
                                    key={opt.id}
                                    style={[
                                        styles.sheetItem, 
                                        { borderBottomColor: theme.border + '50' },
                                        value === opt.id && { backgroundColor: theme.primary + '15' }
                                    ]}
                                    onPress={() => {
                                        onSelect(opt.id);
                                        setModalVisible(false);
                                    }}
                                >
                                    {value === opt.id ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : <View style={{ width: 22 }} />}
                                    <Text style={[styles.sheetItemText, { color: theme.text }]}>{opt.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default function EditPharmacyScreen() {
    const router = useRouter();
    const { id, pharmaData } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [editData, setEditData] = useState<any>({});
    const [employees, setEmployees] = useState<{reps: any[], dists: any[], others: any[]}>({ reps: [], dists: [], others: [] });
    const [updating, setUpdating] = useState(false);
    const [loading, setLoading] = useState(true);

    const TIER_MAP: any = {
        0: 'بدون شريحة',
        1: 'صيدلية',
        2: 'جملة',
        3: 'عميل / مندوب',
        4: 'كبار عملاء',
        5: 'شركات'
    };

    useEffect(() => {
        if (pharmaData) {
            try {
                const pharma = JSON.parse(pharmaData as string);
                setEditData({
                    name: pharma.name,
                    limit: pharma.limit.toString(),
                    kind: pharma.kind.toString(),
                    tel1: pharma.tel1,
                    tel2: pharma.tel2,
                    emp_id: pharma.emp_id,
                    evening_id: pharma.evening_id || 0,
                    dist_id: pharma.dist_id || 0,
                    status: pharma.status !== undefined ? pharma.status : 0
                });
            } catch (e) {
                console.error("Failed to parse pharmaData", e);
            }
        }
        fetchEmployees();
    }, [pharmaData]);

    const fetchEmployees = async () => {
        try {
            const res = await apiFetch('/api/v1/admin/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            const res = await apiFetch(`/api/v1/admin/pharmacies/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: editData.name,
                    limit: parseFloat(editData.limit || '0'),
                    kind: parseInt(editData.kind),
                    tel1: editData.tel1,
                    tel2: editData.tel2,
                    emp_id: editData.emp_id,
                    evening_id: editData.evening_id,
                    dist_id: editData.dist_id,
                    status: editData.status
                })
            });

            if (res.ok) {
                router.back();
            }
        } catch (error) {
            console.error('Error updating pharmacy:', error);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity style={[styles.backCircle, { backgroundColor: theme.background }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-forward" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>تعديل الصيدلية #{id}</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>حالة العميل</Text>
                        <View style={styles.radioGridVertical}>
                            <TouchableOpacity 
                                style={[
                                    styles.radioItemRow, 
                                    { borderColor: theme.border },
                                    editData.status === 0 && { backgroundColor: theme.success, borderColor: theme.success }
                                ]}
                                onPress={() => setEditData({...editData, status: 0})}
                            >
                                <Ionicons name={editData.status === 0 ? "radio-button-on" : "radio-button-off"} size={20} color={editData.status === 0 ? "#FFF" : theme.muted} />
                                <Text style={[
                                    styles.radioText, 
                                    { color: theme.text },
                                    editData.status === 0 && { color: '#FFF' }
                                ]}>
                                    متاح التعامل
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    styles.radioItemRow, 
                                    { borderColor: theme.border },
                                    editData.status === 1 && { backgroundColor: theme.error, borderColor: theme.error }
                                ]}
                                onPress={() => setEditData({...editData, status: 1})}
                            >
                                <Ionicons name={editData.status === 1 ? "radio-button-on" : "radio-button-off"} size={20} color={editData.status === 1 ? "#FFF" : theme.muted} />
                                <Text style={[
                                    styles.radioText, 
                                    { color: theme.text },
                                    editData.status === 1 && { color: '#FFF' }
                                ]}>
                                    موقوف التعامل
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    styles.radioItemRow, 
                                    { borderColor: theme.border },
                                    editData.status === 2 && { backgroundColor: theme.muted, borderColor: theme.muted }
                                ]}
                                onPress={() => setEditData({...editData, status: 2})}
                            >
                                <Ionicons name={editData.status === 2 ? "radio-button-on" : "radio-button-off"} size={20} color={editData.status === 2 ? "#FFF" : theme.muted} />
                                <Text style={[
                                    styles.radioText, 
                                    { color: theme.text },
                                    editData.status === 2 && { color: '#FFF' }
                                ]}>
                                    غير متعامل
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>اسم الصيدلي / الصيدلية</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            value={editData.name}
                            onChangeText={(v) => setEditData({...editData, name: v})}
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>الحد الائتماني</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            value={editData.limit}
                            onChangeText={(v) => setEditData({...editData, limit: v})}
                            keyboardType="numeric"
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                            <Text style={[styles.label, { color: theme.text }]}>رقم الهاتف 2</Text>
                            <TextInput 
                                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                value={editData.tel2}
                                onChangeText={(v) => setEditData({...editData, tel2: v})}
                                keyboardType="phone-pad"
                                textAlign="right"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: theme.text }]}>رقم الهاتف 1</Text>
                            <TextInput 
                                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                value={editData.tel1}
                                onChangeText={(v) => setEditData({...editData, tel1: v})}
                                keyboardType="phone-pad"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>الشريحة</Text>
                        <View style={styles.radioGrid}>
                            {[0, 1, 2, 3, 4, 5].map((t) => (
                                <TouchableOpacity 
                                    key={t}
                                    style={[
                                        styles.radioItem, 
                                        { borderColor: theme.border },
                                        editData.kind === t.toString() && { backgroundColor: theme.primary, borderColor: theme.primary }
                                    ]}
                                    onPress={() => setEditData({...editData, kind: t.toString()})}
                                >
                                    <Text style={[
                                        styles.radioText, 
                                        { color: theme.text },
                                        editData.kind === t.toString() && { color: '#FFF' }
                                    ]}>
                                        {TIER_MAP[t]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <CustomSelect 
                        label="المندوب الصباحي"
                        value={editData.emp_id}
                        options={[{ id: 0, name: 'بدون مندوب' }, ...(employees?.reps || [])]}
                        onSelect={(val: number) => setEditData({...editData, emp_id: val})}
                        theme={theme}
                    />

                    <CustomSelect 
                        label="المندوب المسائي"
                        value={editData.evening_id}
                        options={[{ id: 0, name: 'بدون مندوب' }, ...(employees?.reps || [])]}
                        onSelect={(val: number) => setEditData({...editData, evening_id: val})}
                        theme={theme}
                    />

                    <CustomSelect 
                        label="الموزع (التحصيل)"
                        value={editData.dist_id}
                        options={[{ id: 0, name: 'بدون موزع' }, ...(employees?.dists || [])]}
                        onSelect={(val: number) => setEditData({...editData, dist_id: val})}
                        theme={theme}
                    />
                    
                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: theme.primary }]} 
                        onPress={handleUpdate}
                        disabled={updating}
                    >
                        {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>}
                    </TouchableOpacity>
                    
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1
    },
    backCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20 },
    
    inputGroup: { marginBottom: 20 },
    inputRow: { flexDirection: 'row-reverse' },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'right' },
    input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 14 },
    
    // Bottom Sheet Select
    selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15 },
    selectText: { fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40, maxHeight: '70%' },
    sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)' },
    sheetTitle: { fontSize: 18, fontWeight: 'bold' },
    sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1 },
    sheetItemText: { fontSize: 16, fontWeight: '600' },

    saveBtn: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    
    // Radio Group
    radioGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    radioGridVertical: { flexDirection: 'column', gap: 8 },
    radioItem: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, minWidth: '30%', alignItems: 'center' },
    radioItemRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, gap: 10 },
    radioText: { fontSize: 14, fontWeight: 'bold' }
});
