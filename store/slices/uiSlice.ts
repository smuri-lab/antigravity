import { StateCreator } from 'zustand';
import { View, AdminViewType } from '../../types';

export interface UISlice {
    currentView: View;
    adminViewMode: 'admin' | 'employee';
    adminActiveView: AdminViewType;
    isActionSheetOpen: boolean;
    isAbsenceRequestModalOpen: boolean;
    isManualEntryModalOpen: boolean;
    showAbsenceSuccess: boolean;
    showTimeEntrySuccess: boolean;
    showNfcSuccess: boolean;
    nfcSuccessMessage: string;

    // Actions
    setCurrentView: (view: View) => void;
    setAdminViewMode: (mode: 'admin' | 'employee') => void;
    setAdminActiveView: (view: AdminViewType) => void;
    setIsActionSheetOpen: (isOpen: boolean) => void;
    setIsAbsenceRequestModalOpen: (isOpen: boolean) => void;
    setIsManualEntryModalOpen: (isOpen: boolean) => void;
    setShowAbsenceSuccess: (show: boolean) => void;
    setShowTimeEntrySuccess: (show: boolean) => void;
    setShowNfcSuccess: (show: boolean) => void;
    setNfcSuccessMessage: (message: string) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    currentView: View.Dashboard,
    adminViewMode: 'admin',
    adminActiveView: AdminViewType.Planner,
    isActionSheetOpen: false,
    isAbsenceRequestModalOpen: false,
    isManualEntryModalOpen: false,
    showAbsenceSuccess: false,
    showTimeEntrySuccess: false,
    showNfcSuccess: false,
    nfcSuccessMessage: '',

    setCurrentView: (view) => set({ currentView: view }),
    setAdminViewMode: (mode) => set({ adminViewMode: mode }),
    setAdminActiveView: (view) => set({ adminActiveView: view }),
    setIsActionSheetOpen: (isOpen) => set({ isActionSheetOpen: isOpen }),
    setIsAbsenceRequestModalOpen: (isOpen) => set({ isAbsenceRequestModalOpen: isOpen }),
    setIsManualEntryModalOpen: (isOpen) => set({ isManualEntryModalOpen: isOpen }),
    setShowAbsenceSuccess: (show) => set({ showAbsenceSuccess: show }),
    setShowTimeEntrySuccess: (show) => set({ showTimeEntrySuccess: show }),
    setShowNfcSuccess: (show) => set({ showNfcSuccess: show }),
    setNfcSuccessMessage: (message) => set({ nfcSuccessMessage: message }),
});
