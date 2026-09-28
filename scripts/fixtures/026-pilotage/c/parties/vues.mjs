// scripts/fixtures/026-pilotage/c/parties/vues.mjs — les critères VU de pilotage-ecran-qa --partie=vues (fiche jugée
// 026-113 : les vues Missions, Succès et Aide ; cahier du juge écrit en 026-104 par Claude Code). Chargé par
// scripts/pilotage-ecran-qa.mjs, qui fournit le serveur (banc ou next dev), l'interception et les mesures.
//
// Le contrat d'écran lu ici (026-113, « Ce qu'il faut faire ») : `Vues.tsx` ouvre `[data-vue="missions|succes|aide"]`
// (`role="dialog"`, `aria-modal`) pour `?vue=` ; « Fermer » et Échap retirent le paramètre sans quitter la page ;
// Missions : `[data-niveau]`, `[data-xp]`, l'objectif signé « PAR LE CHEF », une `[data-mission="<clé>"]` par mission servie
// (barre `role="progressbar"` avec `aria-valuenow` = valeur et `aria-valuemax` = cible, texte servi, `[data-debloque]`) ;
// Succès : une `[data-succes="<clé>"]` par entrée de `tousSucces`, `data-etat="debloque"` (avec « le JJ/MM », heure de
// Paris) ou `"a-venir"` (présent, grisé) ; Aide : six `[data-genre]`, les `[data-raccourci]`, une `[data-origine="<clé>"]`
// par compteur servi portant sa `source` servie.
// Les données : vue=direct tirée au hasard depuis commandement-complet.json (missions, niveau, succès et dates) et
// barre-sources.json (les sources, tirées deux fois de suite pour l'Aide), la trésorerie tirée (sources de l'argent).
import path from 'node:path'

const FICHIERS = ['Vues.tsx', 'vues/Missions.tsx', 'vues/Succes.tsx', 'vues/Aide.tsx', 'vues/vues.css']
const GENRES = ['travail', 'argent', 'decision', 'veille', 'repos', 'reservee']
const RACCOURCIS = ['I', 'Échap', '+', '−', '⊞', 'flèches']
const DEBLOQUE = ['→ succès Premier oui', '→ succès Bilan passé', '→ succès Premier site en ligne', '→ succès Première vente']
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, existe, code, lire, hexDans, gardeMouvement, interditsSource, appelsApi, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, euros, espaces, dateParis, tirerDirect, tirerTresorerie, tirerSources, capturer, court, MAINTENANT_JEUX } = O

  // ── VU-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    const manquants = FICHIERS.filter((f) => !existe(`${ST}/${f}`))
    if (manquants.length) e.push(`${manquants.length} fichier(s) de ${ST}/ absent(s) : ${manquants.join(', ')}`)
    const v = code(`${ST}/Vues.tsx`)
    if (v !== null && (!/data-vue/.test(v) || /export\s+default\s+function\s+\w*\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*return\s+null\s*;?\s*\}/.test(v))) e.push('Vues.tsx est encore le cadre d’attente (aucun [data-vue], ou un composant qui rend null)')
    for (const f of FICHIERS.filter((y) => /\.tsx$/.test(y))) {
      const s = code(`${ST}/${f}`)
      if (s === null) continue
      if (/apiDirection\(/.test(s)) e.push(`${f} contient apiDirection( : les vues n'ont aucune lecture propre`)
      e.push(...interditsSource(`${ST}/${f}`))
    }
    S.juger('VU-1', e, `${FICHIERS.join(', ')} présents ; Vues.tsx n'est plus le cadre d'attente ; ni apiDirection(, ni fetch(, ni supabase, ni dangerouslySetInnerHTML`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'VU-1'), 'VU-1 en échec : les vues n’existent pas, aucun navigateur n’est lancé'); return }
  }
  // VU-9 (sources) : vues.css sans hexadécimal, gardes du mouvement.
  {
    const css = lire(`${ST}/vues/vues.css`)
    const hex = hexDans(css)
    if (hex.length) faute('VU-9', `vues/vues.css : couleur(s) en hexadécimal (${hex.slice(0, 3).join(', ')})`)
    for (const g of gardeMouvement(css, 'vues/vues.css')) faute('VU-9', g)
    vu('VU-9')
  }

  // ── Les tirages ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const T = tirerTresorerie(H)
  /** vue=direct depuis commandement-complet.json : missions (valeur, cible, texte, débloqué), niveau, succès et dates tirés. */
  function tirerCommandement() {
    const d = tirerDirect(H, 'commandement-complet.json')
    const c = d.reponse.valeur.commandement.valeur
    for (const m of c.missions) m.debloque = H.suivant() < 0.25 ? null : H.parmi(DEBLOQUE)
    const argent = c.argent.valeur
    for (const m of argent.missions) { m.cible = H.entre(50, 900); m.valeur = H.entre(0, m.cible + 50); m.texte = `${m.valeur}/${m.cible}`; m.atteinte = m.valeur >= m.cible; m.debloque = H.parmi(DEBLOQUE) }
    const t0 = Date.parse(MAINTENANT_JEUX)
    let debloques = 0
    c.tousSucces.forEach((s, i) => {
      s.debloque = i === 0 ? true : i === c.tousSucces.length - 1 ? false : H.suivant() < 0.5
      s.le = s.debloque ? new Date(t0 - H.entre(1, 40) * 86_400_000 - H.entre(0, 1439) * 60_000).toISOString() : null
      if (s.debloque) debloques++
    })
    const dernier = c.tousSucces.filter((s) => s.debloque).sort((a, b) => Date.parse(b.le) - Date.parse(a.le))[0]
    c.succes = { cle: dernier.cle, libelle: dernier.libelle, le: dernier.le }
    return { d, c, debloques }
  }
  const CMD = tirerCommandement()
  const base = (plus = {}) => ({ direct: CMD.d, fil: J('vues/fil.json'), tresorerie: T, reglages: J('reglages.json'), ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  const texte = (page, sel) => page.evaluate((s) => window.__JUGE__.texte(s), sel)
  const pretVue = async (page, v) => { await page.waitForSelector(`[data-vue="${v}"]`, { timeout: 15_000 }).catch(() => {}); await attendre(250) }

  const srv = await demarrer({ critere: 'VU-2' })
  const captures = {}
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // Missions au bureau (VU-2, VU-5, VU-8, VU-9) et fermeture par « Fermer » et Échap.
  scenario(['VU-2', 'VU-5', 'VU-8', 'VU-9'], 'missions', async () => {
    const { page, s, dialogues, fermer } = await ouvrir('/controle/station?vue=missions', base())
    await pretVue(page, 'missions')
    const c = CMD.c
    const dlg = await page.evaluate(() => { const e = document.querySelector('[data-vue="missions"]'); return e ? { role: e.getAttribute('role'), modal: e.getAttribute('aria-modal') } : null })
    if (!dlg) faute('VU-2', '?vue=missions n’ouvre pas [data-vue="missions"]')
    else if (dlg.role !== 'dialog' || dlg.modal !== 'true') faute('VU-2', `[data-vue="missions"] : role « ${dlg.role} », aria-modal « ${dlg.modal} » ; dialog et true attendus`)
    const rendues = await page.$$eval('[data-vue="missions"] [data-mission]', (l) => l.map((e) => { const b = e.querySelector('[role="progressbar"]'); return { cle: e.getAttribute('data-mission'), texte: window.__JUGE__.texte(e), now: b?.getAttribute('aria-valuenow') ?? null, max: b?.getAttribute('aria-valuemax') ?? null, debloque: e.querySelector('[data-debloque]') ? window.__JUGE__.texte(e.querySelector('[data-debloque]')) : null } }))
    const servies = [...c.missions, ...c.argent.valeur.missions]
    const ordreServi = c.missions.map((m) => m.cle)
    const ordreRendu = rendues.map((r) => r.cle).filter((k) => ordreServi.includes(k))
    if (ordreRendu.join() !== ordreServi.join()) faute('VU-2', `missions dans l'ordre ${ordreRendu.join(', ')} ; ${ordreServi.join(', ')} servi`)
    if (rendues.length !== servies.length) faute('VU-2', `${rendues.length} [data-mission] rendue(s), ${servies.length} servie(s)`)
    for (const m of servies) {
      const r = rendues.find((y) => y.cle === m.cle)
      if (!r) { faute('VU-2', `mission ${m.cle} absente`); continue }
      if (r.now !== String(m.valeur) || r.max !== String(m.cible)) faute('VU-2', `mission ${m.cle} : aria-valuenow ${r.now} / aria-valuemax ${r.max}, ${m.valeur} / ${m.cible} servis`)
      if (!r.texte.includes(m.texte)) faute('VU-2', `mission ${m.cle} : texte « ${m.texte} » servi, « ${court(r.texte, 60)} » affiché`)
      if (m.debloque ? r.debloque !== espaces(m.debloque) : r.debloque) faute('VU-2', `mission ${m.cle} : [data-debloque] « ${r.debloque} », « ${m.debloque ?? 'rien'} » servi`)
    }
    const niv = c.argent.valeur.niveau
    const g = await page.evaluate(() => ({ niveau: window.__JUGE__.texte('[data-vue="missions"] [data-niveau]'), xp: window.__JUGE__.texte('[data-vue="missions"] [data-xp]'), vn: window.__JUGE__.visible('[data-vue="missions"] [data-niveau]'), vx: window.__JUGE__.visible('[data-vue="missions"] [data-xp]'), tout: window.__JUGE__.texte('[data-vue="missions"]') }))
    if (!g.niveau || !g.niveau.includes(`LV.${niv.lv}`) || !g.vn) faute('VU-2', `[data-niveau] « ${g.niveau} » (visible : ${g.vn}), LV.${niv.lv} servi`)
    if (!g.xp || !g.xp.includes(espaces(niv.texte)) || !g.vx) faute('VU-2', `[data-xp] « ${g.xp} » (visible : ${g.vx}), « ${niv.texte} » servi`)
    if (!String(g.tout).includes('PAR LE CHEF')) faute('VU-2', 'l’objectif n’est pas signé « PAR LE CHEF »')
    // VU-8 : le libellé piégé s'affiche tel quel, aucune image, aucune boîte.
    const p = await x.piegesDans(page, 'body')
    for (const m of p.echecs) faute('VU-8', m)
    if (!p.texteHtml) faute('VU-8', 'le libellé de mission « <img src=x onerror=alert(1)> » ne s’affiche pas tel quel')
    for (const d of dialogues) faute('VU-8', `boîte ouverte par la page : ${d}`)
    // VU-5 : au bureau, la vue ne recouvre pas la barre.
    for (const m of await x.sousLaBarre(page, '[data-vue="missions"]')) faute('VU-5', m)
    // VU-9 : la capture du bureau, Missions ouverte.
    captures.bureau = await capturer(page, x.cheminCapture('bureau.jpg'))
    // « Fermer » puis Échap retirent ?vue= sans quitter la page (VU-5 : la navigation).
    await page.evaluate(() => { window.__marque = 'juge' })
    await page.click('[data-vue="missions"] [data-fermer], [data-vue="missions"] button:has-text("Fermer")').catch(() => {})
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('vue'), null, { timeout: 3000 }).catch(() => {})
    let r = await page.evaluate(() => ({ vue: new URL(location.href).searchParams.get('vue'), marque: window.__marque, ouverte: !!document.querySelector('[data-vue]') }))
    if (r.vue !== null || r.marque !== 'juge' || r.ouverte) faute('VU-5', `« Fermer » : ?vue=${r.vue}${r.marque ? '' : ' (page rechargée)'}${r.ouverte ? ', la vue reste ouverte' : ''}`)
    await page.click('[data-zone="bandeau"] [data-nav="succes"]').catch((e) => faute('VU-5', `le bandeau n'ouvre pas Succès (${court(e.message, 50)})`))
    await pretVue(page, 'succes')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('vue'), null, { timeout: 3000 }).catch(() => {})
    r = await page.evaluate(() => ({ vue: new URL(location.href).searchParams.get('vue'), marque: window.__marque, ouverte: !!document.querySelector('[data-vue]') }))
    if (r.vue !== null || r.marque !== 'juge' || r.ouverte) faute('VU-5', `Échap : ?vue=${r.vue}${r.marque ? '' : ' (page rechargée)'}${r.ouverte ? ', la vue reste ouverte' : ''}`)
    DETAILS['VU-2'] = `${servies.length} missions tirées (valeur, cible, texte, débloqué) rendues avec leur barre (aria-valuenow, aria-valuemax), dans l'ordre servi ; LV.${niv.lv} et « ${niv.texte} » visibles ; objectif « PAR LE CHEF »`
    await fermer()
  })

  // Succès au bureau (VU-3).
  scenario(['VU-3'], 'succès', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station?vue=succes', base())
    await pretVue(page, 'succes')
    const tous = CMD.c.tousSucces
    const rendus = await page.$$eval('[data-vue="succes"] [data-succes]', (l) => l.map((e) => ({ cle: e.getAttribute('data-succes'), etat: e.getAttribute('data-etat'), texte: window.__JUGE__.texte(e) })))
    if (rendus.length !== tous.length) faute('VU-3', `${rendus.length} [data-succes], ${tous.length} servis dans tousSucces`)
    if (rendus.map((r) => r.cle).join() !== tous.map((y) => y.cle).join()) faute('VU-3', `ordre ${rendus.map((r) => r.cle).join(', ')} ; ${tous.map((y) => y.cle).join(', ')} servi`)
    for (const y of tous) {
      const r = rendus.find((z) => z.cle === y.cle)
      if (!r) { faute('VU-3', `succès ${y.cle} absent (un succès à venir est grisé, jamais caché)`); continue }
      if (y.debloque) {
        const date = `le ${dateParis(Date.parse(y.le) + s.decal)}`
        if (r.etat !== 'debloque') faute('VU-3', `${y.cle} débloqué : data-etat « ${r.etat} »`)
        if (!r.texte.includes(date)) faute('VU-3', `${y.cle} : « ${date} » (heure de Paris) attendu, « ${court(r.texte, 50)} » affiché`)
      } else if (r.etat !== 'a-venir') faute('VU-3', `${y.cle} à venir : data-etat « ${r.etat} »`)
    }
    // Les succès à venir : visibles (elementFromPoint après défilement), plus faibles que les débloqués (style calculé).
    const force = await page.evaluate(() => {
      const lum = (c) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c); if (!m) return { l: 0, a: 1 }; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return { l: 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]), a: m[4] === undefined ? 1 : +m[4] } }
      const fond = (e) => { for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; const x = lum(c); if (x.a > 0.5 && !/rgba\(0, 0, 0, 0\)/.test(c)) return x.l } return 0 }
      const mesure = (e) => { let op = 1; for (let p = e; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity); const t = e.querySelector('span') ?? e; const c = lum(getComputedStyle(t).color); const f = fond(e); return { op: op * c.a, contraste: (Math.max(c.l, f) + 0.05) / (Math.min(c.l, f) + 0.05) } }
      return [...document.querySelectorAll('[data-vue="succes"] [data-succes]')].map((e) => ({ cle: e.getAttribute('data-succes'), etat: e.getAttribute('data-etat'), ...mesure(e) }))
    })
    const deb = force.filter((f) => f.etat === 'debloque'), av = force.filter((f) => f.etat === 'a-venir')
    for (const a of av) {
      await page.locator(`[data-vue="succes"] [data-succes="${a.cle}"]`).scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
      if (!(await page.evaluate((k) => window.__JUGE__.visible(`[data-vue="succes"] [data-succes="${k}"]`), a.cle))) faute('VU-3', `succès à venir ${a.cle} : pas visible (elementFromPoint en son centre)`)
      for (const d of deb) if (!(a.op < d.op - 0.05 || a.contraste < d.contraste - 0.3)) { faute('VU-3', `succès à venir ${a.cle} (opacité ${a.op.toFixed(2)}, contraste ${a.contraste.toFixed(2)}) pas plus faible que ${d.cle} débloqué (${d.op.toFixed(2)}, ${d.contraste.toFixed(2)})`); break }
    }
    DETAILS['VU-3'] = `${tous.length} succès servis dans l'ordre (${CMD.debloques} débloqués, tirés, avec « le JJ/MM » de Paris) ; les ${av.length} à venir présents, visibles, plus faibles (opacité ou contraste calculés)`
    void s
    await fermer()
  })

  // Aide (VU-4) : deux tirages des sources de suite, chacun servi et relu.
  scenario(['VU-4'], 'aide', async () => {
    const vus = []
    for (const tour of [1, 2]) {
      const d = tirerSources(H, tirerDirect(H, 'barre-sources.json'))
      const t = tirerTresorerie(H)
      const { page, fermer } = await ouvrir('/controle/station?vue=aide', base({ direct: d, tresorerie: t }))
      await pretVue(page, 'aide')
      await page.waitForFunction(() => !!document.querySelector('[data-vue="aide"] [data-origine]'), null, { timeout: 8000 }).catch(() => {})
      await attendre(300)
      const a = await page.evaluate(() => ({ genres: [...document.querySelectorAll('[data-vue="aide"] [data-genre]')].map((e) => e.getAttribute('data-genre')), raccourcis: [...document.querySelectorAll('[data-vue="aide"] [data-raccourci]')].map((e) => `${e.getAttribute('data-raccourci') ?? ''} ${window.__JUGE__.texte(e)}`), origines: Object.fromEntries([...document.querySelectorAll('[data-vue="aide"] [data-origine]')].map((e) => [e.getAttribute('data-origine'), window.__JUGE__.texte(e)])) }))
      if (tour === 1) {
        if ([...a.genres].sort().join() !== [...GENRES].sort().join() || a.genres.length !== 6) faute('VU-4', `[data-genre] : ${a.genres.join(', ')} ; les six (${GENRES.join(', ')}) attendus`)
        for (const k of RACCOURCIS) if (!a.raccourcis.some((r) => r.split(/\s+/).includes(k) || r.includes(` ${k} `) || r.startsWith(`${k} `))) faute('VU-4', `raccourci « ${k} » absent des [data-raccourci]`)
      }
      const compteurs = d.reponse.valeur.barre.valeur.compteurs
      for (const c of compteurs) { const o = a.origines[c.cle]; if (!o || !o.includes(c.source)) faute('VU-4', `tirage ${tour} : [data-origine="${c.cle}"] « ${court(o, 60)} », la source servie « ${c.source} » attendue`) }
      for (const [k, src] of Object.entries(t.tire.sources)) { const o = a.origines[k]; if (!o || !o.includes(src)) faute('VU-4', `tirage ${tour} : [data-origine="${k}"] « ${court(o, 60)} », la source de la trésorerie « ${src} » attendue`) }
      vus.push(`${compteurs.length + 3} origines`)
      await fermer()
    }
    DETAILS['VU-4'] = `six [data-genre] (dont reservee), raccourcis ${RACCOURCIS.join(', ')} ; deux tirages de suite des sources servies (compteurs de la barre et trésorerie) : ${vus.join(' puis ')} relues à l'identique`
  })

  // Téléphone (VU-5, VU-9) : chaque vue en feuille plein écran ; l'onglet Plus mène à Succès et à Aide.
  scenario(['VU-5', 'VU-9'], 'téléphone', async () => {
    const { page, fermer } = await ouvrir('/controle/station?vue=succes', base(), { largeur: 390, hauteur: 844, mobile: true })
    await pretVue(page, 'succes')
    for (const m of await x.feuilleTelephone(page, '[data-vue="succes"]')) faute('VU-5', `Succès à 390×844 : ${m}`)
    // Contre-vérification du 28/09 (nuit) : la feuille Succès du témoin pesait 10,1 à 11 Ko en JPEG, au bord du seuil de
    // 10 Ko (VU-9 rouge un passage sur deux) ; la capture du téléphone se prend sur la feuille Aide, la plus remplie.
    for (const v of ['missions', 'aide']) {
      await page.goto(`${srv.base}/controle/station?vue=${v}`, { waitUntil: 'domcontentloaded' })
      await pretVue(page, v)
      for (const m of await x.feuilleTelephone(page, `[data-vue="${v}"]`)) faute('VU-5', `${v} à 390×844 : ${m}`)
      if (v === 'aide') captures.telephone = await capturer(page, x.cheminCapture('telephone.jpg'))
    }
    for (const v of ['succes', 'aide']) {
      await page.goto(`${srv.base}/controle/station`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-onglet-tel="plus"]', { timeout: 10_000 }).catch(() => {})
      await page.evaluate(() => { window.__marque = 'juge' })
      await page.click('[data-onglet-tel="plus"]').catch((e) => faute('VU-5', `onglet Plus introuvable (${court(e.message, 50)})`))
      await page.click(`[data-plus="${v}"]`).catch((e) => faute('VU-5', `Plus → ${v} introuvable (${court(e.message, 50)})`))
      await page.waitForFunction((y) => new URL(location.href).searchParams.get('vue') === y, v, { timeout: 3000 }).catch(() => {})
      const r = await page.evaluate((y) => ({ vue: new URL(location.href).searchParams.get('vue'), marque: window.__marque, visible: window.__JUGE__.visible(`[data-vue="${y}"]`) }), v)
      if (r.vue !== v || r.marque !== 'juge' || !r.visible) faute('VU-5', `Plus → ${v} : ?vue=${r.vue}${r.marque ? '' : ' (page rechargée)'}, vue ${r.visible ? 'visible' : 'invisible'}`)
    }
    await fermer()
  })

  // Rôle lecture (VU-6) : les trois vues s'affichent, aucun bouton hors de la navigation et de la fermeture.
  scenario(['VU-6'], 'lecture', async () => {
    const { page, fermer } = await ouvrir('/controle/station?vue=missions', { ...base(), journal: J('role-lecture.json') })
    for (const v of ['missions', 'succes', 'aide']) {
      if (v !== 'missions') await page.goto(`${srv.base}/controle/station?vue=${v}`, { waitUntil: 'domcontentloaded' })
      await pretVue(page, v)
      const r = await page.evaluate((y) => { const e = document.querySelector(`[data-vue="${y}"]`); return e ? { texte: e.innerText.length, boutons: [...e.querySelectorAll('button, [role="button"], input, select, textarea')].filter((b) => !b.hasAttribute('data-fermer') && !b.hasAttribute('data-nav')).map((b) => (b.textContent || b.tagName).trim().slice(0, 30)) } : null }, v)
      if (!r || r.texte < 5) faute('VU-6', `rôle lecture : la vue ${v} ne s'affiche pas`)
      else if (r.boutons.length) faute('VU-6', `rôle lecture, vue ${v} : ${r.boutons.length} bouton(s) hors navigation et fermeture (${r.boutons.slice(0, 3).join(', ')})`)
    }
    DETAILS['VU-6'] = 'rôle lecture (role-lecture.json) : Missions, Succès et Aide affichées, aucun bouton hors de la navigation et de la fermeture'
    await fermer()
  })

  // Immobilité (VU-7) : 3 s après le chargement de chaque vue, aucune animation en cours dans [data-vue].
  const immobiles = []
  for (const v of ['missions', 'succes', 'aide']) {
    scenario(['VU-7'], `immobilité ${v}`, async () => {
      const { page, fermer } = await ouvrir(`/controle/station?vue=${v}`, base())
      await pretVue(page, v)
      const im = await x.immobilite(page, { attente: 3000, duree: 1500, sel: '[data-vue]' })
      if (im.animations) faute('VU-7', `vue ${v} : ${im.detail} 3 s après le chargement`)
      immobiles.push(`${v} ${im.animations ? 'animée' : 'immobile'}`)
      await fermer()
    })
  }
  // VU-7 : deux réponses direct identiques servies de suite (horloge de la page avancée de 31 s) ne changent aucun texte.
  scenario(['VU-7'], 'deux lectures identiques', async () => {
    const t0 = Date.now()
    const { page, s, fermer } = await ouvrir('/controle/station?vue=missions', base(), { horloge: t0 })
    await page.clock.runFor(500); await pretVue(page, 'missions'); await attendre(400)
    const avant = await texte(page, '[data-vue]')
    const n0 = s.journal.filter((a) => a.cle === 'direct').length
    for (let i = 0; i < 16; i++) { await page.clock.runFor(2000); await attendre(30) }
    await attendre(400)
    const n1 = s.journal.filter((a) => a.cle === 'direct').length
    const apres = await texte(page, '[data-vue]')
    if (n1 <= n0) faute('VU-7', `aucune seconde lecture de vue=direct en 32 s d'horloge (${n0} puis ${n1}) : la comparaison ne prouverait rien`)
    else if (apres !== avant) faute('VU-7', `deux réponses direct identiques : le texte de la vue a changé (« ${court(avant, 50)} » → « ${court(apres, 50)} »)`)
    DETAILS['VU-7b'] = `${n1} lectures de vue=direct identiques (horloge avancée de 32 s) : aucun texte changé`
    await fermer()
  })

  // Les plus longs d'abord : les trois immobilités (4,5 s chacune).
  file.sort((a, b) => (b.nom.startsWith('immobilité') ? 1 : 0) - (a.nom.startsWith('immobilité') ? 1 : 0))
  await x.enParallele(file)
  DETAILS['VU-7'] = `${immobiles.join(', ')} (getAnimations limité à [data-vue], 3 s après le chargement) ; ${DETAILS['VU-7b'] ?? 'lectures identiques non relevées'}`
  {
    const r = x.jugerCaptures(captures)
    for (const m of r.echecs) faute('VU-9', m)
    vu('VU-9')
    DETAILS['VU-9'] = `${r.detail} ; vues.css sans hexadécimal, gardes prefers-reduced-motion${MODE === 'vivant' ? '' : ' (le typecheck se juge sur la racine réelle)'}`
  }
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('VU-9', t.detail); else DETAILS['VU-9'] += ` ; ${t.detail}` }
  DETAILS['VU-5'] = 'à 390×844 : Missions, Succès et Aide en feuilles plein écran, scrollWidth ≤ 390, boutons ≥ 44 px, textes ≥ 12 px ; Plus → Succès et Aide ; à 1440×900 la vue sous la barre ; « Fermer » et Échap retirent ?vue= sans changer de page'
  DETAILS['VU-8'] = 'aucun champ _piege affiché ; « <img src=x onerror=alert(1)> » affiché tel quel, aucune image ni boîte'
  void path; void euros; void appelsApi; void jeu
}
