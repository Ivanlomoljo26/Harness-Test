import type { Page } from '@playwright/test';

import type { PioneerAppName } from '../config/apps';
import type { MidenNetworkName } from '../config/environments';

export type EventCategory =
  | 'test_lifecycle'
  | 'app_availability'
  | 'app_ui'
  | 'wallet_ui'
  | 'dapp_bridge'
  | 'wallet_transaction'
  | 'miden_rpc'
  | 'network_request'
  | 'browser_console'
  | 'state_snapshot'
  | 'artifact'
  | 'error';

export type EventSeverity = 'debug' | 'info' | 'warn' | 'error';

export interface TimelineEvent {
  timestamp: string;
  elapsedMs: number;
  stepIndex: number;
  stepName: string;
  category: EventCategory;
  severity: EventSeverity;
  source?: string;
  message: string;
  data?: Record<string, unknown>;
  durationMs?: number;
}

export type FailureCategory =
  | 'app_availability_issue'
  | 'app_network_mismatch'
  | 'app_ui_issue'
  | 'wallet_connection_issue'
  | 'wallet_transaction_issue'
  | 'network_rpc_node_issue'
  | 'timeout_latency_issue'
  | 'test_setup_issue'
  | 'unknown_needs_manual_investigation';

export interface Checkpoint {
  index: number;
  name: string;
  status: 'passed' | 'failed';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  error?: {
    message: string;
    stack?: string;
    category: FailureCategory;
  };
  screenshots: string[];
  snapshots: string[];
}

export interface ScreenshotTarget {
  name: string;
  page: Page;
}

export interface SnapshotTarget {
  name: string;
  capture: () => Promise<unknown>;
}

export interface StepOptions {
  screenshots?: ScreenshotTarget[];
  snapshots?: SnapshotTarget[];
}

export interface RunIdentity {
  runId: string;
  appName: PioneerAppName;
  scenarioName: string;
  networkName: MidenNetworkName;
  outputDir: string;
}

export interface FailureReport {
  app: PioneerAppName;
  scenario: string;
  network: MidenNetworkName;
  status: 'failed' | 'timedout';
  failureCategory: FailureCategory;
  error: {
    message: string;
    stack?: string;
  };
  failedAtStep: {
    index: number;
    name: string;
    lastAction: string;
  };
  timing: {
    totalDurationMs: number;
    slowestSteps: Array<{ name: string; durationMs: number }>;
  };
  checkpoints: Checkpoint[];
  recentEvents: TimelineEvent[];
  consoleErrors: TimelineEvent[];
  networkErrors: TimelineEvent[];
  diagnosticHints: string[];
  artifacts: {
    timeline: string;
    checkpoints: string;
    screenshotsDir: string;
    snapshotsDir: string;
    traceDir: string;
  };
  reproSteps: string[];
}
