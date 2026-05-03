import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'
import React, { useState, useEffect, useRef } from 'react'
// Output processing is now per-variable; top-level preview removed.
import { VariableManager } from './VariableManager';
import { X, AlertTriangle, Zap, ShieldCheck, Lock, Unlock, Clock, FileText, List, Key, Plus, Trash2, Link2, ExternalLink, Info, Folder, Layers, Library, ArrowRight, Tag, Settings, Globe, ChevronDown, ChevronUp, Grid, HardDrive, Box, Activity, Sparkles, Loader2, GitBranch } from 'lucide-react'
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { useToast } from '../context/ToastContext';
import { TreeFolderPicker } from './TreeFolderPicker';

interface Props {
    taskId?: string | null;
    folderId?: string;
    nodeData?: any;
    availableUpstreamVars?: (string | { name: string, taskName: string, value?: any, source?: 'workflow' | 'task' | 'workflow_input' | 'workflow_output' })[];
    onClose: () => void;
    onSaveNode?: (data: any) => void;
}

// Icon mapping using Simple Icons CDN — reliable brand SVGs for thousands of companies
// Source: https://cdn.simpleicons.org/{slug}/{hex-color}
const ICON_MAPPING: Record<string, string> = {
    // ── Cloud Providers ───────────────────────────────────────────────────
    'aws':            'https://cdn.simpleicons.org/amazonaws/FF9900',
    'amazon':         'https://cdn.simpleicons.org/amazon/FF9900',
    'lambda':         'https://cdn.simpleicons.org/awslambda/FF9900',
    'ec2':            'https://cdn.simpleicons.org/amazonec2/FF9900',
    's3':             'https://cdn.simpleicons.org/amazons3/FF9900',
    'google cloud':   'https://cdn.simpleicons.org/googlecloud/4285F4',
    'gcp':            'https://cdn.simpleicons.org/googlecloud/4285F4',
    'google':         'https://cdn.simpleicons.org/google/4285F4',
    'azure':          'https://cdn.simpleicons.org/microsoftazure/0078D4',
    'microsoft':      'https://cdn.simpleicons.org/microsoft/5E5E5E',
    'ibm cloud':      'https://cdn.simpleicons.org/ibm/052FAD',
    'ibm':            'https://cdn.simpleicons.org/ibm/052FAD',
    'alibaba':        'https://cdn.simpleicons.org/alibabadotcom/FF6A00',
    'oracle cloud':   'https://cdn.simpleicons.org/oracle/F80000',
    'digitalocean':   'https://cdn.simpleicons.org/digitalocean/0080FF',
    'cloudflare':     'https://cdn.simpleicons.org/cloudflare/F38020',
    'heroku':         'https://cdn.simpleicons.org/heroku/430098',
    'vercel':         'https://cdn.simpleicons.org/vercel/000000',
    'netlify':        'https://cdn.simpleicons.org/netlify/00C7B7',

    // ── ERP / Business Apps ───────────────────────────────────────────────
    'sap':            'https://cdn.simpleicons.org/sap/0FAAFF',
    'bmc':            'https://cdn.simpleicons.org/bmcsoftware/FF2D9C',
    'bmc helix':      'https://cdn.simpleicons.org/bmcsoftware/FF2D9C',
    'helix':          'https://cdn.simpleicons.org/bmcsoftware/FF2D9C',
    'salesforce':     'https://cdn.simpleicons.org/salesforce/00A1E0',
    'servicenow':     'https://cdn.simpleicons.org/servicenow/62D84E',
    'workday':        'https://cdn.simpleicons.org/workday/FF7700',
    'netsuite':       'https://cdn.simpleicons.org/oracle/F80000',
    'hubspot':        'https://cdn.simpleicons.org/hubspot/FF7A59',
    'zendesk':        'https://cdn.simpleicons.org/zendesk/03363D',
    'freshservice':   'https://cdn.simpleicons.org/freshworks/29B5E8',
    'freshworks':     'https://cdn.simpleicons.org/freshworks/29B5E8',
    'zoho':           'https://cdn.simpleicons.org/zoho/E42527',
    'dynamics':       'https://cdn.simpleicons.org/microsoftdynamics365/002050',

    // ── Microsoft Suite ───────────────────────────────────────────────────
    'teams':          'https://cdn.simpleicons.org/microsoftteams/6264A7',
    'sharepoint':     'https://cdn.simpleicons.org/microsoftsharepoint/0078D4',
    'excel':          'https://cdn.simpleicons.org/microsoftexcel/217346',
    'word':           'https://cdn.simpleicons.org/microsoftword/2B579A',
    'outlook':        'https://cdn.simpleicons.org/microsoftoutlook/0078D4',
    'onedrive':       'https://cdn.simpleicons.org/microsoftonedrive/0078D4',
    'powerbi':        'https://cdn.simpleicons.org/powerbi/F2C811',
    'power automate': 'https://cdn.simpleicons.org/microsoftpowerautomate/0078D4',
    'office':         'https://cdn.simpleicons.org/microsoftoffice/D83B01',

    // ── Databases ─────────────────────────────────────────────────────────
    'oracle':         'https://cdn.simpleicons.org/oracle/F80000',
    'mysql':          'https://cdn.simpleicons.org/mysql/4479A1',
    'sql':            'https://cdn.simpleicons.org/microsoftsqlserver/CC2927',
    'mssql':          'https://cdn.simpleicons.org/microsoftsqlserver/CC2927',
    'postgres':       'https://cdn.simpleicons.org/postgresql/4169E1',
    'postgresql':     'https://cdn.simpleicons.org/postgresql/4169E1',
    'mongodb':        'https://cdn.simpleicons.org/mongodb/47A248',
    'redis':          'https://cdn.simpleicons.org/redis/FF4438',
    'elasticsearch':  'https://cdn.simpleicons.org/elasticsearch/005571',
    'cassandra':      'https://cdn.simpleicons.org/apachecassandra/1287B1',
    'snowflake':      'https://cdn.simpleicons.org/snowflake/29B5E8',
    'databricks':     'https://cdn.simpleicons.org/databricks/FF3621',
    'neo4j':          'https://cdn.simpleicons.org/neo4j/4581C3',
    'cockroachdb':    'https://cdn.simpleicons.org/cockroachlabs/6933FF',

    // ── DevOps / Source Control ───────────────────────────────────────────
    'github':         'https://cdn.simpleicons.org/github/181717',
    'gitlab':         'https://cdn.simpleicons.org/gitlab/FC6D26',
    'bitbucket':      'https://cdn.simpleicons.org/bitbucket/0052CC',
    'jenkins':        'https://cdn.simpleicons.org/jenkins/D24939',
    'docker':         'https://cdn.simpleicons.org/docker/2496ED',
    'kubernetes':     'https://cdn.simpleicons.org/kubernetes/326CE5',
    'terraform':      'https://cdn.simpleicons.org/terraform/7B42BC',
    'ansible':        'https://cdn.simpleicons.org/ansible/EE0000',
    'helm':           'https://cdn.simpleicons.org/helm/0F1689',
    'argocd':         'https://cdn.simpleicons.org/argo/EF7B4D',
    'circleci':       'https://cdn.simpleicons.org/circleci/343434',
    'github actions': 'https://cdn.simpleicons.org/githubactions/2088FF',

    // ── Messaging / Collaboration ─────────────────────────────────────────
    'slack':          'https://cdn.simpleicons.org/slack/4A154B',
    'jira':           'https://cdn.simpleicons.org/jira/0052CC',
    'confluence':     'https://cdn.simpleicons.org/confluence/172B4D',
    'trello':         'https://cdn.simpleicons.org/trello/0052CC',
    'notion':         'https://cdn.simpleicons.org/notion/000000',
    'asana':          'https://cdn.simpleicons.org/asana/F06A6A',
    'monday':         'https://cdn.simpleicons.org/mondaydotcom/F62B54',
    'zoom':           'https://cdn.simpleicons.org/zoom/2D8CFF',
    'webex':          'https://cdn.simpleicons.org/webex/00BEF2',
    'mattermost':     'https://cdn.simpleicons.org/mattermost/0058CC',
    'discord':        'https://cdn.simpleicons.org/discord/5865F2',
    'telegram':       'https://cdn.simpleicons.org/telegram/26A5E4',

    // ── Monitoring / Observability ────────────────────────────────────────
    'datadog':        'https://cdn.simpleicons.org/datadog/632CA6',
    'grafana':        'https://cdn.simpleicons.org/grafana/F46800',
    'prometheus':     'https://cdn.simpleicons.org/prometheus/E6522C',
    'splunk':         'https://cdn.simpleicons.org/splunk/000000',
    'dynatrace':      'https://cdn.simpleicons.org/dynatrace/1496FF',
    'newrelic':       'https://cdn.simpleicons.org/newrelic/008C99',
    'pagerduty':      'https://cdn.simpleicons.org/pagerduty/06AC38',
    'opsgenie':       'https://cdn.simpleicons.org/opsgenie/172B4D',
    'elastic':        'https://cdn.simpleicons.org/elastic/005571',

    // ── Security ──────────────────────────────────────────────────────────
    'palo alto':      'https://cdn.simpleicons.org/paloaltonetworks/FA582D',
    'fortinet':       'https://cdn.simpleicons.org/fortinet/EE3124',
    'crowdstrike':    'https://cdn.simpleicons.org/crowdstrike/E84B26',
    'okta':           'https://cdn.simpleicons.org/okta/007DC1',
    'auth0':          'https://cdn.simpleicons.org/auth0/EB5424',
    'hashicorp':      'https://cdn.simpleicons.org/hashicorp/000000',
    'vault':          'https://cdn.simpleicons.org/vault/FFEC6E',
    'snyk':           'https://cdn.simpleicons.org/snyk/4C4A73',

    // ── Data / Analytics / AI ─────────────────────────────────────────────
    'tableau':        'https://cdn.simpleicons.org/tableau/E97627',
    'kafka':          'https://cdn.simpleicons.org/apachekafka/231F20',
    'airflow':        'https://cdn.simpleicons.org/apacheairflow/017CEE',
    'spark':          'https://cdn.simpleicons.org/apachespark/E25A1C',
    'openai':         'https://cdn.simpleicons.org/openai/412991',
    'huggingface':    'https://cdn.simpleicons.org/huggingface/FFD21E',

    // ── Networking / CDN / API / Payments ─────────────────────────────────
    'nginx':          'https://cdn.simpleicons.org/nginx/009639',
    'rabbitmq':       'https://cdn.simpleicons.org/rabbitmq/FF6600',
    'kong':           'https://cdn.simpleicons.org/kong/003459',
    'twilio':         'https://cdn.simpleicons.org/twilio/F22F46',
    'sendgrid':       'https://cdn.simpleicons.org/sendgrid/51A9E3',
    'stripe':         'https://cdn.simpleicons.org/stripe/635BFF',
    'paypal':         'https://cdn.simpleicons.org/paypal/003087',

    // ── Storage ───────────────────────────────────────────────────────────
    'dropbox':        'https://cdn.simpleicons.org/dropbox/0061FF',
    'box':            'https://cdn.simpleicons.org/box/0061D5',
    's3 bucket':      'https://cdn.simpleicons.org/amazons3/FF9900',
};

function normalizeSlug(name: string): string {
    return name.toLowerCase()
        .replace(/\.com$/i, '')
        .replace(/\s+/g, '')              
        .replace(/[^\w]/g, '');           
}

function getEffectiveIcon(nameStr: string) {
    const name = nameStr.toLowerCase();
    
    // 1. Check manual mapping
    const sorted = Object.keys(ICON_MAPPING).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (name.includes(key)) return ICON_MAPPING[key];
    }
    
    // 2. Fallback to normalized slug (only for longer, more likely unique slugs)
    const slug = normalizeSlug(name);
    if (slug.length > 2) return `https://cdn.simpleicons.org/${slug}`;
    
    return null;
}

export function TaskEditShelf({ taskId, folderId, nodeData, availableUpstreamVars, onClose, onSaveNode }: Props) {
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
    const isIfNode = nodeData?.taskType === 'IF' || taskId === 'util-if'
    const isUtility = nodeData?.taskType === 'VARIABLE' || taskId === '00000000-0000-0000-0000-000000000001' || taskId === 'util-vars'
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({ headers: true, payload: true, meta: false });
    const toggleAccordion = (key: string) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
    const initializedRef = React.useRef<string | null>(null);

    // IF Node State
    const [conditionGroups, setConditionGroups] = useState<any[]>(nodeData?.conditionGroups || [{ 
        logicalOperator: 'AND', 
        conditions: [{ variable: '', operator: '==', value: '' }] 
    }])

    // Nested Workflow State
    const [inputMapping, setInputMapping] = useState<Record<string, any>>({})

    // Form State
    const [name, setName] = useState('')
    const [nameIconError, setNameIconError] = useState(false);
    const resolvedIcon = getEffectiveIcon(name);
    useEffect(() => { setNameIconError(false); }, [resolvedIcon]);
    const [description, setDescription] = useState('')
    const [method, setMethod] = useState('GET')
    const [url, setUrl] = useState('')
    const [headers, setHeaders] = useState<string>('{}')
    const [body, setBody] = useState<string>('')
    const [timeout, setTimeout] = useState<number>(30000)
    const [tags, setTags] = useState<string[]>([])
    const [statusMappings, setStatusMappings] = useState<any[]>([])
    const [sanityChecks, setSanityChecks] = useState<any[]>([])
    const [targetFolderId, setTargetFolderId] = useState<string | undefined>(folderId)
    
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

    // AI Copilot State
    const [aiMode, setAiMode] = useState(false);
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string, sources?: {title: string, url: string}[]}[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [aiDocs, setAiDocs] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatHistory, isGenerating]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + 'px';
        }
    }, [aiDocs, aiMode]);

    const handleAiGenerate = async () => {
        if (!aiDocs.trim()) {
            showToast('Please paste some documentation first.', 'error');
            return;
        }
        const userMessage = aiDocs;
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setAiDocs('');
        setIsGenerating(true);
        try {
            let safeHeaders = {};
            try { safeHeaders = JSON.parse(headers); } catch {}
            
            const response = await fetch('/api/ai/generate-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    documentation: userMessage,
                    currentState: { name, description, command: { method, url, headers: safeHeaders, body } },
                    chatHistory: chatHistory 
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Generation failed');
            }

            const responseData = await response.json();
            const data = responseData.task || responseData; // Fallback in case raw object is returned

            if (data.name) setName(data.name);
            if (data.description) setDescription(data.description);
            if (data.command?.method) setMethod(data.command.method);
            if (data.command?.url) setUrl(data.command.url);
            if (data.command?.body) setBody(data.command.body);
            if (data.command?.headers) {
                 const rawH = data.command.headers;
                 setKvHeaders(Object.entries(rawH).map(([k,v]) => ({ key: k, value: String(v) })));
                 setHeadersOverride(true);
                 setHeaders(JSON.stringify(rawH, null, 2));
            }
            if (data.variableExtraction) {
                 const newVars: Record<string, any> = { ...outputVars };
                 data.variableExtraction.forEach((ve: any) => {
                     newVars[ve.variableName] = { 
                         valueMode: 'transformer',
                         transformer: {
                             type: ve.type || 'jmespath',
                             spec: ve.spec || ve.path || '',
                             inputSource: 'task_output',
                             inputVariable: ''
                         }
                     };
                 });
                 setOutputVars(newVars);
                 setActiveTab('output');
            } else {
                 setActiveTab('details');
            }

            if (responseData.explanation) {
                 setChatHistory(prev => [...prev, { role: 'assistant', content: responseData.explanation, sources: responseData.sources }]);
            }
            
            showToast('Task draft successfully generated/updated!', 'success');
        } catch (error: any) {
            showToast(error.message || 'AI Generation Failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const openVarPicker = (cb: (v: string) => void) => {
        setPickerCallback(() => cb);
        setPickerOpen(true);
    };

    const handleVarSelect = (val: string) => {
        if (pickerCallback) pickerCallback(val);
        setPickerOpen(false);
    };

    const { data: task, isLoading: isTaskLoading, isFetching: isTaskFetching } = useQuery<any>({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTask(taskId!),
        enabled: !!taskId && !isNestedWorkflow && !isUtility && !isIfNode && !taskId.toString().startsWith('util-')
    })

    const { data: childWorkflow, isLoading: isChildWfLoading, isFetching: isChildWfFetching } = useQuery({
        queryKey: ['workflow', taskId],
        queryFn: () => workflowsApi.getWorkflow(taskId!),
        enabled: !!taskId && isNestedWorkflow
    })

    const { data: folders } = useQuery<any[]>({
        queryKey: ['task-folders'],
        queryFn: () => tasksApi.getFolderTree()
    })

    const { data: impact } = useQuery({
        queryKey: ['task-impact', taskId],
        queryFn: () => tasksApi.getTaskImpact(taskId!),
        enabled: !!taskId && !isNestedWorkflow && !isUtility && !isIfNode && !taskId.toString().startsWith('util-')
    })

    // Auto-switch tabs
    useEffect(() => {
        if (isIfNode) {
            setActiveTab('details');
        } else if (isUtility) {
            setActiveTab('output');
        } else if (isNestedWorkflow) {
            setActiveTab('details');
        }
    }, [isUtility, isNestedWorkflow, isIfNode])

    // Initialization
    useEffect(() => {
        const targetData = isNestedWorkflow ? childWorkflow : task;
        const currentSessionId = nodeData?.id || taskId;

        if (!targetData && !isUtility && !isIfNode) {
            initializedRef.current = null;
            // Set folder if creating new
            if (!taskId && !nodeData && folderId && !isIfNode) {
                setTargetFolderId(folderId);
            }
            return;
        }

        if (isTaskFetching || isChildWfFetching) return;
        if (initializedRef.current === currentSessionId) return;
        initializedRef.current = currentSessionId;

        if (isIfNode && nodeData) {
            setName(nodeData.label || 'Conditional Branch')
            setDescription(nodeData.description || '')
            setConditionGroups(nodeData.conditionGroups || [{ 
                logicalOperator: 'AND', 
                conditions: [{ variable: '', operator: '==', value: '' }] 
            }])
            setInheritedVars({});
            setInheritedSanityChecks([]);
        } else if (isUtility && nodeData) {
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
                if (nodeData.label) setName(nodeData.label);
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

            setTargetFolderId((task as any).folderId);
            
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
    }, [task, childWorkflow, nodeData, isEditing, isUtility, isWorkflowNode, isNestedWorkflow, isTaskFetching, isChildWfFetching, taskId, folderId])

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
                    taskType: isIfNode ? 'IF' : (isNestedWorkflow ? 'WORKFLOW' : (isUtility ? 'VARIABLE' : (task?.taskType || 'HTTP'))),
                    inputMapping: isNestedWorkflow ? inputMapping : undefined,
                    variableExtraction: { vars: outputVars },
                    sanityChecks,
                    authorization: authOverride ? authorization : undefined,
                    timeout: timeoutOverride ? timeout : undefined,
                    method: isIfNode ? 'IF' : (methodOverride ? method : (isNestedWorkflow ? 'WF' : undefined)),
                    url: urlOverride ? url : undefined,
                    body: bodyOverride ? body : undefined,
                    headers: headersOverride ? finalHeaders : undefined,
                    targetTags: overlayTags.length > 0 ? overlayTags : undefined,
                    conditionGroups: isIfNode ? conditionGroups : undefined
                });
                showToast(isIfNode ? 'Branch logic saved!' : (isUtility ? 'Variables saved successfully!' : 'Workflow node updated!'), 'success');
                onClose();
                return;
            }

            const data = {
                name, description, method, url, 
                headers: finalHeaders, 
                body, timeout, tags, statusMappings, sanityChecks,
                folderId: targetFolderId, authorization,
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
                    width: '1000px', 
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    background: '#f9fafb', 
                                    borderRadius: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    border: '1px solid #e5e7eb',
                                    flexShrink: 0,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    {getEffectiveIcon(name) && !nameIconError ? (
                                        <img 
                                            src={getEffectiveIcon(name)!} 
                                            style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
                                            alt="preview" 
                                            onError={() => setNameIconError(true)}
                                        />
                                    ) : (
                                        isIfNode ? <GitBranch size={18} className="text-amber-500" /> :
                                        isUtility ? <Zap size={18} className="text-yellow-400" fill="currentColor" /> :
                                        isNestedWorkflow ? <Layers size={18} className="text-indigo-400" /> :
                                        <Activity size={18} className="text-slate-400" />
                                    )}
                                </div>
                                <input 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)}
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
                                    placeholder={isUtility ? "Utility Task Name" : (isNestedWorkflow ? "Workflow Node Label" : "Task Label")}
                                />
                                {isWorkflowNode && !isUtility && (
                                    <span style={{ fontSize: '10px', background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #c7d2fe', whiteSpace: 'nowrap' }}>
                                        Node Instance
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: isIfNode ? '#f59e0b' : (isUtility ? '#4f46e5' : '#9ca3af'), marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                {isIfNode ? 'Conditional Branch Engine' : (isUtility ? 'VARIABLES MANIPULATION' : (isNestedWorkflow ? 'NESTED WORKFLOW OVERLAY' : (isWorkflowNode ? 'NODE OVERLAY CONFIG' : 'LIBRARY TASK TEMPLATE')))}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
                        {!isUtility && !isNestedWorkflow && !isIfNode && (
                            <button 
                                onClick={() => setAiMode(!aiMode)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${aiMode ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'} border border-purple-200 shadow-sm`}
                            >
                                <Sparkles size={16} className={isGenerating ? "animate-pulse" : ""} />
                                {aiMode ? 'Close Copilot' : 'AI Generate'}
                            </button>
                        )}
                        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                            <X size={24} color="#999" />
                        </button>
                    </div>
                </div>

                {aiMode && (
                    <div className="mx-8 mt-4 p-4 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col h-[400px]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-black text-purple-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-purple-500" />
                                Interactive Copilot
                            </h3>
                            <button onClick={() => setAiMode(false)} className="text-purple-400 hover:text-purple-600 transition-colors"><X size={16}/></button>
                        </div>
                        
                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto mb-3 space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50 shadow-inner">
                             {chatHistory.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <Sparkles size={24} className="text-purple-300 mb-2" />
                                    <div className="text-xs text-purple-700 font-bold mb-1">How can I help you build this task?</div>
                                    <div className="text-[10px] text-purple-500 max-w-xs leading-relaxed">Paste API documentation, curl commands, or just ask me to set up an endpoint using plain English!</div>
                                </div>
                             )}
                             {chatHistory.map((msg, i) => (
                                 <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-1`}>
                                     <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-sm border border-purple-700' : 'bg-white text-purple-900 border border-purple-200 rounded-tl-sm'}`}>
                                         {msg.content}
                                     </div>
                                     {msg.sources && msg.sources.length > 0 && (
                                         <div className="flex gap-2 mt-1.5 max-w-[85%] flex-wrap">
                                             {msg.sources.map((s, idx) => (
                                                 <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] font-bold bg-white text-purple-600 hover:text-purple-700 hover:bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full shadow-sm transition-all whitespace-nowrap">
                                                     <Link2 size={10} />
                                                     {s.title}
                                                     <ExternalLink size={8} className="translate-y-[0.5px]" />
                                                 </a>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             ))}
                             {isGenerating && (
                                 <div className="flex justify-start animate-in fade-in zoom-in duration-300">
                                     <div className="bg-white text-purple-500 p-3 rounded-2xl border border-purple-200 rounded-tl-sm text-xs font-bold flex items-center gap-2 shadow-sm">
                                         <Loader2 size={14} className="animate-spin"/> Crafting changes...
                                     </div>
                                 </div>
                             )}
                        </div>
                        <div className="flex gap-2 items-end">
                            <textarea 
                                ref={textareaRef}
                                value={aiDocs}
                                onChange={(e) => setAiDocs(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate(); }
                                }}
                                placeholder="Message Copilot... (Press Enter to send)"
                                className="flex-1 min-h-[44px] py-[10px] px-4 bg-white border border-purple-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none shadow-sm transition-all overflow-y-auto"
                                disabled={isGenerating}
                            />
                            <button 
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !aiDocs.trim()}
                                className="flex items-center justify-center shrink-0 w-11 h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid #eee', marginTop: '16px' }}>
                    {!isUtility && !isNestedWorkflow && !isIfNode && <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Properties" />}
                    {isIfNode && <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Branching Logic" />}
                    {!isUtility && !isNestedWorkflow && !isIfNode && <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Validation" />}
                    {!isUtility && !isNestedWorkflow && !isIfNode && <TabButton active={activeTab === 'auth'} onClick={() => setActiveTab('auth')} label="Authorization" />}
                    {isNestedWorkflow && <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Input Mapping" />}
                    {!isIfNode && (
                        <TabButton 
                            active={activeTab === 'output'} 
                            onClick={() => setActiveTab('output')} 
                            label={isUtility ? "Manipulations" : isNestedWorkflow ? "Output Mapping" : "Output Processing"} 
                        />
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden no-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {impact && impact.count > 0 && !isWorkflowNode && (
                        <div className="mb-0 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-amber-800 uppercase tracking-tighter">Shared Library Warning</h4>
                                    <button 
                                        onClick={() => setShowImpactList(!showImpactList)}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-100/50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-all"
                                    >
                                        {showImpactList ? 'HIDE LIST' : 'VIEW LIST'}
                                        {showImpactList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                </div>
                                <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                                    This task is actively used in <span className="font-bold">{impact.count} workflows</span>. 
                                    Significant interface changes (renaming variables, changing extraction logic) <span className="underline">will impact or even break</span> dependent processes.
                                </p>

                                {showImpactList && impact.workflows && (
                                    <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Parent Workflows:</div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {impact.workflows.map((wf: any) => (
                                                <a 
                                                    key={wf.id}
                                                    href={`/designer?id=${wf.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center justify-between p-2.5 bg-white/50 border border-amber-200/50 rounded-xl hover:bg-white hover:border-amber-300 transition-all"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                                                        <span className="text-xs font-bold text-amber-900 line-clamp-1">{wf.name}</span>
                                                    </div>
                                                    <ExternalLink size={10} className="text-amber-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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

                            {isIfNode && (
                                <div className="space-y-6">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <GitBranch size={18} className="text-amber-500" />
                                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            CONDITIONAL LOGIC ENGINE
                                        </h4>
                                    </div>
                                    
                                    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6">
                                        <ConditionBuilder 
                                            groups={conditionGroups}
                                            onChange={setConditionGroups}
                                            availableVars={availableUpstreamVars}
                                            onRequestVariable={openVarPicker}
                                        />
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400">
                                                <Info size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-tight">Branch Routing Instructions</p>
                                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                                    If the conditions above evaluate to <span className="text-green-600 font-black">TRUE</span>, the execution will follow the <span className="font-bold underline">THEN</span> path. 
                                                    Otherwise, it will follow the <span className="text-red-600 font-black">ELSE</span> path. 
                                                    You can also attach an <span className="font-bold italic">ALWAYS</span> path for shared post-logic.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isNestedWorkflow && !isIfNode && (
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
                                                        expandable
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
                                                                <VariableAwareInput 
                                                                    placeholder="Key" 
                                                                    value={h.key} 
                                                                    onValueChange={val => {
                                                                        const newH = [...kvHeaders];
                                                                        newH[i].key = val;
                                                                        setKvHeaders(newH);
                                                                    }}
                                                                    availableVars={availableUpstreamVars}
                                                                    onInsertClick={() => openVarPicker()}
                                                                    disabled={isWorkflowNode && !headersOverride}
                                                                    style={{ fontSize: '14px', border: 'none', background: 'transparent' }}
                                                                />
                                                                <div className="w-[1px] h-4 bg-slate-200" />
                                                                <VariableAwareInput 
                                                                    placeholder="Value" 
                                                                    value={h.value} 
                                                                    onValueChange={val => {
                                                                        const newH = [...kvHeaders];
                                                                        newH[i].value = val;
                                                                        setKvHeaders(newH);
                                                                    }}
                                                                    availableVars={availableUpstreamVars}
                                                                    onInsertClick={() => openVarPicker()}
                                                                    disabled={isWorkflowNode && !headersOverride}
                                                                    style={{ fontSize: '14px', border: 'none', background: 'transparent' }}
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
                                                    <div className="flex justify-end mb-3">
                                                        <button 
                                                            disabled={isWorkflowNode ? !bodyOverride : false}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                try {
                                                                    const parsed = JSON.parse(body);
                                                                    setBody(JSON.stringify(parsed, null, 4));
                                                                } catch(err) {
                                                                    showToast('Invalid JSON. Cannot beautify.', 'error');
                                                                }
                                                            }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                                (isWorkflowNode && !bodyOverride)
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 cursor-pointer'
                                                            }`}
                                                        >
                                                            <Sparkles size={12} /> Format JSON
                                                        </button>
                                                    </div>
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

                                                <div className="space-y-4">
                                                    {!isWorkflowNode && (
                                                        <div className="relative">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <label className="material-label">Task Folder Destination</label>
                                                                <div className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">Library Hierarchy</div>
                                                            </div>
                                                            <div className="space-y-2 mt-2">
                                                                <TreeFolderPicker 
                                                                    value={targetFolderId} 
                                                                    onChange={setTargetFolderId}
                                                                    folderTree={folders || []}
                                                                    type="task"
                                                                />
                                                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                                                                    <Info size={12} className="text-slate-400" />
                                                                    <span className="text-[10px] text-slate-500 font-medium">Tasks can be moved between folders at any time.</span>
                                                                </div>
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
                                            if (k !== '__order' && k !== '__scopes') {
                                                if (JSON.stringify(newMerged[k]) === JSON.stringify(inheritedVars[k])) {
                                                    delete onlyNew[k];
                                                }
                                            }
                                        });
                                        setOutputVars(onlyNew);
                                    }} 
                                    inheritedNames={Object.keys(inheritedVars)}
                                    overriddenNames={Object.keys(outputVars).filter(k => Object.keys(inheritedVars).includes(k))}
                                    onResetOverride={(name) => {
                                        const current = { ...outputVars };
                                        delete current[name];
                                        setOutputVars(current);
                                    }}
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

function SanityCheckManager({ value, onChange, inherited = [], availableVars = [], onRequestVariable }: { value: any[], onChange: (val: any[]) => void, inherited?: any[], availableVars?: any[], onRequestVariable?: () => void }) {
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
                <VariableAwareInput 
                    placeholder="Regex e.g. success: true" 
                    value={regex} 
                    onValueChange={setRegex} 
                    availableVars={availableVars}
                    onInsertClick={onRequestVariable}
                    style={{ fontSize: '14px' }}
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

function StatusMappingManager({ value, onChange, availableVars = [], onRequestVariable }: { value: any[], onChange: (val: any[]) => void, availableVars?: any[], onRequestVariable?: () => void }) {
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
                <VariableAwareInput 
                    placeholder="Code or Range e.g. 200-204, 404" 
                    value={pattern} 
                    onValueChange={setPattern} 
                    availableVars={availableVars}
                    onInsertClick={onRequestVariable}
                    style={{ fontSize: '14px' }}
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

function ConditionBuilder({ groups, onChange, availableVars, onRequestVariable }: any) {
    const addGroup = () => {
        onChange([...groups, { logicalOperator: 'AND', conditions: [{ variable: '', operator: '==', value: '' }] }]);
    };

    const removeGroup = (index: number) => {
        onChange(groups.filter((_: any, i: number) => i !== index));
    };

    const updateGroup = (index: number, newGroup: any) => {
        const next = [...groups];
        next[index] = newGroup;
        onChange(next);
    };

    return (
        <div className="space-y-6">
            {groups.map((group: any, idx: number) => (
                <div key={idx} className="relative">
                    {idx > 0 && (
                        <div className="flex items-center justify-center my-4">
                            <div className="h-[1px] bg-amber-200 flex-1" />
                            <div className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg border border-amber-200 mx-4">
                                OR
                            </div>
                            <div className="h-[1px] bg-amber-200 flex-1" />
                        </div>
                    )}
                    <div className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase tracking-widest border border-slate-200">Group #{idx + 1}</div>
                                <select 
                                    className="text-[10px] font-bold bg-amber-50 text-amber-700 border-none outline-none rounded p-1"
                                    value={group.logicalOperator}
                                    onChange={(e) => updateGroup(idx, { ...group, logicalOperator: e.target.value })}
                                >
                                    <option value="AND">ALL (AND)</option>
                                    <option value="OR">ANY (OR)</option>
                                </select>
                            </div>
                            {groups.length > 1 && (
                                <button onClick={() => removeGroup(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            {group.conditions.map((cond: any, cidx: number) => (
                                <div key={cidx} className="flex gap-2 items-center group/cond">
                                    <div className="flex-1">
                                        <MaterialInput 
                                            placeholder="Variable (e.g. {{resp.status}})"
                                            value={cond.variable}
                                            onChange={(v: string) => {
                                                const nextC = group.conditions.map((c: any, i: number) => i === cidx ? { ...c, variable: v } : c);
                                                updateGroup(idx, { ...group, conditions: nextC });
                                            }}
                                            enableVariables
                                            onRequestVariable={onRequestVariable}
                                            availableVars={availableVars}
                                        />
                                    </div>
                                    <select 
                                        className="w-24 h-[44px] bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-amber-400"
                                        value={cond.operator}
                                        onChange={(e) => {
                                            const nextC = group.conditions.map((c: any, i: number) => i === cidx ? { ...c, operator: e.target.value } : c);
                                            updateGroup(idx, { ...group, conditions: nextC });
                                        }}
                                    >
                                        <option value="==">==</option>
                                        <option value="!=">!=</option>
                                        <option value=">">{">"}</option>
                                        <option value=">=">{">="}</option>
                                        <option value="<">{"<"}</option>
                                        <option value="<=">{"<="}</option>
                                        <option value="contains">contains</option>
                                        <option value="regex">regex</option>
                                        <option value="exists">exists</option>
                                    </select>
                                    <div className="flex-1">
                                        <MaterialInput 
                                            placeholder="Value"
                                            value={cond.value}
                                            onChange={(v: string) => {
                                                const nextC = group.conditions.map((c: any, i: number) => i === cidx ? { ...c, value: v } : c);
                                                updateGroup(idx, { ...group, conditions: nextC });
                                            }}
                                            enableVariables
                                            onRequestVariable={onRequestVariable}
                                            availableVars={availableVars}
                                        />
                                    </div>
                                    <button 
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/cond:opacity-100"
                                        onClick={() => {
                                            const nextC = group.conditions.filter((_: any, i: number) => i !== cidx);
                                            if (nextC.length > 0) updateGroup(idx, { ...group, conditions: nextC });
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => {
                                const nextC = [...group.conditions, { variable: '', operator: '==', value: '' }];
                                updateGroup(idx, { ...group, conditions: nextC });
                            }}
                            className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-all uppercase tracking-tight"
                        >
                            <Plus size={12} /> Add Condition
                        </button>
                    </div>
                </div>
            ))}

            <button 
                onClick={addGroup}
                className="w-full py-4 border-2 border-dashed border-amber-200 rounded-2xl text-amber-500 hover:bg-amber-50/50 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
                <Plus size={16} /> New OR Group
            </button>
        </div>
    );
}

function MaterialInput({ label, value, onChange, placeholder, type = 'text', enableVariables = false, onRequestVariable, disabled = false, availableVars, expandable = false }: any) {
    const inputRef = useRef<any>(null);
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <div className="relative">
                <VariableAwareInput 
                    ref={inputRef} 
                    expandable={expandable}
                    value={value} 
                    onValueChange={onChange} 
                    placeholder={placeholder} 
                    type={type} 
                    disabled={disabled} 
                    availableVars={availableVars} 
                    onInsertClick={enableVariables ? () => onRequestVariable?.((val: string) => {
                        const el = inputRef.current;
                        if (el) {
                            const start = el.selectionStart || 0;
                            const end = el.selectionEnd || 0;
                            const newVal = (value || '').slice(0, start) + val + (value || '').slice(end);
                            onChange(newVal);
                            setTimeout(() => { el.focus(); el.setSelectionRange(start + val.length, start + val.length); }, 0);
                        } else onChange((value || '') + val);
                    }) : undefined}
                />
            </div>
        </div>
    )
}

function MaterialTextArea({ label, value, onChange, height = '100px', mono = false, placeholder = '', enableVariables, onRequestVariable, disabled = false, availableVars }: any) {
    const areaRef = useRef<any>(null);
    return (
        <div style={{ position: 'relative' }}>
            <label className="material-label">{label}</label>
            <div className="relative">
                <VariableAwareInput 
                    ref={areaRef} 
                    isTextarea={true} 
                    value={value} 
                    onValueChange={onChange} 
                    placeholder={placeholder} 
                    style={{ minHeight: '46px', height }} 
                    disabled={disabled} 
                    availableVars={availableVars} 
                    onInsertClick={enableVariables ? () => onRequestVariable?.((val: string) => {
                        const el = areaRef.current;
                        if (el) {
                            const start = el.selectionStart || 0;
                            const end = el.selectionEnd || 0;
                            const newVal = (value || '').slice(0, start) + val + (value || '').slice(end);
                            onChange(newVal);
                            setTimeout(() => { el.focus(); el.setSelectionRange(start + val.length, start + val.length); }, 0);
                        } else onChange((value || '') + val);
                    }) : undefined}
                />
            </div>
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
