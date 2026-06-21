@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo First run detected. Installing packages...
    call npm install --prefer-online
    echo.
)
node launcher.cjs
