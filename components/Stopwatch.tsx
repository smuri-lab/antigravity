
import React, { useState, useEffect, useRef } from 'react';
import type { TimeEntry, Customer, Activity, CompanySettings, AbsenceRequest } from '../types';
import { Button } from './ui/Button';
import { BreakModal } from './BreakModal';
import { SelectionModal } from './ui/SelectionModal';
import { SelectorButton } from './ui/SelectorButton';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { Textarea } from './ui/Textarea';
import { InfoModal } from './ui/InfoModal';
import { getDistanceFromLatLonInMeters, checkCollision } from './utils';
import { MapPinIcon } from './icons/MapPinIcon';

interface StopwatchProps {
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => void;
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  companySettings: CompanySettings;
  absenceRequests: AbsenceRequest[];
  // Lifted state and handlers
  isRunning: boolean;
  startTime: Date | null;
  stopTime: Date | null;
  elapsedTime: number;
  customerId: string;
  activityId: string;
  comment: string;
  isBreakModalOpen: boolean;
  setIsBreakModalOpen: (isOpen: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setStartTime: (date: Date | null) => void;
  setStopTime: (date: Date | null) => void;
  setElapsedTime: (time: number) => void;
  setCustomerId: (id: string) => void;
  setActivityId: (id: string) => void;
  setComment: (comment: string) => void;
  onSuccess?: () => void;
}

export const Stopwatch: React.FC<StopwatchProps> = ({
  addTimeEntry, timeEntries, customers, activities, companySettings, absenceRequests,
  isRunning, startTime, stopTime, elapsedTime, customerId, activityId, comment,
  isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setStopTime, setElapsedTime,
  setCustomerId, setActivityId, setComment, onSuccess
}) => {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
  const [isLocating, setIsLocating] = useState(false);
  const [capturedGps, setCapturedGps] = useState<{ lat: number, lng: number } | undefined>(undefined);
  const locationTimeoutRef = useRef<number | null>(null);

  const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';

  // Logic to determine which fields are required
  const mode = companySettings.timeCategoryMode || 'both';
  const showCustomer = mode !== 'activity';
  const showActivity = mode !== 'customer';

  const handleCloseModal = () => {
    setIsBreakModalOpen(false);
  };

  const handleSaveEntry = (breakDurationMinutes: number) => {
    if (!startTime || !stopTime) return;

    const entryStartTime = startTime;
    const endTime = stopTime;

    const collision = checkCollision(entryStartTime, endTime, timeEntries, absenceRequests);
    if (collision) {
      setInfoModal({
        isOpen: true,
        title: collision.type === 'absence' ? 'Abwesenheit Konflikt' : 'Überlappung',
        message: collision.type === 'absence'
          ? 'In diesem Zeitraum liegt bereits eine Abwesenheit vor.'
          : 'Dieser Zeitraum überschneidet sich mit einem existierenden Zeiteintrag.'
      });
      handleCloseModal();
      return;
    }

    addTimeEntry({
      start: entryStartTime.toISOString(),
      end: endTime.toISOString(),
      customerId: customerId || '', // Default to empty string if not required
      activityId: activityId || '', // Default to empty string if not required
      breakDurationMinutes,
      type: 'stopwatch',
      comment: comment || undefined,
      startGpsLat: capturedGps?.lat,
      startGpsLng: capturedGps?.lng,
    });

    onSuccess?.();

    setElapsedTime(0);
    setStartTime(null);
    setStopTime(null);
    setCapturedGps(undefined);
    setCustomerId('');
    setActivityId('');
    setComment('');
    setIsBreakModalOpen(false);
  };

  const handleCancelLocation = () => {
    if (locationTimeoutRef.current !== null) {
      clearTimeout(locationTimeoutRef.current);
    }
    setIsLocating(false);
  };

  const handleToggle = () => {
    if (isRunning) {
      // STOPPING
      setStopTime(new Date());
      setIsRunning(false);
      setIsBreakModalOpen(true);
    } else {
      // STARTING
      const todayStr = new Date().toLocaleDateString('sv-SE');
      // Additional check for full-day absences explicitly before checking collision for cleaner UX
      const todaysAbsence = absenceRequests.find(req =>
        req.status !== 'rejected' &&
        todayStr >= req.startDate &&
        todayStr <= req.endDate
      );

      if (todaysAbsence) {
        setInfoModal({ isOpen: true, title: 'Start nicht möglich', message: 'Sie haben für heute eine genehmigte oder beantragte Abwesenheit und können die Stempeluhr nicht starten.' });
        return;
      }

      // Dynamic Validation
      if (showCustomer && !customerId) {
        setInfoModal({ isOpen: true, title: 'Auswahl erforderlich', message: `Bitte wählen Sie zuerst ${customerLabel} aus.` });
        return;
      }
      if (showActivity && !activityId) {
        setInfoModal({ isOpen: true, title: 'Auswahl erforderlich', message: `Bitte wählen Sie zuerst ${activityLabel} aus.` });
        return;
      }

      const selectedCustomer = customers.find(c => c.id === customerId);

      // GPS CHECK LOGIC
      // Only enforce if customer is selected and requires it
      if (showCustomer && selectedCustomer?.gpsLat && selectedCustomer?.gpsLng) {
        setIsLocating(true);
        if (!navigator.geolocation) {
          setIsLocating(false);
          setInfoModal({ isOpen: true, title: 'GPS Fehler', message: 'Ihr Browser unterstützt keine Standortbestimmung.' });
          return;
        }

        // Manual timeout as fallback
        locationTimeoutRef.current = setTimeout(() => {
          setIsLocating(false);
          setInfoModal({ isOpen: true, title: 'Zeitüberschreitung', message: 'Die Standortbestimmung hat zu lange gedauert. Bitte versuchen Sie es erneut oder prüfen Sie Ihre GPS-Einstellungen.' });
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
            if (!isLocating) return; // Cancelled

            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;

            // Always capture if available
            setCapturedGps({ lat: currentLat, lng: currentLng });

            if (selectedCustomer.enforceGeofencing) {
              const dist = getDistanceFromLatLonInMeters(
                currentLat,
                currentLng,
                selectedCustomer.gpsLat!,
                selectedCustomer.gpsLng!
              );

              const radius = selectedCustomer.gpsRadius || 200;

              if (dist > radius) {
                setIsLocating(false);
                setInfoModal({
                  isOpen: true,
                  title: 'Außerhalb des Bereichs',
                  message: `Sie befinden sich ${Math.round(dist)}m entfernt vom Standort. Erlaubt sind max. ${radius}m.`
                });
                return;
              }
            }

            // Success - Start Timer
            setIsLocating(false);
            setElapsedTime(0);
            setStartTime(new Date());
            setStopTime(null);
            setIsRunning(true);
          },
          (error) => {
            if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
            setIsLocating(false);
            console.error("GPS Error", error);
            if (selectedCustomer.enforceGeofencing) {
              setInfoModal({ isOpen: true, title: 'Standort erforderlich', message: 'Der Standort konnte nicht ermittelt werden. Für diesen Kunden ist eine Standorterfassung zwingend erforderlich.' });
            } else {
              // Allow start without GPS if not enforced
              setElapsedTime(0);
              setStartTime(new Date());
              setStopTime(null);
              setIsRunning(true);
            }
          },
          { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
        );
      } else {
        // No GPS required or no Customer check needed
        setElapsedTime(0);
        setStartTime(new Date());
        setStopTime(null);
        setIsRunning(true);
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || '';
  const selectedActivityName = activities.find(a => a.id === activityId)?.name || '';

  return (
    <>
      <div className="flex flex-col items-center space-y-4 p-4">
        <div className="text-4xl sm:text-6xl font-mono font-bold tracking-wider text-gray-800 bg-gray-100 rounded-lg p-4 w-full text-center">
          {formatTime(elapsedTime)}
        </div>

        <div className="w-full space-y-4">
          {showCustomer && (
            <SelectorButton
              label={customerLabel}
              value={selectedCustomerName}
              placeholder="Auswählen..."
              onClick={() => setIsCustomerModalOpen(true)}
              disabled={isRunning || isLocating}
            />
          )}
          {showActivity && (
            <SelectorButton
              label={activityLabel}
              value={selectedActivityName}
              placeholder="Auswählen..."
              onClick={() => setIsActivityModalOpen(true)}
              disabled={isRunning || isLocating}
            />
          )}
          <Textarea
            label="Kommentar (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isRunning || isLocating}
            rows={2}
          />
        </div>

        <Button
          onClick={handleToggle}
          className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${isLocating ? 'bg-blue-400 cursor-wait' : (isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600')
            }`}
          aria-label={isRunning ? 'Zeiterfassung stoppen' : 'Zeiterfassung starten'}
          disabled={isLocating}
        >
          {isLocating ? (
            <MapPinIcon className="h-7 w-7 text-white animate-bounce" />
          ) : (
            isRunning ? <StopIcon className="h-7 w-7 text-white" /> : <PlayIcon className="h-7 w-7 text-white ml-0.5" />
          )}
        </Button>
        {isLocating && (
          <div className="flex flex-col items-center mt-2">
            <p className="text-sm text-gray-500 animate-pulse">Standort wird ermittelt...</p>
            <Button onClick={handleCancelLocation} className="mt-2 text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 h-8 px-2">
              Abbrechen
            </Button>
          </div>
        )}
      </div>

      {isBreakModalOpen && (
        <BreakModal
          onClose={handleCloseModal}
          onSave={handleSaveEntry}
        />
      )}

      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
        title={infoModal.title}
        message={infoModal.message}
      />

      <SelectionModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={(item) => setCustomerId(item.id)}
        items={customers}
        title={`${customerLabel} auswählen`}
        selectedValue={customerId}
      />
      <SelectionModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSelect={(item) => setActivityId(item.id)}
        items={activities}
        title={`${activityLabel} auswählen`}
        selectedValue={activityId}
      />
    </>
  );
};
