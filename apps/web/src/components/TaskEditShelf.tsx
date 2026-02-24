import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'
import React, { useState, useEffect, useRef } from 'react'
// Output processing is now per-variable; top-level preview removed.
import { VariableManager } from './VariableManager';
import { X, AlertTriangle, Zap, ShieldCheck, Lock, Unlock, Clock, FileText, List, Key, Plus, Trash2, Link2, ExternalLink, Info, Folder, Layers, Library, ArrowRight, Tag, Settings, Globe, ChevronDown, ChevronUp, Grid, HardDrive, Box, Activity } from 'lucide-react'
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { useToast } from '../context/ToastContext';

interface Props {
    taskId?: string | null;
    nodeData?: any;
    availableUpstreamVars?: (string | { name: string, taskName: string, value?: any, source?: 'workflow' | 'task' | 'workflow_input' | 'workflow_output' })[];
    onClose: () => void;
    onSaveNode?: (data: any) => void;
}

export function TaskEditShelf({ taskId, nodeData, availableUpstreamVars, onClose, onSaveNode }: Props) {
    const queryClient = useQueryClient()
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'details' | 'config' | 'auth' | 'output'>('details')
    
    // Output Processing State
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
    const [showImpactList, setShowImpactList] = useState(false);
    
    const isEditing = !!taskId || !!nodeData
    const isWorkflowNode = !!nodeData
    const isNestedWorkflow = nodeData?.taskType === 'WORKFLOW'
    const isUtility = nodeData?.taskType === 'VARIABLE' || taskId === '00000000-0000-0000-0000-000000000001'
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({ headers: true, payload: true, meta: false });
    const toggleAccordion = (key: string) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
    const initializedRef = React.useRef<string | null>(null);

    // Nested Workflow State
    const [inputMapping, setInputMapping] = useState<Record<string, any>>({})

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

    // Fetch Task or Child Workflow
    const { data: task, isLoading: isTaskLoading, isFetching: isTaskFetching } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTask(taskId!),
        enabled: !!taskId && !isNestedWorkflow && !isUtility
    })

    const { data: childWorkflow, isLoading: isChildWfLoading, isFetching: isChildWfFetching } = useQuery({
        queryKey: ['workflow', taskId],
        queryFn: () => workflowsApi.getWorkflow(taskId!),
        enabled: !!taskId && isNestedWorkflow
    })

    const { data: groups } = useQuery({
        queryKey: ['task-groups'],
        queryFn: tasksApi.getGroups
    })

    const { data: impact } = useQuery({
        queryKey: ['task-impact', taskId],
        queryFn: () => tasksApi.getTaskImpact(taskId!),
        enabled: !!taskId && !isNestedWorkflow && !isUtility
    })

    // Auto-switch tabs
    useEffect(() => {
        if (isUtility) {
            setActiveTab('output');
        } else if (isNestedWorkflow) {
            setActiveTab('details');
        }
    }, [isUtility, isNestedWorkflow])

    // Initialization
    useEffect(() => {
        const targetData = isNestedWorkflow ? childWorkflow : task;
        const currentSessionId = nodeData?.id || taskId;

        if (!targetData && !isUtility) {
            initializedRef.current = null;
            return;
        }

        if (isTaskFetching || isChildWfFetching) return;
        if (initializedRef.current === currentSessionId) return;
        initializedRef.current = currentSessionId;

        if (isUtility && nodeData) {
            setName(nodeData.label || 'Variables Manipulation')
            setDescription(nodeData.description || '')
            setOutputVars(nodeData.variableExtraction?.vars || {})
            setInheritedVars({});
            setInheritedSanityChecks([]);
        } else if (isNestedWorkflow && childWorkflow) {
            setName(nodeData.label || childWorkflow.name)
            setDescription(nodeData.description || childWorkflow.description || '')
            setInputMapping(nodeData.inputMapping || {})
            setOutputVars(nodeData.variableExtraction?.vars || {})
            setInheritedVars({});
            setInheritedSanityChecks([]);
        } else if (task && isEditing) {
            setName(task.name)
            setDescription(task.description || '')
            const cmd = (task as any).command || {}
            setUrl(cmd.url || '')
            setMethod(cmd.method || 'GET')
            
            const rawHeaders = cmd.headers || {};
            setHeaders(JSON.stringify(rawHeaders, null, 2));
            setKvHeaders(Object.entries(rawHeaders).map(([k, v]) => ({ key: k, value: String(v) })));

            setBody(cmd.body || '')
            setTimeout(cmd.timeout || 30000)
            setTags(task.tags || [])
            setStatusMappings((task as any).statusMappings || [])
            
            if (isWorkflowNode && nodeData) {
                if (nodeData.timeout !== undefined) {
                    setTimeout(nodeData.timeout);
                    setTimeoutOverride(true);
                } else setTimeoutOverride(false);

                if (nodeData.body !== undefined) {
                    setBody(nodeData.body);
                    setBodyOverride(true);
                } else setBodyOverride(false);

                if (nodeData.headers !== undefined) {
                    const nodeRawHeaders = nodeData.headers || {};
                    setKvHeaders(Object.entries(nodeRawHeaders).map(([k, v]) => ({ key: k, value: String(v) })));
                    setHeadersOverride(true);
                } else setHeadersOverride(false);

                if (nodeData.url !== undefined) {
                    setUrl(nodeData.url);
                    setUrlOverride(true);
                } else setUrlOverride(false);

                if (nodeData.method !== undefined) {
                    setMethod(nodeData.method);
                    setMethodOverride(true);
                } else setMethodOverride(false);

                setOverlayTags(nodeData.targetTags || []);
            } else {
                setTimeoutOverride(false);
                setBodyOverride(false);
                setHeadersOverride(false);
                setOverlayTags([]);
            }

            const libChecks = (task as any).sanityChecks || [];
            if (isWorkflowNode) {
                setInheritedSanityChecks(libChecks);
                setSanityChecks(nodeData.sanityChecks || []);
            } else {
                setInheritedSanityChecks([]);
                setSanityChecks(libChecks);
            }

            setGroupIds(((task as any).groups || []).map((g: any) => g.id))
            
            const auth = cmd.authorization || { type: 'none' };
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

            let libVars = {};
            if (isNestedWorkflow && childWorkflow) {
                libVars = childWorkflow.outputVariables || {};
            } else if (task) {
                libVars = (task as any).variableExtraction?.vars || (task as any).command?.outputProcessing?.vars || {};
            }

            if (isWorkflowNode) {
                setInheritedVars(libVars);
                setOutputVars(nodeData.variableExtraction?.vars || {});
            } else {
                setInheritedVars({});
                setOutputVars(libVars);
            }
        }
    }, [task, childWorkflow, nodeData, isEditing, isUtility, isWorkflowNode, isNestedWorkflow, isTaskFetching, isChildWfFetching, taskId])

    const handleSave = () => {
        try {
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

            const finalHeaders = kvHeaders.reduce((acc, curr) => {
                if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
                return acc;
            }, {} as Record<string, string>);

            if (onSaveNode) {
                onSaveNode({
                    ...nodeData,
                    label: name,
                    taskId,
                    taskType: isNestedWorkflow ? 'WORKFLOW' : (isUtility ? 'VARIABLE' : (task?.taskType || 'HTTP')),
                    inputMapping: isNestedWorkflow ? inputMapping : undefined,
                    variableExtraction: { vars: outputVars },
                    sanityChecks,
                    authorization: authOverride ? authorization : undefined,
                    timeout: timeoutOverride ? timeout : undefined,
                    method: methodOverride ? method : (isNestedWorkflow ? 'WF' : undefined),
                    url: urlOverride ? url : undefined,
                    body: bodyOverride ? body : undefined,
                    headers: headersOverride ? finalHeaders : undefined,
                    targetTags: overlayTags.length > 0 ? overlayTags : undefined
                });
                showToast(isUtility ? 'Variables saved successfully!' : 'Workflow node updated!', 'success');
                onClose();
                return;
            }

            const data = {
                name, description, method, url, 
                headers: finalHeaders, 
                body, timeout, tags, statusMappings, sanityChecks,
                groupIds, authorization,
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
            showToast('Failed to save task. Please check your configuration.', 'error')
        }
    }

    if (isEditing && (isTaskLoading || isChildWfLoading)) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999999, display: 'flex', justifyContent: 'flex-end' }}>
            <div 
                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
                onClick={onClose}
            />

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
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div className="flex flex-col">
                            {isUtility ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            value={name} 
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (onSaveNode) {
                                                    // Proactively notify parent of rename for better UX
                                                    // (though wait for Save button is also fine)
                                                }
                                            }}
                                            style={{ 
                                                fontSize: '20px', 
                                                fontWeight: 800, 
                                                color: '#111827', 
                                                border: 'none', 
                                                background: 'transparent',
                                                outline: 'none',
                                                width: '100%',
                                                padding: 0
                                            }}
                                            placeholder="Utility Task Name"
                                        />
                                    </div>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#4f46e5', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        VARIABLES MANIPULATION
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {isNestedWorkflow ? (nodeData?.label || childWorkflow?.name || 'Nested Workflow') : (taskId ? (isWorkflowNode ? (nodeData?.label || task?.name || 'Task Instance') : 'TASK FORM - EDIT MODE') : 'CREATE NEW TASK')}
                                        {isWorkflowNode && !isUtility && (
                                            <span style={{ fontSize: '10px', background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #c7d2fe' }}>Node Instance</span>
                                        )}
                                    </h2>
                                    {isWorkflowNode && !isUtility && (
                                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', marginTop: '2px', paddingLeft: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            NODE OVERLAY CONFIG
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', marginLeft: '16px' }}>
                        <X size={24} color="#999" />
                    </button>
                </div>

                <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid #eee', marginTop: '16px' }}>
                    {!isUtility && !isNestedWorkflow && <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Properties" />}
                    {!isUtility && !isNestedWorkflow && <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Validation" />}
                    {!isUtility && !isNestedWorkflow && <TabButton active={activeTab === 'auth'} onClick={() => setActiveTab('auth')} label="Authorization" />}
                    {isNestedWorkflow && <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Input Mapping" />}
                    <TabButton 
                       active={activeTab === 'output'} 
                       onClick={() => setActiveTab('output')} 
                       label={isUtility ? "Manipulations" : isNestedWorkflow ? "Output Mapping" : "Output Processing"} 
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {activeTab === 'details' && !isUtility && (
                                <>
                                    {isNestedWorkflow && childWorkflow && (
                                <div className="space-y-6">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Layers size={18} className="text-primary-600" />
                                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            INPUT MAPPING
                                        </h4>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {(() => {
                                            const exposedInputs = Object.entries(childWorkflow.inputVariables || {})
                                                .filter(([k, v]: [string, any]) => !k.startsWith('__') && (v?.useParentInput === true || typeof v !== 'object'));
                                            
                                            if (exposedInputs.length === 0) {
                                                return (
                                                    <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8', padding: '16px', border: '2px dashed #f1f5f9', borderRadius: '12px', textAlign: 'center' }}>
                                                        This workflow has no variables exposed for parent input.
                                                    </div>
                                                );
                                            }

                                            return exposedInputs.map(([varName, config]: [string, any]) => {
                                                const defaultValue = typeof config === 'object' ? (config.defaultValue || '') : config;
                                                return (
                                                    <MaterialInput 
                                                        key={varName}
                                                        label={varName}
                                                        value={inputMapping[varName] !== undefined ? inputMapping[varName] : (typeof defaultValue === 'string' ? defaultValue : '')}
                                                        onChange={(val) => setInputMapping(prev => ({ ...prev, [varName]: val }))}
                                                        enableVariables={true}
                                                        onRequestVariable={openVarPicker}
                                                        placeholder={`Default: ${String(defaultValue || 'none')}`}
                                                        availableVars={availableUpstreamVars}
                                                    />
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}

                            {!isNestedWorkflow && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Section 1: Target API */}
                                    <div className={`bg-white rounded-2xl border ${urlOverride || methodOverride ? 'border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'border-slate-200'} shadow-sm overflow-hidden transition-all duration-300`}>
                                        <div className={`bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between pr-4`}>
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className={urlOverride || methodOverride ? "text-amber-500" : "text-slate-400"} />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network Architecture</span>
                                            </div>
                                            {isWorkflowNode && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            const newState = !(urlOverride || methodOverride);
                                                            setUrlOverride(newState);
                                                            setMethodOverride(newState);
                                                            if (!newState && task) {
                                                                setUrl((task as any).command?.url || '');
                                                                setMethod((task as any).command?.method || 'GET');
                                                            }
                                                        }}
                                                        className={`px-2 py-1 rounded text-[9px] font-black uppercase flex items-center gap-2 transition-all ${urlOverride || methodOverride ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}
                                                    >
                                                        {urlOverride || methodOverride ? <Unlock size={10} /> : <Lock size={10} />}
                                                        OVERLAY URL/METHOD
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                                <div className="md:col-span-1">
                                                    <MaterialSelect 
                                                        label="HTTP Method" 
                                                        value={method} 
                                                        onChange={setMethod} 
                                                        options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']} 
                                                        disabled={isWorkflowNode ? !methodOverride : false}
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <MaterialInput 
                                                        label="Resource Endpoint (URL)" 
                                                        placeholder="https://api.system.com/v1/..." 
                                                        value={url} 
                                                        onChange={setUrl} 
                                                        enableVariables 
                                                        onRequestVariable={openVarPicker}
                                                        disabled={isWorkflowNode ? !urlOverride : false}
                                                        availableVars={availableUpstreamVars}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Request Details - REORDERED & ACCORDION */}
                                    <div className="space-y-4">
                                        {/* Headers Accordion */}
                                        <div className={`bg-white rounded-2xl border ${headersOverride ? 'border-amber-200' : 'border-slate-200'} shadow-sm overflow-hidden transition-all duration-300`}>
                                            <div className="flex items-center justify-between bg-slate-50/50 pr-4">
                                                <button 
                                                    onClick={() => toggleAccordion('headers')}
                                                    className="flex-1 px-6 py-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg ${headersOverride ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-500'} flex items-center justify-center`}>
                                                            <Layers size={16} />
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Custom Headers</span>
                                                            {isWorkflowNode && !headersOverride && <span className="text-[9px] text-slate-400 font-bold uppercase">Using Library Defaults</span>}
                                                            {isWorkflowNode && headersOverride && <span className="text-[9px] text-amber-600 font-bold uppercase">Overlay Active</span>}
                                                        </div>
                                                    </div>
                                                    {openAccordions.headers ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                </button>
                                                {isWorkflowNode && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHeadersOverride(!headersOverride);
                                                            if (headersOverride && task) {
                                                                const lib = (task as any).command?.headers || {};
                                                                setKvHeaders(Object.entries(lib).map(([k, v]) => ({ key: k, value: String(v) })));
                                                            }
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${headersOverride ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-200 text-slate-400'}`}
                                                        title={headersOverride ? "Disable Overlay (Use Library)" : "Enable Overlay (Custom Headers)"}
                                                    >
                                                        {headersOverride ? <Unlock size={14} /> : <Lock size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {openAccordions.headers && (
                                                <div className="p-6 animate-in slide-in-from-top-1 duration-200">
                                                    <div className={`space-y-2 max-h-[250px] overflow-y-auto ${headersOverride ? 'bg-amber-50/30' : 'bg-slate-50/50'} p-4 rounded-xl border border-dashed ${headersOverride ? 'border-amber-200' : 'border-slate-200'}`}>
                                                        {kvHeaders.length === 0 && (
                                                            <div className="text-center py-4 text-[11px] text-slate-400 italic">No custom headers configured.</div>
                                                        )}
                                                        {kvHeaders.map((h, i) => (
                                                            <div key={i} className="flex gap-2 group/header items-center bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm focus-within:border-primary-300 transition-colors">
                                                                <input 
                                                                    className="flex-1 px-3 py-1.5 text-[11px] border-none bg-transparent font-mono outline-none" 
                                                                    value={h.key} 
                                                                    placeholder="Key"
                                                                    disabled={isWorkflowNode && !headersOverride}
                                                                    onChange={e => {
                                                                        const newH = [...kvHeaders];
                                                                        newH[i].key = e.target.value;
                                                                        setKvHeaders(newH);
                                                                    }}
                                                                />
                                                                <div className="w-[1px] h-4 bg-slate-200" />
                                                                <input 
                                                                    className="flex-1 px-3 py-1.5 text-[11px] border-none bg-transparent font-mono outline-none" 
                                                                    value={h.value} 
                                                                    placeholder="Value"
                                                                    disabled={isWorkflowNode && !headersOverride}
                                                                    onChange={e => {
                                                                        const newH = [...kvHeaders];
                                                                        newH[i].value = e.target.value;
                                                                        setKvHeaders(newH);
                                                                    }}
                                                                />
                                                                <button 
                                                                    disabled={isWorkflowNode && !headersOverride}
                                                                    onClick={() => setKvHeaders(kvHeaders.filter((_, idx) => idx !== i))} 
                                                                    className={`p-1.5 transition-colors ${isWorkflowNode && !headersOverride ? 'text-slate-200' : 'text-slate-300 hover:text-red-500'}`}
                                                                >
                                                                    <Trash2 size={14}/>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button 
                                                            disabled={isWorkflowNode && !headersOverride}
                                                            onClick={() => setKvHeaders([...kvHeaders, { key: '', value: '' }])}
                                                            className={`w-full mt-2 py-2 text-[10px] border border-dashed rounded-xl transition-all font-bold flex items-center justify-center gap-2 ${
                                                                isWorkflowNode && !headersOverride 
                                                                    ? 'border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' 
                                                                    : 'border-slate-300 text-slate-500 hover:bg-white hover:border-primary-300 hover:text-primary-600'
                                                            }`}
                                                        >
                                                            <Plus size={12} /> ADD HEADER KEY
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payload Accordion */}
                                        <div className={`bg-white rounded-2xl border ${bodyOverride ? 'border-amber-200' : 'border-slate-200'} shadow-sm overflow-hidden transition-all duration-300`}>
                                            <div className="flex items-center justify-between bg-slate-50/50 pr-4">
                                                <button 
                                                    onClick={() => toggleAccordion('payload')}
                                                    className="flex-1 px-6 py-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg ${bodyOverride ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-500'} flex items-center justify-center`}>
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Request Payload</span>
                                                            {isWorkflowNode && !bodyOverride && <span className="text-[9px] text-slate-400 font-bold uppercase">Using Library Body</span>}
                                                            {isWorkflowNode && bodyOverride && <span className="text-[9px] text-amber-600 font-bold uppercase">Overlay Active</span>}
                                                        </div>
                                                    </div>
                                                    {openAccordions.payload ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                </button>
                                                {isWorkflowNode && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBodyOverride(!bodyOverride);
                                                            if (bodyOverride && task) setBody((task as any).command?.body || '');
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${bodyOverride ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-200 text-slate-400'}`}
                                                        title={bodyOverride ? "Disable Overlay (Use Library)" : "Enable Overlay (Custom Payload)"}
                                                    >
                                                        {bodyOverride ? <Unlock size={14} /> : <Lock size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {openAccordions.payload && (
                                                <div className="p-6 animate-in slide-in-from-top-1 duration-200">
                                                    <MaterialTextArea 
                                                        label="JSON / Text Body" 
                                                        value={body} 
                                                        onChange={setBody} 
                                                        height="250px" 
                                                        mono 
                                                        enableVariables 
                                                        onRequestVariable={openVarPicker}
                                                        disabled={isWorkflowNode ? !bodyOverride : false}
                                                        availableVars={availableUpstreamVars}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section 3: Execution & Metadata */}
                                    <div className={`bg-white rounded-2xl border ${timeoutOverride ? 'border-amber-200' : 'border-slate-200'} shadow-sm overflow-hidden`}>
                                        <div className="bg-slate-50/50 px-6 py-3 border-bottom border-slate-100 flex items-center justify-between pr-4">
                                            <div className="flex items-center gap-2">
                                                <Settings size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Execution & Metadata</span>
                                            </div>
                                            {isWorkflowNode && (
                                                <button 
                                                    onClick={() => {
                                                        setTimeoutOverride(!timeoutOverride);
                                                        if (timeoutOverride && task) setTimeout((task as any).command?.timeout || 30000);
                                                    }}
                                                    className={`p-1.5 rounded transition-all ${timeoutOverride ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}
                                                >
                                                    {timeoutOverride ? <Unlock size={12} /> : <Lock size={12} />}
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <MaterialInput 
                                                        label="Execution Timeout (ms)" 
                                                        type="number" 
                                                        value={timeout} 
                                                        onChange={(v: any) => setTimeout(parseInt(v) || 30000)}
                                                        disabled={isWorkflowNode ? !timeoutOverride : false}
                                                    />
                                                    
                                                    <MaterialInput 
                                                        label="Operational Tags" 
                                                        placeholder="prod, linux, aws..."
                                                        value={isWorkflowNode ? overlayTags.join(', ') : tags.join(', ')} 
                                                        onChange={(v: string) => {
                                                            const t = v.split(',').map(s => s.trim()).filter(Boolean);
                                                            if (isWorkflowNode) setOverlayTags(t);
                                                            else setTags(t);
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    {!isWorkflowNode && (
                                                        <div className="relative">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <label className="material-label">Library Categorization</label>
                                                                <div className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">Digital Org</div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3 mt-2 relative">
                                                                {/* Optional: Decorative grid lines */}
                                                                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-[0.03]">
                                                                    {Array.from({ length: 16 }).map((_, i) => <div key={i} className="border border-primary-500" />)}
                                                                </div>

                                                                {groups?.map((g: any, idx: number) => {
                                                                    const isActive = groupIds.includes(g.id);
                                                                    const hexId = g.id.substring(0, 4).toUpperCase();
                                                                    return (
                                                                        <div 
                                                                            key={g.id} 
                                                                            onClick={() => {
                                                                                if (isActive) setGroupIds(groupIds.filter(id => id !== g.id));
                                                                                else setGroupIds([...groupIds, g.id]);
                                                                            }}
                                                                            className={`relative overflow-hidden group cursor-pointer border-2 transition-all p-3 rounded-2xl flex flex-col gap-2 ${
                                                                                isActive 
                                                                                    ? 'bg-[#f0f4ff] border-primary-500 shadow-[0_0_20px_rgba(25,118,210,0.12)]' 
                                                                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[9px] font-black tracking-tighter transition-colors ${isActive ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                                    <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                                                                                    REG-{hexId}
                                                                                </div>
                                                                                {isActive && (
                                                                                    <div className="flex gap-0.5">
                                                                                        {[1, 2, 3].map(i => (
                                                                                            <div key={i} className="w-1 h-2 bg-primary-500/20 rounded-full" />
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Folder size={12} className={isActive ? 'text-primary-600' : 'text-slate-300'} fill={isActive ? "currentColor" : "none"} />
                                                                                <span className={`text-[12px] font-bold truncate ${isActive ? 'text-primary-800' : 'text-slate-600'}`}>
                                                                                    {g.name}
                                                                                </span>
                                                                            </div>
                                                                            {isActive && (
                                                                                <div className="absolute -bottom-1 -right-1 opacity-10">
                                                                                    <Grid size={32} className="text-primary-500" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {(!groups || groups.length === 0) && (
                                                                    <div className="col-span-2 text-[10px] text-slate-400 italic py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl uppercase tracking-widest font-black">
                                                                        No library clusters found
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                        <MaterialTextArea 
                                            label="Researcher Notes (Description)" 
                                            value={description} 
                                            onChange={setDescription} 
                                            height="80px"
                                            enableVariables={true}
                                            onRequestVariable={openVarPicker}
                                            placeholder="Document purpose, expected outcomes, or dependencies..."
                                            availableVars={availableUpstreamVars}
                                        />
                                    </div>
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
                                {isNestedWorkflow && childWorkflow && (
                                    <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Box size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Child Return Specification</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(childWorkflow.outputVariables || {}).filter(([k]) => !k.startsWith('__')).map(([name, config]: [string, any]) => (
                                                <div key={name} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                                                    <Zap size={10} className="text-indigo-400" />
                                                    <span className="text-[11px] font-bold text-slate-700">{name}</span>
                                                </div>
                                            ))}
                                            {Object.keys(childWorkflow.outputVariables || {}).filter(([k]) => !k.startsWith('__')).length === 0 && (
                                                <div className="col-span-2 text-[10px] text-slate-400 italic">No output variables defined in child workflow.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Activity size={18} className="text-primary-600" />
                                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {isNestedWorkflow ? "Map Results to Parent" : "VARIABLES CONFIGURATION"}
                                        </h4>
                                    </div>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', background: '#eef2ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px' }}>
                                        Processed Top to Bottom
                                    </div>
                                </div>

                                <VariableManager 
                                    value={{ ...inheritedVars, ...outputVars }} 
                                    onChange={(newMerged) => {
                                        const onlyNew = { ...newMerged };
                                        Object.keys(inheritedVars).forEach(k => {
                                            if (k !== '__order' && k !== '__scopes') delete onlyNew[k];
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
                    
                    {activeTab === 'config' && (
                        <div className="space-y-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck size={18} className="text-primary-600" />
                                    <h4 className="text-[14px] font-extrabold text-[#333] uppercase tracking-wider">Sanity Gate Policies</h4>
                                </div>
                                <SanityCheckManager 
                                    value={sanityChecks} 
                                    onChange={setSanityChecks} 
                                    inherited={inheritedSanityChecks}
                                />
                            </div>
                            
                            {!isWorkflowNode && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4 mt-8">
                                        <List size={18} className="text-primary-600" />
                                        <h4 className="text-[14px] font-extrabold text-[#333] uppercase tracking-wider">Status Response Mappings</h4>
                                    </div>
                                    <StatusMappingManager value={statusMappings} onChange={setStatusMappings} />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'auth' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Lock size={18} className="text-blue-600" />
                                        <h4 className="text-[14px] font-extrabold text-blue-900 uppercase tracking-wider">Authentication Strategy</h4>
                                    </div>
                                    {isWorkflowNode && (
                                        <button 
                                            onClick={() => {
                                                setAuthOverride(!authOverride);
                                                if (authOverride && libAuth) {
                                                    setAuthType(libAuth.type || 'none');
                                                    // Reset fields to library values...
                                                }
                                            }}
                                            className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${authOverride ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}
                                        >
                                            {authOverride ? 'Custom Active' : 'Use Library Auth'}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    {['none', 'basic', 'bearer', 'jwt'].map((t: any) => (
                                        <button
                                            key={t}
                                            disabled={isWorkflowNode && !authOverride}
                                            onClick={() => setAuthType(t)}
                                            className={`py-3 rounded-xl border-2 font-black text-[11px] uppercase transition-all ${
                                                authType === t 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500'
                                            } ${isWorkflowNode && !authOverride ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`space-y-4 p-4 ${isWorkflowNode && !authOverride ? 'opacity-40 pointer-events-none' : ''}`}>
                                {authType === 'basic' && (
                                    <>
                                        <MaterialInput label="Username" value={basicAuthUser} onChange={setBasicAuthUser} enableVariables onRequestVariable={openVarPicker} availableVars={availableUpstreamVars} />
                                        <MaterialInput label="Password" type="password" value={basicAuthPassword} onChange={setBasicAuthPassword} enableVariables onRequestVariable={openVarPicker} availableVars={availableUpstreamVars} />
                                    </>
                                )}
                                {authType === 'bearer' && (
                                    <MaterialTextArea label="Bearer Token" value={bearerToken} onChange={setBearerToken} height="60px" mono enableVariables onRequestVariable={openVarPicker} availableVars={availableUpstreamVars} />
                                )}
                                {authType === 'jwt' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <MaterialSelect label="Algorithm" value={jwtAlgorithm} onChange={setJwtAlgorithm} options={['HS256', 'HS384', 'HS512', 'RS256']} />
                                            <MaterialInput label="Token Destination" value={jwtAddTo} onChange={setJwtAddTo} options={['header', 'query']} />
                                        </div>
                                        <MaterialTextArea label="Secret / Private Key" value={jwtSecret} onChange={setJwtSecret} height="100px" mono enableVariables onRequestVariable={openVarPicker} availableVars={availableUpstreamVars} />
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={jwtSecretIsBase64} onChange={e => setJwtSecretIsBase64(e.target.checked)} />
                                            <span className="text-xs font-bold text-gray-500 uppercase">Secret is Base64 encoded</span>
                                        </div>
                                        <MaterialTextArea label="Payload (JSON)" value={jwtPayload} onChange={setJwtPayload} height="150px" mono enableVariables onRequestVariable={openVarPicker} availableVars={availableUpstreamVars} />
                                    </div>
                                )}
                                {authType === 'none' && (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                        <Unlock size={48} className="mb-4 opacity-20" />
                                        <div className="text-xs font-black uppercase tracking-widest">Public Request (No Auth)</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '24px 32px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '24px', backgroundColor: 'white' }}>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#1976D2', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>CANCEL</button>
                    <button onClick={handleSave} style={{ backgroundColor: '#1976D2', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>SAVE</button>
                </div>
            </div>

            {pickerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999999 }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} onClick={() => setPickerOpen(false)} />
                    <VariablePicker 
                        onSelect={handleVarSelect} 
                        onClose={() => setPickerOpen(false)} 
                        localVars={[...Object.keys(outputVars || {}).filter(k => !k.startsWith('__')), ...(availableUpstreamVars || [])]}
                    />
                </div>
            )}

            <style>{`
                @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .material-label { position: absolute; top: -8px; left: 12px; background: white; padding: 0 4px; font-size: 11px; color: #999; font-weight: 500; z-index: 10; text-transform: uppercase; }
                .material-box { width: 100%; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 16px; font-size: 14px; outline: none; transition: border-color 0.2s; }
                .material-box:focus { border-color: #1976D2; }
            `}</style>
        </div>
    )
}

function SanityCheckManager({ value, onChange, inherited = [] }: { value: any[], onChange: (val: any[]) => void, inherited?: any[] }) {
    const [regex, setRegex] = useState('');
    const [condition, setCondition] = useState('MUST_CONTAIN');
    const [severity, setSeverity] = useState('ERROR');

    const handleAdd = () => {
        if (!regex) return;
        onChange([...(value || []), { regex, condition, severity }]);
        setRegex('');
    };

    const handleRemove = (idx: number) => {
        onChange((value || []).filter((_, i) => i !== idx));
    };

    const safeValue = Array.isArray(value) ? value : [];
    const safeInherited = Array.isArray(inherited) ? inherited : [];

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input 
                    placeholder="Regex e.g. success: true" 
                    value={regex} 
                    onChange={e => setRegex(e.target.value)} 
                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none"
                />
                <select value={condition} onChange={e => setCondition(e.target.value)} className="px-2 py-2 border rounded-lg text-xs font-bold bg-gray-50">
                    <option value="MUST_CONTAIN">MUST CONTAIN</option>
                    <option value="MUST_NOT_CONTAIN">MUST NOT</option>
                </select>
                <select value={severity} onChange={e => setSeverity(e.target.value)} className="px-2 py-2 border rounded-lg text-xs font-bold bg-gray-50">
                    <option value="ERROR">ERROR</option>
                    <option value="WARNING">WARNING</option>
                </select>
                <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-sm"><Plus size={16}/></button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {safeInherited.map((check, idx) => (
                    <div key={`inh-${idx}`} className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl opacity-70">
                        <div className="flex items-center gap-3">
                            <Library size={14} className="text-indigo-400" />
                            <div className="font-mono text-xs font-bold text-indigo-900">{check?.regex || 'N/A'}</div>
                        </div>
                        <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{check?.condition} • {check?.severity}</div>
                    </div>
                ))}
                {safeValue.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <div className="font-mono text-xs font-bold text-gray-700">{check?.regex || 'N/A'}</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{check?.condition} • {check?.severity}</div>
                            <button onClick={() => handleRemove(idx)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
                {safeValue.length === 0 && safeInherited.length === 0 && (
                    <div className="text-[11px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-50 rounded-xl">
                        No validation policies defined.
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusMappingManager({ value, onChange }: { value: any[], onChange: (val: any[]) => void }) {
    const [pattern, setPattern] = useState('');
    const [status, setStatus] = useState('SUCCESS');

    const handleAdd = () => {
        if (!pattern) return;
        onChange([...value, { pattern, status }]);
        setPattern('');
    };

    const handleRemove = (idx: number) => {
        onChange(value.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input 
                    placeholder="Code or Range e.g. 200-204, 404" 
                    value={pattern} 
                    onChange={e => setPattern(e.target.value)} 
                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none font-mono"
                />
                <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold bg-gray-50">
                    {['SUCCESS', 'FAILED', 'MAJOR', 'MINOR', 'WARNING', 'INFORMATION'].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-sm"><Plus size={16}/></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {value.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-xl group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-black text-gray-400">#</span>
                            <div className="text-xs font-bold text-gray-700">{m.pattern}</div>
                            <ArrowRight size={12} className="text-gray-300" />
                            <div className={`text-[10px] font-black uppercase ${
                                m.status === 'SUCCESS' ? 'text-green-600' :
                                m.status === 'FAILED' ? 'text-red-600' :
                                'text-orange-600'
                            }`}>{m.status}</div>
                        </div>
                        <button onClick={() => handleRemove(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label }: any) {
    return (
        <button onClick={onClick} style={{ flex: 1, padding: '16px 0', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: active ? '#1976D2' : '#999', borderBottom: active ? '2px solid #1976D2' : '2px solid transparent', cursor: 'pointer' }}>
            {label}
        </button>
    )
}

function MaterialInput({ label, value, onChange, placeholder, type = 'text', enableVariables = false, onRequestVariable, disabled = false, availableVars }: any) {
    const inputRef = useRef<any>(null);
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            {enableVariables ? (
                <div className="relative">
                    <VariableAwareInput ref={inputRef} value={value} onValueChange={onChange} placeholder={placeholder} type={type} disabled={disabled} availableVars={availableVars} />
                    <button onClick={() => onRequestVariable && onRequestVariable((val: string) => {
                        const el = inputRef.current;
                        if (el) {
                            const start = el.selectionStart || 0;
                            const end = el.selectionEnd || 0;
                            const newVal = (value || '').slice(0, start) + val + (value || '').slice(end);
                            onChange(newVal);
                            setTimeout(() => { el.focus(); el.setSelectionRange(start + val.length, start + val.length); }, 0);
                        } else onChange((value || '') + val);
                    })} disabled={disabled} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: disabled ? '#ccc' : '#1976D2', cursor: disabled ? 'default' : 'pointer', padding: '4px', zIndex: 10 }}>
                        <Zap size={14} fill="currentColor" />
                    </button>
                </div>
            ) : (
                <input ref={inputRef} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="material-box" style={{ opacity: disabled ? 0.6 : 1 }} />
            )}
        </div>
    )
}

function MaterialTextArea({ label, value, onChange, height = '100px', mono = false, placeholder = '', enableVariables, onRequestVariable, disabled = false, availableVars }: any) {
    const areaRef = useRef<any>(null);
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            {enableVariables ? (
                <div className="relative">
                    <VariableAwareInput ref={areaRef} isTextarea={true} value={value} onValueChange={onChange} placeholder={placeholder} style={{ minHeight: '46px', height }} disabled={disabled} availableVars={availableVars} />
                    <button onClick={() => onRequestVariable && onRequestVariable((val: string) => {
                        const el = areaRef.current;
                        if (el) {
                            const start = el.selectionStart || 0;
                            const end = el.selectionEnd || 0;
                            const newVal = (value || '').slice(0, start) + val + (value || '').slice(end);
                            onChange(newVal);
                            setTimeout(() => { el.focus(); el.setSelectionRange(start + val.length, start + val.length); }, 0);
                        } else onChange((value || '') + val);
                    })} disabled={disabled} style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'white', color: disabled ? '#ccc' : '#1976D2', cursor: disabled ? 'default' : 'pointer', padding: '4px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 10 }}>
                        <Zap size={14} fill="currentColor" />
                    </button>
                </div>
            ) : (
                <textarea ref={areaRef} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} style={{ height, minHeight: '46px', resize: 'vertical', fontFamily: mono ? 'monospace' : 'inherit', opacity: disabled ? 0.6 : 1 }} className="material-box" />
            )}
        </div>
    )
}

function MaterialSelect({ label, value, onChange, options, disabled = false }: any) {
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="material-box" style={{ fontWeight: 'bold', opacity: disabled ? 0.6 : 1 }}>
                {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    )
}
