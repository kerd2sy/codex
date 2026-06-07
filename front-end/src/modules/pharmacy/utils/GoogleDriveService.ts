import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DB_NAME = 'pharmacy_offline.db';

let GoogleSignin: any = null;

try {
    // Prevent crash in Expo Go by catching the missing native module error
    if (Constants.appOwnership !== 'expo') {
        const module = require('@react-native-google-signin/google-signin');
        GoogleSignin = module.GoogleSignin;
        GoogleSignin.configure({
            scopes: ['https://www.googleapis.com/auth/drive.appdata'],
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
            offlineAccess: true,
        });
    }
} catch (e) {
    console.warn('[Drive] GoogleSignin is not available in this environment (likely Expo Go)');
}

export const GoogleDriveService = {
    signIn: async () => {
        try {
            if (!GoogleSignin) throw new Error('Google Sign In is not available in Expo Go. Please build a custom dev client.');
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            return userInfo;
        } catch (error) {
            console.error('[Drive] Sign In Error:', error);
            throw error;
        }
    },

    signOut: async () => {
        try {
            if (!GoogleSignin) return;
            await GoogleSignin.signOut();
        } catch (error) {
            console.error('[Drive] Sign Out Error:', error);
        }
    },

    getDbPath: () => {
        return `${(FileSystem as any).documentDirectory}SQLite/${DB_NAME}`;
    },

    backupDatabase: async () => {
        try {
            if (!GoogleSignin) throw new Error('Google Sign In is not available in Expo Go. Please build a custom dev client.');
            const { accessToken } = await GoogleSignin.getTokens();
            if (!accessToken) throw new Error('No access token available');

            const dbPath = GoogleDriveService.getDbPath();
            const dbInfo = await FileSystem.getInfoAsync(dbPath);
            if (!dbInfo.exists) throw new Error('Database file does not exist locally');

            // 1. Check if backup already exists in appDataFolder
            const searchRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="pharmacy_offline_backup.db"', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();
            const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

            // 2. Upload (Create or Update)
            const metadata = {
                name: 'pharmacy_offline_backup.db',
                parents: ['appDataFolder']
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            
            // React Native FormData for files
            form.append('file', {
                uri: Platform.OS === 'android' ? dbPath : dbPath.replace('file://', ''),
                type: 'application/x-sqlite3',
                name: 'pharmacy_offline_backup.db'
            } as any);

            const uploadUrl = existingFile 
                ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
                : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            
            const method = existingFile ? 'PATCH' : 'POST';

            const res = await fetch(uploadUrl, {
                method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/related'
                },
                body: form
            });

            if (!res.ok) {
                throw new Error('Failed to upload backup to Google Drive');
            }

            console.log('[Drive] ✅ Database backed up successfully');
            return true;
        } catch (error) {
            console.error('[Drive] ❌ Backup Error:', error);
            throw error;
        }
    },

    restoreDatabase: async () => {
        try {
            if (!GoogleSignin) throw new Error('Google Sign In is not available in Expo Go. Please build a custom dev client.');
            const { accessToken } = await GoogleSignin.getTokens();
            if (!accessToken) throw new Error('No access token available');

            const searchRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="pharmacy_offline_backup.db"', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();
            const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

            if (!existingFile) throw new Error('No backup found on Google Drive');

            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
            const dbPath = GoogleDriveService.getDbPath();

            // Ensure SQLite directory exists
            await FileSystem.makeDirectoryAsync(`${(FileSystem as any).documentDirectory}SQLite`, { intermediates: true }).catch(() => {});

            const downloadRes = await FileSystem.downloadAsync(downloadUrl, dbPath, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (downloadRes.status !== 200) {
                throw new Error('Failed to download backup');
            }

            console.log('[Drive] ✅ Database restored successfully');
            return true;
        } catch (error) {
            console.error('[Drive] ❌ Restore Error:', error);
            throw error;
        }
    }
};
