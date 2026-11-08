@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo Node.js 20+ is required. & pause & exit /b 1)

if not exist .env (
  copy .env.example .env >nul
  echo Created .env from .env.example.
  echo Edit .env now and replace JWT_SECRET with your own random 32+ character value.
  echo Keep NODE_ENV=development for local setup.
  pause
)

where docker >nul 2>nul
if %errorlevel%==0 (
  echo Starting local PostgreSQL...
  docker compose up -d || (echo PostgreSQL failed to start. & pause & exit /b 1)
) else (
  echo Docker not found. Ensure PostgreSQL is running and DATABASE_URL in .env is correct.
)

echo Installing backend dependencies...
call npm install --prefix server || (echo Backend dependency installation failed. & pause & exit /b 1)

echo Installing frontend dependencies...
call npm install --prefix client || (echo Frontend dependency installation failed. & pause & exit /b 1)

echo Waiting for PostgreSQL...
timeout /t 5 /nobreak >nul

echo Applying database migrations...
call npm run migrate --prefix server || (echo Migration failed. Check PostgreSQL and .env. & pause & exit /b 1)

echo Starting WYRMORA API and website in separate windows...
start "WYRMORA API" /D "%~dp0" cmd /k "npm run dev --prefix server"
start "WYRMORA Web" /D "%~dp0" cmd /k "npm run dev --prefix client"

echo Website: http://localhost:5173
echo API health: http://localhost:4000/api/health
pause
