import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { EmployeeGroup, Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AlertModal } from '../ui/AlertModal';

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
    { value: '#ef4444', label: 'Rot' },
    { value: '#f97316', label: 'Orange' },
    { value: '#f59e0b', label: 'Gelb' },
    { value: '#84cc16', label: 'Hellgrün' },
    { value: '#10b981', label: 'Grün' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#3b82f6', label: 'Blau' },
    { value: '#6366f1', label: 'Indigo' },
    { value: '#8b5cf6', label: 'Violett' },
    { value: '#d946ef', label: 'Pink' },
    { value: '#f43f5e', label: 'Rose' },
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
    const [isClosing, setIsClosing] = useState(false);

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

    // Handle modal close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

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
            setAlertConfig({ title: 'Name fehlt', message: 'Bitte geben Sie einen Namen für die Gruppe ein.' });
            return;
        }

        if (selectedEmployeeIds.length === 0) {
            setAlertConfig({ title: 'Keine Mitarbeiter', message: 'Bitte wählen Sie mindestens einen Mitarbeiter für diese Gruppe aus.' });
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
        return emp ? `${emp.firstName} ${emp.lastName}` : `ID ${id}`;
    };

    // Render list view
    const renderListView = () => (
        <Card className={`w-full max-w-2xl max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h2 className="text-xl font-bold">Mitarbeitergruppen verwalten</h2>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2">
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
                                className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 bg-white shadow-sm transition-shadow"
                                style={{ borderLeftWidth: '4px', borderLeftColor: group.color || '#6b7280' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: group.color || '#6b7280' }}
                                            />
                                            <h3 className="font-semibold text-gray-800">{group.name}</h3>
                                        </div>
                                        {group.description && (
                                            <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                                        )}
                                        <div className="mt-2 flex flex-col gap-0.5">
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                <span>👥 {group.employeeIds.length} {group.employeeIds.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}</span>
                                            </div>
                                            <div className="text-[11px] text-gray-600 line-clamp-1">
                                                {group.employeeIds.slice(0, 3).map(id => getEmployeeName(id)).join(', ')}
                                                {group.employeeIds.length > 3 && ` +${group.employeeIds.length - 3} weitere`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4 self-center">
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
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-center mt-6 pt-6 border-t">
                <Button onClick={handleCreate} variant="primary">
                    <PlusIcon className="h-5 w-5" />
                    Neue Gruppe
                </Button>
            </div>
        </Card >
    );

    // Render edit/create modal
    const renderEditView = () => (
        <Card className={`w-full max-w-2xl max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h2 className="text-xl font-bold">
                    {isCreating ? 'Neue Gruppe' : 'Gruppe bearbeiten'}
                </h2>
                <button onClick={handleCloseEdit} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 pr-2">
                {/* Name */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Name*</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="z.B. Team A, Nachtschicht, Wochenend-Team"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
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
                                            {emp.firstName} {emp.lastName}
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
                    <Button onClick={handleSave} className="flex-1" variant="primary">
                        Speichern
                    </Button>
                </div>
            </div>
        </Card>
    );

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-[250] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
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
