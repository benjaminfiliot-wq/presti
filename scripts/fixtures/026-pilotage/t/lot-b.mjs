// scripts/fixtures/026-pilotage/t/lot-b.mjs — la partie B du lot t (fiche 026-171), écrite par Claude Code : les deux juges « route »
// (station-reglages-qa, poste-extraction-qa). Claude Code la fusionne dans t/lot.mjs (mêmes entrées : commande, arguments, loader,
// attendu, criteresMin, sabotages ; contrat : a/lot.mjs). Elle se joue seule :
//   node scripts/juges-026-pilotage-preuve.mjs --lot=tb --lot-fichier=scripts/fixtures/026-pilotage/t/lot-b.mjs
// (le nom de lot « tb » écrit sa propre section dans echecs-attendus.md sans toucher à la section « t » de la partie A).
//
// Référence : 1c87006 (le HEAD de main noté par la fiche 026-170, celui du lot k) : elle ne porte ni app/api/controle/station/reglages/
// ni lib/controle/lectures/. Le commit du lot a (4041ec9) n'est pas dans ce clone du cloud (clone superficiel) ; les routes jugées ici
// (barre, etat, audience, securite/bans, clients, cerveaux) et scripts/fermeture-e2e.mjs y sont identiques à HEAD. Les juges reçoivent
// --base=<référence> : « la référence » de la comparaison d'extraction (XT-2) et de la carte de fermeture (RX-6) est ce commit, sur
// lequel le témoin est posé.
//
// Témoin (./temoin, partagé avec la partie A du lot t : ses fichiers sont posés ensemble sur la référence ; les juges de cette partie
// n'y lisent que les leurs et, pour la route des réglages, lib/pilotage/{reglages,theme,disposition}.ts et public/station/themes/ de A) :
//   - app/api/controle/station/reglages/route.ts : GET + PUT, drapeau en première instruction, gardes, validerReglages, 409, journal avant
//     et après, 30 écritures par jour ;
//   - lib/direction/journal.ts : celui de la référence avec le seul ajout de 'station_reglages' à l'union Action (sans lui, le PUT ne type
//     pas : 026-177 n'a pas lib/ dans son périmètre, voir les décisions du rapport de 026-171) ;
//   - lib/controle/lectures/ (une fonction par lecture) et les six routes du Poste adaptées pour les importer, sorties inchangées ;
//   - scripts/fermeture-e2e.mjs : celui de la partie A (la note e-commerce) avec, en plus, la route des réglages dans la ligne 'pilotage'.
export const fiche = '026-171'
export const reference = '1c87006aa35a152cb918ab368225e1976a1328da'
export const temoin = './temoin'
export const absents = ['app/api/controle/station/reglages/', 'lib/controle/lectures/']
const BASE = `--base=${reference}`

const R = 'app/api/controle/station/reglages/route.ts'
const J = 'lib/direction/journal.ts'
const CARTE = 'scripts/fermeture-e2e.mjs'
const C = 'app/api/controle'
const L = 'lib/controle/lectures'
const FAUX_TYPE = "const _faute: number = 'x'\nvoid _faute\n"

export const juges = [
  {
    commande: 'scripts/station-reglages-qa.mjs', arguments: [BASE], loader: false, attendu: 'RX-1', criteresMin: 8,
    sabotages: [
      // RX-1 : le drapeau, première instruction
      { nom: 'put-drapeau-apres-la-garde', fichier: R, avant: "export async function PUT(req: Request) {\n  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n  const f = await estDirection(req)\n", apres: "export async function PUT(req: Request) {\n  const f = await estDirection(req)\n  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", tue: 'RX-1' },
      { nom: 'get-sans-drapeau', fichier: R, avant: "export async function GET(req: Request) {\n  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", apres: 'export async function GET(req: Request) {\n', tue: 'RX-1' },
      // RX-2 : les gardes, les domaines, la forme de la lecture
      { nom: 'put-estfondateur', fichier: R, avant: 'const f = await estDirection(req)', apres: 'const f = await estFondateur(req)', tue: 'RX-2' },
      { nom: 'put-domaine-sante', fichier: R, avant: "exigerDomaine(f, 'reglages', 'ecrire')", apres: "exigerDomaine(f, 'sante', 'ecrire')", tue: 'RX-2' },
      { nom: 'get-verbe-ecrire', fichier: R, avant: "exigerDomaine(f, 'sante', 'voir')", apres: "exigerDomaine(f, 'sante', 'ecrire')", tue: 'RX-2' },
      { nom: 'get-panne-en-500', fichier: R, avant: "'Réglages indisponibles pour l’instant.' }, { status: 503 })", apres: "'Réglages indisponibles pour l’instant.' }, { status: 500 })", tue: 'RX-2' },
      { nom: 'get-sans-date', fichier: R, avant: ', modifie_par: ligne.modifie_par, modifie_le: ligne.modifie_le })', apres: ', modifie_par: ligne.modifie_par })', tue: 'RX-2' },
      // RX-3 : la validation côté serveur
      { nom: 'verdict-ignore', fichier: R, avant: 'const verdict = validerReglages(brut, theme)', apres: 'const verdict = (validerReglages(brut, theme), { ok: true, reglages: brut } as ReturnType<typeof validerReglages>)', tue: 'RX-3' },
      { nom: 'liste-des-cles-retiree', fichier: R, avant: ', clesPermises: verdict.clesPermises }, { status: 400 })', apres: ' }, { status: 400 })', tue: 'RX-3' },
      // RX-4 : version périmée, journal avant et après
      { nom: 'journal-false-ignore', fichier: R, avant: 'if (!avant) return refusJournal()', apres: 'if (!avant && (false as boolean)) return refusJournal()', tue: 'RX-4' },
      { nom: 'journal-apres-l-ecriture', fichier: R, avant: "  const avant = await journaliser({ acteur: f, action: 'station_reglages', cible_type: 'station_reglages', avant: { version } }, req)\n  if (!avant) return refusJournal()\n\n  const w = await supabaseAdmin.rpc('station_reglages_ecrire', { p_reglages: verdict.reglages, p_auteur: f.uid, p_version: version })\n", apres: "  const w = await supabaseAdmin.rpc('station_reglages_ecrire', { p_reglages: verdict.reglages, p_auteur: f.uid, p_version: version })\n  const avant = await journaliser({ acteur: f, action: 'station_reglages', cible_type: 'station_reglages', avant: { version } }, req)\n  if (!avant) return refusJournal()\n", tue: 'RX-4' },
      { nom: 'perimee-en-503', fichier: R, avant: "modifié ailleurs : recharge.' }, { status: 409 })", apres: "modifié ailleurs : recharge.' }, { status: 503 })", tue: 'RX-4' },
      { nom: 'journal-sans-version', fichier: R, avant: "cible_type: 'station_reglages', avant: { version } }, req)", apres: "cible_type: 'station_reglages' }, req)", tue: 'RX-4' },
      // RX-5 : 30 écritures par jour
      { nom: 'plafond-31', fichier: R, avant: 'const ECRITURES_PAR_JOUR = 30', apres: 'const ECRITURES_PAR_JOUR = 31', tue: 'RX-5' },
      { nom: 'compteur-par-appel', fichier: R, avant: '`station_reglages:${f.uid}:${FORMAT_JOUR.format(new Date())}`', apres: '`station_reglages:${f.uid}:${FORMAT_JOUR.format(new Date())}:${Math.random()}`', tue: 'RX-5' },
      // RX-6 : la carte de fermeture-e2e
      { nom: 'carte-sans-la-route', fichier: CARTE, avant: ", '" + R + "'],", apres: '],', tue: 'RX-6' },
      { nom: 'carte-ligne-en-trop', fichier: CARTE, avant: '  const CARTE = {\n', apres: "  const CARTE = {\n    'pilotage2': ['note', 'une ligne de plus que la fiche n\\'autorise pas'],\n", tue: 'RX-6' },
      // RX-7 : aucune écriture hors des fonctions SQL
      { nom: 'ecriture-directe', fichier: R, avant: "  const w = await supabaseAdmin.rpc('station_reglages_ecrire',", apres: "  await supabaseAdmin.from('station_reglages').upsert({ cle: 1 })\n  const w = await supabaseAdmin.rpc('station_reglages_ecrire',", tue: 'RX-7' },
      // RX-8 : le typage
      { nom: 'type-faux-dans-la-route', fichier: R, avant: 'const TAILLE_MAX = 65536 // 64 Ko', apres: "const TAILLE_MAX: number = '65536' // 64 Ko", tue: 'RX-8' },
      { nom: 'action-absente-de-l-union', fichier: J, avant: "  | 'station_reglages'\n", apres: '', tue: 'RX-8' },
      // le premier critère : la route retirée
      { nom: 'route-retiree', fichier: R, retirer: true, tue: 'RX-1' },
    ],
  },
  {
    commande: 'scripts/poste-extraction-qa.mjs', arguments: [BASE], loader: false, attendu: 'XT-1', criteresMin: 5,
    sabotages: [
      // XT-1 : les lectures, les routes qui les importent
      { nom: 'index-des-lectures-retire', fichier: `${L}/index.ts`, retirer: true, tue: 'XT-1' },
      { nom: 'route-recalcule-les-crons', fichier: `${C}/etat/route.ts`, avant: 'const ia = () => sourcer(', apres: "const _recalcul = () => supabaseAdmin.from('passages_cron').select('nom')\nvoid _recalcul\nconst ia = () => sourcer(", tue: 'XT-1' },
      // XT-2 : sorties inchangées, champ par champ
      { nom: 'barre-ordre-des-cles', fichier: `${C}/barre/route.ts`, avant: '    role: f.role,\n    roleInterne: f.roleInterne,\n', apres: '    roleInterne: f.roleInterne,\n    role: f.role,\n', tue: 'XT-2' },
      { nom: 'clients-un-credit-de-plus', fichier: `${L}/clients.ts`, avant: 'credits: a.credits, inscrit_le: a.created_at,', apres: 'credits: a.credits + 1, inscrit_le: a.created_at,', tue: 'XT-2' },
      { nom: 'audience-historique-inversee', fichier: `${L}/audience.ts`, avant: "periode === 'historique'", apres: "periode !== 'historique'", tue: 'XT-2' },
      { nom: 'bans-quatre-cents-abus', fichier: `${L}/bans.ts`, avant: '.limit(500)', apres: '.limit(400)', tue: 'XT-2' },
      { nom: 'cerveaux-premiere-entree', fichier: `${L}/cerveaux.ts`, avant: '.at(-1)', apres: '.at(0)', tue: 'XT-2' },
      { nom: 'crons-seuil-cent-fois', fichier: `${L}/crons.ts`, avant: 'age > c.maxHeures', apres: 'age > c.maxHeures * 100', tue: 'XT-2' },
      { nom: 'sante-sans-accent', fichier: `${L}/sante.ts`, avant: '`${verts} contrôles verts`', apres: '`${verts} controles verts`', tue: 'XT-2' },
      // XT-3 : un nombre, jamais un contenu
      { nom: 'tickets-le-sujet', fichier: `${L}/tickets.ts`, avant: ".select('id', { count: 'exact', head: true })", apres: ".select('id, sujet', { count: 'exact', head: true })", tue: 'XT-3' },
      { nom: 'tickets-les-fermes', fichier: `${L}/tickets.ts`, avant: ".is('ferme_le', null)", apres: ".not('ferme_le', 'is', null)", tue: 'XT-3' },
      { nom: 'tickets-toutes-les-colonnes', fichier: `${L}/tickets.ts`, avant: ".select('id', {", apres: ".select('*', {", tue: 'XT-3' },
      // XT-4 : chaque route garde sa lecture de drapeau
      { nom: 'audience-sans-drapeau', fichier: `${C}/audience/route.ts`, avant: "  if (!actif('audience')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", apres: '', tue: 'XT-4' },
      { nom: 'clients-ne-lit-plus-apports', fichier: `${C}/clients/route.ts`, avant: 'await clients({ q, offre: filtre, apports: actif(\'apports\') })', apres: 'await clients({ q, offre: filtre })', tue: 'XT-4' },
      // XT-5 : le typage
      { nom: 'type-faux-dans-une-lecture', fichier: `${L}/sante.ts`, avant: "type Etat = 'ok' | 'degrade' | 'incident'\n", apres: `type Etat = 'ok' | 'degrade' | 'incident'\n${FAUX_TYPE}`, tue: 'XT-5' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles-b.mjs', fonction: 'controleJeuxB' },
]
