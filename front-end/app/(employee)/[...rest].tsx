import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { resolvePharmacyRoute } from '../../src/modules/pharmacy/navigation/PharmacyCatchAllConfig';
import { View, Text } from 'react-native';

export default function PharmacyCatchAll() {
  const allParams = useLocalSearchParams();
  const { rest } = allParams;
  
  const result = rest ? resolvePharmacyRoute(rest as string[]) : null;

  if (!result) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#F44336', marginBottom: 20 }}>404 - المسار غير موجود</Text>
        <View style={{ backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, width: '100%' }}>
            <Text style={{ fontWeight: 'bold' }}>Path String:</Text>
            <Text style={{ marginBottom: 10 }}>{(rest as string[])?.join('/') || 'empty'}</Text>
            
            <Text style={{ fontWeight: 'bold' }}>Segments Array:</Text>
            <Text>{rest ? JSON.stringify(rest) : 'none'}</Text>
        </View>
        <Text style={{ color: '#999', marginTop: 30, textAlign: 'center' }}>
            يرجى تصوير هذه الشاشة وإرسالها لي.
        </Text>
      </View>
    );
  }

  const { config, params } = result;
  const ScreenComponent = config.component;

  // Merge path params (id) with query params (count, etc.)
  return <ScreenComponent {...params} {...allParams} />;
}
