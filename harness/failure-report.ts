import type { ArtifactWriter } from './artifact-writer';
import { classifyError, computeDiagnosticHints } from './diagnostic-hints';
import type { Checkpoint, FailureReport } from './types';
import type { TimelineRecorder } from './timeline-recorder';

export function buildFailureReport(opts: {
  error: unknown;
  checkpoints: Checkpoint[];
  timeline: TimelineRecorder;
  artifacts: ArtifactWriter;
  testTimeoutMs?: number;
}): FailureReport {
  const identity = opts.artifacts.identity;
  const allEvents = opts.timeline.all();
  const failureCategory = classifyError(opts.error);
  const failedCheckpoint = opts.checkpoints.find(item => item.status === 'failed');
  const lastAction = [...allEvents].reverse().find(item => item.category !== 'test_lifecycle');
  const slowestSteps = [...opts.checkpoints]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5)
    .map(item => ({ name: item.name, durationMs: item.durationMs }));

  const errorDetails: FailureReport['error'] = {
    message: opts.error instanceof Error ? opts.error.message : String(opts.error)
  };
  if (opts.error instanceof Error && opts.error.stack) errorDetails.stack = opts.error.stack;

  const report: FailureReport = {
    app: identity.appName,
    scenario: identity.scenarioName,
    network: identity.networkName,
    status: isTimeout(opts.error, opts.timeline.elapsedMs(), opts.testTimeoutMs) ? 'timedout' : 'failed',
    failureCategory,
    error: errorDetails,
    failedAtStep: {
      index: failedCheckpoint?.index ?? 0,
      name: failedCheckpoint?.name ?? 'unknown',
      lastAction: lastAction?.message ?? 'unknown'
    },
    timing: {
      totalDurationMs: opts.timeline.elapsedMs(),
      slowestSteps
    },
    checkpoints: opts.checkpoints,
    recentEvents: opts.timeline.recent(75),
    consoleErrors: allEvents.filter(item => item.category === 'browser_console' && item.severity === 'error'),
    networkErrors: allEvents.filter(item => item.category === 'network_request' && item.severity === 'error'),
    diagnosticHints: [],
    artifacts: {
      timeline: 'timeline.ndjson',
      checkpoints: 'checkpoints.json',
      screenshotsDir: 'screenshots/',
      snapshotsDir: 'snapshots/',
      traceDir: '../../../playwright-artifacts/'
    },
    reproSteps: [
      `cd ${process.cwd()}`,
      `E2E_APP=${identity.appName} E2E_NETWORK=${identity.networkName} yarn test:e2e --grep "${identity.scenarioName}"`,
      'Open report.json first, then timeline.ndjson, then the Playwright trace.'
    ]
  };

  report.diagnosticHints = computeDiagnosticHints(report);
  return report;
}

export function saveFailureReport(report: FailureReport, artifacts: ArtifactWriter): string {
  artifacts.writeText('repro.md', report.reproSteps.map((step, index) => `${index + 1}. ${step}`).join('\n') + '\n');
  return artifacts.writeJson('report.json', report);
}

function isTimeout(error: unknown, elapsedMs: number, timeoutMs?: number): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('timeout') || (timeoutMs ? elapsedMs > timeoutMs * 0.95 : false);
}
