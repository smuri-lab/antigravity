import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { Task, Employee, Customer, Activity, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
    employees: Employee[];
    customers: Customer[];
    activities: Activity[];
    companySettings: CompanySettings;
    initialTask?: Task | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
    isOpen, onClose, onSave, employees, customers, activities, companySettings, initialTask
}) => {
    const [title, setTitle] = useState(initialTask?.title || '');
    const [description, setDescription] = useState(initialTask?.description || '');
    const [dueDate, setDueDate] = useState(initialTask?.dueDate || new Date().toLocaleDateString('sv-SE'));
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>(initialTask?.assignedTo || []);
    const [customerId, setCustomerId] = useState(initialTask?.customerId || '');
    const [activityId, setActivityId] = useState(initialTask?.activityId || '');

    const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
    const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';

    const toggleEmployee = (id: number) => {
        setSelectedEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        if (!title.trim() || !dueDate || selectedEmployees.length === 0) return;
        onSave({ title: title.trim(), description: description.trim() || undefined, dueDate, assignedTo: selectedEmployees, customerId: customerId || undefined, activityId: activityId || undefined });
        onClose();
    };

    if (!isOpen) return null;

    const isValid = title.trim() && dueDate && selectedEmployees.length > 0;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-modal-fade-in" onClick={onClose}>
            <Card className="w-full max-w-md relative animate-modal-slide-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                <h2 className="text-lg font-bold mb-5">{initialTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>
                <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                    <Input label="Titel *" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Fenster putzen" />
                    <Input label="Beschreibung" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional..." />
                    <Input label="Fälligkeitsdatum *" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mitarbeiter zuweisen *</label>
                        <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                            {employees.filter(e => e.isActive).map(emp => (
                                <label key={emp.id} className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmployees.includes(emp.id)}
                                        onChange={() => toggleEmployee(emp.id)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{emp.firstName} {emp.lastName}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Select label={`${customerLabel} (optional)`} value={customerId} onChange={e => setCustomerId(e.target.value)}>
                        <option value="">— Kein{customerLabel} —</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Select label={`${activityLabel} (optional)`} value={activityId} onChange={e => setActivityId(e.target.value)}>
                        <option value="">— Kein{activityLabel} —</option>
                        {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                </div>
                <div className="flex gap-3 pt-4 mt-2 border-t">
                    <Button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200">Abbrechen</Button>
                    <Button onClick={handleSave} disabled={!isValid} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {initialTask ? 'Speichern' : 'Erstellen'}
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};
