import { TimeEntry } from '../types';

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 */
export const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Return in meters
};

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Formats a decimal number of hours into a string with hours and minutes.
 * e.g., 8.5 becomes "8h 30min"
 * @param decimalHours The hours as a decimal number.
 * @returns A formatted string.
 */
export const formatHoursAndMinutes = (decimalHours: number, format: 'decimal' | 'hoursMinutes' = 'hoursMinutes'): string => {
    if (format === 'decimal') {
        if (typeof decimalHours !== 'number' || isNaN(decimalHours)) return '0,00h';
        return `${decimalHours.toFixed(2).replace('.', ',')}h`;
    }

    const sign = decimalHours < 0 ? "-" : "";
    const absDecimalHours = Math.abs(decimalHours);
    let hours = Math.floor(absDecimalHours);
    const fractionalPart = absDecimalHours - hours;
    let minutes = Math.round(fractionalPart * 60);

    if (minutes === 60) {
        hours += 1;
        minutes = 0;
    }

    return `${sign}${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

/**
 * Counts the number of workdays (Mon-Fri) within a given date range, inclusive, excluding public holidays.
 */
export const countWorkdaysInDateRange = (startDate: Date, endDate: Date, holidays: { date: string }[]): number => {
    const holidayDates = new Set(holidays.map(h => h.date));
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        const dateString = curDate.toLocaleDateString('sv-SE');
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateString)) { // 0=Sun, 6=Sat
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};
