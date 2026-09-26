// scripts/faits-qa.mjs — juge hors ligne de J1, le juge des faits (fiche 026-016), écrit par Claude Code AVANT le module
// qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/faits-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Les critères JF de 026-065 (réécrits par la voie gratuite : relecture du formulaire avant chaque formulaire_site, plus
// aucune adresse ni MX) sur lib/agents/acquisition/jugeFaits.ts. Le juge part des prospects « recense » de
// scripts/fixtures/026-acquisition/candidats.json (champ `recense` : l'état après A8), sert les pages d'essai — modifiées
// après le recensement quand un cas l'exige (surcharges du récupérateur factice) — et lit l'état final du magasin factice.
//
// Signatures appelées (026-065) : executerJugeFaits({ magasin, recuperer, horloge, echeance, jetonMeta }) ;
// verifierFait(fait, { recuperer, horloge, jetonMeta }) → le fait avec `verifie`, ou le statut seul ;
// verifierAvantEnvoi(envoi, prospect, { magasin, recuperer, horloge, jetonMeta }) → { j1, raisons } ; normaliserTexte,
// texteVisible et verifierFormulaire(formulaire, deps) sont exportés et jugés par leur usage. Un fait `pub_meta` se relit
// par https://graph.facebook.com/v26.0/ads_archive (le jeton passe en access_token) ; les erreurs de l'API factice
// (ads-archive/erreur-190.json, -1357045, -613) sont celles de 026-065.
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/jugeFaits.ts et lit son source sous <d> (défaut : le dépôt).
//   --auto-controle  AC-1 les jeux d'essai se lisent (chaque fait « recense » se retrouve mot pour mot dans sa page, les
//                    pages de J1 disent ce qu'elles prétendent) ; AC-2 le magasin factice applique ses règles ; AC-3 chaque
//                    contrôle repère son échantillon fautif et laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « faits-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide. Module absent : JF-1 en échec, les suivants « non jugés ». Hors ligne (piège réseau, DNS compris),
// fuseau UTC. Écriture seulement sous .orchestre/travail/faits-qa/ (le cache de tsc).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe,
  importsNommes, normaliser, contient, texteVisibleJuge, refusDe, court, premiereLigne, cloner, lireJson, capturerConsole,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerRecuperateur, FIXTURES } from './fixtures/026-acquisition/recuperateur-factice.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6 } from './fixtures/026-acquisition/magasin-memoire.mjs'

const JUGE = 'faits-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const K = await importerContrat()
const REP = lireJson(path.join(FIXTURES, 'reperes.json'))
const CANDIDATS = lireJson(path.join(FIXTURES, 'candidats.json'))
const S = REP.siren
const UA = K.UA_RECENSEUR
const JETON = 'JETON-TEMOIN-7f3a'
const piege = piegerReseau()
const T0 = Date.parse('2026-10-14T09:00:00.000Z')
const IDS = ['JF-1', 'JF-2', 'JF-3', 'JF-4', 'JF-5', 'JF-6', 'JF-7', 'JF-8', 'JF-9', 'JF-10', 'JF-11', 'JF-12']
const EXPORTS = ['executerJugeFaits', 'normaliserTexte', 'texteVisible', 'verifierFait', 'verifierFormulaire', 'verifierAvantEnvoi']

const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const hoteDe = (url) => { try { return new URL(url).hostname.toLowerCase() } catch { return '' } }
const cheminDe = (url) => { try { return new URL(url).pathname } catch { return '' } }
const ua = (a) => a.entetes?.['user-agent'] ?? null
const ecarts = (appels) => appels.slice(1).map((a, i) => a.t - appels[i].t)
/** Le statut d'une vérification : le fait rendu (`verifie`), une chaîne seule, ou { statut }. */
const statutDe = (r) => (typeof r === 'string' ? r : r?.verifie ?? r?.statut ?? r?.resultat ?? null)
const raisonsDe = (p) => [...(p?.raisons ?? []), p?.raison].filter(Boolean)
const seed = (i) => { const c = CANDIDATS[i]; return { ...cloner(c.candidat), ...cloner(c.recense), etape: 'recense' } }
const C1 = () => seed(0), C6 = () => seed(5), C7 = () => seed(6)
const faitH1 = (p) => p.faits.find((f) => f.type === 'site_h1')

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les contrôles, purs : observations → défauts
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'JF-2': (x) => Object.entries({ exact: 'ok', retouche: 'absent', apostrophe: 'ok', script: 'absent' }).filter(([k, v]) => statutDe(x[k]) !== v).map(([k, v]) => `${k} : ${json(statutDe(x[k]) ?? x[k])}, ${v} attendu`),
  'JF-3': (x) => [
    ...['extraire', 'lireSite'].filter((n) => x.imports.noms.includes(n)).map((n) => `le source importe ${n} de lecteurSite`),
    ...(x.imports.espace ? ['lecteurSite importé en entier (import * ou dynamique) : extraire et lireSite restent à portée'] : []),
    ...x.urlsFaits.filter((u) => !x.appels.some((a) => a.url === u || a.url === u.replace(/\/$/, '') || `${a.url}/` === u)).map((u) => `aucune requête de J1 vers ${u} (fait déjà lu par A8)`),
    ...(x.urlsFaits.length ? [] : ['aucun fait de site à relire']),
  ],
  'JF-4': (x) => (x.p?.etape === 'rejete' && raisonsDe(x.p).includes('diffusion_partielle') ? [] : [`unité passée en diffusion P : ${x.p?.etape} ${json(raisonsDe(x.p))}, rejete diffusion_partielle attendu`]),
  'JF-5': (x) => [
    ...(x.garde?.etape !== 'verifie' ? [`prospect au compte inventé et au formulaire sain : ${x.garde?.etape} ${json(raisonsDe(x.garde))}, verifie attendu`] : []),
    ...((x.garde?.canaux ?? []).some((c) => json(c).includes('temoin.invente')) ? ['le compte Instagram inventé est gardé'] : []),
    ...(!(x.garde?.canaux ?? []).some((c) => c.canal === 'formulaire_site') ? ['le formulaire sain est retiré'] : []),
    ...(x.seul?.etape !== 'rejete' || !raisonsDe(x.seul).includes('aucun_canal_verifie') ? [`compte inventé seul canal : ${x.seul?.etape} ${json(raisonsDe(x.seul))}, rejete aucun_canal_verifie attendu`] : []),
  ],
  'JF-6': (x) => [
    ...(x.sain?.etape !== 'verifie' || !(x.sain?.canaux ?? []).some((c) => c.canal === 'formulaire_site') ? [`formulaire relu tel quel : ${x.sain?.etape}, canaux ${json((x.sain?.canaux ?? []).map((c) => c.canal))} (verifie et formulaire_site gardé attendus)`] : []),
    ...(x.captcha?.etape !== 'rejete' || !raisonsDe(x.captcha).includes('formulaire_captcha') ? [`reCAPTCHA apparu : ${x.captcha?.etape} ${json(raisonsDe(x.captcha))}, rejete formulaire_captcha attendu`] : []),
    ...((x.captcha?.canaux ?? []).some((c) => c.canal === 'formulaire_site') ? ['reCAPTCHA apparu : le canal formulaire_site est gardé'] : []),
    ...(x.robots?.etape !== 'rejete' || !raisonsDe(x.robots).includes('formulaire_robots_txt') ? [`robots.txt qui interdit l'action : ${x.robots?.etape} ${json(raisonsDe(x.robots))}, rejete formulaire_robots_txt attendu`] : []),
    ...(x.ecritures.includes('glisse.temoin') ? ['l\'adresse glissée dans le prospect est écrite dans le magasin'] : []),
    ...['resoudreMx', 'adressesNominatives', 'mailto'].filter((m) => sansCommentaires(x.source).includes(m)).map((m) => `« ${m} » dans le source`),
    ...(x.imports.noms.includes('lireFormulaire') || x.imports.espace ? ['le source importe lireFormulaire (ou lecteurSite en entier)'] : []),
  ],
  'JF-7': (x) => [
    ...(statutDe(x.sansJeton) !== 'non_verifiable' ? [`pub_meta sans jeton : ${json(statutDe(x.sansJeton) ?? x.sansJeton)}, non_verifiable attendu`] : []),
    ...(statutDe(x.texteChange) !== 'absent' ? [`pub_meta, jeton et texte d'annonce changé : ${json(statutDe(x.texteChange) ?? x.texteChange)}, absent attendu`] : []),
    ...(statutDe(x.avecJeton) !== 'ok' ? [`pub_meta, jeton et annonce inchangée : ${json(statutDe(x.avecJeton) ?? x.avecJeton)}, ok attendu`] : []),
    ...(x.marque?.etape !== 'verifie' ? [`marque (fait de site ok, pub_meta sans jeton) : ${x.marque?.etape} ${json(raisonsDe(x.marque))}, verifie attendu`] : []),
    ...(!(x.marque?.faits ?? []).some((f) => f.type === 'pub_meta' && f.verifie === 'non_verifiable') ? ['la marque ne garde pas son fait pub_meta en non_verifiable'] : []),
    ...(x.fuite ? [`le jeton apparaît dans ${x.fuite}`] : []),
  ],
  'JF-8': (x) => [...(x.p?.etape !== 'oppose' ? [`prospect mis en opposition entre A8 et J1 : ${x.p?.etape}, oppose attendu`] : []), ...(x.appels.length ? [`${x.appels.length} requête(s) pour lui : ${court(x.appels.map((a) => a.url).join(' '), 100)}`] : [])],
  'JF-9': (x) => {
    const e = []
    if (x.reservations.some((r) => r.limite > 15 || r.ids.length > 15)) e.push(`réservation au-delà de 15 : ${json(x.reservations.map((r) => [r.limite, r.ids.length]))}`)
    if (x.traites < 1) e.push('aucun prospect traité')
    if (x.traites > 15) e.push(`${x.traites} prospects traités, 15 au plus`)
    if (x.fin > x.echeance) e.push(`fin à ${(x.fin - x.debut) / 1000} s virtuelles, après l'échéance (${(x.echeance - x.debut) / 1000} s)`)
    for (const [h, l] of Object.entries(x.parHote)) { const m = Math.min(...ecarts(l)); if (l.length > 1 && m < 1000) e.push(`deux requêtes vers ${h} espacées de ${m} ms virtuelles (1 000 au moins)`) }
    if (x.exception) e.push(`exécution interrompue : ${x.exception}`)
    return e
  },
  'JF-10': (x) => {
    const e = []
    const nu = sansCommentaires(x.source)
    if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('process.env lu')
    for (const m of ['META_ADLIB_TOKEN', 'ACQ_ADRESSES_NOMINATIVES']) if (nu.includes(m)) e.push(`${m} dans le source`)
    for (const i of importsDe(x.source)) {
      if (!i.spec) e.push(`import non littéral (${i.genre})`)
      else if (['@/lib/ai', '@/lib/supabaseAdmin', '@/lib/agents/llm', '@anthropic-ai/sdk'].some((z) => i.spec === z || i.spec === `${z}.ts`) || /(^|\/)lib\/ai(\.ts)?$/.test(i.spec)) e.push(`import interdit ${i.spec}`)
    }
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return [...new Set(e)]
  },
  'JF-11': (x) => x.cas.flatMap((c) => [
    ...(c.exception ? [`${c.code} : exécution interrompue (${c.exception})`] : []),
    ...(c.avecSite?.etape !== 'verifie' ? [`${c.code} : le prospect au fait de site ok est ${c.avecSite?.etape}, verifie attendu`] : []),
    ...(!(c.avecSite?.faits ?? []).some((f) => f.type === 'pub_meta' && f.verifie === 'non_verifiable') ? [`${c.code} : le fait pub_meta n'est pas gardé en non_verifiable (${json((c.avecSite?.faits ?? []).filter((f) => f.type === 'pub_meta').map((f) => f.verifie))})`] : []),
    ...(c.ecrituresMetaSeul.length ? [`${c.code} : le prospect « Meta seulement » est écrit (${json(c.ecrituresMetaSeul)})`] : []),
    ...(c.requetesMeta !== 1 ? [`${c.code} : ${c.requetesMeta} requête(s) Meta pendant l'exécution, une seule attendue`] : []),
    ...(c.bilan?.meta !== c.attendu ? [`${c.code} : bilan.meta ${json(c.bilan?.meta)}, ${c.attendu} attendu`] : []),
  ]),
  'JF-12': (x) => {
    const e = []
    const j1 = (r) => r?.res?.j1 ?? (r?.exception ? `exception ${r.exception}` : json(r?.res))
    const raisons = (r) => r?.res?.raisons ?? []
    for (const k of ['reponse', 'lien_maquette', 'relance']) { if (j1(x[k]) !== 'sans_objet') e.push(`${k} : j1 ${json(j1(x[k]))}, sans_objet attendu`); if (x[k].appels.length) e.push(`${k} : ${x[k].appels.length} requête(s), zéro attendue`) }
    if (j1(x.ok) !== 'ok') e.push(`premier contact sain : j1 ${json(j1(x.ok))} ${json(raisons(x.ok))}, ok attendu`)
    if (x.ok.appels.length > 3) e.push(`premier contact sain : ${x.ok.appels.length} requêtes, 3 au plus`)
    if (x.ok.appels.some((a) => ua(a) !== UA)) e.push('premier contact sain : requête sans UA_RECENSEUR')
    for (const [k, raison] of [['retouche', 'fait_absent'], ['hcaptcha', 'formulaire_captcha'], ['action', 'formulaire_change'], ['robots', 'formulaire_robots_txt'], ['pubSansJeton', 'fait_non_verifiable']]) {
      if (j1(x[k]) !== 'refus' || !raisons(x[k]).includes(raison)) e.push(`${k} : j1 ${json(j1(x[k]))} ${json(raisons(x[k]))}, refus ${raison} attendu`)
    }
    if (j1(x.page500) !== 'injoignable') e.push(`page en 500 : j1 ${json(j1(x.page500))}, injoignable attendu (jamais refus)`)
    if (x.ecritures) e.push(`${x.ecritures} écriture(s) du magasin pendant verifierAvantEnvoi, aucune attendue`)
    return e
  },
}

/** Ce que chaque critère a vérifié, écrit sur sa ligne verte. */
const DETAILS = {
  'JF-2': "extrait retouché d'un mot → absent ; exact → ok ; apostrophe courbe contre droite → ok ; seulement dans un script → absent",
  'JF-3': "ni extraire ni lireSite importés ; chaque page de fait relue par J1, même déjà lue par A8",
  'JF-4': "unité passée en diffusion P entre A8 et J1 → rejete diffusion_partielle",
  'JF-5': "compte Instagram inventé retiré ; seul canal → rejete aucun_canal_verifie",
  'JF-6': "formulaire relu tel quel gardé ; reCAPTCHA apparu → formulaire_captcha ; robots.txt qui interdit l'action → formulaire_robots_txt ; adresse glissée jamais écrite ; ni resoudreMx, adressesNominatives, mailto, lireFormulaire",
  'JF-7': "pub_meta sans jeton → non_verifiable (prospect vérifié par son site) ; jeton et texte changé → absent ; le jeton dans aucune écriture, aucun événement, ni la console",
  'JF-8': "prospect mis en opposition entre A8 et J1 → oppose, zéro requête",
  'JF-9': "20 prospects : 15 au plus traités, arrêt avant l'échéance, 1 000 ms entre deux requêtes au même hôte",
  'JF-10': "ni process.env (ni META_ADLIB_TOKEN, ni ACQ_ADRESSES_NOMINATIVES), ni import interdit ; typecheck vert",
  'JF-11': "erreurs 190, 1357045 et 613 : pub_meta non_verifiable, prospect au site ok vérifié, « Meta seulement » jamais écrit, une seule requête Meta, bilan jeton_invalide, en_attente_identite, limite",
  'JF-12': "réponse, lien, relance → sans_objet sans requête ; premier contact sain → ok en 3 requêtes au plus ; fait retouché, hCaptcha, action changée, robots.txt, pub_meta sans jeton → refus avec leur raison ; page en 500 → injoignable ; aucune écriture",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les observations
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const essayer = async (f) => { try { return { res: await f(), exception: null } } catch (e) { return { res: undefined, exception: premiereLigne(e) } } }
/** Une page d'essai telle qu'elle est servie (corps), lue par un récupérateur neuf. */
async function servie(url) { const p = await creerRecuperateur({ horloge: creerHorloge(T0) })(url, {}); return p.corps }
/** Une surcharge qui remplace, pour une URL (hôte + chemin), le corps servi par transformer(corps). */
async function modifiee(url, transformer, x = {}) {
  const corps = transformer(await servie(url))
  const h = hoteDe(url), c = cheminDe(url)
  return (u) => (hoteDe(u) === h && (cheminDe(u) === c || cheminDe(u).replace(/\/$/, '') === c.replace(/\/$/, '')) ? { statut: 200, entetes: { 'content-type': url.endsWith('.txt') ? 'text/plain' : 'text/html; charset=utf-8' }, corps, ...x } : null)
}
const combiner = (...fs2) => (u, n) => { for (const f of fs2) { const r = f && f(u, n); if (r) return r } return null }
/** Une exécution de J1 sur un magasin semé de prospects « recense ». */
async function executer(mod, prospects, { surcharges = null, meta = null, jetonMeta = null, oppositions = null, echeance = null, console: capter = false } = {}) {
  const H = creerHorloge(T0)
  const M = creerMagasin({ horloge: H })
  const ids = prospects.map((p) => M.inserer(p))
  if (oppositions) M.poserEtat({ oppositions })
  const rec = creerRecuperateur({ horloge: H, surcharges, meta })
  const n0 = M.ecritures.length
  const lancer = () => mod.executerJugeFaits({ magasin: M, recuperer: rec, horloge: H, echeance: echeance ?? T0 + 10 * 60_000, jetonMeta })
  let r, texte = ''
  if (capter) { const c = await capturerConsole(lancer); r = { res: c.valeur, exception: c.erreur ? premiereLigne(c.erreur) : null }; texte = c.texte } else r = await essayer(lancer)
  return { M, H, ids, rec, bilan: r.res, exception: r.exception, ecritures: M.ecritures.slice(n0), console: texte, lire: (i) => M.lireProspect(ids[i]) }
}
const surchargeSirene = (siren, modifier) => {
  const brut = lireJson(path.join(FIXTURES, 'sirene', `${siren}.json`))
  const o2 = cloner(brut); for (const k of Object.keys(o2)) if (k.startsWith('_')) delete o2[k]
  modifier(o2.results[0])
  return (u) => (hoteDe(u) === 'recherche-entreprises.api.gouv.fr' && new URL(u).searchParams.get('q') === siren ? { statut: 200, entetes: { 'content-type': 'application/json' }, corps: JSON.stringify(o2) } : null)
}

async function observer(mod) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const depsSimples = (x = {}) => { const H = creerHorloge(T0); return { recuperer: creerRecuperateur({ horloge: H, ...x }), horloge: H, jetonMeta: x.jetonMeta ?? null } }
  const faitPage = (extrait, chemin) => ({ id: 'f'.repeat(16), type: 'site_h1', extrait, url: `https://temoin-faits.invalid${chemin}`, lu_le: '2026-10-14T08:00:00.000Z' })
  await tente('JF-2', async () => {
    const v = async (f) => { const r = await essayer(() => mod.verifierFait(f, depsSimples())); return r.exception ? `exception ${r.exception}` : r.res }
    return { exact: await v(faitPage(REP.faits_j1.exact, '/exact')), retouche: await v(faitPage(REP.faits_j1.exact, '/retouche')), apostrophe: await v(faitPage(REP.faits_j1.apostrophe, '/apostrophe')), script: await v(faitPage(REP.faits_j1.script, '/script')) }
  })
  const src = fs.readFileSync(path.join(RAC, 'lib', 'agents', 'acquisition', 'jugeFaits.ts'), 'utf8')
  const imp = importsNommes(src, 'lecteurSite')
  const imports = { noms: [...imp.noms], espace: imp.espace }
  // L'exécution principale : les trois prospects « recense » de candidats.json (C1, C6, C7), sans jeton.
  const principal = await executer(mod, [C1(), C6(), C7()])
  await tente('JF-3', async () => ({ imports, urlsFaits: [...new Set([C1(), C6(), C7()].flatMap((p) => p.faits.filter((f) => f.type.startsWith('site_')).map((f) => f.url)))], appels: principal.rec.appels }))
  await tente('JF-4', async () => { const r = await executer(mod, [C1()], { surcharges: surchargeSirene(S.S1, (x) => { x.statut_diffusion = 'P' }) }); return { p: r.lire(0) } })
  await tente('JF-5', async () => {
    const invente = { canal: 'instagram', valeur: 'temoin.invente', url_source: `https://${CANDIDATS[5].candidat.domaine}/` }
    const garde = C6(); garde.canaux.push(invente)
    const seul = { ...C1(), cle_dedup: 'instagram:temoin.entrant.invente', source: 'entrant', froid: false, formulaire: null, technologie: null, canaux: [{ canal: 'instagram', valeur: 'temoin.entrant.invente', url_source: `https://${REP.conforme.hote}/` }] }
    const r = await executer(mod, [garde, seul])
    return { garde: r.lire(0), seul: r.lire(1) }
  })
  await tente('JF-6', async () => {
    const sain = C1(); sain.canaux.push({ canal: 'email_sollicite', valeur: 'glisse.temoin@temoin-conforme.invalid', url_source: `https://${REP.conforme.hote}/` })
    const apparu = (x, cle) => {
      const hote = x.hote
      const f = { ...cloner(REP.form_html), url_page: `https://${hote}/contact`, url_action: `https://${hote}/contact/envoyer` }
      return { cle_dedup: `domaine:${hote}`, source: 'manuel', cible: 'artisan', siren: S.S1, domaine: hote, entreprise: `Menuiserie Témoin ${cle}`, froid: true, etape: 'recense', metier: 'plombier', faits: [{ id: `${cle}`.padEnd(16, '0').slice(0, 16), type: 'site_titre', extrait: x.titre, url: `https://${hote}/`, lu_le: '2026-10-14T08:00:00.000Z' }, { id: `${cle}h1`.padEnd(16, '0').slice(0, 16), type: 'site_h1', extrait: x.h1, url: `https://${hote}/`, lu_le: '2026-10-14T08:00:00.000Z' }], canaux: [{ canal: 'formulaire_site', valeur: f.url_page, url_source: f.url_page }], formulaire: f, technologie: 'html' }
    }
    const r = await executer(mod, [sain, apparu(REP.captcha_apparu, 'captcha'), apparu(REP.robots_action_apparu, 'robots')])
    return { sain: r.lire(0), captcha: r.lire(1), robots: r.lire(2), ecritures: json(r.ecritures) + json(r.M.etat().prospects), source: src, imports }
  })
  await tente('JF-7', async () => {
    const pub = REP.pub.fait
    const v = async (x) => { const d = depsSimples(x); const r = await essayer(() => mod.verifierFait(cloner(pub), d)); return r.exception ? `exception ${r.exception}` : r.res }
    const sansJeton = await v({}), texteChange = await v({ jetonMeta: JETON, meta: 'texte-change' }), avecJeton = await v({ jetonMeta: JETON })
    const marque = principal.lire(2)
    const avec = await executer(mod, [C7(), C1()], { jetonMeta: JETON, console: true })
    const sources = { 'les écritures du magasin': json(avec.M.ecritures), 'les événements': json(avec.M.evenements), 'l\'état final du magasin': json(avec.M.etat()), 'la sortie console': avec.console, 'le bilan': json(avec.bilan) }
    const fuite = Object.entries(sources).filter(([, t]) => t.includes(JETON)).map(([k]) => k).join(', ')
    return { sansJeton, texteChange, avecJeton, marque, fuite }
  })
  await tente('JF-8', async () => {
    const r = await executer(mod, [C1()], { oppositions: [{ siren: S.S1 }] })
    return { p: r.lire(0), appels: r.rec.appels.filter((a) => a.hote === REP.conforme.hote || a.url.includes(S.S1)) }
  })
  await tente('JF-9', async () => {
    const lot = Array.from({ length: 20 }, (_, i) => ({ ...C1(), cle_dedup: `domaine:j1-lot-${String(i + 1).padStart(2, '0')}.invalid` }))
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    for (const p of lot) M.inserer(p)
    const rec = creerRecuperateur({ horloge: H })
    const debut = H.maintenant(), echeance = debut + 45_000
    const r = await essayer(() => mod.executerJugeFaits({ magasin: M, recuperer: rec, horloge: H, echeance, jetonMeta: null }))
    const parHote = {}
    for (const a of rec.appels) (parHote[a.hote] ??= []).push(a)
    return { reservations: M.ecritures.filter((w) => w.methode === 'reserver').map((w) => ({ limite: w.limite, ids: w.ids })), traites: M.ecritures.filter((w) => w.methode === 'mettreAJour').length, debut, fin: H.maintenant(), echeance, parHote, exception: r.exception }
  })
  obs['JF-10'] = { source: src, typecheck: typecheck(RAC, JUGE) }
  await tente('JF-11', async () => {
    const metaSeul = { cle_dedup: `page_meta:${REP.pub.page_bis}`, source: 'meta', cible: 'marque', siren: S.S7, domaine: REP.marque_bis.hote, page_meta: REP.pub.page_bis, entreprise: 'Savonnerie Témoin', froid: true, etape: 'recense', faits: [cloner(REP.pub.fait_bis)], canaux: [{ canal: 'formulaire_site', valeur: `https://${REP.marque_bis.hote}/contact`, url_source: `https://${REP.marque_bis.hote}/contact` }], formulaire: { ...cloner(REP.form_html), url_page: `https://${REP.marque_bis.hote}/contact`, url_action: `https://${REP.marque_bis.hote}/contact/envoyer` }, technologie: 'html' }
    const cas = []
    for (const [code, attendu] of [['190', 'jeton_invalide'], ['1357045', 'en_attente_identite'], ['613', 'limite']]) {
      const r = await executer(mod, [C7(), metaSeul], { jetonMeta: JETON, meta: `erreur-${code}` })
      cas.push({ code, attendu, exception: r.exception, avecSite: r.lire(0), ecrituresMetaSeul: r.ecritures.filter((w) => w.methode === 'mettreAJour' && w.id === r.ids[1]).map((w) => `${w.depuis}→${w.vers}`), requetesMeta: r.rec.appels.filter((a) => a.hote === 'graph.facebook.com').length, bilan: r.bilan })
    }
    return { cas }
  })
  await tente('JF-12', async () => {
    const p1 = C1(), p7 = C7()
    const envoi = (x = {}) => ({ prospect_id: 'prospect-temoin', type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: REP.conforme.formulaire.url_page, objet: null, texte: 'Texte Témoin', empreinte_texte: 'e'.repeat(64), modele_id: 'modele-temoin-v1', variante: 'A', fait_id: faitH1(p1).id, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: 'TEM001', ...x })
    const M = creerMagasin({ horloge: creerHorloge(T0) })
    const n0 = M.ecritures.length
    const cas = async (e, p, { surcharges = null, jetonMeta = null } = {}) => {
      const H = creerHorloge(T0)
      const rec = creerRecuperateur({ horloge: H, surcharges })
      const r = await essayer(() => mod.verifierAvantEnvoi(e, p, { magasin: M, recuperer: rec, horloge: H, jetonMeta }))
      return { res: r.res, exception: r.exception, appels: rec.appels }
    }
    const accueil = `https://${REP.conforme.hote}/`, contact = REP.conforme.formulaire.url_page, robots = `https://${REP.conforme.hote}/robots.txt`
    const x = {
      reponse: await cas(envoi({ type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@temoin-conforme.invalid', fait_id: null }), p1),
      lien_maquette: await cas(envoi({ type: 'lien_maquette', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@temoin-conforme.invalid', fait_id: null }), p1),
      relance: await cas(envoi({ type: 'relance', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@temoin-conforme.invalid', fait_id: null }), p1),
      ok: await cas(envoi(), p1),
      retouche: await cas(envoi(), p1, { surcharges: await modifiee(accueil, (c) => c.replace('depuis 1998', 'depuis 1999')) }),
      hcaptcha: await cas(envoi(), p1, { surcharges: await modifiee(contact, (c) => c.replace('</head>', '<script src="https://js.hcaptcha.invalid/1/api.js" async defer></script>\n</head>').replace('<p><input type="submit"', '<div class="h-captcha" data-sitekey="10000000-ffff-ffff-ffff-00000000temo"></div>\n<p><input type="submit"')) }),
      action: await cas(envoi(), p1, { surcharges: await modifiee(contact, (c) => c.replace('action="/contact/envoyer"', 'action="/contact/autre-envoi"')) }),
      robots: await cas(envoi(), p1, { surcharges: await modifiee(robots, () => 'User-agent: *\nDisallow: /contact/envoyer\n') }),
      pubSansJeton: await cas(envoi({ fait_id: REP.pub.fait.id, destinataire: `https://${CANDIDATS[6].candidat.domaine}/contact` }), p7),
      page500: await cas(envoi(), p1, { surcharges: (u) => (hoteDe(u) === REP.conforme.hote && cheminDe(u) === '/' ? { statut: 500, entetes: { 'content-type': 'text/html' }, corps: 'Erreur Témoin' } : null) }),
    }
    x.ecritures = M.ecritures.length - n0
    return x
  })
  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function jeuxLisibles() {
  const e = []
  // Chaque fait de site des prospects « recense » se retrouve mot pour mot dans sa page servie (sinon J1 aurait raison de
  // les rejeter, et le juge se tromperait) ; chaque canal formulaire_site vise une page qui porte un formulaire.
  let n = 0
  for (const c of CANDIDATS.filter((x) => x.recense)) {
    for (const f of c.recense.faits.filter((y) => y.type.startsWith('site_'))) { n++; if (!texteVisibleJuge(await servie(f.url)).includes(normaliser(f.extrait))) e.push(`${c.nom} : « ${court(f.extrait, 40)} » absent de ${f.url}`) }
    const form = c.recense.canaux.find((k) => k.canal === 'formulaire_site')
    if (!form || !/<form\b/.test(await servie(form.valeur))) e.push(`${c.nom} : pas de formulaire à ${form?.valeur}`)
  }
  // Les pages de JF-2 disent ce qu'elles prétendent, lues par la normalisation du juge.
  const t = async (c) => texteVisibleJuge(await servie(`https://temoin-faits.invalid${c}`))
  if (!(await t('/exact')).includes(normaliser(REP.faits_j1.exact))) e.push('/exact ne porte pas le fait')
  if ((await t('/retouche')).includes(normaliser(REP.faits_j1.exact))) e.push('/retouche porte le fait intact')
  if (!(await t('/apostrophe')).includes(normaliser(REP.faits_j1.apostrophe)) || !(await servie('https://temoin-faits.invalid/apostrophe')).includes('’')) e.push('/apostrophe n\'a pas l\'apostrophe courbe qui se normalise')
  if ((await t('/script')).includes(normaliser(REP.faits_j1.script)) || !(await servie('https://temoin-faits.invalid/script')).includes(REP.faits_j1.script)) e.push('/script ne cache pas le fait dans un script')
  // Pages « modifiées après le recensement » et API Meta factice.
  if (!(await servie(`https://${REP.captcha_apparu.hote}/contact`)).includes('g-recaptcha')) e.push('la page au captcha apparu ne porte pas de reCAPTCHA')
  if (!/Disallow: \/contact\/envoyer/.test(await servie(`https://${REP.robots_action_apparu.hote}/robots.txt`))) e.push('le robots.txt changé n\'interdit pas l\'action')
  const rec = creerRecuperateur({ horloge: creerHorloge(T0) })
  const ads = (x = '') => rec(`https://graph.facebook.com/v26.0/ads_archive?search_page_ids=[${REP.pub.page}]&ad_reached_countries=['FR']&access_token=${JETON}${x}`, {})
  const normal = JSON.parse((await ads()).corps)
  if (!json(normal).includes(REP.pub.texte)) e.push('ads_archive ne rend pas le texte de l\'annonce')
  const r2 = creerRecuperateur({ horloge: creerHorloge(T0), meta: 'texte-change' })
  if (json(JSON.parse((await r2(`https://graph.facebook.com/v26.0/ads_archive?search_page_ids=[${REP.pub.page}]&access_token=${JETON}`, {})).corps)).includes(REP.pub.texte)) e.push('la variante texte-change porte encore le texte')
  for (const code of ['190', '1357045', '613']) { const r3 = creerRecuperateur({ horloge: creerHorloge(T0), meta: `erreur-${code}` }); const p = await r3(`https://graph.facebook.com/v26.0/ads_archive?search_page_ids=[${REP.pub.page}]&access_token=${JETON}`, {}); if (p.statut !== 400 || JSON.parse(p.corps).error?.code !== Number(code)) e.push(`l'erreur ${code} n'est pas servie`) }
  if ((await creerRecuperateur({ horloge: creerHorloge(T0) })(`https://graph.facebook.com/v26.0/ads_archive?search_page_ids=[${REP.pub.page}]`, {})).statut !== 400) e.push('ads_archive sans jeton ne rend pas l\'erreur 190')
  return { e, detail: `${n} faits de site des prospects « recense » retrouvés mot pour mot dans leur page, pages /exact, /retouche, /apostrophe, /script conformes à leur rôle, captcha et robots.txt apparus, ads_archive factice (texte, texte changé, erreurs 190, 1357045, 613, jeton absent)` }
}

async function echantillons() {
  const p = (etape, x = {}) => ({ etape, raisons: [], canaux: [], faits: [], ...x })
  const form = { canal: 'formulaire_site', valeur: 'https://x.invalid/contact' }
  const imports = () => ({ noms: ['recupererPoli', 'robotsAutorise'], espace: false })
  const src = "import { recupererPoli, robotsAutorise } from './lecteurSite'\nimport { ficheParSiren, retenir } from './sirene'\n"
  const tcOk = { ok: true, detail: 'vert' }
  const appel = (u, t = T0) => ({ url: u, hote: hoteDe(u), entetes: { 'user-agent': UA }, t })
  const jf3 = () => ({ imports: imports(), urlsFaits: ['https://temoin-conforme.invalid/'], appels: [appel('https://temoin-conforme.invalid/')] })
  const jf6 = () => ({ sain: p('verifie', { canaux: [form] }), captcha: p('rejete', { raisons: ['formulaire_captcha'] }), robots: p('rejete', { raisons: ['formulaire_robots_txt'] }), ecritures: '[]', source: src, imports: imports() })
  const jf7 = () => ({ sansJeton: 'non_verifiable', texteChange: { verifie: 'absent' }, avecJeton: { verifie: 'ok' }, marque: p('verifie', { faits: [{ type: 'pub_meta', verifie: 'non_verifiable' }] }), fuite: '' })
  const jf9 = () => ({ reservations: [{ limite: 15, ids: Array(15).fill('x') }], traites: 12, debut: T0, fin: T0 + 44_000, echeance: T0 + 45_000, parHote: { 'temoin-conforme.invalid': [appel('a', T0), appel('b', T0 + 1000)] }, exception: null })
  const casOk = (code, attendu) => ({ code, attendu, exception: null, avecSite: p('verifie', { faits: [{ type: 'pub_meta', verifie: 'non_verifiable' }] }), ecrituresMetaSeul: [], requetesMeta: 1, bilan: { meta: attendu } })
  const jf11 = () => ({ cas: [casOk('190', 'jeton_invalide'), casOk('1357045', 'en_attente_identite'), casOk('613', 'limite')] })
  const r = (j1, raisons = [], appels = []) => ({ res: { j1, raisons }, exception: null, appels })
  const jf12 = () => ({ reponse: r('sans_objet'), lien_maquette: r('sans_objet'), relance: r('sans_objet'), ok: r('ok', [], [appel('https://temoin-conforme.invalid/robots.txt'), appel('https://temoin-conforme.invalid/', T0 + 1000), appel('https://temoin-conforme.invalid/contact', T0 + 2000)]), retouche: r('refus', ['fait_absent']), hcaptcha: r('refus', ['formulaire_captcha']), action: r('refus', ['formulaire_change']), robots: r('refus', ['formulaire_robots_txt']), pubSansJeton: r('refus', ['fait_non_verifiable']), page500: r('injoignable'), ecritures: 0 })
  const muter = (f, m) => { const x = f(); m(x); return x }
  return {
    'JF-2': [['conforme', { exact: { verifie: 'ok' }, retouche: 'absent', apostrophe: { verifie: 'ok' }, script: { verifie: 'absent' } }, false], ['le fait retouché d\'un mot jugé ok', { exact: 'ok', retouche: 'ok', apostrophe: 'ok', script: 'absent' }, true], ['le fait caché dans un script jugé ok', { exact: 'ok', retouche: 'absent', apostrophe: 'ok', script: 'ok' }, true], ['l\'apostrophe courbe jugée absente', { exact: 'ok', retouche: 'absent', apostrophe: 'absent', script: 'absent' }, true]],
    'JF-3': [['conforme', jf3(), false], ['import de lireSite', muter(jf3, (x) => { x.imports.noms.push('lireSite') }), true], ['lecteurSite importé en entier', muter(jf3, (x) => { x.imports.espace = true }), true], ['le fait non relu par J1', muter(jf3, (x) => { x.appels = [] }), true]],
    'JF-4': [['conforme', { p: p('rejete', { raisons: ['diffusion_partielle'] }) }, false], ['diffusion P vérifiée', { p: p('verifie') }, true]],
    'JF-5': [['conforme', { garde: p('verifie', { canaux: [form] }), seul: p('rejete', { raisons: ['aucun_canal_verifie'] }) }, false], ['le compte inventé gardé', { garde: p('verifie', { canaux: [form, { canal: 'instagram', valeur: 'temoin.invente' }] }), seul: p('rejete', { raisons: ['aucun_canal_verifie'] }) }, true], ['seul canal inventé, vérifié', { garde: p('verifie', { canaux: [form] }), seul: p('verifie') }, true]],
    'JF-6': [['conforme', jf6(), false], ['reCAPTCHA apparu, canal gardé', muter(jf6, (x) => { x.captcha = p('verifie', { canaux: [form] }) }), true], ['l\'adresse glissée écrite', muter(jf6, (x) => { x.ecritures = '[{"valeur":"glisse.temoin@temoin-conforme.invalid"}]' }), true], ['resoudreMx dans le source', muter(jf6, (x) => { x.source += 'const mx = resoudreMx(d)\n' }), true], ['import de lireFormulaire', muter(jf6, (x) => { x.imports.noms.push('lireFormulaire') }), true]],
    'JF-7': [['conforme', jf7(), false], ['pub_meta absent sans jeton', muter(jf7, (x) => { x.sansJeton = 'absent' }), true], ['texte changé jugé ok', muter(jf7, (x) => { x.texteChange = 'ok' }), true], ['le jeton dans la console', muter(jf7, (x) => { x.fuite = 'la sortie console' }), true]],
    'JF-8': [['conforme', { p: p('oppose'), appels: [] }, false], ['une requête partie', { p: p('oppose'), appels: [appel('https://temoin-conforme.invalid/')] }, true], ['vérifié malgré l\'opposition', { p: p('verifie'), appels: [] }, true]],
    'JF-9': [['conforme', jf9(), false], ['20 réservés', muter(jf9, (x) => { x.reservations = [{ limite: 20, ids: Array(20).fill('x') }] }), true], ['fini après l\'échéance', muter(jf9, (x) => { x.fin = T0 + 50_000 }), true], ['deux requêtes à 400 ms', muter(jf9, (x) => { x.parHote['temoin-conforme.invalid'][1].t = T0 + 400 }), true]],
    'JF-10': [['conforme', { source: src, typecheck: tcOk }, false], ['META_ADLIB_TOKEN', { source: `${src}const j = process.env.META_ADLIB_TOKEN\n`, typecheck: tcOk }, true], ['import de @/lib/agents/llm', { source: `import { creerLecteur } from '@/lib/agents/llm'\n${src}`, typecheck: tcOk }, true], ['typecheck rouge', { source: src, typecheck: { ok: false, detail: 'TS2345' } }, true]],
    'JF-11': [['conforme', jf11(), false], ['erreur 190 lue comme absent, prospect rejeté', muter(jf11, (x) => { x.cas[0].avecSite = p('rejete', { faits: [] }) }), true], ['le prospect « Meta seulement » écrit', muter(jf11, (x) => { x.cas[1].ecrituresMetaSeul = ['recense→rejete'] }), true], ['Meta interrogée à chaque fait', muter(jf11, (x) => { x.cas[2].requetesMeta = 2 }), true], ['bilan sans son état', muter(jf11, (x) => { x.cas[0].bilan = {} }), true]],
    'JF-12': [['conforme', jf12(), false], ['réponse : une requête partie', muter(jf12, (x) => { x.reponse.appels = [appel('https://temoin-conforme.invalid/')] }), true], ['page retouchée jugée ok', muter(jf12, (x) => { x.retouche = r('ok') }), true], ['action changée non vue', muter(jf12, (x) => { x.action = r('ok') }), true], ['page en 500 refusée', muter(jf12, (x) => { x.page500 = r('refus', ['fait_absent']) }), true], ['quatre requêtes', muter(jf12, (x) => { x.ok.appels.push(appel('https://temoin-conforme.invalid/cgu', T0 + 3000)) }), true], ['une écriture du magasin', muter(jf12, (x) => { x.ecritures = 1 }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — contrat et jeux d'essai du dépôt du juge (${rel(FIXTURES)})`)
if (o.autoControle) {
  try { const r = await jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try {
    const l = await scenarioMagasin()
    const manquantes = REGLES_JP6.filter((k) => !l.some((x) => x.cle === k))
    s.juger('AC-2', [...l.filter((x) => !x.ok).map((x) => `${x.nom} : obtenu ${court(json(x.obtenu), 80)}`), ...manquantes.map((k) => `règle ${k} absente du scénario`)], `magasin-memoire : ${l.length} règles vertes sur son scénario, dont les ${REGLES_JP6.length} de JP-6`)
  } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
  try {
    const E = await echantillons()
    const e = [], compte = { conformes: 0, fautifs: 0 }
    for (const id of IDS.slice(1)) {
      const liste = E[id]
      if (!liste || !liste.some(([, , rouge]) => rouge) || !liste.some(([, , rouge]) => !rouge)) { e.push(`${id} : pas d'échantillon conforme et fautif`); continue }
      for (const [nom, x, rouge] of liste) {
        let d
        try { d = C[id](x) } catch (err) { d = [`contrôle interrompu : ${premiereLigne(err)}`] }
        if (rouge && !d.length) e.push(`${id} : l'échantillon fautif « ${nom} » n'est pas repéré`)
        if (!rouge && d.length) e.push(`${id} : l'échantillon conforme « ${nom} » est refusé (${court(d[0], 100)})`)
        compte[rouge ? 'fautifs' : 'conformes']++
      }
    }
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles JF-2 à JF-12`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const f = path.join(RAC, 'lib', 'agents', 'acquisition', 'jugeFaits.ts')
  let mod = null
  const e1 = []
  if (!fs.existsSync(f)) e1.push(`module absent : ${rel(f)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/jugeFaits.ts') } catch (e) { e1.push(`jugeFaits.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod) for (const n of EXPORTS) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de jugeFaits.ts (ou pas une fonction)`)
  }
  s.juger('JF-1', e1, `jugeFaits.ts importé depuis ${rel(RAC)} : ${EXPORTS.join(', ')}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'JF-1 en échec')
  else {
    let obs
    try { obs = await observer(mod) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
    if (obs) for (const id of IDS.slice(1)) {
      const x = obs[id]
      if (!x) { s.echoue(id, 'non observé'); continue }
      if (x.exception && Object.keys(x).length === 1) { s.echoue(id, `interrompu : ${x.exception}`); continue }
      let d
      try { d = C[id](x) } catch (e) { d = [`contrôle interrompu : ${premiereLigne(e)}`] }
      s.juger(id, d, DETAILS[id] ?? 'conforme')
    }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
