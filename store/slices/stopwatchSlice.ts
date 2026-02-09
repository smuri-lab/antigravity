import { StateCreator } from 'zustand';

export interface StopwatchSlice {
    isRunning: boolean;
    startTime: Date | null;
    stopTime: Date | null;
    elapsedTime: number;
    stopwatchCustomerId: string;
    stopwatchActivityId: string;
    stopwatchComment: string;
    isBreakModalOpen: boolean;

    // Actions
    setIsRunning: (isRunning: boolean) => void;
    setStartTime: (time: Date | null) => void;
    setStopTime: (time: Date | null) => void;
    setElapsedTime: (time: number) => void;
    setStopwatchCustomerId: (id: string) => void;
    setStopwatchActivityId: (id: string) => void;
    setStopwatchComment: (comment: string) => void;
    setIsBreakModalOpen: (isOpen: boolean) => void;
    resetStopwatch: () => void;
}

export const createStopwatchSlice: StateCreator<StopwatchSlice> = (set) => ({
    isRunning: false,
    startTime: null,
    stopTime: null,
    elapsedTime: 0,
    stopwatchCustomerId: '',
    stopwatchActivityId: '',
    stopwatchComment: '',
    isBreakModalOpen: false,

    setIsRunning: (isRunning) => set({ isRunning }),
    setStartTime: (time) => set({ startTime: time }),
    setStopTime: (time) => set({ stopTime: time }),
    setElapsedTime: (time) => set({ elapsedTime: time }),
    setStopwatchCustomerId: (id) => set({ stopwatchCustomerId: id }),
    setStopwatchActivityId: (id) => set({ stopwatchActivityId: id }),
    setStopwatchComment: (comment) => set({ stopwatchComment: comment }),
    setIsBreakModalOpen: (isOpen) => set({ isBreakModalOpen: isOpen }),
    resetStopwatch: () => set({
        isRunning: false,
        startTime: null,
        stopTime: null,
        elapsedTime: 0,
        stopwatchComment: '',
    }),
});
