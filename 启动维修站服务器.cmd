@echo off
rem === IMPORTANT: keep this file pure ASCII. ===
rem cmd.exe tracks its position in a batch file by BYTE offset. Running `chcp`
rem partway through a file that also contains non-ASCII text makes it re-read the
rem remaining lines at the wrong offsets, which silently eats the `title`/`echo`/
rem `pause` keywords -- the window then flashes and closes with no message.
rem All Chinese output comes from node itself, which is safe.
cd /d "%~dp0"
chcp 65001 >nul
title Little Garage - LAN Server

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [X] Node.js not found. Install it from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

node tools\serve.mjs
echo.
pause
