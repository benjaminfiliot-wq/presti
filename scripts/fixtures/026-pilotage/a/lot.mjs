// scripts/fixtures/026-pilotage/a/lot.mjs — la fiche du lot a, lue par scripts/juges-026-pilotage-preuve.mjs --lot=a (026-012).
//
// Contrat de tout lot.mjs du domaine Pilotage (lots a, b, c, s, p…) : il n'importe RIEN (la preuve en fait des copies sous
// .orchestre/travail/ pour JA-6) et exporte :
//   fiche      l'id de la fiche qui écrit ce lot (^026-[\w-]+$) : la preuve écrit la section du lot dans
//              .orchestre/preuves/<fiche>/echecs-attendus.md ;
//   reference  le commit de référence (HEAD de main relevé au début de la fiche), où aucun module jugé n'existe ;
//   temoin     le dossier (relatif à celui du lot) de l'IMPLÉMENTATION DE RÉFÉRENCE : les chemins du dépôt, chaque fichier
//              suffixé .temoin (lib/pilotage/liens.ts → temoin/lib/pilotage/liens.ts.temoin : ni tsc ni aucun outil du dépôt
//              ne le prend pour du code). La preuve pose ces fichiers sur l'arbre de référence (JA-7) ; chaque juge, lancé
//              avec --racine=<cet arbre>, doit y rendre 0, sans aucune ligne ❌. Le témoin doit apporter au moins un des
//              chemins `absents`, et aucun de ses fichiers n'a 0 octet ;
//   juges      [{ commande, arguments, loader, attendu, criteresMin, sabotages, tailleMin? }] :
//              · lancé avec --racine=<référence>, le juge sort en code ≠ 0 avec `attendu` (son PREMIER critère) en échec
//                (JA-1) ; lancé avec --temoin sur l'état actuel, en code 0 (JA-2) ;
//              · criteresMin (entier ≥ 3) : critères verts DISTINCTS exigés sur le témoin (JA-9) ; tailleMin (facultatif) :
//                octets de code du juge, commentaires ôtés, au-delà du plancher de la preuve (JA-9) ;
//              · sabotages [{ nom, fichier, avant, apres, tue } | { nom, fichier, retirer: true, tue }] : `fichier` est un
//                chemin du témoin ; `avant` y figure exactement une fois et devient `apres` (ou le fichier est retiré). Sur le
//                témoin ainsi saboté, le juge doit sortir en code 1 (ou 2) avec « ❌ <tue> » (JA-8), et les sabotages dont le
//                premier critère reste vert doivent tuer au moins deux critères distincts : un juge qui ne regarde que la
//                présence des fichiers ne passe pas ;
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
//
// Témoin du lot a (27/09, durcissement de la preuve après 026-066) : les modules de 026-014, 026-015 et 026-017 tels que HEAD
// les porte (acceptés par ces juges), et une implémentation de référence de 026-051 écrite par Claude Code
// (lib/pilotage/notifications.ts, lib/push.ts et lib/alertes.ts de HEAD avec leurs seuls AJOUTS), qui n'est pas le module
// livré : elle prouve seulement que pilotage-push-qa sait rendre 0.
export const fiche = '026-012'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const temoin = './temoin'
const AP = 'lib/pilotage/appels.ts', DE = 'lib/pilotage/decisions.ts', LI = 'lib/pilotage/liens.ts'
const EV = 'lib/pilotage/envois.ts', EN = 'lib/pilotage/entonnoir.ts', AG = 'lib/pilotage/agents.ts', CO = 'lib/pilotage/code.ts'
const NO = 'lib/pilotage/notifications.ts', PU = 'lib/push.ts', AL = 'lib/alertes.ts'
export const juges = [
  {
    commande: 'scripts/pilotage-logique-qa.mjs', arguments: ['--partie=decider'], loader: true, attendu: 'DC-1', criteresMin: 11,
    sabotages: [
      { nom: 'lientel-indicatif', fichier: AP, avant: '`+33${chiffres.slice(1)}`', apres: '`+34${chiffres.slice(1)}`', tue: 'DC-6' },
      { nom: 'heures-arrondies', fichier: DE, avant: 'Math.floor(minutes / 60)', apres: 'Math.round(minutes / 60)', tue: 'DC-4' },
      { nom: 'blocs-sans-code', fichier: LI, avant: "'agents', 'code'] as const", apres: "'agents'] as const", tue: 'DC-8' },
      { nom: 'fusion-douze', fichier: AP, avant: '.slice(0, 10)', apres: '.slice(0, 12)', tue: 'DC-7' },
      { nom: 'decisions-retire', fichier: DE, retirer: true, tue: 'DC-1' },
    ],
  },
  {
    commande: 'scripts/pilotage-logique-qa.mjs', arguments: ['--partie=envois'], loader: true, attendu: 'LE-1', criteresMin: 9,
    sabotages: [
      { nom: 'sante-echecs-strict', fichier: EV, avant: 'c.echecs_affilee >= SEUILS_SANTE.echecsAffilee', apres: 'c.echecs_affilee > SEUILS_SANTE.echecsAffilee', tue: 'LE-5' },
      { nom: 'alerte-a-301', fichier: EN, avant: 'contacts >= 300 && reponses === 0', apres: 'contacts > 300 && reponses === 0', tue: 'LE-7' },
      { nom: 'bilan-mois-jour', fichier: EN, avant: '`bilan du ${bilan_le.slice(8, 10)}/${bilan_le.slice(5, 7)}`', apres: '`bilan du ${bilan_le.slice(5, 7)}/${bilan_le.slice(8, 10)}`', tue: 'LE-8' },
      { nom: 'compteur-texte', fichier: EV, avant: '`${utilises} / plafond non réglé`', apres: '`${utilises} / plafond à régler`', tue: 'LE-4' },
    ],
  },
  {
    commande: 'scripts/pilotage-logique-qa.mjs', arguments: ['--partie=agents'], loader: true, attendu: 'AC-1', criteresMin: 8,
    sabotages: [
      { nom: 'muet-trois-periodes', fichier: AG, avant: "else if (age > 2 * periode) etat = 'muet'", apres: "else if (age > 3 * periode) etat = 'muet'", tue: 'AC-2' },
      { nom: 'priorite-inversee', fichier: AG, avant: "const PRIORITE: EtatAgent[] = ['panne', 'disjoncteur',", apres: "const PRIORITE: EtatAgent[] = ['disjoncteur', 'panne',", tue: 'AC-3' },
      { nom: 'attention-huit', fichier: CO, avant: '!liste(x.attention, 7, texte)', apres: '!liste(x.attention, 8, texte)', tue: 'AC-4' },
    ],
  },
  {
    commande: 'scripts/pilotage-push-qa.mjs', arguments: [], loader: true, attendu: 'PF-1', criteresMin: 10,
    sabotages: [
      { nom: 'motifs-sans-digest', fichier: NO, avant: "'coupe_circuit', 'digest'] as const", apres: "'coupe_circuit'] as const", tue: 'PF-2' },
      { nom: 'aucun-fondateur-muet', fichier: PU, avant: "if (!ids.length) return { envoyes: 0, raison: 'aucun_fondateur' }", apres: 'if (!ids.length) return { envoyes: 0 }', tue: 'PF-4' },
      { nom: 'demo-comprise', fichier: PU, avant: ".eq('est_demo', false)", apres: '', tue: 'PF-5' },
      { nom: 'push-attendu', fichier: AL, avant: '&& chargeF) envoyerPushFondateurs(chargeF)', apres: '&& chargeF) await envoyerPushFondateurs(chargeF)', tue: 'PF-7' },
    ],
  },
]
export const controles = [
  { id: 'JA-3', module: './jeux.mjs', fonction: 'controleJeux' },
  { id: 'JA-4', module: './jeux.mjs', fonction: 'controleSecrets' },
  { id: 'JA-6', module: './jeux.mjs', fonction: 'controlePartieLot' },
]
