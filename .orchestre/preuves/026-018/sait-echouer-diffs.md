# La partie « diff » de TA-5 et TL-8 sait échouer

Produit par un script de Claude Code le 2026-09-26T06:14:19Z. La base git de `lib/siteLivraison.ts` d'avant la veille n'existera qu'après 026-024 : on éprouve directement `ajoutTryCatch` (`scripts/fixtures/026-livraison-tresor/commun.mjs`, l'outil que TA-5 et TL-8 appellent), avec pour base la maquette sans son import ni son appel de `veilleTresorerie`, et `dansFonction: 'tourLivraison'`.

| Cas | Attendu | Obtenu | Juste | Premier défaut relevé |
|---|---|---|---|---|
| intacte : un import et un try/catch dans tourLivraison | vert | vert | oui | — |
| appel hors try/catch | rouge | rouge | oui | lignes 83-83 ajoutées hors d'un try/catch : « await veilleTresorerie() » |
| une autre ligne changée | rouge | rouge | oui | ligne 28 de la base retirée ou changée : « return { subject: 'Presti — votre site est en ligne', text: `Bonjour,… » |
| try/catch placé dans commandesEnRetard | rouge | rouge | oui | lignes 74-74 hors du corps de tourLivraison (lignes 77-86) |
| deux try/catch | rouge | rouge | oui | lignes 83-85 : 2 appel(s) à veilleTresorerie(, 1 attendu |
| le catch relance | rouge | rouge | oui | lignes 83-83 : le catch relance (throw) |
| un import de plus | rouge | rouge | oui | import ajouté hors contrat : @/lib/stripe → stripe |
| aucun appel (témoin : exact exigé) | rouge | rouge | oui | 0 bloc(s) ajouté(s), exactement un try/catch autour de veilleTresorerie() attendu |
| NR : aucun ajout | vert | vert | oui | — |
| NR : un try/catch | vert | vert | oui | — |
| NR : une ligne changée | rouge | rouge | oui | ligne 28 de la base retirée ou changée : « return { subject: 'Presti — votre site est en ligne', text: `Bonjour,… » |
| cronsAttendus sur lib/alertes.ts | 4 entrées lisibles | 4 entrée(s), lisibles : true | oui | relances:26, canaux-relever:26, alertes:26, purges-rgpd:26 |

Bilan : 12/12 justes.
