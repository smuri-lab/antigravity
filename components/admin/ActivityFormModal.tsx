import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Activity, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';
import { AlertModal } from '../ui/AlertModal';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Omit<Activity, 'id'> | Activity) => void;
  initialData: Activity | null;
  companySettings: CompanySettings;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({ isOpen, onClose, onSave, initialData, companySettings }) => {
  const [name, setName] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  const activityLabel = companySettings.activityLabel || 'Tätigkeit';

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
      } else {
        setName('');
      }
      setIsClosing(false);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [initialData, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setAlertConfig({ title: 'Leeres Feld', message: `Der Name für ${activityLabel} darf nicht leer sein.` });
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      if (initialData) {
        onSave({ ...initialData, name });
      } else {
        onSave({ name });
      }
    }, 300);
  };

  if (!isOpen && !isClosing) return null;

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 flex items-center justify-center z-30 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`} onClick={handleClose}>
      <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>

        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-4">{initialData ? `${activityLabel} bearbeiten` : `Neue ${activityLabel} anlegen`}</h2>

          <div className="space-y-4 pt-4 border-t">
            <Input
              name="name"
              label={`Name für ${activityLabel}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end items-center pt-6 border-t mt-6">
            <div className="flex gap-4">
              <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
            </div>
          </div>
        </form>
      </Card>
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