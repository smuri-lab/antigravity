
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { CompanySettings, Employee } from '../../types';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { RadioGroup } from '../ui/RadioGroup';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProfileSettings } from './ProfileSettings';
import { UserCircleIcon } from '../icons/UserCircleIcon';
import { CogIcon } from '../icons/CogIcon';
import { AlertModal } from '../ui/AlertModal';

interface SettingsViewProps {
    selectedState: string;
    onStateChange: (state: string) => void;
    timeTrackingMethod: 'all' | 'manual';
    onTimeTrackingMethodChange: (method: 'all' | 'manual') => void;
    companySettings: CompanySettings;
    onUpdateCompanySettings: (settings: CompanySettings) => void;
    // Added props for Profile integration
    currentUser: Employee;
    onUpdateEmployee: (employee: Employee) => void;
    initialTab?: 'profile' | 'system';
}

const germanStates = [
    { code: 'BW', name: 'Baden-Württemberg' },
    { code: 'BY', name: 'Bayern' },
    { code: 'BE', name: 'Berlin' },
    { code: 'BB', name: 'Brandenburg' },
    { code: 'HB', name: 'Bremen' },
    { code: 'HH', name: 'Hamburg' },
    { code: 'HE', name: 'Hessen' },
    { code: 'MV', name: 'Mecklenburg-Vorpommern' },
    { code: 'NI', name: 'Niedersachsen' },
    { code: 'NW', name: 'Nordrhein-Westfalen' },
    { code: 'RP', name: 'Rheinland-Pfalz' },
    { code: 'SL', name: 'Saarland' },
    { code: 'SN', name: 'Sachsen' },
    { code: 'ST', name: 'Sachsen-Anhalt' },
    { code: 'SH', name: 'Schleswig-Holstein' },
    { code: 'TH', name: 'Thüringen' },
];

const timeTrackingOptions = [
    { value: 'all', label: 'Stempeluhr & Manuelle Eingabe' },
    { value: 'manual', label: 'Nur Manuelle Eingabe' },
];

const editabilityOptions = [
    { value: 'unlimited', label: 'Keine Sperrfrist (immer bearbeitbar)' },
    { value: 'currentMonth', label: 'Bearbeitbar im laufenden Monat' },
    { value: 'previousWeek', label: 'Bearbeitbar in aktueller & letzter Woche' },
    { value: 'sameDay', label: 'Bearbeitbar nur am selben Tag' },
];

const hoursOptions = Array.from({ length: 25 }, (_, i) => ({ value: i, label: `${i}:00 Uhr` }));

// Internal Component for System Settings
const SystemSettings: React.FC<Omit<SettingsViewProps, 'currentUser' | 'onUpdateEmployee' | 'initialTab'>> = ({
    selectedState, onStateChange, timeTrackingMethod, onTimeTrackingMethodChange, companySettings, onUpdateCompanySettings
}) => {
    const { t } = useTranslation();
    const [localSelectedState, setLocalSelectedState] = useState(selectedState);
    const [localTimeTrackingMethod, setLocalTimeTrackingMethod] = useState(timeTrackingMethod);
    const [localSettings, setLocalSettings] = useState(companySettings);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'timeTracking' | 'employeeSettings'>('general');

    useEffect(() => {
        setLocalSelectedState(selectedState);
        setLocalTimeTrackingMethod(timeTrackingMethod);
        setLocalSettings(companySettings);
    }, [selectedState, timeTrackingMethod, companySettings]);

    const handleLockRuleChange = (value: string) => {
        setLocalSettings(prev => ({ ...prev, editLockRule: value as CompanySettings['editLockRule'] }));
    };

    const handleExportToggle = (checked: boolean) => {
        setLocalSettings(prev => ({ ...prev, employeeCanExport: checked }));
    };

    const handleLabelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleTimeFormatChange = (key: 'adminTimeFormat' | 'employeeTimeFormat', value: string) => {
        setLocalSettings(prev => ({ ...prev, [key]: value as 'decimal' | 'hoursMinutes' }));
    };

    const handleAllowHalfDayVacationsToggle = (checked: boolean) => {
        setLocalSettings(prev => ({ ...prev, allowHalfDayVacations: checked }));
    };

    const handleShiftPlannerHourChange = (key: 'shiftPlannerStartHour' | 'shiftPlannerEndHour', value: string) => {
        const numValue = parseInt(value, 10);
        setLocalSettings(prev => ({ ...prev, [key]: numValue }));
    };

    const handleTimeCategoryModeChange = (value: string) => {
        setLocalSettings(prev => ({ ...prev, timeCategoryMode: value as 'both' | 'customer' | 'activity' }));
    };

    const handleSave = () => {
        if ((localSettings.shiftPlannerStartHour ?? 0) >= (localSettings.shiftPlannerEndHour ?? 24)) {
            setAlertConfig({ title: t('common.error', 'Fehler'), message: t('settings.error_time_range', 'Die Startzeit des Schichtplaners muss vor der Endzeit liegen.') });
            return;
        }

        onStateChange(localSelectedState);
        onTimeTrackingMethodChange(localTimeTrackingMethod);
        onUpdateCompanySettings({
            ...localSettings,
            customerLabel: localSettings.customerLabel || 'Zeitkategorie 1',
            activityLabel: localSettings.activityLabel || 'Zeitkategorie 2',
        });
        setSuccessMessage(t('settings.success_saved', 'Systemeinstellungen erfolgreich gespeichert!'));
        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const tabs = [
        { id: 'general', label: t('settings.tabs.general', 'Allgemein') },
        { id: 'timeTracking', label: t('settings.tabs.time_tracking', 'Zeiterfassung') },
        { id: 'employeeSettings', label: t('settings.tabs.employees', 'Mitarbeiter') },
    ];

    const customerLabel = localSettings.customerLabel || t('settings.time_tracking.label_cat1', 'Zeitkategorie 1');
    const activityLabel = localSettings.activityLabel || t('settings.time_tracking.label_cat2', 'Zeitkategorie 2');

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">{t('settings.system_configuration', 'Systemkonfiguration')}</h2>
                    <p className="text-sm text-gray-500">{t('settings.system_configuration_desc', 'Technische Einstellungen und Regeln für das Zeiterfassungssystem.')}</p>
                </div>
            </div>

            {successMessage && (
                <div className="mb-6 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg animate-fade-in" role="alert">
                    {successMessage}
                </div>
            )}

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="pt-8">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.general.state_label', 'Bundesland für Feiertage')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.general.state_desc', 'Wählen Sie Ihr Bundesland, um die gesetzlichen Feiertage korrekt zu berechnen.')}</p>
                            <Select
                                value={localSelectedState}
                                onChange={(e) => setLocalSelectedState(e.target.value)}
                                aria-label="Bundesland für Feiertage"
                            >
                                {germanStates.map(state => (
                                    <option key={state.code} value={state.code}>{state.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.general.time_format_label', 'Zeitformat für Anzeige & Eingabe')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.general.time_format_desc', 'Legen Sie fest, ob Zeitdauern in Dezimalstunden (z.B. 8,50h) oder in Stunden und Minuten (z.B. 8h 30min) angezeigt werden.')}</p>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">{t('settings.general.admin_view', 'Admin-Ansicht')}</h4>
                                    <RadioGroup
                                        name="adminTimeFormat"
                                        options={[
                                            { value: 'hoursMinutes', label: 'Stunden & Minuten (z.B. 8h 30min)' },
                                            { value: 'decimal', label: 'Dezimalstunden (z.B. 8,50h)' },
                                        ]}
                                        selectedValue={localSettings.adminTimeFormat || 'hoursMinutes'}
                                        onChange={(value) => handleTimeFormatChange('adminTimeFormat', value)}
                                    />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">{t('settings.general.employee_view', 'Mitarbeiter-Ansicht')}</h4>
                                    <RadioGroup
                                        name="employeeTimeFormat"
                                        options={[
                                            { value: 'hoursMinutes', label: 'Stunden & Minuten (z.B. 8h 30min)' },
                                            { value: 'decimal', label: 'Dezimalstunden (z.B. 8,50h)' },
                                        ]}
                                        selectedValue={localSettings.employeeTimeFormat || 'hoursMinutes'}
                                        onChange={(value) => handleTimeFormatChange('employeeTimeFormat', value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.general.shift_planner_grid', 'Schichtplaner Zeitraster')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.general.shift_planner_grid_desc', 'Definieren Sie den sichtbaren Zeitbereich im Schichtplaner.')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label={t('settings.general.start_time', 'Startzeit')}
                                    value={localSettings.shiftPlannerStartHour ?? 0}
                                    onChange={(e) => handleShiftPlannerHourChange('shiftPlannerStartHour', e.target.value)}
                                >
                                    {hoursOptions.filter(h => h.value < 24).map(h => (
                                        <option key={h.value} value={h.value}>{h.label}</option>
                                    ))}
                                </Select>
                                <Select
                                    label={t('settings.general.end_time', 'Endzeit')}
                                    value={localSettings.shiftPlannerEndHour ?? 24}
                                    onChange={(e) => handleShiftPlannerHourChange('shiftPlannerEndHour', e.target.value)}
                                >
                                    {hoursOptions.filter(h => h.value > 0).map(h => (
                                        <option key={h.value} value={h.value}>{h.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'timeTracking' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.time_tracking.category_label', 'Zeitkategorien Benennung')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.time_tracking.category_desc', "Benennen Sie die Zeitkategorien, um sie an die Terminologie Ihres Unternehmens anzupassen (z.B. 'Kunde' in 'Projekt' ändern).")}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input name="customerLabel" label={t('settings.time_tracking.label_cat1', 'Bezeichnung für Zeitkategorie 1')} value={localSettings.customerLabel || ''} onChange={handleLabelInputChange} placeholder="z.B. Kunde, Projekt..." />
                                <Input name="activityLabel" label={t('settings.time_tracking.label_cat2', 'Bezeichnung für Zeitkategorie 2')} value={localSettings.activityLabel || ''} onChange={handleLabelInputChange} placeholder="z.B. Tätigkeit, Aufgabe..." />
                                <Input name="nfcTagIdLabel" label={t('settings.time_tracking.label_nfc', 'Bezeichnung für NFC-Tag ID')} value={localSettings.nfcTagIdLabel || ''} onChange={handleLabelInputChange} placeholder="z.B. NFC-TAG ID, Chip-Nummer..." />
                            </div>
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.time_tracking.required_fields', 'Benötigte Erfassungsfelder')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.time_tracking.required_fields_desc', 'Welche Angaben sind bei der Zeiterfassung zwingend erforderlich?')}</p>
                            <RadioGroup
                                name="timeCategoryMode"
                                options={[
                                    { value: 'both', label: t('settings.time_tracking.mode_both', `Beide (${customerLabel} & ${activityLabel}) - Standard`, { cat1: customerLabel, cat2: activityLabel }) },
                                    { value: 'customer', label: t('settings.time_tracking.mode_cat1', `Nur Kategorie 1 (${customerLabel}) - z.B. für Dienstleister`, { cat1: customerLabel }) },
                                    { value: 'activity', label: t('settings.time_tracking.mode_cat2', `Nur Kategorie 2 (${activityLabel}) - z.B. für Gastronomie`, { cat2: activityLabel }) },
                                ]}
                                selectedValue={localSettings.timeCategoryMode || 'both'}
                                onChange={handleTimeCategoryModeChange}
                            />
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.time_tracking.methods_label', 'Verfügbare Zeiterfassungsmethoden')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.time_tracking.methods_desc', 'Legen Sie fest, ob Mitarbeiter nur manuell Zeiten eintragen oder auch die Stempeluhr nutzen können.')}</p>
                            <RadioGroup
                                name="timeTrackingMethod"
                                options={[
                                    { value: 'all', label: t('settings.time_tracking.method_all', 'Stempeluhr & Manuelle Eingabe') },
                                    { value: 'manual', label: t('settings.time_tracking.method_manual', 'Nur Manuelle Eingabe') },
                                ]}
                                selectedValue={localTimeTrackingMethod}
                                onChange={(value) => setLocalTimeTrackingMethod(value as 'all' | 'manual')}
                            />
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.time_tracking.edit_lock_label', 'Bearbeitbarkeit von Zeiteinträgen')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.time_tracking.edit_lock_desc', 'Legen Sie fest, wie lange Mitarbeiter ihre eigenen Zeiteinträge bearbeiten oder löschen können. Als Admin können Sie immer alle Einträge bearbeiten.')}</p>
                            <RadioGroup
                                name="editLockRule"
                                options={[
                                    { value: 'unlimited', label: t('settings.time_tracking.lock_unlimited', 'Keine Sperrfrist (immer bearbeitbar)') },
                                    { value: 'currentMonth', label: t('settings.time_tracking.lock_current_month', 'Bearbeitbar im laufenden Monat') },
                                    { value: 'previousWeek', label: t('settings.time_tracking.lock_previous_week', 'Bearbeitbar in aktueller & letzter Woche') },
                                    { value: 'sameDay', label: t('settings.time_tracking.lock_same_day', 'Bearbeitbar nur am selben Tag') },
                                ]}
                                selectedValue={localSettings.editLockRule || 'currentMonth'}
                                onChange={handleLockRuleChange}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'employeeSettings' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.employee_settings.vacation_label', 'Urlaubsanträge')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.employee_settings.vacation_desc', 'Aktiviert die Beantragung von halbtägigem Urlaub.')}</p>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                                <label className="text-sm font-medium text-gray-700">{t('settings.employee_settings.allow_half_day', 'Halbtägigen Urlaub erlauben')}</label>
                                <ToggleSwitch
                                    checked={localSettings.allowHalfDayVacations ?? false}
                                    onChange={handleAllowHalfDayVacationsToggle}
                                />
                            </div>
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('settings.employee_settings.export_label', 'Stundenzettel-Export')}</h3>
                            <p className="text-sm text-gray-500 mb-4">{t('settings.employee_settings.export_desc', 'Ermöglicht Mitarbeitern den Export eigener Stundenzettel.')}</p>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                                <label className="text-sm font-medium text-gray-700">{t('settings.employee_settings.allow_export', 'Export-Funktion für Mitarbeiter aktivieren')}</label>
                                <ToggleSwitch
                                    checked={localSettings.employeeCanExport ?? true}
                                    onChange={handleExportToggle}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-8 mt-8 border-t">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {t('common.save', 'Speichern')}
                </Button>
            </div>

            <AlertModal
                isOpen={!!alertConfig}
                onClose={() => setAlertConfig(null)}
                title={alertConfig?.title || ''}
                message={alertConfig?.message || ''}
            />
        </Card>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const [mainTab, setMainTab] = useState<'profile' | 'system'>(props.initialTab || 'system');

    // Update local state if prop changes (e.g. navigation action)
    useEffect(() => {
        if (props.initialTab) {
            setMainTab(props.initialTab);
        }
    }, [props.initialTab]);

    return (
        <div className="space-y-6">
            {/* Top Level Navigation Switch */}
            <div className="flex justify-center md:justify-start">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                    <button
                        onClick={() => setMainTab('profile')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mainTab === 'profile'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <UserCircleIcon className="h-5 w-5" />
                        Profil & Account
                    </button>
                    <button
                        onClick={() => setMainTab('system')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mainTab === 'system'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <CogIcon className="h-5 w-5" />
                        Technisches
                    </button>
                </div>
            </div>

            <div className="animate-fade-in">
                {mainTab === 'profile' && (
                    <ProfileSettings
                        currentUser={props.currentUser}
                        onUpdate={props.onUpdateEmployee}
                        companySettings={props.companySettings}
                        onUpdateCompanySettings={props.onUpdateCompanySettings}
                    />
                )}
                {mainTab === 'system' && (
                    <SystemSettings {...props} />
                )}
            </div>
        </div>
    );
};
