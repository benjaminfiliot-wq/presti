// scripts/station-logique-qa.mjs — le juge hors ligne de la logique de la station (fiche 026-070), écrit en 026-067 par
// Claude Code AVANT les modules qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules [--racine=<d>] [--temoin] [--base=<c>]
//
// Critères de 026-070 (cahier du juge) : SM-1, BA-1 à BA-4, EQ-1 à EQ-6, AT-1 à AT-5, FI-1 à FI-4, TA-1, TA-2, MI-1 à MI-3,
// XP-1, SM-2. Les sept modules de <racine>/lib/pilotage/ (barre, equipage, attention, fil, tapis, missions, experience) sont
// importés par ts-loader, à un instant figé (celui de s/agents.json), fuseau du processus forcé à UTC : un module qui lirait
// l'heure locale au lieu de l'heure de Paris échoue ici comme sur Vercel et sur l'usine.
//   --racine=<d>  juge l'arbre <d> (référence, témoin, sabotage) : `@/x` se résout sous <d> (crochet du lot s), jamais sous le
//                 dépôt. `npm run typecheck` ne tourne que sur la racine réelle (sans --racine ni --temoin), dans SM-2.
//   --temoin      pose le témoin du lot s (s/temoin/) sur lib/ du commit --base (défaut HEAD), juge cet arbre, et ajoute
//                 SM-JEUX, l'auto-contrôle des jeux d'essai de s/ dont ce juge se sert.
//
// Le contrat que ce juge FIXE là où 026-070 le laisse ouvert (lu par l'exécutant dans les lignes ❌) :
//   · positions(agents, evenements) : agents = [{ nom, etat }] (etat d'etatAgent, lib/pilotage/agents.ts) → objet
//     { <nom>: { salle, motif } } ; les événements se lisent par id croissant ;
//   · etatInitial(agents) → un état dont `positions` est celui de positions(agents, []) ; appliquerEvenement(etat, evenement)
//     → un NOUVEL état (l'entrée n'est jamais modifiée) ; le repli de appliquerEvenement sur une liste (par id croissant)
//     donne les mêmes `positions` que positions(agents, liste) ;
//   · cartesAttention(sources, maintenant) : sources = { <motif>: { nombre, depuis?, agent?, rdv? } | null } ; une source
//     nulle ou de nombre 0 ne fait pas de carte ; titreCarte(cle, source) est la seule fonction qui écrit un titre ;
//   · barre(entree, maintenant) : entree = { cartes, chef: { prochain_le, modele }, cycles, reunion: { jour, statut },
//     quotas: { claude5h, claudeSemaine, codex5h }, compteurs: [{ canal, palier, plafond, utilises }], palier, experience,
//     pause: { active }, attention: { total }, lancement } ; clés des compteurs : agents, chef, modele_chef, cycles, reunion,
//     quota_claude, quota_codex, envois, puis experience ;
//   · tapis(lignes) : lignes = [{ etape, jour, taux_pass? }] (l'étape `rejet` porte le rejet) ; lignes(entree) → { contenu,
//     sites, packs }, chacune { etapes } comme tapis() ; mouvements(avant, apres) → [{ etape, carres }] ou { remiseAZero: true } ;
//   · commandement({ mesures, objectif, compteRendu, bilan: { bilan_le, verdict }, succesDates }) ; palierSalle(cle,
//     { palier, sites_en_ligne, niveau }) ; etatExperience(ligne de station_experience_etat(), maintenant).
// Sortie « ✅ ID … » / « ❌ ID … », puis « station-logique-qa --partie=modules : PASS|FAIL ». Code 0, 1, ou 2 (appel
// invalide). Un module absent fait échouer SM-1, premier critère, avec son identifiant. Hors ligne : aucune base, aucun
// réseau ; écriture seulement sous .orchestre/travail/station-logique-qa/ ; ne lit ni .env.local ni presti-secrets.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { R, LOADER, lireOptions, creerSortie, importsDe, exportsNommes, sansCommentaires, gelerProfond, valeursInterdites, typecheck, premiereLigne, court } from './fixtures/026-pilotage/a/commun.mjs'
import { commitBase } from './fixtures/026-pilotage/b/commun.mjs'
import {
  jeuS, arbreTemoinS, CROCHET, urlDossier, alea, chaines, esp, sansAccents, canon, egal, lireRacine,
  SALLES_ATTENDUES, CLES_SALLES, CLES_SALLE_ATTENDUES, EQUIPAGE_ATTENDU, RESERVEE, VIDE_ATTENTION,
} from './fixtures/026-pilotage/s/commun.mjs'

const JUGE = 'station-logique-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.valeurs.partie !== 'modules') refuser(`--partie=modules attendue (reçu : ${o.valeurs.partie ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
let RAC = o.racine, TEMOIN = null
if (o.temoin) {
  let base
  try { base = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }
  try { TEMOIN = arbreTemoinS(JUGE, { base, chemins: ['lib'] }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a))) await import(pathToFileURL(LOADER).href)
register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: urlDossier(RAC), depot: urlDossier(R), doublures: '', doubles: {}, prefixes: {}, paquets: {} } })
const VIVANT = !o.valeurs.racine && !o.temoin

const NOM = `${JUGE} --partie=modules`
const MODULES = ['barre', 'equipage', 'attention', 'fil', 'tapis', 'missions', 'experience']
const IDS = ['SM-1', 'BA-1', 'BA-2', 'BA-3', 'BA-4', 'EQ-1', 'EQ-2', 'EQ-3', 'EQ-4', 'EQ-5', 'EQ-6', 'AT-1', 'AT-2', 'AT-3', 'AT-4', 'AT-5', 'FI-1', 'FI-2', 'FI-3', 'FI-4', 'TA-1', 'TA-2', 'MI-1', 'MI-2', 'MI-3', 'XP-1', 'SM-2', ...(o.temoin ? ['SM-JEUX'] : [])]
const S = creerSortie(NOM, [...IDS], `${NOM} — racine ${RAC}${TEMOIN ? ' — témoin du lot s posé sur lib/ du commit de base' : ''}${VIVANT ? ' — racine réelle : typecheck compris' : ''}`)
const MIN = 60_000, H = 60 * MIN, J = 24 * H
const T = (x) => new Date(x).getTime()
const decaler = (d, ms) => new Date(T(d) + ms)
const JEU_A = jeuS('agents.json'), JEU_E = jeuS('evenements.json')
const M = new Date(JEU_A.maintenant)
const AGENTS = JEU_A.agents, EVTS = JEU_E.evenements, PIEGES = JEU_E.pieges
const GRAINE = 20261023
const src = Object.fromEntries(MODULES.map((m) => [m, lireRacine(RAC, `lib/pilotage/${m}.ts`)]))
const code = Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v === null ? null : sansCommentaires(v)]))
const fn = (mod, nom, fichier) => { if (typeof mod?.[nom] !== 'function') throw new Error(`export ${nom} absent de lib/pilotage/${fichier}.ts (ou pas une fonction)`); return mod[nom] }
const val = (mod, nom, fichier) => { if (mod?.[nom] === undefined) throw new Error(`export ${nom} absent de lib/pilotage/${fichier}.ts`); return mod[nom] }
const vers = (x) => (x && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Map) ? x : x instanceof Map ? Object.fromEntries(x) : null)

// ── SM-1 : les sept modules existent, n'importent rien hors de lib/pilotage/, ni horloge ni hasard ───────────────────────
const mods = {}
await S.critere('SM-1', async () => {
  const e = []
  for (const m of MODULES) {
    if (src[m] === null) { e.push(`lib/pilotage/${m}.ts absent`); continue }
    for (const i of importsDe(src[m])) {
      const s = i.spec ?? '(dynamique)'
      const permis = i.type || (i.genre !== 'dynamique' && i.genre !== 'require' && (/^\.\/[\w-]+$/.test(s) || /^@\/lib\/pilotage\/[\w-]+$/.test(s) || (m === 'equipage' && s === '@/lib/agents/moteurs')))
      if (!permis) e.push(`${m}.ts importe ${s} (${i.genre}) : rien hors de lib/pilotage/ (seul equipage.ts lit @/lib/agents/moteurs)`)
    }
    const c = code[m]
    for (const [re, quoi] of [[/\bDate\.now\s*\(/, 'Date.now('], [/\bnew\s+Date\s*\(\s*\)/, 'new Date()'], [/\bMath\.random\b/, 'Math.random'], [/\bfetch\s*\(/, 'fetch('], [/\bprocess\./, 'process.'], [/supabaseAdmin/, 'supabaseAdmin']]) if (re.test(c)) e.push(`${m}.ts contient ${quoi}`)
  }
  if (!e.length) {
    for (const m of MODULES) {
      try { mods[m] = await import(pathToFileURL(path.join(RAC, 'lib', 'pilotage', `${m}.ts`)).href) } catch (err) { e.push(`${m}.ts ne s'importe pas : ${premiereLigne(err)}`) }
    }
  }
  return { echecs: e, detail: `sept modules présents et importés par ts-loader (${MODULES.join(', ')}) ; imports limités à lib/pilotage/ (et @/lib/agents/moteurs pour equipage.ts) ; ni Date.now(, ni new Date(), ni Math.random, ni fetch(` }
})
if (S.enEchec('SM-1')) { S.nonJuges(IDS, 'SM-1 en échec (modules absents ou fautifs)'); process.exit(S.finir()) }
const { barre: BA, equipage: EQ, attention: AT, fil: FI, tapis: TA, missions: MI, experience: XP } = mods
const cartesDuJeu = () => fn(EQ, 'equipage', 'equipage')(structuredClone(AGENTS), structuredClone(EVTS), M)

// ── BA : la barre ────────────────────────────────────────────────────────────────────────────────────────────────────────
await S.critere('BA-1', () => {
  const e = [], car = fn(BA, 'compteARebours', 'barre'), hp = fn(BA, 'heureParis', 'barre')
  for (const [ms, attendu] of [[97 * MIN, '1 h 37'], [12 * MIN, '12 min'], [30_000, 'maintenant'], [-5 * MIN, 'en retard de 5 min']]) {
    const r = car(decaler(M, ms), M)
    if (esp(r) !== attendu) e.push(`compteARebours(${ms / MIN} min) = « ${r} », « ${attendu} » attendu`)
  }
  if (car(null, M) !== '—') e.push(`compteARebours(null) = « ${car(null, M)} », « — » attendu`)
  for (const [x, attendu] of [['2026-10-25T01:30:00Z', '02:30'], ['2026-10-24T22:30:00Z', '00:30']]) { const r = hp(new Date(x)); if (r !== attendu) e.push(`heureParis(${x}) = « ${r} », « ${attendu} » attendu`) }
  return { echecs: e, detail: '97 min → « 1 h 37 », 12 min, 30 s → « maintenant », −5 min → « en retard de 5 min », null → « — » ; heureParis juste de part et d’autre du changement d’heure du 25/10' }
})
await S.critere('BA-2', () => {
  const e = [], pr = fn(BA, 'prochaineReunion', 'barre'), car = fn(BA, 'compteARebours', 'barre')
  const cas = [
    ['17 h 59 sans réunion', '2026-09-28T15:59:00Z', null, '2026-09-28T16:00:00Z'],
    ['18 h 05 sans réunion', '2026-09-28T16:05:00Z', null, '2026-09-28T16:00:00Z'],
    ['réunion ouverte aujourd’hui', '2026-09-28T16:05:00Z', { jour: '2026-09-28', statut: 'ouverte' }, '2026-09-28T16:00:00Z'],
    ['réunion close aujourd’hui', '2026-09-28T16:05:00Z', { jour: '2026-09-28', statut: 'close' }, '2026-09-29T16:00:00Z'],
    ['réunion abandonnée aujourd’hui', '2026-09-28T10:00:00Z', { jour: '2026-09-28', statut: 'abandonnee' }, '2026-09-29T16:00:00Z'],
    ['réunion close hier', '2026-09-28T10:00:00Z', { jour: '2026-09-27', statut: 'close' }, '2026-09-28T16:00:00Z'],
    ['24/10 à 19 h, réunion close (heure d’hiver le lendemain)', '2026-10-24T17:00:00Z', { jour: '2026-10-24', statut: 'close' }, '2026-10-25T17:00:00Z'],
  ]
  for (const [quoi, m, d, attendu] of cas) {
    const r = pr(new Date(m), d)
    if (!Number.isFinite(T(r)) || T(r) !== T(attendu)) e.push(`${quoi} : ${Number.isFinite(T(r)) ? new Date(r).toISOString() : String(r)}, ${attendu} attendu`)
  }
  const a = new Date('2026-09-28T16:05:00Z')
  const retard = car(pr(a, null), a)
  if (esp(retard) !== 'en retard de 5 min') e.push(`à 18 h 05 sans réunion, compte à rebours « ${retard} », « en retard de 5 min » attendu`)
  return { echecs: e, detail: `${cas.length} cas : aujourd’hui 18 h tant qu’aucune réunion n’est close ni abandonnée ce jour-là, sinon demain 18 h ; 25/10 à 17:00Z (heure d’hiver) ; « en retard de 5 min » à 18 h 05` }
})
const ENTREE = (x = {}) => ({
  cartes: cartesDuJeu(), chef: { prochain_le: AGENTS.find((a) => a.nom === 'chef').prochain_le, modele: 'gpt-6-sol' }, cycles: 7,
  reunion: { jour: '2026-10-23', statut: 'close' }, quotas: { claude5h: 0.63, claudeSemaine: 0.4, codex5h: null },
  compteurs: [{ canal: 'formulaire_site', palier: 'P2', plafond: 20, utilises: 12 }, { canal: 'email_sollicite', palier: null, plafond: null, utilises: 1 }],
  palier: 'P2', experience: { statut: 'en_cours', jour: 6, gains_eur: 0, ventes: 1, budget_eur: 0, titre: 'Expérience du Témoin' },
  pause: { active: false }, attention: { total: 9 }, lancement: '2026-10-12', ...x,
})
const CLES_BARRE = ['agents', 'chef', 'modele_chef', 'cycles', 'reunion', 'quota_claude', 'quota_codex', 'envois', 'experience']
const FERME = '— · formulaire fermé (12/10 au plus tôt)'
await S.critere('BA-3', () => {
  const e = [], barre = fn(BA, 'barre', 'barre'), aa = fn(BA, 'agentsActifs', 'barre'), q = fn(BA, 'quota', 'barre'), eb = fn(BA, 'envoisBarre', 'barre')
  const b = barre(ENTREE(), M)
  const cles = (b?.compteurs ?? []).map((c) => c.cle)
  if (canon(cles) !== canon(CLES_BARRE)) e.push(`clés des compteurs ${cles.join(', ')}, ${CLES_BARRE.join(', ')} attendues (expérience en cours)`)
  for (const c of b?.compteurs ?? []) if (!c || typeof c.libelle !== 'string' || !c.libelle || typeof c.texte !== 'string' || !['alerte', 'normal', 'muet'].includes(c.ton) || typeof c.source !== 'string' || !c.source) e.push(`compteur ${c?.cle} mal formé : { cle, libelle, texte, ton, source } attendu`)
  const cartes = cartesDuJeu()
  const texteAA = aa(cartes)?.texte
  const agents = b?.compteurs?.find((c) => c.cle === 'agents')
  if (texteAA !== 'AGENTS 12/15 ACTIFS') e.push(`agentsActifs(equipage(jeu)) = « ${texteAA} », « AGENTS 12/15 ACTIFS » attendu`)
  if (agents?.texte !== texteAA) e.push(`AGENTS ACTIFS de la barre « ${agents?.texte} » ≠ agentsActifs « ${texteAA} » (un seul calcul)`)
  for (const statut of [null, 'arretee', 'gagnante', 'arretee_auto']) { const x = barre(ENTREE({ experience: { statut, jour: 30, gains_eur: 0, ventes: 1 } }), M); if (x.compteurs.some((c) => c.cle === 'experience')) e.push(`EXPÉRIENCE présente avec une expérience « ${statut} »`) }
  const r0 = q(null), r1 = q(0.76), r2 = q(0.63), r3 = q(undefined)
  if (r0.texte !== 'non mesuré' || r0.ton !== 'muet' || r3.texte !== 'non mesuré') e.push(`quota(null) = ${JSON.stringify(r0)}, « non mesuré » muet attendu`)
  if (r1.ton !== 'alerte') e.push(`quota(0,76).ton = ${r1.ton}, alerte attendu`)
  if (esp(r2.texte) !== '63 %' || r2.ton !== 'normal') e.push(`quota(0,63) = ${JSON.stringify(r2)}, « 63 % » normal attendu`)
  const codex = b?.compteurs?.find((c) => c.cle === 'quota_codex')
  if (codex?.texte !== 'non mesuré' || /0\s*%/.test(codex?.texte ?? '')) e.push(`QUOTA CODEX d’une source nulle « ${codex?.texte} », « non mesuré » attendu (jamais « 0 % »)`)
  const cp = ENTREE().compteurs
  if (esp(eb(cp, 'P2')) !== '12/20 · P2') e.push(`envoisBarre(12 sur 20, P2) = « ${eb(cp, 'P2')} », « 12/20 · P2 » attendu`)
  for (const [quoi, x, p] of [['plafond 0', [{ canal: 'formulaire_site', palier: 'P1', plafond: 0, utilises: 0 }], 'P1'], ['palier nul (envoi_froid fermé)', cp, null], ['ligne formulaire absente', [], 'P1']]) if (esp(eb(x, p)) !== esp(FERME)) e.push(`envoisBarre(${quoi}) = « ${eb(x, p)} », « ${FERME} » attendu`)
  if (esp(b?.compteurs?.find((c) => c.cle === 'envois')?.texte) !== '12/20 · P2') e.push('ENVOIS DU JOUR de la barre ≠ « 12/20 · P2 »')
  const textes = chaines([b, barre(ENTREE({ compteurs: [], palier: null }), M), barre({}, M)])
  for (const t of textes) if (/bo[iî]te|R1-R3|\bR1\b/i.test(t)) e.push(`texte « ${court(t, 60)} » : ni « boîte » ni « R1-R3 »`)
  if (b?.cloche !== 9) e.push(`cloche = ${b?.cloche}, 9 attendu (le total reçu, pas les 7 affichées)`)
  if (b?.auto?.actif !== true || barre(ENTREE({ pause: { active: true } }), M)?.auto?.actif !== false) e.push('auto.actif doit valoir faux quand la pause générale est active, vrai sinon')
  const vide = barre({}, M)
  for (const c of vide?.compteurs ?? []) if (c.cle !== 'reunion' && /\d/.test(c.texte)) e.push(`source absente : ${c.cle} = « ${c.texte} », jamais un chiffre inventé`)
  for (const c of vide?.compteurs ?? []) if (c.cle !== 'reunion' && c.ton !== 'muet') e.push(`source absente : ${c.cle} de ton ${c.ton}, muet attendu`)
  if (b?.jour !== 'JOUR 12' || b?.nuit !== false || b?.heure !== '12:00') e.push(`jour/nuit/heure = ${b?.jour}/${b?.nuit}/${b?.heure}, JOUR 12/false/12:00 attendus`)
  return { echecs: e, detail: `ordre ${CLES_BARRE.join(' → ')} ; « AGENTS 12/15 ACTIFS » par agentsActifs(equipage(jeu)) ; EXPÉRIENCE seulement en cours ; quota nul « non mesuré », 0,76 alerte ; « 12/20 · P2 » et formulaire fermé ; cloche 9 ; pause → AUTO éteint ; source absente → « — » muet` }
})
await S.critere('BA-4', () => {
  const e = [], jr = fn(BA, 'jour', 'barre'), nt = fn(BA, 'nuit', 'barre')
  for (const [l, m, attendu] of [['2026-10-12', '2026-10-23T10:00:00Z', 'JOUR 12'], ['2026-10-12', '2026-10-12T05:00:00Z', 'JOUR 1'], [null, '2026-10-23T10:00:00Z', '—']]) { const r = jr(l, new Date(m)); if (r !== attendu) e.push(`jour(${l}, ${m}) = « ${r} », « ${attendu} » attendu`) }
  for (const [m, attendu] of [['2026-09-28T18:00:00Z', true], ['2026-09-29T04:59:00Z', true], ['2026-09-29T05:00:00Z', false], ['2026-09-28T17:59:00Z', false], ['2026-10-25T05:59:00Z', true], ['2026-10-25T06:00:00Z', false], ['2026-10-24T18:00:00Z', true], ['2026-10-24T17:59:00Z', false]]) {
    const r = nt(new Date(m)); if (r !== attendu) e.push(`nuit(${m}) = ${r}, ${attendu} attendu`)
  }
  const hn = val(BA, 'HEURES_NUIT', 'barre')
  if (hn?.debut !== 20 || hn?.fin !== 7 || typeof hn?.source !== 'string') e.push(`HEURES_NUIT = ${JSON.stringify(hn)}, { debut: 20, fin: 7, source } attendu`)
  return { echecs: e, detail: 'JOUR 12, JOUR 1, « — » ; nuit vraie à 20:00 et 06:59 de Paris, fausse à 07:00 et 19:59, juste autour du 25/10' }
})

// ── EQ : l'équipage ──────────────────────────────────────────────────────────────────────────────────────────────────────
const listeSalles = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.entries(x).map(([cle, v]) => ({ cle, ...v })) : [])
await S.critere('EQ-1', () => {
  const e = []
  const salles = listeSalles(val(EQ, 'SALLES', 'equipage'))
  const cles = salles.map((s) => s.cle)
  if (canon(cles) !== canon(CLES_SALLES)) e.push(`SALLES : ${cles.join(', ')} ; les vingt clés de 026-070 dans l’ordre attendues`)
  for (const a of SALLES_ATTENDUES) {
    const s = salles.find((x) => x.cle === a.cle)
    if (s && s.plaque !== a.plaque) e.push(`${a.cle} : plaque « ${s.plaque} », « ${a.plaque} » attendue`)
    if (s && sansAccents(s.genre) !== a.genre) e.push(`${a.cle} : genre « ${s.genre} », « ${a.genre} » attendu`)
  }
  if (cles.includes(RESERVEE)) e.push('ecommerce est dans SALLES')
  const r = val(EQ, 'SALLE_RESERVEE', 'equipage')
  if (r?.cle !== RESERVEE || r?.plaque !== 'E-commerce' || r?.genre !== 'reservee') e.push(`SALLE_RESERVEE = ${JSON.stringify(r)}, { cle: 'ecommerce', plaque: 'E-commerce', genre: 'reservee' } attendu`)
  const cs = val(EQ, 'CLES_SALLE', 'equipage')
  if (canon([...cs]) !== canon(CLES_SALLE_ATTENDUES)) e.push(`CLES_SALLE : ${[...cs].join(', ')} ; les vingt clés puis ecommerce attendues`)
  const EQP = val(EQ, 'EQUIPAGE', 'equipage')
  const noms = Object.keys(EQP ?? {})
  if (canon([...noms].sort()) !== canon(Object.keys(EQUIPAGE_ATTENDU).sort())) e.push(`EQUIPAGE : ${noms.join(', ')} ; les vingt-huit noms attendus (les vingt-cinq de 026-070, décision du 27/09, plus sav, qualite_sites et vigile)`)
  for (const [nom, salle] of Object.entries(EQUIPAGE_ATTENDU)) {
    const x = EQP?.[nom]
    if (!x) continue
    if (x.salle !== salle) e.push(`EQUIPAGE.${nom}.salle = ${x.salle}, ${salle} attendue`)
    if ('sprite' in x) e.push(`EQUIPAGE.${nom} porte encore « sprite » (devenu « avatar »)`)
    if (x.avatar !== nom) e.push(`EQUIPAGE.${nom}.avatar = ${x.avatar}, « ${nom} » (le nom technique) attendu`)
    if (typeof x.libelle !== 'string' || !x.libelle || typeof x.role !== 'string' || !x.role) e.push(`EQUIPAGE.${nom} sans libelle ou role`)
  }
  if (Object.values(EQP ?? {}).some((x) => x?.salle === RESERVEE)) e.push('une entrée d’EQUIPAGE a la salle ecommerce')
  const cartes = cartesDuJeu()
  const recus = AGENTS.map((a) => a.nom)
  const rendus = (cartes ?? []).map((c) => c.nom)
  if (canon([...rendus].sort()) !== canon([...recus].sort())) e.push(`equipage rend ${rendus.join(', ')} ; exactement les ${recus.length} agents reçus attendus (aucun inventé, aucun oublié)`)
  const ordre = [...cartes].sort((a, b) => CLES_SALLES.indexOf(a.salle) - CLES_SALLES.indexOf(b.salle) || a.nom.localeCompare(b.nom, 'fr')).map((c) => c.nom)
  if (canon(ordre) !== canon(rendus)) e.push(`ordre des cartes ${rendus.join(', ')} ; ordre des salles puis du nom attendu (${ordre.join(', ')})`)
  const inc = cartes.find((c) => c.nom === 'agent_temoin_inconnu')
  if (!inc || inc.salle !== 'machines' || inc.avatar !== 'defaut' || inc.libelle !== 'agent_temoin_inconnu') e.push(`nom inconnu : ${JSON.stringify(inc && { salle: inc.salle, avatar: inc.avatar, libelle: inc.libelle })}, { salle: machines, avatar: defaut, libelle: le nom brut } attendu`)
  const CHAMPS = ['nom', 'libelle', 'role', 'etat', 'point', 'activite', 'activite_le', 'cadence', 'prochain_le', 'cout_mois_eur', 'salle', 'avatar', 'position', 'modele']
  for (const c of cartes) { const manque = CHAMPS.filter((k) => !(k in c)); if (manque.length) { e.push(`carte ${c.nom} sans ${manque.join(', ')}`); break } }
  const vide = cartes.find((c) => c.nom === 'agent_temoin_inconnu')
  if (vide && vide.activite !== 'En attente de tâche') e.push(`activité d’un agent sans événement montrable « ${vide.activite} », « En attente de tâche » attendu`)
  const fx = cartes.find((c) => c.nom === 'redacteur')
  if (fx && fx.activite !== 'Variante A réécrite') e.push(`activité du redacteur « ${fx?.activite} », le résumé masqué de son dernier événement attendu`)
  for (const m of MODULES) if (/JEU_SPRITES/.test(src[m])) e.push(`${m}.ts contient JEU_SPRITES`)
  return { echecs: e, detail: `vingt salles et leurs genres, ecommerce réservée hors SALLES, CLES_SALLE = 20 + ecommerce ; vingt-huit titulaires (les vingt-cinq du 27/09 plus sav, qualite_sites, vigile), avatar = nom technique, aucun sprite ; ${rendus.length} cartes = les agents reçus, dans l’ordre des salles ; inconnu → machines, avatar defaut` }
})
await S.critere('EQ-2', () => {
  const e = [], pt = fn(EQ, 'point', 'equipage'), cd = fn(EQ, 'cadence', 'equipage')
  for (const [etat, c] of [['actif', 'cyan'], ['muet', 'jaune'], ['jamais', 'jaune'], ['panne', 'rouge'], ['disjoncteur', 'rouge'], ['pause', 'gris']]) if (pt(etat) !== c) e.push(`point(${etat}) = ${pt(etat)}, ${c} attendu`)
  for (const [a, attendu] of [[{ nom: 'chef', periode_minutes: 60, prochain_le: decaler(M, 98 * MIN).toISOString() }, 'cycle dans 1 h 38'], [{ nom: 'facteur', periode_minutes: 15, prochain_le: null }, 'toutes les 15 min'], [{ nom: 'vigie_meta', periode_minutes: 360, prochain_le: null }, 'toutes les 6 h'], [{ nom: 'experience', periode_minutes: 10080, prochain_le: null }, 'sur demande']]) {
    const r = cd(a, M); if (esp(r) !== attendu) e.push(`cadence(${a.nom}) = « ${r} », « ${attendu} » attendu`)
  }
  return { echecs: e, detail: 'six états → cyan, jaune, jaune, rouge, rouge, gris ; cadences « cycle dans 1 h 38 », « toutes les 15 min », « toutes les 6 h », « sur demande »' }
})
const ev = (id, agent, type, x = {}) => ({ id, le: decaler(M, -H + id * MIN).toISOString(), agent, type, objet: null, resume: `${type} de ${agent}`, ...x })
const posDe = (x) => vers(x) ?? {}
await S.critere('EQ-3', () => {
  const e = [], pos = fn(EQ, 'positions', 'equipage')
  const A = [{ nom: 'facteur', etat: 'actif' }, { nom: 'garde', etat: 'pause' }, { nom: 'livreur', etat: 'panne' }, { nom: 'a0', etat: 'actif' }, { nom: 'recenseur', etat: 'disjoncteur' }, { nom: 'repondeur', etat: 'muet' }]
  const attendre = (quoi, p, nom, salle, motif) => { const x = posDe(p)[nom]; if (x?.salle !== salle || x?.motif !== motif) e.push(`${quoi} : ${nom} en ${JSON.stringify(x)}, { salle: ${salle}, motif: ${motif} } attendu`) }
  const p0 = pos(A, [])
  for (const [n, s, m] of [['facteur', 'envois', 'porte'], ['garde', 'repos', 'pause'], ['livreur', 'usine', 'panne'], ['a0', 'machines', 'porte'], ['recenseur', 'radar', 'panne'], ['repondeur', 'standard', 'porte']]) attendre('sans événement', p0, n, s, m)
  if (Object.values(posDe(p0)).some((x) => x?.motif === 'reunion')) e.push('sans événement de réunion, quelqu’un est en réunion')
  const e1 = [ev(1, 'facteur', 'tache_prise'), ev(2, 'a0', 'battement'), ev(3, 'garde', 'tache_prise')]
  const p1 = pos(A, e1)
  attendre('après une tâche', p1, 'facteur', 'envois', 'tache'); attendre('battements seulement', p1, 'a0', 'machines', 'porte'); attendre('tâche pendant la pause', p1, 'garde', 'repos', 'pause')
  const e2 = [...e1, ev(4, 'chef', 'reunion_ouverte', { objet: 'reunion:x' })]
  const p2 = pos(A, e2)
  for (const n of ['facteur', 'a0', 'repondeur']) attendre('réunion ouverte', p2, n, 'reunion', 'reunion')
  attendre('réunion ouverte', p2, 'garde', 'repos', 'pause'); attendre('réunion ouverte', p2, 'livreur', 'usine', 'panne'); attendre('réunion ouverte', p2, 'recenseur', 'radar', 'panne')
  for (const fin of ['reunion_close', 'reunion_abandonnee']) {
    const p3 = pos(A, [...e2, ev(5, 'chef', fin, { objet: 'reunion:x' })])
    attendre(`après ${fin}`, p3, 'facteur', 'envois', 'tache'); attendre(`après ${fin}`, p3, 'a0', 'machines', 'porte'); attendre(`après ${fin}`, p3, 'repondeur', 'standard', 'porte')
  }
  const p4 = pos(A.map((a) => (a.nom === 'garde' ? { ...a, etat: 'actif' } : a)), e1)
  attendre('à la reprise', p4, 'garde', 'redaction', 'tache')
  const p5 = pos(A, [ev(1, 'livreur', 'tache_prise'), ev(2, 'livreur', 'reunion_ouverte')])
  attendre('en panne, avec événements et réunion', p5, 'livreur', 'usine', 'panne')
  for (const [quoi, p] of [['sans événement', p0], ['tâches', p1], ['réunion', p2], ['reprise', p4]]) for (const [n, x] of Object.entries(posDe(p))) if (x?.salle === 'repos' && x?.motif !== 'pause') e.push(`${quoi} : ${n} au Repos avec le motif ${x.motif} (seule une pause y mène)`)
  return { echecs: e, detail: 'pause → Repos (une seule marche, un événement pendant la pause ne le déplace pas) ; panne → sa salle ; réunion ouverte → tous en réunion sauf pause et panne ; close ou abandonnée → retour ; battements seuls → porte, jamais le Repos' }
})
const replier = (init, app, agents, liste) => { let s = init(agents); for (const x of [...liste].sort((a, b) => a.id - b.id)) s = app(s, x); return s }
const agentsEtats = () => AGENTS.map((a, i) => ({ nom: a.nom, etat: ['garde'].includes(a.nom) ? 'pause' : a.nom === 'livreur' ? 'panne' : a.nom === 'agent_temoin_inconnu' ? 'jamais' : i % 7 === 3 ? 'muet' : 'actif' }))
const listesAuHasard = () => {
  const h = alea(GRAINE), out = []
  for (let i = 0; i < 200; i++) out.push(EVTS.filter(() => h() < 0.35 + (i % 5) * 0.12).map((x) => structuredClone(x)))
  return out
}
await S.critere('EQ-4', () => {
  const e = [], pos = fn(EQ, 'positions', 'equipage'), init = fn(EQ, 'etatInitial', 'equipage'), app = fn(EQ, 'appliquerEvenement', 'equipage')
  const A = agentsEtats()
  const s = replier(init, app, A, structuredClone(EVTS))
  if (!egal(posDe(s?.positions), posDe(pos(A, structuredClone(EVTS))))) e.push('le repli de appliquerEvenement sur les 60 événements ≠ positions sur la liste entière')
  if (!egal(posDe(init(A)?.positions), posDe(pos(A, [])))) e.push('etatInitial(agents).positions ≠ positions(agents, [])')
  const e5 = EVTS.find((x) => x.type === 'tache_prise' && x.agent === 'facteur')
  const s1 = app(init(A), gelerProfond(structuredClone(e5)))
  const s2 = app(s1, structuredClone(e5))
  if (!egal(s1?.positions, s2?.positions) || canon(s1) !== canon(s2)) e.push('rejouer le même événement change l’état')
  const bat = EVTS.find((x) => x.type === 'battement')
  if (!egal(app(s1, structuredClone(bat))?.positions, s1?.positions)) e.push('un battement change les positions')
  const abs = { ...structuredClone(e5), id: 999, agent: 'fantome_absent' }
  if (!egal(app(s1, abs)?.positions, s1?.positions)) e.push('l’événement d’un agent absent change les positions')
  const gele = gelerProfond(structuredClone(s1))
  try { app(gele, ev(1000, 'a0', 'tache_prise')) } catch (err) { e.push(`appliquerEvenement modifie son entrée (état gelé : ${premiereLigne(err)})`) }
  let n = 0
  for (const liste of listesAuHasard()) {
    const a = replier(init, app, A, liste), b = pos(A, liste)
    if (!egal(posDe(a?.positions), posDe(b))) { e.push(`liste ${n} (${liste.length} événements) : repli ≠ positions`); break }
    if (!egal(posDe(pos(A, liste)), posDe(b))) { e.push(`liste ${n} : positions non déterministe`); break }
    const der = liste[liste.length - 1]
    if (der && canon(app(a, structuredClone(der))) !== canon(a)) { e.push(`liste ${n} : sans nouvel événement, l’état change`); break }
    n++
  }
  return { echecs: e, detail: `repli = positions sur les 60 événements et sur 200 listes tirées au hasard (graine ${GRAINE}) ; rejeu, battement et agent absent sans effet ; entrée gelée non modifiée` }
})
await S.critere('EQ-5', () => {
  const e = [], pos = fn(EQ, 'positions', 'equipage'), init = fn(EQ, 'etatInitial', 'equipage'), app = fn(EQ, 'appliquerEvenement', 'equipage')
  const A = [...agentsEtats(), { nom: 'nom_inconnu_temoin', etat: 'actif' }]
  const pieges = [ev(900, 'facteur', 'tache_prise', { salle: 'ecommerce' }), ev(901, 'nom_inconnu_temoin', 'tache_prise', { salle: 'ecommerce' }), ev(902, 'ecommerce', 'tache_prise')]
  let vues = 0
  const juger = (quoi, p) => { for (const [n, x] of Object.entries(posDe(p))) { vues++; if (x?.salle === RESERVEE) e.push(`${quoi} : ${n} placé en ecommerce`); else if (!CLES_SALLES.includes(x?.salle)) e.push(`${quoi} : ${n} dans « ${x?.salle} », hors de SALLES`) } }
  juger('evenements.json', pos(A, structuredClone(EVTS)))
  juger('pièges ecommerce', pos(A, [...structuredClone(EVTS), ...pieges]))
  let s = init(A); for (const p of pieges) { s = app(s, p); juger('appliquerEvenement', s?.positions) }
  for (const liste of listesAuHasard()) juger('listes au hasard', pos(A, [...liste, ...pieges]))
  return { echecs: [...new Set(e)].slice(0, 8), detail: `${vues} positions examinées (jeu, pièges « salle: ecommerce », agent inconnu, 200 listes) : aucune en ecommerce, chacune dans SALLES` }
})
await S.critere('EQ-6', async () => {
  const e = [], ma = fn(EQ, 'modeleAffiche', 'equipage')
  let MOT
  try { MOT = (await import(pathToFileURL(path.join(RAC, 'lib', 'agents', 'moteurs.ts')).href)).MOTEUR_DE } catch (err) { e.push(`lib/agents/moteurs.ts illisible : ${premiereLigne(err)}`) }
  const vieux = (j) => decaler(M, -j * J).toISOString()
  const r1 = ma({ nom: 'facteur', modele: 'gpt-6-luna', fournisseur: 'openai-codex', modele_le: vieux(2) }, M)
  if (esp(r1?.texte) !== 'gpt-6-luna · Codex' || r1?.source !== 'vu') e.push(`Codex vu il y a 2 j : ${JSON.stringify(r1)}, « gpt-6-luna · Codex » vu attendu`)
  const r2 = ma({ nom: 'douleurs', modele: 'llama-4-scout', fournisseur: 'freellmapi', fournisseur_reel: 'Cerebras', modele_le: vieux(1) }, M)
  if (esp(r2?.texte) !== 'llama-4-scout · Cerebras · gratuit' || r2?.source !== 'vu') e.push(`freellmapi : ${JSON.stringify(r2)}, « llama-4-scout · Cerebras · gratuit » vu attendu`)
  const r3 = ma({ nom: 'facteur', modele: 'gpt-6-luna', fournisseur: 'openai-codex', modele_le: vieux(8) }, M)
  if (MOT && (r3?.source !== 'prevu' || esp(r3?.texte) !== `${MOT.facteur?.modele} (pas encore appelé)`)) e.push(`vu il y a 8 j : ${JSON.stringify(r3)}, le prévu « ${MOT.facteur?.modele} (pas encore appelé) », source prevu, attendu (jamais vu)`)
  const r4 = ma({ nom: 'nom_sans_moteur', modele: null, fournisseur: null, modele_le: null }, M)
  if (r4?.texte !== 'sans IA' || r4?.source !== 'aucun') e.push(`sans ligne ni MOTEUR_DE : ${JSON.stringify(r4)}, « sans IA » aucun attendu`)
  const cartes = cartesDuJeu()
  for (const c of cartes) { const ligne = AGENTS.find((a) => a.nom === c.nom); if (!egal(c.modele, ma(ligne, M))) { e.push(`carte ${c.nom} : modele ${JSON.stringify(c.modele)} ≠ modeleAffiche de sa ligne`); break } }
  const chainesEq = []; sansCommentaires(src.equipage, chainesEq)
  const nomme = chainesEq.map((x) => x.texte).find((t) => /gpt-|\bluna\b|\bsol\b|llama|mistral|gemini|qwen|claude-|\bopus\b|sonnet|haiku/i.test(t))
  if (nomme) e.push(`equipage.ts écrit un nom de modèle en dur (« ${court(nomme, 40)} ») : seul MOTEUR_DE le donne`)
  return { echecs: e, detail: 'vu dans les 7 jours (Codex ou freellmapi · gratuit), sinon le prévu de MOTEUR_DE, sinon « sans IA » ; chaque carte porte modeleAffiche de sa ligne ; aucun nom de modèle écrit dans equipage.ts' }
})

// ── AT : la file Attention ───────────────────────────────────────────────────────────────────────────────────────────────
const COULEURS = {
  rouge: ['pause_generale', 'panne_agent', 'argent_bloque', 'coupe_circuit', 'jeton_meta_expire', 'usine_injoignable', 'envoi_sans_verdicts', 'canal_arrete', 'gmail_bloque', 'notice_perimee', 'jauge_pleine'],
  orange: ['appel', 'site_a_valider', 'paiement_non_rattache', 'decision_argent'],
  jaune: ['taches_bloquees', 'disjoncteur', 'quota_haut', 'jeton_externe', 'agent_muet', 'stockage', 'orchestre', 'technologie_en_pause', 'modele_suspendu', 'changer_message', 'bilan', 'vercel_pro'],
  bleu: ['escalade_chef', 'idee_chef'],
}
const MOTIFS = Object.values(COULEURS).flat()
const ORDRE = ['rouge', 'orange', 'jaune', 'bleu']
const CIBLES_FIXES = ['/controle?onglet=sites', '/controle?onglet=aujourdhui']
const cibleOk = (c) => CIBLES_FIXES.includes(c) || (/^\/controle\/station\?salle=([a-z]+)$/.test(c) && CLES_SALLES.includes(c.split('=')[1])) || /^\/controle\/station\?agent=[a-z0-9_]{2,40}$/.test(c)
const sourcesAuHasard = () => {
  const h = alea(GRAINE + 1), out = []
  for (let i = 0; i < 200; i++) {
    const s = {}
    for (const m of [...MOTIFS, 'motif_inconnu_a', 'motif_inconnu_b']) if (h() < 0.3) s[m] = { nombre: 1 + h.entier(9), depuis: decaler(M, -h.entier(10 * J)).toISOString(), agent: h() < 0.2 ? h.choix(Object.keys(EQUIPAGE_ATTENDU)) : null, ...(m === 'appel' ? { rdv: h.entier(3) } : {}) }
    if (h() < 0.1) s.canal_arrete = null
    out.push(s)
  }
  return out
}
await S.critere('AT-1', () => {
  const e = [], ca = fn(AT, 'cartesAttention', 'attention')
  let n = 0
  for (const s of sourcesAuHasard()) {
    const r = ca(gelerProfond(structuredClone(s)), M)
    const nonNulles = Object.values(s).filter((x) => x && x.nombre > 0).length
    if (!Array.isArray(r?.cartes) || r.cartes.length > 7) { e.push(`jeu ${n} : ${r?.cartes?.length} cartes, 7 au plus`); break }
    if (r.total !== nonNulles) { e.push(`jeu ${n} : total ${r.total}, ${nonNulles} sources non nulles`); break }
    if (r.cartes.length !== Math.min(7, nonNulles)) { e.push(`jeu ${n} : ${r.cartes.length} cartes pour ${nonNulles} sources`); break }
    if (s.pause_generale?.nombre > 0 && r.cartes[0]?.cle !== 'pause_generale') { e.push(`jeu ${n} : pause générale active, première carte ${r.cartes[0]?.cle}`); break }
    for (let i = 1; i < r.cartes.length; i++) {
      const a = r.cartes[i - 1], b = r.cartes[i], ia = ORDRE.indexOf(a.couleur), ib = ORDRE.indexOf(b.couleur)
      if (a.cle === 'pause_generale' && i === 1) continue
      const da = T(s[a.cle]?.depuis), db = T(s[b.cle]?.depuis)
      if (ia > ib || (ia === ib && a.nombre < b.nombre) || (ia === ib && a.nombre === b.nombre && da > db)) { e.push(`jeu ${n} : ${a.cle} (${a.couleur}, ${a.nombre}) avant ${b.cle} (${b.couleur}, ${b.nombre}) : rouge, orange, jaune, bleu, puis nombre décroissant, puis ancienneté`); break }
    }
    if (e.length) break
    const pris = new Set(r.cartes.map((c) => c.cle))
    const oublie = Object.entries(s).find(([k, x]) => x && x.nombre > 0 && !pris.has(k) && r.cartes.length < 7)
    if (oublie) { e.push(`jeu ${n} : la source ${oublie[0]} n’a pas de carte`); break }
    if (r.vide !== (nonNulles ? null : VIDE_ATTENTION)) { e.push(`jeu ${n} : vide = ${JSON.stringify(r.vide)}`); break }
    n++
  }
  const v = ca({}, M)
  if (v?.vide !== VIDE_ATTENTION || v?.total !== 0 || v?.cartes?.length !== 0) e.push(`sans source : ${JSON.stringify(v)}, vide « ${VIDE_ATTENTION} » attendu`)
  if (val(AT, 'VIDE', 'attention') !== VIDE_ATTENTION || val(AT, 'MAX_CARTES', 'attention') !== 7 || canon([...val(AT, 'ORDRE', 'attention')]) !== canon(ORDRE)) e.push('VIDE, MAX_CARTES ou ORDRE différents de 026-070')
  return { echecs: e, detail: `200 jeux de sources (graine ${GRAINE + 1}) : ordre rouge, orange, jaune, bleu puis nombre puis ancienneté, 7 cartes au plus, total = sources non nulles ; sans source, « ${VIDE_ATTENTION} »` }
})
await S.critere('AT-2', () => {
  const e = [], cd = val(AT, 'COULEUR_DE', 'attention'), ca = fn(AT, 'cartesAttention', 'attention')
  for (const [c, motifs] of Object.entries(COULEURS)) for (const m of motifs) if (cd?.[m] !== c) e.push(`COULEUR_DE.${m} = ${cd?.[m]}, ${c} attendu`)
  for (const m of ['boite_deconnectee', 'liste_noire', 'sequenceur_non_arrete', 'retrait_echoue', 'boite_sans_notice', 'credit_bas', 'cle_agents_vide']) if (cd && m in cd) e.push(`COULEUR_DE contient encore ${m}`)
  const inc = ca({ motif_inconnu_temoin: { nombre: 1 } }, M)
  if (inc?.cartes?.[0]?.couleur !== 'jaune') e.push(`motif inconnu → ${inc?.cartes?.[0]?.couleur}, jaune attendu`)
  const p = ca({ ...jeuS('sources-attention.json').sources, pause_generale: { nombre: 1, depuis: M.toISOString() } }, M)
  if (p?.cartes?.[0]?.cle !== 'pause_generale' || p?.cartes?.[0]?.couleur !== 'rouge') e.push(`pause générale active : première carte ${p?.cartes?.[0]?.cle} (${p?.cartes?.[0]?.couleur}), pause_generale rouge attendue`)
  const an = ca({ envoi_sans_verdicts: { nombre: 2 } }, M)
  if (an?.cartes?.[0]?.couleur !== 'rouge') e.push('envoi_sans_verdicts n’est pas rouge')
  const ex = exportsNommes(src.attention)
  for (const x of ['creditBas', 'SEUIL_CREDIT']) if (ex.includes(x)) e.push(`attention.ts exporte encore ${x}`)
  return { echecs: e, detail: `${MOTIFS.length} motifs à leur couleur ; aucun motif retiré (boîtes, séquenceur, crédit) ; inconnu → jaune ; pause générale rouge en tête ; envoi_sans_verdicts rouge` }
})
await S.critere('AT-3', () => {
  const e = [], ca = fn(AT, 'cartesAttention', 'attention')
  let cartes = 0
  for (const s of [...sourcesAuHasard(), jeuS('sources-attention.json').sources]) {
    for (const c of ca(s, M)?.cartes ?? []) {
      cartes++
      if (/envoy|copi|relay/i.test(c.titre)) e.push(`titre « ${c.titre} » : ni envoyer, ni copier, ni relayer`)
      if (!['decisions', 'appels', 'ouvrir'].includes(c.geste?.type)) e.push(`${c.cle} : geste ${JSON.stringify(c.geste)}`)
      if (c.geste?.type === 'decisions' && !['argent', 'escalade', 'idee'].includes(c.geste.cible)) e.push(`${c.cle} : cible de décision ${c.geste.cible}`)
      if (c.geste?.type === 'ouvrir' && !cibleOk(c.geste.cible)) e.push(`${c.cle} : cible « ${c.geste.cible} » hors de la liste fermée`)
    }
  }
  return { echecs: [...new Set(e)].slice(0, 8), detail: `${cartes} cartes : aucun titre d’envoi, de copie ni de relais ; gestes decisions, appels ou ouvrir vers la liste fermée` }
})
await S.critere('AT-4', () => {
  const e = [], ca = fn(AT, 'cartesAttention', 'attention')
  const a = ca({ appel: { nombre: 2, rdv: 1 } }, M)
  const c = a?.cartes ?? []
  if (c.length !== 1 || c[0].cle !== 'appel' || c[0].couleur !== 'orange' || c[0].nombre !== 2 || !/1 rendez-vous réservé/.test(esp(c[0].titre))) e.push(`{ nombre: 2, rdv: 1 } → ${JSON.stringify(c)}, une carte appel orange de nombre 2 qui dit « 1 rendez-vous réservé » attendue`)
  const b = ca({ appel: { nombre: 1, rdv: 0 } }, M)?.cartes?.[0]
  if (esp(b?.titre) !== '1 appel à rendre') e.push(`{ nombre: 1, rdv: 0 } → « ${b?.titre} », « 1 appel à rendre » attendu`)
  if (!egal(b?.geste, { type: 'appels' })) e.push(`geste de la carte appel ${JSON.stringify(b?.geste)}, { type: 'appels' } attendu`)
  return { echecs: e, detail: 'une seule carte appel, orange, qui compte les rendez-vous réservés et les réponses « appel » ; « 1 appel à rendre » ; geste { type: appels }' }
})
await S.critere('AT-5', () => {
  const e = [], ca = fn(AT, 'cartesAttention', 'attention'), tc = fn(AT, 'titreCarte', 'attention')
  const src5 = { panne_agent: { nombre: 1, agent: 'livreur' }, disjoncteur: { nombre: 1, agent: 'facteur' }, jeton_meta_expire: { nombre: 1, agent: 'vigie_meta' }, site_a_valider: { nombre: 1 }, idee_chef: { nombre: 2 } }
  const r = ca(src5, M)
  for (const c of r?.cartes ?? []) {
    if (!('agent' in c)) e.push(`carte ${c.cle} sans champ agent`)
    else if (c.agent !== (src5[c.cle].agent ?? null)) e.push(`carte ${c.cle} : agent ${JSON.stringify(c.agent)}, ${JSON.stringify(src5[c.cle].agent ?? null)} attendu`)
    if (c.titre !== tc(c.cle, src5[c.cle])) e.push(`carte ${c.cle} : titre « ${c.titre} » ≠ titreCarte « ${tc(c.cle, src5[c.cle])} » (un seul calcul)`)
  }
  if ((r?.cartes ?? []).length !== 5) e.push(`${r?.cartes?.length} cartes, 5 attendues`)
  if (/à rendre|→ ta décision|approuver ou tuer|en panne/.test(sansCommentaires(src.equipage ?? '') + sansCommentaires(src.barre ?? ''))) e.push('equipage.ts ou barre.ts écrit un titre de carte : titreCarte d’attention.ts est la seule fonction')
  return { echecs: e, detail: 'chaque carte porte agent (le nom de la source, sinon null) ; son titre est titreCarte(cle, source), la seule fonction qui l’écrit' }
})

// ── FI : le fil, les bulles, le bandeau ──────────────────────────────────────────────────────────────────────────────────
const survivants = (x) => { const t = JSON.stringify(x); return PIEGES.filter((p) => t.includes(p)) }
await S.critere('FI-1', () => {
  const e = [], mq = fn(FI, 'masquer', 'fil')
  for (const x of EVTS) {
    const m = mq(x.resume)
    const s = survivants(m)
    if (s.length) e.push(`« ${court(x.resume, 50)} » → « ${m} » : ${s.join(', ')} survit`)
    if (mq(m) !== m) e.push(`masquer n’est pas idempotent sur « ${court(x.resume, 40)} »`)
    if (typeof m !== 'string' || m.length > 200) e.push(`sortie de ${m?.length} signes`)
  }
  for (const [t, jeton] of [['écrire à jean.temoin@exemple.invalid', '[adresse]'], ['appeler le 06 12 34 56 78', '[numéro]'], ['voir https://exemple.invalid/x', '[lien]'], ['voir www.exemple.invalid', '[lien]'], ['voir exemple.fr', '[lien]'], ['pour M. Jean Témoin', '[nom]'], ['pour Madame Témoin', '[nom]']]) if (!mq(t).includes(jeton)) e.push(`masquer(« ${t} ») = « ${mq(t)} », ${jeton} attendu`)
  const long = 'x'.repeat(500)
  if (mq(long).length > 200) e.push('masquer ne coupe pas à 200 signes')
  if (mq(null) !== '' && mq(null) !== '—') e.push(`masquer(null) = ${JSON.stringify(mq(null))}`)
  return { echecs: e.slice(0, 8), detail: `les ${PIEGES.length} pièges d’evenements.json masqués ([adresse], [numéro], [lien], [nom]) ; idempotent ; 200 signes au plus` }
})
await S.critere('FI-2', () => {
  const e = [], bu = fn(FI, 'bulles', 'fil')
  const doublons = [...structuredClone(EVTS), structuredClone(EVTS[5]), structuredClone(EVTS[20])]
  const b = bu(gelerProfond(doublons))
  const ids = b.map((x) => x.id)
  if (b.some((x) => x.type === 'battement')) e.push('une bulle de battement')
  if (new Set(ids).size !== ids.length) e.push('deux bulles de même id')
  if (ids.some((x, i) => i && x < ids[i - 1])) e.push('bulles hors de l’ordre des id')
  const cr = b.filter((x) => x.type === 'reunion_compte_rendu')
  if (cr.length !== 1 || cr[0]?.lignes?.length !== 5) e.push(`${cr.length} bulle(s) de compte rendu (${cr.map((x) => x.lignes?.length).join(', ')} lignes), une seule de cinq lignes attendue`)
  const f = bu(structuredClone(EVTS), { agent: 'facteur' })
  if (!f.length || f.some((x) => x.agent !== 'facteur')) e.push('le filtre par agent rend un autre agent (ou rien)')
  const cons = b.filter((x) => x.type === 'consigne')
  if (cons.length !== 2 || cons.some((x) => x.pastille !== 'BENJ')) e.push(`consignes : ${JSON.stringify(cons.map((x) => x.pastille))}, deux bulles « BENJ » attendues`)
  const s = survivants(b)
  if (s.length) e.push(`la sortie sérialisée porte ${s.join(', ')}`)
  return { echecs: e, detail: `${b.length} bulles : ni battement ni doublon, par id ; un compte rendu de cinq lignes en une bulle ; filtre par agent ; consignes « BENJ » ; aucun piège dans la sortie` }
})
await S.critere('FI-3', () => {
  const e = [], bd = fn(FI, 'bandeau', 'fil'), db = fn(FI, 'derniereBulle', 'fil'), mq = fn(FI, 'masquer', 'fil')
  const types = val(FI, 'TYPES_BANDEAU', 'fil')
  if (canon([...types]) !== canon(['commande_payee', 'pack_paye', 'reponse_oui'])) e.push(`TYPES_BANDEAU = ${JSON.stringify(types)}`)
  const b = bd(structuredClone(EVTS))
  const attendus = EVTS.filter((x) => ['commande_payee', 'pack_paye', 'reponse_oui'].includes(x.type)).sort((a, c) => c.id - a.id).slice(0, 10).map((x) => x.id)
  if (!Array.isArray(b) || b.length !== 10) e.push(`bandeau : ${b?.length} éléments, les 10 derniers attendus`)
  else if (canon(b.map((x) => x.id).sort((a, c) => c - a)) !== canon(attendus)) e.push(`bandeau : ids ${b.map((x) => x.id).join(', ')}, les 10 derniers (${attendus.join(', ')}) attendus`)
  if (b?.some((x) => !['commande_payee', 'pack_paye', 'reponse_oui'].includes(x.type))) e.push('bandeau : un type hors de TYPES_BANDEAU')
  if (survivants(b).length) e.push('bandeau : un piège non masqué')
  const d = vers(db(structuredClone(EVTS)))
  const attendu = {}
  for (const x of EVTS) if (x.type !== 'battement') attendu[x.agent] = mq(x.resume)
  if (!egal(d, attendu)) e.push(`derniereBulle ≠ le dernier résumé masqué hors battement de chaque agent (${Object.keys(d ?? {}).length} agents rendus, ${Object.keys(attendu).length} attendus)`)
  return { echecs: e, detail: 'bandeau : les 10 derniers commande_payee, pack_paye, reponse_oui, masqués ; derniereBulle : par agent, le dernier texte masqué hors battement' }
})
await S.critere('FI-4', () => {
  const e = [], bu = fn(FI, 'bulles', 'fil')
  const c = (id, objet) => ({ id, le: M.toISOString(), agent: 'systeme', type: 'consigne', objet, resume: 'Consigne du témoin' })
  const b = bu([c(1, 'agent:facteur'), c(2, 'fondateur'), c(3, 'agent:nom_hors_equipage')])
  const [x, y, z] = b
  if (x?.pastille !== 'BENJ' || x?.cible !== 'facteur' || x?.cibleLibelle !== 'FACTEUR') e.push(`agent:facteur → ${JSON.stringify(x && { pastille: x.pastille, cible: x.cible, cibleLibelle: x.cibleLibelle })}, BENJ ▸ FACTEUR attendu`)
  if (y?.pastille !== 'BENJ' || y?.cible !== null) e.push(`fondateur → cible ${JSON.stringify(y?.cible)}, null attendu`)
  if (z?.cible !== 'nom_hors_equipage') e.push(`agent:nom_hors_equipage → cible ${JSON.stringify(z?.cible)}, le nom brut attendu`)
  return { echecs: e, detail: 'consigne adressée : cible facteur, cibleLibelle FACTEUR ; à tout l’équipage : cible null ; nom hors d’EQUIPAGE : le nom brut, sans erreur' }
})

// ── TA : les tapis ───────────────────────────────────────────────────────────────────────────────────────────────────────
const ETAPES_T = [['trouve', 'TROUVÉ'], ['verifie', 'VÉRIFIÉ'], ['maquette', 'MAQUETTE'], ['contacte', 'CONTACTÉ'], ['repondu', 'RÉPONDU'], ['oui', 'OUI'], ['paye', 'PAYÉ'], ['en_ligne', 'EN LIGNE']]
const mvt = (r) => (Array.isArray(r) ? { liste: r.filter((x) => x && x.carres > 0), baisse: false } : r && r.remiseAZero === true ? { liste: Array.isArray(r.carres) ? r.carres.filter((x) => x.carres > 0) : [], baisse: true } : { liste: null, baisse: false })
await S.critere('TA-1', () => {
  const e = [], tp = fn(TA, 'tapis', 'tapis'), mv = fn(TA, 'mouvements', 'tapis'), jeu = jeuS('tapis.json')
  const a = tp(jeu.avant), b = tp(jeu.apres), z = tp(jeu.baisse)
  if (canon(a?.etapes?.map((x) => [x.cle, x.libelle])) !== canon(ETAPES_T)) e.push(`étapes ${JSON.stringify(a?.etapes?.map((x) => x.cle))}, les huit de 026-070 dans l’ordre attendues`)
  const enLigne = a?.etapes?.find((x) => x.cle === 'en_ligne')
  if (enLigne?.jour !== 0 || enLigne?.source !== 'absente') e.push(`étape absente : ${JSON.stringify(enLigne)}, jour 0 et source « absente » attendus`)
  if (a?.etapes?.find((x) => x.cle === 'trouve')?.source === 'absente') e.push('une étape présente est dite absente')
  if (a?.rejet?.nombre !== 3 || a?.rejet?.tauxPass !== 0.8) e.push(`rejet ${JSON.stringify(a?.rejet)}, { nombre: 3, tauxPass: 0.8 } attendu`)
  const m1 = mvt(mv(a, b))
  if (m1.baisse || canon(m1.liste) !== canon([{ etape: 'contacte', carres: 1 }])) e.push(`+1 en contacte → ${JSON.stringify(mv(a, b))}, un seul carré en contacte attendu`)
  const m2 = mvt(mv(b, tp(jeu.apres)))
  if (m2.baisse || m2.liste === null || m2.liste.length) e.push(`deux relevés identiques → ${JSON.stringify(mv(b, tp(jeu.apres)))}, aucun carré attendu`)
  const m3 = mvt(mv(b, z))
  if (!m3.baisse || m3.liste.length) e.push(`une baisse (minuit) → ${JSON.stringify(mv(b, z))}, { remiseAZero: true } sans carré attendu`)
  const m4 = mvt(mv(null, a))
  if (m4.baisse || m4.liste === null || m4.liste.length) e.push(`premier relevé → ${JSON.stringify(mv(null, a))}, aucun carré attendu`)
  return { echecs: e, detail: 'huit étapes dans l’ordre, absente à 0 « absente » ; +1 en contacte → un carré ; identiques → rien ; baisse → remise à zéro sans carré ; premier relevé → rien' }
})
await S.critere('TA-2', () => {
  const e = [], lg = fn(TA, 'lignes', 'tapis'), mv = fn(TA, 'mouvements', 'tapis'), jeu = jeuS('tapis.json')
  const ATT = { contenu: ['idee', 'texte', 'visuel', 'juge', 'programmee', 'publiee'], sites: ['payee', 'generee', 'validee', 'en_ligne'], packs: ['paye', 'dossier', 'fabrique', 'livre'] }
  const a = lg({ contenu: jeu.contenu_avant, sites: null, packs: [] }), b = lg({ contenu: jeu.contenu_apres, sites: null, packs: [] })
  for (const [k, cles] of Object.entries(ATT)) {
    if (canon(a?.[k]?.etapes?.map((x) => x.cle)) !== canon(cles)) e.push(`${k} : étapes ${JSON.stringify(a?.[k]?.etapes?.map((x) => x.cle))}, ${cles.join(' → ')} attendues`)
    for (const x of a?.[k]?.etapes ?? []) if (!['idee', 'texte', 'publiee'].includes(x.cle) || k !== 'contenu') { if (x.jour !== 0 || x.source !== 'absente') { e.push(`${k}.${x.cle} sans source : ${JSON.stringify(x)}, 0 et « absente » attendus`); break } }
  }
  const m1 = mvt(mv(a?.contenu, b?.contenu))
  if (m1.baisse || canon(m1.liste) !== canon([{ etape: 'publiee', carres: 1 }])) e.push(`+1 en publiee → ${JSON.stringify(mv(a?.contenu, b?.contenu))}, un seul carré attendu`)
  const m2 = mvt(mv(b?.contenu, lg({ contenu: jeu.contenu_apres })?.contenu))
  if (m2.baisse || m2.liste === null || m2.liste.length) e.push('deux relevés identiques de la ligne contenu → des carrés')
  return { echecs: e, detail: 'contenu, sites et packs dans l’ordre de 026-070 ; étape sans source à 0 « absente » ; mouvements par ligne comme le tapis' }
})

// ── MI : le Commandement ─────────────────────────────────────────────────────────────────────────────────────────────────
const CMD = (x = {}) => ({
  mesures: { encaisse_eur: 312, oui: 3, contacts_froids: 41, sites_en_ligne: 0 },
  objectif: { libelle: 'Dix formulaires par jour', mesure: 'contacts_froids', cible: 100 },
  compteRendu: ['Ligne 1', 'Ligne 2', 'Ligne 3', 'Ligne 4', 'Ligne 5'],
  bilan: { bilan_le: '2026-11-02', verdict: 'en_cours' },
  succesDates: { premier_oui: '2026-10-20T09:00:00Z', premiere_vente: '2026-10-21T09:00:00Z' }, ...x,
})
await S.critere('MI-1', () => {
  const e = [], cm = fn(MI, 'commandement', 'missions')
  const c = cm(CMD())
  const att = [['encaisse_eur', 300, '300 € encaissés', '312/300'], ['oui', 10, '10 oui', '3/10'], ['contacts_froids', 100, '100 contacts froids (bilan du 02/11)', '41/100'], ['sites_en_ligne', 1, '1er site en ligne', '0/1']]
  for (const [cle, cible, libelle, texte] of att) {
    const m = c?.missions?.find((x) => x.cle === cle)
    if (!m) { e.push(`mission ${cle} absente`); continue }
    if (m.cible !== cible || esp(m.libelle) !== esp(libelle) || esp(m.texte) !== texte) e.push(`mission ${cle} : ${JSON.stringify({ cible: m.cible, libelle: m.libelle, texte: m.texte })}, { ${cible}, « ${libelle} », « ${texte} » } attendu`)
    if (m.atteinte !== (Number(texte.split('/')[0]) >= cible)) e.push(`mission ${cle} : atteinte ${m.atteinte}`)
    if (m.debloque !== null && typeof m.debloque !== 'string') e.push(`mission ${cle} : debloque ${JSON.stringify(m.debloque)}`)
  }
  if (canon(c?.missions?.map((x) => x.cle)) !== canon(att.map((x) => x[0]))) e.push('ordre des missions')
  if (c?.niveau?.xp !== 312 || c?.niveau?.prochainSeuil !== 1000 || esp(c?.niveau?.texte) !== '312 / 1 000 XP') e.push(`niveau ${JSON.stringify(c?.niveau)}, xp 312, prochain seuil 1000, « 312 / 1 000 XP » attendus`)
  for (const k of ['oui', 'contacts_froids', 'sites_en_ligne']) { const x = cm(CMD({ mesures: { ...CMD().mesures, [k]: 999 } })); if (!egal(x?.niveau, c?.niveau)) e.push(`le niveau change quand seul ${k} change`) }
  const lv = (eur) => cm(CMD({ mesures: { ...CMD().mesures, encaisse_eur: eur } }))?.niveau
  const seuils = [0, 300, 1000, 3000, 10000]
  if (canon(val(MI, 'NIVEAUX', 'missions')) !== canon(seuils)) e.push(`NIVEAUX = ${JSON.stringify(val(MI, 'NIVEAUX', 'missions'))}`)
  for (const s of seuils.slice(1)) if (!(lv(s)?.lv > lv(s - 1)?.lv)) e.push(`le niveau ne monte pas au seuil ${s} € (${lv(s - 1)?.lv} → ${lv(s)?.lv})`)
  if (lv(10000)?.prochainSeuil !== null || lv(0)?.prochainSeuil !== 300) e.push('prochainSeuil faux à 0 € ou à 10 000 €')
  if (c?.objectif?.par !== 'PAR LE CHEF' || c?.objectif?.libelle !== 'Dix formulaires par jour') e.push(`objectif ${JSON.stringify(c?.objectif)}, signé « PAR LE CHEF » attendu`)
  if (cm(CMD({ objectif: { libelle: 'Sans mesure', mesure: null, cible: null } }))?.objectif?.progression !== null) e.push('objectif sans mesure : une progression')
  if (c?.compteRendu?.length !== 3) e.push(`compte rendu de ${c?.compteRendu?.length} lignes, 3 au plus attendues`)
  if (c?.succes?.cle !== 'premiere_vente') e.push(`dernier succès ${c?.succes?.cle}, premiere_vente attendu (ordre de SUCCES)`)
  const s2 = cm(CMD({ mesures: { encaisse_eur: 0, oui: 1, contacts_froids: 0, sites_en_ligne: 1 } }))
  if (s2?.succes?.cle !== 'premier_site_en_ligne') e.push(`dernier succès ${s2?.succes?.cle}, premier_site_en_ligne attendu`)
  return { echecs: e, detail: '« 300 € encaissés », « 10 oui », « 100 contacts froids (bilan du 02/11) », « 1er site en ligne » ; « 41/100 » ; niveau sur l’encaissé seul, seuils 0, 300, 1 000, 3 000, 10 000 ; « PAR LE CHEF » ; 3 lignes ; dernier succès dans l’ordre' }
})
await S.critere('MI-2', () => {
  const e = [], cm = fn(MI, 'commandement', 'missions')
  const a = cm(CMD())?.missions?.find((x) => x.cle === 'contacts_froids')
  if (!/bilan du 02\/11/.test(a?.libelle ?? '')) e.push(`bilan_le 2026-11-02 → « ${a?.libelle} », « bilan du 02/11 » attendu`)
  const b = cm(CMD({ bilan: { bilan_le: null, verdict: null }, mesures: { encaisse_eur: 0, oui: 0, contacts_froids: 0, sites_en_ligne: 0 } }))?.missions?.find((x) => x.cle === 'contacts_froids')
  if (!/bilan non daté, formulaire fermé/.test(b?.libelle ?? '') || b?.valeur !== 0 || b?.cible !== 100 || b?.atteinte !== false) e.push(`bilan_le nul → ${JSON.stringify(b)}, « bilan non daté, formulaire fermé », 0 sur 100, non atteinte attendus`)
  const p3 = cm(CMD({ bilan: { bilan_le: '2026-11-02', verdict: 'P3' } }))
  if (!p3?.tousSucces?.find((x) => x.cle === 'bilan_passe')?.debloque) e.push('verdict P3 ne débloque pas « Bilan passé »')
  for (const m of MODULES) {
    for (const d of ['2026-10-23', '2026-11-05', '2026-10-12', '2026-11-02']) if (src[m].includes(d)) e.push(`${m}.ts contient la date ${d}`)
    if (/jalon/i.test(src[m])) e.push(`${m}.ts contient « jalon »`)
  }
  return { echecs: e, detail: 'la date du bilan vient de la base (« bilan du 02/11 », sinon « bilan non daté, formulaire fermé », 0 sur 100) ; P3 débloque « Bilan passé » ; aucune date écrite, plus de « jalon »' }
})
await S.critere('MI-3', () => {
  const e = [], cm = fn(MI, 'commandement', 'missions'), ps = fn(MI, 'palierSalle', 'missions')
  const c = cm(CMD())
  const tous = c?.tousSucces ?? []
  if (canon(tous.map((x) => x.cle)) !== canon(['premier_oui', 'premiere_vente', 'premier_site_en_ligne', 'bilan_passe'])) e.push(`tousSucces ${JSON.stringify(tous.map((x) => x.cle))}, les quatre dans l’ordre attendus`)
  for (const x of tous) {
    if (x.debloque && x.le !== CMD().succesDates[x.cle]) e.push(`${x.cle} débloqué sans sa date`)
    if (!x.debloque && x.le !== null) e.push(`${x.cle} à venir avec une date`)
  }
  const xp = cm(CMD({ mesures: { encaisse_eur: 312, oui: 50, contacts_froids: 100, sites_en_ligne: 3 } }))?.niveau?.xp
  if (xp !== 312) e.push(`missions atteintes : xp ${xp}, 312 attendu (aucune récompense)`)
  for (const [n, attendu] of [[0, null], [1, 'LV.1'], [10, 'LV.2'], [50, 'LV.3']]) { const r = ps('usine', { sites_en_ligne: n }); if ((r?.texte ?? null) !== attendu) e.push(`palierSalle(usine, ${n} sites) = ${JSON.stringify(r)}, ${attendu} attendu`) }
  if (ps('radar', { palier: 'P2', sites_en_ligne: 50, niveau: 3 }) !== null) e.push('palierSalle(radar) n’est pas null')
  if (ps('envois', { palier: 'P2' })?.texte !== 'LV.2' || ps('envois', { palier: 'P3' })?.lv !== 3) e.push(`palierSalle(envois) ne suit pas le palier servi (${JSON.stringify(ps('envois', { palier: 'P2' }))})`)
  return { echecs: e, detail: 'quatre succès, datés ou à venir (le: null) ; l’XP ne suit que l’encaissé ; paliers de l’Usine 1, 10, 50 ; radar sans palier ; envois suit le palier servi' }
})
await S.critere('XP-1', () => {
  const e = [], ex = fn(XP, 'etatExperience', 'experience')
  const cas = [
    [{ ventes: 0, statut: null }, 'Aucune expérience avant la première vente (décision R13).', null],
    [{ ventes: 1, statut: null }, 'Aucune expérience en cours. Lancer une expérience se décide avec Benj (R13).', null],
    [{ ventes: 1, statut: 'arretee_auto', jour: 30, gains_eur: 0 }, 'Arrêtée seule à J30 : rien rapporté.', null],
    [{ ventes: 1, statut: 'gagnante', jour: 30, gains_eur: 42 }, 'J30 atteint : 42 € gagnés. À toi de décider de la suite.', null],
    [{ ventes: 1, statut: 'arretee', jour: 12, gains_eur: 0 }, 'Arrêtée par Benj.', null],
    // La ligne RÉELLE de station_experience_etat() (0112) ne porte pas `ventes` mais `aucune_vente` (booléen) : D-0510-1, 05/10.
    [{ aucune_vente: true, statut: null }, 'Aucune expérience avant la première vente (décision R13).', null],
    [{ aucune_vente: false, statut: null }, 'Aucune expérience en cours. Lancer une expérience se décide avec Benj (R13).', null],
  ]
  for (const [l, texte, barre] of cas) { const r = ex(l, M); if (esp(r?.texte) !== esp(texte) || r?.barre !== barre) e.push(`${l.statut ?? `ventes ${l.ventes}`} : ${JSON.stringify({ texte: r?.texte, barre: r?.barre })}, « ${texte} » sans barre attendu`) }
  for (const c of jeuS('experiences.json').cas) {
    const r = ex(c.ligne, M)
    if (c.nom === 'en_cours_j6' && esp(r?.barre) !== 'J6/30 · 0 €') e.push(`en cours J6 : barre « ${r?.barre} », « J6/30 · 0 € » attendue`)
    if (c.nom !== 'en_cours_j6' && r?.barre !== null) e.push(`${c.nom} : barre ${JSON.stringify(r?.barre)}, null attendue`)
    if (r?.sur !== 30) e.push(`${c.nom} : sur = ${r?.sur}, 30 attendu`)
  }
  // La date d'arrêt automatique est celle que la base sert (fin_prevue_le) ; hors « en cours », null ; le nom de la base vaut titre.
  const fin = '2026-11-04T10:00:00.000Z'
  const rEc = ex({ aucune_vente: false, statut: 'en_cours', jour: 6, gains_eur: 0, fin_prevue_le: fin, nom: 'Essai nommé' }, M)
  if (rEc?.arret_le !== fin) e.push(`en cours : arret_le ${JSON.stringify(rEc?.arret_le)}, fin_prevue_le servie « ${fin} » attendue`)
  if (rEc?.titre !== 'Essai nommé') e.push(`en cours : titre ${JSON.stringify(rEc?.titre)}, le nom servi « Essai nommé » attendu`)
  for (const st of ['arretee_auto', 'gagnante', 'arretee']) { const r = ex({ aucune_vente: false, statut: st, jour: 30, gains_eur: 3, fin_prevue_le: fin }, M); if (r?.arret_le !== null) e.push(`${st} : arret_le ${JSON.stringify(r?.arret_le)}, null attendu (rien ne s'arrête plus)`) }
  const r31 = ex({ ventes: 1, statut: 'en_cours', jour: 31, gains_eur: 0 }, M)
  if (!/^J30\/30/.test(esp(r31?.barre))) e.push(`jour 31 affiché « ${r31?.barre} », J30/30 attendu`)
  return { echecs: e, detail: 'les six phrases exactes ; barre seulement en cours (« J6/30 · 0 € ») ; jour 31 affiché 30' }
})

// ── SM-2 : entrées vides ou nulles ; entrées gelées ; typecheck sur la racine réelle ───────────────────────────────────────
await S.critere('SM-2', () => {
  const e = []
  const appels = [
    ['barre', 'barre', [{}, M]], ['barre', 'barre', [null, M]], ['barre', 'compteARebours', [null, M]], ['barre', 'quota', [null]], ['barre', 'envoisBarre', [null, null]],
    ['barre', 'agentsActifs', [[]]], ['barre', 'agentsActifs', [null]], ['barre', 'jour', [null, M]], ['barre', 'prochaineReunion', [M, null]],
    ['equipage', 'equipage', [[], [], M]], ['equipage', 'equipage', [null, null, M]], ['equipage', 'positions', [[], []]], ['equipage', 'modeleAffiche', [{ nom: 'x' }, M]],
    ['attention', 'cartesAttention', [{}, M]], ['attention', 'cartesAttention', [null, M]],
    ['fil', 'bulles', [[]]], ['fil', 'bulles', [null]], ['fil', 'bandeau', [[]]], ['fil', 'derniereBulle', [[]]], ['fil', 'masquer', ['']],
    ['tapis', 'tapis', [[]]], ['tapis', 'tapis', [null]], ['tapis', 'lignes', [{}]], ['tapis', 'lignes', [null]], ['tapis', 'mouvements', [null, null]],
    ['missions', 'commandement', [{ mesures: {}, objectif: null, compteRendu: [], bilan: null, succesDates: {} }]], ['missions', 'commandement', [{}]], ['missions', 'palierSalle', ['radar', {}]],
    ['experience', 'etatExperience', [null, M]], ['experience', 'etatExperience', [{}, M]],
  ]
  for (const [m, f, args] of appels) {
    try {
      const r = fn(mods[m], f, m)(...args.map((a) => (a instanceof Date ? a : gelerProfond(structuredClone(a)))))
      const v = valeursInterdites(r, { undefinedInterdit: true })
      if (v.length) e.push(`${m}.${f}(${args.map((a) => JSON.stringify(a)?.slice(0, 20)).join(', ')}) : ${v.slice(0, 2).join(', ')}`)
    } catch (err) { e.push(`${m}.${f}(${args.map((a) => JSON.stringify(a)?.slice(0, 20)).join(', ')}) lève : ${premiereLigne(err)}`) }
  }
  const agentsG = gelerProfond(structuredClone(AGENTS)), evtsG = gelerProfond(structuredClone(EVTS))
  const avant = canon([agentsG, evtsG])
  for (const [quoi, f] of [['equipage', () => fn(EQ, 'equipage', 'equipage')(agentsG, evtsG, M)], ['bulles', () => fn(FI, 'bulles', 'fil')(evtsG)], ['bandeau', () => fn(FI, 'bandeau', 'fil')(evtsG)], ['cartesAttention', () => fn(AT, 'cartesAttention', 'attention')(gelerProfond(jeuS('sources-attention.json').sources), M)], ['tapis', () => fn(TA, 'tapis', 'tapis')(gelerProfond(jeuS('tapis.json').avant))]]) {
    try { const v = valeursInterdites(f(), { undefinedInterdit: true }); if (v.length) e.push(`${quoi} sur les jeux gelés : ${v.slice(0, 2).join(', ')}`) } catch (err) { e.push(`${quoi} sur des entrées gelées lève (il les modifie ?) : ${premiereLigne(err)}`) }
  }
  if (canon([agentsG, evtsG]) !== avant) e.push('les jeux gelés ont changé')
  let tc = 'typecheck : jugé sur la racine réelle seulement (sans --racine ni --temoin)'
  if (VIVANT) { const r = typecheck(RAC, JUGE); tc = r.detail; if (!r.ok) e.push(r.detail) }
  return { echecs: e.slice(0, 8), detail: `${appels.length} appels à entrées vides ou nulles sans NaN, Infinity ni undefined ; entrées gelées non modifiées ; ${tc}` }
})

// ── SM-JEUX (--temoin) : l'auto-contrôle des jeux d'essai de s/ dont ce juge se sert ─────────────────────────────────────
if (o.temoin) {
  await S.critere('SM-JEUX', () => {
    const e = []
    if (AGENTS.length !== 15) e.push(`agents.json : ${AGENTS.length} lignes, 15 attendues`)
    for (const x of AGENTS) if (!/^[a-z0-9_]+$/.test(x.nom) || x.libelle !== x.nom) e.push(`agents.json : ligne ${x.nom} mal formée`)
    if (!AGENTS.some((a) => !(a.nom in EQUIPAGE_ATTENDU))) e.push('agents.json : aucun nom inconnu')
    if (EVTS.length !== 60 || EVTS.some((x, i) => x.id !== i + 1)) e.push('evenements.json : 60 événements d’id 1 à 60 attendus')
    for (const t of ['tache_prise', 'passage', 'battement', 'reunion_ouverte', 'reunion_close', 'reunion_abandonnee', 'consigne', 'consigne_lue']) if (!EVTS.some((x) => x.type === t)) e.push(`evenements.json : aucun ${t}`)
    if (EVTS.filter((x) => x.type === 'reunion_compte_rendu').length !== 5) e.push('evenements.json : cinq reunion_compte_rendu attendus')
    for (const p of PIEGES) if (!EVTS.some((x) => (x.resume ?? '').includes(p))) e.push(`evenements.json : le piège « ${p} » n’est dans aucun résumé`)
    if (!EVTS.some((x) => x.salle === RESERVEE)) e.push('evenements.json : aucun événement « salle: ecommerce »')
    if (T(EVTS[EVTS.length - 1].le) > T(M)) e.push('evenements.json : un événement après l’instant figé')
    const noms = chaines([AGENTS, EVTS]).join(' ')
    if (/\b(?:M\.|Mme|Madame|Monsieur)\s+(?!Témoin|Jean Témoin)[A-Z]/.test(noms)) e.push('un nom de personne sans « Témoin »')
    return { echecs: e, detail: `agents.json (15 lignes, un nom inconnu), evenements.json (60, huit types, cinq comptes rendus, ${PIEGES.length} pièges, un « salle: ecommerce »), sans nom réel` }
  })
}
process.exit(S.finir())
