#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Build (unless -NoBuild) and launch the mascot app detached in the background.

.EXAMPLE
  pwsh ./scripts/start-mascot.ps1
  pwsh ./scripts/start-mascot.ps1 -NoBuild
#>
param(
  [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
  if (-not $NoBuild) {
    Write-Host 'Building...'
    npm run build | Out-Null
  }

  $electron = Join-Path $repoRoot 'node_modules\.bin\electron.cmd'
  if (-not (Test-Path $electron)) {
    throw "Electron not found at $electron. Run 'npm install' first."
  }

  $port = if ($env:MASCOT_PORT) { $env:MASCOT_PORT } else { '4577' }
  Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $repoRoot -WindowStyle Hidden
  Write-Host "Mascot started. It listens on http://127.0.0.1:$port/state"
}
finally {
  Pop-Location
}
