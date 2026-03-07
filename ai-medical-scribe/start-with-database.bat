@echo off
echo ========================================
echo Starting AI Medical Scribe with MySQL
echo ========================================
echo.

REM Check if MySQL is running
echo Checking MySQL status...
sc query MySQL80 | find "RUNNING" >nul
if errorlevel 1 (
    echo [WARNING] MySQL service not running. Starting MySQL...
    net start MySQL80
) else (
    echo [OK] MySQL is running
)
echo.

REM Start backend server in new window
echo Starting backend server (Port 5000)...
start "Backend API" cmd /k "cd server && npm start"
timeout /t 3 >nul

REM Start frontend in new window
echo Starting frontend (Port 5174)...
start "Frontend" cmd /k "npm run dev"
echo.

echo ========================================
echo Both servers are starting...
echo.
echo Backend API: http://localhost:5000/api
echo Frontend:    http://localhost:5174
echo.
echo Press any key to stop all servers...
echo ========================================
pause >nul

REM Kill processes on ports 5000 and 5174
echo.
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5174" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
echo Servers stopped.
pause
