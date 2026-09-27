// scripts/pilotage-push-qa.mjs — juge hors ligne du Web Push des fondateurs (fiche 026-012, lot a ; critères PF de 026-051),
// écrit par Claude Code AVANT le module qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/pilotage-push-qa.mjs [--racine=<dossier>] [--temoin]
//
//   --racine=<d>  importe <d>/lib/pilotage/notifications.ts, <d>/lib/push.ts et <d>/lib/alertes.ts par URL de fichier et lit
//                 les sources sous <d> (défaut : le dépôt). « HEAD » (PF-6, PF-7) est le HEAD du dépôt git qui contient <d>,
//                 ou le commit JUGE_BASE_GIT s'il est posé : la preuve de 026-012 y met sa référence quand elle juge son témoin
//                 (l'implémentation de référence posée sur la référence, pas sur HEAD : 026-024 a changé lib/alertes.ts le 27/09
//                 et le témoin, figé, perdait PF-7 sans que rien de jugé ait bougé).
//   --temoin      seulement l'auto-contrôle d'alertes-push.json, la preuve du harnais (doublures sur le code actuel) et les
//                 critères de non-régression (définition de 025-01 : la preuve qu'un juge échoue sur une vraie faute vient des
//                 fiches de mutations, 026-130)
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=…), avec un crochet de résolution qui sert des
// doublures (scripts/fixtures/026-pilotage/a/doublures-push.mjs) à la place de lib/email, lib/limites, lib/supabaseAdmin,
// lib/pushNatif et du paquet web-push : aucun réseau (fetch piégé dans l'enfant), aucun vrai service de push, aucun e-mail,
// aucune base. L'enfant rend ses constats sur une ligne « @@pilotage-push-qa@@ {json} ».
//
// Sortie : une ligne par critère (« ✅ PF-3 … » ou « ❌ PF-3 … »), puis « pilotage-push-qa : PASS|FAIL — … ». Code 0 seulement
// si tout est vert ; 1 sinon ; 2 si l'appel est invalide. Un module absent fait échouer PF-1 avec son identifiant ; les
// critères suivants sont alors « non jugés » (en échec). Écriture seulement sous .orchestre/travail/pilotage-push-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, TRAVAIL, jeu, lireOptions, creerSortie, importsDe, sansCommentaires, typecheck, court, lancerAsync, lireOuNull, git,
  premiereLigne,
} from './fixtures/026-pilotage/a/commun.mjs'
import { TEMOINS } from './fixtures/026-pilotage/a/jeux.mjs'

const JUGE = 'pilotage-push-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const DOUBLURES = path.join(R, 'scripts', 'fixtures', '026-pilotage', 'a', 'doublures-push.mjs')
const MARQUE = `@@${JUGE}@@ `
const o = lireOptions(process.argv.slice(2), { connues: ['enfant', 'urgents'] })

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
// Le crochet : `@/x` → <racine>/x ; relatif sans extension → .ts, .tsx, /index.ts ; les quatre modules doublés et web-push →
// les doublures ; un paquet demandé depuis un fichier hors du dépôt se résout depuis le node_modules du dépôt.
const CROCHET = String.raw`
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
let RACINE = '', DOUBLURES = '', DEPOT = ''
export async function initialize(d) { RACINE = d.racine; DOUBLURES = d.doublures; DEPOT = d.depot }
const DOUBLES = { 'lib/email': 'email', 'lib/limites': 'limites', 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/pushNatif': 'pushNatif' }
const PAQUETS = { 'web-push': 'web-push' }
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
const double = (m) => ({ url: DOUBLURES + '?m=' + m, shortCircuit: true, format: 'module' })
export async function resolve(spec, ctx, next) {
  if (PAQUETS[spec]) return double(PAQUETS[spec])
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), RACINE).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const base = s.startsWith('file:') ? s.split('?')[0] : new URL(s, ctx.parentURL).href
    if (base.toLowerCase().startsWith(RACINE.toLowerCase())) {
      const rel = decodeURIComponent(base.slice(RACINE.length)).replace(/\.(ts|tsx|js|mjs)$/, '').replace(/\/index$/, '')
      if (DOUBLES[rel]) return double(DOUBLES[rel])
    }
    if (!s.startsWith('file:') || !s.includes('?')) for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts']) if (estFichier(c)) return next(c, ctx)
  }
  if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && ctx.parentURL && !ctx.parentURL.toLowerCase().startsWith(DEPOT.toLowerCase())) {
    return next(s, { ...ctx, parentURL: DEPOT + 'package.json' })
  }
  return next(s, ctx)
}`

const F1 = '90000000-0000-4000-8000-00000000f001', F2 = '90000000-0000-4000-8000-00000000f002'
const DEMO = '90000000-0000-4000-8000-00000000d003', ARTISAN = '90000000-0000-4000-8000-00000000a004'
const abo = (id, n) => ({ id: `abo-temoin-${n}`, artisan_id: id, type: 'web', endpoint: `https://fcm.googleapis.com/fcm/send/temoin-${n}`, jeton: null, p256dh: 'BTemoinP256dh', auth: 'temoin-auth', echecs: 0, actif: true })
const TABLES = {
  artisans: [
    { id: F1, nom: 'Fondateur Témoin Un', email: 'fondateur.un@exemple.invalid', is_founder: true, est_demo: false },
    { id: F2, nom: 'Fondateur Témoin Deux', email: 'fondateur.deux@exemple.invalid', is_founder: true, est_demo: false },
    { id: DEMO, nom: 'Démo Témoin', email: 'demo.temoin@exemple.invalid', is_founder: true, est_demo: true },
    { id: ARTISAN, nom: 'Artisan Témoin', email: 'artisan.temoin@exemple.invalid', is_founder: false, est_demo: false },
  ],
  push_abonnements: [abo(F1, 1), abo(F2, 2), abo(DEMO, 3), abo(ARTISAN, 4)],
}
const BOUT = { [F1]: abo(F1, 1).endpoint, [F2]: abo(F2, 2).endpoint, [DEMO]: abo(DEMO, 3).endpoint, [ARTISAN]: abo(ARTISAN, 4).endpoint }
const BLOC_DU_MOTIF = { paiement: 'argent', appel: 'appeler', panne_agent: 'agents', argent_bloque: 'argent', coupe_circuit: 'decider', digest: null }

async function enfant(mode, RAC) {
  const res = { mode, erreurs: [], imports: {}, criteres: {}, charges: [], reseau: [], rejets: [] }
  const reseau = res.reseau
  globalThis.fetch = async (u) => { reseau.push(String(u?.url ?? u)); throw new Error(`réseau interdit dans ${JUGE}`) }
  process.on('unhandledRejection', (e) => { res.rejets.push(premiereLigne(e)) })
  const note = (id, echecs, detail) => { res.criteres[id] = { echecs, detail } }
  try {
    const sep = (d) => pathToFileURL(path.resolve(d) + path.sep).href
    register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: sep(RAC), doublures: pathToFileURL(DOUBLURES).href, depot: sep(R) } })
    const D = await import(`${pathToFileURL(DOUBLURES).href}?m=juge`)
    const E = D.etat
    const importer = async (rel) => {
      try { const m = await import(pathToFileURL(path.join(RAC, rel)).href); res.imports[rel] = 'ok'; return m } catch (e) { res.imports[rel] = premiereLigne(e); return null }
    }
    const pause = (ms) => new Promise((ok) => setTimeout(ok, ms))
    /** Attend que `n` push soient partis (au plus `ms`), puis laisse filer les promesses en retard. */
    const attendre = async (n, ms = 1500) => { const t0 = Date.now(); while (E.push.length < n && Date.now() - t0 < ms) await pause(10); await pause(80) }
    const vers = () => E.push.map((p) => Object.entries(BOUT).find(([, b]) => b === p.endpoint)?.[0] ?? p.endpoint)
    const nomDe = (id) => ({ [F1]: 'F1', [F2]: 'F2', [DEMO]: 'démo', [ARTISAN]: 'artisan' }[id] ?? id)
    const P = jeu('alertes-push.json')
    const alerte = (cle) => P.alertes.find((a) => a.cle === cle)
    const pieges = Object.values(P.pieges)
    const fuites = (texte) => [...pieges.filter((x) => texte.includes(x)), ...(/\d{6}/.test(texte) ? ['6 chiffres de suite'] : [])]

    if (mode === 'temoin') {
      const push = await importer('lib/push.ts'), alertes = await importer('lib/alertes.ts')
      const e = []
      if (!push || !alertes) e.push(`imports : ${JSON.stringify(res.imports)}`)
      else {
        for (const m of ['email', 'limites', 'supabaseAdmin', 'web-push']) if (!E.charges.has(m)) e.push(`doublure ${m} non chargée : le crochet de résolution ne l'a pas servie`)
        D.reinitialiser(TABLES)
        const charge = { titre: 'Témoin', ligne: 'Ligne témoin', url: '/controle?onglet=pilotage', tag: 'pilotage-digest' }
        const r = await push.envoyerPushArtisan(F1, charge)
        if (r?.envoyes !== 1 || E.push.length !== 1 || E.push[0].endpoint !== BOUT[F1]) e.push(`envoyerPushArtisan(F1) : ${JSON.stringify(r)}, ${E.push.length} push consigné(s)`)
        else if (Buffer.byteLength(E.push[0].corps) !== push.TAILLE_CHARGE || E.push[0].corps !== push.chargeUtile(charge)) e.push(`charge consignée de ${Buffer.byteLength(E.push[0].corps)} octets, ${push.TAILLE_CHARGE} attendus et égale à chargeUtile`)
        if (!E.appelsLimites.includes(`push:artisan:${F1}`)) e.push('le plafond par heure n’est pas passé par la doublure de lib/limites')
        if (!E.charges.has('pushNatif')) e.push('doublure pushNatif non chargée')
        D.reinitialiser(TABLES)
        const solde = alerte('temoin-solde')
        const n1 = await alertes.envoyerAlertes([solde]), n2 = await alertes.envoyerAlertes([solde])
        if (n1 !== 1 || n2 !== 0) e.push(`envoyerAlertes deux fois de suite : ${n1} puis ${n2}, 1 puis 0 attendus (verrou quotidien de la doublure)`)
        if (E.emails.length !== 1 || E.emails[0].genre !== 'entreprise') e.push(`${E.emails.length} e-mail(s) consigné(s), 1 à l'entreprise attendu`)
        if (!E.ecritures.some((w) => w.table === 'alertes' && w.genre === 'insert')) e.push('la persistance de l’alerte n’est pas passée par la doublure de supabaseAdmin')
        if (E.natifs.length) e.push('un push natif est parti')
        if (reseau.length) e.push(`appel réseau : ${reseau[0]}`)
      }
      note('PF-T2', e, `crochet de résolution prouvé sur le code actuel : doublures de lib/email, lib/limites, lib/supabaseAdmin, lib/pushNatif et web-push chargées ; envoyerPushArtisan(F1) → 1 push consigné de ${512} octets, égal à chargeUtile, plafond passé par la doublure ; envoyerAlertes deux fois → 1 e-mail d'entreprise puis 0 (verrou), alerte persistée dans la fausse table ; aucun push natif, aucun appel réseau`)
      return res
    }

    // ── mode complet ──
    const liens = await importer('lib/pilotage/liens.ts')
    const notif = await importer('lib/pilotage/notifications.ts')
    const push = await importer('lib/push.ts')
    const alertes = await importer('lib/alertes.ts')
    if (!notif || !liens) return res
    const fn = (m, nom, f) => { if (typeof m?.[nom] !== 'function') throw new Error(`export ${nom} absent de ${f} (ou pas une fonction)`); return m[nom] }
    const garde = async (id, f) => { try { const r = await f(); note(id, r.echecs, r.detail) } catch (e) { note(id, [`interrompu : ${premiereLigne(e)}`], '') } }

    // PF-8 d'abord : ses charges réelles servent aussi à PF-3.
    await garde('PF-8', async () => {
      const e = []
      if (!push || !alertes) return { echecs: [`imports : ${JSON.stringify({ 'lib/push.ts': res.imports['lib/push.ts'], 'lib/alertes.ts': res.imports['lib/alertes.ts'] })}`] }
      fn(push, 'envoyerPushFondateurs', 'lib/push.ts')
      const envoyerAlertes = fn(alertes, 'envoyerAlertes', 'lib/alertes.ts')
      const charge = (m) => push.chargeUtile(notif.chargeFondateur(m))
      const auxFondateurs = (quoi, attendus, corps) => {
        const v = vers().sort(), a = [...attendus].sort()
        if (v.join() !== a.join()) e.push(`${quoi} : push vers ${v.map(nomDe).join(', ') || 'personne'}, ${a.map(nomDe).join(', ') || 'personne'} attendu`)
        if (corps) for (const p of E.push) if (p.corps !== corps) { e.push(`${quoi} : la charge envoyée n’est pas chargeUtile(chargeFondateur(motif))`); break }
        for (const p of E.push) { res.charges.push({ quoi, corps: p.corps }); const f = fuites(p.corps); if (f.length) e.push(`${quoi} : la charge envoyée porte ${f.join(', ')}`) }
      }
      // A. alerte d'entreprise panne_agent : un e-mail, un push à chaque fondateur (ni à la démo, ni à l'artisan)
      D.reinitialiser(TABLES)
      const panne = alerte('temoin-panne')
      const nA = await envoyerAlertes([panne]); await attendre(2)
      if (nA !== 1) e.push(`panne_agent : envoyerAlertes rend ${nA}, 1 attendu`)
      if (E.emails.length !== 1 || E.emails[0].genre !== 'entreprise') e.push(`panne_agent : ${E.emails.length} e-mail(s), 1 à l'entreprise attendu`)
      auxFondateurs('panne_agent', [F1, F2], charge('panne_agent'))
      // B. la même clé une seconde fois : verrou pris, ni e-mail ni push
      const avant = E.push.length
      const nB = await envoyerAlertes([panne]); await attendre(Infinity, 250)
      if (nB !== 0 || E.emails.length !== 1 || E.push.length !== avant) e.push(`même clé une seconde fois : rend ${nB}, ${E.emails.length} e-mail(s) et ${E.push.length - avant} push de plus (0, 1 et 0 attendus)`)
      // C. solde_ia : un e-mail, aucun push
      D.reinitialiser(TABLES)
      await envoyerAlertes([alerte('temoin-solde')]); await attendre(Infinity, 250)
      if (E.emails.length !== 1 || E.push.length) e.push(`solde_ia : ${E.emails.length} e-mail(s) et ${E.push.length} push, 1 et 0 attendus`)
      // D. une alerte adressée à un artisan : aucun push aux fondateurs
      D.reinitialiser(TABLES)
      await envoyerAlertes([alerte('temoin-paiement-artisan')]); await attendre(Infinity, 250)
      if (E.emails.length !== 1 || E.emails[0].genre !== 'artisan') e.push(`paiement adressé à un artisan : ${E.emails.length} e-mail(s) (${E.emails[0]?.genre}), 1 à l'artisan attendu`)
      if (vers().some((x) => x === F1 || x === F2)) e.push('paiement adressé à un artisan : un push est parti aux fondateurs')
      // E. un e-mail qui lève, puis un e-mail refusé : le push part quand même
      for (const [mode, cle, motif] of [['leve', 'temoin-paiement', 'paiement'], ['refuse', 'temoin-appel', 'appel']]) {
        D.reinitialiser(TABLES); E.modeEmail = mode
        await envoyerAlertes([alerte(cle)]); await attendre(2)
        if (E.emails.length !== 1) e.push(`${motif} avec un e-mail ${mode === 'leve' ? 'qui lève' : 'refusé'} : ${E.emails.length} tentative(s) d’e-mail, 1 attendue`)
        auxFondateurs(`${motif} avec un e-mail ${mode === 'leve' ? 'qui lève' : 'refusé'}`, [F1, F2], charge(motif))
      }
      // F. le push qui lève (la table des fondateurs en panne) ne bloque ni l'e-mail, ni la ronde, et ne laisse aucun rejet
      D.reinitialiser(TABLES); E.tablesEnPanne.add('artisans')
      const nF = await envoyerAlertes([alerte('temoin-digest')]); await attendre(Infinity, 250)
      if (nF !== 1 || E.emails.length !== 1) e.push(`digest avec la lecture des fondateurs en panne : rend ${nF} et ${E.emails.length} e-mail(s), 1 et 1 attendus`)
      // G. une simulation (ronde({ simuler })) : jamais de push, jamais de verrou
      if (typeof alertes.ronde === 'function') {
        D.reinitialiser(TABLES)
        await alertes.ronde({ simuler: 'digest' }); await attendre(Infinity, 250)
        if (E.push.length) e.push(`ronde({ simuler: 'digest' }) : ${E.push.length} push partis, 0 attendu (!simulation)`)
      }
      if (res.rejets.length) e.push(`promesse rejetée sans gestionnaire : ${res.rejets[0]}`)
      if (reseau.length) e.push(`appel réseau : ${reseau[0]}`)
      return { echecs: e, detail: `envoyerAlertes avec les doublures (2 fondateurs, 1 fondateur de démo, 1 artisan) : panne_agent d'entreprise → 1 e-mail et 1 push à chacun des 2 fondateurs, charge = chargeUtile(chargeFondateur(motif)) ; même clé → ni e-mail ni push ; solde_ia → 1 e-mail, 0 push ; alerte à un artisan → aucun push aux fondateurs ; e-mail qui lève ou refusé → le push part ; lecture des fondateurs en panne → l'e-mail part, aucun rejet ; simulation → aucun push ; aucun appel réseau` }
    })

    await garde('PF-2', async () => {
      const e = []
      const chargeFondateur = fn(notif, 'chargeFondateur', 'lib/pilotage/notifications.ts'), lienPilotage = fn(liens, 'lienPilotage', 'lib/pilotage/liens.ts')
      const RE0 = liens.RE_LIEN_PILOTAGE
      if (!(RE0 instanceof RegExp)) return { echecs: ['RE_LIEN_PILOTAGE absent de lib/pilotage/liens.ts'] }
      const RE = new RegExp(RE0.source, RE0.flags.replace(/[gy]/g, ''))
      const mp = notif.MOTIFS_POUSSES
      if (!Array.isArray(mp) || [...mp].sort().join() !== [...P.pousses].sort().join() || mp.length !== 6) e.push(`MOTIFS_POUSSES = ${JSON.stringify(mp)}, les six motifs ${P.pousses.join(', ')} attendus`)
      for (const m of P.pousses) {
        const c = chargeFondateur(m)
        if (!c || typeof c !== 'object') { e.push(`${m} : ${JSON.stringify(c)} au lieu d'une charge`); continue }
        if (typeof c.titre !== 'string' || !c.titre.trim() || c.titre.length > 60) e.push(`${m} : titre ${JSON.stringify(c.titre)} (1 à 60 signes)`)
        if (typeof c.ligne !== 'string' || !c.ligne.trim() || c.ligne.length > 120) e.push(`${m} : ligne ${JSON.stringify(c.ligne)} (1 à 120 signes)`)
        if (typeof c.url !== 'string' || !RE.test(c.url)) e.push(`${m} : url ${JSON.stringify(c.url)} refusée par RE_LIEN_PILOTAGE`)
        const attendu = BLOC_DU_MOTIF[m] ? lienPilotage({ bloc: BLOC_DU_MOTIF[m] }) : lienPilotage()
        if (c.url !== attendu) e.push(`${m} : url ${JSON.stringify(c.url)}, ${JSON.stringify(attendu)} attendu (bloc ${BLOC_DU_MOTIF[m] ?? 'aucun'})`)
        if (c.tag !== `pilotage-${m}`) e.push(`${m} : tag ${JSON.stringify(c.tag)}, « pilotage-${m} » attendu`)
      }
      for (const m of P.non_pousses) { const c = chargeFondateur(m); if (c !== null) e.push(`${m} : ${JSON.stringify(c).slice(0, 80)} au lieu de null`) }
      return { echecs: e, detail: `chargeFondateur : les six motifs poussés (${P.pousses.join(', ')}) → titre ≤ 60, ligne ≤ 120, url conforme à RE_LIEN_PILOTAGE et au bloc de chaque motif, tag pilotage-<motif> ; MOTIFS_POUSSES exact ; null pour ${P.non_pousses.join(', ')}` }
    })

    await garde('PF-3', async () => {
      const e = []
      const chargeFondateur = fn(notif, 'chargeFondateur', 'lib/pilotage/notifications.ts')
      if (!push || typeof push.chargeUtile !== 'function') return { echecs: [`lib/push.ts : chargeUtile introuvable (${res.imports['lib/push.ts']})`] }
      if (chargeFondateur.length !== 1) e.push(`chargeFondateur déclare ${chargeFondateur.length} paramètre(s) : il ne reçoit que le motif`)
      let n = 0
      for (const a of P.alertes) {
        const c = chargeFondateur(a.motif)
        if (c === null) continue
        n++
        for (const [quoi, texte] of [['charge', JSON.stringify(c)], ['charge envoyée', push.chargeUtile(c)]]) { const f = fuites(texte); if (f.length) e.push(`${a.cle} : la ${quoi} porte ${f.join(', ')}`) }
      }
      for (const x of res.charges) { const f = fuites(x.corps); if (f.length) e.push(`${x.quoi} (charge réellement envoyée) : ${f.join(', ')}`) }
      if (n < 7) e.push(`${n} alertes piégées ont une charge, 7 attendues (six motifs d'entreprise et un paiement d'artisan)`)
      if (!res.charges.length) e.push('aucune charge réellement envoyée à examiner (PF-8 n’a rien fait partir)')
      return { echecs: e, detail: `${n} alertes piégées (nom, téléphone, adresse, montant, référence de 12 chiffres dans le sujet et le corps) : ni la charge ni chargeUtile(charge) ne portent un piège ni 6 chiffres de suite ; ${res.charges.length} charges réellement envoyées par PF-8, propres aussi ; chargeFondateur ne déclare qu'un paramètre (le motif)` }
    })

    await garde('PF-4', async () => {
      const e = []
      if (!push) return { echecs: [`lib/push.ts ne s'importe pas : ${res.imports['lib/push.ts']}`] }
      const envoyerPushFondateurs = fn(push, 'envoyerPushFondateurs', 'lib/push.ts')
      const charge = Object.freeze({ titre: 'Témoin', ligne: 'Ligne témoin', url: '/controle?onglet=pilotage', tag: 'pilotage-digest', renotify: false })
      const ok = { envoyes: 1, supprimes: 0, desactives: 0 }
      const appels = []
      const r1 = await envoyerPushFondateurs(charge, { fondateurs: async () => ['f1', 'f2'], envoyer: async (id, c) => { appels.push([id, c]); return ok } })
      if (appels.map((x) => x[0]).sort().join() !== 'f1,f2') e.push(`deux fondateurs : envois vers ${appels.map((x) => x[0]).join(', ') || 'personne'}`)
      if (appels.some(([, c]) => JSON.stringify(c) !== JSON.stringify(charge))) e.push('deux fondateurs : la charge transmise n’est pas la même')
      if (r1?.envoyes !== 2) e.push(`deux fondateurs : envoyes = ${JSON.stringify(r1?.envoyes)}, 2 attendu`)
      let n2 = 0
      const r2 = await envoyerPushFondateurs(charge, { fondateurs: async () => [], envoyer: async () => { n2++; return ok } })
      if (!(r2?.envoyes === 0 && r2?.raison === 'aucun_fondateur') || n2) e.push(`aucun fondateur : ${JSON.stringify(r2)} et ${n2} envoi(s), { envoyes: 0, raison: 'aucun_fondateur' } attendu`)
      const vus = []
      let r3 = null
      try { r3 = await envoyerPushFondateurs(charge, { fondateurs: async () => ['f1', 'f2'], envoyer: async (id) => { vus.push(id); if (id === 'f1') throw new Error('envoi en panne (doublure)'); return ok } }) } catch (err) { e.push(`un envoi qui lève : la fonction lève (${premiereLigne(err)})`) }
      if (!vus.includes('f2')) e.push('un envoi qui lève pour le premier : le second n’est pas tenté')
      if (r3 && typeof r3.envoyes !== 'number') e.push(`un envoi qui lève : ${JSON.stringify(r3)}`)
      try { await envoyerPushFondateurs(charge, { fondateurs: async () => { throw new Error('lecture en panne (doublure)') }, envoyer: async () => ok }) } catch (err) { e.push(`la lecture des fondateurs qui lève : la fonction lève (${premiereLigne(err)})`) }
      return { echecs: e, detail: 'envoyerPushFondateurs avec doublures : deux fondateurs → deux envois de la même charge, envoyes = 2 ; aucun fondateur → { envoyes: 0, raison: aucun_fondateur } sans envoi ; le premier envoi qui lève n’empêche pas le second et rien ne lève ; la lecture des fondateurs qui lève ne fait pas lever non plus' }
    })

    if (o.drapeaux.has('urgents')) {
      const v = await importer('lib/agents/veilleur.ts')
      res.urgents = v ? (v.URGENTS instanceof Set ? [...v.URGENTS] : Array.isArray(v.URGENTS) ? [...v.URGENTS] : null) : null
    }
    res.motifsPousses = Array.isArray(notif.MOTIFS_POUSSES) ? [...notif.MOTIFS_POUSSES] : null
  } catch (e) {
    res.erreurs.push(court(e?.stack ?? e, 400))
  }
  return res
}

if (o.valeurs.enfant) {
  const res = await enfant(o.valeurs.enfant, o.racine)
  console.log(`${MARQUE}${JSON.stringify(res)}`)
  process.exitCode = 0
  setTimeout(() => process.exit(0), 3000).unref()
} else {

// ═══ Le juge ════════════════════════════════════════════════════════════════════════════════════════════════════════════
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const TRAV = path.join(TRAVAIL, JUGE)

/** L'environnement de l'enfant : aucun secret hérité ; clés VAPID factices ; le piège réseau éventuel (NODE_OPTIONS) gardé. */
function envEnfant() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!/SUPABASE|RESEND|VAPID|FIREBASE|ANTHROPIC|OPENAI|STRIPE|SECRET|TOKEN|_KEY|PASSWORD|EMAIL|DATABASE|POSTGRES/i.test(k)) env[k] = v
  return { ...env, TZ: 'UTC', VAPID_PUBLIC_KEY: 'BTemoinCleVapidPubliqueFactice', VAPID_PRIVATE_KEY: 'temoin-cle-vapid-privee-factice', VAPID_SUBJECT: 'https://exemple.invalid/contact' }
}
async function lancerEnfant(mode, extra = []) {
  const r = await lancerAsync(process.execPath, [CE_SCRIPT, `--enfant=${mode}`, `--racine=${RAC}`, ...extra], { cwd: R, env: envEnfant(), timeout: 180_000 })
  fs.mkdirSync(TRAV, { recursive: true })
  fs.writeFileSync(path.join(TRAV, `enfant-${mode}.log`), `${r.stdout}\n--- stderr ---\n${r.stderr}\n--- code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}\n`)
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith(MARQUE))
  if (!ligne) return { panne: `processus enfant sans constat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : ${court(r.stderr || r.stdout, 240)}` }
  try { return JSON.parse(ligne.slice(MARQUE.length)) } catch (e) { return { panne: `constat illisible : ${premiereLigne(e)}` } }
}

// ── Lecture de source : déclarations de premier niveau et différence avec HEAD ──────────────────────────────────────────
/** Les lignes d'un source, commentaires ôtés, rognées ; les vides sont écartées. → [{ n (0-based), t }] */
const lignesNettes = (src) => sansCommentaires(src).split(/\r?\n/).map((t, n) => ({ n, t: t.trim() })).filter((x) => x.t)
/** La déclaration de premier niveau `nom` (fonction ou const, exportée ou non) : lignes [debut, fin] du source brut. */
function declaration(src, nom) {
  const L = sansCommentaires(src).split(/\r?\n/)
  const re = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function\\*?\\s+${nom}\\b|(?:const|let)\\s+${nom}\\b)`)
  const debut = L.findIndex((l) => re.test(l))
  if (debut < 0) return null
  let fin = debut
  for (let i = debut + 1; i < L.length; i++) {
    if (!L[i].trim()) continue
    if (/^\S/.test(L[i]) && !/^[}\])]/.test(L[i])) break
    fin = i
  }
  return { debut, fin, texte: L.slice(debut, fin + 1).map((l) => l.trim()).filter(Boolean).join('\n') }
}
/** HEAD:<chemin> du dépôt git qui contient la racine jugée (null si illisible). */
const BASE_GIT = /^[0-9a-f]{7,40}$/.test(process.env.JUGE_BASE_GIT ?? '') ? process.env.JUGE_BASE_GIT : 'HEAD'
function sourceHead(chemin) {
  const r = git(['show', `${BASE_GIT}:${chemin}`], { cwd: RAC })
  return r.code === 0 ? r.stdout : null
}
/** Différence ligne à ligne (plus longue sous-suite commune) entre deux listes de lignes nettes. → { retirees, ajoutees } */
function difference(a, b) {
  const n = a.length, m = b.length
  const T = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = a[i].t === b[j].t ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1])
  const retirees = [], ajoutees = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i].t === b[j].t) { i++; j++ } else if (T[i + 1][j] >= T[i][j + 1]) retirees.push(a[i++]); else ajoutees.push(b[j++])
  }
  while (i < n) retirees.push(a[i++])
  while (j < m) ajoutees.push(b[j++])
  return { retirees, ajoutees }
}
/** Les instructions import de premier niveau : [{ debut, fin, spec }] (lignes du source). */
function instructionsImport(src) {
  const L = sansCommentaires(src).split(/\r?\n/), out = []
  for (let i = 0; i < L.length; i++) {
    if (!/^import\b/.test(L[i])) continue
    let j = i
    while (j < L.length && !/(?:\bfrom\s*|^import\s*)['"][^'"]+['"]/.test(L[j])) j++
    const spec = /['"]([^'"]+)['"]\s*;?\s*$/.exec(L[Math.min(j, L.length - 1)])?.[1] ?? null
    out.push({ debut: i, fin: j, spec })
    i = j
  }
  return out
}
/** Position de la parenthèse fermante qui répond à celle de `i` (texte sans commentaires). */
function fermante(t, i) {
  let p = 0
  for (let k = i; k < t.length; k++) {
    const c = t[k]
    if (c === '"' || c === "'" || c === '`') { const q = c; k++; while (k < t.length && t[k] !== q) { if (t[k] === '\\') k++; k++ } continue }
    if (c === '(' || c === '{' || c === '[') p++
    else if (c === ')' || c === '}' || c === ']') { p--; if (p === 0) return k }
  }
  return -1
}
const RE_PAS_SIMULATION = /!\s*simulation\b|\bsimulation\s*===?\s*false\b/
const RE_ENTREPRISE = /(?:\.a|\ba)\s*===?\s*['"]entreprise['"]|['"]entreprise['"]\s*===?\s*(?:\w+\.)?a\b/

// ═══ Critères ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
const N = 'lib/pilotage/notifications.ts', PU = 'lib/push.ts', AL = 'lib/alertes.ts'
const IDS = ['PF-1', 'PF-2', 'PF-3', 'PF-4', 'PF-5', 'PF-6', 'PF-7', 'PF-8', 'PF-9', 'PF-10']
const IDS_TEMOIN = ['PF-T1', 'PF-T2', 'PF-T3']
const NOM = JUGE
const s = creerSortie(NOM, [...(o.temoin ? IDS_TEMOIN : IDS)], `${NOM} — racine ${RAC}${o.temoin ? ' — témoin' : ''}`)
fs.mkdirSync(TRAV, { recursive: true })

const FONCTIONS_PUSH = ['envoyerPushArtisan', 'chargeUtile', 'cheminSur', 'serviceConnu']
/** PF-6 et PF-T3 : les corps des quatre fonctions de lib/push.ts sont ceux de HEAD, commentaires ôtés. */
function corpsPushInchanges(src, head) {
  const e = []
  for (const f of FONCTIONS_PUSH) {
    const a = declaration(head, f), b = declaration(src, f)
    if (!a) e.push(`HEAD:${PU} sans ${f}`)
    else if (!b) e.push(`${f} a disparu de ${PU}`)
    else if (a.texte !== b.texte) e.push(`le corps de ${f} a changé (ligne ${b.debut + 1})`)
  }
  return e
}
/** Les lignes d'envoyer (lib/alertes.ts) : { debut, fin, texte } du source sans commentaires. */
function envoyerDe(src) {
  const L = sansCommentaires(src).split(/\r?\n/)
  const d = declaration(src, 'envoyer')
  return d ? { ...d, brut: L.slice(d.debut, d.fin + 1).join('\n') } : null
}

async function complet() {
  // PF-1 (première partie, sans rien importer) : le module existe et n'importe que ce qui est permis.
  const src = lireOuNull(path.join(RAC, N))
  const e1 = []
  if (src === null) e1.push(`${N} absent de ${RAC}`)
  else {
    for (const i of importsDe(src)) {
      if (i.spec === null) e1.push(`${N} : ${i.genre} non littéral`)
      else if (['./liens', './liens.ts', '@/lib/pilotage/liens'].includes(i.spec)) continue
      else if (i.spec === '@/lib/push' && i.type) continue
      else e1.push(`${N} importe « ${i.spec} »${i.type ? ' (type)' : ''} — seuls ./liens et un type de @/lib/push`)
    }
    const nu = sansCommentaires(src)
    for (const [re, quoi] of [[/\bsupabaseAdmin\b/, 'supabaseAdmin'], [/\bfetch\s*\(/, 'fetch('], [/['"`]node:/, 'node:'], [/['"`]next\//, 'next/*'], [/\brequire\s*\(/, 'require('], [/\bprocess\.env\b/, 'process.env']]) if (re.test(nu)) e1.push(`${N} cite ${quoi}`)
  }
  if (e1.length) { s.juger('PF-1', e1, ''); return s.nonJuges(IDS, 'PF-1 en échec (module absent, interdit ou illisible)') }

  // PF-9 : lu dans le source quand c'est possible ; sinon l'enfant importe le veilleur.
  const srcV = lireOuNull(path.join(RAC, 'lib/agents/veilleur.ts'))
  const nuV = srcV === null ? '' : sansCommentaires(srcV)
  const exporteUrgents = /\bexport\s+const\s+URGENTS\b/.test(nuV) || /\bexport\s*\{[^}]*\bURGENTS\b[^}]*\}/.test(nuV)
  const litteral = /\bconst\s+URGENTS\b[^=]*=\s*(?:new\s+Set\s*(?:<[^>]*>)?\s*\(\s*)?\[([^\]]*)\]/.exec(nuV)
  const urgentsSource = exporteUrgents && litteral ? [...litteral[1].matchAll(/['"]([\w-]+)['"]/g)].map((x) => x[1]) : null

  const r = await lancerEnfant('complet', exporteUrgents && !urgentsSource ? ['--urgents'] : [])
  if (r.panne || r.erreurs?.length) {
    s.juger('PF-1', [r.panne ?? `processus enfant en erreur : ${r.erreurs.join(' | ')}`], '')
    return s.nonJuges(IDS, 'PF-1 en échec (le processus enfant n’a pas pu juger)')
  }
  const imp = r.imports ?? {}
  const e1b = [N, 'lib/pilotage/liens.ts'].filter((f) => imp[f] !== 'ok').map((f) => `${f} ne s'importe pas : ${court(imp[f] ?? 'non tenté', 200)}`)
  s.juger('PF-1', e1b, `${N} présent sous ${rel(RAC)}, n'importe que ./liens et un type de @/lib/push, ni supabaseAdmin, ni fetch, ni node:, ni next/*, ni process.env ; importé (avec liens.ts) par le crochet du processus enfant`)
  if (e1b.length) return s.nonJuges(IDS, 'PF-1 en échec (module illisible)')

  const deLEnfant = (id) => { const c = r.criteres?.[id]; if (!c) s.echoue(id, 'non jugé par le processus enfant'); else s.juger(id, c.echecs, c.detail) }
  deLEnfant('PF-2'); deLEnfant('PF-3'); deLEnfant('PF-4')

  const srcP = lireOuNull(path.join(RAC, PU)), srcA = lireOuNull(path.join(RAC, AL))
  const headP = sourceHead(PU), headA = sourceHead(AL)

  await s.critere('PF-5', () => {
    if (srcP === null) return { echecs: [`${PU} absent`] }
    const d = declaration(srcP, 'lireFondateurs'), e = []
    if (!d) return { echecs: [`lireFondateurs absent de ${PU}`] }
    if (!/^export\b/.test(sansCommentaires(srcP).split(/\r?\n/)[d.debut])) e.push('lireFondateurs n’est pas exporté')
    const t = d.texte
    if (!/\.from\(\s*['"]artisans['"]\s*\)/.test(t)) e.push('lireFondateurs ne lit pas la table artisans')
    if (!/is_founder['"]?\s*[,:]\s*true\b/.test(t)) e.push('aucun filtre is_founder vrai')
    if (!/est_demo['"]?\s*[,:]\s*false\b/.test(t) && !/\bnot\(\s*['"]est_demo['"]\s*,\s*['"](?:is|eq)['"]\s*,\s*true\s*\)/.test(t)) e.push('aucun filtre est_demo faux')
    return { echecs: e, detail: `lireFondateurs (${PU}:${d.debut + 1}) lit artisans avec is_founder vrai et est_demo faux (lu dans le source)` }
  })

  await s.critere('PF-6', () => {
    if (srcP === null) return { echecs: [`${PU} absent`] }
    if (headP === null) return { echecs: [`HEAD:${PU} illisible (dépôt git introuvable depuis ${RAC})`] }
    const e = corpsPushInchanges(srcP, headP)
    const d = difference(lignesNettes(headP), lignesNettes(srcP))
    if (d.retirees.length) e.push(`${d.retirees.length} ligne(s) de HEAD retirée(s) ou changée(s), dont « ${court(d.retirees[0].t, 90)} »`)
    return { echecs: e, detail: `${PU} : corps de ${FONCTIONS_PUSH.join(', ')} identiques à HEAD (commentaires ôtés) ; la différence avec HEAD n'ajoute que des lignes (${d.ajoutees.length} ajoutée(s), 0 retirée)` }
  })

  await s.critere('PF-7', () => {
    if (srcA === null) return { echecs: [`${AL} absent`] }
    if (headA === null) return { echecs: [`HEAD:${AL} illisible (dépôt git introuvable depuis ${RAC})`] }
    const e = []
    const env = envoyerDe(srcA)
    if (!env) return { echecs: [`la fonction envoyer a disparu de ${AL}`] }
    const t = env.brut
    const iL = t.indexOf('consommerLimite('), iP = t.indexOf('persisterAlerte('), iX = t.search(/\benvoyerPushFondateurs\s*\(/)
    if (iX < 0) e.push('envoyer n’appelle pas envoyerPushFondateurs')
    else {
      if (iL < 0 || iP < 0) e.push('envoyer ne passe plus par consommerLimite( et persisterAlerte(')
      else if (!(iX > iL && iX > iP)) e.push('l’appel au push vient avant le verrou ou la persistance')
      if (!/\bchargeFondateur\s*\(/.test(t)) e.push('envoyer ne calcule pas chargeFondateur(')
      const debutInstr = Math.max(t.lastIndexOf('\n', iX), t.lastIndexOf(';', iX), t.lastIndexOf('{', iX), t.lastIndexOf('}', iX))
      if (/\b(?:await|return)\b/.test(t.slice(debutInstr + 1, iX))) e.push('l’appel au push est attendu (await) ou rendu : il pourrait retenir ou faire lever envoyer')
      const ouvre = t.indexOf('(', iX), ferme = fermante(t, ouvre)
      if (ferme < 0 || !/^\s*\.\s*catch\s*\(/.test(t.slice(ferme + 1))) e.push('l’appel au push n’est pas suivi de .catch(')
      // Les conditions qui l'entourent : chaque if dont le bloc (ou l'instruction seule) contient l'appel.
      const conds = []
      for (const m of t.matchAll(/\bif\s*\(/g)) {
        const po = m.index + m[0].length - 1, pf = fermante(t, po)
        if (pf < 0 || pf > iX) continue
        let k = pf + 1
        while (/\s/.test(t[k] ?? '')) k++
        const fin = t[k] === '{' ? fermante(t, k) : (() => { const x = t.indexOf('\n', k); return x < 0 ? t.length : x })()
        if (k <= iX && iX <= fin) conds.push(t.slice(po + 1, pf))
      }
      const instr = t.slice(debutInstr + 1, iX)
      const toutes = [...conds, instr].join(' && ')
      if (!RE_PAS_SIMULATION.test(toutes)) e.push('l’appel au push n’est pas sous la condition !simulation')
      if (!RE_ENTREPRISE.test(toutes)) e.push('l’appel au push n’est pas sous la condition a === \'entreprise\'')
    }
    const d = difference(lignesNettes(headA), lignesNettes(srcA))
    if (d.retirees.length) e.push(`${d.retirees.length} ligne(s) de HEAD retirée(s) ou changée(s), dont « ${court(d.retirees[0].t, 90)} »`)
    const imps = instructionsImport(srcA)
    const PERMIS = ['@/lib/pilotage/notifications', '@/lib/push', './pilotage/notifications', './push']
    const hors = d.ajoutees.filter((x) => !(x.n >= env.debut && x.n <= env.fin) && !imps.some((i) => x.n >= i.debut && x.n <= i.fin && PERMIS.includes(String(i.spec).replace(/\.ts$/, ''))))
    if (hors.length) e.push(`${hors.length} ligne(s) ajoutée(s) hors d'envoyer et des imports permis, dont « ${court(hors[0].t, 90)} » (ligne ${hors[0].n + 1})`)
    return { echecs: e, detail: `${AL} : dans envoyer, envoyerPushFondateurs(chargeFondateur(…)) vient après consommerLimite( et persisterAlerte(, sous !simulation et a === 'entreprise', sans await, suivi de .catch( ; aucune ligne de HEAD retirée, ${d.ajoutees.length} ajoutée(s), toutes dans envoyer ou dans un import de notifications ou de push` }
  })

  deLEnfant('PF-8')

  await s.critere('PF-9', () => {
    if (srcV === null) return { echecs: [], detail: 'lib/agents/veilleur.ts absent : rien à comparer (026-047 pas encore livrée)' }
    if (!exporteUrgents) return { echecs: [], detail: 'lib/agents/veilleur.ts n’exporte pas URGENTS : rien à comparer' }
    const urgents = urgentsSource ?? r.urgents
    if (!Array.isArray(urgents)) return { echecs: [`URGENTS exporté par lib/agents/veilleur.ts mais illisible (${res9()})`] }
    const hors = urgents.filter((m) => !(r.motifsPousses ?? []).includes(m))
    return { echecs: hors.length ? [`motif(s) urgent(s) du veilleur absent(s) de MOTIFS_POUSSES : ${hors.join(', ')}`] : [], detail: `URGENTS du veilleur (${urgents.join(', ')}) tous dans MOTIFS_POUSSES` }
  })
  function res9() { return urgentsSource ? 'lu dans le source' : `import : ${r.imports?.['lib/agents/veilleur.ts'] ?? 'non tenté'}` }

  await s.critere('PF-10', () => { const t = typecheck(RAC, JUGE); return { echecs: t.ok ? [] : [t.detail], detail: t.detail } })
}

async function temoin() {
  const e = []
  for (const [nom, f] of Object.entries(TEMOINS.push)) { try { for (const x of f()) e.push(`${nom} : ${x}`) } catch (err) { e.push(`${nom} : illisible (${court(err.message, 120)})`) } }
  s.juger('PF-T1', e, `alertes-push.json conforme : les six motifs poussés et les huit autres ont chacun une alerte d'entreprise, une alerte adressée à un artisan, et chaque sujet et corps porte le nom, le téléphone, l'adresse, le montant et 6 chiffres de suite`)

  const r = await lancerEnfant('temoin')
  if (r.panne || r.erreurs?.length) s.echoue('PF-T2', r.panne ?? `processus enfant en erreur : ${r.erreurs.join(' | ')}`)
  else { const c = r.criteres?.['PF-T2']; if (!c) s.echoue('PF-T2', 'non jugé par le processus enfant'); else s.juger('PF-T2', c.echecs, c.detail) }

  await s.critere('PF-T3', () => {
    const srcP = lireOuNull(path.join(RAC, PU)), srcA = lireOuNull(path.join(RAC, AL)), headP = sourceHead(PU), e = []
    if (srcP === null || srcA === null) return { echecs: [`${srcP === null ? PU : AL} absent`] }
    if (headP === null) e.push(`HEAD:${PU} illisible`)
    else e.push(...corpsPushInchanges(srcP, headP))
    if (!/\bexport\s+type\s+ChargePush\b/.test(sansCommentaires(srcP))) e.push(`${PU} n'exporte plus le type ChargePush`)
    const env = envoyerDe(srcA)
    if (!env) e.push(`envoyer a disparu de ${AL}`)
    else {
      const t = env.brut, iL = t.indexOf('consommerLimite('), iP = t.indexOf('persisterAlerte('), iM = t.indexOf('notifierEntreprise(')
      if (!(iL >= 0 && iP > iL && iM > iP)) e.push('envoyer ne prend plus le verrou quotidien (consommerLimite), puis ne persiste plus (persisterAlerte), puis n’envoie plus l’e-mail (notifierEntreprise), dans cet ordre')
    }
    return { echecs: e, detail: `non-régression : les corps de ${FONCTIONS_PUSH.join(', ')} sont ceux de HEAD, ChargePush toujours exporté ; envoyer de ${AL} prend toujours le verrou, persiste, puis envoie l'e-mail (l'endroit où 026-051 branche le push)` }
  })
}

try {
  if (o.temoin) await temoin(); else await complet()
} catch (e) {
  console.log(`(juge interrompu : ${court(e?.stack ?? e, 300)})`)
}
// Sortie sans process.exit() immédiat (voir pilotage-logique-qa : sous Windows, couper le processus pendant qu'un fil de libuv
// se ferme fait planter Node, code 127 au lieu de 1) ; un minuteur détaché tranche au bout de 3 s.
const code = s.finir()
process.exitCode = code
setTimeout(() => process.exit(code), 3000).unref()
} // fin du juge (le processus enfant s'arrête avant)
