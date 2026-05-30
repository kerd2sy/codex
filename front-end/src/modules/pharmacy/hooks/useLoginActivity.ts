import { useState, useEffect, useCallback } from 'react';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';

export interface Activity {
    id: number;
    title: string;
    timestamp: string;
    device: string;
    status: string;
    location: string;
}

export interface ActivitySection {
    id: string;
    date: string;
    items: Activity[];
}

export const useLoginActivity = () => {
    const [sections, setSections] = useState<ActivitySection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const groupActivitiesByDate = useCallback((activities: Activity[]): ActivitySection[] => {
        const groups: { [key: string]: Activity[] } = {};
        activities.forEach(activity => {
            const date = new Date(activity.timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let dateStr = '';
            if (date.toDateString() === today.toDateString()) dateStr = 'اليوم';
            else if (date.toDateString() === yesterday.toDateString()) dateStr = 'أمس';
            else dateStr = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(activity);
        });

        return Object.keys(groups).map((date, index) => ({ id: index.toString(), date, items: groups[date] }));
    }, []);

    const fetchActivity = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.LOGIN_ACTIVITY);
            if (res.ok) setSections(groupActivitiesByDate(await res.json()));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [groupActivitiesByDate]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    return { sections, isLoading, refetch: fetchActivity };
};
