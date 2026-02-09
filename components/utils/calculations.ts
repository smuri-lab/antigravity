import { Employee, ContractDetails, AbsenceRequest, TimeEntry, TimeBalanceAdjustment, HolidaysByYear, AbsenceType, EmploymentType } from '../../types';

/**
 * Applies legal break deductions based on shift duration if enabled for the employee.
 */
export const applyAutomaticBreaks = (entryData: Omit<TimeEntry, 'id' | 'employeeId'> | TimeEntry, employee: Employee): Omit<TimeEntry, 'id' | 'employeeId'> | TimeEntry => {
    if (!employee.automaticBreakDeduction) {
        return entryData;
    }

    const durationMs = new Date(entryData.end).getTime() - new Date(entryData.start).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    let requiredBreak = 0;
    if (durationHours > 9) {
        requiredBreak = 45;
    } else if (durationHours > 6) {
        requiredBreak = 30;
    }

    const newBreakDuration = Math.max(entryData.breakDurationMinutes || 0, requiredBreak);

    return { ...entryData, breakDurationMinutes: newBreakDuration };
};

/**
 * Finds the currently active contract details for an employee based on a specific date.
 */
export const getContractDetailsForDate = (employee: Employee, date: Date): ContractDetails => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (!employee.contractHistory || employee.contractHistory.length === 0) {
        console.error(`Mitarbeiter ${employee.id} hat keine Vertragshistorie.`);
        return {
            validFrom: '1970-01-01',
            employmentType: EmploymentType.FullTime,
            monthlyTargetHours: 0,
            dailyTargetHours: 0,
            vacationDays: 0,
            street: '', houseNumber: '', postalCode: '', city: ''
        };
    }

    const sortedHistory = [...employee.contractHistory].sort((a, b) =>
        new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()
    );

    const currentContract = sortedHistory.find(contract =>
        new Date(contract.validFrom).getTime() <= targetDate.getTime()
    );

    return currentContract || sortedHistory[sortedHistory.length - 1];
};

/**
 * Calculates the final time balance for an employee up to a specific date.
 */
export const calculateBalance = (
    employee: Employee,
    endDate: Date,
    allTimeEntries: TimeEntry[],
    allAbsenceRequests: AbsenceRequest[],
    allTimeBalanceAdjustments: TimeBalanceAdjustment[],
    holidaysByYear: HolidaysByYear,
): number => {
    if (!employee.firstWorkDay || new Date(employee.firstWorkDay) > endDate) {
        return employee.startingTimeBalanceHours || 0;
    }

    let totalCredits = 0;

    const workedHours = allTimeEntries
        .filter(e => e.employeeId === employee.id && new Date(e.start) <= endDate)
        .reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000 - (e.breakDurationMinutes / 60)), 0);
    totalCredits += workedHours;

    const adjustmentHours = allTimeBalanceAdjustments
        .filter(adj => adj.employeeId === employee.id && new Date(adj.date) <= endDate)
        .reduce((sum, adj) => sum + adj.hours, 0);
    totalCredits += adjustmentHours;

    const approvedAbsences = allAbsenceRequests.filter(r => r.employeeId === employee.id && r.status === 'approved');
    let loopDate = new Date(employee.firstWorkDay);
    while (loopDate <= endDate) {
        const year = loopDate.getFullYear();
        const holidayDates = new Set((holidaysByYear[year] || []).map(h => h.date));
        const dateString = loopDate.toLocaleDateString('sv-SE');

        const contract = getContractDetailsForDate(employee, loopDate);
        const dayOfWeek = loopDate.getDay();
        let dailyScheduledHours = 0;

        if (contract.targetHoursModel === 'weekly' && contract.weeklySchedule) {
            const dayKeys: (keyof any)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            dailyScheduledHours = contract.weeklySchedule[dayKeys[dayOfWeek] as keyof typeof contract.weeklySchedule] || 0;
        } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            dailyScheduledHours = contract.dailyTargetHours;
        }

        if (dailyScheduledHours > 0) {
            const isHoliday = holidayDates.has(dateString);
            const absence = approvedAbsences.find(r => dateString >= r.startDate && r.endDate >= dateString);
            if (isHoliday) {
                totalCredits += dailyScheduledHours;
            } else if (absence && (absence.type === AbsenceType.Vacation || absence.type === AbsenceType.SickLeave)) {
                if (absence.type === AbsenceType.Vacation && absence.dayPortion && absence.dayPortion !== 'full') {
                    totalCredits += dailyScheduledHours / 2;
                } else {
                    totalCredits += dailyScheduledHours;
                }
            }
        }
        loopDate.setDate(loopDate.getDate() + 1);
    }

    let totalPayrollTargetHours = 0;
    let monthLoopDate = new Date(employee.firstWorkDay);
    monthLoopDate.setDate(1);

    while (monthLoopDate <= endDate) {
        const monthEnd = new Date(monthLoopDate.getFullYear(), monthLoopDate.getMonth() + 1, 0);
        if (new Date(employee.firstWorkDay) <= monthEnd) {
            const contract = getContractDetailsForDate(employee, monthLoopDate);
            totalPayrollTargetHours += contract.monthlyTargetHours;
        }
        monthLoopDate = new Date(monthLoopDate.getFullYear(), monthLoopDate.getMonth() + 1, 1);
    }

    return (employee.startingTimeBalanceHours || 0) + totalCredits - totalPayrollTargetHours;
};

/**
 * Provides a detailed breakdown of all time balance components for a specific month.
 */
export const calculateMonthlyBreakdown = (
    employee: Employee,
    year: number,
    month: number,
    allTimeEntries: TimeEntry[],
    allAbsenceRequests: AbsenceRequest[],
    allTimeBalanceAdjustments: TimeBalanceAdjustment[],
    holidaysByYear: HolidaysByYear,
) => {
    const holidaysForYear = holidaysByYear[year] || [];
    const holidayDates = new Set(holidaysForYear.map(h => h.date));

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const prevMonthEnd = new Date(year, month, 0);
    prevMonthEnd.setHours(23, 59, 59, 999);

    const previousBalance = calculateBalance(employee, prevMonthEnd, allTimeEntries, allAbsenceRequests, allTimeBalanceAdjustments, holidaysByYear);

    const workedHours = allTimeEntries
        .filter(e => e.employeeId === employee.id && new Date(e.start) >= monthStart && new Date(e.start) <= monthEnd)
        .reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000 - (e.breakDurationMinutes / 60)), 0);

    const adjustments = allTimeBalanceAdjustments
        .filter(adj => {
            const adjDate = new Date(adj.date);
            return adj.employeeId === employee.id && adjDate.getFullYear() === year && adjDate.getMonth() === month;
        })
        .reduce((sum, adj) => sum + adj.hours, 0);

    let vacationCreditHours = 0;
    let sickLeaveCreditHours = 0;
    let holidayCreditHours = 0;
    const approvedAbsences = allAbsenceRequests.filter(r => r.employeeId === employee.id && r.status === 'approved');

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const contract = getContractDetailsForDate(employee, d);
        const dayOfWeek = d.getDay();
        let dailyTarget = 0;

        if (contract.targetHoursModel === 'weekly' && contract.weeklySchedule) {
            const dayKeys: (keyof any)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            dailyTarget = contract.weeklySchedule[dayKeys[dayOfWeek] as keyof typeof contract.weeklySchedule] || 0;
        } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            dailyTarget = contract.dailyTargetHours;
        }

        if (dailyTarget > 0) {
            const dateString = d.toLocaleDateString('sv-SE');
            const isHoliday = holidayDates.has(dateString);
            const absence = approvedAbsences.find(r => dateString >= r.startDate && dateString <= r.endDate);

            if (isHoliday) {
                holidayCreditHours += dailyTarget;
            } else if (absence) {
                if (absence.type === AbsenceType.Vacation) {
                    const credit = absence.dayPortion && absence.dayPortion !== 'full' ? dailyTarget / 2 : dailyTarget;
                    vacationCreditHours += credit;
                } else if (absence.type === AbsenceType.SickLeave) {
                    sickLeaveCreditHours += dailyTarget;
                }
            }
        }
    }

    const absenceHolidayCredit = vacationCreditHours + sickLeaveCreditHours + holidayCreditHours;
    const totalCredited = workedHours + absenceHolidayCredit + adjustments;
    const contract = getContractDetailsForDate(employee, monthStart);
    const targetHours = contract.monthlyTargetHours;
    const monthlyBalance = totalCredited - targetHours;
    const endOfMonthBalance = previousBalance + monthlyBalance;

    return {
        previousBalance, workedHours, adjustments, vacationCreditHours, sickLeaveCreditHours,
        holidayCreditHours, absenceHolidayCredit, totalCredited, targetHours, monthlyBalance, endOfMonthBalance
    };
};

export const calculateAnnualVacationTaken = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, holidays: { date: string }[]): number => {
    const approvedVacations = absenceRequests.filter(req =>
        req.employeeId === employeeId && req.status === 'approved' && req.type === AbsenceType.Vacation
    );
    const holidayDates = new Set(holidays.map(h => h.date));
    let totalDays = 0;

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const dateString = d.toLocaleDateString('sv-SE');
        if (holidayDates.has(dateString)) continue;

        const absence = approvedVacations.find(req => dateString >= req.startDate && dateString <= req.endDate);
        if (absence) {
            if (absence.dayPortion && absence.dayPortion !== 'full') totalDays += 0.5;
            else totalDays += 1;
        }
    }
    return totalDays;
};

export const calculateAnnualSickDays = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, holidays: { date: string }[]): number => {
    const approvedSickLeaves = absenceRequests.filter(req =>
        req.employeeId === employeeId && req.status === 'approved' && req.type === AbsenceType.SickLeave &&
        new Date(req.startDate).getFullYear() <= year && new Date(req.endDate).getFullYear() >= year
    );

    let totalDays = 0;
    const holidayDates = new Set(holidays.map(h => h.date));

    for (const req of approvedSickLeaves) {
        const d = new Date(req.startDate);
        const end = new Date(req.endDate);
        while (d <= end) {
            if (d.getFullYear() === year) {
                const dayOfWeek = d.getDay();
                const ds = d.toLocaleDateString('sv-SE');
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(ds)) {
                    totalDays++;
                }
            }
            d.setDate(d.getDate() + 1);
        }
    }
    return totalDays;
};

export const calculateAbsenceDaysInMonth = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, month: number, holidays: { date: string }[]): { vacationDays: number, sickDays: number, timeOffDays: number } => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const approvedAbsences = absenceRequests.filter(req =>
        req.employeeId === employeeId && req.status === 'approved' &&
        new Date(req.startDate) <= monthEnd && new Date(req.endDate) >= monthStart
    );

    const result = { vacationDays: 0, sickDays: 0, timeOffDays: 0 };
    const holidayDates = new Set(holidays.map(h => h.date));

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const dateString = d.toLocaleDateString('sv-SE');
        if (holidayDates.has(dateString)) continue;

        const absence = approvedAbsences.find(req => dateString >= req.startDate && dateString <= req.endDate);
        if (absence) {
            if (absence.type === AbsenceType.Vacation) {
                if (absence.dayPortion && absence.dayPortion !== 'full') result.vacationDays += 0.5;
                else result.vacationDays += 1;
            } else if (absence.type === AbsenceType.SickLeave) result.sickDays += 1;
            else if (absence.type === AbsenceType.TimeOff) result.timeOffDays += 1;
        }
    }
    return result;
};

export const checkCollision = (
    start: Date,
    end: Date,
    existingEntries: TimeEntry[],
    absenceRequests: AbsenceRequest[],
    entryIdToIgnore?: number
): { type: 'entry' | 'absence', item: TimeEntry | AbsenceRequest } | null => {
    const newStartTime = start.getTime();
    const newEndTime = end.getTime();

    for (const entry of existingEntries) {
        if (entryIdToIgnore && entry.id === entryIdToIgnore) continue;
        if (start.toDateString() !== new Date(entry.start).toDateString()) continue;
        const entryStart = new Date(entry.start).getTime();
        const entryEnd = new Date(entry.end).getTime();
        if (newStartTime < entryEnd && newEndTime > entryStart) return { type: 'entry', item: entry };
    }

    const newStartStr = start.toLocaleDateString('sv-SE');
    const newEndStr = end.toLocaleDateString('sv-SE');

    for (const request of absenceRequests) {
        if (request.status === 'rejected') continue;
        if (request.startDate <= newEndStr && request.endDate >= newStartStr) return { type: 'absence', item: request };
    }
    return null;
};
