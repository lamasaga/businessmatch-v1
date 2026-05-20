@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   商域 BizSim Edu — 正在用 PowerShell 启动（请勿使用 py 运行 .ps1）
echo.

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0启动.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0启动.ps1"
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] 启动失败。请在本目录执行:  .\启动.ps1
    echo        不要使用: py 启动.ps1
    pause
)
