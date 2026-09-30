### plafond-12-mo -> juge code 1 ; ❌ TT-4 — taille et publication conforme — fichier > 9,5 Mo accepté| ; mon essai : 1 ❌
### accord-non-exige -> juge code 1 ; ❌ TT-2 — accord individuel exact requis — publication sans accord acceptée| ; mon essai : 11 ❌
### laya-ignore -> juge code 0 ;  ; mon essai : 1 ❌
### reference-a-studio -> juge code 1 ; ❌ TT-3 — jamais TikTok Studio ni Creative Center — « tiktokstudio » lu dans le source| ; mon essai : 1 ❌
### pause-ignoree -> juge code 0 ;  ; mon essai : 1 ❌
### version-legende-seule -> juge code 0 ;  ; mon essai : 2 ❌
restauration exacte : sha256 identique (dd4cde48db96a4bc0df501c516cdf5f2cc13bbf8468d29dea800d3557b9eee18)
contenu-qa --partie=tiktok : PASS
contenu-qa : PASS

Limites du juge `--partie=tiktok` (hors périmètre : il appartient à 026-204, à signaler) :
- « laya-ignore » lui échappe : TT-1 fournit une vidéo SANS source, que le script refuse déjà pour cette raison ; le seuil de Laya n'est jamais exercé par le juge seul.
- « pause-ignoree » lui échappe : aucun critère ne passe de pause générale.
- « version-legende-seule » lui échappe : aucun critère ne retouche le texte incrusté ou le média après l'accord.
Les trois sont tués par essai-etape6.mjs (37 cas : source + Laya 0,1 / 0,9 / panne, pause, ligne suspendue, drapeau, texte incrusté ajouté, empreinte du média, portée, ancienne version, autre vidéo, preuve publique sans cookies).
