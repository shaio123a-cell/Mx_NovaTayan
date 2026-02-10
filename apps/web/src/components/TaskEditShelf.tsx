import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import React, { useState, useEffect, useRef } from 'react'
// Output processing is now per-variable; top-level preview removed.
import { VariableManager } from './VariableManager';
import { X, AlertTriangle, Zap, ShieldCheck, Lock, Unlock, Clock, FileText, List, Key, Plus, Trash2, Link2, ExternalLink, Info, Folder } from 'lucide-react'
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { useToast } from '../context/ToastContext';

interface Props {
    taskId?: string | null;
    nodeData?: any;
    availableUpstreamVars?: (string | { name: string, taskName: string, value?: any })[];
    onClose: () => void;
    onSaveNode?: (data: any) => void;
}

export function TaskEditShelf({ taskId, nodeData, availableUpstreamVars, onClose, onSaveNode }: Props) {
    const queryClient = useQueryClient()
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'details' | 'config' | 'auth' | 'output'>('details')
    // Output Processing State (now handled per-variable)
    const [outputVars, setOutputVars] = useState<Record<string, any>>({});
    const [inheritedVars, setInheritedVars] = useState<Record<string, any>>({});
    const [inheritedSanityChecks, setInheritedSanityChecks] = useState<any[]>([]);
    const [authOverride, setAuthOverride] = useState(false);
    const [libAuth, setLibAuth] = useState<any>(null);

    // Overlays state
    const [urlOverride, setUrlOverride] = useState(false);
    const [methodOverride, setMethodOverride] = useState(false);
    const [timeoutOverride, setTimeoutOverride] = useState(false);
    const [bodyOverride, setBodyOverride] = useState(false);
    const [headersOverride, setHeadersOverride] = useState(false);
    const [overlayTags, setOverlayTags] = useState<string[]>([]);
    const [kvHeaders, setKvHeaders] = useState<{ key: string, value: string }[]>([]);
    const [outputSpecYaml, setOutputSpecYaml] = useState<string>('');
    const [outputInputText, setOutputInputText] = useState<string>('');
    const [outputError, setOutputError] = useState<string | null>(null);
    const [previewResult, setPreviewResult] = useState<string | null>(null);
    const [showImpactList, setShowImpactList] = useState(false);
    const isEditing = !!taskId || !!nodeData
    const isWorkflowNode = !!nodeData
    const isUtility = nodeData?.taskType === 'VARIABLE' || taskId === '00000000-0000-0000-0000-000000000001'
    const initializedRef = React.useRef<string | null>(null);

    // Form State
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [method, setMethod] = useState('GET')
    const [url, setUrl] = useState('')
    const [headers, setHeaders] = useState<string>('{}')
    const [body, setBody] = useState<string>('')
    const [timeout, setTimeout] = useState<number>(30000)
    const [tags, setTags] = useState<string[]>([])
    const [statusMappings, setStatusMappings] = useState<any[]>([])
    const [sanityChecks, setSanityChecks] = useState<any[]>([])
    const [groupIds, setGroupIds] = useState<string[]>([])
    
    // Authorization State
    const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer' | 'jwt'>('none')
    const [basicAuthUser, setBasicAuthUser] = useState('')
    const [basicAuthPassword, setBasicAuthPassword] = useState('')
    const [bearerToken, setBearerToken] = useState('')
    const [jwtAlgorithm, setJwtAlgorithm] = useState('HS256')
    const [jwtSecret, setJwtSecret] = useState('')
    const [jwtSecretIsBase64, setJwtSecretIsBase64] = useState(false)
    const [jwtPayload, setJwtPayload] = useState('{}')
    const [jwtAddTo, setJwtAddTo] = useState<'header' | 'query'>('header')
    
    // Variable Picker State
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerCallback, setPickerCallback] = useState<((val: string) => void) | null>(null);

    const openVarPicker = (cb: (v: string) => void) => {
        setPickerCallback(() => cb);
        setPickerOpen(true);
    };

    const handleVarSelect = (val: string) => {
        if (pickerCallback) pickerCallback(val);
        setPickerOpen(false);
    };

    // Fetch existing data
    const { data: task, isLoading: isTaskLoading, isFetching: isTaskFetching } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTask(taskId!),
        enabled: !!taskId
    })

    const { data: groups } = useQuery({
        queryKey: ['task-groups'],
        queryFn: tasksApi.getGroups
    })

    const { data: impact } = useQuery({
        queryKey: ['task-impact', taskId],
        queryFn: () => tasksApi.getTaskImpact(taskId!),
        enabled: !!taskId
    })

    useEffect(() => {
        if (!task) {
            initializedRef.current = null;
            return;
        }

        // Wait for fresh data before initializing to avoid stale state
        if (isTaskFetching) return;
        
        const currentSessionId = nodeData?.id || taskId;
        if (initializedRef.current === currentSessionId) return;
        initializedRef.current = currentSessionId;

        if (task && isEditing && !isUtility) {
            setName(task.name)
            setDescription(task.description || '')
            const cmd = (task as any).command || {}
            setUrl(cmd.url || '')
            setMethod(cmd.method || 'GET')
            
            // Initial Headers (KV)
            const rawHeaders = cmd.headers || {};
            setHeaders(JSON.stringify(rawHeaders, null, 2));
            setKvHeaders(Object.entries(rawHeaders).map(([k, v]) => ({ key: k, value: String(v) })));

            setBody(cmd.body || '')
            setTimeout(cmd.timeout || 30000)
            setTags(task.tags || [])
            setStatusMappings((task as any).statusMappings || [])
            
            // Overlays initialization
            if (isWorkflowNode && nodeData) {
                if (nodeData.timeout !== undefined) {
                    setTimeout(nodeData.timeout);
                    setTimeoutOverride(true);
                } else {
                    setTimeoutOverride(false);
                }

                if (nodeData.body !== undefined) {
                    setBody(nodeData.body);
                    setBodyOverride(true);
                } else {
                    setBodyOverride(false);
                }

                if (nodeData.headers !== undefined) {
                    const nodeRawHeaders = nodeData.headers || {};
                    setKvHeaders(Object.entries(nodeRawHeaders).map(([k, v]) => ({ key: k, value: String(v) })));
                    setHeadersOverride(true);
                } else {
                    setHeadersOverride(false);
                }

                if (nodeData.url !== undefined) {
                    setUrl(nodeData.url);
                    setUrlOverride(true);
                } else {
                    setUrlOverride(false);
                }

                if (nodeData.method !== undefined) {
                    setMethod(nodeData.method);
                    setMethodOverride(true);
                } else {
                    setMethodOverride(false);
                }

                setOverlayTags(nodeData.tags || []);
            } else {
                setTimeoutOverride(false);
                setBodyOverride(false);
                setHeadersOverride(false);
                setOverlayTags([]);
            }

            // Handle Sanity Checks
            const libChecks = (task as any).sanityChecks || [];
            if (isWorkflowNode) {
                setInheritedSanityChecks(libChecks);
                setSanityChecks(nodeData.sanityChecks || []);
            } else {
                setInheritedSanityChecks([]);
                setSanityChecks(libChecks);
            }

            setGroupIds(((task as any).groups || []).map((g: any) => g.id))
            
            // Load authorization config
            const auth = cmd.authorization || {}
            setLibAuth(auth);
            
            let targetAuth = auth;
            if (isWorkflowNode && nodeData.authorization) {
                targetAuth = nodeData.authorization;
                setAuthOverride(true);
            } else if (isWorkflowNode) {
                setAuthOverride(false);
            }

            setAuthType(targetAuth.type || 'none')
            if (targetAuth.type === 'basic') {
                setBasicAuthUser(targetAuth.username || '')
                setBasicAuthPassword(targetAuth.password || '')
            } else if (targetAuth.type === 'bearer') {
                setBearerToken(targetAuth.token || '')
            } else if (targetAuth.type === 'jwt') {
                setJwtAlgorithm(targetAuth.algorithm || 'HS256')
                setJwtSecret(targetAuth.secret || '')
                setJwtSecretIsBase64(targetAuth.secretIsBase64 || false)
                setJwtPayload(typeof targetAuth.payload === 'object' ? JSON.stringify(targetAuth.payload, null, 2) : (targetAuth.payload || '{}'))
                setJwtAddTo(targetAuth.addTo || 'header')
            }

            // Handle Variables
            const libVars = (task as any).variableExtraction?.vars || (task as any).command?.outputProcessing?.vars || {};
            if (isWorkflowNode) {
                setInheritedVars(libVars);
                setOutputVars(nodeData.variableExtraction?.vars || {});
            } else {
                setInheritedVars({});
                setOutputVars(libVars);
            }
        }
        if (nodeData && isUtility) {
            setName(nodeData.label || 'Variables Manipulation')
            const vars = nodeData.variableExtraction?.vars || {};
            setInheritedVars({});
            setInheritedSanityChecks([]);
            setOutputVars(vars);
            setActiveTab('output');
        }
    }, [task, nodeData, isEditing, isUtility, isWorkflowNode])

    const handleSave = () => {
        try {
            // Build authorization config
            let authorization: any = { type: authType };
            if (authType === 'basic') {
                authorization.username = basicAuthUser;
                authorization.password = basicAuthPassword;
            } else if (authType === 'bearer') {
                authorization.token = (bearerToken || '').trim();
            } else if (authType === 'jwt') {
                authorization.algorithm = jwtAlgorithm;
                authorization.secret = jwtSecret;
                authorization.secretIsBase64 = jwtSecretIsBase64;
                try {
                    authorization.payload = JSON.parse(jwtPayload);
                } catch {
                    authorization.payload = {};
                }
                authorization.addTo = jwtAddTo;
            }

            // Convert KV Headers back to Object
            const finalHeaders = kvHeaders.reduce((acc, curr) => {
                if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
                return acc;
            }, {} as Record<string, string>);

            if (isWorkflowNode && onSaveNode) {
                onSaveNode({
                    ...nodeData,
                    label: name,
                    variableExtraction: { vars: outputVars },
                    sanityChecks,
                    authorization: authOverride ? authorization : undefined,
                    timeout: timeoutOverride ? timeout : undefined,
                    url: urlOverride ? url : undefined,
                    method: methodOverride ? method : undefined,
                    body: bodyOverride ? body : undefined,
                    headers: headersOverride ? finalHeaders : undefined,
                    tags: overlayTags.length > 0 ? overlayTags : undefined
                });
                showToast(isUtility ? 'Variables saved successfully!' : 'Workflow node updated!', 'success');
                onClose();
                return;
            }

            const data = {
                name, description, method, url, 
                headers: finalHeaders, 
                body, timeout, tags, statusMappings, sanityChecks,
                groupIds,
                authorization,
                // Persist variable transformers only
                variableExtraction: { vars: outputVars }
            }
            if (taskId) {
                tasksApi.updateTask(taskId, data).then(() => { 
                    queryClient.invalidateQueries({ queryKey: ['tasks'] }); 
                    showToast('Task updated successfully!', 'success');
                    onClose(); 
                })
            } else {
                tasksApi.createTask(data).then(() => { 
                    queryClient.invalidateQueries({ queryKey: ['tasks'] }); 
                    showToast('Task created successfully!', 'success');
                    onClose(); 
                })
            }
        } catch (e) {
            showToast('Invalid Headers JSON - please check your syntax', 'error')
        }
    }

    if (isEditing && isTaskLoading) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999999, display: 'flex', justifyContent: 'flex-end' }}>
            {/* Backdrop */}
            <div 
                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
                onClick={onClose}
            />

            {/* Main Drawer */}
            <div 
                style={{ 
                    position: 'relative', 
                    width: '700px', 
                    height: '100%', 
                    backgroundColor: 'white', 
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slide-in-right 0.3s ease-out'
                }}
            >
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div className="flex flex-col">
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isUtility ? 'VARIABLES MANIPULATION' : (taskId ? (isWorkflowNode ? (nodeData?.label || task?.name || 'Task') : 'TASK FORM - EDIT MODE') : 'CREATE NEW TASK')}
                                {isWorkflowNode && !isUtility && (
                                    <span style={{ fontSize: '10px', background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #c7d2fe' }}>Node Instance</span>
                                )}
                                {!isWorkflowNode && impact && impact.count > 0 && (
                                    <div 
                                        onClick={() => setShowImpactList(!showImpactList)}
                                        style={{ 
                                            fontSize: '11px', 
                                            background: '#fef3c7', 
                                            color: '#92400e', 
                                            padding: '4px 10px', 
                                            borderRadius: '12px', 
                                            fontWeight: 'bold', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            cursor: 'pointer',
                                            border: '1px solid #fde68a',
                                            marginLeft: '8px'
                                        }}
                                        title="View Workflow Usage"
                                    >
                                        <Link2 size={12} />
                                        {impact.count} WORKFLOWS
                                        {showImpactList ? <X size={10} /> : <ExternalLink size={10} />}
                                    </div>
                                )}
                            </h2>
                            {isWorkflowNode && !isUtility && (
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', marginTop: '2px', paddingLeft: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    NODE OVERLAY CONFIG
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                        <X size={24} color="#999" />
                    </button>
                </div>

                {/* Warning Impact */}
                {/* Warning Impact - only show if NOT a workflow node */}
                {isEditing && !isWorkflowNode && impact && impact.count > 0 && (
                    <div style={{ margin: '16px 32px 0 32px', padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} />
                        Warning: <b>{impact.count} workflows</b> use this task. Changes here will affect all of them.
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid #eee', marginTop: '16px' }}>
                    {!isUtility && <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Properties" />}
                    {!isUtility && <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Validation" />}
                    {!isUtility && <TabButton active={activeTab === 'auth'} onClick={() => setActiveTab('auth')} label="Authorization" />}
                    <TabButton active={activeTab === 'output'} onClick={() => setActiveTab('output')} label={isUtility ? "Manipulations" : "Output Processing"} />
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {activeTab === 'details' && (
                        <>
                            {showImpactList && impact && !isWorkflowNode && (
                                <div style={{ 
                                    background: '#f8fafc', 
                                    padding: '16px', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    marginBottom: '24px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Link2 size={14} /> WORKFLOW USAGE LIST
                                        </div>
                                        <button onClick={() => setShowImpactList(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                    <div style={{ 
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}>
                                        {impact.workflows?.map((w: any) => (
                                            <div key={w.id} style={{ 
                                                padding: '10px 14px',
                                                background: 'white',
                                                borderRadius: '8px',
                                                border: '1px solid #f1f5f9',
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '13px'
                                            }}>
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{w.name}</span>
                                                <a 
                                                    href={`/designer?id=${w.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#1976D2', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '11px' }}
                                                >
                                                    OPEN <ExternalLink size={12}/>
                                                </a>
                                            </div>
                                        ))}
                                        {(!impact.workflows || impact.workflows.length === 0) && (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No workflows found.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <MaterialInput 
                                label="Task Name" 
                                value={name} 
                                onChange={setName} 
                                disabled={isWorkflowNode} 
                            />

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                 <div style={{ minWidth: '100px', flex: '0 0 auto' }}>
                                     {isWorkflowNode && (
                                         <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                                             <button 
                                                 onClick={() => setMethodOverride(!methodOverride)}
                                                 style={{ fontSize: '10px', fontWeight: 'bold', border: 'none', background: methodOverride ? '#f59e0b' : '#eee', color: methodOverride ? 'white' : '#999', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                             >
                                                 {methodOverride ? 'OVERRIDE' : 'LIB'}
                                             </button>
                                         </div>
                                     )}
                                     <MaterialSelect 
                                         label="Method" 
                                         value={method} 
                                         onChange={setMethod} 
                                         options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH']} 
                                         disabled={isWorkflowNode ? !methodOverride : false}
                                     />
                                 </div>
                                 <div style={{ flex: '1 1 80%' }}>
                                     {isWorkflowNode && (
                                         <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                                             <button 
                                                 onClick={() => setUrlOverride(!urlOverride)}
                                                 style={{ fontSize: '10px', fontWeight: 'bold', border: 'none', background: urlOverride ? '#f59e0b' : '#eee', color: urlOverride ? 'white' : '#999', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                             >
                                                 {urlOverride ? 'OVERRIDE ENABLED' : 'USING LIBRARY'}
                                             </button>
                                         </div>
                                     )}
                                     <MaterialTextArea 
                                         label="Endpoint URL" 
                                         value={url} 
                                         onChange={setUrl} 
                                         placeholder="https://..." 
                                         height="46px"
                                         enableVariables={true} 
                                         onRequestVariable={openVarPicker} 
                                         disabled={isWorkflowNode ? !urlOverride : false}
                                     />
                                 </div>
                            </div>

                            <MaterialTextArea 
                                label="Description" 
                                value={description} 
                                onChange={setDescription} 
                                height="55px"
                                enableVariables={true}
                                onRequestVariable={openVarPicker}
                            />
                            
                            <div style={{ marginTop: 0 }}>
                                <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Tags</label>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {tags.map(t => (
                                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 16, backgroundColor: '#f3f4f6', fontSize: 12 }}>
                                            <span style={{ fontWeight: 700, color: '#111827' }}>{t}</span>
                                            {!isWorkflowNode && <button onClick={() => setTags(tags.filter(x => x !== t))} style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer' }}>✕</button>}
                                        </div>
                                    ))}
                                    {!isWorkflowNode && <TagAdder onAdd={(v: string) => { if (v && !tags.includes(v)) setTags([...tags, v]) }} />}
                                </div>
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Folders</label>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {groups?.map((g: any) => {
                                        const isSelected = groupIds.includes(g.id);
                                        return (
                                            <div 
                                                key={g.id} 
                                                onClick={() => {
                                                    if (isWorkflowNode) return; 
                                                    if (isSelected) setGroupIds(groupIds.filter(id => id !== g.id));
                                                    else setGroupIds([...groupIds, g.id]);
                                                }}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 8, 
                                                    padding: '6px 10px', 
                                                    borderRadius: 16, 
                                                    backgroundColor: isSelected ? '#e0f2fe' : '#f3f4f6', 
                                                    cursor: isWorkflowNode ? 'default' : 'pointer',
                                                    border: isSelected ? '1px solid #7dd3fc' : '1px solid transparent',
                                                    opacity: isWorkflowNode ? 0.7 : 1
                                                }}
                                            >
                                                <Folder size={14} color={isSelected ? '#0ea5e9' : '#6b7280'} />
                                                <span style={{ fontWeight: 700, color: isSelected ? '#0369a1' : '#111827', fontSize: 12 }}>{g.name}</span>
                                            </div>
                                        );
                                    })}
                                    {(!groups || groups.length === 0) && (
                                        <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No folders available.</div>
                                    )}
                                </div>
                            </div>

                            {isWorkflowNode && (
                                 <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                     <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Overlay Tags</label>
                                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                         {overlayTags.map((tag, i) => (
                                             <span key={i} style={{ background: '#f59e0b', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                 {tag}
                                                 <button onClick={() => setOverlayTags(overlayTags.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', padding: 0 }}>✕</button>
                                             </span>
                                         ))}
                                         <button 
                                            onClick={() => {
                                                const t = prompt('Add tag:');
                                                if (t) setOverlayTags([...overlayTags, t]);
                                            }}
                                            style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 'bold', border: '1px dashed #f59e0b', background: 'transparent', padding: '2px 10px', borderRadius: '12px', cursor: 'pointer' }}
                                         >
                                             + OVERLAY TAG
                                         </button>
                                     </div>
                                 </div>
                             )}
                            
                             <div style={{ display: 'flex', gap: '20px' }}>
                                 <div style={{ flex: 1 }}>
                                     {isWorkflowNode ? (
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                             <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Timeout Override</label>
                                             <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                 <button 
                                                     onClick={() => setTimeoutOverride(!timeoutOverride)}
                                                     style={{ background: timeoutOverride ? '#f59e0b' : '#f3f4f6', color: timeoutOverride ? 'white' : '#6b7280', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                                                 >
                                                     <Clock size={16}/>
                                                 </button>
                                                 <input 
                                                     type="number"
                                                     value={timeout}
                                                     onChange={e => setTimeout(Number(e.target.value))}
                                                     disabled={!timeoutOverride}
                                                     style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', opacity: timeoutOverride ? 1 : 0.5, backgroundColor: 'white' }}
                                                 />
                                             </div>
                                         </div>
                                     ) : (
                                         <MaterialInput label="Timeout (ms)" value={timeout.toString()} onChange={(val: string) => setTimeout(Number(val))} type="number" />
                                     )}
                                 </div>
                                 <div style={{ flex: 1 }} />
                             </div>

                             <div style={{ marginTop: '0px' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                     <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                         Headers Definition (Key-Value)
                                     </label>
                                     {isWorkflowNode && (
                                         <button 
                                             onClick={() => setHeadersOverride(!headersOverride)}
                                             style={{ fontSize: '10px', fontWeight: 'bold', border: 'none', background: headersOverride ? '#f59e0b' : '#f3f4f6', color: headersOverride ? 'white' : '#6b7280', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                         >
                                             {headersOverride ? 'OVERRIDE ENABLED' : 'USING LIBRARY'}
                                         </button>
                                     )}
                                 </div>
                                 <div style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', opacity: (isWorkflowNode && !headersOverride) ? 0.6 : 1, pointerEvents: (isWorkflowNode && !headersOverride) ? 'none' : 'auto', background: 'white' }}>
                                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                         <thead style={{ background: '#f8fafc' }}>
                                             <tr>
                                                 <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '10px', color: '#64748b', borderBottom: '1px solid #eee' }}>KEY</th>
                                                 <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '10px', color: '#64748b', borderBottom: '1px solid #eee' }}>VALUE</th>
                                                 <th style={{ width: '40px', borderBottom: '1px solid #eee' }}></th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {(kvHeaders.length > 0 ? kvHeaders : [{key: '', value: ''}]).map((h, i) => (
                                                 <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                     <td style={{ padding: '4px 8px' }}>
                                                         <input 
                                                             value={h.key} 
                                                             onChange={e => {
                                                                 const n = [...kvHeaders];
                                                                 if (n.length === 0) n.push({key: '', value: ''});
                                                                 n[i].key = e.target.value; 
                                                                 setKvHeaders(n);
                                                             }}
                                                             placeholder="Header-Name"
                                                             style={{ width: '100%', border: 'none', padding: '8px', fontSize: '13px', outline: 'none' }}
                                                         />
                                                     </td>
                                                     <td style={{ padding: '4px 8px' }}>
                                                         <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                             <input 
                                                                 value={h.value} 
                                                                 onChange={e => {
                                                                     const n = [...kvHeaders];
                                                                     if (n.length === 0) n.push({key: '', value: ''});
                                                                     n[i].value = e.target.value; 
                                                                     setKvHeaders(n);
                                                                 }}
                                                                 placeholder="Value..."
                                                                 style={{ flex: 1, border: 'none', padding: '8px', fontSize: '13px', outline: 'none' }}
                                                             />
                                                             <button 
                                                                 onClick={() => openVarPicker(v => {
                                                                     const n = [...kvHeaders];
                                                                     if (n.length === 0) n.push({key: '', value: ''});
                                                                     n[i].value += v; 
                                                                     setKvHeaders(n);
                                                                 })} 
                                                                 style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
                                                             >
                                                                 <Zap size={14}/>
                                                             </button>
                                                         </div>
                                                     </td>
                                                     <td style={{ textAlign: 'center' }}>
                                                         <button onClick={() => setKvHeaders(kvHeaders.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', opacity: 0.5 }}>
                                                             <Trash2 size={14}/>
                                                         </button>
                                                     </td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                     <button 
                                         onClick={() => setKvHeaders([...kvHeaders, { key: '', value: '' }])}
                                         style={{ width: '100%', padding: '10px', background: 'white', border: 'none', borderTop: '1px solid #eee', color: '#6366f1', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                     >
                                         <Plus size={14}/> ADD HEADER
                                     </button>
                                 </div>
                             </div>

                             <div style={{ marginTop: '0px' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                     <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                         Payload Content (Body)
                                     </label>
                                     {isWorkflowNode && (
                                         <button 
                                             onClick={() => setBodyOverride(!bodyOverride)}
                                             style={{ fontSize: '10px', fontWeight: 'bold', border: 'none', background: bodyOverride ? '#f59e0b' : '#f3f4f6', color: bodyOverride ? 'white' : '#6b7280', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                         >
                                             {bodyOverride ? 'OVERRIDE ENABLED' : 'USING LIBRARY'}
                                         </button>
                                     )}
                                 </div>
                                 <MaterialTextArea 
                                     label=""
                                     value={body} 
                                     onChange={setBody} 
                                     height="160px" 
                                     mono 
                                     enableVariables={true}
                                     onRequestVariable={openVarPicker} 
                                     disabled={isWorkflowNode ? !bodyOverride : false}
                                 />
                             </div>

                        </>
                    )}

                    {activeTab === 'config' && (
                        <>
                            <div style={{ marginBottom: '32px' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Status Code Mappings</h4>
                                {statusMappings.map((m, i) => (
                                     <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                                         <input 
                                             value={m.pattern} 
                                             onChange={e => {
                                                 const n = [...statusMappings]; n[i].pattern = e.target.value; setStatusMappings(n);
                                             }} 
                                             style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #eee', fontSize: '13px' }} 
                                             placeholder="Codes (e.g. 200, 201-204)" 
                                         />
                                         <select 
                                             value={m.status} 
                                             onChange={e => {
                                                 const n = [...statusMappings]; n[i].status = e.target.value; setStatusMappings(n);
                                             }} 
                                             style={{ padding: '10px', borderRadius: '4px', border: '1px solid #eee', fontSize: '13px', fontWeight: 'bold' }}
                                         >
                                             <option value="SUCCESS">SUCCESS</option>
                                             <option value="FAILED">FAILED</option>
                                         </select>
                                         <button onClick={() => setStatusMappings(statusMappings.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer' }}>✕</button>
                                     </div>
                                 ))}
                                 <button onClick={() => setStatusMappings([...statusMappings, { pattern: '', status: 'SUCCESS' }])} style={{ color: '#1976D2', fontSize: '12px', fontWeight: 'bold', border: 'none', background: 'transparent', cursor: 'pointer' }}>+ ADD MAPPING</button>
                             </div>

                             <div>
                                 <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                     <ShieldCheck size={14}/> Sanity Policies
                                 </h4>
                                 
                                 {/* Inherited Checks */}
                                 {inheritedSanityChecks.map((c, i) => (
                                     <div key={`lib-${i}`} style={{ padding: '16px', border: '1px solid #eef2ff', borderRadius: '12px', marginBottom: '12px', backgroundColor: '#f8faff', position: 'relative', opacity: 0.8 }}>
                                         <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 'bold', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                             <Lock size={10}/> LIBRARY
                                         </div>
                                         <div style={{ fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px', color: '#4f46e5', fontWeight: 'bold' }}>{c.regex}</div>
                                         <div style={{ display: 'flex', gap: '12px' }}>
                                             <span style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', color: '#4338ca' }}>
                                                 {c.condition.replace('_', ' ')}
                                             </span>
                                             <span style={{ background: c.severity === 'ERROR' ? '#fef2f2' : '#fffbeb', border: `1px solid ${c.severity === 'ERROR' ? '#fecaca' : '#fde68a'}`, borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', color: c.severity === 'ERROR' ? '#b91c1c' : '#b45309' }}>
                                                 {c.severity}
                                             </span>
                                         </div>
                                     </div>
                                 ))}

                                 {/* Local Node Checks */}
                                 {sanityChecks.map((c, i) => (
                                     <div key={`inst-${i}`} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '12px', marginBottom: '12px', backgroundColor: '#fafafa', position: 'relative' }}>
                                         <button onClick={() => setSanityChecks(sanityChecks.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: '12px', right: '12px', border: 'none', background: 'transparent', color: '#999', cursor: 'pointer' }}>✕</button>
                                         <input value={c.regex} onChange={e => {
                                             const n = [...sanityChecks]; n[i].regex = e.target.value; setSanityChecks(n);
                                         }} style={{ width: 'calc(100% - 24px)', border: 'none', background: 'transparent', borderBottom: '1px solid #ddd', outline: 'none', fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px' }} placeholder="Regex Pattern" />
                                         <div style={{ display: 'flex', gap: '12px' }}>
                                             <select value={c.condition} onChange={e => {
                                                 const n = [...sanityChecks]; n[i].condition = e.target.value; setSanityChecks(n);
                                             }} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', padding: '4px' }}>
                                                 <option value="MUST_CONTAIN">MUST CONTAIN</option>
                                                 <option value="MUST_NOT_CONTAIN">MUST NOT CONTAIN</option>
                                             </select>
                                             <select value={c.severity} onChange={e => {
                                                 const n = [...sanityChecks]; n[i].severity = e.target.value; setSanityChecks(n);
                                             }} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#dc2626', padding: '4px' }}>
                                                 <option value="ERROR">ERROR</option>
                                                 <option value="WARNING">WARNING</option>
                                             </select>
                                         </div>
                                     </div>
                                 ))}
                                 <button onClick={() => setSanityChecks([...sanityChecks, { regex: '', condition: 'MUST_CONTAIN', severity: 'ERROR' }])} style={{ color: '#1976D2', fontSize: '12px', fontWeight: 'bold', border: 'none', background: 'transparent', cursor: 'pointer' }}>+ ADD POLICY OVERLAY</button>
                             </div>
                        </>
                    )}

                    {activeTab === 'auth' && (
                        <>
                            {isWorkflowNode && (
                                <div style={{ marginBottom: '24px', padding: '16px', background: authOverride ? '#fffbeb' : '#f0f9ff', borderRadius: '12px', border: `1px solid ${authOverride ? '#fef3c7' : '#e0f2fe'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: authOverride ? '#f59e0b' : '#3b82f6', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {authOverride ? <Unlock size={18}/> : <Lock size={18}/>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>{authOverride ? 'Custom Overridden Auth' : 'Using Library Auth'}</div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{authOverride ? 'Settings below apply only to this node' : 'Currently inheriting auth from the main task'}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setAuthOverride(!authOverride)}
                                        style={{ background: authOverride ? '#fef3c7' : '#e0f2fe', color: authOverride ? '#92400e' : '#0369a1', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                        {authOverride ? 'RESET TO LIBRARY' : 'ENABLE OVERRIDE'}
                                    </button>
                                </div>
                            )}

                            <div style={{ opacity: (isWorkflowNode && !authOverride) ? 0.6 : 1, pointerEvents: (isWorkflowNode && !authOverride) ? 'none' : 'auto', transition: 'all 0.2s' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Authorization Type</h4>
                                <select 
                                    value={authType} 
                                    onChange={e => setAuthType(e.target.value as any)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        border: '1px solid #ddd', 
                                        fontSize: '14px', 
                                        fontWeight: 'bold',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="none">No Auth</option>
                                    <option value="basic">Basic Auth</option>
                                    <option value="bearer">Bearer Token</option>
                                    <option value="jwt">JWT Bearer</option>
                                </select>
                            </div>

                            {isWorkflowNode && !authOverride && libAuth && libAuth.type !== 'none' && (
                                <div style={{ marginTop: '16px', fontSize: '11px', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Lock size={12}/> View only: Library is using <b>{libAuth.type.toUpperCase()}</b> auth.
                                </div>
                            )}

                            {authType === 'basic' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#374151', margin: 0 }}>Basic Authentication</h4>
                                    <MaterialInput 
                                        label="Username" 
                                        value={basicAuthUser} 
                                        onChange={setBasicAuthUser}
                                        enableVariables
                                        onRequestVariable={openVarPicker}
                                    />
                                    <MaterialInput 
                                        label="Password" 
                                        value={basicAuthPassword} 
                                        onChange={setBasicAuthPassword}
                                        type="password"
                                        enableVariables
                                        onRequestVariable={openVarPicker}
                                    />
                                </div>
                            )}

                            {authType === 'bearer' && (
                                <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '16px' }}>Bearer Token</h4>
                                    <MaterialInput 
                                        label="Token" 
                                        value={bearerToken} 
                                        onChange={setBearerToken}
                                        enableVariables
                                        onRequestVariable={openVarPicker}
                                    />
                                </div>
                            )}

                            {authType === 'jwt' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#374151', margin: 0 }}>JWT Bearer Configuration</h4>
                                    
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Algorithm
                                        </label>
                                        <select 
                                            value={jwtAlgorithm} 
                                            onChange={e => setJwtAlgorithm(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '10px', 
                                                borderRadius: '6px', 
                                                border: '1px solid #d1d5db', 
                                                fontSize: '13px',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            <option value="HS256">HS256</option>
                                            <option value="HS384">HS384</option>
                                            <option value="HS512">HS512</option>
                                            <option value="RS256">RS256</option>
                                            <option value="RS384">RS384</option>
                                            <option value="RS512">RS512</option>
                                        </select>
                                    </div>

                                    <div>
                                        <MaterialInput 
                                            label="Secret" 
                                            value={jwtSecret} 
                                            onChange={setJwtSecret}
                                            enableVariables
                                            onRequestVariable={openVarPicker}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={jwtSecretIsBase64} 
                                                onChange={e => setJwtSecretIsBase64(e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            Secret is Base64 encoded
                                        </label>
                                    </div>

                                    <MaterialTextArea 
                                        label="Payload (JSON)" 
                                        value={jwtPayload} 
                                        onChange={setJwtPayload}
                                        height="120px"
                                        mono
                                        enableVariables
                                        onRequestVariable={openVarPicker}
                                    />

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Add JWT Token To
                                        </label>
                                        <select 
                                            value={jwtAddTo} 
                                            onChange={e => setJwtAddTo(e.target.value as any)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '10px', 
                                                borderRadius: '6px', 
                                                border: '1px solid #d1d5db', 
                                                fontSize: '13px',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            <option value="header">Request Header (Authorization: Bearer ...)</option>
                                            <option value="query">Query Parameter (?token=...)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {authType === 'none' && (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                    <p>No authentication will be used for this request.</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'output' && (
                        <>
                            <div>
                                {isUtility && (
                                    <div style={{ marginBottom: '40px' }}>
                                        <MaterialInput label="Task Name (Label)" value={name} onChange={setName} />
                                    </div>
                                )}
                                <div style={{ marginBottom: isUtility ? '0px' : '32px' }}>
                                    {!isUtility && (
                                        <>
                                            <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                                                Output Processing
                                            </h4>
                                            <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                                                Output processing is now configured per-variable. Define variables and attach transformers below.
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Zap size={18} className="text-primary-600" fill="currentColor" />
                                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            VARIABLES CONFIGURATION
                                        </h4>
                                    </div>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', background: '#eef2ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px' }}>
                                        Processed Top to Bottom
                                    </div>
                                </div>

                                <VariableManager 
                                    value={{ ...inheritedVars, ...outputVars }} 
                                    onChange={(newMerged) => {
                                        // VariableManager already filters __order and __scopes to exclude inherited vars
                                        const onlyNew = { ...newMerged };
                                        Object.keys(inheritedVars).forEach(k => {
                                            if (k !== '__order' && k !== '__scopes') {
                                                delete onlyNew[k];
                                            }
                                        });
                                        setOutputVars(onlyNew);
                                    }} 
                                    inheritedNames={Object.keys(inheritedVars)}
                                    usedNames={[]} 
                                    availableUpstreamVars={availableUpstreamVars} 
                                    forceWorkflowScope={isUtility || !!nodeData}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '24px', backgroundColor: 'white' }}>
                    <button 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#1976D2', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{ backgroundColor: '#1976D2', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                        SAVE TASK
                    </button>
                </div>
            {pickerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999999 }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} onClick={() => setPickerOpen(false)} />
                    <VariablePicker 
                        onSelect={handleVarSelect} 
                        onClose={() => setPickerOpen(false)} 
                        localVars={[
                            ...Object.keys(outputVars || {}).filter(k => !k.startsWith('__')),
                            ...(availableUpstreamVars || [])
                        ]}
                    />
                </div>
            )}
            </div>

            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .material-label {
                    position: absolute;
                    top: -8px;
                    left: 12px;
                    background: white;
                    padding: 0 4px;
                    font-size: 11px;
                    color: #999;
                    font-weight: 500;
                    z-index: 10;
                }
                .material-box {
                    width: 100%;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    padding: 12px 16px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .material-box:focus {
                    border-color: #1976D2;
                }
            `}</style>
        </div>
    )
}

function TabButton({ active, onClick, label }: any) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                flex: 1, 
                padding: '16px 0', 
                border: 'none', 
                background: 'transparent', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                color: active ? '#1976D2' : '#999',
                borderBottom: active ? '2px solid #1976D2' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            {label}
        </button>
    )
}

// Helpers moved to bottom


// ... (existing imports, but add useRef if not present at top, I will add it to the replacement block if I replace the whole file or top)
// actually I'll just add the new components method and imports

// --- Helper Components ---

interface MaterialInputProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    type?: string;
    enableVariables?: boolean;
    onRequestVariable?: (cb: (val: string) => void) => void;
    disabled?: boolean;
}

function MaterialInput({ label, value, onChange, placeholder, type = 'text', enableVariables = false, onRequestVariable, disabled = false }: MaterialInputProps) {
    const inputRef = useRef<any>(null);
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            {enableVariables ? (
                <div className="relative">
                    <VariableAwareInput 
                        ref={inputRef}
                        value={value} 
                        onValueChange={onChange} 
                        placeholder={placeholder}
                        type={type}
                        disabled={disabled}
                    />
                    <button 
                        onClick={() => onRequestVariable && onRequestVariable((val: string) => {
                            const el = inputRef.current;
                            if (el) {
                                const start = el.selectionStart || 0;
                                const end = el.selectionEnd || 0;
                                const newVal = value.slice(0, start) + val + value.slice(end);
                                onChange(newVal);
                                setTimeout(() => {
                                    el.focus();
                                    el.setSelectionRange(start + val.length, start + val.length);
                                }, 0);
                            } else {
                                onChange(value + val);
                            }
                        })}
                        disabled={disabled}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: disabled ? '#ccc' : '#1976D2', cursor: disabled ? 'default' : 'pointer', padding: '4px', zIndex: 10 }}
                        title="Insert Variable"
                    >
                        <Zap size={14} fill="currentColor" />
                    </button>
                </div>
            ) : (
                <input 
                    ref={inputRef}
                    type={type} 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    placeholder={placeholder}
                    disabled={disabled}
                    className="material-box"
                    style={{ opacity: disabled ? 0.6 : 1 }}
                />
            )}
        </div>
    )
}

interface MaterialTextAreaProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    height?: string;
    mono?: boolean;
    placeholder?: string;
    enableVariables?: boolean;
    onRequestVariable?: (cb: (val: string) => void) => void;
    disabled?: boolean;
}

function MaterialTextArea({ label, value, onChange, height = '100px', mono = false, placeholder = '', enableVariables, onRequestVariable, disabled = false }: MaterialTextAreaProps) {
    const areaRef = useRef<any>(null);
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            {enableVariables ? (
                <div className="relative">
                    <VariableAwareInput 
                        ref={areaRef}
                        isTextarea={true}
                        value={value} 
                        onValueChange={onChange} 
                        placeholder={placeholder}
                        style={{ minHeight: '46px', height }}
                        disabled={disabled}
                    />
                    <button 
                        onClick={() => onRequestVariable && onRequestVariable((val: string) => {
                            const el = areaRef.current;
                            if (el) {
                                const start = el.selectionStart || 0;
                                const end = el.selectionEnd || 0;
                                const newVal = value.slice(0, start) + val + value.slice(end);
                                onChange(newVal);
                                setTimeout(() => {
                                    el.focus();
                                    el.setSelectionRange(start + val.length, start + val.length);
                                }, 0);
                            } else {
                                onChange(value + val);
                            }
                        })}
                        disabled={disabled}
                        style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'white', color: disabled ? '#ccc' : '#1976D2', cursor: disabled ? 'default' : 'pointer', padding: '4px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 10 }}
                        title="Insert Variable"
                    >
                        <Zap size={14} fill="currentColor" />
                    </button>
                </div>
            ) : (
                <textarea 
                    ref={areaRef}
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    disabled={disabled}
                    placeholder={placeholder}
                    style={{ height, minHeight: '46px', resize: 'vertical', fontFamily: mono ? 'monospace' : 'inherit', opacity: disabled ? 0.6 : 1 }}
                    className="material-box"
                />
            )}
        </div>
    )
}

interface MaterialSelectProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
    disabled?: boolean;
}

function MaterialSelect({ label, value, onChange, options, disabled = false }: MaterialSelectProps) {
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <select 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                disabled={disabled}
                className="material-box"
                style={{ fontWeight: 'bold', opacity: disabled ? 0.6 : 1 }}
            >
                {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    )
}

function TagAdder({ onAdd }: { onAdd: (v: string) => void }) {
    const [val, setVal] = useState('');
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={val} onChange={e => setVal(e.target.value)} placeholder="Add tag" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e0e0e0' }} />
            <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} style={{ backgroundColor: '#1976D2', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Add</button>
        </div>
    )
}
