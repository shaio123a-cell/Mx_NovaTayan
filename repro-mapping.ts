import { VariableEngine } from './packages/shared-xform/variable_engine';

async function debugMapping() {
    console.log('--- DEBUGGING WEBHOOK MAPPING ---');
    
    const payload = {
        body: { Mykey: 'This is the input value' },
        query: {},
        headers: {}
    };

    const mapping: Record<string, string> = {
        'WF XXR2 Input': 'body.Mykey' // Simple string path
    };

    const initialVariables: Record<string, any> = {};

    // 1. Build the source context for the VariableEngine
    // Note: VariableEngine is built on top of a context object
    const engine = new VariableEngine({
        request: {
            body: payload.body || {},
            query: payload.query || {},
            headers: payload.headers || {}
        },
        // Fallback support: handle direct 'body.x' in addition to 'request.body.x'
        body: payload.body || {},
        query: payload.query || {},
        headers: payload.headers || {}
    });

    console.log('Engine Context:', JSON.stringify((engine as any).context, null, 2));

    for (const [workflowVarId, sourceTemplate] of Object.entries(mapping)) {
        try {
            // Logic from WorkflowsService.triggerByToken:
            let templateToResolve = sourceTemplate;
            if (typeof sourceTemplate === 'string' && !sourceTemplate.includes('{{')) {
                templateToResolve = `{{ ${sourceTemplate} }}`;
            }
            
            console.log(`Resolving template: "${templateToResolve}" for variable: "${workflowVarId}"`);
            
            const resolvedValue = engine.resolveValue(templateToResolve);
            console.log(`Resolved Value: "${resolvedValue}" (type: ${typeof resolvedValue}, value: ${JSON.stringify(resolvedValue)})`);
            
            initialVariables[workflowVarId] = resolvedValue;
        } catch (err: any) {
            console.error(`Mapping failed for variable ${workflowVarId}: ${err.message}`);
        }
    }

    console.log('\n--- FINAL MAPPED VARIABLES ---');
    console.log(JSON.stringify(initialVariables, null, 2));

    // Simulation of WorkerService.gatherWorkflowContext initialization
    console.log('\n--- SIMULATING WORKER INITIALIZATION ---');
    const workflowVars: Record<string, any> = { 'WF XXR2 Input': 'Pending WF XXR2 Input' }; // Simulated baseline from definition

    const workerEngine = new VariableEngine({
        global: {},
        workflow: workflowVars,
        macros: {}
    });

    Object.entries(initialVariables).forEach(([k, v]: [string, any]) => {
        console.log(`Worker Resolving: key="${k}", value="${v}"`);
        workflowVars[k] = workerEngine.resolveValue(v, k);
    });

    console.log('\n--- FINAL WORKER VARIABLES ---');
    console.log(JSON.stringify(workflowVars, null, 2));
}

debugMapping().catch(console.error);
