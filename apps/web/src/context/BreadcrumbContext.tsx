import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BreadcrumbSegment {
    label: string;
    path?: string;
}

interface BreadcrumbContextType {
    extraSegments: BreadcrumbSegment[];
    setExtraSegments: (segments: BreadcrumbSegment[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [extraSegments, setExtraSegments] = useState<BreadcrumbSegment[]>([]);
    
    return (
        <BreadcrumbContext.Provider value={{ extraSegments, setExtraSegments }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumbs() {
    const context = useContext(BreadcrumbContext);
    if (context === undefined) {
        throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
    }
    return context;
}
