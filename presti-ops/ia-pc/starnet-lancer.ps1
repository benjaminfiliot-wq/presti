# starnet-lancer.ps1 — remet en route ce dont le harnais de bureau (docs/agents/starnet.md) a besoin :
#   1. le tunnel ssh vers l'Ollama de l'usine  (127.0.0.1:11435 -> usine:11434)  : le cerveau gratuit, sans clé ;
#   2. le connecteur MCP « presti » en lecture seule (127.0.0.1:8799/mcp).
# Ne démarre PAS l'application (ouvre-la toi-même) et n'installe rien. Chaque processus est lancé une seule fois
# (on regarde le port d'abord). Pour arrêter : Stop-Process -Id <PID> (jamais par nom, cf. mémoire « tuer par PID »).
#   Usage : powershell -ExecutionPolicy Bypass -File presti-ops\ia-pc\starnet-lancer.ps1
$ErrorActionPreference = 'Stop'
$racine = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Ecoute($port) { [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) }

if (Ecoute 11435) { Write-Host 'tunnel Ollama usine : déjà en ligne (11435)' }
else {
  $cle = Join-Path $env:USERPROFILE '.ssh\presti-usine'
  $p = Start-Process -FilePath ssh -ArgumentList '-N', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30', '-o', 'BatchMode=yes', '-L', '11435:127.0.0.1:11434', '-i', $cle, 'usine@88.96.53.3' -WindowStyle Hidden -PassThru
  Write-Host "tunnel Ollama usine : lancé, PID $($p.Id)"
}

if (Ecoute 8799) { Write-Host 'connecteur presti : déjà en ligne (8799)' }
else {
  $p = Start-Process -FilePath node -ArgumentList (Join-Path $racine 'scripts\mcp\presti-station.mjs'), '--http=8799' -WorkingDirectory $racine -WindowStyle Hidden -PassThru
  Write-Host "connecteur presti : lancé, PID $($p.Id)"
}

Start-Sleep 3
try {
  $t = Invoke-RestMethod -Uri http://127.0.0.1:11435/api/tags -TimeoutSec 8
  Write-Host ('Ollama usine : ' + (($t.models | ForEach-Object { $_.name }) -join ', '))
} catch { Write-Host 'Ollama usine : INJOIGNABLE (tunnel pas prêt ?)' }
try {
  $r = Invoke-RestMethod -Uri http://127.0.0.1:8799/mcp -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' -TimeoutSec 8
  Write-Host ('connecteur presti : ' + (($r.result.tools | ForEach-Object { $_.name }) -join ', '))
} catch { Write-Host 'connecteur presti : INJOIGNABLE' }
