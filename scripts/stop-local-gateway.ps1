param(
  [int]$Port = 18789
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $repoRoot 'gateway.pid'

function Stop-ProcessIfRunning {
  param([int]$Id)

  $process = Get-Process -Id $Id -ErrorAction SilentlyContinue
  if ($process) {
    try {
      Stop-Process -Id $Id -Force -ErrorAction Stop
    } catch {
      taskkill /PID $Id /F | Out-Null
    }

    Start-Sleep -Seconds 1
    return -not (Get-Process -Id $Id -ErrorAction SilentlyContinue)
  }

  return $false
}

$stopped = $false

if (Test-Path $pidFile) {
  $pidValue = (Get-Content $pidFile -Raw).Trim()
  if ($pidValue -match '^\d+$') {
    $stopped = (Stop-ProcessIfRunning -Id ([int]$pidValue)) -or $stopped
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$portOwners = @()

try {
  $portOwners += Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
    Select-Object -ExpandProperty OwningProcess -Unique
} catch {
}

if (-not $portOwners) {
  $netstatLines = netstat -ano -p tcp | Select-String -Pattern (":$Port\\s")
  foreach ($line in $netstatLines) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }
    if ($parts.Length -ge 5) {
      $portOwners += $parts[-1]
    }
  }
}

$portOwners = $portOwners | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique

foreach ($owner in $portOwners) {
  $stopped = (Stop-ProcessIfRunning -Id $owner) -or $stopped
}

if ($stopped) {
  Write-Host "Miya has stopped."
} else {
  Write-Host "Miya was not running."
}
