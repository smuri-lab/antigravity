import React from 'react';
import { RotationTemplate, ShiftTemplate } from '../../types';
import { Button } from '../ui/Button';
import { TrashIcon } from '../icons/TrashIcon';

interface LoadRotationTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: RotationTemplate[];
    shiftTemplates: ShiftTemplate[];
    onLoad: (template: RotationTemplate) => void;
    onDelete: (id: string) => void;
}

export const LoadRotationTemplateModal: React.FC<LoadRotationTemplateModalProps> = ({
    isOpen, onClose, templates, shiftTemplates, onLoad, onDelete
}) => {
    if (!isOpen) return null;

    const getTemplateById = (id: string | null) => {
        if (!id) return null;
        return shiftTemplates.find(t => t.id === id);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Rotationsmuster laden</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Wählen Sie ein gespeichertes Muster aus und laden Sie es in den Editor.
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                    {templates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Noch keine Vorlagen gespeichert.</p>
                            <p className="text-sm mt-2">Erstellen Sie ein Rotationsmuster und speichern Sie es als Vorlage.</p>
                        </div>
                    ) : (
                        templates.map(template => {
                            const totalDays = template.blocks.reduce((sum, b) => sum + b.days, 0);

                            return (
                                <div key={template.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-gray-900">{template.name}</h3>
                                            {template.description && (
                                                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                📊 {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'} •
                                                {template.blocks.length} {template.blocks.length === 1 ? 'Block' : 'Blöcke'}
                                            </p>
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => onLoad(template)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                                            >
                                                Laden
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`"${template.name}" wirklich löschen?`)) {
                                                        onDelete(template.id);
                                                    }
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Vorlage löschen"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview blocks */}
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                                        {template.blocks.map((block, idx) => {
                                            const shiftTemplate = getTemplateById(block.templateId);
                                            return (
                                                <span
                                                    key={idx}
                                                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                                    style={{
                                                        backgroundColor: shiftTemplate?.color || '#e5e7eb',
                                                        color: shiftTemplate ? '#fff' : '#6b7280'
                                                    }}
                                                >
                                                    {shiftTemplate?.name || 'Frei'} × {block.days}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <Button
                    onClick={onClose}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800"
                >
                    Schließen
                </Button>
            </div>
        </div>
    );
};
