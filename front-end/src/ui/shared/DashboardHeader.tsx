import React, { memo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { User, Pharmacy } from '@/shared/api/types';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { DashboardSwitcherModal } from '@/ui/shared/DashboardSwitcherModal';

interface DashboardHeaderProps {
  theme: any;
  insets: { top: number };
  currentUser: User | null;
  selectedPharmacy?: { id: string; name: string };
  unreadCount: number;
  lastUpdated?: number | null;
  onPressSwitch?: () => void;
  onPressProfile: () => void;
  onPressNotifications: () => void;
  title?: string;
  subtitle?: string;
  firstName?: string;
  rightIconName?: any;
}

import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

import NotificationJson from '@/assets/json/Notification.json';

export const DashboardHeader = memo(({ 
  theme, insets, currentUser, selectedPharmacy, unreadCount, lastUpdated,
  onPressSwitch, onPressProfile, onPressNotifications, title, subtitle, firstName, rightIconName
}: DashboardHeaderProps) => {

  const formatLastSync = (ts: number | null) => {
    if (!ts) return '';
    try {
        const date = new Date(ts);
        const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        return timeStr;
    } catch (e) {
        return '';
    }
  };

  const notificationSource = React.useMemo(() => {
    try {
        // Deep clone the JSON to avoid mutating the original import
        const cloned = JSON.parse(JSON.stringify(NotificationJson));
        // Find comp_0
        const comp0 = cloned.assets?.find((a: any) => a.id === 'comp_0');
        if (comp0) {
            // Find text layer (ty: 5)
            const textLayer = comp0.layers?.find((l: any) => l.ty === 5);
            if (textLayer && textLayer.t && textLayer.t.d && textLayer.t.d.k && textLayer.t.d.k[0]) {
                const textStr = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : '';
                textLayer.t.d.k[0].s.t = textStr;
                // If unreadCount is 0, hide the whole 'number' badge layer for a cleaner look
                if (unreadCount === 0) {
                    const numberLayer = cloned.layers?.find((l: any) => l.nm === 'number');
                    if (numberLayer) numberLayer.op = 0; // Set out-point to 0 to hide it
                }
            }
        }
        return cloned;
    } catch (e) {
        console.error("Error modifying Lottie JSON", e);
        return NotificationJson;
    }
  }, [unreadCount]);

  const [isSwitcherVisible, setIsSwitcherVisible] = React.useState(false);

  // Only the true system roles: admin, pharmacist, employee
  const allRoles = React.useMemo(() => {
      if (!currentUser) return [];
      const roles: string[] = [];
      if (currentUser.roles) {
          currentUser.roles.forEach((r: string) => {
              // Only include the 3 valid roles
              if (r === 'admin' || r === 'pharmacist' || r === 'employee') {
                  roles.push(r);
              }
          });
      }
      return roles;
  }, [currentUser]);

  const employeeRole = currentUser?.employee_role || '';

  const handleTitlePress = () => {
      if (onPressSwitch) {
          onPressSwitch();
      }
  };

  const showChevron = !!onPressSwitch;

  return (
    <View style={[styles.header, { 
        paddingTop: insets.top + HEADER_TOP_GAP, 
        paddingBottom: 16,
        height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP + 16 
    }]}>
      <DashboardSwitcherModal 
          visible={isSwitcherVisible} 
          onClose={() => setIsSwitcherVisible(false)} 
          userRoles={allRoles}
          employeeRole={employeeRole}
          currentRole={employeeRole}
      />

      <View style={styles.locationContainer}>
          <Text style={[styles.deliverToText, { color: theme.muted }]}>
            {firstName ? (
                <Text>مرحباً بك يا <Text style={{ color: theme.primary }}>{firstName}</Text></Text>
            ) : subtitle ? subtitle : (selectedPharmacy && selectedPharmacy.id !== '0' ? 'أنت تدير صيدلية' : 'مرحباً بك')}
          </Text>
          <TouchableOpacity style={styles.locationRow} onPress={handleTitlePress} disabled={!showChevron} activeOpacity={showChevron ? 0.2 : 1}>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={styles.locationTitleRow}>
                  <Text style={[styles.locationText, { color: theme.text }]}>{title ? title : (selectedPharmacy ? selectedPharmacy.name : '')}</Text>
                  {showChevron && <Ionicons name="chevron-down" size={16} color={theme.icon} style={{ marginLeft: 4 }} />}
                </View>
              </View>
          </TouchableOpacity>
      </View>

      <View style={styles.headerRight}>
          <TouchableOpacity style={styles.profileBtn} onPress={onPressProfile}>
              {getAvatarUrl(currentUser?.avatar_url) ? (
                  <Image source={{ uri: getAvatarUrl(currentUser?.avatar_url)! }} style={styles.avatar} resizeMode="cover" />
              ) : (
                  <LottieView source={require('@/assets/json/Profile.json')} autoPlay loop={false} style={styles.avatarLottie} />
              )}
          </TouchableOpacity>

          <TouchableOpacity 
              style={[
                  styles.notifBtn, 
                  rightIconName ? { backgroundColor: 'rgba(255, 152, 0, 0.15)', borderRadius: 22 } : {}
              ]} 
              onPress={onPressNotifications}
          >
              {rightIconName ? (
                  <Ionicons name={rightIconName} size={24} color="#FF9800" />
              ) : (
                  <LottieView
                      key={`lottie-bell-${unreadCount}`}
                      source={notificationSource}
                      autoPlay={unreadCount > 0}
                      loop={unreadCount > 0}
                      style={styles.notifLottie}
                  />
              )}
          </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: '5%' },

  locationContainer: { flex: 1, alignItems: 'flex-end' },
  deliverToText: { fontSize: 12, fontWeight: '600' },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  locationTitleRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  locationText: { fontSize: 16, fontWeight: '800' },
  titleLine: { width: 20, height: 3, borderRadius: 1.5, marginTop: 1 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: '#FF9800', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  avatar: { width: '100%', height: '100%' },
  avatarLottie: { width: '100%', height: '100%', transform: [{ scale: 1.6 }] },
  notifBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  notifLottie: { width: 40, height: 40 },
});
