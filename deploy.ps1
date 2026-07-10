# deploy.ps1 — 统一部署脚本（从 .env.local 读取配置）
param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 读取版本号
$version = "unknown"
$html = Get-Content "index.html" -Raw -ErrorAction SilentlyContinue
if ($html -match 'v(\d+\.\d+\.\d+)') { $version = "v$($Matches[1])" }

if (-not $Message) { $Message = "$version - deploy" }

Write-Host "=== 部署 $version ===" -ForegroundColor Green

# 从 .env.local 读取配置
if (-not (Test-Path ".env.local")) {
    Write-Host "[错误] 找不到 .env.local" -ForegroundColor Red
    exit 1
}

Get-Content ".env.local" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line -split "=", 2
        $key = $parts[0].Trim()
        $val = $parts[1].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}

$token = $env:CLOUDFLARE_API_TOKEN
$account = $env:CLOUDFLARE_ACCOUNT_ID
$project = $env:CLOUDFLARE_PROJECT_NAME

if (-not $token) { Write-Host "[错误] 缺少 CLOUDFLARE_API_TOKEN" -ForegroundColor Red; exit 1 }
if (-not $account) { Write-Host "[错误] 缺少 CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Red; exit 1 }
if (-not $project) { Write-Host "[错误] 缺少 CLOUDFLARE_PROJECT_NAME" -ForegroundColor Red; exit 1 }

# 查找 wrangler
$wrangler = "D:\npm-global\wrangler.cmd"
if (-not (Test-Path $wrangler)) {
    $wrangler = (Get-Command wrangler -ErrorAction SilentlyContinue).Source
}
if (-not $wrangler) {
    Write-Host "[错误] Wrangler 未安装，请运行: npm install -g wrangler" -ForegroundColor Red
    exit 1
}

Write-Host "项目: $project" -ForegroundColor Cyan
Write-Host "版本: $version" -ForegroundColor Cyan
Write-Host "开始上传..." -ForegroundColor Yellow
Write-Host ""

$env:CF_API_TOKEN = $token
& $wrangler pages deploy . --project-name=$project --commit-message="$Message"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== 部署成功! ===" -ForegroundColor Green
    Write-Host "线上地址: https://game.pokeauto.online/" -ForegroundColor Cyan
    Write-Host "请等待 1-2 分钟让 CDN 更新缓存" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=== 部署失败 (code: $LASTEXITCODE) ===" -ForegroundColor Red
}
