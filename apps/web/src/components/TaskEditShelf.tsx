import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { useState, useEffect, useRef } from 'react'
// Output processing is now per-variable; top-level preview removed.
import { VariableManager } from './VariableManager';
import { X, AlertTriangle, Zap } from 'lucide-react'
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { useToast } from '../context/ToastContext';

interface Props {
    taskId?: string | null;
    nodeData?: any;
    availableUpstreamVars?: (string | { name: string, taskName: string })[];
    onClose: () => void;
    onSaveNode?: (data: any) => void;
}

export function TaskEditShelf({ taskId, nodeData, availableUpstreamVars, onClose, onSaveNode }: Props) {
    const queryClient = useQueryClient()
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'details' | 'config' | 'auth' | 'output'>('details')
    // Output Processing State (now handled per-variable)
    const [outputVars, setOutputVars] = useState<Record<string, any>>({});
    const [outputSpecYaml, setOutputSpecYaml] = useState<string>('');
    const [outputInputText, setOutputInputText] = useState<string>('');
    const [outputError, setOutputError] = useState<string | null>(null);
    const [previewResult, setPreviewResult] = useState<string | null>(null);
    const isEditing = !!taskId || !!nodeData
    const isUtility = !!nodeData

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
    const { data: task, isLoading: isTaskLoading } = useQuery({
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
        if (task && isEditing) {
            setName(task.name)
            setDescription(task.description || '')
            const cmd = (task as any).command || {}
            setUrl(cmd.url || '')
            setMethod(cmd.method || 'GET')
            setHeaders(JSON.stringify(cmd.headers || {}, null, 2))
            setBody(cmd.body || '')
            setTimeout(cmd.timeout || 30000)
            setTags(task.tags || [])
            setStatusMappings((task as any).statusMappings || [])
            setSanityChecks((task as any).sanityChecks || [])
            setGroupIds(((task as any).groups || []).map((g: any) => g.id))
            
            // Load authorization config
            const auth = cmd.authorization || {}
            setAuthType(auth.type || 'none')
            if (auth.type === 'basic') {
                setBasicAuthUser(auth.username || '')
                setBasicAuthPassword(auth.password || '')
            } else if (auth.type === 'bearer') {
                setBearerToken(auth.token || '')
            } else if (auth.type === 'jwt') {
                setJwtAlgorithm(auth.algorithm || 'HS256')
                setJwtSecret(auth.secret || '')
                setJwtSecretIsBase64(auth.secretIsBase64 || false)
                setJwtPayload(JSON.stringify(auth.payload || {}, null, 2))
                setJwtAddTo(auth.addTo || 'header')
            }
            
            try {
                const vars = (task as any).variableExtraction?.vars || (task as any).command?.outputProcessing?.vars || {};
                setOutputVars(vars || {});
            } catch (e) {
                // ignore parsing errors
            }
        }
        if (nodeData && isUtility) {
            setName(nodeData.label || 'Variables Manipulation')
            const vars = nodeData.variableExtraction?.vars || {};
            setOutputVars(vars);
            setActiveTab('output');
        }
    }, [task, nodeData, isEditing, isUtility])

    const handleSave = () => {
        try {
            if (isUtility && onSaveNode) {
                onSaveNode({
                    ...nodeData,
                    label: name,
                    variableExtraction: { vars: outputVars }
                });
                showToast('Variables saved successfully!', 'success');
                onClose();
                return;
            }

            // Build authorization config
            let authorization: any = { type: authType };
            if (authType === 'basic') {
                authorization.username = basicAuthUser;
                authorization.password = basicAuthPassword;
            } else if (authType === 'bearer') {
                authorization.token = bearerToken;
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

            const data = {
                name, description, method, url, 
                headers: JSON.parse(headers), 
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
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                            {isUtility ? 'VARIABLES MANIPULATION' : (taskId ? 'TASK FORM - EDIT MODE' : 'CREATE NEW TASK')}
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                        <X size={24} color="#999" />
                    </button>
                </div>

                {/* Warning Impact */}
                {isEditing && impact && impact.count > 0 && (
                    <div style={{ margin: '16px 32px 0 32px', padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} />
                        Warning: <b>{impact.count} workflows</b> use this task.
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
                            <MaterialInput label="Task Name" value={name} onChange={setName} />

                            <MaterialInput label="Task Description" value={description} onChange={setDescription} />
                            <div style={{ marginTop: 8 }}>
                                <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Tags</label>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {tags.map(t => (
                                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 16, backgroundColor: '#f3f4f6', fontSize: 12 }}>
                                            <span style={{ fontWeight: 700, color: '#111827' }}>{t}</span>
                                            <button onClick={() => setTags(tags.filter(x => x !== t))} style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                    <TagAdder onAdd={(v: string) => { if (v && !tags.includes(v)) setTags([...tags, v]) }} />
                                </div>
                            </div>
                            
                            <div style={{ marginTop: '-16px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Assign to Groups (Folders)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                    {groups?.map((g: any) => (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => {
                                                if (groupIds.includes(g.id)) setGroupIds(groupIds.filter(id => id !== g.id));
                                                else setGroupIds([...groupIds, g.id]);
                                            }}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                border: '1px solid #1976D2',
                                                backgroundColor: groupIds.includes(g.id) ? '#1976D2' : 'white',
                                                color: groupIds.includes(g.id) ? 'white' : '#1976D2',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {g.name}
                                        </button>
                                    ))}
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const name = prompt('Enter new folder name:');
                                            if (name) tasksApi.createGroup(name).then(() => queryClient.invalidateQueries({ queryKey: ['task-groups'] }));
                                        }}
                                        style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', border: '1px dotted #999', backgroundColor: 'transparent', color: '#999', cursor: 'pointer' }}
                                    >
                                        + NEW FOLDER
                                    </button>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <MaterialSelect label="HTTP Method" value={method} onChange={setMethod} options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH']} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <MaterialInput label="Timeout (ms)" value={timeout.toString()} onChange={(val: string) => setTimeout(Number(val))} type="number" />
                                </div>
                            </div>

                            <MaterialInput label="Endpoint URL" value={url} onChange={setUrl} placeholder="https://..." enableVariables onRequestVariable={openVarPicker} />
                            
                            <MaterialTextArea label="Request Headers (JSON)" value={headers} onChange={setHeaders} height="120px" mono enableVariables onRequestVariable={openVarPicker} />
                            
                            <MaterialTextArea label="Payload Content (Body)" value={body} onChange={setBody} height="160px" mono enableVariables onRequestVariable={openVarPicker} />

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
                                 <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Sanity Policies</h4>
                                 {sanityChecks.map((c, i) => (
                                     <div key={i} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '12px', marginBottom: '12px', backgroundColor: '#fafafa', position: 'relative' }}>
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
                                 <button onClick={() => setSanityChecks([...sanityChecks, { regex: '', condition: 'MUST_CONTAIN', severity: 'ERROR' }])} style={{ color: '#1976D2', fontSize: '12px', fontWeight: 'bold', border: 'none', background: 'transparent', cursor: 'pointer' }}>+ ADD POLICY</button>
                             </div>
                        </>
                    )}

                    {activeTab === 'auth' && (
                        <>
                            <div>
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
                                    value={outputVars} 
                                    onChange={setOutputVars} 
                                    usedNames={[]} 
                                    availableUpstreamVars={availableUpstreamVars} 
                                    forceWorkflowScope={isUtility}
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
}

function MaterialInput({ label, value, onChange, placeholder, type = 'text', enableVariables, onRequestVariable }: MaterialInputProps) {
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
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#1976D2', cursor: 'pointer', padding: '4px', zIndex: 10 }}
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
                    className="material-box"
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
    enableVariables?: boolean;
    onRequestVariable?: (cb: (val: string) => void) => void;
}

function MaterialTextArea({ label, value, onChange, height = '100px', mono = false, enableVariables, onRequestVariable }: MaterialTextAreaProps) {
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
                        style={{ minHeight: height }}
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
                        style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'white', color: '#1976D2', cursor: 'pointer', padding: '4px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 10 }}
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
                    style={{ height, resize: 'none', fontFamily: mono ? 'monospace' : 'inherit' }}
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
}

function MaterialSelect({ label, value, onChange, options }: MaterialSelectProps) {
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <select 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                className="material-box"
                style={{ fontWeight: 'bold' }}
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
