import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, Folder, Search, X } from 'lucide-react';

interface FolderNode {
    id: string;
    name: string;
    children?: FolderNode[];
}

interface TreeFolderPickerProps {
    value?: string;
    onChange: (id: string | undefined) => void;
    folderTree: FolderNode[];
    placeholder?: string;
    type?: 'task' | 'workflow';
}

export function TreeFolderPicker({ value, onChange, folderTree = [], placeholder = "Select Folder", type = 'task' }: TreeFolderPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [menuStyles, setMenuStyles] = useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed' });

    // Find the current folder name for display
    const selectedFolder = useMemo(() => {
        if (!value || !folderTree || !Array.isArray(folderTree)) return null;
        const findNode = (nodes: FolderNode[]): FolderNode | null => {
            for (const node of nodes) {
                if (node.id === value) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNode(folderTree);
    }, [value, folderTree]);

    const toggleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isOpen) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const openUp = spaceBelow < 350 && rect.top > 350;

                setMenuStyles({
                    position: 'fixed',
                    top: openUp ? 'auto' : `${rect.bottom + 4}px`,
                    bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : 'auto',
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    zIndex: 9999999,
                    visibility: 'visible',
                    display: 'flex',
                    flexDirection: 'column'
                });
            }
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e: MouseEvent) => {
            const portalNode = document.getElementById('tree-picker-portal-content');
            const isInsidePicker = containerRef.current?.contains(e.target as Node);
            const isInsidePortal = portalNode?.contains(e.target as Node);

            if (!isInsidePicker && !isInsidePortal) {
                setIsOpen(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        const handleScroll = (e: Event) => {
            const portalNode = document.getElementById('tree-picker-portal-content');
            if (portalNode?.contains(e.target as Node)) return;
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleSelect = (id: string | undefined) => {
        onChange(id);
        setIsOpen(false);
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const renderNode = (node: FolderNode, depth = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedIds.includes(node.id);
        const isActive = value === node.id;

        return (
            <div key={node.id} className="flex flex-col">
                <div 
                    onClick={() => handleSelect(node.id)}
                    className={`flex items-center gap-2 py-2 px-3 cursor-pointer rounded-lg transition-all mb-0.5 ${
                        isActive ? 'bg-[#1976D2] text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    style={{ marginLeft: `${depth * 16}px` }}
                >
                    <div 
                        onClick={(e) => hasChildren ? toggleExpand(node.id, e) : null}
                        className={`p-1 rounded hover:bg-black/5 ${!hasChildren ? 'opacity-0' : ''}`}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    <Folder size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span className="text-[12px] font-bold truncate flex-1">{node.name}</span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="flex flex-col">
                        {node.children!.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const portalContent = (
        <div 
            id="tree-picker-portal-content"
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden" 
            style={{ ...menuStyles, maxHeight: '350px' }}
        >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search folders..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                <div 
                    onClick={() => handleSelect(undefined)}
                    className={`flex items-center gap-3 py-2 px-3 cursor-pointer rounded-lg mb-1 transition-all ${
                        !value ? 'bg-slate-100 text-[#1976D2]' : 'hover:bg-slate-50 text-slate-500 font-bold'
                    }`}
                >
                    <div className="w-6 h-6 rounded bg-white border border-slate-100 flex items-center justify-center">
                        <Search size={12} className="text-slate-400" />
                    </div>
                    <span className="text-[12px] font-bold">Root / Unsorted</span>
                </div>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                {folderTree && Array.isArray(folderTree) && folderTree.map(node => renderNode(node))}
                {(!folderTree || folderTree.length === 0) && (
                    <div className="py-8 text-center text-slate-400 text-xs italic">No folders available</div>
                )}
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 font-black uppercase flex justify-between">
                <span>{type} library</span>
                <span>{folderTree?.length || 0} folders</span>
            </div>
        </div>
    );

    return (
        <div ref={containerRef} className="w-full">
            <div 
                onClick={toggleOpen}
                className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 bg-white cursor-pointer hover:border-[#1976D2] transition-all group shadow-sm min-h-[48px]"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Folder size={16} className={selectedFolder ? "text-[#1976D2]" : "text-slate-400"} />
                    <span className={`text-sm font-bold truncate ${selectedFolder ? 'text-slate-900' : 'text-slate-400'}`}>
                        {selectedFolder ? selectedFolder.name : placeholder}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {value && (
                        <X 
                            size={14} 
                            className="text-slate-300 hover:text-red-500" 
                            onClick={(e) => { e.stopPropagation(); handleSelect(undefined); }} 
                        />
                    )}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && createPortal(portalContent, document.body)}
        </div>
    );
}
