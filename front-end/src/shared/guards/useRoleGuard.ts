import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { storage } from '../utils/storage';

export type UserRole = 'admin' | 'pharmacist' | 'employee' | 'gomla';

export const useRoleGuard = (allowedRole: UserRole) => {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            try {
                const userJson = await storage.getItem('user');
                if (!userJson) {
                    router.replace('/(auth)/login');
                    return;
                }

                const user = JSON.parse(userJson);
                const userRole = user.role as UserRole;

                if (userRole === allowedRole || userRole === 'admin') {
                    setAuthorized(true);
                } else {
                    if (userRole === 'gomla') router.replace('/(gomla)/dashboard');
                    else router.replace('/(pharmacy)');
                }
            } catch (error) {
                router.replace('/(auth)/login');
            } finally {
                setLoading(false);
            }
        };

        checkRole();
    }, [allowedRole, pathname]);

    return { loading, authorized };
};
