import { StateCreator } from 'zustand';
import { TimeEntry, AbsenceRequest, Shift, Employee, Customer, Activity, CompanySettings, ShiftTemplate, TimeBalanceAdjustment, HolidaysByYear, AbsenceType, RotationTemplate, EmployeeGroup, Task } from '../../types';
import { INITIAL_CUSTOMERS, INITIAL_ACTIVITIES, INITIAL_EMPLOYEES, INITIAL_SHIFT_TEMPLATES, INITIAL_USER_ACCOUNT, GermanState } from '../../constants';
import { applyAutomaticBreaks } from '../../components/utils/calculations';

export interface DataSlice {
    timeEntries: TimeEntry[];
    absenceRequests: AbsenceRequest[];
    shifts: Shift[];
    employees: Employee[];
    customers: Customer[];
    activities: Activity[];
    companySettings: CompanySettings;
    shiftTemplates: ShiftTemplate[];
    timeBalanceAdjustments: TimeBalanceAdjustment[];
    holidaysByYear: HolidaysByYear;
    selectedState: GermanState;
    rotationPatterns: RotationTemplate[];
    employeeGroups: EmployeeGroup[];
    tasks: Task[];

    // Actions
    setTimeEntries: (entries: TimeEntry[] | ((prev: TimeEntry[]) => TimeEntry[])) => void;
    setAbsenceRequests: (requests: AbsenceRequest[] | ((prev: AbsenceRequest[]) => AbsenceRequest[])) => void;
    setShifts: (shifts: Shift[] | ((prev: Shift[]) => Shift[])) => void;
    setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
    setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
    setActivities: (activities: Activity[] | ((prev: Activity[]) => Activity[])) => void;
    setCompanySettings: (settings: CompanySettings | ((prev: CompanySettings) => CompanySettings)) => void;
    setShiftTemplates: (templates: ShiftTemplate[] | ((prev: ShiftTemplate[]) => ShiftTemplate[])) => void;
    setTimeBalanceAdjustments: (adjustments: TimeBalanceAdjustment[] | ((prev: TimeBalanceAdjustment[]) => TimeBalanceAdjustment[])) => void;
    setHolidaysByYear: (holidays: HolidaysByYear | ((prev: HolidaysByYear) => HolidaysByYear)) => void;
    setSelectedState: (state: GermanState) => void;
    setRotationPatterns: (patterns: RotationTemplate[] | ((prev: RotationTemplate[]) => RotationTemplate[])) => void;
    setEmployeeGroups: (groups: EmployeeGroup[] | ((prev: EmployeeGroup[]) => EmployeeGroup[])) => void;

    // Task Actions
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
    updateTask: (updatedTask: Task) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string, employeeId: number) => void;
    reopenTask: (id: string) => void;

    // Advanced Actions
    addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>, employeeId: number) => void;
    updateTimeEntry: (updatedEntry: TimeEntry) => void;
    deleteTimeEntry: (id: number) => void;
    addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>, status?: AbsenceRequest['status']) => void;
    updateAbsenceRequest: (updatedRequest: AbsenceRequest) => void;
    deleteAbsenceRequest: (id: number) => void;
    updateAbsenceRequestStatus: (id: number, status: 'approved' | 'rejected', comment?: string) => void;
    addTimeBalanceAdjustment: (adjustment: Omit<TimeBalanceAdjustment, 'id'>) => void;
    updateTimeBalanceAdjustment: (updatedAdjustment: TimeBalanceAdjustment) => void;
    deleteTimeBalanceAdjustment: (id: number) => void;
    addShift: (shift: Omit<Shift, 'id'>) => void;
    updateShift: (updatedShift: Shift) => void;
    deleteShift: (id: string) => void;
    addShiftTemplate: (template: Omit<ShiftTemplate, 'id'>) => void;
    updateShiftTemplate: (updatedTemplate: ShiftTemplate) => void;
    deleteShiftTemplate: (id: string) => void;
    deleteShiftsByEmployee: (employeeId: number) => void;
    addRotationPattern: (pattern: Omit<RotationTemplate, 'id' | 'createdAt'>) => void;
    updateRotationPattern: (updatedPattern: RotationTemplate) => void;
    deleteRotationPattern: (id: string) => void;
    addEmployeeGroup: (group: Omit<EmployeeGroup, 'id' | 'createdAt'>) => void;
    updateEmployeeGroup: (updatedGroup: EmployeeGroup) => void;
    deleteEmployeeGroup: (id: string) => void;
}

export const createDataSlice: StateCreator<DataSlice> = (set) => ({
    timeEntries: [],
    absenceRequests: [],
    shifts: [],
    employees: INITIAL_EMPLOYEES,
    customers: INITIAL_CUSTOMERS,
    activities: INITIAL_ACTIVITIES,
    companySettings: {
        companyName: 'Musterfirma GmbH',
        street: 'Hauptstraße',
        houseNumber: '1',
        postalCode: '10115',
        city: 'Berlin',
        email: 'admin@musterfirma.de',
        editLockRule: 'currentMonth',
        employeeCanExport: true,
        allowHalfDayVacations: true,
        customerLabel: 'Zeitkategorie 1',
        activityLabel: 'Zeitkategorie 2',
        adminTimeFormat: 'hoursMinutes',
        employeeTimeFormat: 'hoursMinutes',
        shiftPlannerStartHour: 0,
        shiftPlannerEndHour: 24,
    },
    shiftTemplates: INITIAL_SHIFT_TEMPLATES,
    timeBalanceAdjustments: [],
    holidaysByYear: {},
    selectedState: 'BW',
    rotationPatterns: [],
    employeeGroups: [],
    tasks: [],

    setTimeEntries: (entries) => set((state) => ({
        timeEntries: typeof entries === 'function' ? entries(state.timeEntries) : entries
    })),
    setAbsenceRequests: (requests) => set((state) => ({
        absenceRequests: typeof requests === 'function' ? requests(state.absenceRequests) : requests
    })),
    setShifts: (shifts) => set((state) => ({
        shifts: typeof shifts === 'function' ? shifts(state.shifts) : shifts
    })),
    setEmployees: (employees) => set((state) => ({
        employees: typeof employees === 'function' ? employees(state.employees) : employees
    })),
    setCustomers: (customers) => set((state) => ({
        customers: typeof customers === 'function' ? customers(state.customers) : customers
    })),
    setActivities: (activities) => set((state) => ({
        activities: typeof activities === 'function' ? activities(state.activities) : activities
    })),
    setCompanySettings: (settings) => set((state) => ({
        companySettings: typeof settings === 'function' ? settings(state.companySettings) : settings
    })),
    setShiftTemplates: (templates) => set((state) => ({
        shiftTemplates: typeof templates === 'function' ? templates(state.shiftTemplates) : templates
    })),
    setTimeBalanceAdjustments: (adjustments) => set((state) => ({
        timeBalanceAdjustments: typeof adjustments === 'function' ? adjustments(state.timeBalanceAdjustments) : adjustments
    })),
    setHolidaysByYear: (holidays) => set((state) => ({
        holidaysByYear: typeof holidays === 'function' ? holidays(state.holidaysByYear) : holidays
    })),
    setSelectedState: (state) => set({ selectedState: state }),
    setRotationPatterns: (patterns) => set((state) => ({ rotationPatterns: typeof patterns === 'function' ? patterns(state.rotationPatterns) : patterns })),
    setEmployeeGroups: (groups) => set((state) => ({ employeeGroups: typeof groups === 'function' ? groups(state.employeeGroups) : groups })),

    addTimeEntry: (entry, employeeId) => set((state) => {
        const employee = state.employees.find(e => e.id === employeeId);
        const finalEntry = employee ? applyAutomaticBreaks(entry, employee) : entry;
        return {
            timeEntries: [...state.timeEntries, { ...finalEntry, id: Date.now(), employeeId }]
        };
    }),
    updateTimeEntry: (updatedEntry) => set((state) => {
        const employee = state.employees.find(e => e.id === updatedEntry.employeeId);
        const finalEntry = employee ? applyAutomaticBreaks(updatedEntry, employee) : updatedEntry;
        return {
            timeEntries: state.timeEntries.map(entry => entry.id === (finalEntry as TimeEntry).id ? (finalEntry as TimeEntry) : entry)
        };
    }),
    deleteTimeEntry: (id) => set((state) => ({
        timeEntries: state.timeEntries.filter(entry => entry.id !== id)
    })),
    addAbsenceRequest: (request, status = 'pending') => set((state) => ({
        absenceRequests: [...state.absenceRequests, { ...request, id: Date.now(), status }]
    })),
    updateAbsenceRequest: (updatedRequest) => set((state) => ({
        absenceRequests: state.absenceRequests.map(req => req.id === updatedRequest.id ? updatedRequest : req)
    })),
    deleteAbsenceRequest: (id) => set((state) => ({
        absenceRequests: state.absenceRequests.filter(req => req.id !== id)
    })),
    updateAbsenceRequestStatus: (id, status, comment) => set((state) => ({
        absenceRequests: state.absenceRequests.map(req => req.id === id ? { ...req, status, adminComment: comment } : req)
    })),
    addTimeBalanceAdjustment: (adjustment) => set((state) => ({
        timeBalanceAdjustments: [...state.timeBalanceAdjustments, { ...adjustment, id: Date.now() }]
    })),
    updateTimeBalanceAdjustment: (updatedAdjustment) => set((state) => ({
        timeBalanceAdjustments: state.timeBalanceAdjustments.map(adj => adj.id === updatedAdjustment.id ? updatedAdjustment : adj)
    })),
    deleteTimeBalanceAdjustment: (id) => set((state) => ({
        timeBalanceAdjustments: state.timeBalanceAdjustments.filter(adj => adj.id !== id)
    })),
    addShift: (shift) => set((state) => ({
        shifts: [...state.shifts, { ...shift, id: `shift-${Date.now()}` }]
    })),
    updateShift: (updatedShift) => set((state) => ({
        shifts: state.shifts.map(s => s.id === updatedShift.id ? updatedShift : s)
    })),
    deleteShift: (id) => set((state) => ({
        shifts: state.shifts.filter(s => s.id !== id)
    })),
    addShiftTemplate: (template) => set((state) => ({
        shiftTemplates: [...state.shiftTemplates, { ...template, id: `template-${Date.now()}` }]
    })),
    updateShiftTemplate: (updatedTemplate) => set((state) => ({
        shiftTemplates: state.shiftTemplates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t),
        shifts: state.shifts.map(s => s.templateId === updatedTemplate.id ? {
            ...s,
            label: updatedTemplate.label || updatedTemplate.name,
            color: updatedTemplate.color
        } : s)
    })),
    deleteShiftTemplate: (id) => set((state) => ({
        shiftTemplates: state.shiftTemplates.filter(t => t.id !== id),
        shifts: state.shifts.map(s => s.templateId === id ? { ...s, templateId: undefined } : s)
    })),
    deleteShiftsByEmployee: (employeeId) => set((state) => {
        console.log('Store: deleteShiftsByEmployee called with ID:', employeeId);
        console.log('Store: Current shifts count:', state.shifts.length);
        const newShifts = state.shifts.filter(s => Number(s.employeeId) != Number(employeeId));
        console.log('Store: New shifts count after filter:', newShifts.length);
        console.log('Store: Shifts removed:', state.shifts.length - newShifts.length);
        return { shifts: newShifts };
    }),

    // Rotation Pattern CRUD
    addRotationPattern: (pattern) => set((state) => ({
        rotationPatterns: [...state.rotationPatterns, {
            ...pattern,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        }]
    })),
    updateRotationPattern: (updatedPattern) => set((state) => ({
        rotationPatterns: state.rotationPatterns.map(p => p.id === updatedPattern.id ? updatedPattern : p)
    })),
    deleteRotationPattern: (id) => set((state) => ({
        rotationPatterns: state.rotationPatterns.filter(p => p.id !== id)
    })),

    // Employee Group CRUD
    addEmployeeGroup: (group) => set((state) => ({
        employeeGroups: [...state.employeeGroups, {
            ...group,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        }]
    })),
    updateEmployeeGroup: (updatedGroup) => set((state) => ({
        employeeGroups: state.employeeGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g)
    })),
    deleteEmployeeGroup: (id) => set((state) => ({
        employeeGroups: state.employeeGroups.filter(g => g.id !== id)
    })),

    // Task CRUD
    addTask: (task) => set((state) => ({
        tasks: [...state.tasks, {
            ...task,
            id: crypto.randomUUID(),
            status: 'open',
            createdAt: new Date().toISOString(),
        }]
    })),
    updateTask: (updatedTask) => set((state) => ({
        tasks: state.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    })),
    deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
    })),
    completeTask: (id, employeeId) => set((state) => {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return {};

        const completedTask = {
            ...task,
            status: 'done' as const,
            completedAt: new Date().toISOString(),
            completedBy: employeeId,
        };

        let newTasks = state.tasks.map(t => t.id === id ? completedTask : t);

        // Auto-generate next occurrence for recurring tasks
        if (task.recurrence) {
            const { frequency, endDate } = task.recurrence;
            const currentDue = new Date(task.dueDate + 'T12:00:00');

            // Calculate next due date
            const nextDue = new Date(currentDue);
            if (frequency === 'daily') nextDue.setDate(nextDue.getDate() + 1);
            else if (frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
            else if (frequency === 'biweekly') nextDue.setDate(nextDue.getDate() + 14);
            else if (frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);

            const nextDueDateStr = nextDue.toLocaleDateString('sv-SE');

            // Only create next task if it doesn't exceed endDate
            if (!endDate || nextDueDateStr <= endDate) {
                const nextTask: Task = {
                    ...task,
                    id: crypto.randomUUID(),
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    dueDate: nextDueDateStr,
                    completedAt: undefined,
                    completedBy: undefined,
                };
                newTasks = [...newTasks, nextTask];
            }
        }

        return { tasks: newTasks };
    }),
    reopenTask: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? {
            ...t,
            status: 'open',
            completedAt: undefined,
            completedBy: undefined,
        } : t)
    })),
});
