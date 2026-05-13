@echo off
cd /d "%~dp0"

echo Stopping any existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1

timeout /t 1 /nobreak >nul

echo Starting Entheos server...
start "Entheos Server" cmd /k "cd /d "%~dp0" && node server.js"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Opening website...
start "" "http://localhost:3000/index.html"

echo Done. Keep the server window open while using the site.
