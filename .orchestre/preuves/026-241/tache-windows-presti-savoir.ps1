# Tâche planifiée « Presti savoir » (fiche 026-241, geste 3) : écrite le 05/10/2026, PAS créée, PAS testée.
# Le PC est à moins de 1,5 Go de mémoire libre : un export du savoir parcourt tout l'arbre (plus de 3 minutes, plusieurs
# centaines de Mo en mémoire). À lancer par Benj, quand le PC a de la marge, depuis un PowerShell ordinaire :
#   powershell -ExecutionPolicy Bypass -File .orchestre\preuves\026-241\tache-windows-presti-savoir.ps1
# Puis la juger : node scripts/savoir-socle-qa.mjs --reel (SVS-R3 lit le XML de la tâche : PT2H, node, synchroniser.mjs, répertoire presti).
$ErrorActionPreference = 'Stop'
$racine = 'C:\Users\benja\Documents\presti'
$action = New-ScheduledTaskAction -Execute 'C:\Program Files\nodejs\node.exe' -Argument 'scripts\savoir\synchroniser.mjs' -WorkingDirectory $racine
$declencheur = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 2)
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName 'Presti savoir' -Action $action -Trigger $declencheur -Settings $reglages -Description 'Synchronise le savoir de Presti vers l usine toutes les 2 h (fiche 026-241)' | Out-Null
(Export-ScheduledTask -TaskName 'Presti savoir') | Select-String 'Interval|Command|Arguments|WorkingDirectory'
Write-Host 'Tâche « Presti savoir » créée. Premier passage dans 5 minutes ; Start-ScheduledTask -TaskName "Presti savoir" pour le lancer à la main.'
