#!/usr/bin/env node
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const network = process.argv[2];
const allowedNetworks = ['devnet', 'testnet'];

if (!allowedNetworks.includes(network)) {
  console.error('Usage: node scripts/build-wallet-extension.mjs <devnet|testnet>');
  process.exit(2);
}

const rootDir = process.cwd();
const walletRepoPath = path.resolve(process.env.WALLET_REPO_PATH || path.join(rootDir, '..', 'wallet'));
const sourcePath = path.join(walletRepoPath, 'dist', 'chrome_unpacked');
const targetPath = path.join(rootDir, '.wallet-builds', network, 'chrome_unpacked');
const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

if (!fs.existsSync(path.join(walletRepoPath, 'package.json'))) {
  console.error(`WALLET_REPO_PATH does not look like the Miden wallet repo: ${walletRepoPath}`);
  process.exit(1);
}

console.log(`Building Miden wallet extension for ${network} from ${walletRepoPath}`);
const build = spawnSync(yarn, ['test:e2e:blockchain:build'], {
  cwd: walletRepoPath,
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_NETWORK: network,
    MIDEN_NETWORK: network
  }
});

if ((build.status ?? 1) !== 0) {
  process.exit(build.status ?? 1);
}

if (!fs.existsSync(path.join(sourcePath, 'manifest.json'))) {
  console.error(`Wallet build did not produce manifest.json at ${sourcePath}`);
  process.exit(1);
}

fs.rmSync(targetPath, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.cpSync(sourcePath, targetPath, { recursive: true });

console.log(`Copied ${network} wallet extension to ${targetPath}`);
