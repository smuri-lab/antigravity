import { StateCreator } from 'zustand';
import { Employee } from '../../types';

export interface AuthSlice {
    loggedInUser: Employee | null;
    authView: 'login' | 'register';
    setLoggedInUser: (user: Employee | null) => void;
    setAuthView: (view: 'login' | 'register') => void;
    logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    loggedInUser: null,
    authView: 'login',
    setLoggedInUser: (user) => set({ loggedInUser: user }),
    setAuthView: (view) => set({ authView: view }),
    logout: () => set({
        loggedInUser: null,
        authView: 'login'
    }),
});
