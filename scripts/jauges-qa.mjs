#!/usr/bin/env node
// scripts/jauges-qa.mjs — le juge des jauges de quota (fiche 026-064, cahier JG), écrit par Claude Code AVANT
// lib/agents/acquisition/jauges.ts et app/api/controle/jauges/route.ts qu'il juge (CLAUDE.md:23). Inscrit au lot 5 du
// registre (026-062).
//
//   node --import ./scripts/ts-loader.mjs scripts/jauges-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Sans --auto-controle : importe lib/agents/acquisition/jauges.ts depuis --racine (défaut : le dépôt) et juge JG-1 à JG-6
// (JG-7 est retiré, revue transverse du 25/09 : Windsor jamais souscrit, aucun critère ne le nomme). Module absent → JG-1 en
// échec avec son identifiant, les autres « non jugés » (jamais un plantage sans identifiant).
// --auto-controle : les jeux d'essai de scripts/fixtures/026-acquisition/envoi/jauges.json se lisent (AC-1) et aucun ne
// nomme un domaine hors de la liste fermée du lot 5 (AC-2) : deux probes qui ne dépendent d'aucun module encore à écrire.
//
// Sortie : une ligne « ✅|❌ ID … » par critère, puis « jauges-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1
// sinon ; 2 si l'appel est invalide. Écrit seulement sous .orchestre/travail/jauges-qa/. Aucun secret, aucun appel réseau
// (hors 127.0.0.1, pour la route jugée par le banc).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe,
  exportsNommes, court, premiereLigne, lireJson,
} from './fixtures/026-acquisition/commun.mjs'
import { banc } from './fixtures/026-acquisition/envoi/commun.mjs'

const JUGE = 'jauges-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const ENVOI = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'envoi')
const MODULE_REL = path.join('lib', 'agents', 'acquisition', 'jauges.ts')
const ROUTE_REL = path.join('app', 'api', 'controle', 'jauges', 'route.ts')
const IDS = ['JG-1', 'JG-2', 'JG-3', 'JG-4', 'JG-5', 'JG-6']
const EXPORTS = ['JAUGES', 'calculerJauges', 'consommerJauge']
const IDENTIFIANTS_ATTENDUS = ['formulaire_jour', 'formulaire_technologie:contact_form_7', 'email_sollicite_jour', 'reponse_privee_jour', 'messagerie_jour', 'instagram_api', 'meta_ads_archive', 'publora']
const piege = piegerReseau()
const K = await importerContrat()

const jauges = (nom) => lireJson(path.join(ENVOI, 'jauges.json'))[nom]

// ── Un magasin factice pour JG-4 : Magasin.jaugeConsommer(fournisseur, n) — DEUX arguments, exactement comme le magasin
// en mémoire déjà écrit (026-016, `scripts/fixtures/026-acquisition/magasin-memoire.mjs:609`), la seule référence autorisée
// du type MagasinEnvoi (elle est dans l'`interdit` de 026-064, jamais recopiée ni réinventée à quatre arguments). La
// PÉRIODE fait donc partie de la clé que `consommerJauge` doit composer elle-même avant d'appeler `jaugeConsommer` :
// `fournisseur = "<id>:<periode>"`. Le plafond se pose par `poserEtat`, comme dans le magasin réel.
function creerMagasinJaugesFactice(plafonds = {}) {
  const table = new Map()
  return {
    ecritures: [],
    poserEtat({ jauges = {} } = {}) { for (const [f, plafond] of Object.entries(jauges)) table.set(f, { consomme: 0, plafond }) },
    async jaugeConsommer(fournisseur, n) {
      const j = table.get(fournisseur) ?? { consomme: 0, plafond: plafonds[fournisseur.split(':')[0]] ?? Infinity }
      if (j.consomme + n > j.plafond) return false
      j.consomme += n
      table.set(fournisseur, j)
      this.ecritures.push({ fournisseur, n })
      return true
    },
    async jauges() { return [...table.entries()].map(([fournisseur, j]) => ({ fournisseur, ...j })) },
    lu: (f) => table.get(f)?.consomme ?? 0,
  }
}

// Amène la période `cle` au plafond RÉEL : poserEtat ne fixe que le plafond (consommé 0) ; il faut consommer pour l'atteindre.
async function remplirJusquAuPlafond(M, cle, plafond) {
  M.poserEtat({ jauges: { [cle]: plafond } })
  for (let i = 0; i < plafond; i++) if (!(await M.jaugeConsommer(cle, 1))) throw new Error(`le magasin factice refuse avant le plafond (${i}/${plafond})`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle : uniquement les jeux d'essai, indépendant du module (encore à écrire)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function autoControle(s) {
  // AC-1 : jauges.json se lit, porte les scénarios attendus, aux compteurs cohérents avec leur nom.
  {
    const e = []
    const f = path.join(ENVOI, 'jauges.json')
    let d = null
    try { d = lireJson(f) } catch (err) { e.push(`${rel(f)} illisible : ${premiereLigne(err)}`) }
    if (d) {
      const attendus = ['vide', 'soixante_quatorze_pour_cent', 'soixante_quinze_pour_cent', 'cent_pour_cent', 'palier_p1_dix_sur_dix', 'p0_envoi_froid_ferme', 'technologie_en_pause']
      for (const k of attendus) if (!d[k]) e.push(`scénario ${k} absent de ${rel(f)}`)
      if (d.soixante_quatorze_pour_cent && d.soixante_quatorze_pour_cent.compteurs.formulaire_jour / 40 >= 0.75) e.push('soixante_quatorze_pour_cent : le rapport formulaire_jour/40 est déjà à 75 % ou plus')
      if (d.soixante_quinze_pour_cent && d.soixante_quinze_pour_cent.compteurs.formulaire_jour / 40 < 0.75) e.push('soixante_quinze_pour_cent : le rapport formulaire_jour/40 est sous 75 %')
      if (d.palier_p1_dix_sur_dix && (d.palier_p1_dix_sur_dix.palier !== 'P1' || d.palier_p1_dix_sur_dix.compteurs.formulaire_jour !== 10)) e.push('palier_p1_dix_sur_dix : palier P1 et formulaire_jour=10 attendus')
      if (d.p0_envoi_froid_ferme && d.p0_envoi_froid_ferme.envoi_froid !== false) e.push('p0_envoi_froid_ferme : envoi_froid doit être faux')
      if (d.technologie_en_pause && !d.technologie_en_pause.technologies?.some((t) => t.etat === 'pause')) e.push('technologie_en_pause : aucune technologie en pause dans le scénario')
    }
    s.juger('AC-1', e, `jauges.json : 7 scénarios (0 %, 74 %, 75 %, 100 %, P1 formulaire 10/10, envoi_froid fermé, technologie en pause), compteurs cohérents avec leur nom`)
  }
  // AC-2 : aucun domaine hors la liste fermée du lot 5 dans les fixtures de jauges-qa (recherche restreinte à jauges.json).
  {
    const f = path.join(ENVOI, 'jauges.json')
    const texte = fs.readFileSync(f, 'utf8')
    const domaines = [...texte.matchAll(/[\w.+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)].map((m) => m[1])
    const hors = domaines.filter((d) => !d.toLowerCase().endsWith('.invalid'))
    s.juger('AC-2', hors.map((d) => `domaine hors .invalid dans ${rel(f)} : ${d}`), `${rel(f)} : aucune adresse hors .invalid`)
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le jugement normal : le module doit exister (026-064 n'a pas encore été déposée : JG-1 échoue, comme prévu par le
// protocole des juges écrits AVANT leur module, CLAUDE.md:23)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function jugementNormal(s) {
  const fMod = path.join(RAC, MODULE_REL), fRoute = path.join(RAC, ROUTE_REL)
  const e1 = []
  let mod = null, srcRoute = null
  if (!fs.existsSync(fMod)) e1.push(`module absent : ${rel(fMod)}`)
  if (!fs.existsSync(fRoute)) e1.push(`route absente : ${rel(fRoute)}`)
  if (!e1.length) {
    try { mod = await importerDepuis(RAC, MODULE_REL) } catch (err) { e1.push(`jauges.ts ne s'importe pas : ${premiereLigne(err)}`) }
    if (mod) for (const n of EXPORTS) if (mod[n] === undefined) e1.push(`export ${n} absent de jauges.ts`)
    try { srcRoute = fs.readFileSync(fRoute, 'utf8') } catch (err) { e1.push(`route illisible : ${premiereLigne(err)}`) }
    if (srcRoute && !exportsNommes(srcRoute).includes('GET')) e1.push(`app/api/controle/jauges/route.ts n'exporte pas GET`)
  }
  s.juger('JG-1', e1, `jauges.ts (${EXPORTS.join(', ')}) et route.ts (GET) importés depuis ${rel(RAC)}`)
  if (e1.length) { s.nonJuges(IDS.slice(1), 'JG-1 en échec'); return }

  // JG-2 : JAUGES gelé, identifiants exacts, valeurs alignées sur le contrat.
  {
    const e = []
    if (!Object.isFrozen(mod.JAUGES)) e.push('JAUGES n\'est pas gelé (Object.isFrozen)')
    const ids = (mod.JAUGES ?? []).map((j) => j.id)
    for (const id of IDENTIFIANTS_ATTENDUS) if (!ids.includes(id)) e.push(`identifiant ${id} absent de JAUGES`)
    for (const id of ids) if (/^email_nouveaux|^email_envois|^email_boite/.test(id)) e.push(`identifiant retiré encore présent : ${id}`)
    const ads = (mod.JAUGES ?? []).find((j) => j.id === 'meta_ads_archive')
    if (ads && ads.plafond !== K.META_APPELS_PAR_HEURE) e.push(`meta_ads_archive : plafond ${ads.plafond}, META_APPELS_PAR_HEURE (${K.META_APPELS_PAR_HEURE}) attendu`)
    const email = (mod.JAUGES ?? []).find((j) => j.id === 'email_sollicite_jour')
    if (email && email.plafond !== K.EMAIL_SOLLICITE_JOUR) e.push(`email_sollicite_jour : plafond ${email.plafond}, EMAIL_SOLLICITE_JOUR (${K.EMAIL_SOLLICITE_JOUR}) attendu`)
    const rp = (mod.JAUGES ?? []).find((j) => j.id === 'reponse_privee_jour'), msg = (mod.JAUGES ?? []).find((j) => j.id === 'messagerie_jour')
    if (rp && rp.plafond !== K.PLAFONDS_DEFAUT?.reponse_privee) e.push(`reponse_privee_jour : plafond ${rp.plafond}, PLAFONDS_DEFAUT.reponse_privee (${K.PLAFONDS_DEFAUT?.reponse_privee}) attendu`)
    if (msg && msg.plafond !== K.PLAFONDS_DEFAUT?.messagerie) e.push(`messagerie_jour : plafond ${msg.plafond}, PLAFONDS_DEFAUT.messagerie (${K.PLAFONDS_DEFAUT?.messagerie}) attendu`)
    s.juger('JG-2', e, `JAUGES gelé, ${IDENTIFIANTS_ATTENDUS.length} identifiants du §1, aucun email_nouveaux/envois/boite, meta_ads_archive=META_APPELS_PAR_HEURE, email_sollicite_jour=EMAIL_SOLLICITE_JOUR, reponse_privee_jour/messagerie_jour=PLAFONDS_DEFAUT`)
  }
  // JG-3 : calculerJauges sur jauges.json.
  {
    const e = []
    const cas = [
      ['74 % → ok', 'soixante_quatorze_pour_cent', 'formulaire_jour', 'ok'],
      ['75 % → attention', 'soixante_quinze_pour_cent', 'formulaire_jour', 'attention'],
      ['100 % → pleine', 'cent_pour_cent', 'formulaire_jour', 'pleine'],
      ['P0 envoi_froid fermé → plafond 0, pleine', 'p0_envoi_froid_ferme', 'formulaire_jour', 'pleine'],
    ]
    for (const [nom, scenario, id, attendu] of cas) {
      try {
        const l = mod.calculerJauges(jauges(scenario), new Date('2026-10-14T09:00:00.000Z'))
        const j = l.find((x) => x.id === id)
        if (!j) e.push(`${nom} : jauge ${id} absente du résultat`)
        else if (j.etat !== attendu) e.push(`${nom} : état ${j.etat}, ${attendu} attendu (utilisé ${j.utilise}/${j.plafond})`)
      } catch (err) { e.push(`${nom} : ${premiereLigne(err)}`) }
    }
    try {
      const l = mod.calculerJauges(jauges('palier_p1_dix_sur_dix'), new Date('2026-10-14T09:00:00.000Z'))
      const j = l.find((x) => x.id === 'formulaire_jour')
      if (!j || j.plafond !== 10) e.push(`au palier P1, formulaire_jour a pour plafond ${j?.plafond}, 10 attendu`)
    } catch (err) { e.push(`palier P1 : ${premiereLigne(err)}`) }
    try {
      const l = mod.calculerJauges(jauges('technologie_en_pause'), new Date('2026-10-14T09:00:00.000Z'))
      const enPause = l.find((x) => x.id === 'formulaire_technologie:wpforms')
      const active = l.find((x) => x.id === 'formulaire_technologie:contact_form_7')
      if (!enPause || enPause.etat !== 'pleine') e.push(`formulaire_technologie:wpforms (en pause) : état ${enPause?.etat}, pleine attendu`)
      if (!active || active.etat !== 'ok') e.push(`formulaire_technologie:contact_form_7 (2 échecs, saine) : état ${active?.etat}, ok attendu`)
      const ordre = l.map((x) => x.etat)
      const rang = { pleine: 0, attention: 1, ok: 2 }
      for (let i = 1; i < ordre.length; i++) if (rang[ordre[i - 1]] > rang[ordre[i]]) { e.push(`ordre de tri rompu : ${ordre.join(', ')} (pleines, puis attention, puis ok attendu)`); break }
    } catch (err) { e.push(`technologie en pause : ${premiereLigne(err)}`) }
    s.juger('JG-3', e, `calculerJauges sur jauges.json : 74 % ok, 75 % attention, 100 % pleine, P0 fermé pleine, P1 plafond 10, technologie en pause pleine, tri respecté`)
  }
  // JG-4 : consommerJauge avec le magasin factice (Magasin.jaugeConsommer à DEUX arguments, comme magasin-memoire.mjs).
  {
    const e = []
    const M = creerMagasinJaugesFactice()
    try {
      const ok1 = await mod.consommerJauge(M, 'meta_ads_archive', 1, new Date('2026-10-14T22:59:00.000Z'))
      if (!ok1) e.push('un premier appel sous le plafond est refusé')
      // Le plafond horaire de meta_ads_archive est atteint juste avant minuit, puis l'heure change (23:59 → 00:00, Paris).
      await remplirJusquAuPlafond(M, `meta_ads_archive:${'2026-10-14T23'}`, K.META_APPELS_PAR_HEURE)
      // Le refus du magasin ne doit pas masquer une tentative d'écriture du module.
      const tentatives = [], reserver = M.jaugeConsommer.bind(M)
      M.jaugeConsommer = async (...args) => { tentatives.push(args); return reserver(...args) }
      const n0 = M.ecritures.length
      const auPlafond = await mod.consommerJauge(M, 'meta_ads_archive', 1, new Date('2026-10-14T21:59:30.000Z'))
      if (auPlafond) e.push('un appel au plafond horaire est accepté')
      if (M.ecritures.length !== n0) e.push('un appel refusé a quand même écrit dans le magasin')
      if (tentatives.length) e.push('au plafond connu, le module tente quand même une consommation dans le magasin')
      const apresMinuit = await mod.consommerJauge(M, 'meta_ads_archive', 1, new Date('2026-10-14T22:00:30.000Z'))
      if (!apresMinuit) e.push('une nouvelle heure (après minuit, Paris) est encore refusée : la période n\'a pas changé')
      // Heure d'hiver (UTC+1) : 22:59:30Z = 23:59:30 Paris, même clé d'heure T23 que l'été à 21:59:30Z.
      const M2 = creerMagasinJaugesFactice()
      await remplirJusquAuPlafond(M2, `meta_ads_archive:${'2026-12-14T23'}`, K.META_APPELS_PAR_HEURE)
      if (await mod.consommerJauge(M2, 'meta_ads_archive', 1, new Date('2026-12-14T22:59:30.000Z'))) e.push("heure d'hiver : 23 h 59 Paris (22:59Z) devrait tomber sur la période 2026-12-14T23, au plafond")
      if (!(await mod.consommerJauge(M2, 'meta_ads_archive', 1, new Date('2026-12-14T23:00:30.000Z')))) e.push("heure d'hiver : 0 h 00 Paris (23:00Z) devrait ouvrir une nouvelle période")
    } catch (err) { e.push(`appel simple : ${premiereLigne(err)}`) }
    // Une jauge « derive » (formulaire, technologie, e-mail sollicité, messagerie : comptées par la base, 0111) ne se
    // consomme jamais ici → erreur de programmation attendue.
    try { await mod.consommerJauge(M, 'formulaire_technologie:contact_form_7', 1, new Date()); e.push('consommerJauge sur une jauge « derive » (formulaire_technologie) n\'a pas levé') } catch { /* attendu */ }
    s.juger('JG-4', e, 'consommerJauge : un appel sous le plafond accepté, au plafond refusé sans écriture, accepté à la période suivante ; une jauge « derive » lève ; heure de Paris comprise')
  }
  // JG-5 : la route, par le banc (garde fondateur doublée, magasin doublé).
  {
    const e = []
    const r1 = await banc(fRoute, { url: 'https://prestiapp.fr/api/controle/jauges', comportements: { estFondateur: () => false, garderFondateur: () => false } })
    if (r1.statut === 200) e.push(`sans fondateur : statut 200, un refus attendu (obtenu ${r1.statut})`)
    const r2 = await banc(fRoute, { url: 'https://prestiapp.fr/api/controle/jauges', comportements: { estFondateur: () => true, garderFondateur: () => true, jauges: async () => jauges('cent_pour_cent'), calculerJauges: (d) => mod.calculerJauges(d, new Date()) } })
    if (r2.erreur) e.push(`avec fondateur : ${r2.erreur}`)
    else {
      if (r2.statut !== 200 && r2.statut !== 403 && r2.statut !== 404) e.push(`avec fondateur : statut ${r2.statut} inattendu`)
      const texteReponse = r2.texte ?? ''
      if (/@[\w.-]+\.[a-z]{2,}/i.test(texteReponse)) e.push('la réponse contient une adresse (@…)')
      if (/prospect|artisan-temoin/i.test(texteReponse)) e.push('la réponse contient un nom du jeu d\'essai')
    }
    s.juger('JG-5', e, `route jugée par le banc (@/lib/… doublés) : refus sans fondateur, réponse sans adresse ni nom de prospect avec fondateur`)
  }
  // JG-6 : lecture du source.
  {
    const e = []
    const srcMod = fs.readFileSync(fMod, 'utf8')
    const nu = sansCommentaires(srcMod)
    if (/\bfetch\s*\(/.test(nu)) e.push('jauges.ts appelle fetch(')
    if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('jauges.ts lit process.env')
    for (const i of importsDe(srcRoute)) if (i.spec && (/(^|\/)lib\/ai(\.ts)?$/.test(i.spec) || /(^|\/)lib\/agents\/llm(\.ts)?$/.test(i.spec))) e.push(`la route importe ${i.spec}`)
    const tc = typecheck(RAC, JUGE)
    if (!tc.ok) e.push(`typecheck : ${tc.detail}`)
    s.juger('JG-6', e, 'ni fetch( ni process.env dans jauges.ts ; la route n\'importe ni @/lib/ai ni @/lib/agents/llm ; typecheck vert')
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — fixtures ${rel(ENVOI)} (JG-7 retiré : Windsor jamais souscrit)`)
if (o.autoControle) await autoControle(s)
else await jugementNormal(s)
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
