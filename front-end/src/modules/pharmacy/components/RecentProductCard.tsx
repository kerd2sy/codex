import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';

interface RecentProductCardProps {
  item: any;
  onPress?: () => void;
  effectiveDiscount?: number;
}

export const RecentProductCard: React.FC<RecentProductCardProps> = ({ item, onPress, effectiveDiscount }) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const lottieRef = React.useRef<LottieView>(null);

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => {
        lottieRef.current?.play(0, 100);
        onPress?.();
      }}
      style={[styles.recentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={[styles.recentImageContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8F9FA' }]}>

        <LottieView
          ref={lottieRef}
          source={require('@/assets/json/Medicine.json')}
          autoPlay={false}
          loop={false}
          progress={1}
          style={styles.recentImage}
          renderMode="SOFTWARE"
        />
      </View>
      <View style={styles.nameContainer}>
        <Text style={[styles.recentName, { color: theme.primary }]} numberOfLines={3}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  recentCard: {
    borderRadius: 24,
    padding: 10,
    width: 155,
    height: 185, // Even tighter height
    borderWidth: 1,
    justifyContent: 'flex-start',
  },
  recentImageContainer: {
    width: '100%',
    height: 85, // Even lower height
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    zIndex: 1,
  },
  discountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  recentImage: {
    width: 48, // Smaller icon size for better proportion
    height: 48,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center', // Back to center for small cards
  },
  recentName: {
    fontSize: 12, // More compact text
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
