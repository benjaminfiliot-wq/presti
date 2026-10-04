#!/usr/bin/env node
// scripts/garde-stop-qa.mjs — le juge hors ligne du garde-stop : un STOP ou une demande RGPD reçu en NOUVEL e-mail (hors de tout
// fil) doit être traité, jamais perdu. Écrit par Claude Code AVANT le correctif de lib/agents/acquisition/standardiste.ts ;
// l'agent qui corrige ne touche jamais à ce fichier ni à scripts/fixtures/026-garde/stop/.
//
//   node --import ./scripts/ts-loader.mjs scripts/garde-stop-qa.mjs [--racine=<arbre>] [--temoin] [--auto-controle]
//
//   --racine=<arbre>  juge <arbre>/lib/agents/acquisition/standardiste.ts (défaut : le dépôt) ; la preuve le lance sur la
//                     référence, sur le témoin et sur chaque sabotage du témoin ;
//   --temoin          juge le TÉMOIN (scripts/fixtures/026-garde/stop/temoin/) posé sur une copie de lib/agents/acquisition/ du
//                     dépôt, sous .orchestre/travail/garde-stop-qa/ ;
//   --auto-controle   AC-1 à AC-3 : les jeux d'essai se lisent, les doublures appliquent leurs règles, les étiquettes du corpus
//                     tiennent contre un contrôle indépendant.
//
// Règle attendue (décision de Benj du 30/09, garde-fous automatiques) : l'opposition et la demande RGPD passent AVANT le
// rattachement à un fil ; si l'expéditeur n'est pas exploitable, une carte « attention » (`verifier_demande`) est ouverte, jamais
// un silence. L'expéditeur est lu dans le champ `expediteur` de la réponse reçue (l'en-tête From), comme `acq_reponse_recue`
// (0106) le reçoit déjà dans son JSON d'entrée.
//
// Critères : GS-1 un STOP hors fil crée une opposition définitive (23 formes) ; GS-2 une demande RGPD hors fil crée une carte
// `rgpd` avec échéance ; GS-3 expéditeur inexploitable + STOP ou RGPD → carte, jamais ignoré ; GS-4 un message ordinaire hors fil
// reste `hors_fil`, un STOP dans un fil opposé comme avant ; GS-5 l'opposition est durable (casse, nom affiché, alias « +étiquette »,
// autre fil, domaine professionnel, jamais une messagerie gratuite) ; GS-6 l'ordre (opposition avant le rattachement, avant la
// réponse automatique, avant la carte RGPD) ; GS-7 aucun envoi déclenché par un STOP.
//
// Le juge branche le magasin en mémoire de scripts/fixtures/026-acquisition/ (mêmes règles que la base), enveloppé d'un espion qui
// consigne chaque appel et ses arguments BRUTS (la doublure normalise : une clé fautive y serait masquée). Hors ligne, fuseau UTC.
// Sortie : une ligne par critère (« ✅ GS-n … » ou « ❌ GS-n … »), puis « garde-stop-qa : PASS|FAIL ». Code 0 seulement si tout est
// vert ; 1 sinon ; 2 si l'appel est invalide ou si un préalable manque. N'écrit que sous .orchestre/travail/garde-stop-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, LOADER, lireOptions, creerSortie, premiereLigne, court, exigerSousTravail, listerFichiers, lireOuNull } from './fixtures/026-pilotage/a/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerMagasin } from './fixtures/026-acquisition/magasin-memoire.mjs'
import * as K from './fixtures/026-garde/stop/corpus.mjs'
import { autoControle } from './fixtures/026-garde/stop/autocontrole.mjs'

const JUGE = 'garde-stop-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['auto-controle'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const AUTO = o.drapeaux.has('auto-controle')
const NOM = `${JUGE}${AUTO ? ' --auto-controle' : ''}${o.temoin ? ' --temoin' : ''}`
const IDS = ['GS-1', 'GS-2', 'GS-3', 'GS-4', 'GS-5', 'GS-6', 'GS-7']
const MODULE = 'lib/agents/acquisition/standardiste.ts'
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const JOUR = 24 * 3600_000
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const clone = (x) => { try { return JSON.parse(JSON.stringify(x)) } catch { return null } }

if (AUTO) {
  const r = await autoControle()
  console.log(`${r.echecs.length ? '❌' : '✅'} AC ${r.echecs.length ? r.echecs.slice(0, 6).join(' ; ') : r.detail}`)
  console.log(`${NOM} : ${r.echecs.length ? 'FAIL' : 'PASS'}`)
  process.exit(r.echecs.length ? 1 : 0)
}

// ── La racine jugée : le dépôt, un arbre donné, ou le témoin posé sur une copie du dossier acquisition du dépôt ──────────────
let racine = o.racine
if (o.temoin) {
  const src = path.join(R, 'scripts', 'fixtures', '026-garde', 'stop', 'temoin')
  if (!fs.existsSync(src)) refuser(`préalable manquant : ${src} (le témoin du lot)`)
  const dest = exigerSousTravail(path.join(TRAVAIL, JUGE, 'etat-temoin'))
  fs.rmSync(dest, { recursive: true, force: true })
  const dossier = path.join(dest, 'lib', 'agents', 'acquisition')
  fs.mkdirSync(dossier, { recursive: true })
  for (const f of fs.readdirSync(path.join(R, 'lib', 'agents', 'acquisition'))) if (f.endsWith('.ts')) fs.copyFileSync(path.join(R, 'lib', 'agents', 'acquisition', f), path.join(dossier, f))
  for (const f of listerFichiers(src)) {
    if (!f.endsWith('.temoin')) continue
    const d = path.join(dest, f.slice(0, -'.temoin'.length))
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.copyFileSync(path.join(src, f), d)
  }
  racine = dest
}

const s = creerSortie(NOM, IDS, `${NOM} — racine ${path.relative(R, racine).split(path.sep).join('/') || '.'}`)
let mod = null
try {
  const fichier = path.join(racine, MODULE)
  if (!fs.existsSync(fichier)) throw new Error(`${MODULE} absent de ${racine}`)
  mod = await import(pathToFileURL(fichier).href)
  if (typeof mod.executerStandardiste !== 'function' || typeof mod.classerEnCode !== 'function') throw new Error('executerStandardiste ou classerEnCode non exporté')
} catch (e) { mod = null; s.echoue('GS-1', `module illisible : ${premiereLigne(e)}`) }

// ═══ Le banc : un magasin en mémoire, un espion, un lecteur qui compte ═════════════════════════════════════════════════════
let prospectN = 0
const prospectEssai = (x = {}) => {
  prospectN += 1
  return { cle_dedup: `domaine:garde-${prospectN}-temoin.invalid`, source: 'ademe_rge', cible: 'artisan', siren: `8${String(10000000 + prospectN)}`, domaine: `garde-${prospectN}-temoin.invalid`, entreprise: `Garde Témoin ${prospectN}`, metier: 'menuisier', froid: true, etape: 'envoye', faits: [], canaux: [], ...x }
}
function espion(M) {
  const appels = []
  const proxy = new Proxy(M, {
    get(cible, prop) {
      const v = cible[prop]
      if (typeof v !== 'function' || typeof prop !== 'string') return v
      return (...args) => { appels.push({ m: prop, args: clone(args) }); return v.apply(cible, args) }
    },
  })
  return { proxy, appels }
}
/** Une réponse reçue (hors fil par défaut : envoi, conversation, prospect à null), traitée par executerStandardiste. */
async function jouer(texte, expediteur, { auto = false, accuse = false, prospect = null, prospectsAutres = [] } = {}) {
  const H = creerHorloge(T0)
  const M = creerMagasin({ horloge: H })
  const pid = prospect ? M.inserer(prospectEssai(prospect)) : null
  const autres = prospectsAutres.map((p) => M.inserer(prospectEssai(p)))
  const id = `rep-garde-${++prospectN}`
  M.poserEtat({ reponses_recues: [{ id, id_externe: `ext-${id}`, expediteur, texte, canal: 'email_sollicite', source: 'courriel', auto, accuse_site: accuse, prospect_id: pid, recu_le: new Date(T0).toISOString() }] })
  const { proxy, appels } = espion(M)
  let appelsLecteur = 0
  let bilan = null, exception = null
  try { bilan = await mod.executerStandardiste({ magasin: proxy, lecteur: async () => { appelsLecteur += 1; return null }, horloge: H, echeance: H.maintenant() + 5 * 60_000 }) } catch (e) { exception = premiereLigne(e) }
  const etat = M.etat()
  return {
    M, id, pid, autres, appels, appelsLecteur, erreurs: (bilan?.erreurs ?? 0) + (exception ? 1 : 0), exception,
    classe: etat.reponses[0]?.classement?.classe ?? null, oppositions: etat.oppositions, decisions: etat.decisions, envois: etat.envois.length,
    ecritures: M.ecritures.map((x) => x.methode), prospects: etat.prospects,
  }
}
const nomsAppels = (r) => r.appels.map((a) => a.m)
const opposition = (r, type, valeur) => r.oppositions.find((x) => x.cle_type === type && x.cle_valeur === valeur)
const lieu = (t) => `« ${court(String(t).replace(/\s+/g, ' '), 34)} »`
const envoiEssai = (prospect_id, type, destinataire) => ({ prospect_id, type, canal: 'email_sollicite', envoyeur: 'gmail', destinataire, objet: null, texte: 'Bonjour', empreinte_texte: 'x', modele_id: 'm', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: null })
const defautsDeRun = (r, quoi) => (r.erreurs ? [`${quoi} : ${r.exception ?? `${r.erreurs} erreur(s) avalée(s) par le Standard`}`] : [])

// ═══ Les critères ═════════════════════════════════════════════════════════════════════════════════════════════════════════
if (mod) {
  // GS-1 : le STOP hors fil crée une opposition définitive sur l'adresse de l'expéditeur, sous toutes ses formes
  await s.critere('GS-1', async () => {
    const e = []
    for (const t of K.STOPS) {
      const r = await jouer(t, K.EXPEDITEUR)
      e.push(...defautsDeRun(r, lieu(t)))
      const op = opposition(r, 'email', K.ADRESSE_ATTENDUE)
      if (r.classe === 'hors_fil') e.push(`${lieu(t)} classé hors_fil, aucune opposition`)
      else if (!op) e.push(`${lieu(t)} : aucune opposition sur l'adresse de l'expéditeur (classe ${json(r.classe)})`)
      else if (op.expire_le !== null) e.push(`${lieu(t)} : opposition non définitive (${json(op.expire_le)})`)
      else if (r.classe !== 'stop') e.push(`${lieu(t)} : classe ${json(r.classe)}, stop attendu`)
      if (r.appelsLecteur) e.push(`${lieu(t)} : ${r.appelsLecteur} appel(s) au lecteur, zéro attendu`)
    }
    return { echecs: e, detail: `${K.STOPS.length} formes de STOP hors fil (casse, accents, ponctuation) → classe stop, opposition définitive sur l'adresse de l'expéditeur, lecteur jamais appelé` }
  })

  // GS-2 : la demande RGPD hors fil ouvre une carte rgpd, échue dans le mois
  await s.critere('GS-2', async () => {
    const e = []
    for (const t of K.RGPDS) {
      const r = await jouer(t, K.EXPEDITEUR)
      e.push(...defautsDeRun(r, lieu(t)))
      const c = r.decisions.find((d) => d.type === 'rgpd' && d.reponse_id === r.id)
      if (r.classe === 'hors_fil') e.push(`${lieu(t)} classé hors_fil, aucune carte RGPD`)
      else if (!c) e.push(`${lieu(t)} : aucune carte rgpd (classe ${json(r.classe)}, cartes ${json(r.decisions.map((d) => d.type))})`)
      else {
        const delai = Date.parse(c.echeance) - T0
        if (!Number.isFinite(delai) || delai <= 0 || delai > 30 * JOUR) e.push(`${lieu(t)} : échéance ${json(c.echeance)}, dans le mois suivant la réception attendue (art. 12(3))`)
        if (r.classe !== 'rgpd') e.push(`${lieu(t)} : classe ${json(r.classe)}, rgpd attendu`)
      }
      if (r.appelsLecteur) e.push(`${lieu(t)} : ${r.appelsLecteur} appel(s) au lecteur, zéro attendu`)
    }
    return { echecs: e, detail: `${K.RGPDS.length} demandes sur les données hors fil → classe rgpd, une carte rgpd échue à moins de 30 jours, lecteur jamais appelé` }
  })

  // GS-3 : un expéditeur inexploitable n'éteint jamais un STOP ni une demande RGPD : une carte « attention »
  await s.critere('GS-3', async () => {
    const e = []
    for (const exp of K.EXPEDITEURS_INEXPLOITABLES) {
      for (const t of ['STOP', 'Arrêtez de m’écrire']) {
        const r = await jouer(t, exp)
        const nom = `expéditeur ${json(exp) || 'undefined'} + ${lieu(t)}`
        e.push(...defautsDeRun(r, nom))
        const c = r.decisions.find((d) => d.type === 'verifier_demande' && d.reponse_id === r.id)
        if (!c) e.push(`${nom} : aucune carte verifier_demande — le refus est perdu (classe ${json(r.classe)})`)
        else if (!Array.isArray(c.options) || c.options.length < 2) e.push(`${nom} : carte sans options`)
        if (r.classe === 'hors_fil' || r.classe === 'ignoree') e.push(`${nom} : classe ${json(r.classe)}, le STOP a été lu`)
        if (r.oppositions.length) e.push(`${nom} : ${r.oppositions.length} opposition(s) sur une clé inventée (${json(r.oppositions.map((x) => x.cle_valeur))})`)
      }
      const r = await jouer(K.RGPDS[1], exp)
      if (!r.decisions.some((d) => d.type === 'rgpd' && d.reponse_id === r.id)) e.push(`expéditeur ${json(exp) || 'undefined'} + demande RGPD : aucune carte rgpd`)
    }
    return { echecs: e, detail: `${K.EXPEDITEURS_INEXPLOITABLES.length} expéditeurs inexploitables (vide, non-adresse, adresse mal formée) × STOP : une carte verifier_demande à chaque fois, aucune clé inventée ; la demande RGPD garde sa carte` }
  })

  // GS-4 : pas de faux positif hors fil, pas de régression dans un fil
  await s.critere('GS-4', async () => {
    const e = []
    for (const t of K.ORDINAIRES_HORS_FIL) {
      const r = await jouer(t, K.EXPEDITEUR)
      e.push(...defautsDeRun(r, lieu(t)))
      if (r.classe !== 'hors_fil') e.push(`${lieu(t)} : classe ${json(r.classe)}, hors_fil attendu`)
      if (r.oppositions.length) e.push(`${lieu(t)} : fausse opposition (${json(r.oppositions.map((x) => `${x.cle_type}:${x.cle_valeur}`))})`)
      if (r.decisions.length) e.push(`${lieu(t)} : fausse carte (${json(r.decisions.map((d) => d.type))})`)
      if (r.appelsLecteur || r.envois) e.push(`${lieu(t)} : lecteur ou envoi déclenché`)
    }
    const dansFil = await jouer('STOP', null, { prospect: {} })
    const p = dansFil.prospects[0]
    if (!p || p.etape !== 'oppose') e.push(`STOP dans un fil : le prospect est à l'étape ${json(p?.etape)}, oppose attendu`)
    if (!dansFil.oppositions.some((x) => x.cle_type === 'siren' && x.expire_le === null)) e.push('STOP dans un fil : aucune opposition définitive sur le SIREN du prospect')
    const ordinaireDansFil = await jouer('Oui, ça m’intéresse, envoyez-moi ça.', null, { prospect: {} })
    if (ordinaireDansFil.oppositions.length || ordinaireDansFil.prospects[0]?.etape === 'oppose') e.push('message ordinaire dans un fil : opposition créée')
    return { echecs: e, detail: `${K.ORDINAIRES_HORS_FIL.length} messages ordinaires hors fil (dont « stop » au milieu d'une phrase) restent hors_fil, sans opposition ni carte ; un STOP dans un fil oppose toujours son prospect` }
  })

  // GS-5 : l'opposition est durable : aucun envoi ne repart vers l'expéditeur, sous aucune forme de son adresse
  await s.critere('GS-5', async () => {
    const e = []
    const affiche = await jouer('STOP', K.EXPEDITEUR_AFFICHE, { prospectsAutres: [{}, { domaine: K.DOMAINE_PRO, cle_dedup: `domaine:${K.DOMAINE_PRO}`, siren: '899999991' }] })
    e.push(...defautsDeRun(affiche, 'nom affiché'))
    for (const [type, valeur] of [['email', K.ADRESSE_AFFICHE], ['email', K.ADRESSE_AFFICHE_BASE], ['domaine', K.DOMAINE_PRO]]) {
      const op = opposition(affiche, type, valeur)
      if (!op) e.push(`sender « Nom » <adresse+alias> : pas d'opposition ${type} sur ${valeur}`)
      else if (op.expire_le !== null) e.push(`opposition ${type} ${valeur} non définitive`)
    }
    const M = affiche.M
    if (!(await M.estOppose({ email: K.ADRESSE_AFFICHE_BASE.toUpperCase() }))) e.push('l’adresse en MAJUSCULES n’est pas reconnue comme opposée')
    const [autreFil, memeDomaine] = affiche.autres
    for (const type of ['relance', 'premier_contact', 'reponse']) {
      for (const dest of [K.ADRESSE_AFFICHE_BASE.toUpperCase(), K.ADRESSE_AFFICHE, K.ADRESSE_AFFICHE_BASE]) {
        const r = await M.preparerEnvoi(envoiEssai(autreFil, type, dest))
        if (r.ok !== false || r.raison !== 'opposition') e.push(`envoi ${type} vers ${dest} depuis un autre fil : ${json(r)}, refus « opposition » attendu`)
      }
    }
    const domaine = await M.preparerEnvoi(envoiEssai(memeDomaine, 'relance', K.AUTRE_ADRESSE_MEME_DOMAINE))
    if (domaine.raison !== 'opposition') e.push(`envoi vers ${K.AUTRE_ADRESSE_MEME_DOMAINE} (même domaine professionnel) : ${json(domaine)}, refus « opposition » attendu`)
    const gratuit = await jouer('STOP', K.EXPEDITEUR_GRATUIT, { prospectsAutres: [{}] })
    e.push(...defautsDeRun(gratuit, 'messagerie gratuite'))
    if (!opposition(gratuit, 'email', K.ADRESSE_GRATUITE)) e.push(`${K.EXPEDITEUR_GRATUIT} : pas d'opposition sur l'adresse`)
    const brutes = gratuit.appels.filter((a) => a.m === 'opposer').map((a) => a.args[0] ?? {})
    if (brutes.some((c) => c.domaine && /gmail\.com/i.test(c.domaine)) || gratuit.oppositions.some((x) => x.cle_type === 'domaine')) e.push('un STOP depuis gmail.com met tout le domaine en opposition')
    const autre = await gratuit.M.preparerEnvoi(envoiEssai(gratuit.autres[0], 'relance', K.AUTRE_ADRESSE_GRATUITE))
    if (autre.raison === 'opposition') e.push(`une autre personne de gmail.com (${K.AUTRE_ADRESSE_GRATUITE}) est opposée à tort`)
    return { echecs: e, detail: 'nom affiché, chevrons, alias +étiquette et MAJUSCULES : adresse, alias et domaine professionnel opposés définitivement ; envois relance/premier_contact/reponse refusés depuis un autre fil ; gmail.com jamais opposé en bloc' }
  })

  // GS-6 : l'ordre — l'opposition avant le rattachement, avant la réponse automatique, avant la carte RGPD
  await s.critere('GS-6', async () => {
    const e = []
    const horsFil = { envoi_id: null, conversation_id: null, prospect_id: null }
    const cas = [
      ['STOP hors fil', { ...horsFil, texte: 'STOP' }, (c) => c?.stop === true && c.classe === 'stop'],
      ['STOP poli hors fil', { ...horsFil, texte: 'Arrêtez, merci.' }, (c) => c?.stop === true && c.classe === 'stop'],
      ['RGPD hors fil', { ...horsFil, texte: K.RGPDS[1] }, (c) => c?.classe === 'rgpd'],
      ['STOP + RGPD hors fil', { ...horsFil, texte: K.STOP_ET_RGPD }, (c) => c?.stop === true && c.classe === 'rgpd'],
      ['STOP d’une réponse automatique hors fil', { ...horsFil, texte: 'STOP', auto: true }, (c) => c?.stop === true && c.classe === 'stop'],
      ['STOP d’un accusé de site hors fil', { ...horsFil, texte: 'Stop à vos mails', accuse_site: true }, (c) => c?.stop === true && c.classe === 'stop'],
      ['message ordinaire hors fil', { ...horsFil, texte: K.ORDINAIRES_HORS_FIL[0] }, (c) => c?.classe === 'hors_fil' && c.stop === false],
    ]
    for (const [nom, rep, ok] of cas) {
      let c = null
      try { c = mod.classerEnCode(rep) } catch (x) { e.push(`classerEnCode(${nom}) a levé : ${premiereLigne(x)}`); continue }
      if (!ok(c)) e.push(`classerEnCode(${nom}) → ${json(c)}`)
    }
    const r = await jouer(K.STOP_ET_RGPD, K.EXPEDITEUR)
    const ecr = r.appels.filter((a) => ['opposer', 'creerDecision', 'classerReponse'].includes(a.m))
    const iOpp = ecr.findIndex((a) => a.m === 'opposer')
    const iRgpd = ecr.findIndex((a) => a.m === 'creerDecision' && a.args[0]?.type === 'rgpd')
    const iClasse = ecr.findIndex((a) => a.m === 'classerReponse')
    if (iOpp < 0) e.push('« STOP, et supprimez mes données » : aucune opposition')
    if (iRgpd < 0) e.push('« STOP, et supprimez mes données » : aucune carte rgpd')
    if (iOpp >= 0 && iRgpd >= 0 && iOpp > iRgpd) e.push('la carte rgpd est créée AVANT l’opposition (le STOP s’applique en premier)')
    if (iClasse >= 0 && ((iOpp >= 0 && iClasse < iOpp) || (iRgpd >= 0 && iClasse < iRgpd))) e.push('la réponse est classée AVANT ses actes')
    for (const [nom, opts] of [['réponse automatique', { auto: true }], ['accusé de site', { accuse: true }]]) {
      const x = await jouer('STOP', K.EXPEDITEUR, opts)
      if (!opposition(x, 'email', K.ADRESSE_ATTENDUE)) e.push(`STOP d’une ${nom} hors fil : aucune opposition (classe ${json(x.classe)})`)
    }
    return { echecs: e, detail: 'classerEnCode teste STOP et RGPD avant hors_fil, avant reponse_auto et accuse_site ; à l’exécution : opposition, puis carte rgpd, puis classement' }
  })

  // GS-7 : un STOP ne déclenche aucun envoi
  await s.critere('GS-7', async () => {
    const e = []
    const essais = [...K.STOPS.filter((_, i) => i % 3 === 0), K.STOP_ET_RGPD].map((t) => [t, K.EXPEDITEUR]).concat([['STOP', undefined], ['STOP', K.EXPEDITEUR_AFFICHE], ['STOP', K.EXPEDITEUR_GRATUIT]])
    for (const [t, exp] of essais) {
      const r = await jouer(t, exp)
      const envoi = nomsAppels(r).filter((m) => K.METHODES_ENVOI.includes(m))
      if (r.envois) e.push(`${lieu(t)} : ${r.envois} envoi(s) créé(s)`)
      if (envoi.length) e.push(`${lieu(t)} : appel(s) d'envoi ${json([...new Set(envoi)])}`)
      const hors = [...new Set(r.ecritures.filter((m) => !K.ECRITURES_PERMISES.includes(m)))]
      if (hors.length) e.push(`${lieu(t)} : écriture(s) hors du tableau du Standard ${json(hors)}`)
      if (r.appelsLecteur) e.push(`${lieu(t)} : le lecteur a été appelé`)
    }
    return { echecs: e, detail: `${essais.length} STOP hors fil (dont expéditeur absent, nom affiché, messagerie gratuite) : aucun envoi, aucun appel d'envoi, aucune écriture hors du tableau du Standard` }
  })
}
s.nonJuges(IDS.filter((id) => !s.evalue(id)), 'module du Standard illisible')

// Une note, pas un critère : la base elle-même classe `hors_fil` à l'insertion (0106), avant que le Standard lise la réponse.
try {
  const dossier = path.join(R, 'supabase', 'migrations')
  const fichiers = fs.readdirSync(dossier).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()
  const dernier = [...fichiers].reverse().find((f) => /acq_reponse_recue/.test(lireOuNull(path.join(dossier, f)) ?? ''))
  const texte = dernier ? lireOuNull(path.join(dossier, dernier)) : ''
  if (/v_classe\s*:=\s*case\s+when[^;]*'hors_fil'/i.test(texte ?? '')) console.log(`ℹ NOTE ${dernier} pose classe = 'hors_fil' à l'insertion (acq_reponse_recue) et ne garde pas l'expéditeur : le Standard ne reçoit pas ces réponses (classe is null) — hors périmètre de ce juge`)
} catch { /* la note est facultative */ }
process.exit(s.finir())
