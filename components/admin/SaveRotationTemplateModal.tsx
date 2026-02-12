import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface SaveRotationTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description?: string) => void;
    totalDays: number;
}

export const SaveRotationTemplateModal: React.FC<SaveRotationTemplateModalProps> = ({
    isOpen, onClose, onSave, totalDays
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) {
            alert('Bitte geben Sie einen Namen ein.');
            return;
        }
        onSave(name.trim(), description.trim() || undefined);
        setName('');
        setDescription('');
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Rotationsmuster speichern</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Speichern Sie dieses Rotationsmuster mit <strong>{totalDays} Tagen</strong> für spätere Verwendung.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="z.B. 'Hasan 28-Tage-Rotation'"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Beschreibung (optional)
                        </label>
                        <textarea
                            placeholder="z.B. '4 Früh, 3 Spät, 1 Frei, etc.'"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button
                        onClick={handleClose}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        Speichern
                    </Button>
                </div>
            </div>
        </div>
    );
};
