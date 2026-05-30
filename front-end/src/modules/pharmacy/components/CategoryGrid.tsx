import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Colors } from '@/core/theme';
import { useTheme } from '@/context/ThemeContext';

interface Category {
  id: string;
  title: string;
  icon: any;
}

interface CategoryGridProps {
  categories: Category[];
  onCategoryPress: (category: Category) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, onCategoryPress }) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];

  return (
    <View style={styles.categoryList}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.categoryCard}
          activeOpacity={0.7}
          onPress={() => onCategoryPress(cat)}
        >
          <View style={[styles.catImageContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Image source={cat.icon} style={styles.catImageLarge} />
          </View>
          <Text style={[styles.categoryTextLarge, { color: theme.primary }]}>{cat.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  categoryList: {
    marginHorizontal: '5%',
    paddingBottom: 24,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '23%',
  },
  catImageContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
  },
  catImageLarge: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  categoryTextLarge: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
