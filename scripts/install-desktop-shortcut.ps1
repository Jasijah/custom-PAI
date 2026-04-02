$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopPath = [Environment]::GetFolderPath('Desktop')
$launchers = @(
  @{
    ShortcutName = 'Start Miya.lnk'
    TargetPath = Join-Path $repoRoot 'Start-Miya.cmd'
    Description = 'Start Miya locally and open the control UI.'
    IconIndex = 220
  },
  @{
    ShortcutName = 'Stop Miya.lnk'
    TargetPath = Join-Path $repoRoot 'Stop-Miya.cmd'
    Description = 'Stop the local Miya gateway.'
    IconIndex = 131
  }
)

$shell = New-Object -ComObject WScript.Shell

foreach ($launcher in $launchers) {
  if (-not (Test-Path $launcher.TargetPath)) {
    throw "Launcher not found at $($launcher.TargetPath)"
  }

  $shortcutPath = Join-Path $desktopPath $launcher.ShortcutName
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $launcher.TargetPath
  $shortcut.WorkingDirectory = $repoRoot
  $shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,$($launcher.IconIndex)"
  $shortcut.Description = $launcher.Description
  $shortcut.Save()

  Write-Host "Desktop shortcut created at $shortcutPath"
}
