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
                const user = JSON.parse(userJson!);
                const userRoles = user.roles;
                if (!userRoles) {
                    // Outdated session, no roles exist, force logout
                    await storage.deleteItem('user');
                    await storage.deleteItem('access_token');
                    router.replace('/(auth)/login');
                    return;
                }
                const empRole = user.employee_role || '';

                // Role check: in roles array
                const hasRole = (r: string) => userRoles.includes(r);
                const isEmployee = hasRole('employee') || !!empRole;
                // Gomla workers are employees who have a gomla job title
                const isGomlaWorker = empRole === 'gomla' || empRole === 'gomla_prep';
                const isGomlaSection = allowedRole === 'gomla';

                // Guard logic
                let authorized = false;
                if (hasRole('admin')) {
                    authorized = true; // Admin can access everything
                } else if (allowedRole === 'admin') {
                    authorized = false; // Not admin trying to access admin
                } else if (isGomlaSection) {
                    // Gomla section: only employees with gomla or gomla_prep job
                    authorized = isGomlaWorker;
                } else if (allowedRole === 'employee') {
                    // Employee section: any employee (all job types including gomla)
                    authorized = isEmployee;
                } else if (allowedRole === 'pharmacist') {
                    authorized = hasRole('pharmacist');
                }

                if (authorized) {
                    setAuthorized(true);
                } else {
                    // Redirect to the right dashboard (gomla workers go to employee first)
                    if (hasRole('admin')) router.replace('/(admin)/dashboard');
                    else if (isEmployee) router.replace('/(employee)/dashboard');
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
