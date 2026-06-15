import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

export const WINDOWS_CHROME_CDP_MODE = 'windows-chrome-cdp';
export const PLAYWRIGHT_CHROMIUM_MODE = 'playwright-chromium';
export const OFFICIAL_MIDEN_WALLET_EXTENSION_ID = 'ablmompanofnodfdkgchkpmphailefpb';
const SEEDED_ACTOR_PROFILE_METADATA = 'qash-actor-chrome-profile.json';

export function resolveActorBrowserMode() {
  const requested = (
    process.env.QASH_ACTOR_BROWSER_MODE ||
    process.env.QASH_WALLET_BROWSER_MODE ||
    process.env.WALLET_BROWSER_MODE ||
    ''
  ).trim().toLowerCase();

  if (!requested) {
    return findWindowsChromeExe() ? WINDOWS_CHROME_CDP_MODE : PLAYWRIGHT_CHROMIUM_MODE;
  }

  if (['windows-chrome-cdp', 'real-chrome-cdp', 'windows-chrome'].includes(requested)) {
    return WINDOWS_CHROME_CDP_MODE;
  }

  if (['playwright-chromium', 'chromium', 'chrome-for-testing'].includes(requested)) {
    return PLAYWRIGHT_CHROMIUM_MODE;
  }

  throw new Error(
    `Unsupported Qash actor browser mode: ${requested}. ` +
      `Use ${WINDOWS_CHROME_CDP_MODE} or ${PLAYWRIGHT_CHROMIUM_MODE}.`
  );
}

export function findWindowsChromeExe() {
  for (const candidate of [
    '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function isWindowsBackedPath(input) {
  return /^\/mnt\/[a-z]\//i.test(input) || /^[a-z]:[\\/]/i.test(input);
}

export function resolveWindowsActorProfileDir(role, configuredProfileDir) {
  if (configuredProfileDir?.trim()) {
    return resolveWindowsPathPair(configuredProfileDir.trim());
  }

  const windowsTempDir = process.env.QASH_WINDOWS_TEMP_DIR || discoverWindowsTempDir();
  if (!windowsTempDir) {
    throw new Error('Could not determine Windows TEMP for clean Qash actor profile storage.');
  }

  const root = process.env.QASH_WINDOWS_ACTOR_USER_DATA_ROOT ||
    `${windowsTempDir.replace(/[\\/]+$/, '')}\\pioneer-e2e-qash-actors`;
  return resolveWindowsPathPair(`${root}\\${role}`);
}

export function resolveWindowsPathPair(input) {
  const value = input.trim();
  if (!isWindowsBackedPath(value)) {
    throw new Error(
      `Windows Chrome actor profiles must live on a Windows-backed path. Got: ${value}. ` +
        'Use QASH_ACTOR_A_PROFILE_DIR/QASH_ACTOR_B_PROFILE_DIR under /mnt/c/... or leave them unset.'
    );
  }

  const windowsPath = toWindowsPath(value);
  const wslPath = toWslPath(windowsPath);
  return { windowsPath, wslPath };
}

export function toWindowsPath(input) {
  const match = input.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!match) return input;

  const [, drive, rest] = match;
  return `${drive.toUpperCase()}:\\${rest.replace(/\//g, '\\')}`;
}

export function toWslPath(input) {
  const match = input.match(/^([A-Za-z]):[\\/](.*)$/);
  if (!match) return input;

  const [, drive, rest] = match;
  return `/mnt/${drive.toLowerCase()}/${rest.replace(/[\\/]+/g, '/')}`;
}

export async function launchWindowsChromeWithCdp(options) {
  const chromeExe = process.env.QASH_WINDOWS_CHROME_EXE || findWindowsChromeExe();
  if (!chromeExe) {
    throw new Error(
      'Could not find Windows Google Chrome. Set QASH_WINDOWS_CHROME_EXE to the WSL path for chrome.exe.'
    );
  }

  const source = options.source || 'qash-actor';
  const userDataDir = resolveWindowsPathPair(options.userDataDir);
  const extension = options.extensionPath
    ? stageChromeExtensionForWindows(options.extensionPath, options.extensionLabel || source)
    : null;

  fs.mkdirSync(userDataDir.wslPath, { recursive: true });

  const requestedDebugPort = options.debugPort ||
    (options.useEnvDebugPort ? process.env.QASH_WINDOWS_CHROME_DEBUG_PORT : undefined);
  const debugPort = Number(requestedDebugPort) ||
    findWindowsFreePort() ||
    await findFreePort();
  const windowsHostAddress = process.env.QASH_WINDOWS_CHROME_CONNECT_HOST || discoverWindowsWslHostAddress();
  const debugAddress = process.env.QASH_WINDOWS_CHROME_DEBUG_ADDRESS || '127.0.0.1';
  const connectHosts = dedupe([
    process.env.QASH_WINDOWS_CHROME_CONNECT_HOST,
    debugAddress === '0.0.0.0' ? windowsHostAddress : debugAddress,
    windowsHostAddress,
    '127.0.0.1',
    'localhost'
  ]).filter(Boolean);

  const chromeArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--remote-debugging-address=${debugAddress}`,
    `--user-data-dir=${toChromeArgPath(userDataDir.windowsPath)}`,
    `--profile-directory=${options.profileDirectory || 'Default'}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--disable-session-crashed-bubble',
    '--hide-crash-restore-bubble',
    '--password-store=basic',
    ...(extension ? [
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
      `--disable-extensions-except=${toChromeArgPath(extension.windowsPath)}`,
      `--load-extension=${toChromeArgPath(extension.windowsPath)}`
    ] : []),
    ...(process.env.QASH_WINDOWS_CHROME_LOG_OUTPUT === 'true' ? ['--enable-logging=stderr', '--v=1'] : []),
    ...(options.windowSize ? [`--window-size=${options.windowSize.width},${options.windowSize.height}`] : []),
    options.initialUrl || 'about:blank'
  ];

  if (process.env.QASH_WINDOWS_CHROME_LOG_ARGS === 'true') {
    console.log(`Windows Chrome executable: ${chromeExe}`);
    console.log(`Windows Chrome args for ${source}:`);
    for (const arg of chromeArgs) console.log(`  ${arg}`);
  }

  const logChromeOutput = process.env.QASH_WINDOWS_CHROME_LOG_OUTPUT === 'true';
  const chrome = spawn(chromeExe, chromeArgs, {
    detached: true,
    stdio: logChromeOutput ? ['ignore', 'pipe', 'pipe'] : 'ignore'
  });
  if (logChromeOutput) {
    chrome.stdout?.on('data', chunk => process.stdout.write(`[chrome:${source}] ${chunk.toString()}`));
    chrome.stderr?.on('data', chunk => process.stderr.write(`[chrome:${source}] ${chunk.toString()}`));
  }
  chrome.unref();

  let proxyProcess = null;
  let proxyPort = null;
  let cdpEndpoint = await waitForCdpEndpoint(debugPort, connectHosts, 5_000);

  if (!cdpEndpoint && windowsHostAddress && await isWindowsLocalCdpReachable(debugPort)) {
    const requestedProxyPort = options.proxyPort ||
      (options.useEnvProxyPort ? process.env.QASH_WINDOWS_CDP_PROXY_PORT : undefined);
    proxyPort = Number(requestedProxyPort) ||
      findWindowsFreePort() ||
      await findFreePort();
    const proxyScriptWindowsPath = ensureWindowsTcpProxyScript();
    proxyProcess = await startWindowsTcpProxy({
      scriptWindowsPath: proxyScriptWindowsPath,
      listenHost: windowsHostAddress,
      listenPort: proxyPort,
      targetHost: '127.0.0.1',
      targetPort: debugPort
    });
    cdpEndpoint = await waitForCdpEndpoint(proxyPort, [windowsHostAddress], 10_000);
  }

  if (!cdpEndpoint) {
    stopWindowsTcpProxy({ child: proxyProcess, listenPort: proxyPort });
    stopWindowsChromeForUserDataDir(userDataDir.windowsPath);
    throw new Error(
      [
        `Windows Chrome CDP endpoint was not reachable for ${source}.`,
        `User-data dir: ${userDataDir.windowsPath}`,
        `Debug port: ${debugPort}`,
        `Debug bind address: ${debugAddress}`,
        `Connect hosts tried from WSL: ${connectHosts.join(', ')}`,
        'If Chrome for this profile is already open, close it first so the remote debugging flag is honored.'
      ].join('\n')
    );
  }

  return {
    source,
    cdpEndpoint,
    debugPort,
    proxyPort,
    userDataDirWindows: userDataDir.windowsPath,
    userDataDirWsl: userDataDir.wslPath,
    extensionWindowsPath: extension?.windowsPath ?? null,
    close: async ({ keepBrowser = false } = {}) => {
      stopWindowsTcpProxy({ child: proxyProcess, listenPort: proxyPort });
      if (!keepBrowser) {
        stopWindowsChromeForUserDataDir(userDataDir.windowsPath);
      }
    }
  };
}

export function stageChromeExtensionForWindows(extensionPath, label = 'wallet') {
  const sourcePath = path.resolve(extensionPath);
  const manifestPath = path.join(sourcePath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No wallet extension manifest.json found at ${sourcePath}.`);
  }

  const windowsTempDir = process.env.QASH_WINDOWS_TEMP_DIR || discoverWindowsTempDir();
  if (!windowsTempDir) {
    throw new Error('Could not determine Windows TEMP for wallet extension staging.');
  }

  const stat = fs.statSync(manifestPath);
  const hash = crypto
    .createHash('sha1')
    .update(`${sourcePath}:${stat.mtimeMs}`)
    .digest('hex')
    .slice(0, 12);
  const safeLabel = label.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'wallet';
  const windowsPath = `${windowsTempDir.replace(/[\\/]+$/, '')}\\pioneer-e2e-wallet-extension\\${safeLabel}-${hash}`;
  const wslPath = toWslPath(windowsPath);

  fs.mkdirSync(path.dirname(wslPath), { recursive: true });
  fs.cpSync(sourcePath, wslPath, { recursive: true, force: true });
  sanitizeStagedUnpackedExtension(wslPath);
  return { windowsPath, wslPath };
}

function sanitizeStagedUnpackedExtension(extensionPath) {
  fs.rmSync(path.join(extensionPath, '_metadata'), { recursive: true, force: true });
  const manifestPath = path.join(extensionPath, 'manifest.json');
  const manifest = readJsonIfExists(manifestPath);
  if (manifest?.update_url) {
    delete manifest.update_url;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

export function discoverWindowsWslHostAddress() {
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

export function discoverWindowsTempDir() {
  const script = [
    '$longTemp = [Environment]::GetFolderPath("LocalApplicationData") + "\\Temp"',
    'if (Test-Path $longTemp) { (Get-Item $longTemp).FullName } else { (Get-Item $env:TEMP).FullName }'
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8'
  });
  return result.stdout.trim().split(/\r?\n/).find(Boolean) || null;
}

export function discoverWindowsChromeUserDataRoot() {
  const configured = process.env.QASH_WINDOWS_CHROME_USER_DATA_ROOT;
  if (configured?.trim()) return resolveWindowsPathPair(configured.trim());

  const script = [
    '$root = [Environment]::GetFolderPath("LocalApplicationData") + "\\Google\\Chrome\\User Data"',
    'if (Test-Path $root) { (Get-Item $root).FullName }'
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8'
  });
  const windowsPath = result.stdout.trim().split(/\r?\n/).find(Boolean);
  if (windowsPath) return resolveWindowsPathPair(windowsPath);

  const fallback = findWslChromeUserDataRoot();
  return fallback ? resolveWindowsPathPair(fallback) : null;
}

export function seedWindowsActorProfileFromInstalledChrome(options) {
  const extensionId = options.extensionId || OFFICIAL_MIDEN_WALLET_EXTENSION_ID;
  const requireWallet = options.requireWallet !== false;
  const target = resolveWindowsPathPair(options.targetUserDataDir);
  let source = null;
  const getSource = () => {
    if (source) return source;
    source = resolveInstalledChromeActorSourceProfile({
      email: options.email,
      walletAddress: requireWallet ? options.walletAddress : undefined,
      extensionId
    });
    return source;
  };
  const existing = inspectSeededActorProfile({
    targetUserDataDir: target.wslPath,
    email: options.email,
    walletAddress: requireWallet ? options.walletAddress : undefined,
    extensionId
  });
  if (existing.verifiedProfileStateReady && options.force !== true) {
    const sourceProfile = getSource();
    if (sourceProfile) {
      const targetChromeProfile = path.join(target.wslPath, existing.profileDirectory);
      refreshOfficialExtensionInstall(sourceProfile.profileDir, targetChromeProfile, extensionId);
    }
    const refreshed = inspectSeededActorProfile({
      targetUserDataDir: target.wslPath,
      email: options.email,
      walletAddress: options.walletAddress,
      extensionId
    });
    normalizeSeededChromeLocalState(path.join(target.wslPath, 'Local State'), refreshed.profileDirectory);
    removeProfileLaunchArtifacts(target.wslPath);
    removeProfileLaunchArtifacts(path.join(target.wslPath, refreshed.profileDirectory));
    return {
      seeded: false,
      sourceProfileDirectory: sourceProfile?.profileDirectory ?? refreshed.profileDirectory,
      sourceProfileDir: sourceProfile?.profileDir ?? null,
      targetUserDataDir: target.wslPath,
      targetProfileDirectory: refreshed.profileDirectory,
      extensionPath: refreshed.extensionPath,
      reason: 'existing-profile-verified'
    };
  }
  if (existing.ready && options.force !== true) {
    normalizeSeededChromeLocalState(path.join(target.wslPath, 'Local State'), existing.profileDirectory);
    removeProfileLaunchArtifacts(target.wslPath);
    removeProfileLaunchArtifacts(path.join(target.wslPath, existing.profileDirectory));
    return {
      seeded: false,
      sourceProfileDirectory: existing.profileDirectory,
      sourceProfileDir: null,
      targetUserDataDir: target.wslPath,
      targetProfileDirectory: existing.profileDirectory,
      extensionPath: existing.extensionPath,
      reason: existing.verifiedProfileStateReady ? 'existing-profile-verified' : 'existing-profile-ready'
    };
  }

  const sourceProfile = getSource();

  if (!sourceProfile) {
    throw new Error(
      [
        `Could not find a Windows Chrome source profile for ${options.role}.`,
        `Expected email: ${options.email}`,
        `Expected wallet address: ${options.walletAddress}`,
        `Expected extension ID: ${extensionId}`,
        'Open the matching normal Chrome profile once, verify Qash login and Miden Wallet readiness, then rerun.'
      ].join('\n')
    );
  }

  archiveExistingProfile(target.wslPath, options.role);
  fs.mkdirSync(target.wslPath, { recursive: true });

  const targetLocalState = path.join(target.wslPath, 'Local State');
  copyPathIfExists(path.join(sourceProfile.userDataRoot, 'Local State'), targetLocalState);
  normalizeSeededChromeLocalState(targetLocalState, sourceProfile.profileDirectory);
  writeSeededActorProfileMetadata(target.wslPath, sourceProfile.profileDirectory);
  const targetChromeProfile = path.join(target.wslPath, sourceProfile.profileDirectory);
  fs.mkdirSync(targetChromeProfile, { recursive: true });

  copyProfileSeed(sourceProfile.profileDir, targetChromeProfile, extensionId);
  removeProfileLaunchArtifacts(target.wslPath);
  removeProfileLaunchArtifacts(targetChromeProfile);

  const seeded = inspectSeededActorProfile({
    targetUserDataDir: target.wslPath,
    email: options.email,
    walletAddress: requireWallet ? options.walletAddress : undefined,
    extensionId
  });
  if ((requireWallet && !seeded.extensionPath) || (requireWallet && !seeded.walletAddressPresent)) {
    throw new Error(
      [
        `Seeded ${options.role} profile is incomplete.`,
        `Target: ${target.wslPath}`,
        `Official extension present: ${Boolean(seeded.extensionPath)}`,
        `Expected wallet address present: ${seeded.walletAddressPresent}`
      ].join('\n')
    );
  }

  return {
    seeded: true,
    sourceProfileDirectory: sourceProfile.profileDirectory,
    sourceProfileDir: sourceProfile.profileDir,
    targetUserDataDir: target.wslPath,
    targetProfileDirectory: sourceProfile.profileDirectory,
    extensionPath: seeded.extensionPath,
    reason: existing.exists ? 'replaced-stale-profile' : 'seeded-new-profile'
  };
}

export function resolveInstalledExtensionPathForUserDataDir(
  userDataDir,
  extensionId = OFFICIAL_MIDEN_WALLET_EXTENSION_ID,
  profileDirectory
) {
  const root = resolveWindowsPathPair(userDataDir).wslPath;
  const chromeProfileDirectory = profileDirectory || resolveSeededActorProfileDirectory(userDataDir);
  return resolveInstalledExtensionPathForProfileDir(path.join(root, chromeProfileDirectory), extensionId);
}

export function resolveInstalledExtensionPathForProfileDir(
  profileDir,
  extensionId = OFFICIAL_MIDEN_WALLET_EXTENSION_ID
) {
  const extensionRoot = path.join(profileDir, 'Extensions', extensionId);
  return latestExtensionVersionPath(extensionRoot);
}

export function resetOfficialWalletStateForSession(
  userDataDir,
  extensionId = OFFICIAL_MIDEN_WALLET_EXTENSION_ID,
  profileDirectory
) {
  const root = resolveWindowsPathPair(userDataDir).wslPath;
  const chromeProfileDirectory = profileDirectory || resolveSeededActorProfileDirectory(userDataDir);
  const profileDir = path.join(root, chromeProfileDirectory);

  for (const target of [
    path.join(profileDir, 'Local Extension Settings', extensionId),
    path.join(profileDir, 'Managed Extension Settings', extensionId),
    path.join(profileDir, 'Sync Extension Settings', extensionId),
    path.join(profileDir, 'IndexedDB', `chrome-extension_${extensionId}_0.indexeddb.leveldb`)
  ]) {
    fs.rmSync(target, { recursive: true, force: true });
  }

  removeProfileLaunchArtifacts(root);
  removeProfileLaunchArtifacts(profileDir);

  const resetStatePath = path.join(root, 'qash-runtime-wallet-reset.json');
  fs.writeFileSync(
    resetStatePath,
    `${JSON.stringify({
      extensionId,
      profileDirectory: chromeProfileDirectory,
      resetAt: new Date().toISOString(),
      mode: 'fresh-wallet-each-session'
    }, null, 2)}\n`
  );
}

export function resolveSeededActorProfileDirectory(userDataDir) {
  const root = resolveWindowsPathPair(userDataDir).wslPath;
  const metadata = readJsonIfExists(path.join(root, SEEDED_ACTOR_PROFILE_METADATA));
  const profileDirectory = metadata?.profileDirectory;
  return typeof profileDirectory === 'string' && profileDirectory.trim()
    ? profileDirectory.trim()
    : 'Default';
}

export function resolveInstalledChromeActorSourceProfile(options) {
  const chromeRoot = discoverWindowsChromeUserDataRoot();
  if (!chromeRoot) return null;
  const extensionId = options.extensionId || OFFICIAL_MIDEN_WALLET_EXTENSION_ID;
  const expectedEmail = options.email?.trim().toLowerCase();
  const expectedWalletAddress = options.walletAddress?.trim();
  const candidates = [];

  for (const profileDirectory of listChromeProfileDirectories(chromeRoot.wslPath)) {
    const profileDir = path.join(chromeRoot.wslPath, profileDirectory);
    const preferences = readJsonIfExists(path.join(profileDir, 'Preferences')) ?? {};
    const emails = collectProfileEmails(preferences).map(value => value.toLowerCase());
    const extensionPath = latestExtensionVersionPath(path.join(profileDir, 'Extensions', extensionId));
    const walletAddressPresent = expectedWalletAddress
      ? profileContainsText(profileDir, extensionId, expectedWalletAddress)
      : false;
    const emailMatches = expectedEmail ? emails.includes(expectedEmail) : false;

    candidates.push({
      userDataRoot: chromeRoot.wslPath,
      userDataRootWindows: chromeRoot.windowsPath,
      profileDirectory,
      profileDir,
      emails,
      extensionPath,
      emailMatches,
      walletAddressPresent
    });
  }

  return candidates.find(candidate => candidate.emailMatches && candidate.walletAddressPresent) ??
    candidates.find(candidate => candidate.walletAddressPresent) ??
    candidates.find(candidate => candidate.emailMatches && candidate.extensionPath) ??
    null;
}

export function ensureWindowsTcpProxyScript() {
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

export function findWindowsFreePort() {
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

export async function findFreePort() {
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

export async function waitForCdpEndpoint(port, hosts, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const candidates = hosts.map(host => `http://${host}:${port}`);

  while (Date.now() < deadline) {
    for (const endpoint of candidates) {
      if (await isCdpReachable(endpoint)) return endpoint;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return null;
}

export async function isCdpReachable(endpoint) {
  try {
    const response = await fetch(`${endpoint}/json/version`, {
      signal: AbortSignal.timeout(1_000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function isWindowsLocalCdpReachable(port) {
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

export function startWindowsTcpProxy({ scriptWindowsPath, listenHost, listenPort, targetHost, targetPort }) {
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

export function stopWindowsTcpProxy({ child, listenPort } = {}) {
  child?.kill?.();
  if (!listenPort) return;

  const script = [
    'Get-CimInstance Win32_Process',
    '| Where-Object {',
    '$_.Name -eq "node.exe"',
    '-and $_.CommandLine -like "*pioneer-windows-tcp-proxy.mjs*"',
    `-and $_.CommandLine -match ${powershellSingleQuoted(`\\s${listenPort}\\s`)}`,
    '}',
    '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }'
  ].join(' ');
  spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    stdio: 'ignore'
  });
}

export function stopWindowsChromeForUserDataDir(userDataDirWindows) {
  const forwardPath = toChromeArgPath(userDataDirWindows);
  const script = [
    'Get-CimInstance Win32_Process',
    '| Where-Object {',
    '$_.Name -eq "chrome.exe"',
    `-and ($_.CommandLine -like ${powershellSingleQuoted(`*${userDataDirWindows}*`)} -or $_.CommandLine -like ${powershellSingleQuoted(`*${forwardPath}*`)})`,
    '}',
    '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }'
  ].join(' ');
  spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    stdio: 'ignore'
  });
}

function dedupe(values) {
  return [...new Set(values)];
}

function toChromeArgPath(value) {
  return value.replace(/\\/g, '/');
}

function powershellSingleQuoted(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function findWslChromeUserDataRoot() {
  const usersRoot = '/mnt/c/Users';
  if (!fs.existsSync(usersRoot)) return null;
  const candidates = [];
  for (const entry of fs.readdirSync(usersRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const root = path.join(usersRoot, entry.name, 'AppData/Local/Google/Chrome/User Data');
    if (!fs.existsSync(root)) continue;
    candidates.push(root);
  }
  return candidates.sort((left, right) => {
    const leftScore = chromeUserDataRootScore(left);
    const rightScore = chromeUserDataRootScore(right);
    return rightScore - leftScore || left.localeCompare(right);
  })[0] ?? null;
}

function chromeUserDataRootScore(root) {
  let score = 0;
  for (const profileDirectory of listChromeProfileDirectories(root)) {
    if (fs.existsSync(path.join(root, profileDirectory, 'Extensions', OFFICIAL_MIDEN_WALLET_EXTENSION_ID))) {
      score += 10;
    }
    if (fs.existsSync(path.join(root, profileDirectory, 'Local Extension Settings', OFFICIAL_MIDEN_WALLET_EXTENSION_ID))) {
      score += 5;
    }
    if (fs.existsSync(path.join(root, profileDirectory, 'Preferences'))) {
      score += 1;
    }
  }
  return score;
}

function listChromeProfileDirectories(chromeRoot) {
  if (!fs.existsSync(chromeRoot)) return [];
  return fs.readdirSync(chromeRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => name === 'Default' || /^Profile \d+$/.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function collectProfileEmails(preferences) {
  const emails = [];
  for (const account of preferences.account_info ?? []) {
    if (typeof account.email === 'string' && account.email.trim()) emails.push(account.email.trim());
  }
  for (const value of [
    preferences.profile?.user_name,
    preferences.profile?.gaia_name,
    preferences.signin?.allowed_username
  ]) {
    if (typeof value === 'string' && value.includes('@')) emails.push(value.trim());
  }
  return [...new Set(emails)];
}

function inspectSeededActorProfile({ targetUserDataDir, email, walletAddress, extensionId }) {
  const profileDirectory = resolveSeededActorProfileDirectory(targetUserDataDir);
  const targetDefaultProfile = path.join(targetUserDataDir, profileDirectory);
  const profileState = readJsonIfExists(path.join(targetUserDataDir, 'qash-actor-profile-state.json'));
  const preferences = readJsonIfExists(path.join(targetDefaultProfile, 'Preferences')) ?? {};
  const securePreferences = readJsonIfExists(path.join(targetDefaultProfile, 'Secure Preferences')) ?? {};
  const emails = collectProfileEmails(preferences).map(value => value.toLowerCase());
  const expectedEmail = email?.trim().toLowerCase();
  const stateEmailMatches = expectedEmail
    ? profileState?.email?.trim?.().toLowerCase?.() === expectedEmail
    : true;
  const stateWalletMatches = walletAddress
    ? profileState?.walletAddress?.trim?.() === walletAddress
    : true;
  const verifiedProfileStateReady = Boolean(
    profileState?.readinessVersion >= 2 &&
    profileState?.qashReady === true &&
    profileState?.walletReady === true &&
    stateEmailMatches &&
    stateWalletMatches
  );
  const extensionPath = resolveInstalledExtensionPathForUserDataDir(targetUserDataDir, extensionId);
  const officialExtensionSetting = securePreferences.extensions?.settings?.[extensionId] ??
    preferences.extensions?.settings?.[extensionId];
  const officialExtensionSettingReady = Boolean(
    officialExtensionSetting?.path?.includes(`${extensionId}\\`) ||
    officialExtensionSetting?.path?.includes(`${extensionId}/`)
  );
  const walletAddressPresent = walletAddress
    ? profileContainsText(targetDefaultProfile, extensionId, walletAddress)
    : false;
  const emailMatches = expectedEmail ? emails.includes(expectedEmail) : false;
  return {
    exists: fs.existsSync(targetUserDataDir),
    profileDirectory,
    extensionPath,
    officialExtensionSettingReady,
    walletAddressPresent,
    emailMatches,
    verifiedProfileStateReady,
    ready: Boolean(
      extensionPath &&
      (
        verifiedProfileStateReady ||
        (
          officialExtensionSettingReady &&
          walletAddressPresent &&
          (!expectedEmail || emailMatches)
        )
      )
    )
  };
}

function archiveExistingProfile(profileDir, role) {
  if (!fs.existsSync(profileDir)) return;
  const entries = fs.readdirSync(profileDir);
  if (entries.length === 0) return;
  const parent = path.dirname(profileDir);
  const base = path.basename(profileDir);
  const archiveName = `${base}-preseed-${role}-${new Date().toISOString().replace(/[:.]/g, '')}`;
  fs.renameSync(profileDir, path.join(parent, archiveName));
}

function copyProfileSeed(sourceProfileDir, targetProfileDir, extensionId) {
  const copyAllEntries = [
    'Account Web Data',
    'Account Web Data-journal',
    'Accounts',
    'Bookmarks',
    'Bookmarks.bak',
    'Cookies',
    'Cookies-journal',
    'Extension Cookies',
    'Extension Cookies-journal',
    'Extension State',
    'Favicons',
    'Favicons-journal',
    'History',
    'History-journal',
    'Local Storage',
    'Network',
    'Preferences',
    'Secure Preferences',
    'Session Storage',
    'Web Data',
    'Web Data-journal',
    'WebStorage'
  ];
  for (const entry of copyAllEntries) {
    copyPathIfExists(path.join(sourceProfileDir, entry), path.join(targetProfileDir, entry));
  }

  const extensionScopedEntries = [
    ['Extensions', extensionId],
    ['Local Extension Settings', extensionId],
    ['Managed Extension Settings', extensionId],
    ['Sync Extension Settings', extensionId],
    ['IndexedDB', `chrome-extension_${extensionId}_0.indexeddb.leveldb`]
  ];
  for (const [root, child] of extensionScopedEntries) {
    copyPathIfExists(path.join(sourceProfileDir, root, child), path.join(targetProfileDir, root, child));
  }

  copyQashIndexedDb(sourceProfileDir, targetProfileDir);
}

function copyQashIndexedDb(sourceProfileDir, targetProfileDir) {
  const indexedDbRoot = path.join(sourceProfileDir, 'IndexedDB');
  if (!fs.existsSync(indexedDbRoot)) return;
  for (const entry of fs.readdirSync(indexedDbRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^https_app\.qash\.finance_/.test(entry.name)) continue;
    copyPathIfExists(path.join(indexedDbRoot, entry.name), path.join(targetProfileDir, 'IndexedDB', entry.name));
  }
}

function refreshOfficialExtensionInstall(sourceProfileDir, targetProfileDir, extensionId) {
  fs.mkdirSync(targetProfileDir, { recursive: true });
  copyPathIfExists(path.join(sourceProfileDir, 'Secure Preferences'), path.join(targetProfileDir, 'Secure Preferences'));
  copyPathIfExists(
    path.join(sourceProfileDir, 'Extensions', extensionId),
    path.join(targetProfileDir, 'Extensions', extensionId)
  );
}

function copyPathIfExists(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true, errorOnExist: false });
}

function writeSeededActorProfileMetadata(userDataDir, profileDirectory) {
  fs.writeFileSync(
    path.join(userDataDir, SEEDED_ACTOR_PROFILE_METADATA),
    `${JSON.stringify({ profileDirectory }, null, 2)}\n`
  );
}

function normalizeSeededChromeLocalState(localStatePath, sourceProfileDirectory) {
  const localState = readJsonIfExists(localStatePath);
  if (!localState) return;

  localState.profile = localState.profile && typeof localState.profile === 'object'
    ? localState.profile
    : {};
  localState.profile.last_used = sourceProfileDirectory;
  localState.profile.last_active_profiles = [sourceProfileDirectory];
  localState.profile.profiles_order = [sourceProfileDirectory];

  if (localState.profile.info_cache && typeof localState.profile.info_cache === 'object') {
    const sourceInfo = localState.profile.info_cache[sourceProfileDirectory] ??
      localState.profile.info_cache.Default ??
      {};
    localState.profile.info_cache = { [sourceProfileDirectory]: sourceInfo };
  }

  fs.writeFileSync(localStatePath, `${JSON.stringify(localState, null, 2)}\n`);
}

function removeProfileLaunchArtifacts(profileDir) {
  for (const name of [
    'SingletonCookie',
    'SingletonLock',
    'SingletonSocket',
    'LOCK',
    'DevToolsActivePort',
    'CrashpadMetrics-active.pma'
  ]) {
    fs.rmSync(path.join(profileDir, name), { recursive: true, force: true });
  }
}

function latestExtensionVersionPath(extensionRoot) {
  if (!fs.existsSync(extensionRoot)) return null;
  const versions = fs.readdirSync(extensionRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      name: entry.name,
      path: path.join(extensionRoot, entry.name),
      sortKey: parseExtensionVersionSortKey(entry.name)
    }))
    .filter(entry => fs.existsSync(path.join(entry.path, 'manifest.json')))
    .sort(compareExtensionVersions);
  return versions.at(-1)?.path ?? null;
}

function parseExtensionVersionSortKey(name) {
  return name
    .replace(/_.*$/, '')
    .split('.')
    .map(part => Number(part))
    .map(value => (Number.isFinite(value) ? value : 0));
}

function compareExtensionVersions(left, right) {
  const width = Math.max(left.sortKey.length, right.sortKey.length);
  for (let index = 0; index < width; index += 1) {
    const diff = (left.sortKey[index] ?? 0) - (right.sortKey[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return left.name.localeCompare(right.name);
}

function profileContainsText(profileDir, extensionId, text) {
  for (const candidate of [
    path.join(profileDir, 'Local Extension Settings', extensionId),
    path.join(profileDir, 'Sync Extension Settings', extensionId),
    path.join(profileDir, 'Managed Extension Settings', extensionId),
    path.join(profileDir, 'IndexedDB', `chrome-extension_${extensionId}_0.indexeddb.leveldb`)
  ]) {
    if (directoryContainsText(candidate, text)) return true;
  }
  return false;
}

function directoryContainsText(directory, text) {
  if (!fs.existsSync(directory)) return false;
  const needle = Buffer.from(text);
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (fileContainsBuffer(entryPath, needle)) return true;
    }
  }
  return false;
}

function fileContainsBuffer(filePath, needle) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0 || stat.size > 64 * 1024 * 1024) return false;
    return fs.readFileSync(filePath).includes(needle);
  } catch {
    return false;
  }
}

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
