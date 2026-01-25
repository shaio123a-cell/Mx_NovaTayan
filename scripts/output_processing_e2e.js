#!/usr/bin/env node
// scripts/output_processing_e2e.js
// Create task, trigger execution, poll for results. Assumes a mock server is running separately.

import fs from 'fs/promises';
import path from 'path';

const API = process.env.API_URL || 'http://localhost:3000/api';
const transformPath = process.argv[2] || 'Docs/Setup/test_transform.yaml';
const samplePath = process.argv[3] || 'Docs/Setup/test_sample.json';
const taskUrl = process.env.TASK_URL || `http://127.0.0.1:${process.env.MOCK_PORT || 4000}/test_sample.json`;

async function main(){
  try{
    const transform = await fs.readFile(path.resolve(transformPath), 'utf8');
    const sample = await fs.readFile(path.resolve(samplePath), 'utf8');

    const payload = {
      name: 'E2E Output Processing Test',
      description: 'Automated test task for output processing',
      method: 'GET',
      url: taskUrl,
      headers: {},
      body: '',
      timeout: 30000,
      tags: ['e2e','output-test'],
      outputMutation: { transformTemplate: transform },
      variableExtraction: { vars: {}, sampleInput: sample }
    };

    console.log('Creating task...');
    const createRes = await fetch(`${API}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!createRes.ok) {
      console.error('Failed to create task:', createRes.status, await createRes.text());
      process.exit(2);
    }
    const task = await createRes.json();
    const taskId = task.id || task._id || task.taskId || (task && (task.id || task.taskId));
    if (!taskId) {
      console.log('Task created response:', JSON.stringify(task, null, 2));
      throw new Error('Could not determine task id from create response');
    }
    console.log('Created task id:', taskId);

    console.log('Triggering execution...');
    const execRes = await fetch(`${API}/tasks/${taskId}/execute`, { method: 'POST' });
    if (!execRes.ok) {
      console.error('Failed to execute task:', execRes.status, await execRes.text());
      process.exit(3);
    }

    console.log('Polling for executions (30s)...');
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await sleep(1500);
      const res = await fetch(`${API}/tasks/${taskId}/executions`);
      if (!res.ok) {
        console.error('Failed fetching executions:', res.status, await res.text());
        continue;
      }
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const latest = list[list.length - 1];
        console.log('Latest execution:', JSON.stringify(latest, null, 2));
        if (latest.status && ['COMPLETED','SUCCESS','FAILED','DONE'].includes((latest.status || '').toUpperCase())){
          console.log('Execution finished.');
          process.exit((latest.status || '').toUpperCase().startsWith('SUCCESS') ? 0 : 4);
        }
      }
    }
    console.log('Timeout waiting for execution. Check API and worker logs.');
    process.exit(5);

  }catch(err){
    console.error('Error:', err);
    process.exit(1);
  }
}

function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

main();
