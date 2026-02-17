
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Employee, Shift, Customer, Activity, CompanySettings, AbsenceRequest, ShiftTemplate, RotationTemplate, EmployeeGroup } from '../../types';
import { AbsenceType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ShiftFormModal } from './ShiftFormModal';
import { Select } from '../ui/Select';
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
import { RotationPatternManagementModal } from './RotationPatternManagementModal';
import { EmployeeGroupManagementModal } from './EmployeeGroupManagementModal';
import { GroupAssignmentModal } from './GroupAssignmentModal';
import { CogIcon } from '../icons/CogIcon';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { WeekCopyModal } from '../ui/WeekCopyModal';

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
    rotationPatterns: RotationTemplate[];
    addRotationPattern: (pattern: Omit<RotationTemplate, 'id' | 'createdAt'>) => void;
    updateRotationPattern: (pattern: RotationTemplate) => void;
    deleteRotationPattern: (id: string) => void;
    employeeGroups: EmployeeGroup[];
    addEmployeeGroup: (group: Omit<EmployeeGroup, 'id' | 'createdAt'>) => void;
    updateEmployeeGroup: (group: EmployeeGroup) => void;
    deleteEmployeeGroup: (id: string) => void;
    onUpdateSettings?: (settings: CompanySettings) => void;
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

// Helper to check if a shift conflicts with an approved absence
const hasAbsenceConflict = (shift: Shift, absenceRequests: AbsenceRequest[]): AbsenceRequest | null => {
    const shiftDate = new Date(shift.start);
    const shiftDateStr = shiftDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const conflict = absenceRequests.find(absence => {
        if (absence.employeeId !== shift.employeeId) return false;
        if (absence.status !== 'approved') return false;

        const startDate = new Date(absence.startDate);
        const endDate = new Date(absence.endDate);

        // Check if shift date falls within absence period
        return shiftDate >= startDate && shiftDate <= endDate;
    });

    return conflict || null;
};

// Helper to get absence type label in German
const getAbsenceTypeLabel = (type: AbsenceType): string => {
    switch (type) {
        case AbsenceType.Vacation: return 'Urlaub';
        case AbsenceType.SickLeave: return 'Krankheit';
        case AbsenceType.TimeOff: return 'Freizeitausgleich';
        default: return 'Abwesenheit';
    }
};

// Helper to calculate daily statistics
const calculateDailyStats = (date: Date, shifts: Shift[], employees: Employee[]) => {
    const dateStr = date.toLocaleDateString('sv-SE');

    // Get all shifts for this day
    const dayShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.start).toLocaleDateString('sv-SE');
        return shiftDate === dateStr;
    });

    // Count unique employees
    const uniqueEmployeeIds = new Set(dayShifts.map(s => s.employeeId));
    const employeeCount = uniqueEmployeeIds.size;

    // Calculate total hours
    const totalHours = dayShifts.reduce((sum, shift) => {
        const start = new Date(shift.start);
        const end = new Date(shift.end);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
    }, 0);

    return { employeeCount, totalHours };
};

// Helper to get coverage level color
const getCoverageColor = (employeeCount: number): { bg: string; text: string; label: string } => {
    if (employeeCount >= 3) {
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Gut' };
    } else if (employeeCount === 2) {
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Mittel' };
    } else if (employeeCount === 1) {
        return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Niedrig' };
    } else {
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Keine' };
    }
};

type ViewMode = 'timeline' | 'week' | 'month';

export const ShiftPlannerView: React.FC<ShiftPlannerViewProps> = ({
    employees, shifts, customers, activities, companySettings, absenceRequests, addShift, updateShift, deleteShift,
    shiftTemplates = [],
    addShiftTemplate = () => { },
    updateShiftTemplate = () => { },
    deleteShiftTemplate = () => { },
    deleteShiftsByEmployee = (_id: number) => { },
    rotationPatterns = [],
    addRotationPattern = () => { },
    updateRotationPattern = () => { },
    deleteRotationPattern = () => { },
    employeeGroups = [],
    addEmployeeGroup = () => { },
    updateEmployeeGroup = () => { },
    deleteEmployeeGroup = () => { },
    onUpdateSettings
}) => {
    const { t } = useTranslation();
    // Verify prop is correctly passed
    console.log('ShiftPlannerView: deleteShiftsByEmployee prop:', deleteShiftsByEmployee);
    console.log('ShiftPlannerView: Is default function?', deleteShiftsByEmployee.toString().includes('{ }'));

    // --- GENERAL STATE ---
    const [activeTab, setActiveTab] = useState<'planner' | 'management' | 'report'>('planner');
    const [employeeToDelete, setEmployeeToDelete] = useState<{ id: number; name: string; shiftCount: number } | null>(null);

    // --- DISPLAY MODE STATE ---
    const [displayMode, setDisplayMode] = useState<'employees' | 'groups'>('employees');
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    // --- PLANNER TAB STATE ---
    const settingStartHour = companySettings.shiftPlannerStartHour ?? 6;
    const settingEndHour = companySettings.shiftPlannerEndHour ?? 22;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSaveSettings = (newStart: number, newEnd: number) => {
        if (onUpdateSettings) {
            onUpdateSettings({
                ...companySettings,
                shiftPlannerStartHour: newStart,
                shiftPlannerEndHour: newEnd
            });
            setIsSettingsOpen(false);
        }
    };

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
    const [isRotationPatternManagementOpen, setIsRotationPatternManagementOpen] = useState(false);
    const [isEmployeeGroupManagementOpen, setIsEmployeeGroupManagementOpen] = useState(false);

    // Group assignment modal for drag & drop
    const [showGroupAssignModal, setShowGroupAssignModal] = useState(false);
    const [groupAssignData, setGroupAssignData] = useState<{
        groupId: string;
        shiftData: Partial<Shift>;
    } | null>(null);

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

    // Week copy modal state
    const [isWeekCopyModalOpen, setIsWeekCopyModalOpen] = useState(false);

    // Drag and drop state
    const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
    const [draggedTemplate, setDraggedTemplate] = useState<ShiftTemplate | null>(null);
    const [dropTarget, setDropTarget] = useState<{ targetId: string; type: 'employee' | 'group'; date: string } | null>(null);


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

    const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

    const displayRows = useMemo(() => {
        if (displayMode === 'employees') {
            return employees
                .filter(e => plannerVisibleEmployeeIds.includes(e.id))
                .sort((a, b) => a.lastName.localeCompare(b.lastName))
                .map(e => ({
                    type: 'employee' as const,
                    id: e.id.toString(),
                    data: e,
                    label: `${e.firstName} ${e.lastName}`,
                    subLabel: '',
                    avatarDetails: { firstName: e.firstName, lastName: e.lastName },
                    shifts: shifts.filter(s => s.employeeId === e.id),
                    color: undefined,
                    employeeIds: [e.id]
                }));
        } else {
            return employeeGroups
                .filter(g => selectedGroupIds.includes(g.id))
                .map(g => ({
                    type: 'group' as const,
                    id: g.id,
                    data: g,
                    label: g.name,
                    subLabel: `${g.employeeIds.length} Mitarbeiter`,
                    avatarDetails: { firstName: g.name.substring(0, 1), lastName: g.name.substring(1, 2) },
                    shifts: shifts.filter(s => g.employeeIds.includes(s.employeeId)),
                    color: g.color || '#9ca3af',
                    employeeIds: g.employeeIds
                }));
        }
    }, [displayMode, employees, plannerVisibleEmployeeIds, employeeGroups, selectedGroupIds, shifts]);

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

        // Don't open modal if we're dragging
        if (isDragging || isInputDisabled) return;

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

    // Handle week copy
    const handleWeekCopy = (targetWeekStart: Date) => {
        const sourceWeekStart = getStartOfWeek(viewStartDateTime);
        const dayDiff = Math.round((targetWeekStart.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24));

        const sourceWeekEnd = new Date(sourceWeekStart);
        sourceWeekEnd.setDate(sourceWeekEnd.getDate() + 7);

        const weekShifts = shifts.filter(shift => {
            const shiftDate = new Date(shift.start);
            return shiftDate >= sourceWeekStart && shiftDate < sourceWeekEnd;
        });

        weekShifts.forEach(shift => {
            const newStart = new Date(shift.start);
            newStart.setDate(newStart.getDate() + dayDiff);

            const newEnd = new Date(shift.end);
            newEnd.setDate(newEnd.getDate() + dayDiff);

            addShift({
                ...shift,
                id: undefined,
                start: newStart.toISOString(),
                end: newEnd.toISOString()
            } as Omit<Shift, 'id'>);
        });

        setIsWeekCopyModalOpen(false);
    };


    // Drag and drop handlers
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragStart = (e: React.DragEvent, shift: Shift) => {
        setIsDragging(true);
        setDraggedShift(shift);
        e.dataTransfer.effectAllowed = 'move';
        // Add a semi-transparent effect
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        // Delay resetting isDragging to prevent onClick from firing
        setTimeout(() => setIsDragging(false), 100);
        setDraggedShift(null);
        setDropTarget(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent, targetId: string, type: 'employee' | 'group', date: string) => {
        e.preventDefault();
        // Set appropriate cursor based on what's being dragged
        if (draggedShift) {
            e.dataTransfer.dropEffect = 'move';
        } else if (draggedTemplate) {
            e.dataTransfer.dropEffect = 'copy';
        }
        setDropTarget({ targetId, type, date });
    };

    const handleDragLeave = () => {
        setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: string, type: 'employee' | 'group', targetDate: string) => {
        e.preventDefault();

        if (!draggedShift && !draggedTemplate) return;

        // Determine destination employees
        let targetEmployeeIds: number[] = [];

        if (type === 'group') {
            const group = employeeGroups.find(g => g.id === targetId);
            if (group) {
                // Open modal for group assignment
                if (draggedShift) {
                    setGroupAssignData({
                        groupId: group.id,
                        shiftData: { ...draggedShift }
                    });
                } else if (draggedTemplate) {
                    const [startH, startM] = draggedTemplate.startTime.split(':').map(Number);
                    const [endH, endM] = draggedTemplate.endTime.split(':').map(Number);
                    const start = new Date(targetDate);
                    start.setHours(startH, startM, 0, 0);
                    const end = new Date(targetDate);
                    end.setHours(endH, endM, 0, 0);
                    if (end <= start) end.setDate(end.getDate() + 1);

                    setGroupAssignData({
                        groupId: group.id,
                        shiftData: {
                            start: start.toISOString(),
                            end: end.toISOString(),
                            label: draggedTemplate.label || draggedTemplate.name,
                            color: draggedTemplate.color,
                            templateId: draggedTemplate.id,
                        }
                    });
                }
                setShowGroupAssignModal(true);
                setDraggedShift(null);
                setDraggedTemplate(null);
                setDropTarget(null);
                return;
            }
        } else {
            targetEmployeeIds = [Number(targetId)];
        }

        const targetEmployeeId = targetEmployeeIds[0];

        // Handle shift drag & drop (Individual)
        if (draggedShift) {
            // Calculate the time difference to maintain the same time of day
            const originalStart = new Date(draggedShift.start);
            const originalEnd = new Date(draggedShift.end);

            // Parse target date (YYYY-MM-DD format)
            const [year, month, day] = targetDate.split('-').map(Number);

            // Create new dates with same time but different day
            const newStart = new Date(year, month - 1, day, originalStart.getHours(), originalStart.getMinutes());
            const newEnd = new Date(year, month - 1, day, originalEnd.getHours(), originalEnd.getMinutes());

            // Handle overnight shifts
            if (originalEnd < originalStart) {
                newEnd.setDate(newEnd.getDate() + 1);
            }

            // Update the shift
            updateShift({
                ...draggedShift,
                employeeId: targetEmployeeId,
                start: newStart.toISOString(),
                end: newEnd.toISOString()
            });

            setDraggedShift(null);
            setDropTarget(null);
        }

        // Handle template drag & drop (Individual)
        if (draggedTemplate) {
            const [startH, startM] = draggedTemplate.startTime.split(':').map(Number);
            const [endH, endM] = draggedTemplate.endTime.split(':').map(Number);

            const start = new Date(targetDate);
            start.setHours(startH, startM, 0, 0);

            const end = new Date(targetDate);
            end.setHours(endH, endM, 0, 0);

            // Handle overnight shifts
            if (end <= start) {
                end.setDate(end.getDate() + 1);
            }

            addShift({
                employeeId: targetEmployeeId,
                start: start.toISOString(),
                end: end.toISOString(),
                label: draggedTemplate.label || draggedTemplate.name,
                color: draggedTemplate.color,
                templateId: draggedTemplate.id,
            });

            setDraggedTemplate(null);
            setDropTarget(null);
        }

        // Handle template drag & drop
        else if (draggedTemplate) {
            const [startHour, startMin] = draggedTemplate.startTime.split(':').map(Number);
            const [endHour, endMin] = draggedTemplate.endTime.split(':').map(Number);

            const [year, month, day] = targetDate.split('-').map(Number);
            const start = new Date(year, month - 1, day, startHour, startMin);
            const end = new Date(year, month - 1, day, endHour, endMin);

            // Handle overnight shifts
            if (end < start) {
                end.setDate(end.getDate() + 1);
            }

            // Create shift from template
            addShift({
                employeeId: targetEmployeeId,
                start: start.toISOString(),
                end: end.toISOString(),
                label: draggedTemplate.name,
                color: draggedTemplate.color,
                customerId: draggedTemplate.customerId,
                activityId: draggedTemplate.activityId,
            } as Omit<Shift, 'id'>);

            setDraggedTemplate(null);
            setDropTarget(null);
        }
    };

    // Template drag handlers
    const handleTemplateDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
        setDraggedTemplate(template);
        e.dataTransfer.effectAllowed = 'copy';
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleTemplateDragEnd = (e: React.DragEvent) => {
        setDraggedTemplate(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };


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

    // --- GROUP ASSIGNMENT HANDLERS ---
    const handleGroupAssignAll = () => {
        if (!groupAssignData) return;
        const { groupId, shiftData } = groupAssignData;
        const group = employeeGroups.find(g => g.id === groupId);
        if (!group) return;

        group.employeeIds.forEach(empId => {
            // Check if employee exists
            if (employees.find(e => e.id === empId)) {
                addShift({
                    ...shiftData,
                    employeeId: empId,
                    start: shiftData.start!,
                    end: shiftData.end!,
                    label: shiftData.label || 'Schicht',
                    color: shiftData.color || '#3b82f6',
                } as Shift);
            }
        });
        setShowGroupAssignModal(false);
        setGroupAssignData(null);
    };

    const handleGroupAssignOne = (employeeId: number) => {
        if (!groupAssignData) return;
        const { shiftData } = groupAssignData;

        addShift({
            ...shiftData,
            employeeId: employeeId,
            start: shiftData.start!,
            end: shiftData.end!,
            label: shiftData.label || 'Schicht',
            color: shiftData.color || '#3b82f6',
        } as Shift);
        setShowGroupAssignModal(false);
        setGroupAssignData(null);
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
                        Planer
                    </button>
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`${activeTab === 'management'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center gap-2`}
                    >
                        <CogIcon className="h-5 w-5" />
                        Verwaltung
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
                                            draggable={true}
                                            onDragStart={(e) => handleTemplateDragStart(e, t)}
                                            onDragEnd={handleTemplateDragEnd}
                                            onClick={() => setActiveTemplate(isActive ? null : t)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm transition-all flex items-center gap-2 whitespace-nowrap cursor-grab active:cursor-grabbing ${isActive
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
                                <Button onClick={() => setIsGeneratorModalOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 text-sm px-4 py-2 flex-1 xl:flex-initial justify-center">
                                    <SparklesIcon className="h-4 w-4" />
                                    <span>Schicht-Automatik</span>
                                </Button>

                                {viewMode === 'week' && (
                                    <Button
                                        onClick={() => setIsWeekCopyModalOpen(true)}
                                        className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm px-3 py-2 flex-1 xl:flex-initial justify-center"
                                        disabled={shifts.filter(s => {
                                            const shiftDate = new Date(s.start);
                                            const weekStart = getStartOfWeek(viewStartDateTime);
                                            const weekEnd = new Date(weekStart);
                                            weekEnd.setDate(weekEnd.getDate() + 7);
                                            return shiftDate >= weekStart && shiftDate < weekEnd;
                                        }).length === 0}
                                    >
                                        📋 Woche kopieren
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center justify-center w-full xl:w-auto">
                                <div className="flex items-center">
                                    <button
                                        onClick={() => shiftView(-1)}
                                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600 transition-all active:scale-95"
                                        title={t('shift_planner.prev', 'Zurück')}
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>

                                    <button
                                        onClick={() => setIsDatePickModalOpen(true)}
                                        className="group flex items-center gap-2 px-3 py-1 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <CalendarDaysIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                        <h2 className="text-base font-bold text-gray-900 whitespace-nowrap font-display tracking-tight">
                                            {dateRangeLabel}
                                        </h2>
                                    </button>

                                    <button
                                        onClick={() => shiftView(1)}
                                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600 transition-all active:scale-95"
                                        title={t('shift_planner.next', 'Vor')}
                                    >
                                        <ChevronRightIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* VIEW MODE SWITCHER */}
                            <div className="flex bg-gray-100 p-1 rounded-lg w-full xl:w-auto justify-center">
                                <button
                                    onClick={() => setViewMode('timeline')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex-1 xl:flex-initial ${viewMode === 'timeline' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {t('shift_planner.hours', 'Stunden')}
                                </button>
                                <button
                                    onClick={() => setViewMode('week')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex-1 xl:flex-initial ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {t('shift_planner.week', 'Woche')}
                                </button>
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex-1 xl:flex-initial ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {t('shift_planner.month', 'Monat')}
                                </button>
                            </div>

                            {/* Settings Dropdown */}
                            <div className="relative ml-2">
                                <Button variant="ghost" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-gray-500 hover:text-gray-700 h-full aspect-square p-2 bg-gray-100 hover:bg-gray-200 border-none rounded-lg">
                                    <CogIcon className="w-5 h-5" />
                                </Button>

                                {isSettingsOpen && (
                                    <div className="absolute top-12 right-0 w-64 bg-white border rounded-lg shadow-xl z-50 p-4 animate-fade-in">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-sm">{t('shift_planner.view_settings', 'Ansichtseinstellungen')}</h3>
                                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <Select
                                                label={t('shift_planner.start_time', 'Startzeit')}
                                                value={settingStartHour}
                                                onChange={(e) => handleSaveSettings(Number(e.target.value), settingEndHour)}
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                ))}
                                            </Select>
                                            <Select
                                                label={t('shift_planner.end_time', 'Endzeit')}
                                                value={settingEndHour}
                                                onChange={(e) => handleSaveSettings(settingStartHour, Number(e.target.value))}
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* MAIN GRID */}
                        <div className="overflow-x-auto relative hide-scroll border-t border-gray-200">
                            <div className="min-w-[800px]">
                                {/* Header: Time Slots / Days */}
                                <div className="flex bg-white border-b border-gray-200 sticky top-0 z-20 h-12 shadow-sm">
                                    {/* Employee Header with Filter */}
                                    <div
                                        className="w-40 min-w-[10rem] max-w-[10rem] shrink-0 p-3 border-r border-gray-200 font-semibold text-base text-gray-900 bg-white sticky left-0 z-30 flex items-center justify-between group cursor-pointer hover:bg-gray-50 transition-colors shadow-[2px_1px_5px_rgba(0,0,0,0.02)]"
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
                                    {displayRows.map(row => {
                                        // Common: Filter Absences for this row
                                        const rowStart = viewMode === 'timeline' ? viewStartDateTime : gridDays[0];
                                        const rowEnd = viewMode === 'timeline' ? timelineEndDateTime : gridDays[gridDays.length - 1];

                                        // Safety check if rowEnd is invalid (empty gridDays)
                                        if (!rowEnd) return null;

                                        const isGroup = row.type === 'group';
                                        const rowIdNum = isGroup ? -1 : Number(row.id);

                                        return (
                                            <div key={`${row.type}-${row.id}`} className={`flex h-16 group hover:bg-gray-50/50 transition-colors ${isGroup ? 'bg-gray-50/30' : ''}`}>
                                                {/* Label Column */}
                                                <div
                                                    className={`w-40 min-w-[10rem] max-w-[10rem] shrink-0 p-3 border-r border-gray-200 sticky left-0 z-20 bg-white group-hover:bg-gray-50 flex flex-col justify-center shadow-[2px_0_5px_rgba(0,0,0,0.02)] transition-colors ${isGroup ? 'bg-gray-50' : ''}`}
                                                    style={isGroup && row.color ? { borderLeft: `4px solid ${row.color}` } : {}}
                                                >
                                                    <div className="flex items-center w-full gap-2">
                                                        <div className="text-base font-normal text-gray-900 truncate flex-1 leading-tight">
                                                            {row.label}
                                                        </div>
                                                        {!isGroup && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    const empId = Number(row.id);
                                                                    const shiftsToDelete = shifts.filter(s => Number(s.employeeId) === empId);
                                                                    setEmployeeToDelete({
                                                                        id: empId,
                                                                        name: row.label,
                                                                        shiftCount: shiftsToDelete.length
                                                                    });
                                                                }}
                                                                className="shrink-0 p-1.5 text-gray-300 hover:text-red-600 transition-all rounded hover:bg-red-50 opacity-40 group-hover:opacity-100"
                                                                title="Alle Schichten dieses Mitarbeiters löschen"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {row.subLabel && (
                                                        <div className="text-xs text-gray-400 truncate mt-0.5">
                                                            {row.subLabel}
                                                        </div>
                                                    )}
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
                                                                        className={`flex-1 transition-colors border-r border-transparent relative group/cell ${!isGroup && (activeTemplate ? 'hover:bg-green-100/50' : 'hover:bg-blue-50/30 cursor-pointer')}`}
                                                                        onClick={() => !isGroup && handleTrackClick(rowIdNum, d)}
                                                                        title={!isGroup ? (activeTemplate ? `Vorlage anwenden` : `${d.toLocaleTimeString([], { hour: '2-digit' })} - Klicken`) : undefined}
                                                                    >
                                                                        {!isGroup && (
                                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 pointer-events-none">
                                                                                <PlusIcon className="h-4 w-4 text-gray-400" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Shifts Rendering (Using row.shifts) */}
                                                            {row.shifts.filter(s => isShiftVisible(new Date(s.start), new Date(s.end), viewStartDateTime, timelineEndDateTime)).map(shift => {
                                                                const start = new Date(shift.start);
                                                                const end = new Date(shift.end);
                                                                const pos = getPositionStyle(start, end);
                                                                const conflict = hasAbsenceConflict(shift, absenceRequests);
                                                                const hasConflict = !!conflict;

                                                                return (
                                                                    <div
                                                                        key={shift.id}
                                                                        className={`absolute top-2 bottom-2 z-10 shadow-sm flex items-center px-2 cursor-pointer hover:brightness-110 overflow-hidden text-white text-xs rounded ${hasConflict ? 'border-2 border-red-600' : 'border border-black/10'
                                                                            }`}
                                                                        style={{ ...pos, backgroundColor: shift.color || '#3b82f6' }}
                                                                        onClick={(e) => handleShiftClick(e, shift)}
                                                                        title={hasConflict
                                                                            ? `⚠️ KONFLIKT: Mitarbeiter ist im ${getAbsenceTypeLabel(conflict.type)}\n${getShiftLabel(shift)}`
                                                                            : getShiftLabel(shift)
                                                                        }
                                                                    >
                                                                        {hasConflict && (
                                                                            <ExclamationTriangleIcon className="h-3 w-3 mr-1 flex-shrink-0 text-red-200" />
                                                                        )}
                                                                        <div className="font-semibold truncate mr-1">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Absences (Timeline) - Only for employees currently */}
                                                            {!isGroup && absenceRequests.filter(req => req.employeeId === rowIdNum && req.status !== 'rejected' && ((req.startDate <= rowEnd.toLocaleDateString('sv-SE') && req.endDate >= rowStart.toLocaleDateString('sv-SE')))).map(req => {
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
                                                                const dayShifts = row.shifts.filter(s => {
                                                                    const shiftStartStr = new Date(s.start).toLocaleDateString('sv-SE');
                                                                    return shiftStartStr === dayStr;
                                                                });

                                                                // Find Absence (Only for employees)
                                                                const absence = !isGroup ? absenceRequests.find(req =>
                                                                    req.employeeId === rowIdNum &&
                                                                    req.status !== 'rejected' &&
                                                                    dayStr >= req.startDate && dayStr <= req.endDate
                                                                ) : null;

                                                                const isToday = day.toDateString() === new Date().toDateString();
                                                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                                const isDropTarget = dropTarget?.targetId === row.id && dropTarget?.date === dayStr;

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className={`flex-1 border-r border-gray-100 last:border-r-0 relative p-1 flex flex-col gap-1 overflow-hidden group/cell
                                                                            ${draggedTemplate ? 'cursor-copy' : (!isGroup && activeTemplate) ? 'hover:bg-green-50 cursor-pointer' : (!isGroup ? 'hover:bg-blue-50/50 cursor-pointer' : '')}
                                                                            ${isToday ? 'bg-blue-50/30' : isWeekend ? 'bg-gray-50/30' : ''}
                                                                            ${isDropTarget ? 'bg-green-100 ring-2 ring-green-500 ring-inset' : ''}
                                                                        `}
                                                                        onClick={() => !isGroup && handleTrackClick(rowIdNum, day)}
                                                                        onDragOver={(e) => handleDragOver(e, row.id, row.type, dayStr)}
                                                                        onDragLeave={handleDragLeave}
                                                                        onDrop={(e) => handleDrop(e, row.id, row.type, dayStr)}
                                                                    >
                                                                        {/* Hover Plus Icon - only show in empty cells and for employees */}
                                                                        {!isGroup && dayShifts.length === 0 && (
                                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                                                <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150">
                                                                                    <PlusIcon className="h-4 w-4 text-gray-400" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {/* Absence Layer */}
                                                                        {absence && (
                                                                            <div className={`absolute inset-0 opacity-40 z-0 absence-pattern flex items-center justify-center`} style={{ backgroundColor: getAbsenceStyle(absence.type).bg }}>
                                                                                {viewMode === 'week' && <span className="text-xs font-bold -rotate-12 opacity-80">{getAbsenceStyle(absence.type).label}</span>}
                                                                            </div>
                                                                        )}

                                                                        {/* Shifts */}
                                                                        {dayShifts.map(shift => {
                                                                            const conflict = hasAbsenceConflict(shift, absenceRequests);
                                                                            const hasConflict = !!conflict;

                                                                            return (
                                                                                <div
                                                                                    key={shift.id}
                                                                                    draggable={true}
                                                                                    onDragStart={(e) => handleDragStart(e, shift)}
                                                                                    onDragEnd={handleDragEnd}
                                                                                    className={`relative z-10 text-xs text-white rounded px-1.5 py-0.5 shadow-sm truncate cursor-grab active:cursor-grabbing hover:scale-105 transition-transform ${viewMode === 'month' ? 'h-full flex items-center justify-center' : ''
                                                                                        } ${hasConflict ? 'ring-2 ring-red-600 ring-inset' : ''
                                                                                        }`}
                                                                                    style={{ backgroundColor: shift.color || '#3b82f6' }}
                                                                                    onClick={(e) => handleShiftClick(e, shift)}
                                                                                    title={hasConflict
                                                                                        ? `⚠️ KONFLIKT: Mitarbeiter ist im ${getAbsenceTypeLabel(conflict.type)}\n${getShiftLabel(shift)} (${new Date(shift.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${new Date(shift.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                                                                                        : `${getShiftLabel(shift)} (${new Date(shift.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${new Date(shift.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                                                                                    }
                                                                                >
                                                                                    {viewMode === 'week' ? (
                                                                                        <>
                                                                                            <div className="flex items-center gap-1">
                                                                                                {hasConflict && <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0 text-red-200" />}
                                                                                                <div className="font-bold">{new Date(shift.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                                            </div>
                                                                                            <div className="truncate opacity-90 text-[10px]">{getShiftLabel(shift)}</div>
                                                                                        </>
                                                                                    ) : (
                                                                                        // Compact for Month
                                                                                        <div className="font-bold text-center">{shift.label ? shift.label.substring(0, 3) : new Date(shift.start).getHours()}</div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {displayRows.length === 0 && (
                                        <div className="p-8 text-center text-gray-500 italic">Keine Einträge für die aktuelle Auswahl gefunden.</div>
                                    )}


                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'management' && (
                <div className="animate-fade-in">
                    <Card>
                        <h2 className="text-2xl font-bold mb-6">Verwaltung</h2>
                        <p className="text-gray-600 mb-6">
                            Verwalten Sie Schichtvorlagen, Rotationsmuster und Mitarbeitergruppen
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Schichtvorlagen */}
                            <button
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="w-16 h-16 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center mb-4 transition-colors">
                                    <CogIcon className="h-8 w-8 text-gray-600 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors">Schichtvorlagen</h3>
                                <p className="text-sm text-gray-500 text-center">
                                    Erstellen und bearbeiten Sie wiederverwendbare Schichtvorlagen
                                </p>
                                <div className="mt-4 text-sm font-medium text-blue-600">
                                    {shiftTemplates.length} Vorlagen
                                </div>
                            </button>

                            {/* Rotationsmuster */}
                            <button
                                onClick={() => setIsRotationPatternManagementOpen(true)}
                                className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                                <div className="w-16 h-16 bg-gray-100 group-hover:bg-purple-100 rounded-full flex items-center justify-center mb-4 transition-colors text-3xl">
                                    🔄
                                </div>
                                <h3 className="text-lg font-bold mb-2 group-hover:text-purple-600 transition-colors">Rotationsmuster</h3>
                                <p className="text-sm text-gray-500 text-center">
                                    Definieren Sie wiederkehrende Schichtmuster für Rotationen
                                </p>
                                <div className="mt-4 text-sm font-medium text-purple-600">
                                    {rotationPatterns.length} Muster
                                </div>
                            </button>

                            {/* Mitarbeitergruppen */}
                            <button
                                onClick={() => setIsEmployeeGroupManagementOpen(true)}
                                className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                            >
                                <div className="w-16 h-16 bg-gray-100 group-hover:bg-green-100 rounded-full flex items-center justify-center mb-4 transition-colors text-3xl">
                                    👥
                                </div>
                                <h3 className="text-lg font-bold mb-2 group-hover:text-green-600 transition-colors">Mitarbeitergruppen</h3>
                                <p className="text-sm text-gray-500 text-center">
                                    Gruppieren Sie Mitarbeiter für gemeinsame Schichtzuweisungen
                                </p>
                                <div className="mt-4 text-sm font-medium text-green-600">
                                    {employeeGroups.length} Gruppen
                                </div>
                            </button>
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
                    shiftTemplates={shiftTemplates}
                    absenceRequests={absenceRequests}
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

            {isRotationPatternManagementOpen && (
                <RotationPatternManagementModal
                    isOpen={isRotationPatternManagementOpen}
                    onClose={() => setIsRotationPatternManagementOpen(false)}
                    patterns={rotationPatterns}
                    shiftTemplates={shiftTemplates}
                    onAdd={addRotationPattern}
                    onUpdate={updateRotationPattern}
                    onDelete={deleteRotationPattern}
                />
            )}

            {isEmployeeGroupManagementOpen && (
                <EmployeeGroupManagementModal
                    isOpen={isEmployeeGroupManagementOpen}
                    onClose={() => setIsEmployeeGroupManagementOpen(false)}
                    groups={employeeGroups}
                    employees={employees}
                    onAdd={addEmployeeGroup}
                    onUpdate={updateEmployeeGroup}
                    onDelete={deleteEmployeeGroup}
                />
            )}

            {isGeneratorModalOpen && (
                <ShiftPatternGeneratorModal
                    isOpen={isGeneratorModalOpen}
                    onClose={() => setIsGeneratorModalOpen(false)}
                    templates={shiftTemplates}
                    employees={employees}
                    employeeGroups={employeeGroups}
                    rotationPatterns={rotationPatterns}
                    onGenerate={(generatedShifts) => {
                        generatedShifts.forEach(s => addShift(s));
                        setIsGeneratorModalOpen(false);
                    }}
                    shifts={shifts}
                    deleteShift={deleteShift}
                />
            )}

            {isRotationPatternManagementOpen && (
                <RotationPatternManagementModal
                    isOpen={isRotationPatternManagementOpen}
                    onClose={() => setIsRotationPatternManagementOpen(false)}
                    patterns={rotationPatterns}
                    shiftTemplates={shiftTemplates}
                    onAdd={addRotationPattern}
                    onUpdate={updateRotationPattern}
                    onDelete={deleteRotationPattern}
                />
            )}

            {isEmployeeGroupManagementOpen && (
                <EmployeeGroupManagementModal
                    isOpen={isEmployeeGroupManagementOpen}
                    onClose={() => setIsEmployeeGroupManagementOpen(false)}
                    groups={employeeGroups}
                    employees={employees}
                    onAdd={addEmployeeGroup}
                    onUpdate={updateEmployeeGroup}
                    onDelete={deleteEmployeeGroup}
                />
            )}

            {showGroupAssignModal && (
                <GroupAssignmentModal
                    isOpen={showGroupAssignModal}
                    onClose={() => setShowGroupAssignModal(false)}
                    group={groupAssignData ? employeeGroups.find(g => g.id === groupAssignData.groupId) || null : null}
                    employees={employees}
                    onAssignAll={handleGroupAssignAll}
                    onAssignOne={handleGroupAssignOne}
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

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={employeeToDelete !== null}
                onClose={() => setEmployeeToDelete(null)}
                onConfirm={() => {
                    if (employeeToDelete) {
                        const shiftsToDelete = shifts.filter(s => Number(s.employeeId) === employeeToDelete.id);
                        deleteShiftsByEmployee(employeeToDelete.id);
                        shiftsToDelete.forEach(shift => deleteShift(shift.id));
                        setEmployeeToDelete(null);
                    }
                }}
                title="Schichten löschen"
                message={employeeToDelete
                    ? `Möchten Sie wirklich alle ${employeeToDelete.shiftCount} Schichten für ${employeeToDelete.name} löschen?`
                    : ''
                }
                confirmText="Löschen"
                cancelText="Abbrechen"
            />

            <WeekCopyModal
                isOpen={isWeekCopyModalOpen}
                onClose={() => setIsWeekCopyModalOpen(false)}
                onCopy={handleWeekCopy}
                sourceWeekStart={getStartOfWeek(viewStartDateTime)}
                shiftCount={shifts.filter(s => {
                    const shiftDate = new Date(s.start);
                    const weekStart = getStartOfWeek(viewStartDateTime);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return shiftDate >= weekStart && shiftDate < weekEnd;
                }).length}
            />
        </div>
    );
};
