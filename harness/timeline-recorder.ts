import * as fs from 'node:fs';
import * as path from 'node:path';

import type { EventCategory, EventSeverity, TimelineEvent } from './types';

export class TimelineRecorder {
  private readonly startedAt = Date.now();
  private readonly stream: fs.WriteStream;
  private readonly events: TimelineEvent[] = [];

  currentStep = 0;
  currentStepName = 'setup';

  constructor(private readonly outputDir: string) {
    fs.mkdirSync(outputDir, { recursive: true });
    this.stream = fs.createWriteStream(path.join(outputDir, 'timeline.ndjson'), { flags: 'a' });
  }

  emit(input: {
    category: EventCategory;
    severity: EventSeverity;
    message: string;
    source?: string;
    data?: Record<string, unknown>;
    durationMs?: number;
  }): void {
    const event: TimelineEvent = {
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - this.startedAt,
      stepIndex: this.currentStep,
      stepName: this.currentStepName,
      category: input.category,
      severity: input.severity,
      message: input.message
    };
    if (input.source !== undefined) event.source = input.source;
    if (input.data !== undefined) event.data = input.data;
    if (input.durationMs !== undefined) event.durationMs = input.durationMs;
    this.events.push(event);
    this.stream.write(JSON.stringify(event) + '\n');
  }

  enterStep(name: string): void {
    this.currentStep += 1;
    this.currentStepName = name;
    this.emit({
      category: 'test_lifecycle',
      severity: 'info',
      message: `Step ${this.currentStep}: ${name}`
    });
  }

  all(): TimelineEvent[] {
    return [...this.events];
  }

  recent(count: number): TimelineEvent[] {
    return this.events.slice(-count);
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  close(): Promise<void> {
    return new Promise(resolve => this.stream.end(resolve));
  }
}
