# 商识唯智 — 一键启动（后端 + 学生端 + 组织者端）
# 用法: 在 webapp 目录执行  .\启动.ps1  或双击 启动.bat
# 勿用: py 启动.ps1

$ErrorActionPreference = "Continue"
$projectRoot = $PSScriptRoot

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkingDir,
        [string]$Command
    )
    $fullCmd = "Set-Location -LiteralPath '$WorkingDir'; Write-Host '$Title' -ForegroundColor Cyan; $Command"
    $shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
    Start-Process $shell -ArgumentList "-NoExit", "-Command", $fullCmd
}

function Test-BackendPort {
    # 不用 Test-NetConnection（单次常需 3～8 秒，会导致「卡住」假象）
    $listen = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listen) { return $true }
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $iar = $c.BeginConnect('127.0.0.1', 8000, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(300)
        if ($ok -and $c.Connected) { $c.Close(); return $true }
        $c.Close()
    } catch { }
    return $false
}

function Wait-BackendReady {
    param([int]$MaxSeconds = 45)
    Write-Host "      等待后端端口 8000..." -ForegroundColor Gray -NoNewline
    for ($i = 0; $i -lt $MaxSeconds; $i++) {
        if (Test-BackendPort) {
            Write-Host " 就绪" -ForegroundColor Green
            return $true
        }
        Write-Host "." -ForegroundColor Gray -NoNewline
        Start-Sleep -Seconds 1
    }
    Write-Host " 超时" -ForegroundColor Yellow
    return $false
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  商识唯智 项目启动器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 仅首次或缺依赖时 pip install，避免每次启动卡在安装依赖
$backendCmd = "if (-not (Test-Path '.\venv\Scripts\python.exe')) { Write-Host '[backend] 创建 venv...' -ForegroundColor Yellow; python -m venv venv; .\venv\Scripts\python -m pip install -r requirements.txt } elseif (-not (.\venv\Scripts\python -c 'import yaml' 2>`$null)) { Write-Host '[backend] 安装依赖...' -ForegroundColor Yellow; .\venv\Scripts\python -m pip install -r requirements.txt }; .\venv\Scripts\python run.py"

Write-Host "[1/3] 正在启动后端 (FastAPI)..." -ForegroundColor Yellow
Start-ServiceWindow -Title "后端: http://localhost:8000" -WorkingDir "$projectRoot\backend" -Command $backendCmd

$ready = Wait-BackendReady -MaxSeconds 45
if (-not $ready) {
    Write-Host "[提示] 若后端窗口仍在 pip install，请等其完成后再刷新浏览器。" -ForegroundColor Yellow
    Write-Host "      也可手动打开 http://127.0.0.1:8000/health 确认。" -ForegroundColor Yellow
}

Write-Host "[2/3] 正在启动学生端 (Vite :5173)..." -ForegroundColor Yellow
Start-ServiceWindow -Title "学生端: http://localhost:5173" -WorkingDir "$projectRoot\frontend" -Command "npm run dev"

Start-Sleep -Milliseconds 500

Write-Host "[3/3] 正在启动组织者端 (Vite :5174)..." -ForegroundColor Yellow
$orgCmd = "if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"
Start-ServiceWindow -Title "组织者端: http://localhost:5174" -WorkingDir "$projectRoot\organizer-frontend" -Command $orgCmd

Write-Host ""
Write-Host "  后端:     http://localhost:8000/health" -ForegroundColor Green
Write-Host "  学生端:   http://localhost:5173" -ForegroundColor Green
Write-Host "  组织者端: http://localhost:5174" -ForegroundColor Green
Write-Host ""
Write-Host "  演示: 组织者 admin / admin123  |  学生 student / student123" -ForegroundColor Gray
Write-Host ""
Read-Host "按 Enter 关闭此窗口（不影响已打开的服务窗口）"
