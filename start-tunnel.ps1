# start-tunnel.ps1
# 方案 A: Cloudflare Quick Tunnel — 把本机 server 暴露到公网
# 用法: .\start-tunnel.ps1 [-Port 3211]
# 需要先 pnpm build 并用 PORT=3211 pnpm start 跑起 server。

param(
  [int]$Port = 3211
)

Write-Host ""
Write-Host "=== Breaktime Arcade — Cloudflare Tunnel ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 cloudflared 是否已安装
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
  Write-Host "cloudflared 未安装，正在通过 winget 安装..." -ForegroundColor Yellow
  winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
  # 刷新 PATH
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("PATH", "User")
  $cf = Get-Command cloudflared -ErrorAction SilentlyContinue
  if (-not $cf) {
    Write-Host "安装失败，请手动下载: https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Red
    Write-Host "下载 cloudflared-windows-amd64.exe，改名为 cloudflared.exe，放到 PATH 目录里。" -ForegroundColor Red
    exit 1
  }
  Write-Host "cloudflared 安装成功!" -ForegroundColor Green
}

# 2. 检查 server 是否在跑
Write-Host "检查 server (http://localhost:$Port/health)..." -ForegroundColor Gray
try {
  $health = Invoke-RestMethod "http://localhost:$Port/health" -TimeoutSec 3
  Write-Host "Server 运行中 (uptime: $($health.uptime)s)" -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host "Server 没有在 $Port 端口上跑。请先在另一个终端执行:" -ForegroundColor Red
  Write-Host "  `$env:PORT=$Port; pnpm start" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "或者如果你在用 dev 模式 (pnpm dev)，把端口改为 5173 后再运行本脚本:" -ForegroundColor Yellow
  Write-Host "  .\start-tunnel.ps1 -Port 5173" -ForegroundColor Yellow
  Write-Host ""
  $continue = Read-Host "仍然继续启动 tunnel? (y/N)"
  if ($continue -ne "y" -and $continue -ne "Y") { exit 0 }
}

# 3. 启动 Quick Tunnel
Write-Host ""
Write-Host "启动 Cloudflare Quick Tunnel → http://localhost:$Port" -ForegroundColor Cyan
Write-Host "隧道 URL 将在几秒后显示，形如: https://xxxx-xxxx.trycloudflare.com" -ForegroundColor Cyan
Write-Host "把这个 URL 贴到 HostRoom 的 Join URL 里，或者直接用 QR 码让学生扫。" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 关闭隧道。" -ForegroundColor Gray
Write-Host ""

cloudflared tunnel --url "http://localhost:$Port"
