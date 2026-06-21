@echo off
echo ============================================
echo  Discord Agent - Fix Electron Binary
echo ============================================
echo.
echo Run this if you see:
echo "Electron failed to install correctly"
echo.

cd /d "%~dp0"

echo Step 1: Removing broken Electron...
if exist node_modules\electron rmdir /s /q node_modules\electron
echo   Done.
echo.

echo Step 2: Reinstalling Electron 33 (Node 24 compatible)...
call npm install electron@33.4.0 --save-dev --prefer-online
if errorlevel 1 (
    echo npm install failed. Check your internet connection.
    pause & exit /b 1
)
echo.

echo Step 3: Running Electron binary download...
node node_modules\electron\install.js
echo.

echo Step 4: Verifying...
node -e "try{const p=require('./node_modules/electron');console.log('OK - Electron at:',p);}catch(e){console.log('FAIL:',e.message);process.exit(1);}"

if errorlevel 1 (
    echo.
    echo *** STILL FAILING ***
    echo.
    echo Try these manual steps:
    echo 1. Open PowerShell as Administrator
    echo 2. cd to this folder
    echo 3. Run: $env:ELECTRON_GET_USE_PROXY=1; npm install electron@33 --save-dev
    echo 4. Run: node node_modules\electron\install.js
    pause & exit /b 1
)

echo.
echo ============================================
echo  Fixed! Now run: npm run dev
echo ============================================
pause
