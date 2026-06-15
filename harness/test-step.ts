import * as path from 'node:path';

import type { ArtifactWriter } from './artifact-writer';
import { classifyError } from './diagnostic-hints';
import type { Checkpoint, StepOptions } from './types';
import type { TimelineRecorder } from './timeline-recorder';

export class TestStepRunner {
  private readonly checkpoints: Checkpoint[] = [];

  constructor(
    private readonly timeline: TimelineRecorder,
    private readonly artifacts: ArtifactWriter
  ) {}

  async step(name: string, fn: () => Promise<void>, options: StepOptions = {}): Promise<void> {
    this.timeline.enterStep(name);
    const startedAt = new Date();
    const checkpoint: Checkpoint = {
      index: this.timeline.currentStep,
      name,
      status: 'passed',
      startedAt: startedAt.toISOString(),
      completedAt: '',
      durationMs: 0,
      screenshots: [],
      snapshots: []
    };

    try {
      await fn();
      await this.captureStepArtifacts(name, checkpoint, options);
    } catch (error) {
      checkpoint.status = 'failed';
      const stepError: NonNullable<Checkpoint['error']> = {
        message: error instanceof Error ? error.message : String(error),
        category: classifyError(error)
      };
      if (error instanceof Error && error.stack) stepError.stack = error.stack;
      checkpoint.error = stepError;
      this.timeline.emit({
        category: 'error',
        severity: 'error',
        message: `Step failed: ${name}`,
        data: stepError
      });
      await this.captureStepArtifacts(`failure-${name}`, checkpoint, options).catch(() => undefined);
      throw error;
    } finally {
      checkpoint.completedAt = new Date().toISOString();
      checkpoint.durationMs = Date.now() - startedAt.getTime();
      this.checkpoints.push(checkpoint);
      this.save();
    }
  }

  all(): Checkpoint[] {
    return [...this.checkpoints];
  }

  save(): void {
    this.artifacts.writeJson('checkpoints.json', this.checkpoints);
  }

  private async captureStepArtifacts(name: string, checkpoint: Checkpoint, options: StepOptions): Promise<void> {
    const safeName = name.replace(/[^a-zA-Z0-9_.-]+/g, '-');

    for (const target of options.screenshots ?? []) {
      const filename = `${checkpoint.index}-${safeName}-${target.name}.png`;
      const absolute = path.join(this.artifacts.dir('screenshots'), filename);
      await target.page.screenshot({ path: absolute, fullPage: true });
      checkpoint.screenshots.push(`screenshots/${filename}`);
      this.timeline.emit({
        category: 'artifact',
        severity: 'info',
        source: target.name,
        message: `Screenshot captured: ${filename}`
      });
    }

    for (const target of options.snapshots ?? []) {
      const filename = `${checkpoint.index}-${safeName}-${target.name}.json`;
      const value = await target.capture();
      this.artifacts.writeJson(`snapshots/${filename}`, value);
      checkpoint.snapshots.push(`snapshots/${filename}`);
      this.timeline.emit({
        category: 'state_snapshot',
        severity: 'info',
        source: target.name,
        message: `Snapshot captured: ${filename}`
      });
    }
  }
}
