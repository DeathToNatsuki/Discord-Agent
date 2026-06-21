#!/usr/bin/env node
/**
 * Manual Electron binary installer.
 * Run with: node install-electron-manual.js
 * 
 * Downloads Electron v33.4.0 for Windows x64 directly and places it
 * where the electron npm package expects it.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const ELECTRON_VERSION = '33.4.0';
const PLATFORM = 'win32';
const ARCH = 'x64';
const FILENAME = `electron-v${ELECTRON_VERSION}-${PLATFORM}-${ARCH}.zip`;

const MIRRORS = [
  `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${FILENAME}`,
  `https://npmmirror.com/mirrors/electron/${ELECTRON_VERSION}/${FILENAME}`,
  `https://cdn.npmmirror.com/binaries/electron/${ELECTRON_VERSION}/${FILENAME}`,
  `https://electronjs.org/headers/v${ELECTRON_VERSION}/${FILENAME}`,
];

const electronDir = path.join(__dirname, 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');
const pathFile = path.join(electronDir, 'path.txt');
const zipPath = path.join(os.tmpdir(), FILENAME);

function log(msg) { process.stdout.write(msg + '\n'); }

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    log(`  Trying: ${url}`);
    
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    let received = 0;
    let total = 0;
    let lastPct = -1;

    function doRequest(reqUrl) {
      proto.get(reqUrl, { 
        headers: { 'User-Agent': 'node/' + process.version },
        timeout: 30000
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          file.close();
          const newProto = res.headers.location.startsWith('https') ? https : http;
          log(`  Redirecting...`);
          // Re-open file and follow redirect
          const file2 = fs.createWriteStream(dest);
          newProto.get(res.headers.location, { 
            headers: { 'User-Agent': 'node/' + process.version },
            timeout: 60000
          }, (res2) => {
            if (res2.statusCode !== 200) {
              file2.close();
              reject(new Error(`HTTP ${res2.statusCode}`));
              return;
            }
            total = parseInt(res2.headers['content-length'] || '0');
            res2.on('data', (chunk) => {
              received += chunk.length;
              if (total > 0) {
                const pct = Math.floor(received / total * 100);
                if (pct !== lastPct && pct % 10 === 0) {
                  process.stdout.write(`  Progress: ${pct}%\r`);
                  lastPct = pct;
                }
              }
            });
            res2.pipe(file2);
            file2.on('finish', () => { file2.close(); resolve(); });
            file2.on('error', reject);
            res2.on('error', reject);
          }).on('error', reject);
          return;
        }
        
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        
        total = parseInt(res.headers['content-length'] || '0');
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total > 0) {
            const pct = Math.floor(received / total * 100);
            if (pct !== lastPct && pct % 10 === 0) {
              process.stdout.write(`  Progress: ${pct}%  \r`);
              lastPct = pct;
            }
          }
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); log('\n  Download complete.'); resolve(); });
        file.on('error', reject);
        res.on('error', reject);
      }).on('error', (e) => {
        file.close();
        reject(e);
      }).on('timeout', () => {
        file.close();
        reject(new Error('Request timed out'));
      });
    }
    
    doRequest(url);
  });
}

function unzip(zipFile, destDir) {
  // Use PowerShell's Expand-Archive (built into Windows 10+)
  const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${destDir}' -Force"`;
  log(`  Extracting...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (e) {
    log(`  PowerShell extract failed: ${e.message}`);
    return false;
  }
}

async function main() {
  log('');
  log('=== Manual Electron Binary Installer ===');
  log(`Version: ${ELECTRON_VERSION} | Platform: ${PLATFORM}-${ARCH}`);
  log('');

  // Check if already working
  try {
    const existing = require('./node_modules/electron');
    if (fs.existsSync(existing)) {
      log('Electron is already installed and working!');
      log(`Path: ${existing}`);
      return;
    }
  } catch (_) {}

  // Ensure dist dir exists
  if (!fs.existsSync(electronDir)) {
    log('ERROR: node_modules/electron not found. Run npm install first.');
    process.exit(1);
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Try each mirror
  let downloaded = false;
  for (const url of MIRRORS) {
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      await downloadFile(url, zipPath);
      
      const stats = fs.statSync(zipPath);
      if (stats.size < 1000000) {
        log(`  File too small (${stats.size} bytes), trying next mirror...`);
        continue;
      }
      
      downloaded = true;
      break;
    } catch (e) {
      log(`  Failed: ${e.message}`);
    }
  }

  if (!downloaded) {
    log('');
    log('ERROR: Could not download from any mirror.');
    log('');
    log('MANUAL FIX:');
    log(`1. Download this file in your browser:`);
    log(`   https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${FILENAME}`);
    log(`2. Save it to: ${zipPath}`);
    log(`3. Run this script again: node install-electron-manual.js`);
    process.exit(1);
  }

  // Extract
  const extracted = unzip(zipPath, distDir);
  if (!extracted) {
    log('');
    log('ERROR: Extraction failed.');
    log(`ZIP is at: ${zipPath}`);
    log(`Extract it manually to: ${distDir}`);
    process.exit(1);
  }

  // Write path.txt
  const exePath = path.join(distDir, 'electron.exe');
  if (fs.existsSync(exePath)) {
    fs.writeFileSync(pathFile, 'dist/electron.exe');
    log('');
    log('SUCCESS! Electron installed at:');
    log(exePath);
    log('');
    log('Now run: npm run dev');
  } else {
    // List what was extracted to help debug
    log('');
    log('electron.exe not found after extraction. Contents of dist/:');
    try {
      const items = fs.readdirSync(distDir);
      items.forEach(i => log('  ' + i));
    } catch (_) {}
    log('');
    log(`Expected: ${exePath}`);
    process.exit(1);
  }
}

main().catch(e => {
  log('Fatal error: ' + e.message);
  process.exit(1);
});
