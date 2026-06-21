@echo off
echo ============================================
echo  Discord Agent - Setup
echo ============================================
echo.
cd /d "%~dp0"

node --version >nul 2>&1
if errorlevel 1 ( echo ERROR: Node.js not found. Download v18+ from https://nodejs.org & pause & exit /b 1 )
for /f "tokens=*" %%i in ('node --version') do set NODEVER=%%i
echo Node.js %NODEVER% detected.
echo.

if exist node_modules rmdir /s /q node_modules

echo Installing packages (takes ~30 seconds)...
call npm install --prefer-online
if errorlevel 1 ( echo ERROR: npm install failed. & pause & exit /b 1 )

echo.
echo ============================================
echo  Setup complete!
echo.
echo  To RUN the app:
echo    Double-click "Discord Agent.bat"
echo    or run: npm start
echo.
echo  To BUILD a standalone .exe:
echo    Double-click "build-exe.bat"
echo    (requires setup to have been run first)
echo ============================================
pause
