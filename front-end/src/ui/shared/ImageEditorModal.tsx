import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, 
  TouchableOpacity, Image, Dimensions, 
  Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';
import Animated, { 
  useSharedValue, useAnimatedStyle, 
  withSpring, interpolate 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onSave: (result: { uri: string, rotation: number, flipX: boolean }) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ 
  visible, imageUri, onClose, onSave 
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const rotateAnim = useSharedValue(0);
  const flipAnim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotateAnim.value}deg` },
        { scaleX: flipAnim.value }
      ]
    };
  });

  const handleRotate = () => {
    const newRotation = rotation + 90;
    setRotation(newRotation);
    rotateAnim.value = withSpring(newRotation);
  };

  const handleFlip = () => {
    const newFlipX = !flipX;
    setFlipX(newFlipX);
    flipAnim.value = withSpring(newFlipX ? -1 : 1);
  };

  const handleSave = async () => {
    if (!imageUri) return;
    setIsProcessing(true);
    
    // In a real scenario, we'd use expo-image-manipulator here.
    // For now, we pass the transformation metadata back.
    setTimeout(() => {
        onSave({ 
            uri: imageUri, 
            rotation: rotation % 360, 
            flipX: flipX 
        });
        setIsProcessing(false);
    }, 500);
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: theme.error || '#FF4B55' }]}>إلغاء</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>تعديل الصورة</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={isProcessing}>
            {isProcessing ? (
                <ActivityIndicator size="small" color={theme.primary} />
            ) : (
                <Text style={[styles.headerBtnText, { color: theme.primary }]}>تم</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Editor Canvas */}
        <View style={styles.canvas}>
          <View style={[styles.imageContainer, { borderColor: theme.border }]}>
            <Animated.Image 
              source={{ uri: imageUri }} 
              style={[styles.image, animatedStyle]} 
              resizeMode="contain"
            />
            {/* Themed Crop Overlay (Visual only for now) */}
            <View style={[styles.cropOverlay, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                <View style={styles.cropCornerTL} />
                <View style={styles.cropCornerTR} />
                <View style={styles.cropCornerBL} />
                <View style={styles.cropCornerBR} />
            </View>
          </View>
        </View>

        {/* Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
            <View style={[styles.iconCircle, { backgroundColor: theme.card }]}>
              <Ionicons name="reload-outline" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.toolLabel, { color: theme.text }]}>تدوير</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={handleFlip}>
            <View style={[styles.iconCircle, { backgroundColor: theme.card }]}>
              <Ionicons name="swap-horizontal-outline" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.toolLabel, { color: theme.text }]}>قلب</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} disabled>
            <View style={[styles.iconCircle, { backgroundColor: theme.card, opacity: 0.5 }]}>
              <Ionicons name="crop-outline" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.toolLabel, { color: theme.text, opacity: 0.5 }]}>قص</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerBtn: { padding: 8, minWidth: 60, alignItems: 'center' },
  headerBtnText: { fontSize: 16, fontWeight: '800' },
  canvas: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  imageContainer: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cropOverlay: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    margin: 20,
  },
  cropCornerTL: { position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#FFF' },
  cropCornerTR: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#FFF' },
  cropCornerBL: { position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#FFF' },
  cropCornerBR: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#FFF' },
  toolbar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
  },
  toolBtn: { alignItems: 'center', gap: 8 },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolLabel: { fontSize: 12, fontWeight: '700' }
});
