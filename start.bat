@echo off
title Bizby Geospatial Platform
echo Starting Bizby Geospatial Platform...
echo.

:: Start Backend in a new window
echo Starting FastAPI Backend...
cd backend
start "Bizby Backend (FastAPI)" cmd /k "uvicorn main:app --reload --host 0.0.0.0 --port 8000"
cd ..

:: Start Frontend in a new window
echo Starting React Frontend...
start "Bizby Frontend (Vite)" cmd /k "npm run dev"

echo.
echo =========================================
echo All services have been launched!
echo.
echo Frontend: http://localhost:5173
echo Backend API:  http://localhost:8000
echo =========================================
echo.
echo You can safely close this launcher window.
pause
