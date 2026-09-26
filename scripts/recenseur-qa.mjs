// scripts/recenseur-qa.mjs — juge hors ligne du recenseur A8 (fiche 026-016), écrit par Claude Code AVANT les modules qu'il
// juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23 ; scripts/*-qa.mjs est dans son `interdit`).
//
//   node --import ./scripts/ts-loader.mjs scripts/recenseur-qa.mjs --partie=sirene|rge|site|orchestration[,…]
//        [--racine=<dossier>] [--auto-controle]
//
//   --partie=sirene         critères RS de 026-019 : lib/agents/acquisition/sirene.ts
//   --partie=rge            critères RG de 026-019 : lib/agents/acquisition/rge.ts
//   --partie=site           critères LS de 026-020 (réécrits par la voie gratuite) : lib/agents/acquisition/lecteurSite.ts
//   --partie=orchestration  critères RC de 026-022 : lib/agents/acquisition/recenseur.ts (RC-10 retiré par la voie gratuite)
//                           Plusieurs parties s'enchaînent (--partie=sirene,rge), dans l'ordre donné.
//   --racine=<d>            importe <d>/lib/agents/acquisition/<module>.ts par URL de fichier et lit les sources sous <d>
//                           (défaut : le dépôt). Le contrat et les jeux d'essai sont toujours ceux du dépôt du juge.
//   --auto-controle         seulement l'auto-contrôle : AC-1 les jeux d'essai se lisent et disent ce qu'ils prétendent ;
//                           AC-2 le magasin factice applique ses règles sur son propre scénario ; AC-3 chaque contrôle du
//                           juge repère son échantillon fautif et laisse passer son échantillon conforme. Aucun module jugé
//                           n'est importé.
//
// Signatures appelées (026-019, 026-020, 026-022) : ficheParSiren(siren, deps) ; retenir(resultat, cible) ;
// chercherEntreprise({ nom, code_postal }, cible, deps) ; importerRge({ recuperer, horloge, curseur, limite }) ;
// hoteAutorise(url, ips) ; robotsAutorise(texte, 'PrestiRecenseur', chemin) ; recupererPoli(url, deps) ;
// lireSite(domaine, deps) ; executerRecenseur({ magasin, recuperer, horloge, echeance }). deps = { recuperer, horloge,
// echeance } (le récupérateur factice et l'horloge virtuelle de scripts/fixtures/026-acquisition/). « La sortie » d'une
// unité SIRENE = ce que rend ficheParSiren ET ce que rend retenir : ni l'un ni l'autre ne porte les dirigeants.
// Un refus s'écrit { refus: '<code>' }. Le site « sans HTTPS » coupe le port 443 : le lecteur relit l'accueil en http.
// `curseur` et `curseur_suivant` d'importerRge sont la valeur du paramètre `after` (décodée, telle que la rend le `next` de
// l'API), jamais l'URL entière ; à la dernière page, `curseur_suivant` vaut null. Les mentions écrivent le SIRET par
// groupes, comme les vrais sites (« SIRET 900 000 019 00019 »). Le formulaire conforme est un Contact Form 7 réel : ses
// champs cachés (type=hidden, dans un bloc display:none) ne sont ni des champs du formulaire ni un pot de miel ; les
// champs comparés en LS-13 sont ceux qui ne sont ni hidden, ni submit, ni button.
//
// Sortie : une ligne par critère (« ✅ RS-3 … » ou « ❌ RS-3 … »), puis « recenseur-qa --partie=<p> : PASS|FAIL — … ».
// Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel est invalide. Un module absent fait échouer le premier critère
// de la partie (RS-1, RG-1, LS-1, RC-1) ; les suivants sont alors « non jugés » (en échec). Hors ligne : le piège réseau
// refuse tout fetch, toute connexion et toute résolution DNS du processus. Fuseau forcé à UTC (celui de Vercel et de
// l'usine). Écriture seulement sous .orchestre/travail/recenseur-qa/ (le cache de tsc).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe,
  corpsDeFonction, normaliser, contient, sansAccents, luhn, texteVisibleJuge, sansUrlsReseaux, refusDe, clesProfondes, court,
  premiereLigne, cloner, lireJson, decoderEntites,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerRecuperateur, FIXTURES } from './fixtures/026-acquisition/recuperateur-factice.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6 } from './fixtures/026-acquisition/magasin-memoire.mjs'

const JUGE = 'recenseur-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['partie'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const PARTIES = {
  sirene: { module: 'sirene.ts', ids: ['RS-1', 'RS-2', 'RS-3', 'RS-4', 'RS-5', 'RS-6', 'RS-7', 'RS-8', 'RS-9', 'RS-10', 'RS-11'] },
  rge: { module: 'rge.ts', ids: ['RG-1', 'RG-2', 'RG-3', 'RG-4', 'RG-5', 'RG-6', 'RG-7', 'RG-8'] },
  site: { module: 'lecteurSite.ts', ids: ['LS-1', 'LS-2', 'LS-3', 'LS-4', 'LS-5', 'LS-6', 'LS-7', 'LS-8', 'LS-9', 'LS-10', 'LS-11', 'LS-12', 'LS-13', 'LS-14', 'LS-15', 'LS-16'] },
  orchestration: { module: 'recenseur.ts', ids: ['RC-1', 'RC-2', 'RC-3', 'RC-4', 'RC-5', 'RC-6', 'RC-7', 'RC-8', 'RC-9', 'RC-11', 'RC-12', 'RC-13'] },
}
const parties = String(o.valeurs.partie ?? '').split(',').map((x) => x.trim()).filter(Boolean)
if (!parties.length || parties.some((p) => !PARTIES[p]) || new Set(parties).size !== parties.length) refuser(`--partie=sirene|rge|site|orchestration attendue, éventuellement plusieurs séparées par des virgules (reçu : ${o.valeurs.partie ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE} --partie=${parties.join(',')}${o.autoControle ? ' --auto-controle' : ''}`
const K = await importerContrat()
const REP = lireJson(path.join(FIXTURES, 'reperes.json'))
const CANDIDATS = lireJson(path.join(FIXTURES, 'candidats.json'))
const S = REP.siren
const UA = K.UA_RECENSEUR
const piege = piegerReseau()
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const J = 86_400_000

// ── Petits outils de jugement ───────────────────────────────────────────────────────────────────────────────────────────
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const ficheDe = (x) => (x && typeof x === 'object' && x.fiche && typeof x.fiche === 'object' ? x.fiche : x)
const estFiche = (x) => !!x && typeof x === 'object' && refusDe(x) === null
const ua = (a) => a.entetes?.['user-agent'] ?? null
const param = (url, k) => { try { return new URL(url).searchParams.get(k) } catch { return null } }
const chemin = (url) => { try { return new URL(url).pathname } catch { return '' } }
const hoteDe = (url) => { try { return new URL(url).hostname.toLowerCase() } catch { return '' } }
const ecarts = (appels) => appels.slice(1).map((a, i) => a.t - appels[i].t)
const memeCommune = (a, b) => sansAccents(String(a ?? '')).toLowerCase().replace(/[^a-z]/g, '') === sansAccents(String(b ?? '')).toLowerCase().replace(/[^a-z]/g, '')
/** Les défauts de lecture d'un source (commentaires ôtés) : process.env, fetch(, imports interdits. */
function defautsSource(src, { fetchPermis = false, interdits = [], seulsPermis = null } = {}) {
  const e = []
  const nu = sansCommentaires(src)
  if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('process.env lu')
  if (!fetchPermis && /\bfetch\s*\(/.test(nu)) e.push('fetch( appelé')
  for (const i of importsDe(src)) {
    if (!i.spec) { e.push(`import non littéral (${i.genre})`); continue }
    if (interdits.some((x) => i.spec === x || i.spec === `${x}.ts` || i.spec.startsWith(`${x}/index`))) e.push(`import interdit ${i.spec}`)
    if (/(^|\/)lib\/ai(\.ts)?$/.test(i.spec) && interdits.includes('@/lib/ai')) e.push(`import interdit ${i.spec}`)
    if (seulsPermis && !seulsPermis.some((x) => i.spec === x || i.spec === `${x}.ts`)) e.push(`import hors liste ${i.spec}`)
  }
  return [...new Set(e)]
}
const INTERDITS_LECTURE = ['@/lib/ai', '@/lib/supabaseAdmin', '@anthropic-ai/sdk', '@/lib/agents/llm']
let tcCache = null
const tc = () => (tcCache ??= typecheck(RAC, JUGE))
const lireSource = (fichier) => fs.readFileSync(path.join(RAC, 'lib', 'agents', 'acquisition', fichier), 'utf8')

/** Les modules de la partie, importés depuis --racine ; null si le premier critère échoue. */
async function importerModules(fichier, exports) {
  const f = path.join(RAC, 'lib', 'agents', 'acquisition', fichier)
  if (!fs.existsSync(f)) return { mod: null, echecs: [`module absent : ${rel(f)}`] }
  let mod
  try { mod = await importerDepuis(RAC, `lib/agents/acquisition/${fichier}`) } catch (e) { return { mod: null, echecs: [`${fichier} ne s'importe pas : ${premiereLigne(e)}`] } }
  const manquants = exports.filter((n) => typeof mod[n] !== 'function')
  return { mod: manquants.length ? null : mod, echecs: manquants.map((n) => `export ${n} absent de ${fichier} (ou pas une fonction)`) }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les contrôles : chacun est pur (observations → défauts) ; l'auto-contrôle leur donne des échantillons conformes et
// fautifs tirés des jeux d'essai, le mode normal des observations faites sur les modules de --racine.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const DIRIGEANTS_S1 = ['MARTIN TÉMOIN', 'PAUL MARTIN TÉMOIN']
const C = {
  // ── sirene ──
  'RS-2': (x) => {
    const e = []
    const f = ficheDe(x.fiche)
    if (!estFiche(f)) return [`actif, O, 43.22A : refus « ${refusDe(f) ?? json(f)} », une fiche attendue`]
    if (f.metier !== 'plombier') e.push(`metier ${json(f.metier)}, 'plombier' attendu`)
    if (!memeCommune(f.commune, 'NIORT')) e.push(`commune ${json(f.commune)}, NIORT attendue`)
    if (f.departement !== '79') e.push(`departement ${json(f.departement)}, '79' attendu`)
    for (const [nom, v] of [['ficheParSiren', x.brut], ['retenir', x.fiche]]) {
      if (clesProfondes(v).includes('dirigeants')) e.push(`la sortie de ${nom} porte la clé dirigeants`)
      for (const d of DIRIGEANTS_S1) if (contient(json(v), d)) e.push(`la sortie de ${nom} porte le nom du dirigeant « ${d} »`)
    }
    return e
  },
  'RS-3': (x) => {
    const attendu = { P: 'diffusion_partielle', C: 'inactif', siege: 'inactif', naf: 'hors_batiment' }
    return Object.entries(attendu).filter(([k, v]) => refusDe(ficheDe(x[k])) !== v).map(([k, v]) => `${k} : ${refusDe(ficheDe(x[k])) ?? 'retenu'}, ${v} attendu`)
  },
  'RS-4': (x) => [...(refusDe(ficheDe(x.res)) === null ? ['SIREN à la clé fausse : pas de refus'] : []), ...(x.appels ? [`${x.appels} appel(s) enregistré(s), zéro attendu`] : [])],
  'RS-5': (x) => {
    const e = []
    if (!estFiche(ficheDe(x.retente.res))) e.push(`429 puis 200 : ${refusDe(ficheDe(x.retente.res)) ?? json(x.retente.res)}, la fiche attendue`)
    if (x.retente.appels.length !== 2) e.push(`429 puis 200 : ${x.retente.appels.length} appel(s), 2 attendus (une seule nouvelle tentative)`)
    else if (x.retente.appels[1].t - x.retente.appels[0].t < 1000) e.push(`nouvelle tentative ${x.retente.appels[1].t - x.retente.appels[0].t} ms après le 429, 1 000 attendus`)
    if (refusDe(ficheDe(x.deux429.res)) !== 'limite_api') e.push(`429 deux fois : ${refusDe(ficheDe(x.deux429.res)) ?? 'retenu'}, limite_api attendu`)
    if (x.deux429.appels.length !== 2) e.push(`429 deux fois : ${x.deux429.appels.length} appel(s), 2 attendus`)
    if (x.coupure.exception) e.push(`coupure : exception « ${x.coupure.exception} »`)
    else if (refusDe(ficheDe(x.coupure.res)) !== 'injoignable') e.push(`coupure : ${refusDe(ficheDe(x.coupure.res)) ?? 'retenu'}, injoignable attendu`)
    for (const k of ['retente', 'deux429']) if (x[k].exception) e.push(`${k} : exception « ${x[k].exception} »`)
    return e
  },
  'RS-6': (x) => {
    const e = []
    if (!x.appels.length) return ['aucun appel enregistré']
    for (const a of x.appels) {
      if (a.hote !== 'recherche-entreprises.api.gouv.fr') e.push(`appel vers ${a.hote}`)
      if (ua(a) !== UA) e.push(`appel sans UA_RECENSEUR (${court(ua(a), 40)})`)
      const pp = param(a.url, 'per_page')
      if (pp !== null && !(Number(pp) <= 25)) e.push(`per_page=${pp}`)
    }
    const min = Math.min(...ecarts(x.appels))
    if (x.appels.length > 1 && min < 143) e.push(`deux appels espacés de ${min} ms virtuelles (143 au moins)`)
    return [...new Set(e)]
  },
  'RS-7': (x) => ['JEAN TÉMOIN'].filter((n) => contient(json(x.brut), n) || contient(json(x.fiche), n)).map((n) => `« ${n} » (nom de l'entrepreneur individuel) dans la sortie`).concat(estFiche(ficheDe(x.fiche)) ? [] : [`entrepreneur individuel : refus ${refusDe(ficheDe(x.fiche))}, une fiche attendue`]),
  'RS-8': (x) => Object.entries({ '20090': '2A', '20200': '2B', '97400': '974', '79000': '79' }).filter(([cp, d]) => ficheDe(x[cp])?.departement !== d).map(([cp, d]) => `${cp} → ${json(ficheDe(x[cp])?.departement ?? refusDe(ficheDe(x[cp])))}, ${d} attendu`),
  'RS-9': (x) => [
    ...(refusDe(ficheDe(x.deux)) !== 'ambigu' ? [`deux résultats retenus → ${refusDe(ficheDe(x.deux)) ?? 'une fiche'}, ambigu attendu`] : []),
    ...(!estFiche(ficheDe(x.un)) || ficheDe(x.un).siren !== S.S1 ? [`un seul résultat retenu → ${refusDe(ficheDe(x.un)) ?? `SIREN ${ficheDe(x.un)?.siren}`}, la fiche ${S.S1} attendue`] : []),
  ],
  'RS-10': (x) => [...defautsSource(x.source, { interdits: ['@/lib/ai', '@/lib/supabaseAdmin', '@anthropic-ai/sdk'] }), ...(x.typecheck.ok ? [] : [`typecheck : ${x.typecheck.detail}`])],
  'RS-11': (x) => {
    const attendu = { artisan11: 'trop_grand', artisanNN: null, artisan03: null, marque4711: null, marqueExclu: 'naf_exclu', marqueP: 'diffusion_partielle' }
    return Object.entries(attendu).filter(([k, v]) => (v === null ? !estFiche(ficheDe(x[k])) : refusDe(ficheDe(x[k])) !== v)).map(([k, v]) => `${k} : ${refusDe(ficheDe(x[k])) ?? 'retenu'}, ${v ?? 'retenu'} attendu`)
  },
  // ── rge ──
  'RG-2': (x) => {
    const e = []
    if (x.A.appels.length !== 2) e.push(`import complet : ${x.A.appels.length} appel(s), 2 pages attendues`)
    else {
      if (param(x.A.appels[0].url, 'after') !== null) e.push('la première page est demandée avec un curseur after')
      if (param(x.A.appels[1].url, 'after') !== REP.ademe.apres) e.push(`seconde page demandée avec after=${json(param(x.A.appels[1].url, 'after'))}, ${json(REP.ademe.apres)} (le curseur rendu par la première) attendu`)
    }
    if (x.A.res?.fini !== true || (x.A.res?.curseur_suivant ?? null) !== null) e.push(`dernière page : fini=${json(x.A.res?.fini)}, curseur_suivant=${json(x.A.res?.curseur_suivant)} (true et null attendus)`)
    if (x.B.appels.length !== 1) e.push(`limite 10 : ${x.B.appels.length} appel(s), 1 attendu`)
    if (x.B.res?.fini !== false || x.B.res?.curseur_suivant !== REP.ademe.apres) e.push(`limite 10 : fini=${json(x.B.res?.fini)}, curseur_suivant=${json(x.B.res?.curseur_suivant)} (false et ${json(REP.ademe.apres)} attendus)`)
    if ((x.B.res?.candidats ?? []).length > 10) e.push(`limite 10 : ${(x.B.res?.candidats ?? []).length} candidats`)
    if (x.C.appels.length < 1 || param(x.C.appels[0].url, 'after') !== REP.ademe.apres) e.push(`reprise au curseur : première requête avec after=${json(x.C.appels[0] && param(x.C.appels[0].url, 'after'))}`)
    if (x.C.res?.fini !== true) e.push('reprise au curseur : fini attendu à la dernière page')
    return e
  },
  'RG-3': (x) => {
    const c = x.A.res?.candidats
    if (!Array.isArray(c) || !c.length) return [`aucun candidat rendu (${court(json(x.A.res), 80)})`]
    const e = []
    for (const k of c) {
      if (!k.domaine || typeof k.domaine !== 'string') e.push(`candidat sans domaine : ${court(json(k), 80)}`)
      if (k.source !== 'ademe_rge' || k.cible !== 'artisan') e.push(`candidat source=${json(k.source)} cible=${json(k.cible)}`)
    }
    for (const s of [S.S16, S.S4]) if (c.some((k) => k.siren === s)) e.push(`la ligne au site vide (SIREN ${s}) a donné un candidat`)
    return [...new Set(e)]
  },
  'RG-4': (x) => {
    const c = x.A.res?.candidats ?? []
    const e = []
    for (const k of c) {
      const d = String(k.domaine ?? '')
      if (K.DOMAINES_EXCLUS.some((z) => d === z || d.endsWith(`.${z}`))) e.push(`domaine d'annuaire ou de plateforme : ${d}`)
      if (d !== d.toLowerCase() || /^www\./.test(d) || /[/:]/.test(d)) e.push(`domaine mal ramené : ${d}`)
    }
    for (const d of ['temoin-conforme.invalid', 'temoin-ei.invalid']) if (!c.some((k) => k.domaine === d)) e.push(`${d} absent (ramené depuis ${d === 'temoin-conforme.invalid' ? 'https://www.Temoin-Conforme.invalid/accueil' : 'HTTPS://Temoin-EI.invalid'})`)
    return e
  },
  'RG-5': (x) => {
    const c = x.A.res?.candidats ?? []
    const e = []
    const attendus = { 'temoin-conforme.invalid': S.S1, 'temoin-ei.invalid': S.SY, 'temoin-robots-ferme.invalid': S.S3, 'temoin-recaptcha-v2.invalid': S.S8, 'temoin-copyright-2016.invalid': S.S24 }
    for (const [d, s] of Object.entries(attendus)) { const k = c.find((y) => y.domaine === d); if (!k) e.push(`${d} absent`); else if (k.siren !== s) e.push(`${d} : SIREN ${json(k.siren)}, ${s} attendu`) }
    const sx = c.filter((k) => k.siren === S.SX).length
    if (sx !== 1) e.push(`deux établissements du SIREN ${S.SX} : ${sx} candidat(s), 1 attendu`)
    if (c.some((k) => k.siren === REP.siren_faux || k.domaine === 'temoin-luhn-faux.invalid')) e.push('le SIRET à la clé de Luhn fausse a donné un candidat')
    for (const k of c) if (!/^\d{9}$/.test(String(k.siren)) || !luhn(k.siren)) e.push(`SIREN mal formé : ${json(k.siren)}`)
    if (c.length !== 6) e.push(`${c.length} candidats, 6 attendus`)
    return [...new Set(e)]
  },
  'RG-6': (x) => {
    const e = []
    const t = json(x.A.res)
    for (const k of ['email', 'telephone', 'nom']) if (clesProfondes(x.A.res).includes(k)) e.push(`clé ${k} dans la sortie`)
    for (const v of x.valeurs) if (t.includes(v)) e.push(`valeur du jeu d'essai dans la sortie : ${v}`)
    if (contient(t, 'JEAN-PIERRE TÉMOIN')) e.push('nom de personne (« JEAN-PIERRE TÉMOIN ») dans la sortie')
    return [...new Set(e)]
  },
  'RG-7': (x) => {
    const e = []
    for (const run of [x.A, x.B, x.C]) {
      for (const a of run.appels) {
        if (a.hote !== 'data.ademe.fr') e.push(`appel vers ${a.hote}`)
        if (ua(a) !== UA) e.push('appel sans UA_RECENSEUR')
        const sz = param(a.url, 'size')
        if (sz !== null && !(Number(sz) <= 1000)) e.push(`size=${sz} (1 000 au plus)`)
      }
      const min = Math.min(...ecarts(run.appels))
      if (run.appels.length > 1 && min < 500) e.push(`deux requêtes espacées de ${min} ms virtuelles (2 par seconde au plus)`)
    }
    if (x.D.exception) e.push(`réponse 500 : exception « ${x.D.exception} »`)
    else if (refusDe(x.D.res) !== 'injoignable') e.push(`réponse 500 : ${court(json(x.D.res), 60)}, { refus: 'injoignable' } attendu`)
    return [...new Set(e)]
  },
  'RG-8': (x) => defautsSource(x.source, { seulsPermis: ['./contrat', '@/lib/facturation'] }),
  // ── site ──
  'LS-2': (x) => x.table.filter((c) => c.obtenu !== c.attendu).map((c) => `hoteAutorise(${c.url}, ${json(c.ips)}) → ${json(c.obtenu)}, ${c.attendu} attendu`),
  'LS-3': (x) => [
    ...x.table.filter((c) => c.obtenu !== c.attendu).map((c) => `robotsAutorise(« ${court(c.texte, 50)} », ${c.chemin}) → ${json(c.obtenu)}, ${c.attendu} attendu`),
    ...(x.r500.appels.length && x.r500.appels.every((a) => chemin(a.url) === '/robots.txt') ? [] : [`robots.txt en 500 : requêtes ${json(x.r500.appels.map((a) => chemin(a.url)))}, seule /robots.txt attendue`]),
    ...(x.ferme.appels.every((a) => chemin(a.url) === '/robots.txt') ? [] : [`robots.txt qui interdit PrestiRecenseur : page(s) demandée(s) ${json(x.ferme.appels.filter((a) => chemin(a.url) !== '/robots.txt').map((a) => chemin(a.url)))}`]),
    ...(x.etoile.appels.some((a) => chemin(a.url) !== '/robots.txt') ? [] : ['robots.txt qui interdit * mais permet PrestiRecenseur : aucune page lue']),
  ],
  'LS-4': (x) => {
    const e = []
    const ap = x.conforme.appels
    if (!ap.length) return ['aucune requête vers le site conforme']
    if (ap.length > 5) e.push(`${ap.length} requêtes (5 au plus : robots.txt + 4 pages)`)
    if (ap.some((a) => ua(a) !== UA)) e.push('requête sans UA_RECENSEUR')
    const min = Math.min(...ecarts(ap))
    if (ap.length > 1 && min < 1000) e.push(`deux requêtes au même hôte espacées de ${min} ms virtuelles (1 000 au moins)`)
    return e
  },
  'LS-5': (x) => {
    const e = []
    for (const [nom, l] of Object.entries(x.lectures)) {
      if (!l.appels.some((a) => a.hote !== 'autre-domaine-temoin.invalid' && a.hote !== '127.0.0.1')) e.push(`${nom} : aucune requête vers le site qui redirige (le lecteur n'a rien tenté)`)
      if (l.appels.some((a) => a.hote === 'autre-domaine-temoin.invalid')) e.push(`${nom} : requête vers l'autre domaine`)
      if (l.appels.some((a) => a.hote === '127.0.0.1')) e.push(`${nom} : requête vers 127.0.0.1`)
      if (l.appels.some((a) => chemin(a.url) === '/etape-4')) e.push(`${nom} : la page de la quatrième redirection est demandée`)
      if (contient(json(l.res?.faits ?? []), 'jamais lue')) e.push(`${nom} : un fait tiré d'une page qui ne devait pas être lue`)
    }
    return e
  },
  'LS-6': (x) => [
    ...(json(x.poli).includes('trop_gros') ? [] : [`recupererPoli sur la page de 2 Mo : ${court(json(x.poli), 80)}, trop_gros attendu`]),
    ...(contient(json(x.site.res?.faits ?? []), 'trop grosse') ? ['un fait tiré de la page de 2 Mo'] : []),
  ],
  'LS-7': (x) => {
    const e = []
    for (const f of x.faits) {
      if (!['site_titre', 'site_h1', 'site_intertitre'].includes(f.type)) continue
      const n = String(f.extrait ?? '').length
      if (n < K.EXTRAIT_MIN || n > K.EXTRAIT_MAX) e.push(`extrait de ${n} signes (${K.EXTRAIT_MIN} à ${K.EXTRAIT_MAX})`)
      const page = x.pages[f.url]
      if (page === undefined) e.push(`fait tiré d'une page inconnue du jeu d'essai : ${f.url}`)
      else if (!texteVisibleJuge(page).includes(normaliser(f.extrait))) e.push(`« ${court(f.extrait, 50)} » absent du texte visible de ${f.url}`)
      if (/pi[eè]ge/i.test(String(f.extrait))) e.push(`fait tiré d'un piège (script, style, noscript, template ou commentaire) : « ${court(f.extrait, 50)} »`)
    }
    if (x.faits.some((f) => normaliser(f.extrait).includes(normaliser(REP.h1_long).slice(0, 60)))) e.push('le h1 de 200 signes a donné un fait')
    if (!x.faits.some((f) => f.type === 'site_h1' && normaliser(f.extrait) === normaliser(REP.conforme.h1))) e.push('le h1 du site conforme n\'a donné aucun fait')
    return [...new Set(e)]
  },
  'LS-8': (x) => [
    ...x.lectures.filter((l) => !l.res || typeof l.res !== 'object').map((l) => `${l.hote} : lireSite rend ${json(l.res ?? l.exception)}, une lecture attendue`),
    ...x.lectures.filter((l) => sansUrlsReseaux(json(l.res)).includes('@')).map((l) => `${l.hote} : « @ » dans la sortie (${court((sansUrlsReseaux(json(l.res)).match(/[\w.+-]*@[\w.-]*/) || [''])[0], 50)})`),
    ...['mailto', 'data-cfemail', 'adressesNominatives', 'ADRESSES_GENERIQUES'].filter((m) => sansCommentaires(x.source).includes(m)).map((m) => `« ${m} » dans le source`),
  ],
  'LS-9': (x) => [...(x.conforme !== REP.siren.S1 ? [`SIRET des mentions → ${json(x.conforme)}, ${REP.siren.S1} attendu`] : []), ...(x.deux ? [`deux SIREN différents → ${json(x.deux)}, aucun attendu`] : [])],
  'LS-10': (x) => {
    const r = Array.isArray(x.reseaux) ? x.reseaux : []
    const e = []
    const accueil = (u) => ['https://temoin-conforme.invalid/', 'https://temoin-conforme.invalid'].includes(String(u))
    for (const c of [REP.conforme.instagram, REP.conforme.facebook]) {
      const t = r.find((y) => json(y).includes(c))
      if (!t) e.push(`${c} absent des réseaux`)
      else if (!accueil(t.url_source)) e.push(`${c} sans sa page source (url_source ${json(t.url_source)})`)
    }
    if (r.some((y) => /\/p\/|C0TEMOIN123|sharer/i.test(json(y)))) e.push('une publication (instagram.com/p/…) ou un partage (sharer.php) rendu comme compte')
    return e
  },
  'LS-11': (x) => x.lectures.flatMap((l) => [...(json(l.res).includes('annuaire') ? [] : [`${l.domaine} : ${court(json(l.res), 60)}, refus annuaire attendu`]), ...(l.appels.length ? [`${l.domaine} : ${l.appels.length} requête(s), zéro attendue`] : [])]),
  'LS-12': (x) => {
    const e = defautsSource(x.source, { fetchPermis: true, interdits: INTERDITS_LECTURE })
    const nu = sansCommentaires(x.source)
    const zones = corpsDeFonction(nu, 'recuperateurReseau')
    if (!zones.length) e.push('recuperateurReseau introuvable dans le source')
    for (const m of nu.matchAll(/\bfetch\s*\(/g)) if (!zones.some(([a, b]) => m.index >= a && m.index < b)) e.push(`fetch( hors de recuperateurReseau (ligne ${nu.slice(0, m.index).split('\n').length})`)
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return [...new Set(e)]
  },
  'LS-13': (x) => {
    const e = []
    const v = x.conforme.res?.verdict_formulaire, f = x.conforme.res?.formulaire
    if (v?.eligible !== true) e.push(`formulaire conforme : verdict ${json(v)}, eligible attendu`)
    const att = REP.conforme.formulaire
    if (!f) e.push('formulaire conforme non rendu')
    else {
      if (f.url_action !== att.url_action) e.push(`url_action ${json(f.url_action)}, ${att.url_action} attendue`)
      if (String(f.methode ?? '').toLowerCase() !== 'post') e.push(`methode ${json(f.methode)}`)
      if (f.technologie !== att.technologie) e.push(`technologie ${json(f.technologie)}, ${att.technologie} attendue`)
      if (f.telephone_requis !== false) e.push(`telephone_requis ${json(f.telephone_requis)}`)
      const vus = (f.champs ?? []).filter((c) => !['hidden', 'submit', 'button', 'reset', 'image'].includes(String(c.type).toLowerCase())).map((c) => ({ nom: c.nom, type: String(c.type).toLowerCase(), requis: !!c.requis, max: c.max ?? null }))
      const attendus = att.champs.map((c) => ({ nom: c.nom, type: c.type, requis: c.requis, max: c.max ?? null }))
      const cle = (c) => json([c.nom, c.type, c.requis, c.max])
      const a = new Set(attendus.map(cle)), b = new Set(vus.map(cle))
      for (const c of attendus) if (!b.has(cle(c))) e.push(`champ attendu ${cle(c)} absent ou différent`)
      for (const c of vus) if (!a.has(cle(c))) e.push(`champ en trop ou différent ${cle(c)}`)
    }
    const m = x.max200.res
    if (m?.verdict_formulaire?.eligible !== true || m?.formulaire?.longueur_max_message !== 200) e.push(`maxlength=200 : verdict ${json(m?.verdict_formulaire)}, longueur_max_message ${json(m?.formulaire?.longueur_max_message)} (eligible et 200 attendus)`)
    return e
  },
  'LS-14': (x) => x.variantes.filter((v) => !(v.res?.verdict_formulaire?.eligible === false && v.res?.verdict_formulaire?.raison === v.attendu)).map((v) => `${v.hote} → ${json(v.res?.verdict_formulaire ?? refusDe(v.res) ?? v.exception)}, ${v.attendu} attendu`),
  'LS-15': (x) => [
    ...[['action', x.action], ['page', x.page], ['tout fermé', x.ferme]].filter(([, l]) => l.res?.verdict_formulaire?.raison !== 'robots_txt').map(([n, l]) => `robots.txt qui interdit ${n} → ${json(l.res?.verdict_formulaire)}, robots_txt attendu`),
    ...(x.page.appels.some((a) => chemin(a.url).startsWith('/contact')) ? ['robots.txt qui interdit la page : la page du formulaire est demandée'] : []),
  ],
  'LS-16': (x) => {
    const e = []
    const faits = (l) => l.res?.faits ?? []
    const un = (l, type) => faits(l).filter((f) => f.type === type)
    const h = un(x.http, 'site_http')
    if (!h.length || !h.some((f) => /^http:\/\/temoin-sans-https\.invalid/i.test(String(f.extrait)))) e.push(`sans HTTPS : ${json(h.map((f) => f.extrait))}, un fait site_http d'extrait l'URL lue (http://temoin-sans-https.invalid/…) attendu`)
    const m = un(x.viewport, 'site_mobile')
    if (!m.length || !m.some((f) => normaliser(f.extrait) === 'Carrelage Témoin sans viewport')) e.push(`sans viewport : ${json(m.map((f) => f.extrait))}, un fait site_mobile d'extrait le titre attendu`)
    const c = un(x.copyright, 'site_copyright')
    if (!c.length || !c.some((f) => normaliser(f.extrait) === '© 2016')) e.push(`« © 2016 » : ${json(c.map((f) => f.extrait))}, un fait site_copyright d'extrait « © 2016 » attendu`)
    const conf = faits(x.conforme).filter((f) => ['site_http', 'site_mobile', 'site_copyright'].includes(f.type))
    if (conf.length) e.push(`le site conforme donne ${conf.map((f) => f.type).join(', ')}`)
    for (const f of [...m, ...c]) { const p = x.pages[f.url]; if (p === undefined || !texteVisibleJuge(p).includes(normaliser(f.extrait))) e.push(`${f.type} « ${court(f.extrait, 40)} » absent de sa page ${f.url}`) }
    return e
  },
  // ── orchestration ──
  'RC-2': (x) => {
    const e = []
    for (const c of CANDIDATS) {
      const p = x.etat.prospects.find((y) => y.cle_dedup === c.candidat.cle_dedup)
      const a = c.apres_a8
      if (!p) { e.push(`${c.nom} : absent du magasin`); continue }
      if (p.etape !== a.etape) { e.push(`${c.nom} : étape ${p.etape}, ${a.etape} attendue`); continue }
      const raisons = [...(p.raisons ?? []), p.raison].filter(Boolean)
      if (a.raison && !raisons.includes(a.raison)) e.push(`${c.nom} : raisons ${json(raisons)}, ${a.raison} attendue`)
      if (a.siren && p.siren !== a.siren) e.push(`${c.nom} : SIREN ${json(p.siren)}, ${a.siren} attendu`)
      if (a.metier && p.metier !== a.metier) e.push(`${c.nom} : metier ${json(p.metier)}, ${a.metier} attendu`)
      if (a.cible && p.cible !== a.cible) e.push(`${c.nom} : cible ${json(p.cible)}, ${a.cible} attendue`)
      if (a.canal && !(p.canaux ?? []).some((k) => k.canal === a.canal.canal && k.valeur === a.canal.valeur)) e.push(`${c.nom} : pas de canal ${a.canal.canal} de valeur ${a.canal.valeur}`)
    }
    return e
  },
  'RC-3': (x) => {
    const p = x.etat.prospects.find((y) => y.cle_dedup === 'domaine:temoin-oppose.invalid')
    return [...(p?.etape === 'oppose' ? [] : [`candidat en opposition : étape ${p?.etape}, oppose attendue`]), ...(x.appels.some((a) => a.hote === 'temoin-oppose.invalid') ? ['requête vers le domaine du candidat en opposition'] : [])]
  },
  'RC-4': (x) => {
    const e = []
    const r = x.reservations
    if (!r.length) e.push('aucune réservation')
    if (r.some((y) => y.limite > 15 || y.ids.length > 15)) e.push(`réservation au-delà de 15 : ${json(r.map((y) => [y.limite, y.ids.length]))}`)
    if (x.bilan?.arrete_par_echeance !== true) e.push(`arrete_par_echeance ${json(x.bilan?.arrete_par_echeance)}, true attendu`)
    if (x.fin > x.echeance + 3000) e.push(`fin à ${(x.fin - x.debut) / 1000} s virtuelles (échéance à ${(x.echeance - x.debut) / 1000} s, une requête de 3 s de marge)`)
    if (x.nonTraites.some((p) => p.etape !== 'candidat')) e.push(`non traité hors de « candidat » : ${json(x.nonTraites.filter((p) => p.etape !== 'candidat').map((p) => p.etape))}`)
    if (!x.nonTraites.length) e.push('tous les candidats traités : l\'échéance n\'a pas arrêté l\'exécution')
    if (x.nonTraites.some((p) => !x.repris.includes(p.id))) e.push('un candidat non traité n\'est pas repris après l\'expiration du bail')
    return e
  },
  'RC-5': (x) => [
    ...(x.exception ? [`exécution interrompue : ${x.exception}`] : []),
    ...(x.bon !== 'recense' ? [`le candidat sain : ${x.bon}, recense attendu (la panne d'un autre ne doit pas l'empêcher)`] : []),
    ...(x.panne !== 'a_decider' ? [`candidat en panne après trois exécutions : ${x.panne}, a_decider attendu`] : []),
    ...(x.ecrituresPanne.length ? [`le module a écrit pour le candidat en panne : ${json(x.ecrituresPanne)}`] : []),
  ],
  'RC-6': (x) => {
    const e = []
    if (x.evenements.length !== 1) e.push(`${x.evenements.length} événement(s) du recenseur, 1 attendu`)
    for (const ev of x.evenements) { if (ev.agent !== 'recenseur') e.push(`agent ${ev.agent}`); if (String(ev.resume ?? '').length > 200) e.push('resume de plus de 200 signes') }
    const t = `${json(x.evenements.map((ev) => ev.resume))} ${json(x.bilan)}`
    for (const v of x.interdits) if (contient(t, v)) e.push(`« ${court(v, 40)} » dans le résumé ou le bilan`)
    return [...new Set(e)]
  },
  'RC-7': (x) => { const p = x.etat.prospects.find((y) => y.cle_dedup === 'domaine:temoin-poitevine.invalid'); return p?.froid === false && p?.etape === 'recense' ? [] : [`page « Témoin Filiot » : étape ${p?.etape}, froid ${json(p?.froid)} (recense et false attendus)`] },
  'RC-8': (x) => { const p = x.etat.prospects.find((y) => y.cle_dedup === `page_meta:${REP.pub.page}`); return p?.etape !== 'recense' ? [`la marque au fait pub_meta : étape ${p?.etape}, recense attendue`] : (p?.faits ?? []).some((f) => json(f) === json(REP.pub.fait) || (f.id === REP.pub.fait.id && f.extrait === REP.pub.fait.extrait && f.url === REP.pub.fait.url && f.type === 'pub_meta' && f.annonce_id === REP.pub.annonce)) ? [] : ['le fait pub_meta apporté par la vigie n\'est pas conservé à l\'identique'] },
  'RC-9': (x) => [...defautsSource(x.source, { fetchPermis: true, interdits: ['@/lib/supabaseAdmin', '@/lib/ai', '@/lib/agents/llm'] }), ...(x.typecheck.ok ? [] : [`typecheck : ${x.typecheck.detail}`])],
  'RC-11': (x) => [
    ...(x.ordre.sirene < 0 ? ['aucun appel SIRENE pour le candidat ademe_rge'] : x.ordre.site >= 0 && x.ordre.site < x.ordre.sirene ? ['une requête vers le site du candidat ademe_rge part avant l\'appel à recherche-entreprises'] : []),
    ...(x.different?.etape !== 'rejete' || ![...(x.different?.raisons ?? [])].includes('siren_different') ? [`SIREN des mentions différent : ${x.different?.etape} ${json(x.different?.raisons)}, rejete siren_different attendu`] : []),
    ...(x.grand?.etape !== 'rejete' || ![...(x.grand?.raisons ?? [])].includes('trop_grand') ? [`tranche 11 : ${x.grand?.etape} ${json(x.grand?.raisons)}, rejete trop_grand attendu`] : []),
    ...(x.appelsGrand ? [`tranche 11 : ${x.appelsGrand} requête(s) vers son site, zéro attendue`] : []),
  ],
  'RC-12': (x) => {
    const e = []
    const c8 = x.etat.prospects.find((y) => y.cle_dedup === `siren:${S.S8}`)
    if (c8?.etape !== 'rejete' || !(c8?.raisons ?? []).includes('formulaire_captcha')) e.push(`formulaire à reCAPTCHA : ${c8?.etape} ${json(c8?.raisons)}, rejete formulaire_captcha attendu`)
    if (x.bilan?.abandons?.captcha !== 1) e.push(`bilan.abandons.captcha ${json(x.bilan?.abandons?.captcha)}, 1 attendu`)
    const c1 = x.etat.prospects.find((y) => y.cle_dedup === `siren:${S.S1}`)
    if (!(c1?.canaux ?? []).some((k) => k.canal === 'formulaire_site' && k.valeur === REP.conforme.formulaire.url_page)) e.push('formulaire conforme : pas de canal formulaire_site à l\'URL exacte de la page')
    if (!c1?.formulaire || c1?.formulaire?.url_action !== REP.conforme.formulaire.url_action) e.push(`formulaire conforme : formulaire ${court(json(c1?.formulaire), 60)} dans l'état`)
    if (c1?.technologie !== 'contact_form_7') e.push(`formulaire conforme : technologie ${json(c1?.technologie)}`)
    if (!(x.copyright?.faits ?? []).some((f) => f.type === 'site_copyright' && normaliser(f.extrait) === '© 2016')) e.push(`le prospect du site « © 2016 » : ${x.copyright?.etape}, faits ${json((x.copyright?.faits ?? []).map((f) => f.type))} (site_copyright attendu)`)
    return e
  },
  'RC-13': (x) => {
    const p = x.etat.prospects.find((y) => y.cle_dedup === `page_meta:${REP.pub.page}`)
    return [
      ...(p?.etape === 'recense' && p?.cible === 'marque' ? [] : [`la marque : ${p?.etape} cible ${json(p?.cible)}, recense et marque attendus`]),
      ...(sansUrlsReseaux(json(x.etat)).includes('@') ? [`« @ » dans l'état final du magasin (${court((sansUrlsReseaux(json(x.etat)).match(/[\w.+-]*@[\w.-]*/) || [''])[0], 50)})`] : []),
    ]
  },
}

/** Ce que chaque critère a vérifié, écrit sur sa ligne verte. */
const DETAILS = {
  'RS-2': "actif, O, 43.22A → plombier, NIORT, 79 ; ni la clé dirigeants ni un nom de dirigeant dans ce que rendent ficheParSiren et retenir",
  'RS-3': "diffusion P → diffusion_partielle, unité cessée → inactif, siège fermé → inactif, NAF 47.11F → hors_batiment",
  'RS-4': "SIREN à la clé de Luhn fausse → refus, zéro appel",
  'RS-5': "429 puis 200 → une seule nouvelle tentative, 1 000 ms virtuelles plus tard ; 429 deux fois → limite_api ; coupure → injoignable, sans exception",
  'RS-6': "chaque appel vers recherche-entreprises.api.gouv.fr, avec UA_RECENSEUR, per_page ≤ 25, espacé d'au moins 143 ms virtuelles",
  'RS-7': "« JEAN TÉMOIN » (entrepreneur individuel) absent de la sortie",
  'RS-8': "20090 → 2A, 20200 → 2B, 97400 → 974, 79000 → 79",
  'RS-9': "deux entreprises retenues → ambigu ; une seule → sa fiche",
  'RS-10': "ni process.env, ni @/lib/ai, @/lib/supabaseAdmin, @anthropic-ai/sdk, ni fetch( ; typecheck vert",
  'RS-11': "artisan tranche 11 → trop_grand ; NN et 03 retenus ; marque 47.11F tranche 11 retenue ; NAF exclu → naf_exclu ; marque en P → diffusion_partielle",
  'RG-2': "after de la première page renvoyé à la seconde ; dernière page : fini, curseur null ; limite 10 : une page, curseur rendu ; reprise au curseur",
  'RG-3': "lignes au site vide écartées ; chaque candidat a un domaine, source ademe_rge, cible artisan",
  'RG-4': "facebook.com, pagesjaunes.fr, linkedin.com écartés ; domaines en minuscules, sans www ni chemin",
  'RG-5': "SIREN = 9 premiers chiffres du SIRET ; deux établissements → un candidat ; clé de Luhn fausse écartée ; 6 candidats exacts",
  'RG-6': "ni clé email, telephone, nom, ni e-mail, téléphone ou nom de personne du jeu d'essai",
  'RG-7': "2 requêtes par seconde au plus, vers data.ademe.fr, avec UA_RECENSEUR, size ≤ 1 000 ; réponse 500 → injoignable sans exception",
  'RG-8': "ni process.env, ni fetch( ; imports : ./contrat et @/lib/facturation seulement",
  'LS-2': "14 hôtes privés ou bouclés refusés, une IP publique acceptée",
  'LS-3': "12 cas de la RFC 9309 ; robots.txt en 500 : seul robots.txt demandé ; fermé à PrestiRecenseur : aucune page ; fermé à * mais ouvert à PrestiRecenseur : pages lues",
  'LS-4': "site conforme : 5 requêtes au plus, UA_RECENSEUR, 1 000 ms virtuelles entre deux requêtes",
  'LS-5': "redirection vers un autre domaine, vers 127.0.0.1, quatrième redirection : page non lue, aucun fait",
  'LS-6': "page de 2 Mo → trop_gros, aucun fait",
  'LS-7': "chaque extrait (6 à 120 signes) retrouvé mot pour mot dans le texte visible calculé par le juge ; aucun piège (script, style, noscript, template, commentaire) ; h1 de 200 signes sans fait",
  'LS-8': "aucun « @ » hors URL de réseaux sur tous les sites d'essai ; ni mailto, data-cfemail, adressesNominatives, ADRESSES_GENERIQUES dans le source",
  'LS-9': "SIRET des mentions → le bon SIREN ; deux SIREN → aucun",
  'LS-10': "Instagram et Facebook du pied de page rendus avec leur page source ; ni /p/ ni sharer.php",
  'LS-11': "domaine d'annuaire → refus annuaire, zéro requête",
  'LS-12': "fetch( seulement dans recuperateurReseau ; ni process.env ni import interdit ; typecheck vert",
  'LS-13': "formulaire Contact Form 7 éligible, action, méthode, champs, requis, max et technologie exacts ; maxlength=200 éligible, longueur 200",
  'LS-14': "18 variantes d'abandon, chacune avec sa raison exacte",
  'LS-15': "robots.txt qui interdit l'action, la page (jamais demandée) ou tout → robots_txt",
  'LS-16': "site_http, site_mobile (le titre), site_copyright (« © 2016 ») ; aucun sur le site conforme ; extraits mot pour mot",
  'RC-2': "étape finale de chacun des huit candidats de candidats.json, avec SIREN, métier, cible, canal ou raison",
  'RC-3': "candidat en opposition : oppose, aucune requête vers son domaine",
  'RC-4': "20 candidats, 3 s par requête : 15 réservés au plus, arrêt avant l'échéance, non traités repris après le bail",
  'RC-5': "une panne du récupérateur n'empêche pas les autres ; après trois exécutions : a_decider, aucun faux rejete",
  'RC-6': "un événement du recenseur, résumé et bilan sans nom, domaine, adresse ni SIREN",
  'RC-7': "page « Témoin Filiot » : recense, froid = false",
  'RC-8': "le fait pub_meta de la vigie conservé à l'identique",
  'RC-9': "ni process.env, ni @/lib/supabaseAdmin, @/lib/ai, @/lib/agents/llm ; typecheck vert",
  'RC-11': "ademe_rge : SIRENE avant le site ; SIREN des mentions différent → siren_different ; tranche 11 → trop_grand sans lecture du site",
  'RC-12': "reCAPTCHA → formulaire_captcha et abandons.captcha = 1 ; formulaire conforme : canal à l'URL exacte, formulaire et technologie ; site_copyright porté",
  'RC-13': "la marque recensée en cible marque ; aucun « @ » dans l'état final du magasin",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les observations sur les modules de --racine
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const essayer = async (f) => { try { return { res: await f(), exception: null } } catch (e) { return { res: undefined, exception: premiereLigne(e) } } }

async function observerSirene(mod) {
  const H = creerHorloge(T0)
  let surcharge = null
  const rec = creerRecuperateur({ horloge: H, surcharges: (url, n) => (surcharge ? surcharge(url, n) : null) })
  const deps = { recuperer: rec, horloge: H }
  const sirene = (a) => a.hote === 'recherche-entreprises.api.gouv.fr'
  const pipeline = async (siren, cible) => {
    const brut = await mod.ficheParSiren(siren, deps)
    const fiche = refusDe(ficheDe(brut)) !== null ? brut : await mod.retenir(brut, cible)
    return { brut, fiche }
  }
  const P = async (siren, cible = 'artisan') => { try { return (await pipeline(siren, cible)).fiche } catch (e) { return { refus: `exception : ${premiereLigne(e)}` } } }
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const avant = () => rec.appels.length
  await tente('RS-2', async () => pipeline(S.S1, 'artisan'))
  await tente('RS-3', async () => ({ P: await P(S.S2), C: await P(S.S5), siege: await P(S.S9), naf: await P(S.S7) }))
  await tente('RS-4', async () => { const n = avant(); const r = await essayer(() => mod.ficheParSiren(REP.siren_faux, deps)); return { res: r.exception ? { refus: `exception ${r.exception}` } : r.res, appels: avant() - n } })
  const cas = async (fabriquer) => {
    const n = avant()
    surcharge = fabriquer()
    const r = await essayer(() => pipeline(S.S1, 'artisan'))
    surcharge = null
    return { res: r.res?.fiche, exception: r.exception, appels: rec.appels.slice(n).filter(sirene) }
  }
  const r429 = () => ({ statut: 429, entetes: { 'content-type': 'application/json', 'retry-after': '1' }, corps: JSON.stringify(lireJson(path.join(FIXTURES, 'sirene', 'reponse-429.json'))._reponse.corps) })
  await tente('RS-5', async () => {
    const retente = await cas(() => { let k = 0; return (url) => (hoteDe(url) === 'recherche-entreprises.api.gouv.fr' && k++ === 0 ? r429() : null) })
    H.avancer(2000)
    const deux429 = await cas(() => { let k = 0; return (url) => (hoteDe(url) === 'recherche-entreprises.api.gouv.fr' && k++ < 2 ? r429() : null) })
    H.avancer(2000)
    const coupure = await cas(() => (url) => (hoteDe(url) === 'recherche-entreprises.api.gouv.fr' ? { coupure: true } : null))
    return { retente, deux429, coupure }
  })
  await tente('RS-7', async () => pipeline(S.S11, 'artisan'))
  await tente('RS-8', async () => ({ '20090': await P(S.S12), '20200': await P(S.S13), '97400': await P(S.S14), '79000': await P(S.S1) }))
  await tente('RS-9', async () => ({
    deux: (await essayer(() => mod.chercherEntreprise({ nom: 'Menuiserie Témoin Double', code_postal: '44000' }, 'artisan', deps))).res,
    un: (await essayer(() => mod.chercherEntreprise({ nom: 'Plomberie Témoin Conforme', code_postal: '79000' }, 'artisan', deps))).res,
  }))
  await tente('RS-11', async () => ({ artisan11: await P(S.S15, 'artisan'), artisanNN: await P(S.S4, 'artisan'), artisan03: await P(S.S16, 'artisan'), marque4711: await P(S.S7, 'marque'), marqueExclu: await P(S.S17, 'marque'), marqueP: await P(S.S18, 'marque') }))
  obs['RS-6'] = { appels: rec.appels.filter(sirene) }
  obs['RS-10'] = { source: lireSource('sirene.ts'), typecheck: tc() }
  return obs
}

async function observerRge(mod) {
  const run = async ({ curseur = null, limite = 1000, ademe = 'normal' } = {}) => {
    const H = creerHorloge(T0)
    const rec = creerRecuperateur({ horloge: H, ademe })
    const r = await essayer(() => mod.importerRge({ recuperer: rec, horloge: H, curseur, limite }))
    return { res: r.res, exception: r.exception, appels: rec.appels }
  }
  const A = await run(), B = await run({ limite: 10 }), Cc = await run({ curseur: REP.ademe.apres }), D = await run({ ademe: 'panne' })
  const valeurs = []
  for (const p of ['page-1.json', 'page-2.json']) for (const l of lireJson(path.join(FIXTURES, 'ademe', p)).results) { if (l.email) valeurs.push(l.email); if (l.telephone) valeurs.push(l.telephone) }
  const base = { A, B, C: Cc, D, valeurs }
  return { 'RG-2': base, 'RG-3': base, 'RG-4': base, 'RG-5': base, 'RG-6': base, 'RG-7': base, 'RG-8': { source: lireSource('rge.ts') } }
}

/** Les pages d'essai servies (URL → HTML), lues par un récupérateur neuf : ce que le juge compare aux extraits. */
async function pagesDe(urls) {
  const rec = creerRecuperateur({ horloge: creerHorloge(T0) })
  const out = {}
  for (const u of new Set(urls)) { try { const p = await rec(u, {}); if (p.statut === 200) out[u] = p.corps } catch { /* coupure : page inconnue */ } }
  return out
}
async function observerSite(mod) {
  const cache = new Map()
  const lire = async (domaine) => {
    if (cache.has(domaine)) return cache.get(domaine)
    const H = creerHorloge(T0)
    const rec = creerRecuperateur({ horloge: H })
    const r = await essayer(() => mod.lireSite(domaine, { recuperer: rec, horloge: H, echeance: T0 + 10 * 60_000 }))
    const l = { domaine, hote: domaine, res: r.res, exception: r.exception, appels: rec.appels }
    cache.set(domaine, l)
    return l
  }
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  await tente('LS-2', async () => {
    const table = [
      ['http://localhost/', []], ['http://127.0.0.1/', []], ['http://169.254.169.254/latest/meta-data/', []], ['http://[::1]/', []],
      ['http://2130706433/', []], ['http://0x7f000001/', []], ['https://temoin-prive.invalid/', ['10.0.0.5']], ['https://temoin-prive.invalid/', ['192.168.1.10']],
      ['https://temoin-prive.invalid/', ['172.16.4.2']], ['https://temoin-prive.invalid/', ['100.64.0.1']], ['https://temoin-prive.invalid/', ['0.0.0.0']],
      ['https://temoin-prive.invalid/', ['fd12:3456::1']], ['https://temoin-prive.invalid/', ['fe80::1']], ['https://temoin-prive.invalid/', ['93.184.216.34', '10.1.2.3']],
    ].map(([url, ips]) => ({ url, ips, attendu: false }))
    table.push({ url: 'https://temoin-public.invalid/', ips: ['93.184.216.34'], attendu: true })
    for (const c of table) { try { c.obtenu = await mod.hoteAutorise(c.url, c.ips) } catch (e) { c.obtenu = `exception : ${premiereLigne(e)}` } }
    return { table }
  })
  await tente('LS-3', async () => {
    const R1 = 'User-agent: *\nDisallow: *.gif$\nDisallow: /example/\nAllow: /publications/\n\nUser-agent: PrestiRecenseur\nDisallow: /\nAllow: /example/page.html\nAllow: /example/allowed.gif\n'
    const R2 = 'User-agent: *\nDisallow: *.gif$\nDisallow: /example/\nAllow: /publications/\n'
    const R3 = 'User-agent: PrestiRecenseur\nAllow: /example/page/\nDisallow: /example/page/disallowed.gif\n'
    const R4 = 'User-agent: PrestiRecenseur\nDisallow: /page\nAllow: /page\n'
    const R5 = 'User-agent: prestirecenseur\nDisallow:\n\nUser-agent: *\nDisallow: /\n'
    const R6 = 'User-agent: *\nDisallow: /*/prive/\n'
    const table = [
      [R1, '/example/page.html', true], [R1, '/example/allowed.gif', true], [R1, '/example/autre.html', false],
      [R2, '/publications/rapport.html', true], [R2, '/example/page.html', false], [R2, '/images/logo.gif', false], [R2, '/images/logo.gifx', true],
      [R3, '/example/page/', true], [R3, '/example/page/disallowed.gif', false], [R4, '/page', true], [R5, '/tout', true],
    ].map(([texte, chemin, attendu]) => ({ texte, chemin, attendu }))
    table.push({ texte: R6, chemin: '/a/prive/x', attendu: false })
    for (const c of table) { try { c.obtenu = await mod.robotsAutorise(c.texte, 'PrestiRecenseur', c.chemin) } catch (e) { c.obtenu = `exception : ${premiereLigne(e)}` } }
    return { table, r500: await lire('temoin-robots-500.invalid'), ferme: await lire('temoin-robots-ferme.invalid'), etoile: await lire('temoin-robots-etoile.invalid') }
  })
  const conforme = await lire(REP.conforme.hote)
  await tente('LS-4', async () => ({ conforme }))
  await tente('LS-5', async () => ({ lectures: { ailleurs: await lire('temoin-redirige-ailleurs.invalid'), local: await lire('temoin-redirige-local.invalid'), boucle: await lire('temoin-redirige-boucle.invalid') } }))
  await tente('LS-6', async () => {
    const H = creerHorloge(T0)
    const rec = creerRecuperateur({ horloge: H })
    const p = await essayer(() => mod.recupererPoli('https://temoin-gros.invalid/', { recuperer: rec, horloge: H, echeance: T0 + 60_000 }))
    return { poli: p.exception ? `exception ${p.exception}` : p.res, site: await lire('temoin-gros.invalid') }
  })
  await tente('LS-7', async () => {
    const long = await lire('temoin-long.invalid')
    const faits = [...(conforme.res?.faits ?? []), ...(long.res?.faits ?? [])]
    return { faits, pages: await pagesDe(faits.map((f) => f.url)) }
  })
  const hotes = fs.readdirSync(path.join(FIXTURES, 'sites')).filter((h) => !h.startsWith('_')).sort()
  await tente('LS-8', async () => { const lectures = []; for (const h of hotes) lectures.push(await lire(h)); return { lectures, source: lireSource('lecteurSite.ts') } })
  await tente('LS-9', async () => ({ conforme: conforme.res?.siren ?? null, deux: (await lire('temoin-deux-siren.invalid')).res?.siren ?? null }))
  await tente('LS-10', async () => ({ reseaux: conforme.res?.reseaux }))
  await tente('LS-11', async () => {
    const lectures = []
    for (const d of ['pagesjaunes.fr', 'www.facebook.com']) { const H = creerHorloge(T0); const rec = creerRecuperateur({ horloge: H }); const r = await essayer(() => mod.lireSite(d, { recuperer: rec, horloge: H, echeance: T0 + 60_000 })); lectures.push({ domaine: d, res: r.exception ? `exception ${r.exception}` : r.res, appels: rec.appels }) }
    return { lectures }
  })
  obs['LS-12'] = { source: lireSource('lecteurSite.ts'), typecheck: tc() }
  await tente('LS-13', async () => ({ conforme, max200: await lire('temoin-maxlength-200.invalid') }))
  await tente('LS-14', async () => {
    const variantes = []
    for (const [hote, attendu] of Object.entries(VARIANTES)) { const l = await lire(hote); variantes.push({ hote, attendu, res: l.res, exception: l.exception }) }
    return { variantes }
  })
  await tente('LS-15', async () => ({ action: await lire('temoin-robots-action.invalid'), page: await lire('temoin-robots-page.invalid'), ferme: await lire('temoin-robots-ferme.invalid') }))
  await tente('LS-16', async () => {
    const x = { http: await lire('temoin-sans-https.invalid'), viewport: await lire('temoin-sans-viewport.invalid'), copyright: await lire('temoin-copyright-2016.invalid'), conforme }
    x.pages = await pagesDe(Object.values(x).flatMap((l) => (l.res?.faits ?? []).map((f) => f.url)))
    return x
  })
  return obs
}
const VARIANTES = {
  'temoin-recaptcha-v2.invalid': 'captcha', 'temoin-recaptcha-v3.invalid': 'captcha', 'temoin-hcaptcha.invalid': 'captcha', 'temoin-turnstile.invalid': 'captcha',
  'temoin-friendly-captcha.invalid': 'captcha', 'temoin-pot-de-miel.invalid': 'pot_de_miel', 'temoin-case-robot.invalid': 'case_robot', 'temoin-question.invalid': 'question_antispam',
  'temoin-pare-feu.invalid': 'pare_feu', 'temoin-wpforms.invalid': 'extension_antispam', 'temoin-akismet.invalid': 'extension_antispam', 'temoin-cleantalk.invalid': 'extension_antispam',
  'temoin-antispam-bee.invalid': 'extension_antispam', 'temoin-demarchage.invalid': 'refus_demarchage', 'temoin-cgu-robots.invalid': 'cgu_robots', 'temoin-telephone.invalid': 'telephone_requis',
  'temoin-motif-devis.invalid': 'motif_devis_seul', 'temoin-sans-formulaire.invalid': 'sans_formulaire',
}
/** La signature que chaque variante porte dans son jeu d'essai (AC-1 : la variante dit ce qu'elle prétend). */
const SIGNATURES = {
  'temoin-recaptcha-v2.invalid': 'g-recaptcha', 'temoin-recaptcha-v3.invalid': 'grecaptcha.execute', 'temoin-hcaptcha.invalid': 'h-captcha', 'temoin-turnstile.invalid': 'cf-turnstile',
  'temoin-friendly-captcha.invalid': 'frc-captcha', 'temoin-pot-de-miel.invalid': 'display:none', 'temoin-case-robot.invalid': 'Je ne suis pas un robot', 'temoin-question.invalid': 'Combien font 3 + 4',
  'temoin-pare-feu.invalid': 'cf-mitigated', 'temoin-wpforms.invalid': 'data-token=', 'temoin-akismet.invalid': 'akismet', 'temoin-cleantalk.invalid': 'cleantalk',
  'temoin-antispam-bee.invalid': 'antispam-bee', 'temoin-demarchage.invalid': 'Pas de démarchage', 'temoin-cgu-robots.invalid': 'extraction automatisée est interdite', 'temoin-telephone.invalid': 'name="telephone" maxlength="20" required',
  'temoin-motif-devis.invalid': '<option value="devis">', 'temoin-sans-formulaire.invalid': 'Appelez-nous',
}

async function observerOrchestration(mod) {
  const obs = {}
  const cand = (c) => cloner(c.candidat)
  // L'exécution principale : les huit candidats de candidats.json ; l'opposition de C5 posée après l'enregistrement.
  {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    await M.enregistrerCandidats(CANDIDATS.map(cand))
    M.poserEtat({ oppositions: CANDIDATS.filter((c) => c.opposition).map((c) => c.opposition) })
    const rec = creerRecuperateur({ horloge: H })
    const n0 = M.evenements.length
    const r = await essayer(() => mod.executerRecenseur({ magasin: M, recuperer: rec, horloge: H, echeance: T0 + 10 * 60_000 }))
    const etat = M.etat()
    const interdits = [...new Set([
      ...CANDIDATS.flatMap((c) => [c.candidat.entreprise, c.candidat.domaine, c.candidat.siren].filter(Boolean)),
      ...etat.prospects.flatMap((p) => [p.siren, p.domaine].filter(Boolean)),
      'contact@temoin-conforme.invalid', 'jean.temoin', 'Témoin Filiot',
    ])]
    const base = { etat, appels: rec.appels, bilan: r.res, exception: r.exception, evenements: M.evenements.slice(n0), interdits }
    for (const id of ['RC-2', 'RC-3', 'RC-6', 'RC-7', 'RC-8', 'RC-13']) obs[id] = base
    obs['RC-12'] = { ...base }
    if (r.exception) for (const id of ['RC-2', 'RC-3', 'RC-6', 'RC-7', 'RC-8', 'RC-12', 'RC-13']) obs[id] = { ...base, exception: r.exception }
  }
  // RC-12 : le prospect du site « © 2016 » (ademe_rge).
  {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    await M.enregistrerCandidats([{ cle_dedup: `siren:${S.S24}`, source: 'ademe_rge', cible: 'artisan', siren: S.S24, domaine: 'temoin-copyright-2016.invalid', entreprise: 'CARRELAGE TÉMOIN DE 2016', code_postal: '37000', faits: [], canaux: [], froid: true }])
    await essayer(() => mod.executerRecenseur({ magasin: M, recuperer: creerRecuperateur({ horloge: H }), horloge: H, echeance: T0 + 10 * 60_000 }))
    obs['RC-12'].copyright = M.etat().prospects[0]
  }
  // RC-4 : 20 candidats, 3 s virtuelles par requête, échéance à 45 s.
  {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    await M.enregistrerCandidats(Array.from({ length: 20 }, (_, i) => { const d = `temoin-lot-${String(i + 1).padStart(2, '0')}.invalid`; return { cle_dedup: `domaine:${d}`, source: 'manuel', cible: 'artisan', domaine: d, entreprise: `Plomberie Témoin du lot ${i + 1}`, faits: [], canaux: [], froid: true } }))
    const rec = creerRecuperateur({ horloge: H, coutMs: 3000 })
    const debut = H.maintenant(), echeance = debut + 45_000
    const r = await essayer(() => mod.executerRecenseur({ magasin: M, recuperer: rec, horloge: H, echeance }))
    const fin = H.maintenant()
    const reservations = M.ecritures.filter((w) => w.methode === 'reserver').map((w) => ({ limite: w.limite, ids: w.ids }))
    const traites = new Set(M.ecritures.filter((w) => w.methode === 'mettreAJour').map((w) => w.id))
    const nonTraites = M.etat().prospects.filter((p) => !traites.has(p.id))
    H.avancer(301_000)
    const repris = (await M.reserver('candidat', 20, 300)).map((p) => p.id)
    obs['RC-4'] = { reservations, bilan: r.exception ? { exception: r.exception } : r.res, debut, fin, echeance, nonTraites, repris }
  }
  // RC-5 : un candidat dont chaque requête lève une exception (ni coupure ni réponse), à côté d'un candidat sain ; trois
  // exécutions, le bail expiré entre chacune.
  {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    const c1 = CANDIDATS[0].candidat
    await M.enregistrerCandidats([cloner(c1), { cle_dedup: `siren:${S.S25}`, source: 'ademe_rge', cible: 'artisan', siren: S.S25, domaine: 'temoin-panne.invalid', entreprise: 'PLOMBERIE TÉMOIN EN PANNE', code_postal: '79000', faits: [], canaux: [], froid: true }])
    const idPanne = M.etat().prospects.find((p) => p.siren === S.S25).id
    const rec = creerRecuperateur({ horloge: H, exceptions: [(url) => url.includes(`q=${S.S25}`) || hoteDe(url) === 'temoin-panne.invalid'] })
    let exception = null, bon = null
    for (let i = 0; i < 3; i++) {
      const r = await essayer(() => mod.executerRecenseur({ magasin: M, recuperer: rec, horloge: H, echeance: H.maintenant() + 10 * 60_000 }))
      if (r.exception && !exception) exception = r.exception
      if (i === 0) bon = M.lireProspect(M.etat().prospects.find((p) => p.cle_dedup === c1.cle_dedup).id).etape
      H.avancer(301_000)
    }
    obs['RC-5'] = { exception, bon, panne: M.lireProspect(idPanne).etape, ecrituresPanne: M.ecritures.filter((w) => w.methode === 'mettreAJour' && w.id === idPanne).map((w) => `${w.depuis}→${w.vers}`) }
  }
  obs['RC-9'] = { source: lireSource('recenseur.ts'), typecheck: tc() }
  // RC-11 : SIRENE d'abord pour un ademe_rge ; SIREN des mentions différent ; tranche 11 sans lecture du site.
  {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    const base = (s, d, nom) => ({ cle_dedup: `siren:${s}`, source: 'ademe_rge', cible: 'artisan', siren: s, domaine: d, entreprise: nom, code_postal: '79000', faits: [], canaux: [], froid: true })
    await M.enregistrerCandidats([base(S.S1, REP.conforme.hote, 'PLOMBERIE TÉMOIN CONFORME'), base(S.S21, 'temoin-siren-different.invalid', 'PLOMBERIE TÉMOIN DE LA LISTE'), base(S.S15, 'temoin-trop-grand.invalid', 'PLOMBERIE TÉMOIN TROP GRANDE')])
    const rec = creerRecuperateur({ horloge: H })
    await essayer(() => mod.executerRecenseur({ magasin: M, recuperer: rec, horloge: H, echeance: T0 + 10 * 60_000 }))
    const i = (f) => rec.appels.findIndex(f)
    const etat = M.etat()
    const trouve = (s) => etat.prospects.find((p) => p.siren === s || p.cle_dedup === `siren:${s}`)
    obs['RC-11'] = {
      ordre: { sirene: i((a) => a.hote === 'recherche-entreprises.api.gouv.fr' && a.url.includes(S.S1)), site: i((a) => a.hote === REP.conforme.hote) },
      different: trouve(S.S21), grand: trouve(S.S15), appelsGrand: rec.appels.filter((a) => a.hote === 'temoin-trop-grand.invalid').length,
    }
  }
  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** Les jeux d'essai se lisent et disent ce qu'ils prétendent. → défauts */
async function jeuxLisibles() {
  const e = []
  const rec = creerRecuperateur({ horloge: creerHorloge(T0) })
  // SIRENE : chaque réponse enregistrée se lit, chaque SIREN porte une clé de Luhn juste ; le SIREN faux ne la porte pas.
  for (const f of fs.readdirSync(path.join(FIXTURES, 'sirene'))) {
    try { const o = lireJson(path.join(FIXTURES, 'sirene', f)); for (const r of o.results ?? []) if (!luhn(r.siren) || !luhn(r.siege.siret)) e.push(`sirene/${f} : ${r.siren} à la clé fausse`) } catch (err) { e.push(`sirene/${f} illisible : ${premiereLigne(err)}`) }
  }
  if (luhn(REP.siren_faux)) e.push('le SIREN faux des jeux d\'essai passe la clé de Luhn')
  const s1 = JSON.parse((await rec(`https://recherche-entreprises.api.gouv.fr/search?q=${S.S1}&per_page=1`, {})).corps)
  if (s1.results?.[0]?.siren !== S.S1 || !s1.results[0].dirigeants?.length) e.push('le récupérateur factice ne sert pas la fiche SIRENE de S1 avec ses dirigeants')
  // ADEME : deux pages chaînées par after.
  const p1 = JSON.parse((await rec(REP.ademe.base, {})).corps)
  const p2 = JSON.parse((await rec(`${REP.ademe.base}?after=${encodeURIComponent(REP.ademe.apres)}`, {})).corps)
  if (p1.results?.length !== 10 || new URL(p1.next).searchParams.get('after') !== REP.ademe.apres || p2.results?.length !== 4 || p2.next) e.push('les deux pages de l\'ADEME ne sont pas chaînées par after')
  // candidats.json : huit candidats, dont deux ademe_rge au moins et une marque ; cle_dedup conforme à 0096.
  if (CANDIDATS.length !== 8) e.push(`candidats.json : ${CANDIDATS.length} candidats, 8 attendus`)
  if (CANDIDATS.filter((c) => c.candidat.source === 'ademe_rge').length < 2 || CANDIDATS.filter((c) => c.candidat.cible === 'marque').length !== 1) e.push('candidats.json : deux ademe_rge et une marque attendus')
  for (const c of CANDIDATS) {
    if (!/^(siren|domaine|page_meta|instagram):.{2,160}$/.test(c.candidat.cle_dedup)) e.push(`${c.nom} : cle_dedup hors contrainte`)
    if (!c.apres_a8?.etape || !c.apres_j1?.etape) e.push(`${c.nom} : étape attendue après A8 ou après J1 absente`)
    if (!/Témoin/.test(c.candidat.entreprise) && !/TÉMOIN/.test(c.candidat.entreprise)) e.push(`${c.nom} : le nom ne contient pas « Témoin »`)
  }
  // Les sites : chaque variante porte sa signature ; le site conforme porte ses pièges ; la page de 2 Mo est fabriquée.
  for (const [h, sig] of Object.entries(SIGNATURES)) {
    const d = path.join(FIXTURES, 'sites', h)
    const tout = fs.readdirSync(d).map((f) => fs.readFileSync(path.join(d, f), 'utf8')).join('\n')
    if (!tout.includes(sig)) e.push(`${h} ne porte pas sa signature « ${sig} »`)
  }
  const acc = (await rec(`https://${REP.conforme.hote}/`, {})).corps
  for (const p of ['Promotion piège', 'document.write("<h1>', '<noscript>', '<template>', '<!-- <h1>', 'contact@temoin-conforme.invalid', 'instagram.com/p/', 'sharer.php']) if (!acc.includes(p)) e.push(`accueil conforme sans le piège « ${p} »`)
  const gros = await rec('https://temoin-gros.invalid/', {})
  if (gros.corps.length < 2 * 1024 * 1024) e.push('la page de 2 Mo n\'est pas fabriquée')
  const tronque = await rec('https://temoin-gros.invalid/', { maxOctets: 1024 * 1024 })
  if (!tronque.tronque) e.push('le récupérateur factice ne coupe pas à maxOctets')
  try { await rec('https://temoin-sans-https.invalid/', {}); e.push('temoin-sans-https.invalid répond en https') } catch { /* coupure attendue */ }
  const cf = /data-cfemail="([0-9a-f]+)"/.exec((await rec(`https://${REP.conforme.hote}/mentions-legales`, {})).corps)
  const decode = cf ? (() => { const k = parseInt(cf[1].slice(0, 2), 16); let s = ''; for (let i = 2; i < cf[1].length; i += 2) s += String.fromCharCode(parseInt(cf[1].slice(i, i + 2), 16) ^ k); return s })() : ''
  if (decode !== 'devis@temoin-conforme.invalid') e.push(`l'adresse codée par Cloudflare ne se décode pas (${decode})`)
  if (!texteVisibleJuge(acc).includes(normaliser(REP.conforme.h1)) || texteVisibleJuge(acc).includes('Promotion piège')) e.push('le texte visible du juge ne sépare pas le h1 du piège de script')
  if (REP.h1_long.length !== 200) e.push(`le h1 long fait ${REP.h1_long.length} signes, 200 attendus`)
  return { e, detail: `${fs.readdirSync(path.join(FIXTURES, 'sirene')).length} réponses SIRENE, 2 pages ADEME chaînées, ${CANDIDATS.length} candidats, ${Object.keys(SIGNATURES).length} variantes de formulaire signées, pièges du site conforme présents, page de 2 Mo fabriquée, adresse Cloudflare décodée (${decode})` }
}

/** Échantillons conformes et fautifs, par critère : chacun est construit sur les jeux d'essai. */
async function echantillons() {
  const sirene = (s) => lireJson(path.join(FIXTURES, 'sirene', `${s}.json`)).results[0]
  const ficheOk = (s, x = {}) => ({ siren: s, siret_siege: null, naf: '43.22A', metier: 'plombier', code_postal: '79000', commune: 'NIORT', departement: '79', entrepreneur_individuel: false, cree_le: '2012-03-01', ...x })
  const appelsSirene = (n, pas = 150, x = {}) => Array.from({ length: n }, (_, i) => ({ url: `https://recherche-entreprises.api.gouv.fr/search?q=${S.S1}&per_page=1`, hote: 'recherche-entreprises.api.gouv.fr', entetes: { 'user-agent': UA }, t: T0 + i * pas, ...x }))
  const brutS1 = (() => { const b = cloner(sirene(S.S1)); delete b.dirigeants; return b })()
  const srcPropre = "import type { Fait } from './contrat'\nimport { sirenValide } from '@/lib/facturation'\nexport async function ficheParSiren(s: string, deps: any) { return deps.recuperer(s, {}) }\n"
  const tcOk = { ok: true, detail: 'tsc vert' }
  const rgeRun = (x = {}) => ({ res: { candidats: [], curseur_suivant: null, fini: true }, exception: null, appels: [], ...x })
  const ademeAppel = (after, t, x = {}) => ({ url: `${REP.ademe.base}?size=1000${after ? `&after=${encodeURIComponent(after)}` : ''}`, hote: 'data.ademe.fr', entetes: { 'user-agent': UA }, t, ...x })
  const candidatsOk = [
    { source: 'ademe_rge', cible: 'artisan', siren: S.S1, domaine: 'temoin-conforme.invalid', metier: 'plombier', commune: 'NIORT', departement: '79' },
    { source: 'ademe_rge', cible: 'artisan', siren: S.SX, domaine: 'temoin-deux-etab.invalid', metier: null, commune: 'NIORT', departement: '79' },
    { source: 'ademe_rge', cible: 'artisan', siren: S.SY, domaine: 'temoin-ei.invalid', metier: null, commune: 'NIORT', departement: '79' },
    { source: 'ademe_rge', cible: 'artisan', siren: S.S3, domaine: 'temoin-robots-ferme.invalid', metier: null, commune: 'POITIERS', departement: '86' },
    { source: 'ademe_rge', cible: 'artisan', siren: S.S8, domaine: 'temoin-recaptcha-v2.invalid', metier: null, commune: 'ANGOULEME', departement: '16' },
    { source: 'ademe_rge', cible: 'artisan', siren: S.S24, domaine: 'temoin-copyright-2016.invalid', metier: null, commune: 'TOURS', departement: '37' },
  ]
  const rgeBon = () => ({
    A: rgeRun({ res: { candidats: cloner(candidatsOk), curseur_suivant: null, fini: true }, appels: [ademeAppel(null, T0), ademeAppel(REP.ademe.apres, T0 + 500)] }),
    B: rgeRun({ res: { candidats: cloner(candidatsOk).slice(0, 3), curseur_suivant: REP.ademe.apres, fini: false }, appels: [ademeAppel(null, T0)] }),
    C: rgeRun({ res: { candidats: cloner(candidatsOk).slice(3), curseur_suivant: null, fini: true }, appels: [ademeAppel(REP.ademe.apres, T0)] }),
    D: rgeRun({ res: { refus: 'injoignable' } }),
    valeurs: ['contact@temoin-conforme.invalid', '06 00 00 00 09'],
  })
  const muter = (f, m) => { const x = f(); m(x); return x }
  const lignesAdeme = lireJson(path.join(FIXTURES, 'ademe', 'page-1.json')).results
  // ── site ──
  const pageConf = (await pagesDe([`https://${REP.conforme.hote}/`]))[`https://${REP.conforme.hote}/`]
  const pagesConf = { [`https://${REP.conforme.hote}/`]: pageConf }
  const fait = (type, extrait, url = `https://${REP.conforme.hote}/`) => ({ id: 'x'.repeat(16), type, extrait, url, lu_le: '2026-10-14T08:00:00.000Z' })
  const faitsConf = [fait('site_titre', REP.conforme.titre), fait('site_h1', REP.conforme.h1), ...REP.conforme.h2s.slice(0, 3).map((h) => fait('site_intertitre', h))]
  const lecture = (hote, res, appels = []) => ({ domaine: hote, hote, res, exception: null, appels })
  const appelSite = (hote, chemin, t) => ({ url: `https://${hote}${chemin}`, hote, entetes: { 'user-agent': UA }, t })
  const resConf = () => ({ domaine: REP.conforme.hote, pages: [], faits: cloner(faitsConf), siren: S.S1, formulaire: cloner(REP.conforme.formulaire), verdict_formulaire: { eligible: true }, reseaux: [{ reseau: 'instagram', compte: 'temoin.plomberie', url: 'https://www.instagram.com/temoin.plomberie/', url_source: `https://${REP.conforme.hote}/` }, { reseau: 'facebook', compte: 'TemoinPlomberie', url: 'https://www.facebook.com/TemoinPlomberie', url_source: `https://${REP.conforme.hote}/` }] })
  const confLecture = () => lecture(REP.conforme.hote, resConf(), ['/robots.txt', '/', '/contact', '/mentions-legales', '/cgu'].map((c, i) => appelSite(REP.conforme.hote, c, T0 + i * 1000)))
  const verdict = (raison) => (raison ? { eligible: false, raison } : { eligible: true })
  const faitAudit = (type, extrait, url) => fait(type, extrait, url)
  const pageCop = (await pagesDe(['https://temoin-copyright-2016.invalid/']))['https://temoin-copyright-2016.invalid/']
  const pageVp = (await pagesDe(['https://temoin-sans-viewport.invalid/']))['https://temoin-sans-viewport.invalid/']
  const ls16 = () => ({
    http: lecture('temoin-sans-https.invalid', { faits: [faitAudit('site_http', 'http://temoin-sans-https.invalid/', 'http://temoin-sans-https.invalid/')] }),
    viewport: lecture('temoin-sans-viewport.invalid', { faits: [faitAudit('site_mobile', 'Carrelage Témoin sans viewport', 'https://temoin-sans-viewport.invalid/')] }),
    copyright: lecture('temoin-copyright-2016.invalid', { faits: [faitAudit('site_copyright', '© 2016', 'https://temoin-copyright-2016.invalid/')] }),
    conforme: confLecture(),
    pages: { 'https://temoin-copyright-2016.invalid/': pageCop, 'https://temoin-sans-viewport.invalid/': pageVp },
  })
  const srcLecteur = "import { UA_RECENSEUR } from './contrat'\nexport function recuperateurReseau() {\n  return async (url: string) => { const r = await fetch(url, { redirect: 'manual' }); return r }\n}\nexport function lireSite() { return null }\n"
  // Les adresses pièges des sites, une par une : chacune doit être repérée si elle sortait.
  const cfDecode = 'devis@temoin-conforme.invalid'
  const pieges = ['contact@temoin-conforme.invalid', 'jean.temoin@temoin-conforme.invalid', cfDecode, 'plomberie.temoin@gmail.com.invalid', 'webmaster@hebergeur-temoin.invalid', 'script.temoin@temoin-conforme.invalid']
  // ── orchestration ──
  const etatBon = () => {
    const prospects = CANDIDATS.map((c) => {
      const a = c.apres_a8
      return { ...cloner(c.candidat), etape: a.etape, raisons: a.raison ? [a.raison] : [], ...(a.siren ? { siren: a.siren } : {}), ...(a.metier ? { metier: a.metier } : {}), ...(a.cible ? { cible: a.cible } : {}), ...('froid' in a ? { froid: a.froid } : {}), ...(c.recense ? { ...cloner(c.recense) } : {}) }
    })
    return { prospects }
  }
  const baseOrch = () => ({ etat: etatBon(), appels: [], bilan: { reserves: 8, recense: 3, sans_canal: 1, rejete: 3, oppose: 1, erreurs: 0, duree_ms: 30000, arrete_par_echeance: false, abandons: { captcha: 1, robots_txt: 1 } }, exception: null, evenements: [{ agent: 'recenseur', type: 'passage', resume: '8 réservés, 3 recensés, 1 sans canal, 3 rejetés, 1 opposé' }], interdits: [...CANDIDATS.flatMap((c) => [c.candidat.entreprise, c.candidat.domaine, c.candidat.siren].filter(Boolean)), 'contact@temoin-conforme.invalid'] })
  const rc12 = () => ({ ...baseOrch(), copyright: { etape: 'recense', faits: [faitAudit('site_copyright', '© 2016', 'https://temoin-copyright-2016.invalid/')] } })
  const idsLot = Array.from({ length: 20 }, (_, i) => `prospect-${String(i + 1).padStart(4, '0')}`)
  const rc4 = () => ({ reservations: [{ limite: 15, ids: idsLot.slice(0, 15) }], bilan: { arrete_par_echeance: true, reserves: 15 }, debut: T0, fin: T0 + 42_000, echeance: T0 + 45_000, nonTraites: idsLot.slice(2).map((id) => ({ id, etape: 'candidat' })), repris: idsLot.slice() })
  const rc11 = () => ({ ordre: { sirene: 0, site: 1 }, different: { etape: 'rejete', raisons: ['siren_different'] }, grand: { etape: 'rejete', raisons: ['trop_grand'] }, appelsGrand: 0 })

  return {
    'RS-2': [['conforme', { brut: brutS1, fiche: ficheOk(S.S1) }, false], ['les dirigeants du jeu d\'essai dans la sortie brute', { brut: sirene(S.S1), fiche: ficheOk(S.S1) }, true], ['métier faux', { brut: brutS1, fiche: ficheOk(S.S1, { metier: 'chauffagiste' }) }, true], ['département faux', { brut: brutS1, fiche: ficheOk(S.S1, { departement: '97' }) }, true]],
    'RS-3': [['conforme', { P: { refus: 'diffusion_partielle' }, C: { refus: 'inactif' }, siege: { refus: 'inactif' }, naf: { refus: 'hors_batiment' } }, false], ['diffusion P retenue', { P: ficheOk(S.S2), C: { refus: 'inactif' }, siege: { refus: 'inactif' }, naf: { refus: 'hors_batiment' } }, true], ['siège fermé retenu', { P: { refus: 'diffusion_partielle' }, C: { refus: 'inactif' }, siege: ficheOk(S.S9), naf: { refus: 'hors_batiment' } }, true]],
    'RS-4': [['conforme', { res: { refus: 'siren_invalide' }, appels: 0 }, false], ['un appel parti', { res: { refus: 'siren_invalide' }, appels: 1 }, true], ['pas de refus', { res: ficheOk(REP.siren_faux), appels: 0 }, true]],
    'RS-5': [
      ['conforme', { retente: { res: { brut: brutS1, fiche: ficheOk(S.S1) }.fiche, appels: appelsSirene(2, 1000), exception: null }, deux429: { res: { refus: 'limite_api' }, appels: appelsSirene(2, 1000), exception: null }, coupure: { res: { refus: 'injoignable' }, appels: appelsSirene(1), exception: null } }, false],
      ['nouvelle tentative trop tôt', { retente: { res: ficheOk(S.S1), appels: appelsSirene(2, 500), exception: null }, deux429: { res: { refus: 'limite_api' }, appels: appelsSirene(2, 1000), exception: null }, coupure: { res: { refus: 'injoignable' }, appels: appelsSirene(1), exception: null } }, true],
      ['coupure qui lève', { retente: { res: ficheOk(S.S1), appels: appelsSirene(2, 1000), exception: null }, deux429: { res: { refus: 'limite_api' }, appels: appelsSirene(2, 1000), exception: null }, coupure: { res: undefined, appels: appelsSirene(1), exception: 'ECONNRESET' } }, true],
    ],
    'RS-6': [['conforme', { appels: appelsSirene(4, 150) }, false], ['sans UA', { appels: appelsSirene(2, 150, { entetes: {} }) }, true], ['per_page 50', { appels: appelsSirene(2, 150, { url: `https://recherche-entreprises.api.gouv.fr/search?q=${S.S1}&per_page=50` }) }, true], ['deux appels à 100 ms', { appels: appelsSirene(2, 100) }, true]],
    'RS-7': [['conforme', { brut: (() => { const b = cloner(sirene(S.S11)); delete b.nom_complet; delete b.nom_raison_sociale; return b })(), fiche: ficheOk(S.S11, { entrepreneur_individuel: true }) }, false], ['le nom de l\'entrepreneur individuel du jeu d\'essai', { brut: sirene(S.S11), fiche: ficheOk(S.S11) }, true], ['dénomination = nom de la personne', { brut: {}, fiche: ficheOk(S.S11, { denomination: 'Jean Témoin' }) }, true]],
    'RS-8': [['conforme', { '20090': ficheOk(S.S12, { departement: '2A' }), '20200': ficheOk(S.S13, { departement: '2B' }), '97400': ficheOk(S.S14, { departement: '974' }), '79000': ficheOk(S.S1) }, false], ['Corse en 20', { '20090': ficheOk(S.S12, { departement: '20' }), '20200': ficheOk(S.S13, { departement: '2B' }), '97400': ficheOk(S.S14, { departement: '974' }), '79000': ficheOk(S.S1) }, true], ['outre-mer en 97', { '20090': ficheOk(S.S12, { departement: '2A' }), '20200': ficheOk(S.S13, { departement: '2B' }), '97400': ficheOk(S.S14, { departement: '97' }), '79000': ficheOk(S.S1) }, true]],
    'RS-9': [['conforme', { deux: { refus: 'ambigu' }, un: ficheOk(S.S1) }, false], ['deux retenus, une fiche rendue', { deux: ficheOk(S.S19), un: ficheOk(S.S1) }, true], ['un seul, introuvable', { deux: { refus: 'ambigu' }, un: { refus: 'introuvable' } }, true]],
    'RS-10': [['conforme', { source: srcPropre, typecheck: tcOk }, false], ['process.env', { source: `${srcPropre}const k = process.env.CLE\n`, typecheck: tcOk }, true], ['import de @/lib/ai', { source: `import { ask } from '@/lib/ai'\n${srcPropre}`, typecheck: tcOk }, true], ['fetch(', { source: `${srcPropre}await fetch('https://x.invalid/')\n`, typecheck: tcOk }, true], ['typecheck rouge', { source: srcPropre, typecheck: { ok: false, detail: 'error TS2322' } }, true], ['fetch( dans un commentaire seulement', { source: `${srcPropre}// fetch( jamais ici\n`, typecheck: tcOk }, false]],
    'RS-11': [['conforme', { artisan11: { refus: 'trop_grand' }, artisanNN: ficheOk(S.S4), artisan03: ficheOk(S.S16), marque4711: ficheOk(S.S7), marqueExclu: { refus: 'naf_exclu' }, marqueP: { refus: 'diffusion_partielle' } }, false], ['tranche 11 retenue', { artisan11: ficheOk(S.S15), artisanNN: ficheOk(S.S4), artisan03: ficheOk(S.S16), marque4711: ficheOk(S.S7), marqueExclu: { refus: 'naf_exclu' }, marqueP: { refus: 'diffusion_partielle' } }, true], ['marque 47.11F refusée', { artisan11: { refus: 'trop_grand' }, artisanNN: ficheOk(S.S4), artisan03: ficheOk(S.S16), marque4711: { refus: 'hors_batiment' }, marqueExclu: { refus: 'naf_exclu' }, marqueP: { refus: 'diffusion_partielle' } }, true]],
    'RG-2': [['conforme', rgeBon(), false], ['seconde page sans after', muter(rgeBon, (x) => { x.A.appels[1] = ademeAppel(null, T0 + 500) }), true], ['fini faux à la dernière page', muter(rgeBon, (x) => { x.A.res.fini = false }), true], ['limite ignorée', muter(rgeBon, (x) => { x.B.appels.push(ademeAppel(REP.ademe.apres, T0 + 500)) }), true]],
    'RG-3': [['conforme', rgeBon(), false], ['candidat sans domaine', muter(rgeBon, (x) => { x.A.res.candidats.push({ source: 'ademe_rge', cible: 'artisan', siren: S.S16, domaine: '' }) }), true]],
    'RG-4': [['conforme', rgeBon(), false], ['domaine d\'annuaire', muter(rgeBon, (x) => { x.A.res.candidats.push({ source: 'ademe_rge', cible: 'artisan', siren: S.S13, domaine: 'pagesjaunes.fr' }) }), true], ['domaine avec www et chemin', muter(rgeBon, (x) => { x.A.res.candidats[0].domaine = 'www.temoin-conforme.invalid/accueil' }), true]],
    'RG-5': [['conforme', rgeBon(), false], ['deux candidats pour un SIREN', muter(rgeBon, (x) => { x.A.res.candidats.push({ ...x.A.res.candidats[1], domaine: 'temoin-deux-etab-bis.invalid' }) }), true], ['SIREN de 14 chiffres', muter(rgeBon, (x) => { x.A.res.candidats[0].siren = REP.siret.S1 }), true], ['SIRET à la clé fausse gardé', muter(rgeBon, (x) => { x.A.res.candidats.push({ source: 'ademe_rge', cible: 'artisan', siren: REP.siren_faux, domaine: 'temoin-luhn-faux.invalid' }) }), true]],
    'RG-6': [['conforme', rgeBon(), false], ['les lignes brutes de l\'ADEME (e-mail, téléphone)', muter(rgeBon, (x) => { x.A.res.candidats = cloner(lignesAdeme); x.valeurs = lignesAdeme.flatMap((l) => [l.email, l.telephone]).filter(Boolean) }), true], ['nom de la personne', muter(rgeBon, (x) => { x.A.res.candidats[2].entreprise = lignesAdeme[9].nom_entreprise }), true]],
    'RG-7': [['conforme', rgeBon(), false], ['deux requêtes à 400 ms', muter(rgeBon, (x) => { x.A.appels[1].t = T0 + 400 }), true], ['size=5000', muter(rgeBon, (x) => { x.A.appels[0].url = `${REP.ademe.base}?size=5000` }), true], ['500 qui lève', muter(rgeBon, (x) => { x.D = { res: undefined, exception: 'HTTP 500', appels: [] } }), true]],
    'RG-8': [['conforme', { source: "import { DOMAINES_EXCLUS } from './contrat'\nimport { sirenValide } from '@/lib/facturation'\n" }, false], ['import hors liste', { source: "import { DOMAINES_EXCLUS } from './contrat'\nimport x from 'node:https'\n" }, true], ['fetch(', { source: "import { DOMAINES_EXCLUS } from './contrat'\nconst r = await fetch(u)\n" }, true]],
    'LS-2': [['conforme', { table: [{ url: 'http://169.254.169.254/', ips: [], attendu: false, obtenu: false }, { url: 'https://temoin-public.invalid/', ips: ['93.184.216.34'], attendu: true, obtenu: true }] }, false], ['169.254.169.254 accepté', { table: [{ url: 'http://169.254.169.254/', ips: [], attendu: false, obtenu: true }] }, true]],
    'LS-3': [
      ['conforme', { table: [{ texte: 'User-agent: *', chemin: '/', attendu: true, obtenu: true }], r500: lecture('temoin-robots-500.invalid', {}, [appelSite('temoin-robots-500.invalid', '/robots.txt', T0)]), ferme: lecture('temoin-robots-ferme.invalid', {}, [appelSite('temoin-robots-ferme.invalid', '/robots.txt', T0)]), etoile: lecture('temoin-robots-etoile.invalid', {}, [appelSite('temoin-robots-etoile.invalid', '/robots.txt', T0), appelSite('temoin-robots-etoile.invalid', '/', T0 + 1000)]) }, false],
      ['page lue malgré un robots.txt en 500', { table: [], r500: lecture('temoin-robots-500.invalid', {}, [appelSite('temoin-robots-500.invalid', '/robots.txt', T0), appelSite('temoin-robots-500.invalid', '/', T0 + 1000)]), ferme: lecture('x', {}, []), etoile: lecture('y', {}, [appelSite('y', '/', T0)]) }, true],
      ['une règle de la RFC mal lue', { table: [{ texte: 'User-agent: PrestiRecenseur\nDisallow: /page\nAllow: /page', chemin: '/page', attendu: true, obtenu: false }], r500: lecture('a', {}, [appelSite('a', '/robots.txt', T0)]), ferme: lecture('b', {}, []), etoile: lecture('c', {}, [appelSite('c', '/', T0)]) }, true],
    ],
    'LS-4': [['conforme', { conforme: confLecture() }, false], ['requêtes à 999 ms', { conforme: muter(confLecture, (l) => { l.appels[2].t = l.appels[1].t + 999 }) }, true], ['six requêtes', { conforme: muter(confLecture, (l) => { l.appels.push(appelSite(REP.conforme.hote, '/realisations', T0 + 9000)) }) }, true], ['sans UA', { conforme: muter(confLecture, (l) => { l.appels[0].entetes = {} }) }, true]],
    'LS-5': [['conforme', { lectures: { ailleurs: lecture('a', { faits: [] }, [appelSite('temoin-redirige-ailleurs.invalid', '/', T0)]) } }, false], ['l\'autre domaine lu', { lectures: { ailleurs: lecture('a', { faits: [fait('site_h1', 'Page d\'un autre domaine Témoin jamais lue', 'https://autre-domaine-temoin.invalid/')] }, [appelSite('autre-domaine-temoin.invalid', '/', T0)]) } }, true], ['quatrième redirection suivie', { lectures: { boucle: lecture('b', { faits: [] }, [appelSite('temoin-redirige-boucle.invalid', '/etape-4', T0)]) } }, true]],
    'LS-6': [['conforme', { poli: { refus: 'trop_gros' }, site: lecture('temoin-gros.invalid', { faits: [] }) }, false], ['fait tiré de la page de 2 Mo', { poli: { refus: 'trop_gros' }, site: lecture('temoin-gros.invalid', { faits: [fait('site_h1', 'Titre de la page trop grosse Témoin', 'https://temoin-gros.invalid/')] }) }, true], ['pas de trop_gros', { poli: { statut: 200 }, site: lecture('temoin-gros.invalid', { faits: [] }) }, true]],
    'LS-7': [['conforme', { faits: cloner(faitsConf), pages: pagesConf }, false], ['le piège du script', { faits: [...cloner(faitsConf), fait('site_h1', 'Titre piège Témoin écrit par un script')], pages: pagesConf }, true], ['un extrait retouché', { faits: [fait('site_h1', 'Votre plombier chauffagiste à Niort depuis 1999')], pages: pagesConf }, true], ['le h1 de 200 signes, tronqué', { faits: [...cloner(faitsConf), fait('site_h1', REP.h1_long.slice(0, 120), 'https://temoin-long.invalid/')], pages: { ...pagesConf, ...(await pagesDe(['https://temoin-long.invalid/'])) } }, true]],
    'LS-8': [['conforme', { lectures: [lecture(REP.conforme.hote, resConf())], source: srcLecteur }, false], ...pieges.map((p) => [`l'adresse piège ${p}`, { lectures: [lecture(REP.conforme.hote, { ...resConf(), adresses: [p] })], source: srcLecteur }, true]), ['data-cfemail dans le source', { lectures: [], source: `${srcLecteur}const x = 'data-cfemail'\n` }, true]],
    'LS-9': [['conforme', { conforme: S.S1, deux: null }, false], ['deux SIREN, l\'un rendu', { conforme: S.S1, deux: S.S12 }, true], ['SIRET rendu à la place du SIREN', { conforme: REP.siret.S1, deux: null }, true]],
    'LS-10': [['conforme', { reseaux: resConf().reseaux }, false], ['une publication rendue comme compte', { reseaux: [...resConf().reseaux, { reseau: 'instagram', compte: 'p', url: 'https://www.instagram.com/p/C0TEMOIN123/', url_source: `https://${REP.conforme.hote}/` }] }, true], ['sans page source', { reseaux: resConf().reseaux.map((r) => ({ ...r, url_source: null })) }, true]],
    'LS-11': [['conforme', { lectures: [{ domaine: 'pagesjaunes.fr', res: { refus: 'annuaire' }, appels: [] }] }, false], ['une requête partie', { lectures: [{ domaine: 'pagesjaunes.fr', res: { refus: 'annuaire' }, appels: [appelSite('pagesjaunes.fr', '/robots.txt', T0)] }] }, true]],
    'LS-12': [['conforme', { source: srcLecteur, typecheck: tcOk }, false], ['fetch( hors de recuperateurReseau', { source: `${srcLecteur}export async function lire(u: string) { return fetch(u) }\n`, typecheck: tcOk }, true], ['import de @/lib/ai', { source: `import { x } from '@/lib/ai'\n${srcLecteur}`, typecheck: tcOk }, true]],
    'LS-13': [['conforme', { conforme: confLecture(), max200: lecture('m', { verdict_formulaire: verdict(null), formulaire: { longueur_max_message: 200 } }) }, false], ['technologie html au lieu de Contact Form 7', { conforme: muter(confLecture, (l) => { l.res.formulaire.technologie = 'html' }), max200: lecture('m', { verdict_formulaire: verdict(null), formulaire: { longueur_max_message: 200 } }) }, true], ['le téléphone facultatif rendu obligatoire', { conforme: muter(confLecture, (l) => { l.res.formulaire.champs[2].requis = true }), max200: lecture('m', { verdict_formulaire: verdict(null), formulaire: { longueur_max_message: 200 } }) }, true], ['maxlength=200 abandonné', { conforme: confLecture(), max200: lecture('m', { verdict_formulaire: verdict('autre'), formulaire: null }) }, true]],
    'LS-14': [['conforme', { variantes: Object.entries(VARIANTES).map(([hote, attendu]) => ({ hote, attendu, res: { verdict_formulaire: verdict(attendu) } })) }, false], ...['temoin-recaptcha-v3.invalid', 'temoin-pot-de-miel.invalid', 'temoin-akismet.invalid'].map((h) => [`${h} jugé éligible`, { variantes: [{ hote: h, attendu: VARIANTES[h], res: { verdict_formulaire: verdict(null) } }] }, true])],
    'LS-15': [['conforme', { action: lecture('a', { verdict_formulaire: verdict('robots_txt') }), page: lecture('p', { verdict_formulaire: verdict('robots_txt') }, [appelSite('temoin-robots-page.invalid', '/robots.txt', T0), appelSite('temoin-robots-page.invalid', '/', T0 + 1000)]), ferme: lecture('f', { verdict_formulaire: verdict('robots_txt') }) }, false], ['la page interdite demandée', { action: lecture('a', { verdict_formulaire: verdict('robots_txt') }), page: lecture('p', { verdict_formulaire: verdict('robots_txt') }, [appelSite('temoin-robots-page.invalid', '/contact', T0)]), ferme: lecture('f', { verdict_formulaire: verdict('robots_txt') }) }, true], ['l\'action interdite ignorée', { action: lecture('a', { verdict_formulaire: verdict(null) }), page: lecture('p', { verdict_formulaire: verdict('robots_txt') }), ferme: lecture('f', { verdict_formulaire: verdict('robots_txt') }) }, true]],
    'LS-16': [['conforme', ls16(), false], ['le site conforme donne site_mobile', muter(ls16, (x) => { x.conforme.res.faits.push(faitAudit('site_mobile', REP.conforme.titre, `https://${REP.conforme.hote}/`)) }), true], ['« © 2016 » manqué', muter(ls16, (x) => { x.copyright.res.faits = [] }), true], ['extrait de copyright inventé', muter(ls16, (x) => { x.copyright.res.faits = [faitAudit('site_copyright', '© 2015', 'https://temoin-copyright-2016.invalid/')] }), true]],
    'RC-2': [['conforme', baseOrch(), false], ['diffusion P recensée', muter(baseOrch, (x) => { x.etat.prospects[1].etape = 'recense' }), true], ['robots fermé rejeté sans sa raison', muter(baseOrch, (x) => { x.etat.prospects[2].raisons = ['formulaire_sans_formulaire'] }), true], ['canal à la mauvaise URL', muter(baseOrch, (x) => { x.etat.prospects[0].canaux[0].valeur = `https://${REP.conforme.hote}/` }), true]],
    'RC-3': [['conforme', baseOrch(), false], ['requête vers le candidat opposé', muter(baseOrch, (x) => { x.appels.push(appelSite('temoin-oppose.invalid', '/robots.txt', T0)) }), true]],
    'RC-4': [['conforme', rc4(), false], ['20 réservés', muter(rc4, (x) => { x.reservations = [{ limite: 20, ids: idsLot }] }), true], ['pas arrêté par l\'échéance', muter(rc4, (x) => { x.bilan.arrete_par_echeance = false }), true], ['fini à 60 s', muter(rc4, (x) => { x.fin = T0 + 60_000 }), true], ['non repris', muter(rc4, (x) => { x.repris = [] }), true]],
    'RC-5': [['conforme', { exception: null, bon: 'recense', panne: 'a_decider', ecrituresPanne: [] }, false], ['faux rejete écrit', { exception: null, bon: 'recense', panne: 'rejete', ecrituresPanne: ['candidat→rejete'] }, true], ['la panne arrête tout', { exception: 'Témoin : exception du récupérateur', bon: 'candidat', panne: 'a_decider', ecrituresPanne: [] }, true]],
    'RC-6': [['conforme', baseOrch(), false], ['un domaine dans le résumé', muter(baseOrch, (x) => { x.evenements[0].resume += ' dont temoin-conforme.invalid' }), true], ['un SIREN dans le bilan', muter(baseOrch, (x) => { x.bilan.dernier = S.S1 }), true], ['deux événements', muter(baseOrch, (x) => { x.evenements.push({ ...x.evenements[0] }) }), true]],
    'RC-7': [['conforme', baseOrch(), false], ['proche compté froid', muter(baseOrch, (x) => { x.etat.prospects[5].froid = true }), true]],
    'RC-8': [['conforme', baseOrch(), false], ['fait pub_meta retouché', muter(baseOrch, (x) => { x.etat.prospects[6].faits = x.etat.prospects[6].faits.map((f) => (f.type === 'pub_meta' ? { ...f, extrait: `${f.extrait} !` } : f)) }), true]],
    'RC-9': [['conforme', { source: "import { UA_RECENSEUR } from './contrat'\nimport { lireSite } from './lecteurSite'\n", typecheck: tcOk }, false], ['import de @/lib/supabaseAdmin', { source: "import { supabaseAdmin } from '@/lib/supabaseAdmin'\n", typecheck: tcOk }, true], ['process.env', { source: 'const u = process.env.URL\n', typecheck: tcOk }, true]],
    'RC-11': [['conforme', rc11(), false], ['le site lu avant SIRENE', muter(rc11, (x) => { x.ordre = { sirene: 3, site: 0 } }), true], ['tranche 11 : site lu', muter(rc11, (x) => { x.appelsGrand = 2 }), true], ['SIREN différent recensé', muter(rc11, (x) => { x.different = { etape: 'recense', raisons: [] } }), true]],
    'RC-12': [['conforme', rc12(), false], ['captcha non compté au bilan', muter(rc12, (x) => { x.bilan.abandons = {} }), true], ['site_copyright perdu', muter(rc12, (x) => { x.copyright.faits = [] }), true]],
    'RC-13': [['conforme', baseOrch(), false], ['une adresse dans l\'état', muter(baseOrch, (x) => { x.etat.prospects[0].canaux.push({ canal: 'email_sollicite', valeur: 'contact@temoin-conforme.invalid', url_source: `https://${REP.conforme.hote}/` }) }), true], ['marque recensée en artisan', muter(baseOrch, (x) => { x.etat.prospects[6].cible = 'artisan' }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le déroulé
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : parties.flatMap((p) => PARTIES[p].ids)
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — contrat et jeux d'essai du dépôt du juge (${rel(FIXTURES)})`)
const EXPORTS = {
  sirene: ['ficheParSiren', 'chercherEntreprise', 'retenir'],
  rge: ['importerRge'],
  site: ['hoteAutorise', 'robotsAutorise', 'recupererPoli', 'lireSite', 'extraire', 'lireFormulaire', 'validerLecture', 'recuperateurReseau'],
  orchestration: ['executerRecenseur'],
}
const OBSERVER = { sirene: observerSirene, rge: observerRge, site: observerSite, orchestration: observerOrchestration }

if (o.autoControle) {
  try { const r = await jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try {
    const l = await scenarioMagasin()
    const rouges = l.filter((x) => !x.ok)
    const manquantes = REGLES_JP6.filter((k) => !l.some((x) => x.cle === k))
    s.juger('AC-2', [...rouges.map((x) => `${x.nom} : obtenu ${court(json(x.obtenu), 80)}`), ...manquantes.map((k) => `règle ${k} absente du scénario`)], `magasin-memoire : ${l.length} règles vertes sur son scénario, dont les ${REGLES_JP6.length} de JP-6`)
  } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
  try {
    const E = await echantillons()
    const e = [], compte = { conformes: 0, fautifs: 0 }
    for (const p of parties) for (const id of PARTIES[p].ids.slice(1)) {
      const liste = E[id]
      if (!liste || !liste.some(([, , rouge]) => rouge) || !liste.some(([, , rouge]) => !rouge)) { e.push(`${id} : pas d'échantillon conforme et fautif`); continue }
      for (const [nom, obsX, rouge] of liste) {
        let d
        try { d = C[id](obsX) } catch (err) { d = [`contrôle interrompu : ${premiereLigne(err)}`] }
        if (rouge && !d.length) e.push(`${id} : l'échantillon fautif « ${nom} » n'est pas repéré`)
        if (!rouge && d.length) e.push(`${id} : l'échantillon conforme « ${nom} » est refusé (${court(d[0], 100)})`)
        compte[rouge ? 'fautifs' : 'conformes']++
      }
    }
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles ${parties.map((p) => `${PARTIES[p].ids[1]} à ${PARTIES[p].ids.at(-1)}`).join(', ')}`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  for (const p of parties) {
    const [premier, ...reste] = PARTIES[p].ids
    const { mod, echecs } = await importerModules(PARTIES[p].module, EXPORTS[p])
    s.juger(premier, echecs, `${PARTIES[p].module} importé depuis ${rel(RAC)} : ${EXPORTS[p].join(', ')}`)
    if (!mod) { s.nonJuges(reste, `${premier} en échec`); continue }
    let obs
    try { obs = await OBSERVER[p](mod) } catch (e) { s.nonJuges(reste, `observation interrompue : ${premiereLigne(e)}`); continue }
    for (const id of reste) {
      const x = obs[id]
      if (!x) { s.echoue(id, 'non observé'); continue }
      if (x.exception && Object.keys(x).length === 1) { s.echoue(id, `interrompu : ${x.exception}`); continue }
      let d
      try { d = C[id](x) } catch (e) { d = [`contrôle interrompu : ${premiereLigne(e)}`] }
      if (x.exception) d = [`exécution interrompue : ${x.exception}`, ...d]
      s.juger(id, d, DETAILS[id] ?? 'conforme')
    }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
