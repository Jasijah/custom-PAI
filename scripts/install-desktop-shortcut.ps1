$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopPath = [Environment]::GetFolderPath('Desktop')
$iconPath = Join-Path $repoRoot 'ui\public\pai-shortcut.ico'
$fallbackIcon = "$env:SystemRoot\System32\SHELL32.dll"
$launchers = @(
  @{
    ShortcutName = 'Start PAI.lnk'
    TargetPath = Join-Path $repoRoot 'Start-Miya.cmd'
    Description = 'Start PAI locally and open the control UI.'
    IconIndex = 220
  },
  @{
    ShortcutName = 'Stop PAI.lnk'
    TargetPath = Join-Path $repoRoot 'Stop-Miya.cmd'
    Description = 'Stop the local PAI gateway.'
    IconIndex = 131
  },
  @{
    ShortcutName = 'Open PAI.lnk'
    TargetPath = 'http://127.0.0.1:18789/'
    Description = 'Open PAI in your browser.'
    IconIndex = 220
  }
)

$shell = New-Object -ComObject WScript.Shell

foreach ($launcher in $launchers) {
  $isUrl = [string]$launcher.TargetPath -match '^https?://'
  if (-not $isUrl -and -not (Test-Path $launcher.TargetPath)) {
    throw "Launcher not found at $($launcher.TargetPath)"
  }

  $shortcutPath = Join-Path $desktopPath $launcher.ShortcutName
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $launcher.TargetPath
  if ($launcher.TargetPath -like '*.cmd') {
    $shortcut.WorkingDirectory = $repoRoot
  }
  if (Test-Path $iconPath) {
    $shortcut.IconLocation = $iconPath
  } else {
    $shortcut.IconLocation = "$fallbackIcon,$($launcher.IconIndex)"
  }
  $shortcut.Description = $launcher.Description
  $shortcut.Save()

  Write-Host "Desktop shortcut created at $shortcutPath"
}
