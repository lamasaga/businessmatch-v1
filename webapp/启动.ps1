# 商域 BizSim Edu — 一键启动脚本
# 同时启动前端和后端服务

$projectRoot = "D:\1XFAwork\商业模拟比赛架构思考\webapp"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  商域 BizSim Edu 项目启动器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动后端
Write-Host "[1/2] 正在启动后端服务 (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    cd '$projectRoot\backend'
    Write-Host '后端服务启动中...' -ForegroundColor Cyan
    .\venv\Scripts\python run.py
"@

# 等待一下避免端口冲突
Start-Sleep -Seconds 2

# 启动前端
Write-Host "[2/2] 正在启动前端服务 (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    cd '$projectRoot\frontend'
    Write-Host '前端服务启动中...' -ForegroundColor Cyan
    npm run dev
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  所有服务已启动！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  前端地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  后端地址: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API文档:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  测试账户:" -ForegroundColor Gray
Write-Host "    学生:   student / student123" -ForegroundColor Gray
Write-Host "    管理员: admin / admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "  按 Enter 键关闭此窗口..." -ForegroundColor DarkGray
Read-Host
