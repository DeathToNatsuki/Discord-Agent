@echo off
echo ============================================
echo  Discord Agent - Browser Mode
echo ============================================
echo.
echo Starting app in your browser at http://localhost:5173
echo (No Electron needed - all features work normally)
echo.
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
call npm run dev:browser
pause
