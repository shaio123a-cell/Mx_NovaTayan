import { createContext, useContext, useState, ReactNode } from 'react';

interface DirtyStateContextType {
    isDirty: boolean;
    setIsDirty: (val: boolean) => void;
    pendingAction: (() => void) | null;
    setPendingAction: (action: (() => void) | null) => void;
    showDirtyModal: boolean;
    setShowDirtyModal: (val: boolean) => void;
}

const DirtyStateContext = createContext<DirtyStateContextType | undefined>(undefined);

export function DirtyStateProvider({ children }: { children: ReactNode }) {
    const [isDirty, setIsDirty] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [showDirtyModal, setShowDirtyModal] = useState(false);

    return (
        <DirtyStateContext.Provider value={{ 
            isDirty, 
            setIsDirty, 
            pendingAction, 
            setPendingAction, 
            showDirtyModal, 
            setShowDirtyModal 
        }}>
            {children}
        </DirtyStateContext.Provider>
    );
}

export function useDirtyState() {
    const context = useContext(DirtyStateContext);
    if (!context) {
        throw new Error('useDirtyState must be used within a DirtyStateProvider');
    }
    return context;
}
