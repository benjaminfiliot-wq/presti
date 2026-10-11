// scripts/fixtures/026-pilotage/c/parties/salles-suite.mjs — les critères SB de pilotage-ecran-qa --partie=salles-suite
// (fiche jugée 026-164 : les panneaux du Radar, de la Tour du Crieur, du Studio pubs et du Chantier du code ; cahier du juge
// écrit en 026-104 par Claude Code). Chargé par scripts/pilotage-ecran-qa.mjs.
//
// Les sources (026-164, Contexte), toutes par apiDirection( : Radar → vue=direct (sous-partie tapis) et bloc=entonnoir ;
// Crieur → vue=fil&agent=crieur et vue=salle&salle=envois (la ligne reponse_privee) ; Studio → /api/controle/packs ;
// Chantier → bloc=code. Le juge tire au hasard chaque compteur servi et compare l'écran à ce qu'il a servi : chaque nombre
// attendu s'affiche, et aucun nombre qui n'a pas été servi (le résumé de salle commun et la ligne de synchro, jugés en
// SA-19, sont mis à part).

const COMPOSANTS = { radar: 'salles/Radar.tsx', crieur: 'salles/Crieur.tsx', studio: 'salles/Studio.tsx', chantier: 'salles/Chantier.tsx' }
const SOURCES = {
  radar: [/^\/api\/controle\/station\?vue=direct$/, /^\/api\/controle\/pilotage\?bloc=entonnoir$/],
  crieur: [/^\/api\/controle\/station\?vue=fil&agent=crieur$/, /^\/api\/controle\/station\?vue=salle&salle=envois$/],
  studio: [/^\/api\/controle\/packs$/],
  chantier: [/^\/api\/controle\/pilotage\?bloc=code$/],
}
const RYTHME = { radar: ['bloc:entonnoir', 5], crieur: ['fil:crieur', 5], studio: ['packs', 1], chantier: ['bloc:code', 1] }
const INTERDITS = ['envoyer', 'copier', 'sauter', 'relayer', 'publier']
const PHRASE_404 = 'Les packs pubs ne sont pas encore ouverts.'
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const chiffres = (t) => String(t ?? '').match(/\d+/g) ?? []
/** Tous les nombres d'une réponse, à toute profondeur (les chiffres de ses textes compris). */
function nombresServis(x, out = new Set()) {
  if (typeof x === 'number') { out.add(String(x)); if (!Number.isInteger(x)) for (const c of chiffres(String(x))) out.add(c) }
  else if (typeof x === 'string') for (const c of chiffres(x)) out.add(c)
  else if (Array.isArray(x)) for (const y of x) nombresServis(y, out)
  else if (x && typeof x === 'object') for (const v of Object.values(x)) nombresServis(v, out)
  return out
}

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, existe, code, lire, lireBase, hexDans, interditsSource, adressesApi, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, euros, espaces, heureParis, dateParis, relTime, tirerDirect, tirerTresorerie, capturer, court, PIEGE_HTML, MAINTENANT_JEUX } = O

  // ── SB-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    for (const [cle, f] of Object.entries(COMPOSANTS)) {
      const s = code(`${ST}/${f}`)
      if (s === null) { e.push(`${ST}/${f} absent`); continue }
      const adr = adressesApi(s)
      for (const a of adr) if (!SOURCES[cle].some((r) => r.test(a))) e.push(`${f} lit ${court(a, 60)} : hors des adresses du Contexte de 026-164`)
      if (!adr.length) e.push(`${f} ne lit aucune de ses sources`)
      e.push(...interditsSource(`${ST}/${f}`, { html: false }))
    }
    S.juger('SB-1', e, `Radar, Crieur, Studio et Chantier présents ; chacun ne lit que ses sources du Contexte (direct et entonnoir ; fil du Crieur et Salle des envois ; packs ; bloc code), par apiDirection( ; ni fetch(, ni supabase`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'SB-1'), 'SB-1 en échec : les quatre panneaux n’existent pas, aucun navigateur n’est lancé'); return }
  }
  // SB-8 (sources) : aucune couleur en hexadécimal ; mouvement gardé ; le diff de Panneaux.tsx limité aux quatre clés.
  {
    for (const f of Object.values(COMPOSANTS)) {
      const s = lire(`${ST}/${f}`) ?? ''
      const hex = hexDans(s.replace(/\/\/[^\n]*/g, ''))
      if (hex.length) faute('SB-8', `${f} : couleur(s) en hexadécimal (${hex.slice(0, 3).join(', ')})`)
      if (/\b(transition|animation)\s*:/.test(s) && !/prefers-reduced-motion/.test(s)) faute('SB-8', `${f} : une transition ou une animation sans garde prefers-reduced-motion`)
    }
    const avant = lireBase(`${ST}/Panneaux.tsx`), apres = lire(`${ST}/Panneaux.tsx`)
    if (avant !== null && apres !== null && avant !== apres) {
      const a = new Map(); for (const l of avant.split(/\r?\n/)) a.set(l, (a.get(l) ?? 0) + 1)
      const ajout = apres.split(/\r?\n/).filter((l) => { const n = a.get(l) ?? 0; if (n > 0) { a.set(l, n - 1); return false } return l.trim() })
      const hors = ajout.filter((l) => !/radar|crieur|studio|chantier/i.test(l) && !/^\s*[)}\],;]*\s*$/.test(l))
      if (hors.length) faute('SB-8', `Panneaux.tsx : ${hors.length} ligne(s) ajoutée(s) hors des quatre clés (${court(hors[0].trim(), 60)})`)
      DETAILS['SB-8b'] = `diff de Panneaux.tsx : ${ajout.length} ligne(s) ajoutée(s), toutes sur les quatre clés`
    } else DETAILS['SB-8b'] = avant === null ? 'Panneaux.tsx absent de la base : pas de diff à borner' : 'Panneaux.tsx identique à la base'
    vu('SB-8')
  }

  // ── Les tirages ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const T = tirerTresorerie(H), D = tirerDirect(H)
  const tapis = D.reponse.valeur.tapis.valeur
  for (const e of tapis.etapes) e.jour = H.entre(1, 99)
  const ENT = jeu('entonnoir.json')
  for (const k of ['j7', 'j30']) { const t = ENT.reponse.valeur[k]; t.contacts = H.entre(100, 999); t.reponses = H.entre(10, 99); t.oui = H.entre(1, 9); t.appels = H.entre(1, 9); t.ventes = H.entre(0, 9); t.chauds = H.entre(1, 60) }
  const FILC = jeu('fil-crieur.json')
  FILC.reponse.valeur.bulles[1].texte = `Commentaire « SITE » reçu : ${H.entre(2, 40)}`
  const ENV = jeu('vues/salle-envois.json')
  const privees = ENV.reponse.valeur.parCanal.find((c) => c.canal === 'reponse_privee')
  privees.utilises = H.entre(1, 80); privees.texte = String(privees.utilises)
  const PACKS = jeu('packs.json')
  for (const p of PACKS.reponse.packs) { p.metier = H.parmi(['plombier', 'couvreur', 'peintre', 'maçon']); p.commune = H.parmi(['Lyon', 'Annecy', 'Dijon', 'Nantes']) }
  const CODE = jeu('code.json')
  const cv = CODE.reponse.valeur
  cv.file = [`026-${H.entre(100, 199)}`, `026-${H.entre(200, 299)}`]
  cv.prs = { ouvertes: H.entre(1, 9), texte: '' }; cv.prs.texte = `${cv.prs.ouvertes} PR ouverte${cv.prs.ouvertes > 1 ? 's' : ''}`
  const base = (plus = {}) => ({ direct: D, fil: J('vues/fil.json'), tresorerie: T, reglages: J('reglages.json'), 'bloc:entonnoir': { statut: 200, reponse: ENT.reponse }, 'fil:crieur': { statut: 200, reponse: FILC.reponse }, 'salle:envois': { statut: 200, reponse: ENV.reponse }, packs: { statut: 200, reponse: PACKS.reponse }, 'bloc:code': { statut: 200, reponse: CODE.reponse }, 'salle:recettes': J('vues/salle-recettes.json'), 'salle:usine': J('vues/salle-usine.json'), 'agent:livreur': J('vues/agent-livreur.json'), ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  const PAN = (c) => `[data-salle-panneau="${c}"]`
  // D-0510-2 (correction du chef, 05/10) : « Fermer » et Échap passent par router.replace de Next, qui prend plus de 250 ms sur un
  // PC chargé ; le geste était relu 250 ms après. Le juge attend désormais que le panneau soit fermé, au plus 6 s (horloge de la page
  // avancée par petits pas quand elle est installée) ; la condition reste exigée par le même critère : un panneau qui ne se ferme
  // jamais échoue toujours, une adresse qui garde ?salle= aussi.
  const attendreFermeture = async (page, { horloge = false } = {}) => {
    const fin = Date.now() + 6000
    while (Date.now() < fin) {
      if (horloge) await page.clock.runFor(50).catch(() => {})
      const ferme = await page.evaluate(() => !document.querySelector('[data-salle-panneau]') && !new URL(location.href).searchParams.has('salle')).catch(() => false)
      if (ferme) return
      await attendre(50)
    }
  }
  const pret = async (page, sel) => { await page.waitForSelector(sel, { timeout: 15_000 }).catch(() => {}); await page.waitForFunction((s) => { const e = document.querySelector(s); return !!e && !/Chargement/.test(e.innerText) }, sel, { timeout: 8000 }).catch(() => {}); await attendre(300) }
  /** Le texte d'un panneau, sans le résumé de salle commun ni la ligne de synchro (jugés en SA-19). */
  const texteNu = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const c = e.cloneNode(true); c.querySelectorAll('[data-resume-salle], [data-synchro]').forEach((y) => y.remove()); document.body.appendChild(c); c.style.position = 'absolute'; c.style.left = '-9999px'; const t = c.innerText.replace(/[  ]/g, ' ').replace(/synchro il y a \d+ s · auto \d+ (s|min)/g, ''); c.remove(); return t }, sel)

  const srv = await demarrer({ critere: 'SB-2' })
  const captures = {}
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // Radar (SB-2, SB-3, SB-6, SB-7 bureau et sa capture).
  scenario(['SB-2', 'SB-3', 'SB-6', 'SB-7'], 'radar', async () => {
    const { page, dialogues, fermer } = await ouvrir('/controle/station?salle=radar', base())
    await pret(page, PAN('radar'))
    await page.waitForFunction((s) => /\d{3}/.test(document.querySelector(s)?.innerText ?? ''), PAN('radar'), { timeout: 8000 }).catch(() => {})
    if (!(await page.$(PAN('radar'))) || await page.$('[data-salle-agents="radar"]')) faute('SB-2', '?salle=radar n’ouvre pas [data-salle-panneau="radar"] (ou ouvre encore la liste des agents)')
    const t = await texteNu(page, PAN('radar'))
    const e = ENT.reponse.valeur
    const attendus = [...tapis.etapes.map((y) => [y.libelle, y.jour]), ...['j7', 'j30'].flatMap((k) => ['contacts', 'reponses', 'oui'].map((c) => [`${k}.${c}`, e[k][c]])), ['chauds (entrants)', e.j7.chauds]]
    for (const [k, n] of attendus) if (!new RegExp(`(^|\\D)${n}(\\D|$)`).test(t ?? '')) faute('SB-3', `Radar : ${k} = ${n} (tiré) absent`)
    if (!/chauds \(entrants\)\s*:\s*\d+/.test(t ?? '')) faute('SB-3', 'Radar : « chauds (entrants) : N » absent')
    const servis = new Set([...nombresServis(D.reponse.valeur.tapis), ...nombresServis(ENT.reponse), '7', '30'])
    const inconnus = chiffres(t).filter((c) => !servis.has(c))
    if (inconnus.length) faute('SB-3', `Radar : nombre(s) non servi(s) affiché(s) : ${[...new Set(inconnus)].slice(0, 5).join(', ')}`)
    for (const g of await x.gestesInterdits(page, PAN('radar'), INTERDITS)) faute('SB-6', `Radar : bouton ou lien « ${court(g, 40)} »`)
    for (const m of (await x.piegesDans(page, PAN('radar'))).echecs) faute('SB-6', `Radar : ${m}`)
    for (const d of dialogues) faute('SB-6', `boîte ouverte par la page : ${d}`)
    for (const m of await x.sousLaBarre(page, PAN('radar'))) faute('SB-7', `Radar : ${m}`)
    captures.bureau = await capturer(page, x.cheminCapture('bureau.jpg'))
    await page.evaluate(() => { window.__marque = 'juge' })
    await page.click(`${PAN('radar')} [data-fermer], ${PAN('radar')} button:has-text("Fermer")`).catch(() => {})
    await attendreFermeture(page)
    const r = await page.evaluate(() => ({ salle: new URL(location.href).searchParams.get('salle'), ouvert: !!document.querySelector('[data-salle-panneau]'), marque: window.__marque }))
    if (r.salle !== null || r.ouvert || r.marque !== 'juge') faute('SB-2', `Radar, « Fermer » : ?salle=${r.salle}${r.ouvert ? ', panneau ouvert' : ''}`)
    DETAILS['SB-3a'] = `Radar : ${attendus.length} nombres tirés (tapis et entonnoir 7 et 30 jours, chauds à part), aucun autre`
    await fermer()
    // Un manque servi (entonnoir sans valeur) s'affiche tel quel, jamais « 0 ».
    const manque = `Entonnoir pas encore mesuré (${H.entre(10, 99)}).`
    const o2 = await ouvrir('/controle/station?salle=radar', base({ 'bloc:entonnoir': { statut: 200, reponse: { bloc: 'entonnoir', valeur: null, source: 'supabase', a: MAINTENANT_JEUX, cache: false, manque } } }))
    await pret(o2.page, PAN('radar'))
    await attendre(500)
    const t2 = await texteNu(o2.page, PAN('radar'))
    if (!t2?.includes(manque)) faute('SB-3', `Radar, entonnoir en manque : « ${manque} » absent`)
    if (/(^|\D)0(\D|$)/.test(t2 ?? '')) faute('SB-3', `Radar, entonnoir en manque : un « 0 » est affiché (« ${court(t2, 80)} »)`)
    await o2.fermer()
  })
  // Crieur (SB-2, SB-3, SB-6) et Échap.
  scenario(['SB-2', 'SB-3', 'SB-6'], 'crieur', async () => {
    const { page, s, dialogues, fermer } = await ouvrir('/controle/station?salle=crieur', base())
    await pret(page, PAN('crieur'))
    await page.waitForFunction((sel) => /SITE/.test(document.querySelector(sel)?.innerText ?? ''), PAN('crieur'), { timeout: 8000 }).catch(() => {})
    if (!(await page.$(PAN('crieur'))) || await page.$('[data-salle-agents="crieur"]')) faute('SB-2', '?salle=crieur n’ouvre pas [data-salle-panneau="crieur"]')
    const t = await texteNu(page, PAN('crieur'))
    const bulles = FILC.reponse.valeur.bulles
    for (const bl of bulles) { const h = heureParis(Date.parse(bl.le) + s.decal); if (!t?.includes(espaces(bl.texte)) || !t.includes(h)) faute(bl.texte.includes('<img') ? 'SB-6' : 'SB-3', `Crieur : bulle ${bl.id} (${h}, « ${court(bl.texte, 40)} ») absente ou altérée`) }
    if (!new RegExp(`(^|\\D)${privees.texte}(\\D|$)`).test(t ?? '')) faute('SB-3', `Crieur : réponses privées du jour ${privees.texte} (tiré) absent`)
    const servis = new Set([...bulles.flatMap((bl) => [...chiffres(bl.texte), ...chiffres(heureParis(Date.parse(bl.le) + s.decal))]), privees.texte])
    const inconnus = chiffres(t).filter((c) => !servis.has(c))
    if (inconnus.length) faute('SB-3', `Crieur : nombre(s) non servi(s) : ${[...new Set(inconnus)].slice(0, 5).join(', ')}`)
    const p = await x.piegesDans(page, PAN('crieur'))
    for (const m of p.echecs) faute('SB-6', `Crieur : ${m}`)
    if (!p.texteHtml) faute('SB-6', 'Crieur : la bulle « <img src=x onerror=alert(1)> » ne s’affiche pas telle quelle')
    for (const g of await x.gestesInterdits(page, PAN('crieur'), INTERDITS)) faute('SB-6', `Crieur : bouton ou lien « ${court(g, 40)} »`)
    for (const d of dialogues) faute('SB-6', `boîte ouverte par la page : ${d}`)
    await page.keyboard.press('Escape'); await attendreFermeture(page)
    if (await page.$(PAN('crieur')) || new URL(page.url()).searchParams.has('salle')) faute('SB-2', 'Crieur : Échap ne ferme pas le panneau')
    await fermer()
    const o2 = await ouvrir('/controle/station?salle=crieur', base({ 'fil:crieur': { statut: 200, reponse: { ...FILC.reponse, valeur: { bulles: [], dernier_id: 0 } } } }))
    await pret(o2.page, PAN('crieur'))
    await attendre(300)
    if (!(await texteNu(o2.page, PAN('crieur')))?.replace(/[’]/g, '\'').includes('Rien de publié pour l\'instant.')) faute('SB-3', 'Crieur sans bulle : « Rien de publié pour l’instant. » absent')
    await o2.fermer()
    DETAILS['SB-3b'] = `Crieur : ${bulles.length} bulles (heure, texte), réponses privées ${privees.texte} (tiré), aucun autre nombre ; sans bulle : la phrase`
  })
  // Studio (SB-4, SB-2, SB-6).
  scenario(['SB-4', 'SB-2', 'SB-6', 'SB-3'], 'studio', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station?salle=studio', base())
    await pret(page, PAN('studio'))
    if (!(await page.$(PAN('studio'))) || await page.$('[data-salle-agents="studio"]')) faute('SB-2', '?salle=studio n’ouvre pas [data-salle-panneau="studio"]')
    const r = await page.evaluate((p) => ({ videos: document.querySelectorAll(`${p} video`).length, imgs: document.querySelectorAll(`${p} img`).length, liens: [...document.querySelectorAll(`${p} a[href]`)].map((a) => a.getAttribute('href')) }), PAN('studio'))
    if (r.videos || r.imgs) faute('SB-4', `Studio : ${r.videos} <video> et ${r.imgs} <img> (aucun aperçu ni film)`)
    const packsLiens = r.liens.filter((h) => h === '/controle?onglet=packs')
    if (packsLiens.length !== 1 || r.liens.length !== 1) faute('SB-4', `Studio : liens ${r.liens.join(', ') || 'aucun'} ; un seul, vers /controle?onglet=packs, attendu`)
    const t = await texteNu(page, PAN('studio'))
    for (const p of PACKS.reponse.packs) { const d = dateParis(Date.parse(p.livre_le ?? p.fabrique_le) + s.decal); if (!t?.includes(p.metier) || !t.includes(p.commune) || !t.includes(p.etat) || !t.includes(d)) faute('SB-3', `Studio : pack ${p.id} (${p.metier}, ${p.commune}, ${p.etat}, ${d}) absent`) }
    for (const g of await x.gestesInterdits(page, PAN('studio'), INTERDITS)) faute('SB-6', `Studio : bouton ou lien « ${court(g, 40)} »`)
    await fermer()
    const o2 = await ouvrir('/controle/station?salle=studio', base({ packs: J('packs-404.json') }))
    await pret(o2.page, PAN('studio'))
    await attendre(300)
    const t2 = await texteNu(o2.page, PAN('studio'))
    if (!t2?.includes(PHRASE_404)) faute('SB-4', `route des packs en 404 : « ${PHRASE_404} » absente (« ${court(t2, 60)} »)`)
    if (/ne répond pas|erreur|404/i.test(t2 ?? '')) faute('SB-4', 'route des packs en 404 : une erreur est affichée')
    await o2.fermer()
    DETAILS['SB-4'] = `Studio : ni <video> ni <img>, un seul lien (/controle?onglet=packs), chaque pack (métier, commune, statut, date) ; 404 → « ${PHRASE_404} »`
  })
  // Chantier (SB-2, SB-3, SB-7 téléphone et sa capture).
  scenario(['SB-2', 'SB-3', 'SB-7', 'SB-6'], 'chantier', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station?salle=chantier', base(), { largeur: 390, hauteur: 844, mobile: true })
    await pret(page, PAN('chantier'))
    if (!(await page.$(PAN('chantier'))) || await page.$('[data-salle-agents="chantier"]')) faute('SB-2', '?salle=chantier n’ouvre pas [data-salle-panneau="chantier"]')
    const t = await texteNu(page, PAN('chantier'))
    const age = relTime(Date.parse(cv.publie_le) + s.decal)
    for (const [k, v] of [['file', cv.file.join(' ')], ...cv.enCours.map((y) => ['en cours', y.id]), ['verrous', cv.verrousVieux.join(' ')], ...cv.derniers.map((y) => ['derniers', `${y.id} ${y.verdict}`]), ['PR', cv.prs.texte], ...cv.attention.map((l) => ['attention', l]), ['âge', `relevé ${age}`]]) for (const m of String(v).split(' ')) if (!t?.includes(m)) { faute('SB-3', `Chantier : ${k} « ${v} » absent`); break }
    const servis = new Set([...nombresServis(CODE.reponse.valeur), ...chiffres(age)])
    const inconnus = chiffres(t).filter((c) => !servis.has(c))
    if (inconnus.length) faute('SB-3', `Chantier : nombre(s) non servi(s) : ${[...new Set(inconnus)].slice(0, 5).join(', ')}`)
    for (const m of await x.feuilleTelephone(page, PAN('chantier'), { textes: false })) faute('SB-7', `Chantier à 390×844 : ${m}`)
    for (const g of await x.gestesInterdits(page, PAN('chantier'), INTERDITS)) faute('SB-6', `Chantier : bouton ou lien « ${court(g, 40)} »`)
    captures.telephone = await capturer(page, x.cheminCapture('telephone.jpg'))
    await fermer()
    const P2 = jeu('code-perime.json')
    const o2 = await ouvrir('/controle/station?salle=chantier', base({ 'bloc:code': { statut: 200, reponse: P2.reponse } }))
    await pret(o2.page, PAN('chantier'))
    if (!(await texteNu(o2.page, PAN('chantier')))?.includes(P2.reponse.valeur.message)) faute('SB-3', `Chantier périmé : « ${P2.reponse.valeur.message} » absent`)
    await o2.fermer()
    DETAILS['SB-3c'] = `Chantier : file, en cours, verrous, derniers, PR (${cv.prs.texte}, tiré), attention, « relevé ${age} », aucun autre nombre ; périmé : la phrase servie`
  })
  // SB-2 : Commandement ouvre son panneau (026-188 l'a livré : « toutes les salles ont leur panneau », la liste d'agents n'est plus
  // que le repli d'une salle future ; critère actualisé D-0510-2, 05/10, avec la même exigence que pour les quatre autres salles) ;
  // les panneaux de 026-120 s'ouvrent comme avant.
  scenario(['SB-2'], 'salles de 026-120', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=commandement', base())
    await pret(page, PAN('commandement'))
    if (!(await page.$(PAN('commandement'))) || await page.$('[data-salle-agents="commandement"]')) faute('SB-2', '?salle=commandement n’ouvre pas [data-salle-panneau="commandement"] (ou ouvre encore la liste des agents)')
    for (const c of ['recettes', 'usine']) {
      await page.goto(`${srv.base}/controle/station?salle=${c}`, { waitUntil: 'domcontentloaded' })
      await pret(page, PAN(c))
      if (!(await page.$(PAN(c)))) faute('SB-2', `?salle=${c} n'ouvre plus [data-salle-panneau="${c}"]`)
    }
    await fermer()
  })
  // SB-5 : le rythme de chaque panneau (horloge de la page avancée), fermé, page cachée.
  for (const [cle, [source, minutes]] of Object.entries(RYTHME)) {
    scenario(['SB-5'], `rythme ${cle}`, async () => {
      const avancer = async (page, ms, pas) => { for (let t = 0; t < ms; t += pas) { await page.clock.runFor(Math.min(pas, ms - t)); await attendre(25) } }
      const { page, s, fermer } = await ouvrir(`/controle/station?salle=${cle}`, base(), { horloge: Date.now() })
      await page.clock.runFor(300); await pret(page, PAN(cle))
      const n = () => s.journal.filter((a) => a.cle === source).length
      // D-0510-2 : la lecture d'ouverture part quand la page a hydraté, parfois après « pret » sur un PC chargé. Le juge la guette au
      // plus 20 s (horloge de la page avancée par petits pas) avant de poser la ligne de départ ; jamais lue, n0 reste 0 et le critère échoue.
      for (const fin = Date.now() + 20_000; n() < 1 && Date.now() < fin;) { await page.clock.runFor(50).catch(() => {}); await attendre(50) }
      const n0 = n()
      const duree = 2 * minutes * 60_000
      await avancer(page, duree, minutes === 5 ? 30_000 : 10_000)
      const lues = n() - n0
      if (n0 < 1) faute('SB-5', `${cle} : ${source} n'est pas lu à l'ouverture`)
      if (lues > 2) faute('SB-5', `${cle} : ${lues} lectures de ${source} en ${2 * minutes} min, 2 au plus (toutes les ${minutes} min)`)
      // Borne basse (contre-vérification) : lu à l'ouverture puis plus jamais, le panneau est figé.
      if (lues < 1) faute('SB-5', `${cle} : aucune relecture de ${source} en ${2 * minutes} min d’horloge (toutes les ${minutes} min attendu) — un panneau figé`)
      await page.keyboard.press('Escape'); await page.clock.runFor(200); await attendre(200); await attendreFermeture(page, { horloge: true })
      const f0 = n()
      await avancer(page, duree, minutes === 5 ? 60_000 : 20_000)
      if (n() > f0) faute('SB-5', `${cle} fermé : ${n() - f0} lecture(s) de ${source}`)
      await page.goto(`${srv.base}/controle/station?salle=${cle}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.clock.runFor(300); await pret(page, PAN(cle))
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
      const c0 = n()
      await avancer(page, duree, minutes === 5 ? 60_000 : 20_000)
      if (n() > c0) faute('SB-5', `${cle}, page cachée : ${n() - c0} lecture(s) de ${source}`)
      DETAILS[`SB-5-${cle}`] = `${cle} : ${source} lu à l'ouverture puis ${lues} fois en ${2 * minutes} min d’horloge (1 à 2 : ni figé, ni trop souvent) ; fermé et page cachée : aucune`
      await fermer()
    })
  }

  file.sort((a, b) => (b.nom.startsWith('rythme') ? 1 : 0) - (a.nom.startsWith('rythme') ? 1 : 0))
  await x.enParallele(file)
  {
    const r = x.jugerCaptures(captures)
    for (const m of r.echecs) faute('SB-7', m)
    vu('SB-7')
    DETAILS['SB-7'] = `${r.detail} ; bureau : le Radar, sous la barre ; téléphone : le Chantier en feuille plein écran, scrollWidth ≤ 390, boutons ≥ 44 px`
  }
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('SB-8', t.detail); else DETAILS['SB-8'] = `aucune couleur en hexadécimal ni mouvement sans garde dans les quatre composants ; ${DETAILS['SB-8b']} ; ${t.detail}` }
  else DETAILS['SB-8'] = `aucune couleur en hexadécimal ni mouvement sans garde dans les quatre composants ; ${DETAILS['SB-8b']} (le typecheck se juge sur la racine réelle)`
  DETAILS['SB-2'] = 'radar, crieur, studio et chantier → [data-salle-panneau], plus la liste des agents ; « Fermer » et Échap ferment ; commandement ouvre son panneau (026-188) ; recettes et usine s’ouvrent comme avant'
  DETAILS['SB-3'] = [DETAILS['SB-3a'], DETAILS['SB-3b'], DETAILS['SB-3c']].filter(Boolean).join(' ; ') + ' ; un manque servi tel quel, jamais « 0 »'
  DETAILS['SB-5'] = Object.keys(RYTHME).map((k) => DETAILS[`SB-5-${k}`]).filter(Boolean).join(' ; ')
  DETAILS['SB-6'] = 'aucun « Envoyer », « Copier », « Sauter », « Relayer » ni « Publier » dans les quatre panneaux ; aucun champ _piege ; la bulle piégée du Crieur affichée telle quelle, aucune image ni boîte'
  void euros; void PIEGE_HTML; void existe; void srv
}
