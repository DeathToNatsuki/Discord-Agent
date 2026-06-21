@echo off
echo ============================================
echo  Discord Agent - Build Standalone .exe
echo ============================================
echo.
cd /d "%~dp0"

if not exist node_modules (
    echo Running setup first...
    call npm install --prefer-online
    if errorlevel 1 ( pause & exit /b 1 )
)

echo Step 1: Building React app...
call npm run build
if errorlevel 1 ( echo BUILD FAILED. & pause & exit /b 1 )

echo.
echo Step 2: Packaging into executable...
call npx pkg launcher.cjs --targets node18-win-x64 --output "Discord Agent.exe" --compress GZip
if errorlevel 1 ( echo PKG FAILED. & pause & exit /b 1 )

echo.
echo ============================================
echo  SUCCESS!
echo.
echo  "Discord Agent.exe" has been created.
echo.
echo  To distribute/run on any machine:
echo    Copy BOTH of these to the same folder:
echo      - Discord Agent.exe
echo      - dist\  (the entire folder)
echo.
echo  Then double-click the .exe to launch.
echo ============================================
pause
