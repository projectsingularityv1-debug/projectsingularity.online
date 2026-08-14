@echo off
title Singularity Push Station
cls
echo ============================================================
echo   SINGULARITY PUSH STATION - Custom Git Push Engine
echo ============================================================
echo.
echo  [1] Open Singularity Push Station Web/Desktop App
echo  [2] Run 'sg push -u origin main --force' in Terminal
echo  [3] Run 'sg status'
echo  [4] Run 'sg help'
echo  [5] Exit
echo.
set /p choice="Choose an option [1-5]: "

if "%choice%"=="1" (
    echo Launching Singularity Push Station...
    start "" "http://localhost:3000/push.html" 2>nul || start "" "https://projectsingularity.online/push.html" 2>nul || start "" "%~dp0push.html"
    exit /b
)

if "%choice%"=="2" (
    echo.
    echo Running: sg push -u origin main --force
    node "%~dp0cli\sg.js" push -u origin main --force
    echo.
    pause
    exit /b
)

if "%choice%"=="3" (
    echo.
    node "%~dp0cli\sg.js" status
    echo.
    pause
    exit /b
)

if "%choice%"=="4" (
    echo.
    node "%~dp0cli\sg.js" help
    echo.
    pause
    exit /b
)

exit /b
