#!/usr/bin/env node
import './load-env.mjs';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const args = process.argv.slice(2);
let network = 'testnet';
if (args[0] && !args[0].startsWith('-')) {
  network = args.shift();
}

if (!['devnet', 'testnet', 'localhost'].includes(network)) {
  console.error('Usage: node scripts/run-qash-windows-profile-authenticated.mjs [devnet|testnet|localhost] [playwright args...]');
  process.exit(2);
}

const chromeExe = process.env.QASH_WINDOWS_CHROME_EXE || findWindowsChromeExe();
if (!process.env.QASH_WINDOWS_CHROME_USER_DATA_DIR) {
  console.error(
    'QASH_WINDOWS_CHROME_USER_DATA_DIR is required for the Windows Chrome profile runner, for example ' +
      '`C:\\Users\\<you>\\AppData\\Local\\Google\\Chrome\\User Data`.'
  );
  process.exit(1);
}

const userDataDirWindows = toWindowsPath(process.env.QASH_WINDOWS_CHROME_USER_DATA_DIR);
const userDataDirWsl = toWslPath(userDataDirWindows);
const profileDirectory = process.env.QASH_WINDOWS_CHROME_PROFILE_DIRECTORY || 'Default';
const qashUrl = process.env.QASH_URL_TESTNET || process.env.QASH_URL || 'https://app.qash.finance/';
const expectedEmail = process.env.QASH_AUTH_ACCOUNT_EMAIL || process.env.QASH_GOOGLE_ACCOUNT_EMAIL;
const windowsHostAddress = process.env.QASH_WINDOWS_CHROME_CONNECT_HOST || discoverWindowsWslHostAddress();
const debugAddress = process.env.QASH_WINDOWS_CHROME_DEBUG_ADDRESS || windowsHostAddress || '127.0.0.1';
const debugPort = Number(process.env.QASH_WINDOWS_CHROME_DEBUG_PORT || await findFreePort());
const connectHosts = dedupe([
  process.env.QASH_WINDOWS_CHROME_CONNECT_HOST,
  debugAddress === '0.0.0.0' ? windowsHostAddress : debugAddress,
  windowsHostAddress,
  '127.0.0.1',
  'localhost'
]).filter(Boolean);

if (!chromeExe) {
  console.error(
    'Could not find Windows Chrome. Set QASH_WINDOWS_CHROME_EXE to the WSL path for chrome.exe, for example ' +
      '`/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`.'
  );
  process.exit(1);
}

if (!fs.existsSync(userDataDirWsl)) {
  console.error(`Windows Chrome user-data directory does not exist from WSL: ${userDataDirWsl}`);
  process.exit(1);
}

const profileInfo = readChromeProfileInfo(userDataDirWsl, profileDirectory);
const profileEmail = profileInfo?.user_name || profileInfo?.gaia_name || '';
if (expectedEmail && profileInfo?.user_name && profileInfo.user_name.toLowerCase() !== expectedEmail.toLowerCase()) {
  console.error(
    `Chrome profile ${profileDirectory} is signed in as ${profileInfo.user_name}, not ${expectedEmail}. ` +
      'Set QASH_WINDOWS_CHROME_PROFILE_DIRECTORY to the correct Chrome profile directory.'
  );
  process.exit(1);
}

console.log(`Launching Windows Chrome profile: ${profileDirectory}`);
console.log(`Chrome profile account: ${profileInfo?.user_name || 'unknown'}`);
console.log(`Chrome user-data root: ${userDataDirWindows}`);
console.log(`Chrome debug bind address: ${debugAddress}`);
console.log(`CDP endpoint candidates: ${connectHosts.map(host => `http://${host}:${debugPort}`).join(', ')}`);

const chrome = spawn(chromeExe, [
  `--remote-debugging-port=${debugPort}`,
  `--remote-debugging-address=${debugAddress}`,
  `--user-data-dir=${userDataDirWindows}`,
  `--profile-directory=${profileDirectory}`,
  '--no-first-run',
  '--no-default-browser-check',
  qashUrl
], {
  detached: true,
  stdio: 'ignore'
});
chrome.unref();

let proxyProcess = null;
let cdpEndpoint = await waitForCdpEndpoint(debugPort, connectHosts, 5_000);
let windowsLocalDebugPort = debugPort;
if (!cdpEndpoint && !await isWindowsLocalCdpReachable(windowsLocalDebugPort)) {
  const existingDebugPort = findExistingWindowsChromeDebugPort(userDataDirWindows);
  if (existingDebugPort && await isWindowsLocalCdpReachable(existingDebugPort)) {
    windowsLocalDebugPort = existingDebugPort;
    console.log(`Reusing existing Windows Chrome CDP port for this profile: ${windowsLocalDebugPort}`);
  }
}

if (!cdpEndpoint && windowsHostAddress && await isWindowsLocalCdpReachable(windowsLocalDebugPort)) {
  const proxyPort = Number(process.env.QASH_WINDOWS_CDP_PROXY_PORT || findWindowsFreePort() || await findFreePort());
  const proxyScriptWindowsPath = ensureWindowsTcpProxyScript();

  console.log(
    `Windows-local CDP is reachable. Starting proxy http://${windowsHostAddress}:${proxyPort} -> http://127.0.0.1:${windowsLocalDebugPort}`
  );
  proxyProcess = await startWindowsTcpProxy({
    scriptWindowsPath: proxyScriptWindowsPath,
    listenHost: windowsHostAddress,
    listenPort: proxyPort,
    targetHost: '127.0.0.1',
    targetPort: windowsLocalDebugPort
  });
  cdpEndpoint = await waitForCdpEndpoint(proxyPort, [windowsHostAddress], 10_000);
}

if (!cdpEndpoint) {
  if (proxyProcess) {
    stopWindowsTcpProxy();
  }
  console.error(
    [
      'Windows Chrome did not expose a reachable CDP endpoint.',
      `Tried port: ${debugPort}`,
      `Debug address passed to Chrome: ${debugAddress}`,
      `Connect hosts tried from WSL: ${connectHosts.join(', ')}`,
      '',
      'Most common cause: this Chrome profile is already open, so Chrome reused the existing process and ignored the new remote-debugging flag.',
      'Close the selected Chrome profile window, then rerun this command. If Chrome is closed, set QASH_WINDOWS_CHROME_CONNECT_HOST to the Windows WSL interface IP.',
      '',
      'No Google credentials were read or entered.'
    ].join('\n')
  );
  process.exit(1);
}

console.log(`Connected CDP endpoint: ${cdpEndpoint}`);

const result = spawnSync(
  process.execPath,
  ['scripts/run-qash-authenticated.mjs', network, ...args],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      QASH_AUTH_CDP_ENDPOINT: cdpEndpoint,
      QASH_AUTH_ACCOUNT_EMAIL: process.env.QASH_AUTH_ACCOUNT_EMAIL || process.env.QASH_GOOGLE_ACCOUNT_EMAIL || profileInfo?.user_name || profileEmail
    }
  }
);

if (proxyProcess) {
  stopWindowsTcpProxy();
}

process.exit(result.status ?? 1);

function findWindowsChromeExe() {
  for (const candidate of [
    '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readChromeProfileInfo(userDataRoot, profileName) {
  const localStatePath = path.join(userDataRoot, 'Local State');
  if (!fs.existsSync(localStatePath)) return null;

  const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
  return localState.profile?.info_cache?.[profileName] ?? null;
}

function toWindowsPath(input) {
  const match = input.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!match) return input;

  const [, drive, rest] = match;
  return `${drive.toUpperCase()}:\\${rest.replace(/\//g, '\\')}`;
}

function toWslPath(input) {
  const match = input.match(/^([A-Za-z]):[\\/](.*)$/);
  if (!match) return input;

  const [, drive, rest] = match;
  return `/mnt/${drive.toLowerCase()}/${rest.replace(/[\\/]+/g, '/')}`;
}

function discoverWindowsWslHostAddress() {
  const script = [
    'Get-NetIPAddress -AddressFamily IPv4',
    '| Where-Object { $_.InterfaceAlias -like "*WSL*" -or $_.InterfaceAlias -like "*vEthernet*" }',
    '| Select-Object -First 1 -ExpandProperty IPAddress'
  ].join(' ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8'
  });
  const address = result.stdout.trim().split(/\r?\n/).find(Boolean);
  return address || null;
}

function discoverWindowsTempDir() {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Write-Output $env:TEMP'], {
    encoding: 'utf8'
  });
  return result.stdout.trim().split(/\r?\n/).find(Boolean) || null;
}

function dedupe(values) {
  return [...new Set(values)];
}

function ensureWindowsTcpProxyScript() {
  const windowsTempDir = process.env.QASH_WINDOWS_TEMP_DIR || discoverWindowsTempDir();
  if (!windowsTempDir) {
    throw new Error('Could not determine Windows TEMP for the CDP proxy helper.');
  }

  const scriptWindowsPath = `${windowsTempDir.replace(/[\\/]+$/, '')}\\pioneer-windows-tcp-proxy.mjs`;
  const scriptWslPath = toWslPath(scriptWindowsPath);
  fs.mkdirSync(path.dirname(scriptWslPath), { recursive: true });
  fs.copyFileSync(path.resolve(process.cwd(), 'scripts/windows-tcp-proxy.mjs'), scriptWslPath);
  return scriptWindowsPath;
}

function findWindowsFreePort() {
  const script = [
    '$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), 0)',
    '$listener.Start()',
    '$port = $listener.LocalEndpoint.Port',
    '$listener.Stop()',
    'Write-Output $port'
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8'
  });
  const port = Number(result.stdout.trim());
  return Number.isFinite(port) && port > 0 ? port : null;
}

function findExistingWindowsChromeDebugPort(userDataDir) {
  const escapedUserDataDir = userDataDir.replace(/'/g, "''");
  const script = [
    'Get-CimInstance Win32_Process',
    `| Where-Object { $_.Name -eq "chrome.exe" -and $_.CommandLine -like "*${escapedUserDataDir}*" -and $_.CommandLine -match "--remote-debugging-port=(\\d+)" }`,
    '| Select-Object -First 1 -ExpandProperty CommandLine'
  ].join(' ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8'
  });
  const match = result.stdout.match(/--remote-debugging-port=(\d+)/);
  return match ? Number(match[1]) : null;
}

function startWindowsTcpProxy({ scriptWindowsPath, listenHost, listenPort, targetHost, targetPort }) {
  const command = [
    'node',
    powershellSingleQuoted(scriptWindowsPath),
    listenHost,
    String(listenPort),
    targetHost,
    String(targetPort)
  ].join(' ');

  const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out starting Windows TCP proxy. Output: ${output.trim()}`));
    }, 10_000);

    child.stdout.on('data', chunk => {
      output += chunk.toString();
      if (output.includes('READY')) {
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr.on('data', chunk => {
      output += chunk.toString();
    });

    child.on('exit', code => {
      clearTimeout(timeout);
      if (!output.includes('READY')) {
        reject(new Error(`Windows TCP proxy exited with code ${code}. Output: ${output.trim()}`));
      }
    });
  });
}

function stopWindowsTcpProxy() {
  const script = [
    'Get-CimInstance Win32_Process',
    '| Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like "*pioneer-windows-tcp-proxy.mjs*" }',
    '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }'
  ].join(' ');
  spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    stdio: 'ignore'
  });
}

function powershellSingleQuoted(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === 'object' && address?.port) {
          resolve(address.port);
        } else {
          reject(new Error('Could not allocate a free debug port.'));
        }
      });
    });
  });
}

async function waitForCdpEndpoint(port, hosts, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const candidates = hosts.map(host => `http://${host}:${port}`);

  while (Date.now() < deadline) {
    for (const endpoint of candidates) {
      const reachable = await isCdpReachable(endpoint);
      if (reachable) return endpoint;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return null;
}

async function isCdpReachable(endpoint) {
  try {
    const response = await fetch(`${endpoint}/json/version`, {
      signal: AbortSignal.timeout(1_000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function isWindowsLocalCdpReachable(port) {
  const script = [
    'try {',
    `(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:${port}/json/version" -TimeoutSec 2).StatusCode`,
    '} catch { exit 1 }'
  ].join(' ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    stdio: 'ignore'
  });
  return (result.status ?? 1) === 0;
}
