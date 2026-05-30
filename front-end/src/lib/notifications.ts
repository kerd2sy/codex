import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEY_LOCAL_NOTIFICATIONS = '@local_notifications';

export interface LocalNotification {
    id: number | string;
    title: string;
    description: string;
    icon: string;
    color: string;
    unread: boolean;
    type: string;
    target_id: string;
    pharmacy_id: number | null;
    created_at: string;
}

export const getLocalNotifications = async (): Promise<LocalNotification[]> => {
    try {
        const data = await AsyncStorage.getItem(KEY_LOCAL_NOTIFICATIONS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

export const addLocalNotification = async (notification: Omit<LocalNotification, 'id' | 'created_at' | 'unread'>) => {
    try {
        const currentLocal = await getLocalNotifications();
        const newNotif: LocalNotification = {
            ...notification,
            id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            created_at: new Date().toISOString(),
            unread: true,
        };
        const updated = [newNotif, ...currentLocal];
        await AsyncStorage.setItem(KEY_LOCAL_NOTIFICATIONS, JSON.stringify(updated));
        return newNotif;
    } catch (e) {
        console.error('Error adding local notification:', e);
    }
};

export const markLocalNotificationRead = async (id: string | number) => {
    try {
        const currentLocal = await getLocalNotifications();
        const updated = currentLocal.map(n => n.id === id ? { ...n, unread: false } : n);
        await AsyncStorage.setItem(KEY_LOCAL_NOTIFICATIONS, JSON.stringify(updated));
    } catch (e) {}
};

export const clearAllLocalNotifications = async () => {
    try {
        await AsyncStorage.removeItem(KEY_LOCAL_NOTIFICATIONS);
    } catch (e) {}
};
