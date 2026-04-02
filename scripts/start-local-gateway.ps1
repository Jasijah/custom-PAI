param(
  [int]$Port = 18789,
  [switch]$NoBrowser,
  [switch]$ForceRestart
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$distEntry = Join-Path $repoRoot 'dist\index.js'
$stdoutLog = Join-Path $repoRoot 'gateway-stdout.log'
$stderrLog = Join-Path $repoRoot 'gateway-stderr.log'
$pidFile = Join-Path $repoRoot 'gateway.pid'

function Test-LocalGateway {
  param([int]$TargetPort)

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('127.0.0.1', $TargetPort, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(750, $false)
    if (-not $connected) {
      $client.Close()
      return $false
    }
    $null = $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Find-Node {
  $candidates = @()
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    $candidates += $command.Source
  }

  $candidates += 'C:\Users\My\Tools\NodeJS\node.exe'
  $candidates += (Join-Path $env:ProgramFiles 'nodejs\node.exe')
  $candidates += (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe')

  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw 'Node.js was not found. Install Node.js or update the launcher script with your node.exe path.'
}

function Stop-ExistingGateway {
  if (-not (Test-Path $pidFile)) {
    return
  }

  $pidValue = (Get-Content $pidFile -Raw).Trim()
  if (-not $pidValue) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    return
  }

  $existing = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
  if ($existing) {
    Stop-Process -Id $existing.Id -Force
    Start-Sleep -Seconds 1
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $distEntry)) {
  throw "Built gateway entry was not found at $distEntry. Run pnpm build once before using the launcher."
}

if ($ForceRestart) {
  Stop-ExistingGateway
}

if (Test-LocalGateway -TargetPort $Port) {
  Write-Host "Miya is already running at http://127.0.0.1:$Port/"
  if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:$Port/"
  }
  exit 0
}

$nodePath = Find-Node
Set-Content -Path $stdoutLog -Value ''
Set-Content -Path $stderrLog -Value ''

$process = Start-Process \
  -FilePath $nodePath \
  -ArgumentList @($distEntry, 'gateway', '--port', $Port.ToString(), '--bind', 'loopback') \
  -WorkingDirectory $repoRoot \
  -WindowStyle Hidden \
  -RedirectStandardOutput $stdoutLog \
  -RedirectStandardError $stderrLog \
  -PassThru

Set-Content -Path $pidFile -Value $process.Id

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 750

  if (Test-LocalGateway -TargetPort $Port) {
    Write-Host "Miya is ready at http://127.0.0.1:$Port/"
    if (-not $NoBrowser) {
      Start-Process "http://127.0.0.1:$Port/"
    }
    exit 0
  }

  if ($process.HasExited) {
    break
  }
}

$stderrTail = if (Test-Path $stderrLog) { (Get-Content $stderrLog -Tail 40) -join "`n" } else { '' }
throw "Miya did not start successfully. Check $stderrLog for details.`n$stderrTail"
