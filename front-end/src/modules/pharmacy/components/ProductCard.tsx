import React from 'react';
import { 
  StyleSheet, View, Text, Image, 
  TouchableOpacity, Animated 
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Product } from '@/shared/api/types';
import LottieView from 'lottie-react-native';

interface ProductCardProps {
  item: Product;
  onPress: () => void;
  onFavorite?: () => void;
  onView?: () => void;
  showStatus?: boolean;
}

export const ProductCard = React.memo(({ 
  item, onPress, onFavorite, onView, showStatus = true
}: ProductCardProps) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const lottieRef = React.useRef<LottieView>(null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const isAvailable = (item.qty || 0) > 0;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
                lottieRef.current?.play(0, 100);
                onPress();
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
        >
            <View style={[styles.imgContainer, { backgroundColor: theme.surface }]}>
                {item.image_url ? (
                    <Image source={typeof item.image_url === 'string' ? { uri: item.image_url } : item.image_url} style={styles.img} />
                ) : (
                    <LottieView
                        ref={lottieRef}
                        source={require('@/assets/json/Medicine.json')}
                        autoPlay={false}
                        loop={false}
                        progress={1}
                        style={styles.lottie}
                        renderMode="SOFTWARE"
                    />
                )}
            </View>

            <View style={styles.info}>
                <View style={styles.topRow}>
                    <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                </View>

                <View style={styles.bottomRow}>
                    <View style={styles.priceContainer}>
                        <Text style={[styles.price, { color: theme.primary }]}>{Number(item.price).toLocaleString('en-US')}</Text>
                        <Text style={[styles.currency, { color: theme.muted }]}> ج.م</Text>
                    </View>


                    {showStatus && (
                        <View style={[styles.statusBadge, { backgroundColor: isAvailable ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                            <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#4CAF50' : '#F44336' }]} />
                            <Text style={[styles.statusText, { color: isAvailable ? '#4CAF50' : '#F44336' }]}>
                                {isAvailable ? 'يوجد' : 'لا يوجد'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imgContainer: {
    width: 90,
    height: 90,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  img: { width: 70, height: 70, resizeMode: 'contain' },
  lottie: { width: 70, height: 70 },
  info: {
    flex: 1,
    height: 90,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 22,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
  },
  currency: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12, // Increased slightly
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
    minWidth: 110, // Increased from 90 to fit "غير متوفر"
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
