import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { EnvironmentConfig } from '../config/environments';
import type { TimelineRecorder } from '../harness/timeline-recorder';

const execFileAsync = promisify(execFile);

export interface FundingCommandResult {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class FundingClient {
  constructor(
    private readonly env: EnvironmentConfig,
    private readonly timeline: TimelineRecorder,
    private readonly binary = process.env.MIDEN_CLIENT_BIN || 'miden-client'
  ) {}

  async run(args: string[], timeoutMs = 120_000): Promise<FundingCommandResult> {
    const start = Date.now();
    try {
      const result = await execFileAsync(this.binary, args, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      });
      const record = {
        command: this.binary,
        args,
        exitCode: 0,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
        durationMs: Date.now() - start
      };
      this.timeline.emit({
        category: 'miden_rpc',
        severity: 'info',
        source: 'miden-client',
        message: `miden-client ${args.slice(0, 2).join(' ')} completed`,
        data: record
      });
      return record;
    } catch (error: any) {
      const record = {
        command: this.binary,
        args,
        exitCode: Number(error.code ?? 1),
        stdout: String(error.stdout ?? '').trim(),
        stderr: String(error.stderr ?? error.message ?? '').trim(),
        durationMs: Date.now() - start
      };
      this.timeline.emit({
        category: 'miden_rpc',
        severity: 'error',
        source: 'miden-client',
        message: `miden-client ${args.slice(0, 2).join(' ')} failed on ${this.env.name}`,
        data: record
      });
      return record;
    }
  }
}
