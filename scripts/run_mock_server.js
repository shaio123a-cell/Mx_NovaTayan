#!/usr/bin/env node
// scripts/run_mock_server.js
// Starts a persistent HTTP server serving Docs/Setup/test_sample.json at /test_sample.json

import fs from 'fs';
import path from 'path';
import http from 'http';

const port = Number(process.env.MOCK_PORT || 4000);
const samplePath = path.resolve(process.cwd(), 'Docs/Setup/test_sample.json');
let sampleData = '{}';
try {
  sampleData = fs.readFileSync(samplePath, 'utf8');
} catch (e) {
  console.error('Could not read sample file:', samplePath, e.message);
  process.exit(2);
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/test_sample.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(sampleData);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`Mock server running at http://127.0.0.1:${port}/test_sample.json`);
  console.log('Press Ctrl+C to stop.');
});
