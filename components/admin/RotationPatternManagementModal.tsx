import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { RotationTemplate, ShiftTemplate, PatternBlock } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { MinusIcon } from '../icons/MinusIcon';

interface RotationPatternManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    patterns: RotationTemplate[];
    shiftTemplates: ShiftTemplate[];
    onAdd: (pattern: Omit<RotationTemplate, 'id' | 'createdAt'>) => void;
    onUpdate: (pattern: RotationTemplate) => void;
    onDelete: (id: string) => void;
}

export const RotationPatternManagementModal: React.FC<RotationPatternManagementModalProps> = ({
    isOpen, onClose, patterns, shiftTemplates, onAdd, onUpdate, onDelete
}) => {
    // Edit/Create state
    const [editingPattern, setEditingPattern] = useState<RotationTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // New Cell-Based State
    const [patternDays, setPatternDays] = useState<(ShiftTemplate | null)[]>([]);
    const [activeTemplate, setActiveTemplate] = useState<ShiftTemplate | 'empty' | null>(null);

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    if (!isOpen) return null;

    // Helper: Convert blocks to flat days array
    const blocksToDays = (blocks: PatternBlock[]): (ShiftTemplate | null)[] => {
        const days: (ShiftTemplate | null)[] = [];
        blocks.forEach(block => {
            const template = block.templateId ? shiftTemplates.find(t => t.id === block.templateId) || null : null;
            for (let i = 0; i < block.days; i++) {
                days.push(template);
            }
        });
        return days;
    };

    // Helper: Convert flat days array to blocks
    const daysToBlocks = (days: (ShiftTemplate | null)[]): PatternBlock[] => {
        if (days.length === 0) return [];

        const blocks: PatternBlock[] = [];
        let currentTemplateId: string | null = days[0]?.id || null;
        let currentCount = 0;

        for (const dayTemplate of days) {
            const dayTemplateId = dayTemplate?.id || null;
            if (dayTemplateId === currentTemplateId) {
                currentCount++;
            } else {
                blocks.push({
                    templateId: currentTemplateId,
                    days: currentCount
                });
                currentTemplateId = dayTemplateId;
                currentCount = 1;
            }
        }
        // Push last block
        blocks.push({
            templateId: currentTemplateId,
            days: currentCount
        });

        return blocks;
    };

    // Open create modal
    const handleCreate = () => {
        setIsCreating(true);
        setEditingPattern(null);
        setName('');
        setDescription('');
        setPatternDays(Array(7).fill(null)); // Default 7 empty days
        setActiveTemplate(null);
    };

    // Open edit modal
    const handleEdit = (pattern: RotationTemplate) => {
        setIsCreating(false);
        setEditingPattern(pattern);
        setName(pattern.name);
        setDescription(pattern.description || '');
        setPatternDays(blocksToDays(pattern.blocks));
        setActiveTemplate(null);
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

        if (patternDays.length === 0) {
            alert('Das Rotationsmuster muss mindestens einen Tag enthalten.');
            return;
        }

        const patternData = {
            name: name.trim(),
            description: description.trim() || undefined,
            blocks: daysToBlocks(patternDays)
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

    // Cell Interaction
    const handleDayClick = (index: number) => {
        if (!activeTemplate) return; // Do nothing if no tool selected based on user request "paint"

        setPatternDays(prev => {
            const newDays = [...prev];
            newDays[index] = activeTemplate === 'empty' ? null : activeTemplate;
            return newDays;
        });
    };

    // Length Control
    const changeLength = (delta: number) => {
        setPatternDays(prev => {
            if (delta > 0) {
                return [...prev, ...Array(delta).fill(null)];
            } else {
                return prev.slice(0, Math.max(1, prev.length + delta));
            }
        });
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

            <div className="flex justify-center mb-6">
                <Button onClick={handleCreate} variant="primary">
                    <PlusIcon className="h-5 w-5" />
                    Neues Rotationsmuster
                </Button>
            </div>

            {patterns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>Noch keine Rotationsmuster erstellt.</p>
                    <p className="text-sm mt-2">Klicken Sie auf "Neues Rotationsmuster" um zu beginnen.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {patterns.map(pattern => {
                        const days = blocksToDays(pattern.blocks);
                        return (
                            <div key={pattern.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
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

                                {/* Preview Grid */}
                                <div className="grid grid-cols-7 gap-1 max-w-md">
                                    {days.slice(0, 14).map((template, idx) => (
                                        <div
                                            key={idx}
                                            className="aspect-square rounded flex items-center justify-center text-xs font-bold border"
                                            style={{
                                                backgroundColor: template?.color ? `${template.color}20` : '#f3f4f6',
                                                color: template?.color || '#9ca3af',
                                                borderColor: template?.color || '#e5e7eb'
                                            }}
                                            title={template?.name || 'Frei'}
                                        >
                                            {idx + 1}
                                        </div>
                                    ))}
                                    {days.length > 14 && (
                                        <div className="aspect-square rounded flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                            +{days.length - 14}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-gray-500 text-right">
                                    {days.length} Tage Gesamt
                                </div>
                            </div>
                        );
                    })}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Name*</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="z.B. 3-Schicht System"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Beschreibung</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <hr />

                {/* Editor Area */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-bold">Muster Editor</label>
                        <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-500 mr-2">
                                Länge: <span className="font-bold text-gray-900">{patternDays.length} Tage</span>
                            </div>
                            <button onClick={() => changeLength(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Tag entfernen">
                                <MinusIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => changeLength(1)} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Tag hinzufügen">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-gray-50 p-3 rounded-t-xl border border-b-0 border-gray-200 overflow-x-auto flex gap-2 hide-scroll">
                        <button
                            onClick={() => setActiveTemplate('empty')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all whitespace-nowrap ${activeTemplate === 'empty'
                                ? 'bg-gray-800 text-white border-gray-800 ring-2 ring-offset-1 ring-gray-300'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            <span className="w-3 h-3 rounded-full border border-gray-400 bg-white"></span>
                            Frei / Löschen
                        </button>
                        <div className="w-px bg-gray-300 mx-1 h-6 self-center"></div>
                        {shiftTemplates.map(t => {
                            const isActive = activeTemplate !== 'empty' && activeTemplate?.id === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTemplate(t)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all whitespace-nowrap ${isActive
                                        ? 'ring-2 ring-offset-1 scale-105'
                                        : 'hover:bg-white hover:shadow-sm opacity-90'
                                        }`}
                                    style={{
                                        backgroundColor: isActive ? t.color : `${t.color}20`,
                                        color: isActive ? '#fff' : t.color,
                                        borderColor: t.color,
                                        ringColor: t.color
                                    }}
                                >
                                    <span className={`w-3 h-3 rounded-full border border-white/50 ${isActive ? 'bg-white' : ''}`} style={{ backgroundColor: isActive ? 'white' : t.color }}></span>
                                    {t.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Grid */}
                    <div className="border border-gray-200 rounded-b-xl p-4 bg-white min-h-[200px]">
                        <div className="grid grid-cols-7 gap-2">
                            {patternDays.map((template, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleDayClick(idx)}
                                    className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 relative group ${!template ? 'bg-gray-50 border-gray-200 text-gray-400 border-dashed' : ''
                                        }`}
                                    style={template ? {
                                        backgroundColor: `${template.color}20`,
                                        borderColor: template.color,
                                        color: template.color
                                    } : {}}
                                >
                                    <span className="absolute top-1 left-2 text-[10px] opacity-50 font-mono">{idx + 1}</span>

                                    {template ? (
                                        <span className="font-bold text-sm truncate w-full text-center px-1">{template.abbreviation || template.name.substring(0, 2)}</span>
                                    ) : (
                                        <span className="text-xs">Frei</span>
                                    )}

                                    {/* Hover overlay hint */}
                                    {activeTemplate && (
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center">
                                            {activeTemplate === 'empty' ? (
                                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTemplate.color }}></div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            ))}

                            {/* Add Button as visual cue at end */}
                            <button
                                onClick={() => changeLength(1)}
                                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                title="Tag hinzufügen"
                            >
                                <PlusIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                        Wählen Sie oben eine Schicht und <b>klicken</b> Sie auf die Tage, um sie zuzuweisen.
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

