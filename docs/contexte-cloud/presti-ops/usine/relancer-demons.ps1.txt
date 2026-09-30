# relancer-demons.ps1 — relance le moteur et le guetteur des verrous s'ils sont morts, HORS de toute session Claude
# (Win32_Process.Create : le parent est WmiPrvSE, une fermeture de session ne les tue plus ; 27/09).
# 29/09 : quota ChatGPT épuisé jusqu'au 3/10 18 h -> toute la production Codex part sur la voie libre (--libre=ol, relais vers freellmapi,
# --max-libre=8) tant que --retour-chatgpt n'est pas passé ; ensuite le moteur revient tout seul à l'abonnement. Pour revenir plus tôt :
# retirer --retour-chatgpt (ou ajouter --chatgpt-tout-de-suite) ici, puis créer/retirer moteur.stop pour le redémarrer.
$U = 'C:\Users\benja\Documents\presti-ops\usine'
function vivant($f) { $p = Get-Content $f -ErrorAction SilentlyContinue; return ($p -and (Get-Process -Id $p -ErrorAction SilentlyContinue)) }
if (-not (vivant "$U\moteur.pid") -and -not (Test-Path "$U\moteur.stop")) {
  $node = (Get-Command node).Source
  $m = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "`"$node`" ..\presti-ops\usine\moteur.mjs --max=8 --max-libre=8 --max-ag=6 --libre=ol --retour-chatgpt=2026-09-30T00:00:00+02:00 --heures=14"; CurrentDirectory = 'C:\Users\benja\Documents\presti' }
  Set-Content "$U\moteur.pid" $m.ProcessId; "moteur relancé : PID $($m.ProcessId)"
} else { 'moteur : vivant (ou arrêt demandé par moteur.stop)' }
if ((Get-Date) -lt [datetime]'2026-10-05T09:00:00' -and -not (vivant "$U\reste-eveille.pid")) {
  $e = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $U\reste-eveille.ps1"; CurrentDirectory = $U }
  Set-Content "$U\reste-eveille.pid" $e.ProcessId; "reste-éveillé relancé : PID $($e.ProcessId)"
}
if (-not (vivant "$U\guetteur.pid")) {
  $g = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $U\guetteur-verrou.ps1"; CurrentDirectory = 'C:\Users\benja\Documents\presti' }
  Set-Content "$U\guetteur.pid" $g.ProcessId; "guetteur relancé : PID $($g.ProcessId)"
} else { 'guetteur : vivant' }
# 29/09 : le pousseur (main en avance sur origin → push, jamais de force ; sans lui, l'usine refuse tout lancement).
if (-not (vivant "$U\pousseur.pid")) {
  $p = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $U\pousseur.ps1"; CurrentDirectory = $U }
  "pousseur relancé : PID $($p.ProcessId)"
} else { 'pousseur : vivant' }
