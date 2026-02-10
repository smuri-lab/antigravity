
import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { AdminView } from './components/AdminView';
import { BottomNav } from './components/BottomNav';
import type { TimeEntry, AbsenceRequest, UserAccount, Employee, Customer, Activity, Holiday, CompanySettings, TimeBalanceAdjustment, HolidaysByYear, WeeklySchedule, Shift, ShiftTemplate } from './types';
import { View, EmploymentType, AbsenceType, TargetHoursModel, AdminViewType } from './types';
import { INITIAL_CUSTOMERS, INITIAL_ACTIVITIES, INITIAL_USER_ACCOUNT, INITIAL_EMPLOYEES, INITIAL_SHIFT_TEMPLATES, getHolidays, GermanState } from './constants';
import { LoginScreen } from './components/LoginScreen';
import { RegistrationScreen } from './components/RegistrationScreen';
import { LogoutIcon } from './components/icons/LogoutIcon';
// FIX: Removed unused and unexported 'calculateTargetHours' from import.
import { getContractDetailsForDate, calculateAnnualVacationTaken, calculateBalance, calculateMonthlyBreakdown } from './components/utils';
import { SwitchHorizontalIcon } from './components/icons/SwitchHorizontalIcon';
import { ActionSheet } from './components/ui/ActionSheet';
import { AbsenceRequestModal } from './components/AbsenceRequestModal';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { ManualEntryFormModal } from './components/ManualEntryFormModal';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { CogIcon } from './components/icons/CogIcon';
import { OverviewView } from './components/OverviewView';
import { useStore } from './store/useStore';
import { useTranslation } from 'react-i18next';

// --- PERSISTENCE HOOK ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}

const generateDemoData = () => {
  const timeEntries: TimeEntry[] = [];
  const absenceRequests: AbsenceRequest[] = [];
  const shifts: Shift[] = [];
  let entryIdCounter = 1000;

  // --- Jan Demo 2025 ---
  const janEmployeeId = 1;
  const janYear = 2025;

  // Shifts for Jan (Current Week + Next Week)
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const day = d.getDay();

    if (day >= 1 && day <= 5) { // Mon-Fri
      const start = new Date(d);
      start.setHours(8, 0, 0, 0);
      const end = new Date(d);
      end.setHours(16, 30, 0, 0);

      shifts.push({
        id: `shift-${entryIdCounter++}`,
        employeeId: janEmployeeId,
        start: start.toISOString(),
        end: end.toISOString(),
        label: 'Frühschicht',
        color: '#f59e0b' // Orange/Yellowish for Early
      });
    }
  }

  absenceRequests.push({
    id: entryIdCounter++,
    employeeId: janEmployeeId,
    type: AbsenceType.Vacation,
    status: 'approved',
    startDate: new Date(janYear, 6, 1).toLocaleDateString('sv-SE'),
    endDate: new Date(janYear, 7, 4).toLocaleDateString('sv-SE'),
  });
  absenceRequests.push({
    id: entryIdCounter++,
    employeeId: janEmployeeId,
    type: AbsenceType.TimeOff,
    status: 'approved',
    startDate: '2025-02-10', // Monday
    endDate: '2025-02-11',   // Tuesday
  });

  let currentDateJan = new Date(janYear, 0, 1);
  while (currentDateJan <= new Date(janYear, 11, 31)) {
    const dayOfWeek = currentDateJan.getDay();
    const dateStr = currentDateJan.toLocaleDateString('sv-SE');
    const hasAbsence = absenceRequests.some(
      req => req.employeeId === janEmployeeId && req.status !== 'rejected' && dateStr >= req.startDate && dateStr <= req.endDate
    );

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !hasAbsence) {
      const startTime = new Date(currentDateJan);
      startTime.setHours(8, Math.floor(Math.random() * 21) - 10, 0, 0);
      const endTime = new Date(currentDateJan);
      endTime.setHours(17, Math.floor(Math.random() * 41) - 20, 0, 0);
      timeEntries.push({
        id: entryIdCounter++, employeeId: janEmployeeId, start: startTime.toISOString(), end: endTime.toISOString(),
        breakDurationMinutes: 60, customerId: INITIAL_CUSTOMERS[0].id, activityId: INITIAL_ACTIVITIES[0].id,
        type: 'manual',
      });
    }
    currentDateJan.setDate(currentDateJan.getDate() + 1);
  }

  // --- Tina Teilzeit 2026 ---
  const tinaEmployeeId = 2;
  const tinaYear = 2026;
  absenceRequests.push({
    id: entryIdCounter++,
    employeeId: tinaEmployeeId,
    type: AbsenceType.TimeOff,
    status: 'approved',
    startDate: '2026-01-12', // This is a Monday
    endDate: '2026-01-12',
  });

  let currentDateTina = new Date(tinaYear, 0, 1);
  while (currentDateTina <= new Date(tinaYear, 11, 31)) {
    const dayOfWeek = currentDateTina.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed
    const dateStr = currentDateTina.toLocaleDateString('sv-SE');
    const hasAbsence = absenceRequests.some(
      req => req.employeeId === tinaEmployeeId && req.status !== 'rejected' && dateStr >= req.startDate && dateStr <= req.endDate
    );

    let dailyHours = 0;
    if (dayOfWeek === 1) dailyHours = 8; // Monday
    if (dayOfWeek === 2) dailyHours = 8; // Tuesday
    if (dayOfWeek === 3) dailyHours = 4; // Wednesday

    if (dailyHours > 0 && !hasAbsence) {
      const startTime = new Date(currentDateTina);
      startTime.setHours(8, 30, 0, 0);
      const endTime = new Date(startTime.getTime() + (dailyHours * 3600 * 1000));
      timeEntries.push({
        id: entryIdCounter++, employeeId: tinaEmployeeId, start: startTime.toISOString(), end: endTime.toISOString(),
        breakDurationMinutes: 0, customerId: 'c4', activityId: 'a4',
        type: 'manual',
      });
    }
    currentDateTina.setDate(currentDateTina.getDate() + 1);
  }

  // --- Admin User Demo 2025 ---
  const adminEmployeeId = 0;
  const adminYear = 2025;
  const adminStartDate = new Date(adminYear, 6, 1); // July 1st
  const adminEndDate = new Date(adminYear, 11, 31); // End of 2025

  let currentDateAdmin = new Date(adminStartDate);
  while (currentDateAdmin <= adminEndDate) {
    const dayOfWeek = currentDateAdmin.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Mon-Fri
      const startTime = new Date(currentDateAdmin);
      startTime.setHours(9, Math.floor(Math.random() * 15) - 5, 0, 0); // around 9 AM
      const endTime = new Date(currentDateAdmin);
      endTime.setHours(17, 30 + Math.floor(Math.random() * 31) - 15, 0, 0); // around 5:30 PM
      timeEntries.push({
        id: entryIdCounter++,
        employeeId: adminEmployeeId,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        breakDurationMinutes: 45,
        customerId: INITIAL_CUSTOMERS[3].id, // Interne Verwaltung
        activityId: INITIAL_ACTIVITIES[3].id, // Büroarbeit
        type: 'manual',
      });
    }
    currentDateAdmin.setDate(currentDateAdmin.getDate() + 1);
  }

  return { timeEntries, absenceRequests, shifts };
};



const DEMO_DATA = generateDemoData();
const MOCK_CURRENT_YEAR = 2026;

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    loggedInUser, setLoggedInUser,
    currentView, setCurrentView,
    adminViewMode, setAdminViewMode,
    adminActiveView, setAdminActiveView,
    timeEntries, setTimeEntries,
    absenceRequests, setAbsenceRequests,
    shifts, setShifts,
    shiftTemplates, setShiftTemplates,
    timeBalanceAdjustments, setTimeBalanceAdjustments,
    employees, setEmployees,
    customers, setCustomers,
    activities, setActivities,
    companySettings, setCompanySettings,
    authView, setAuthView,
    isActionSheetOpen, setIsActionSheetOpen,
    isAbsenceRequestModalOpen, setIsAbsenceRequestModalOpen,
    isManualEntryModalOpen, setIsManualEntryModalOpen,
    showAbsenceSuccess, setShowAbsenceSuccess,
    showTimeEntrySuccess, setShowTimeEntrySuccess,
    showNfcSuccess, setShowNfcSuccess,
    nfcSuccessMessage, setNfcSuccessMessage,
    selectedState, setSelectedState,
    holidaysByYear, setHolidaysByYear,
    isRunning, setIsRunning,
    startTime, setStartTime,
    stopTime, setStopTime,
    elapsedTime, setElapsedTime,
    stopwatchCustomerId, setStopwatchCustomerId,
    stopwatchActivityId, setStopwatchActivityId,
    stopwatchComment, setStopwatchComment,
    isBreakModalOpen, setIsBreakModalOpen,
    resetStopwatch,
    addTimeEntry, updateTimeEntry, deleteTimeEntry,
    addAbsenceRequest, updateAbsenceRequest, deleteAbsenceRequest,
    updateAbsenceRequestStatus,
    addTimeBalanceAdjustment, updateTimeBalanceAdjustment, deleteTimeBalanceAdjustment,
    addShift, updateShift, deleteShift,
    addShiftTemplate, updateShiftTemplate, deleteShiftTemplate,
  } = useStore();

  const [timeTrackingMethod, setTimeTrackingMethod] = useLocalStorage<'all' | 'manual'>('timepro-method', 'all');
  const [userAccount] = useState<UserAccount>(INITIAL_USER_ACCOUNT); // Keep as local since it's derived/initial
  const intervalRef = React.useRef<number | null>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // SCROLL RESET - Targeted at the internal container
  useLayoutEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    // Also reset window scroll just in case, though overflow:hidden on body should prevent it
    window.scrollTo(0, 0);
  }, [loggedInUser, currentView, adminViewMode]);

  // ... (Effects for timeouts remain the same) ...
  useEffect(() => {
    if (showAbsenceSuccess) {
      const timer = setTimeout(() => setShowAbsenceSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showAbsenceSuccess]);

  useEffect(() => {
    if (showTimeEntrySuccess) {
      const timer = setTimeout(() => setShowTimeEntrySuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTimeEntrySuccess]);

  useEffect(() => {
    if (showNfcSuccess) {
      const timer = setTimeout(() => setShowNfcSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showNfcSuccess]);

  // Stopwatch timer logic
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, startTime]);

  // Clear holidays when state changes to force a reload
  useEffect(() => {
    setHolidaysByYear({});
  }, [selectedState]);

  const ensureHolidaysForYear = useCallback((year: number) => {
    if (holidaysByYear.hasOwnProperty(year)) {
      return;
    }
    const holidays = getHolidays(year, selectedState);
    if (holidays.length > 0) {
      setHolidaysByYear(prev => ({ ...prev, [year]: holidays }));
    } else {
      console.warn(`Keine Feiertage für ${year} im Bundesland ${selectedState} gefunden.`);
      setHolidaysByYear(prev => ({ ...prev, [year]: [] }));
    }
  }, [holidaysByYear, selectedState]);

  const isDisplayingAdminView = loggedInUser?.role === 'admin' && adminViewMode === 'admin';

  // NFC Reader Logic (remains the same) ...
  useEffect(() => {
    // @ts-ignore
    if (!('NDEFReader' in window)) {
      console.log("Web NFC wird von diesem Browser nicht unterstützt.");
      return;
    }
    if (!loggedInUser || isDisplayingAdminView) {
      return;
    }

    const abortController = new AbortController();

    const startScan = async () => {
      try {
        // @ts-ignore
        const reader = new NDEFReader();
        await reader.scan({ signal: abortController.signal });

        reader.onreading = (event: any) => {
          const message = event.message;
          for (const record of message.records) {
            if (record.recordType === "text") {
              const textDecoder = new TextDecoder();
              const text = textDecoder.decode(record.data);

              try {
                const data = JSON.parse(text);

                if (data.customerId && data.activityId) {
                  if (isRunning) {
                    setNfcSuccessMessage(`Stempeluhr läuft bereits.`);
                    setShowNfcSuccess(true);
                    return;
                  }

                  const todayStr = new Date().toLocaleDateString('sv-SE');
                  const todaysAbsence = absenceRequests.find(req =>
                    req.employeeId === loggedInUser.id &&
                    req.status !== 'rejected' &&
                    todayStr >= req.startDate &&
                    todayStr <= req.endDate
                  );
                  if (todaysAbsence) {
                    setNfcSuccessMessage('Start wegen Abwesenheit nicht möglich.');
                    setShowNfcSuccess(true);
                    return;
                  }

                  setStopwatchCustomerId(data.customerId);
                  setStopwatchActivityId(data.activityId);
                  setStartTime(new Date());
                  setIsRunning(true);
                  setCurrentView(View.Dashboard);

                  const customerName = customers.find(c => c.id === data.customerId)?.name || data.customerId;
                  const activityName = activities.find(a => a.id === data.activityId)?.name || data.activityId;
                  setNfcSuccessMessage(`Zeiterfassung für "${customerName} / ${activityName}" gestartet.`);
                  setShowNfcSuccess(true);
                }
              } catch (e) {
                console.error("Fehler beim Parsen der NFC-Daten als JSON:", e);
              }
            }
          }
        };
      } catch (error) {
        console.error("Fehler beim Starten des NFC-Scans:", error);
      }
    };

    startScan();

    return () => {
      abortController.abort();
    };
  }, [loggedInUser, isDisplayingAdminView, isRunning, absenceRequests, customers, activities]);


  useEffect(() => {
    const loadMissingHolidays = () => {
      const requiredYears = new Set<number>();
      requiredYears.add(MOCK_CURRENT_YEAR);
      requiredYears.add(MOCK_CURRENT_YEAR - 1);

      employees.forEach(emp => {
        if (emp.firstWorkDay) requiredYears.add(new Date(emp.firstWorkDay).getFullYear());
        emp.contractHistory.forEach(c => requiredYears.add(new Date(c.validFrom).getFullYear()));
      });
      timeEntries.forEach(t => requiredYears.add(new Date(t.start).getFullYear()));
      absenceRequests.forEach(a => requiredYears.add(new Date(a.startDate).getFullYear()));
      shifts.forEach(s => requiredYears.add(new Date(s.start).getFullYear()));

      for (const year of Array.from(requiredYears)) {
        ensureHolidaysForYear(year);
      }
    };

    loadMissingHolidays();
  }, [employees, timeEntries, absenceRequests, shifts, ensureHolidaysForYear]);

  const isUserAdmin = loggedInUser?.role === 'admin';
  const currentUser = isDisplayingAdminView ? null : loggedInUser;

  const handleSetCurrentView = (view: View) => {
    setCurrentView(view);
  };

  const handleAddClick = () => {
    if (timeTrackingMethod === 'manual') {
      setIsAbsenceRequestModalOpen(true);
    } else {
      setIsActionSheetOpen(true);
    }
  };

  const handleLogin = useCallback((username: string, password: string): string | null => {
    if (!password) return 'Bitte geben Sie ein Passwort ein.';
    const user = employees.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (!user) return 'Benutzer nicht gefunden.';
    if (user.password !== password) return 'Falsches Passwort.';

    // CLOSE KEYBOARD
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setLoggedInUser(user);
    return null;
  }, [employees, setLoggedInUser]);

  const handleRegister = useCallback((
    employeeData: Omit<Employee, 'id' | 'lastModified' | 'contractHistory' | 'role' | 'isActive'>,
    companyData: Omit<CompanySettings, 'adminTimeFormat' | 'employeeTimeFormat'>
  ) => {
    // CLOSE KEYBOARD
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const newAdmin: Employee = {
      ...employeeData,
      id: 0,
      isActive: true,
      lastModified: new Date().toISOString(),
      role: 'admin',
      contractHistory: [{
        validFrom: employeeData.firstWorkDay,
        employmentType: EmploymentType.FullTime,
        monthlyTargetHours: 160,
        dailyTargetHours: 8,
        vacationDays: 30,
        street: '', houseNumber: '', postalCode: '', city: ''
      }]
    };
    setEmployees([newAdmin]);
    setCompanySettings({
      ...companyData,
      adminTimeFormat: 'hoursMinutes',
      employeeTimeFormat: 'hoursMinutes',
      shiftPlannerStartHour: 0,
      shiftPlannerEndHour: 24,
    });
    setLoggedInUser(newAdmin);
  }, [setEmployees, setCompanySettings, setLoggedInUser]);

  const handleLogout = () => {
    if (isRunning) {
      resetStopwatch();
    }
    setLoggedInUser(null);
    setCurrentView(View.Dashboard);
    setAdminViewMode('admin');
  };

  const addEmployee = useCallback((employee: Omit<Employee, 'id'>) => {
    setEmployees(prev => [...prev, { ...employee, id: Date.now() }]);
  }, [setEmployees]);

  const updateEmployee = useCallback((updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    if (loggedInUser && loggedInUser.id === updatedEmployee.id) {
      setLoggedInUser(updatedEmployee);
    }
  }, [loggedInUser, setEmployees, setLoggedInUser]);

  const deleteEmployee = useCallback((id: number) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  }, [setEmployees]);

  const addCustomer = useCallback((customer: Omit<Customer, 'id'>) => {
    setCustomers(prev => [...prev, { ...customer, id: `c${Date.now()}` }]);
  }, [setCustomers]);

  const updateCustomer = useCallback((updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  }, [setCustomers]);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, [setCustomers]);

  const addActivity = useCallback((activity: Omit<Activity, 'id'>) => {
    setActivities(prev => [...prev, { ...activity, id: `a${Date.now()}` }]);
  }, [setActivities]);

  const updateActivity = useCallback((updatedActivity: Activity) => {
    setActivities(prev => prev.map(a => a.id === updatedActivity.id ? updatedActivity : a));
  }, [setActivities]);

  const deleteActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  }, [setActivities]);

  useEffect(() => {
    // ... (Carryover logic remains same)
    const calculateAndSetCarryoverForAll = () => {
      const currentYear = MOCK_CURRENT_YEAR;
      const previousYear = currentYear - 1;
      const holidaysForPreviousYear = holidaysByYear[previousYear] || [];
      if (holidaysForPreviousYear.length === 0) return;

      const updatedEmployeesMap = new Map<number, Employee>();

      for (const employee of employees) {
        if (employee.vacationCarryover?.[previousYear] !== undefined) continue;
        const firstWorkYear = new Date(employee.firstWorkDay).getFullYear();
        if (firstWorkYear > previousYear) continue;

        const dateInPreviousYear = new Date(previousYear, 11, 31);
        const contractDetailsForPreviousYear = getContractDetailsForDate(employee, dateInPreviousYear);

        const vacationTakenPreviousYear = calculateAnnualVacationTaken(employee.id, absenceRequests, previousYear, holidaysForPreviousYear);
        const remainingVacation = contractDetailsForPreviousYear.vacationDays - vacationTakenPreviousYear;

        if (remainingVacation >= 0) {
          updatedEmployeesMap.set(employee.id, {
            ...employee,
            vacationCarryover: { ...employee.vacationCarryover, [previousYear]: remainingVacation },
            lastModified: new Date().toISOString()
          });
        }
      }

      if (updatedEmployeesMap.size > 0) {
        setEmployees(prev => prev.map(emp => updatedEmployeesMap.get(emp.id) || emp));
      }
    };

    if (employees.length > 0 && holidaysByYear[MOCK_CURRENT_YEAR - 1]) {
      calculateAndSetCarryoverForAll();
    }
  }, [employees, absenceRequests, holidaysByYear]);

  const vacationInfo = useMemo(() => {
    // ... (Vacation info logic remains same)
    if (!currentUser) return { vacationDaysLeft: 0, annualEntitlement: 0, carryover: 0 };

    const currentYear = MOCK_CURRENT_YEAR;
    const previousYear = currentYear - 1;
    const holidaysForCurrentYear = holidaysByYear[currentYear] || [];

    const dateInCurrentYear = new Date(currentYear, 6, 1);
    const contract = getContractDetailsForDate(currentUser, dateInCurrentYear);
    const annualEntitlement = contract.vacationDays;

    const carryover = currentUser.vacationCarryover?.[previousYear] || 0;

    const totalAvailableDays = annualEntitlement + carryover;
    const vacationTakenThisYear = calculateAnnualVacationTaken(currentUser.id, absenceRequests, currentYear, holidaysForCurrentYear);

    const vacationDaysLeft = totalAvailableDays - vacationTakenThisYear;

    return { vacationDaysLeft, annualEntitlement, carryover };
  }, [currentUser, absenceRequests, holidaysByYear]);

  const timeBalanceHours = useMemo(() => {
    if (!currentUser) return 0;

    const now = new Date();
    const calculationEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    calculationEndDate.setHours(23, 59, 59, 999);

    return calculateBalance(
      currentUser,
      calculationEndDate,
      timeEntries,
      absenceRequests,
      timeBalanceAdjustments,
      holidaysByYear
    );
  }, [currentUser, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear]);


  const currentMonthWorkedHours = useMemo(() => {
    if (!currentUser) return 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const breakdown = calculateMonthlyBreakdown(
      currentUser,
      currentYear,
      currentMonth,
      timeEntries,
      absenceRequests,
      timeBalanceAdjustments,
      holidaysByYear
    );

    return breakdown.totalCredited;
  }, [currentUser, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear]);

  const renderEmployeeView = () => {
    if (!currentUser) return null;
    const userTimeEntries = timeEntries.filter(entry => entry.employeeId === currentUser.id);
    const holidaysForCurrentYear = holidaysByYear[MOCK_CURRENT_YEAR] || [];

    // Check if user is late for a shift
    const shiftsForUser = shifts.filter(s => s.employeeId === currentUser.id);

    const dashboardProps = {
      currentUser: currentUser,
      addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => {
        if (currentUser) {
          addTimeEntry(entry, currentUser.id);
          setShowTimeEntrySuccess(true);
        }
      },
      timeEntries: timeEntries,
      customers: customers,
      activities: activities,
      userAccount: {
        ...userAccount,
        timeBalanceHours: timeBalanceHours,
        vacationDaysLeft: vacationInfo.vacationDaysLeft,
        vacationAnnualEntitlement: vacationInfo.annualEntitlement,
        vacationCarryover: vacationInfo.carryover,
      },
      currentMonthWorkedHours: currentMonthWorkedHours,
      timeTrackingMethod: timeTrackingMethod,
      dashboardType: currentUser.dashboardType || 'standard',
      absenceRequests: absenceRequests,
      holidays: holidaysForCurrentYear,
      selectedState: selectedState,
      companySettings: companySettings,
      mockCurrentYear: MOCK_CURRENT_YEAR,
      // Shifts data
      shifts: shiftsForUser,
      // Adjustments
      timeBalanceAdjustments: timeBalanceAdjustments.filter(adj => adj.employeeId === currentUser.id),
      // Stopwatch props
      isRunning: isRunning,
      startTime: startTime,
      stopTime: stopTime,
      elapsedTime: elapsedTime,
      stopwatchCustomerId: stopwatchCustomerId,
      stopwatchActivityId: stopwatchActivityId,
      stopwatchComment: stopwatchComment,
      isBreakModalOpen: isBreakModalOpen,
      setIsBreakModalOpen: setIsBreakModalOpen,
      setIsRunning: setIsRunning,
      setStartTime: setStartTime,
      setStopTime: setStopTime,
      setElapsedTime: setElapsedTime,
      setStopwatchCustomerId: setStopwatchCustomerId,
      setStopwatchActivityId: setStopwatchActivityId,
      setStopwatchComment: setStopwatchComment,
    };

    switch (currentView) {
      case View.Dashboard:
        return <Dashboard {...dashboardProps} />;
      case View.Calendar:
        return <CalendarView
          currentUser={currentUser}
          timeEntries={userTimeEntries}
          absenceRequests={absenceRequests.filter(r => r.employeeId === currentUser.id)}
          customers={customers}
          activities={activities}
          onUpdateTimeEntry={updateTimeEntry}
          onDeleteTimeEntry={deleteTimeEntry}
          holidaysByYear={holidaysByYear}
          companySettings={companySettings}
          onEnsureHolidaysForYear={ensureHolidaysForYear}
          onAddAbsenceClick={() => setIsAbsenceRequestModalOpen(true)}
        />;
      case View.Overview:
        return <OverviewView
          currentUser={currentUser}
          timeEntries={userTimeEntries}
          timeBalanceAdjustments={timeBalanceAdjustments.filter(adj => adj.employeeId === currentUser.id)}
          absenceRequests={absenceRequests.filter(r => r.employeeId === currentUser.id)}
          customers={customers}
          activities={activities}
          holidaysByYear={holidaysByYear}
          companySettings={companySettings}
          onEnsureHolidaysForYear={ensureHolidaysForYear}
          onRetractAbsenceRequest={deleteAbsenceRequest}
          userAccount={{ ...userAccount, timeBalanceHours, ...vacationInfo }}
          selectedState={selectedState}
        />;
      default:
        return <Dashboard {...dashboardProps} />;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-row overflow-hidden bg-gray-50 animate-fade-in">
      <div className="flex-1 flex flex-col relative h-full w-full min-w-0">
        {!loggedInUser ? (
          // ... (Login/Reg screens)
          <div className="h-[100dvh] w-full overflow-y-auto bg-gray-100">
            {authView === 'login' && employees.some(e => e.role === 'admin') ? (
              <LoginScreen onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} employees={employees} />
            ) : (
              <RegistrationScreen onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex-none bg-white shadow-md z-30 relative">
              <div className={`${isDisplayingAdminView ? 'max-w-8xl' : 'max-w-7xl'} mx-auto px-4 py-4 flex justify-between items-center`}>
                <h1 className="text-2xl font-bold text-gray-900 truncate pr-2 font-display tracking-tight">
                  {isDisplayingAdminView ? 'Admin-Dashboard' : `Hallo, ${loggedInUser.firstName}`}
                </h1>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  {isDisplayingAdminView && (
                    <>
                      {/* Consolidated Mobile Settings Button */}
                      <button
                        onClick={() => setAdminActiveView(AdminViewType.Settings)}
                        className="md:hidden flex items-center gap-2 p-2 rounded-lg transition-colors text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                        title="Einstellungen"
                      >
                        <CogIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {isUserAdmin && (
                    <button
                      onClick={() => setAdminViewMode(adminViewMode === 'admin' ? 'employee' : 'admin')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                      title={isDisplayingAdminView ? 'Zur Mitarbeiter-Ansicht wechseln' : 'Zur Admin-Ansicht wechseln'}
                    >
                      <SwitchHorizontalIcon className="h-5 w-5" />
                      <span className="hidden sm:inline">{isDisplayingAdminView ? 'Mitarbeiter' : 'Admin'}</span>
                    </button>
                  )}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => i18n.changeLanguage('de')}
                      className={`px-2 py-1 text-xs font-bold rounded ${i18n.language === 'de' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      DE
                    </button>
                    <button
                      onClick={() => i18n.changeLanguage('en')}
                      className={`px-2 py-1 text-xs font-bold rounded ${i18n.language === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      EN
                    </button>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200">
                    <LogoutIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">{t('common.logout', 'Abmelden')}</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Main Scrollable Area */}
            <main
              ref={mainScrollRef}
              className={`flex-1 overflow-y-auto overflow-x-hidden scroll-container w-full ${isDisplayingAdminView ? '' : 'max-w-7xl mx-auto'} p-4 ${!isDisplayingAdminView ? 'pb-24' : ''} isolate`}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {isDisplayingAdminView ? (
                <AdminView
                  loggedInUser={loggedInUser}
                  activeView={adminActiveView}
                  setActiveView={setAdminActiveView}
                  absenceRequests={absenceRequests}
                  onUpdateRequestStatus={updateAbsenceRequestStatus}
                  onUpdateAbsenceRequest={updateAbsenceRequest}
                  onDeleteAbsenceRequest={deleteAbsenceRequest}
                  timeEntries={timeEntries}
                  onAddTimeEntry={addTimeEntry}
                  onUpdateTimeEntry={updateTimeEntry}
                  onDeleteTimeEntry={deleteTimeEntry}
                  employees={employees}
                  onAddEmployee={addEmployee}
                  onUpdateEmployee={updateEmployee}
                  onDeleteEmployee={deleteEmployee}
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onUpdateCustomer={updateCustomer}
                  onDeleteCustomer={deleteCustomer}
                  activities={activities}
                  onAddActivity={addActivity}
                  onUpdateActivity={updateActivity}
                  onDeleteActivity={deleteActivity}
                  selectedState={selectedState}
                  onStateChange={(state) => setSelectedState(state as GermanState)}
                  timeTrackingMethod={timeTrackingMethod}
                  onTimeTrackingMethodChange={(method) => setTimeTrackingMethod(method)}
                  holidaysByYear={holidaysByYear}
                  onEnsureHolidaysForYear={ensureHolidaysForYear}
                  addAbsenceRequest={addAbsenceRequest}
                  companySettings={companySettings}
                  onUpdateCompanySettings={setCompanySettings}
                  timeBalanceAdjustments={timeBalanceAdjustments}
                  addTimeBalanceAdjustment={addTimeBalanceAdjustment}
                  onUpdateTimeBalanceAdjustment={updateTimeBalanceAdjustment}
                  onDeleteTimeBalanceAdjustment={deleteTimeBalanceAdjustment}
                  // Shifts
                  shifts={shifts}
                  addShift={addShift}
                  updateShift={updateShift}
                  deleteShift={deleteShift}
                  // Shift Templates
                  shiftTemplates={shiftTemplates}
                  addShiftTemplate={addShiftTemplate}
                  updateShiftTemplate={updateShiftTemplate}
                  deleteShiftTemplate={deleteShiftTemplate}
                />
              ) : (
                renderEmployeeView()
              )}
            </main>

            {/* Bottom Nav & Modals (same) */}
            {!isDisplayingAdminView && loggedInUser && (
              <BottomNav
                currentView={currentView}
                setCurrentView={handleSetCurrentView}
                onAddClick={handleAddClick}
                timeTrackingMethod={timeTrackingMethod}
              />
            )}
            {isActionSheetOpen && (
              <ActionSheet
                onClose={() => setIsActionSheetOpen(false)}
                onSelect={(action) => {
                  setIsActionSheetOpen(false);
                  if (action === 'manualTime') {
                    if (timeTrackingMethod === 'all') {
                      setIsManualEntryModalOpen(true);
                    }
                  } else if (action === 'absence') {
                    setIsAbsenceRequestModalOpen(true);
                  }
                }}
              />
            )}
            {isAbsenceRequestModalOpen && currentUser && (
              <AbsenceRequestModal
                isOpen={isAbsenceRequestModalOpen}
                onClose={() => setIsAbsenceRequestModalOpen(false)}
                onSubmit={(req) => {
                  addAbsenceRequest(req);
                  setShowAbsenceSuccess(true);
                }}
                currentUser={currentUser}
                existingAbsences={absenceRequests.filter(r => r.employeeId === currentUser.id)}
                timeEntries={timeEntries.filter(entry => entry.employeeId === currentUser.id)}
                companySettings={companySettings}
                holidaysByYear={holidaysByYear}
                onEnsureHolidaysForYear={ensureHolidaysForYear}
                vacationDaysLeft={vacationInfo.vacationDaysLeft}
                timeBalanceHours={timeBalanceHours}
              />
            )}
            {isManualEntryModalOpen && currentUser && (
              <ManualEntryFormModal
                isOpen={isManualEntryModalOpen}
                onClose={() => setIsManualEntryModalOpen(false)}
                addTimeEntry={(entry) => addTimeEntry(entry, currentUser.id)}
                onSuccess={() => setShowTimeEntrySuccess(true)}
                timeEntries={timeEntries.filter(entry => entry.employeeId === currentUser.id)}
                customers={customers}
                activities={activities}
                companySettings={companySettings}
                absenceRequests={absenceRequests.filter(r => r.employeeId === currentUser.id)}
              />
            )}
            {/* Toasts */}
            {showAbsenceSuccess && (
              <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md sm:w-auto p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-3 shadow-lg z-50 animate-toast-in">
                <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Antrag eingereicht</p>
                  <p className="text-sm">Ihr Antrag wurde erfolgreich zur Prüfung übermittelt.</p>
                </div>
              </div>
            )}
            {showTimeEntrySuccess && (
              <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md sm:w-auto p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-3 shadow-lg z-50 animate-toast-in">
                <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Arbeitszeit gespeichert</p>
                  <p className="text-sm">Der Eintrag wurde erfolgreich hinzugefügt.</p>
                </div>
              </div>
            )}
            {showNfcSuccess && (
              <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md sm:w-auto p-4 bg-blue-100 text-blue-800 rounded-lg flex items-center gap-3 shadow-lg z-50 animate-toast-in">
                <CheckCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold">NFC-Scan erfolgreich</p>
                  <p className="text-sm">{nfcSuccessMessage}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
