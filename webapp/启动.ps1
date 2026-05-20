# 商域 BizSim Edu — 一键启动（后端 + 学生端 + 组织者端）

# 与仓库目录名无关：脚本在 webapp/ 下，自动定位
$projectRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  商域 BizSim Edu 项目启动器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 正在启动后端 (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$projectRoot\backend'
    Write-Host '后端: http://localhost:8000' -ForegroundColor Cyan
    if (Test-Path '.\venv\Scripts\python.exe') { .\venv\Scripts\python run.py } else { python run.py }
"@

Start-Sleep -Seconds 2

Write-Host "[2/3] 正在启动学生端 (Vite :5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$projectRoot\frontend'
    Write-Host '学生端: http://localhost:5173' -ForegroundColor Cyan
    npm run dev
"@

Start-Sleep -Seconds 1

Write-Host "[3/3] 正在启动组织者端 (Vite :5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$projectRoot\organizer-frontend'
    Write-Host '组织者端: http://localhost:5174' -ForegroundColor Cyan
    if (-not (Test-Path 'node_modules')) { npm install }
    npm run dev
"@

Write-Host ""
Write-Host "  后端:     http://localhost:8000" -ForegroundColor Green
Write-Host "  学生端:   http://localhost:5173" -ForegroundColor Green
Write-Host "  组织者端: http://localhost:5174" -ForegroundColor Green
Write-Host ""
Write-Host "  演示账号: admin/admin123 (组织者)  student/student123 (学生)" -ForegroundColor Gray
Write-Host ""
Read-Host "按 Enter 关闭此窗口"
