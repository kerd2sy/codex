import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/shared/utils/storage';
import { pharmacyApi } from '@/api/PharmacyApi';
import { User, Pharmacy } from '@/shared/api/types';

export function useLocationUpdate(pharmacyId: string, onUpdateSuccess: (updatedUser: User) => void) {

  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const handleUpdateLocation = useCallback(async () => {
    setIsUpdatingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح بالوصول للموقع لتفعيل هذه الميزة');
        return false;
      }

      const location = await Location.getCurrentPositionAsync({});
      const locationUrl = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;

      const success = await pharmacyApi.updateLocation(pharmacyId, locationUrl);

      if (success) {
        await storage.setItem(`@dismissed_location_${pharmacyId}`, 'true');
        
        const userJson = await storage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson) as User;
          const updatedPharmacies = user.pharmacies?.map((p: Pharmacy) => 
            p.id.toString() === pharmacyId ? { ...p, location_url: locationUrl } : p
          );

          const updatedUser = { ...user, pharmacies: updatedPharmacies };
          await storage.setItem('user', JSON.stringify(updatedUser));
          onUpdateSuccess(updatedUser);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('useLocationUpdate error:', error);
      return false;
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [pharmacyId, onUpdateSuccess]);

  return {
    isUpdatingLocation,
    handleUpdateLocation
  };
}
