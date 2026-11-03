@echo off
setlocal
cd /d "%~dp0"
if not exist .env copy .env.example .env
where node >nul 2>nul || (echo Node.js 20+ is required. & pause & exit /b 1)
where docker >nul 2>nul || echo Docker not found. Ensure PostgreSQL is running separately.
echo Installing dependencies...
npm install || (echo Dependency installation failed. Check internet/npm access. & pause & exit /b 1)
where docker >nul 2>nul && docker compose up -d
if not exist .env (echo .env file missing. & pause & exit /b 1)
echo IMPORTANT: Edit .env and set strong JWT_SECRET and MEDICINE_ADMIN_KEY before public use.
pause
echo Running database migrations...
npm run db:migrate || (pause & exit /b 1)
echo Starting WYRMORA Medical...
npm run dev
