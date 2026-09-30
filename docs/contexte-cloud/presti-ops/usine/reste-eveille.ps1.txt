# reste-eveille.ps1 — empêche la mise en veille du PC jusqu'à une heure donnée (27/09 : chantier de nuit, demande de Benj).
# SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) : la même méthode que PowerToys Awake. Aucun réglage de
# Windows n'est modifié ; la demande tombe d'elle-même quand ce processus s'arrête (à l'heure dite, ou tué par son PID).
# Écran : peut s'éteindre (ES_DISPLAY_REQUIRED n'est pas demandé). Un capot fermé met quand même en veille.
param([string]$Jusqua = '2026-10-05T09:00:00')
Add-Type -Namespace Presti -Name Veille -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$fin = [datetime]::Parse($Jusqua)
$journal = 'C:\Users\benja\Documents\presti-ops\usine\reste-eveille.log'
Add-Content $journal "$(Get-Date -Format 'dd/MM HH:mm') éveil demandé jusqu'à $($fin.ToString('dd/MM HH:mm')) (PID $PID)"
while ((Get-Date) -lt $fin) {
  [void][Presti.Veille]::SetThreadExecutionState([uint32]'0x80000001') # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
  Start-Sleep -Seconds 60
}
[void][Presti.Veille]::SetThreadExecutionState([uint32]'0x80000000') # ES_CONTINUOUS seul : on rend la main
Add-Content $journal "$(Get-Date -Format 'dd/MM HH:mm') éveil rendu"
