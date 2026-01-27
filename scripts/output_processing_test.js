#!/usr/bin/env node
// scripts/output_processing_test.js
// Creates a task with output transform, triggers execution, and polls for results.

import fs from 'fs/promises';
import path from 'path';

const API = process.env.API_URL || 'http://localhost:3000/api';
const transformPath = process.argv[2] || 'Docs/Setup/test_transform.yaml';
const samplePath = process.argv[3] || 'Docs/Setup/test_sample.json';
const mode = process.argv.includes('--local') ? 'local' : (process.argv.includes('--mock') ? 'mock' : 'api');

async function main(){
  try{
    const transform = await fs.readFile(path.resolve(transformPath), 'utf8');
    const sample = await fs.readFile(path.resolve(samplePath), 'utf8');
    if (mode === 'local') {
      // Run transform locally using bundled engine
      console.log('Running transform locally (no API/worker)...');
      const engine = await import('../packages/shared-xform/xform_engine.js');
      const v = engine.validateSpec(transform);
      if (!v.ok) {
        console.error('Spec validation failed:', v.errors);
        process.exit(6);
      }
      const result = await engine.transform(v.spec, sample, {}, { previewLimit: 100 });
      const out = typeof result === 'string' ? result : Buffer.from(result).toString('utf8');
      console.log('Local transform result:\n', out);
      process.exit(0);
    }

    // Start a local mock server to serve the sample input so the worker can fetch it.
    const useMock = process.argv.includes('--mock') || process.env.USE_MOCK === '1';
    let taskUrl = process.env.TASK_URL || '';
    let server = null;
    if (!taskUrl) {
      if (useMock || true) {
        const http = await import('http');
        const port = Number(process.env.MOCK_PORT || 4000);
        const sampleData = sample;
        server = http.createServer((req, res) => {
          if (req.url === '/' || req.url === '/test_sample.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(sampleData);
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        });
        await new Promise((resolve) => server.listen(port, resolve));
        taskUrl = `http://127.0.0.1:${port}/test_sample.json`;
        console.log('Started mock server at', taskUrl);
      } else {
        taskUrl = 'https://raw.githubusercontent.com/shaio123a-cell/Mx_NovaTayan/github/Docs/Setup/test_sample.json';
        console.log('Using remote task URL:', taskUrl);
      }
    } else {
      console.log('Using TASK_URL from env:', taskUrl);
    }

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
    const taskId = task.id || task._id || task.taskId || taskIdFrom(task);
    if (!taskId) {
      console.log('Task created response:', JSON.stringify(task, null, 2));
      throw new Error('Could not determine task id from create response');
    }
    console.log('Created task id:', taskId);

    console.log('Triggering execution...');
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
        if (latest.status && ['completed','failed','done'].includes(latest.status.toLowerCase())){
          console.log('Execution finished.');
          process.exit(latest.status.toLowerCase() === 'completed' ? 0 : 4);
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

function taskIdFrom(obj){
  if (!obj) return null;
  for (const k of ['id','taskId','_id','uuid']) if (obj[k]) return obj[k];
  return null;
}

main();
