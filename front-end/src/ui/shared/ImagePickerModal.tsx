import React from 'react';
import { 
  View, Text, StyleSheet, Modal, 
  TouchableOpacity, Animated, Pressable, 
  Dimensions, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ 
  visible, onClose, onSelectCamera, onSelectLibrary 
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          <View style={styles.handle} />
          
          <Text style={[styles.title, { color: theme.text }]}>تغيير الصورة</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>اختر الطريقة التي تفضلها لإضافة صورتك</Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} 
              onPress={() => {
                onSelectCamera();
                onClose();
              }}
            >
              <LinearGradient
                colors={['#FF7E47', '#FF9E77']}
                style={styles.iconCircle}
              >
                <Ionicons name="camera" size={32} color="#FFF" />
              </LinearGradient>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>التقاط صورة</Text>
                <Text style={[styles.cardSub, { color: theme.muted }]}>استخدم الكاميرا الآن</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={theme.muted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} 
              onPress={() => {
                onSelectLibrary();
                onClose();
              }}
            >
              <LinearGradient
                colors={['#1E88E5', '#42A5F5']}
                style={styles.iconCircle}
              >
                <Ionicons name="images" size={32} color="#FFF" />
              </LinearGradient>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>اختيار من المعرض</Text>
                <Text style={[styles.cardSub, { color: theme.muted }]}>تصفح صور هاتفك</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={theme.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.cancelBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: theme.error || '#FF4B55' }]}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
  },
  handle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#00000015',
    alignSelf: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
