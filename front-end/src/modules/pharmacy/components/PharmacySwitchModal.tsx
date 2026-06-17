import React, { memo } from 'react';
import { 
    View, Text, Modal, TouchableOpacity, 
    StyleSheet, Dimensions, FlatList, Pressable 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pharmacy } from '@/api/types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface PharmacySwitchModalProps {
  isVisible: boolean;
  onClose: () => void;
  pharmacies: Pharmacy[];
  onSwitch: (pharmacy: Pharmacy) => void;
  onAdd: () => void;
  theme: any;
  activePharmacyId: string;
}

export const PharmacySwitchModal = memo(({ 
    isVisible, onClose, pharmacies, onSwitch, onAdd, theme, activePharmacyId 
}: PharmacySwitchModalProps) => {
    const insets = useSafeAreaInsets();
    
    // Theme-based colors extracted directly from the theme prop
    const modalBg = [theme.surface, theme.background];
    const cardBg = theme.card;
    const cardBorder = theme.border;
    const textColor = theme.text;
    const subTextColor = theme.muted;
    const iconBoxBg = theme.surface;
    const closeBtnBg = theme.card;
    const closeIconColor = theme.text;

    const isDark = theme.background !== '#FFFFFF'; // Slightly better check

    return (
        <Modal 
            visible={isVisible} 
            transparent 
            animationType="slide" 
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                    <LinearGradient
                        colors={modalBg as any}
                        style={[
                            styles.modalContent, 
                            { maxHeight: SCREEN_HEIGHT * 0.52, paddingBottom: Math.max(insets.bottom, 20) + 10 }



                        ]}
                    >
                    <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                    
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>تبديل الصيدلية</Text>
                            <Text style={[styles.modalSubtitle, { color: subTextColor }]}>اختار صيدليتك لمعرفة بيناتها</Text>
                        </View>
                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: closeBtnBg }]} onPress={onClose}>
                            <Ionicons name="close" size={24} color={closeIconColor} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={pharmacies}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        style={{ flexGrow: 1 }} // Allow it to take space but scrollable
                        ListEmptyComponent={() => (
                            <View style={styles.emptyBox}>
                                <LottieView 
                                    source={require('@/assets/json/pharmacy.json')} 
                                    autoPlay 
                                    loop={false}
                                    style={{ width: 300, height: 300, marginBottom: -40, marginTop: -20 }} 
                                />
                                <Text style={[styles.emptyText, { color: textColor }]}>لا توجد صيدليات مسجلة بعد</Text>
                                <Text style={[styles.emptySubText, { color: subTextColor }]}>أضف صيدليتك الأولى وابدأ إدارة مبيعاتك</Text>
                            </View>
                        )}
                        renderItem={({ item }) => {
                            const isActive = activePharmacyId === item.id.toString();
                            return (
                                <TouchableOpacity 
                                    activeOpacity={0.85}
                                    style={[
                                        styles.pharmacyCard,
                                        { backgroundColor: cardBg, borderColor: cardBorder },
                                        isActive && [styles.activePharmacyCard, { backgroundColor: isDark ? 'rgba(255, 126, 71, 0.08)' : 'rgba(255, 126, 71, 0.05)', borderColor: 'rgba(255, 126, 71, 0.3)' }]
                                    ]} 
                                    onPress={() => onSwitch(item)}
                                >
                                    <View style={styles.cardLeft}>
                                        <View style={[styles.iconBox, { backgroundColor: iconBoxBg }, isActive && styles.activeIconBox]}>
                                            <Ionicons 
                                                name={isActive ? "business" : "business-outline"} 
                                                size={22} 
                                                color={isActive ? "#FF7E47" : subTextColor} 
                                            />
                                        </View>
                                        <View style={styles.infoBox}>
                                            <Text style={[styles.pharmacyName, { color: textColor }, isActive && styles.activePharmacyName]}>
                                                {item.username}
                                            </Text>
                                            <Text style={[styles.pharmacyRole, { color: subTextColor }]}>مدير الصيدلية</Text>
                                        </View>
                                    </View>
                                    {isActive && (
                                        <LinearGradient
                                            colors={['#FF7E47', '#FF4E00']}
                                            style={styles.checkIndicator}
                                        >
                                            <Ionicons name="checkmark" size={16} color="#FFF" />
                                        </LinearGradient>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            style={styles.addWrapper}
                            onPress={onAdd}
                        >
                            <LinearGradient
                                colors={['#FF7E47', '#FF4E00']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.promoBtn}
                            >
                                <Ionicons name="add" size={24} color="#FFF" />
                                <Text style={styles.promoBtnText}>إضافة صيدلية جديدة</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Pressable>
        </Modal>
    );
});

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    width: '100%', 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40,
    overflow: 'hidden'
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#00000015',
    borderRadius: 3,
    marginBottom: 5,
    alignSelf: 'center'
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 15,
    marginBottom: 10

  },
  titleContainer: {
    alignItems: 'flex-end'
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    textAlign: 'right'
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600'
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20
  },
  footer: {
    paddingHorizontal: 24,
    marginBottom: 5
  },
  pharmacyCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  activePharmacyCard: {
    // Colors applied dynamically
  },
  cardLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeIconBox: {
    backgroundColor: 'rgba(255, 126, 71, 0.15)',
  },
  infoBox: {
    alignItems: 'flex-end'
  },
  pharmacyName: {
    fontSize: 17,
    fontWeight: '800',
  },
  activePharmacyName: {
    color: '#FF7E47'
  },
  pharmacyRole: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600'
  },
  checkIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyBox: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '900', 
    marginTop: 10 
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center'
  },
  addWrapper: {
    marginTop: 10, 
  },
  promoBtn: { 
    height: 62, 
    borderRadius: 22, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
    shadowColor: '#FF7E47',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8
  },
  promoBtnText: { 
    color: '#FFF', 
    fontSize: 17, 
    fontWeight: '900' 
  },
});


