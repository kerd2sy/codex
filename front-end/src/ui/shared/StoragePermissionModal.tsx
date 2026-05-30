import React from 'react';
import { 
  StyleSheet, View, Text, Modal, 
  TouchableOpacity, Pressable, Dimensions, ActivityIndicator 
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StoragePermissionModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const StoragePermissionModal: React.FC<StoragePermissionModalProps> = ({ 
  visible, onConfirm, onCancel, loading = false 
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          <View style={styles.handle} />
          
          <View style={styles.hero}>
            <LottieView 
                source={require('@/assets/json/folder.json')} 
                autoPlay 
                loop 
                style={{ width: 180, height: 180, marginBottom: 10 }}
            />
            <Text style={[styles.heroTit, { color: theme.text }]}>تفعيل الحفظ التلقائي</Text>
            <View style={styles.tag}>
              <Text style={styles.tagTxt}>ميزة جديدة</Text>
            </View>
            <Text style={[styles.heroSub, { color: theme.muted }]}>
                أندرويد يمنع اختيار مجلد التنزيلات الرئيسي مباشرة. من فضلك أنشئ مجلد جديد باسم "تبارك فارما" أو اختر أي مجلد فرعي واضغط على "استخدام هذا المجلد" ليتم حفظ تقاريرك تلقائياً وبصمت.
            </Text>
          </View>

          <View style={styles.btns}>
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: theme.primary }]} 
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.mainBtnTxt}>ابدأ الإعداد الآن</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secBtn]} 
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[styles.secBtnTxt, { color: theme.muted }]}>ليس الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  content: { 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: 30, 
    alignItems: 'center',
    paddingBottom: 40
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#00000010',
    borderRadius: 3,
    marginBottom: 20
  },
  hero: { alignItems: 'center', marginBottom: 25 },
  heroTit: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  tag: { backgroundColor: '#4CAF5015', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginBottom: 15 },
  tagTxt: { color: '#4CAF50', fontWeight: '900', fontSize: 12 },
  heroSub: { textAlign: 'center', paddingHorizontal: 15, fontSize: 14, fontWeight: '600', lineHeight: 22 },
  btns: { width: '100%', gap: 12 },
  mainBtn: { width: '100%', height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mainBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  secBtn: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' },
  secBtnTxt: { fontSize: 16, fontWeight: '700' }
});
