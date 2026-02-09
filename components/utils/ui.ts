import { AbsenceType } from '../types';

/**
 * Returns UI details (label, colors) for a given absence type.
 * @param type The AbsenceType enum value.
 * @returns An object with label and CSS class strings.
 */
export const getAbsenceTypeDetails = (type: AbsenceType) => {
    switch (type) {
        case AbsenceType.Vacation:
            return {
                label: 'Urlaub',
                solidClass: 'bg-blue-500 text-white',
                pendingClass: 'bg-blue-100 text-blue-700',
                pendingBorderClass: 'border-blue-400',
                dotClass: 'bg-blue-500',
                bgClass: 'bg-blue-50',
                borderClass: 'border-blue-200',
                textClass: 'text-blue-800'
            };
        case AbsenceType.SickLeave:
            return {
                label: 'Krank',
                solidClass: 'bg-orange-500 text-white',
                pendingClass: 'bg-orange-100 text-orange-700',
                pendingBorderClass: 'border-orange-400',
                dotClass: 'bg-orange-500',
                bgClass: 'bg-orange-50',
                borderClass: 'border-orange-200',
                textClass: 'text-orange-800'
            };
        case AbsenceType.TimeOff:
            return {
                label: 'Frei',
                solidClass: 'bg-green-500 text-white',
                pendingClass: 'bg-green-100 text-green-700',
                pendingBorderClass: 'border-green-400',
                dotClass: 'bg-green-500',
                bgClass: 'bg-green-50',
                borderClass: 'border-green-200',
                textClass: 'text-green-800'
            };
        default:
            return {
                label: 'Abwesenheit',
                solidClass: 'bg-gray-500 text-white',
                pendingClass: 'bg-gray-100',
                pendingBorderClass: 'border-gray-400',
                dotClass: 'bg-gray-500',
                bgClass: 'bg-gray-50',
                borderClass: 'border-gray-200',
                textClass: 'text-gray-800'
            };
    }
};
