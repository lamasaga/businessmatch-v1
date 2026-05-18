@echo off
chcp 65001 >nul
echo ========================================
echo   商业模拟教育平台 - 快速启动
echo ========================================
echo.

REM 检查是否在正确的目录
if not exist "backend\run.py" (
    echo [错误] 请确保此脚本在 web应用商业教育 目录下运行！
    pause
    exit /b 1
)

echo [1/2] 启动后端服务...
start "BizSim Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe run.py"

echo [2/2] 启动前端服务...
start "BizSim Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================
echo   启动完成！
echo   后端地址: http://localhost:8000
echo   前端地址: http://localhost:5173
echo   API文档:  http://localhost:8000/docs
echo ========================================
echo.
echo 提示: 关闭这两个 cmd 窗口即可停止服务
echo.
pause