#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Install (or uninstall) the mascot hooks into ~/.copilot/settings.json.

.DESCRIPTION
  Merges declarative Copilot CLI "command" hooks that notify the mascot app on
  session events. Existing settings and any non-mascot hooks are preserved. A
  timestamped backup of settings.json is written before any change.

.EXAMPLE
  pwsh ./scripts/install-hooks.ps1
  pwsh ./scripts/install-hooks.ps1 -Uninstall
#>
param(
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$notifyScript = Join-Path $repoRoot 'scripts\notify-mascot.ps1'
$settingsDir = Join-Path $HOME '.copilot'
$settingsPath = Join-Path $settingsDir 'settings.json'
$marker = 'notify-mascot.ps1'

# Event name -> mascot state.
$hookMap = [ordered]@{
  userPromptSubmitted = 'thinking'
  preToolUse          = 'working'
  postToolUse         = 'working'
  postToolUseFailure  = 'error'
  errorOccurred       = 'error'
  agentStop           = 'done'
}

function ConvertTo-HashtableDeep {
  param($InputObject)
  if ($null -eq $InputObject) { return $null }
  if ($InputObject -is [System.Collections.IDictionary]) {
    $h = [ordered]@{}
    foreach ($k in $InputObject.Keys) { $h[$k] = ConvertTo-HashtableDeep $InputObject[$k] }
    return $h
  }
  if ($InputObject -is [pscustomobject]) {
    $h = [ordered]@{}
    foreach ($p in $InputObject.PSObject.Properties) { $h[$p.Name] = ConvertTo-HashtableDeep $p.Value }
    return $h
  }
  if ($InputObject -is [System.Collections.IEnumerable] -and $InputObject -isnot [string]) {
    return @($InputObject | ForEach-Object { ConvertTo-HashtableDeep $_ })
  }
  return $InputObject
}

# Load existing settings (as a deep hashtable) or start fresh.
$settings = [ordered]@{}
if (Test-Path $settingsPath) {
  $rawText = Get-Content -Raw -Path $settingsPath
  if ($rawText.Trim()) {
    try {
      $parsed = $rawText | ConvertFrom-Json
      $settings = ConvertTo-HashtableDeep $parsed
    }
    catch {
      throw "Could not parse $settingsPath as JSON. Aborting to avoid data loss. ($_)"
    }
  }
  $backup = "$settingsPath.bak-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
  Copy-Item -Path $settingsPath -Destination $backup
  Write-Host "Backed up settings to $backup"
}
else {
  New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
}

if (-not $settings.Contains('hooks') -or $null -eq $settings['hooks']) {
  $settings['hooks'] = [ordered]@{}
}
$hooks = $settings['hooks']

foreach ($event in $hookMap.Keys) {
  # Keep any existing non-mascot hooks for this event.
  $existing = @()
  if ($hooks.Contains($event) -and $hooks[$event]) {
    $existing = @($hooks[$event] | Where-Object {
        -not ($_.powershell -and ([string]$_.powershell).Contains($marker))
      })
  }

  if (-not $Uninstall) {
    $state = $hookMap[$event]
    $command = "& '$notifyScript' -State $state"
    $item = [ordered]@{
      type       = 'command'
      powershell = $command
      timeoutSec = 5
    }
    $existing = @($existing) + $item
  }

  if ($existing.Count -gt 0) {
    $hooks[$event] = @($existing)
  }
  elseif ($hooks.Contains($event)) {
    $hooks.Remove($event)
  }
}

if ($hooks.Count -eq 0) { $settings.Remove('hooks') }

$settings | ConvertTo-Json -Depth 20 | Set-Content -Path $settingsPath -Encoding utf8

if ($Uninstall) {
  Write-Host "Removed mascot hooks from $settingsPath"
}
else {
  Write-Host "Installed mascot hooks into $settingsPath"
  Write-Host "Events: $($hookMap.Keys -join ', ')"
  Write-Host "Start the mascot app (npm start) and run a Copilot CLI prompt to see it react."
}
