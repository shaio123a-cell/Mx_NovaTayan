import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { useState, useEffect } from 'react'
import { XformPreview } from '../shared-xform/xform_preview.react';
import { VariableManager } from './VariableManager';
import { X, AlertTriangle } from 'lucide-react'

interface Props {
    taskId?: string | null;
    onClose: () => void;
}

export function TaskEditShelf({ taskId, onClose }: Props) {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'details' | 'config' | 'output'>('details')
    // Output Processing State
    const [outputSpecYaml, setOutputSpecYaml] = useState('');
    const [outputInputText, setOutputInputText] = useState('');
    const [outputVars, setOutputVars] = useState<Record<string, any>>({});
    const [outputError, setOutputError] = useState<string | null>(null);
    const isEditing = !!taskId

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

    // Fetch existing data
    const { data: task, isLoading: isTaskLoading } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTask(taskId!),
        enabled: isEditing
    })

    const { data: groups } = useQuery({
        queryKey: ['task-groups'],
        queryFn: tasksApi.getGroups
    })

    const { data: impact } = useQuery({
        queryKey: ['task-impact', taskId],
        queryFn: () => tasksApi.getTaskImpact(taskId!),
        enabled: isEditing
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
        }
    }, [task, isEditing])

    const handleSave = () => {
        try {
            const data = {
                name, description, method, url, 
                headers: JSON.parse(headers), 
                body, timeout, tags, statusMappings, sanityChecks,
                groupIds
            }
            if (isEditing) tasksApi.updateTask(taskId!, data).then(() => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); onClose(); })
            else tasksApi.createTask(data).then(() => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); onClose(); })
        } catch (e) {
            alert('Invalid Headers JSON')
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
                            {isEditing ? 'TASK FORM - EDIT MODE' : 'CREATE NEW TASK'}
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
                    <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Properties" />
                    <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Validation" />
                    <TabButton active={activeTab === 'output'} onClick={() => setActiveTab('output')} label="Output Processing" />
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {activeTab === 'details' && (
                        <>
                            <MaterialInput label="Task Name" value={name} onChange={setName} />

                            <MaterialInput label="Task Description" value={description} onChange={setDescription} />
                            
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

                            <MaterialInput label="Endpoint URL" value={url} onChange={setUrl} placeholder="https://..." />
                            
                            <MaterialTextArea label="Request Headers (JSON)" value={headers} onChange={setHeaders} height="120px" mono />
                            
                            <MaterialTextArea label="Payload Content (Body)" value={body} onChange={setBody} height="160px" mono />

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
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '24px', backgroundColor: 'white' }}>
                    <button 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#1976D2', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}
                    >
                        CANCEL
                                            {activeTab === 'output' && (
                                                <div>
                                                    <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Output Processing</h4>
                                                    <label>Transformation Spec (YAML):</label>
                                                    <textarea
                                                        value={outputSpecYaml}
                                                        onChange={e => setOutputSpecYaml(e.target.value)}
                                                        rows={8}
                                                        style={{ width: '100%', fontFamily: 'monospace', marginBottom: 12 }}
                                                    />
                                                    <label>Sample Input Data:</label>
                                                    <textarea
                                                        value={outputInputText}
                                                        onChange={e => setOutputInputText(e.target.value)}
                                                        rows={4}
                                                        style={{ width: '100%', fontFamily: 'monospace', marginBottom: 12 }}
                                                    />
                                                    <VariableManager value={outputVars} onChange={setOutputVars} usedNames={[]} />
                                                    {outputError && <div style={{ color: 'red', marginBottom: 12 }}>{outputError}</div>}
                                                    <div style={{ marginTop: 24 }}>
                                                        <XformPreview
                                                            specYaml={outputSpecYaml}
                                                            inputText={outputInputText}
                                                            vars={outputVars}
                                                            limit={20}
                                                            onError={(e: Error) => setOutputError(e.message)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{ backgroundColor: '#1976D2', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                        SAVE TASK
                    </button>
                </div>
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

function MaterialInput({ label, value, onChange, placeholder, type = 'text' }: any) {
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <input 
                type={type} 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                placeholder={placeholder}
                className="material-box"
            />
        </div>
    )
}

function MaterialTextArea({ label, value, onChange, height = '100px', mono = false }: any) {
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <textarea 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                style={{ height, resize: 'none', fontFamily: mono ? 'monospace' : 'inherit' }}
                className="material-box"
            />
        </div>
    )
}

function MaterialSelect({ label, value, onChange, options }: any) {
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
