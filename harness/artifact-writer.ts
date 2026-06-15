import * as fs from 'node:fs';
import * as path from 'node:path';

import type { PioneerAppName } from '../config/apps';
import type { MidenNetworkName } from '../config/environments';
import type { RunIdentity } from './types';

export class ArtifactWriter {
  readonly identity: RunIdentity;

  constructor(opts: {
    rootDir: string;
    appName: PioneerAppName;
    scenarioName: string;
    networkName: MidenNetworkName;
  }) {
    const runId = new Date().toISOString().replace(/[:.]/g, '-');
    const scenario = sanitizeSegment(opts.scenarioName);
    const outputDir = path.join(opts.rootDir, 'test-results', `run-${runId}`, opts.networkName, opts.appName, scenario);
    fs.mkdirSync(outputDir, { recursive: true });

    this.identity = {
      runId,
      appName: opts.appName,
      scenarioName: scenario,
      networkName: opts.networkName,
      outputDir
    };
  }

  dir(...segments: string[]): string {
    const target = path.join(this.identity.outputDir, ...segments);
    fs.mkdirSync(target, { recursive: true });
    return target;
  }

  path(...segments: string[]): string {
    return path.join(this.identity.outputDir, ...segments);
  }

  writeJson(relativePath: string, value: unknown): string {
    const filePath = this.path(relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    return filePath;
  }

  writeText(relativePath: string, value: string): string {
    const filePath = this.path(relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, value);
    return filePath;
  }
}

export function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
