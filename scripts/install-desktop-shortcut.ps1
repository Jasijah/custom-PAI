param(
  [string]$ShortcutName = 'Start Miya.lnk'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath $ShortcutName
$targetPath = Join-Path $repoRoot 'Start-Miya.cmd'

if (-not (Test-Path $targetPath)) {
  throw "Launcher not found at $targetPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,220"
$shortcut.Description = 'Start Miya locally and open the control UI.'
$shortcut.Save()

Write-Host "Desktop shortcut created at $shortcutPath"
