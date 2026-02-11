import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Button } from './Button';
import { Card } from './Card';
import { XIcon } from '../icons/XIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface WeekCopyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCopy: (targetWeekStart: Date) => void;
    sourceWeekStart: Date;
    shiftCount: number;
}

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatWeekRange = (weekStart: Date): string => {
    const weekEnd = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

export const WeekCopyModal: React.FC<WeekCopyModalProps> = ({ isOpen, onClose, onCopy, sourceWeekStart, shiftCount }) => {
    const [selectedWeek, setSelectedWeek] = useState<Date>(addDays(sourceWeekStart, 7));
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    if (!isOpen) return null;

    const handlePreviousMonth = () => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() - 1);
        setCurrentMonth(newMonth);
    };

    const handleNextMonth = () => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + 1);
        setCurrentMonth(newMonth);
    };

    const handleCopy = () => {
        onCopy(selectedWeek);
        onClose();
    };

    // Generate calendar weeks for the current month
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const firstWeekStart = getStartOfWeek(firstDayOfMonth);

    const weeks: Date[] = [];
    let currentWeekStart = firstWeekStart;
    while (currentWeekStart <= lastDayOfMonth) {
        weeks.push(new Date(currentWeekStart));
        currentWeekStart = addDays(currentWeekStart, 7);
    }

    const isSameWeek = (date1: Date, date2: Date) => {
        return getStartOfWeek(date1).getTime() === getStartOfWeek(date2).getTime();
    };

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Woche kopieren</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {shiftCount} Schicht{shiftCount !== 1 ? 'en' : ''} von KW {formatWeekRange(sourceWeekStart)} kopieren
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <XIcon className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between">
                            <button onClick={handlePreviousMonth} className="p-2 hover:bg-gray-100 rounded-full">
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <h3 className="text-lg font-semibold">
                                {currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Week Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zielwoche auswählen:
                            </label>
                            {weeks.map((week, index) => {
                                const isSelected = isSameWeek(week, selectedWeek);
                                const isSourceWeek = isSameWeek(week, sourceWeekStart);

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedWeek(week)}
                                        disabled={isSourceWeek}
                                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${isSourceWeek
                                                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : isSelected
                                                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">
                                                KW {formatWeekRange(week)}
                                            </span>
                                            {isSourceWeek && (
                                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">Quellwoche</span>
                                            )}
                                            {isSelected && !isSourceWeek && (
                                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Ausgewählt</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-900">
                                <strong>Hinweis:</strong> Alle {shiftCount} Schicht{shiftCount !== 1 ? 'en' : ''} werden in die ausgewählte Woche kopiert.
                                Die Wochentage bleiben gleich (z.B. Montag → Montag).
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                        <Button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300">
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleCopy}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={isSameWeek(selectedWeek, sourceWeekStart)}
                        >
                            {shiftCount} Schicht{shiftCount !== 1 ? 'en' : ''} kopieren
                        </Button>
                    </div>
                </Card>
            </div>
        </>,
        document.body
    );
};
