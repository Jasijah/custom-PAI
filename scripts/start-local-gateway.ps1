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

function Initialize-LogFile {
  param(
    [string]$PreferredPath,
    [string]$Prefix
  )

  try {
    Set-Content -Path $PreferredPath -Value ''
    return $PreferredPath
  } catch {
    $fallback = Join-Path $repoRoot ("{0}-{1}.log" -f $Prefix, (Get-Date -Format "yyyyMMdd-HHmmss"))
    Set-Content -Path $fallback -Value ''
    return $fallback
  }
}

function Test-LocalGateway {
  param([int]$TargetPort)

  try {
    $request = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:$TargetPort/")
    $request.Method = 'GET'
    $request.Timeout = 1500
    $request.ReadWriteTimeout = 1500
    $response = $request.GetResponse()
    $response.Close()
    return $true
  } catch {
    return $false
  }
}

function Get-PortOwners {
  param([int]$TargetPort)

  $owners = @()

  try {
    $owners += Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique
  } catch {
  }

  if (-not $owners) {
    $netstatLines = netstat -ano -p tcp | Select-String -Pattern (":$TargetPort\\s")
    foreach ($line in $netstatLines) {
      $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }
      if ($parts.Length -ge 5) {
        $owners += $parts[-1]
      }
    }
  }

  return @($owners | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique)
}

function Test-IsMiyaProcess {
  param([int]$Id)

  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $Id" -ErrorAction Stop
    $commandLine = [string]$process.CommandLine
    $executable = [string]$process.ExecutablePath
    return $commandLine.Contains($distEntry) -or
      $commandLine.Contains($repoRoot) -or
      $commandLine.Contains(" gateway ") -or
      $executable.EndsWith("node.exe", [System.StringComparison]::OrdinalIgnoreCase)
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
    return $false
  }

  $pidValue = (Get-Content $pidFile -Raw).Trim()
  if (-not $pidValue) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    return $false
  }

  $existing = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
  if ($existing) {
    Stop-Process -Id $existing.Id -Force
    Start-Sleep -Seconds 1
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  return $true
}

function Stop-MiyaListenersOnPort {
  param([int]$TargetPort)

  $stopped = $false
  foreach ($owner in (Get-PortOwners -TargetPort $TargetPort)) {
    if (-not (Test-IsMiyaProcess -Id ([int]$owner))) {
      throw "Port $TargetPort is already in use by process $owner, and it does not look like Miya. Close that app or choose another port."
    }
    Stop-Process -Id ([int]$owner) -Force -ErrorAction SilentlyContinue
    $stopped = $true
  }

  if ($stopped) {
    Start-Sleep -Seconds 1
  }

  return $stopped
}

if (-not (Test-Path $distEntry)) {
  throw "Built gateway entry was not found at $distEntry. Run pnpm build once before using the launcher."
}

if ($ForceRestart) {
  $null = Stop-ExistingGateway
  $null = Stop-MiyaListenersOnPort -TargetPort $Port
}

if (Test-LocalGateway -TargetPort $Port) {
  Write-Host "Miya is already running at http://127.0.0.1:$Port/"
  if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:$Port/"
  }
  exit 0
}

$nodePath = Find-Node
$stdoutLog = Initialize-LogFile -PreferredPath $stdoutLog -Prefix 'gateway-stdout'
$stderrLog = Initialize-LogFile -PreferredPath $stderrLog -Prefix 'gateway-stderr'
$escapedNode = '"' + $nodePath + '"'
$escapedDist = '"' + $distEntry + '"'
$escapedStdout = '"' + $stdoutLog + '"'
$escapedStderr = '"' + $stderrLog + '"'
$cmdArgs = "/c start `"`" /b $escapedNode $escapedDist gateway --port $Port --bind loopback 1>>$escapedStdout 2>>$escapedStderr"
Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 750

  if (Test-LocalGateway -TargetPort $Port) {
    $ownerPid = $null
    try {
      $ownerPid = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
        Select-Object -First 1 -ExpandProperty OwningProcess)
    } catch {
    }
    if (-not $ownerPid) {
      $netstatLine = netstat -ano -p tcp | Select-String -Pattern (":$Port\\s+.*LISTENING\\s+(\\d+)$") | Select-Object -First 1
      if ($netstatLine -and $netstatLine.Matches.Count -gt 0) {
        $ownerPid = $netstatLine.Matches[0].Groups[1].Value
      }
    }
    if ($ownerPid) {
      Set-Content -Path $pidFile -Value $ownerPid
    }
    Write-Host "Miya is ready at http://127.0.0.1:$Port/"
    if (-not $NoBrowser) {
      Start-Process "http://127.0.0.1:$Port/"
    }
    exit 0
  }
}

if (-not $ForceRestart) {
  $null = Stop-MiyaListenersOnPort -TargetPort $Port
  Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 750

    if (Test-LocalGateway -TargetPort $Port) {
      $ownerPid = $null
      try {
        $ownerPid = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
          Select-Object -First 1 -ExpandProperty OwningProcess)
      } catch {
      }
      if (-not $ownerPid) {
        $netstatLine = netstat -ano -p tcp | Select-String -Pattern (":$Port\\s+.*LISTENING\\s+(\\d+)$") | Select-Object -First 1
        if ($netstatLine -and $netstatLine.Matches.Count -gt 0) {
          $ownerPid = $netstatLine.Matches[0].Groups[1].Value
        }
      }
      if ($ownerPid) {
        Set-Content -Path $pidFile -Value $ownerPid
      }
      Write-Host "Miya is ready at http://127.0.0.1:$Port/"
      if (-not $NoBrowser) {
        Start-Process "http://127.0.0.1:$Port/"
      }
      exit 0
    }
  }
}

$stderrTail = if (Test-Path $stderrLog) { (Get-Content $stderrLog -Tail 40) -join "`n" } else { '' }
throw "Miya did not start successfully. Check $stderrLog for details.`n$stderrTail"
