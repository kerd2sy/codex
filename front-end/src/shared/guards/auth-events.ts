import { DeviceEventEmitter } from 'react-native';

export const AUTH_EVENTS = {
  FORCE_LOGOUT: 'FORCE_LOGOUT'
};

export const emitForceLogout = () => {
  DeviceEventEmitter.emit(AUTH_EVENTS.FORCE_LOGOUT);
};

export const onForceLogout = (callback: () => void) => {
  const subscription = DeviceEventEmitter.addListener(AUTH_EVENTS.FORCE_LOGOUT, callback);
  return () => subscription.remove();
};
