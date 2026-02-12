import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { RotationTemplate, ShiftTemplate, PatternBlock } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ConfirmModal } from '../ui/ConfirmModal';

interface RotationPatternManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    patterns: RotationTemplate[];
    shiftTemplates: ShiftTemplate[];
    onAdd: (pattern: Omit<RotationTemplate, 'id' | 'createdAt'>) => void;
    onUpdate: (pattern: RotationTemplate) => void;
    onDelete: (id: string) => void;
}

interface InternalPatternBlock {
    template: ShiftTemplate | null;
    days: number;
}

export const RotationPatternManagementModal: React.FC<RotationPatternManagementModalProps> = ({
    isOpen, onClose, patterns, shiftTemplates, onAdd, onUpdate, onDelete
}) => {
    // Edit/Create state
    const [editingPattern, setEditingPattern] = useState<RotationTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [blocks, setBlocks] = useState<InternalPatternBlock[]>([{ template: null, days: 1 }]);

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    if (!isOpen) return null;

    // Open create modal
    const handleCreate = () => {
        setIsCreating(true);
        setEditingPattern(null);
        setName('');
        setDescription('');
        setBlocks([{ template: null, days: 1 }]);
    };

    // Open edit modal
    const handleEdit = (pattern: RotationTemplate) => {
        setIsCreating(false);
        setEditingPattern(pattern);
        setName(pattern.name);
        setDescription(pattern.description || '');

        // Convert storage blocks to internal format
        const loadedBlocks = pattern.blocks.map(block => ({
            template: block.templateId
                ? shiftTemplates.find(t => t.id === block.templateId) || null
                : null,
            days: block.days
        }));
        setBlocks(loadedBlocks);
    };

    // Close edit/create modal
    const handleCloseEdit = () => {
        setIsCreating(false);
        setEditingPattern(null);
    };

    // Save (create or update)
    const handleSave = () => {
        if (!name.trim()) {
            alert('Bitte geben Sie einen Namen ein.');
            return;
        }

        const patternData = {
            name: name.trim(),
            description: description.trim() || undefined,
            blocks: blocks.map(block => ({
                templateId: block.template?.id || null,
                days: block.days
            }))
        };

        if (isCreating) {
            onAdd(patternData);
        } else if (editingPattern) {
            onUpdate({
                ...editingPattern,
                ...patternData
            });
        }

        handleCloseEdit();
    };

    // Block management
    const addBlock = () => {
        setBlocks(prev => [...prev, { template: null, days: 1 }]);
    };

    const removeBlock = (index: number) => {
        if (blocks.length === 1) {
            alert('Mindestens ein Block muss vorhanden sein.');
            return;
        }
        setBlocks(prev => prev.filter((_, i) => i !== index));
    };

    const updateBlock = (index: number, field: 'template' | 'days', value: any) => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            if (field === 'template') {
                const template = value ? shiftTemplates.find(t => String(t.id) === String(value)) || null : null;
                newBlocks[index] = { ...newBlocks[index], template };
            } else {
                newBlocks[index] = { ...newBlocks[index], days: Math.max(1, parseInt(value) || 1) };
            }
            return newBlocks;
        });
    };

    // Calculate total days
    const totalDays = blocks.reduce((sum, block) => sum + block.days, 0);

    // Get template by ID for preview
    const getTemplateById = (id: string | null) => {
        if (!id) return null;
        return shiftTemplates.find(t => t.id === id);
    };

    // Render list view
    const renderListView = () => (
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">Rotationsmuster verwalten</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <Button onClick={handleCreate} className="mb-6 w-full">
                <PlusIcon className="h-5 w-5 mr-2" />
                Neues Rotationsmuster
            </Button>

            {patterns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>Noch keine Rotationsmuster erstellt.</p>
                    <p className="text-sm mt-2">Klicken Sie auf "Neues Rotationsmuster" um zu beginnen.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {patterns.map(pattern => (
                        <div key={pattern.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">{pattern.name}</h3>
                                    {pattern.description && (
                                        <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleEdit(pattern)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Bearbeiten"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(pattern.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Löschen"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 mb-3">
                                📊 {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'} • {pattern.blocks.length} {pattern.blocks.length === 1 ? 'Block' : 'Blöcke'}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {pattern.blocks.map((block, idx) => {
                                    const template = getTemplateById(block.templateId);
                                    return (
                                        <div
                                            key={idx}
                                            className="px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm"
                                            style={{
                                                backgroundColor: template?.color ? `${template.color}20` : '#f3f4f6',
                                                color: template?.color || '#6b7280',
                                                borderColor: template?.color || '#d1d5db'
                                            }}
                                        >
                                            {template?.name || 'Frei'} ×{block.days}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );

    // Render edit/create modal
    const renderEditView = () => (
        <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">
                    {isCreating ? 'Neues Rotationsmuster' : 'Rotationsmuster bearbeiten'}
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
                        placeholder="z.B. Hasan 28-Tage-Rotation"
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
                        placeholder="z.B. 4 Früh, 3 Spät, 2 Nacht, 1 Frei, ..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                    />
                </div>

                {/* Blocks */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold">Blöcke</label>
                        <span className="text-xs text-gray-500 font-medium">
                            Gesamt: {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'}
                        </span>
                    </div>

                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {blocks.map((block, idx) => (
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
                                    {shiftTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>

                                {/* Days Input */}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={block.days}
                                        onChange={(e) => updateBlock(idx, 'days', e.target.value)}
                                        min="1"
                                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {block.days === 1 ? 'Tag' : 'Tage'}
                                    </span>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeBlock(idx)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    disabled={blocks.length === 1}
                                    title="Block entfernen"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addBlock}
                        className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Block hinzufügen
                    </button>
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
            {(isCreating || editingPattern) ? renderEditView() : renderListView()}

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
                title="Rotationsmuster löschen"
                message="Möchten Sie dieses Rotationsmuster wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
                confirmText="Löschen"
                cancelText="Abbrechen"
            />
        </div>,
        document.body
    );
};
