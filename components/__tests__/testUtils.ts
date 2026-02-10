import { Employee, EmploymentType, TargetHoursModel, ContractDetails, TimeEntry, AbsenceRequest, AbsenceType, Activity, Customer, CompanySettings } from '../../types';

export const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: 1,
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com',
    dateOfBirth: '1990-01-01',
    username: 'max.mustermann',
    isActive: true,
    lastModified: new Date().toISOString(),
    role: 'employee',
    firstWorkDay: '2024-01-01',
    automaticBreakDeduction: true,
    startingTimeBalanceHours: 0,
    contractHistory: [
        {
            validFrom: '2024-01-01',
            employmentType: EmploymentType.FullTime,
            targetHoursModel: TargetHoursModel.Monthly,
            monthlyTargetHours: 160,
            dailyTargetHours: 8,
            vacationDays: 30,
            street: 'Musterstr. 1',
            houseNumber: '1',
            postalCode: '12345',
            city: 'Musterstadt'
        }
    ],
    ...overrides
});

export const createMockTimeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
    id: 1,
    employeeId: 1,
    start: '2024-01-01T08:00:00',
    end: '2024-01-01T17:00:00',
    breakDurationMinutes: 60,
    customerId: '1',
    activityId: '1',
    type: 'manual',
    ...overrides
});

export const createMockAbsenceRequest = (overrides: Partial<AbsenceRequest> = {}): AbsenceRequest => ({
    id: 1,
    employeeId: 1,
    type: AbsenceType.Vacation,
    startDate: '2024-01-10',
    endDate: '2024-01-10',
    status: 'approved',
    dayPortion: 'full',
    ...overrides
});

export const createMockCompanySettings = (): CompanySettings => ({
    companyName: 'Musterfirma',
    street: 'Musterstr.',
    houseNumber: '10',
    postalCode: '12345',
    city: 'Musterstadt',
    email: 'info@musterfirma.de'
});
