@echo off
title E no Portfolio - Clean Girl Minimal Studio
cd /d "%~dp0"
echo ========================================================
echo   DANG KHOI DONG LOCALHOST CHO E NO PORTFOLIO
echo   Dia chi: http://localhost:3457
echo ========================================================
echo.
echo Mo trinh duyet...
start "" "http://localhost:3457"
node serve.cjs
pause

