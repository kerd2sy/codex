/**
 * Robustly parses a date string and time string common in the application's Arabic context.
 * Supports: 
 *  - Dates: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
 *  - Times: HH:MM or HH:MM AM/PM or HH:MM ص/م
 */
export const parseDateTime = (dStr: string, tStr?: string): number => {
    if (!dStr) return 0;
    try {
        const trimmedD = dStr.trim();
        
        // Handle case where dStr might be a full ISO string (rare but possible)
        if (trimmedD.includes('T')) {
            const d = new Date(trimmedD).getTime();
            if (!isNaN(d)) return d;
        }

        // Parse Date Parts
        let d = trimmedD.replace(/\//g, '-');
        const dParts = d.split(/[- ]/); // Split by dash or space
        let year = 0, month = 0, day = 0;

        if (dParts.length >= 3) {
            if (dParts[0].length === 4) {
               // YYYY-MM-DD
               year = parseInt(dParts[0], 10);
               month = parseInt(dParts[1], 10) - 1;
               day = parseInt(dParts[2], 10);
            } else {
               // DD-MM-YYYY or DD-MM-YY
               day = parseInt(dParts[0], 10);
               month = parseInt(dParts[1], 10) - 1;
               year = parseInt(dParts[2], 10);
               if (year < 100) year += 2000;
            }
        }

        // Handle Time
        const time = (tStr || '00:00').trim();
        const tMatch = time.match(/(\d+):(\d+)(?::(\d+))?/);
        let hours = 0, minutes = 0, seconds = 0;

        if (tMatch) {
            hours = parseInt(tMatch[1], 10);
            minutes = parseInt(tMatch[2], 10);
            if (tMatch[3]) seconds = parseInt(tMatch[3], 10);

            const isPM = time.includes('م') || time.toLowerCase().includes('pm');
            const isAM = time.includes('ص') || time.toLowerCase().includes('am');

            if (isPM && hours < 12) hours += 12;
            else if (isAM && hours === 12) hours = 0;
        }

        if (!year) return 0;
        
        const timestamp = new Date(year, month, day, hours, minutes, seconds).getTime();
        return isNaN(timestamp) ? 0 : timestamp;
    } catch {
        return 0;
    }
};
