// Icon mapping using Simple Icons CDN — reliable brand SVGs for thousands of companies.
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
    'microsoft':      'https://cdn.simpleicons.org/microsoft/5E5E5E',
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
    's3 bucket':      'https://cdn.simpleicons.org/amazons3/FF9900',
};

/**
 * Normalizes a brand name to a Simple Icons slug.
 * Removes spaces, dots, and special characters.
 */
function normalizeSlug(name: string): string {
    return name.toLowerCase()
        .replace(/\.com$/i, '')           // remove .com
        .replace(/\s+/g, '')              // remove spaces
        .replace(/[^\w]/g, '');           // remove non-alphanumeric
}

/**
 * Suggests an icon URL based on a task or workflow name.
 * Longer/more-specific keywords are checked first to avoid false matches
 * (e.g. 'bmc helix' must beat 'helix').
 * 
 * Now supports dynamic fallback to Simple Icons' 3000+ logos.
 */
export function suggestIcon(name: string): string | null {
    if (!name) return null;
    const lower = name.toLowerCase();

    // 1. Check manual mapping first (overrides & specific color choices)
    const sorted = Object.keys(ICON_MAPPING).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (lower.includes(key)) return ICON_MAPPING[key];
    }

    // 2. Dynamic slug fallback (supports 3000+ brands automatically)
    // We attempt to guess the slug by normalizing the name.
    const slug = normalizeSlug(name);
    if (slug.length > 1) {
        return `https://cdn.simpleicons.org/${slug}`;
    }

    return null;
}
