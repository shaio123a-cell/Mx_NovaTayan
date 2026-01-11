import axios from 'axios';
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
    const { method, url, headers, body, timeout } = command;

    logger.info(`🚀 Executing task: ${name} (ID: ${task.id}, Execution ID: ${id})`);

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

        logger.info(`✅ Task ${name} completed with status ${response.status}`);

        // Complete execution
        await axios.post(`${API_URL}/worker/executions/${id}/complete`, {
            input,
            result: {
                status: response.status,
                data: response.data,
                headers: response.headers,
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
