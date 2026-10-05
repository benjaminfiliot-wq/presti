// scripts/fixtures/026-pilotage/c/parties/gestes.mjs — les critères EG de pilotage-ecran-qa --partie=gestes (fiche jugée
// 026-117 : trancher, appel rendu, AUTO, pause d'un agent, consigne à un agent, lien profond, gestes du fondateur sur
// l'envoi ; cahier du juge écrit en 026-104 par Claude Code). Chargé par scripts/pilotage-ecran-qa.mjs.
//
// Le juge intercepte et consigne CHAQUE POST (chemin, corps, en-têtes) et répond selon le scénario : la reconfirmation
// (POST /api/controle/reconfirmer) rend un jeton du juge, que le POST suivant doit porter dans x-presti-reconfirmation ; une
// route peut refuser 403 `reconfirmation_requise` avec la portée que le juge annonce. La boîte `[data-reconfirmer]` doit
// s'ouvrir AVANT tout POST quand la portée l'exige. Le contrat d'écran (026-117, « Ce qu'il faut faire ») :
// `[data-feuille="decisions"]` et ses `[data-carte-decision]` (`[data-choix="<clé>"]`, `data-recommandee`,
// `data-epinglee`) ; `[data-feuille="appels"]` (`[data-appel-rendu]`, lien « Appeler » = le tel servi) ; `[data-auto]` ;
// `[data-pause-agent="<nom>"]` ; `[data-consigne-agent="<nom>"]` ; `[data-gestes-envoi]` et ses `[data-geste="…"]`.

const MDP = 'mot-de-passe-du-juge'
const MOTS_INTERDITS = ['envoyer', 'envoyé', 'copier', 'sauter', 'relayer']
const PHRASES = {
  mesure: 'La mesure à sec n\'a pas réussi.',
  // 05/10/2026 soir (0131) : l'épreuve n'empêche plus l'ouverture (palier P0) ; l'écran la dit comme une NOTE qui conditionne la montée de palier.
  epreuve: 'L\'épreuve de bout en bout n\'a pas encore réussi : elle n\'empêche pas l\'ouverture (palier P0, 5 par jour), elle conditionne la montée de palier.',
  notice: 'La notice en ligne n\'est pas vérifiée.',
  confirmation: 'Ouvrir l\'envoi à froid ? Les agents rempliront les formulaires de contact des artisans dès 8 h, au prochain jour ouvré.',
  plafond: 'Au-delà de 40 par jour, c\'est ta décision : les agents ne montent jamais seuls au-dessus.',
}
const ROUTES = ['/api/controle/pilotage?bloc=decider', '/api/controle/pilotage?bloc=appeler', '/api/controle/pilotage/decisions/', '/api/controle/pilotage/appels/', '/api/controle/pilotage/agents/', '/api/controle/pilotage/gestes', '/api/controle/pilotage/consignes', '/api/controle/pause']
const apos = (t) => String(t ?? '').replace(/[’‘]/g, '\'').replace(/[  ]/g, ' ')
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const PARIS = (iso) => Date.parse(iso)

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, existe, code, lire, hexDans, gardeMouvement, interditsSource, adressesApi, appelsApi, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, espaces, tirerDirect, tirerTresorerie, capturer, court, PIEGE_HTML, MAINTENANT_JEUX } = O
  const G = `${ST}/Gestes.tsx`, CSS = `${ST}/gestes.css`

  // ── EG-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    for (const f of [G, CSS]) if (!existe(f)) e.push(`${f} absent`)
    const s = code(G)
    if (s !== null) {
      for (const n of ['PauseAgent', 'GestesEnvoi', 'ConsigneAgent']) if (!new RegExp(`export\\s+(?:function|const)\\s+${n}\\b`).test(s)) e.push(`Gestes.tsx n'exporte pas ${n}`)
      const adr = adressesApi(s), passes = appelsApi(s)
      for (const a of adr) {
        if (!ROUTES.some((r) => a.startsWith(r))) e.push(`Gestes.tsx appelle ${court(a, 60)} : hors des routes de 026-117`)
        else if (a.startsWith('/api/controle/pilotage/consignes') && !/ConsigneAgent/.test(s)) e.push('Gestes.tsx écrit vers /consignes hors de ConsigneAgent')
      }
      // Chaque adresse passe par apiDirection( : directement, ou par le chemin d'un geste que useGeste envoie par apiDirection(.
      const indirectes = adr.filter((a) => !passes.includes(a))
      if (indirectes.length && !/apiDirection(?:<[^>]*>)?\(\s*a\.chemin\b/.test(s)) e.push(`Gestes.tsx : ${indirectes.length} adresse(s) hors d'un appel apiDirection( (${court(indirectes[0], 50)})`)
      for (const [re, quoi] of [[/\/envois\//, '/envois/'], [/navigator\.clipboard/, 'navigator.clipboard']]) if (re.test(s)) e.push(`Gestes.tsx contient ${quoi}`)
      e.push(...interditsSource(G, { html: false }))
    }
    S.juger('EG-1', e, `${G} exporte PauseAgent, GestesEnvoi et ConsigneAgent ; il n'appelle, par apiDirection(, que bloc=decider, bloc=appeler, /decisions/, /appels/, /agents/, /gestes, /consignes et /api/controle/pause ; ni fetch(, ni supabase, ni /envois/, ni navigator.clipboard`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'EG-1'), 'EG-1 en échec : les gestes n’existent pas, aucun navigateur n’est lancé'); return }
  }
  // EG-12 (sources) : gestes.css sans hexadécimal ; gardes du mouvement.
  {
    const css = lire(CSS)
    const hex = hexDans(css)
    if (hex.length) faute('EG-12', `gestes.css : couleur(s) en hexadécimal (${hex.slice(0, 3).join(', ')})`)
    for (const g of gardeMouvement(css, 'gestes.css')) faute('EG-12', g)
    vu('EG-12')
  }

  // ── Les données, l'interception ─────────────────────────────────────────────────────────────────────────────────────
  const T = tirerTresorerie(H), D = tirerDirect(H)
  const carteDe = (type) => D.reponse.valeur.attention.valeur.cartes.find((c) => c.geste?.type === type)?.cle
  const DEC = jeu('decider.json').reponse.valeur.cartes, EP = jeu('decider-epinglee.json').reponse.valeur.cartes.find((c) => c.epinglee)
  const avecAuto = (actif) => { const d = structuredClone(D); d.reponse.valeur.barre.valeur.auto = { actif, texte: 'AUTO' }; return d }
  /** Le bloc decider : épinglé seulement si la lecture porte decision=<id> (le lien profond doit le demander). */
  const decider = (a) => (a.url.searchParams.get('decision') === EP.id ? J('decider-epinglee.json') : J('decider.json'))
  const base = (plus = {}) => ({ direct: D, fil: J('vues/fil.json'), tresorerie: T, reglages: J('reglages.json'), 'bloc:decider': decider, 'bloc:appeler': J('appeler.json'), 'agent:*': (a) => { const j = jeu('vues/agent-modele.json'); j.reponse.valeur.nom = a.url.searchParams.get('nom'); return { statut: 200, reponse: j.reponse } }, ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  /** L'interception des POST : les règles d'abord (la première qui convient), la reconfirmation rend un jeton, sinon 200. */
  function repondeur(regles = []) {
    const posts = [], jetons = []
    const f = (a) => {
      posts.push(a)
      if (a.url.pathname === '/api/controle/reconfirmer') { const j = `jeton-du-juge-${jetons.length + 1}-${H.entre(1000, 9999)}`; jetons.push({ jeton: j, portee: a.corps?.portee }); return { statut: 200, reponse: { jeton: j, expire_dans: 300 } } }
      for (const r of regles) if (r.si(a)) return r.rep(a)
      return { statut: 200, reponse: { ok: true } }
    }
    return { posts, jetons, f, hors: () => posts.filter((a) => a.url.pathname !== '/api/controle/reconfirmer') }
  }
  const boite = (page) => page.evaluate(() => { const b = document.querySelector('[data-reconfirmer]'); return !!b && b.getBoundingClientRect().height > 0 })
  const confirmerMdp = async (page) => { await page.fill('[data-reconfirmer] input[type="password"]', MDP); await page.press('[data-reconfirmer] input[type="password"]', 'Enter') }
  const attendrePosts = async (rep, n, ms = 3000) => { for (let t = 0; t < ms && rep.hors().length < n; t += 100) await attendre(100); await attendre(200) }
  /** Le champ de motif apparu après un appui (ni le mot de passe, ni Transmettre, ni une consigne). */
  const champMotif = (page) => page.evaluate(() => {
    const e = [...document.querySelectorAll('.mc input:not([type="password"]):not([type="number"]), .mc textarea')].find((i) => !i.closest('[data-transmettre], [data-reconfirmer], [data-champ-consigne], [data-consigne-agent], [data-gestes-envoi]') && i.getBoundingClientRect().height > 0)
    if (!e) return null
    e.setAttribute('data-juge-motif', '1')
    return '[data-juge-motif="1"]'
  })
  const ouvrirFeuille = async (page, type) => {
    await page.waitForSelector(`[data-zone="attention"] [data-carte-attention="${carteDe(type)}"]`, { timeout: 15_000 }).catch(() => {})
    await page.click(`[data-zone="attention"] [data-carte-attention="${carteDe(type)}"]`)
    await page.waitForSelector(`[data-feuille="${type}"] [data-carte-${type === 'decisions' ? 'decision' : 'appel'}]`, { timeout: 8000 }).catch(() => {})
    await attendre(200)
  }
  const interdits = async (page, quoi) => { for (const t of await x.gestesInterdits(page, '.mc', MOTS_INTERDITS)) faute('EG-12', `${quoi} : bouton ou lien « ${court(t, 50)} »`) }

  const srv = await demarrer({ critere: 'EG-2' })
  const captures = {}
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // EG-2, EG-3, EG-4 : la feuille des décisions, trancher sans enjeu, trancher à enjeu (et la portée annoncée par le serveur).
  scenario(['EG-2', 'EG-3', 'EG-4', 'EG-11', 'EG-12'], 'décisions', async () => {
    let refus = 0
    const rep = repondeur([{ si: (a) => a.url.pathname === `/api/controle/pilotage/decisions/${DEC[1].id}` && refus++ === 0, rep: () => ({ statut: 403, reponse: { error: 'Reconfirmation requise.', code: 'reconfirmation_requise', portee: 'securite' } }) }])
    const { page, fermer } = await ouvrir('/controle/station', base({ post: rep.f }))
    await ouvrirFeuille(page, 'decisions')
    // EG-2 : autant de [data-choix] que d'options, libellés, recommandée.
    const cartes = await page.$$eval('[data-feuille="decisions"] [data-carte-decision]', (l) => l.map((e) => ({ id: e.getAttribute('data-carte-decision'), choix: [...e.querySelectorAll('[data-choix]')].map((b) => ({ cle: b.getAttribute('data-choix'), texte: b.textContent.replace(/\s+/g, ' ').trim(), reco: b.hasAttribute('data-recommandee') })) })))
    if (!cartes.length) faute('EG-2', 'la carte Attention de décisions n’ouvre pas [data-feuille="decisions"] avec ses cartes')
    for (const c of DEC) {
      const r = cartes.find((y) => y.id === c.id)
      if (!r) { faute('EG-2', `décision ${c.id} absente de la feuille`); continue }
      if (r.choix.map((y) => y.cle).join() !== c.options.map((o) => o.cle).join()) faute('EG-2', `décision ${c.id} : choix ${r.choix.map((y) => y.cle).join(', ')} ; ${c.options.map((o) => o.cle).join(', ')} servis`)
      for (const o of c.options) { const b = r.choix.find((y) => y.cle === o.cle); if (b && b.texte !== espaces(o.libelle)) faute('EG-2', `décision ${c.id}, option ${o.cle} : « ${b.texte} », « ${o.libelle} » servi`); if (b && b.reco !== !!o.recommandee) faute('EG-2', `décision ${c.id}, option ${o.cle} : data-recommandee ${b.reco}, ${!!o.recommandee} servi`) }
    }
    await interdits(page, 'feuille des décisions')
    captures.bureau = await capturer(page, x.cheminCapture('bureau.jpg'))
    // EG-3 : sans enjeu, un appui = un POST { choix }, sans en-tête ni boîte.
    const c0 = DEC[0], o0 = c0.options[H.entre(0, c0.options.length - 1)]
    await page.click(`[data-carte-decision="${c0.id}"] [data-choix="${o0.cle}"]`)
    const boiteSansEnjeu = await boite(page)
    await attendrePosts(rep, 1)
    const p3 = rep.hors()
    if (boiteSansEnjeu || rep.jetons.length) faute('EG-3', 'décision sans enjeu : la boîte de reconfirmation s’ouvre')
    if (p3.length !== 1 || p3[0].url.pathname !== `/api/controle/pilotage/decisions/${c0.id}`) faute('EG-3', `décision sans enjeu : ${p3.length} POST (${p3.map((a) => a.chemin).join(', ')}), un seul vers /api/controle/pilotage/decisions/${c0.id} attendu`)
    else {
      if (JSON.stringify(p3[0].corps) !== JSON.stringify({ choix: o0.cle })) faute('EG-3', `corps ${JSON.stringify(p3[0].corps)}, { choix: '${o0.cle}' } attendu`)
      if ('x-presti-reconfirmation' in p3[0].entetes) faute('EG-3', 'décision sans enjeu : le POST porte x-presti-reconfirmation')
    }
    // EG-4 : à enjeu argent : la boîte avant tout POST, puis le POST avec le jeton ; 403 portée securite → la boîte se rouvre.
    await page.waitForSelector(`[data-carte-decision="${DEC[1].id}"] [data-choix]`, { timeout: 5000 }).catch(() => {})
    const avant = rep.hors().length
    await page.click(`[data-carte-decision="${DEC[1].id}"] [data-choix="${DEC[1].options[0].cle}"]`)
    await page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
    await attendre(300)
    if (!(await boite(page))) faute('EG-4', 'décision à enjeu argent : [data-reconfirmer] ne s’ouvre pas')
    if (rep.hors().length !== avant) faute('EG-4', `décision à enjeu : ${rep.hors().length - avant} POST avant la reconfirmation`)
    await confirmerMdp(page).catch((e) => faute('EG-4', `mot de passe impossible à saisir (${court(e.message, 50)})`))
    await attendrePosts(rep, avant + 1)
    const p4 = rep.hors().slice(avant)
    const j1 = rep.jetons[0]
    if (!j1 || j1.portee !== 'argent') faute('EG-4', `la reconfirmation porte la portée « ${j1?.portee} », argent attendue`)
    if (!p4.length || p4[0].url.pathname !== `/api/controle/pilotage/decisions/${DEC[1].id}` || p4[0].entetes['x-presti-reconfirmation'] !== j1?.jeton) faute('EG-4', `après la reconfirmation : ${p4.map((a) => `${a.chemin} (${a.entetes['x-presti-reconfirmation'] ?? 'sans jeton'})`).join(', ') || 'aucun POST'} ; le POST de la décision avec le jeton du juge attendu`)
    await page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
    await attendre(300)
    if (!(await boite(page))) faute('EG-4', '403 reconfirmation_requise (portée securite) : la boîte ne se rouvre pas')
    else {
      await confirmerMdp(page).catch(() => {})
      await attendrePosts(rep, avant + 2)
      const j2 = rep.jetons[1]
      if (!j2 || j2.portee !== 'securite') faute('EG-4', `la boîte rouverte demande la portée « ${j2?.portee} », securite (annoncée par le serveur) attendue`)
      const der = rep.hors().at(-1)
      if (!der || der.url.pathname !== `/api/controle/pilotage/decisions/${DEC[1].id}` || der.entetes['x-presti-reconfirmation'] !== j2?.jeton) faute('EG-4', 'après la seconde reconfirmation, le POST de la décision ne porte pas le nouveau jeton')
    }
    DETAILS['EG-2'] = `la carte Attention de décisions ouvre la feuille : ${DEC.length} décisions, un [data-choix] par option (2 et 3), libellés servis, data-recommandee ; sept options : voir EG-14`
    DETAILS['EG-3'] = `sans enjeu : un appui → un POST { choix: '${o0.cle}' } vers /decisions/${c0.id.slice(0, 8)}…, sans en-tête ni boîte`
    DETAILS['EG-4'] = 'enjeu argent : [data-reconfirmer] avant tout POST, puis le POST avec le jeton du juge ; 403 reconfirmation_requise (securite) → la boîte rouverte en securite, puis le POST avec le nouveau jeton'
    await fermer()
  })
  // EG-5 : les appels.
  scenario(['EG-5', 'EG-12'], 'appels', async () => {
    const A = jeu('appeler.json').reponse.valeur.appels
    const rep = repondeur()
    const { page, fermer } = await ouvrir('/controle/station', base({ post: rep.f }))
    await ouvrirFeuille(page, 'appels')
    const cartes = await page.$$eval('[data-feuille="appels"] [data-carte-appel]', (l) => l.map((e) => ({ id: e.getAttribute('data-carte-appel'), rendu: !!e.querySelector('[data-appel-rendu]'), tels: [...e.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')), appeler: [...e.querySelectorAll('a')].filter((a) => /Appeler/.test(a.textContent)).map((a) => a.getAttribute('href')) })))
    if (cartes.length !== A.length) faute('EG-5', `${cartes.length} carte(s) d'appel, ${A.length} servies`)
    for (const a of A) {
      const c = cartes.find((y) => y.id === a.id)
      if (!c) { faute('EG-5', `appel ${a.id} absent`); continue }
      const doit = a.source === 'Rendez-vous réservé' || a.source === 'Réponse à un message'
      if (c.rendu !== doit) faute('EG-5', `« ${a.source} » : [data-appel-rendu] ${c.rendu ? 'présent' : 'absent'}`)
      if (a.tel) { if (!c.appeler.includes(a.tel)) faute('EG-5', `« ${a.source} » : lien « Appeler » ${c.appeler.join(', ') || 'absent'}, ${a.tel} servi`) }
      else if (c.tels.length) faute('EG-5', `« ${a.source} » sans numéro : un lien tel: ${c.tels[0]}`)
    }
    await interdits(page, 'feuille des appels')
    for (const a of A.filter((y) => y.sourceAppel)) {
      const n = rep.hors().length
      await page.click(`[data-carte-appel="${a.id}"] [data-appel-rendu]`).catch((e) => faute('EG-5', `appel rendu de ${a.id} impossible (${court(e.message, 50)})`))
      await attendrePosts(rep, n + 1)
      const p = rep.hors().slice(n)
      const attendu = `/api/controle/pilotage/appels/${a.id}${a.sourceAppel === 'rdv' ? '?source=rdv' : ''}`
      if (p.length !== 1 || p[0].chemin !== attendu) faute('EG-5', `« ${a.source} » : ${p.map((y) => y.chemin).join(', ') || 'aucun POST'} ; un seul POST ${attendu} attendu`)
      else { if (JSON.stringify(p[0].corps ?? {}) !== '{}') faute('EG-5', `« ${a.source} » : corps ${JSON.stringify(p[0].corps)}, {} attendu`); if ('x-presti-reconfirmation' in p[0].entetes) faute('EG-5', 'appel rendu : en-tête x-presti-reconfirmation') }
      if (await boite(page)) faute('EG-5', 'appel rendu : une boîte de reconfirmation s’ouvre')
      await page.waitForSelector(`[data-carte-appel="${A[0].id}"]`, { timeout: 4000 }).catch(() => {})
    }
    DETAILS['EG-5'] = 'rendez-vous réservé et réponse : [data-appel-rendu] ; commande de site : aucun ; un appui → un POST {} vers /appels/<id>?source=rdv (rendez-vous) ou /appels/<id> (réponse), sans en-tête ; « Appeler » = le tel servi, aucune carte sans numéro n’a de lien tel:'
    await fermer()
  })
  // EG-6 : AUTO, coupé puis rallumé.
  scenario(['EG-6'], 'auto', async () => {
    const vus = []
    for (const actif of [true, false]) {
      const rep = repondeur()
      const { page, fermer } = await ouvrir('/controle/station', base({ direct: avecAuto(actif), post: rep.f }))
      await page.waitForSelector('[data-zone="barre"] [data-auto]', { timeout: 15_000 }).catch(() => {})
      await attendre(300)
      await page.click('[data-zone="barre"] [data-auto]')
      await attendre(250)
      const sel = await champMotif(page)
      if (!sel) { faute('EG-6', `AUTO ${actif ? 'vert' : 'en pause'} : aucun motif demandé`); await fermer(); continue }
      await page.fill(sel, 'ab'); await page.press(sel, 'Enter'); await attendre(500)
      if (rep.posts.length || await boite(page)) faute('EG-6', `AUTO : un motif de 2 signes envoie ${rep.posts.length} POST${await boite(page) ? ' ou ouvre la boîte' : ''}`)
      const motif = `Essai du juge ${H.entre(100, 999)}`
      await page.fill(sel, motif); await page.press(sel, 'Enter')
      await page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
      await attendre(200)
      if (!(await boite(page))) faute('EG-6', `AUTO ${actif ? 'vert' : 'en pause'} : la boîte securite ne s'ouvre pas`)
      if (rep.hors().length) faute('EG-6', 'AUTO : un POST part avant la reconfirmation')
      await confirmerMdp(page).catch(() => {})
      await attendrePosts(rep, 1)
      const j = rep.jetons[0], p = rep.hors()
      if (!j || j.portee !== 'securite') faute('EG-6', `AUTO : portée « ${j?.portee} », securite attendue`)
      if (p.length !== 1 || p[0].url.pathname !== '/api/controle/pause' || JSON.stringify(p[0].corps) !== JSON.stringify({ actif, motif }) || p[0].entetes['x-presti-reconfirmation'] !== j?.jeton) faute('EG-6', `AUTO ${actif ? 'vert' : 'en pause'} : ${p.map((a) => `${a.chemin} ${JSON.stringify(a.corps)}`).join(', ') || 'aucun POST'} ; un POST /api/controle/pause ${JSON.stringify({ actif, motif })} avec le jeton attendu`)
      vus.push(`${actif ? 'vert' : 'en pause'} → ${JSON.stringify({ actif, motif: '…' })}`)
      await fermer()
    }
    DETAILS['EG-6'] = `motif de 2 signes : rien ; puis la boîte securite avant tout POST ; ${vus.join(' ; ')} vers /api/controle/pause, avec le jeton`
  })
  // EG-7 : la pause d'un agent.
  scenario(['EG-7'], 'pause agent', async () => {
    const rep = repondeur()
    const d = structuredClone(D), ag = d.reponse.valeur.equipage.valeur.agents.find((a) => a.nom === 'facteur')
    ag.etat = 'actif'
    const { page, fermer } = await ouvrir('/controle/station', base({ direct: d, post: rep.f }))
    await page.waitForSelector('[data-agent="facteur"] [data-pause-agent="facteur"]', { timeout: 15_000 }).catch(() => {})
    await page.click('[data-agent="facteur"] [data-pause-agent="facteur"]').catch((e) => faute('EG-7', `[data-pause-agent="facteur"] introuvable (${court(e.message, 50)})`))
    await attendre(250)
    if (new URL(page.url()).searchParams.has('agent')) faute('EG-7', `l'appui sur Pause pose ?agent= (${new URL(page.url()).search})`)
    const sel = await champMotif(page)
    if (!sel) faute('EG-7', 'Pause : aucun motif demandé')
    else {
      const motif = `Pause d'essai ${H.entre(10, 99)}`
      await page.fill(sel, motif); await page.press(sel, 'Enter')
      await page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
      await attendre(200)
      if (!(await boite(page))) faute('EG-7', 'Pause : la boîte securite ne s’ouvre pas')
      if (rep.hors().length) faute('EG-7', 'Pause : un POST part avant la reconfirmation')
      await confirmerMdp(page).catch(() => {})
      await attendrePosts(rep, 1)
      const j = rep.jetons[0], p = rep.hors()
      if (!j || j.portee !== 'securite') faute('EG-7', `Pause : portée « ${j?.portee} », securite attendue`)
      if (p.length !== 1 || p[0].url.pathname !== '/api/controle/pilotage/agents/facteur' || JSON.stringify(p[0].corps) !== JSON.stringify({ pause: true, motif }) || p[0].entetes['x-presti-reconfirmation'] !== j?.jeton) faute('EG-7', `Pause : ${p.map((a) => `${a.chemin} ${JSON.stringify(a.corps)}`).join(', ') || 'aucun POST'} ; un POST /api/controle/pilotage/agents/facteur ${JSON.stringify({ pause: true, motif })} avec le jeton attendu`)
      if (new URL(page.url()).searchParams.has('agent')) faute('EG-7', 'après la pause, ?agent= est posé')
    }
    DETAILS['EG-7'] = 'Pause : sans ?agent=, motif, boîte securite avant tout POST, puis { pause: true, motif } vers /api/controle/pilotage/agents/facteur avec le jeton'
    await fermer()
  })
  // EG-8 et la capture du téléphone : le lien profond, carte épinglée au centre à 390×844.
  scenario(['EG-8', 'EG-11'], 'lien profond', async () => {
    const { page, s, fermer } = await ouvrir(`/controle/station?decision=${EP.id}`, base(), { largeur: 390, hauteur: 844, mobile: true })
    await page.waitForSelector('[data-feuille="decisions"] [data-epinglee]', { timeout: 15_000 }).catch(() => {})
    await attendre(500)
    const r = await page.evaluate(() => { const e = document.querySelector('[data-feuille="decisions"] [data-epinglee]'); if (!e) return null; const b = e.getBoundingClientRect(); const au = document.elementFromPoint(Math.min(389, Math.max(0, b.left + b.width / 2)), Math.min(843, Math.max(0, b.top + b.height / 2))); return { id: e.getAttribute('data-carte-decision'), vis: !!au && (au === e || e.contains(au)), haut: b.top, bas: b.bottom } })
    const lectures = s.journal.filter((a) => a.cle === 'bloc:decider').map((a) => a.url.searchParams.get('decision'))
    if (!lectures.includes(EP.id)) faute('EG-8', `la feuille ne lit pas bloc=decider&decision=${EP.id} (lectures : ${lectures.map((y) => y ?? 'sans decision').join(', ') || 'aucune'})`)
    if (!r) faute('EG-8', 'lien profond : aucune carte [data-epinglee] dans la feuille des décisions')
    else {
      if (r.id !== EP.id) faute('EG-8', `la carte épinglée est ${r.id}, ${EP.id} attendue`)
      if (!r.vis) faute('EG-8', `la carte épinglée n'est pas visible au centre (elementFromPoint ; haut ${Math.round(r.haut)}, bas ${Math.round(r.bas)})`)
    }
    captures.telephone = await capturer(page, x.cheminCapture('telephone.jpg'))
    DETAILS['EG-8'] = `/controle/station?decision=<id> à 390×844 : la feuille lit bloc=decider&decision=<id>, la carte ${EP.id.slice(0, 8)}… [data-epinglee] visible en son centre`
    await fermer()
  })
  // EG-9 : rôle lecture.
  scenario(['EG-9'], 'lecture', async () => {
    const rep = repondeur()
    const { page, fermer } = await ouvrir(`/controle/station?decision=${EP.id}`, { ...base({ post: rep.f }), journal: J('role-lecture.json') })
    await page.waitForSelector('[data-feuille="decisions"] [data-carte-decision]', { timeout: 15_000 }).catch(() => {})
    await attendre(500)
    const r = await page.evaluate(() => ({ feuille: !!document.querySelector('[data-feuille="decisions"] [data-carte-decision]'), gestes: [...document.querySelectorAll('[data-choix], [data-appel-rendu], [data-pause-agent], [data-consigne-agent], [data-nav="reglages"], [data-plus="reglages"], a[href*="vue=reglages"], [data-notifications]')].map((e) => [...e.attributes].map((a) => a.name).find((n) => n.startsWith('data-')) ?? e.tagName), lecture: /lecture seule/.test(document.querySelector('.mc')?.innerText ?? '') }))
    if (!r.feuille) faute('EG-9', 'rôle lecture : la feuille des décisions (lien profond) ne s’affiche pas : [data-choix] ne serait pas éprouvé')
    if (r.gestes.length) faute('EG-9', `rôle lecture : ${r.gestes.length} geste(s) rendu(s) (${[...new Set(r.gestes)].slice(0, 4).join(', ')})`)
    if (!r.lecture) faute('EG-9', 'rôle lecture : « lecture seule » n’est pas écrit')
    await page.click('[data-feuille="decisions"] [data-fermer]').catch(() => {})
    await page.click('[data-auto]').catch(() => {})
    await attendre(800)
    if (rep.posts.length) faute('EG-9', `rôle lecture : l'appui sur [data-auto] envoie ${rep.posts.length} POST`)
    if (await champMotif(page)) faute('EG-9', 'rôle lecture : l’appui sur [data-auto] demande un motif')
    DETAILS['EG-9'] = 'rôle lecture : ni [data-choix], ni [data-appel-rendu], ni [data-pause-agent], ni [data-consigne-agent], ni Réglages ; [data-auto] inerte ; « lecture seule »'
    await fermer()
  })
  // EG-10 : 390×844, boîte de reconfirmation ouverte.
  scenario(['EG-10'], 'boîte au téléphone', async () => {
    const rep = repondeur()
    const { page, fermer } = await ouvrir('/controle/station', base({ post: rep.f }), { largeur: 390, hauteur: 844, mobile: true })
    await ouvrirFeuille(page, 'decisions')
    await page.click(`[data-carte-decision="${DEC[1].id}"] [data-choix="${DEC[1].options[0].cle}"]`).catch((e) => faute('EG-10', `choix à enjeu impossible (${court(e.message, 50)})`))
    await page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
    await attendre(300)
    const m = await page.evaluate(() => { const i = document.querySelector('[data-reconfirmer] input[type="password"]'); return { boite: !!document.querySelector('[data-reconfirmer]'), deb: window.__JUGE__.debordements(390), petits: [...document.querySelectorAll('button, a[href], [role="button"]')].filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.height < 43.5 && e.closest('[data-reconfirmer], [data-feuille]') }).map((e) => `${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 25)} (${Math.round(e.getBoundingClientRect().height)} px)`), police: i ? parseFloat(getComputedStyle(i).fontSize) : null } })
    if (!m.boite) faute('EG-10', '390×844 : la boîte de reconfirmation ne s’ouvre pas')
    if (m.deb.length) faute('EG-10', `390×844, boîte ouverte : ${m.deb[0]}${m.deb.length > 1 ? ` (et ${m.deb.length - 1} autre(s))` : ''}`)
    if (m.petits.length) faute('EG-10', `390×844, boîte ouverte : bouton de moins de 44 px (${m.petits.slice(0, 2).join(', ')})`)
    if (m.police === null || m.police < 16) faute('EG-10', `le champ du mot de passe a une police de ${m.police} px, 16 au moins`)
    DETAILS['EG-10'] = `390×844, boîte ouverte : rien hors de 0..390, rien de rogné par un cadre « overflow: hidden », aucun défilement horizontal, boutons de la boîte et de la feuille ≥ 44 px, mot de passe en ${m.police} px`
    await fermer()
  })
  // EG-15 : la consigne à un agent.
  scenario(['EG-15', 'EG-12'], 'consigne agent', async () => {
    const rep = repondeur()
    const { page, dialogues, fermer } = await ouvrir('/controle/station', base({ post: rep.f }))
    await page.waitForSelector('[data-zone="equipage"] [data-agent]', { timeout: 15_000 }).catch(() => {})
    await attendre(300)
    const cartes = await page.$$eval('[data-zone="equipage"] [data-agent]', (l) => l.map((e) => { const b = e.querySelector(`[data-consigne-agent="${e.getAttribute('data-agent')}"]`); return { nom: e.getAttribute('data-agent'), h: b ? b.getBoundingClientRect().height : null } }))
    for (const c of cartes) { if (c.h === null) faute('EG-15', `${c.nom} : [data-consigne-agent="${c.nom}"] absent`); else if (c.h < 43.5) faute('EG-15', `${c.nom} : ✉ de ${Math.round(c.h)} px, 44 au moins`) }
    const nom = D.reponse.valeur.equipage.valeur.agents[H.entre(0, D.reponse.valeur.equipage.valeur.agents.length - 1)].nom
    const sel = `[data-zone="equipage"] [data-agent="${nom}"] [data-consigne-agent="${nom}"]`
    await page.click(sel)
    await attendre(250)
    if (new URL(page.url()).searchParams.has('agent')) faute('EG-15', 'l’appui sur ✉ pose ?agent=')
    if (await boite(page)) faute('EG-15', 'l’appui sur ✉ ouvre la boîte de reconfirmation')
    const champ = await page.evaluate((n) => { const c = document.querySelector(`[data-agent="${n}"]`); const i = c && [...c.querySelectorAll('input, textarea')].find((y) => y.type !== 'password' && y.getBoundingClientRect().height > 0); if (!i) return null; i.setAttribute('data-juge-consigne', '1'); return '[data-juge-consigne="1"]' }, nom)
    if (!champ) { faute('EG-15', `✉ de ${nom} n'ouvre aucun champ`); await fermer(); return }
    await page.fill(champ, '')
    await page.type(champ, 'y'.repeat(201), { delay: 0 })
    const lg = await page.evaluate((c) => document.querySelector(c)?.value.length, champ)
    if (lg > 200) { await page.press(champ, 'Enter'); await attendre(500); if (rep.posts.length) faute('EG-15', '201 signes : la consigne part') }
    const texte = `Consigne à ${nom} n° ${H.entre(10, 99)}`
    await page.fill(champ, texte); await page.press(champ, 'Enter')
    await attendrePosts(rep, 1)
    const p = rep.hors()
    if (p.length !== 1 || p[0].url.pathname !== '/api/controle/pilotage/consignes') faute('EG-15', `${p.length} POST (${p.map((a) => a.chemin).join(', ')}), un seul vers /api/controle/pilotage/consignes attendu`)
    else {
      if (JSON.stringify(p[0].corps) !== JSON.stringify({ texte, agent: nom })) faute('EG-15', `corps ${JSON.stringify(p[0].corps)}, exactement ${JSON.stringify({ texte, agent: nom })} attendu`)
      if ('x-presti-reconfirmation' in p[0].entetes) faute('EG-15', 'la consigne porte x-presti-reconfirmation')
    }
    if (rep.jetons.length) faute('EG-15', 'la consigne demande le mot de passe')
    // Le texte piégé, saisi puis rendu par le message de retour : aucune image, aucune boîte.
    const champ2 = (await page.$(champ)) ? champ : await page.evaluate((n) => { const c = document.querySelector(`[data-agent="${n}"]`); const i = c && [...c.querySelectorAll('input, textarea')].find((y) => y.type !== 'password'); if (!i) return null; i.setAttribute('data-juge-consigne', '2'); return '[data-juge-consigne="2"]' }, nom)
    if (champ2) { await page.fill(champ2, PIEGE_HTML); await page.press(champ2, 'Enter'); await attendrePosts(rep, 2) }
    const img = await page.evaluate(() => [...document.querySelectorAll('.mc img')].filter((i) => /(^|\/)x$/.test(i.getAttribute('src') ?? '') || i.hasAttribute('onerror')).length)
    if (img) faute('EG-15', `le texte piégé rendu par le message de retour crée ${img} image(s)`)
    for (const d of dialogues) faute('EG-15', `boîte ouverte par la page : ${d}`)
    await interdits(page, 'équipage et consignes')
    DETAILS['EG-15'] = `✉ ≥ 44 px sur chaque carte d'agent ; un appui ouvre le champ sans boîte ni ?agent= ; « ${texte} » → un POST { texte, agent: '${nom}' } sans en-tête ; 201 signes ne partent pas ; le texte piégé rendu ne crée aucune image`
    await fermer()
  })
  // EG-13 : les gestes du fondateur sur l'envoi. Plus aucune date d'ouverture (décision du 05/10/2026) : la seule chose qui compte est
  // l'état servi (mesure à sec, épreuve, notice) ; la date figée ne sert qu'à prouver qu'elle n'y change rien.
  scenario(['EG-13', 'EG-12'], 'gestes envoi', async () => {
    const jour = (iso) => PARIS(iso)
    const variante = (f) => (a) => { const j = jeu('salle-envois-gestes.json'); f?.(j.reponse.valeur); void a; return { statut: 200, reponse: j.reponse } }
    const PAN = '[data-salle-panneau="envois"]'
    const ouvrirEnvois = async (heure, v, plus = {}) => {
      const rep = repondeur()
      const o = await ouvrir('/controle/station?salle=envois', base({ 'salle:envois': variante(v), post: rep.f, ...plus }), { heureFigee: jour(heure) })
      await o.page.waitForSelector(`${PAN} [data-gestes-envoi], ${PAN} [data-canal]`, { timeout: 15_000 }).catch(() => {})
      await attendre(300)
      return { ...o, rep }
    }
    const etatOuverture = (page) => page.evaluate((p) => { const b = document.querySelector(`${p} [data-geste="ouvrir_envoi_froid"]`); return { bouton: !!b, inactif: b ? b.disabled || b.getAttribute('aria-disabled') === 'true' : null, texte: (document.querySelector(`${p} [data-gestes-envoi]`)?.innerText ?? '').replace(/[’‘]/g, '\'').replace(/[  ]/g, ' ') } }, PAN)
    // Le dernier élément dit si le bouton d'ouverture doit être inactif : la mesure à sec et la notice l'empêchent ; l'épreuve de bout
    // en bout (décision du 05/10/2026 soir, 0131) ne l'empêche PLUS : elle s'affiche en note (`[data-note-epreuve]`) tant qu'elle n'a pas réussi,
    // et seulement alors. Le bouton reste actif quand elle seule manque (palier P0).
    const cas = [
      ['2026-10-06T12:00:00+02:00', (v) => { v.gestes.mesure_a_sec = false; v.gestes.epreuve_passee = false; v.gestes.notice_verifiee_le = null }, PHRASES.mesure, 'le 06/10, rien de prouvé : la mesure à sec d\'abord', true, true],
      ['2030-03-04T10:00:00+01:00', (v) => { v.gestes.epreuve_passee = false }, PHRASES.epreuve, 'en 2030, épreuve seule ratée : elle n\'empêche plus l\'ouverture', false, true],
      ['2026-10-06T10:00:00+02:00', (v) => { v.gestes.mesure_a_sec = false }, PHRASES.mesure, 'le 06/10, mesure à sec ratée', true, false],
      ['2026-10-06T10:00:00+02:00', (v) => { v.gestes.epreuve_passee = false }, PHRASES.epreuve, 'le 06/10, épreuve seule ratée : bouton actif et note de montée de palier', false, true],
      ['2026-10-06T10:00:00+02:00', (v) => { v.gestes.notice_verifiee_le = new Date(Date.parse(MAINTENANT_JEUX) - 8 * 86_400_000).toISOString() }, PHRASES.notice, 'le 06/10, notice de 8 jours', true, false],
    ]
    for (const [h, v, phrase, quoi, inactifAttendu, noteAttendue] of cas) {
      const o = await ouvrirEnvois(h, v)
      const e = await etatOuverture(o.page)
      if (!e.bouton || e.inactif !== inactifAttendu) faute('EG-13', `${quoi} : « Ouvrir l'envoi à froid » ${e.bouton ? (e.inactif ? 'inactif' : 'actif') : 'absent'}, ${inactifAttendu ? 'inactif' : 'actif'} attendu`)
      if (!e.texte.includes(phrase)) faute('EG-13', `${quoi} : « ${phrase} » absent (« ${court(e.texte, 80)} »)`)
      if (e.texte.includes(PHRASES.epreuve) !== noteAttendue) faute('EG-13', `${quoi} : la note de l'épreuve de bout en bout est ${noteAttendue ? 'absente' : 'présente alors que l\'épreuve a réussi'}`)
      if (/12\/10|pas avant|lundi/i.test(e.texte)) faute('EG-13', `${quoi} : l'écran parle encore d'une date d'ouverture (« ${court(e.texte, 80)} »)`)
      if (inactifAttendu) {
        await o.page.click(`${PAN} [data-geste="ouvrir_envoi_froid"]`, { force: true, timeout: 1000 }).catch(() => {})
        await attendre(300)
        if (o.rep.posts.length) faute('EG-13', `${quoi} : l'appui envoie ${o.rep.posts.length} POST`)
      }
      await o.fermer()
    }
    // Tout est prêt SAUF l'épreuve de bout en bout (ouverture au palier P0, décision du 05/10/2026 soir) : confirmation écrite, puis la boîte securite, puis UN POST { geste: 'ouvrir_envoi_froid' }.
    {
      const o = await ouvrirEnvois('2026-10-06T10:00:00+02:00', (v) => { v.gestes.epreuve_passee = false })
      const e = await etatOuverture(o.page)
      if (/12\/10|pas avant|lundi/i.test(e.texte)) faute('EG-13', `tout prêt : l'écran parle encore d'une date d'ouverture (« ${court(e.texte, 80)} »)`)
      if (!e.bouton || e.inactif) faute('EG-13', `le 06/10, mesure et notice prêtes, épreuve non passée : « Ouvrir l'envoi à froid » ${e.bouton ? 'inactif' : 'absent'}`)
      else {
        await o.page.click(`${PAN} [data-geste="ouvrir_envoi_froid"]`)
        await attendre(250)
        const conf = apos(await o.page.evaluate((p) => document.querySelector(p)?.innerText ?? '', PAN))
        if (!conf.includes(PHRASES.confirmation)) faute('EG-13', 'la confirmation écrite « Ouvrir l’envoi à froid ? Les agents rempliront… » n’est pas demandée')
        if (await boite(o.page) || o.rep.posts.length) faute('EG-13', 'la boîte ou un POST avant la confirmation écrite')
        await o.page.click(`${PAN} [data-confirmer], ${PAN} button:has-text("Confirmer")`).catch((er) => faute('EG-13', `bouton de confirmation introuvable (${court(er.message, 40)})`))
        await o.page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
        await attendre(200)
        if (!(await boite(o.page))) faute('EG-13', 'ouverture : la boîte securite ne s’ouvre pas après la confirmation')
        if (o.rep.hors().length) faute('EG-13', 'ouverture : un POST avant la reconfirmation')
        await confirmerMdp(o.page).catch(() => {})
        await attendrePosts(o.rep, 1)
        const j = o.rep.jetons[0], p = o.rep.hors()
        if (!j || j.portee !== 'securite') faute('EG-13', `ouverture : portée « ${j?.portee} », securite attendue`)
        if (p.length !== 1 || p[0].url.pathname !== '/api/controle/pilotage/gestes' || JSON.stringify(p[0].corps) !== JSON.stringify({ geste: 'ouvrir_envoi_froid' }) || p[0].entetes['x-presti-reconfirmation'] !== j?.jeton) faute('EG-13', `ouverture : ${p.map((a) => `${a.chemin} ${JSON.stringify(a.corps)}`).join(', ') || 'aucun POST'} ; un POST /api/controle/pilotage/gestes {"geste":"ouvrir_envoi_froid"} avec le jeton attendu`)
      }
      // Les autres gestes : reprendre une technologie, rouvrir un canal arrêté, lever une suspension ; le plafond.
      const g = jeu('salle-envois-gestes.json').reponse.valeur
      const techs = await o.page.$$eval(`${PAN} [data-geste="reprendre_technologie"]`, (l) => l.map((e) => e.getAttribute('data-technologie')))
      if (techs.sort().join() !== [...g.gestes.technologies_pause].sort().join()) faute('EG-13', `« Reprendre la technologie » pour ${techs.join(', ') || 'aucune'} ; ${g.gestes.technologies_pause.join(', ')} servies`)
      const arretes = g.parCanal.filter((c) => c.sante === 'arretee').map((c) => c.canal)
      const canaux = await o.page.$$eval(`${PAN} [data-geste="rouvrir_canal"]`, (l) => l.map((e) => e.getAttribute('data-canal')))
      if (canaux.sort().join() !== arretes.sort().join()) faute('EG-13', `« Rouvrir le canal » pour ${canaux.join(', ') || 'aucun'} ; ${arretes.join(', ')} arrêté(s)`)
      const leves = await o.page.$$eval(`${PAN} [data-geste="lever_modele"]`, (l) => l.length)
      if (leves !== g.gestes.modeles_suspendus.length) faute('EG-13', `${leves} « Lever la suspension », ${g.gestes.modeles_suspendus.length} modèle(s) suspendu(s)`)
      if (await o.page.$('[data-geste="rouvrir_boite"]')) faute('EG-13', '[data-geste="rouvrir_boite"] existe')
      for (const [selG, corps, quoi] of [[`[data-geste="reprendre_technologie"][data-technologie="${g.gestes.technologies_pause[0]}"]`, { geste: 'reprendre_technologie', technologie: g.gestes.technologies_pause[0] }, 'reprendre une technologie'], [`[data-geste="rouvrir_canal"][data-canal="${arretes[0]}"]`, { geste: 'rouvrir_canal', canal: arretes[0] }, 'rouvrir un canal']]) {
        const n = o.rep.hors().length, nj = o.rep.jetons.length
        await o.page.click(`${PAN} ${selG}`).catch(() => {})
        await attendre(200)
        await o.page.click(`${PAN} [data-confirmer], ${PAN} button:has-text("Confirmer")`).catch(() => {})
        await o.page.waitForSelector('[data-reconfirmer]', { timeout: 3000 }).catch(() => {})
        if (o.rep.hors().length !== n) faute('EG-13', `${quoi} : un POST avant la reconfirmation`)
        await confirmerMdp(o.page).catch(() => {})
        await attendrePosts(o.rep, n + 1)
        const p = o.rep.hors().slice(n)
        if (o.rep.jetons.length !== nj + 1 || p.length !== 1 || JSON.stringify(p[0].corps) !== JSON.stringify(corps) || p[0].url.pathname !== '/api/controle/pilotage/gestes') faute('EG-13', `${quoi} : ${p.map((a) => JSON.stringify(a.corps)).join(', ') || 'aucun POST'} ; ${JSON.stringify(corps)} après la boîte attendu`)
      }
      // Le plafond : 301 refusé sans rien envoyer ; 60 → la phrase de la décision de Benj.
      const plafond = await o.page.evaluate((p) => { const f = document.querySelector(`${p} [data-geste="palier_plafond"]`); const i = f && [...f.querySelectorAll('input')].find((y) => y.type === 'number' || /jour/i.test(y.getAttribute('aria-label') ?? '') || y.hasAttribute('data-par-jour')); if (!i) return null; i.setAttribute('data-juge-plafond', '1'); return '[data-juge-plafond="1"]' }, PAN)
      if (!plafond) faute('EG-13', 'le formulaire « Plafond du palier » (formulaires par jour) est introuvable')
      else {
        const n = o.rep.posts.length
        await o.page.fill(plafond, '301'); await o.page.press(plafond, 'Enter'); await attendre(300)
        await o.page.click(`${PAN} [data-confirmer]`, { timeout: 500 }).catch(() => {})
        await attendre(300)
        if (o.rep.posts.length !== n || await boite(o.page)) faute('EG-13', 'plafond de 301 : un POST ou la boîte part')
        await o.page.fill(plafond, '60'); await attendre(250)
        const t = apos(await o.page.evaluate((p) => document.querySelector(p)?.innerText ?? '', PAN))
        if (!t.includes(PHRASES.plafond)) faute('EG-13', 'plafond de 60 : la phrase « Au-delà de 40 par jour, c’est ta décision… » absente')
      }
      await interdits(o.page, 'Salle des envois')
      await o.fermer()
    }
    // envoi_froid vrai → aucun bouton d'ouverture ; rôle lecture → aucun [data-geste].
    {
      const o = await ouvrirEnvois('2026-10-13T10:00:00+02:00', (v) => { v.gestes.envoi_froid = true; v.gestes.epreuve_passee = false })
      if (await o.page.$(`${PAN} [data-geste="ouvrir_envoi_froid"]`)) faute('EG-13', 'envoi_froid vrai : le bouton d’ouverture reste')
      // Ouvert au palier P0, l'épreuve de bout en bout manque encore : la note de montée de palier reste affichée.
      if (!(await etatOuverture(o.page)).texte.includes(PHRASES.epreuve)) faute('EG-13', 'envoi_froid vrai, épreuve non passée : la note « conditionne la montée de palier » a disparu')
      await o.fermer()
      const l = await ouvrirEnvois('2026-10-13T10:00:00+02:00', null, { journal: J('role-lecture.json') })
      if (await l.page.$(`${PAN} [data-geste]`)) faute('EG-13', 'rôle lecture : un [data-geste] est rendu dans la Salle des envois')
      await l.fermer()
    }
    DETAILS['EG-13'] = 'aucune date d\'ouverture : rien de prouvé → la phrase de la mesure ; mesure ou notice de 8 jours → leur phrase, bouton inactif ; l'épreuve de bout en bout seule (même en 2030) → bouton ACTIF et la note « conditionne la montée de palier » (jamais quand elle a réussi, toujours quand l'envoi est ouvert sans elle) ; jamais « 12/10 », « pas avant » ni « lundi » ; mesure et notice prêtes, épreuve non passée → confirmation écrite, boîte securite, puis un POST { geste: ouvrir_envoi_froid } ; reprendre une technologie et rouvrir un canal : boîte puis leur corps ; plafond 301 refusé sans envoi, 60 → la phrase ; envoi_froid vrai → pas de bouton ; ni rouvrir_boite ; rôle lecture → aucun geste'
  })
  // EG-14 : sept options au téléphone.
  scenario(['EG-14'], 'sept options', async () => {
    const S7 = jeu('decider-sept-options.json').reponse.valeur.cartes[0]
    const { page, fermer } = await ouvrir('/controle/station', base({ 'bloc:decider': J('decider-sept-options.json') }), { largeur: 390, hauteur: 844, mobile: true })
    await ouvrirFeuille(page, 'decisions')
    const r = await page.evaluate((id) => ({ choix: [...document.querySelectorAll(`[data-carte-decision="${id}"] [data-choix]`)].map((b) => ({ cle: b.getAttribute('data-choix'), reco: b.hasAttribute('data-recommandee') })), deb: window.__JUGE__.debordements(390) }), S7.id)
    if (r.choix.length !== 7) faute('EG-14', `${r.choix.length} [data-choix], sept attendus`)
    const reco = S7.options.find((o) => o.recommandee)?.cle
    if (!r.choix.find((c) => c.cle === reco)?.reco || r.choix.filter((c) => c.reco).length !== 1) faute('EG-14', `data-recommandee sur ${r.choix.filter((c) => c.reco).map((c) => c.cle).join(', ') || 'aucune'}, ${reco} servie`)
    if (r.deb.length) faute('EG-14', `sept options à 390 px : ${r.deb[0]}${r.deb.length > 1 ? ` (et ${r.deb.length - 1} autre(s))` : ''}`)
    const fond = await page.evaluate(() => window.__JUGE__.fondOpaque('[data-feuille="decisions"]'))
    if (!fond.ok) faute('EG-14', `feuille des décisions à 390 px : ${fond.detail}`)
    // Chaque option lisible en entier : dans 0..390, non rognée, elementFromPoint en son centre et à ses bords (après défilement vertical).
    for (const c of r.choix) {
      await page.locator(`[data-carte-decision="${S7.id}"] [data-choix="${c.cle}"]`).scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
      for (const m of await page.evaluate(([id, k]) => window.__JUGE__.entiers(`[data-carte-decision="${id}"] [data-choix="${k}"]`, 390), [S7.id, c.cle])) { faute('EG-14', `option ${c.cle} : ${m}`); break }
    }
    DETAILS['EG-14'] = `décision « lire » à sept options : sept [data-choix], ${reco} recommandée ; à 390 px la feuille des décisions opaque, chaque option entière (dans 0..390, non rognée, elementFromPoint au centre et aux bords), rien de rogné ni de défilement horizontal`
    await fermer()
  })

  const LONGS = ['gestes envoi', 'décisions', 'auto', 'consigne agent']
  file.sort((a, b) => (LONGS.includes(b.nom) ? 1 : 0) - (LONGS.includes(a.nom) ? 1 : 0))
  await x.enParallele(file)
  {
    const r = x.jugerCaptures(captures)
    for (const m of r.echecs) faute('EG-11', m)
    vu('EG-11')
    DETAILS['EG-11'] = `${r.detail} ; téléphone : la feuille des décisions et la carte épinglée ; bureau : la feuille des décisions`
  }
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('EG-12', t.detail); else DETAILS['EG-12'] = `aucun « Envoyer », « Envoyé », « Copier », « Sauter » ni « Relayer » (feuilles ouvertes comprises) ; gestes.css sans hexadécimal ; ${t.detail}` }
  else DETAILS['EG-12'] = 'aucun « Envoyer », « Envoyé », « Copier », « Sauter » ni « Relayer » sur un bouton ou un lien (feuilles des décisions et des appels, équipage, Salle des envois) ; gestes.css sans hexadécimal, gardes prefers-reduced-motion (le typecheck se juge sur la racine réelle)'
  void srv; void tirerTresorerie
}
