import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    BackgroundVariant,
    Position,
    getBezierPath,
    EdgeText,
    EdgeLabelRenderer,
    ReactFlowProvider,
    useReactFlow,
    Node,
    Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'
import { TaskEditShelf } from '../components/TaskEditShelf'
import { Network, Check, Send, RefreshCw, Trash2, Terminal, Activity, Pencil, Zap, Settings2, X, Box, GitBranch, LayoutDashboard, Clock, Bell, Info, Layers, Shield, ChevronRight, Folder, Undo2, Redo2, ChevronDown, Sparkles, Maximize2, Minimize2 } from 'lucide-react'
import { useDirtyState } from '../context/DirtyStateContext'
import { useToast } from '../context/ToastContext'
import { WorkflowAdminShelf } from '../components/WorkflowAdminShelf'
import { TryZoneNode, CatchNode } from '../components/TryCatchNodes'
import { ZoneDeleteModal } from '../components/ZoneDeleteModal'

const initialNodes: Node[] = []
const initialEdges: any[] = []

// Icon mapping using Simple Icons CDN — reliable brand SVGs for thousands of companies
// Source: https://cdn.simpleicons.org/{slug}/{color}
const ICON_MAPPING: Record<string, string> = {
    // ── Cloud Providers ──────────────────────────────────────────────────
    'aws':            'https://cdn.simpleicons.org/amazonaws/FF9900',
    'amazon':         'https://cdn.simpleicons.org/amazon/FF9900',
    'lambda':         'https://cdn.simpleicons.org/awslambda/FF9900',
    'ec2':            'https://cdn.simpleicons.org/amazonec2/FF9900',
    's3':             'https://cdn.simpleicons.org/amazons3/FF9900',
    'google cloud':   'https://cdn.simpleicons.org/googlecloud/4285F4',
    'gcp':            'https://cdn.simpleicons.org/googlecloud/4285F4',
    'google':         'https://cdn.simpleicons.org/google/4285F4',
    'microsoft':      'https://cdn.simpleicons.org/microsoft/5E5E5E',
    'azure':          'https://cdn.simpleicons.org/microsoftazure/0078D4',
    'ibm cloud':      'https://cdn.simpleicons.org/ibm/052FAD',
    'ibm':            'https://cdn.simpleicons.org/ibm/052FAD',
    'alibaba':        'https://cdn.simpleicons.org/alibabadotcom/FF6A00',
    'oracle cloud':   'https://cdn.simpleicons.org/oracle/F80000',
    'digitalocean':   'https://cdn.simpleicons.org/digitalocean/0080FF',
    'cloudflare':     'https://cdn.simpleicons.org/cloudflare/F38020',
    'heroku':         'https://cdn.simpleicons.org/heroku/430098',
    'vercel':         'https://cdn.simpleicons.org/vercel/000000',
    'netlify':        'https://cdn.simpleicons.org/netlify/00C7B7',
    // ── ERP / Business Apps ──────────────────────────────────────────────
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
    // ── Networking / CDN / API ────────────────────────────────────────────
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

function getEffectiveIcon(item: any) {
    if (item.icon) return item.icon;
    const name = (item.name || item.label || '').toLowerCase();
    
    // 1. Check manual mapping
    const sorted = Object.keys(ICON_MAPPING).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (name.includes(key)) return ICON_MAPPING[key];
    }
    
    // 2. Fallback to normalized slug (for 3000+ brands)
    const slug = normalizeSlug(name);
    if (slug.length > 2) return `https://cdn.simpleicons.org/${slug}`;
    
    return null;
}

/**
 * n8n-Style Task Node
 * - Input on Left
 * - Output on Right
 * - Distinct color-coded icons
 */
function N8nTaskNode({ data }: any) {
    const [iconError, setIconError] = useState(false);
    const effectiveIcon = getEffectiveIcon(data);
    
    // Reset error state when the icon source changes
    useEffect(() => {
        setIconError(false);
    }, [effectiveIcon]);
    
    const renderIcon = () => {
        const method = data.method?.toUpperCase() || 'GET'
        const isVariable = data.taskType === 'VARIABLE';

        // Base Generic Icon
        const FallbackIcon = () => {
            if (isVariable) return <Zap size={18} className="text-yellow-400" fill="currentColor" />;
            if (data.taskType === 'WORKFLOW') return <Layers size={18} className="text-white" />;
            if (data.taskType === 'MCP_CLIENT') return <Sparkles size={18} className="text-fuchsia-400" fill="currentColor" />;
            switch (method) {
                case 'POST': return <Send size={14} className="text-blue-400" />;
                case 'PUT': return <RefreshCw size={14} className="text-yellow-400" />;
                case 'DELETE': return <Trash2 size={14} className="text-red-400" />;
                case 'GET': return <Activity size={14} className="text-green-400" />;
                default: return <Terminal size={14} className="text-gray-400" />;
            }
        };

        if (effectiveIcon && !iconError) {
            return (
                <img 
                    src={effectiveIcon} 
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
                    alt="icon" 
                    onError={() => setIconError(true)}
                />
            );
        }

        return <FallbackIcon />;
    }

    const isUtility = data.taskType === 'VARIABLE' || data.taskId === '00000000-0000-0000-0000-000000000001' || data.taskId === 'util-vars';
    const isWorkflow = data.taskType === 'WORKFLOW';
    const isMcp = data.taskType === 'MCP_CLIENT';
    const isCompact = data.isCompact !== false;

    return (
        <div style={{ 
            minWidth: isCompact && !isUtility ? '200px' : '240px',
            position: 'relative',
        }} className="hover:border-primary-500/50 transition-all group">
            
            {/* Shaped Background Layers */}
            {/* Border Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: isMcp ? '#d946ef' : (isWorkflow ? '#32a895' : (isUtility ? '#ffcc00' : '#202226')),
                clipPath: isMcp 
                    ? 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)'
                    : (isUtility 
                        ? 'none' 
                        : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none')),
                borderRadius: isMcp ? '0' : (isUtility ? '999px' : (isWorkflow ? '0' : '12px')),
                zIndex: 0
            }} />

            {/* Fill Layer */}
            <div style={{
                position: 'absolute',
                inset: '1.5px', // Border width
                background: isMcp ? 'linear-gradient(135deg, #4a044e 0%, #111217 100%)' : (isWorkflow ? 'linear-gradient(135deg, #032cfc 0%, #021a99 100%)' : (isUtility ? 'linear-gradient(135deg, #1e1b0a 0%, #111217 100%)' : '#111217')),
                clipPath: isMcp 
                    ? 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)'
                    : (isUtility 
                        ? 'none' 
                        : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none')),
                borderRadius: isMcp ? '0' : (isUtility ? '999px' : (isWorkflow ? '0' : '11px')),
                zIndex: 1
            }} />

            {/* Shadow Wrapper (Shaped) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.4))',
                zIndex: -1,
                pointerEvents: 'none'
            }} />
            
            {/* Input Port (n8n flavor) - Now Blue and Larger */}
            <Handle
                type="target"
                position={Position.Left}
                style={{ 
                    background: '#3b82f6', 
                    width: '16px', 
                    height: '16px', 
                    border: '3px solid white',
                    left: '-10px',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                    zIndex: 1000
                }}
            />

            {/* Node Content */}
            <div style={{ padding: isUtility ? '12px 24px' : '12px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid #202226', paddingBottom: '8px' }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: '#0b0c10', 
                        borderRadius: isUtility ? '50%' : '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #202226'
                    }}>
                        {renderIcon()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: isWorkflow ? '#ffffff80' : (isMcp ? '#d946ef' : '#464c54'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isWorkflow ? 'WORKFLOW' : (isUtility ? 'UTILITY' : (isMcp ? 'AI TOOL' : data.method))}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f2f5f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
                    </div>
                    {/* Delete Toggle */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onDelete(data.id);
                        }}
                        style={{ 
                            background: 'transparent',
                            border: 'none',
                            color: '#464c54',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                        }}
                        className="hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Remove task"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {!isUtility ? (
                        <>
                            {!isCompact && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-in fade-in slide-in-from-top-1">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Target Tags</label>
                                        <input
                                            style={{ 
                                                background: '#0b0c10', 
                                                border: '1px solid #202226', 
                                                borderRadius: '6px', 
                                                padding: '4px 8px', 
                                                fontSize: '11px', 
                                                color: '#f05a28',
                                                outline: 'none',
                                                width: '100%'
                                            }}
                                            className="focus:border-primary-500 shadow-inner"
                                            defaultValue={data.targetTags?.join(', ') || ''}
                                            onChange={(e) => data.onChangeTargetTags(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="e.g. gpu, high-mem"
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Failure Strategy</label>
                                        <select
                                            style={{ 
                                                background: '#0b0c10', 
                                                border: '1px solid #202226', 
                                                borderRadius: '6px', 
                                                padding: '4px 4px', 
                                                fontSize: '10px', 
                                                color: '#d8d9da',
                                                outline: 'none',
                                                width: '100%',
                                                cursor: 'pointer'
                                            }}
                                            className="focus:border-primary-500"
                                            value={data.failureStrategy || 'SUCCESS_REQUIRED'}
                                            onChange={(e) => data.onChangeFailureStrategy(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="SUCCESS_REQUIRED">Stop On Failure</option>
                                            <option value="CONTINUE_ON_FAIL">Continue On Failure</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Status Override</label>
                                        <select
                                            style={{ 
                                                background: '#0b0c10', 
                                                border: '1px solid #202226', 
                                                borderRadius: '6px', 
                                                padding: '4px 4px', 
                                                fontSize: '10px', 
                                                color: '#d8d9da',
                                                outline: 'none',
                                                width: '100%',
                                                cursor: 'pointer'
                                            }}
                                            className="focus:border-primary-500"
                                            value={data.failureStatusOverride || 'FAILED'}
                                            onChange={(e) => data.onChangeFailureStatusOverride(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="FAILED">FAILED</option>
                                            <option value="SKIPPED">SKIPPED</option>
                                            <option value="SUCCESS">SUCCESS</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            {isCompact && (
                                <div className="border-t border-[#202226] mt-2 pt-2 flex items-center justify-between">
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-tight">
                                        {data.failureStrategy === 'CONTINUE_ON_FAIL' ? 'Continue mode' : 'Stop mode'}
                                    </div>
                                    <div className="flex gap-1">
                                        {data.targetTags?.slice(0, 2).map((t: string) => (
                                            <span key={t} className="text-[7px] bg-primary-900/30 text-primary-400 px-1 rounded border border-primary-900/50">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 204, 0, 0.2)', paddingTop: '10px' }}>
                             <div style={{ fontSize: '10px', color: '#ffcc00', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                                 {Object.keys(data.variableExtraction?.vars || {}).filter(k=>!k.startsWith('__')).length} VARIABLES DEFINED
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Output Port (n8n flavor) - Now Blue and Larger */}
            <Handle
                type="source"
                position={Position.Right}
                style={{ 
                    background: '#3b82f6', 
                    width: '16px', 
                    height: '16px', 
                    border: '3px solid white',
                    right: '-10px',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                    zIndex: 1000
                }}
            />
        </div>
    )
}

/**
 * Workflow Node
 * - Represents a nested workflow
 */
function WorkflowNode({ data }: any) {
    const inputCount = data.inputVarsCount || 0;
    const outputCount = data.outputVarsCount || 0;

    const [iconError, setIconError] = useState(false);
    const effectiveIcon = getEffectiveIcon(data);
    
    // Reset error state when the icon source changes
    useEffect(() => {
        setIconError(false);
    }, [effectiveIcon]);

    const renderIcon = () => {
        if (effectiveIcon && !iconError) {
            return (
                <img 
                    src={effectiveIcon} 
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
                    alt="workflow-icon" 
                    onError={() => setIconError(true)}
                />
            );
        }
        return <Layers size={18} className="text-white" />;
    }

    return (
        <div style={{ 
            minWidth: '240px',
            position: 'relative'
        }} className="hover:border-primary-500/50 transition-all group">
            
            {/* Shaped Background Layers */}
            {/* Border Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: '#32a895',
                clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
                zIndex: 0
            }} />

            {/* Fill Layer */}
            <div style={{
                position: 'absolute',
                inset: '1.5px', // Border width
                background: 'linear-gradient(135deg, #032cfc 0%, #021a99 100%)',
                clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
                zIndex: 1
            }} />

            {/* Shadow Wrapper (Shaped) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.4))',
                zIndex: -1,
                pointerEvents: 'none'
            }} />
            
            <Handle
                type="target"
                position={Position.Left}
                style={{ 
                    background: '#3b82f6', 
                    width: '16px', 
                    height: '16px', 
                    border: '3px solid white',
                    left: '-10px',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                    zIndex: 1000
                }}
            />

            <div style={{ padding: '12px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: '#0b0c10', 
                        borderRadius: '0', 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        {renderIcon()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORKFLOW</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onDelete(data.id);
                        }}
                        style={{ 
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                        }}
                        className="hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="Remove workflow"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-center">
                    <span className="text-[9px] font-black text-white/80 uppercase tracking-tighter">
                        In Vars: {inputCount} • Out Vars: {outputCount}
                    </span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{ 
                    background: '#3b82f6', 
                    width: '16px', 
                    height: '16px', 
                    border: '3px solid white',
                    right: '-10px',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                    zIndex: 1000
                }}
            />
        </div>
    );
}

function IfNode({ data }: any) {
    return (
        <div style={{ 
            width: '100px',
            height: '100px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} className="hover:scale-105 transition-transform group">
            {/* Diamond Shape */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: '#f59e0b',
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                inset: '2px',
                background: '#111217',
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                zIndex: 1
            }} />

            {/* Label */}
            <div style={{ zIndex: 10, textAlign: 'center', padding: '10px' }}>
                <div style={{ color: '#f59e0b', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>IF NODE</div>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: 'bold', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data.label}
                </div>
            </div>

            {/* Ports */}
            <Handle type="target" position={Position.Left} style={{ background: '#3b82f6', border: '2px solid white', left: '-5px' }} />
            <Handle type="source" position={Position.Right} id="then" className="then-handle" style={{ border: '2px solid white', right: '-8px', top: '35%' }} />
            <Handle type="source" position={Position.Right} id="else" className="else-handle" style={{ border: '2px solid white', right: '-8px', top: '65%' }} />
        </div>
    );
}


function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: any) {
    const { setEdges } = useReactFlow();
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const condition = data?.condition || 'ALWAYS';
    const isThen = condition === 'ON_THEN';
    const isElse = condition === 'ON_ELSE';
    const isSuccess = condition === 'ON_SUCCESS';
    const isFailure = condition === 'ON_FAILURE';
    const isError = condition === 'ON_ERROR';

    const label = condition === 'ALWAYS' ? 'Always' : 
                  isThen ? 'THEN' : 
                  isElse ? 'ELSE' : 
                  isSuccess ? 'On Success' : 
                  isFailure ? 'On Failure' : 
                  isError ? 'ON ERROR' : condition.replace('ON_', '');

    const color = (isThen || isSuccess) ? '#22c55e' : 
                  (isElse || isFailure || isError) ? '#ef4444' : '#94a3b8';

    const onEdgeClick = (evt: any) => {
        evt.stopPropagation();
        // If coming from an IF node, cycle THEN -> ELSE -> ALWAYS
        // Otherwise cycle SUCCESS -> FAILURE -> ALWAYS
        const isFromIf = data?.sourceType === 'IF';
        const isLocked = data?.isLocked;

        if (isLocked) {
            // Cannot toggle Try-to-Catch relationship
            return;
        }
        
        let nextCondition = 'ALWAYS';
        if (isFromIf) {
            nextCondition = condition === 'ON_THEN' ? 'ON_ELSE' : condition === 'ON_ELSE' ? 'ALWAYS' : 'ON_THEN';
        } else {
            nextCondition = condition === 'ALWAYS' ? 'ON_SUCCESS' : condition === 'ON_SUCCESS' ? 'ON_FAILURE' : 'ALWAYS';
        }

        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === id) {
                    return {
                        ...edge,
                        sourceHandle: isFromIf ? (nextCondition === 'ON_THEN' ? 'then' : (nextCondition === 'ON_ELSE' ? 'else' : null)) : edge.sourceHandle,
                        data: { ...edge.data, condition: nextCondition },
                        label: nextCondition === 'ALWAYS' ? '' : nextCondition.replace('ON_', ''),
                        style: { ...edge.style, stroke: (nextCondition === 'ON_THEN' || nextCondition === 'ON_SUCCESS') ? '#22c55e' : (nextCondition === 'ON_ELSE' || nextCondition === 'ON_FAILURE') ? '#ef4444' : '#94a3b8' }
                    };
                }
                return edge;
            })
        );
    };

    const onRemove = (evt: any) => {
        evt.stopPropagation();
        setEdges((eds) => eds.filter((edge) => edge.id !== id));
    };

    return (
        <>
            <path
                id={id}
                style={{ ...style, stroke: color, strokeWidth: 2, strokeDasharray: isError ? '5,5' : undefined }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                    }}
                    className="nodrag nopan"
                >
                    <div 
                         onClick={onEdgeClick}
                         style={{ 
                            background: color, 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            userSelect: 'none'
                        }}
                    >
                        {label}
                    </div>
                    <button
                        onClick={onRemove}
                        style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'white',
                            border: `1px solid ${color}`,
                            color: color,
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            padding: 0,
                            lineHeight: 1
                        }}
                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-colors"
                        title="Remove connection"
                    >
                        &times;
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

const nodeTypes = {
    taskNode: N8nTaskNode,
    workflowNode: WorkflowNode,
    ifNode: IfNode,
    tryZoneNode: TryZoneNode,
    catchNode: CatchNode,
}

const edgeTypes = {
    custom: CustomEdge,
}

function ReactFlowCanvas({ 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    setNodes,
    setEdges,
    setIsDirty,
    onNodeClick,
    onNodeDragStart,
    onNodeDragStop,
    reactFlowWrapper,
    disableKeyboardActions,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    deleteZoneAll,
    deleteZoneOnly,
    zoneToDelete,
    onDeleteZoneRequest,
    onEditNode,
    queueHistory,
    onZoneResizeEnd,
    isCompact
}: any) {
    const reactFlowInstance = useReactFlow();
    const projectRef = useRef<any>(null);

    useEffect(() => {
        if (reactFlowInstance?.project) {
            projectRef.current = reactFlowInstance.project;
        }
    }, [reactFlowInstance]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: any) => {
            event.preventDefault();
            if (!projectRef.current) return;
            
            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!reactFlowBounds) return;

            const taskDataStr = event.dataTransfer.getData('application/reactflow');
            if (!taskDataStr) return;
            const taskData = JSON.parse(taskDataStr);

            const position = projectRef.current({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNodeId = `node-${Date.now()}`;
            const isUtility = taskData.taskType === 'VARIABLE';
            const isWorkflow = taskData.itemType === 'WORKFLOW';
            const isIf = taskData.taskType === 'IF';
            const isTry = taskData.taskType === 'TRY_ZONE';
            const isCatch = taskData.taskType === 'CATCH';
            const randomSuffix = Math.floor(100000 + Math.random() * 900000);
            let label = isUtility ? `${taskData.name} ${randomSuffix}` : taskData.name;
            if (isTry) {
                const tryCount = nodes.filter(n => n.data?.taskType === 'TRY_ZONE').length;
                label = `Try Zone ${tryCount + 1}`;
            }

            const newNode: Node = {
                id: newNodeId,
                type: isIf ? 'ifNode' : (isWorkflow ? 'workflowNode' : (isTry ? 'tryZoneNode' : (isCatch ? 'catchNode' : 'taskNode'))),
                position,
                data: {
                    id: newNodeId,
                    label: label,
                    taskId: taskData.id,
                    taskType: isWorkflow ? 'WORKFLOW' : (isIf ? 'IF' : (isTry ? 'TRY_ZONE' : (isCatch ? 'CATCH' : (taskData.taskType || 'HTTP')))),
                    utility: isUtility || isIf || isTry || isCatch,
                    inputVarsCount: isWorkflow ? Object.keys(taskData.inputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                    outputVarsCount: isWorkflow ? Object.keys(taskData.outputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                    method: isWorkflow ? 'WF' : (taskData.taskType === 'VARIABLE' ? 'VAR' : (isIf ? 'IF' : (isTry ? 'TRY' : (isCatch ? 'CATCH' : (taskData.command?.method || 'GET'))))),
                    targetTags: taskData.targetTags || [],
                    failureStrategy: 'SUCCESS_REQUIRED',
                    failureStatusOverride: 'FAILED',
                    variableExtraction: taskData.variableExtraction,
                    icon: taskData.icon,
                    isCompact: isCompact,
                    memberNodeIds: isTry ? [] : undefined,
                    catchHandlerId: isTry ? null : undefined,
                    catchOnStatuses: isTry ? ['FAILED', 'TIMEOUT'] : undefined,
                    retryPolicy: isTry ? { maxAttempts: 0, backoffType: 'exponential', initialDelaySeconds: 5, maxDelaySeconds: 60, retryOnStatuses: ['FAILED', 'TIMEOUT'] } : undefined,
                    onDelete: (id: string) => {
                        if (isTry) {
                            onDeleteZoneRequest(id);
                        } else {
                            setNodes((nds: any) => nds.filter((node: any) => node.id !== id));
                            setEdges((eds: any) => eds.filter((edge: any) => edge.source !== id && edge.target !== id));
                            setIsDirty(true);
                        }
                    },
                    onEdit: (id: string) => {
                        setNodes((nds: any) => {
                            const node = nds.find((n: any) => n.id === id);
                            if (node) onEditNode(node);
                            return nds;
                        });
                    },
                    onResizeEnd: (id: string, params: any, originalBounds: any) => {
                        onZoneResizeEnd?.(id, params, originalBounds);
                    },
                    onChangeTargetTags: (val: string) => {
                        setNodes((nds: any) => nds.map((node: any) => node.id === newNodeId ? { ...node, data: { ...node.data, targetTags: val.split(',').map(t => t.trim()).filter(Boolean) } } : node))
                        setIsDirty(true);
                    },
                    onChangeFailureStrategy: (val: string) => {
                        setNodes((nds: any) => nds.map((node: any) => node.id === newNodeId ? { ...node, data: { ...node.data, failureStrategy: val } } : node))
                        setIsDirty(true);
                    },
                    onChangeFailureStatusOverride: (val: string) => {
                        setNodes((nds: any) => nds.map((node: any) => node.id === newNodeId ? { ...node, data: { ...node.data, failureStatusOverride: val } } : node))
                        setIsDirty(true);
                    }
                },
                className: isTry ? '' : 'n8n-node-transparent',
                style: isTry 
                    ? { width: 400, height: 250, pointerEvents: 'auto', zIndex: -1 } 
                    : { background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', zIndex: 1000 },
            };

            setNodes((nds: any) => {
                // Check if NEW node is dropped inside any shelf/zone
                const zones = nds.filter((n: any) => n.type === 'tryZoneNode');
                let insideZone: any = null;
                
                for (const zone of zones) {
                    const zoneX = zone.position.x;
                    const zoneY = zone.position.y;
                    const zoneW = parseInt((zone as any).width || zone.style?.width || 400);
                    const zoneH = parseInt((zone as any).height || zone.style?.height || 250);
                    
                    if (position.x > zoneX && position.x < (zoneX + zoneW) && position.y > zoneY && position.y < (zoneY + zoneH)) {
                        insideZone = zone;
                        break;
                    }
                }

                if (insideZone) {
                    newNode.parentNode = insideZone.id;
                    newNode.extent = 'parent';
                    newNode.position = {
                        x: position.x - insideZone.position.x,
                        y: position.y - insideZone.position.y
                    };
                }

                const nextNodes = nds.concat(newNode);
                if (isTry) return nextNodes;

                if (insideZone) {
                    const PADDING = 40;
                    const zoneX = insideZone.position.x;
                    const zoneY = insideZone.position.y;
                    const zoneW = parseInt((insideZone as any).width || (insideZone.style as any)?.width || 400);
                    const zoneH = parseInt((insideZone as any).height || (insideZone.style as any)?.height || 250);
                    
                    const nodeW = 240; // Default task width
                    const nodeH = 120; // Default task height
                    
                    let newW = zoneW;
                    let newH = zoneH;
                    
                    if (position.x + nodeW + PADDING > zoneX + zoneW) {
                        newW = (position.x - zoneX) + nodeW + PADDING;
                    }
                    if (position.y + nodeH + PADDING > zoneY + zoneH) {
                        newH = (position.y - zoneY) + nodeH + PADDING;
                    }

                    const shiftX = newW - zoneW;
                    const shiftY = newH - zoneH;

                    return nextNodes.map((n: any) => {
                        if (n.id === insideZone.id) {
                            return { 
                                ...n, 
                                width: newW, 
                                height: newH,
                                style: { ...n.style, width: newW, height: newH },
                                data: { ...n.data, memberNodeIds: [...(n.data.memberNodeIds || []), newNodeId] } 
                            };
                        }
                        // Pushing Logic: Shift nodes that were to the right or bottom of the OLD zone bounds
                        if (n.id !== newNodeId && !n.parentNode) {
                            let updatedPos = { ...n.position };
                            if (shiftX > 0 && n.position.x >= (zoneX + zoneW - PADDING)) {
                                updatedPos.x += shiftX;
                            }
                            if (shiftY > 0 && n.position.y >= (zoneY + zoneH - PADDING)) {
                                updatedPos.y += shiftY;
                            }
                            if (updatedPos.x !== n.position.x || updatedPos.y !== n.position.y) {
                                return { ...n, position: updatedPos };
                            }
                        }
                        return n;
                    });
                }
                return nextNodes;
            });
            queueHistory('Added Item from Library');
            setIsDirty(true);
        },
        [setNodes, setIsDirty, reactFlowWrapper, onDeleteZoneRequest, onEditNode, isCompact]
    );

    return (
        <div ref={reactFlowWrapper} style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #eee', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={(_, node) => onNodeClick(node)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onEdgesDelete={(deletedEdges) => {
                    setEdges(eds => eds.filter(e => !deletedEdges.find(de => de.id === e.id)));
                    queueHistory('Removed Connection');
                    setIsDirty(true);
                }}
                onNodesDelete={(deletedNodes) => {
                    const deletedIds = new Set(deletedNodes.map(dn => dn.id));
                    setNodes(nds => nds.map(n => {
                        if (n.type === 'tryZoneNode') {
                            const newMembers = n.data.memberNodeIds?.filter((id: string) => !deletedIds.has(id)) || [];
                            return { ...n, data: { ...n.data, memberNodeIds: newMembers } };
                        }
                        return n;
                    }).filter(n => !deletedIds.has(n.id)));
                    setEdges(eds => eds.filter(e => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
                    queueHistory('Deleted Node');
                    setIsDirty(true);
                }}
                deleteKeyCode={disableKeyboardActions ? null : ['Backspace', 'Delete']}
                fitView
                snapToGrid={true}
                snapGrid={[15, 15]}
            >
                <Background color="#1976D2" gap={25} size={1.5} variant={BackgroundVariant.Dots} style={{ opacity: 0.3 }} />
                <Controls style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                <MiniMap 
                    style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                    nodeColor="#1976D2"
                    maskColor="rgba(255, 255, 255, 0.7)"
                />
            </ReactFlow>
            {isDeleteModalOpen && (
                <ZoneDeleteModal 
                    isOpen={isDeleteModalOpen}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    onDeleteAll={deleteZoneAll}
                    onDeleteZoneOnly={deleteZoneOnly}
                    memberCount={zoneToDelete?.data.memberNodeIds?.length || 0}
                />
            )}
        </div>
    );
}

function WorkflowDesignerContent() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams()
    const workflowId = searchParams.get('id')
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [workflowName, setWorkflowName] = useState('My Workflow')
    const [workflowTags, setWorkflowTags] = useState<string[]>(['default'])
    const { isDirty, setIsDirty, setShowDirtyModal, setPendingAction } = useDirtyState();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingNode, setEditingNode] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [zoneToDelete, setZoneToDelete] = useState<any>(null);
    const [workflowMetadata, setWorkflowMetadata] = useState<any>({
        inputVariables: {},
        outputVariables: {},
        scheduling: { enabled: false, cron: '0 * * * *' },
        notifications: [],
        scope: 'GLOBAL'
    });
    const [isTopDrawerOpen, setIsTopDrawerOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isCompact, setIsCompact] = useState(true); // Default to collapsed view
    const queryClient = useQueryClient()
    const initializedRef = useRef<string | null>(null)
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    // History & Undo State Engine
    const pendingHistoryActionRef = useRef<string | null>(null);
    const historyRef = useRef<{ actionName: string; nodes: any[]; edges: any[] }[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const isRestoringHistoryRef = useRef(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const nodeDragStartPosRef = useRef<{ x: number, y: number } | null>(null);

    const queueHistory = useCallback((actionName: string) => {
        pendingHistoryActionRef.current = actionName;
    }, []);

    const jumpToHistory = useCallback((targetIndex: number) => {
        if (targetIndex < 0 || targetIndex >= historyRef.current.length) return;
        isRestoringHistoryRef.current = true;
        historyIndexRef.current = targetIndex;
        const snapshot = historyRef.current[targetIndex];
        
        // Restore via shallow copy arrays to maintain references to static function handlers in data
        setNodes([...snapshot.nodes]);
        setEdges([...snapshot.edges]);
        
        setCanUndo(targetIndex > 0);
        setCanRedo(targetIndex < historyRef.current.length - 1);
        setIsDirty(true);
        setTimeout(() => { isRestoringHistoryRef.current = false; }, 100);
    }, [setNodes, setEdges, setIsDirty]);

    const handleUndo = useCallback(() => {
        if (historyIndexRef.current > 0) jumpToHistory(historyIndexRef.current - 1);
    }, [jumpToHistory]);

    const handleRedo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) jumpToHistory(historyIndexRef.current + 1);
    }, [jumpToHistory]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) handleRedo();
                else handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                handleRedo();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleUndo, handleRedo]);

    // Snapshot Processor
    useEffect(() => {
        if (pendingHistoryActionRef.current && !isRestoringHistoryRef.current) {
            const action = pendingHistoryActionRef.current;
            pendingHistoryActionRef.current = null;
            
            const currentHist = historyRef.current;
            const currentIndex = historyIndexRef.current;
            const slice = currentHist.slice(0, currentIndex + 1);
            
            slice.push({ actionName: action, nodes: [...nodes], edges: [...edges] });
            if (slice.length > 20) slice.shift(); // Keep last 20 actions
            
            historyRef.current = slice;
            historyIndexRef.current = slice.length - 1;
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(false);
        }
    }, [nodes, edges]);

    const { data: tasks, isLoading: isLoadingTasks } = useQuery<any[]>({
        queryKey: ['tasks'],
        queryFn: () => tasksApi.getTasks(),
    })
 
    const { data: allWorkflows, isLoading: isLoadingWorkflows } = useQuery<any[]>({
        queryKey: ['workflows-all'],
        queryFn: () => workflowsApi.getWorkflows(),
    })

    const { data: existingWorkflow, isLoading: isWfLoading } = useQuery({
        queryKey: ['workflow', workflowId],
        queryFn: () => workflowsApi.getWorkflow(workflowId!),
        enabled: !!workflowId,
    })

    const { data: bindings } = useQuery({
        queryKey: ['workflow-bindings', workflowId],
        queryFn: () => workflowsApi.getBindings(workflowId!),
        enabled: !!workflowId
    });

    const { data: taskFolders } = useQuery({
        queryKey: ['task-folders'],
        queryFn: () => tasksApi.getFolderTree()
    });

    const { data: workflowFolders } = useQuery({
        queryKey: ['workflow-folders'],
        queryFn: () => workflowsApi.getFolderTree()
    });

    const handleZoneResizeEnd = useCallback((id: string, params: any, originalBounds: any) => {
        setNodes((nds: any) => {
            const z = nds.find((n: any) => n.id === id);
            if (!z) return nds;
            
            const newX = params.x;
            const newY = params.y;
            const newW = params.width;
            const newH = params.height;
            
            const oldX = originalBounds?.x ?? z.position.x;
            const oldY = originalBounds?.y ?? z.position.y;
            const oldW = parseInt(String(originalBounds?.width || z.width || z.style?.width || (z as any).data?.width || 400));
            const oldH = parseInt(String(originalBounds?.height || z.height || z.style?.height || (z as any).data?.height || 250));
            
            const expandRight = (newX + newW) - (oldX + oldW);
            const expandLeft = oldX - newX;
            const expandBottom = (newY + newH) - (oldY + oldH);
            const expandTop = oldY - newY;
            
            if (expandRight <= 0 && expandLeft <= 0 && expandBottom <= 0 && expandTop <= 0) {
                 return nds.map((n: any) => {
                     if (n.id === id) return { ...n, position: { x: newX, y: newY }, width: newW, height: newH, style: { ...n.style, width: newW, height: newH } };
                     return n;
                 });
            }

            const PADDING = 40;
            const getNodeBounds = (node: any) => ({
                x: node.position.x,
                y: node.position.y,
                w: parseInt(node.width || node.style?.width || 240),
                h: parseInt(node.height || node.style?.height || 120)
            });

            const checkIntersection = (b1: any, b2: any) => {
                return b1.x < b2.x + b2.w && b1.x + b1.w > b2.x &&
                       b1.y < b2.y + b2.h && b1.y + b1.h > b2.y;
            };

            let updatedNodes = [...nds];
            let shifts: Record<string, {x: number, y: number}> = {};
            let movedInIteration = false;
            
            do {
                movedInIteration = false;

                for (const n of updatedNodes) {
                    if (n.id === id || n.parentNode) continue;
                    
                    const bounds = getNodeBounds(n);
                    const curShiftX = shifts[n.id]?.x || 0;
                    const curShiftY = shifts[n.id]?.y || 0;
                    const currentBounds = { ...bounds, x: bounds.x + curShiftX, y: bounds.y + curShiftY };
                    
                    let needsShiftX = 0;
                    let needsShiftY = 0;
                    
                    if (expandRight > 0) {
                        const rightSwath = { x: oldX + oldW - PADDING, y: oldY - PADDING, w: expandRight + PADDING*2, h: oldH + PADDING*2 };
                        if (checkIntersection(currentBounds, rightSwath) && currentBounds.x >= oldX + oldW - PADDING) needsShiftX = Math.max(needsShiftX, expandRight);
                    }
                    if (expandBottom > 0) {
                        const bottomSwath = { x: oldX - PADDING, y: oldY + oldH - PADDING, w: oldW + PADDING*2, h: expandBottom + PADDING*2 };
                        if (checkIntersection(currentBounds, bottomSwath) && currentBounds.y >= oldY + oldH - PADDING) needsShiftY = Math.max(needsShiftY, expandBottom);
                    }
                    if (expandLeft > 0) {
                        const leftSwath = { x: newX - PADDING, y: oldY - PADDING, w: expandLeft + PADDING*2, h: oldH + PADDING*2 };
                        if (checkIntersection(currentBounds, leftSwath) && (currentBounds.x + currentBounds.w) <= oldX + PADDING) needsShiftX = Math.min(needsShiftX, -expandLeft);
                    }
                    if (expandTop > 0) {
                        const topSwath = { x: oldX - PADDING, y: newY - PADDING, w: oldW + PADDING*2, h: expandTop + PADDING*2 };
                        if (checkIntersection(currentBounds, topSwath) && (currentBounds.y + currentBounds.h) <= oldY + PADDING) needsShiftY = Math.min(needsShiftY, -expandTop);
                    }

                    for (const other of updatedNodes) {
                        if (other.id === n.id || other.id === id || other.parentNode) continue;
                        if (shifts[other.id] && (shifts[other.id].x !== 0 || shifts[other.id].y !== 0)) {
                            const otherBounds = getNodeBounds(other);
                            const otherNewBounds = { ...otherBounds, x: otherBounds.x + shifts[other.id].x, y: otherBounds.y + shifts[other.id].y };
                            const otherPadded = { 
                                x: otherNewBounds.x - PADDING, y: otherNewBounds.y - PADDING, 
                                w: otherNewBounds.w + PADDING*2, h: otherNewBounds.h + PADDING*2 
                            };
                            if (checkIntersection(currentBounds, otherPadded)) {
                                if (shifts[other.id].x > 0 && currentBounds.x >= otherBounds.x) needsShiftX = Math.max(needsShiftX, shifts[other.id].x);
                                if (shifts[other.id].x < 0 && currentBounds.x + currentBounds.w <= otherBounds.x + otherBounds.w) needsShiftX = Math.min(needsShiftX, shifts[other.id].x);
                                if (shifts[other.id].y > 0 && currentBounds.y >= otherBounds.y) needsShiftY = Math.max(needsShiftY, shifts[other.id].y);
                                if (shifts[other.id].y < 0 && currentBounds.y + currentBounds.h <= otherBounds.y + otherBounds.h) needsShiftY = Math.min(needsShiftY, shifts[other.id].y);
                            }
                        }
                    }
                    
                    if (Math.abs(needsShiftX) > Math.abs(curShiftX) || Math.abs(needsShiftY) > Math.abs(curShiftY)) {
                        shifts[n.id] = { x: needsShiftX, y: needsShiftY };
                        movedInIteration = true;
                    }
                }
            } while (movedInIteration);

            let anyMoved = false;
            updatedNodes = updatedNodes.map((n: any) => {
                if (n.id === id) {
                    return { ...n, width: newW, height: newH, position: { x: newX, y: newY }, style: { ...n.style, width: newW, height: newH } };
                }
                if (shifts[n.id] && (shifts[n.id].x !== 0 || shifts[n.id].y !== 0)) {
                    anyMoved = true;
                    return { ...n, position: { x: n.position.x + shifts[n.id].x, y: n.position.y + shifts[n.id].y } };
                }
                return n;
            });

            if (anyMoved) setTimeout(() => queueHistory('Cascading Push Layout'), 50);
            return updatedNodes;
        });
        queueHistory('Resized Zone');
        setIsDirty(true);
    }, [setNodes, queueHistory, setIsDirty]);

    const handleDeleteZoneRequest = (id: string) => {
        setNodes(nds => {
            const zone = nds.find(n => n.id === id);
            if (zone) {
                setZoneToDelete(zone);
                setIsDeleteModalOpen(true);
            }
            return nds;
        });
    };
    const deleteZoneAll = () => {
        if (!zoneToDelete) return;
        const targetId = zoneToDelete.id;
        setNodes(nds => {
            const currentZone = nds.find(n => n.id === targetId);
            const memberIds = new Set(currentZone?.data.memberNodeIds || []);
            return nds.filter(n => n.id !== targetId && !memberIds.has(n.id));
        });
        setEdges(eds => eds.filter(e => e.source !== targetId && e.target !== targetId));
        setIsDeleteModalOpen(false);
        setZoneToDelete(null);
        queueHistory('Deleted Try Zone and Nodes');
        setIsDirty(true);
    };

    const deleteZoneOnly = () => {
        if (!zoneToDelete) return;
        const targetId = zoneToDelete.id;
        
        setNodes(nds => {
            const currentZone = nds.find(n => n.id === targetId);
            if (!currentZone) return nds;
            const memberIds = new Set(currentZone.data.memberNodeIds || []);
            
            return nds.map(n => {
                if (memberIds.has(n.id)) {
                    // Determine absolute position before removing parent
                    const parent = nds.find(p => p.id === n.parentNode);
                    return { 
                        ...n, 
                        parentNode: undefined, 
                        extent: undefined,
                        position: { 
                            x: n.position.x + (parent?.position.x || 0), 
                            y: n.position.y + (parent?.position.y || 0) 
                        }
                    };
                }
                return n;
            }).filter(n => n.id !== targetId);
        });
        
        setEdges(eds => eds.filter(e => e.source !== targetId && e.target !== targetId));
        setIsDeleteModalOpen(false);
        setZoneToDelete(null);
        queueHistory('Deleted Try Zone');
        setIsDirty(true);
    };

    const handleManualNodeEdit = (nodeId: string | Node) => {
        const id = typeof nodeId === 'string' ? nodeId : nodeId.id;
        setNodes(nds => {
            const node = nds.find(n => n.id === id);
            if (node) setEditingNode(node);
            return nds;
        });
    };

    const onNodeClick = (node: Node) => {
        handleManualNodeEdit(node);
    };

    useEffect(() => {
        if (existingWorkflow && initializedRef.current !== workflowId) {
            // Only set state when the workflow ID changes or it's the first load
            setWorkflowName(existingWorkflow.name)
            setWorkflowTags(existingWorkflow.tags || ['default'])
            setWorkflowMetadata({
                inputVariables: existingWorkflow.inputVariables || {},
                outputVariables: existingWorkflow.outputVariables || {},
                scheduling: existingWorkflow.scheduling || { enabled: false, cron: '0 * * * *' },
                notifications: existingWorkflow.notifications || [],
                scope: existingWorkflow.scope || 'GLOBAL'
            })
            initializedRef.current = workflowId
            
            const initialNodes = existingWorkflow.nodes.map((n: any) => {
                const isTry = n.taskType === 'TRY_ZONE';
                const isCatch = n.taskType === 'CATCH';
                const isIf = n.taskType === 'IF';
                const isWf = n.taskType === 'WORKFLOW';

                return {
                    id: n.id,
                    type: isIf ? 'ifNode' : (isWf ? 'workflowNode' : (isTry ? 'tryZoneNode' : (isCatch ? 'catchNode' : 'taskNode'))),
                    position: n.position,
                    width: n.width ? parseInt(n.width) : undefined,
                    height: n.height ? parseInt(n.height) : undefined,
                    parentNode: n.parentNode,
                    extent: n.extent,
                    className: isTry ? '' : 'n8n-node-transparent',
                    style: isTry 
                        ? { width: n.width ? parseInt(n.width) : 400, height: n.height ? parseInt(n.height) : 250, pointerEvents: 'auto', zIndex: -1 } 
                        : { background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', zIndex: (isCatch ? 1000 : undefined) },
                    data: {
                        ...n,
                        id: n.id,
                        label: isWf ? (n.label || allWorkflows?.find((w: any) => w.id === n.taskId)?.name || 'Nested Workflow') : (tasks?.find((t: any) => t.id === n.taskId)?.name || n.label),
                        taskId: n.taskId,
                        taskType: n.taskType || (isIf ? 'IF' : (n.taskId === 'util-vars' ? 'VARIABLE' : 'HTTP')),
                        inputVarsCount: isWf ? Object.keys(allWorkflows?.find((w: any) => w.id === n.taskId)?.inputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                        outputVarsCount: isWf ? Object.keys(allWorkflows?.find((w: any) => w.id === n.taskId)?.outputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                        method: n.taskType === 'VARIABLE' ? 'VAR' : (isIf ? 'IF' : (isWf ? 'WF' : (n.method || tasks?.find((t: any) => t.id === n.taskId)?.command?.method || 'GET'))),
                        targetTags: n.targetTags || [],
                        failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                        failureStatusOverride: n.failureStatusOverride || 'FAILED',
                        variableExtraction: n.variableExtraction,
                        isCompact: isCompact,
                        icon: isWf ? (n.icon || allWorkflows?.find((w: any) => w.id === n.taskId)?.icon) : (tasks?.find((t: any) => t.id === n.taskId)?.icon || n.icon),
                        onDelete: (id: string) => {
                            if (isTry) {
                                handleDeleteZoneRequest(id);
                            } else {
                                setNodes(nds => nds.map(node => {
                                    if (node.data?.memberNodeIds) {
                                        return { 
                                            ...node, 
                                            data: { 
                                                ...node.data, 
                                                memberNodeIds: node.data.memberNodeIds.filter((mid: string) => mid !== id) 
                                            } 
                                        };
                                    }
                                    return node;
                                }).filter(node => node.id !== id));
                                setEdges(eds => eds.filter(edge => edge.source !== id && edge.target !== id));
                                queueHistory('Deleted Node');
                                setIsDirty(true);
                            }
                        },
                        onEdit: (id: string) => {
                            handleManualNodeEdit(id);
                        },
                        onResizeEnd: (id: string, params: any, originalBounds: any) => {
                            handleZoneResizeEnd(id, params, originalBounds);
                        },
                        onChangeTargetTags: (val: string) => {
                            const tags = val.split(',').map(t => t.trim()).filter(Boolean);
                            setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, targetTags: tags } } : node))
                            setIsDirty(true);
                        },
                        onChangeFailureStrategy: (val: string) => {
                            setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, failureStrategy: val } } : node))
                            setIsDirty(true);
                        },
                        onChangeFailureStatusOverride: (val: string) => {
                            setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, failureStatusOverride: val } } : node))
                            setIsDirty(true);
                        }
                    }
                };
            });

            // Second pass: correctly populate memberNodeIds based on parentNode relationship
            const fullyFormedNodes = initialNodes.map((node: any) => {
                if (node.type === 'tryZoneNode') {
                    const members = initialNodes.filter((n: any) => n.parentNode === node.id).map((n: any) => n.id);
                    return { ...node, data: { ...node.data, memberNodeIds: members } };
                }
                return node;
            });

            setNodes(fullyFormedNodes);
            setEdges(existingWorkflow.edges.map((e: any) => {
                const condition = e.condition || 'ALWAYS';
                const sourceType = e.sourceType || 'TASK';
                const isThen = condition === 'ON_THEN';
                const isElse = condition === 'ON_ELSE';
                const isSuccess = condition === 'ON_SUCCESS';
                const isFailure = condition === 'ON_FAILURE';

                const labelMapping: Record<string, string> = {
                    'ON_SUCCESS': 'On Success',
                    'ON_FAILURE': 'On Failure',
                    'ON_THEN': 'IF TRUE (THEN)',
                    'ON_ELSE': 'IF FALSE (ELSE)'
                };

                const sourceNode = existingWorkflow.nodes.find((n: any) => n.id === e.source);
                const targetNode = existingWorkflow.nodes.find((n: any) => n.id === e.target);
                const isTryToCatch = (sourceNode as any)?.taskType === 'TRY_ZONE' && (targetNode as any)?.taskType === 'CATCH';

                return {
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle || (sourceType === 'IF' ? (condition === 'ON_THEN' ? 'then' : 'else') : null),
                    type: 'custom',
                    data: { condition, sourceType, isLocked: isTryToCatch, onHistoryQueue: queueHistory },
                    animated: true,
                    label: condition === 'ALWAYS' ? '' : (labelMapping[condition] || condition.replace('ON_', '')),
                    style: { 
                        stroke: (isThen || isSuccess) ? '#22c55e' : (isElse || isFailure) ? '#ef4444' : '#94a3b8', 
                        strokeWidth: 2 
                    },
                };
            }))
            setTimeout(() => { queueHistory('Initial Load'); setIsDirty(false); }, 50); // Small delay to prevent initial load marking as dirty
        }

        return () => {
            // Cleanup: reset initializedRef when workflow changes or unmounts
            if (!workflowId) {
                initializedRef.current = null;
            }
        };
    }, [existingWorkflow, tasks, workflowId])

    useEffect(() => {
        const handleSaveRequest = () => {
            handleSave();
        };
        window.addEventListener('DESIGNER_SAVE_REQUESTED', handleSaveRequest);
        
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = ''; // Standard for browser prompts
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('DESIGNER_SAVE_REQUESTED', handleSaveRequest);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, nodes, edges, workflowName, workflowTags]);

    const onConnect = useCallback(
        (params: Connection) => {
            const sourceNode = nodes.find(n => n.id === params.source);
            const targetNode = nodes.find(n => n.id === params.target);
            const isIfNode = sourceNode?.type === 'ifNode';
            
            let condition = 'ALWAYS';
            let color = '#94a3b8';
            
            if (isIfNode) {
                if (params.sourceHandle === 'then') {
                    const existingThen = edges.find(e => e.source === params.source && e.data?.condition === 'ON_THEN');
                    if (existingThen) {
                        showToast("Logic reached: This branch already has a connection.", "error");
                        return;
                    }
                    condition = 'ON_THEN';
                    color = '#22c55e';
                } else if (params.sourceHandle === 'else') {
                    const existingElse = edges.find(e => e.source === params.source && e.data?.condition === 'ON_ELSE');
                    if (existingElse) {
                        showToast("Logic reached: This branch already has a connection.", "error");
                        return;
                    }
                    condition = 'ON_ELSE';
                    color = '#ef4444';
                } else {
                    showToast("Please draw line from either the green (THEN) or red (ELSE) dot.", "error");
                    return;
                }
            }

            if (sourceNode?.data.taskType === 'TRY_ZONE' && targetNode?.data.taskType === 'CATCH') {
                condition = 'ON_FAILURE';
                color = '#ef4444';
                
                // Update Try Zone data to link to this catch handler
                setNodes((nds: any) => nds.map((n: any) => 
                    n.id === params.source ? { ...n, data: { ...n.data, catchHandlerId: params.target } } : n
                ));
            }

            const labelMapping: Record<string, string> = {
                'ON_SUCCESS': 'On Success',
                'ON_FAILURE': 'ON ERROR', // User requested label
                'ON_THEN': 'IF TRUE (THEN)',
                'ON_ELSE': 'IF FALSE (ELSE)',
            };

            const isTryToCatch = sourceNode?.data.taskType === 'TRY_ZONE' && targetNode?.data.taskType === 'CATCH';

            setEdges((eds) => addEdge({ 
                ...params, 
                type: 'custom',
                data: { 
                    condition,
                    sourceType: sourceNode?.type === 'ifNode' ? 'IF' : (sourceNode?.data.taskType || 'TASK'),
                    isLocked: isTryToCatch
                },
                animated: true, 
                label: condition === 'ALWAYS' ? '' : (labelMapping[condition] || condition.replace('ON_', '')),
                style: { 
                    stroke: color, 
                    strokeWidth: 2,
                    strokeDasharray: condition === 'ON_FAILURE' ? '5,5' : undefined
                } 
            }, eds));
            queueHistory('Connected Nodes');
            setIsDirty(true);
        },
        [setEdges, nodes, edges, showToast, setIsDirty]
    )

    const onNodeDragStart = useCallback((event: any, node: any) => {
        nodeDragStartPosRef.current = { ...node.position };
    }, []);

    const onNodeDragStop = useCallback((event: any, draggedNode: any) => {
        if (draggedNode.type === 'tryZoneNode') {
            const z = nodes.find((n: any) => n.id === draggedNode.id);
            if (!z) return;

            const zoneX = draggedNode.position.x;
            const zoneY = draggedNode.position.y;
            const zoneW = parseInt(String(z.width || z.style?.width || 400));
            const zoneH = parseInt(String(z.height || z.style?.height || 250));
            const zoneBounds = { x: zoneX, y: zoneY, w: zoneW, h: zoneH };

            setNodes((nds: any) => {
                const updatedMembers: string[] = [];
                const nextNodes = nds.map((n: any) => {
                    if (n.id === draggedNode.id) return n;
                    
                    // Only consider nodes that are NOT currently in another zone or are in THIS zone
                    if (n.parentNode && n.parentNode !== draggedNode.id) return n;

                    const nodeX = n.parentNode ? (n.position.x + zoneX) : n.position.x;
                    const nodeY = n.parentNode ? (n.position.y + zoneY) : n.position.y;
                    const nodeW = parseInt(n.width || n.style?.width || 240);
                    const nodeH = parseInt(n.height || n.style?.height || 120);

                    const isInside = nodeX > zoneX && nodeX < (zoneX + zoneW) &&
                                     nodeY > zoneY && nodeY < (zoneY + zoneH);

                    if (isInside) {
                        updatedMembers.push(n.id);
                        return {
                            ...n,
                            parentNode: draggedNode.id,
                            extent: 'parent',
                            position: n.parentNode ? n.position : { x: n.position.x - zoneX, y: n.position.y - zoneY }
                        };
                    } else if (n.parentNode === draggedNode.id) {
                        // Node was in the zone but is now outside
                        return {
                            ...n,
                            parentNode: undefined,
                            extent: undefined,
                            position: { x: n.position.x + zoneX, y: n.position.y + zoneY }
                        };
                    }
                    return n;
                });

                return nextNodes.map((n: any) => 
                    n.id === draggedNode.id ? { ...n, data: { ...n.data, memberNodeIds: updatedMembers } } : n
                );
            });

            queueHistory('Moved Zone (Scooped Nodes)');
            setIsDirty(true);
            return;
        }

        // 1. Determine if and which zone the node is inside
        const zones = nodes.filter((n: any) => n.type === 'tryZoneNode');
        let foundZone: any = null;
        let expansionDetails: { shiftX: number, shiftY: number, zoneId: string, zoneX: number, zoneY: number, zoneW: number, zoneH: number } | null = null;
        
        const globalX = (draggedNode.parentNode ? (draggedNode.position.x + (nodes.find(p => p.id === draggedNode.parentNode)?.position.x || 0)) : draggedNode.position.x);
        const globalY = (draggedNode.parentNode ? (draggedNode.position.y + (nodes.find(p => p.id === draggedNode.parentNode)?.position.y || 0)) : draggedNode.position.y);

        for (const zone of zones) {
            const zoneX = zone.position.x;
            const zoneY = zone.position.y;
            const zoneW = parseInt(String(zone.width || zone.style?.width || 400));
            const zoneH = parseInt(String(zone.height || zone.style?.height || 250));
            
            const isInside = globalX > zoneX && globalX < (zoneX + zoneW) &&
                             globalY > zoneY && globalY < (zoneY + zoneH);

            if (isInside) {
                foundZone = zone;
                // Check for expansion
                const PADDING = 40;
                const nodeW = draggedNode.width || 240;
                const nodeH = draggedNode.height || 120;
                
                let newW = zoneW;
                let newH = zoneH;
                
                if (globalX + nodeW + PADDING > zoneX + zoneW) {
                    newW = (globalX - zoneX) + nodeW + PADDING;
                }
                if (globalY + nodeH + PADDING > zoneY + zoneH) {
                    newH = (globalY - zoneY) + nodeH + PADDING;
                }

                if (newW !== zoneW || newH !== zoneH) {
                    expansionDetails = {
                        shiftX: newW - zoneW,
                        shiftY: newH - zoneH,
                        zoneId: zone.id,
                        zoneX, zoneY, zoneW, zoneH
                    };
                }
                break;
            }
        }

        const insideZoneId = foundZone?.id || null;

        // 2. Perform Single Atomic Update
        setNodes((nds: any) => {
            let updatedNodes = nds.map((n: any) => {
                let updated = { ...n };

                // A. Update the dragged node (Reparenting)
                if (n.id === draggedNode.id) {
                    if (insideZoneId && insideZoneId !== n.parentNode) {
                        const zone = nds.find((z: any) => z.id === insideZoneId);
                        updated.parentNode = insideZoneId;
                        updated.extent = 'parent';
                        updated.position = { x: globalX - zone.position.x, y: globalY - zone.position.y };
                    } else if (!insideZoneId && n.parentNode) {
                        const parent = nds.find((p: any) => p.id === n.parentNode);
                        updated.parentNode = undefined;
                        updated.extent = undefined;
                        updated.position = { x: n.position.x + (parent?.position.x || 0), y: n.position.y + (parent?.position.y || 0) };
                    }
                }

                // B. Update Zone Membership Counts & Dimensions
                if (n.type === 'tryZoneNode') {
                    const memberIds = new Set(n.data.memberNodeIds || []);
                    if (n.id === insideZoneId) memberIds.add(draggedNode.id);
                    else memberIds.delete(draggedNode.id);
                    updated.data = { ...updated.data, memberNodeIds: Array.from(memberIds) };

                    // C. Zone Expansion
                    if (expansionDetails && n.id === expansionDetails.zoneId) {
                        const { shiftX, shiftY } = expansionDetails;
                        updated.width = (updated.width || 400) + (shiftX > 0 ? shiftX : 0);
                        updated.height = (updated.height || 250) + (shiftY > 0 ? shiftY : 0);
                        updated.style = { ...updated.style, width: updated.width, height: updated.height };
                    }
                }
                return updated;
            });

            // D. Node Pushing (Cascading Collision Sweep)
            if (expansionDetails) {
                const { shiftX, shiftY, zoneX, zoneY, zoneW, zoneH } = expansionDetails;
                const PADDING = 40;
                
                const getNodeBounds = (node: any) => ({
                    x: node.position.x,
                    y: node.position.y,
                    w: parseInt(node.width || node.style?.width || 240),
                    h: parseInt(node.height || node.style?.height || 120)
                });

                const checkIntersection = (b1: any, b2: any) => {
                    return b1.x < b2.x + b2.w && b1.x + b1.w > b2.x &&
                           b1.y < b2.y + b2.h && b1.y + b1.h > b2.y;
                };

                let shifts: Record<string, {x: number, y: number}> = {};
                let movedInIteration = false;
                
                do {
                    movedInIteration = false;
                    for (const n of updatedNodes) {
                        if (n.id === draggedNode.id || n.id === expansionDetails.zoneId || n.parentNode) continue;
                        
                        const bounds = getNodeBounds(n);
                        const curShiftX = shifts[n.id]?.x || 0;
                        const curShiftY = shifts[n.id]?.y || 0;
                        const currentBounds = { ...bounds, x: bounds.x + curShiftX, y: bounds.y + curShiftY };
                        
                        let needsShiftX = 0;
                        let needsShiftY = 0;
                        
                        if (shiftX > 0) {
                            const rightSwath = { x: zoneX + zoneW - PADDING, y: zoneY, w: shiftX + PADDING*2, h: zoneH };
                            if (checkIntersection(currentBounds, rightSwath) && currentBounds.x >= zoneX + zoneW - PADDING) {
                                needsShiftX = shiftX;
                            }
                        }
                        if (shiftY > 0) {
                            const bottomSwath = { x: zoneX, y: zoneY + zoneH - PADDING, w: zoneW, h: shiftY + PADDING*2 };
                            if (checkIntersection(currentBounds, bottomSwath) && currentBounds.y >= zoneY + zoneH - PADDING) {
                                needsShiftY = shiftY;
                            }
                        }

                        // Check collision with ALL other shifting nodes
                        for (const other of updatedNodes) {
                            if (other.id === n.id || other.id === draggedNode.id || other.id === expansionDetails.zoneId || other.parentNode) continue;
                            if (shifts[other.id] && (shifts[other.id].x > 0 || shifts[other.id].y > 0)) {
                                const otherBounds = getNodeBounds(other);
                                const otherNewBounds = { ...otherBounds, x: otherBounds.x + shifts[other.id].x, y: otherBounds.y + shifts[other.id].y };
                                const otherPadded = { 
                                    x: otherNewBounds.x - PADDING, y: otherNewBounds.y - PADDING, 
                                    w: otherNewBounds.w + PADDING*2, h: otherNewBounds.h + PADDING*2 
                                };
                                if (checkIntersection(currentBounds, otherPadded)) {
                                    if (shifts[other.id].x > 0 && currentBounds.x >= otherBounds.x) needsShiftX = Math.max(needsShiftX, shifts[other.id].x);
                                    if (shifts[other.id].y > 0 && currentBounds.y >= otherBounds.y) needsShiftY = Math.max(needsShiftY, shifts[other.id].y);
                                }
                            }
                        }

                        if (needsShiftX > curShiftX || needsShiftY > curShiftY) {
                            shifts[n.id] = { x: Math.max(curShiftX, needsShiftX), y: Math.max(curShiftY, needsShiftY) };
                            movedInIteration = true;
                        }
                    }
                } while (movedInIteration);

                updatedNodes = updatedNodes.map((n: any) => {
                    if (shifts[n.id] && (shifts[n.id].x > 0 || shifts[n.id].y > 0)) {
                        return { ...n, position: { x: n.position.x + shifts[n.id].x, y: n.position.y + shifts[n.id].y } };
                    }
                    return n;
                });
            }

            return updatedNodes;
        });
        queueHistory('Moved Node(s)');
        setIsDirty(true);
    }, [nodes, setNodes, setIsDirty]);

    const saveMutation = useMutation({
        mutationFn: (data: any) => workflowId
            ? workflowsApi.updateWorkflow(workflowId, data)
            : workflowsApi.createWorkflow(data),
        onSuccess: (data: any) => {
            showToast('Workflow saved successfully!', 'success')
            queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] })
            queryClient.invalidateQueries({ queryKey: ['workflows-all'] })
            setIsDirty(false);
            if (!workflowId && data?.id) {
                // If this is a newly created workflow, update the URL to switch to edit mode
                setSearchParams({ id: data.id }, { replace: true });
            }
        },
        onError: (err: any) => showToast(`Save failed: ${err.message}`, 'error'),
    })

    const executeMutation = useMutation({
        mutationFn: (id: string) => workflowsApi.executeWorkflow(id),
        onSuccess: () => showToast('Workflow execution started!', 'success'),
    })

    const handleExecute = async () => {
        if (!workflowId) return;
        
        if (isDirty) {
            // Save first, then execute
            const workflowData = {
                name: workflowName,
                tags: workflowTags,
                nodes: nodes.map(n => {
                    const { onDelete, onChangeTargetTags, onChangeFailureStrategy, onChangeFailureStatusOverride, onEdit, onResizeEnd, position: _p, id: _i, type: _t, parentNode: _pn, extent: _e, width: _w, height: _h, style: _s, ...cleanData } = n.data || {};
                    return {
                        ...cleanData,
                        id: n.id,
                        position: n.position,
                        width: parseInt(String(n.style?.width || (n as any).width || n.data?.width || 400)),
                        height: parseInt(String(n.style?.height || (n as any).height || n.data?.height || 250)),
                        parentNode: n.parentNode,
                        extent: n.extent
                    };
                }),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    condition: e.data?.condition || 'ALWAYS',
                    sourceType: e.data?.sourceType || 'TASK'
                })),
                ...workflowMetadata
            }
            
            try {
                await saveMutation.mutateAsync(workflowData);
                executeMutation.mutate(workflowId);
            } catch (err) {
                // Toast already shown by saveMutation
            }
        } else {
            executeMutation.mutate(workflowId);
        }
    }

    const handleSave = () => {
        // Integrity Validation
        const tryZones = nodes.filter(n => n.data.taskType === 'TRY_ZONE');
        const catches = nodes.filter(n => n.data.taskType === 'CATCH');

        for (const zone of tryZones) {
            const hasCatch = edges.some(e => e.source === zone.id && e.data?.condition === 'ON_FAILURE');
            if (!hasCatch) {
                showToast(`Warning: Try Zone "${zone.data.label || zone.id}" has no Catch Handler connected. Node failures inside this zone will halt the workflow.`, 'warning');
            }
        }

        for (const catchNode of catches) {
            const hasOutgoing = edges.some(e => e.source === catchNode.id);
            if (!hasOutgoing) {
                showToast(`Warning: Catch Handler "${catchNode.data.label || catchNode.id}" has no outgoing connections. It acts as a dead end.`, 'warning');
            }
        }

        const workflowData = {
            name: workflowName,
            tags: workflowTags,
            nodes: nodes.map(n => {
                const { onDelete, onChangeTargetTags, onChangeFailureStrategy, onChangeFailureStatusOverride, onEdit, onResizeEnd, position: _p, id: _i, type: _t, parentNode: _pn, extent: _e, width: _w, height: _h, style: _s, ...cleanData } = n.data || {};
                return {
                    ...cleanData,
                    id: n.id,
                    position: n.position,
                    width: parseInt(String(n.style?.width || (n as any).width || n.data?.width || 400)),
                    height: parseInt(String(n.style?.height || (n as any).height || n.data?.height || 250)),
                    parentNode: n.parentNode,
                    extent: n.extent
                };
            }),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                condition: e.data?.condition || 'ALWAYS',
                sourceType: e.data?.sourceType || 'TASK'
            })),
            ...workflowMetadata
        }
        saveMutation.mutate(workflowData)
    }

    const handleCancel = () => {
        if (isDirty) {
            setShowDirtyModal(true);
            setPendingAction(() => () => navigate('/'));
        } else {
            navigate('/');
        }
    };

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'tasks': true, 'workflows': false });
    const [expandedSubFolders, setExpandedSubFolders] = useState<Record<string, boolean>>({});

    const groupedLibraryItems = (() => {
        const result: Record<string, Record<string, any[]>> = {
            'Tasks': {},
            'Workflows': {}
        };
        
        const q = searchQuery.toLowerCase();

        // Helper to find folder name by ID
        const getFolderName = (folders: any[], id?: string): string => {
            if (!id) return 'Default';
            const findInTree = (nodes: any[]): string | null => {
                for (const node of nodes) {
                    if (node.id === id) return node.name;
                    if (node.children) {
                        const found = findInTree(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            return findInTree(folders || []) || 'Default';
        };

        // Group Tasks
        tasks?.filter((t: any) => {
            const name = t.name?.toLowerCase() ?? '';
            return name.includes(q);
        }).forEach((t: any) => {
            const folderName = getFolderName(taskFolders || [], t.folderId);
            if (!result['Tasks'][folderName]) result['Tasks'][folderName] = [];
            result['Tasks'][folderName].push({ ...t, itemType: 'TASK' });
        });

        // Group Workflows
        allWorkflows?.filter((w: any) => {
            if (w.id === workflowId) return false;
            const name = w.name?.toLowerCase() ?? '';
            return name.includes(q);
        }).forEach((w: any) => {
            const folderName = getFolderName(workflowFolders || [], w.folderId);
            if (!result['Workflows'][folderName]) result['Workflows'][folderName] = [];
            result['Workflows'][folderName].push({ ...w, itemType: 'WORKFLOW' });
        });

        return result;
    })()

    const onDragStart = (event: any, task: any) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(task));
        event.dataTransfer.effectAllowed = 'move';
    };

    const isTaskInWorkflow = (itemId: string) => nodes.some(n => n.data.taskId === itemId)

    if (isWfLoading || !tasks || isLoadingWorkflows) return <div style={{ color: '#1976D2', textAlign: 'center', padding: '100px', fontWeight: 'bold' }}>Initialising Designer Engine...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px 24px', borderRadius: '16px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(25,118,210,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(25,118,210,0.2)' }}>
                            <Network style={{ color: '#1976D2' }} size={20} />
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                value={workflowName}
                                onChange={(e) => { setWorkflowName(e.target.value); setIsDirty(true); }}
                                style={{ background: 'transparent', border: 'none', color: '#111827', fontSize: '20px', fontWeight: 'bold', outline: 'none', width: '250px' }}
                            />
                            <Pencil size={14} color="#999" />
                        </div>
                    </div>
                    <div style={{ height: '32px', width: '1px', background: '#eee' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Targeting Group</span>
                        <input
                            value={workflowTags.join(', ')}
                            onChange={(e) => { setWorkflowTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean)); setIsDirty(true); }}
                            style={{ background: '#f9fafb', border: '1px solid #eee', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#1976D2', outline: 'none', width: '150px', fontWeight: 'bold' }}
                            placeholder="e.g. prod, linux"
                        />
                    </div>
                    <div style={{ height: '32px', width: '1px', background: '#eee' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {bindings && bindings.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Schedule</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={12} className="text-emerald-500" />
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                                        {bindings.filter(b => b.state === 'ACTIVE').length} Active Triggers
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>No Schedule</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>Manual Only</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
                            <button onClick={handleUndo} disabled={!canUndo} style={{ padding: '8px 12px', background: canUndo ? 'white' : '#f9fafb', color: canUndo ? '#4b5563' : '#d1d5db', cursor: canUndo ? 'pointer' : 'not-allowed', border: 'none', borderRight: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }} title="Undo (Ctrl+Z)">
                                <Undo2 size={16} />
                            </button>
                            <button onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} style={{ padding: '8px 6px', background: 'white', color: '#4b5563', border: 'none', cursor: 'pointer', borderRight: '1px solid #e5e7eb' }}>
                                <ChevronDown size={14} />
                            </button>
                            <button onClick={handleRedo} disabled={!canRedo} style={{ padding: '8px 12px', background: canRedo ? 'white' : '#f9fafb', color: canRedo ? '#4b5563' : '#d1d5db', cursor: canRedo ? 'pointer' : 'not-allowed', border: 'none', display: 'flex', alignItems: 'center' }} title="Redo (Ctrl+Y)">
                                <Redo2 size={16} />
                            </button>
                        </div>
                        {isHistoryPanelOpen && (
                            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', background: 'white', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '240px', zIndex: 1000, overflow: 'hidden' }}>
                                <div style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '11px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Action History ({historyRef.current.length})</div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {[...historyRef.current].reverse().map((snap, i) => {
                                        const originalIndex = historyRef.current.length - 1 - i;
                                        const isActive = originalIndex === historyIndexRef.current;
                                        const isFuture = originalIndex > historyIndexRef.current;
                                        return (
                                            <div key={originalIndex} onClick={() => { jumpToHistory(originalIndex); setIsHistoryPanelOpen(false); }} style={{ padding: '10px 12px', fontSize: '12px', cursor: 'pointer', background: isActive ? '#eff6ff' : 'white', color: isFuture ? '#9ca3af' : isActive ? '#1d4ed8' : '#374151', borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isActive ? <Check size={12} style={{ color: '#3b82f6' }} /> : <div style={{ width: '12px' }} />}
                                                {snap.actionName} {originalIndex === 0 && "(Initial)"}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    {isDirty && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                            <div className="animate-pulse" style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
                            Unsaved Changes
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            const next = !isCompact;
                            setIsCompact(next);
                            // Also update existing nodes on canvas immediately for reactive UI
                            setNodes((nds: any) => nds.map((n: any) => ({
                                ...n,
                                data: { ...n.data, isCompact: next }
                            })));
                        }}
                        style={{
                            padding: '8px 16px',
                            background: isCompact ? '#f0f9ff' : '#f9fafb',
                            color: isCompact ? '#0369a1' : '#4b5563',
                            border: `1px solid ${isCompact ? '#bae6fd' : '#e5e7eb'}`,
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                        className="hover:shadow-sm"
                    >
                        {isCompact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        {isCompact ? 'Detailed Mode' : 'Compact Mode'}
                    </button>

                    <button 
                        onClick={() => setIsTopDrawerOpen(!isTopDrawerOpen)}
                        style={{
                            padding: '8px 16px',
                            background: isTopDrawerOpen ? '#f05a28' : '#f9fafb',
                            color: isTopDrawerOpen ? 'white' : '#4b5563',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        <Settings2 size={16} />
                        Utility Toolbox
                    </button>

                    <button 
                        onClick={handleCancel}
                        style={{ background: 'transparent', border: '1px solid #ddd', color: '#6b7280', padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{ background: 'white', border: '1px solid #ddd', color: '#374151', padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Save Workflow
                    </button>
                    <button 
                        onClick={() => setIsAdminPanelOpen(true)}
                        style={{ border: '1px solid #e2e8f0', background: 'white', color: '#64748b', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        className="hover:border-primary-500 hover:text-primary-500 hover:bg-slate-50"
                        title="Workflow Administration"
                    >
                        <Shield style={{ color: '#1976D2' }} size={18} />
                    </button>
                    <button 
                        onClick={handleExecute}
                        disabled={!workflowId}
                        style={{ background: '#1976D2', color: '#fff', border: 'none', padding: '8px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: workflowId ? 1 : 0.5, fontSize: '13px', boxShadow: '0 4px 6px rgba(25,118,210,0.2)' }}
                    >
                        Run Now
                    </button>
                </div>
            </div>

            {/* Top Drawer for Utilities */}
            {isTopDrawerOpen && (
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.8)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #eee', 
                    borderRadius: '16px', 
                    padding: '20px', 
                    marginBottom: '10px',
                    display: 'flex',
                    gap: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    animation: 'slide-in-top 0.3s ease-out'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Workflow Utilities</h4>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {/* VMA */}
                            <div 
                                draggable
                                onDragStart={(e) => onDragStart(e, { id: 'util-vars', name: 'Variables Manipulation', taskType: 'VARIABLE' })}
                                style={{
                                    padding: '16px 24px',
                                    background: 'white',
                                    border: '2px dashed #ffcc00',
                                    borderRadius: '12px',
                                    cursor: 'grab',
                                    fontSize: '14px',
                                    color: '#856404',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    minWidth: '240px'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105"
                            >
                                <Zap size={20} fill="#ffcc00" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>Variables Manipulation</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Transform & Store Data</div>
                                </div>
                            </div>

                            {/* IF */}
                            <div 
                                draggable
                                onDragStart={(e) => onDragStart(e, { id: 'util-if', name: 'Branch Logic', taskType: 'IF' })}
                                style={{
                                    padding: '16px 24px',
                                    background: 'white',
                                    border: '2px dashed #f59e0b',
                                    borderRadius: '12px',
                                    cursor: 'grab',
                                    fontSize: '14px',
                                    color: '#b45309',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    minWidth: '200px'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105"
                            >
                                <GitBranch size={20} className="text-amber-500" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>IF / ELSE Branch</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Conditional Logic</div>
                                </div>
                            </div>

                            {/* TRY */}
                            <div 
                                draggable
                                onDragStart={(e) => onDragStart(e, { id: 'util-try', name: 'Try Area', taskType: 'TRY_ZONE' })}
                                style={{
                                    padding: '16px 24px',
                                    background: 'white',
                                    border: '2px dashed #22c55e',
                                    borderRadius: '12px',
                                    cursor: 'grab',
                                    fontSize: '14px',
                                    color: '#166534',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    minWidth: '200px'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105"
                            >
                                <Zap size={20} fill="#22c55e" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>Try Area</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Guard Execution</div>
                                </div>
                            </div>

                            {/* CATCH */}
                            <div 
                                draggable
                                onDragStart={(e) => onDragStart(e, { id: 'util-catch', name: 'Catch Handler', taskType: 'CATCH' })}
                                style={{
                                    padding: '16px 24px',
                                    background: 'white',
                                    border: '2px dashed #ef4444',
                                    borderRadius: '12px',
                                    cursor: 'grab',
                                    fontSize: '14px',
                                    color: '#991b1b',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    minWidth: '200px'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105"
                            >
                                <Shield size={20} fill="#ef4444" fillOpacity={0.6} />
                                <div>
                                    <div style={{ fontSize: '14px' }}>Catch Handler</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Error Handling</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Agentic Intelligence</h4>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {/* MCP CLIENT */}
                            <div 
                                draggable
                                onDragStart={(e) => onDragStart(e, { id: 'util-mcp', name: 'MCP Action', taskType: 'MCP_CLIENT' })}
                                style={{
                                    padding: '16px 24px',
                                    background: 'white',
                                    border: '2px dashed #d946ef',
                                    borderRadius: '12px',
                                    cursor: 'grab',
                                    fontSize: '14px',
                                    color: '#701a75',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    minWidth: '240px'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center transition-colors group-hover:bg-fuchsia-600 group-hover:text-white">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px' }}>MCP Connector</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Universal AI Tool Interface</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsTopDrawerOpen(false)} style={{ border: 'none', background: 'transparent', color: '#999', alignSelf: 'flex-start', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Main Area */}
            <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0 }}>
                
                {/* Palette */}
                <div style={{ width: '320px', background: 'white', borderRadius: '16px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>


                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Library</h3>
                        <p style={{ fontSize: '11px', color: '#666' }}>Drag & Drop tasks or workflows.</p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text"
                                placeholder="Search library..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    paddingLeft: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid #eee',
                                    fontSize: '13px',
                                    background: '#f9f9f9',
                                    outline: 'none'
                                }}
                            />
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                                <Network size={14} />
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }} className="space-y-1">
                        {isLoadingTasks || isLoadingWorkflows ? (
                            <div style={{ color: '#999', fontSize: '12px', padding: '20px', textAlign: 'center' }}>Loading library...</div>
                        ) : (
                            Object.entries(groupedLibraryItems).map(([type, folderGroups]) => {
                                const hasItems = Object.values(folderGroups).some(items => items.length > 0);
                                if (!hasItems && searchQuery) return null;
                                const isTasks = type === 'Tasks';
                                const key = type.toLowerCase();
                                
                                return (
                                    <div key={type} className="mb-2">
                                        <button 
                                            onClick={() => setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }))}
                                            style={{ 
                                                width: '100%',
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px',
                                                padding: '8px',
                                                borderRadius: '8px'
                                            }}
                                            className="hover:bg-gray-50 transition-colors group"
                                        >
                                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${(expandedFolders[key] || searchQuery) ? 'rotate-90' : ''}`} />
                                            {isTasks ? <Box size={14} className="text-blue-500"/> : <GitBranch size={14} className="text-indigo-600" />}
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>{type}</span>
                                        </button>

                                        {(expandedFolders[key] || searchQuery) && (
                                            <div className="ml-4 mt-1 border-l border-gray-100 pl-2 space-y-1">
                                                {Object.entries(folderGroups).map(([folderName, items]) => (
                                                    <div key={folderName} className="mb-2">
                                                        <button 
                                                            onClick={() => setExpandedSubFolders(prev => ({ ...prev, [`${key}-${folderName}`]: !prev[`${key}-${folderName}`] }))}
                                                            style={{ 
                                                                width: '100%',
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px',
                                                                padding: '6px 8px',
                                                                borderRadius: '6px'
                                                            }}
                                                            className="hover:bg-gray-50 transition-colors group/sub"
                                                        >
                                                            <ChevronRight size={12} className={`transition-transform text-gray-400 group-hover/sub:text-gray-600 ${(expandedSubFolders[`${key}-${folderName}`] || searchQuery) ? 'rotate-90' : ''}`} />
                                                            <Folder size={12} style={{ color: '#555' }} />
                                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{folderName}</span>
                                                        </button>

                                                        {(expandedSubFolders[`${key}-${folderName}`] || searchQuery) && (
                                                            <div className="ml-5 mt-1 space-y-1 border-l border-gray-50 pl-2">
                                                                {items.map((item: any) => {
                                                                    const selected = isTaskInWorkflow(item.id);
                                                                    const isWf = item.itemType === 'WORKFLOW';
                                                                    const IconUrl = getEffectiveIcon(item);

                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            draggable
                                                                            onDragStart={(event) => onDragStart(event, item)}
                                                                            style={{
                                                                                padding: '8px 12px',
                                                                                background: selected ? (isWf ? '#eff6ff' : '#f0f7ff') : 'white',
                                                                                border: `1px solid ${selected ? (isWf ? '#3b82f6' : '#1976D2') : '#f3f4f6'}`,
                                                                                borderRadius: '10px',
                                                                                cursor: 'grab',
                                                                                fontSize: '12px',
                                                                                color: '#333',
                                                                                fontWeight: '600',
                                                                                transition: 'all 0.2s',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '10px',
                                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                                            }}
                                                                            className="hover:border-blue-200 hover:shadow-sm"
                                                                        >
                                                                            <div style={{ 
                                                                                width: '20px', 
                                                                                height: '20px', 
                                                                                borderRadius: '6px', 
                                                                                background: isWf ? '#f0f4ff' : '#f9fafb',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                border: '1px solid #f3f4f6'
                                                                            }}>
                                                                                {IconUrl ? (
                                                                                    <img src={IconUrl} style={{ width: '12px', height: '12px', objectFit: 'contain' }} alt="icon" />
                                                                                ) : (
                                                                                    isWf ? <Layers size={10} className="text-blue-500" /> : <Box size={10} className="text-gray-400" />
                                                                                )}
                                                                            </div>
                                                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                                                            {selected && <Check size={12} className="text-blue-500" strokeWidth={3} />}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <ReactFlowCanvas
                    nodes={nodes}
                    edges={edges}
                    isCompact={isCompact}
                    onNodesChange={(changes: any) => { onNodesChange(changes); setIsDirty(true); }}
                    onEdgesChange={(changes: any) => { onEdgesChange(changes); setIsDirty(true); }}
                    onConnect={onConnect}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDragStop={onNodeDragStop}
                    onNodeClick={onNodeClick}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    setIsDirty={setIsDirty}
                    reactFlowWrapper={reactFlowWrapper}
                    disableKeyboardActions={!!editingNode || isAdminPanelOpen}
                    isDeleteModalOpen={isDeleteModalOpen}
                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                    deleteZoneAll={deleteZoneAll}
                    deleteZoneOnly={deleteZoneOnly}
                    zoneToDelete={zoneToDelete}
                    onDeleteZoneRequest={handleDeleteZoneRequest}
                    onEditNode={handleManualNodeEdit}
                    queueHistory={queueHistory}
                    onZoneResizeEnd={handleZoneResizeEnd}
                />
            </div>

            {editingNode && (() => {
                // Calculate Upstream Variables
                const upstreamNodes: string[] = [];
                const queue = [editingNode.id];
                const visited = new Set();
                while (queue.length > 0) {
                    const currId = queue.shift();
                    if (visited.has(currId)) continue;
                    visited.add(currId);
                    edges.filter(e => e.target === currId).forEach(e => {
                        upstreamNodes.push(e.source);
                        queue.push(e.source);
                    });
                }

                // 1. Inputs from the current workflow
                const parentInputNames = Object.keys(existingWorkflow?.inputVariables || {})
                    .filter(k => !k.startsWith('__'))
                    .map(name => ({ name, taskName: 'Workflow Input', value: '{{' + name + '}}', source: 'workflow_input' as const }));

                const parentOutputNames = Object.keys(existingWorkflow?.outputVariables || {})
                    .filter(k => !k.startsWith('__'))
                    .map(name => ({ name, taskName: 'Workflow Output', value: '{{' + name + '}}', source: 'workflow_output' as const }));

                // 2. Outputs from upstream tasks and workflows
                const upstreamVarNames = nodes
                    .filter(n => upstreamNodes.includes(n.id))
                    .flatMap(n => {
                        const isNodeWorkflow = n.data.taskType === 'WORKFLOW' || !!(allWorkflows as any[])?.find((w: any) => w.id === n.data.taskId);
                        let libVars = {};
                        if (isNodeWorkflow) {
                            const wfDef = (allWorkflows as any[])?.find((w: any) => w.id === n.data.taskId);
                            libVars = wfDef?.outputVariables || {};
                        } else {
                            const taskDef = (tasks as any[])?.find((t: any) => t.id === n.data.taskId);
                            libVars = (taskDef as any)?.variableExtraction?.vars || (taskDef as any)?.command?.outputProcessing?.vars || {};
                        }
                        
                        // Merge library defaults with node-specific overlays
                        const nodeVars = n.data.variableExtraction?.vars || {};
                        const combinedNodeVars = { ...libVars, ...nodeVars };
                        
                        return Object.keys(combinedNodeVars)
                            .filter(k => !k.startsWith('__'))
                            .map(name => ({ 
                                name, 
                                taskName: n.data.label || 'Task',
                                nodeId: n.id,
                                value: `{{${name}}}`,
                                source: (isNodeWorkflow ? 'workflow' : 'task') as 'workflow' | 'task' | 'workflow_input' | 'workflow_output'
                            }));
                    });

                const combinedVars = [...parentInputNames, ...parentOutputNames, ...upstreamVarNames];

                const isUtil = editingNode.data.taskType === 'VARIABLE' || editingNode.data.taskId === '00000000-0000-0000-0000-000000000001';

                return (
                    <TaskEditShelf 
                        taskId={editingNode?.data?.taskId}
                        nodeData={editingNode?.data}
                        availableUpstreamVars={combinedVars}
                        onClose={() => setEditingNode(null)}
                        onSaveNode={(data) => {
                            setNodes(nds => nds.map(n => n.id === editingNode.id ? { ...n, data: { ...n.data, ...data } } : n))
                            queueHistory('Updated Task Settings');
                            setIsDirty(true)
                        }}
                    />
                );
            })()}

            {isAdminPanelOpen && (() => {
                // For global workflow context (Notifications / Output Vars), show ALL task outputs + workflow inputs
                const allTaskVars = nodes.flatMap(n => {
                    const isNodeWorkflow = n.data.taskType === 'WORKFLOW' || !!(allWorkflows as any[])?.find((w: any) => w.id === n.data.taskId);
                    let libVars: any = {};
                    if (isNodeWorkflow) {
                        const wfDef = (allWorkflows as any[])?.find((w: any) => w.id === n.data.taskId);
                        libVars = wfDef?.outputVariables || {};
                    } else {
                        const taskDef = (tasks as any[])?.find((t: any) => t.id === n.data.taskId);
                        libVars = (taskDef as any)?.variableExtraction?.vars || (taskDef as any)?.command?.outputProcessing?.vars || {};
                    }
                    const nodeVars = n.data.variableExtraction?.vars || {};
                    const combined = { ...libVars, ...nodeVars };
                    return Object.keys(combined).filter(k => !k.startsWith('__')).map(name => ({
                        name,
                        taskName: n.data.label || 'Task',
                        source: (isNodeWorkflow ? 'workflow' : 'task') as 'workflow' | 'task' | 'workflow_input' | 'workflow_output',
                        value: `{{${name}}}`
                    }));
                });

                const parentInputs = Object.keys(existingWorkflow?.inputVariables || {})
                    .filter(k => !k.startsWith('__'))
                    .map(name => ({ name, taskName: 'Workflow Input', source: 'workflow_input', value: `{{${name}}}` }));

                const parentOutputs = Object.keys(existingWorkflow?.outputVariables || {})
                    .filter(k => !k.startsWith('__'))
                    .map(name => ({ name, taskName: 'Workflow Output', source: 'workflow_output', value: `{{${name}}}` }));

                const allAvailable = [...parentInputs, ...parentOutputs, ...allTaskVars];

                return (
                    <WorkflowAdminShelf
                        workflowId={workflowId}
                        draftMetadata={!workflowId ? workflowMetadata : undefined}
                        availableVars={allAvailable}
                        onClose={() => setIsAdminPanelOpen(false)}
                        onSave={(data: any) => {
                           if (data.name) setWorkflowName(data.name);
                           if (data.tags) setWorkflowTags(data.tags);
                           setWorkflowMetadata({
                               inputVariables: data.inputVariables || {},
                               outputVariables: data.outputVariables || {},
                               scheduling: data.scheduling || { enabled: false, cron: '0 * * * *' },
                               notifications: data.notifications || [],
                               scope: data.scope || 'GLOBAL'
                           });
                           setIsDirty(true);
                           if (workflowId) {
                               queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
                           }
                        }}
                    />
                );
            })()}
        </div>
    )
}

export default function WorkflowDesigner() {
    return (
        <ReactFlowProvider>
            <WorkflowDesignerContent />
        </ReactFlowProvider>
    );
}
