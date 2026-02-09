import { Employee, TimeEntry, AbsenceRequest, Customer, Activity, CompanySettings, Holiday, HolidaysByYear, Shift } from '../../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getHolidays, GermanState } from '../../constants';
import { formatHoursAndMinutes } from './time';
import { calculateMonthlyBreakdown, calculateAbsenceDaysInMonth, calculateAnnualVacationTaken, getContractDetailsForDate } from './calculations';

export interface ExportTimesheetParams {
    employee: Employee;
    year: number;
    month: number;
    allTimeEntries: TimeEntry[];
    allAbsenceRequests: AbsenceRequest[];
    customers: Customer[];
    activities: Activity[];
    selectedState: string;
    companySettings: CompanySettings;
    timeFormat?: 'decimal' | 'hoursMinutes';
}

export interface ExportShiftPlanParams {
    employees: Employee[];
    shifts: Shift[];
    startDate: Date;
    endDate: Date;
    customers: Customer[];
    activities: Activity[];
    companySettings: CompanySettings;
}

const getTimesheetExportData = (params: ExportTimesheetParams) => {
    const { employee, year, month, allTimeEntries, allAbsenceRequests, customers, activities, selectedState, companySettings, timeFormat = 'hoursMinutes' } = params;

    const holidaysForCalc: HolidaysByYear = {};
    holidaysForCalc[year] = getHolidays(year, selectedState as GermanState);
    if (month === 0) {
        const prevYear = year - 1;
        holidaysForCalc[prevYear] = getHolidays(prevYear, selectedState as GermanState);
    }
    const yearSpecificHolidays = holidaysForCalc[year] || [];

    const breakdown = calculateMonthlyBreakdown(employee, year, month, allTimeEntries, allAbsenceRequests, [], holidaysForCalc);
    const {
        previousBalance, workedHours: actualWorkedHours, vacationCreditHours, sickLeaveCreditHours,
        holidayCreditHours, totalCredited: totalCreditedHours, targetHours: currentMonthTargetHours, endOfMonthBalance
    } = breakdown;

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    const employeeTimeEntriesCurrentMonth = allTimeEntries.filter(entry => {
        const entryDate = new Date(entry.start);
        return entry.employeeId === employee.id && entryDate >= startDate && entryDate <= endDate;
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const monthlyAbsences = calculateAbsenceDaysInMonth(employee.id, allAbsenceRequests, year, month, yearSpecificHolidays);
    const annualVacationTaken = calculateAnnualVacationTaken(employee.id, allAbsenceRequests, year, yearSpecificHolidays);
    const currentContract = getContractDetailsForDate(employee, new Date(year, month, 15));
    const remainingVacation = currentContract.vacationDays - annualVacationTaken;

    const monthName = startDate.toLocaleString('de-DE', { month: 'long' });

    return {
        employee, year, monthName, customers, activities, companySettings, timeFormat,
        previousBalance, actualWorkedHours, vacationCreditHours, sickLeaveCreditHours,
        holidayCreditHours, totalCreditedHours, currentMonthTargetHours, endOfMonthBalance,
        monthlyAbsences, remainingVacation, employeeTimeEntriesCurrentMonth
    };
};

export const exportTimesheet = (params: ExportTimesheetParams) => {
    const data = getTimesheetExportData(params);
    const { employee, year, monthName, customers, activities, companySettings, timeFormat,
        previousBalance, actualWorkedHours, vacationCreditHours, sickLeaveCreditHours, holidayCreditHours,
        totalCreditedHours, currentMonthTargetHours, endOfMonthBalance, monthlyAbsences, remainingVacation,
        employeeTimeEntriesCurrentMonth } = data;

    const wb = XLSX.utils.book_new();
    const customerLabel = companySettings.customerLabel || 'Kunde';
    const activityLabel = companySettings.activityLabel || 'Tätigkeit';

    const timesheet_aoa: (string | number)[][] = [
        ['Mitarbeiter:', `${employee.firstName} ${employee.lastName}`],
        ['Firma:', companySettings.companyName],
        ['Zeitraum:', `${monthName} ${year}`],
        [],
        ['Datum', customerLabel, activityLabel, 'Start', 'Ende', 'Pause', 'Dauer']
    ];

    employeeTimeEntriesCurrentMonth.forEach(entry => {
        const duration = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 3600000 - (entry.breakDurationMinutes / 60);
        timesheet_aoa.push([
            new Date(entry.start).toLocaleDateString('de-DE'),
            customers.find(c => c.id === entry.customerId)?.name || 'N/A',
            activities.find(a => a.id === entry.activityId)?.name || 'N/A',
            new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            entry.breakDurationMinutes > 0 ? `${entry.breakDurationMinutes} m` : '0 m',
            formatHoursAndMinutes(duration, timeFormat),
        ]);
    });

    timesheet_aoa.push([]);
    timesheet_aoa.push(['', '', '', '', '', 'Gesamt:', formatHoursAndMinutes(actualWorkedHours, timeFormat)]);

    const ws_timesheet = XLSX.utils.aoa_to_sheet(timesheet_aoa);
    ws_timesheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws_timesheet, `Stundenzettel ${monthName}`);

    const summary_aoa = [
        ['Zusammenfassung Stundenzettel'],
        [],
        ['Mitarbeiter:', `${employee.firstName} ${employee.lastName}`],
        ['Zeitraum:', `${monthName} ${year}`],
        [],
        ['Zusammenfassung Stundenkonto'],
        ['Übertrag Vormonat:', formatHoursAndMinutes(previousBalance, timeFormat)],
        [],
        ['Berechnung für diesen Monat'],
        ['Gearbeitet (aus Zeiteinträgen):', formatHoursAndMinutes(actualWorkedHours, timeFormat)],
        [`+ Gutschrift Urlaub (${monthlyAbsences.vacationDays} Tage):`, formatHoursAndMinutes(vacationCreditHours, timeFormat)],
        [`+ Gutschrift Krankheit (${monthlyAbsences.sickDays} Tage):`, formatHoursAndMinutes(sickLeaveCreditHours, timeFormat)],
        [`+ Gutschrift Feiertage:`, formatHoursAndMinutes(holidayCreditHours, timeFormat)],
        ['', '--------------------'],
        ['= Total Ist-Stunden:', formatHoursAndMinutes(totalCreditedHours, timeFormat)],
        [`- Soll-Stunden (${monthName}):`, formatHoursAndMinutes(currentMonthTargetHours, timeFormat)],
        ['', '--------------------'],
        ['= Saldo am Monatsende:', formatHoursAndMinutes(endOfMonthBalance, timeFormat)],
        [],
        ['Zusammenfassung Abwesenheiten'],
        [`Genommene Urlaubstage (${monthName}):`, `${monthlyAbsences.vacationDays} Tag(e)`],
        ['Verbliebene Urlaubstage (Jahr):', `${remainingVacation} Tag(e)`],
        [`Krankheitstage (${monthName}):`, `${monthlyAbsences.sickDays} Tag(e)`],
        [`Genommener Freizeitausgleich (${monthName}):`, `${monthlyAbsences.timeOffDays} Tag(e)`],
    ];
    const ws_summary = XLSX.utils.aoa_to_sheet(summary_aoa);
    ws_summary['!cols'] = [{ wch: 45 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws_summary, 'Zusammenfassung');

    XLSX.writeFile(wb, `Stundenzettel_${employee.lastName}_${year}_${monthName}.xlsx`);
};

export const exportTimesheetAsPdf = (params: ExportTimesheetParams) => {
    const data = getTimesheetExportData(params);
    const { employee, year, monthName, customers, activities, companySettings, timeFormat,
        previousBalance, actualWorkedHours, vacationCreditHours, sickLeaveCreditHours, holidayCreditHours,
        totalCreditedHours, currentMonthTargetHours, endOfMonthBalance, monthlyAbsences, remainingVacation,
        employeeTimeEntriesCurrentMonth } = data;

    const doc = new jsPDF();
    const customerLabel = companySettings.customerLabel || 'Kunde';
    const activityLabel = companySettings.activityLabel || 'Tätigkeit';

    doc.setFontSize(18);
    doc.text(`Stundenzettel: ${monthName} ${year}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Mitarbeiter: ${employee.firstName} ${employee.lastName}`, 14, 30);
    doc.text(`Firma: ${companySettings.companyName}`, 14, 36);

    const tableBody = employeeTimeEntriesCurrentMonth.map(entry => {
        const duration = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 3600000 - (entry.breakDurationMinutes / 60);
        return [
            new Date(entry.start).toLocaleDateString('de-DE'),
            customers.find(c => c.id === entry.customerId)?.name || 'N/A',
            activities.find(a => a.id === entry.activityId)?.name || 'N/A',
            new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            entry.breakDurationMinutes > 0 ? `${entry.breakDurationMinutes} m` : '0 m',
            formatHoursAndMinutes(duration, timeFormat),
        ];
    });

    autoTable(doc, {
        startY: 45,
        head: [['Datum', customerLabel, activityLabel, 'Start', 'Ende', 'Pause', 'Dauer']],
        body: tableBody,
        foot: [['', '', '', '', '', 'Gesamt:', formatHoursAndMinutes(actualWorkedHours, timeFormat)]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.addPage();
    doc.setFontSize(16);
    doc.text('Zusammenfassung', 14, 20);
    let y = 35;
    const lineHeight = 8;
    const valueX = 120;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Stundenkonto", 14, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text("Übertrag Vormonat:", 14, y);
    doc.text(formatHoursAndMinutes(previousBalance, timeFormat), valueX, y);
    y += lineHeight * 1.5;
    doc.text("Berechnung für diesen Monat:", 14, y);
    y += lineHeight;
    doc.text(`+ Gearbeitet:`, 20, y);
    doc.text(formatHoursAndMinutes(actualWorkedHours, timeFormat), valueX, y);
    y += lineHeight;
    doc.text(`+ Gutschrift Urlaub (${monthlyAbsences.vacationDays} Tage):`, 20, y);
    doc.text(formatHoursAndMinutes(vacationCreditHours, timeFormat), valueX, y);
    y += lineHeight;
    doc.text(`+ Gutschrift Krankheit (${monthlyAbsences.sickDays} Tage):`, 20, y);
    doc.text(formatHoursAndMinutes(sickLeaveCreditHours, timeFormat), valueX, y);
    y += lineHeight;
    doc.text(`+ Gutschrift Feiertage:`, 20, y);
    doc.text(formatHoursAndMinutes(holidayCreditHours, timeFormat), valueX, y);
    y += lineHeight;
    doc.line(14, y - 2, 150, y - 2);
    doc.setFont("helvetica", "bold");
    doc.text("= Total Ist-Stunden:", 14, y);
    doc.text(formatHoursAndMinutes(totalCreditedHours, timeFormat), valueX, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`- Soll-Stunden (${monthName}):`, 14, y);
    doc.text(formatHoursAndMinutes(currentMonthTargetHours, timeFormat), valueX, y);
    y += lineHeight;
    doc.line(14, y - 2, 150, y - 2);
    doc.setFont("helvetica", "bold");
    doc.text("= Saldo am Monatsende:", 14, y);
    doc.text(formatHoursAndMinutes(endOfMonthBalance, timeFormat), valueX, y);
    y += lineHeight * 2;
    doc.text("Abwesenheiten", 14, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`Genommene Urlaubstage (${monthName}):`, 14, y);
    doc.text(`${monthlyAbsences.vacationDays} Tag(e)`, valueX, y);
    y += lineHeight;
    doc.text(`Krankheitstage (${monthName}):`, 14, y);
    doc.text(`${monthlyAbsences.sickDays} Tag(e)`, valueX, y);
    y += lineHeight;
    doc.text("Verbliebene Urlaubstage (Jahr):", 14, y);
    doc.text(`${remainingVacation} Tag(e)`, valueX, y);

    doc.save(`Stundenzettel_${employee.lastName}_${year}_${monthName}.pdf`);
};

export const exportDatev = (
    employees: Employee[],
    year: number,
    months: number[],
    allTimeEntries: TimeEntry[],
    allAbsenceRequests: AbsenceRequest[],
    allTimeBalanceAdjustments: { employeeId: number, date: string, hours: number }[],
    holidaysByYear: HolidaysByYear,
    selectedState: string
) => {
    let csvContent = "Personalnummer;Nachname;Vorname;Monat;Jahr;Lohnart;Wert\n";
    months.forEach(month => {
        const holidays = holidaysByYear[year] || getHolidays(year, selectedState as GermanState);
        let holidaysForCalc: HolidaysByYear = { [year]: holidays };
        if (month === 0) holidaysForCalc[year - 1] = getHolidays(year - 1, selectedState as GermanState);

        employees.forEach(emp => {
            const breakdown = calculateMonthlyBreakdown(emp, year, month, allTimeEntries, allAbsenceRequests, allTimeBalanceAdjustments as any, holidaysForCalc);
            const absences = calculateAbsenceDaysInMonth(emp.id, allAbsenceRequests, year, month, holidays);
            const personnelNum = emp.id;
            const lastName = emp.lastName;
            const firstName = emp.firstName;
            const monthStr = month + 1;

            if (breakdown.workedHours > 0) csvContent += `${personnelNum};${lastName};${firstName};${monthStr};${year};100;${breakdown.workedHours.toFixed(2).replace('.', ',')}\n`;
            if (absences.vacationDays > 0) csvContent += `${personnelNum};${lastName};${firstName};${monthStr};${year};200;${absences.vacationDays.toFixed(1).replace('.', ',')}\n`;
            if (absences.sickDays > 0) csvContent += `${personnelNum};${lastName};${firstName};${monthStr};${year};300;${absences.sickDays.toFixed(1).replace('.', ',')}\n`;
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `DATEV_Export_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportShiftPlanAsPdf = (params: ExportShiftPlanParams) => {
    const { employees, shifts, startDate, endDate, customers, activities, companySettings } = params;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Schichtplan: ${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Firma: ${companySettings.companyName}`, 14, 30);

    let currentY = 40;

    employees.forEach((emp, index) => {
        if (index > 0) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Schichtplan für: ${emp.firstName} ${emp.lastName}`, 14, currentY);
        currentY += 10;

        // Ensure we compare basic dates or ISO strings correctly
        const empShifts = shifts.filter(s => {
            const sStart = new Date(s.start);
            // Simple range check
            return s.employeeId === emp.id && sStart >= startDate && sStart <= endDate;
        }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        const tableBody = empShifts.map(shift => {
            const sStart = new Date(shift.start);
            const sEnd = new Date(shift.end);
            const customer = customers.find(c => c.id === shift.customerId);
            const activity = activities.find(a => a.id === shift.activityId);

            return [
                sStart.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
                `${sStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${sEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                customer?.name || '-',
                activity?.name || '-',
                shift.label || '-'
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Datum', 'Zeit', 'Ort / Kunde', 'Tätigkeit', 'Label']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`Schichtplan_${startDate.toLocaleDateString('de-DE')}_${endDate.toLocaleDateString('de-DE')}.pdf`);
};
