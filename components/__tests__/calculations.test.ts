import { describe, it, expect } from 'vitest';
import { applyAutomaticBreaks, calculateBalance, calculateAnnualVacationTaken, checkCollision } from '../utils/calculations';
import { createMockEmployee, createMockTimeEntry, createMockAbsenceRequest } from './testUtils';
import { AbsenceType } from '../../types';

describe('calculations.ts', () => {
    describe('applyAutomaticBreaks', () => {
        const employeeWithBreaks = createMockEmployee({ automaticBreakDeduction: true });

        it('should not deduct break for shifts <= 6h', () => {
            const entry = createMockTimeEntry({
                start: '2024-01-01T08:00:00',
                end: '2024-01-01T14:00:00', // 6h
                breakDurationMinutes: 0
            });
            const result = applyAutomaticBreaks(entry, employeeWithBreaks);
            expect(result.breakDurationMinutes).toBe(0);
        });

        it('should deduct 30m for shifts > 6h and <= 9h', () => {
            const entry = createMockTimeEntry({
                start: '2024-01-01T08:00:00',
                end: '2024-01-01T15:00:00', // 7h
                breakDurationMinutes: 0
            });
            const result = applyAutomaticBreaks(entry, employeeWithBreaks);
            expect(result.breakDurationMinutes).toBe(30);
        });

        it('should deduct 45m for shifts > 9h', () => {
            const entry = createMockTimeEntry({
                start: '2024-01-01T08:00:00',
                end: '2024-01-01T18:00:00', // 10h
                breakDurationMinutes: 0
            });
            const result = applyAutomaticBreaks(entry, employeeWithBreaks);
            expect(result.breakDurationMinutes).toBe(45);
        });

        it('should respect existing manual break if it is longer than legal requirement', () => {
            const entry = createMockTimeEntry({
                start: '2024-01-01T08:00:00',
                end: '2024-01-01T18:00:00', // 10h (req 45m)
                breakDurationMinutes: 60
            });
            const result = applyAutomaticBreaks(entry, employeeWithBreaks);
            expect(result.breakDurationMinutes).toBe(60);
        });
    });

    describe('calculateBalance', () => {
        it('should calculate zero balance for new employee with no data', () => {
            const employee = createMockEmployee({ firstWorkDay: '2024-01-01', startingTimeBalanceHours: 0 });
            const balance = calculateBalance(employee, new Date('2024-01-01'), [], [], [], {});
            // 1st Jan: Target hours from contract (weekly/monthly)
            // If monthly is 160, and we check on Jan 1st... 
            // The logic currently sums monthly target hours for every month that has started.
            // Jan 1st -> totalPayrollTargetHours += 160.
            // TotalCredits = 0.
            // Balance = 0 + 0 - 160 = -160.
            expect(balance).toBe(-160);
        });

        it('should correctly include worked hours', () => {
            const employee = createMockEmployee({ firstWorkDay: '2024-01-01', startingTimeBalanceHours: 0 });
            const entries = [
                createMockTimeEntry({
                    start: '2024-01-01T08:00:00',
                    end: '2024-01-01T16:00:00', // 8h
                    breakDurationMinutes: 0
                })
            ];
            const balance = calculateBalance(employee, new Date('2024-01-01'), entries, [], [], {});
            // Credits = 8. Target = 160. Result = 8 - 160 = -152.
            expect(balance).toBe(-152);
        });

        it('should credit holiday hours based on daily target', () => {
            const employee = createMockEmployee({
                firstWorkDay: '2024-01-01',
                contractHistory: [{
                    validFrom: '2024-01-01',
                    dailyTargetHours: 8,
                    monthlyTargetHours: 160,
                } as any]
            });
            const holidays = {
                2024: [{ date: '2024-01-01', name: 'New Year' }]
            };
            const balance = calculateBalance(employee, new Date('2024-01-01'), [], [], [], holidays);
            // Jan 1st is holiday. Daily target is 8.
            // Credits = 8. Target = 160. Result = -152.
            expect(balance).toBe(-152);
        });
    });

    describe('calculateAnnualVacationTaken', () => {
        it('should count vacation days excluding weekend', () => {
            const employeeId = 1;
            const requests = [
                createMockAbsenceRequest({
                    employeeId,
                    startDate: '2024-01-05', // Friday
                    endDate: '2024-01-08',   // Monday
                    type: AbsenceType.Vacation,
                    status: 'approved'
                })
            ];
            // Friday(5), Sat(6), Sun(7), Mon(8)
            // Friday and Monday should count (2 days).
            const days = calculateAnnualVacationTaken(employeeId, requests, 2024, []);
            expect(days).toBe(2);
        });

        it('should count half days correctly', () => {
            const employeeId = 1;
            const requests = [
                createMockAbsenceRequest({
                    employeeId,
                    startDate: '2024-01-05',
                    endDate: '2024-01-05',
                    type: AbsenceType.Vacation,
                    dayPortion: 'am',
                    status: 'approved'
                })
            ];
            const days = calculateAnnualVacationTaken(employeeId, requests, 2024, []);
            expect(days).toBe(0.5);
        });
    });

    describe('checkCollision', () => {
        it('should detect overlap between two time entries', () => {
            const start = new Date('2024-01-01T10:00:00');
            const end = new Date('2024-01-01T12:00:00');
            const existing = [
                createMockTimeEntry({
                    start: '2024-01-01T11:00:00',
                    end: '2024-01-01T13:00:00'
                })
            ];
            const collision = checkCollision(start, end, existing, []);
            expect(collision?.type).toBe('entry');
        });

        it('should detect overlap with an absence request', () => {
            const start = new Date('2024-01-10T10:00:00');
            const end = new Date('2024-01-10T12:00:00');
            const absences = [
                createMockAbsenceRequest({
                    startDate: '2024-01-10',
                    endDate: '2024-01-10',
                    status: 'approved'
                })
            ];
            const collision = checkCollision(start, end, [], absences);
            expect(collision?.type).toBe('absence');
        });
    });
});
