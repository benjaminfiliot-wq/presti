// scripts/fixtures/026-pilotage/a/lot.mjs — la fiche du lot a, lue par scripts/juges-026-pilotage-preuve.mjs --lot=a (026-012).
//
// Contrat de tout lot.mjs du domaine Pilotage (lots a, b, c, s…) : il n'importe RIEN (la preuve en fait des copies sous
// .orchestre/travail/ pour JA-6) et exporte :
//   fiche      l'id de la fiche qui écrit ce lot (^026-[\w-]+$) : la preuve écrit la section du lot dans
//              .orchestre/preuves/<fiche>/echecs-attendus.md ;
//   reference  le commit de référence (HEAD de main relevé au début de la fiche), où aucun module jugé n'existe ;
//   juges      [{ commande, arguments, loader, attendu }] : lancé avec --racine=<référence>, le juge doit sortir en code ≠ 0
//              avec `attendu` (son PREMIER critère) en échec ; lancé avec --temoin sur l'état actuel, en code 0 ;
//   controles  (facultatif) [{ id, module, fonction }] : contrôles propres au lot, `module` relatif au dossier du lot,
//              `fonction(ctx)` → { echecs, detail } ; ctx.lancerNode(args, { nom, env }) lance node depuis la racine du
//              dépôt, sous le piège réseau de la preuve (un NODE_OPTIONS passé dans env s'y ajoute, sans le remplacer) ;
//              ctx.reference est l'arbre de référence extrait (null s'il n'a pas pu l'être) ;
//   absents    (facultatif) les chemins que la référence ne doit pas contenir (défaut : lib/pilotage/,
//              app/controle/Pilotage.tsx, app/controle/station/).
//
// Référence du lot a : le HEAD de main noté par la fiche le 24/09 (4041ec9, « Sécurité : Next.js 15.5.23 → 15.5.26 »). Le
// verrou de la fiche, pris le 25/09, porte 86ce0f3 : ni l'un ni l'autre ne contient lib/pilotage/, app/controle/Pilotage.tsx
// ni app/controle/station/ ; la fiche nomme 4041ec9, c'est lui qui fait foi.
export const fiche = '026-012'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const juges = [
  { commande: 'scripts/pilotage-logique-qa.mjs', arguments: ['--partie=decider'], loader: true, attendu: 'DC-1' },
  { commande: 'scripts/pilotage-logique-qa.mjs', arguments: ['--partie=envois'], loader: true, attendu: 'LE-1' },
  { commande: 'scripts/pilotage-logique-qa.mjs', arguments: ['--partie=agents'], loader: true, attendu: 'AC-1' },
  { commande: 'scripts/pilotage-push-qa.mjs', arguments: [], loader: true, attendu: 'PF-1' },
]
export const controles = [
  { id: 'JA-3', module: './jeux.mjs', fonction: 'controleJeux' },
  { id: 'JA-4', module: './jeux.mjs', fonction: 'controleSecrets' },
  { id: 'JA-6', module: './jeux.mjs', fonction: 'controlePartieLot' },
]
