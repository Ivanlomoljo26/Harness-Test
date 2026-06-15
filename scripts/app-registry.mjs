import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(repoRoot, 'config', 'apps.json');

export function loadAppRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

export function appNames(options = {}) {
  const registry = loadAppRegistry();
  return Object.entries(registry)
    .filter(([, config]) => options.includeDisabled || config.enabled !== false)
    .map(([name]) => name);
}

export function registeredAppNames() {
  return appNames({ includeDisabled: true });
}

export function isAppName(value, options = {}) {
  const registry = loadAppRegistry();
  return Object.prototype.hasOwnProperty.call(registry, value) &&
    (options.includeDisabled || registry[value].enabled !== false);
}

export function appChoicesLabel(options = {}) {
  const names = appNames({ includeDisabled: options.includeDisabled });
  return options.includeAll ? [...names, 'all'].join('|') : names.join('|');
}

export function selectedAppNames(selected = process.env.E2E_APP || 'all') {
  if (selected === 'all') return appNames();
  if (isAppName(selected)) return [selected];

  if (isAppName(selected, { includeDisabled: true })) {
    throw new Error(`E2E_APP=${selected} is registered but disabled in config/apps.json.`);
  }

  throw new Error(`E2E_APP must be all or one of ${appNames().join(', ')}. Got ${selected}.`);
}
