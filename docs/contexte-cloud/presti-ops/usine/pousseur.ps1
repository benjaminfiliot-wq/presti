# pousseur.ps1 — 29/09 : pousse main quand le PC est en avance sur origin (l'usine ne lance rien tant que HEAD ≠ origin/main).
# Jamais de force : s'il y a divergence (en retard ET en avance), il note et attend qu'un agent règle. Journal : pousseur.log.
# Un seul exemplaire : pousseur.pid. Arrêt : créer pousseur.stop.
$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$depot = 'C:\Users\benja\Documents\presti'
$journal = Join-Path $ici 'pousseur.log'
$pidFichier = Join-Path $ici 'pousseur.pid'
if (Test-Path $pidFichier) {
  $ancien = Get-Content $pidFichier -ErrorAction SilentlyContinue
  if ($ancien -and (Get-Process -Id $ancien -ErrorAction SilentlyContinue)) { exit 0 }
}
$PID | Set-Content $pidFichier
function Noter($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Add-Content $journal -Encoding utf8 }
Noter 'démarré'
while (-not (Test-Path (Join-Path $ici 'pousseur.stop'))) {
  try {
    Set-Location $depot
    git fetch -q 2>$null
    $c = (git rev-list --left-right --count main...origin/main 2>$null) -split '\s+'
    $avance = [int]$c[0]; $retard = [int]$c[1]
    if ($avance -gt 0 -and $retard -eq 0) {
      $s = git push 2>&1 | Out-String
      Noter "poussé ($avance commit(s)) : $($s.Trim() -replace '\s+', ' ')"
    } elseif ($avance -gt 0 -and $retard -gt 0) {
      Noter "divergence : $avance en avance, $retard en retard — rien fait"
    }
  } catch { Noter "erreur : $($_.Exception.Message)" }
  Start-Sleep -Seconds 120
}
Noter 'arrêté (pousseur.stop)'
Remove-Item $pidFichier -ErrorAction SilentlyContinue
