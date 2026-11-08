@echo off
setlocal
cd /d "%~dp0"

if not exist .env (echo .env file missing. Run SETUP-WYRMORA-MEDICAL.bat first. & pause & exit /b 1)
if not exist server\node_modules (echo Backend dependencies missing. Run SETUP-WYRMORA-MEDICAL.bat first. & pause & exit /b 1)
if not exist client\node_modules (echo Frontend dependencies missing. Run SETUP-WYRMORA-MEDICAL.bat first. & pause & exit /b 1)

start "WYRMORA API" /D "%~dp0" cmd /k "npm run dev --prefix server"
start "WYRMORA Web" /D "%~dp0" cmd /k "npm run dev --prefix client"

echo Website: http://localhost:5173
echo API health: http://localhost:4000/api/health
pause
