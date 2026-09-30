$U = 'C:\Users\benja\Documents\presti-ops\usine'
for ($i = 0; $i -lt 240; $i++) {
  $p = Get-Content "$U\moteur.pid" -ErrorAction SilentlyContinue
  if (-not ($p -and (Get-Process -Id $p -ErrorAction SilentlyContinue))) { break }
  Start-Sleep 15
}
if (Test-Path "$U\moteur.stop") { Remove-Item "$U\moteur.stop" -ErrorAction SilentlyContinue }
& powershell -NoProfile -ExecutionPolicy Bypass -File "$U\relancer-demons.ps1" | Out-File "$U\relance-chatgpt.log" -Encoding utf8