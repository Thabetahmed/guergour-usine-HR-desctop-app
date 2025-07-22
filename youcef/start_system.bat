@echo off
cls
echo.
echo ========================================
echo   GPLAST Factory Management System
echo ========================================
echo.
echo Choose how to run the system:
echo.
echo 1. Simple Browser (Open HTML files directly)
echo 2. Local Server (Recommended - Better CORS handling)
echo 3. Start Backend Only
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto simple_browser
if "%choice%"=="2" goto local_server
if "%choice%"=="3" goto backend_only
if "%choice%"=="4" exit
goto invalid_choice

:simple_browser
echo.
echo ========================================
echo   Starting Simple Browser Mode
echo ========================================
echo.
echo Starting Flask Backend...
cd /d "%~dp0back"
start "Flask Backend" cmd /k "python app.py"

echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Opening frontend in browser...
cd /d "%~dp0front"
start "" "launcher.html"

echo.
echo ✅ System Started!
echo    Backend: http://127.0.0.1:5000
echo    Frontend: Opened as local files
echo    Admin PIN: 1234
echo.
goto end

:local_server
echo.
echo ========================================
echo   Starting Local Server Mode
echo ========================================
echo.
echo Starting Flask Backend...
cd /d "%~dp0back"
start "Flask Backend" cmd /k "python app.py"

echo.
echo Starting Frontend Server...
cd /d "%~dp0front"
start "Frontend Server" cmd /k "python serve.py"

echo.
echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo ✅ System Started!
echo    Backend: http://127.0.0.1:5000
echo    Frontend: http://localhost:8080
echo    Admin PIN: 1234
echo.
echo Frontend will open automatically in your browser
goto end

:backend_only
echo.
echo ========================================
echo   Starting Backend Only
echo ========================================
echo.
cd /d "%~dp0back"
echo Starting Flask Backend...
python app.py
goto end

:invalid_choice
echo.
echo ❌ Invalid choice. Please enter 1, 2, 3, or 4.
timeout /t 2 /nobreak >nul
goto start

:end
echo.
echo Press any key to exit...
pause >nul
