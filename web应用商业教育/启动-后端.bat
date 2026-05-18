@echo off
chcp 65001 >nul
echo ========================================
echo   商业模拟教育平台 - 启动后端
echo ========================================
echo.

if not exist "backend\run.py" (
    echo [错误] 请确保此脚本在 web应用商业教育 目录下运行！
    pause
    exit /b 1
)

echo 正在启动后端服务...
cd /d "%~dp0backend"
.\venv\Scripts\python.exe run.py

echo.
pause