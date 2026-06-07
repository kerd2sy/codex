import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';

export type AttendanceStatus = 'present' | 'absent' | 'absent_unauthorized' | 'holiday' | 'none';

export interface AttendanceRecord {
    [dateString: string]: AttendanceStatus; // YYYY-MM-DD format
}

interface Props {
    baseDate: Date; // e.g. current date to determine cycle
    attendanceData: AttendanceRecord;
    onDayPress?: (dateString: string, currentStatus: AttendanceStatus) => void;
}

const getCycleDates = (baseDate: Date) => {
    const currentYear = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth();
    const currentDay = baseDate.getDate();

    let startDate: Date;
    let endDate: Date;

    if (currentDay > 25) {
        // Next cycle: Current Month 26 to Next Month 25
        startDate = new Date(currentYear, currentMonth, 26);
        endDate = new Date(currentYear, currentMonth + 1, 25);
    } else {
        // Current cycle: Prev Month 26 to Current Month 25
        startDate = new Date(currentYear, currentMonth - 1, 26);
        endDate = new Date(currentYear, currentMonth, 25);
    }

    const days = [];
    let loopDate = new Date(startDate);
    while (loopDate <= endDate) {
        const d = new Date(loopDate);
        days.push(d);
        loopDate.setDate(loopDate.getDate() + 1);
    }
    return days;
};

const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const AttendanceCalendar: React.FC<Props> = ({ baseDate, attendanceData, onDayPress }) => {
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const days = getCycleDates(baseDate);

    // Group days into weeks (starting from the first day of the cycle)
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];
    
    // To align with weekdays, find what day of the week the startDate is
    const startDayOfWeek = days[0].getDay(); // 0 is Sunday, 6 is Saturday
    // We want to display empty cells before the start date to match weekday columns
    for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push(null);
    }

    days.forEach((day) => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    if (currentWeek.length > 0) {
        // Fill the rest of the week with nulls
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textSecondary }]}>
                    الفترة: {formatDateString(days[0])}  -  {formatDateString(days[days.length - 1])}
                </Text>
            </View>

            <View style={styles.weekDaysRow}>
                {weekDays.map((day, idx) => (
                    <Text key={idx} style={[styles.weekDayText, { color: theme.textSecondary }]}>
                        {day}
                    </Text>
                ))}
            </View>

            {weeks.map((week, weekIdx) => (
                <View key={weekIdx} style={styles.weekRow}>
                    {week.map((day, dayIdx) => {
                        if (!day) return <View key={dayIdx} style={styles.dayCell} />;

                        const dateString = formatDateString(day);
                        let status = attendanceData[dateString] || 'none';
                        const isThursday = day.getDay() === 4;
                        const isFriday = day.getDay() === 5;

                        // Default Thursdays to holiday if no explicit status is set
                        if (status === 'none' && isThursday) {
                            status = 'holiday';
                        }

                        let dotColor = null;
                        let showEmptyDot = false;
                        
                        if (status === 'present') { dotColor = '#4CAF50'; }
                        else if (status === 'absent') { dotColor = '#F44336'; }
                        else if (status === 'absent_unauthorized') { dotColor = '#2196F3'; }
                        else if (status === 'holiday') { dotColor = '#FFC107'; }
                        else if (status === 'none' && !isThursday) { showEmptyDot = true; }

                        return (
                            <TouchableOpacity 
                                key={dayIdx} 
                                style={[
                                    styles.dayCell, 
                                    { borderColor: 'transparent' },
                                    isThursday && { backgroundColor: theme.primary + '08' }
                                ]}
                                onPress={() => onDayPress && onDayPress(dateString, status)}
                                activeOpacity={onDayPress ? 0.7 : 1}
                            >
                                <Text style={[styles.dayText, { color: theme.text }]}>{day.getDate()}</Text>
                                {dotColor && (
                                    <View style={[styles.indicator, { backgroundColor: dotColor }]} />
                                )}
                                {showEmptyDot && (
                                    <View style={[styles.indicatorEmpty, { borderColor: theme.border }]} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 24,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        direction: 'rtl',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    weekDaysRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    weekDayText: {
        fontSize: 13,
        fontWeight: '900',
        width: '13%',
        textAlign: 'center',
    },
    weekRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    dayCell: {
        width: '13%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
    },
    dayText: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    indicatorEmpty: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
    }
});
