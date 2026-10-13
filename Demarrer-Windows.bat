@echo off
chcp 65001 >nul
title Commission Expose - serveur local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js n est pas installe. Telechargez la version LTS sur https://nodejs.org puis relancez ce fichier.
  echo.
  pause
  exit /b
)
node server.js
pause
