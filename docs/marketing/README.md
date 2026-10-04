# Mémoire marketing de Presti (fiche 026-205, C02)

Lue par les agents du contenu (fabrique, Crieur, mesureur, boucle) avant toute idée ou publication. Créée le 2026-09-29.

**Statut : PROPOSÉE, non approuvée.** Benj approuve une fois la voix et les cinq lignes (geste demandé par la source
`Ecosysteme-Marketing-Reel-2026-09-25.md`, §3.7, ligne C02). Tant qu'il ne l'a pas fait, chaque ligne reste suspendue et rien ne
part. Cette approbation n'est **pas** une permission de publier : depuis la décision du 30/09 (confirmée par Benj le 04/10),
il n'y a plus d'accord individuel par publication ; chaque publication passe les contrôles automatiques de sa ligne sur son média
et son texte exacts (juges, pause générale, plafonds, doublons, chiffres vérifiés, coût nul). Une retouche du texte refait
ces contrôles. Seul le chemin TikTok (clic dans un Chrome visible) exige encore l'accord de Benj sur la version exacte.

## Les huit dossiers

| Dossier | Contenu |
|---|---|
| [voix](voix/README.md) | comment Presti parle : formulations approuvables, mots et formules interdits |
| [offre](offre/README.md) | ce que Presti vend, drapeau par drapeau, et le [registre des promesses](offre/registre-promesses.md) |
| [lignes](lignes/README.md) | les cinq lignes éditoriales L1 à L5 |
| [plateformes](plateformes/README.md) | règles datées de TikTok, Instagram, Facebook, LinkedIn ; licences ; mention IA |
| [audience](audience/README.md) | la cible, les campagnes mesurables, ce qu'on ne collecte jamais |
| [accroches](accroches/README.md) | phrases d'accroche sourcées ou approuvées en séance |
| [communaute](communaute/README.md) | commentaires, messages, groupes : ce qui est permis |
| [mesure](mesure/README.md) | fenêtres H+1, H+24, J+7 et la carte idée → vente |

## Règles qui valent partout

1. **Aucun chiffre sans source.** Une promesse chiffrée renvoie à `plans/promesses.md` ou à `lib/crieur/faits.ts`. Un chiffre de
   cadence ou de format renvoie à son fichier (`scripts/video-qa.mjs`) ou à la source de la fiche, et dit s'il est « déduit,
   à mesurer ».
2. **Aucune donnée personnelle** : ni nom, ni e-mail, ni téléphone, ni visage, ni image de prospect ou d'artisan. Les essais
   emploient des personnes fictives et, pour un e-mail, `@presti-test.invalid`.
3. **Chaîne** : idée, matière autorisée, script et média, contrôle du texte visible (sous-titres incrustés, légende, miniature,
   description), contrôles automatiques de la ligne (juges, pause générale, plafonds, doublons, score de vérité, coût nul : ils
   remplacent l'accord individuel depuis la décision du 30/09, confirmée le 04/10 ; seul le chemin TikTok exige encore une décision
   tant que `scripts/contenu/publier-tiktok.mjs` n'est pas aligné), publication, preuve publique, mesures H+1, H+24, J+7,
   recommandation. Sans preuve ou si un contrôle refuse, le post reste en attente.
4. **Outils gratuits seulement** : Publora Starter, TikTok, Instagram, Facebook sans publicité payante. Aucun achat Windsor.
5. **Laya/Jev est local.** `jev noul --provider laya` reçoit l'affirmation littérale et sa référence de preuve ; une probabilité
   inférieure à 0,5, une preuve absente ou une panne bloquent la publication et renvoient le cas à Benj. `jev score` classe,
   `jev decide` ne sert qu'à un classement ; aucun des deux ne rédige ni n'autorise un envoi. Aucun repli hébergé.
6. **Les règles déterministes priment** sur un score : licence, drapeau, accord, plafond, idempotence.
7. **Les vidéos d'autrui ne sont ni téléchargées ni transcrites** ; TikTok Studio et Creative Center ne sont pas lus par un
   robot. Les données nominatives de veille expirent au plus tard à 30 jours.

## Contrôle

`node scripts/contenu-qa.mjs --partie=connaissance` (juge de 026-204) et, pour le registre des promesses,
`node .orchestre/preuves/026-205/controle-registre.mjs` (témoin vert et témoins rouges, dossier de preuves de cette fiche).
