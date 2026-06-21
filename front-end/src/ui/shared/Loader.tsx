import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

interface LoaderProps {
  style?: ViewStyle;
  size?: number;
}

export const Loader: React.FC<LoaderProps> = ({ style, size = 150 }) => {
  return (
    <View style={[styles.container, style]}>
      <LottieView
        source={require('../../../assets/json/Loader.json')}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
