# POP 拟真城市模拟器启动脚本
# 用法：在 PowerShell 中运行 .\启动.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$indexHtml = Join-Path $scriptDir "index.html"

function Start-Direct {
    Write-Host "正在用默认浏览器打开 POP 模拟器..." -ForegroundColor Green
    Start-Process $indexHtml
}

function Start-HttpServer {
    $port = 18100
    Write-Host "正在启动本地 HTTP 服务器（端口 $port），按 Ctrl+C 停止..." -ForegroundColor Green
    Write-Host "浏览器将自动打开 http://localhost:$port" -ForegroundColor Cyan
    Start-Process "http://localhost:$port"
    python -m http.server $port
}

Write-Host @"
POP 拟真城市模拟器启动器
------------------------
1. 直接打开 index.html（需要联网加载 Chart.js CDN）
2. 启动本地 HTTP 服务器（推荐，避免部分浏览器的文件访问限制）
"@

$choice = Read-Host "请选择 [1/2，默认 1]"

switch ($choice) {
    "2" { Start-HttpServer }
    default { Start-Direct }
}
