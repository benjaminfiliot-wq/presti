// scripts/fixtures/026-pilotage/c/parties/fil.mjs — les critères FL de pilotage-ecran-qa --partie=fil (fiche jugée 026-123 :
// le Journal de bord et « ▶ Transmettre à l'équipage » ; cahier du juge écrit en 026-104 par Claude Code). Chargé par
// scripts/pilotage-ecran-qa.mjs.
//
// Le contrat d'écran lu ici (026-123, « Ce qu'il faut faire ») : `<section data-station-journal>` ; une
// `[data-bulle-fil="<id>"]` par bulle servie, dans l'ordre servi, sans doublon, avec `[data-pastille]`, l'heure de Paris et
// le texte servi (une bulle de réunion : ses lignes) ; `[data-filtre-agent]` ; aucune bulle → « Rien au journal pour
// l'instant. » ; « N nouvelles ↓ » ; `[data-en-ligne]` (le texte servi du compteur AGENTS ACTIFS) ; une consigne adressée
// « BENJ ▸ <cibleLibelle> : <texte> » (`[data-cible]`) ; `[data-info-agent]` au survol et au focus d'une pastille ;
// `[data-replier-journal]` en mise en page flottante ; `[data-transmettre]` (invite « ▶ Transmettre à l'équipage… », 200
// signes au plus, bouton « Transmettre » inactif sous 3 signes rognés, POST { texte } vers /api/controle/pilotage/consignes
// sans reconfirmation ; 200 → champ vidé et « Consigne transmise à l'équipage. » ; refus → le message servi, texte gardé).
// Les données : vues/fil.json (réunion, consignes, bulle piégée), le fil enrichi au temps t par le juge, vue=direct tirée
// (AGENTS ACTIFS, libellés et rôles de l'équipage).

const INVITE = '▶ Transmettre à l\'équipage…'
const CONFIRMATION = 'Consigne transmise à l\'équipage.'
const apos = (t) => String(t ?? '').replace(/[’‘]/g, '\'')
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const CONSIGNES = ['Priorité aux plombiers de Lyon', 'Relancer les couvreurs d’Annecy', 'Pas d’envoi avant 9 h', 'Plus de menuisiers à Nantes', 'Soigner les maquettes de peintres']

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, existe, code, lire, hexDans, gardeMouvement, interditsSource, adressesApi, appelsApi, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, espaces, heureParis, tirerDirect, tirerTresorerie, capturer, court, PIEGE_HTML } = O
  const JR = `${ST}/Journal.tsx`, TR = `${ST}/journal/Transmettre.tsx`, CSS = `${ST}/journal/journal.css`

  // ── FL-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    for (const f of [JR, TR, CSS]) if (!existe(f)) e.push(`${f} absent`)
    const j = code(JR)
    if (j !== null && (/Le journal de bord arrive avec sa fiche/.test(lire(JR)) || !/data-bulle-fil/.test(j))) e.push('Journal.tsx est encore le cadre d’attente (« Le journal de bord arrive avec sa fiche. », ou aucune [data-bulle-fil])')
    for (const f of [JR, TR]) {
      const s = code(f)
      if (s === null) continue
      const adr = adressesApi(s), passes = appelsApi(s)
      for (const a of adr) {
        if (/vue=fil/.test(a) && !/agent=/.test(a)) e.push(`${f} lit ${a} : la seule lecture vue=fil de ces fichiers porte agent=`)
        else if (!/^\/api\/controle\/station\?vue=fil&agent=/.test(a) && a !== '/api/controle/pilotage/consignes') e.push(`${f} appelle ${a} : vue=fil&agent= en lecture et /api/controle/pilotage/consignes en écriture seulement`)
        if (!passes.includes(a)) e.push(`${f} : ${court(a, 60)} n'est pas appelée par apiDirection(`)
      }
      e.push(...interditsSource(f))
    }
    if (code(TR) !== null && !adressesApi(code(TR)).includes('/api/controle/pilotage/consignes')) e.push('Transmettre.tsx n’écrit pas vers /api/controle/pilotage/consignes')
    S.juger('FL-1', e, `${JR}, ${TR} et ${CSS} présents ; Journal.tsx n'est plus le cadre d'attente ; une seule lecture (vue=fil&agent=) et une seule écriture (/api/controle/pilotage/consignes), par apiDirection( ; ni fetch(, ni supabase, ni dangerouslySetInnerHTML`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'FL-1'), 'FL-1 en échec : le journal n’existe pas, aucun navigateur n’est lancé'); return }
  }
  // FL-12 (sources) : journal.css sans hexadécimal, gardes du mouvement.
  {
    const css = lire(CSS)
    const hex = hexDans(css)
    if (hex.length) faute('FL-12', `journal.css : couleur(s) en hexadécimal (${hex.slice(0, 3).join(', ')})`)
    for (const g of gardeMouvement(css, 'journal.css')) faute('FL-12', g)
    vu('FL-12')
  }

  // ── Les tirages et le fil ───────────────────────────────────────────────────────────────────────────────────────────
  const T = tirerTresorerie(H), D = tirerDirect(H)
  const agentsActifs = D.reponse.valeur.barre.valeur.compteurs.find((c) => c.cle === 'agents')
  const FIL = jeu('vues/fil.json').reponse
  const BULLES = FIL.valeur.bulles
  /** La réponse de vue=fil pour un appel : les bulles servies (filtrées par apres=), plus celles que le juge ajoute. */
  const reponseFil = (a, bulles) => { const r = structuredClone(FIL); let b = structuredClone(bulles); if (a.url.searchParams.has('apres')) { const ap = Number(a.url.searchParams.get('apres')); b = b.filter((y) => y.id > ap) } r.valeur.bulles = b; r.valeur.dernier_id = Math.max(0, ...bulles.map((y) => y.id)); return { statut: 200, reponse: r } }
  const filFixe = (bulles = BULLES) => (a) => reponseFil(a, bulles)
  const base = (plus = {}) => ({ direct: D, fil: filFixe(), tresorerie: T, reglages: J('reglages.json'), ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  const J_ = '[data-station-journal]'
  // `pret` attend que les n bulles attendues soient rendues. Le délai est un délai de CHARGEMENT (D-0410-9, 04/10) : en racine
  // réelle la page appelle pour de vrai la route du rôle avant d'afficher la station, et sur un PC saturé elle a mis plus de
  // 45 s (« Vérification de l'accès… », « transmettre » interrompu à froid). Il passe de 15 s à 90 s ; il ne juge rien : rendu
  // plus tôt, la suite part tout de suite, et des bulles qui ne viennent jamais restent un échec du critère qui les mesure.
  const pret = async (page, n = 1) => { await page.waitForFunction(([s, k]) => document.querySelectorAll(`${s} [data-bulle-fil]`).length >= k, [J_, n], { timeout: 90_000 }).catch(() => {}); await attendre(200) }
  const bulle = (b, decal) => ({ id: b.id, heure: heureParis(Date.parse(b.le) + decal) })
  const idsRendus = (page) => page.$$eval(`${J_} [data-bulle-fil]`, (l) => l.map((e) => Number(e.getAttribute('data-bulle-fil'))))
  const champ = `${J_} [data-transmettre] input, ${J_} [data-transmettre] textarea, [data-transmettre] input, [data-transmettre] textarea`
  const boutonTransmettre = async (page) => page.evaluate(() => { const f = document.querySelector('[data-transmettre]'); const b = f && ([...f.querySelectorAll('button')].find((y) => /Transmettre/i.test(y.textContent ?? '')) ?? f.querySelector('button[type="submit"]')); return b ? { desactive: b.disabled || b.getAttribute('aria-disabled') === 'true' } : null })
  const cliquerTransmettre = (page) => page.evaluate(() => { const f = document.querySelector('[data-transmettre]'); const b = f && ([...f.querySelectorAll('button')].find((y) => /Transmettre/i.test(y.textContent ?? '')) ?? f.querySelector('button[type="submit"]')); b?.click() })

  const srv = await demarrer({ critere: 'FL-2' })
  // Chauffer la route (décision du chef D-0410-9, 04/10) : sur un `next dev` à froid, la première navigation compile la page et
  // ses couches ; sur un PC chargé cela dépasse le délai de 60 s de ouvrir() et interrompait « injection » (FL-3). Une requête
  // de Node, au plus 180 s, fait la compilation AVANT les scénarios. C'est un délai, pas un seuil de vérité : sa réponse n'est
  // jamais lue, aucun critère n'en dépend, et un échec ou un dépassement ne change rien (les scénarios jugent ce qu'ils voient).
  // La route du rôle (/api/controle/journal, la seule que la page appelle pour de vrai) est chauffée de même : sans session elle
  // répond 401 une fois compilée ; sur un PC saturé, sa compilation à froid laissait la page à « Vérification de l'accès… ».
  if (MODE === 'vivant') for (const chemin of ['/controle/station', '/api/controle/journal?limite=1']) await fetch(`${srv.base}${chemin}`, { signal: AbortSignal.timeout(180_000), redirect: 'manual' }).then((r) => r.arrayBuffer()).catch(() => {})
  const captures = {}
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // FL-2, FL-10, FL-13 (en-ligne, cible) et la capture du bureau ; FL-14 (colonnes : sous le Commandement).
  scenario(['FL-2', 'FL-10', 'FL-11', 'FL-13', 'FL-14'], 'bureau', async () => {
    const { page, s, dialogues, fermer } = await ouvrir('/controle/station', base())
    await pret(page, BULLES.length)
    const ids = await idsRendus(page)
    if (ids.join() !== BULLES.map((b) => b.id).join()) faute('FL-2', `bulles ${ids.join(', ')} ; ${BULLES.map((b) => b.id).join(', ')} servies, dans l'ordre, sans doublon`)
    const rendus = await page.$$eval(`${J_} [data-bulle-fil]`, (l) => l.map((e) => ({ id: Number(e.getAttribute('data-bulle-fil')), texte: window.__JUGE__.texte(e), pastille: e.querySelector('[data-pastille]') ? window.__JUGE__.texte(e.querySelector('[data-pastille]')) : null })))
    for (const b of BULLES) {
      const r = rendus.find((y) => y.id === b.id)
      if (!r) continue
      const { heure } = bulle(b, s.decal)
      if (!r.pastille || !r.pastille.includes(espaces(b.pastille))) faute('FL-2', `bulle ${b.id} : pastille « ${r.pastille} », « ${b.pastille} » servie`)
      if (!r.texte.includes(heure)) faute('FL-2', `bulle ${b.id} : heure de Paris ${heure} absente (« ${court(r.texte, 60)} »)`)
      if (!r.texte.includes(espaces(b.texte))) faute(b.texte === PIEGE_HTML || b.texte.includes('<img') ? 'FL-10' : 'FL-2', `bulle ${b.id} : texte « ${b.texte} » servi, « ${court(r.texte, 70)} » affiché`)
      if (b.lignes) { let k = -1; for (const l of b.lignes) { const i = r.texte.indexOf(espaces(l), k + 1); if (i <= k) { faute('FL-2', `bulle de réunion ${b.id} : la ligne « ${l} » absente ou hors d'ordre`); break } k = i } }
      if (b.type === 'consigne' && !r.texte.includes('BENJ')) faute('FL-2', `consigne ${b.id} : « BENJ » absent`)
      if (b.type === 'consigne' && b.cibleLibelle) { const att = espaces(`BENJ ▸ ${b.cibleLibelle} : ${b.texte}`); if (!r.texte.replace(/\s*▸\s*/g, ' ▸ ').replace(/\s*:\s*/g, ' : ').includes(att)) faute('FL-13', `consigne adressée ${b.id} : « ${att} » attendu, « ${court(r.texte, 70)} » affiché`) }
    }
    const enLigne = await page.evaluate((s) => window.__JUGE__.texte(`${s} [data-en-ligne]`), J_)
    if (!enLigne || enLigne !== espaces(agentsActifs.texte)) faute('FL-13', `[data-en-ligne] « ${enLigne} », le compteur AGENTS ACTIFS servi (tiré) « ${agentsActifs.texte} » attendu`)
    const p = await x.piegesDans(page, 'body')
    for (const m of p.echecs) faute('FL-10', m)
    if (!p.texteHtml) faute('FL-10', 'la bulle « Maquette : <img src=x onerror=alert(1)> » ne s’affiche pas telle quelle')
    for (const d of dialogues) faute('FL-10', `boîte ouverte par la page : ${d}`)
    // FL-14, en colonnes : le journal sous le Commandement, dans la même colonne.
    const g = await page.evaluate((s) => ({ j: window.__JUGE__.rect(s), c: window.__JUGE__.rect('[data-zone="commandement"]') }), J_)
    if (!g.j || !g.c || g.j.y < g.c.b - 1 || g.j.x > g.c.d || g.j.d < g.c.x) faute('FL-14', `mise en page colonnes : le journal ${JSON.stringify(g.j && { x: Math.round(g.j.x), y: Math.round(g.j.y) })} n'est pas sous le Commandement ${JSON.stringify(g.c && { x: Math.round(g.c.x), b: Math.round(g.c.b) })}`)
    captures.bureau = await capturer(page, x.cheminCapture('bureau.jpg'))
    DETAILS['FL-2'] = `${BULLES.length} bulles servies, dans l'ordre, chacune avec sa pastille, son heure de Paris et son texte exact ; la réunion et ses 5 lignes dans l'ordre ; les consignes « BENJ » ; fil vide → la phrase exacte`
    await fermer()
  })
  // FL-2 : aucune bulle → « Rien au journal pour l'instant. »
  scenario(['FL-2'], 'fil vide', async () => {
    const { page, fermer } = await ouvrir('/controle/station', base({ fil: filFixe([]) }))
    await page.waitForSelector(J_, { timeout: 60_000 }).catch(() => {})
    await attendre(800)
    const t = apos(await page.evaluate((s) => window.__JUGE__.texte(s), J_))
    if (!t.includes('Rien au journal pour l\'instant.')) faute('FL-2', `fil vide : « ${court(t, 70)} », « Rien au journal pour l'instant. » attendu`)
    if (await page.$(`${J_} [data-bulle-fil]`)) faute('FL-2', 'fil vide : une bulle est rendue')
    await fermer()
  })
  // FL-13 : le survol et le focus d'une pastille montrent le libellé et le rôle servis ; un libellé piégé tel quel.
  scenario(['FL-13'], 'info-bulles', async () => {
    const d = structuredClone(D)
    const ag = d.reponse.valeur.equipage.valeur.agents
    const piege = ag.find((a) => a.nom === 'recenseur'), autre = ag.find((a) => a.nom === 'redacteur')
    piege.libelle = PIEGE_HTML
    autre.role = `${autre.role} (${H.entre(10, 99)})`
    const { page, dialogues, fermer } = await ouvrir('/controle/station', base({ direct: d }))
    await pret(page, BULLES.length)
    const info = (id) => page.evaluate((i) => { const e = document.querySelector(`[data-bulle-fil="${i}"] [data-info-agent]`); return e ? { visible: e.checkVisibility() && e.getBoundingClientRect().width > 0, texte: e.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), img: !!e.querySelector('img') } : null }, id)
    await page.hover('[data-bulle-fil="40"] [data-pastille]').catch(() => {})
    await attendre(150)
    const i1 = await info(40)
    if (!i1 || !i1.visible) faute('FL-13', 'survol de la pastille de la bulle 40 : [data-info-agent] absent ou invisible')
    else if (!i1.texte.includes(PIEGE_HTML) || !i1.texte.includes(espaces(piege.role)) || i1.img) faute('FL-13', `survol : « ${court(i1.texte, 70)} », le libellé piégé tel quel et le rôle « ${piege.role} » attendus${i1.img ? ' (une image a été créée)' : ''}`)
    await page.mouse.move(2, 450)
    await page.focus('[data-bulle-fil="41"] [data-pastille]').catch(() => {})
    await attendre(150)
    const i2 = await info(41)
    if (!i2 || !i2.visible) faute('FL-13', 'focus clavier de la pastille de la bulle 41 : [data-info-agent] absent ou invisible')
    else if (!i2.texte.includes(espaces(autre.libelle)) || !i2.texte.includes(espaces(autre.role))) faute('FL-13', `focus : « ${court(i2.texte, 70)} », « ${autre.libelle} » et « ${autre.role} » (tirés) attendus`)
    for (const dd of dialogues) faute('FL-13', `boîte ouverte par la page : ${dd}`)
    DETAILS['FL-13'] = `consigne adressée « BENJ ▸ FACTEUR : … » ; [data-en-ligne] « ${agentsActifs.texte} » (tiré) ; survol et focus d'une pastille : libellé et rôle servis (rôle tiré), libellé piégé tel quel, sans image`
    await fermer()
  })
  // FL-3 : une bulle servie au temps t se voit avant t + 10 s ; servie deux fois, elle n'apparaît qu'une fois.
  scenario(['FL-3'], 'injection', async () => {
    const neuve = { id: 60, le: new Date(Date.parse(O.MAINTENANT_JEUX)).toISOString(), agent: 'facteur', pastille: 'FACTEUR', type: 'tache_faite', texte: `Formulaire soumis : ${H.parmi(['couvreur', 'plombier', 'peintre'])} (${H.parmi(['Annecy', 'Dijon', 'Valence'])})` }
    let t = 0, apresInjection = 0
    const fil = (a) => { if (!t) return reponseFil(a, BULLES); apresInjection++; const r = reponseFil(a, BULLES); r.reponse.valeur.bulles.push(structuredClone(neuve)); r.reponse.valeur.dernier_id = 60; return r }
    const { page, fermer } = await ouvrir('/controle/station', base({ fil }))
    await pret(page, BULLES.length)
    await attendre(600)
    t = Date.now()
    const ok = await page.waitForSelector(`${J_} [data-bulle-fil="60"]`, { timeout: 10_000 }).then(() => true).catch(() => false)
    const delai = (Date.now() - t) / 1000
    if (!ok) faute('FL-3', `la bulle servie au temps t n'est pas visible avant t + 10 s`)
    else if (!(await page.evaluate((s) => window.__JUGE__.visible(`${s} [data-bulle-fil="60"]`), J_))) { await page.locator(`${J_} [data-bulle-fil="60"]`).scrollIntoViewIfNeeded().catch(() => {}); if (!(await page.evaluate((s) => window.__JUGE__.visible(`${s} [data-bulle-fil="60"]`), J_))) faute('FL-3', 'la bulle 60 est dans le DOM mais pas visible (elementFromPoint)') }
    const avant = apresInjection
    await page.waitForFunction(() => true, null, { timeout: 100 })
    for (let i = 0; i < 24 && apresInjection < avant + 2; i++) await attendre(500)
    const n = await page.$$eval(`${J_} [data-bulle-fil="60"]`, (l) => l.length)
    if (apresInjection < 2) faute('FL-3', `la bulle n'a été servie que ${apresInjection} fois : le doublon n'est pas éprouvé`)
    else if (n !== 1) faute('FL-3', `la bulle 60, servie ${apresInjection} fois, apparaît ${n} fois`)
    DETAILS['FL-3'] = `bulle servie au temps t visible en ${delai.toFixed(1)} s ; servie ${apresInjection} fois, rendue une fois`
    await fermer()
  })
  // FL-4 : le filtre par agent.
  scenario(['FL-4'], 'filtre', async () => {
    const historique = [{ id: 12, le: '2026-10-22T15:00:00.000Z', agent: 'facteur', pastille: 'FACTEUR', type: 'tache_faite', texte: `Formulaire soumis : maçon (Grenoble) · ${H.entre(2, 9)}/15` }, ...BULLES.filter((b) => b.agent === 'facteur')]
    const { page, s, fermer } = await ouvrir('/controle/station', base({ 'fil:facteur': (a) => reponseFil(a, historique) }))
    await pret(page, BULLES.length)
    const estSelect = await page.evaluate(() => document.querySelector('[data-filtre-agent]')?.tagName === 'SELECT')
    const choisir = async (v) => { if (estSelect) await page.selectOption('[data-filtre-agent]', v); else await page.click(v ? `[data-filtre-agent] [value="${v}"], [data-filtre-agent] [data-agent="${v}"]` : '[data-filtre-agent] [value=""], [data-filtre-agent] :text("Tous")') }
    const n0 = s.journal.filter((a) => a.cle.startsWith('fil:')).length
    await choisir('facteur').catch((e) => faute('FL-4', `[data-filtre-agent] : choix de facteur impossible (${court(e.message, 60)})`))
    await page.waitForFunction(([sel, n]) => document.querySelectorAll(`${sel} [data-bulle-fil]`).length === n, [J_, historique.length], { timeout: 5000 }).catch(() => {})
    await attendre(1200)
    const ids = await idsRendus(page)
    const req = s.journal.filter((a) => a.cle.startsWith('fil:')).length - n0
    if (ids.sort((a, b) => a - b).join() !== historique.map((b) => b.id).sort((a, b) => a - b).join()) faute('FL-4', `filtre facteur : bulles ${ids.join(', ')} ; ${historique.map((b) => b.id).join(', ')} servies par vue=fil&agent=facteur attendues`)
    if (req !== 1) faute('FL-4', `filtre facteur : ${req} requête(s) vue=fil&agent=, une seule attendue`)
    await choisir('').catch((e) => faute('FL-4', `« Tous » impossible (${court(e.message, 60)})`))
    await page.waitForFunction(([sel, n]) => document.querySelectorAll(`${sel} [data-bulle-fil]`).length >= n, [J_, BULLES.length], { timeout: 5000 }).catch(() => {})
    await attendre(600)
    const tous = await idsRendus(page)
    const req2 = s.journal.filter((a) => a.cle.startsWith('fil:')).length - n0
    if (tous.length !== BULLES.length) faute('FL-4', `« Tous » : ${tous.length} bulles, ${BULLES.length} servies`)
    if (req2 !== 1) faute('FL-4', `« Tous » relance ${req2 - 1} requête(s) vue=fil&agent= : aucune attendue`)
    DETAILS['FL-4'] = `filtre facteur : ses ${historique.length} bulles (dont l'historique remonté), une seule requête vue=fil&agent=facteur ; « Tous » : les ${BULLES.length} bulles, sans nouvelle requête`
    await fermer()
  })
  // FL-5 : Transmettre.
  scenario(['FL-5'], 'transmettre', async () => {
    const texte = `${H.parmi(CONSIGNES)} (${H.entre(2, 99)})`
    const posts = []
    let servirConsigne = false
    const consigne = { id: 61, le: new Date(Date.parse(O.MAINTENANT_JEUX)).toISOString(), agent: 'benj', pastille: 'BENJ', type: 'consigne', texte, cible: null, cibleLibelle: null }
    const fil = (a) => { const r = reponseFil(a, servirConsigne ? [...BULLES, consigne] : BULLES); return r }
    const post = (a) => { posts.push(a); return { statut: 200, reponse: { ok: true } } }
    const { page, fermer } = await ouvrir('/controle/station', base({ fil, post }))
    await pret(page, BULLES.length)
    const inv = await page.evaluate((c) => { const e = document.querySelector(c); return e ? e.getAttribute('placeholder') ?? e.getAttribute('aria-label') : null }, champ)
    if (apos(inv) !== INVITE) faute('FL-5', `invite « ${inv} », « ${INVITE} » attendue`)
    for (const [v, quoi] of [['ab', '2 signes'], ['     ', 'des espaces seulement'], ['  ab  ', '2 signes rognés']]) {
      await page.fill(champ, v)
      const b = await boutonTransmettre(page)
      if (!b) { faute('FL-5', 'bouton « Transmettre » introuvable'); break }
      if (!b.desactive) faute('FL-5', `${quoi} : le bouton « Transmettre » est actif`)
    }
    await page.fill(champ, '')
    await page.type(champ, 'x'.repeat(205), { delay: 0 })
    const long = await page.evaluate((c) => document.querySelector(c)?.value.length ?? -1, champ)
    if (long > 200) faute('FL-5', `le champ accepte ${long} signes, 200 au plus`)
    await page.fill(champ, `   ${texte}   `)
    const nBulles = (await idsRendus(page)).length
    await cliquerTransmettre(page)
    await page.waitForFunction(() => true)
    for (let i = 0; i < 20 && !posts.length; i++) await attendre(100)
    await attendre(500)
    const consignes = posts.filter((a) => a.url.pathname === '/api/controle/pilotage/consignes')
    if (posts.length !== 1 || consignes.length !== 1) faute('FL-5', `${posts.length} POST (${posts.map((a) => a.chemin).join(', ')}), un seul vers /api/controle/pilotage/consignes attendu`)
    else {
      const c = consignes[0]
      if (JSON.stringify(c.corps) !== JSON.stringify({ texte })) faute('FL-5', `corps ${JSON.stringify(c.corps)}, exactement ${JSON.stringify({ texte })} (rogné) attendu`)
      if ('x-presti-reconfirmation' in c.entetes) faute('FL-5', 'le POST porte l’en-tête x-presti-reconfirmation')
    }
    const apres = await page.evaluate(([c, s]) => ({ valeur: document.querySelector(c)?.value ?? null, texte: document.querySelector(s)?.innerText ?? '' }), [champ, J_])
    if (apres.valeur !== '') faute('FL-5', `sur 200, le champ garde « ${court(apres.valeur, 40)} »`)
    if (!apos(apres.texte).includes(CONFIRMATION)) faute('FL-5', `sur 200, « ${CONFIRMATION} » n'est pas affiché`)
    await attendre(6000)
    const sans = await idsRendus(page)
    if (sans.length !== nBulles || (await page.evaluate(([s, t]) => [...document.querySelectorAll(`${s} [data-bulle-fil]`)].some((e) => e.innerText.includes(t)), [J_, texte]))) faute('FL-5', 'une bulle a été ajoutée à la main avant que le fil serve la consigne')
    servirConsigne = true
    const vue = await page.waitForFunction(([s, t]) => [...document.querySelectorAll(`${s} [data-bulle-fil]`)].some((e) => e.innerText.includes(t) && e.innerText.includes('BENJ')), [J_, texte], { timeout: 10_000 }).then(() => true).catch(() => false)
    if (!vue) faute('FL-5', 'la consigne servie par le fil n’apparaît pas en bulle « BENJ » avant 10 s')
    DETAILS['FL-5'] = `invite exacte ; 2 signes, espaces seuls → bouton inactif ; 205 signes tapés → 200 gardés ; « ${texte} » → un POST {texte} rogné, sans reconfirmation ; 200 → champ vidé, « ${CONFIRMATION} », aucune bulle ajoutée à la main pendant 6 s ; la bulle BENJ quand le fil la sert`
    await fermer()
  })
  // FL-6 : les refus gardent le texte et disent le message servi.
  scenario(['FL-6'], 'refus', async () => {
    const codes = [429, 400, 403]
    let n = 0
    const messages = codes.map((c) => `Refus ${c} du serveur (${H.entre(100, 999)})`)
    const post = () => { const i = n++; return { statut: codes[i] ?? 400, reponse: { error: messages[i] ?? 'refus' } } }
    const { page, fermer } = await ouvrir('/controle/station', base({ post }))
    await pret(page, BULLES.length)
    for (const [i, c] of codes.entries()) {
      const t = `${H.parmi(CONSIGNES)} · essai ${c}`
      await page.fill(champ, t)
      await cliquerTransmettre(page)
      const ok = await page.waitForFunction(([s, m]) => (document.querySelector(s)?.innerText ?? '').includes(m), [J_, messages[i]], { timeout: 4000 }).then(() => true).catch(() => false)
      if (!ok) faute('FL-6', `refus ${c} : le message servi « ${messages[i]} » n'est pas affiché`)
      const v = await page.evaluate((ch) => document.querySelector(ch)?.value ?? null, champ)
      if (v !== t) faute('FL-6', `refus ${c} : le champ contient « ${court(v, 40)} », le texte tapé « ${t} » attendu`)
    }
    DETAILS['FL-6'] = '429, 400 et 403 : le message servi affiché, le texte tapé gardé dans le champ'
    await fermer()
  })
  // FL-7 : rôle lecture.
  scenario(['FL-7'], 'lecture', async () => {
    const { page, fermer } = await ouvrir('/controle/station', { ...base(), journal: J('role-lecture.json') })
    await pret(page, BULLES.length)
    const r = await page.evaluate((s) => ({ transmettre: !!document.querySelector('[data-transmettre]'), lecture: /lecture seule/.test(document.querySelector('.mc')?.innerText ?? ''), bulles: document.querySelectorAll(`${s} [data-bulle-fil]`).length, visible: [...document.querySelectorAll(`${s} [data-bulle-fil]`)].some((e) => window.__JUGE__.visible(e)) }), J_)
    if (r.transmettre) faute('FL-7', 'rôle lecture : [data-transmettre] est rendu')
    if (!r.lecture) faute('FL-7', 'rôle lecture : « lecture seule » n’est pas écrit')
    if (r.bulles !== BULLES.length || !r.visible) faute('FL-7', `rôle lecture : ${r.bulles} bulle(s) rendue(s)${r.visible ? '' : ', le fil n’est pas visible'}`)
    DETAILS['FL-7'] = 'rôle lecture : pas de [data-transmettre], « lecture seule », le fil visible'
    await fermer()
  })
  // FL-8 et la capture du téléphone : onglet Journal à 390×844.
  scenario(['FL-8', 'FL-11'], 'téléphone', async () => {
    const { page, fermer } = await ouvrir('/controle/station', base(), { largeur: 390, hauteur: 844, mobile: true })
    await page.waitForSelector('[data-onglet-tel="journal"]', { timeout: 60_000 }).catch(() => {})
    await page.click('[data-onglet-tel="journal"]').catch((e) => faute('FL-8', `onglet Journal introuvable (${court(e.message, 50)})`))
    await pret(page, BULLES.length)
    const m = await page.evaluate((c) => { const e = document.querySelector(c); if (!e) return null; const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const au = document.elementFromPoint(cx, cy); const onglets = [...document.querySelectorAll('[data-onglet-tel]')].map((o) => o.getBoundingClientRect().top); return { vis: !!au && (au === e || e.contains(au)), police: parseFloat(getComputedStyle(e).fontSize), bas: r.bottom, ongletsHaut: onglets.length ? Math.min(...onglets) : 844, deb: window.__JUGE__.debordements(390), petits: window.__JUGE__.petitsBoutons(44) } }, champ)
    if (!m) faute('FL-8', 'onglet Journal : le champ de [data-transmettre] est absent')
    else {
      if (!m.vis) faute('FL-8', 'le champ n’est pas visible (elementFromPoint en son centre ne le rend pas)')
      if (m.bas > m.ongletsHaut + 1) faute('FL-8', `le champ (bas ${Math.round(m.bas)}) passe sous les onglets (haut ${Math.round(m.ongletsHaut)})`)
      if (m.police < 16) faute('FL-8', `police du champ ${m.police} px, 16 au moins (zoom forcé sur iPhone)`)
      if (m.deb.length) faute('FL-8', `onglet Journal : ${m.deb[0]}${m.deb.length > 1 ? ` (et ${m.deb.length - 1} autre(s))` : ''}`)
      if (m.petits.length) faute('FL-8', `bouton de moins de 44 px (${m.petits[0]})`)
    }
    captures.telephone = await capturer(page, x.cheminCapture('telephone.jpg'))
    DETAILS['FL-8'] = `onglet Journal à 390×844 : le champ visible au-dessus des onglets (elementFromPoint), police ${m?.police} px ; rien hors de 0..390, rien de rogné par un cadre « overflow: hidden », aucun défilement horizontal (la page ou un conteneur) ; boutons ≥ 44 px`
    await fermer()
  })
  // FL-9 : le défilement.
  scenario(['FL-9'], 'défilement', async () => {
    const beaucoup = Array.from({ length: 40 }, (_, i) => ({ id: 100 + i, le: new Date(Date.parse(O.MAINTENANT_JEUX) - (40 - i) * 600_000).toISOString(), agent: 'recenseur', pastille: 'RECENSEUR', type: 'tache_faite', texte: `Recensé : ${H.entre(1, 9)} artisans (${H.parmi(['Lyon', 'Dijon', 'Annecy'])})` }))
    let extra = []
    const fil = (a) => reponseFil(a, [...beaucoup, ...extra])
    const { page, fermer } = await ouvrir('/controle/station', base({ fil }))
    await pret(page, 40)
    const conteneur = async (quoi) => page.evaluate(([s, q]) => {
      const j = document.querySelector(s)
      const c = [...j.querySelectorAll('*')].find((e) => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 4)
      if (!c) return null
      if (q === 'haut') c.scrollTop = 0
      if (q === 'bas') c.scrollTop = c.scrollHeight
      return { haut: c.scrollTop, reste: c.scrollHeight - c.scrollTop - c.clientHeight }
    }, [J_, quoi])
    const c0 = await conteneur('haut')
    if (!c0) { faute('FL-9', '40 bulles servies : aucun conteneur à défilement dans le journal'); await fermer(); return }
    await attendre(300)
    extra = [{ id: 200, le: new Date(Date.parse(O.MAINTENANT_JEUX)).toISOString(), agent: 'facteur', pastille: 'FACTEUR', type: 'tache_faite', texte: 'Formulaire soumis : couvreur (Annecy)' }]
    await page.waitForSelector(`${J_} [data-bulle-fil="200"]`, { state: 'attached', timeout: 10_000 }).catch(() => {})
    await attendre(300)
    const c1 = await conteneur('lire')
    if (!c1 || c1.haut > 5) faute('FL-9', `Benj remonté : une bulle nouvelle fait redescendre le fil (scrollTop ${c1?.haut})`)
    const bouton = await page.evaluate((s) => [...document.querySelectorAll(`${s} button, ${s} [role="button"]`)].map((b) => b.innerText.replace(/\s+/g, ' ').trim()).find((t) => /1 nouvelle ↓/.test(t)) ?? null, J_)
    if (!bouton) faute('FL-9', '« 1 nouvelle ↓ » n’apparaît pas')
    await conteneur('bas')
    await attendre(300)
    extra = [...extra, { id: 201, le: new Date(Date.parse(O.MAINTENANT_JEUX)).toISOString(), agent: 'facteur', pastille: 'FACTEUR', type: 'tache_faite', texte: 'Formulaire soumis : peintre (Dijon)' }]
    await page.waitForSelector(`${J_} [data-bulle-fil="201"]`, { state: 'attached', timeout: 10_000 }).catch(() => {})
    await attendre(400)
    const c2 = await conteneur('lire')
    if (!c2 || c2.reste > 10) faute('FL-9', `en bas, le fil ne suit pas la bulle nouvelle (reste ${c2?.reste} px sous la vue)`)
    DETAILS['FL-9'] = 'remonté : la bulle nouvelle ne fait pas redescendre, « 1 nouvelle ↓ » ; en bas : le fil suit'
    await fermer()
  })
  // FL-14 : mise en page flottante, repli gardé, localStorage qui lève.
  // Le « localStorage qui lève » (décision du chef D-0410-9, 04/10) ne lève que pour les clés PROPRES AU JOURNAL, jamais pour la
  // session de Supabase : en racine réelle, `supabase.auth.getSession()` lit la session dans localStorage ; un stockage fermé
  // en bloc la fait disparaître, la page part en /login et le Journal n'existe plus, ce qui ne dit rien du Journal. Les clés
  // du Journal ne sont pas écrites en dur : le juge les OBSERVE (celles que ▼ écrit dans localStorage, hors `sb-…`), puis,
  // dans le troisième passage, fait lever getItem/setItem/removeItem pour elles seules et COMPTE les levées : un piège qui
  // n'a jamais levé ne prouve rien et fait échouer le critère. Le critère garde sa force : un Journal qui lit ou écrit son
  // pli sans try/catch plante au montage (le ▼ n'existe plus) ou lève dans le gestionnaire (erreur de la page).
  const ENREGISTRER_ECRITURES = String.raw`(function () {
  var cles = window.__JUGE_CLES_ECRITES__ = [], set = Storage.prototype.setItem
  Storage.prototype.setItem = function (k) { try { if (this === window.localStorage) cles.push(String(k)) } catch (e) {} return set.apply(this, arguments) }
})()`
  const piegeCles = (cles) => String.raw`(function () {
  var K = ${JSON.stringify(cles)}, P = Storage.prototype
  window.__JUGE_PIEGE__ = { leves: 0, cles: [] }
  ;['getItem', 'setItem', 'removeItem'].forEach(function (nom) {
    var o = P[nom]
    P[nom] = function (k) {
      if (this === window.localStorage && K.indexOf(String(k)) >= 0) { window.__JUGE_PIEGE__.leves++; if (window.__JUGE_PIEGE__.cles.indexOf(String(k)) < 0) window.__JUGE_PIEGE__.cles.push(String(k)); throw new Error('stockage fermé (piège du juge, clé du Journal « ' + k + ' »)') }
      return o.apply(this, arguments)
    }
  })
})()`
  scenario(['FL-14'], 'flottante', async () => {
    const { page, erreurs, fermer } = await ouvrir('/controle/station', base({ reglages: J('reglages-flottante.json') }), { avantNavigation: (p) => p.addInitScript(ENREGISTRER_ECRITURES) })
    await page.waitForFunction(() => document.querySelector('.mc[data-station]')?.getAttribute('data-mise-en-page') === 'flottante', null, { timeout: 30_000 }).catch(() => {})
    await pret(page, BULLES.length)
    const g = await page.evaluate((s) => ({ j: window.__JUGE__.rect(s), c: window.__JUGE__.rect('[data-station-carte]') }), J_)
    if (!g.j || !g.c) faute('FL-14', 'flottante : le journal ou le cadre de la carte est absent')
    else {
      const cxJ = g.j.x + g.j.l / 2, cyJ = g.j.y + g.j.h / 2, cxC = g.c.x + g.c.l / 2, cyC = g.c.y + g.c.h / 2
      if (!(cxJ < cxC && cyJ > cyC && g.j.b <= g.c.b + 2 && g.j.x >= g.c.x - 2)) faute('FL-14', `flottante : le journal ${JSON.stringify({ x: Math.round(g.j.x), y: Math.round(g.j.y), b: Math.round(g.j.b) })} n'est pas en bas à gauche du cadre de la carte ${JSON.stringify({ x: Math.round(g.c.x), y: Math.round(g.c.y), b: Math.round(g.c.b), l: Math.round(g.c.l) })}`)
    }
    const hauteurs = () => page.evaluate((s) => ({ j: window.__JUGE__.rect(s)?.h ?? null, t: window.__JUGE__.rect('[data-transmettre]')?.h ?? null }), J_)
    await page.evaluate(() => { (window.__JUGE_CLES_ECRITES__ ?? []).length = 0 }).catch(() => {})
    await page.click('[data-replier-journal]').catch((e) => faute('FL-14', `▼ [data-replier-journal] introuvable (${court(e.message, 50)})`))
    await attendre(250)
    // Les clés que ▼ vient d'écrire dans localStorage (la session de Supabase, `sb-…`, n'est jamais une clé du Journal).
    const clesJournal = [...new Set(await page.evaluate(() => window.__JUGE_CLES_ECRITES__ ?? []).catch(() => []))].filter((k) => !/^sb-/.test(k))
    if (!clesJournal.length) faute('FL-14', 'flottante : ▼ n’écrit aucune clé dans localStorage : le pli ne peut pas être gardé dans ce navigateur')
    const h1 = await hauteurs()
    if (!(h1.j !== null && h1.t !== null && h1.j <= h1.t + 64)) faute('FL-14', `▼ : le journal replié mesure ${h1.j} px, le champ ${h1.t} px (la hauteur doit tomber à celle du champ)`)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector(J_, { timeout: 60_000 }).catch(() => {})
    await attendre(800)
    const h2 = await hauteurs()
    if (!(h2.j !== null && h2.t !== null && h2.j <= h2.t + 64)) faute('FL-14', `après rechargement, le journal n'est plus replié (${h2.j} px)`)
    for (const m of erreurs) faute('FL-14', `erreur de la page : ${court(m, 80)}`)
    await fermer()
    if (!clesJournal.length) { DETAILS['FL-14'] = 'localStorage qui lève : non éprouvé (aucune clé du Journal observée)'; return }
    const r3 = await ouvrir('/controle/station', base({ reglages: J('reglages-flottante.json') }), { avantNavigation: (p) => p.addInitScript(piegeCles(clesJournal)) })
    await pret(r3.page, BULLES.length)
    await r3.page.click('[data-replier-journal]').catch((e) => faute('FL-14', `localStorage qui lève sur ${clesJournal.join(', ')} (clé(s) du Journal) : ▼ inopérant (${court(e.message, 50)})`))
    await attendre(250)
    const h3 = await r3.page.evaluate((s) => ({ j: window.__JUGE__.rect(s)?.h ?? null, t: window.__JUGE__.rect('[data-transmettre]')?.h ?? null, erreur: !!document.querySelector('[data-banc-erreur]'), piege: window.__JUGE_PIEGE__ ?? { leves: 0, cles: [] } }), J_)
    if (!h3.piege.leves) faute('FL-14', `localStorage qui lève : le piège n’a jamais levé (clé(s) ${clesJournal.join(', ')}) : le Journal ne touche pas à ses clés, rien n’est éprouvé`)
    if (h3.erreur || !(h3.j !== null && h3.t !== null && h3.j <= h3.t + 64)) faute('FL-14', `localStorage qui lève sur ${clesJournal.join(', ')} (clé(s) du Journal) : le journal ${h3.erreur ? 'casse la page' : `ne se replie pas (${h3.j} px)`}`)
    for (const m of r3.erreurs) faute('FL-14', `localStorage qui lève sur ${clesJournal.join(', ')} (clé(s) du Journal) : erreur de la page (${court(m, 80)})`)
    DETAILS['FL-14'] = `colonnes : le journal sous le Commandement ; flottante : en bas à gauche du cadre de la carte, ▼ le replie jusqu’au champ, gardé au rechargement ; un localStorage qui lève pour la clé du Journal (${clesJournal.join(', ')}, observée, ${h3.piege.leves} levée(s) comptée(s)) ne casse rien, la session de Supabase restant lisible`
    await r3.fermer()
  })

  const LONGS = ['injection', 'transmettre', 'défilement', 'flottante']
  file.sort((a, b) => (LONGS.includes(b.nom) ? 1 : 0) - (LONGS.includes(a.nom) ? 1 : 0))
  await x.enParallele(file)
  {
    const r = x.jugerCaptures(captures)
    for (const m of r.echecs) faute('FL-11', m)
    vu('FL-11')
    DETAILS['FL-11'] = `${r.detail} ; bureau : le journal avec la réunion et les bulles BENJ ; téléphone : l'onglet Journal`
  }
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('FL-12', t.detail); else DETAILS['FL-12'] = `journal.css sans hexadécimal, gardes prefers-reduced-motion ; ${t.detail}` }
  else DETAILS['FL-12'] = 'journal.css sans hexadécimal, gardes prefers-reduced-motion (le typecheck se juge sur la racine réelle)'
  DETAILS['FL-10'] = '« Maquette : <img src=x onerror=alert(1)> » affiché tel quel, aucune image ni boîte ; aucun champ _piege affiché'
  void srv
}
