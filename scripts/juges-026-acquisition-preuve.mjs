// scripts/juges-026-acquisition-preuve.mjs — la preuve des juges du domaine acquisition (fiche 026-016), écrite par Claude
// Code. Elle tient le REGISTRE des juges du domaine, lot par lot : { lot, juge, arguments, attendu } (critère attendu en
// échec sur l'arbre de référence). Les fiches de juges suivantes complètent le registre de leur lot sans toucher aux autres
// lots (026-069 lot 2, 026-080 lot 3, 026-037 lot 4, 026-062 lot 5, 026-081 lot 6, 026-071 lot 7).
//
//   node scripts/juges-026-acquisition-preuve.mjs --lot=<N>
//
// Elle produit elle-même toutes ses preuves ; elle ne lit aucun journal déposé par quelqu'un d'autre.
//   JP-1  (lot 1) lib/agents/acquisition/contrat.ts s'importe par ts-loader et exporte chacun des noms du §1 de 026-016
//         (liste tenue ici : les types lus dans le source, les valeurs à l'exécution) ; TRANSITIONS, PALIERS, SEUILS et
//         SOURCES_LISTE sont gelés ; PALIERS vaut exactement le tableau de la voie gratuite (P0 5/5, P1 10/5, P2 20/bilan,
//         P3 30/5, P4 40/plafond), aucun palier au-delà de 40 ; DATE_PREMIER_ENVOI, BILAN_CONTACTS, EMAIL_SOLLICITE_JOUR,
//         SEUIL_ELIGIBLES, SEUILS, PLAFONDS_DEFAUT (instagram, facebook, formulaire_site à 0, pas de clé email),
//         DOMAINE_PRINCIPAL, PREMIERE_PHRASE et NOM_EXPEDITEUR mot pour mot ; MESSAGERIES_GRATUITES et DOMAINES_EXCLUS ;
//         le contrat, commentaires ôtés, n'exporte aucun nom du séquenceur retiré par la voie gratuite.
//   JP-2  la référence (reference.txt, ancêtre de HEAD) est extraite par `git archive` sous
//         .orchestre/travail/026-acquisition/reference/ (rien n'est écrit dans .git) ; chaque juge du lot, lancé avec
//         --racine=<référence>, sort en code 1 ou 2 (un verdict, pas un plantage) et son PREMIER critère est en échec avec
//         l'identifiant attendu.
//   JP-3  chaque juge du lot sort en code 0 en --auto-controle.
//   JP-4  (lot 1) aucun jeu d'essai de scripts/fixtures/026-acquisition/ ne nomme un domaine hors .invalid, hors la liste
//         fermée de 026-016 (recherche par expressions régulières : URL, adresses, noms de domaine nus à extension connue).
//   JP-5  echecs-attendus.md (dans le dossier de preuves de la fiche du lot) porte, pour chaque juge, un extrait réel de sa
//         sortie d'au moins 20 signes, relu après écriture et retrouvé dans la sortie que la preuve vient de produire.
//   JP-6  (lot 1) le magasin factice, sur son propre scénario : chacune des règles de JP-6 (REGLES_JP6 de
//         magasin-memoire.mjs) est verte et aucune ne lève ; TRANSITIONS porte maquette_prete → lien_prepare ; les options
//         de chaque DecisionAcquisition vont de 2 à 7 (lu dans le contrat : OptionsDecision et OPTIONS_DECISIONS).
//   JP-3  s'étend à une entrée qui porte `auto` : chacune de ces épreuves est verte dans la sortie de --auto-controle
//         (lot 4 : le témoin de chaque juge et les analyseurs exigés par JP-2 de 026-037).
//   JP-7  (lot 4, JP-3 de 026-037) aucun chemin du registre ne lance --reel ; ops-acquisition-qa refuse --reel sans
//         --confirmer-reel (code 2, avant tout accès), et confidentialite-prospection-qa de même pour --hebergement --reel.
//   JP-8  (lot 4, JP-5 de 026-037) aucun juge du lot ne contient sequenceur, SEQUENCEUR, META_ADLIB_TOKEN,
//         ACQ_ADRESSES_NOMINATIVES ni domaines-prospection hors de son bloc « chaînes refusées » ;
//         confidentialite-prospection-qa --domaines sort en code 2 et renvoie vers --hebergement.
//   JP-9  (lot 4, JP-4 de 026-037) les lots 1 à 3 restent verts : chaque lot déjà peuplé (au moins un juge inscrit) est
//         rejoué par un sous-processus de cette preuve (--lot=1, 2, 3) et doit sortir en PASS ; un lot pas encore peuplé
//         (« aucun juge inscrit ») est toléré, ce n'est pas une régression de 026-037.
//
// Sortie : une ligne par critère, puis « juges-026-acquisition-preuve --lot=<N> : PASS|FAIL — … ». Code 0 seulement si tout
// est vert ; 1 sinon ; 2 si l'appel est invalide. N'écrit que sous .orchestre/travail/026-acquisition/ et dans
// .orchestre/preuves/<fiche du lot>/echecs-attendus.md. Ne lit ni .env.local ni presti-secrets ; aucun appel réseau.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, TRAVAIL, LOADER, REFERENCE, court, premiereLigne, lancer, git, lireOptions, sansCommentaires, exportsNommes, extraireReference,
  exigerSousTravail, sous, lireOuNull,
} from './fixtures/026-acquisition/commun.mjs'

const NOM_PREUVE = 'juges-026-acquisition-preuve'
const FICHE_DU_LOT = { 1: '026-016', 2: '026-069', 3: '026-080', 4: '026-037', 5: '026-062', 6: '026-081', 7: '026-071' }

// ── Le registre ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// Une entrée par juge et par partie. `loader` : lancé avec --import ./scripts/ts-loader.mjs. `reference` (facultatif) : un
// autre commit que reference.txt. Jamais de --reel, de --racine ni de --auto-controle dans `arguments` : la preuve les pose.
const REGISTRE = [
  { lot: 1, juge: 'scripts/recenseur-qa.mjs', arguments: ['--partie=sirene'], attendu: 'RS-1', loader: true },
  { lot: 1, juge: 'scripts/recenseur-qa.mjs', arguments: ['--partie=rge'], attendu: 'RG-1', loader: true },
  { lot: 1, juge: 'scripts/recenseur-qa.mjs', arguments: ['--partie=site'], attendu: 'LS-1', loader: true },
  { lot: 1, juge: 'scripts/recenseur-qa.mjs', arguments: ['--partie=orchestration'], attendu: 'RC-1', loader: true },
  { lot: 1, juge: 'scripts/faits-qa.mjs', arguments: [], attendu: 'JF-1', loader: true },
  // Lot 2 (026-069) : la vigie Meta, J3/le second juge et la Plume. Chaque module jugé (vigieMeta.ts, modeles.ts +
  // conformite.ts + secondJuge.ts, redacteur.ts) est écrit par une fiche ultérieure (026-072, 026-083, 026-087) : sur la
  // référence, le premier critère échoue avec « module absent ».
  { lot: 2, juge: 'scripts/vigie-meta-qa.mjs', arguments: [], attendu: 'VM-1', loader: true },
  { lot: 2, juge: 'scripts/conformite-qa.mjs', arguments: [], attendu: 'CO-1', loader: true },
  { lot: 2, juge: 'scripts/redacteur-qa.mjs', arguments: [], attendu: 'RD-1', loader: true },
  // Lot 3 (026-080) : le Standard, le lien privé d'une maquette, l'Atelier sur l'usine. Chaque module jugé
  // (standardiste.ts, maquettesLien.ts, atelier-maquettes.mjs + magasinUsine.ts + les quatre routes) est écrit par une
  // fiche ultérieure (026-085, 026-082, 026-097) : sur la référence, le premier critère échoue avec « module absent ».
  { lot: 3, juge: 'scripts/standardiste-qa.mjs', arguments: [], attendu: 'ST-1', loader: true },
  { lot: 3, juge: 'scripts/maquette-lien-qa.mjs', arguments: [], attendu: 'ML-1', loader: true },
  { lot: 3, juge: 'scripts/atelier-maquettes-qa.mjs', arguments: [], attendu: 'AM-1', loader: true },
  // Lot 4 (026-037) : la base, les routes, la page de confidentialité. `auto` : les épreuves exigées en --auto-controle.
  { lot: 4, juge: 'scripts/ops-acquisition-qa.mjs', arguments: ['--migration=socle'], attendu: 'OA-1', auto: ['AC-TEMOIN-SOCLE', 'AC-OA-2A', 'AC-OA-2B', 'AC-OA-2C', 'AC-TEMOIN-OAR', 'AC-OAR-1', 'AC-OAR-2'] },
  { lot: 4, juge: 'scripts/ops-acquisition-qa.mjs', arguments: ['--migration=echanges'], attendu: 'OB-1', auto: ['AC-TEMOIN-ECHANGES', 'AC-TEMOIN-OBR', 'AC-OBR-1', 'AC-OBR-2'] },
  { lot: 4, juge: 'scripts/ops-acquisition-qa.mjs', arguments: ['--migration=planification'], attendu: 'PG-1', auto: ['AC-TEMOIN-PLANIFICATION', 'AC-TEMOIN-PGR', 'AC-PGR-1', 'AC-PGR-2'] },
  { lot: 4, juge: 'scripts/routes-acquisition-qa.mjs', arguments: ['--lot=recensement'], attendu: 'RA-1', loader: true, auto: ['AC-TEMOIN-RECENSEMENT', 'AC-RA-2A'] },
  { lot: 4, juge: 'scripts/routes-acquisition-qa.mjs', arguments: ['--lot=echanges'], attendu: 'RB-1', loader: true, auto: ['AC-TEMOIN-ECHANGES'] },
  { lot: 4, juge: 'scripts/confidentialite-prospection-qa.mjs', arguments: [], attendu: 'CP-1', auto: ['AC-TEMOIN-CP', 'AC-TEMOIN-CPH'] },
  // Lot 5 (026-062) : l'envoi automatique — Facteur, porteur Gmail, porteur du formulaire, disjoncteurs, jauges. Chaque
  // module jugé (facteur.ts, porteurs/gmail.ts, porteurFormulaire.ts, disjoncteurs.ts, jauges.ts) est écrit par une fiche
  // ultérieure (026-089, 026-095, 026-063, 026-064) : sur la référence, le premier critère échoue avec « module absent ».
  { lot: 5, juge: 'scripts/facteur-qa.mjs', arguments: ['--partie=facteur'], attendu: 'FA-1', loader: true },
  { lot: 5, juge: 'scripts/facteur-qa.mjs', arguments: ['--partie=porteur'], attendu: 'PF-1', loader: true },
  { lot: 5, juge: 'scripts/facteur-qa.mjs', arguments: ['--partie=gmail'], attendu: 'GM-1', loader: true },
  { lot: 5, juge: 'scripts/disjoncteurs-qa.mjs', arguments: [], attendu: 'DJ-1', loader: true },
  { lot: 5, juge: 'scripts/jauges-qa.mjs', arguments: [], attendu: 'JG-1', loader: true },
  // Lot 7 (026-071) : la fabrication — la vidéo de maquette et la bibliothèque des douleurs. Chaque module jugé
  // (scripts/agents/maquette-video.mjs, lib/agents/acquisition/douleurs.ts) est écrit par une fiche ultérieure
  // (026-075, 026-073) : sur la référence, le premier critère échoue avec « module absent ».
  { lot: 7, juge: 'scripts/maquette-video-qa.mjs', arguments: [], attendu: 'MV-1' },
  { lot: 7, juge: 'scripts/douleurs-qa.mjs', arguments: [], attendu: 'DL-1', loader: true },
]
// Les critères propres à un lot (les autres lots ont JP-2, JP-3 et JP-5 ; leurs fiches ajoutent les leurs ici).
const CRITERES = { 1: ['JP-1', 'JP-2', 'JP-3', 'JP-4', 'JP-5', 'JP-6'], 4: ['JP-2', 'JP-3', 'JP-5', 'JP-7', 'JP-8', 'JP-9'] }

const o = lireOptions(process.argv.slice(2), { connues: ['lot'] })
const refuser = (m) => { console.log(`${NOM_PREUVE} : appel refusé — ${m}`); process.exit(2) }
const LOT = Number(o.valeurs.lot)
if (!FICHE_DU_LOT[LOT]) refuser(`--lot=<1 à 7> attendu (reçu : ${o.valeurs.lot ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length || o.valeurs.racine || o.autoControle) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ') || '--racine / --auto-controle (options des juges, pas de la preuve)'}`)
const FICHE = FICHE_DU_LOT[LOT]
const NOM = `${NOM_PREUVE} --lot=${LOT}`
const IDS = CRITERES[LOT] ?? ['JP-2', 'JP-3', 'JP-5']
const TRAV = exigerSousTravail(path.join(TRAVAIL, '026-acquisition'))
const SORTIES = exigerSousTravail(path.join(TRAV, `sorties-lot-${LOT}`))
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const RE_CRITERE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)\b/
const RE_ID = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/

const verdicts = new Map()
const noter = (id, echecs, detail) => { const v = verdicts.get(id) ?? { echecs: [], details: [] }; v.echecs.push(...echecs); if (detail) v.details.push(detail); verdicts.set(id, v) }
const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
function finir() {
  console.log(`${NOM} — fiche ${FICHE}, ${REGISTRE.filter((e) => e.lot === LOT).length} juge(s) au registre du lot`)
  const rouges = []
  for (const id of IDS) {
    const v = verdicts.get(id)
    if (!v) { rouges.push(id); console.log(`❌ ${id} non évalué`); continue }
    if (v.echecs.length) { rouges.push(id); console.log(`❌ ${id} ${ligne(v.echecs.slice(0, 8).join(' ; ') + (v.echecs.length > 8 ? ` ; … (${v.echecs.length} défauts)` : ''))}`) }
    else console.log(`✅ ${id} ${ligne(v.details.join(' ; ')) || 'conforme'}`)
  }
  console.log(rouges.length ? `${NOM} : FAIL — ${rouges.join(', ')}` : `${NOM} : PASS`)
  process.exit(rouges.length ? 1 : 0)
}

// ── Le registre du lot, relu ──────────────────────────────────────────────────────────────────────────────────────────────
const entrees = REGISTRE.filter((e) => e.lot === LOT)
{
  const e = []
  if (!entrees.length) e.push(`aucun juge inscrit au lot ${LOT} du registre`)
  for (const [i, x] of entrees.entries()) {
    if (!/^scripts\/[\w./-]+\.mjs$/.test(x.juge) || x.juge.includes('..') || !fs.existsSync(path.join(R, x.juge))) e.push(`entrée ${i + 1} : juge ${JSON.stringify(x.juge)} introuvable`)
    if (!Array.isArray(x.arguments) || x.arguments.some((a) => typeof a !== 'string' || /^--(racine|auto-controle|reel|confirmer-reel)\b/.test(a))) e.push(`entrée ${i + 1} : arguments ${JSON.stringify(x.arguments)} (ni --racine, ni --auto-controle, ni --reel)`)
    if (!RE_ID.test(String(x.attendu))) e.push(`entrée ${i + 1} : critère attendu ${JSON.stringify(x.attendu)} mal formé`)
    if (x.auto !== undefined && (!Array.isArray(x.auto) || x.auto.some((a) => !RE_ID.test(String(a))))) e.push(`entrée ${i + 1} : épreuves auto ${JSON.stringify(x.auto)} mal formées`)
  }
  if (e.length) { for (const id of IDS) noter(id, id === 'JP-2' ? e : ['non jugé : registre du lot refusé']); finir() }
}
fs.mkdirSync(SORTIES, { recursive: true })
for (const f of fs.readdirSync(SORTIES)) fs.unlinkSync(path.join(SORTIES, f))
const label = (x) => `${path.basename(x.juge, '.mjs')}${x.arguments.length ? ` ${x.arguments.join(' ')}` : ''}`
/** Lance un juge depuis la racine du dépôt ; garde sa sortie sous .orchestre/travail/026-acquisition/sorties-lot-N/. */
function lancerJuge(x, extra, nom) {
  const args = [...(x.loader ? ['--import', './scripts/ts-loader.mjs'] : []), x.juge, ...x.arguments, ...extra]
  const r = lancer(process.execPath, args, { cwd: R, timeout: 10 * 60_000 })
  fs.writeFileSync(path.join(SORTIES, `${nom}.log`), `$ node ${args.join(' ')}\n${r.stdout}\n--- stderr ---\n${r.stderr}\n--- code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} · ${r.duree.toFixed(1)} s\n`)
  return r
}
const lignesDe = (sortie) => String(sortie).split(/\r?\n/).map((l) => l.trim())

// ── JP-1 : le contrat ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Les noms du §1 de 026-016 (types lus dans le source ; valeurs vérifiées à l'exécution).
const TYPES_CONTRAT = [
  'NomAgent', 'Source', 'Cible', 'Canal', 'TypeFait', 'Fait', 'CanalTrouve', 'Formulaire', 'VerdictFormulaire', 'PreuveDemande',
  'PreuveSoumission', 'Candidat', 'Etape', 'ProspectReserve', 'PatchProspect', 'ClesOpposition', 'Annonceur', 'Evenement', 'TypeEnvoi',
  'Verdict', 'Verdicts', 'EnvoiPrepare', 'EnvoiApprouve', 'Palier', 'EtatEnvoi', 'Signal', 'MaquetteEtat', 'ReponseProspect',
  'ClasseReponse', 'Classement', 'DecisionAcquisition', 'Conversation', 'PageRecue', 'Recuperateur', 'Horloge', 'Lecteur', 'Budget',
  'Stockage', 'MagasinSocle', 'MagasinEchanges', 'MagasinEnvoi', 'Magasin',
]
const VALEURS_CONTRAT = [
  'TRANSITIONS', 'METIERS', 'NAF_BATIMENT', 'UA_RECENSEUR', 'DOMAINES_EXCLUS', 'DOMAINES_TIERS', 'MESSAGERIES_GRATUITES', 'NAF_EXCLUS_MARQUE',
  'TERMES_MARQUES', 'DOMAINE_PRINCIPAL', 'PREMIERE_PHRASE', 'NOM_EXPEDITEUR', 'NOTICE_URL', 'SOURCES_LISTE', 'PLAFONDS_DEFAUT', 'PALIERS',
  'DATE_PREMIER_ENVOI', 'BILAN_CONTACTS', 'EMAIL_SOLLICITE_JOUR', 'SEUIL_ELIGIBLES', 'SEUILS', 'MAQUETTES_PAR_JOUR', 'MAQUETTES_ENTRANTS_JOUR',
  'REPONSES_MAX_PROSPECT_24H', 'REPONSES_MAX_JOUR', 'REPONSE_DELAI_MIN_MINUTES', 'RGPD_REPONSES_MAX', 'RGPD_FENETRE_JOURS', 'META_APPELS_PAR_HEURE',
  'EXPIRATION_MAQUETTE_JOURS', 'TENTATIVES_MAX', 'DELAI_RECONTACT_JOURS', 'PAS_MAINTENANT_JOURS', 'MESSAGES_MAX_PAR_PROSPECT', 'ECART_MIN_HEURES',
  'RELANCE_MAQUETTE_JOURS', 'FENETRE_META_HEURES', 'REPONSE_PRIVEE_JOURS', 'STOP_DELAI_MINUTES', 'MOTS_MAX_FORMULAIRE', 'PROCHES', 'EXTRAIT_MIN',
  'EXTRAIT_MAX', 'BUDGET_EXECUTION_MS',
]
const RETIRES = ['Boite', 'NOUVEAUX_MAX_PAR_BOITE', 'ENVOIS_MAX_PAR_BOITE', 'CHAUFFE_JOURS', 'ADRESSES_GENERIQUES', 'Sequenceur', 'POUSSES_MAX_PAR_BOITE_PASSAGE']
const FICHIER_CONTRAT = path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')
let K = null
if (IDS.includes('JP-1') || IDS.includes('JP-6')) {
  try {
    await import(pathToFileURL(LOADER).href)
    K = await import(pathToFileURL(FICHIER_CONTRAT).href)
  } catch (e) { noter('JP-1', [`contrat.ts ne s'importe pas par ts-loader : ${premiereLigne(e)}`]) }
}
if (IDS.includes('JP-1') && K) {
  const e = []
  const src = fs.readFileSync(FICHIER_CONTRAT, 'utf8')
  const exportes = new Set(exportsNommes(src))
  for (const n of TYPES_CONTRAT) if (!exportes.has(n)) e.push(`type ${n} non exporté`)
  for (const n of VALEURS_CONTRAT) if (K[n] === undefined && n !== 'NOTICE_URL') e.push(`valeur ${n} non exportée`)
  if (!('NOTICE_URL' in K)) e.push('NOTICE_URL non exportée')
  for (const n of RETIRES) if (exportes.has(n) || n in K) e.push(`${n} encore exporté (retiré par la voie gratuite)`)
  for (const n of ['TRANSITIONS', 'PALIERS', 'SEUILS', 'SOURCES_LISTE']) if (!Object.isFrozen(K[n])) e.push(`${n} n'est pas gelé`)
  const attendus = [['P0', 5, 5], ['P1', 10, 5], ['P2', 20, null], ['P3', 30, 5], ['P4', 40, null]]
  const vus = (K.PALIERS ?? []).map((p) => [p.id, p.par_jour, p.jours_au_vert])
  if (JSON.stringify(vus) !== JSON.stringify(attendus)) e.push(`PALIERS ${JSON.stringify(vus)}, ${JSON.stringify(attendus)} attendu`)
  if ((K.PALIERS ?? []).some((p) => p.par_jour > 40)) e.push('un palier au-delà de 40')
  if (!/bilan/i.test(K.PALIERS?.[2]?.regle ?? '')) e.push('P2 ne dit pas « passage au bilan »')
  if (!/plafond/i.test(K.PALIERS?.[4]?.regle ?? '')) e.push('P4 ne dit pas « plafond »')
  const exact = { DATE_PREMIER_ENVOI: '2026-10-12', BILAN_CONTACTS: 100, EMAIL_SOLLICITE_JOUR: 50, SEUIL_ELIGIBLES: 0.05, DOMAINE_PRINCIPAL: 'prestiapp.fr', PREMIERE_PHRASE: "Message commercial de Presti, rédigé et envoyé par l'assistant IA de Presti. Ce n'est pas une demande de devis.", NOM_EXPEDITEUR: 'Benjamin Filiot – Presti' }
  for (const [k, v] of Object.entries(exact)) if (K[k] !== v) e.push(`${k} = ${JSON.stringify(K[k])}, ${JSON.stringify(v)} attendu`)
  const seuils = { stop_100: 4, plaintes_7j: 2, avis_abus: 1, echecs_affilee: 3, sans_reponse: 300 }
  if (JSON.stringify(K.SEUILS) !== JSON.stringify(seuils)) e.push(`SEUILS ${JSON.stringify(K.SEUILS)}, ${JSON.stringify(seuils)} attendu`)
  for (const c of ['instagram', 'facebook', 'formulaire_site']) if (K.PLAFONDS_DEFAUT?.[c] !== 0) e.push(`PLAFONDS_DEFAUT.${c} = ${K.PLAFONDS_DEFAUT?.[c]}, 0 attendu`)
  if (K.PLAFONDS_DEFAUT && 'email' in K.PLAFONDS_DEFAUT) e.push('PLAFONDS_DEFAUT a une clé email')
  for (const d of ['gmail.com', 'orange.fr']) if (!K.MESSAGERIES_GRATUITES?.includes(d)) e.push(`MESSAGERIES_GRATUITES sans ${d}`)
  for (const d of ['facebook.com', 'instagram.com', 'pagesjaunes.fr', 'linkedin.com']) if (!K.DOMAINES_EXCLUS?.includes(d)) e.push(`DOMAINES_EXCLUS sans ${d}`)
  if (/^\s*import\b/m.test(sansCommentaires(src))) e.push('le contrat importe un module (types et constantes seulement)')
  noter('JP-1', e, `contrat.ts importé par ts-loader : ${TYPES_CONTRAT.length} types et ${VALEURS_CONTRAT.length} valeurs du §1 exportés ; TRANSITIONS, PALIERS, SEUILS, SOURCES_LISTE gelés ; PALIERS = P0 5/5, P1 10/5, P2 20/bilan, P3 30/5, P4 40/plafond ; DATE_PREMIER_ENVOI 2026-10-12, BILAN_CONTACTS 100, EMAIL_SOLLICITE_JOUR 50, SEUIL_ELIGIBLES 0.05 ; SEUILS exacts ; PLAFONDS_DEFAUT sans email et à 0 pour instagram, facebook, formulaire_site ; PREMIERE_PHRASE et NOM_EXPEDITEUR mot pour mot ; aucun des ${RETIRES.length} noms du séquenceur`)
}

// ── JP-2 : sur la référence ; JP-3 : en auto-contrôle ─────────────────────────────────────────────────────────────────────
let REF = null
{
  const e = []
  try {
    if (!REFERENCE) throw new Error('reference.txt ne porte aucun sha de 40 caractères')
    const shas = [...new Set(entrees.map((x) => x.reference ?? REFERENCE))]
    if (shas.length !== 1) throw new Error(`plusieurs références dans le lot ${LOT} : ${shas.join(', ')} (une seule prise en charge)`)
    const c = git(['rev-parse', '--verify', `${shas[0]}^{commit}`])
    if (c.code !== 0) throw new Error(`référence ${shas[0]} introuvable : ${court(c.stderr)}`)
    const commit = c.stdout.trim()
    if (git(['merge-base', '--is-ancestor', commit, 'HEAD']).code !== 0) e.push(`la référence ${commit.slice(0, 7)} n'est pas un ancêtre de HEAD`)
    REF = extraireReference(commit, path.join(TRAV, 'reference'))
  } catch (err) { e.push(premiereLigne(err)) }
  if (e.length) noter('JP-2', e)
}
const resultats = []
for (const [i, x] of entrees.entries()) {
  const nom = `${i + 1}-${label(x).replace(/[^\w-]+/g, '-')}`
  const res = { x, label: label(x), ref: null, auto: null, extrait: null }
  if (REF) {
    const r = lancerJuge(x, [`--racine=${REF.dest}`], `${nom}.reference`)
    const premiere = lignesDe(r.sortie).find((l) => RE_CRITERE.test(l)) ?? null
    res.ref = { code: r.code, sortie: r.sortie, premiere, erreur: r.erreur }
    const e = []
    if (r.code !== 1 && r.code !== 2) e.push(`${res.label} sur la référence : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, un verdict 1 ou 2 attendu, pas ${r.code === 0 ? 'un succès' : 'un plantage'}`)
    if (!premiere) e.push(`${res.label} sur la référence : aucune ligne de critère — ${court(r.sortie.trim().split(/\r?\n/).pop(), 120)}`)
    else if (!premiere.startsWith(`❌ ${x.attendu} `) && premiere !== `❌ ${x.attendu}`) e.push(`${res.label} sur la référence : premier critère « ${court(premiere, 120)} », « ❌ ${x.attendu} … » attendu`)
    else res.extrait = premiere.length > 300 ? premiere.slice(0, 300) : premiere
    noter('JP-2', e)
  }
  const a = lancerJuge(x, ['--auto-controle'], `${nom}.auto-controle`)
  const verts = lignesDe(a.sortie).filter((l) => l.startsWith('✅ ')).map((l) => RE_CRITERE.exec(l)?.[2]).filter(Boolean)
  const rouges = lignesDe(a.sortie).filter((l) => l.startsWith('❌ '))
  res.auto = { code: a.code, verts, rouges, derniere: a.sortie.trim().split(/\r?\n/).pop() }
  const exigees = (x.auto ?? []).filter((id) => !verts.includes(id))
  noter('JP-3', a.code === 0 && verts.length && !rouges.length && !exigees.length ? [] : [`${res.label} --auto-controle : code ${a.code}${a.erreur ? ` (${a.erreur})` : ''}${rouges.length ? `, ${court(rouges[0], 160)}` : ''}${!verts.length ? ', aucun critère vert' : ''}${exigees.length ? `, épreuve(s) exigée(s) absente(s) ou rouge(s) : ${exigees.join(', ')}` : ''}`], `${res.label} --auto-controle : code 0 (${verts.length > 12 ? `${verts.length} épreuves vertes, dont ${(x.auto ?? verts.slice(0, 3)).join(', ')}` : verts.join(', ')})`)
  resultats.push(res)
}
if (REF) noter('JP-2', [], `référence ${REF.commit.slice(0, 7)} (reference.txt) ${REF.reutilise ? 'réutilisée, identique blob pour blob' : 'extraite par git archive'} sous ${rel(REF.dest)} (${REF.fichiers} fichiers), ancêtre de HEAD ; ${resultats.filter((r) => r.extrait).map((r) => `${r.label} → code ${r.ref.code}, « ${court(r.extrait, 60)} »`).join(' ; ')}`)

// ── JP-4 : aucun domaine hors .invalid dans les jeux d'essai ─────────────────────────────────────────────────────────────
if (IDS.includes('JP-4')) {
  // Lot 5 (026-062, JP-4 de son propre cahier) ajoute : smtp.gmail.com, imap.gmail.com (le Gmail de prospection) et les
  // hôtes des scripts de captcha nommés dans les pages d'abandon de scripts/fixtures/026-acquisition/envoi/formulaires.mjs
  // (reCAPTCHA, hCaptcha, Turnstile, Friendly Captcha). Lot 2 (026-069, JP-6 de son propre cahier) ajoute : prestiapp.fr
  // (le vrai domaine de Presti, dans les seuls messages fautifs ou après un « oui » du corpus de J3) et github.io (la
  // NOTICE_URL d'essai). Lot 3 (026-080, ST-20 de 026-085) ajoute : orange.fr, une messagerie gratuite RÉELLE de
  // MESSAGERIES_GRATUITES (contrat.ts) citée telle quelle (jamais une clé d'opposition de domaine) pour prouver qu'un
  // STOP depuis cette adresse ne met jamais tout orange.fr en opposition. Ce ne sont pas des domaines de tiers, jamais des
  // adresses inventées.
  const PERMIS = ['recherche-entreprises.api.gouv.fr', 'data.ademe.fr', 'graph.facebook.com', 'instagram.com', 'facebook.com', 'pagesjaunes.fr', 'linkedin.com', 'dns.google', 'smtp.gmail.com', 'imap.gmail.com', 'www.google.com', 'js.hcaptcha.com', 'challenges.cloudflare.com', 'cdn.jsdelivr.net', 'prestiapp.fr', 'github.io', 'orange.fr']
  const TLD = new Set(['fr', 'com', 'net', 'org', 'io', 'eu', 'dev', 'app', 'co', 'info', 'biz', 'be', 'ch', 'de', 'uk', 'es', 'it', 'nl', 'google', 'cloud', 'site', 'online', 'shop', 'store', 'xyz', 'me', 'us', 'ai', 'tv', 'pro', 're', 'gouv'])
  const dossier = path.join(R, 'scripts', 'fixtures', '026-acquisition')
  const fichiers = []
  const rec = (d) => { for (const e2 of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e2.name); if (e2.isDirectory()) rec(p); else fichiers.push(p) } }
  rec(dossier)
  const e = [], vus = new Map()
  const juger = (hote, f, genre) => {
    const h = hote.toLowerCase().replace(/\.$/, '')
    if (/^\d+(\.\d+){3}$/.test(h) || h === 'localhost' || /^\[/.test(h)) return
    const tld = h.split('.').pop()
    if (tld === 'invalid') { vus.set('invalid', (vus.get('invalid') ?? 0) + 1); return }
    if (genre === 'nu' && !TLD.has(tld)) return
    if (PERMIS.some((p) => h === p || h.endsWith(`.${p}`))) { vus.set(h, (vus.get(h) ?? 0) + 1); return }
    e.push(`${rel(f)} : ${genre} ${h}`)
  }
  let n = 0
  for (const f of fichiers) {
    const t = fs.readFileSync(f, 'utf8')
    if (t.includes('\0')) continue
    n++
    for (const m of t.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/(?:[^/\s"'<>@]*@)?(\[[^\]]+\]|[^/\s"'<>?#:\\)`,]+)/gi)) juger(m[1], f, 'URL')
    for (const m of t.matchAll(/[\w.+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) juger(m[1], f, 'adresse')
    for (const m of t.matchAll(/(?<![\w.@/-])((?:[a-z0-9-]+\.)+[a-z0-9-]+)(?![\w-]|\.[a-z0-9]|\s*\()/gi)) juger(m[1], f, 'nu')
  }
  noter('JP-4', [...new Set(e)].slice(0, 40), `${n} fichiers texte de ${rel(dossier)} lus : ${vus.get('invalid') ?? 0} mentions de domaines en .invalid, et seulement ${[...vus.keys()].filter((k) => k !== 'invalid').sort().join(', ') || 'aucun autre domaine'} hors .invalid (liste fermée de 026-016)`)
}

// ── JP-6 : le magasin factice sur son propre scénario ; le contrat (transition et options) ────────────────────────────────
if (IDS.includes('JP-6')) {
  const e = []
  try {
    const { scenario, REGLES_JP6 } = await import(pathToFileURL(path.join(R, 'scripts', 'fixtures', '026-acquisition', 'magasin-memoire.mjs')).href)
    const l = await scenario()
    for (const k of REGLES_JP6) {
      const x = l.find((y) => y.cle === k)
      if (!x) e.push(`règle ${k} absente du scénario`)
      else if (!x.ok) e.push(`${x.nom} : obtenu ${court(JSON.stringify(x.obtenu), 80)}`)
    }
    for (const x of l) if (/^exception/.test(JSON.stringify(x.obtenu).replace(/^"/, ''))) e.push(`${x.nom} : une exception`)
    const autres = l.filter((x) => !REGLES_JP6.includes(x.cle))
    for (const x of autres.filter((y) => !y.ok)) e.push(`${x.nom} (règle en plus) : obtenu ${court(JSON.stringify(x.obtenu), 80)}`)
    if (K) {
      if (!K.TRANSITIONS?.maquette_prete?.includes('lien_prepare')) e.push('TRANSITIONS ne porte pas maquette_prete → lien_prepare')
      const types = ['verifier_demande', 'rgpd', 'lire', 'lire_reponse_non', 'stockage', 'palier', 'studio_echantillon', 'mesure_a_sec']
      for (const t of types) {
        const opts = K.OPTIONS_DECISIONS?.[t]
        if (!Array.isArray(opts) || opts.length < 2 || opts.length > 7) e.push(`OPTIONS_DECISIONS.${t} : ${Array.isArray(opts) ? opts.length : 'absentes'} option(s), de 2 à 7 attendues`)
        else if (!opts.some((x) => x.cle === K.DEFAUTS_DECISIONS?.[t])) e.push(`le défaut de ${t} n'est pas l'une de ses options`)
      }
      if (K.OPTIONS_DECISIONS?.lire?.length !== 7 || K.DEFAUTS_DECISIONS?.lire !== 'ignorer') e.push('lire : sept options et le défaut « ignorer » attendus')
      const src = sansCommentaires(fs.readFileSync(FICHIER_CONTRAT, 'utf8'))
      const m = /type\s+OptionsDecision\s*=([\s\S]*?)(?:\n\S|\n\/\*\*|\nexport)/.exec(src)
      const longueurs = m ? [...m[1].matchAll(/\[([^\]]*)\]/g)].map((x) => x[1].split(',').filter((y) => /OptionDecision/.test(y)).length).sort((a, b) => a - b) : []
      if (JSON.stringify(longueurs) !== JSON.stringify([2, 3, 4, 5, 6, 7])) e.push(`OptionsDecision : tuples de ${JSON.stringify(longueurs)} options, de 2 à 7 attendus`)
      if (!/interface\s+DecisionAcquisition\s*\{[\s\S]*?\boptions\s*:\s*OptionsDecision\b/.test(src)) e.push('DecisionAcquisition.options n\'est pas une OptionsDecision')
    } else e.push('contrat.ts non importé')
    noter('JP-6', e, `magasin-memoire.mjs : les ${REGLES_JP6.length} règles de JP-6 vertes sans exception (${REGLES_JP6.join(', ')}), et ${autres.length} règles en plus ; TRANSITIONS porte maquette_prete → lien_prepare ; OptionsDecision de 2 à 7, OPTIONS_DECISIONS de chaque type entre 2 et 7 avec son défaut`)
  } catch (err) { noter('JP-6', [`scénario interrompu : ${premiereLigne(err)}`]) }
}

// ── JP-7 : la garde de --reel ; JP-8 : les chaînes refusées et --domaines (lot 4) ─────────────────────────────────────────
if (IDS.includes('JP-7')) {
  const e = []
  for (const x of entrees) if (x.arguments.some((a) => /^--(reel|confirmer-reel|hebergement)\b/.test(a))) e.push(`${label(x)} : le registre porte ${x.arguments.join(' ')}`)
  const gardes = [
    ['scripts/ops-acquisition-qa.mjs', ['--migration=socle', '--reel'], /--confirmer-reel/],
    ['scripts/ops-acquisition-qa.mjs', ['--migration=echanges', '--reel'], /--confirmer-reel/],
    ['scripts/confidentialite-prospection-qa.mjs', ['--hebergement', '--reel'], /--confirmer-reel/],
    ['scripts/confidentialite-prospection-qa.mjs', ['--hebergement'], /--reel --confirmer-reel/],
  ]
  for (const [juge, args, re] of gardes) {
    const r = lancer(process.execPath, [juge, ...args], { cwd: R, timeout: 60_000, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' } })
    fs.writeFileSync(path.join(SORTIES, `garde-${path.basename(juge, '.mjs')}-${args.join('').replace(/[^\w]+/g, '-')}.log`), `$ node ${juge} ${args.join(' ')}\n${r.sortie}\n--- code ${r.code}\n`)
    if (r.code !== 2 || !re.test(r.sortie)) e.push(`${path.basename(juge)} ${args.join(' ')} : code ${r.code}, « ${court(r.sortie.trim().split(/\r?\n/).pop(), 100)} » (code 2 et renvoi à ${re.source} attendus)`)
  }
  noter('JP-7', e, `aucune entrée du registre ne porte --reel ; ops-acquisition-qa --reel sans --confirmer-reel → code 2 (socle, echanges) ; confidentialite-prospection-qa --hebergement sans --reel --confirmer-reel → code 2, avant tout accès`)
}
if (IDS.includes('JP-8')) {
  const e = []
  const MOTS = ['sequenceur', 'SEQUENCEUR', 'META_ADLIB_TOKEN', 'ACQ_ADRESSES_NOMINATIVES', 'domaines-prospection']
  const juges = [...new Set(entrees.map((x) => x.juge))]
  for (const j of juges) {
    const s = fs.readFileSync(path.join(R, j), 'utf8')
    const a = s.indexOf('// chaînes refusées : début'), b = s.indexOf('// chaînes refusées : fin')
    const hors = a >= 0 && b > a ? s.slice(0, a) + s.slice(b) : s
    for (const m of MOTS) { const k = hors.indexOf(m); if (k >= 0) e.push(`${j} : « ${m} » hors du bloc des chaînes refusées (ligne ${hors.slice(0, k).split('\n').length})`) }
  }
  const d = lancer(process.execPath, ['scripts/confidentialite-prospection-qa.mjs', '--domaines'], { cwd: R, timeout: 60_000 })
  fs.writeFileSync(path.join(SORTIES, 'garde-confidentialite-domaines.log'), `$ node scripts/confidentialite-prospection-qa.mjs --domaines\n${d.sortie}\n--- code ${d.code}\n`)
  if (d.code !== 2 || !/--hebergement/.test(d.sortie)) e.push(`confidentialite-prospection-qa --domaines : code ${d.code} (2 et renvoi vers --hebergement attendus)`)
  noter('JP-8', e, `${juges.length} juges lus : ${MOTS.join(', ')} n'apparaissent que dans leur bloc « chaînes refusées » ; --domaines → code 2, renvoi vers --hebergement`)
}
// ── JP-9 : les lots 1 à 3 déjà peuplés restent verts (clôture de 026-037) ────────────────────────────────────────────────
if (IDS.includes('JP-9')) {
  const e = [], etats = []
  for (const n of [1, 2, 3]) {
    const rp = lancer(process.execPath, [path.join(R, 'scripts', `${NOM_PREUVE}.mjs`), `--lot=${n}`], { cwd: R, timeout: 8 * 60_000 })
    fs.writeFileSync(path.join(SORTIES, `cloture-lot-${n}.log`), `$ node scripts/${NOM_PREUVE}.mjs --lot=${n}\n${rp.sortie}\n--- code ${rp.code}${rp.erreur ? ` (${rp.erreur})` : ''} · ${rp.duree.toFixed(1)} s\n`)
    if (/aucun juge inscrit au lot \d+ du registre/.test(rp.sortie)) { etats.push(`lot ${n} : pas encore peuplé (toléré)`); continue }
    const derniere = rp.sortie.trim().split(/\r?\n/).pop() ?? ''
    if (rp.code === 0 && /: PASS$/.test(derniere)) etats.push(`lot ${n} : PASS`)
    else e.push(`lot ${n} : code ${rp.code}${rp.erreur ? ` (${rp.erreur})` : ''}, « ${court(derniere, 140)} »`)
  }
  noter('JP-9', e, `clôture rejouée par sous-processus : ${etats.join(' ; ') || 'aucun lot 1 à 3 encore peuplé'}`)
}

// ── echecs-attendus.md, relu (JP-5) ───────────────────────────────────────────────────────────────────────────────────────
{
  const dossier = path.join(R, '.orchestre', 'preuves', FICHE)
  const fichier = path.join(dossier, 'echecs-attendus.md')
  const echapper = (t) => String(t).replace(/\|/g, '\\|')
  const debut = `<!-- lot:${LOT}:debut -->`, fin = `<!-- lot:${LOT}:fin -->`
  const refCourt = REF ? REF.commit.slice(0, 7) : (REFERENCE ?? '').slice(0, 7)
  const lignes = [
    debut,
    `## Lot ${LOT} — fiche ${FICHE} — référence \`${refCourt}\``,
    '',
    `Écrit par \`node scripts/${NOM_PREUVE}.mjs --lot=${LOT}\` le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par \`git archive\` (\`${REF ? rel(REF.dest) : '—'}\`), avec \`--racine\`, puis en \`--auto-controle\` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul \`|\` est échappé), relue ici et retrouvée dans la sortie par la preuve.`,
    '',
    '| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |',
    '|---|---|---|---|---|---|',
    ...resultats.map((x) => `| ${echapper(x.label)} | \`${refCourt}\` | ${x.x.attendu} | ${x.ref ? x.ref.code : '—'} | ${x.extrait ? echapper(x.extrait) : `(aucun : ${echapper(court(x.ref?.premiere ?? 'juge non lancé', 100))})`} | ${x.auto.code === 0 ? `PASS, code 0 (${x.auto.verts.join(', ')})` : `FAIL, code ${x.auto.code}`} |`),
    fin,
  ]
  const e = []
  try {
    if (!sous(path.join(R, '.orchestre', 'preuves'), fichier)) throw new Error('section à écrire hors de .orchestre/preuves/')
    fs.mkdirSync(dossier, { recursive: true })
    const existant = lireOuNull(fichier)
    const i = existant ? existant.indexOf(debut) : -1, k = existant ? existant.indexOf(fin) : -1
    const tete = '# Échecs attendus des juges du domaine acquisition sur leur arbre de référence\n\nUne section par lot ; chacune est réécrite par la preuve à chaque passage.\n\n'
    const texte = existant && i >= 0 && k > i ? `${existant.slice(0, i)}${lignes.join('\n')}${existant.slice(k + fin.length)}` : `${existant ? `${existant.replace(/\s*$/, '')}\n\n` : tete}${lignes.join('\n')}\n`
    fs.writeFileSync(fichier, texte)
    const relu = fs.readFileSync(fichier, 'utf8')
    const section = relu.slice(relu.indexOf(debut), relu.indexOf(fin))
    if (!section.startsWith(debut)) e.push(`la section du lot ${LOT} est introuvable dans ${rel(fichier)} après écriture`)
    const rangs = section.split(/\r?\n/).filter((l) => l.startsWith('| ') && !l.startsWith('| Juge') && !l.startsWith('|---'))
    const cellules = (l) => l.slice(2, -2).split(/(?<!\\) \| /).map((c) => c.replace(/\\\|/g, '|'))
    for (const x of resultats) {
      const rang = rangs.find((l) => cellules(l)[0] === x.label)
      const extrait = rang ? cellules(rang)[4] : null
      if (!extrait) e.push(`${x.label} : aucune ligne dans ${rel(fichier)}`)
      else if (extrait.length < 20) e.push(`${x.label} : extrait de ${extrait.length} signes (20 au moins)`)
      else if (!x.ref || !x.ref.sortie.includes(extrait)) e.push(`${x.label} : l'extrait « ${court(extrait, 80)} » ne se retrouve pas dans la sortie que la preuve vient de produire`)
    }
    if (rangs.length !== resultats.length) e.push(`${rangs.length} ligne(s) dans la section du lot, ${resultats.length} attendue(s)`)
  } catch (err) { e.push(`${rel(fichier)} : ${premiereLigne(err)}`) }
  noter('JP-5', e, `${resultats.length} ligne(s) écrites dans ${rel(fichier)} (section du lot ${LOT}), chaque extrait de 20 signes au moins relu et retrouvé dans la sortie produite ; sorties complètes sous ${rel(SORTIES)}`)
}
finir()
