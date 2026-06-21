/**
 * Discord Agent Launcher
 * Finds any installed Chromium-based browser and opens the app in --app mode.
 * Supports: Chrome, Edge, Brave, Opera, Vivaldi, Arc, Yandex, Chromium, and more.
 *
 * Dev mode  (npm start)  : starts Vite dev server, opens browser
 * Prod mode (built .exe) : serves pre-built dist/ via embedded HTTP, opens browser
 */

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { spawn, execSync, spawnSync } = require('child_process');

const DEV_PORT  = 5173;
const PROD_PORT = 49420;
const IS_PKG    = typeof process.pkg !== 'undefined';
const APP_NAME  = 'Discord Agent';
const PORT      = IS_PKG ? PROD_PORT : DEV_PORT;
const APP_URL   = `http://localhost:${PORT}`;
const DIST_DIR  = IS_PKG
  ? path.join(path.dirname(process.execPath), 'dist')
  : path.join(__dirname, 'dist');

// ── MIME types ────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

// ── Production static file server ─────────────────────────────────────────────

function startProdServer() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DIST_DIR)) {
      reject(new Error(`dist/ not found at:\n  ${DIST_DIR}\nRun "npm run build" first.`));
      return;
    }

    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';

      const filePath  = path.join(DIST_DIR, urlPath);
      const servePath = fs.existsSync(filePath) ? filePath : path.join(DIST_DIR, 'index.html');
      const ext       = path.extname(servePath).toLowerCase();
      const mime      = MIME[ext] || 'application/octet-stream';

      fs.readFile(servePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
      });
    });

    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') resolve(null); // already running, just open
      else reject(e);
    });
  });
}

// ── Browser detection — every common Chromium browser ─────────────────────────

function getAllChromiumBrowsers() {
  const pf86   = process.env['ProgramFiles(x86)']  || 'C:\\Program Files (x86)';
  const pf64   = process.env['ProgramFiles']        || 'C:\\Program Files';
  const local  = process.env['LOCALAPPDATA']        || '';
  const roaming= process.env['APPDATA']             || '';

  if (process.platform === 'win32') {
    return [
      // ── Microsoft Edge (ships with every Windows 10/11) ──────────────────
      { name: 'Edge',          path: path.join(pf86,   'Microsoft\\Edge\\Application\\msedge.exe') },
      { name: 'Edge',          path: path.join(pf64,   'Microsoft\\Edge\\Application\\msedge.exe') },
      { name: 'Edge',          path: path.join(local,  'Microsoft\\Edge\\Application\\msedge.exe') },
      // ── Google Chrome ─────────────────────────────────────────────────────
      { name: 'Chrome',        path: path.join(pf86,   'Google\\Chrome\\Application\\chrome.exe') },
      { name: 'Chrome',        path: path.join(pf64,   'Google\\Chrome\\Application\\chrome.exe') },
      { name: 'Chrome',        path: path.join(local,  'Google\\Chrome\\Application\\chrome.exe') },
      // ── Chrome Beta / Dev / Canary ────────────────────────────────────────
      { name: 'Chrome Beta',   path: path.join(local,  'Google\\Chrome Beta\\Application\\chrome.exe') },
      { name: 'Chrome Dev',    path: path.join(local,  'Google\\Chrome Dev\\Application\\chrome.exe') },
      { name: 'Chrome Canary', path: path.join(local,  'Google\\Chrome SxS\\Application\\chrome.exe') },
      // ── Brave ─────────────────────────────────────────────────────────────
      { name: 'Brave',         path: path.join(pf64,   'BraveSoftware\\Brave-Browser\\Application\\brave.exe') },
      { name: 'Brave',         path: path.join(local,  'BraveSoftware\\Brave-Browser\\Application\\brave.exe') },
      { name: 'Brave Beta',    path: path.join(local,  'BraveSoftware\\Brave-Browser-Beta\\Application\\brave.exe') },
      { name: 'Brave Nightly', path: path.join(local,  'BraveSoftware\\Brave-Browser-Nightly\\Application\\brave.exe') },
      // ── Opera ─────────────────────────────────────────────────────────────
      { name: 'Opera',         path: path.join(roaming,'Opera Software\\Opera Stable\\opera.exe') },
      { name: 'Opera GX',      path: path.join(roaming,'Opera Software\\Opera GX Stable\\opera.exe') },
      { name: 'Opera Beta',    path: path.join(roaming,'Opera Software\\Opera Next\\opera.exe') },
      { name: 'Opera Dev',     path: path.join(roaming,'Opera Software\\Opera Developer\\opera.exe') },
      // ── Vivaldi ───────────────────────────────────────────────────────────
      { name: 'Vivaldi',       path: path.join(local,  'Vivaldi\\Application\\vivaldi.exe') },
      // ── Arc ───────────────────────────────────────────────────────────────
      { name: 'Arc',           path: path.join(local,  'Packages\\TheBrowserCompany.Arc_ttt1ap7aakyb4\\LocalCache\\Local\\Arc\\app-1.0.0\\Arc.exe') },
      // Arc newer installs — glob-like: just check the parent folder
      { name: 'Arc',           path: (() => {
        try {
          const arcBase = path.join(local, 'Packages');
          const entries = fs.readdirSync(arcBase);
          const arcPkg  = entries.find(e => e.startsWith('TheBrowserCompany.Arc_'));
          if (!arcPkg) return '';
          const appDir = path.join(arcBase, arcPkg, 'LocalCache', 'Local', 'Arc');
          const versions = fs.readdirSync(appDir).filter(e => e.startsWith('app-'));
          if (!versions.length) return '';
          return path.join(appDir, versions[versions.length - 1], 'Arc.exe');
        } catch (_) { return ''; }
      })() },
      // ── Yandex Browser ────────────────────────────────────────────────────
      { name: 'Yandex',        path: path.join(local,  'Yandex\\YandexBrowser\\Application\\browser.exe') },
      // ── Samsung Internet (Windows) ────────────────────────────────────────
      { name: 'Samsung',       path: path.join(pf64,   'Samsung\\SamsungBrowser\\Application\\samsung.exe') },
      // ── Thorium ───────────────────────────────────────────────────────────
      { name: 'Thorium',       path: path.join(pf64,   'Thorium\\Application\\thorium.exe') },
      { name: 'Thorium',       path: path.join(local,  'Thorium\\Application\\thorium.exe') },
      // ── Ungoogled Chromium ────────────────────────────────────────────────
      { name: 'Chromium',      path: path.join(local,  'Chromium\\Application\\chrome.exe') },
      { name: 'Chromium',      path: path.join(pf64,   'Chromium\\Application\\chrome.exe') },
      // ── Cốc Cốc ──────────────────────────────────────────────────────────
      { name: 'CocCoc',        path: path.join(local,  'CocCoc\\Browser\\Application\\browser.exe') },
      // ── Whale (Naver) ─────────────────────────────────────────────────────
      { name: 'Whale',         path: path.join(local,  'Naver\\Naver Whale\\Application\\whale.exe') },
    ].filter(b => b.path); // remove empties

  } else if (process.platform === 'darwin') {
    const apps = '/Applications';
    const userApps = path.join(os.homedir(), 'Applications');
    return [
      { name: 'Chrome',        path: `${apps}/Google Chrome.app/Contents/MacOS/Google Chrome` },
      { name: 'Chrome',        path: `${userApps}/Google Chrome.app/Contents/MacOS/Google Chrome` },
      { name: 'Chrome Canary', path: `${apps}/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary` },
      { name: 'Chrome Canary', path: `${userApps}/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary` },
      { name: 'Edge',          path: `${apps}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge` },
      { name: 'Edge',          path: `${userApps}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge` },
      { name: 'Brave',         path: `${apps}/Brave Browser.app/Contents/MacOS/Brave Browser` },
      { name: 'Brave',         path: `${userApps}/Brave Browser.app/Contents/MacOS/Brave Browser` },
      { name: 'Opera',         path: `${apps}/Opera.app/Contents/MacOS/Opera` },
      { name: 'Opera GX',      path: `${apps}/Opera GX.app/Contents/MacOS/Opera GX` },
      { name: 'Vivaldi',       path: `${apps}/Vivaldi.app/Contents/MacOS/Vivaldi` },
      { name: 'Arc',           path: `${apps}/Arc.app/Contents/MacOS/Arc` },
      { name: 'Yandex',        path: `${apps}/Yandex.app/Contents/MacOS/Yandex` },
      { name: 'Chromium',      path: `${apps}/Chromium.app/Contents/MacOS/Chromium` },
      { name: 'Thorium',       path: `${apps}/Thorium.app/Contents/MacOS/Thorium` },
      { name: 'Whale',         path: `${apps}/Naver Whale.app/Contents/MacOS/Naver Whale` },
    ];

  } else {
    // Linux — check PATH for all known Chromium executables
    const linuxBinaries = [
      'google-chrome', 'google-chrome-stable', 'google-chrome-beta', 'google-chrome-unstable',
      'chromium', 'chromium-browser', 'chromium-freeworld',
      'microsoft-edge', 'microsoft-edge-stable', 'microsoft-edge-beta', 'microsoft-edge-dev',
      'brave-browser', 'brave-browser-stable', 'brave-browser-beta', 'brave-browser-nightly',
      'opera', 'vivaldi', 'vivaldi-stable',
      'yandex-browser',
      'thorium-browser',
      'whale',
    ];
    return linuxBinaries.map(bin => {
      try {
        const result = spawnSync('which', [bin], { encoding: 'utf8' });
        const p = result.stdout?.trim();
        return p ? { name: bin, path: p } : null;
      } catch (_) { return null; }
    }).filter(Boolean);
  }
}

function findBrowser() {
  const all = getAllChromiumBrowsers();
  for (const browser of all) {
    try {
      if (browser.path && fs.existsSync(browser.path)) {
        return browser;
      }
    } catch (_) {}
  }
  return null;
}

// ── Open in app mode ──────────────────────────────────────────────────────────

function openBrowser(browser, url) {
  // Isolated profile so we get a clean frameless window
  // without extensions, sign-in prompts, or the bookmarks bar
  const profileDir = path.join(os.tmpdir(), 'discord-agent-profile');
  try { fs.mkdirSync(profileDir, { recursive: true }); } catch (_) {}

  const args = [
    `--app=${url}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,800',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-background-mode',
    '--disable-sync',
  ];

  // Opera uses --no-startup-window instead of --app — detect and adapt
  const isOpera = browser.name.toLowerCase().includes('opera');
  if (isOpera) {
    // Opera supports --app but sometimes needs this too
    args.push('--no-startup-window');
  }

  try {
    const proc = spawn(browser.path, args, { detached: true, stdio: 'ignore' });
    proc.unref();
    console.log(`Launched: ${browser.name} (${path.basename(browser.path)})`);
  } catch (err) {
    console.error(`Failed to launch ${browser.name}: ${err.message}`);
  }
}

// ── Wait for dev server ───────────────────────────────────────────────────────

function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      http.get(url, () => resolve())
        .on('error', () => {
          if (Date.now() > deadline) return reject(new Error('Server did not start in time'));
          setTimeout(attempt, 250);
        });
    };
    attempt();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n  ${APP_NAME} v1.0.0`);
  console.log('  ' + '─'.repeat(30));

  const browser = findBrowser();

  if (!browser) {
    console.error('\n  No Chromium-based browser found.');
    console.error('  Please install one of: Chrome, Edge, Brave, Opera, Vivaldi, Arc\n');
    // Last resort: try to open with the system default (may or may not be Chromium)
    try {
      if (process.platform === 'win32') execSync(`start "" "${APP_URL}"`);
      else if (process.platform === 'darwin') execSync(`open "${APP_URL}"`);
      else execSync(`xdg-open "${APP_URL}"`);
      console.log('  Opened with system default browser (app mode unavailable).');
    } catch (_) {}
    // Still start the server so the URL is accessible
  } else {
    console.log(`  Browser: ${browser.name}`);
  }

  if (IS_PKG) {
    // ── Production exe mode ────────────────────────────────────────────────
    console.log('  Mode:    standalone executable\n');
    try {
      const server = await startProdServer();
      if (server) console.log(`  Serving: ${APP_URL}`);
      if (browser) openBrowser(browser, APP_URL);
      console.log('\n  App is running. Close this console window to quit.\n');
      setInterval(() => {}, 1 << 30);
    } catch (err) {
      console.error('\n  ERROR:', err.message);
      process.exit(1);
    }

  } else {
    // ── Development Vite mode ──────────────────────────────────────────────
    console.log('  Mode:    development (Vite)\n');

    const viteCmd = process.platform === 'win32'
      ? path.join(__dirname, 'node_modules', '.bin', 'vite.cmd')
      : path.join(__dirname, 'node_modules', '.bin', 'vite');

    const vite = spawn(viteCmd, ['--port', String(PORT), '--host', '127.0.0.1'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '').trim();

    vite.stdout.on('data', d => { const l = strip(d.toString()); if (l) console.log(' ', l); });
    vite.stderr.on('data', d => {
      const l = strip(d.toString());
      if (l && !l.includes('DeprecationWarning') && !l.includes('ExperimentalWarning')) {
        console.error(' ', l);
      }
    });
    vite.on('exit', code => { if (code && code !== 0) console.error(`Vite exited (${code})`); });

    try {
      await waitForServer(APP_URL);
      if (browser) openBrowser(browser, APP_URL);
      console.log(`\n  Running at ${APP_URL}`);
      console.log('  Press Ctrl+C to stop.\n');
    } catch (err) {
      console.error('  Failed to start server:', err.message);
      vite.kill();
      process.exit(1);
    }

    process.on('SIGINT',  () => { vite.kill(); process.exit(0); });
    process.on('SIGTERM', () => { vite.kill(); process.exit(0); });
    setInterval(() => {}, 1 << 30);
  }
}

main();
