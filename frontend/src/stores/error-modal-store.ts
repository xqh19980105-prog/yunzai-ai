import { create } from 'zustand';

interface ErrorModalState {
  isKickOutModalOpen: boolean;
  isKeyBalanceModalOpen: boolean;
  isAccountLockedModalOpen: boolean;
  showDeviceWarning: boolean;
  deviceWarningCount: number;
  networkError: string | null;
  showLegalModal: boolean;
  showMembershipModal: boolean;
  openKickOutModal: () => void;
  closeKickOutModal: () => void;
  openKeyBalanceModal: () => void;
  closeKeyBalanceModal: () => void;
  openAccountLockedModal: () => void;
  closeAccountLockedModal: () => void;
  openDeviceWarning: (count: number) => void;
  closeDeviceWarning: () => void;
  setNetworkError: (error: string | null) => void;
  openLegalModal: () => void;
  closeLegalModal: () => void;
  openMembershipModal: () => void;
  closeMembershipModal: () => void;
}

export const useErrorModalStore = create<ErrorModalState>((set) => ({
  isKickOutModalOpen: false,
  isKeyBalanceModalOpen: false,
  isAccountLockedModalOpen: false,
  showDeviceWarning: false,
  deviceWarningCount: 0,
  networkError: null,
  showLegalModal: false,
  showMembershipModal: false,
  
  openKickOutModal: () => set({ isKickOutModalOpen: true }),
  closeKickOutModal: () => set({ isKickOutModalOpen: false }),
  
  openKeyBalanceModal: () => set({ isKeyBalanceModalOpen: true }),
  closeKeyBalanceModal: () => set({ isKeyBalanceModalOpen: false }),
  
  openAccountLockedModal: () => set({ isAccountLockedModalOpen: true }),
  closeAccountLockedModal: () => set({ isAccountLockedModalOpen: false }),
  
  openDeviceWarning: (count: number) => set({ showDeviceWarning: true, deviceWarningCount: count }),
  closeDeviceWarning: () => set({ showDeviceWarning: false, deviceWarningCount: 0 }),
  
  setNetworkError: (error: string | null) => set({ networkError: error }),
  
  openLegalModal: () => set({ showLegalModal: true }),
  closeLegalModal: () => set({ showLegalModal: false }),
  
  openMembershipModal: () => set({ showMembershipModal: true }),
  closeMembershipModal: () => set({ showMembershipModal: false }),
}));
