// scripts/lien-connexion-qa.mjs — juge du lien de connexion de l'acheteur (fiche 026-023, lot B ; critères LC de 026-027),
// écrit par Claude Code AVANT le code qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/lien-connexion-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe les modules et lit les sources sous <d> (défaut : le dépôt) ; HEAD est celui du dépôt git.
//   --temoin      seulement LC-9 (NR) et la règle commune des preuves vides (LC-PV).
//   --reel        Claude Code seulement, après déploiement : LC-8 contre PRESTI_BASE_URL (défaut https://prestiapp.fr),
//                 .env.local chargé par le juge (rien n'est affiché) ; refusé (code 2) tant que 026-027 n'est pas PASS.
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=complet), horloge figée, avec les doublures
// de scripts/fixtures/026-livraison-tresor/b/doublures.mjs : base en mémoire, lib/connexion doublé (clientPublic().auth.verifyOtp
// qui accepte ou refuse, sessionIdDuJeton, marquerSessionVerifiee consignée), e-mails consignés. Aucun réseau (fetch piégé).
//
// Critères (cahier du juge de 026-027) :
//   LC-1  app/api/auth/lien/route.ts exporte POST et pas GET ; lib/siteAchatPublic.ts exporte rattacherCommandesParEmail.
//         Un fichier absent : les critères suivants sont « non jugés ».
//   LC-2  ordre lu dans le source de la route : isBanned(, consommerLimite(, la forme de th (expression hexadécimale),
//         verifyOtp(, marquerSessionVerifiee(…, 'code_email') ; aucun admin.generateLink, admin.updateUserById ni
//         signInWithPassword ; rien d'importé de lib/clientAuth.
//   LC-3  la route exécutée contre la doublure de clientPublic : jeton valide → 200 { ok: true, session: { access_token,
//         refresh_token } } et la session marquée une fois (code_email, sid du jeton, uid de la session) ; jeton refusé → 400
//         « Lien expiré ou déjà utilisé » sans le détail de Supabase ; th non hexadécimal, trop court ou trop long → 400 sans
//         verifyOtp ; 21e appel d'une même adresse en 10 min → 429 ; adresse bannie → 403.
//   LC-4  la 2FA n'est pas contournée : dans les fichiers de la fiche, aucune écriture de aal, aucun appel mfa.* ;
//         lib/authArtisan.ts inchangé depuis HEAD.
//   LC-5  la page app/connexion/lien/page.tsx : aucun useEffect qui poste ; le seul fetch part d'un gestionnaire de clic ;
//         noindex (page ou layout) ; le jeton n'est rendu dans aucun texte ni adresse.
//   LC-6  rattacherCommandesParEmail sur une base en mémoire : même adresse, casse différente → rattachée ; autre adresse →
//         rien ; déjà rattachée → inchangée ; brouillon → rien ; fondateur → rien et une notification ; deux appels
//         simultanés → un seul rattachement.
//   LC-7  npm run typecheck (tsc --noEmit) vert sur la racine.
//   LC-8  (--reel) un utilisateur d'essai @presti-test.invalid créé par l'API d'administration, generateLink, POST
//         /api/auth/lien → 200 et la session ouvre GET /api/site/commander/brouillon (200, pas code_requis) ; le même th
//         rejoué → 400 ; ménage dans un finally.
//   LC-9  (NR) lib/authArtisan.ts, lib/connexion.ts, lib/clientAuth.ts et app/api/auth/code/** n'ont pas changé depuis HEAD.
//   LC-PV un fichier de 0 octet dans .orchestre/preuves/026-027/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « lien-connexion-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/lien-connexion-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, sansCommentaires, importsDe, exportsNommes,
  differentsDeHead, jugerPreuvesVides, lancerEnfant, resultatEnfant, importer, figerHorloge, jugerDans, typecheck,
  chargerEnvLocal, fichePass, fermante, corpsDeFonction, marqueEssai,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { preparerEnfantB, jeuB, DOUBLES_B, requeteJson, corpsJson } from './fixtures/026-livraison-tresor/b/enfant.mjs'

const JUGE = 'lien-connexion-qa'
const FICHE = '026-027'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine

const ROUTE = 'app/api/auth/lien/route.ts'
const PAGE = 'app/connexion/lien/page.tsx'
const LAYOUT = 'app/connexion/lien/layout.tsx'
const LIB_ACHAT = 'lib/siteAchatPublic.ts'
const FICHIERS_FICHE = [ROUTE, PAGE, LIB_ACHAT]
const INCHANGES = ['lib/authArtisan.ts', 'lib/connexion.ts', 'lib/clientAuth.ts', 'app/api/auth/code']
const DOUBLES = { ...DOUBLES_B, 'lib/connexion': 'connexion' }
const URL_ROUTE = 'https://prestiapp.fr/api/auth/lien'

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  figerHorloge('2026-09-26T10:00:00Z')
  const { D, reseau } = await preparerEnfantB({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {} }
  const C = jeuB('commandes.json'), L = jeuB('lien-connexion.json'), AA = jeuB('auth-admin.json')
  const route = await importer(RAC, ROUTE), achat = await importer(RAC, LIB_ACHAT)
  const reinit = (conf = {}) => D.reinitialiser({ drapeaux: { siteAchatPublic: true, siteCommande: true }, ...conf })
  const poster = (corps, ip = L.ip) => requeteJson(URL_ROUTE, { corps, ip })
  const lignes = () => E.tables.sites_commandes ?? []
  const ligne = (id) => lignes().find((l) => l.id === id)

  await jugerDans(res, 'LC-3', async () => {
    const e = []
    if (typeof route.m?.POST !== 'function') return { echecs: [`${ROUTE} n'exporte pas POST (${route.erreur ?? 'export absent'})`] }
    // Jeton valide.
    reinit()
    let r = await route.m.POST(poster({ th: L.th_valide }))
    let corps = await corpsJson(r)
    if (r.status !== 200) e.push(`jeton valide → ${r.status} (${court(JSON.stringify(corps), 80)}), 200 attendu`)
    if (corps?.ok !== true || corps?.session?.access_token !== AA.session.access_token || corps?.session?.refresh_token !== AA.session.refresh_token) e.push(`jeton valide : corps ${court(JSON.stringify(corps), 100)}, { ok: true, session: { access_token, refresh_token } } attendu`)
    const otp = E.b.otp.appels
    if (otp.length !== 1) e.push(`jeton valide : ${otp.length} appel(s) à verifyOtp, 1 attendu`)
    else {
      if (otp[0].token_hash !== L.th_valide) e.push(`verifyOtp : token_hash = ${court(JSON.stringify(otp[0].token_hash), 40)}, th attendu`)
      if (!['magiclink', 'email'].includes(otp[0].type)) e.push(`verifyOtp : type = ${JSON.stringify(otp[0].type)}, magiclink ou email attendu`)
    }
    const marques = E.b.sessionsMarquees
    if (marques.length !== 1) e.push(`jeton valide : session marquée ${marques.length} fois, 1 attendue`)
    else if (marques[0].sid !== AA.session.sid || marques[0].uid !== AA.acheteur.uid || marques[0].moyen !== 'code_email') e.push(`jeton valide : marquerSessionVerifiee(${JSON.stringify(marques[0])}), (sid du jeton, uid de la session, 'code_email') attendu`)
    // Jeton refusé.
    reinit({ b: { otp: 'refus' } })
    r = await route.m.POST(poster({ th: L.th_valide }))
    corps = await corpsJson(r)
    if (r.status !== 400) e.push(`jeton refusé → ${r.status}, 400 attendu`)
    const texte = JSON.stringify(corps ?? '')
    if (!texte.includes(L.message_refus)) e.push(`jeton refusé : le corps ne dit pas « ${L.message_refus} » (${court(texte, 80)})`)
    if (/doublure|expired|invalid/i.test(texte)) e.push(`jeton refusé : le détail de Supabase fuit dans la réponse (${court(texte, 80)})`)
    if (E.b.sessionsMarquees.length) e.push('jeton refusé : une session marquée quand même')
    // th mal formé : 400 sans verifyOtp.
    for (const [nom, th] of [['non hexadécimal', L.th_non_hex], ['trop court', L.th_trop_court], ['trop long', L.th_trop_long], ['absent', undefined], ['nombre', 12345]]) {
      reinit()
      r = await route.m.POST(poster(th === undefined ? {} : { th }))
      if (r.status !== 400) e.push(`th ${nom} → ${r.status}, 400 attendu`)
      if (E.b.otp.appels.length) e.push(`th ${nom} : verifyOtp appelé`)
    }
    // Plafond : 20 par 10 minutes et par adresse, le 21e → 429.
    reinit()
    { const statuts = []; for (let i = 0; i <= L.plafond; i++) statuts.push((await route.m.POST(poster({ th: L.th_valide }, '6.6.6.6'))).status); if (statuts.slice(0, L.plafond).some((x) => x !== 200) || statuts[L.plafond] !== 429) e.push(`${L.plafond + 1} appels d'une même adresse → ${statuts.slice(0, 3).join(', ')}, … ${statuts.slice(-2).join(', ')} ; 200 × ${L.plafond} puis 429 attendus`) }
    // Adresse bannie : 403 avant tout.
    reinit({ tables: { ip_bans: [{ ip: L.ip_bannie, expires_le: null }] } })
    r = await route.m.POST(poster({ th: L.th_valide }, L.ip_bannie))
    if (r.status !== 403) e.push(`adresse bannie → ${r.status}, 403 attendu`)
    if (E.b.otp.appels.length) e.push('adresse bannie : verifyOtp appelé')
    return { echecs: e, detail: `route exécutée contre la doublure de clientPublic : jeton valide → 200 { ok, session } et une session marquée code_email ; refusé → 400 « ${L.message_refus} » sans détail ; th mal formé (5 cas) → 400 sans verifyOtp ; 21e appel d'une adresse → 429 ; bannie → 403` }
  }, suivi)

  await jugerDans(res, 'LC-6', async () => {
    const e = []
    if (typeof achat.m?.rattacherCommandesParEmail !== 'function') return { echecs: [`${LIB_ACHAT} : rattacherCommandesParEmail absente (${achat.erreur ?? 'export absent'})`] }
    const uid = C.artisans.artisan.id
    const base = () => ({ sites_commandes: ['commande_publique_payee', 'commande_autre_compte', 'commande_deja_rattachee', 'brouillon_public_recent'].map((k) => structuredClone(C[k])), artisans: [structuredClone(C.artisans.artisan)] })
    const emailMaj = C.commande_publique_payee.email.toUpperCase().replace('INVALID', 'Invalid')
    // Même adresse, casse différente → rattachée ; déjà rattachée et brouillon → inchangées.
    reinit({ tables: base() })
    let r = null
    try { r = await achat.m.rattacherCommandesParEmail(uid, emailMaj) } catch (err) { e.push(`rattacherCommandesParEmail lève : ${premiereLigne(err)}`) }
    const ids = Array.isArray(r) ? r.map((x) => (typeof x === 'string' ? x : x?.id)) : null
    if (!ids || ids.length !== 1 || ids[0] !== C.commande_publique_payee.id) e.push(`même adresse (casse différente) : rendu ${court(JSON.stringify(ids ?? r), 80)}, [${C.commande_publique_payee.id}] attendu`)
    const l = ligne(C.commande_publique_payee.id)
    if (l?.artisan_id !== uid || !l?.rattachee_le) e.push(`même adresse : artisan_id = ${JSON.stringify(l?.artisan_id)}, rattachee_le = ${JSON.stringify(l?.rattachee_le)} ; uid et une date attendus`)
    if (ligne(C.commande_deja_rattachee.id)?.artisan_id !== C.commande_deja_rattachee.artisan_id) e.push('la commande déjà rattachée a changé de compte')
    if (ligne(C.brouillon_public_recent.id)?.artisan_id !== null) e.push('un brouillon a été rattaché')
    // Autre adresse → rien.
    reinit({ tables: base() })
    try { r = await achat.m.rattacherCommandesParEmail(uid, 'personne@presti-test.invalid') } catch (err) { e.push(`autre adresse : lève (${premiereLigne(err)})`) }
    if ((Array.isArray(r) ? r.length : -1) !== 0 || E.ecritures.some((x) => x.genre !== 'select' && x.lignes > 0)) e.push(`autre adresse : rendu ${court(JSON.stringify(r), 60)}, ${E.ecritures.filter((x) => x.lignes > 0).length} écriture(s) ; [] et 0 attendus`)
    // Brouillon seul (même adresse) → rien.
    reinit({ tables: { sites_commandes: [{ ...structuredClone(C.brouillon_public_recent), email: C.commande_publique_payee.email }], artisans: [structuredClone(C.artisans.artisan)] } })
    try { r = await achat.m.rattacherCommandesParEmail(uid, C.commande_publique_payee.email) } catch (err) { e.push(`brouillon : lève (${premiereLigne(err)})`) }
    if ((Array.isArray(r) ? r.length : -1) !== 0 || ligne(C.brouillon_public_recent.id)?.artisan_id !== null) e.push('brouillon : rattaché ou rendu non vide')
    // Fondateur → rien, et une notification.
    reinit({ tables: { ...base(), artisans: [structuredClone(C.artisans.fondateur)] } })
    try { r = await achat.m.rattacherCommandesParEmail(C.artisans.fondateur.id, C.commande_publique_payee.email) } catch (err) { e.push(`fondateur : lève (${premiereLigne(err)})`) }
    if ((Array.isArray(r) ? r.length : -1) !== 0 || ligne(C.commande_publique_payee.id)?.artisan_id !== null) e.push('fondateur : une commande rattachée')
    if (!E.emails.some((m) => m.genre === 'entreprise')) e.push('fondateur : aucune notification à l\'entreprise')
    // Deux appels simultanés → un seul rattachement.
    reinit({ tables: base() })
    let deux = []
    try { deux = await Promise.all([achat.m.rattacherCommandesParEmail(uid, emailMaj), achat.m.rattacherCommandesParEmail(uid, C.commande_publique_payee.email)]) } catch (err) { e.push(`appels simultanés : lève (${premiereLigne(err)})`) }
    const rattachees = deux.reduce((n, x) => n + (Array.isArray(x) ? x.length : 0), 0)
    const majs = E.ecritures.filter((x) => x.genre === 'update').reduce((n, x) => n + x.lignes, 0)
    if (rattachees !== 1 || majs !== 1) e.push(`deux appels simultanés : ${rattachees} commande(s) rendue(s), ${majs} ligne(s) mise(s) à jour ; 1 et 1 attendus (mise à jour conditionnelle artisan_id is null)`)
    return { echecs: e, detail: `rattacherCommandesParEmail : même adresse en majuscules → 1 commande rattachée (artisan_id, rattachee_le), la déjà rattachée et le brouillon intacts ; autre adresse → [] ; brouillon → rien ; fondateur → rien et une notification ; deux appels simultanés → 1 seul rattachement` }
  }, suivi)

  resultatEnfant(JUGE, res)
} else {
  // ═══ Le juge ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
  if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
  if (o.reel && !o.racineParDefaut) refuserAppel(JUGE, '--reel se lance sur le dépôt, pas sur une copie')
  if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)

  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'
  const COMPLET = ['LC-1', 'LC-2', 'LC-3', 'LC-4', 'LC-5', 'LC-6', 'LC-7', 'LC-9']
  const IDS = o.temoin ? ['LC-9', 'LC-PV'] : [...COMPLET, ...(o.reel ? ['LC-8'] : []), 'LC-PV']
  const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: ['LC-9'] })
  const src = (f) => sansCommentaires(lireRacine(RAC, f) ?? '')
  let suite = true

  if (!o.temoin) {
    await s.critere('LC-1', () => {
      const e = []
      const r = lireRacine(RAC, ROUTE)
      if (r === null) e.push(`${ROUTE} absent`)
      else { const ex = exportsNommes(r); if (!ex.includes('POST')) e.push(`${ROUTE} n'exporte pas POST`); if (ex.includes('GET')) e.push(`${ROUTE} exporte GET (le jeton ne se consomme que par un POST)`) }
      const a = lireRacine(RAC, LIB_ACHAT)
      if (a === null) e.push(`${LIB_ACHAT} absent`)
      else if (!exportsNommes(a).includes('rattacherCommandesParEmail')) e.push(`${LIB_ACHAT} n'exporte pas rattacherCommandesParEmail`)
      if (lireRacine(RAC, PAGE) === null) e.push(`${PAGE} absente`)
      return { echecs: e, detail: `${ROUTE} exporte POST et pas GET ; ${LIB_ACHAT} exporte rattacherCommandesParEmail ; ${PAGE} existe` }
    })
    suite = !s.enEchec('LC-1')
    if (!suite) s.nonJuges(COMPLET.filter((id) => !['LC-1', 'LC-9'].includes(id)), 'LC-1 en échec')
  }

  if (!o.temoin && suite) {
    await s.critere('LC-2', () => {
      const e = []
      const t = src(ROUTE)
      // L'ordre se lit dans le corps de POST (une expression régulière déclarée en tête de fichier n'est pas une étape).
      const corps = corpsDeFonction(t, 'POST')?.corps ?? t
      const pos = (re) => { const m = re.exec(corps); return m ? m.index : -1 }
      const ordre = [['isBanned(', pos(/\bisBanned\s*\(/)], ['consommerLimite(', pos(/\bconsommerLimite\s*\(/)], ['la forme de th', pos(/\.test\s*\(\s*th\b|\bth\s*\.\s*(?:match|length)\b|\/\^\[0-9a-f/i)], ['verifyOtp(', pos(/\bverifyOtp\s*\(/)], ["marquerSessionVerifiee(…, 'code_email')", pos(/\bmarquerSessionVerifiee\s*\([^)]*['"]code_email['"]/)]]
      for (const [nom, p] of ordre) if (p < 0) e.push(`${ROUTE} : ${nom} introuvable`)
      for (let i = 1; i < ordre.length; i++) if (ordre[i][1] >= 0 && ordre[i - 1][1] >= 0 && ordre[i][1] < ordre[i - 1][1]) e.push(`${ROUTE} : ${ordre[i][0]} vient avant ${ordre[i - 1][0]}`)
      for (const [nom, re] of [['admin.generateLink', /\badmin\s*\.\s*generateLink\b/], ['admin.updateUserById', /\badmin\s*\.\s*updateUserById\b/], ['signInWithPassword', /\bsignInWithPassword\b/]]) if (re.test(t)) e.push(`${ROUTE} appelle ${nom}`)
      if (importsDe(lireRacine(RAC, ROUTE) ?? '').some((i) => /clientAuth/.test(i.spec))) e.push(`${ROUTE} importe lib/clientAuth (le modèle des clients d'un artisan, pas celui-ci)`)
      return { echecs: e, detail: `${ROUTE} : isBanned( < consommerLimite( < forme de th < verifyOtp( < marquerSessionVerifiee(…, 'code_email') ; ni admin.generateLink, ni admin.updateUserById, ni signInWithPassword, ni lib/clientAuth` }
    })

    const enfant = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 240_000 })
    for (const id of ['LC-3', 'LC-6']) {
      const c = enfant.res?.criteres?.[id]
      if (c) s.juger(id, c.echecs, c.detail)
      else s.echoue(id, `l'enfant n'a rien rendu pour ${id} (code ${enfant.code}${enfant.erreur ? `, ${enfant.erreur}` : ''}) — ${court(enfant.sortie?.trim().split(/\r?\n/).filter((l) => !l.startsWith('@@')).slice(-2).join(' | ') ?? '', 200)}`)
    }

    await s.critere('LC-4', () => {
      const e = []
      for (const f of FICHIERS_FICHE) {
        const t = src(f)
        if (!t) continue
        if (/\baal\b\s*[:=]/.test(t) || /\baal\s*:\s*['"]aal[12]['"]/.test(t)) e.push(`${f} écrit aal`)
        if (/\bmfa\s*\.\s*\w+\s*\(/.test(t)) e.push(`${f} appelle mfa.*`)
      }
      e.push(...differentsDeHead(RAC, 'lib/authArtisan.ts').map((x) => `${x} (le verrou de la 2FA ne bouge pas)`))
      return { echecs: e, detail: `aucune écriture de aal ni appel mfa.* dans ${FICHIERS_FICHE.join(', ')} ; lib/authArtisan.ts inchangé depuis HEAD` }
    })

    await s.critere('LC-5', () => {
      const e = []
      const brut = lireRacine(RAC, PAGE) ?? ''
      const t = sansCommentaires(brut)
      // Aucun useEffect qui poste.
      for (const m of t.matchAll(/\buseEffect\s*\(/g)) {
        const ouvre = t.indexOf('{', m.index)
        const ferme = ouvre >= 0 ? fermante(t, ouvre) : -1
        const corps = ouvre >= 0 && ferme > ouvre ? t.slice(ouvre, ferme + 1) : ''
        if (/\bfetch\s*\(|method\s*:\s*['"]POST['"]|setSession\s*\(/.test(corps)) e.push(`${PAGE} : un useEffect poste ou ouvre une session au chargement (« ${court(corps, 60)} »)`)
      }
      // Le seul fetch part d'un gestionnaire de clic.
      const fetchs = [...t.matchAll(/\bfetch\s*\(/g)]
      if (!fetchs.length) e.push(`${PAGE} : aucun fetch (le bouton « Ouvrir mon dossier » doit poster th)`)
      const gestionnaires = new Set([...t.matchAll(/onClick\s*=\s*\{\s*(?:\(\)\s*=>\s*(?:void\s+)?)?([A-Za-z_$][\w$]*)\s*(?:\(|\})/g)].map((m) => m[1]))
      for (const f of fetchs) {
        const avant = t.slice(0, f.index)
        const decl = [...avant.matchAll(/(?:const|let|function)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|\()/g)].at(-1)
        const nom = decl?.[1] ?? null
        if (!nom || !gestionnaires.has(nom)) e.push(`${PAGE} : un fetch hors d'un gestionnaire de clic (dans ${nom ?? 'le corps du composant'} ; gestionnaires onClick : ${[...gestionnaires].join(', ') || 'aucun'})`)
        const appel = t.slice(f.index, f.index + 400)
        if (!/method\s*:\s*['"]POST['"]/.test(appel)) e.push(`${PAGE} : le fetch n'est pas un POST`)
      }
      // noindex, sur la page ou son layout.
      const layout = lireRacine(RAC, LAYOUT) ?? ''
      const NOINDEX = /noindex|index\s*:\s*false/i
      if (!NOINDEX.test(brut) && !NOINDEX.test(layout)) e.push(`${PAGE} : ni la page ni ${LAYOUT} ne portent noindex`)
      // Le jeton n'est rendu nulle part.
      const sansEnvoi = t.replace(/JSON\.stringify\s*\(\s*\{[^}]*\}\s*\)/g, '').replace(/useSearchParams\b[^\n]*/g, '').replace(/searchParams\.get\([^)]*\)/g, '')
      if (/[>\s]\{\s*th\s*\}|\$\{\s*th\s*\}|(?:href|value|src|title)\s*=\s*\{[^}]*\bth\b/.test(sansEnvoi)) e.push(`${PAGE} : le jeton th est rendu dans un texte ou un attribut`)
      return { echecs: e, detail: `${PAGE} : aucun useEffect qui poste ; ${fetchs.length} fetch POST, depuis un gestionnaire de clic (${[...gestionnaires].join(', ')}) ; noindex ; th jamais rendu` }
    })

    await s.critere('LC-7', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
  }

  {
    await s.critere('LC-9', () => {
      const e = []
      for (const f of INCHANGES) e.push(...differentsDeHead(RAC, f).map((x) => `${x} (interdit à 026-027)`))
      return { echecs: e, detail: `${INCHANGES.join(', ')} inchangés depuis HEAD` }
    })
  }

  // ── LC-8 (--reel) ──────────────────────────────────────────────────────────────────────────────────────────────────────
  if (o.reel) {
    if (!fichePass(FICHE)) { s.echoue('LC-8', `préalable absent : la fiche ${FICHE} n'est pas PASS (route non déployée)`); s.finir(); process.exit(2) }
    chargerEnvLocal()
    const manque = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k])
    if (manque.length) { s.echoue('LC-8', `préalable absent : ${manque.join(', ')} (.env.local)`); s.finir(); process.exit(2) }
    const BASE = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
    const e = []
    const menage = []
    let detail = ''
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      const email = `${marqueEssai()}@presti-test.invalid`
      const { data: cree, error: eCree } = await admin.auth.admin.createUser({ email, email_confirm: true })
      if (eCree || !cree?.user) throw new Error(`création de l'utilisateur d'essai : ${eCree?.message ?? 'aucun utilisateur'}`)
      menage.push(async () => { const { error } = await admin.auth.admin.deleteUser(cree.user.id); if (error) throw new Error(`ménage de l'utilisateur : ${error.message}`) })
      const { data: lien, error: eLien } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      const th = lien?.properties?.hashed_token
      if (eLien || !th) throw new Error(`generateLink : ${eLien?.message ?? 'pas de hashed_token'}`)
      const r1 = await fetch(`${BASE}/api/auth/lien`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ th }) })
      const c1 = await r1.json().catch(() => ({}))
      if (r1.status !== 200 || !c1?.session?.access_token) e.push(`POST /api/auth/lien → ${r1.status} ${court(JSON.stringify({ ...c1, session: c1?.session ? '…' : c1?.session }), 80)}, 200 avec une session attendu`)
      else {
        const r2 = await fetch(`${BASE}/api/site/commander/brouillon`, { headers: { Authorization: `Bearer ${c1.session.access_token}` } })
        const c2 = await r2.json().catch(() => ({}))
        if (r2.status !== 200 || c2?.code === 'code_requis') e.push(`la session ouvre GET /api/site/commander/brouillon → ${r2.status} ${c2?.code ?? ''}, 200 sans code_requis attendu`)
      }
      const r3 = await fetch(`${BASE}/api/auth/lien`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ th }) })
      if (r3.status !== 400) e.push(`le même th rejoué → ${r3.status}, 400 attendu`)
      detail = `sur ${BASE} : utilisateur d'essai créé, generateLink, POST /api/auth/lien → 200, la session ouvre /api/site/commander/brouillon, le th rejoué → 400 ; ménage fait`
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } finally {
      for (const m of menage.reverse()) { try { await m() } catch (err) { e.push(premiereLigne(err)) } }
    }
    s.juger('LC-8', e, detail)
  }

  jugerPreuvesVides(s, 'LC', RAC, FICHE)
  process.exit(s.finir())
}
