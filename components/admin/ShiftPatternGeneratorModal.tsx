import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Employee, ShiftTemplate, Shift, RotationTemplate, EmployeeGroup } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { AlertModal } from '../ui/AlertModal';

interface ShiftPatternGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ShiftTemplate[];
    employees: Employee[];
    employeeGroups: EmployeeGroup[];
    rotationPatterns: RotationTemplate[];
    shifts: Shift[];
    onGenerate: (shifts: Omit<Shift, 'id'>[]) => void;
    deleteShift: (id: string) => void;
}

export const ShiftPatternGeneratorModal: React.FC<ShiftPatternGeneratorModalProps> = ({
    isOpen, onClose, templates, employees, employeeGroups, rotationPatterns, shifts, onGenerate, deleteShift
}) => {
    // Assignment target state
    const [assignmentMode, setAssignmentMode] = useState<'individual' | 'group'>('individual');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Pattern selection
    const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

    // Date range
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Offset state for grouped employees
    const [employeeOffsets, setEmployeeOffsets] = useState<Record<number, number>>({});

    // Clear existing shifts option
    const [clearExisting, setClearExisting] = useState(false);

    // Offset visibility
    const [showOffsets, setShowOffsets] = useState(false);

    // Alert state
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setAssignmentMode('individual');
            setSelectedEmployeeId(null);
            setSelectedGroupId(null);
            setSelectedPatternId(null);
            setEmployeeOffsets({});
            setClearExisting(false);
            setShowOffsets(false);

            // Set default dates (today to end of next month)
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setStartDate(today.toLocaleDateString('sv-SE'));
            setEndDate(nextMonth.toLocaleDateString('sv-SE'));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Get selected pattern
    const selectedPattern = rotationPatterns.find(p => p.id === selectedPatternId);

    // Get employees in selected group
    const getGroupEmployees = () => {
        if (!selectedGroupId) return [];
        const group = employeeGroups.find(g => g.id === selectedGroupId);
        if (!group) return [];
        return employees.filter(e => group.employeeIds.includes(e.id));
    };

    // Get target employees based on mode
    const getTargetEmployees = (): Employee[] => {
        if (assignmentMode === 'individual' && selectedEmployeeId) {
            const emp = employees.find(e => e.id === selectedEmployeeId);
            return emp ? [emp] : [];
        } else if (assignmentMode === 'group' && selectedGroupId) {
            return getGroupEmployees();
        }
        return [];
    };

    // Generate shifts
    const handleGenerate = () => {
        if (!selectedPattern) {
            setAlertConfig({ title: 'Muster fehlt', message: 'Bitte wählen Sie ein Rotationsmuster aus.' });
            return;
        }

        const targetEmployees = getTargetEmployees();
        if (targetEmployees.length === 0) {
            setAlertConfig({
                title: 'Ziel fehlt',
                message: assignmentMode === 'individual'
                    ? 'Bitte wählen Sie einen Mitarbeiter aus.'
                    : 'Bitte wählen Sie eine Mitarbeitergruppe aus.'
            });
            return;
        }

        if (!startDate || !endDate) {
            setAlertConfig({ title: 'Zeitraum fehlt', message: 'Bitte wählen Sie ein Start- und Enddatum aus.' });
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            setAlertConfig({ title: 'Ungültiger Zeitraum', message: 'Das Startdatum muss vor dem Enddatum liegen.' });
            return;
        }

        // Clear existing shifts if requested
        if (clearExisting) {
            targetEmployees.forEach(emp => {
                const empShifts = shifts.filter(s => s.employeeId === emp.id);
                empShifts.forEach(s => {
                    const shiftDate = new Date(s.date);
                    if (!s.id) return;
                    if (shiftDate >= start && shiftDate <= end) {
                        deleteShift(s.id);
                    }
                });
            });
        }

        // Generate shifts for each employee
        const generatedShifts: Omit<Shift, 'id'>[] = [];

        targetEmployees.forEach(emp => {
            const offset = employeeOffsets[emp.id] || 0;
            const patternLength = selectedPattern.blocks.reduce((sum, block) => sum + block.days, 0);

            let currentPatternIndex = offset % patternLength;
            let currentBlockIndex = 0;
            let daysIntoCurrentBlock = 0;

            // Find starting block and position based on offset
            let offsetRemaining = currentPatternIndex;
            for (let i = 0; i < selectedPattern.blocks.length; i++) {
                if (offsetRemaining < selectedPattern.blocks[i].days) {
                    currentBlockIndex = i;
                    daysIntoCurrentBlock = offsetRemaining;
                    break;
                }
                offsetRemaining -= selectedPattern.blocks[i].days;
            }

            // Generate shifts day by day
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const currentBlock = selectedPattern.blocks[currentBlockIndex];
                const template = currentBlock.templateId
                    ? templates.find(t => t.id === currentBlock.templateId)
                    : null;

                if (template) {
                    generatedShifts.push({
                        employeeId: emp.id,
                        date: date.toLocaleDateString('sv-SE'),
                        startTime: template.startTime,
                        endTime: template.endTime,
                        customerId: template.customerId,
                        activityId: template.activityId || '',
                        breakMinutes: template.breakMinutes || 0,
                        color: template.color
                    });
                }

                // Advance to next pattern position
                daysIntoCurrentBlock++;
                if (daysIntoCurrentBlock >= currentBlock.days) {
                    daysIntoCurrentBlock = 0;
                    currentBlockIndex = (currentBlockIndex + 1) % selectedPattern.blocks.length;
                }
            }
        });

        onGenerate(generatedShifts);
        onClose();
    };

    // Get pattern preview
    const getPatternPreview = () => {
        if (!selectedPattern) return 'Kein Muster ausgewählt';

        const preview = selectedPattern.blocks.map(block => {
            const template = block.templateId ? templates.find(t => t.id === block.templateId) : null;
            const label = template ? template.name : 'Frei';
            return `${label} (${block.days}T)`;
        }).join(' → ');

        const totalDays = selectedPattern.blocks.reduce((sum, b) => sum + b.days, 0);
        return `${preview} (${totalDays} Tage gesamt)`;
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold">Schicht-Automatik</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Assignment Mode Selection */}
                    <div>
                        <label className="block text-sm font-semibold mb-3">Zuweisung an</label>
                        <div className="flex gap-3">
                            <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                                style={{ borderColor: assignmentMode === 'individual' ? '#3b82f6' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    checked={assignmentMode === 'individual'}
                                    onChange={() => setAssignmentMode('individual')}
                                    className="w-5 h-5 text-blue-600"
                                />
                                <div>
                                    <div className="font-semibold">Einzelner Mitarbeiter</div>
                                    <div className="text-xs text-gray-500">Muster für eine Person zuweisen</div>
                                </div>
                            </label>
                            <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                                style={{ borderColor: assignmentMode === 'group' ? '#3b82f6' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    checked={assignmentMode === 'group'}
                                    onChange={() => setAssignmentMode('group')}
                                    className="w-5 h-5 text-blue-600"
                                />
                                <div>
                                    <div className="font-semibold">Mitarbeitergruppe</div>
                                    <div className="text-xs text-gray-500">Muster für mehrere Personen mit Versatz</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Employee/Group Selector */}
                    {assignmentMode === 'individual' ? (
                        <div>
                            <label className="block text-sm font-semibold mb-2">Mitarbeiter</label>
                            <select
                                value={selectedEmployeeId || ''}
                                onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Mitarbeiter wählen --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold mb-2">Mitarbeitergruppe</label>
                            <select
                                value={selectedGroupId || ''}
                                onChange={(e) => {
                                    setSelectedGroupId(e.target.value || null);
                                    setEmployeeOffsets({});
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Gruppe wählen --</option>
                                {employeeGroups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name} ({group.employeeIds.length} Mitarbeiter)
                                    </option>
                                ))}
                            </select>

                            {selectedGroupId && getGroupEmployees().length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowOffsets(!showOffsets)}
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <ChevronDownIcon
                                            className={`h-4 w-4 transition-transform ${showOffsets ? 'rotate-180' : ''}`}
                                        />
                                        Versatz anpassen ({getGroupEmployees().length} Mitarbeiter)
                                    </button>

                                    {showOffsets && (
                                        <div className="mt-3 space-y-2 border rounded-lg p-3 bg-gray-50">
                                            <div className="text-xs text-gray-600 mb-2">
                                                Versatz in Tagen: Wann im Muster soll dieser Mitarbeiter starten?
                                            </div>
                                            {getGroupEmployees().map((emp, index) => (
                                                <div key={emp.id} className="flex items-center gap-3">
                                                    <span className="flex-1 text-sm">
                                                        {emp.firstName} {emp.lastName}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={employeeOffsets[emp.id] || index}
                                                        onChange={(e) => setEmployeeOffsets(prev => ({
                                                            ...prev,
                                                            [emp.id]: parseInt(e.target.value) || 0
                                                        }))}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <span className="text-xs text-gray-500">Tage</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rotation Pattern Selector */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Rotationsmuster</label>
                        <select
                            value={selectedPatternId || ''}
                            onChange={(e) => setSelectedPatternId(e.target.value || null)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Muster wählen --</option>
                            {rotationPatterns.map(pattern => (
                                <option key={pattern.id} value={pattern.id}>
                                    {pattern.name}
                                </option>
                            ))}
                        </select>

                        {selectedPattern && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                                <div className="font-medium mb-1">Mustervorschau:</div>
                                <div>{getPatternPreview()}</div>
                            </div>
                        )}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Startdatum</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Enddatum</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Clear Existing Option */}
                    <div>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={clearExisting}
                                onChange={(e) => setClearExisting(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-medium">Bestehende Schichten ersetzen</div>
                                <div className="text-xs text-gray-500">
                                    Vorhandene Schichten im Zeitraum werden gelöscht
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button variant="secondary" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button onClick={handleGenerate} className="flex-1">
                            Schichten generieren
                        </Button>
                    </div>
                </div>
            </Card>

            <AlertModal
                isOpen={!!alertConfig}
                onClose={() => setAlertConfig(null)}
                title={alertConfig?.title || ''}
                message={alertConfig?.message || ''}
            />
        </div>,
        document.body
    );
};
