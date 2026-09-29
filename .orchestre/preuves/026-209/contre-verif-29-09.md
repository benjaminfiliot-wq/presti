# Contre-vérification du 29/09 — 026-209 (fabriquer.mjs)

sha256 de départ : ca31c68b751c3e69dbe9ad11ec4f24ebc923dcdcfd3515bfbcdff000efd3f4ac

- S1 verdictEntree neutralisé (tout accepté) : code 1, FA-1 ROUGE (attendu)
- S2 phrase chiffrée jamais détectée : code 1, FA-3 ROUGE (attendu)
- S3 score Laya ignoré : code 1, FA-3 ROUGE (attendu)
- S4 taille TikTok ignorée : code 1, FA-4 ROUGE (attendu)

sha256 après restauration : ca31c68b751c3e69dbe9ad11ec4f24ebc923dcdcfd3515bfbcdff000efd3f4ac (identique)
verifier rejoué sur le fichier restauré : code 0

Verdict : 4 sabotages sur 4 rendus rouges par le juge, fichier restauré à l'octet près.

## Notes

- Un premier essai a montré que « ligne suspendue acceptée » et « doublon accepté » pris isolément ne rougissent PAS le juge
  (FA-1 et FA-2) : les entrées du juge (`{}`, `{ ideeId: 'id1' }`) sont mal formées et sont refusées de toute façon par les
  contrôles de forme qui suivent (défense en profondeur de la production). Le sabotage retenu neutralise donc `verdictEntree`
  entière. C'est une faiblesse du juge 026-204 (hors périmètre ici), pas de la production.
- Essai du passage complet sur doublures : `essai-passage-doublures.log` (42 cas : dépôt idempotent et déterministe, reprise
  après interruption, fichier absent, licence inconnue ou non admise, CC BY sans crédit, TikTok 11 Mo, sans audio, durée,
  Laya en panne / score bas / sans source, route de dépôt absente, pause, e-mail réel / nom de prospect / jeton dans une
  capture, ligne suspendue, texte libre, doublon, identifiant piégé, script trop long, et les cas de voix de 026-224 :
  licence absente, quota nul, offre gratuite en usage commercial → `ff_siwis` ; droit valide → Fish sans clé dans la preuve ;
  Fish interne → refusé au dépôt sauf essai interne déclaré, alors `publiable: false`).
- Adaptateurs réels essayés sur le poste, sur une page locale de fixtures : capture Playwright (champs et zones sensibles
  masqués, texte lisible relu, origine `fixture`), rendu HyperFrames (`check` sans erreur après correction du contraste des
  mentions) et deux variantes ffmpeg 1080x1920, 15,02 s, avec piste audio, ~1,15 Mo. NON essayés ici : la synthèse Kokoro
  (`kokoro-onnx` absent du poste ; à confirmer sur l'usine) et la route de dépôt `contenu` (n'existe pas encore : la fabrique
  s'arrête avant le rendu et le dit).
