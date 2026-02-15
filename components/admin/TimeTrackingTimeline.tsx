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
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={handlePrevDay} className="p-1 hover:bg-white rounded shadow-sm text-gray-600">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleToday} className="px-3 py-1 text-sm font-semibold text-gray-700 hover:text-gray-900">
                            Heute
                        </button>
                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                        <button className="px-3 py-1 text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-500" />
                            {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </button>
                        <button onClick={handleNextDay} className="p-1 hover:bg-white rounded shadow-sm text-gray-600">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2 relative">
                    <Button variant="ghost" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-gray-500 hover:text-gray-700">
                        <CogIcon className="w-5 h-5" />
                    </Button>

                    {isSettingsOpen && (
                        <div className="absolute top-10 right-0 w-64 bg-white border rounded-lg shadow-xl z-50 p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-sm">Ansichtseinstellungen</h3>
                                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <Select
                                    label="Startzeit"
                                    value={startHour}
                                    onChange={(e) => handleSaveSettings(Number(e.target.value), endHour)}
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                    ))}
                                </Select>
                                <Select
                                    label="Endzeit"
                                    value={endHour}
                                    onChange={(e) => handleSaveSettings(startHour, Number(e.target.value))}
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

            {/* Timeline Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Employees */}
                <div className="w-48 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50/50">
                    <div
                        className="h-12 border-b border-gray-200 bg-white sticky top-0 z-30 flex items-center justify-between p-3 font-semibold text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors group"
                        onClick={() => setIsFilterModalOpen(true)}
                    >
                        <span>Mitarbeiter</span>
                        <AdjustmentsHorizontalIcon className={`h-5 w-5 ${visibleEmployeeIds.length !== employees.length ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                    </div>
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="h-16 border-b flex items-center px-3 hover:bg-white transition-colors">
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-normal text-gray-900 truncate leading-tight">
                                    {emp.firstName} {emp.lastName}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    {/* Optional summary info could go here, e.g. "8:00h" */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                    {/* Time Scale Header */}
                    <div ref={scrollContainerRef} className="flex-1 w-full h-full flex flex-col">
                        {/* Header Row */}
                        <div className="h-12 border-b border-gray-200 bg-white flex w-full sticky top-0 z-20">
                            {timelineSlots.slice(0, -1).map((time, index) => (
                                <div key={index} className="flex-1 border-r border-gray-200 text-xs text-gray-500 flex items-center justify-center font-medium min-w-0">

                                    <span className="truncate px-1">{time.getHours().toString().padStart(2, '0')}</span>
                                </div>
                            ))}
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
                                        <div key={emp.id} className="h-16 border-b relative group hover:bg-gray-50/30 transition-colors w-full">
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
