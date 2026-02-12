
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { RotationTemplate, PatternBlock as StoredPatternBlock } from '../../types';
import { SaveRotationTemplateModal } from './SaveRotationTemplateModal';
import { LoadRotationTemplateModal } from './LoadRotationTemplateModal';
import { BookmarkIcon } from '../icons/BookmarkIcon';
import { FolderOpenIcon } from '../icons/FolderOpenIcon';
import type { Employee, ShiftTemplate, Shift } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { SelectorButton } from '../ui/SelectorButton';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { EmployeeMultiSelectModal } from './EmployeeMultiSelectModal';
import { CalendarModal } from '../ui/CalendarModal';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface ShiftPatternGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ShiftTemplate[];
    employees: Employee[];
    shifts: Shift[]; // Existing shifts for conflict checking
    onGenerate: (shifts: Omit<Shift, 'id'>[]) => void;
    deleteShift: (id: string) => void;
}

interface PatternBlock {
    template: ShiftTemplate | null;
    days: number;
}

// Helper to format date
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const ShiftPatternGeneratorModal: React.FC<ShiftPatternGeneratorModalProps> = ({
    isOpen, onClose, templates, employees, shifts, onGenerate, deleteShift
}) => {
    const [generationMode, setGenerationMode] = useState<'rotation' | 'weekly'>('rotation');
    const [rotationInputMode, setRotationInputMode] = useState<'blocks' | 'individual'>('blocks');
    const [pattern, setPattern] = useState<(ShiftTemplate | null)[]>([null, null, null, null, null]);
    const [patternBlocks, setPatternBlocks] = useState<PatternBlock[]>([
        { template: null, days: 1 }
    ]);
    const [weeklyPattern, setWeeklyPattern] = useState<Record<number, ShiftTemplate | null>>({
        1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null
    });
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [clearExisting, setClearExisting] = useState(false);

    // Rotation template state
    const [rotationTemplates, setRotationTemplates] = useState<RotationTemplate[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);

    // Modals
    const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
    const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
    const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState<{ index: number, isOpen: boolean }>({ index: -1, isOpen: false });
    const [isClosing, setIsClosing] = useState(false);

    // Load rotation templates from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('rotationTemplates');
        if (saved) {
            try {
                setRotationTemplates(JSON.parse(saved));
            } catch (error) {
                console.error('Failed to load rotation templates:', error);
            }
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setGenerationMode('rotation');
            setPattern([null, null, null, null, null]);
            setWeeklyPattern({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null });
            setSelectedEmployeeIds([]);
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setStartDate(today.toLocaleDateString('sv-SE'));
            setEndDate(nextMonth.toLocaleDateString('sv-SE'));
            setClearExisting(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const addToPattern = () => {
        setPattern(prev => [...prev, null]);
    };

    const removeFromPattern = (index: number) => {
        setPattern(prev => prev.filter((_, i) => i !== index));
    };

    const setPatternItem = (index: number, template: ShiftTemplate | null) => {
        if (generationMode === 'rotation') {
            setPattern(prev => {
                const newPattern = [...prev];
                newPattern[index] = template;
                return newPattern;
            });
        } else {
            setWeeklyPattern(prev => ({
                ...prev,
                [index]: template
            }));
        }
        setIsTemplateSelectOpen({ index: -1, isOpen: false });
    };

    // Block management functions
    const addBlock = () => {
        setPatternBlocks(prev => [...prev, { template: null, days: 1 }]);
    };

    const removeBlock = (index: number) => {
        if (patternBlocks.length > 1) {
            setPatternBlocks(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateBlock = (index: number, field: 'template' | 'days', value: any) => {
        setPatternBlocks(prev => {
            const newBlocks = [...prev];
            if (field === 'template') {
                const template = value ? templates.find(t => String(t.id) === String(value)) || null : null;
                newBlocks[index] = { ...newBlocks[index], template };
            } else {
                newBlocks[index] = { ...newBlocks[index], days: Math.max(1, parseInt(value) || 1) };
            }
            return newBlocks;
        });
    };

    // Convert blocks to pattern array
    const blocksToPattern = (blocks: PatternBlock[]): (ShiftTemplate | null)[] => {
        const pattern: (ShiftTemplate | null)[] = [];
        blocks.forEach(block => {
            for (let i = 0; i < block.days; i++) {
                pattern.push(block.template);
            }
        });
        return pattern;
    };

    // Calculate total days for display
    const totalDays = React.useMemo(() => {
        if (generationMode === 'rotation') {
            if (rotationInputMode === 'blocks') {
                return patternBlocks.reduce((sum, block) => sum + block.days, 0);
            }
            return pattern.length;
        }
        return 0;
    }, [generationMode, rotationInputMode, patternBlocks, pattern]);

    // Rotation Template Functions
    const saveRotationTemplate = (name: string, description?: string) => {
        const newTemplate: RotationTemplate = {
            id: crypto.randomUUID(),
            name,
            description,
            blocks: patternBlocks.map(block => ({
                templateId: block.template?.id || null,
                days: block.days
            })),
            createdAt: new Date().toISOString()
        };

        const updated = [...rotationTemplates, newTemplate];
        setRotationTemplates(updated);
        localStorage.setItem('rotationTemplates', JSON.stringify(updated));
        setShowSaveTemplateModal(false);
    };

    const loadRotationTemplate = (template: RotationTemplate) => {
        // Convert stored blocks back to internal format with full template objects
        const loadedBlocks = template.blocks.map(block => ({
            template: block.templateId ? templates.find(t => t.id === block.templateId) || null : null,
            days: block.days
        }));

        setPatternBlocks(loadedBlocks);
        setRotationInputMode('blocks');
        setShowLoadTemplateModal(false);
    };

    const deleteRotationTemplate = (id: string) => {
        const updated = rotationTemplates.filter(t => t.id !== id);
        setRotationTemplates(updated);
        localStorage.setItem('rotationTemplates', JSON.stringify(updated));
    };

    const handleGenerate = () => {
        if (!startDate || !endDate) {
            alert('Bitte wählen Sie einen Zeitraum aus.');
            return;
        }
        if (selectedEmployeeIds.length === 0) {
            alert('Bitte wählen Sie mindestens einen Mitarbeiter aus.');
            return;
        }

        // Get final pattern based on mode
        let finalPattern: (ShiftTemplate | null)[] = [];

        if (generationMode === 'rotation') {
            if (rotationInputMode === 'blocks') {
                finalPattern = blocksToPattern(patternBlocks);
            } else {
                finalPattern = pattern;
            }

            if (finalPattern.length === 0) {
                alert('Das Muster darf nicht leer sein.');
                return;
            }
        } else if (generationMode === 'weekly' && Object.values(weeklyPattern).every(v => v === null)) {
            alert('Bitte wählen Sie mindestens einen Tag für das Wochen-Muster aus.');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const generatedShifts: Omit<Shift, 'id'>[] = [];

        // Helper to check conflicts or clear
        const shiftsToDelete: string[] = [];

        if (clearExisting) {
            shifts.forEach(s => {
                const sDate = new Date(s.start);
                // Simple check: if start of shift is within range
                if (sDate >= start && sDate <= end && selectedEmployeeIds.includes(s.employeeId)) {
                    shiftsToDelete.push(s.id);
                }
            });
        }

        selectedEmployeeIds.forEach(empId => {
            let currentDate = new Date(start);
            let patternIdx = 0; // Only for rotation

            while (currentDate <= end) {
                let template: ShiftTemplate | null = null;

                if (generationMode === 'rotation') {
                    template = finalPattern[patternIdx];
                    patternIdx = (patternIdx + 1) % finalPattern.length;
                } else {
                    const dayOfWeek = currentDate.getDay();
                    template = weeklyPattern[dayOfWeek];
                }

                if (template) {
                    const [startH, startM] = template.startTime.split(':').map(Number);
                    const [endH, endM] = template.endTime.split(':').map(Number);

                    const sTime = new Date(currentDate);
                    sTime.setHours(startH, startM, 0, 0);

                    const eTime = new Date(currentDate);
                    eTime.setHours(endH, endM, 0, 0);

                    if (eTime <= sTime) {
                        eTime.setDate(eTime.getDate() + 1);
                    }

                    generatedShifts.push({
                        employeeId: empId,
                        start: sTime.toISOString(),
                        end: eTime.toISOString(),
                        label: template.label || template.name,
                        color: template.color,
                        templateId: template.id
                    });
                }

                // Next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        // Execute changes
        if (clearExisting && shiftsToDelete.length > 0) {
            shiftsToDelete.forEach(id => deleteShift(id));
        }

        onGenerate(generatedShifts);
    };

    if (!isOpen) return null;

    // --- RENDER HELPERS ---
    const getEmployeeLabel = () => {
        if (selectedEmployeeIds.length === 0) return 'Auswählen...';
        if (selectedEmployeeIds.length === employees.length) return 'Alle Mitarbeiter';
        return `${selectedEmployeeIds.length} ausgewählt`;
    };

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-[250] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
            <Card className={`w-full max-w-3xl relative max-h-[95vh] overflow-y-auto flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <XIcon className="h-6 w-6" />
                </button>

                <div className="mb-4 border-b pb-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <SparklesIcon className="h-6 w-6 text-indigo-500" />
                            Schicht-Automatik
                        </h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setGenerationMode('rotation')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${generationMode === 'rotation' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Rotation
                            </button>
                            <button
                                onClick={() => setGenerationMode('weekly')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${generationMode === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Woche
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        {generationMode === 'rotation'
                            ? 'Definieren Sie eine Abfolge von Schichten, die sich unabhängig von Wochentagen wiederholt.'
                            : 'Definieren Sie feste Schichten für bestimmte Wochentage.'}
                    </p>
                </div>

                <div className="flex-grow space-y-4 pr-2">

                    {/* SECTION 1: SETTINGS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <SelectorButton
                                label="Mitarbeiter auswählen"
                                value={getEmployeeLabel()}
                                onClick={() => setIsEmployeeSelectOpen(true)}
                                placeholder="Auswählen..."
                            />
                        </div>
                        <div>
                            <DateSelectorButton
                                label="Zeitraum für Generierung"
                                value={startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : ''}
                                onClick={() => setIsDateRangeOpen(true)}
                                placeholder="Zeitraum wählen..."
                            />
                        </div>
                    </div>

                    {/* SECTION 2: PATTERN BUILDER */}
                    <div className="space-y-4">
                        {generationMode === 'rotation' ? (
                            <>
                                {/* Mode Toggle */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRotationInputMode('blocks')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${rotationInputMode === 'blocks'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        📦 Block-Eingabe
                                    </button>
                                    <button
                                        onClick={() => setRotationInputMode('individual')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${rotationInputMode === 'individual'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        📅 Tag-für-Tag
                                    </button>
                                </div>

                                {rotationInputMode === 'blocks' ? (
                                    /* Block Mode UI */
                                    <>
                                        <div className="flex justify-between items-center">
                                            <label className="block text-sm font-medium text-gray-700 font-display">
                                                Rotation Pattern (Blöcke)
                                            </label>
                                            <span className="text-xs text-gray-500 font-medium">
                                                Gesamt: {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'}
                                            </span>
                                        </div>

                                        <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            {patternBlocks.map((block, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                                                    {/* Template Select */}
                                                    <select
                                                        value={block.template?.id || ''}
                                                        onChange={(e) => updateBlock(idx, 'template', e.target.value)}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                        style={block.template ? {
                                                            borderColor: block.template.color,
                                                            color: block.template.color,
                                                            fontWeight: 600
                                                        } : {}}
                                                    >
                                                        <option value="">-- Frei --</option>
                                                        <option value="" disabled>────────────</option>
                                                        {templates.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>

                                                    {/* Days Input */}
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="365"
                                                        value={block.days}
                                                        onChange={(e) => updateBlock(idx, 'days', e.target.value)}
                                                        className="w-16 text-center px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                                    />
                                                    <span className="text-sm text-gray-600 w-12">
                                                        {block.days === 1 ? 'Tag' : 'Tage'}
                                                    </span>

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => removeBlock(idx)}
                                                        disabled={patternBlocks.length === 1}
                                                        className={`p-2 rounded-lg transition-colors ${patternBlocks.length === 1
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                                            }`}
                                                        title={patternBlocks.length === 1 ? 'Mindestens ein Block erforderlich' : 'Block löschen'}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={addBlock}
                                                className="w-full py-2 px-4 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium text-sm flex items-center justify-center gap-2"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                                Block hinzufügen
                                            </button>
                                        </div>

                                        {totalDays > 0 && (
                                            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                                                📊 Rotationszyklus: <strong>{totalDays} Tage</strong>
                                            </div>
                                        )}

                                        {/* Save/Load Template Buttons */}
                                        {totalDays > 0 && (
                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    onClick={() => setShowSaveTemplateModal(true)}
                                                    className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                >
                                                    <BookmarkIcon className="h-4 w-4" />
                                                    Als Vorlage speichern
                                                </button>

                                                {rotationTemplates.length > 0 && (
                                                    <button
                                                        onClick={() => setShowLoadTemplateModal(true)}
                                                        className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm relative"
                                                    >
                                                        <FolderOpenIcon className="h-4 w-4" />
                                                        Vorlage laden
                                                        <span className="absolute -top-1 -right-1 bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                                                            {rotationTemplates.length}
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Individual Day Mode UI (existing) */
                                    <>
                                        <div className="flex justify-between items-end">
                                            <label className="block text-sm font-medium text-gray-700 font-display">Muster definieren ({pattern.length} Tage Zyklus)</label>
                                            <button onClick={addToPattern} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                                <PlusIcon className="h-4 w-4" /> Tag hinzufügen
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-start bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            {pattern.map((template, index) => (
                                                <div key={index} className="relative group">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Tag {index + 1}</span>
                                                        <button
                                                            onClick={() => setIsTemplateSelectOpen({ index, isOpen: true })}
                                                            className={`w-24 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${template
                                                                ? 'bg-white border-transparent shadow-sm'
                                                                : 'bg-white border-dashed border-gray-300 text-gray-400 hover:border-gray-400'
                                                                }`}
                                                            style={template ? { borderColor: template.color, color: template.color } : {}}
                                                        >
                                                            {template ? (
                                                                <>
                                                                    <span className="font-bold text-sm truncate w-full text-center px-1 font-display">{template.name}</span>
                                                                    <span className="text-[10px] opacity-75 font-sans">{template.startTime}-{template.endTime}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm">Frei</span>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {pattern.length > 1 && (
                                                        <button
                                                            onClick={() => removeFromPattern(index)}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                            title="Tag entfernen"
                                                        >
                                                            <XIcon className="h-3 w-3" />
                                                        </button>
                                                    )}

                                                    {/* Template Selection Popover */}
                                                    {isTemplateSelectOpen.isOpen && isTemplateSelectOpen.index === index && (
                                                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 max-h-60 overflow-y-auto">
                                                            <div className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-tight">Vorlage wählen</div>
                                                            <button
                                                                onClick={() => setPatternItem(index, null)}
                                                                className="w-full text-left px-2 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-600 mb-1"
                                                            >
                                                                Frei / Keine Schicht
                                                            </button>
                                                            {templates.map(t => (
                                                                <button
                                                                    key={t.id}
                                                                    onClick={() => setPatternItem(index, t)}
                                                                    className="w-full text-left px-2 py-2 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-2"
                                                                >
                                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }}></div>
                                                                    <span className="truncate">{t.name}</span>
                                                                </button>
                                                            ))}
                                                            <div className="border-t mt-1 pt-1">
                                                                <button onClick={() => setIsTemplateSelectOpen({ index: -1, isOpen: false })} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2">Abbrechen</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={addToPattern}
                                                className="w-8 h-12 mt-4 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors bg-white/50"
                                                title="Tag hinzufügen"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <label className="block text-sm font-medium text-gray-700 font-display">Wochen-Muster festlegen (Feste Tage)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                        const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                                        const template = weeklyPattern[dayIdx];
                                        return (
                                            <div key={dayIdx} className="relative group">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-[10px] uppercase font-bold ${dayIdx === 0 || dayIdx === 6 ? 'text-red-400' : 'text-gray-400'}`}>
                                                        {days[dayIdx]}
                                                    </span>
                                                    <button
                                                        onClick={() => setIsTemplateSelectOpen({ index: dayIdx, isOpen: true })}
                                                        className={`w-full h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${template
                                                            ? 'bg-white border-transparent shadow-sm'
                                                            : 'bg-white border-dashed border-gray-300 text-gray-400 hover:border-gray-400'
                                                            }`}
                                                        style={template ? { borderColor: template.color, color: template.color } : {}}
                                                    >
                                                        {template ? (
                                                            <>
                                                                <span className="font-bold text-xs truncate w-full text-center px-1 font-display">{template.name}</span>
                                                                <span className="text-[10px] opacity-75 font-sans">{template.startTime}-{template.endTime}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs">Frei</span>
                                                        )}
                                                    </button>
                                                </div>

                                                {isTemplateSelectOpen.isOpen && isTemplateSelectOpen.index === dayIdx && (
                                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 max-h-60 overflow-y-auto">
                                                        <div className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-tight">Vorlage wählen</div>
                                                        <button
                                                            onClick={() => setPatternItem(dayIdx, null)}
                                                            className="w-full text-left px-2 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-600 mb-1"
                                                        >
                                                            Frei / Keine Schicht
                                                        </button>
                                                        {templates.map(t => (
                                                            <button
                                                                key={t.id}
                                                                onClick={() => setPatternItem(dayIdx, t)}
                                                                className="w-full text-left px-2 py-2 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-2"
                                                            >
                                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }}></div>
                                                                <span className="truncate">{t.name}</span>
                                                            </button>
                                                        ))}
                                                        <div className="border-t mt-1 pt-1">
                                                            <button onClick={() => setIsTemplateSelectOpen({ index: -1, isOpen: false })} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2">Abbrechen</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>


                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md text-sm text-yellow-800">
                        <input
                            type="checkbox"
                            id="clearExisting"
                            checked={clearExisting}
                            onChange={e => setClearExisting(e.target.checked)}
                            className="h-4 w-4 text-yellow-600 rounded border-yellow-300 focus:ring-yellow-500"
                        />
                        <label htmlFor="clearExisting">Bestehende Schichten im gewählten Zeitraum für diese Mitarbeiter löschen?</label>
                    </div>

                </div>

                <div className="flex justify-end gap-4 pt-4 mt-2 border-t">
                    <Button onClick={handleClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Abbrechen</Button>
                    <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5" />
                        Schichten generieren
                    </Button>
                </div>
            </Card>

            {/* Sub-Modals */}
            <EmployeeMultiSelectModal
                isOpen={isEmployeeSelectOpen}
                onClose={() => setIsEmployeeSelectOpen(false)}
                onApply={(ids) => setSelectedEmployeeIds(ids.map(Number))}
                employees={employees}
                selectedEmployeeIds={selectedEmployeeIds}
                title="Mitarbeiter für Rotation auswählen"
            />

            <CalendarModal
                isOpen={isDateRangeOpen}
                onClose={() => setIsDateRangeOpen(false)}
                onSelectRange={(range) => {
                    setStartDate(range.start);
                    setEndDate(range.end);
                    setIsDateRangeOpen(false);
                }}
                title="Zeitraum wählen"
                selectionMode="range"
                initialStartDate={startDate}
                initialEndDate={endDate}
            />

            {/* Rotation Template Modals */}
            <SaveRotationTemplateModal
                isOpen={showSaveTemplateModal}
                onClose={() => setShowSaveTemplateModal(false)}
                onSave={saveRotationTemplate}
                totalDays={totalDays}
            />

            <LoadRotationTemplateModal
                isOpen={showLoadTemplateModal}
                onClose={() => setShowLoadTemplateModal(false)}
                templates={rotationTemplates}
                shiftTemplates={templates}
                onLoad={loadRotationTemplate}
                onDelete={deleteRotationTemplate}
            />


        </div>,
        document.body
    );
};
