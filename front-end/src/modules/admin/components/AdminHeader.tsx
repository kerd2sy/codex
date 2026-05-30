import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';
import NotificationJson from '@/assets/json/Notification.json';

interface AdminHeaderProps {
  theme: any;
  insets: { top: number };
  currentUser: any;
  unreadCount: number;
  onPressProfile: () => void;
  onPressNotifications: () => void;
}

export const AdminHeader = memo(({ 
  theme, insets, currentUser, unreadCount,
  onPressProfile, onPressNotifications 
}: AdminHeaderProps) => {

  const notificationSource = React.useMemo(() => {
    try {
        const cloned = JSON.parse(JSON.stringify(NotificationJson));
        const comp0 = cloned.assets?.find((a: any) => a.id === 'comp_0');
        if (comp0) {
            const textLayer = comp0.layers?.find((l: any) => l.ty === 5);
            if (textLayer && textLayer.t && textLayer.t.d && textLayer.t.d.k && textLayer.t.d.k[0]) {
                const textStr = unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount.toString()) : '';
                textLayer.t.d.k[0].s.t = textStr;
                if (unreadCount === 0) {
                    const numberLayer = cloned.layers?.find((l: any) => l.nm === 'number');
                    if (numberLayer) numberLayer.op = 0;
                }
            }
        }
        return cloned;
    } catch (e) {
        return NotificationJson;
    }
  }, [unreadCount]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
      <View style={styles.infoContainer}>
          <Text style={[styles.roleText, { color: theme.muted }]}>نظام أورجاسوفت</Text>
          <View style={styles.titleRow}>
              <Text style={[styles.adminTitle, { color: theme.text }]}>لوحة التحكم</Text>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          </View>
      </View>

      <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} 
            onPress={onPressProfile}
          >
              {getAvatarUrl(currentUser?.avatar_url) ? (
                  <Image source={{ uri: getAvatarUrl(currentUser?.avatar_url)! }} style={styles.avatar} />
              ) : (
                  <LottieView source={require('@/assets/json/Profile.json')} autoPlay loop={false} style={styles.avatarLottie} />
              )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} 
            onPress={onPressNotifications}
          >
              <LottieView
                  key={`lottie-bell-admin-${unreadCount}`}
                  source={notificationSource}
                  autoPlay={unreadCount > 0}
                  loop={unreadCount > 0}
                  style={styles.notifLottie}
              />
          </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    paddingHorizontal: '5%',
    zIndex: 10
  },
  infoContainer: { flex: 1, alignItems: 'flex-end' },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.6 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 2 },
  adminTitle: { fontSize: 20, fontWeight: '900' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, shadowColor: '#10B981', shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileBtn: { width: 44, height: 44, borderRadius: 15, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: '100%', height: '100%' },
  avatarLottie: { width: 38, height: 38 },
  notifBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  notifLottie: { width: 36, height: 36 },
});
