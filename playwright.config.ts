import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './apps',
  testMatch: /.*\.spec\.ts/,
  timeout: 300_000,
  expect: {
    timeout: 60_000
  },
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['html', { outputFolder: 'test-results/html', open: 'never' }]
  ],
  outputDir: 'test-results/playwright-artifacts',
  use: {
    ...devices['Desktop Chrome'],
    actionTimeout: 45_000,
    navigationTimeout: 90_000,
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
