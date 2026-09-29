# relancer-demons.ps1 — relance le moteur et le guetteur des verrous s'ils sont morts, HORS de toute session Claude
# (Win32_Process.Create : le parent est WmiPrvSE, une fermeture de session ne les tue plus ; 27/09).
$U = 'C:\Users\benja\Documents\presti-ops\usine'
function vivant($f) { $p = Get-Content $f -ErrorAction SilentlyContinue; return ($p -and (Get-Process -Id $p -ErrorAction SilentlyContinue)) }
if (-not (vivant "$U\moteur.pid") -and -not (Test-Path "$U\moteur.stop")) {
  $node = (Get-Command node).Source
  $m = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "`"$node`" ..\presti-ops\usine\moteur.mjs --max=8 --max-libre=4 --max-ag=3 --heures=14"; CurrentDirectory = 'C:\Users\benja\Documents\presti' }
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
