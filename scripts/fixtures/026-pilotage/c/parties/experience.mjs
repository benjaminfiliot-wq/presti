// scripts/fixtures/026-pilotage/c/parties/experience.mjs — les critères EX de pilotage-ecran-qa --partie=experience (fiche
// jugée 026-125 : la Salle Expérience, fermée avant la première vente, R13 ; cahier du juge écrit en 026-104 par Claude
// Code). Chargé par scripts/pilotage-ecran-qa.mjs.
//
// Le contrat d'écran lu ici (026-125, « Ce qu'il faut faire ») : dans `[data-salle-panneau="experience"]`, le texte servi
// tel quel (`[data-experience-texte]`) ; en cours : la progression (`role="progressbar"`, `aria-valuenow` = jour,
// `aria-valuemax` = sur), le budget et les gains écrits comme `euros()`, la date d'arrêt servie ; gagnante : les gains ;
// aucun bouton ni lien « Lancer », « Arrêter », « Relancer » ; une panne se voit. Le compteur de la barre
// (`[data-compteur="experience"]`) n'existe que s'il est servi par vue=direct (en cours seulement).
// Les données : salle=experience tirée au hasard (jour, budget, gains, date d'arrêt) depuis experience-*.json.

const LANCER = ['Lancer', 'Arrêter', 'Arreter', 'Relancer']
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, existe, code, lire, hexDans, gardeMouvement, interditsSource, adressesApi, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, euros, espaces, dateParis, tirerDirect, tirerTresorerie, capturer, court, MAINTENANT_JEUX } = O
  const F = `${ST}/salles/Experience.tsx`, CSS = `${ST}/salles/experience.css`

  // ── EX-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    for (const f of [F, CSS]) if (!existe(f)) e.push(`${f} absent`)
    const s = code(F)
    if (s !== null) {
      if (!/data-experience-texte/.test(s)) e.push('Experience.tsx est encore le cadre d’attente (aucun [data-experience-texte])')
      const adr = adressesApi(s)
      const autres = adr.filter((a) => a !== '/api/controle/station?vue=salle&salle=experience')
      if (autres.length) e.push(`Experience.tsx lit ${autres.join(', ')} : /api/controle/station?vue=salle&salle=experience seulement`)
      if (!adr.length) e.push('Experience.tsx ne lit pas /api/controle/station?vue=salle&salle=experience')
      if (/method\s*:\s*['"`]POST/i.test(s)) e.push('Experience.tsx envoie un POST')
      for (const m of LANCER) if (new RegExp(`>\\s*[^<]*\\b${m}\\b`, 'i').test(s) || new RegExp(`aria-label=["'{][^"'}]*${m}`, 'i').test(s)) e.push(`Experience.tsx écrit un bouton ou un lien « ${m} »`)
      e.push(...interditsSource(F, { html: false }))
    }
    S.juger('EX-1', e, `${F} et ${CSS} présents ; Experience.tsx n'est plus le cadre d'attente ; une seule lecture (vue=salle&salle=experience), aucun POST, ni « Lancer », ni « Arrêter », ni « Relancer » dans le source ; ni fetch(, ni supabase`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'EX-1'), 'EX-1 en échec : la salle Expérience n’existe pas, aucun navigateur n’est lancé'); return }
  }
  // EX-9 (sources) : experience.css sans hexadécimal, gardes du mouvement.
  {
    const css = lire(CSS)
    const hex = hexDans(css)
    if (hex.length) faute('EX-9', `experience.css : couleur(s) en hexadécimal (${hex.slice(0, 3).join(', ')})`)
    for (const g of gardeMouvement(css, 'experience.css')) faute('EX-9', g)
    vu('EX-9')
  }

  // ── Les tirages ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const T = tirerTresorerie(H)
  const D = tirerDirect(H)
  const t0 = Date.parse(MAINTENANT_JEUX)
  /** L'expérience en cours, tirée : jour, budget, gains, date d'arrêt ; le compteur de la barre qui la dit. */
  function tirerEnCours() {
    const e = jeu('experience-en-cours.json')
    const v = e.reponse.valeur
    // Contre-vérification du 28/09 (nuit) : le texte servi porte le piège HTML, qui doit s'afficher tel quel (un
    // dangerouslySetInnerHTML passait vert : aucun jeu d'expérience ne servait de texte piégé).
    v.texte = `${v.texte} Note : <img src=x onerror=alert(1)>`
    v.jour = H.entre(1, 29); v.budget = H.parmi([0, 0, H.montant(5, 60)]); v.gains = H.parmi([0, H.montant(10, 400)])
    v.arret_le = new Date(t0 + (v.sur - v.jour) * 86_400_000 + H.entre(0, 600) * 60_000).toISOString()
    v.barre = `J${v.jour}/${v.sur} · ${euros(v.gains).replace(/[  ]/g, ' ')}`
    return { statut: 200, reponse: e.reponse }
  }
  const avecCompteur = (texteBarre) => { const d = structuredClone(D); d.reponse.valeur.barre.valeur.compteurs.push({ cle: 'experience', libelle: 'EXPÉRIENCE', texte: texteBarre, ton: 'normal', source: 'station_experiences' }); return d }
  const tirerGagnante = () => { const e = jeu('experience-gagnante.json'); const g = H.montant(20, 900); e.reponse.valeur.gains = g; e.reponse.valeur.texte = `Gagnante : ${Math.round(g)} € rapportés. La suite est à Benj.`; return { statut: 200, reponse: e.reponse } }
  const base = (plus = {}) => ({ direct: D, fil: J('vues/fil.json'), tresorerie: T, reglages: J('reglages.json'), ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  const PAN = '[data-salle-panneau="experience"]'
  const pret = async (page) => { await page.waitForSelector(`${PAN} [data-experience-texte], ${PAN} .mc-panne, ${PAN} [data-panne-salle]`, { timeout: 15_000 }).catch(() => {}); await page.waitForFunction(() => { const e = document.querySelector('[data-compteur="encaisse_mois"] [data-valeur]'); return !e || !/…/.test(e.textContent) }, null, { timeout: 5000 }).catch(() => {}); await attendre(250) }
  const lirePanneau = (page) => page.evaluate((p) => {
    const e = document.querySelector(p)
    if (!e) return null
    const b = e.querySelector('[role="progressbar"]')
    return { texte: window.__JUGE__.texte(e), phrase: e.querySelector('[data-experience-texte]') ? window.__JUGE__.texte(e.querySelector('[data-experience-texte]')) : null, barre: b ? { now: b.getAttribute('aria-valuenow'), max: b.getAttribute('aria-valuemax') } : null, compteur: document.querySelector('[data-compteur="experience"]') ? window.__JUGE__.texte('[data-compteur="experience"]') : null, gestes: [...e.querySelectorAll('button, a, [role="button"]')].map((y) => `${y.textContent} ${y.getAttribute('aria-label') ?? ''}`).filter((t) => /lancer|arr[eê]ter|relancer/i.test(t)) }
  }, PAN)
  const sansGeste = (r, quoi) => { if (r?.gestes.length) faute('EX-1', `${quoi} : bouton ou lien « ${court(r.gestes[0], 40)} » dans le panneau`) }

  const srv = await demarrer({ critere: 'EX-2' })
  const captures = {}
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // EX-4 et la capture du bureau : en cours.
  scenario(['EX-4', 'EX-8', 'EX-1'], 'en cours', async () => {
    const ec = tirerEnCours(), v = ec.reponse.valeur
    const { page, s, dialogues, fermer } = await ouvrir('/controle/station?salle=experience', base({ direct: avecCompteur(v.barre), 'salle:experience': ec }))
    await pret(page)
    const r = await lirePanneau(page)
    if (!r) { faute('EX-4', `?salle=experience n'ouvre pas ${PAN}`); await fermer(); return }
    if (r.phrase !== espaces(v.texte)) faute('EX-4', `texte « ${r.phrase} », « ${v.texte} » servi`)
    if (!r.barre || r.barre.now !== String(v.jour) || r.barre.max !== String(v.sur)) faute('EX-4', `progression ${JSON.stringify(r.barre)}, aria-valuenow ${v.jour} et aria-valuemax ${v.sur} servis`)
    for (const [k, m] of [['budget', v.budget], ['gains', v.gains]]) if (!r.texte.includes(espaces(euros(m)))) faute('EX-4', `${k} ${euros(m)} (tiré) absent du panneau`)
    const arret = dateParis(Date.parse(v.arret_le) + s.decal)
    if (!r.texte.includes(arret)) faute('EX-4', `date d'arrêt « ${arret} » absente du panneau`)
    if (!r.compteur || !r.compteur.includes(espaces(v.barre))) faute('EX-4', `la barre porte [data-compteur="experience"] « ${r.compteur} », « ${v.barre} » servi`)
    sansGeste(r, 'en cours')
    for (const d of dialogues) faute('EX-4', `boîte ouverte par la page : ${d}`)
    captures.bureau = await capturer(page, x.cheminCapture('bureau.jpg'))
    DETAILS['EX-4'] = `en cours, tirée : J${v.jour}/${v.sur} (aria-valuenow, aria-valuemax), budget ${euros(v.budget)} et gains ${euros(v.gains)} écrits comme euros(), arrêt le ${arret}, [data-compteur="experience"] « ${v.barre} »`
    await fermer()
  })
  // EX-2 : aucune vente.
  scenario(['EX-2', 'EX-1'], 'sans vente', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=experience', base({ 'salle:experience': J('experience-sans-vente.json') }))
    await pret(page)
    const r = await lirePanneau(page)
    const phrase = 'Aucune expérience avant la première vente (décision R13).'
    if (!r || r.phrase !== phrase) faute('EX-2', `[data-experience-texte] « ${r?.phrase} », « ${phrase} » attendu`)
    if (r?.barre) faute('EX-2', 'aucune vente : une barre de progression est rendue')
    if (r?.compteur !== null && r?.compteur !== undefined) faute('EX-2', `aucune vente : la barre porte [data-compteur="experience"] « ${r.compteur} »`)
    sansGeste(r, 'sans vente')
    await fermer()
  })
  // EX-3 : une vente, aucune expérience.
  scenario(['EX-3', 'EX-1'], 'une vente', async () => {
    const e = jeu('experience-une-vente.json')
    e.reponse.valeur.texte = `Une vente est faite${H.parmi(['', ' le ' + dateParis(Date.now())])} : Benj peut choisir la première expérience.`
    const { page, fermer } = await ouvrir('/controle/station?salle=experience', base({ 'salle:experience': { statut: 200, reponse: e.reponse } }))
    await pret(page)
    const r = await lirePanneau(page)
    if (!r || r.phrase !== espaces(e.reponse.valeur.texte)) faute('EX-3', `[data-experience-texte] « ${r?.phrase} », « ${e.reponse.valeur.texte} » servi`)
    if (r?.barre) faute('EX-3', 'une vente, aucune expérience : une barre de progression est rendue')
    if (r?.compteur !== null && r?.compteur !== undefined) faute('EX-3', `une vente : la barre porte [data-compteur="experience"] « ${r.compteur} »`)
    sansGeste(r, 'une vente')
    await fermer()
  })
  // EX-5 : arrêtée seule à J30, puis gagnante.
  scenario(['EX-5', 'EX-1'], 'arrêtée et gagnante', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=experience', base({ 'salle:experience': J('experience-arretee.json') }))
    await pret(page)
    const r = await lirePanneau(page)
    const phrase = 'Arrêtée seule à J30 : rien rapporté.'
    if (!r || r.phrase !== phrase) faute('EX-5', `[data-experience-texte] « ${r?.phrase} », « ${phrase} » attendu`)
    if (r?.compteur !== null && r?.compteur !== undefined) faute('EX-5', `arrêtée : la barre porte [data-compteur="experience"] « ${r.compteur} »`)
    sansGeste(r, 'arrêtée')
    await fermer()
    const g = tirerGagnante()
    const r2o = await ouvrir('/controle/station?salle=experience', base({ 'salle:experience': g }))
    await pret(r2o.page)
    const r2 = await lirePanneau(r2o.page)
    if (!r2 || r2.phrase !== espaces(g.reponse.valeur.texte)) faute('EX-5', `gagnante : « ${r2?.phrase} », « ${g.reponse.valeur.texte} » servi`)
    if (!r2?.texte.includes(espaces(euros(g.reponse.valeur.gains)))) faute('EX-5', `gagnante : les gains ${euros(g.reponse.valeur.gains)} (tirés) absents`)
    sansGeste(r2, 'gagnante')
    DETAILS['EX-5'] = `« ${phrase} » sans compteur dans la barre ; gagnante : le texte servi et les gains tirés ${euros(g.reponse.valeur.gains)}`
    await r2o.fermer()
  })
  // EX-6 : la vue en 503.
  scenario(['EX-6'], 'panne', async () => {
    const erreur = `Expérience injoignable (essai ${H.entre(100, 999)})`
    const { page, fermer } = await ouvrir('/controle/station?salle=experience', base({ 'salle:experience': { statut: 503, reponse: { error: erreur } } }))
    await pret(page)
    const t = await page.evaluate((p) => window.__JUGE__.texte(p), PAN)
    if (!t) faute('EX-6', `vue en 503 : ${PAN} n'est pas ouvert`)
    else {
      if (!/ne répond pas/.test(t) || !t.includes(erreur)) faute('EX-6', `vue en 503 : « ${court(t, 80)} », la panne et « ${erreur} » attendues`)
      if (await page.$(`${PAN} [data-experience-texte]`)) faute('EX-6', 'vue en 503 : une salle est rendue comme si de rien n’était')
    }
    DETAILS['EX-6'] = `vue en 503 : « … ne répond pas : ${erreur} », aucune salle rendue`
    await fermer()
  })
  // EX-7 et la capture du téléphone : aucune vente, à 390×844.
  scenario(['EX-7', 'EX-8', 'EX-2'], 'téléphone', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=experience', base({ 'salle:experience': J('experience-sans-vente.json') }), { largeur: 390, hauteur: 844, mobile: true })
    await pret(page)
    for (const m of await x.feuilleTelephone(page, PAN)) faute('EX-7', m)
    const r = await lirePanneau(page)
    if (r?.compteur !== null && r?.compteur !== undefined) faute('EX-2', `téléphone, aucune vente : [data-compteur="experience"] « ${r.compteur} »`)
    captures.telephone = await capturer(page, x.cheminCapture('telephone.jpg'))
    await fermer()
  })

  await x.enParallele(file)
  {
    const r = x.jugerCaptures(captures)
    for (const m of r.echecs) faute('EX-8', m)
    vu('EX-8')
    DETAILS['EX-8'] = r.detail
  }
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('EX-9', t.detail); else DETAILS['EX-9'] = `experience.css sans hexadécimal, gardes prefers-reduced-motion ; ${t.detail}` }
  else DETAILS['EX-9'] = 'experience.css sans hexadécimal, gardes prefers-reduced-motion (le typecheck se juge sur la racine réelle)'
  DETAILS['EX-1'] = 'une seule lecture (vue=salle&salle=experience), aucun POST ; ni « Lancer », ni « Arrêter », ni « Relancer », ni dans le source ni dans le panneau rendu (quatre états servis)'
  DETAILS['EX-2'] = '« Aucune expérience avant la première vente (décision R13). », sans barre de progression, sans compteur dans la barre (bureau et téléphone)'
  DETAILS['EX-3'] = 'une vente, aucune expérience : le texte tiré, servi, affiché tel quel ; ni barre ni compteur'
  DETAILS['EX-7'] = 'à 390×844 : feuille plein écran, scrollWidth ≤ 390, boutons ≥ 44 px, textes ≥ 12 px'
  void srv; void tirerTresorerie
}
