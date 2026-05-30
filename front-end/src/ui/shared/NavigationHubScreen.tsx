import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, Dimensions, FlatList 
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { NavItem } from '@/shared/api/types';
export type { NavItem };


interface Props {
  title: string;
  subtitle?: string;
  items: NavItem[];
}

export const NavigationHubScreen: React.FC<Props> = ({ title, subtitle, items }) => {

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];

  const renderItem = ({ item }: { item: NavItem }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => router.push(item.route as any)}
    >
      <View style={[styles.iconBox, { backgroundColor: (item.color || theme.primary) + '15' }]}>
        <Ionicons name={item.icon} size={28} color={item.color || theme.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
        {item.description && <Text style={[styles.itemDesc, { color: theme.muted }]}>{item.description}</Text>}
      </View>
      <Ionicons name="chevron-back" size={20} color={theme.border} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={28} color={theme.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.headerSubtitle, { color: theme.muted }]}>{subtitle}</Text>}
        </View>
        <View style={{ width: 40 }} />

      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    marginBottom: 20
  },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, gap: 15 },
  card: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    padding: 18, 
    borderRadius: 24, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  iconBox: { 
    width: 56, 
    height: 56, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 15
  },
  textContainer: { flex: 1, alignItems: 'flex-end' },
  itemTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  itemDesc: { fontSize: 13, fontWeight: '600', textAlign: 'right' }
});

