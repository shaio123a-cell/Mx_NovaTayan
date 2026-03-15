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
import { Network, Check, Send, RefreshCw, Trash2, Terminal, Activity, Pencil, Zap, Settings2, X, Box, GitBranch, LayoutDashboard, Clock, Bell, Info, Layers, Shield } from 'lucide-react'
import { useDirtyState } from '../context/DirtyStateContext'
import { useToast } from '../context/ToastContext'
import { WorkflowAdminShelf } from '../components/WorkflowAdminShelf'

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

    const isUtility = data.taskType === 'VARIABLE' || data.taskId === '00000000-0000-0000-0000-000000000001';
    const isWorkflow = data.taskType === 'WORKFLOW';

    return (
        <div style={{ 
            minWidth: isUtility ? '180px' : '240px',
            position: 'relative',
        }} className="hover:border-primary-500/50 transition-all group">
            
            {/* Shaped Background Layers */}
            {/* Border Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: isWorkflow ? '#32a895' : (isUtility ? '#ffcc00' : '#202226'),
                clipPath: isUtility 
                    ? 'none' 
                    : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none'),
                borderRadius: isUtility ? '999px' : (isWorkflow ? '0' : '12px'),
                zIndex: 0
            }} />

            {/* Fill Layer */}
            <div style={{
                position: 'absolute',
                inset: '1.5px', // Border width
                background: isWorkflow ? 'linear-gradient(135deg, #032cfc 0%, #021a99 100%)' : (isUtility ? 'linear-gradient(135deg, #1e1b0a 0%, #111217 100%)' : '#111217'),
                clipPath: isUtility 
                    ? 'none' 
                    : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none'),
                borderRadius: isUtility ? '999px' : (isWorkflow ? '0' : '11px'),
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
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: isWorkflow ? '#ffffff80' : '#464c54', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isWorkflow ? 'WORKFLOW' : (isUtility ? 'UTILITY' : data.method)}
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
    const label = condition === 'ALWAYS' ? 'Run Always' : condition === 'ON_SUCCESS' ? 'On Success' : 'On Failure';
    const color = condition === 'ALWAYS' ? '#94a3b8' : condition === 'ON_SUCCESS' ? '#22c55e' : '#ef4444';

    const onEdgeClick = (evt: any) => {
        evt.stopPropagation();
        const nextCondition = condition === 'ALWAYS' ? 'ON_SUCCESS' : condition === 'ON_SUCCESS' ? 'ON_FAILURE' : 'ALWAYS';
        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === id) {
                    return {
                        ...edge,
                        data: { ...edge.data, condition: nextCondition },
                        label: nextCondition === 'ALWAYS' ? '' : nextCondition.replace('ON_', ''),
                        style: { ...edge.style, stroke: nextCondition === 'ALWAYS' ? '#94a3b8' : nextCondition === 'ON_SUCCESS' ? '#22c55e' : '#ef4444' }
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
                style={{ ...style, stroke: color, strokeWidth: 2 }}
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
    reactFlowWrapper 
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
            const randomSuffix = Math.floor(100000 + Math.random() * 900000);
            const label = isUtility ? `${taskData.name} ${randomSuffix}` : taskData.name;
 
            const newNode: Node = {
                id: newNodeId,
                type: isWorkflow ? 'workflowNode' : 'taskNode',
                position,
                data: {
                    id: newNodeId,
                    label: label,
                    taskId: taskData.id,
                    taskType: isWorkflow ? 'WORKFLOW' : (taskData.taskType || 'HTTP'),
                    utility: isUtility,
                    inputVarsCount: isWorkflow ? Object.keys(taskData.inputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                    outputVarsCount: isWorkflow ? Object.keys(taskData.outputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                    method: isWorkflow ? 'WF' : (taskData.taskType === 'VARIABLE' ? 'VAR' : (taskData.command?.method || 'GET')),
                    targetTags: taskData.targetTags || [],
                    failureStrategy: 'SUCCESS_REQUIRED',
                    failureStatusOverride: 'FAILED',
                    variableExtraction: taskData.variableExtraction,
                    icon: taskData.icon,
                    onDelete: (id: string) => {
                        setNodes((nds: any) => nds.filter((node: any) => node.id !== id));
                        setIsDirty(true);
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
            };

            setNodes((nds: any) => nds.concat(newNode));
            setIsDirty(true);
        },
        [setNodes, setIsDirty, reactFlowWrapper]
    );

    return (
        <div ref={reactFlowWrapper} style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #eee', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={(_, node) => onNodeClick(node)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onEdgesDelete={(deletedEdges) => {
                    setEdges(eds => eds.filter(e => !deletedEdges.find(de => de.id === e.id)));
                    setIsDirty(true);
                }}
                onNodesDelete={(deletedNodes) => {
                    setNodes(nds => nds.filter(n => !deletedNodes.find(dn => dn.id === n.id)));
                    setIsDirty(true);
                }}
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
    const [workflowMetadata, setWorkflowMetadata] = useState<any>({
        inputVariables: {},
        outputVariables: {},
        scheduling: { enabled: false, cron: '0 * * * *' },
        notifications: [],
        scope: 'GLOBAL'
    });
    const [isTopDrawerOpen, setIsTopDrawerOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const queryClient = useQueryClient()
    const initializedRef = useRef<string | null>(null)
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksApi.getTasks,
    })
 
    const { data: allWorkflows, isLoading: isLoadingWorkflows } = useQuery({
        queryKey: ['workflows'],
        queryFn: workflowsApi.getWorkflows,
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
            
            setNodes(existingWorkflow.nodes.map((n: any) => ({
                id: n.id,
                type: n.taskType === 'WORKFLOW' ? 'workflowNode' : 'taskNode',
                position: n.position,
                data: {
                    ...n,
                    id: n.id,
                    label: n.taskType === 'WORKFLOW' ? (n.label || allWorkflows?.find((w: any) => w.id === n.taskId)?.name || 'Nested Workflow') : (tasks?.find((t: any) => t.id === n.taskId)?.name || n.label),
                    taskId: n.taskId,
                    taskType: n.taskType || 'HTTP',
                    inputVarsCount: n.taskType === 'WORKFLOW' ? Object.keys(allWorkflows?.find((w: any) => w.id === n.taskId)?.inputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                    outputVarsCount: n.taskType === 'WORKFLOW' ? Object.keys(allWorkflows?.find((w: any) => w.id === n.taskId)?.outputVariables || {}).filter(k => !k.startsWith('__')).length : 0,
                    method: n.taskType === 'VARIABLE' ? 'VAR' : n.taskType === 'WORKFLOW' ? 'WF' : (n.method || tasks?.find((t: any) => t.id === n.taskId)?.command?.method || 'GET'),
                    targetTags: n.targetTags || [],
                    failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                    failureStatusOverride: n.failureStatusOverride || 'FAILED',
                    variableExtraction: n.variableExtraction,
                    icon: n.taskType === 'WORKFLOW' ? (n.icon || allWorkflows?.find((w: any) => w.id === n.taskId)?.icon) : (tasks?.find((t: any) => t.id === n.taskId)?.icon || n.icon),
                    onDelete: (id: string) => {
                        setNodes(nds => nds.filter(node => node.id !== id));
                        setIsDirty(true);
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
            })))
            setEdges(existingWorkflow.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: 'custom',
                data: { condition: e.condition || 'ALWAYS' },
                animated: true,
                style: { 
                    stroke: (e.condition === 'ON_SUCCESS' ? '#22c55e' : e.condition === 'ON_FAILURE' ? '#ef4444' : '#94a3b8'), 
                    strokeWidth: 2 
                },
            })))
            setTimeout(() => setIsDirty(false), 50); // Small delay to prevent initial load marking as dirty
        }
    }, [existingWorkflow, tasks])

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
            setEdges((eds) => addEdge({ 
                ...params, 
                type: 'custom',
                data: { condition: 'ALWAYS' },
                animated: true, 
                style: { stroke: '#94a3b8', strokeWidth: 2 } 
            }, eds));
            setIsDirty(true);
        },
        [setEdges],
    )

    const saveMutation = useMutation({
        mutationFn: (data: any) => workflowId
            ? workflowsApi.updateWorkflow(workflowId, data)
            : workflowsApi.createWorkflow(data),
        onSuccess: (data: any) => {
            showToast('Workflow saved successfully!', 'success')
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
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

    const handleSave = () => {
        const workflowData = {
            name: workflowName,
            tags: workflowTags,
            nodes: nodes.map(n => {
                // Remove UI-only functions before saving to DB
                const { onDelete, onChangeTargetTags, onChangeFailureStrategy, onChangeFailureStatusOverride, ...cleanData } = n.data;
                return {
                    id: n.id,
                    position: n.position,
                    ...cleanData
                };
            }),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                condition: e.data?.condition || 'ALWAYS'
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

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'Global Tasks': true, 'Workflows': true })

    const groupedLibraryItems = (() => {
        const grouped: Record<string, any[]> = {}
        
        const q = searchQuery.toLowerCase();

        // Add Tasks
        const filteredTasks = tasks?.filter((t: any) => {
            const name = t.name?.toLowerCase() ?? '';
            const label = t.label?.toLowerCase() ?? '';
            const method = t.command?.method?.toLowerCase() ?? '';
            return name.includes(q) || label.includes(q) || method.includes(q);
        });

        filteredTasks?.forEach((t: any) => {
            const tg = t.groups || []
            if (tg.length === 0) {
                if (!grouped['Global Tasks']) grouped['Global Tasks'] = []
                grouped['Global Tasks'].push({ ...t, itemType: 'TASK' })
            } else {
                tg.forEach((g: any) => {
                    const name = typeof g === 'string' ? g : g.name
                    if (!grouped[name]) grouped[name] = []
                    grouped[name].push({ ...t, itemType: 'TASK' })
                })
            }
        })

        // Add Workflows (exclude current)
        const filteredWorkflows = allWorkflows?.filter((w: any) => {
            if (w.id === workflowId) return false;
            const name = w.name?.toLowerCase() ?? '';
            return name.includes(q);
        });

        filteredWorkflows?.forEach((w: any) => {
            if (!grouped['Workflows']) grouped['Workflows'] = []
            grouped['Workflows'].push({ ...w, itemType: 'WORKFLOW' })
        })

        return grouped
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
                    {isDirty && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                            <div className="animate-pulse" style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
                            Unsaved Changes
                        </div>
                    )}
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
                        onClick={() => workflowId && executeMutation.mutate(workflowId)}
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
                        <div style={{ display: 'flex', gap: '16px' }}>
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
                                    transition: 'all 0.2s'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105"
                            >
                                <Zap size={20} fill="#ffcc00" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>Variables Manipulation</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Transform & Store Data</div>
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
                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Utility Actions</h3>
                        <div 
                            draggable
                            onDragStart={(e) => onDragStart(e, { id: 'util-vars', name: 'Variables Manipulation', taskType: 'VARIABLE' })}
                            style={{
                                padding: '12px',
                                background: '#fff9e6',
                                border: '1px solid #ffcc00',
                                borderRadius: '10px',
                                cursor: 'grab',
                                fontSize: '13px',
                                color: '#856404',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Zap size={16} fill="currentColor" />
                            <span>Variables Manipulation</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Library</h3>
                        <p style={{ fontSize: '11px', color: '#666' }}>Drag & drop tasks or workflows.</p>
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

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoadingTasks || isLoadingWorkflows ? (
                            <div style={{ color: '#999', fontSize: '12px' }}>Loading library...</div>
                        ) : (
                            Object.entries(groupedLibraryItems).sort(([a], [b]) => a.includes('Tasks') ? -1 : b.includes('Tasks') ? 1 : a.localeCompare(b)).map(([groupName, items]: [string, any]) => (
                                <div key={groupName} style={{ marginBottom: '24px' }}>
                                    <div 
                                        onClick={() => setExpandedFolders(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            padding: '8px 0',
                                            borderBottom: '1px solid #f0f0f0',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px' }}>{groupName === 'Workflows' ? '⚡' : groupName.includes('Tasks') ? '🌐' : '📁'}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#333', textTransform: 'uppercase', letterSpacing: '1px' }}>{groupName}</span>
                                        </div>
                                        <span style={{ color: '#ccc', fontSize: '10px' }}>{expandedFolders[groupName] ? '▼' : '▶'}</span>
                                    </div>
                                    
                                    {(expandedFolders[groupName] || searchQuery.length > 0) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {items.map((item: any) => {
                                                const selected = isTaskInWorkflow(item.id);
                                                const isWf = item.itemType === 'WORKFLOW';
                                                return (
                                                    <div
                                                        key={item.id}
                                                        draggable
                                                        onDragStart={(event) => onDragStart(event, item)}
                                                        style={{
                                                            padding: '12px',
                                                            background: selected ? (isWf ? '#eff6ff' : '#f0f7ff') : '#fafafa',
                                                            border: `1px solid ${selected ? (isWf ? '#3b82f6' : '#1976D2') : '#eee'}`,
                                                            borderRadius: '10px',
                                                            cursor: 'grab',
                                                            fontSize: '13px',
                                                            color: '#333',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!selected) {
                                                                e.currentTarget.style.background = '#f9fafb';
                                                                e.currentTarget.style.transform = 'translateX(4px)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!selected) {
                                                                e.currentTarget.style.background = '#fafafa';
                                                                e.currentTarget.style.transform = 'translateX(0)';
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '20px', 
                                                            height: '20px', 
                                                            borderRadius: '4px', 
                                                            background: isWf ? '#3b82f6' : (item.command?.method === 'POST' ? '#1976D2' : item.command?.method === 'DELETE' ? '#dc2626' : '#22c55e'),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white'
                                                        }}>
                                                            {getEffectiveIcon(item) ? (
                                                                <img src={getEffectiveIcon(item)!} style={{ width: '14px', height: '14px', objectFit: 'contain' }} alt="icon" />
                                                            ) : (
                                                                isWf ? <GitBranch size={12} /> : <Box size={12} />
                                                            )}
                                                        </div>
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                                        {selected && <Check size={12} color={isWf ? '#3b82f6' : "#1976D2"} strokeWidth={3} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <ReactFlowCanvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={(changes: any) => { onNodesChange(changes); setIsDirty(true); }}
                    onEdgesChange={(changes: any) => { onEdgesChange(changes); setIsDirty(true); }}
                    onConnect={onConnect}
                    onNodeClick={(node: any) => setEditingNode(node)}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    setIsDirty={setIsDirty}
                    reactFlowWrapper={reactFlowWrapper}
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
                        const isNodeWorkflow = n.data.taskType === 'WORKFLOW' || !!allWorkflows?.find((w: any) => w.id === n.data.taskId);
                        let libVars = {};
                        if (isNodeWorkflow) {
                            const wfDef = allWorkflows?.find((w: any) => w.id === n.data.taskId);
                            libVars = wfDef?.outputVariables || {};
                        } else {
                            const taskDef = tasks?.find((t: any) => t.id === n.data.taskId);
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
                            setIsDirty(true)
                        }}
                    />
                );
            })()}

            {isAdminPanelOpen && (() => {
                // For global workflow context (Notifications / Output Vars), show ALL task outputs + workflow inputs
                const allTaskVars = nodes.flatMap(n => {
                    const isNodeWorkflow = n.data.taskType === 'WORKFLOW' || !!allWorkflows?.find((w: any) => w.id === n.data.taskId);
                    let libVars: any = {};
                    if (isNodeWorkflow) {
                        const wfDef = allWorkflows?.find((w: any) => w.id === n.data.taskId);
                        libVars = wfDef?.outputVariables || {};
                    } else {
                        const taskDef = tasks?.find((t: any) => t.id === n.data.taskId);
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
