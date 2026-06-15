#!/usr/bin/env node
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('test-results');

if (!fs.existsSync(root)) {
  console.log('No test-results directory found.');
  process.exit(0);
}

const reports = [];

for (const run of fs.readdirSync(root).filter(name => name.startsWith('run-'))) {
  const runDir = path.join(root, run);
  for (const reportPath of findFiles(runDir, 'report.json')) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    reports.push({
      app: report.app,
      scenario: report.scenario,
      network: report.network,
      status: report.status,
      failureCategory: report.failureCategory,
      path: reportPath
    });
  }
}

if (reports.length === 0) {
  console.log('No failure reports found.');
} else {
  console.table(reports);
}

function findFiles(dir, filename) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findFiles(full, filename));
    if (entry.isFile() && entry.name === filename) found.push(full);
  }
  return found;
}
