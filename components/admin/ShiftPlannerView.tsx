
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Employee, Shift, Customer, Activity, CompanySettings, AbsenceRequest, ShiftTemplate } from '../../types';
import { AbsenceType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ShiftFormModal } from './ShiftFormModal';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { CalendarModal } from '../ui/CalendarModal';
import { AdjustmentsHorizontalIcon } from '../icons/AdjustmentsHorizontalIcon';
import { EmployeeMultiSelectModal } from './EmployeeMultiSelectModal';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { exportShiftPlanAsPdf } from '../utils/index';
import { ArrowsPointingOutIcon } from '../icons/ArrowsPointingOutIcon';
import { ArrowsPointingInIcon } from '../icons/ArrowsPointingInIcon';
import { DevicePhoneMobileIcon } from '../icons/DevicePhoneMobileIcon';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { SelectorButton } from '../ui/SelectorButton';
import { PlannerDateRangeModal, type Preset } from './PlannerDateRangeModal';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ShiftTemplateManagementModal } from './ShiftTemplateManagementModal';
import { ShiftPatternGeneratorModal } from './ShiftPatternGeneratorModal';
import { CogIcon } from '../icons/CogIcon';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CalendarIcon } from '../icons/CalendarIcon';

interface ShiftPlannerViewProps {
    employees: Employee[];
    shifts: Shift[];
    customers: Customer[];
    activities: Activity[];
    companySettings: CompanySettings;
    absenceRequests: AbsenceRequest[];
    addShift: (shift: Omit<Shift, 'id'>) => void;
    updateShift: (shift: Shift) => void;
    deleteShift: (id: string) => void;
    shiftTemplates: ShiftTemplate[];
    addShiftTemplate: (template: Omit<ShiftTemplate, 'id'>) => void;
    updateShiftTemplate: (template: ShiftTemplate) => void;
    deleteShiftTemplate: (id: string) => void;
    deleteShiftsByEmployee: (employeeId: number) => void;
}

// Helper to check if a shift overlaps with the visible time window
const isShiftVisible = (shiftStart: Date, shiftEnd: Date, viewStart: Date, viewEnd: Date) => {
    return shiftStart < viewEnd && shiftEnd > viewStart;
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const formatDate = (date: Date) => date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

type ViewMode = 'timeline' | 'week' | 'month';

export const ShiftPlannerView: React.FC<ShiftPlannerViewProps> = ({
    employees, shifts, customers, activities, companySettings, absenceRequests, addShift, updateShift, deleteShift,
    shiftTemplates = [],
    addShiftTemplate = () => { },
    updateShiftTemplate = () => { },
    deleteShiftTemplate = () => { },
    deleteShiftsByEmployee = (_id: number) => { }
}) => {
    // --- GENERAL STATE ---
    const [activeTab, setActiveTab] = useState<'planner' | 'report'>('planner');

    // --- PLANNER TAB STATE ---
    const settingStartHour = companySettings.shiftPlannerStartHour ?? 6;
    const settingEndHour = companySettings.shiftPlannerEndHour ?? 22;

    // View Mode State
    const [viewMode, setViewMode] = useState<ViewMode>('week'); // Default to Week view for better overview

    const visibleDurationHours = useMemo(() => {
        let duration = settingEndHour - settingStartHour;
        if (duration <= 0) duration += 24;
        return duration || 12;
    }, [settingStartHour, settingEndHour]);

    const NAVIGATION_STEP_HOURS = 3;

    // Current Reference Date (Start of View)
    const [viewStartDateTime, setViewStartDateTime] = useState(() => {
        // Default to start of current week
        return getStartOfWeek(new Date());
    });

    // Ensure logic adjusts viewStartDateTime based on mode when switching
    useEffect(() => {
        setViewStartDateTime(prev => {
            const d = new Date(prev);
            if (viewMode === 'timeline') {
                d.setHours(settingStartHour, 0, 0, 0);
            } else if (viewMode === 'week') {
                return getStartOfWeek(d);
            } else if (viewMode === 'month') {
                d.setDate(1); // Start of month
                d.setHours(0, 0, 0, 0);
            }
            return d;
        });
    }, [viewMode, settingStartHour]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDatePickModalOpen, setIsDatePickModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);

    // "Paint Mode" State
    const [activeTemplate, setActiveTemplate] = useState<ShiftTemplate | null>(null);

    const [modalInitialData, setModalInitialData] = useState<Partial<Shift> | null>(null);
    const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
    const [modalDefaultEmployeeId, setModalDefaultEmployeeId] = useState<number | undefined>(undefined);

    const [plannerVisibleEmployeeIds, setPlannerVisibleEmployeeIds] = useState<number[]>(() => employees.filter(e => e.isActive).map(e => e.id));
    const [isInputDisabled, setIsInputDisabled] = useState(false);

    // --- REPORT TAB STATE ---
    const [reportStartDate, setReportStartDate] = useState(() => getStartOfWeek(new Date()));
    const [reportEndDate, setReportEndDate] = useState(() => {
        const d = getStartOfWeek(new Date());
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    });
    const [reportEmployeeIds, setReportEmployeeIds] = useState<number[]>(() => employees.filter(e => e.isActive).map(e => e.id));
    const [isReportDateRangeOpen, setIsReportDateRangeOpen] = useState(false);
    const [isReportEmployeeSelectOpen, setIsReportEmployeeSelectOpen] = useState(false);


    // --- PLANNER HELPERS ---

    // TIMELINE Helpers
    const timelineEndDateTime = useMemo(() => {
        const d = new Date(viewStartDateTime);
        d.setHours(d.getHours() + visibleDurationHours);
        return d;
    }, [viewStartDateTime, visibleDurationHours]);

    const timelineSlots = useMemo(() => {
        const slots = [];
        for (let i = 0; i < visibleDurationHours; i++) {
            const d = new Date(viewStartDateTime);
            d.setHours(d.getHours() + i);
            slots.push(d);
        }
        return slots;
    }, [viewStartDateTime, visibleDurationHours]);

    // GRID Helpers (Week/Month)
    const gridDays = useMemo(() => {
        const days = [];
        const current = new Date(viewStartDateTime);

        let count = 7;
        if (viewMode === 'month') {
            // Days in month
            const year = current.getFullYear();
            const month = current.getMonth();
            count = new Date(year, month + 1, 0).getDate();
        }

        for (let i = 0; i < count; i++) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [viewStartDateTime, viewMode]);

    const displayedEmployees = useMemo(() => {
        return employees
            .filter(e => plannerVisibleEmployeeIds.includes(e.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [employees, plannerVisibleEmployeeIds]);

    const shiftView = (direction: 1 | -1) => {
        const newStart = new Date(viewStartDateTime);

        if (viewMode === 'timeline') {
            newStart.setHours(newStart.getHours() + (direction * NAVIGATION_STEP_HOURS));
        } else if (viewMode === 'week') {
            newStart.setDate(newStart.getDate() + (direction * 7));
        } else if (viewMode === 'month') {
            newStart.setMonth(newStart.getMonth() + direction);
        }

        setViewStartDateTime(newStart);
    };

    const unlockInput = useCallback(() => {
        setTimeout(() => { setIsInputDisabled(false); }, 500);
    }, []);

    const handleCloseModal = () => {
        unlockInput();
        setIsModalOpen(false);
    };

    const handleCloseDatePickModal = () => {
        setIsDatePickModalOpen(false);
    };

    const handleJumpToDate = (d: Date) => {
        const newStart = new Date(d);
        if (viewMode === 'timeline') {
            newStart.setHours(settingStartHour, 0, 0, 0);
        } else if (viewMode === 'week') {
            const day = newStart.getDay();
            const diff = newStart.getDate() - day + (day === 0 ? -6 : 1);
            newStart.setDate(diff);
            newStart.setHours(0, 0, 0, 0);
        } else {
            newStart.setDate(1);
            newStart.setHours(0, 0, 0, 0);
        }
        setViewStartDateTime(newStart);
        unlockInput();
        setIsDatePickModalOpen(false);
    };

    const handleTrackClick = (employeeId: number, slotDate: Date) => {
        if (isInputDisabled) return;

        // --- PAINT MODE LOGIC ---
        if (activeTemplate) {
            // Apply template immediately
            const [startH, startM] = activeTemplate.startTime.split(':').map(Number);
            const [endH, endM] = activeTemplate.endTime.split(':').map(Number);

            const start = new Date(slotDate);
            start.setHours(startH, startM, 0, 0);

            const end = new Date(slotDate);
            end.setHours(endH, endM, 0, 0);

            // Handle overnight shifts
            if (end <= start) {
                end.setDate(end.getDate() + 1);
            }

            addShift({
                employeeId,
                start: start.toISOString(),
                end: end.toISOString(),
                label: activeTemplate.label || activeTemplate.name,
                color: activeTemplate.color,
                templateId: activeTemplate.id,
            });
            return;
        }

        // --- STANDARD MODAL LOGIC ---
        setIsInputDisabled(true);
        setModalDefaultDate(slotDate.toLocaleDateString('sv-SE'));
        setModalDefaultEmployeeId(employeeId);

        if (viewMode === 'timeline') {
            const startStr = slotDate.toISOString();
            const endD = new Date(slotDate);
            endD.setHours(endD.getHours() + 4);
            const endStr = endD.toISOString();
            setModalInitialData({ start: startStr, end: endStr });
        } else {
            // For Day/Week views, preset default times (e.g., 08:00 - 16:00) based on clicked day
            const start = new Date(slotDate);
            start.setHours(8, 0, 0, 0);
            const end = new Date(slotDate);
            end.setHours(16, 0, 0, 0);
            setModalInitialData({ start: start.toISOString(), end: end.toISOString() });
        }

        setIsModalOpen(true);
    };

    const handleShiftClick = (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        if (isInputDisabled) return;
        setIsInputDisabled(true);
        setModalInitialData(shift);
        setModalDefaultDate(undefined);
        setIsModalOpen(true);
    };

    const handleSave = (shift: Omit<Shift, 'id'> | Shift) => {
        if ('id' in shift) updateShift(shift);
        else addShift(shift);
        unlockInput();
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        deleteShift(id);
        unlockInput();
        setIsModalOpen(false);
    };

    const getPositionStyle = (start: Date, end: Date) => {
        const viewStartMs = viewStartDateTime.getTime();
        const viewEndMs = timelineEndDateTime.getTime();
        const totalDurationMs = viewEndMs - viewStartMs;
        let startMs = start.getTime();
        let endMs = end.getTime();
        if (endMs <= viewStartMs || startMs >= viewEndMs) return { display: 'none' };
        const effectiveStartMs = Math.max(startMs, viewStartMs);
        const effectiveEndMs = Math.min(endMs, viewEndMs);
        const leftPercent = ((effectiveStartMs - viewStartMs) / totalDurationMs) * 100;
        const widthPercent = ((effectiveEndMs - effectiveStartMs) / totalDurationMs) * 100;
        const isClippedLeft = startMs < viewStartMs;
        const isClippedRight = endMs > viewEndMs;
        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            borderTopLeftRadius: isClippedLeft ? 0 : '0.375rem',
            borderBottomLeftRadius: isClippedLeft ? 0 : '0.375rem',
            borderTopRightRadius: isClippedRight ? 0 : '0.375rem',
            borderBottomRightRadius: isClippedRight ? 0 : '0.375rem',
        };
    };

    const getShiftLabel = (shift: Shift) => {
        let parts = [];
        // Shorten label for grid view
        if (viewMode !== 'timeline' && shift.label) return shift.label;

        if (shift.customerId) {
            const customer = customers.find(c => c.id === shift.customerId);
            if (customer) parts.push(customer.name);
        }
        if (shift.activityId) {
            const activity = activities.find(a => a.id === shift.activityId);
            if (activity) parts.push(activity.name);
        }
        if (parts.length > 0) return parts.join(' - ');
        return shift.label || 'Schicht';
    };

    const getAbsenceStyle = (type: AbsenceType) => {
        switch (type) {
            case AbsenceType.Vacation: return { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', label: 'Urlaub' };
            case AbsenceType.SickLeave: return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', label: 'Krank' };
            case AbsenceType.TimeOff: return { bg: '#dcfce7', border: '#86efac', text: '#166534', label: 'Frei' };
            default: return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', label: 'Abwesend' };
        }
    };

    const dateRangeLabel = useMemo(() => {
        if (viewMode === 'timeline') {
            const startStr = viewStartDateTime.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const startTimeStr = viewStartDateTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            return `${startStr}, ${startTimeStr} Uhr`;
        } else if (viewMode === 'week') {
            const endWeek = new Date(viewStartDateTime);
            endWeek.setDate(endWeek.getDate() + 6);
            return `KW ${getWeekNumber(viewStartDateTime)} (${viewStartDateTime.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${endWeek.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})`;
        } else {
            return viewStartDateTime.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
        }
    }, [viewStartDateTime, viewMode]);

    function getWeekNumber(d: Date) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }


    // --- REPORT HELPERS ---
    const getReportEmployeeSelectorLabel = () => {
        if (reportEmployeeIds.length === 0) return 'Keine Mitarbeiter ausgewählt';
        if (reportEmployeeIds.length === employees.length) return 'Alle Mitarbeiter';
        if (reportEmployeeIds.length === 1) {
            const emp = employees.find(e => e.id === reportEmployeeIds[0]);
            return emp ? `${emp.firstName} ${emp.lastName}` : '1 Mitarbeiter';
        }
        return `${reportEmployeeIds.length} Mitarbeiter ausgewählt`;
    };

    const reportData = useMemo(() => {
        const selectedEmployees = employees.filter(e => reportEmployeeIds.includes(e.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));

        return selectedEmployees.map(emp => {
            const empShifts = shifts.filter(s => {
                if (s.employeeId !== emp.id) return false;
                const sStart = new Date(s.start);
                // Check if shift falls within range (even partially)
                return sStart >= reportStartDate && sStart <= reportEndDate;
            }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

            // Generate Calendar Days for this employee
            const weeks = [];
            let current = new Date(reportStartDate);
            // Normalize start to Monday just in case reportStartDate isn't one (though default is)
            const day = current.getDay();
            const diff = current.getDate() - day + (day === 0 ? -6 : 1);
            current.setDate(diff);

            const end = new Date(reportEndDate);

            while (current <= end) {
                const weekRow = [];
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(current);
                    const dayShifts = empShifts.filter(s => {
                        const shiftDate = new Date(s.start).toLocaleDateString('sv-SE');
                        return shiftDate === dayDate.toLocaleDateString('sv-SE');
                    });

                    weekRow.push({
                        date: dayDate,
                        shifts: dayShifts
                    });
                    current.setDate(current.getDate() + 1);
                }
                weeks.push(weekRow);
            }

            return {
                employee: emp,
                weeks: weeks
            };
        });
    }, [employees, reportEmployeeIds, shifts, reportStartDate, reportEndDate]);

    const handleExportPdf = () => {
        const employeesToExport = employees.filter(e => reportEmployeeIds.includes(e.id));
        if (employeesToExport.length === 0) return;

        exportShiftPlanAsPdf({
            employees: employeesToExport,
            shifts,
            startDate: reportStartDate,
            endDate: reportEndDate,
            customers,
            activities,
            companySettings
        });
    };

    // --- RENDER ---
    return (
        <div className="space-y-4">
            <style>{`
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                .absence-pattern {
                    background-image: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.03) 10px, transparent 10px, transparent 20px);
                }
                .cursor-copy { cursor: copy; }
            `}</style>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('planner')}
                        className={`${activeTab === 'planner'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center gap-2`}
                    >
                        <CalendarDaysIcon className="h-5 w-5" />
                        Interaktiver Planer
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`${activeTab === 'report'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center gap-2`}
                    >
                        <DocumentTextIcon className="h-5 w-5" />
                        Bericht & Export
                    </button>
                </nav>
            </div>

            {activeTab === 'planner' && (
                <div className="animate-fade-in space-y-4">
                    <Card className="overflow-hidden flex flex-col h-full !p-0">
                        {/* TEMPLATE QUICK SELECT */}
                        {shiftTemplates.length > 0 && (
                            <div className="bg-gray-50 p-3 border-b border-gray-200 flex gap-2 overflow-x-auto items-center hide-scroll">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2 whitespace-nowrap">
                                    Schnell-Zuweisung:
                                </span>
                                {shiftTemplates.map(t => {
                                    const isActive = activeTemplate?.id === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveTemplate(isActive ? null : t)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                                                ? 'ring-2 ring-offset-1 scale-105'
                                                : 'hover:bg-white hover:shadow-md opacity-80 hover:opacity-100'
                                                }`}
                                            style={{
                                                backgroundColor: t.color + (isActive ? '' : '20'),
                                                color: isActive ? '#fff' : t.color,
                                                borderColor: t.color,
                                                ringColor: t.color
                                            }}
                                        >
                                            {t.name}
                                            <span className="opacity-70 text-[10px]">({t.startTime}-{t.endTime})</span>
                                            {isActive && <span className="ml-1 bg-white text-black rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                                        </button>
                                    );
                                })}
                                {activeTemplate && (
                                    <button
                                        onClick={() => setActiveTemplate(null)}
                                        className="ml-auto text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm"
                                    >
                                        <XIcon className="h-3 w-3" />
                                        Abbrechen
                                    </button>
                                )}
                            </div>
                        )}

                        {/* HEADER: Filter & Navigation */}
                        <div className="flex flex-col xl:flex-row justify-between items-center p-4 pb-4 border-b border-gray-100 gap-4 relative">
                            <div className="flex items-center gap-2 w-full xl:w-auto">
                                <Button onClick={() => setIsTemplateModalOpen(true)} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm px-3 py-2 flex-1 xl:flex-initial justify-center">
                                    <CogIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Vorlagen</span>
                                    <span className="sm:hidden">Vorlagen</span>
                                </Button>

                                <Button onClick={() => setIsGeneratorModalOpen(true)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-2 text-sm px-3 py-2 flex-1 xl:flex-initial justify-center">
                                    <SparklesIcon className="h-4 w-4" />
                                    <span>Automatik</span>
                                </Button>
                            </div>

                            <div className="flex items-center justify-center gap-2 sm:gap-4 w-full xl:w-auto">
                                <button onClick={() => shiftView(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="Zurück">
                                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                                </button>

                                <button onClick={() => setIsDatePickModalOpen(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap font-display tracking-tight">
                                        {dateRangeLabel}
                                    </h2>
                                </button>

                                <button onClick={() => shiftView(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="Vor">
                                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                                </button>
                            </div>

                            {/* VIEW MODE SWITCHER */}
                            <div className="flex bg-gray-100 p-1 rounded-lg w-full xl:w-auto justify-center">
                                <button
                                    onClick={() => setViewMode('timeline')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex-1 xl:flex-initial ${viewMode === 'timeline' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Stunden
                                </button>
                                <button
                                    onClick={() => setViewMode('week')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex-1 xl:flex-initial ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Woche
                                </button>
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex-1 xl:flex-initial ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Monat
                                </button>
                            </div>
                        </div>

                        {/* MAIN GRID */}
                        <div className="overflow-x-auto relative hide-scroll border-t border-gray-200">
                            <div className="min-w-[800px]">
                                {/* Header: Time Slots / Days */}
                                <div className="flex bg-white border-b border-gray-200 sticky top-0 z-20 h-12 shadow-sm">
                                    {/* Employee Header with Filter */}
                                    <div
                                        className="w-48 shrink-0 p-3 border-r border-gray-200 font-semibold text-gray-800 bg-white sticky left-0 z-30 flex items-center justify-between group cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsFilterModalOpen(true)}
                                    >
                                        <span>Mitarbeiter</span>
                                        <AdjustmentsHorizontalIcon className={`h-5 w-5 ${plannerVisibleEmployeeIds.length !== employees.length ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                                    </div>

                                    {/* Columns Header (Timeline or Days) */}
                                    <div className="flex-1 flex relative">
                                        {viewMode === 'timeline' ? (
                                            timelineSlots.map((date, i) => {
                                                const hour = date.getHours();
                                                const isNewDay = hour === 0;
                                                const displayHour = hour.toString().padStart(2, '0');

                                                return (
                                                    <div key={i} className={`flex-1 border-r border-gray-200 last:border-r-0 flex flex-col justify-center items-center relative ${isNewDay ? 'bg-blue-50/50' : 'bg-gray-50/30'}`}>
                                                        <span className={`text-xs font-medium ${isNewDay ? 'text-blue-700 font-bold' : 'text-gray-500'}`}>
                                                            {displayHour}:00
                                                        </span>
                                                        {isNewDay && (
                                                            <span className="text-[10px] text-blue-600 absolute bottom-0.5 leading-none">
                                                                {date.toLocaleDateString('de-DE', { weekday: 'short' })}
                                                            </span>
                                                        )}
                                                        <div className="absolute bottom-0 h-1 w-px bg-gray-300 left-1/2"></div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            gridDays.map((date, i) => {
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                return (
                                                    <div key={i} className={`flex-1 border-r border-gray-200 last:border-r-0 flex flex-col justify-center items-center relative ${isToday ? 'bg-blue-100' : isWeekend ? 'bg-gray-100' : 'bg-white'}`}>
                                                        <span className={`text-xs font-medium ${isToday ? 'text-blue-800 font-bold' : 'text-gray-700'}`}>
                                                            {date.toLocaleDateString('de-DE', { weekday: 'short' })}
                                                        </span>
                                                        <span className={`text-sm ${isToday ? 'font-bold text-blue-800' : 'text-gray-900'}`}>
                                                            {date.getDate()}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Body: Employee Rows */}
                                <div className={`divide-y divide-gray-100 ${activeTemplate ? 'cursor-copy' : ''}`}>
                                    {displayedEmployees.map(employee => {
                                        // Common: Filter Absences for this row
                                        // For simplicity in rendering, we fetch overlapping absences.
                                        // Ideally, fetch range based on viewMode start/end.

                                        const rowStart = viewMode === 'timeline' ? viewStartDateTime : gridDays[0];
                                        const rowEnd = viewMode === 'timeline' ? timelineEndDateTime : gridDays[gridDays.length - 1];

                                        // Safety check if rowEnd is invalid (empty gridDays)
                                        if (!rowEnd) return null;

                                        return (
                                            <div key={employee.id} className="flex h-16 group hover:bg-gray-50/50 transition-colors">
                                                {/* Employee Column */}
                                                <div className="w-48 shrink-0 p-3 border-r border-gray-200 sticky left-0 z-20 bg-white group-hover:bg-gray-50 flex flex-col justify-center shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                        <div className="text-sm font-medium text-gray-900 truncate">
                                                            {employee.firstName} {employee.lastName}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`Möchten Sie wirklich alle Schichten für ${employee.firstName} ${employee.lastName} löschen?`)) {
                                                                    deleteShiftsByEmployee(employee.id);
                                                                }
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all rounded hover:bg-red-50"
                                                            title="Alle Schichten dieses Mitarbeiters löschen"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Track / Grid */}
                                                <div className="flex-1 relative bg-white group-hover:bg-gray-50">

                                                    {viewMode === 'timeline' ? (
                                                        // --- TIMELINE RENDERING ---
                                                        <>
                                                            {/* Grid Lines */}
                                                            <div className="absolute inset-0 flex pointer-events-none">
                                                                {timelineSlots.map((d, i) => (
                                                                    <div key={i} className={`flex-1 border-r border-gray-100 last:border-r-0 ${d.getHours() === 0 ? 'border-l border-l-blue-200' : ''}`}></div>
                                                                ))}
                                                            </div>
                                                            {/* Click Areas */}
                                                            <div className="absolute inset-0 flex z-0">
                                                                {timelineSlots.map((d, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`flex-1 transition-colors border-r border-transparent relative group/cell ${activeTemplate ? 'hover:bg-green-100/50' : 'hover:bg-blue-50/30 cursor-pointer'}`}
                                                                        onClick={() => handleTrackClick(employee.id, d)}
                                                                        title={activeTemplate ? `Vorlage anwenden` : `${d.toLocaleTimeString([], { hour: '2-digit' })} - Klicken`}
                                                                    >
                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 pointer-events-none">
                                                                            <PlusIcon className="h-4 w-4 text-gray-400" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Shifts & Absences (Timeline Logic) */}
                                                            {/* (Reusing logic from previous implementation for Timeline) */}
                                                            {/* Filter Shifts */}
                                                            {shifts.filter(s => s.employeeId === employee.id && isShiftVisible(new Date(s.start), new Date(s.end), viewStartDateTime, timelineEndDateTime)).map(shift => {
                                                                const start = new Date(shift.start);
                                                                const end = new Date(shift.end);
                                                                const pos = getPositionStyle(start, end);
                                                                return (
                                                                    <div
                                                                        key={shift.id}
                                                                        className="absolute top-2 bottom-2 z-10 shadow-sm flex items-center px-2 cursor-pointer hover:brightness-110 overflow-hidden text-white text-xs border border-black/10 rounded"
                                                                        style={{ ...pos, backgroundColor: shift.color || '#3b82f6' }}
                                                                        onClick={(e) => handleShiftClick(e, shift)}
                                                                        title={getShiftLabel(shift)}
                                                                    >
                                                                        <div className="font-semibold truncate mr-1">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Absences (Timeline) */}
                                                            {absenceRequests.filter(req => req.employeeId === employee.id && req.status !== 'rejected' && ((req.startDate <= rowEnd.toLocaleDateString('sv-SE') && req.endDate >= rowStart.toLocaleDateString('sv-SE')))).map(req => {
                                                                const style = getAbsenceStyle(req.type);
                                                                const absStart = new Date(req.startDate); absStart.setHours(0, 0, 0, 0);
                                                                const absEnd = new Date(req.endDate); absEnd.setHours(23, 59, 59, 999);
                                                                const pos = getPositionStyle(absStart, absEnd);
                                                                return (
                                                                    <div key={req.id} className="absolute top-0 bottom-0 flex items-center justify-center text-xs font-bold absence-pattern border-l border-r pointer-events-none opacity-60" style={{ ...pos, backgroundColor: style.bg, borderColor: style.border, color: style.text }}>
                                                                        <span className="bg-white/80 px-1 rounded shadow-sm backdrop-blur-sm truncate max-w-full">{style.label}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    ) : (
                                                        // --- GRID RENDERING (Week/Month) ---
                                                        <div className="flex h-full">
                                                            {gridDays.map((day, i) => {
                                                                const dayStr = day.toLocaleDateString('sv-SE');

                                                                // Find Shift for this day
                                                                // Note: Simple logic assuming shifts don't span multiple days visually in grid mode or show them on start day
                                                                const dayShifts = shifts.filter(s => {
                                                                    if (s.employeeId !== employee.id) return false;
                                                                    const shiftStartStr = new Date(s.start).toLocaleDateString('sv-SE');
                                                                    return shiftStartStr === dayStr;
                                                                });

                                                                // Find Absence
                                                                const absence = absenceRequests.find(req =>
                                                                    req.employeeId === employee.id &&
                                                                    req.status !== 'rejected' &&
                                                                    dayStr >= req.startDate && dayStr <= req.endDate
                                                                );

                                                                const isToday = day.toDateString() === new Date().toDateString();
                                                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className={`flex-1 border-r border-gray-100 last:border-r-0 relative p-1 flex flex-col gap-1 overflow-hidden group/cell
                                                                            ${activeTemplate ? 'hover:bg-green-50 cursor-copy' : 'hover:bg-blue-50/50 cursor-pointer'}
                                                                            ${isToday ? 'bg-blue-50/30' : isWeekend ? 'bg-gray-50/30' : ''}
                                                                        `}
                                                                        onClick={() => handleTrackClick(employee.id, day)}
                                                                    >
                                                                        {/* Hover Plus Icon */}
                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                                            <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150">
                                                                                <PlusIcon className="h-4 w-4 text-gray-400" />
                                                                            </div>
                                                                        </div>
                                                                        {/* Absence Layer */}
                                                                        {absence && (
                                                                            <div className={`absolute inset-0 opacity-40 z-0 absence-pattern flex items-center justify-center`} style={{ backgroundColor: getAbsenceStyle(absence.type).bg }}>
                                                                                {viewMode === 'week' && <span className="text-xs font-bold -rotate-12 opacity-80">{getAbsenceStyle(absence.type).label}</span>}
                                                                            </div>
                                                                        )}

                                                                        {/* Shifts */}
                                                                        {dayShifts.map(shift => (
                                                                            <div
                                                                                key={shift.id}
                                                                                className={`relative z-10 text-xs text-white rounded px-1.5 py-0.5 shadow-sm truncate cursor-pointer hover:scale-105 transition-transform ${viewMode === 'month' ? 'h-full flex items-center justify-center' : ''}`}
                                                                                style={{ backgroundColor: shift.color || '#3b82f6' }}
                                                                                onClick={(e) => handleShiftClick(e, shift)}
                                                                                title={`${getShiftLabel(shift)} (${new Date(shift.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${new Date(shift.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                                                            >
                                                                                {viewMode === 'week' ? (
                                                                                    <>
                                                                                        <div className="font-bold">{new Date(shift.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                                        <div className="truncate opacity-90 text-[10px]">{getShiftLabel(shift)}</div>
                                                                                    </>
                                                                                ) : (
                                                                                    // Compact for Month
                                                                                    <div className="font-bold text-center">{shift.label ? shift.label.substring(0, 3) : new Date(shift.start).getHours()}</div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {displayedEmployees.length === 0 && (
                                        <div className="p-8 text-center text-gray-500 italic">Keine Mitarbeiter für die aktuelle Auswahl gefunden.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'report' && (
                <div className="animate-fade-in space-y-4">
                    <Card>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Schichtplan Bericht</h2>
                                <p className="text-sm text-gray-500">Übersicht und Export für den gewählten Zeitraum.</p>
                            </div>
                            <Button onClick={handleExportPdf} className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                                <DocumentArrowDownIcon className="h-5 w-5" />
                                <span>Als PDF exportieren</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DateSelectorButton
                                label="Zeitraum"
                                value={`${formatDate(reportStartDate)} - ${formatDate(reportEndDate)}`}
                                onClick={() => setIsReportDateRangeOpen(true)}
                                placeholder="Zeitraum wählen"
                            />
                            <SelectorButton
                                label="Mitarbeiter"
                                value={getReportEmployeeSelectorLabel()}
                                onClick={() => setIsReportEmployeeSelectOpen(true)}
                                placeholder="Mitarbeiter wählen"
                            />
                        </div>
                    </Card>

                    <div className="space-y-6">
                        {reportData.map(({ employee, weeks }) => {
                            // Flatten weeks to get all shifts for list view
                            const allShiftsInPeriod = weeks.flatMap(w => w.flatMap(d => d.shifts));

                            if (allShiftsInPeriod.length === 0) return null;

                            return (
                                <Card key={employee.id} className="overflow-hidden">
                                    <h3 className="text-lg font-bold border-b pb-2 mb-3 bg-gray-50 -mx-6 -mt-6 px-6 pt-6">
                                        {employee.firstName} {employee.lastName}
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm text-left">
                                            <thead className="text-gray-500 bg-gray-50 font-medium border-b">
                                                <tr>
                                                    <th className="px-4 py-2">Datum</th>
                                                    <th className="px-4 py-2">Zeit</th>
                                                    <th className="px-4 py-2">Ort / Tätigkeit</th>
                                                    <th className="px-4 py-2">Label</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {allShiftsInPeriod.map(shift => {
                                                    const sStart = new Date(shift.start);
                                                    const sEnd = new Date(shift.end);
                                                    const customer = customers.find(c => c.id === shift.customerId);
                                                    const activity = activities.find(a => a.id === shift.activityId);

                                                    return (
                                                        <tr key={shift.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-medium">{sStart.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                            <td className="px-4 py-2">
                                                                {sStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {sEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                {customer?.name} {customer && activity && '/'} {activity?.name}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                {shift.label && (
                                                                    <span className="inline-block px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: shift.color || '#9ca3af' }}>
                                                                        {shift.label}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            );
                        })}
                        {reportData.every(d => d.weeks.flatMap(w => w.flatMap(day => day.shifts)).length === 0) && (
                            <div className="text-center py-10 text-gray-500">
                                Keine Schichten für den gewählten Zeitraum und die gewählten Mitarbeiter gefunden.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            {isModalOpen && (
                <ShiftFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    employees={employees}
                    customers={customers}
                    activities={activities}
                    companySettings={companySettings}
                    initialData={modalInitialData}
                    defaultDate={modalDefaultDate}
                    defaultEmployeeId={modalDefaultEmployeeId}
                    shiftTemplates={shiftTemplates} // Pass templates
                />
            )}

            {isDatePickModalOpen && (
                <CalendarModal
                    isOpen={isDatePickModalOpen}
                    onClose={handleCloseDatePickModal}
                    onSelectDate={handleJumpToDate}
                    title="Startdatum wählen"
                    initialStartDate={viewStartDateTime.toISOString()}
                    selectionMode="single"
                />
            )}

            {isFilterModalOpen && (
                <EmployeeMultiSelectModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={(ids) => {
                        setPlannerVisibleEmployeeIds(ids.map(Number));
                        setIsFilterModalOpen(false);
                    }}
                    employees={employees}
                    selectedEmployeeIds={plannerVisibleEmployeeIds}
                    title="Mitarbeiter filtern"
                />
            )}

            {isTemplateModalOpen && (
                <ShiftTemplateManagementModal
                    isOpen={isTemplateModalOpen}
                    onClose={() => setIsTemplateModalOpen(false)}
                    templates={shiftTemplates}
                    onAdd={addShiftTemplate}
                    onUpdate={updateShiftTemplate}
                    onDelete={deleteShiftTemplate}
                />
            )}

            {isGeneratorModalOpen && (
                <ShiftPatternGeneratorModal
                    isOpen={isGeneratorModalOpen}
                    onClose={() => setIsGeneratorModalOpen(false)}
                    templates={shiftTemplates}
                    employees={employees}
                    onGenerate={(generatedShifts) => {
                        generatedShifts.forEach(s => addShift(s));
                        setIsGeneratorModalOpen(false);
                    }}
                    shifts={shifts}
                    deleteShift={deleteShift}
                />
            )}

            {/* Report Tab Modals */}
            <PlannerDateRangeModal
                isOpen={isReportDateRangeOpen}
                onClose={() => setIsReportDateRangeOpen(false)}
                onApply={(start, end) => {
                    setReportStartDate(start);
                    setReportEndDate(end);
                }}
                currentStartDate={reportStartDate}
                currentEndDate={reportEndDate}
            />

            <EmployeeMultiSelectModal
                isOpen={isReportEmployeeSelectOpen}
                onClose={() => setIsReportEmployeeSelectOpen(false)}
                onApply={(ids) => {
                    setReportEmployeeIds(ids.map(Number));
                    setIsReportEmployeeSelectOpen(false);
                }}
                employees={employees}
                selectedEmployeeIds={reportEmployeeIds}
                title="Mitarbeiter auswählen"
            />
        </div>
    );
};
