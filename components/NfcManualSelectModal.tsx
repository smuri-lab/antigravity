import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { Customer, Activity, CompanySettings } from '../types';
import { Card } from './ui/Card';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { XIcon } from './icons/XIcon';

interface NfcManualSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (customerId: string, activityId: string) => void;
    customers: Customer[];
    activities: Activity[];
    companySettings: CompanySettings;
    // Pre-filled values from NFC tag (as fallback defaults)
    defaultCustomerId?: string;
    defaultActivityId?: string;
}

export const NfcManualSelectModal: React.FC<NfcManualSelectModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    customers,
    activities,
    companySettings,
    defaultCustomerId = '',
    defaultActivityId = '',
}) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId);
    const [selectedActivityId, setSelectedActivityId] = useState(defaultActivityId);

    const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
    const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';
    const mode = companySettings.timeCategoryMode || 'both';

    const showCustomer = mode === 'both' || mode === 'customer';
    const showActivity = mode === 'both' || mode === 'activity';

    const handleConfirm = () => {
        onConfirm(selectedCustomerId, selectedActivityId);
    };

    const isConfirmDisabled =
        (showCustomer && !selectedCustomerId) ||
        (showActivity && !selectedActivityId);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-modal-fade-in"
            onClick={onClose}
        >
            <Card
                className="w-full max-w-sm relative animate-modal-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <XIcon className="h-6 w-6" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl select-none">
                            📡
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">NFC-Scan erkannt</h2>
                            <p className="text-sm text-gray-500">Bitte Auswahl treffen</p>
                        </div>
                    </div>
                </div>

                {/* Selects */}
                <div className="space-y-4 mb-6">
                    {showCustomer && (
                        <Select
                            label={customerLabel}
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="">— {customerLabel} wählen —</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    )}
                    {showActivity && (
                        <Select
                            label={activityLabel}
                            value={selectedActivityId}
                            onChange={(e) => setSelectedActivityId(e.target.value)}
                        >
                            <option value="">— {activityLabel} wählen —</option>
                            {activities.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </Select>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={onClose}
                        className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Stempeluhr starten
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};
