
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';
import { SelectorButton } from '../ui/SelectorButton';
import { EmployeeMultiSelectModal } from './EmployeeMultiSelectModal';
import { Input } from '../ui/Input';

interface ShiftPlanExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employees: Employee[], startDate: Date, endDate: Date, format: 'pdf') => void;
  employees: Employee[];
}

const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -1; i < 3; i++) {
        years.push(currentYear + i);
    }
    return years;
};

// Helper to get start of week (Monday)
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
};

export const ShiftPlanExportModal: React.FC<ShiftPlanExportModalProps> = ({ isOpen, onClose, onConfirm, employees }) => {
  const [mode, setMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toLocaleDateString('sv-SE')); // Used to pick any day in the week
  
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeIds(employees.map(e => String(e.id))); // Default all
      setIsClosing(false);
    }
  }, [isOpen, employees]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const employeesToExport = employees.filter(e => selectedEmployeeIds.includes(String(e.id)));
    
    if (employeesToExport.length === 0) {
        alert("Bitte wählen Sie mindestens einen Mitarbeiter aus.");
        return;
    }

    let startDate: Date;
    let endDate: Date;

    if (mode === 'monthly') {
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    } else {
        if (!selectedWeekDate) {
            alert("Bitte wählen Sie ein Datum für die Woche aus.");
            return;
        }
        startDate = getStartOfWeek(new Date(selectedWeekDate));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
    }
    
    setIsClosing(true);
    setTimeout(() => {
        onConfirm(employeesToExport, startDate, endDate, 'pdf');
    }, 300);
  };

  if (!isOpen) return null;

  const getEmployeeSelectorLabel = () => {
      if (selectedEmployeeIds.length === 0) return 'Keine Mitarbeiter ausgewählt';
      if (selectedEmployeeIds.length === employees.length) return 'Alle Mitarbeiter';
      if (selectedEmployeeIds.length === 1) {
          const emp = employees.find(e => String(e.id) === selectedEmployeeIds[0]);
          return emp ? `${emp.firstName} ${emp.lastName}` : '1 Mitarbeiter';
      }
      return `${selectedEmployeeIds.length} Mitarbeiter ausgewählt`;
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-[200] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-bold text-center">Schichtplan exportieren</h2>
          
          <div className="space-y-4">
            
            {/* Mode Selection */}
            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
                <button
                    type="button"
                    onClick={() => setMode('weekly')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'weekly' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    Wochenplan
                </button>
                <button
                    type="button"
                    onClick={() => setMode('monthly')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    Monatsplan
                </button>
            </div>

            {/* Time Selection */}
            {mode === 'weekly' ? (
                <Input 
                    label="Datum in der Woche auswählen" 
                    type="date" 
                    value={selectedWeekDate} 
                    onChange={(e) => setSelectedWeekDate(e.target.value)} 
                    required 
                />
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Monat" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </Select>
                    <Select label="Jahr" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                        {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </div>
            )}

            {/* Employee Selection */}
            <div>
              <SelectorButton 
                  label="Mitarbeiter" 
                  value={getEmployeeSelectorLabel()} 
                  onClick={() => setIsEmployeeSelectOpen(true)} 
                  placeholder="Mitarbeiter auswählen..."
              />
            </div>
            
            <p className="text-xs text-gray-500">
                Es wird für jeden ausgewählten Mitarbeiter eine individuelle Übersicht erstellt (PDF, gruppiert nach Seiten).
            </p>

          </div>

          <div className="flex justify-end gap-4 pt-4 border-t mt-4">
            <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Exportieren (PDF)</Button>
          </div>
        </form>
      </Card>
      
      <EmployeeMultiSelectModal
        isOpen={isEmployeeSelectOpen}
        onClose={() => setIsEmployeeSelectOpen(false)}
        onApply={(ids) => {
            setSelectedEmployeeIds(ids.map(String));
            setIsEmployeeSelectOpen(false);
        }}
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds.map(Number)}
      />
    </div>,
    document.body
  );
};
