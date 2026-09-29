// scripts/conformite-qa.mjs — juge hors ligne de J3 et du second juge (fiche 026-069), écrit par Claude Code AVANT les
// modules qu'il juge (lib/agents/acquisition/modeles.ts, affirmations.ts, faq.ts, conformite.ts, secondJuge.ts — fiche
// 026-083). L'exécutant qui le lance n'y touche jamais.
//
//   node --import ./scripts/ts-loader.mjs scripts/conformite-qa.mjs [--racine=<dossier>] [--auto-controle]
//   node --import ./scripts/ts-loader.mjs scripts/conformite-qa.mjs --etalonner --reel --confirmer-reel   (Claude Code
//     seulement, jamais par le registre : voir la section « étalonnage » plus bas)
//
// Les critères CO de 026-083. Le juge garde SA PROPRE COPIE (scripts/fixtures/026-acquisition/messages/modeles.mjs) des
// modèles de formulaire (B, A, Studio), des sujets, des pieds, de la relance et de la réponse privée — transcrite depuis
// SaaS/Produit/Ecosysteme-Prospection-Gratuite-2026-09-24.md §1.1 et .orchestre/brouillons-ecosysteme/026/026-083.md
// point 1 — et le corpus étiqueté de scripts/fixtures/026-acquisition/messages/ (≥40 fautifs, ≥16 conformes,
// ≥28 raisons distinctes, JP-4) et le jeu de pièges de scripts/fixtures/026-acquisition/pieges/ (≥20+20, empreinte).
//
//   --racine=<d>     importe les 5 modules depuis <d>/lib/agents/acquisition/ (défaut : le dépôt).
//   --auto-controle  AC-1 le corpus (chaque fautif porte une raison connue, ≥40 fautifs, ≥16 conformes, ≥28 raisons
//                    distinctes), le jeu de pièges (chaque piège porte un code connu, ≥20+20, empreinte juste), et la
//                    copie des modèles (formulaire B/A + sujet fidèles au §1.1, formulaire_studio_v1 + sujet_studio_v1 +
//                    PIED_FORMULAIRE + PIED_SOLLICITE + relance_oui_v1 + studio_offre_v1 + questions_entrant_v2 fidèles au
//                    point 1 de 026-083) ; AC-2 le lecteur factice (pieges/lecteur-factice.mjs) rend bien ce qu'il annonce
//                    pour chacun de ses modes, et enregistre ce qu'il reçoit.
//
// Sortie : une ligne par critère, puis « conformite-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Modules absents : CO-1 en échec, les suivants « non jugés ». Hors ligne (piège réseau, DNS
// compris) hors --etalonner --reel. Écriture seulement sous .orchestre/travail/conformite-qa/ (--auto-controle ou normal)
// ou .orchestre/preuves/026-083/etalonnage.json (--etalonner --reel --confirmer-reel, la seule exception).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe, court,
  premiereLigne, sha256, lancer,
} from './fixtures/026-acquisition/commun.mjs'
import { MODELES, PREMIERE_PHRASE, piedFormulaire, PIED_SOLLICITE, SUJET_FORMULAIRE_V1, SUJET_STUDIO_V1 } from './fixtures/026-acquisition/messages/modeles.mjs'
import { CONFORMES, FAUTIFS, RAISONS_FERMEES, CODES_PIEGES, REPERES as REPERES_MSG, DOULEURS } from './fixtures/026-acquisition/messages/corpus.mjs'
import { creerLecteurFactice, MODES_FERMETURE } from './fixtures/026-acquisition/pieges/lecteur-factice.mjs'

const JUGE = 'conformite-qa'
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['etalonner', 'reel', 'confirmer-reel'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (o.drapeaux.has('etalonner') && (o.autoControle || o.valeurs.racine)) refuser('--etalonner ne se combine ni avec --racine ni avec --auto-controle')
if (o.drapeaux.has('etalonner') !== (o.drapeaux.has('reel') && o.drapeaux.has('confirmer-reel'))) refuser('--etalonner exige --reel --confirmer-reel ensemble (jamais --etalonner seul, jamais --reel sans --etalonner)')
if ((o.drapeaux.has('reel') || o.drapeaux.has('confirmer-reel')) && !o.drapeaux.has('etalonner')) refuser('--reel/--confirmer-reel : seulement avec --etalonner')
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const IDS = ['CO-1', 'CO-2', 'CO-3', 'CO-4', 'CO-5', 'CO-6', 'CO-7', 'CO-8', 'CO-9', 'CO-10']
const EXPORTS = { modeles: ['MODELES', 'AMORCES'], affirmations: ['AFFIRMATIONS_PERMISES', 'AFFIRMATIONS_RETIREES'], faq: ['FAQ'], conformite: ['jugerMessage', 'jugerModele'], secondJuge: ['CONSIGNES_SECOND_JUGE', 'VERSION', 'ETALONNAGE', 'jugerTon'] }
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const RETIRES = ['email_A_v1', 'email_B_v1', 'objet_A_v1', 'objet_B_v1', 'relance_1_v1', 'relance_2_v1', 'relance_maquette_v1', 'permission_A_v1', 'permission_B_v1', 'lien_maquette_v1', 'questions_entrant_v1']

// ── Le texte exact (026-083 point 1), transcrit ICI une seconde fois : catche une dérive de messages/modeles.mjs ─────────────
const PIED_FORMULAIRE_ADEME_ATTENDU = "Benjamin Filiot, Presti.\nVotre site figure dans la liste publique des entreprises RGE de l'ADEME. Vos données : {notice}\nPour ne plus rien recevoir : écrivez STOP à {adresse}.\nRéf. {reference}"
const PIED_SOLLICITE_ATTENDU = "Benjamin Filiot, Presti.\nMessage rédigé et envoyé par l'assistant IA de Presti.\nVos données : {notice}\nPour ne plus rien recevoir : répondez STOP."
const QUESTIONS_ENTRANT_V2_ATTENDU = "Merci ! Ici l'assistant IA de Presti. Pour ta maquette : ton métier, ta ville, ton site ou ta page si tu en as un, et ton e-mail pour te l'envoyer ?"
const RELANCE_OUI_V1_ATTENDU = "Je reviens vers vous comme annoncé : votre maquette est toujours en ligne, {lien}. Si vous préférez en parler, 15 min avec Benjamin : {rendez_vous}."
const STUDIO_OFFRE_V1_ATTENDU = "{videos} vidéos de démonstration de {produit}, pour {prix}, une fois. Rien n'est diffusé sans votre accord écrit. Pour commander : {paiement}"
const SUJET_FORMULAIRE_V1_ATTENDU = 'Proposition commerciale : un site pour {entreprise}'
const SUJET_STUDIO_V1_ATTENDU = 'Proposition commerciale : une vidéo pour {produit}'
// Fragments fixes du §1.1 de la voie gratuite (hors emplacements) : la formulation, pas la ponctuation d'emplacement.
const FRAGMENTS_B = [PREMIERE_PHRASE, "Je peux vous préparer gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à"]
const FRAGMENTS_A = [PREMIERE_PHRASE, "J'ai préparé gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à"]

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --etalonner --reel --confirmer-reel : jamais par le registre, jamais en --auto-controle. Voir 026-083 point 5.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.drapeaux.has('etalonner')) {
  console.log(`${JUGE} --etalonner : étalonnage du second juge sur le jeu de pièges (Claude Code, sur l'usine, aucun secret lu ici)`)
  const preuves = path.join(R, '.orchestre', 'preuves', '026-083')
  const pieges = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '026-acquisition', 'pieges', 'corpus.json'), 'utf8'))
  const shaCorpus = sha256(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '026-acquisition', 'pieges', 'corpus.json')))
  let secondJuge
  try { secondJuge = await importerDepuis(R, 'lib/agents/acquisition/secondJuge.ts') } catch (e) { console.log(`${JUGE} --etalonner : secondJuge.ts introuvable (${premiereLigne(e)}) — cette fiche (026-069) écrit le juge avant le module ; --etalonner se lance depuis 026-083 une fois secondJuge.ts écrit.`); process.exit(2) }
  let llm
  try { llm = await importerDepuis(R, 'lib/agents/llm.ts') } catch (e) { console.log(`${JUGE} --etalonner : lib/agents/llm.ts introuvable (${premiereLigne(e)})`); process.exit(2) }
  const shaConsignes = sha256(Buffer.from(secondJuge.CONSIGNES_SECOND_JUGE ?? '', 'utf8'))
  // Correction du 29/09 (décision du chef) : (1) `jugerTon` refuse sans étalonnage, donc l'étalonnage ne pouvait rien mesurer : il
  // passe par `jugerTonPourEtalonnage` ; (2) un lecteur ne fait que 20 appels (PLAFONDS.appelsParExecution) : un lecteur neuf tous
  // les 15 messages, sinon les conformes au-delà du vingtième étaient refusés d'office ; (3) un lecteur absent (creerLecteur rend
  // null) ou en panne ne produit AUCUN rapport : un lecteur mort faisait passer pour un étalonnage raté (tout refusé) ce qui n'en était pas un.
  const juger = secondJuge.jugerTonPourEtalonnage
  if (typeof juger !== 'function') { console.log(`${JUGE} --etalonner : secondJuge.ts n'exporte pas jugerTonPourEtalonnage (jugerTon refuse tant que ETALONNAGE.version ≠ VERSION)`); process.exit(2) }
  const PAR_LECTEUR = 15
  let indisponibles = 0
  const tauxDe = async (nouveau) => {
    let lecteur = null, appels = 0
    const un = async (m) => {
      if (!lecteur || appels >= PAR_LECTEUR) { lecteur = nouveau(); appels = 0 }
      if (typeof lecteur !== 'function') { console.log(`${JUGE} --etalonner : aucun lecteur (creerLecteur('facteur') rend null : CODEX_LANCEUR absent ou non exécutable, ou moteur sans quota) — aucun rapport écrit`); process.exit(2) }
      appels++
      const r = await juger({ texte: m.texte, canal: m.canal, type: m.type }, { lecteur })
      if ((r.raisons ?? []).includes('second_juge_indisponible')) indisponibles++
      return r
    }
    let pr = 0, ca = 0
    for (const p of pieges.pieges) { const r = await un(p); if (r.j2 === 'refus') pr++ }
    for (const c of pieges.conformes) { const r = await un(c); if (r.j2 === 'ok') ca++ }
    return { pieges_refuses: pr / pieges.pieges.length, conformes_acceptes: ca / pieges.conformes.length, total: pieges.pieges.length + pieges.conformes.length }
  }
  const modeles = {}
  for (const [nom, opts] of [['agents', {}], ['rejuge', { modele: 'rejuge' }]]) {
    modeles[nom] = await tauxDe(() => llm.creerLecteur('facteur', opts))
    if (indisponibles > 0) { console.log(`${JUGE} --etalonner : ${indisponibles} appel(s) du lecteur indisponible(s) pendant le modèle « ${nom} » — aucun rapport écrit (un lecteur en panne fausserait les taux)`); process.exit(2) }
  }
  const rapport = { version: shaConsignes.slice(0, 16), sha_corpus: shaCorpus, sha_consignes: shaConsignes, pieges: pieges.pieges.length, conformes: pieges.conformes.length, taux: modeles, lecteurs_indisponibles: 0, total: pieges.pieges.length + pieges.conformes.length, date: new Date().toISOString() }
  fs.mkdirSync(preuves, { recursive: true })
  fs.writeFileSync(path.join(preuves, 'etalonnage.json'), `${JSON.stringify(rapport, null, 1)}\n`)
  const ok = Object.values(modeles).every((t) => t.pieges_refuses >= 0.95 && t.conformes_acceptes >= 0.95)
  console.log(`${JUGE} --etalonner : ${ok ? 'PASS' : 'FAIL'} — modele_agents ${(modeles.agents.pieges_refuses * 100).toFixed(0)}%/${(modeles.agents.conformes_acceptes * 100).toFixed(0)}%, modele_rejuge ${(modeles.rejuge.pieges_refuses * 100).toFixed(0)}%/${(modeles.rejuge.conformes_acceptes * 100).toFixed(0)}%`)
  process.exit(ok ? 0 : 1)
}

const piege = piegerReseau()

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle : intégrité du corpus, du jeu de pièges, et de la copie des modèles — sans invoquer aucun module jugé.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function corpusIntegre() {
  const e = []
  if (FAUTIFS.length < 40) e.push(`${FAUTIFS.length} messages fautifs, 40 au moins attendus`)
  if (CONFORMES.length < 16) e.push(`${CONFORMES.length} messages conformes, 16 au moins attendus`)
  const raisons = new Set(FAUTIFS.map((f) => f.raison))
  if (raisons.size < 28) e.push(`${raisons.size} raisons distinctes, 28 au moins attendues`)
  for (const f of FAUTIFS) { if (!f.raison) e.push(`${f.id} : aucune raison étiquetée`); else if (!RAISONS_FERMEES.includes(f.raison)) e.push(`${f.id} : raison ${json(f.raison)} hors de la liste fermée`) }
  for (const c of CONFORMES) if (c.raison) e.push(`${c.id} : porte une raison (${c.raison}), un conforme n'en porte aucune`)
  const requises = ['premiere_phrase', 'adresse_reponse_absente', 'lien_formulaire', 'longueur_champ', 'source_absente', 'notice_absente', 'stop_absent', 'reference_absente', 'fait_refonte', 'preuve_demande_absente', 'objet_trompeur', 'domaine_principal', 'prix_premier_message', 'douleur_non_approuvee', 'longueur', 'offre_hors_parametre']
  for (const r of requises) if (!raisons.has(r)) e.push(`la raison requise ${r} (CO-5) est absente du corpus`)
  if ([...raisons].includes('desinscription_absente')) e.push('la raison retirée desinscription_absente apparaît encore')
  const ids = [...FAUTIFS, ...CONFORMES].map((x) => x.id)
  const doublons = ids.filter((x, i) => ids.indexOf(x) !== i)
  if (doublons.length) e.push(`identifiants dupliqués dans le corpus : ${[...new Set(doublons)].join(', ')}`)
  for (const x of [...FAUTIFS, ...CONFORMES]) if (RETIRES.includes(x.modele_id) && x.raison !== 'modele_inconnu') e.push(`${x.id} : modele_id retiré (${x.modele_id}) hors d'un fautif modele_inconnu`)
  for (const x of [...FAUTIFS, ...CONFORMES]) if (x.texte.includes('{desinscription}')) e.push(`${x.id} : {desinscription} apparaît encore dans le corpus (retiré par la voie gratuite)`)
  return { e, detail: `${FAUTIFS.length} fautifs (${raisons.size} raisons distinctes), ${CONFORMES.length} conformes, ${requises.length} raisons requises par CO-5 présentes` }
}
function piegesIntegres() {
  const e = []
  const fichier = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'pieges', 'corpus.json')
  const octets = fs.readFileSync(fichier)
  const data = JSON.parse(octets.toString('utf8'))
  const empreinte = sha256(octets)
  const attendue = fs.readFileSync(path.join(R, 'scripts', 'fixtures', '026-acquisition', 'pieges', 'empreinte.txt'), 'utf8').trim()
  if (empreinte !== attendue) e.push(`empreinte.txt (${attendue}) ne correspond pas au SHA-256 recalculé de corpus.json (${empreinte})`)
  if (data.pieges.length < 20) e.push(`${data.pieges.length} pièges, 20 au moins attendus`)
  if (data.conformes.length < 20) e.push(`${data.conformes.length} conformes, 20 au moins attendus`)
  for (const p of data.pieges) if (!CODES_PIEGES.includes(p.code)) e.push(`piège ${p.id} : code ${json(p.code)} hors de la liste fermée`)
  const codesVus = new Set(data.pieges.map((p) => p.code))
  for (const c of CODES_PIEGES) if (!codesVus.has(c)) e.push(`aucun piège de code ${c}`)
  for (const c of data.conformes) if (c.code) e.push(`${c.id} : un conforme ne porte pas de code`)
  return { e, detail: `${data.pieges.length} pièges (${codesVus.size}/${CODES_PIEGES.length} codes couverts), ${data.conformes.length} conformes, empreinte ${empreinte.slice(0, 12)}… juste` }
}
function modelesFideles() {
  const e = []
  const contient = (texte, frag) => texte.includes(frag)
  const b = MODELES.formulaire_B_v1.texte('ademe_rge'), a = MODELES.formulaire_A_v1.texte('ademe_rge')
  for (const f of FRAGMENTS_B) if (!contient(b, f)) e.push(`formulaire_B_v1 : fragment du §1.1 absent — « ${court(f, 60)} »`)
  for (const f of FRAGMENTS_A) if (!contient(a, f)) e.push(`formulaire_A_v1 : fragment du §1.1 absent — « ${court(f, 60)} »`)
  if (SUJET_FORMULAIRE_V1 !== SUJET_FORMULAIRE_V1_ATTENDU) e.push(`sujet_formulaire_v1 : ${json(SUJET_FORMULAIRE_V1)}, ${json(SUJET_FORMULAIRE_V1_ATTENDU)} attendu`)
  if (SUJET_STUDIO_V1 !== SUJET_STUDIO_V1_ATTENDU) e.push(`sujet_studio_v1 : ${json(SUJET_STUDIO_V1)}, ${json(SUJET_STUDIO_V1_ATTENDU)} attendu`)
  if (piedFormulaire('ademe_rge') !== PIED_FORMULAIRE_ADEME_ATTENDU) e.push(`PIED_FORMULAIRE (ademe_rge) diffère du point 1 de 026-083`)
  if (PIED_SOLLICITE !== PIED_SOLLICITE_ATTENDU) e.push('PIED_SOLLICITE diffère du point 1 de 026-083')
  if (MODELES.questions_entrant_v2.texte(null) !== QUESTIONS_ENTRANT_V2_ATTENDU) e.push('questions_entrant_v2 diffère du point 1 de 026-083 (écart assumé de la revue du 25/09)')
  const relanceSansPied = MODELES.relance_oui_v1.texte(null).split(`\n${PIED_SOLLICITE}`)[0]
  if (relanceSansPied !== RELANCE_OUI_V1_ATTENDU) e.push('relance_oui_v1 (hors PIED_SOLLICITE) diffère du point 1 de 026-083')
  if (MODELES.studio_offre_v1.texte(null) !== STUDIO_OFFRE_V1_ATTENDU) e.push('studio_offre_v1 diffère du point 1 de 026-083')
  for (const id of RETIRES) if (MODELES[id]) e.push(`le modèle retiré ${id} existe encore dans la copie du juge`)
  for (const [, mo] of Object.entries(MODELES)) if (String(mo.texte(null)).includes('{desinscription}')) e.push('un modèle de la copie du juge contient encore {desinscription}')
  return { e, detail: `formulaire_B_v1/A_v1/sujet_formulaire_v1 fidèles aux fragments fixes du §1.1 ; formulaire_studio_v1, sujet_studio_v1, PIED_FORMULAIRE, PIED_SOLLICITE, relance_oui_v1, studio_offre_v1, questions_entrant_v2 identiques au point 1 de 026-083 ; ${RETIRES.length} modèles retirés absents` }
}
async function lecteurFacticeSain() {
  const e = []
  for (const mode of [...MODES_FERMETURE, 'ok', 'refus']) {
    const lecteur = creerLecteurFactice(mode)
    let res, erreur = null
    try { res = await lecteur({ systeme: 'second-juge-temoin', donnees: { texte: 'essai' } }) } catch (err) { erreur = premiereLigne(err) }
    if (mode === 'leve' && !erreur) e.push('mode leve : ne lève pas')
    if (mode !== 'leve' && erreur) e.push(`mode ${mode} : lève (${erreur}), ne devrait pas`)
    if (mode === 'ok' && (!res || JSON.parse(res).verdict !== 'ok')) e.push('mode ok : verdict ≠ ok')
    if (mode === 'refus' && (!res || JSON.parse(res).verdict !== 'refus' || !CODES_PIEGES.includes(JSON.parse(res).raisons[0]))) e.push('mode refus : verdict ou raison invalide')
    if (mode === 'texte' && (typeof res !== 'string' || (() => { try { JSON.parse(res); return true } catch { return false } })())) e.push('mode texte : rend du JSON valide (devrait être une chaîne non-JSON)')
    if (mode === 'null' && res !== null) e.push('mode null : ne rend pas null')
    if (lecteur.recus.length !== 1 || lecteur.recus[0].systeme !== 'second-juge-temoin') e.push(`mode ${mode} : .recus n'enregistre pas correctement l'entrée reçue`)
  }
  return { e, detail: `${MODES_FERMETURE.length + 2} modes du lecteur factice conformes à ce qu'ils annoncent, chacun enregistré dans .recus` }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le mode normal : les cinq modules réels
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function chargerModules() {
  const chemins = { modeles: 'lib/agents/acquisition/modeles.ts', affirmations: 'lib/agents/acquisition/affirmations.ts', faq: 'lib/agents/acquisition/faq.ts', conformite: 'lib/agents/acquisition/conformite.ts', secondJuge: 'lib/agents/acquisition/secondJuge.ts' }
  const e = [], mods = {}
  for (const [nom, relf] of Object.entries(chemins)) {
    const f = path.join(RAC, relf)
    if (!fs.existsSync(f)) { e.push(`module absent : ${rel(f)}`); continue }
    try { mods[nom] = await importerDepuis(RAC, relf) } catch (err) { e.push(`${relf} ne s'importe pas : ${premiereLigne(err)}`) }
  }
  for (const [nom, noms] of Object.entries(EXPORTS)) if (mods[nom]) for (const n of noms) if (mods[nom][n] === undefined) e.push(`export ${n} absent de ${chemins[nom]}`)
  return { e, mods, chemins }
}
/** La réponse de l'entrée « delai » de la FAQ du banc (rend le texte du corpus, qui cite une réponse fictive, conforme à la FAQ). */
let FAQ_DELAI = null
/**
 * L'entrée de J3 pour une ligne du corpus. Correction du 29/09 (décision du chef pour 026-083) : la ligne passe désormais ce que
 * l'étiquette exprime — les faits du prospect (le fait cité par le texte, sauf si la ligne dit fait_id), le champ du formulaire
 * (formulaire_max), l'historique (messages_deja_envoyes, heures_depuis_dernier, jours_depuis_dernier_contact), la FAQ (l'entrée
 * « delai » quand la ligne est une réponse de FAQ) et la source d'une marque (meta) — au lieu de les jeter.
 */
function entreeDe(x, maintenant) {
  const faits = Object.values(REPERES_MSG.faits)
  const cite = faits.find((fa) => String(x.texte).includes(`« ${fa.extrait} »`))
  const il = (h) => new Date(maintenant - h * 3_600_000).toISOString()
  const historique = []
  for (let i = 0; i < (x.messages_deja_envoyes ?? 0); i++) historique.push({ envoi_id: `h${i}`, type: 'reponse', canal: x.canal, statut: 'envoye', le: il(200 + i * 100) })
  if (x.heures_depuis_dernier !== undefined) historique.push({ envoi_id: 'hd', type: 'relance', canal: x.canal, statut: 'envoye', le: il(x.heures_depuis_dernier) })
  if (x.jours_depuis_dernier_contact !== undefined) historique.push({ envoi_id: 'hp', type: 'premier_contact', canal: 'formulaire_site', statut: 'envoye', le: il(x.jours_depuis_dernier_contact * 24) })
  const faq = /^rep_faq_/.test(x.modele_id ?? '') && FAQ_DELAI
  const source = x.source_prospect ?? (x.cible === 'marque' ? 'meta' : 'ademe_rge')
  return {
    texte: faq ? String(x.texte).split('Le site est en ligne 48 h ouvrées après validation.').join(x.canal === 'email_sollicite' ? FAQ_DELAI.email : FAQ_DELAI.meta) : x.texte,
    sujet: x.sujet ?? null, modele_id: x.modele_id, type: x.type, canal: x.canal,
    envoyeur: x.canal === 'formulaire_site' ? 'facteur_usine' : x.canal === 'email_sollicite' ? 'gmail' : 'repondeur',
    adresse: REPERES_MSG.adresse_prospection, reference: x.reference_envoi ?? 'AB12CD',
    preuve_demande: 'preuve_demande' in x ? x.preuve_demande : (x.canal === 'email_sollicite' ? { type: 'message_recu', id: 'reponse-temoin' } : null),
    formulaire: x.formulaire_max !== undefined ? { longueur_max_message: x.formulaire_max } : null,
    fait_id: 'fait_id' in x ? x.fait_id : (cite?.id ?? null), douleur_id: x.douleur_id !== undefined ? x.douleur_id : (DOULEURS_CORPUS.find((d) => String(x.texte).includes(d.question))?.id ?? null), faq_id: faq ? 'delai' : null, liens: [],
    prospect: { froid: x.froid ?? (x.source_prospect !== 'entrant'), source, metier: x.metier_prospect ?? 'menuisier', faits },
    historique, oppose: x.oppose ?? false,
    opposition_le: x.opposition_le_heures !== undefined ? il(x.opposition_le_heures) : undefined,
    demande_rgpd_le: x.demande_rgpd_le_heures !== undefined ? il(x.demande_rgpd_le_heures) : undefined,
    maquette: x.maquette ?? 'aucune', offre: x.offre, drapeaux: { siteAchatPublic: x.drapeaux?.siteAchatPublic ?? true, varianteA: x.drapeaux?.varianteA ?? false }, maintenant: new Date(maintenant).toISOString(),
  }
}

// ── Le banc (décision du chef du 29/09) ─────────────────────────────────────────────────────────────────────────────────────
// Le corpus est écrit avec un monde d'essai (notice github.io d'essai, douleurs fictives approuvées, modèles et FAQ approuvés).
// Il se juge donc sur une COPIE des modules réels qui ne diffère de la production que par ces points, déclarés et comptés :
// la même logique de J3, un autre décor. La production, elle, est jugée par CO-3 (approbations) et CO-4b (un vrai formulaire).
const FICHIERS_BANC = ['contrat.ts', 'modeles.ts', 'affirmations.ts', 'faq.ts', 'conformite.ts', 'secondJuge.ts', 'douleurs.ts']
const DOULEURS_CORPUS = DOULEURS.map((d) => ({ ...d }))
async function fabriquerBanc(nom, { approuve }) {
  const dir = path.join(R, '.orchestre', 'travail', JUGE, `banc-${nom}`)
  fs.rmSync(dir, { recursive: true, force: true })
  const dest = path.join(dir, 'lib', 'agents', 'acquisition')
  fs.mkdirSync(dest, { recursive: true })
  const ecarts = []
  const unique = (src, motif, par, quoi) => {
    const n = src.split(motif).length - 1
    if (n !== 1) throw new Error(`banc ${nom} : ${quoi} : motif trouvé ${n} fois (1 attendu) ; le module a changé, le juge doit suivre`)
    ecarts.push(quoi)
    return src.replace(motif, () => par)
  }
  for (const fic of FICHIERS_BANC) {
    let src = fs.readFileSync(path.join(RAC, 'lib', 'agents', 'acquisition', fic), 'utf8')
    if (fic === 'contrat.ts') {
      const m = /export const NOTICE_URL: string \| null = [^\n]+/.exec(src)
      if (!m) throw new Error('banc : NOTICE_URL introuvable dans contrat.ts')
      src = unique(src, m[0], `export const NOTICE_URL: string | null = ${JSON.stringify(REPERES_MSG.notice_url)}`, "NOTICE_URL d'essai (celle du corpus)")
    }
    if (fic === 'modeles.ts') src = unique(src, '    approuve: APPROUVES.includes(id),\n    empreinte:', `    approuve: ${approuve},\n    empreinte:`, `modèles approuve ${approuve}`)
    if (fic === 'faq.ts') src = unique(src, 'approuve: FAQ_APPROUVEES.includes(id) })', `approuve: ${approuve} })`, `FAQ approuve ${approuve}`)
    if (fic === 'douleurs.ts') { src = `// banc du juge : les douleurs du corpus (scripts/fixtures/026-acquisition/messages/douleurs.json)\nexport const DOULEURS = ${JSON.stringify(DOULEURS_CORPUS)}\n`; ecarts.push('douleurs du corpus (fictives, approuvées comme le corpus les étiquette)') }
    fs.writeFileSync(path.join(dest, fic), src)
  }
  const importer = (fic) => importerDepuis(dir, `lib/agents/acquisition/${fic}`)
  return { CF: await importer('conformite.ts'), FQ: await importer('faq.ts'), MD: await importer('modeles.ts'), ecarts }
}
let BANC = null, BANC_NON = null
/** Les valeurs d'emplacement du corpus (les mêmes que scripts/fixtures/026-acquisition/messages/corpus.mjs : VALS). */
const VALS_CO = {
  adresse: REPERES_MSG.adresse_prospection, notice: REPERES_MSG.notice_url, reference: 'AB12CD',
  lien: `https://prestiapp.fr/maquette/${'x'.repeat(43)}`, rendez_vous: `https://prestiapp.fr/rendez-vous/${'y'.repeat(43)}`, paiement: 'https://prestiapp.fr/site/acheter',
  export: '(fait Témoin : aucune ligne, prospect Témoin)', videos: '5', prix: '490 €', produit: 'Gourde isotherme Témoin', entreprise: 'Menuiserie Témoin',
  reponse_faq: 'Le site est en ligne 48 h ouvrées après validation.',
}
const remplirCO = (texte) => Object.entries(VALS_CO).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), String(texte))
const remplirProduction = (texte, vals) => Object.entries(vals).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), texte)
const jugerBanc = (x, maintenant) => (x.approuve === false ? BANC_NON : BANC).CF.jugerMessage(entreeDe(x, maintenant))

// ── Les approbations (026-083, decisions.md du 29/09) ────────────────────────────────────────────────────────────────────
// .orchestre/preuves/026-083/approbation.txt : une ligne par élément approuvé, « <genre> <id> <empreinte sha256> — approuvé le
// JJ/MM/AAAA par <qui>, par délégation de Benj ». Un élément n'est approuvé (approuve: true) que si sa ligne existe ET que son
// empreinte est celle du texte actuel : modifier un texte approuvé lui retire l'approbation. (Avant : simple inclusion de l'id.)
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex')
const empreinteApprobation = {
  modele: (m) => m.empreinte,
  affirmation: (a) => sha(a.texte),
  faq: (q) => sha(`${q.question}\n${q.reponse_email}\n${q.reponse_meta}`),
  douleur: (d) => sha(`${d.citation}\n${d.question}\n${d.accroche_objet}\n${d.metier}`),
}
function lireApprobations() {
  const f = path.join(R, '.orchestre', 'preuves', '026-083', 'approbation.txt')
  const m = new Map(), e = []
  const brut = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
  for (const l of String(brut ?? '').split(/\r?\n/)) {
    if (!l.trim() || l.startsWith('#')) continue
    const r = /^(modele|affirmation|faq|douleur) (\S+) ([0-9a-f]{64}) — approuvé le \d{2}\/\d{2}\/\d{4} par .+, par délégation de Benj\s*$/.exec(l)
    if (!r) e.push(`ligne d'approbation illisible : ${court(l, 80)}`)
    else if (m.has(`${r[1]} ${r[2]}`)) e.push(`approbation en double : ${r[1]} ${r[2]}`)
    else m.set(`${r[1]} ${r[2]}`, r[3])
  }
  return { m, e, present: brut !== null }
}
function jugerApprobations(genre, objets, ap, e) {
  const vus = new Set()
  for (const o of objets) {
    const cle = `${genre} ${o.id}`
    vus.add(cle)
    const attendu = empreinteApprobation[genre](o)
    const ligne = ap.m.get(cle)
    if (ligne !== undefined && ligne !== attendu) e.push(`${cle} : le texte a changé depuis son approbation (empreinte ${ligne.slice(0, 12)}…, ${attendu.slice(0, 12)}… aujourd'hui)`)
    if (!!o.approuve !== (ligne !== undefined && ligne === attendu)) e.push(`${cle} : approuve ${json(o.approuve)}, ${json(ligne === attendu)} attendu (${ap.present ? 'approbation.txt' : 'aucune approbation encore'})`)
  }
  for (const cle of ap.m.keys()) if (cle.startsWith(`${genre} `) && !vus.has(cle)) e.push(`approbation orpheline : ${cle} n'existe plus`)
}

const s0 = Date.now()
const ids = o.autoControle ? ['AC-1', 'AC-2'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — corpus ${CONFORMES.length + FAUTIFS.length} messages, jeu de pièges scripts/fixtures/026-acquisition/pieges/`)
if (o.autoControle) {
  try { const r = corpusIntegre(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try {
    const r1 = piegesIntegres(), r2 = modelesFideles()
    s.juger('AC-1', [...r1.e, ...r2.e], `${r1.detail} ; ${r2.detail}`)
  } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try { const r = await lecteurFacticeSain(); s.juger('AC-2', r.e, r.detail) } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
} else {
  const { e: e1, mods, chemins } = await chargerModules()
  s.juger('CO-1', e1, `5 modules importés depuis ${rel(RAC)} : ${Object.values(EXPORTS).flat().join(', ')}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'CO-1 en échec')
  else {
    const { modeles: M, affirmations: AF, faq: FQ, conformite: CF, secondJuge: SJ } = mods
    // CO-2 : fidélité octet pour octet aux fragments fixes (la même approche qu'AC-1, contre le module réel).
    try {
      const e = []
      const b = M.MODELES.formulaire_B_v1?.texte ?? '', a = M.MODELES.formulaire_A_v1?.texte ?? ''
      for (const f of FRAGMENTS_B) if (!b.includes(f)) e.push(`formulaire_B_v1 : fragment absent — « ${court(f, 60)} »`)
      for (const f of FRAGMENTS_A) if (!a.includes(f)) e.push(`formulaire_A_v1 : fragment absent — « ${court(f, 60)} »`)
      for (const id of RETIRES) if (M.MODELES[id]) e.push(`modèle retiré encore présent : ${id}`)
      for (const [id, mo] of Object.entries(M.MODELES)) if (String(mo.texte ?? '').includes('{desinscription}')) e.push(`${id} contient encore {desinscription}`)
      s.juger('CO-2', e, 'fragments fixes du §1.1 et du point 1 de 026-083 retrouvés ; aucun modèle retiré ; aucun {desinscription}')
    } catch (err) { s.echoue('CO-2', `interrompu : ${premiereLigne(err)}`) }
    // CO-3 : empreintes et jugerModele
    try {
      const e = []
      for (const [id, mo] of Object.entries(M.MODELES)) { const h = crypto.createHash('sha256').update(mo.texte ?? '', 'utf8').digest('hex'); if (mo.empreinte !== h) e.push(`${id} : empreinte ${mo.empreinte}, ${h} attendue`) }
      const ap = lireApprobations()
      e.push(...ap.e)
      for (const [id, mo] of Object.entries(M.MODELES)) { const j = await CF.jugerModele?.(mo); if (j && j.ok === false) e.push(`jugerModele(${id}) refuse : ${json(j.raisons)}`) }
      jugerApprobations('modele', Object.values(M.MODELES), ap, e)
      jugerApprobations('affirmation', AF.AFFIRMATIONS_PERMISES ?? [], ap, e)
      jugerApprobations('faq', FQ.FAQ ?? [], ap, e)
      const DL = await importerDepuis(RAC, 'lib/agents/acquisition/douleurs.ts')
      jugerApprobations('douleur', DL.DOULEURS ?? [], ap, e)
      s.juger('CO-3', e, `${Object.keys(M.MODELES).length} empreintes recalculées ; jugerModele accepte chaque modèle ; approbations (modèles, affirmations, FAQ, douleurs) lues dans .orchestre/preuves/026-083/approbation.txt, chacune à l'empreinte du texte actuel`)
    } catch (err) { s.echoue('CO-3', `interrompu : ${premiereLigne(err)}`) }
    // CO-4 : chaque conforme accepté (sur le banc), puis un vrai formulaire sur la production
    try {
      const e = []
      BANC = await fabriquerBanc('approuve', { approuve: true }); BANC_NON = await fabriquerBanc('non-approuve', { approuve: false })
      FAQ_DELAI = { email: BANC.FQ.FAQ.find((q) => q.id === 'delai')?.reponse_email, meta: BANC.FQ.FAQ.find((q) => q.id === 'delai')?.reponse_meta }
      if (!FAQ_DELAI.email || !FAQ_DELAI.meta) throw new Error("la FAQ n'a pas d'entrée « delai »")
      for (const c of CONFORMES) {
        let ligne = c
        // Le corpus décrit deux messages Meta sans mention IA ni STOP ; la fiche (point 1 : « chaque modèle porte la mention IA ») les impose.
        // Le message conforme est donc le texte du corpus + le pied du modèle du module, à condition que le corpus en soit le début exact
        // et que ce pied porte la mention IA et STOP ; le texte SANS pied doit, lui, être refusé pour mention_ia_absente.
        if (c.canal === 'messagerie' && !/assistant IA de Presti/.test(c.texte)) {
          const plein = remplirCO(BANC.MD.MODELES[c.modele_id]?.texte ?? '')
          if (!plein.startsWith(c.texte)) { e.push(`${c.id} : le texte du corpus n'est pas le début du modèle du module`); continue }
          const pied = plein.slice(c.texte.length)
          if (!/assistant IA de Presti/.test(pied) || !/\bSTOP\b/.test(pied)) e.push(`${c.id} : le pied du modèle ne porte pas la mention IA et STOP`)
          const sans = await jugerBanc(c, Date.parse('2026-10-14T09:00:00.000Z'))
          if (sans.ok || !(sans.raisons ?? []).includes('mention_ia_absente')) e.push(`${c.id} sans pied : ${json(sans)}, mention_ia_absente attendu`)
          ligne = { ...c, texte: plein }
        }
        const r = await jugerBanc(ligne, Date.parse('2026-10-14T09:00:00.000Z')); if (!r.ok) e.push(`${c.id} refusé : ${json(r.raisons)}`)
      }
      // CO-4b : la production elle-même. Un formulaire B, rempli des vraies valeurs (NOTICE_URL, une douleur approuvée du métier, un fait
      // du repère), doit être accepté ; le même avec une douleur NON approuvée doit être refusé pour douleur_non_approuvee.
      {
        const KP = await importerContrat()
        const DL = await importerDepuis(RAC, 'lib/agents/acquisition/douleurs.ts')
        const modeleB = M.MODELES.formulaire_B_v1
        const ap = DL.DOULEURS.find((d) => d.approuve === true && d.metier !== 'tous')
        const nonAp = DL.DOULEURS.find((d) => d.approuve !== true && d.metier === ap?.metier)
        const fait = REPERES_MSG.faits.site_titre_f2
        const bati = (d, adr) => remplirProduction(modeleB.texte, { fait: `sur votre site, « ${fait.extrait} »`, douleur: d.question, adresse: adr, notice: KP.NOTICE_URL, reference: 'AB12CD', source_liste: KP.SOURCES_LISTE.ademe_rge })
        if (!KP.NOTICE_URL) e.push('CO-4b : NOTICE_URL vaut null dans contrat.ts (026-162 non passée)')
        else if (!ap) e.push('CO-4b : aucune douleur approuvée d\'un métier dans DOULEURS')
        else {
          const base = (d) => ({ texte: bati(d, REPERES_MSG.adresse_prospection), sujet: 'Proposition commerciale : un site pour Plomberie Témoin', modele_id: 'formulaire_B_v1', type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', adresse: REPERES_MSG.adresse_prospection, reference: 'AB12CD', preuve_demande: null, formulaire: null, fait_id: fait.id, douleur_id: d.id, faq_id: null, liens: [], prospect: { froid: true, source: 'ademe_rge', metier: d.metier, faits: [fait], entreprise: 'Plomberie Témoin' }, historique: [], oppose: false, maquette: 'aucune', drapeaux: { siteAchatPublic: false, varianteA: false }, maintenant: '2026-10-14T09:00:00.000Z' })
          const r1 = CF.jugerMessage(base(ap))
          if (!r1.ok) e.push(`CO-4b : formulaire_B_v1 de production (douleur ${ap.id}, notice ${KP.NOTICE_URL}) refusé : ${json(r1.raisons)}`)
          if (nonAp) { const r2 = CF.jugerMessage(base(nonAp)); if (r2.ok || !(r2.raisons ?? []).includes('douleur_non_approuvee')) e.push(`CO-4b : la douleur non approuvée ${nonAp.id} n'est pas refusée pour douleur_non_approuvee : ${json(r2)}`) }
        }
      }
      s.juger('CO-4', e, `${CONFORMES.length} messages conformes acceptés sur le banc (production + ${BANC.ecarts.length} écarts déclarés : ${BANC.ecarts.join(' ; ')}) ; CO-4b : un formulaire_B_v1 de production (vraie notice, douleur approuvée) accepté, une douleur non approuvée refusée`)
    } catch (err) { s.echoue('CO-4', `interrompu : ${premiereLigne(err)}`) }
    // CO-5 : chaque fautif refusé avec sa raison
    try {
      const e = []
      const vues = new Set()
      for (const f of FAUTIFS) {
        const r = await jugerBanc(f, Date.parse('2026-10-14T09:00:00.000Z'))
        if (r.ok) e.push(`${f.id} : accepté, ${f.raison} attendu`)
        else if (!(r.raisons ?? []).includes(f.raison)) e.push(`${f.id} : raisons ${json(r.raisons)}, ${f.raison} attendu`)
        else vues.add(f.raison)
        if ((r.raisons ?? []).includes('desinscription_absente')) e.push(`${f.id} : rend desinscription_absente (code retiré)`)
      }
      s.juger('CO-5', e, `${FAUTIFS.length} messages fautifs refusés avec leur raison (${vues.size} raisons distinctes confirmées)`)
    } catch (err) { s.echoue('CO-5', `interrompu : ${premiereLigne(err)}`) }
    // CO-6 : affirmations et FAQ
    try {
      const e = []
      if ((AF.AFFIRMATIONS_PERMISES ?? []).length !== 10) e.push(`AFFIRMATIONS_PERMISES : ${(AF.AFFIRMATIONS_PERMISES ?? []).length} entrées, 10 attendues`)
      if ((AF.AFFIRMATIONS_PERMISES ?? []).some((x) => String(x.texte ?? x).includes('12 mois'))) e.push('AFFIRMATIONS_PERMISES contient « 12 mois »')
      if (!(AF.AFFIRMATIONS_RETIREES ?? []).some((x) => String(x.texte ?? x).includes('12 mois'))) e.push('AFFIRMATIONS_RETIREES ne contient pas « site maintenu 12 mois »')
      const LISTE_NOIRE = ['garanti', 'premier sur Google', 'référencement', 'sans engagement', 'satisfait ou remboursé', '12 mois']
      for (const f of FQ.FAQ ?? []) for (const champ of ['reponse_email', 'reponse_meta']) for (const m of LISTE_NOIRE) if (String(f[champ] ?? '').toLowerCase().includes(m.toLowerCase())) e.push(`FAQ ${f.id} (${champ}) : terme de la liste noire « ${m} »`)
      const src = fs.readFileSync(path.join(RAC, chemins.modeles), 'utf8')
      if (src.includes('490') || src.includes('49000')) e.push('modeles.ts contient « 490 » ou « 49000 » (le prix doit venir de lib/studio/offre.ts)')
      s.juger('CO-6', e, `AFFIRMATIONS_PERMISES à 10, AFFIRMATIONS_RETIREES avec « 12 mois », FAQ sans terme de la liste noire, aucun prix en dur`)
    } catch (err) { s.echoue('CO-6', `interrompu : ${premiereLigne(err)}`) }
    // CO-7 : lecture du source
    try {
      const e = []
      for (const [nom, relf] of Object.entries(chemins)) {
        const src = fs.readFileSync(path.join(RAC, relf), 'utf8')
        const nu = sansCommentaires(src)
        if (/\bfetch\s*\(/.test(nu)) e.push(`${relf} : fetch(`)
        if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push(`${relf} : process.env`)
        for (const i of importsDe(src)) { if (i.spec && ['@/lib/ai', '@/lib/agents/llm', '@/lib/studio'].some((z) => i.spec === z || i.spec.startsWith(`${z}/`))) e.push(`${relf} : import interdit ${i.spec}`) }
      }
      const tc = typecheck(RAC, JUGE)
      if (!tc.ok) e.push(`typecheck : ${tc.detail}`)
      s.juger('CO-7', e, `5 fichiers lus : aucun fetch(, aucun process.env, aucun import de @/lib/ai, @/lib/agents/llm ni @/lib/studio ; typecheck vert`)
    } catch (err) { s.echoue('CO-7', `interrompu : ${premiereLigne(err)}`) }
    // CO-8 : jugerTon fermé par défaut
    try {
      const e = []
      for (const mode of MODES_FERMETURE) {
        const r = await SJ.jugerTon({ texte: 'Message Témoin', canal: 'formulaire_site', type: 'premier_contact' }, { lecteur: creerLecteurFactice(mode) })
        if (r.j2 !== 'refus') e.push(`lecteur en mode ${mode} : j2 ${json(r.j2)}, refus attendu (fermeture par défaut)`)
      }
      const rNull = await SJ.jugerTon({ texte: 'Message Témoin', canal: 'formulaire_site', type: 'premier_contact' }, { lecteur: null })
      if (rNull.j2 !== 'refus') e.push('lecteur null : refus attendu')
      const rOk = await SJ.jugerTon({ texte: 'Message Témoin', canal: 'formulaire_site', type: 'premier_contact' }, { lecteur: creerLecteurFactice('ok') })
      if (rOk.j2 !== 'ok' && SJ.ETALONNAGE?.version === SJ.VERSION) e.push(`lecteur ok, étalonné : j2 ${json(rOk.j2)}, ok attendu`)
      if (SJ.ETALONNAGE?.version !== SJ.VERSION) { if (rOk.j2 !== 'refus' || !(rOk.raisons ?? []).includes('second_juge_non_etalonne')) e.push('ETALONNAGE.version ≠ VERSION : refus second_juge_non_etalonne attendu, zéro appel au lecteur') }
      s.juger('CO-8', e, `${MODES_FERMETURE.length} modes de panne du lecteur → refus ; lecteur null → refus ; non étalonné → second_juge_non_etalonne sans appel`)
    } catch (err) { s.echoue('CO-8', `interrompu : ${premiereLigne(err)}`) }
    // CO-9 : etalonnage.json (déjà écrit par --etalonner --reel --confirmer-reel)
    try {
      const e = []
      const f = path.join(R, '.orchestre', 'preuves', '026-083', 'etalonnage.json')
      if (!fs.existsSync(f)) e.push(`${rel(f)} absent (lancer --etalonner --reel --confirmer-reel d'abord)`)
      else {
        const et = JSON.parse(fs.readFileSync(f, 'utf8'))
        const corpusEt = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '026-acquisition', 'pieges', 'corpus.json'), 'utf8'))
        if (et.sha_corpus !== sha256(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '026-acquisition', 'pieges', 'corpus.json')))) e.push("sha_corpus d'etalonnage.json ≠ SHA-256 du jeu de pièges actuel")
        if (et.sha_consignes !== sha256(Buffer.from(SJ.CONSIGNES_SECOND_JUGE ?? '', 'utf8'))) e.push("sha_consignes d'etalonnage.json ≠ SHA-256 de CONSIGNES_SECOND_JUGE actuelles")
        if (corpusEt.pieges.length < 20 || corpusEt.conformes.length < 20) e.push(`jeu de pièges trop court : ${corpusEt.pieges.length} pièges, ${corpusEt.conformes.length} conformes (20 et 20 au moins)`)
        if (et.lecteurs_indisponibles !== 0) e.push(`etalonnage.json : ${et.lecteurs_indisponibles} lecteur(s) indisponible(s) pendant l'étalonnage`)
        for (const nom of ['agents', 'rejuge']) if (!et.taux?.[nom]) e.push(`etalonnage.json : le modèle « ${nom} » n'a pas de taux`)
        for (const [, t] of Object.entries(et.taux ?? {})) if (t.pieges_refuses < 0.95 || t.conformes_acceptes < 0.95) e.push(`taux sous 95 % : ${json(t)}`)
        if (SJ.ETALONNAGE?.version !== et.version) e.push(`ETALONNAGE.version (${SJ.ETALONNAGE?.version}) ≠ version d'etalonnage.json (${et.version})`)
      }
      s.juger('CO-9', e, `etalonnage.json relu, taux ≥ 95 % des deux côtés pour chaque modèle, ETALONNAGE recopié`)
    } catch (err) { s.echoue('CO-9', `interrompu : ${premiereLigne(err)}`) }
    // CO-10 : les cas de la revue du 25/09
    try {
      const e = []
      // Correction du 29/09 (décision du chef) : les textes étaient MODELES.x.texte(null), c'est-à-dire les gabarits avec leurs {emplacements}
      // non remplis ; les cas « accepté attendu » ne pouvaient pas l'être, et les cas « refusé » l'étaient pour de mauvaises raisons
      // (studio_offre_v1 : le remplacement de « 5 vidéos » ne trouvait rien). Les textes sont remplis, et chaque refus dit sa raison.
      const T = (id) => remplirCO(MODELES[id].texte(null))
      const MD = BANC.MD.MODELES
      const pasStop = remplirCO(MD.rep_faq_meta.texte).replace(' Pour ne plus rien recevoir : réponds STOP.', '')
      if (pasStop === remplirCO(MD.rep_faq_meta.texte)) throw new Error('CO-10 : le pied Meta de rep_faq_meta a changé, le cas « sans STOP » doit suivre')
      const R1 = { type: 'message_recu', id: 'r1' }
      const cas = [
        ['lien_maquette_entrant_email_v1 à un entrant sans fait, preuve case_entrant', { texte: T('lien_maquette_entrant_email_v1'), modele_id: 'lien_maquette_entrant_email_v1', canal: 'email_sollicite', type: 'lien_maquette', source_prospect: 'entrant', preuve_demande: { type: 'case_entrant', id: 'e1' } }, true],
        ['le même à un prospect froid', { texte: T('lien_maquette_entrant_email_v1'), modele_id: 'lien_maquette_entrant_email_v1', canal: 'email_sollicite', type: 'lien_maquette', froid: true }, false, 'modele_hors_canal'],
        ['sans preuve', { texte: T('lien_maquette_entrant_email_v1'), modele_id: 'lien_maquette_entrant_email_v1', canal: 'email_sollicite', type: 'lien_maquette', source_prospect: 'entrant', preuve_demande: null }, false, 'preuve_demande_absente'],
        ['lien_ferme quand siteAchatPublic est baissé', { texte: T('lien_maquette_email_v2'), modele_id: 'lien_maquette_email_v2', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: R1, drapeaux: { siteAchatPublic: false } }, false, 'lien_ferme'],
        ['la forme _rdv correspondante, drapeau baissé', { texte: remplirCO(MD.lien_maquette_email_rdv_v1.texte), modele_id: 'lien_maquette_email_rdv_v1', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: R1, drapeaux: { siteAchatPublic: false } }, true],
        ['lien_maquette_email_v2, drapeau levé', { texte: T('lien_maquette_email_v2'), modele_id: 'lien_maquette_email_v2', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: R1, drapeaux: { siteAchatPublic: true } }, true],
        ['la forme _rdv, drapeau levé', { texte: remplirCO(MD.lien_maquette_email_rdv_v1.texte), modele_id: 'lien_maquette_email_rdv_v1', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: R1, drapeaux: { siteAchatPublic: true } }, true],
        ['stop_confirmation 2 h après opposition', { texte: T('stop_confirmation'), modele_id: 'stop_confirmation', canal: 'email_sollicite', type: 'confirmation_stop', oppose: true, opposition_le_heures: 2 }, true],
        ['stop_confirmation 30 h après opposition', { texte: T('stop_confirmation'), modele_id: 'stop_confirmation', canal: 'email_sollicite', type: 'confirmation_stop', oppose: true, opposition_le_heures: 30 }, false, 'oppose'],
        ['rep_rgpd_acces à un opposant qui a fait sa demande il y a 3 jours', { texte: T('rep_rgpd_acces_email'), modele_id: 'rep_rgpd_acces_email', canal: 'email_sollicite', type: 'reponse_rgpd', oppose: true, demande_rgpd_le_heures: 72 }, true],
        ['questions_entrant_v2 sans STOP', { texte: T('questions_entrant_v2'), modele_id: 'questions_entrant_v2', canal: 'reponse_privee', type: 'reponse' }, true],
        ['rep_faq_meta sans STOP', { texte: pasStop, modele_id: 'rep_faq_meta', canal: 'messagerie', type: 'reponse' }, false, 'stop_absent'],
        ['studio_offre_v1 avec videos ≠ paramètre', { texte: T('studio_offre_v1').replace('5 vidéos', '10 vidéos'), modele_id: 'studio_offre_v1', canal: 'email_sollicite', type: 'reponse', offre: { videos: 5, prix_texte: '490 €' } }, false, 'offre_hors_parametre'],
        ['studio_offre_v1 aux paramètres', { texte: T('studio_offre_v1'), modele_id: 'studio_offre_v1', canal: 'email_sollicite', type: 'reponse', offre: { videos: 5, prix_texte: '490 €' } }, true],
      ]
      for (const [nom, entree, ok, raison] of cas) {
        const r = await jugerBanc(entree, Date.parse('2026-10-14T09:00:00.000Z'))
        if (!!r.ok !== ok) e.push(`${nom} : ${json(r.ok ? { ok: true } : { ok: false, raisons: r.raisons })}, ${ok ? 'accepté' : 'refusé'} attendu`)
        else if (!ok && raison && !(r.raisons ?? []).includes(raison)) e.push(`${nom} : refusé pour ${json(r.raisons)}, ${raison} attendu`)
      }
      s.juger('CO-10', e, `${cas.length} cas de la revue du 25/09 (entrants, lien_ferme, exceptions d'opposition, questions_entrant_v2/rep_faq_meta, offre du Studio)`)
    } catch (err) { s.echoue('CO-10', `interrompu : ${premiereLigne(err)}`) }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
