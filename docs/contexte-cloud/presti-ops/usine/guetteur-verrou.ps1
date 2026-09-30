# guetteur-verrou.ps1 — qui crée .git/index.lock dans presti, et qui le laisse ? (27/09, verrous orphelins : 3 fois, jusqu'à 2 h)
# Toutes les 2 s. À la création d'un verrou : note les git.exe vivants avec leur parent et grand-parent (une seule fois).
# Au-delà de 8 min (le plus long détenteur légitime, un commit et son crochet, tient 2 à 3 min) : le retire et le note.
$depot = 'C:\Users\benja\Documents\presti\.git\index.lock'
$journal = 'C:\Users\benja\Documents\presti-ops\usine\guetteur-verrou.log'
$vu = $null
while ($true) {
  if (Test-Path $depot) {
    $t = (Get-Item $depot).LastWriteTime
    if ($vu -ne $t) {
      $vu = $t
      Add-Content $journal "$(Get-Date -Format HH:mm:ss) verrou créé à $($t.ToString('HH:mm:ss'))"
      Get-CimInstance Win32_Process -Filter "Name='git.exe'" | ForEach-Object {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.ParentProcessId)" -ErrorAction SilentlyContinue
        $pp = if ($p) { Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)" -ErrorAction SilentlyContinue } else { $null }
        $c = if ($_.CommandLine) { $_.CommandLine.Substring(0, [Math]::Min(160, $_.CommandLine.Length)) } else { '' }
        Add-Content $journal "    git $($_.ProcessId) [$c] <- $($p.Name) $($p.ProcessId) <- $($pp.Name)"
      }
    } elseif (((Get-Date) - $t).TotalSeconds -gt 480) {
      try { Remove-Item $depot -ErrorAction Stop; Add-Content $journal "$(Get-Date -Format HH:mm:ss) ORPHELIN retiré : verrou du $($t.ToString('HH:mm:ss')), $([int]((Get-Date) - $t).TotalMinutes) min" } catch { }
      $vu = $null
    }
  } else { $vu = $null }
  Start-Sleep -Seconds 2
}
