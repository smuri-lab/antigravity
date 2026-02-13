
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { ShiftTemplate } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';

interface ShiftTemplateManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ShiftTemplate[];
    onAdd: (template: Omit<ShiftTemplate, 'id'>) => void;
    onUpdate: (template: ShiftTemplate) => void;
    onDelete: (id: string) => void;
}

const colors = [
    { hex: '#3b82f6', name: 'Blau' },
    { hex: '#10b981', name: 'Grün' },
    { hex: '#f59e0b', name: 'Orange' },
    { hex: '#ef4444', name: 'Rot' },
    { hex: '#8b5cf6', name: 'Lila' },
    { hex: '#6b7280', name: 'Grau' },
    { hex: '#14b8a6', name: 'Türkis' },
    { hex: '#ec4899', name: 'Pink' },
];

export const ShiftTemplateManagementModal: React.FC<ShiftTemplateManagementModalProps> = ({
    isOpen, onClose, templates = [], onAdd, onUpdate, onDelete
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ShiftTemplate>>({});
    const [isClosing, setIsClosing] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleEdit = (template: ShiftTemplate) => {
        setEditingId(template.id);
        setFormData(template);
    };

    const handleCreate = () => {
        setEditingId('new');
        setFormData({
            name: '',
            startTime: '08:00',
            endTime: '16:00',
            color: '#3b82f6',
            label: ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({});
    };

    const handleSave = () => {
        if (!formData.name || !formData.startTime || !formData.endTime) {
            alert('Bitte füllen Sie Name, Startzeit und Endzeit aus.');
            return;
        }

        if (editingId === 'new') {
            if (onAdd) onAdd(formData as Omit<ShiftTemplate, 'id'>);
        } else if (editingId) {
            if (onUpdate) onUpdate({ ...formData, id: editingId } as ShiftTemplate);
        }
        handleCancelEdit();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
            if (onDelete) onDelete(id);
        }
    };

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-[250] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
            <Card className={`w-full max-w-2xl relative flex flex-col max-h-[90vh] ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <XIcon className="h-6 w-6" />
                </button>

                <h2 className="text-xl font-bold mb-4">Schicht-Vorlagen verwalten</h2>

                <div className="flex-grow overflow-y-auto pr-2">
                    {/* List */}
                    <div className="space-y-3 mb-6">
                        {templates.map(template => (
                            <div key={template.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 bg-white shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-10 rounded-full" style={{ backgroundColor: template.color }}></div>
                                    <div>
                                        <div className="font-semibold text-gray-800">{template.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {template.startTime} - {template.endTime} Uhr
                                            {template.label && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{template.label}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEdit(template)} className="p-2 text-gray-500 hover:text-blue-600 transition-colors">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && (
                            <p className="text-center text-gray-500 py-4 italic">Keine Vorlagen definiert.</p>
                        )}
                    </div>

                    {/* Add Button */}
                    {!editingId && (
                        <div className="flex justify-center mt-6 pt-6 border-t">
                            <Button onClick={handleCreate} variant="primary">
                                <PlusIcon className="h-5 w-5" />
                                Neue Vorlage erstellen
                            </Button>
                        </div>
                    )}

                    {/* Edit Form */}
                    {editingId && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                            <h3 className="font-bold text-gray-800 mb-4">{editingId === 'new' ? 'Neue Vorlage' : 'Vorlage bearbeiten'}</h3>
                            <div className="space-y-4">
                                <Input
                                    label="Name der Schicht"
                                    placeholder="z.B. Frühschicht"
                                    value={formData.name || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    autoFocus
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Startzeit"
                                        type="time"
                                        value={formData.startTime || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                    />
                                    <Input
                                        label="Endzeit"
                                        type="time"
                                        value={formData.endTime || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                    />
                                </div>
                                <Input
                                    label="Kürzel / Label im Plan (Optional)"
                                    placeholder="z.B. Früh"
                                    value={formData.label || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                                    maxLength={10}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {colors.map(c => (
                                            <button
                                                key={c.hex}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, color: c.hex }))}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c.hex ? 'border-gray-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <Button onClick={handleCancelEdit} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">Abbrechen</Button>
                                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>,
        document.body
    );
};
