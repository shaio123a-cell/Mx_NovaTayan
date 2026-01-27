import axios from 'axios';
import { transform } from '../../../packages/shared-xform/xform_engine';
import * as dotenv from 'dotenv';
import * as os from 'os';
import { logger } from './common/logger/logger';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const POLL_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
// Legacy support for WORKER_GROUP as a tag, plus new WORKER_TAGS
const RAW_TAGS = process.env.WORKER_TAGS || '';
const LEGACY_GROUP = process.env.WORKER_GROUP || 'default';
const WORKER_TAGS = [
    ...RAW_TAGS.split(',').filter(t => t.trim().length > 0),
    LEGACY_GROUP
].filter((v, i, a) => a.indexOf(v) === i); // Unique tags

const HOSTNAME = os.hostname();


async function registerWorker() {
    try {
        logger.info(`📡 Registering worker: ${HOSTNAME}`);
        logger.info(`🏷️ Tags: ${WORKER_TAGS.join(', ')}`);
        await axios.post(`${API_URL}/worker/register`, {
            hostname: HOSTNAME,
            tags: WORKER_TAGS,
            ipAddress: os.networkInterfaces()['eth0']?.[0]?.address || '127.0.0.1' // Fallback
        });
        logger.info('✅ Worker registered successfully');
    } catch (error: any) {
        logger.error(`❌ Registration failed: ${error.message}`);
    }
}

async function sendHeartbeat() {
    try {
        await axios.post(`${API_URL}/worker/heartbeat`, { hostname: HOSTNAME });
    } catch (error: any) {
        logger.error(`❌ Heartbeat failed: ${error.message}`);
    }
}

async function executeTask(execution: any) {
    const { id, task } = execution;
    const { name, command } = task;
    // Derive output processing spec/vars from stored task fields (backwards compatibility)
    const outputProcessingSpec = task.outputProcessingSpec
        || (task.outputMutation && task.outputMutation.transformTemplate)
        || (task.command && task.command.outputProcessing && task.command.outputProcessing.specYaml)
        || null;
    const outputProcessingVars = task.outputProcessingVars
        || (task.variableExtraction && task.variableExtraction.vars)
        || (task.command && task.command.outputProcessing && task.command.outputProcessing.vars)
        || {};
    const { method, url, headers, body, timeout } = command;

    logger.info(`🚀 Executing task: ${name} (ID: ${task.id}, Execution ID: ${id})`);
    if (outputProcessingSpec) {
        logger.info(`🔄 Output mutation enabled for task: ${name}`);
    }

    try {
        // Mark as running
        await axios.patch(`${API_URL}/worker/executions/${id}/start`, { hostname: HOSTNAME });

        const input = {
            method,
            url,
            headers: headers || {},
            data: body || undefined,
            timeout: timeout || 30000,
        };

        const response = await axios({
            ...input,
            validateStatus: () => true,
        });

        let mutatedOutput = null;
        let mutationErrorMsg: string | undefined = undefined;
        if (outputProcessingSpec) {
            try {
                // If spec is YAML string, validate and parse it first
                let specObj: any = outputProcessingSpec;
                if (typeof outputProcessingSpec === 'string') {
                    try {
                        const { validateSpecYaml } = await import('../../../packages/shared-xform/xform_validation');
                        const validation = validateSpecYaml(outputProcessingSpec);
                        if (!validation.ok) {
                            throw new Error((validation as any).errors?.join(', ') || 'Spec validation failed');
                        }
                        specObj = validation.spec;
                    } catch (ve: any) {
                        throw new Error(`Spec parse/validation error: ${ve?.message || String(ve)}`);
                    }
                }

                const inputData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                let res = await transform(
                    specObj,
                    inputData,
                    outputProcessingVars || {},
                    { previewLimit: 100 }
                );
                // If transform returned Uint8Array, convert to string
                if (res instanceof Uint8Array) res = Buffer.from(res).toString('utf8');
                mutatedOutput = res;
                logger.info(`🧬 Output mutated for task: ${name}`);
            } catch (mutationError: any) {
                mutationErrorMsg = mutationError?.message || String(mutationError);
                logger.error(`⚠️ Output mutation failed: ${mutationErrorMsg}`);
            }
        }

        logger.info(`✅ Task ${name} completed with status ${response.status}`);

        // Evaluate per-variable transformers (if any)
        const computedVars: Record<string, any> = {};
        const variableErrors: Record<string, string> = {};
        const varScopes: Record<string, string> = (outputProcessingVars && (outputProcessingVars.__scopes || {})) || {};
        // Prefer raw HTTP response as the default input for variable transformers.
        const baseOutput = response.data;
        try {
            for (const name of Object.keys(outputProcessingVars || {})) {
                if (name === '__scopes') continue;
                let def: any = null;
                let t: any = null;
                let inputForVar: any = null;
                try {
                    def = outputProcessingVars[name];
                    // Backwards-compatible: if stored as simple value, use as-is
                    if (!def || typeof def !== 'object' || def.valueMode !== 'transformer') {
                        computedVars[name] = def;
                        continue;
                    }
                    t = def.transformer || {};
                    // Resolve input for transformer
                    inputForVar = baseOutput;
                    if (t.inputSource === 'mutated_output') {
                        inputForVar = mutatedOutput !== null && mutatedOutput !== undefined ? mutatedOutput : response.data;
                    } else if (t.inputSource === 'task_output') {
                        // 'task_output' refers to the original HTTP response body
                        inputForVar = response.data;
                    } else if (t.inputSource === 'variable' && t.inputVariable) {
                        if (computedVars.hasOwnProperty(t.inputVariable)) inputForVar = computedVars[t.inputVariable];
                        else inputForVar = null;
                    }

                    // Log transformer + input for debugging
                    try {
                        logger.info(`🔎 Evaluating variable transformer: ${name}`);
                        logger.info(`🔎 Transformer config: ${JSON.stringify(t)}`);
                        const sampleInputLog = typeof inputForVar === 'string' ? inputForVar.slice(0, 200) : JSON.stringify(inputForVar).slice(0, 200);
                        logger.info(`🔎 Input type: ${typeof inputForVar}; sample: ${sampleInputLog}`);
                    } catch (logErr: any) {
                        // ignore logging errors
                    }

                    // Apply transformer by type
                    if (t.type === 'regex') {
                        const text = typeof inputForVar === 'string' ? inputForVar : JSON.stringify(inputForVar);
                        const re = new RegExp(t.spec || t.pattern || '');
                        const m = text.match(re);
                        computedVars[name] = m ? (m[1] || m[0]) : null;
                    } else if (t.type === 'jmespath' || t.type === 'json') {
                        const { evalExpr } = await import('../../../packages/shared-xform/xform_selectors_json');
                        // evalExpr expects (row, expr)
                        try {
                            // If input is JSON string, parse it so JMESPath operates on object/array
                            let jmesInput = inputForVar;
                            if (typeof inputForVar === 'string') {
                                try {
                                    jmesInput = JSON.parse(inputForVar);
                                } catch (e) {
                                    // leave as string if not JSON
                                }
                            }
                            computedVars[name] = evalExpr(jmesInput, t.spec || t.expr || '');
                        } catch (je: any) {
                            const msg = je?.message || String(je);
                            // If the error is due to JMESPath root expecting an array, retry with input wrapped in array
                            if (msg.includes('JMESPath root expression must resolve to an array')) {
                                try {
                                    const parsed = (typeof inputForVar === 'string') ? (() => { try { return JSON.parse(inputForVar); } catch(e) { return inputForVar } })() : inputForVar;
                                    const wrapped = Array.isArray(parsed) ? parsed : [parsed];
                                    computedVars[name] = evalExpr(wrapped, t.spec || t.expr || '');
                                } catch (je2: any) {
                                    throw je2;
                                }
                            } else throw je;
                        }
                    } else if (t.type === 'xpath' || t.type === 'xml') {
                        const { selectNodes, evalXPath } = await import('../../../packages/shared-xform/xform_selectors_xml');
                        // If input is XML string, select nodes then evaluate
                        const xmlText = typeof inputForVar === 'string' ? inputForVar : String(inputForVar);
                        const nodes = selectNodes(xmlText, t.root || '/');
                        if (nodes && nodes.length > 0) computedVars[name] = evalXPath(nodes[0], t.spec || t.expr || '.');
                        else computedVars[name] = null;
                    } else if (t.type === 'advanced') {
                        // Treat transformer.spec as YAML transform spec
                        let specObj: any = t.spec || t.specYaml || null;
                        if (typeof specObj === 'string') {
                            const { validateSpecYaml } = await import('../../../packages/shared-xform/xform_validation');
                            const validation = validateSpecYaml(specObj);
                            if (!validation.ok) throw new Error((validation as any).errors?.join?.(', ') || 'Transformer spec invalid');
                            specObj = validation.spec;
                        }
                        const inputText = typeof inputForVar === 'string' ? inputForVar : JSON.stringify(inputForVar);
                        let out: any;
                        try {
                            out = await transform(specObj, inputText, {}, { previewLimit: 20 });
                        } catch (advErr: any) {
                            const msg = advErr?.message || String(advErr);
                            if (msg.includes('JMESPath root expression must resolve to an array')) {
                                // Retry by passing a parsed object (or array) when possible, and wrapping if necessary
                                try {
                                    let parsed: any = null;
                                    try { parsed = JSON.parse(inputText); } catch (e) { parsed = null; }
                                    if (parsed === null) {
                                        const wrappedInput = inputText && inputText.trim().startsWith('[') ? inputText : `[${inputText}]`;
                                        out = await transform(specObj, wrappedInput, {}, { previewLimit: 20 });
                                    } else {
                                        const toPass = Array.isArray(parsed) ? parsed : [parsed];
                                        out = await transform(specObj, JSON.stringify(toPass), {}, { previewLimit: 20 });
                                    }
                                } catch (retryAdvErr: any) {
                                    throw retryAdvErr;
                                }
                            } else {
                                throw advErr;
                            }
                        }
                        if (out instanceof Uint8Array) out = Buffer.from(out).toString('utf8');
                        computedVars[name] = out;
                    } else if (t.type === 'constant') {
                        computedVars[name] = t.value;
                    } else {
                        // Unknown transformer type: attempt jmespath as fallback
                        const { evalExpr } = await import('../../../packages/shared-xform/xform_selectors_json');
                        computedVars[name] = evalExpr(inputForVar, t.spec || t.expr || '');
                    }
                } catch (ve: any) {
                    const msg = ve?.message || String(ve);
                    logger.error(`⚠️ Variable transformer failed for ${name}: ${msg}`);
                    if (ve?.stack) logger.error(ve.stack);
                    // Generic fallback: if this is the JMESPath array-root error, try wrapping input in an array and retry
                    if (msg.includes('JMESPath root expression must resolve to an array')) {
                        try {
                            logger.info(`🔁 Retrying ${name} transformer by wrapping input in array`);
                            const wrappedInputForVar = Array.isArray(inputForVar) ? inputForVar : [inputForVar];
                            if (t.type === 'jmespath' || t.type === 'json') {
                                const { evalExpr } = await import('../../../packages/shared-xform/xform_selectors_json');
                                computedVars[name] = evalExpr(wrappedInputForVar, t.spec || t.expr || '');
                                continue;
                            } else if (t.type === 'advanced') {
                                let specObj: any = t.spec || t.specYaml || null;
                                if (typeof specObj === 'string') {
                                    const { validateSpecYaml } = await import('../../../packages/shared-xform/xform_validation');
                                    const validation = validateSpecYaml(specObj);
                                    if (!validation.ok) throw new Error((validation as any).errors?.join?.(', ') || 'Transformer spec invalid');
                                    specObj = validation.spec;
                                }
                                const wrappedText = typeof wrappedInputForVar === 'string' ? wrappedInputForVar : JSON.stringify(wrappedInputForVar);
                                let out2: any = await transform(specObj, wrappedText, {}, { previewLimit: 20 });
                                if (out2 instanceof Uint8Array) out2 = Buffer.from(out2).toString('utf8');
                                computedVars[name] = out2;
                                continue;
                            }
                        } catch (retryErr: any) {
                            variableErrors[name] = retryErr?.message || String(retryErr);
                            logger.error(`⚠️ Retry failed for ${name}: ${variableErrors[name]}`);
                            continue;
                        }
                    }

                    variableErrors[name] = msg;
                }
            }
        } catch (vErr: any) {
            logger.error(`⚠️ Error while evaluating variable transformers: ${vErr?.message || String(vErr)}`);
        }

        // Complete execution
        await axios.post(`${API_URL}/worker/executions/${id}/complete`, {
            input,
            result: {
                status: response.status,
                data: mutatedOutput || response.data,
                headers: response.headers,
                outputMutation: !!outputProcessingSpec,
                outputMutationError: mutationErrorMsg || (mutatedOutput === null && !!outputProcessingSpec ? 'Mutation failed' : undefined),
                variables: Object.keys(computedVars).length ? computedVars : undefined,
                variableErrors: Object.keys(variableErrors).length ? variableErrors : undefined,
                variableScopes: Object.keys(varScopes).length ? varScopes : undefined
            }
        });
    } catch (error: any) {
        logger.error(`❌ Task ${name} failed:`, error.message);

        // Complete with error
        await axios.post(`${API_URL}/worker/executions/${id}/complete`, {
            error: error.message
        });
    }
}

async function poll() {
    try {
        // logger.debug(`🔍 Polling for tasks... Tags: ${WORKER_TAGS}`); // Reduced noise
        const response = await axios.get(`${API_URL}/worker/pending`, {
            params: {
                hostname: HOSTNAME,
                tags: WORKER_TAGS
            }
        });
        const execution = response.data;

        if (execution) {
            await executeTask(execution);
            setImmediate(poll);
        } else {
            setTimeout(poll, POLL_INTERVAL);
        }
    } catch (error: any) {
        const details = `Code: ${error.code}, Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`;
        logger.error(`❌ Error polling for tasks: ${error.message} | ${details}`);
        setTimeout(poll, POLL_INTERVAL);
    }
}

async function start() {
    logger.info('👷 RestMon REST Worker starting...');
    logger.info(`📡 API URL: ${API_URL}`);

    await registerWorker();

    // Start heartbeat loop
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Start polling loop
    poll();
}

start();
