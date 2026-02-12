import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { EmployeeGroup, Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ConfirmModal } from '../ui/ConfirmModal';

interface EmployeeGroupManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: EmployeeGroup[];
    employees: Employee[];
    onAdd: (group: Omit<EmployeeGroup, 'id' | 'createdAt'>) => void;
    onUpdate: (group: EmployeeGroup) => void;
    onDelete: (id: string) => void;
}

const GROUP_COLORS = [
    { value: '#3b82f6', label: 'Blau' },
    { value: '#8b5cf6', label: 'Lila' },
    { value: '#10b981', label: 'Grün' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#ef4444', label: 'Rot' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Grau' },
];

export const EmployeeGroupManagementModal: React.FC<EmployeeGroupManagementModalProps> = ({
    isOpen, onClose, groups, employees, onAdd, onUpdate, onDelete
}) => {
    // Edit/Create state
    const [editingGroup, setEditingGroup] = useState<EmployeeGroup | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    const [color, setColor] = useState(GROUP_COLORS[0].value);

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    if (!isOpen) return null;

    // Open create modal
    const handleCreate = () => {
        setIsCreating(true);
        setEditingGroup(null);
        setName('');
        setDescription('');
        setSelectedEmployeeIds([]);
        setColor(GROUP_COLORS[0].value);
    };

    // Open edit modal
    const handleEdit = (group: EmployeeGroup) => {
        setIsCreating(false);
        setEditingGroup(group);
        setName(group.name);
        setDescription(group.description || '');
        setSelectedEmployeeIds(group.employeeIds);
        setColor(group.color || GROUP_COLORS[0].value);
    };

    // Close edit/create modal
    const handleCloseEdit = () => {
        setIsCreating(false);
        setEditingGroup(null);
    };

    // Save (create or update)
    const handleSave = () => {
        if (!name.trim()) {
            alert('Bitte geben Sie einen Namen ein.');
            return;
        }

        if (selectedEmployeeIds.length === 0) {
            alert('Bitte wählen Sie mindestens einen Mitarbeiter.');
            return;
        }

        const groupData = {
            name: name.trim(),
            description: description.trim() || undefined,
            employeeIds: selectedEmployeeIds,
            color
        };

        if (isCreating) {
            onAdd(groupData);
        } else if (editingGroup) {
            onUpdate({
                ...editingGroup,
                ...groupData
            });
        }

        handleCloseEdit();
    };

    // Toggle employee selection
    const toggleEmployee = (employeeId: number) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    // Get employee name by ID
    const getEmployeeName = (id: number) => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.name} ${emp.surname}` : `ID ${id}`;
    };

    // Render list view
    const renderListView = () => (
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">Mitarbeitergruppen verwalten</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <Button onClick={handleCreate} className="mb-6 w-full">
                <PlusIcon className="h-5 w-5 mr-2" />
                Neue Gruppe
            </Button>

            {groups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>Noch keine Gruppen erstellt.</p>
                    <p className="text-sm mt-2">Klicken Sie auf "Neue Gruppe" um zu beginnen.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                            style={{ borderLeftWidth: '4px', borderLeftColor: group.color || '#6b7280' }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: group.color || '#6b7280' }}
                                        />
                                        <h3 className="font-bold text-lg">{group.name}</h3>
                                    </div>
                                    {group.description && (
                                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleEdit(group)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Bearbeiten"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(group.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Löschen"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 mb-2">
                                👥 {group.employeeIds.length} {group.employeeIds.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
                            </div>

                            <div className="text-sm text-gray-700">
                                {group.employeeIds.slice(0, 3).map(id => getEmployeeName(id)).join(', ')}
                                {group.employeeIds.length > 3 && ` +${group.employeeIds.length - 3} weitere`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );

    // Render edit/create modal
    const renderEditView = () => (
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">
                    {isCreating ? 'Neue Gruppe' : 'Gruppe bearbeiten'}
                </h2>
                <button onClick={handleCloseEdit} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Name*</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="z.B. Team A, Nachtschicht, Wochenend-Team"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Beschreibung (Optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="z.B. Hauptschicht-Rotation"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                    />
                </div>

                {/* Color */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Farbe</label>
                    <div className="flex gap-2 flex-wrap">
                        {GROUP_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setColor(c.value)}
                                className={`w-10 h-10 rounded-full border-2 transition-all ${color === c.value ? 'border-gray-800 scale-110' : 'border-gray-300'
                                    }`}
                                style={{ backgroundColor: c.value }}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>

                {/* Employee Selection */}
                <div>
                    <label className="block text-sm font-semibold mb-2">
                        Mitarbeiter* ({selectedEmployeeIds.length} ausgewählt)
                    </label>
                    <div className="border border-gray-300 rounded-lg max-h-72 overflow-y-auto">
                        {employees.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Keine Mitarbeiter verfügbar
                            </div>
                        ) : (
                            <div className="divide-y">
                                {employees.map(emp => (
                                    <label
                                        key={emp.id}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.includes(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="flex-1">
                                            {emp.name} {emp.surname}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {emp.role === 'admin' ? '👑 Admin' : ''}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={handleCloseEdit} className="flex-1">
                        Abbrechen
                    </Button>
                    <Button onClick={handleSave} className="flex-1">
                        Speichern
                    </Button>
                </div>
            </div>
        </Card>
    );

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4">
            {(isCreating || editingGroup) ? renderEditView() : renderListView()}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => {
                    if (deleteConfirmId) {
                        onDelete(deleteConfirmId);
                        setDeleteConfirmId(null);
                    }
                }}
                title="Gruppe löschen"
                message="Möchten Sie diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
                confirmText="Löschen"
                cancelText="Abbrechen"
            />
        </div>,
        document.body
    );
};
