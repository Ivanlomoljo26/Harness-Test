import { createRequire } from 'node:module';
import './load-env';
import { getEnvironmentConfig, type MidenNetworkName } from './environments';

export type PioneerAppName = string;
export type AppUrlSource = 'network-env' | 'generic-env' | 'known-network-default' | 'default-fallback';

export interface PioneerAppConfig {
  name: PioneerAppName;
  displayName: string;
  defaultUrl: string;
  urlEnv: string;
  networkUrlEnv: string;
  url: string;
  urlSource: AppUrlSource;
  envPrefix: string;
  primaryScenarios: string[];
  requiresNetworkUrl: boolean;
  requiresMidenWallet: boolean;
}

interface PioneerAppBaseConfig {
  name: PioneerAppName;
  displayName: string;
  enabled?: boolean;
  defaultUrl: string;
  envPrefix: string;
  primaryScenarios: string[];
  networkUrls: Partial<Record<MidenNetworkName, string>>;
  requiresMidenWallet: boolean;
}

const require = createRequire(import.meta.url);
const rawAppConfigs = require('./apps.json') as Record<PioneerAppName, PioneerAppBaseConfig>;

export const APP_BASE_CONFIGS = rawAppConfigs as Record<PioneerAppName, PioneerAppBaseConfig>;

export function appNames(options: { includeDisabled?: boolean } = {}): PioneerAppName[] {
  return Object.entries(APP_BASE_CONFIGS)
    .filter(([, config]) => options.includeDisabled || config.enabled !== false)
    .map(([name]) => name);
}

export function isPioneerAppName(
  value: string,
  options: { includeDisabled?: boolean } = {}
): value is PioneerAppName {
  return Object.prototype.hasOwnProperty.call(APP_BASE_CONFIGS, value) &&
    (options.includeDisabled || APP_BASE_CONFIGS[value]?.enabled !== false);
}

export function getAppConfig(name: PioneerAppName, networkName = getEnvironmentConfig().name): PioneerAppConfig {
  const base = getBaseAppConfig(name);
  const resolvedUrl = resolveAppUrl(name, networkName);

  return {
    name: base.name,
    displayName: base.displayName,
    defaultUrl: base.defaultUrl,
    envPrefix: base.envPrefix,
    urlEnv: resolvedUrl.urlEnv,
    networkUrlEnv: resolvedUrl.networkUrlEnv,
    url: resolvedUrl.url,
    urlSource: resolvedUrl.source,
    primaryScenarios: base.primaryScenarios,
    requiresNetworkUrl: requiresExplicitNetworkUrl(name, networkName),
    requiresMidenWallet: base.requiresMidenWallet
  };
}

export function resolveAppUrl(
  name: PioneerAppName,
  networkName: MidenNetworkName
): {
  url: string;
  urlEnv: string;
  networkUrlEnv: string;
  source: AppUrlSource;
} {
  const base = getBaseAppConfig(name);
  const genericUrlEnv = `${base.envPrefix}_URL`;
  const networkUrlEnv = `${base.envPrefix}_URL_${networkName.toUpperCase()}`;

  if (process.env[networkUrlEnv]) {
    return { url: process.env[networkUrlEnv], urlEnv: genericUrlEnv, networkUrlEnv, source: 'network-env' };
  }

  if (process.env[genericUrlEnv]) {
    return { url: process.env[genericUrlEnv], urlEnv: genericUrlEnv, networkUrlEnv, source: 'generic-env' };
  }

  if (base.networkUrls[networkName]) {
    return { url: base.networkUrls[networkName], urlEnv: genericUrlEnv, networkUrlEnv, source: 'known-network-default' };
  }

  return { url: base.defaultUrl, urlEnv: genericUrlEnv, networkUrlEnv, source: 'default-fallback' };
}

export function requiresExplicitNetworkUrl(name: PioneerAppName, networkName: MidenNetworkName): boolean {
  if (networkName === 'localhost') return false;
  const base = getBaseAppConfig(name);
  const networkUrlEnv = `${base.envPrefix}_URL_${networkName.toUpperCase()}`;
  return !base.networkUrls[networkName] && !process.env[networkUrlEnv];
}

export function selectedAppNames(selected = process.env.E2E_APP ?? 'all'): PioneerAppName[] {
  if (selected === 'all') return appNames();
  if (isPioneerAppName(selected)) return [selected];
  if (isPioneerAppName(selected, { includeDisabled: true })) {
    throw new Error(`E2E_APP=${selected} is registered but disabled in config/apps.json.`);
  }
  throw new Error(`E2E_APP must be all or one of ${appNames().join(', ')}. Got ${selected}.`);
}

export function inferAppNameFromFile(filePath: string): PioneerAppName {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const match = normalizedPath.match(/(?:^|\/)apps\/([^/]+)\//);
  const appName = match?.[1];
  if (appName && isPioneerAppName(appName)) return appName;
  throw new Error(`Cannot infer Pioneer app from test file path: ${filePath}`);
}

export function shouldRunApp(name: PioneerAppName, selected = process.env.E2E_APP ?? 'all'): boolean {
  if (!isPioneerAppName(name)) return false;
  return selected === 'all' || selected === name;
}

function getBaseAppConfig(name: PioneerAppName): PioneerAppBaseConfig {
  const base = APP_BASE_CONFIGS[name];
  if (!base) {
    throw new Error(`Unknown Pioneer app "${name}". Registered apps: ${appNames({ includeDisabled: true }).join(', ')}`);
  }
  if (base.enabled === false) {
    throw new Error(`Pioneer app "${name}" is disabled in config/apps.json.`);
  }
  return base;
}
