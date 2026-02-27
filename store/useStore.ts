import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { DataSlice, createDataSlice } from './slices/dataSlice';
import { UISlice, createUISlice } from './slices/uiSlice';
import { StopwatchSlice, createStopwatchSlice } from './slices/stopwatchSlice';

export type StoreState = AuthSlice & DataSlice & UISlice & StopwatchSlice;

export const useStore = create<StoreState>()(
    persist(
        (...a) => ({
            ...createAuthSlice(...a),
            ...createDataSlice(...a),
            ...createUISlice(...a),
            ...createStopwatchSlice(...a),
        }),
        {
            name: 'timepro-storage',
            storage: createJSONStorage(() => localStorage),
            // Only persist specific slices if needed, or everything by default
            partialize: (state) => ({
                // Auth
                loggedInUser: state.loggedInUser,
                // Data
                timeEntries: state.timeEntries,
                absenceRequests: state.absenceRequests,
                shifts: state.shifts,
                employees: state.employees,
                customers: state.customers,
                activities: state.activities,
                companySettings: state.companySettings,
                shiftTemplates: state.shiftTemplates,
                timeBalanceAdjustments: state.timeBalanceAdjustments,
                selectedState: state.selectedState,
                rotationPatterns: state.rotationPatterns,
                employeeGroups: state.employeeGroups,
                tasks: state.tasks,
                // Stopwatch
                isRunning: state.isRunning,
                startTime: state.startTime,
                stopTime: state.stopTime,
                elapsedTime: state.elapsedTime,
                stopwatchCustomerId: state.stopwatchCustomerId,
                stopwatchActivityId: state.stopwatchActivityId,
                stopwatchComment: state.stopwatchComment,
            }),
        }
    )
);
