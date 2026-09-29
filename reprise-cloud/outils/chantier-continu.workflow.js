// chantier-continu.workflow.js — la boucle de chantier du PC (28/09/2026), adaptée à une session CLOUD (29/09/2026).
// Original : ~/.claude/projects/…/workflows/scripts/chantier-continu-wf_3972e532-8c3.js (hors dépôt, chemins Windows).
// Lancement, dans une session cloud où l'outil Workflow existe :   Workflow({ scriptPath: 'reprise-cloud/outils/chantier-continu.workflow.js' })
// Si l'outil Workflow n'existe pas dans la session : faire la même chose à la main, une fiche à la fois (LISEZ-MOI-D-ABORD.md, « La boucle de chantier »).
//
// Ce qui change par rapport au PC :
//  - plus de missions « À RELIRE » ni « À DÉCIDER » : .orchestre/a-relire/ et a-decider/ ne sont jamais commités (le moteur du PC les garde en local) ;
//  - la liste des fiches se calcule par reprise-cloud/outils/etat.mjs (déterministe, pas d'estimation d'un agent) ;
//  - commits par commit-fiche-cloud.sh : branche de la session, jamais main, ni digest.md ni verdicts.jsonl ;
//  - contre-vérification : pas de revue-codex (l'usine est hors de portée) → 4 sabotages faits par l'agent lui-même ;
//  - au plus 3 fiches en parallèle (VM du cloud : 4 vCPU, 16 Go) et 4 tours (chaque tour consomme la même limite que le PC).
export const meta = {
  name: 'chantier-continu-cloud',
  description: 'Boucle de chantier cloud : fiches prêtes réservées à Claude et faisables sans usine ni secret, contre-vérification par sabotages, commits sur la branche de la session ; jusqu\'à épuisement',
  phases: [{ title: 'Liste' }, { title: 'Fiches' }],
}
const P = `Dépôt : le répertoire courant (racine du clone presti d'une session cloud, sur une branche claude/…). Réponds en français, concis. Tu es un délégué de Claude Code (chef de l'écosystème Presti) ; Benj veut finir la série 026 au plus vite en économisant la limite de Claude. LIS D'ABORD reprise-cloud/LISEZ-MOI-D-ABORD.md (règles absolues, décisions de Benj en vigueur, protocole des migrations). Règles : commits UNIQUEMENT par \`bash reprise-cloud/outils/commit-fiche-cloud.sh <id> "<résumé>"\` après \`node scripts/orchestre.mjs verifier <id>\` vert (il pousse la branche de la session, jamais main ; la session du PC fusionne) ; jamais git reset/clean/stash/checkout/restore/push --force ; jamais de secret affiché ni écrit ; une fausse clé de test contient « sentinelle », « temoin », « essai » ou « factice », ou s'assemble à l'exécution ; ne modifie jamais scripts/orchestre.mjs (copie d'un outil hors dépôt) ; process.exitCode, jamais process.exit() en fin de script ; JAMAIS npm install (npm ci a déjà été fait par l'environnement) ; aucun envoi réel, achat, création de compte, publication ; le cloud n'a ni l'usine (pas de scripts/usine.mjs, pas de Codex), ni .env.local, ni le coffre SaaS : une fiche qui l'exige est laissée au PC (dis-le dans bloques). Décisions de Benj en vigueur : juges croisés (aucune IA ne juge son propre travail ; un juge rédigé par une autre IA est relu et attaqué par Claude) ; NE PAS toucher /p/[slug] ; Next 16 oui (fiche 026-006, seulement dans ce clone isolé et par une PR dédiée) ; les migrations sont appliquées par le chef selon le protocole (essai à sec, contre-vérification, apply_migration par le connecteur Supabase s'il est actif dans la session, md5 des fonctions = fichier avec reprise-cloud/outils/md5-migration.mjs, contrôle tout à « oui », juge --reel si la clé est présente, zéro trace, preuve application-*.md) — un agent de cette boucle ne les applique JAMAIS lui-même, il rend PRET_A_APPLIQUER ; Benj a délégué ses gestes au chef SAUF : envoi à un client ou un prospect, publication, dépense, création de compte, réglage de sécurité de son PC, et tout texte juridique nouveau (celui-là : décris-le et arrête-toi).`
const LISTE = { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } }, required: ['ids', 'note'] }
const FAIT = { type: 'object', properties: { commits: { type: 'array', items: { type: 'string' } }, bloques: { type: 'array', items: { type: 'string' } }, pour_claude: { type: 'string' } }, required: ['commits', 'bloques', 'pour_claude'] }

let tour = 0, secs = 0
const bilan = []
while (tour < 4 && secs < 2) {
  tour++
  phase('Liste')
  const liste = await agent(`${P}\n\nLISTE (tour ${tour}) : lance \`git fetch origin --prune\` puis \`node reprise-cloud/outils/etat.mjs --pretes\`. Reprends les ids de la section « FAISABLES DANS LE CLOUD », dans l'ordre affiché (les plus bloquantes d'abord), et retire ceux pour lesquels une branche distante existe déjà (\`git ls-remote --heads origin 'claude/*'\` cite l'id : une autre session cloud ou le PC l'a prise). Rends au plus 3 ids. Si la section est vide, rends une liste vide et une note qui dit pourquoi (les fiches prêtes, s'il y en a, restent au PC).`, { label: `liste-${tour}`, phase: 'Liste', schema: LISTE, model: 'haiku' })
  const ids = (liste && liste.ids) || []
  phase('Fiches')
  const prod = await parallel(ids.map((id) => () => agent(`${P}\n\nFICHE ${id} (réservée à Claude : mise en service, recette, épreuve, juge ou autre). Lis .orchestre/brouillons-ecosysteme/026/${id}.md EN ENTIER. Procédure : \`node scripts/orchestre.mjs valider .orchestre/brouillons-ecosysteme/026/${id}.md\`, copie en .orchestre/file/${id}.md si absente, \`node scripts/orchestre.mjs prochaine --agent=claude-code --tache=${id}\` ; produis exactement ce que dit la fiche ; si elle exige un geste réservé à Benj (voir les exceptions ci-dessus), fais tout le reste, décris le geste précisément et rends-le dans bloques. Puis fait/, \`node scripts/orchestre.mjs verifier ${id}\` vert ; contre-vérification (pas de Codex ici) : au moins 4 sabotages de ce que ta production fait, chacun doit rougir le bon critère du juge, restauration exacte (sha256 avant/après), et le juge doit rester vert après ; note-les dans .orchestre/preuves/${id}/contre-verif-cloud.md ; puis \`bash reprise-cloud/outils/commit-fiche-cloud.sh ${id} "<résumé>"\`.`, { label: `fiche-${id}`, phase: 'Fiches', schema: FAIT, model: 'sonnet' })))
  const commits = prod.filter(Boolean).flatMap((x) => x.commits || [])
  bilan.push({ tour, ids, commits, bloques: prod.filter(Boolean).flatMap((x) => x.bloques || []), pour_claude: prod.filter(Boolean).map((x) => x.pour_claude).filter(Boolean), note_liste: liste && liste.note })
  log(`tour ${tour} : ${commits.length} commit(s), ${ids.length} fiche(s) Claude`)
  secs = commits.length === 0 && ids.length === 0 ? secs + 1 : 0
}
return bilan
