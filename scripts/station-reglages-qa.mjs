// scripts/station-reglages-qa.mjs — le juge de la route des réglages de la station (fiche 026-177), écrit en 026-171 par Claude Code
// AVANT la route qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/station-reglages-qa.mjs [--racine=<d>] [--base=<commit>] [--temoin] [--reel]
//
//   RX-1  app/api/controle/station/reglages/route.ts : la PREMIÈRE instruction du GET et du PUT est `if (!actif('pilotage'))` → 404,
//         avant toute identité ;
//   RX-2  GET : estFondateur + exigerDomaine('sante', 'voir') ; PUT : estDirection + exigerDomaine('reglages', 'ecrire') ; un refus de
//         la garde (401, 403 artisan, fondateur en lecture, partenaire) ferme la route, sans écriture ;
//   RX-3  validerReglages (lib/pilotage/reglages.ts) est appelé côté serveur : clé inconnue → 400 avec la liste, 65 Ko → 413 ou 400,
//         chaque piège de t/reglages-pieges.json → 400, aucune écriture ; chaque cas valide de t/reglages-valides.json → 200 ;
//   RX-4  version périmée → 409 « modifié ailleurs : recharge » ; journaliser AVANT l'écriture (action station_reglages, version
//         avant), puis avec le résultat (version après) ; journaliser → false : aucun appel d'écriture ;
//   RX-5  30 écritures par jour au plus : la 31e → 429 (compteur consommerLimite), les refus 400 ne consomment rien ;
//   RX-6  le fichier de route est dans la ligne `pilotage` de scripts/fermeture-e2e.mjs, et le diff de ce fichier se limite à cette ligne ;
//   RX-7  aucune écriture réelle : le juge ne joue que des refus contre un serveur, et la route n'écrit que par les fonctions SQL ;
//   RX-8  le typage est vert (la route et ce qu'elle importe ; le dépôt entier sur la racine réelle).
//
// CE QUE CE JUGE PROUVE, ET CE QU'IL NE PROUVE PAS. Le mode par défaut tourne dans le cloud, sans compte, sans clé, sans .env.local :
//   · les routes sont JOUÉES sur des DOUBLURES (t/doublures-b.mjs : garde, droits, supabaseAdmin, journal, compteur de limites ;
//     s/doublures-station.mjs pour le reste), horloge figée ; la base des réglages est une machine à états en mémoire qui rend
//     `ops:version_perimee` comme la fonction SQL 0113. On prouve que la route appelle les BONNES gardes avec les bons domaines et les
//     bons verbes, qu'elle valide, borne, journalise dans le bon ordre, compte et réagit correctement au refus de chacune.
//   · Le 401 sans jeton, le 403 d'un artisan, d'un fondateur en lecture ou d'un partenaire sont ici ceux que la DOUBLURE de garde rend
//     (la matrice des droits, elle, est la vraie : lib/controle/droits.ts) ; que le VRAI garde les rende, et que l'arbre réel réponde 404
//     sans identité, se prouve avec --reel (compte d'essai, PC, .env.local) : NON TESTÉ DANS LE CLOUD, non exigé par verifier.
//   · Les réussites du PUT ne se prouvent qu'ici (doublures) : aucune version réelle n'est jamais écrite.
//   --temoin  pose le témoin du lot t (t/temoin/) sur le commit --base, le juge, puis prouve le HARNAIS (RX-HARNAIS) : la copie du
//             mode --reel se fait, `pilotage` levé dans la copie SEULEMENT, lib/flags.ts réel inchangé (sha256).
//   --reel    (PC seulement) l'arbre réel sans identité → 404 ; la copie au drapeau levé, un fondateur d'essai, un fondateur en lecture
//             (rôle posé puis retiré) et un artisan d'essai : 401, 403, et JAMAIS une réussite en écriture ; comptes supprimés dans un finally.
//
// Sortie « ✅ ID … » / « ❌ ID … », puis « station-reglages-qa : PASS|FAIL ». Code 0, 1 ou 2 (appel invalide, préalable manquant).
// N'écrit que sous .orchestre/travail/station-reglages-qa/ (et la copie de b/commun.mjs sous .orchestre/travail/pilotage-copie/).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, LOADER, lireOptions, creerSortie, sansCommentaires, lancerAsync, premiereLigne, court, lireOuNull, sha256, typecheck } from './fixtures/026-pilotage/a/commun.mjs'
import { commitBase, lireBase, copieAvecDrapeau, serveurCopie, avecComptes, corpsDeFonction, premiereInstruction } from './fixtures/026-pilotage/b/commun.mjs'
import { arbreTemoinT, figer, difference, typecheckFichiers, CROCHET, CROCHET_JSON, urlDossier, DOUBLURES_B, T } from './fixtures/026-pilotage/t/commun-b.mjs'

const JUGE = 'station-reglages-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const MARQUE = `@@${JUGE}@@ `
const o = lireOptions(process.argv.slice(2), { connues: ['base', 'reel', 'enfant'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)

const ROUTE = 'app/api/controle/station/reglages/route.ts'
const FLAGS = 'lib/flags.ts', CARTE = 'scripts/fermeture-e2e.mjs'
const CLES_PERMISES = ['theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage'] // 0113 (station_reglages_ecrire) et §5.3
const PLAFOND = 30
const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(T, f), 'utf8'))
const F = { uid: '90000000-0000-4000-8000-00000000f001', email: null, role: 'direction', roleInterne: 'fondateur', iat: 0, ip: '127.0.0.1' }
const COMPTES = {
  direction: F,
  lecture: { ...F, uid: '90000000-0000-4000-8000-00000000f002', role: 'lecture' },
  partenaire: { ...F, uid: '90000000-0000-4000-8000-00000000f003', role: 'lecture', roleInterne: 'partenaire' },
}
const REFUS = { sans_jeton: { error: 'Jeton absent.', status: 401, code: 'jeton_absent' }, artisan: { error: 'Réservé aux fondateurs.', status: 403 } }
const INSTANT = '2026-09-30T10:00:00Z'
const URL_ROUTE = 'http://127.0.0.1:3400/api/controle/station/reglages'
const REPONSE = JSON.parse(fs.readFileSync(path.join(T, '..', 's', 'reglages.json'), 'utf8')).reponse // la réponse conforme du GET (§5.5), jeu du lot s
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v))

// ═══ L'enfant : la route jouée sur les doublures ══════════════════════════════════════════════════════════════════════════
async function enfant(RAC) {
  const res = { criteres: {}, details: {}, appels: [] }
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const f = console[k]; console[k] = (...a) => { if (k === 'log' && String(a[0]).startsWith(MARQUE)) f(...a) } }
  globalThis.fetch = async (u) => { throw new Error(`réseau interdit dans ${JUGE} (enfant) : ${u}`) }
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: {
    racine: urlDossier(RAC), depot: urlDossier(R), doublures: pathToFileURL(DOUBLURES_B).href,
    doubles: { 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/direction/journal': 'journal', 'lib/supabaseAdmin': 'supabase', 'lib/limites': 'limites' },
    prefixes: {}, paquets: { 'next/server': 'next' },
  } })
  register(`data:text/javascript,${encodeURIComponent(CROCHET_JSON)}`)
  const D = await import(`${pathToFileURL(DOUBLURES_B).href}?m=juge`)
  const E = D.etat
  figer(INSTANT)
  const M = await import(pathToFileURL(path.join(RAC, ROUTE)).href).catch((e) => ({ __erreur: premiereLigne(e) }))
  const VALIDES = lireJson('reglages-valides.json').cas
  const PIEGES = lireJson('reglages-pieges.json').pieges
  const critere = async (id, f) => { const e = []; let d = ''; try { d = (await f(e)) ?? '' } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } (res.criteres[id] ??= []).push(...e); if (d) res.details[id] = d }

  /** Configure un cas : la base des réglages (une machine à états), les gardes, le journal. → l'état de la base d'essai. */
  function configurer(x = {}) {
    const st = { version: x.version ?? 3, reglages: x.reglages ?? {}, ecritures: [] }
    E.appels.length = 0
    E.compteurs = undefined
    E.config = {
      drapeaux: { pilotage: true, direction: true, ...(x.drapeaux ?? {}) },
      fondateur: COMPTES[x.compte ?? 'direction'], refusGarde: REFUS[x.refus] ?? null, refusDomaine: x.refusDomaine ?? null,
      journal: x.journal, compteurs: x.compteurs,
      rpc: (nom, args) => {
        if (nom === 'station_reglages_lire') return x.lirePanne ? new Error('panne d’essai') : [{ version: st.version, reglages: st.reglages, modifie_par: x.modifie_par ?? F.uid, modifie_le: x.modifie_le ?? '2026-09-29T10:00:00.000Z' }]
        if (nom === 'station_reglages_ecrire') {
          st.ecritures.push(args)
          if (x.erreurEcriture) return new Error(x.erreurEcriture)
          if (args.p_version !== st.version) return new Error('ops:version_perimee')
          st.version += 1; st.reglages = args.p_reglages
          return st.version
        }
        return undefined
      },
      table: () => new Error('doublure : aucune table lue par cette route (rpc seulement)'),
    }
    return st
  }
  const en = (h) => ({ 'content-type': 'application/json', ...(h ?? {}) })
  const entetes = (x) => (x?.refus === 'sans_jeton' ? {} : { authorization: 'Bearer jeton-essai' })
  const lireJsonRep = async (r) => { const t = await r.text(); try { return { t, j: JSON.parse(t) } } catch { return { t, j: null } } }
  async function get(x = {}) {
    const st = configurer(x)
    const r = await M.GET(new Request(URL_ROUTE, { headers: entetes(x) }))
    const { t, j } = await lireJsonRep(r)
    return { status: r.status, t, j, st, appels: E.appels.map((a) => ({ ...a })) }
  }
  /** `corps` est envoyé tel quel s'il est une chaîne, sinon sérialisé. */
  async function put(corps, x = {}) {
    const st = configurer(x)
    const r = await M.PUT(new Request(URL_ROUTE, { method: 'PUT', headers: en(entetes(x)), body: typeof corps === 'string' ? corps : JSON.stringify(corps) }))
    const { t, j } = await lireJsonRep(r)
    const appels = E.appels.map((a) => ({ ...a }))
    return { status: r.status, t, j, st, appels, ecrit: appels.filter((a) => a.f === 'rpc' && a.nom === 'station_reglages_ecrire'), journal: appels.filter((a) => a.f === 'journaliser') }
  }
  const gardes = (appels) => appels.filter((a) => ['estFondateur', 'estDirection', 'exigerDomaine'].includes(a.f))
  const dispo = (fn) => { if (typeof fn !== 'function') throw new Error(`${ROUTE} : ${M.__erreur ?? 'la méthode manque'}`) }
  const corpsValide = (version = 3) => ({ reglages: VALIDES.find((v) => v.nom === 'tout-ensemble')?.brut ?? { affichage: { titre: 'Station' } }, version })

  // ── RX-1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await critere('RX-1', async (e) => {
    dispo(M.GET); dispo(M.PUT)
    for (const [quoi, f] of [['GET', () => get({ drapeaux: { pilotage: false } })], ['PUT', () => put(corpsValide(), { drapeaux: { pilotage: false } })]]) {
      const a = await f()
      if (a.status !== 404) e.push(`${quoi}, drapeau baissé → ${a.status}, 404 attendu`)
      if (a.appels.some((x) => x.f !== 'actif')) e.push(`${quoi}, drapeau baissé : ${a.appels.filter((x) => x.f !== 'actif').map((x) => x.f).join(', ')} appelé(s) avant le 404 (aucune identité ne doit être lue)`)
      if (a.appels[0]?.f !== 'actif' || a.appels[0]?.drapeau !== 'pilotage') e.push(`${quoi} : le premier appel n’est pas actif('pilotage')`)
    }
    const g = await get()
    if (g.status !== 200) e.push(`GET, drapeau levé → ${g.status}, 200 attendu (la route existe quand le drapeau est levé)`)
    return 'doublures : drapeau baissé → 404 pour le GET et le PUT, avant toute garde, toute base et tout journal ; drapeau levé → la route répond (l’arbre réel sans identité : --reel)'
  })

  // ── RX-2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await critere('RX-2', async (e) => {
    const g = await get()
    const gg = gardes(g.appels)
    if (g.status !== 200) e.push(`GET fondateur → ${g.status}, 200 attendu`)
    if (!gg.some((a) => a.f === 'estFondateur')) e.push('GET n’appelle pas estFondateur')
    if (gg.some((a) => a.f === 'estDirection')) e.push('GET appelle estDirection : la lecture est ouverte au fondateur en lecture')
    if (!gg.some((a) => a.f === 'exigerDomaine' && a.domaine === 'sante' && a.verbe === 'voir')) e.push(`GET n’appelle pas exigerDomaine(f, 'sante', 'voir') (appelé : ${gg.filter((a) => a.f === 'exigerDomaine').map((a) => `${a.domaine}/${a.verbe}`).join(', ') || 'jamais'})`)
    if (gg[0]?.f !== 'estFondateur') e.push('GET : la première garde n’est pas estFondateur')
    const lu = await get({ version: REPONSE.version, reglages: REPONSE.reglages, modifie_par: REPONSE.modifie_par, modifie_le: REPONSE.modifie_le })
    if (canon(lu.j) !== canon(REPONSE)) e.push(`GET rend ${court(JSON.stringify(lu.j), 110)}, { version, reglages, modifie_par, modifie_le } comme s/reglages.json attendu`)
    const panne = await get({ lirePanne: true }); if (panne.status !== 503) e.push(`GET, lecture en panne → ${panne.status}, 503 attendu (jamais 500)`)
    const gl = await get({ compte: 'lecture' }); if (gl.status !== 200) e.push(`GET fondateur en lecture → ${gl.status}, 200 attendu`)
    const gp = await get({ compte: 'partenaire' }); if (gp.status !== 403) e.push(`GET partenaire → ${gp.status}, 403 attendu (la matrice ferme le domaine sante au partenaire)`)
    for (const [quoi, refus, st] of [['sans jeton', 'sans_jeton', 401], ['artisan', 'artisan', 403]]) {
      const r = await get({ refus }); if (r.status !== st) e.push(`GET ${quoi} → ${r.status}, ${st} attendu`)
      if (r.appels.some((a) => a.f === 'rpc' || a.f === 'from')) e.push(`GET ${quoi} : la base est lue malgré le refus`)
    }
    const p = await put(corpsValide())
    const gp2 = gardes(p.appels)
    if (p.status !== 200) e.push(`PUT fondateur → ${p.status}, 200 attendu (${court(p.t, 80)})`)
    if (!gp2.some((a) => a.f === 'estDirection')) e.push('PUT n’appelle pas estDirection (le rôle lecture doit être refusé)')
    if (gp2.some((a) => a.f === 'estFondateur')) e.push('PUT appelle estFondateur : seul estDirection ferme l’écriture au rôle lecture')
    if (!gp2.some((a) => a.f === 'exigerDomaine' && a.domaine === 'reglages' && a.verbe === 'ecrire')) e.push(`PUT n’appelle pas exigerDomaine(f, 'reglages', 'ecrire') (appelé : ${gp2.filter((a) => a.f === 'exigerDomaine').map((a) => `${a.domaine}/${a.verbe}`).join(', ') || 'jamais'})`)
    const cas = [['fondateur en lecture', { compte: 'lecture' }, 403], ['partenaire', { compte: 'partenaire' }, 403], ['sans jeton', { refus: 'sans_jeton' }, 401], ['artisan', { refus: 'artisan' }, 403],
      ['domaine refusé', { refusDomaine: { error: 'Les réglages sont réservés à Benjamin.', status: 403, code: 'hors_perimetre' } }, 403]]
    for (const [quoi, x, st] of cas) {
      const r = await put(corpsValide(), x)
      if (r.status !== st) e.push(`PUT ${quoi} → ${r.status}, ${st} attendu`)
      if (r.ecrit.length || r.journal.length) e.push(`PUT ${quoi} : ${r.ecrit.length ? 'écriture' : 'journal'} malgré le refus`)
    }
    return 'doublures : GET → estFondateur + exigerDomaine(sante, voir), { version, reglages, modifie_par, modifie_le }, 503 si la lecture tombe, ouvert au fondateur en lecture, fermé au partenaire ; PUT → estDirection + exigerDomaine(reglages, ecrire) ; 401, 403 (artisan, lecture, partenaire, domaine refusé) sans base ni journal (les vrais 401/403 : --reel)'
  })

  // ── RX-3 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await critere('RX-3', async (e) => {
    const inconnue = await put({ reglages: { cle_inconnue_du_test: 1 }, version: 3 })
    if (inconnue.status !== 400) e.push(`clé inconnue → ${inconnue.status}, 400 attendu`)
    else {
      if (!Array.isArray(inconnue.j?.clesPermises) || canon([...inconnue.j.clesPermises].sort()) !== canon([...CLES_PERMISES].sort())) e.push(`clé inconnue : clesPermises = ${court(JSON.stringify(inconnue.j?.clesPermises), 90)}, les sept clés (${CLES_PERMISES.join(', ')}) attendues`)
      if (!Array.isArray(inconnue.j?.erreurs) || !inconnue.j.erreurs.length) e.push('clé inconnue : `erreurs` (la liste des raisons) absente')
    }
    if (inconnue.ecrit.length) e.push('clé inconnue : la base est écrite')
    const gros = await put(JSON.stringify({ reglages: { affichage: { titre: 'Station' }, remplissage: 'x'.repeat(65 * 1024) }, version: 3 }))
    if (![400, 413].includes(gros.status)) e.push(`65 Ko → ${gros.status}, 413 ou 400 attendu`)
    if (gros.ecrit.length) e.push('65 Ko : la base est écrite')
    for (const p of PIEGES) {
      const brut = p.generer?.remplissage ? { ...p.brut, remplissage: 'x'.repeat(p.generer.remplissage) } : p.brut
      const corps = JSON.stringify({ reglages: brut, version: 3 })
      const r = await put(corps)
      const attendu = p.generer?.remplissage ? [400, 413] : [400]
      if (!attendu.includes(r.status)) { e.push(`piège « ${p.nom} » → ${r.status}, ${attendu.join(' ou ')} attendu`); continue }
      if (r.ecrit.length) e.push(`piège « ${p.nom} » : la base est écrite`)
      if (r.status === 400 && p.raison && !p.generer) {
        const raisons = Array.isArray(r.j?.erreurs) ? r.j.erreurs.join(' ; ') : ''
        if (!new RegExp(p.raison, 'i').test(raisons)) e.push(`piège « ${p.nom} » : les raisons rendues (« ${court(raisons, 80)} ») ne disent pas « ${p.raison} »`)
      }
      if (p.cleInconnue && canon([...(r.j?.clesPermises ?? [])].sort()) !== canon([...CLES_PERMISES].sort())) e.push(`piège « ${p.nom} » : la liste des clés permises manque`)
    }
    for (const v of VALIDES) {
      const r = await put({ reglages: v.brut, version: 3 })
      if (r.status !== 200) e.push(`cas valide « ${v.nom} » → ${r.status} (${court(r.t, 80)}), 200 attendu`)
      else if (canon(r.ecrit[0]?.args?.p_reglages) !== canon(v.brut)) e.push(`cas valide « ${v.nom} » : p_reglages transmis ≠ celui du corps`)
    }
    for (const [quoi, corps] of [['corps illisible', '{pas du json'], ['sans version', JSON.stringify({ reglages: {} })], ['version décimale', JSON.stringify({ reglages: {}, version: 1.5 })]]) {
      const r = await put(corps)
      if (r.status !== 400) e.push(`${quoi} → ${r.status}, 400 attendu`)
      if (r.ecrit.length) e.push(`${quoi} : la base est écrite`)
    }
    return `doublures : clé inconnue → 400 avec les sept clés permises ; 65 Ko → 413 ou 400 ; ${PIEGES.length} pièges de t/reglages-pieges.json → 400 (raison retrouvée) sans écriture ; ${VALIDES.length} cas valides → 200 ; corps illisible ou sans version → 400`
  })

  // ── RX-4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await critere('RX-4', async (e) => {
    const corps = corpsValide(3)
    const ok = await put(corps)
    if (ok.status !== 200) e.push(`écriture valide → ${ok.status}, 200 attendu (${court(ok.t, 80)})`)
    else {
      if (ok.j?.version !== 4) e.push(`écriture valide : { version } = ${JSON.stringify(ok.j?.version)}, 4 attendu`)
      const ordre = ok.appels.map((a) => (a.f === 'journaliser' ? `journal${a.n}` : a.f === 'rpc' && a.nom === 'station_reglages_ecrire' ? 'ecriture' : null)).filter(Boolean)
      if (canon(ordre) !== canon(['journal1', 'ecriture', 'journal2'])) e.push(`ordre des appels : ${ordre.join(' → ') || 'rien'}, journal1 → ecriture → journal2 attendu (le journal AVANT l’écriture, puis le résultat)`)
      const [j1, j2] = ok.journal
      if (j1 && (j1.action !== 'station_reglages' || j1.avant?.version !== 3)) e.push(`journal avant : action « ${j1.action} », avant ${JSON.stringify(j1.avant)} ; station_reglages et { version: 3 } attendus`)
      if (j2 && (j2.action !== 'station_reglages' || j2.apres?.version !== 4)) e.push(`journal du résultat : action « ${j2.action} », apres ${JSON.stringify(j2.apres)} ; station_reglages et { version: 4 } attendus`)
      if (j1 && j1.acteur !== F.uid) e.push('journal : l’acteur n’est pas le fondateur')
      const w = ok.ecrit[0]?.args
      if (w?.p_version !== 3 || w?.p_auteur !== F.uid) e.push(`écriture : p_version ${w?.p_version}, p_auteur ${w?.p_auteur} ; 3 et l'identifiant du fondateur attendus`)
      if (JSON.stringify(ok.journal).includes('Poste de commande')) e.push('le journal porte le contenu des réglages (les versions seulement)')
    }
    const perimee = await put({ ...corps, version: 2 })
    if (perimee.status !== 409) e.push(`version périmée → ${perimee.status}, 409 attendu`)
    else if (!/modifi[ée]s? ailleurs/i.test(perimee.j?.error ?? '') || !/recharge/i.test(perimee.j?.error ?? '')) e.push(`version périmée : « ${perimee.j?.error} » ne dit pas « modifié ailleurs : recharge »`)
    const sansJournal = await put(corps, { journal: false })
    if (sansJournal.ecrit.length) e.push('journaliser → false : la base est écrite quand même')
    if (sansJournal.status !== 503) e.push(`journaliser → false → ${sansJournal.status}, 503 (refusJournal) attendu`)
    const surSecond = await put(corps, { journal: (n) => n !== 2 })
    if (surSecond.ecrit.length !== 1) e.push('journal du résultat indisponible : l’écriture faite doit rester faite, une seule fois')
    for (const [message, st] of [['ops:cle_inconnue', 400], ['ops:trop_gros', 413], ['ops:auteur', 403], ['ops:autre_chose', 503]]) {
      const r = await put(corps, { erreurEcriture: message })
      if (r.status !== st) e.push(`erreur SQL « ${message} » → ${r.status}, ${st} attendu`)
    }
    return 'doublures : journal1 (station_reglages, version 3) → écriture → journal2 (version 4) ; version périmée → 409 « modifié ailleurs : recharge » ; journaliser → false → 503 et aucun appel d’écriture ; erreurs SQL rendues 400, 413, 403, 503'
  })

  // ── RX-5 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await critere('RX-5', async (e) => {
    configurer({})
    let version = 3
    const invalide = { reglages: { affichage: { titre: 'A' } }, version }
    for (let i = 0; i < 3; i++) { const r = await M.PUT(new Request(URL_ROUTE, { method: 'PUT', headers: en({ authorization: 'Bearer jeton-essai' }), body: JSON.stringify(invalide) })); if (r.status !== 400) e.push(`réglage invalide → ${r.status}, 400 attendu`) }
    let dernier = null
    for (let i = 1; i <= PLAFOND + 1; i++) {
      const r = await M.PUT(new Request(URL_ROUTE, { method: 'PUT', headers: en({ authorization: 'Bearer jeton-essai' }), body: JSON.stringify({ reglages: { affichage: { titre: `Station ${i % 10}` } }, version }) }))
      const j = await r.json().catch(() => null)
      if (i <= PLAFOND) { if (r.status !== 200) { e.push(`écriture n° ${i} → ${r.status}, 200 attendu (les refus 400 ne consomment pas le plafond)`); break } version = j?.version ?? version + 1 } else dernier = { status: r.status, j }
    }
    if (dernier?.status !== 429) e.push(`la 31e écriture → ${dernier?.status}, 429 attendu`)
    else if (!/30 réglages par jour/i.test(dernier.j?.error ?? '')) e.push(`la 31e : « ${dernier.j?.error} », « 30 réglages par jour au plus. » attendu`)
    const ecritures = E.appels.filter((a) => a.f === 'rpc' && a.nom === 'station_reglages_ecrire').length
    if (ecritures !== PLAFOND) e.push(`${ecritures} écriture(s) faite(s) en base, ${PLAFOND} attendues (la 31e ne doit pas écrire)`)
    const c = E.appels.filter((a) => a.f === 'consommerLimite')
    if (!c.length) e.push('aucun compteur consommé : la route doit compter par consommerLimite (lib/limites.ts)')
    else {
      if (c.some((a) => a.max !== PLAFOND)) e.push(`consommerLimite(…, ${c.find((a) => a.max !== PLAFOND).max}, …) : le plafond est ${PLAFOND}`)
      if (c.some((a) => a.fenetreSec < 86_400)) e.push(`consommerLimite : fenêtre de ${c.find((a) => a.fenetreSec < 86_400).fenetreSec} s, un jour (86 400 s) attendu`)
      if (new Set(c.map((a) => a.cle)).size !== 1) e.push('le compteur change de clé d’un appel à l’autre : il ne compte pas par fondateur et par jour')
    }
    return `doublures : ${PLAFOND} écritures → 200, la 31e → 429 « 30 réglages par jour au plus. » sans écriture ; trois refus 400 n’ont rien consommé ; consommerLimite(clé du jour, ${PLAFOND}, 86 400)`
  })

  // ── RX-7 (les appels de la route : aucune écriture hors des fonctions SQL) ────────────────────────────────────────────────
  await critere('RX-7', async (e) => {
    const vus = new Set()
    for (const x of [() => get(), () => put(corpsValide()), () => put(corpsValide(2)), () => put(corpsValide(), { journal: false })]) { const r = await x(); for (const a of r.appels) if (['insert', 'update', 'delete', 'upsert', 'schema'].includes(a.f)) vus.add(`${a.f}(${a.table ?? ''})`) }
    const r = await put(corpsValide()); for (const a of r.appels.filter((x) => x.f === 'from')) vus.add(`from(${a.table})`)
    for (const v of vus) e.push(`la route écrit ou lit directement la base : ${v} (ops.station_reglages ne s’écrit que par station_reglages_ecrire)`)
    return 'doublures : aucun insert, update, delete, upsert, schema ni from() : la route ne passe que par les fonctions rpc station_reglages_lire et station_reglages_ecrire'
  })
  return res
}
if (o.valeurs.enfant) {
  const r = await enfant(o.racine)
  console.log(MARQUE + JSON.stringify(r))
  process.exit(0)
}

// ═══ Le juge ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
const REEL = o.drapeaux.has('reel')
let BASE
try { BASE = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }
const CHEMINS = ['app/api/controle', 'lib', 'public/station', 'package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'proxy.ts', CARTE]
let RAC = o.racine, TEMOIN = null
if (o.temoin) {
  try { TEMOIN = arbreTemoinT(JUGE, { base: BASE, chemins: CHEMINS }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const RACINE_REELLE = !o.valeurs.racine && !o.temoin
const IDS = ['RX-1', 'RX-2', 'RX-3', 'RX-4', 'RX-5', 'RX-6', 'RX-7', 'RX-8']
if (o.temoin) IDS.push('RX-HARNAIS')
const S = creerSortie(JUGE, [...IDS], `${JUGE} — racine ${RAC}${TEMOIN ? ` — témoin du lot t posé sur ${BASE.slice(0, 7)}` : ''} — base ${BASE.slice(0, 7)} — doublures, sans compte ni clé${REEL ? ' + --reel (comptes d’essai : refus seulement, NON TESTÉ dans le cloud)' : ''}`)
const lireRac = (rel) => { const t = lireOuNull(path.join(RAC, rel)); return t === null ? null : t.replace(/\r\n?/g, '\n') }
const code = (t) => (t === null ? null : sansCommentaires(t))
const fusion = {}
const noter = (id, e, d) => { const x = (fusion[id] ??= { e: [], d: [] }); x.e.push(...e); if (d) x.d.push(d) }

// ── RX-1 (source) : la route existe, le drapeau est la première instruction du GET et du PUT ───────────────────────────────
const SRC = lireRac(ROUTE)
const RE_DRAPEAU = /^if\s*\(\s*!\s*actif\(\s*['"`]pilotage['"`]\s*\)\s*\)/
{
  const e = []
  if (SRC === null) e.push(`${ROUTE} absent`)
  else for (const m of ['GET', 'PUT']) {
    const corps = corpsDeFonction(SRC, m)
    if (corps === null) { e.push(`${ROUTE} : export ${m} introuvable (export async function ${m}(req: Request) attendu)`); continue }
    const p = premiereInstruction(corps)
    if (!RE_DRAPEAU.test(p)) e.push(`${m} : première instruction « ${court(p, 70)} », « if (!actif('pilotage')) … » attendu`)
    else if (!/404/.test(corps.slice(0, 300))) e.push(`${m} : la première instruction ne rend pas 404`)
  }
  noter('RX-1', e, `${ROUTE} existe ; la première instruction du GET et du PUT est if (!actif('pilotage')) → 404`)
}
if (fusion['RX-1'].e.length) {
  S.juger('RX-1', fusion['RX-1'].e, '')
  S.nonJuges(IDS, 'RX-1 en échec (route absente ou drapeau non lu en premier) : rien n’est joué, aucun serveur lancé')
  process.exit(S.finir())
}

// ── Les critères de source des autres ─────────────────────────────────────────────────────────────────────────────────────
const CG = code(corpsDeFonction(SRC, 'GET')), CP = code(corpsDeFonction(SRC, 'PUT'))
{
  const e = []
  if (!/\bestFondateur\s*\(/.test(CG)) e.push('GET : estFondateur( absent')
  if (!/exigerDomaine\(\s*\w+\s*,\s*['"`]sante['"`]\s*,\s*['"`]voir['"`]\s*\)/.test(CG)) e.push("GET : exigerDomaine(f, 'sante', 'voir') absent")
  if (!/\bestDirection\s*\(/.test(CP)) e.push('PUT : estDirection( absent')
  if (/\bestFondateur\s*\(/.test(CP)) e.push('PUT : estFondateur( : la lecture ne doit pas suffire pour écrire')
  if (!/exigerDomaine\(\s*\w+\s*,\s*['"`]reglages['"`]\s*,\s*['"`]ecrire['"`]\s*\)/.test(CP)) e.push("PUT : exigerDomaine(f, 'reglages', 'ecrire') absent")
  noter('RX-2', e, 'source : GET estFondateur + (sante, voir) ; PUT estDirection + (reglages, ecrire)')
}
{
  const e = []
  const imp = /import\s*\{[^}]*\bvaliderReglages\b[^}]*\}\s*from\s*['"]@\/lib\/pilotage\/reglages['"]/.test(code(SRC))
  if (!imp) e.push("validerReglages n'est pas importé de @/lib/pilotage/reglages (les règles ne se recopient jamais)")
  if (!/\bvaliderReglages\s*\(/.test(CP)) e.push('PUT : validerReglages( n’est pas appelé côté serveur')
  if (/function\s+validerReglages|const\s+validerReglages/.test(code(SRC))) e.push('la route redéfinit validerReglages')
  noter('RX-3', e, 'source : validerReglages importé de lib/pilotage/reglages et appelé dans le PUT')
}
{
  const e = []
  const iJ = CP.search(/\bjournaliser\s*\(/), iW = CP.search(/station_reglages_ecrire/)
  const nJ = (CP.match(/\bjournaliser\s*\(/g) ?? []).length
  if (iJ < 0) e.push('PUT : journaliser( absent')
  if (iW < 0) e.push('PUT : station_reglages_ecrire absent')
  if (iJ >= 0 && iW >= 0 && iJ > iW) e.push('PUT : journaliser( vient APRÈS station_reglages_ecrire : le journal se pose avant d’écrire')
  if (nJ < 2) e.push(`PUT : ${nJ} appel(s) de journaliser(, 2 attendus (avant, puis le résultat)`)
  if (!/\brefusJournal\s*\(/.test(CP)) e.push('PUT : refusJournal( absent (journaliser → false doit refuser sans écrire)')
  noter('RX-4', e, 'source : journaliser( avant station_reglages_ecrire, puis avec le résultat ; refusJournal() sur false')
}
{
  const e = []
  if (!/\bconsommerLimite\s*\(/.test(CP)) e.push('PUT : consommerLimite( absent')
  if (!/\b30\b/.test(CP) && !/\b30\b/.test(code(SRC))) e.push('le plafond de 30 écritures par jour est introuvable dans la route')
  noter('RX-5', e, 'source : consommerLimite( dans le PUT, plafond 30')
}

// ── RX-6 : la ligne `pilotage` de la carte de fermeture-e2e, et rien d'autre ──────────────────────────────────────────────
{
  const e = []
  const apres = lireRac(CARTE)
  const avant = (() => { const t = lireBase(BASE, CARTE); return t === null ? null : t.replace(/\r\n?/g, '\n') })()
  if (apres === null) e.push(`${CARTE} absent`)
  else if (avant === null) e.push(`${CARTE} introuvable au commit ${BASE.slice(0, 7)}`)
  else {
    const ligne = (t) => t.split('\n').find((l) => /^\s*'pilotage'\s*:\s*\[/.test(l)) ?? null
    const la = ligne(avant), lb = ligne(apres)
    const fichiers = (l) => (l ? [...l.matchAll(/'(app\/[^']+)'/g)].map((m) => m[1]) : [])
    if (!lb) e.push('la ligne \'pilotage\' de la carte est introuvable')
    else {
      if (!fichiers(lb).includes(ROUTE)) e.push(`la ligne 'pilotage' ne porte pas ${ROUTE}`)
      const perdus = fichiers(la).filter((f) => !fichiers(lb).includes(f)), neufs = fichiers(lb).filter((f) => !fichiers(la).includes(f))
      if (perdus.length) e.push(`la ligne 'pilotage' a perdu ${perdus.join(', ')}`)
      if (neufs.some((f) => f !== ROUTE)) e.push(`la ligne 'pilotage' ajoute autre chose que la route des réglages : ${neufs.filter((f) => f !== ROUTE).join(', ')}`)
    }
    const d = difference(avant, apres)
    const autres = (l) => !/^\s*'pilotage'\s*:\s*\[/.test(l)
    const retirees = d.retirees.filter(autres), ajoutees = d.ajoutees.filter(autres)
    // Une branche voisine de la même série (026-176, l'e-commerce réservé) pose ses propres lignes dans ce fichier : on les admet, elles nomment `ecommerce`.
    const etrangeres = [...retirees, ...ajoutees.filter((l) => !/ecommerce/i.test(l))]
    if (etrangeres.length) e.push(`le diff de ${CARTE} touche autre chose que la ligne 'pilotage' : ${etrangeres.slice(0, 2).map((l) => `« ${court(l.trim(), 70)} »`).join(' ; ')}${etrangeres.length > 2 ? ` ; … (${etrangeres.length} lignes)` : ''}`)
  }
  noter('RX-6', e, `${CARTE} : le fichier de route est dans la ligne 'pilotage' de la carte, et le diff avec ${BASE.slice(0, 7)} se limite à cette ligne`)
}
// ── L'enfant (doublures) ──────────────────────────────────────────────────────────────────────────────────────────────────
async function lancerEnfant() {
  const r = await lancerAsync(process.execPath, ['--import', pathToFileURL(LOADER).href, CE_SCRIPT, '--enfant=doublures', `--racine=${RAC}`], { cwd: RAC, timeout: 300_000 })
  const l = r.stdout.split(/\r?\n/).find((x) => x.startsWith(MARQUE))
  if (!l) return { erreur: `enfant sans résultat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : ${court(r.stderr || r.stdout, 300)}` }
  try { return JSON.parse(l.slice(MARQUE.length)) } catch (err) { return { erreur: `résultat de l’enfant illisible : ${premiereLigne(err)}` } }
}
const E1 = await lancerEnfant()
if (E1.erreur) for (const id of ['RX-1', 'RX-2', 'RX-3', 'RX-4', 'RX-5', 'RX-7']) noter(id, [E1.erreur])
else {
  for (const [id, e] of Object.entries(E1.criteres)) noter(id, e, E1.details[id] ? `${E1.details[id]}` : '')
}

// ── RX-7 (le source du juge) : aucune réussite réelle envoyée au serveur ; le compte d'essai purgé dans un finally ─────────
{
  const e = []
  const src = fs.readFileSync(CE_SCRIPT, 'utf8')
  const debut = src.indexOf('// >>> ' + 'REEL'), fin = src.indexOf('// <<< ' + 'REEL')
  if (debut < 0 || fin < debut) e.push('la région --reel du juge est introuvable')
  else {
    const region = src.slice(debut, fin)
    // Un PUT avec le jeton du fondateur d'essai n'est permis que sur la ligne marquée « REFUS seulement », après la pose du rôle de lecture
    // (le compte est alors un fondateur en lecture : le PUT ne peut être que refusé) ; tout autre PUT de ce genre est une réussite possible.
    const lignes = region.split('\n')
    for (const [i, l] of lignes.entries()) {
      if (!(/['"]PUT['"]/.test(l) && /\b(direction|fondateur)\.jeton\b/.test(l))) continue
      const avant = lignes.slice(0, i).join('\n')
      if (!/REFUS seulement/.test(l) || !/direction_roles/.test(avant) || !/role:\s*'lecture'/.test(avant)) e.push(`--reel envoie un PUT avec le jeton du fondateur hors du rôle de lecture : « ${court(l.trim(), 80)} »`)
    }
    if (!/(^|[^\w])avecComptes\(/.test(region)) e.push('--reel ne crée pas ses comptes par avecComptes (purge dans un finally)')
    if (!/finally/.test(region)) e.push('--reel : aucun finally pour retirer le rôle de lecture et arrêter le serveur')
    if (/station_reglages/.test(region.replace(/reglages'/g, '')) && /\.(insert|upsert)\(|method:\s*'POST'/.test(region)) e.push('--reel écrit dans les réglages')
  }
  noter('RX-7', e, 'source du juge : --reel n’envoie au serveur que des PUT refusés (aucun avec le jeton du fondateur d’essai), et purge ses comptes dans un finally ; aucune version réelle n’est écrite')
}

// ── RX-8 : le typage ──────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const e = []
  const t = typecheckFichiers(RAC, JUGE, [ROUTE])
  if (!t.ok) e.push(t.detail)
  let complet = ''
  if (RACINE_REELLE) {
    const c = typecheck(R, JUGE)
    if (!c.ok) e.push(`npm run typecheck : ${c.detail}`)
    complet = ` ; npm run typecheck (dépôt entier) : ${c.detail}`
  }
  noter('RX-8', e, `${t.detail}${complet}`)
}

// ── RX-HARNAIS (--temoin) : la copie du mode --reel se fait, le drapeau n'est levé que dans la copie ──────────────────────
if (o.temoin) {
  const e = []
  const reel = path.join(R, FLAGS)
  const avant = sha256(fs.readFileSync(reel))
  try {
    const c = copieAvecDrapeau(RAC, { critere: 'RX-HARNAIS' })
    if (!c.leveDansCopie) e.push('pilotage n’est pas levé dans la copie')
    if (!c.baisseDansReel) e.push('le drapeau a bougé dans la source')
    if (!fs.existsSync(path.join(c.dest, ROUTE))) e.push(`${ROUTE} n’est pas dans la copie`)
    if (fs.existsSync(path.join(c.dest, '.env.local'))) e.push('.env.local dans la copie')
    if (sha256(fs.readFileSync(reel)) !== avant) e.push('lib/flags.ts RÉEL a changé')
    S.juger('RX-HARNAIS', e, `copie ${path.relative(R, c.dest)} (${c.tete}, app/, lib/, jonctions, sans .env.local) : pilotage levé dans la copie seulement ; lib/flags.ts réel inchangé (sha256 ${avant.slice(0, 12)}…). Serveur et comptes d’essai : --reel, sur le PC, NON TESTÉ dans le cloud`)
  } catch (err) { S.echoue('RX-HARNAIS', `copie impossible : ${premiereLigne(err)}`) }
}

for (const id of IDS) {
  if (id === 'RX-HARNAIS') continue
  const a = fusion[id]
  if (!a) { S.echoue(id, 'non évalué'); continue }
  S.juger(id, a.e, a.d.join(' ; '))
}

// ── Le vivant (--reel, PC seulement, NON TESTÉ DANS LE CLOUD, non exigé par verifier) ─────────────────────────────────────
// >>> REEL
async function reel() {
  const e1 = [], e2 = [], vu = []
  let srv = null, arbreReel = null
  try {
    if (!RACINE_REELLE) throw new Error('--reel se joue sur la racine réelle (ni --racine ni --temoin)')
    // 1. L'arbre réel (drapeau baissé) : 404 sans identité, GET et PUT.
    const { serveur } = await import('./lib/capture.mjs')
    arbreReel = await serveur(R)
    for (const m of ['GET', 'PUT']) { const r = await fetch(`${arbreReel.base}/api/controle/station/reglages`, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'PUT' ? '{"reglages":{},"version":0}' : undefined }); if (r.status !== 404) e1.push(`arbre réel : ${m} sans identité → ${r.status}, 404 attendu`) }
    vu.push('arbre réel : 404 sans identité (GET et PUT)')
    // 2. La copie au drapeau levé : rien que des refus en écriture.
    const c = copieAvecDrapeau(R, { critere: 'RX-2' })
    srv = await serveurCopie(c.dest, { critere: 'RX-2' })
    const appel = async (m, jeton) => (await fetch(`${srv.base}/api/controle/station/reglages`, { method: m, headers: { 'content-type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }, body: m === 'PUT' ? '{"reglages":{},"version":0}' : undefined })).status
    const { resultat, menage, erreur } = await avecComptes(['direction', 'artisan'], async ({ direction, artisan }) => {
      const pb = []
      const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
      const h = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
      try {
        if ((await appel('GET', null)) !== 401) pb.push('GET sans jeton : 401 attendu')
        if ((await appel('PUT', null)) !== 401) pb.push('PUT sans jeton : 401 attendu')
        if ((await appel('GET', artisan.jeton)) !== 403) pb.push('GET artisan : 403 attendu')
        if ((await appel('PUT', artisan.jeton)) !== 403) pb.push('PUT artisan : 403 attendu')
        if ((await appel('GET', direction.jeton)) !== 200) pb.push('GET fondateur d’essai : 200 attendu')
        // Le fondateur d'essai devient un fondateur EN LECTURE (0065 : direction_roles) : il lit, il n'écrit pas.
        const pose = await fetch(`${SB}/rest/v1/direction_roles`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: direction.id, role: 'lecture' }) })
        if (!pose.ok) pb.push(`rôle de lecture impossible à poser (${pose.status}) : le refus du fondateur en lecture n’est pas éprouvé`)
        else {
          if ((await appel('GET', direction.jeton)) !== 200) pb.push('GET fondateur en lecture : 200 attendu')
          if ((await appel('PUT', direction.jeton)) !== 403) pb.push('PUT fondateur en lecture : 403 attendu') // REFUS seulement : jamais un PUT qui réussirait
        }
      } finally { await fetch(`${SB}/rest/v1/direction_roles?user_id=eq.${direction.id}`, { method: 'DELETE', headers: h }).catch(() => {}) }
      return pb
    })
    if (erreur) throw erreur
    e2.push(...resultat)
    if (!menage) e2.push('un compte d’essai n’a pas disparu')
    vu.push('copie au drapeau levé : 401 sans jeton, 403 artisan, 403 au PUT du fondateur en lecture ; comptes supprimés dans un finally')
  } catch (err) { e2.push(`--reel : ${premiereLigne(err)}`) } finally { if (srv) await srv.arreter(); if (arbreReel) await arbreReel.arreter() }
  S.juger('RX-1', e1, 'arbre réel : 404')
  S.juger('RX-2', e2, vu.join(' ; '))
}
// <<< REEL
if (REEL) await reel()
process.exit(S.finir())
