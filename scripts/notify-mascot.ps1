#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Notify the running mascot app of a new state. Called by Copilot CLI hooks.

.DESCRIPTION
  Fire-and-forget: POSTs the given state to the mascot's local HTTP listener.
  Always exits 0 and never throws, so it can never block or disrupt the CLI.
  Reads the hook's JSON input from stdin (when available) to enrich the
  "thinking" state with the submitted prompt.
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('idle', 'thinking', 'working', 'done', 'error')]
  [string]$State
)

$ErrorActionPreference = 'SilentlyContinue'

$port = if ($env:MASCOT_PORT) { $env:MASCOT_PORT } else { 4577 }

$prompt = $null
$tool = $null
try {
  if ([Console]::IsInputRedirected) {
    $raw = [Console]::In.ReadToEnd()
    if ($raw) {
      $data = $raw | ConvertFrom-Json
      if ($data.prompt) { $prompt = [string]$data.prompt }
      if ($data.toolName) { $tool = [string]$data.toolName }
      elseif ($data.tool) { $tool = [string]$data.tool }
    }
  }
}
catch { }

$payload = @{ state = $State }
if ($prompt) { $payload.prompt = $prompt }
if ($tool) { $payload.tool = $tool }
$json = $payload | ConvertTo-Json -Compress

try {
  Invoke-RestMethod -Uri "http://127.0.0.1:$port/state" -Method Post `
    -Body $json -ContentType 'application/json' -TimeoutSec 2 | Out-Null
}
catch { }

exit 0
