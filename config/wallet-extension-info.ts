import * as fs from 'node:fs';
import * as path from 'node:path';

import type { MidenNetworkName } from './environments';

export interface WalletExtensionInfo {
  manifestPath: string;
  detectedNetwork: MidenNetworkName | 'unknown';
  evidence: string[];
}

export function detectWalletExtensionInfo(extensionPath: string): WalletExtensionInfo {
  const manifestPath = path.join(extensionPath, 'manifest.json');
  const evidence: string[] = [];
  let defaultNetwork: MidenNetworkName | undefined;
  let sawDevnet = false;
  let sawTestnet = false;

  for (const filePath of collectFiles(extensionPath)) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.json')) continue;
    const relativePath = path.relative(extensionPath, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const defaultMatch = content.match(/\bDEFAULT_NETWORK\s*=\s*["'](devnet|testnet)["']/);
    if (defaultMatch?.[1] === 'devnet' || defaultMatch?.[1] === 'testnet') {
      defaultNetwork = defaultMatch[1];
      evidence.unshift(`${relativePath}:DEFAULT_NETWORK=${defaultNetwork}`);
    }

    if (content.includes('rpc.devnet.miden.io') || content.includes('MIDEN_NETWORK:devnet')) {
      sawDevnet = true;
      evidence.push(`${relativePath}:devnet`);
    }

    if (content.includes('rpc.testnet.miden.io') || content.includes('MIDEN_NETWORK:testnet')) {
      sawTestnet = true;
      evidence.push(`${relativePath}:testnet`);
    }
  }

  const detectedNetwork = defaultNetwork ?? (sawDevnet && !sawTestnet ? 'devnet' : sawTestnet && !sawDevnet ? 'testnet' : 'unknown');

  return {
    manifestPath,
    detectedNetwork,
    evidence: evidence.slice(0, 8)
  };
}

export function getNetworkSpecificWalletExtensionPath(networkName: MidenNetworkName): string | undefined {
  const specificEnv = process.env[`WALLET_EXTENSION_PATH_${networkName.toUpperCase()}`];
  if (specificEnv) return path.resolve(specificEnv);

  const localBuild = path.resolve(process.cwd(), '.wallet-builds', networkName, 'chrome_unpacked');
  if (fs.existsSync(path.join(localBuild, 'manifest.json'))) return localBuild;

  return undefined;
}

function collectFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];

  const result: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        pending.push(child);
      } else if (dirent.isFile()) {
        result.push(child);
      }
    }
  }

  return result;
}
