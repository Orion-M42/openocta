$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScenarioJson = Join-Path $Root "scenario.json"
$GatewayUrl = if ($env:OPENOCTA_GATEWAY_URL) { $env:OPENOCTA_GATEWAY_URL } else { "http://127.0.0.1:18900" }
$Token = $env:OPENOCTA_GATEWAY_TOKEN

if (-not (Test-Path $ScenarioJson)) { throw "missing scenario.json" }
$scenario = Get-Content $ScenarioJson -Raw | ConvertFrom-Json

function Install-Kind($Kind, $Id, $Category) {
  Write-Host "==> install ${Kind}: ${Id}"
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $body = @{ kind = $Kind; id = $Id; type = $Category; category = $Category } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "$($GatewayUrl.TrimEnd('/'))/api/v1/install" -Headers $headers -Body $body
  } catch {
    Write-Warning "failed to install ${Kind} ${Id}: $_"
  }
}

foreach ($s in $scenario.skills) {
  $cat = if ($s.category) { $s.category } else { "运维" }
  Install-Kind "skill" $s.id $cat
}
foreach ($m in $scenario.mcps) {
  $cat = if ($m.category) { $m.category } else { "运维" }
  Install-Kind "mcp" $m.id $cat
}

Write-Host "==> required environment variables:"
foreach ($e in $scenario.env) { Write-Host "- $($e.name): $($e.description)" }
Write-Host "done: database-ops"
