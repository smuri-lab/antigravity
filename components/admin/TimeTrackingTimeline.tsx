import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Employee, TimeEntry, Customer, Activity, CompanySettings } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { formatHoursAndMinutes } from '../utils';
import { CogIcon } from '../icons/CogIcon';
import { XIcon } from '../icons/XIcon';
import { Select } from '../ui/Select';
import { CalendarIcon } from '../icons/CalendarIcon';
import { EmployeeMultiSelectModal } from './EmployeeMultiSelectModal';
import { AdjustmentsHorizontalIcon } from '../icons/AdjustmentsHorizontalIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';

interface TimeTrackingTimelineProps {
    employees: Employee[];
    timeEntries: TimeEntry[];
    customers: Customer[];
    activities: Activity[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    companySettings: CompanySettings;
    onUpdateSettings: (settings: CompanySettings) => void;
}

export const TimeTrackingTimeline: React.FC<TimeTrackingTimelineProps> = ({
    employees,
    timeEntries,
    customers,
    activities,
    currentDate,
    onDateChange,
    companySettings,
    onUpdateSettings
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [visibleEmployeeIds, setVisibleEmployeeIds] = useState<number[]>(() => employees.filter(e => e.isActive).map(e => e.id));
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Settings for view range
    const startHour = companySettings.timeTrackingStartHour ?? 6;
    const endHour = companySettings.timeTrackingEndHour ?? 22;

    // Helpers for timeline
    const totalHours = useMemo(() => {
        let duration = endHour - startHour;
        if (duration <= 0) duration += 24;
        return duration || 24;
    }, [startHour, endHour]);

    const timelineSlots = useMemo(() => {
        const slots = [];
        const baseDate = new Date(currentDate);
        baseDate.setHours(startHour, 0, 0, 0);

        for (let i = 0; i <= totalHours; i++) {
            const d = new Date(baseDate);
            d.setHours(baseDate.getHours() + i);
            slots.push(d);
        }
        return slots;
    }, [currentDate, startHour, totalHours]);

    const viewStartMs = useMemo(() => {
        const d = new Date(currentDate);
        d.setHours(startHour, 0, 0, 0);
        return d.getTime();
    }, [currentDate, startHour]);

    const viewEndMs = useMemo(() => {
        const d = new Date(currentDate);
        d.setHours(startHour + totalHours, 0, 0, 0);
        return d.getTime();
    }, [currentDate, startHour, totalHours]);

    // Handle Day Navigation
    const handlePrevDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        onDateChange(newDate);
    };

    const handleToday = () => {
        onDateChange(new Date());
    };

    // Settings Handler
    const handleSaveSettings = (newStart: number, newEnd: number) => {
        onUpdateSettings({
            ...companySettings,
            timeTrackingStartHour: newStart,
            timeTrackingEndHour: newEnd
        });
        setIsSettingsOpen(false);
    };

    const getPositionStyle = (start: string, end: string) => {
        const startMs = new Date(start).getTime();
        const endMs = new Date(end).getTime();
        const totalDurationMs = viewEndMs - viewStartMs;

        if (endMs <= viewStartMs || startMs >= viewEndMs) return { display: 'none' };

        const effectiveStartMs = Math.max(startMs, viewStartMs);
        const effectiveEndMs = Math.min(endMs, viewEndMs);

        // Limit to 100% to avoid overflow
        let leftPercent = ((effectiveStartMs - viewStartMs) / totalDurationMs) * 100;
        let widthPercent = ((effectiveEndMs - effectiveStartMs) / totalDurationMs) * 100;

        if (leftPercent < 0) leftPercent = 0;
        if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`
        };
    };

    const filteredEmployees = useMemo(() => {
        // Show active employees, sorted by last name, filtered by selection
        return employees
            .filter(e => e.isActive && visibleEmployeeIds.includes(e.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [employees, visibleEmployeeIds]);

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">
            {/* Header Toolbar */}
            {/* Header Toolbar */}
            <div className="flex flex-col xl:flex-row items-center justify-between p-4 gap-4 border-b">
                {/* Actions / Filter */}
                <div className="flex items-center gap-2 w-full xl:w-auto">
                    <Button onClick={() => { }} className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 text-sm px-4 py-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Zeit erfassen</span>
                    </Button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-center gap-4 w-full xl:w-auto">
                    <button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <button onClick={handleToday} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                        <CalendarDaysIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap tracking-tight">
                            {currentDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })},
                            <span className="ml-1 text-gray-500 font-medium">08:00 Uhr</span>
                        </h2>
                    </button>
                    <button onClick={handleNextDay} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {/* View Switcher Placeholder (matching ShiftPlanner) */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-full xl:w-auto justify-center">
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm flex-1 xl:flex-initial">
                        Stunden
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 flex-1 xl:flex-initial">
                        Woche
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 flex-1 xl:flex-initial">
                        Monat
                    </button>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Employees */}
                <div className="w-40 min-w-[10rem] max-w-[10rem] flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div
                        className="h-12 border-b border-gray-200 bg-white sticky top-0 z-30 flex items-center justify-between p-3 font-semibold text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors group shadow-sm"
                        onClick={() => setIsFilterModalOpen(true)}
                    >
                        <span>Mitarbeiter</span>
                        <AdjustmentsHorizontalIcon className={`h-5 w-5 ${visibleEmployeeIds.length !== employees.length ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                    </div>
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="h-16 border-b flex items-center px-3 hover:bg-white transition-colors group">
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-normal text-gray-900 truncate leading-tight">
                                    {emp.firstName} {emp.lastName}
                                </div>
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-all">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                    {/* Time Scale Header */}
                    <div ref={scrollContainerRef} className="flex-1 w-full h-full flex flex-col">
                        {/* Header Row */}
                        <div className="h-12 border-b border-gray-200 flex w-full sticky top-0 z-20">
                            {timelineSlots.slice(0, -1).map((time, index) => {
                                const displayHour = time.getHours().toString().padStart(2, '0');
                                return (
                                    <div key={index} className="flex-1 border-r border-gray-200 text-xs text-gray-500 flex flex-col items-center justify-center font-medium min-w-0 bg-gray-50/30 relative">
                                        <span className="truncate px-1">{displayHour}:00</span>
                                        <div className="absolute bottom-0 h-1 w-px bg-gray-300 left-1/2"></div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Employee Rows - Wrapper for scrolling content if needed, but width is 100% */}
                        <div className="relative flex-1 w-full overflow-y-auto">
                            {/* Vertical Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none w-full min-h-full">
                                {timelineSlots.slice(0, -1).map((_, index) => (
                                    <div key={index} className="flex-1 border-r border-gray-100 h-full"></div>
                                ))}
                            </div>

                            <div className="relative z-10">
                                {filteredEmployees.map(emp => {
                                    // Filter entries for this employee and day
                                    const empEntries = timeEntries.filter(entry => {
                                        const entryStart = new Date(entry.start);
                                        const sameDay = entryStart.toDateString() === currentDate.toDateString();
                                        return entry.employeeId === emp.id && sameDay;
                                    });

                                    return (
                                        <div key={emp.id} className="h-16 border-b relative group hover:bg-blue-50/30 transition-colors w-full">
                                            {empEntries.map(entry => {
                                                const style = getPositionStyle(entry.start, entry.end);
                                                if (style.display === 'none') return null;

                                                // Color Handling (Activity or Customer based)
                                                const activity = activities.find(a => a.id === entry.activityId);
                                                // const customer = customers.find(c => c.id === entry.customerId);
                                                // Minimalistic color logic - could be expanded
                                                const barColor = '#3b82f6'; // blue-500 default

                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className="absolute top-2 bottom-2 bg-blue-500 rounded-md border border-blue-600 opacity-90 hover:opacity-100 cursor-pointer shadow-sm overflow-hidden z-20"
                                                        style={{ ...style, backgroundColor: barColor }}
                                                        title={`${new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(entry.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${activity?.name || 'Aktivität'})`}
                                                    >
                                                        <div className="text-[10px] text-white px-1 font-medium truncate leading-4">
                                                            {activity?.name || '???'}
                                                        </div>
                                                        <div className="text-[9px] text-blue-100 px-1 truncate leading-3 hidden sm:block">
                                                            {formatHoursAndMinutes(((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 3600000))}h
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                                {filteredEmployees.length === 0 && (
                                    <div className="p-8 text-center text-gray-500">
                                        Keine Mitarbeiter gefunden.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isFilterModalOpen && (
                <EmployeeMultiSelectModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    employees={employees}
                    selectedEmployeeIds={visibleEmployeeIds}
                    onApply={(ids) => {
                        setVisibleEmployeeIds(ids.map(Number));
                        setIsFilterModalOpen(false);
                    }}
                    title="Mitarbeiter filtern"
                />
            )}
        </div>
    );
};
