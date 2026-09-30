#!/usr/bin/env node
// scripts/garde-doublon-qa.mjs — le juge de la garde anti-doublon des envois (décision de Benj du 30/09 : l'écosystème n'attend
// plus son accord à chaque envoi, les garde-fous automatiques sont la protection). Écrit par Claude Code AVANT le correctif
// qu'il juge ; l'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/garde-doublon-qa.mjs [--racine=<d>] [--temoin] [--auto-controle]
//
// LE DÉFAUT JUGÉ. Le Facteur est le seul portier d'envoi, et il envoie AVANT de marquer `envoye` : si `marquerEnvoye` échoue, ou
// si `acq_envoi_envoye` rend { ok: false } (que magasinSupabase ignore), l'envoi reste `approuve` et repart 15 minutes plus
// tard. Deux passes concurrentes lisent la même ligne sans réservation. En base, `envoye` n'est jamais refusé hors règle
// (un événement `envoi_hors_regle` seulement) et trois envoyeurs existent (facteur_usine, gmail, repondeur ; essai_e2e exempté).
//
// LA RÈGLE ATTENDUE. RÉSERVER AVANT D'ENVOYER : approuve → en_cours_envoi, atomique (une seule tentative gagne), avec une clé
// d'idempotence stable par (destinataire, modèle, fait), unique en base. Puis envoyer, puis consigner (→ envoye). Si l'issue est
// incertaine (la base tombe après l'envoi, délai dépassé sur le transport) : envoi_incertain + une carte « à réconcilier » ;
// JAMAIS de renvoi automatique, un contrôle tranche. La base refuse `envoye` sans réservation (seule exemption : essai_e2e vers
// un destinataire .invalid). La pause générale et le plafond du jour se lisent AU MOMENT de réserver.
//
// CRITÈRES (GD-1 est le premier, rouge sur l'arbre actuel) :
//   GD-1 le Facteur réserve (statut en_cours_envoi + clé) AVANT tout appel Gmail ; réservation indisponible → rien ne part ;
//   GD-2 l'écriture `envoye` échoue (ou la base tombe, ou l'issue est inconnue) → aucun renvoi, état incertain, carte
//        « à réconcilier » sans donnée personnelle ; un refus net relâche l'envoi ; magasinSupabase ne tait plus { ok: false } ;
//   GD-3 deux exécutions concurrentes du même envoi n'envoient qu'une fois ; réservation atomique côté base ;
//   GD-4 clé stable (même destinataire+modèle+fait ⇒ même clé, formule commune TS/SQL) et unique en base ;
//   GD-5 les trois envoyeurs passent par la même réservation (Gmail, Meta/répondeur, formulaire/usine) ; aucun contournement ;
//   GD-6 la base refuse `envoye` sans réservation (essai_e2e borné à des destinataires .invalid) ;
//   GD-7 la pause générale est lue à la réservation ;
//   GD-8 le plafond du jour (heure de Paris) est respecté au moment de la réservation.
//
// Trois façons de juger : (1) le Facteur jugé tourne dans un processus, sur des doublures (base en mémoire atomique, Gmail et Meta
// factices, horloge virtuelle, aucun réseau : scripts/fixtures/026-garde/doublon/doublures.mjs) ; (2) la lecture STATIQUE de la
// migration de réservation (supabase/migrations/0121_*.sql ou suivante, qui définit public.acq_envoi_reserver) — aucun Postgres
// n'est lancé ici : une règle SQL est lue, pas exécutée (limite assumée, voir le rapport) ; (3) une recherche des contournements
// (un module qui consigne un envoi sans réserver).
//   --racine=<d>  juge l'arbre <d> (référence, témoin, sabotage) ; défaut : le dépôt.
//   --temoin      juge le TÉMOIN du lot (scripts/fixtures/026-garde/doublon/temoin/ : facteur.ts, contrat.ts, magasinSupabase.ts,
//                 migration 0121) posé sur une copie (liens physiques) des dossiers lus par ce juge, sous .orchestre/travail/.
//   --auto-controle  les doublures se contrôlent elles-mêmes (la base atomique, le chronomètre) ; indépendant du module jugé.
// Sortie : « ✅ ID … » / « ❌ ID … » par critère, puis « garde-doublon-qa : PASS|FAIL — ids ». Code 0 tout vert ; 1 un rouge ;
// 2 appel invalide ou préalable manquant (racine absente). N'écrit que sous .orchestre/travail/garde-doublon-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, sansCommentaires, premiereLigne, court, exigerSousTravail, TRAVAIL, piegerReseau,
} from './fixtures/026-acquisition/commun.mjs'
import { instructions, segments, normaliser, seParse } from './lib/sql-essai.mjs'
import { monter, ligne, ligneMeta, ligneFormulaire, cleAttendue, creerBase, chronometre, QUART_D_HEURE, JOUR, T0, jourParis } from './fixtures/026-garde/doublon/doublures.mjs'

const JUGE = 'garde-doublon-qa'
const IDS = ['GD-1', 'GD-2', 'GD-3', 'GD-4', 'GD-5', 'GD-6', 'GD-7', 'GD-8']
const DOUBLON = path.join(R, 'scripts', 'fixtures', '026-garde', 'doublon')
const refuser = (m, code = 2) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(code) }
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['temoin'] })
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.drapeaux.has('temoin') && o.valeurs.racine) refuser('--temoin et --racine s\'excluent : le témoin se pose sur sa propre copie')
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

// ── --auto-controle : les doublures, sans aucun module jugé ─────────────────────────────────────────────────────────────────
if (o.autoControle) {
  const e = []
  const b = creerBase({ lignes: [ligne(1), ligne(2, { destinataire: 'x@y.invalid' })] })
  const r = await Promise.all([b.reserverEnvoi('env-0001', 'c'.repeat(64)), b.reserverEnvoi('env-0001', 'c'.repeat(64))])
  if (r.filter((x) => x.ok).length !== 1) e.push('la base d\'essai n\'est pas atomique : deux réservations simultanées ont réussi')
  if ((await b.reserverEnvoi('env-0002', 'c'.repeat(64))).raison !== 'deja_reserve') e.push('l\'index unique de la clé n\'est pas tenu')
  let refus = null; try { await b.marquerEnvoye('env-0002', {}) } catch (err) { refus = err.message }
  if (refus !== 'ops:envoye_sans_reservation') e.push('la base d\'essai accepte envoye sans réservation')
  b.poser(ligne(3, { canal: 'essai_e2e', destinataire: 'a@b.invalid' })); await b.marquerEnvoye('env-0003', {})
  b.poser(ligne(4, { canal: 'essai_e2e', destinataire: 'a@b.fr' })); let r4 = null; try { await b.marquerEnvoye('env-0004', {}) } catch (err) { r4 = err.message }
  if (r4 !== 'ops:envoye_sans_reservation') e.push('l\'exemption essai_e2e n\'est pas bornée aux destinataires .invalid')
  console.log(`${JUGE} --auto-controle : ${e.length ? `FAIL — ${e.join(' ; ')}` : 'PASS — base atomique, clé unique, envoye refusé hors réservation, exemption bornée'}`)
  process.exit(e.length ? 1 : 0)
}

// ── Le témoin : une copie des dossiers lus, avec les fichiers du témoin posés dessus ─────────────────────────────────────────
const SUFFIXE = '.temoin'
const DOSSIERS_LUS = ['lib/agents', 'app/api/cron', 'app/api/usine', 'app/api/agents', 'scripts/agents', 'scripts/usine', 'supabase/migrations']
function listerFichiers(d, base = d) {
  const out = []
  for (const x of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, x.name)
    if (x.isDirectory()) out.push(...listerFichiers(p, base)); else out.push(path.relative(base, p).split(path.sep).join('/'))
  }
  return out
}
let RAC = o.racine
let temoinDest = null
if (o.drapeaux.has('temoin')) {
  temoinDest = exigerSousTravail(path.join(TRAVAIL, JUGE, `temoin-${process.pid}`))
  fs.rmSync(temoinDest, { recursive: true, force: true })
  for (const d of DOSSIERS_LUS) {
    const src = path.join(R, d)
    if (!fs.existsSync(src)) continue
    for (const f of listerFichiers(src)) {
      if (/(^|\/)_A_COLLER_/.test(f)) continue
      const dst = path.join(temoinDest, d, f)
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      try { fs.linkSync(path.join(src, f), dst) } catch { fs.copyFileSync(path.join(src, f), dst) }
    }
  }
  const t = path.join(DOUBLON, 'temoin')
  for (const f of listerFichiers(t)) {
    if (!f.endsWith(SUFFIXE)) continue
    const dst = path.join(temoinDest, f.slice(0, -SUFFIXE.length))
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.rmSync(dst, { force: true })
    fs.writeFileSync(dst, fs.readFileSync(path.join(t, f)))
  }
  RAC = temoinDest
  process.on('exit', () => { try { fs.rmSync(temoinDest, { recursive: true, force: true }) } catch { /* ménage au mieux */ } })
}
const NOM = `${JUGE}${o.drapeaux.has('temoin') ? ' --temoin' : ''}`
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const s = creerSortie(NOM, [...IDS], `${NOM} — racine ${o.drapeaux.has('temoin') ? 'témoin (scripts/fixtures/026-garde/doublon/temoin/)' : rel(RAC)}`)
const piege = piegerReseau()

// ── Le SQL : les fonctions de l'ensemble des migrations (la dernière définition gagne), lues, jamais exécutées ──────────────
const compact = (t) => normaliser(t).replace(/\s+/g, '').toLowerCase()
function lireMigrations() {
  const d = path.join(RAC, 'supabase', 'migrations')
  if (!fs.existsSync(d)) return []
  return fs.readdirSync(d).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort().map((f) => ({ f, sql: fs.readFileSync(path.join(d, f), 'utf8') }))
}
const MIGRATIONS = lireMigrations()
const fonctions = new Map(), declencheurs = [], instructionsTous = []
for (const m of MIGRATIONS) {
  let ins = []
  try { ins = instructions(m.sql) } catch { ins = [] }
  for (const st of ins) {
    const d = st.indexOf('$')
    const tete = st.slice(0, d < 0 ? st.length : d)
    const f = /^\s*create\s+(?:or\s+replace\s+)?function\s+(?:(?:public|ops)\.)?([a-z_0-9]+)\s*\(/i.exec(tete)
    if (f) {
      const dollar = segments(st).find((x) => x.type === 'dollar')
      fonctions.set(f[1].toLowerCase(), { fichier: m.f, tete: compact(tete), corps: compact(dollar ? dollar.corps : st) })
      continue
    }
    const c = compact(st)
    if (/^createtrigger/.test(c)) declencheurs.push({ fichier: m.f, texte: c })
    instructionsTous.push({ fichier: m.f, texte: c })
  }
}
const FONCTION_RESERVER = fonctions.get('acq_envoi_reserver') ?? null
const FICHIER_RESERVATION = FONCTION_RESERVER ? FONCTION_RESERVER.fichier : null
const ABSENTE = 'migration de réservation absente (supabase/migrations/0121_*.sql ou suivante, qui définit public.acq_envoi_reserver)'
const dans = (texte, jetons) => jetons.filter((j) => !(j instanceof RegExp ? j.test(texte) : texte.includes(j)))
const manque = (texte, jetons, quoi) => dans(texte, jetons).map((j) => `${quoi} : « ${j instanceof RegExp ? j.source : j} » absent`)
/** Les échecs de la lecture statique de la migration pour un critère ; `f(reserver, ctx)` rend la liste d'échecs. */
function statique(f) {
  if (!FONCTION_RESERVER) return [ABSENTE]
  return f(FONCTION_RESERVER)
}

// ── Le Facteur jugé ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const FACTEUR = path.join(RAC, 'lib', 'agents', 'acquisition', 'facteur.ts')
let mod = null
const e1 = []
if (!fs.existsSync(FACTEUR)) e1.push('lib/agents/acquisition/facteur.ts absent : aucun Facteur à juger')
else {
  try { mod = await import(`${pathToFileURL(FACTEUR).href}?garde=${process.pid}`) } catch (err) { e1.push(`facteur.ts ne s'importe pas : ${premiereLigne(err)}`) }
  if (mod && typeof mod.executerFacteur !== 'function') { e1.push('facteur.ts n\'exporte pas executerFacteur'); mod = null }
}
const NON_JUGE = ['non jugé : facteur.ts absent ou illisible (GD-1)']
const MEME_ENVOI = (l) => ({ id: l.id, destinataire: l.destinataire })

// ═══ GD-1 : réserver AVANT tout appel Gmail ═══════════════════════════════════════════════════════════════════════════════════
if (mod) {
  {
    const m = monter(mod, { lignes: [ligne(1)] })
    const r = await m.run()
    const res = m.base.reservations().filter((x) => x.id === 'env-0001')
    const appel = m.gmail.appels[0]
    if (r.erreur) e1.push(`executerFacteur lève : ${r.erreur}`)
    if (!res.length) e1.push('aucun appel à reserverEnvoi avant l\'envoi : le message part sans réservation')
    else if (!appel) e1.push('le message n\'est jamais envoyé alors que la réservation a réussi')
    else {
      if (res[0].seq > appel.seq) e1.push('reserverEnvoi est appelé APRÈS gmail.envoyer : l\'envoi précède la réservation')
      if (!appel.etatBase || appel.etatBase.statut !== 'en_cours_envoi') e1.push(`au moment de l'appel Gmail le statut est « ${appel.etatBase?.statut} », en_cours_envoi attendu`)
      if (!appel.etatBase?.cle_envoi || appel.etatBase.cle_envoi !== res[0].cle) e1.push('au moment de l\'appel Gmail la clé d\'idempotence n\'est pas celle de la réservation')
    }
    const envoye = m.base.journal.find((x) => x.methode === 'marquerEnvoye')
    if (appel && envoye && envoye.seq < appel.seq) e1.push('marquerEnvoye est appelé avant l\'envoi')
    if (appel && m.base.etat('env-0001').statut !== 'envoye') e1.push(`après un envoi réussi le statut est « ${m.base.etat('env-0001').statut} », envoye attendu`)
  }
  {
    // La base refuse de réserver (ou tombe) : rien ne part, rien ne lève.
    const m = monter(mod, { lignes: [ligne(1)], pannes: { reserverEnvoi: true } })
    const r = await m.run()
    if (m.gmail.appels.length) e1.push('la réservation est en panne et le message part quand même (fail-open) : rien ne doit partir sans réservation')
    if (r.erreur) e1.push(`une réservation en panne fait lever executerFacteur (${r.erreur}) : aucune exception ne sort`)
  }
  {
    const m = monter(mod, { lignes: [ligne(1)], pause: true })
    await m.run()
    if (m.gmail.appels.length) e1.push('la base refuse la réservation (pause) et le message part quand même')
  }
}
s.juger('GD-1', e1, 'le Facteur réserve (en_cours_envoi + clé) AVANT tout appel Gmail ; réservation en panne ou refusée → rien ne part, rien ne lève')

// ═══ GD-2 : l'issue incertaine ne provoque jamais de renvoi ═══════════════════════════════════════════════════════════════════
{
  const e = []
  if (!mod) e.push(...NON_JUGE)
  else {
    const verifier = async (nom, mode, pannes, attendu) => {
      const m = monter(mod, { lignes: [ligne(1)], gmail: mode })
      for (const p of pannes) m.base.mettrePanne(p, true)
      const r1 = await m.run()
      for (const p of pannes) m.base.mettrePanne(p, false)
      const apres = await m.passes(4)
      const st = m.base.etat('env-0001').statut
      const livres = m.gmail.livres.length
      if (m.gmail.appels.length !== 1) e.push(`${nom} : ${m.gmail.appels.length} appel(s) Gmail en cinq passes, 1 attendu : le message est renvoyé automatiquement`)
      if (livres > 1) e.push(`${nom} : ${livres} messages livrés, 1 au plus`)
      if (!attendu.includes(st)) e.push(`${nom} : statut final « ${st} », ${attendu.join(' ou ')} attendu`)
      return { m, r1, apres, st }
    }
    // (a) le message part, l'écriture `envoye` échoue : c'est la panne que la revue a trouvée.
    const a = await verifier('écriture envoye en échec', 'ok', ['marquerEnvoye'], ['envoi_incertain'])
    const carte = a.m.base.evenements.find((x) => x.type === 'envoi_a_reconcilier')
    if (!carte) e.push('écriture envoye en échec : aucune carte « à réconcilier » (événement envoi_a_reconcilier)')
    else {
      if (carte.objet_id !== 'env-0001') e.push('la carte « à réconcilier » ne désigne pas l\'envoi (objet_id)')
      const txt = JSON.stringify(carte)
      if (txt.includes('invalid') || txt.includes('Bonjour') || txt.includes('@')) e.push('la carte « à réconcilier » porte une donnée personnelle (destinataire ou texte)')
      if (carte.agent !== 'facteur') e.push('la carte « à réconcilier » n\'est pas écrite par l\'agent facteur')
    }
    if (a.r1.erreur) e.push(`écriture envoye en échec : executerFacteur lève (${a.r1.erreur})`)
    // (b) la base entière tombe après l'envoi : rien de ce qui suit ne s'écrit (le plantage du processus).
    await verifier('base tombée après l\'envoi', 'ok', ['marquerEnvoye', 'marquerIncertain', 'evenement', 'marquerEchec'], ['en_cours_envoi'])
    // (c) le transport coupe APRÈS l'envoi (délai dépassé) : l'issue est inconnue.
    const c = await verifier('transport coupé après l\'envoi', 'injoignable_apres_envoi', [], ['envoi_incertain'])
    if (!c.m.base.evenements.some((x) => x.type === 'envoi_a_reconcilier')) e.push('transport coupé après l\'envoi : aucune carte « à réconcilier »')
    // (d) le transport lève
    await verifier('transport qui lève', 'leve', [], ['envoi_incertain'])
    // (e) un refus NET (authentification) : rien n'est parti, l'envoi est relâché, pas bloqué ; ce n'est pas un envoi incertain
    {
      const m = monter(mod, { lignes: [ligne(1)], gmail: 'auth' })
      await m.run()
      const st = m.base.etat('env-0001').statut
      if (m.gmail.livres.length) e.push('refus d\'authentification : un message est livré')
      if (st !== 'approuve') e.push(`refus net d'authentification : statut « ${st} », approuve attendu (relâché : rien n'est parti, il ne reste pas bloqué en_cours_envoi)`)
      if (m.base.evenements.some((x) => x.type === 'envoi_a_reconcilier')) e.push('refus net d\'authentification : une carte « à réconcilier » est levée à tort')
      if (!m.base.signaux.some((x) => x.type === 'gmail_refus')) e.push('refus d\'authentification : aucun signal gmail_refus')
    }
    // (f) le contrôle tranche : un envoi incertain se réconcilie sans jamais repartir
    {
      const m = monter(mod, { lignes: [ligne(1)], gmail: 'injoignable_apres_envoi' })
      await m.run(); await m.passes(2)
      m.base.reconcilier('env-0001', 'parti', { id_externe: '<trouve@mail-essai.invalid>' })
      await m.passes(2)
      if (m.base.etat('env-0001').statut !== 'envoye' || m.gmail.appels.length !== 1) e.push('réconciliation « parti » : l\'envoi doit devenir envoye sans aucun nouvel appel Gmail')
    }
  }
  // Statique : la base sait l'état incertain, le contrôle le tranche, magasinSupabase ne tait plus { ok: false }.
  e.push(...statique((r) => {
    const x = []
    const inc = fonctions.get('acq_envoi_incertain'), rec = fonctions.get('acq_envoi_reconcilier')
    if (!inc) x.push('fonction acq_envoi_incertain absente')
    else x.push(...manque(inc.corps, ["statut='envoi_incertain'", "statut='en_cours_envoi'"], 'acq_envoi_incertain'))
    if (!rec) x.push('fonction acq_envoi_reconcilier absente (le contrôle qui tranche un envoi incertain)')
    else {
      x.push(...manque(rec.corps, ["'parti'", "'pas_parti'", "statut='envoi_incertain'"], 'acq_envoi_reconcilier'))
      if (/setstatut='approuve'/.test(rec.corps)) x.push('acq_envoi_reconcilier remet un envoi incertain à approuve : c\'est un renvoi automatique')
    }
    const check = instructionsTous.filter((i) => /envois_statut_check/.test(i.texte)).at(-1)
    if (!check || !check.texte.includes("'en_cours_envoi'") || !check.texte.includes("'envoi_incertain'")) x.push('envois_statut_check n\'admet pas en_cours_envoi et envoi_incertain')
    return x
  }))
  {
    const f = path.join(RAC, 'lib', 'agents', 'acquisition', 'magasinSupabase.ts')
    if (!fs.existsSync(f)) e.push('lib/agents/acquisition/magasinSupabase.ts absent')
    else {
      const src = sansCommentaires(fs.readFileSync(f, 'utf8'))
      const i = src.indexOf('async marquerEnvoye(')
      const corps = i < 0 ? '' : src.slice(i, src.indexOf('async ', i + 10))
      if (!corps) e.push('magasinSupabase.marquerEnvoye introuvable')
      else if (!/\bok\b/.test(corps)) e.push('magasinSupabase.marquerEnvoye ignore le { ok: false } de acq_envoi_envoye : un refus de la base (statut, pause) laisse l\'envoi approuve, donc renvoyé 15 minutes plus tard')
      else if (!/throw/.test(corps)) e.push('magasinSupabase.marquerEnvoye lit { ok } mais ne lève pas sur ok:false')
    }
  }
s.juger('GD-2', e, 'écriture envoye en échec, base tombée, transport coupé ou levé : 1 seul appel Gmail en 5 passes, état incertain, carte sans donnée personnelle ; refus net relâché ; contrôle de réconciliation ; marquerEnvoye ne tait plus ok:false')
}

// ═══ GD-3 : deux exécutions concurrentes n'envoient qu'une fois ═══════════════════════════════════════════════════════════════
{
  const e = []
  if (!mod) e.push(...NON_JUGE)
  else {
    {
      const m = monter(mod, { lignes: [ligne(1)], delaiGmailMs: 3 })
      await Promise.all([m.run(), m.run()])
      if (m.gmail.livres.length !== 1) e.push(`deux passes simultanées : ${m.gmail.livres.length} message(s) livré(s), 1 attendu`)
      if (m.gmail.appels.length !== 1) e.push(`deux passes simultanées : ${m.gmail.appels.length} appel(s) Gmail, 1 attendu : la seconde tentative ne doit même pas appeler le transport`)
      if (m.base.etat('env-0001').statut !== 'envoye') e.push(`deux passes simultanées : statut final « ${m.base.etat('env-0001').statut} », envoye attendu`)
      if (m.base.etat('env-0001').tentatives !== 0) e.push('la perdante de la course est comptée comme un échec d\'envoi (tentatives_envoi)')
    }
    {
      const m = monter(mod, { lignes: [1, 2, 3, 4, 5].map((n) => ligne(n)), delaiGmailMs: 2 })
      await Promise.all([m.run(), m.run(), m.run()])
      const parDest = new Map()
      for (const l of m.gmail.livres) parDest.set(l.a, (parDest.get(l.a) ?? 0) + 1)
      const doubles = [...parDest].filter(([, n]) => n > 1).length
      if (doubles) e.push(`trois passes simultanées : ${doubles} destinataire(s) reçoivent le message plusieurs fois`)
      if (parDest.size !== 5) e.push(`trois passes simultanées : ${parDest.size} destinataire(s) servis sur 5 (aucun envoi ne doit se perdre)`)
    }
  }
  e.push(...statique((r) => {
    const x = []
    if (!/updateops\.envoisset[^;]*statut='en_cours_envoi'[^;]*where[^;]*statut='approuve'/.test(r.corps)) x.push("acq_envoi_reserver : la réservation n'est pas un UPDATE conditionnel (set statut='en_cours_envoi' … where … statut='approuve') : une lecture puis une écriture laisserait passer deux tentatives")
    if (!/notfound|row_count/.test(r.corps)) x.push('acq_envoi_reserver ne regarde pas si la ligne a été prise (FOUND) : la perdante croirait avoir gagné')
    return x
  }))
  s.juger('GD-3', e, 'deux et trois passes simultanées : un seul appel, un seul message par destinataire, aucun envoi perdu ; UPDATE conditionnel sur statut=approuve')
}

// ═══ GD-4 : clé stable (même destinataire+modèle+fait ⇒ même clé) et unique en base ═══════════════════════════════════════════
{
  const e = []
  if (!mod) e.push(...NON_JUGE)
  else {
    const cleDe = async (l, surcharges = {}) => {
      const m = monter(mod, { lignes: [l], ...surcharges })
      if (surcharges.apres) surcharges.apres(m)
      await m.run()
      return m.base.reservations().find((x) => x.id === l.id)?.cle ?? null
    }
    const base1 = ligne(1)
    const k1 = await cleDe(base1)
    if (typeof k1 !== 'string' || !k1) e.push('aucune clé d\'idempotence transmise à reserverEnvoi')
    else {
      if (k1.length < 16 || k1.length > 200) e.push(`clé de ${k1.length} signes (16 à 200 attendus)`)
      if (k1.includes('@') || k1.includes('invalid')) e.push('la clé contient le destinataire en clair (elle est stockée en base : une empreinte, pas l\'adresse)')
      if (k1 !== cleAttendue(base1)) e.push('la clé n\'est pas sha256(destinataire normalisé | modèle | fait) : la base calcule la même clé pour le porteur du formulaire (ops.cle_envoi), les deux formules doivent coïncider')
      // stable : un autre id, un autre texte, un autre jour, une autre casse
      const autre = ligne(9, { destinataire: `  ${base1.destinataire.toUpperCase()} `, modele_id: base1.modele_id, fait_id: base1.fait_id, texte: 'Un tout autre texte régénéré.', objet: 'Autre objet', reference: 'ZZ99ZZ', prepare_le: new Date(T0 - 99 * 3600_000).toISOString() })
      const k2 = await cleDe(autre, { horloge: (await import('./fixtures/026-acquisition/horloge-factice.mjs')).creerHorloge(T0 + 3 * JOUR) })
      if (k2 !== k1) e.push('la clé change avec l\'id, le texte, la référence, la casse de l\'adresse ou la date : elle doit dépendre du seul (destinataire, modèle, fait)')
      const k3 = await cleDe(ligne(1, { fait_id: 'fait000000000999' }))
      if (k3 === k1) e.push('un autre fait donne la même clé : deux messages légitimes seraient confondus')
      const k4 = await cleDe(ligne(1, { modele_id: 'reponse_v2' }))
      if (k4 === k1) e.push('un autre modèle donne la même clé')
      const k5 = await cleDe(ligne(2, { fait_id: base1.fait_id, modele_id: base1.modele_id }))
      if (k5 === k1) e.push('un autre destinataire donne la même clé')
      const kn1 = await cleDe(ligne(1, { fait_id: null })), kn2 = await cleDe(ligne(7, { destinataire: base1.destinataire, fait_id: null }))
      if (!kn1 || kn1 !== kn2 || kn1 === k1) e.push('sans fait_id la clé n\'est pas stable (ou se confond avec celle d\'un fait)')
    }
    {
      // Deux lignes distinctes, même (destinataire, modèle, fait) : la base n'en laisse partir qu'une.
      const a = ligne(1), b = ligne(2, { destinataire: a.destinataire, modele_id: a.modele_id, fait_id: a.fait_id, texte: 'Texte régénéré, même destinataire et même fait.' })
      const m = monter(mod, { lignes: [a, b] })
      await m.run(); await m.passes(2)
      if (m.gmail.livres.length !== 1) e.push(`deux envois du même (destinataire, modèle, fait) : ${m.gmail.livres.length} message(s) livré(s), 1 attendu`)
    }
    {
      // Deux faits différents au même destinataire restent deux messages.
      const a = ligne(1), b = ligne(2, { destinataire: a.destinataire, modele_id: a.modele_id, fait_id: 'fait000000000777' })
      const m = monter(mod, { lignes: [a, b] })
      await m.run()
      if (m.gmail.livres.length !== 2) e.push('deux faits différents au même destinataire : la clé les confond ou le second est perdu')
    }
  }
  e.push(...statique((r) => {
    const x = []
    const tous = instructionsTous.map((i) => i.texte).join(';')
    if (!/cle_envoi/.test(tous)) x.push('aucune colonne cle_envoi')
    if (!(/createuniqueindex(?:ifnotexists)?\w+onops\.envois\(cle_envoi\)/.test(tous) || /unique\(cle_envoi\)/.test(tous) || /cle_envoi\w*(?:\([^)]*\))?unique/.test(tous))) x.push('la clé d\'idempotence n\'est pas unique en base (create unique index … on ops.envois (cle_envoi))')
    if (!/unique_violation/.test(r.corps)) x.push('acq_envoi_reserver ne traduit pas unique_violation en { ok: false, raison: deja_reserve }')
    const cle = fonctions.get('cle_envoi')
    if (!cle) x.push('fonction ops.cle_envoi absente : le porteur du formulaire et le Facteur doivent calculer la même clé')
    else if (!/sha256/.test(cle.corps) || !/lower\(btrim\(/.test(cle.corps) || !/sans_fait/.test(cle.corps)) x.push('ops.cle_envoi n\'est pas sha256(lower(btrim(destinataire)) | modèle | coalesce(fait, sans_fait))')
    return x
  }))
  s.juger('GD-4', e, 'même (destinataire, modèle, fait) ⇒ même clé (indépendante de l\'id, du texte, de la casse, de la date), formule sha256 commune TS/SQL, index unique, deja_reserve')
}

// ═══ GD-5 : les trois envoyeurs passent par la même réservation ═══════════════════════════════════════════════════════════════
{
  const e = []
  if (!mod) e.push(...NON_JUGE)
  else {
    // repondeur : les réponses Meta, en messagerie et en réponse privée, par le Facteur.
    for (const canal of ['messagerie', 'reponse_privee']) {
      const l = ligneMeta(1, { canal })
      const m = monter(mod, { lignes: [l] })
      await Promise.all([m.run(), m.run()])
      const appels = m.meta.appels
      const res = m.base.reservations().find((x) => x.id === l.id)
      if (!res) e.push(`envoyeur repondeur (${canal}) : aucun appel à reserverEnvoi`)
      else if (!appels.length) e.push(`envoyeur repondeur (${canal}) : le message n'est jamais envoyé`)
      else {
        if (res.seq > appels[0].seq) e.push(`envoyeur repondeur (${canal}) : la réservation suit l'envoi`)
        if (appels[0].etatBase?.statut !== 'en_cours_envoi') e.push(`envoyeur repondeur (${canal}) : statut « ${appels[0].etatBase?.statut} » à l'appel Meta, en_cours_envoi attendu`)
      }
      if (m.meta.livres.length !== 1) e.push(`envoyeur repondeur (${canal}) : ${m.meta.livres.length} message(s) livré(s) par deux passes simultanées, 1 attendu`)
          }
    {
      const m = monter(mod, { lignes: [ligneMeta(1)], meta: 'autre' })
      await m.run(); await m.passes(3)
      if (m.meta.appels.length !== 1) e.push(`envoyeur repondeur : issue incertaine (raison autre) : ${m.meta.appels.length} appel(s) Meta en quatre passes, 1 attendu`)
    }
    // facteur_usine : le Facteur ne touche jamais un formulaire (le porteur de l'usine le réserve en base)
    {
      const m = monter(mod, { lignes: [ligneFormulaire(1), ligneFormulaire(2)] })
      const r = await m.run()
      if (r.erreur) e.push(`formulaires approuvés : executerFacteur lève (${r.erreur}) — le Facteur ne lit jamais les formulaires`)
      if (m.gmail.appels.length || m.meta.appels.length) e.push('le Facteur envoie un formulaire par Gmail ou Meta')
      if (m.base.reservations().some((x) => ['env-0001', 'env-0002'].includes(x.id))) e.push('le Facteur réserve un formulaire : c\'est le porteur de l\'usine qui le fait, en base')
      if (Object.values(m.base.statuts()).some((st) => st !== 'approuve')) e.push('le Facteur change le statut d\'un formulaire approuvé')
    }
  }
  // La base : le porteur du formulaire réserve dans la même instruction qui le sert ; envoye n'est consigné que depuis en_cours_envoi.
  e.push(...statique(() => {
    const x = []
    const fp = fonctions.get('acq_formulaires_a_porter')
    if (!fp) x.push('acq_formulaires_a_porter absente')
    else {
      x.push(...manque(fp.corps, ["'en_cours_envoi'", 'cle_envoi', 'cle_envoi('], 'acq_formulaires_a_porter (porteur de l\'usine, envoyeur facteur_usine)'))
      if (/bail_porteur_jusqua=now\(\)\+/.test(fp.corps) && !/statut='en_cours_envoi'/.test(fp.corps)) x.push('acq_formulaires_a_porter ne tient le formulaire que par un bail qui EXPIRE : un formulaire soumis dont le retour se perd est reservi au porteur suivant')
      if (!/updateops\.envois/.test(fp.corps) || !/statut='approuve'/.test(fp.corps)) x.push('acq_formulaires_a_porter ne réserve pas (UPDATE … where statut=approuve)')
    }
    const ev = fonctions.get('acq_envoi_envoye')
    if (!ev) x.push('acq_envoi_envoye absente')
    else {
      if (!/statut='en_cours_envoi'/.test(ev.corps)) x.push("acq_envoi_envoye n'exige pas statut='en_cours_envoi' : un envoi non réservé (gmail, repondeur, facteur_usine) peut encore être consigné")
      if (/statut='approuve'/.test(ev.corps)) x.push("acq_envoi_envoye accepte encore un envoi au statut 'approuve'")
    }
    return x
  }))
  // Le magasin réel expose la réservation ; aucun module ne consigne un envoi sans réserver.
  {
    const ct = path.join(RAC, 'lib', 'agents', 'acquisition', 'contrat.ts'), ms = path.join(RAC, 'lib', 'agents', 'acquisition', 'magasinSupabase.ts')
    const src = (f) => (fs.existsSync(f) ? sansCommentaires(fs.readFileSync(f, 'utf8')) : '')
    const c = src(ct), m = src(ms)
    const iface = c.slice(c.indexOf('export interface MagasinEnvoi'), c.indexOf('export type Magasin ='))
    for (const n of ['reserverEnvoi', 'marquerIncertain']) if (!new RegExp(`\\b${n}\\s*\\(`).test(iface)) e.push(`contrat.ts : MagasinEnvoi ne déclare pas ${n}`)
    if (!/acq_envoi_reserver/.test(m)) e.push('magasinSupabase.ts n\'appelle pas acq_envoi_reserver')
    if (!/acq_envoi_incertain/.test(m)) e.push('magasinSupabase.ts n\'appelle pas acq_envoi_incertain')
    const contournements = []
    const ROUTES = ['lib/agents', 'app/api/cron', 'app/api/usine', 'app/api/agents', 'scripts/agents', 'scripts/usine']
    for (const d of ROUTES) {
      const dir = path.join(RAC, d)
      if (!fs.existsSync(dir)) continue
      for (const f of listerFichiers(dir)) {
        if (!/\.(?:ts|tsx|mjs)$/.test(f) || /(?:^|\/)contrat\.ts$|magasinSupabase\.ts$/.test(f)) continue
        const t = sansCommentaires(fs.readFileSync(path.join(dir, f), 'utf8'))
        if (/\.envoyer\s*\(|\.reponsePrivee\s*\(|\.message\s*\(\s*\{|sendMail\s*\(|graph\.facebook\.com/.test(t) && /\bmarquerEnvoye\s*\(|acq_envoi_envoye/.test(t) && !/reserverEnvoi\s*\(|acq_envoi_reserver|acq_formulaires_a_porter|formulairesAPorter/.test(t)) contournements.push(`${d}/${f}`) // un module qui ENVOIE et consigne sans réserver (le rendu du porteur ne fait que consigner : la base a réservé à acq_formulaires_a_porter)
      }
    }
    if (contournements.length) e.push(`consigne un envoi sans le réserver : ${contournements.slice(0, 4).join(', ')}`)
  }
  s.juger('GD-5', e, 'repondeur (messagerie, réponse privée) réserve avant Meta ; le Facteur ne touche jamais un formulaire, le porteur de l\'usine réserve en base ; acq_envoi_envoye exige en_cours_envoi ; magasin réel et contrat exposent la réservation ; aucun contournement')
}

// ═══ GD-6 : la base refuse `envoye` sans réservation ═════════════════════════════════════════════════════════════════════════
{
  const e = statique(() => {
    const x = []
    const gardes = [...fonctions].filter(([, f]) => f.corps.includes('ops:envoye_sans_reservation'))
    if (!gardes.length) return ["aucune fonction de déclencheur ne lève ops:envoye_sans_reservation : la base ne refuse pas envoye hors réservation (elle se contente de signaler envoi_hors_regle)"]
    const [nom, g] = gardes[0]
    const sans = g.corps
    const i = sans.indexOf("raiseexceptionusingmessage='ops:envoye_sans_reservation'")
    if (i < 0) x.push(`${nom} : le refus n'est pas « raise exception using message = 'ops:envoye_sans_reservation' »`)
    const avant = sans.slice(0, Math.max(i, 0))
    if (!sans.includes("new.statut='envoye'")) x.push(`${nom} : la garde ne regarde pas new.statut = 'envoye'`)
    for (const j of ["'en_cours_envoi'", 'old.statut', 'new.cle_envoi']) if (!avant.includes(j)) x.push(`${nom} : la condition du refus ne lit pas ${j}`)
    // l'exemption du canal d'essai est BORNÉE : le canal ET un destinataire .invalid, dans la même condition
    const fenetre = avant.slice(-420)
    if (!fenetre.includes("'essai_e2e'")) x.push(`${nom} : pas d'exemption essai_e2e (le canal d'essai doit pouvoir consigner sans réservation)`)
    else if (!/\.invalid/.test(fenetre)) x.push(`${nom} : l'exemption essai_e2e n'est pas bornée à des destinataires d'essai (.invalid) : un envoi réel étiqueté essai_e2e échapperait à la garde`)
    if (/new\.canal<>'essai_e2e'/.test(sans) || /new\.canal!='essai_e2e'/.test(sans)) x.push(`${nom} : exemption inconditionnelle du canal essai_e2e`)
    const decl = declencheurs.find((d) => d.texte.includes(`execute${'function'}ops.${nom}()`) || d.texte.includes(`executeprocedureops.${nom}()`) || d.texte.includes(`${nom}()`))
    if (!decl) x.push(`${nom} : aucun trigger ne l'attache à ops.envois`)
    else {
      for (const j of ['before', 'onops.envois', 'foreachrow']) if (!decl.texte.includes(j)) x.push(`trigger de ${nom} : ${j} absent`)
      if (!/insertorupdateofstatut|insertorupdate(?!of)/.test(decl.texte)) x.push(`trigger de ${nom} : doit couvrir l'INSERT et l'UPDATE de statut`)
    }
    const check = instructionsTous.filter((i2) => /envois_statut_check/.test(i2.texte)).at(-1)
    if (!check || !check.texte.includes("'en_cours_envoi'")) x.push('envois_statut_check ne connaît pas en_cours_envoi')
    const f = MIGRATIONS.find((m) => m.f === FICHIER_RESERVATION)
    if (f) { const p = seParse(f.sql); if (!p.ok) x.push(`${FICHIER_RESERVATION} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`) }
    return x
  })
  s.juger('GD-6', e, 'trigger before insert or update of statut qui lève ops:envoye_sans_reservation hors en_cours_envoi/envoi_incertain avec clé ; exemption essai_e2e bornée aux destinataires .invalid ; statuts admis par la contrainte')
}

// ═══ GD-7 : la pause générale est lue à la réservation ═══════════════════════════════════════════════════════════════════════
{
  const e = []
  if (!mod) e.push(...NON_JUGE)
  else {
    {
      // La pause tombe entre la lecture des envois approuvés et la réservation.
      const m = monter(mod, { lignes: [ligne(1), ligne(2)], pauseApresLecture: true })
      const r = await m.run()
      if (m.gmail.appels.length) e.push(`pause activée entre la lecture et la réservation : ${m.gmail.appels.length} message(s) partent quand même`)
      if (r.erreur) e.push(`la pause fait lever executerFacteur (${r.erreur})`)
      if (Object.values(m.base.statuts()).some((st) => st !== 'approuve')) e.push('la pause change le statut d\'un envoi approuvé (il doit rester approuve et partir à la levée)')
      if (m.base.etat('env-0001').tentatives) e.push('un refus de pause est compté comme un échec d\'envoi')
      // levée : les envois reprennent
      m.base.pauseApresLecture(false); m.base.mettrePause(false)
      await m.passes(1)
      if (m.gmail.livres.length !== 2) e.push(`après la levée de la pause : ${m.gmail.livres.length} message(s) partis sur 2 (un envoi ne doit pas être perdu)`)
    }
    {
      const m = monter(mod, { lignes: [ligne(1)], pause: true })
      await m.run()
      if (m.gmail.appels.length) e.push('pause générale active dès le début : un message part')
    }
  }
  e.push(...statique((r) => {
    const x = []
    if (!r.corps.includes("ops_interrupteur('pause_generale')")) x.push("acq_envoi_reserver ne lit pas ops_interrupteur('pause_generale') : la pause ne serait lue qu'avant, jamais au moment de réserver")
    if (!/'pause'/.test(r.corps)) x.push("acq_envoi_reserver ne rend pas { ok: false, raison: 'pause' }")
    const i = r.corps.indexOf("ops_interrupteur('pause_generale')"), j = r.corps.search(/updateops\.envois/)
    if (i >= 0 && j >= 0 && i > j) x.push('la pause est lue APRÈS l\'UPDATE de réservation')
    return x
  }))
  s.juger('GD-7', e, 'pause activée entre la lecture et la réservation : rien ne part, rien ne se perd, l\'envoi reste approuve et repart à la levée ; acq_envoi_reserver lit pause_generale avant d\'écrire')
}

// ═══ GD-8 : le plafond du jour est respecté au moment de la réservation ═══════════════════════════════════════════════════════
{
  const e = []
  if (!mod) e.push(...NON_JUGE)
  else {
    {
      const hier = ligne(90, { destinataire: 'hier@essai-hier.invalid', fait_id: 'faithier000000001' })
      const auj = ligne(91, { destinataire: 'auj@essai-auj.invalid', fait_id: 'faitauj000000001' })
      const m = monter(mod, { lignes: [1, 2, 3, 4].map((n) => ligne(n)), quotas: { email_sollicite: 2 } })
      m.base.poserParti(hier, T0 - JOUR)
      m.base.poserParti(auj, T0)
      await m.run()
      if (m.gmail.livres.length !== 1) e.push(`plafond 2 avec 1 envoi déjà parti aujourd'hui (et 1 hier, qui ne compte pas) : ${m.gmail.livres.length} message(s) partis, 1 attendu`)
      const reste = Object.entries(m.base.statuts()).filter(([id, st]) => /^env-000[1-4]$/.test(id) && st === 'approuve').length
      if (reste !== 3) e.push(`plafond atteint : ${reste} envoi(s) restent approuve, 3 attendus (ni perdus, ni annulés)`)
      if ([1, 2, 3, 4].some((n) => m.base.etat(`env-000${n}`).tentatives)) e.push('un refus de plafond est compté comme un échec d\'envoi (trois échecs annuleraient l\'envoi)')
      const essais = m.base.reservations().filter((x) => x.id === 'env-0002').length
      if (essais > 1) e.push(`l'envoi env-0002 est réservé ${essais} fois dans une passe : le refus de plafond ne doit pas être réessayé en boucle`)
      await m.run()
      if (m.gmail.livres.length !== 1) e.push('une seconde passe le même jour envoie au-delà du plafond')
      // le lendemain (jour de Paris), la place revient
      m.horloge.avancer(JOUR)
      await m.run()
      if (m.gmail.livres.length !== 3) e.push(`le lendemain : ${m.gmail.livres.length} message(s) partis au total, 3 attendus (2 de plus, le plafond du jour étant de 2)`)
    }
    {
      // aucune ligne de plafond : rien n'est compté, tout part (la base décide ; le Facteur n'invente pas de plafond)
      const m = monter(mod, { lignes: [ligne(1), ligne(2)] })
      await m.run()
      if (m.gmail.livres.length !== 2) e.push('sans plafond déclaré, le Facteur doit laisser partir les envois approuvés')
    }
  }
  e.push(...statique((r) => {
    const x = []
    x.push(...manque(r.corps, ['plafond_jour', 'ops.quotas_canaux', 'europe/paris', "'en_cours_envoi'", "'envoye'", "'envoi_incertain'", 'reserve_le'], 'acq_envoi_reserver'))
    const i = r.corps.indexOf('pg_advisory_xact_lock'), j = r.corps.indexOf('count(')
    if (i < 0) x.push('acq_envoi_reserver ne prend pas pg_advisory_xact_lock avant de compter : deux réservations simultanées verraient le même compte')
    else if (j >= 0 && i > j) x.push('pg_advisory_xact_lock est pris APRÈS le comptage')
    if (!/\.id<>p_envoi|id<>p_envoi/.test(r.corps)) x.push('le comptage ne retire pas l\'envoi lui-même (id <> p_envoi)')
    if (!/plafond/.test(r.corps) || !/'plafond'/.test(r.corps)) x.push("acq_envoi_reserver ne rend pas { ok: false, raison: 'plafond' }")
    return x
  }))
  s.juger('GD-8', e, 'plafond 2 (1 parti aujourd\'hui, 1 hier) : 1 seul message, les autres restent approuve sans échec compté ni boucle, la place revient le lendemain ; acq_envoi_reserver compte en_cours_envoi/envoye/envoi_incertain du jour de Paris sous verrou, sans l\'envoi lui-même')
}

if (piege.tentatives.length) s.echoue('GD-1', `le Facteur ou une doublure a tenté le réseau : ${piege.tentatives.slice(0, 3).join(' ; ')}`)
piege.retirer()
process.exit(s.finir())
