# Compatibilité du serveur Pilotage — 30/09/2026

Cause observée dans le dernier verifier.log de 026-111 : Next dev s'arrête parce que le dépôt configure webpack sans sélection explicite du moteur. Le helper scripts/fixtures/026-pilotage/b/commun.mjs lançait dev sans --webpack.

Correction : ajout du seul argument --webpack dans serveurCopie. Aucun critère modifié, aucun changement de produit. Validation du lot b à effectuer après le runner Studio 026-167 ; ce diagnostic ne constitue pas un PASS.

Premier contrôle : lot b PASS, code 0, 137 s. Revérification depuis fait requise.

Contrôle final depuis fait : PASS, code 0, 119 s. Le précédent JA-5 provenait d'un fichier d'une autre tâche apparu pendant le contrôle ; sa preuve a été préservée, les écritures ont été suspendues puis le lot complet rejoué.
