import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import type { EmployeeGroup, Employee } from '../../types';

interface GroupAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: EmployeeGroup | null;
    employees: Employee[]; // All employees, to filter by group members
    onAssignAll: () => void;
    onAssignOne: (employeeId: number) => void;
}

export const GroupAssignmentModal: React.FC<GroupAssignmentModalProps> = ({
    isOpen,
    onClose,
    group,
    employees,
    onAssignAll,
    onAssignOne
}) => {
    const [step, setStep] = useState<'decision' | 'select-employee'>('decision');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    if (!isOpen || !group) return null;

    // Filter employees belonging to this group
    const groupMembers = employees.filter(e => group.employeeIds.includes(e.id));

    const handleAssignOneConfirm = () => {
        if (selectedEmployeeId) {
            onAssignOne(selectedEmployeeId);
            handleClose();
        }
    };

    const handleClose = () => {
        setStep('decision');
        setSelectedEmployeeId(null);
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[400] p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h3 className="text-xl font-bold">Schicht an Gruppe zuweisen</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: group.color || '#6b7280' }}
                        />
                        <span className="font-bold">{group.name}</span>
                        <span className="text-sm text-gray-500">({groupMembers.length} Mitarbeiter)</span>
                    </div>

                    {step === 'decision' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">
                                Für wen soll diese Schicht erstellt werden?
                            </p>

                            <button
                                onClick={onAssignAll}
                                className="w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
                            >
                                <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                                    👨‍👩‍👧‍👦 Alle Mitarbeiter der Gruppe
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Erstellt {groupMembers.length} separate Schichten
                                </div>
                            </button>

                            <button
                                onClick={() => setStep('select-employee')}
                                className="w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
                            >
                                <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                                    👤 Nur einen Mitarbeiter
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Wählen Sie einen spezifischen Mitarbeiter aus der Gruppe
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Bitte wählen Sie den Mitarbeiter aus:
                            </p>

                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                                {groupMembers.map(emp => (
                                    <label
                                        key={emp.id}
                                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${selectedEmployeeId === emp.id ? 'bg-blue-50' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="employee"
                                            value={emp.id}
                                            checked={selectedEmployeeId === emp.id}
                                            onChange={() => setSelectedEmployeeId(emp.id)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>{emp.name} {emp.surname}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setStep('decision')}
                                    className="flex-1"
                                >
                                    Zurück
                                </Button>
                                <Button
                                    onClick={handleAssignOneConfirm}
                                    disabled={!selectedEmployeeId}
                                    className="flex-1"
                                >
                                    Zuweisen
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>,
        document.body
    );
};
