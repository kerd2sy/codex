import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { resolveAuthRoute } from '../../src/modules/auth/navigation/AuthCatchAllConfig';
import { View, Text } from 'react-native';

export default function AuthCatchAll() {
  const { rest } = useLocalSearchParams<{ rest: string[] }>();
  
  const result = rest ? resolveAuthRoute(rest) : null;

  if (!result) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Auth Page Not Found: {JSON.stringify(rest)}</Text>
      </View>
    );
  }

  const { config, params } = result;
  const ScreenComponent = config.component;

  return <ScreenComponent {...params} />;
}
