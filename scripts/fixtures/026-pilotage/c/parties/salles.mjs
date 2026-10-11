// scripts/fixtures/026-pilotage/c/parties/salles.mjs — les critères SA de pilotage-ecran-qa --partie=salles (fiche jugée
// 026-120 : les salles cliquables, le résumé de salle commun et la fiche d'agent ; cahier du juge écrit en 026-104 par
// Claude Code). Chargé par scripts/pilotage-ecran-qa.mjs.
//
// Le contrat d'écran lu ici (026-120, « Ce qu'il faut faire ») : `?salle=<clé>` ouvre `[data-salle-panneau="<clé>"]` (ou,
// pour une salle sans panneau, `[data-salle-agents="<clé>"]`), `?agent=<nom>` ouvre `[data-fiche-agent="<nom>"]`
// (`role="dialog"`) ; « Fermer » et Échap retirent le paramètre ; chaque panneau porte `[data-resume-salle]` (RECETTES,
// AGENTS, AUTOMATISMES, PRODUITS DU JOUR, TÂCHES, ACTIVE AUJ., GÉRER, INFO, touche I), sa bordure à la couleur de sa salle
// et « synchro il y a n s · auto 30 s » ; les onglets sont des `[data-onglet]` (le juge les parcourt tous pour lire un
// panneau en entier) ; `[data-jour]` (Recettes), `[data-pause-agent]` et `[data-modele]` (fiche d'agent),
// `[data-gestes-envoi]` (Salle des envois), `[data-ia-fournisseur]`, `[data-ia-bascule]`, `[data-ia-cout]` (Salle des
// machines). Les montants, compteurs et textes des vues sont tirés au hasard à chaque passage.
import { CLES_SALLES, CLES_SALLE } from '../../s/contrat-vues.mjs'

const FICHIERS = ['Panneaux.tsx', 'salles/Recettes.tsx', 'salles/Tresorerie.tsx', 'salles/Usine.tsx', 'salles/Atelier.tsx', 'salles/Reunion.tsx', 'salles/Envois.tsx', 'salles/Standard.tsx', 'salles/Redaction.tsx', 'salles/Machines.tsx', 'salles/FicheAgent.tsx', 'salles/Experience.tsx', 'salles/Resume.tsx', 'salles/salles.css']
const DE_120 = FICHIERS.filter((f) => /\.tsx$/.test(f) && f !== 'Panneaux.tsx')
const ETIQUETTES = ['RECETTES', 'AGENTS', 'AUTOMATISMES', 'PRODUITS DU JOUR', 'TÂCHES', 'ACTIVE AUJ.']
const INTERDITS_ENVOIS = ['envoyer', 'copier', 'sauter', 'relayer']
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const TEXTES_STANDARD = ['Rappelez-moi demain matin', 'Oui, envoyez la maquette', 'Pas intéressé pour le moment', 'Quel est le prix du site ?', 'Je préfère un appel', 'Merci, je regarde ce soir', 'Retirez mes données', 'Déjà un site, merci', 'Pouvez-vous passer mardi ?']

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, existe, code, lire, lignesAjoutees, hexDans, gardeMouvement, interditsSource, adressesApi, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, euros, espaces, heureParis, dateParis, tirerDirect, tirerTresorerie, capturer, court, PIEGE_HTML, MAINTENANT_JEUX } = O

  // ── SA-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    const manquants = FICHIERS.filter((f) => !existe(`${ST}/${f}`))
    if (manquants.length) e.push(`${manquants.length} fichier(s) de ${ST}/ absent(s) : ${manquants.join(', ')}`)
    const p = code(`${ST}/Panneaux.tsx`)
    if (p !== null && (!/data-salle-panneau/.test(p) || /export\s+default\s+function\s+\w*\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*return\s+null\s*;?\s*\}/.test(p))) e.push('Panneaux.tsx est encore le cadre d’attente (aucun [data-salle-panneau])')
    for (const f of DE_120) {
      const s = code(`${ST}/${f}`)
      if (s === null) continue
      for (const a of adressesApi(s)) {
        const ok = /^\/api\/controle\/station\?vue=(salle|agent)&/.test(a) || (f === 'salles/Machines.tsx' && a === '/api/controle/jauges')
        if (!ok) e.push(`${f} lit ${court(a, 60)} : vue=salle, vue=agent (et /api/controle/jauges pour la Salle des machines) seulement`)
      }
      e.push(...interditsSource(`${ST}/${f}`, { html: false }))
    }
    if (!DE_120.some((f) => /apiDirection(?:<[^>]*>)?\(/.test(code(`${ST}/${f}`) ?? ''))) e.push('aucune lecture par apiDirection( dans les salles')
    S.juger('SA-1', e, `Panneaux.tsx n'est plus le cadre d'attente ; ${FICHIERS.length - 1} fichiers des salles et salles.css présents ; lectures par apiDirection( sur vue=salle et vue=agent (et /api/controle/jauges pour la Salle des machines) ; ni fetch(, ni supabase`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'SA-1'), 'SA-1 en échec : les salles n’existent pas, aucun navigateur n’est lancé'); return }
  }
  // SA-14, SA-17, SA-20 (sources).
  {
    const css = lire(`${ST}/salles/salles.css`)
    const hex = hexDans(css)
    if (hex.length) faute('SA-14', `salles.css : couleur(s) en hexadécimal (${hex.slice(0, 3).join(', ')})`)
    for (const g of gardeMouvement(css, 'salles/salles.css')) faute('SA-14', g)
    vu('SA-14')
    const m = code(`${ST}/salles/Machines.tsx`) ?? ''
    const sansChaines = m.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '""')
    if (/[\w)\]]\s+\/\s+[\w(]/.test(sansChaines)) faute('SA-17', 'Machines.tsx calcule une part (« / » entre deux valeurs)')
    if (/>=\s*0?\.75\b/.test(m)) faute('SA-17', 'Machines.tsx porte un seuil « >= 0.75 »')
    vu('SA-17')
    if (/0(?:,00)?\s*€/.test(m)) faute('SA-20', 'Machines.tsx écrit un littéral « 0 € »')
    vu('SA-20')
  }

  // ── Les tirages ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const T = tirerTresorerie(H), D = tirerDirect(H)
  const b = D.reponse.valeur.barre.valeur
  const AGENTS = D.reponse.valeur.equipage.valeur.agents
  const t0 = Date.parse(MAINTENANT_JEUX)
  const sansActive = (v) => { delete v.active_auj; return v }
  const sal = (rel, f) => { const j = jeu(`vues/${rel}.json`); f?.(j.reponse.valeur, j.reponse); return { statut: 200, reponse: j.reponse } }
  const TR = sal('salle-tresorerie', (v, r) => {
    sansActive(v)
    for (const a of v.parAgent) { a.cout_mois_eur = H.montant(0.05, 9); a.appels = H.entre(3, 90) }
    for (const t of v.parTache) t.eur = H.montant(0.01, 0.9)
    for (const m of v.modeles) { m.appels = H.entre(1, 99); m.eur = H.parmi([0, H.montant(0.01, 3)]) }
    v.total_modeles_eur = Math.round(v.modeles.reduce((s, m) => s + m.eur, 0) * 100) / 100
    for (const a of v.abonnements) a.ttc_eur = H.montant(0, 30)
    v.parNature.valeur = { texte: H.montant(0, 5), image: H.montant(0, 5), video: H.montant(0, 2), voix: H.montant(0, 2) }
    r.a = new Date(t0 - 37_000).toISOString()
  })
  const RE = sal('salle-recettes', (v) => { sansActive(v); v.sites.agents = { commandes: H.entre(0, 9), montant_eur: H.montant(0, 3000) }; v.sites.hors_agents = { commandes: H.entre(0, 9), montant_eur: H.montant(0, 3000) } })
  const US = (aValider) => sal('salle-usine', (v) => { sansActive(v); v.aValider = aValider; for (const c of v.commandes) if (c.apercu) c.apercu = `/storage/v1/object/sign/sites-apercus/${c.id.slice(0, 8)}/index.html?token=essai-${H.entre(1000, 9999)}` })
  const AT = (taux) => sal('salle-atelier', (v) => { sansActive(v); v.rejet = H.entre(0, 30); v.tauxPass = taux; v.maquettes[1].revision = `Photo floue en tête (${H.entre(2, 9)})` })
  const STD = sal('salle-standard', (v) => {
    sansActive(v)
    for (const c of v.parClasse) c.nombre = H.entre(0, 12)
    const classes = ['oui', 'appel', 'non', 'sensible', 'rgpd']
    v.reponses = Array.from({ length: 10 }, (_, i) => ({ id: `r${i + 1}`, recu_le: new Date(t0 - (i + 1) * 17 * 60_000).toISOString(), classe: H.parmi(classes), texte_recu: i === 3 ? `Oui, montrez-moi la maquette ${PIEGE_HTML}` : `${H.parmi(TEXTES_STANDARD)} (Témoin ${H.entre(10, 99)})`, reponse_envoyee: H.suivant() < 0.5 ? `Bien reçu (${H.entre(10, 99)}).` : null }))
  })
  const RED = sal('salle-redaction', (v) => { sansActive(v); for (const k of Object.keys(v.variantes)) v.variantes[k] = { contacts: H.entre(0, 99), oui: H.entre(0, 9) } })
  const MA = (sansIa = false, sansUsine = false) => sal(sansIa ? 'salle-machines' : 'salle-machines', (v) => {
    sansActive(v)
    if (sansIa) { const j = jeu('salle-machines-sans-ia.json'); v.ia = j.reponse.valeur.ia } else { v.ia.valeur.cout_jour_eur = H.parmi([0, H.montant(0.01, 2)]); v.ia.valeur.bascules = Array.from({ length: H.entre(1, 24) }, (_, i) => ({ resume: `${H.parmi(['Cerebras', 'Groq', 'Codex'])} → ${H.parmi(['Ollama local', 'OpenRouter'])} (quota ${i})`, le: new Date(t0 - i * 3_600_000).toISOString() })) }
    if (sansUsine) v.usine = { valeur: null, source: 'supabase', a: MAINTENANT_JEUX, cache: false, manque: `Aucun relevé de l’usine depuis ${H.entre(2, 9)} h.` }
  })
  const base = (plus = {}) => ({ direct: D, fil: J('vues/fil.json'), tresorerie: T, reglages: J('reglages.json'), jauges: J('jauges.json'), 'salle:tresorerie': TR, 'salle:recettes': RE, 'salle:usine': US(H.entre(1, 3)), 'salle:atelier': AT(Math.round(H.suivant() * 100) / 100), 'salle:reunion': J('reunion-close.json'), 'salle:envois': J('vues/salle-envois.json'), 'salle:standard': STD, 'salle:redaction': RED, 'salle:machines': MA(), 'agent:livreur': J('vues/agent-livreur.json'), 'agent:*': (a) => { const n = a.url.searchParams.get('nom'); let j; try { j = jeu(`vues/agent-${n}.json`) } catch { j = jeu('vues/agent-modele.json'); j.reponse.valeur.nom = n } return { statut: 200, reponse: j.reponse, sansPiege: n === 'repondeur' } }, ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  const PAN = (c) => `[data-salle-panneau="${c}"]`
  const texte = (page, sel) => page.evaluate((s) => window.__JUGE__.texte(s), sel)
  const pret = async (page, sel) => { await page.waitForSelector(sel, { timeout: 15_000 }).catch(() => {}); await page.waitForFunction((s) => { const e = document.querySelector(s); return !!e && !/Chargement/.test(e.innerText) }, sel, { timeout: 8000 }).catch(() => {}); await attendre(250) }
  /** Tout le texte d'un panneau : chaque onglet [data-onglet] ouvert tour à tour. */
  async function toutLeTexte(page, sel) {
    const n = await page.$$eval(`${sel} [data-onglet]`, (l) => l.length)
    const t = [await texte(page, sel)]
    for (let i = 0; i < n; i++) { await page.locator(`${sel} [data-onglet]`).nth(i).click().catch(() => {}); await attendre(120); t.push(await texte(page, sel)) }
    if (n) { await page.locator(`${sel} [data-onglet]`).nth(0).click().catch(() => {}); await attendre(100) }
    return t.join(' ¦ ')
  }
  const jetons = [...new Set([...(lire(`${ST}/station.css`) ?? '').matchAll(/(--mc-[\w-]+)\s*:/g)].map((m) => m[1]))]
  const bordures = {}
  async function bordure(page, sel) {
    return page.evaluate(([s, noms]) => {
      const e = document.querySelector(s), mc = document.querySelector('.mc')
      if (!e || !mc) return null
      const c = getComputedStyle(e).borderTopColor
      const essai = document.createElement('span'); mc.appendChild(essai)
      const valeurs = noms.map((n) => { essai.style.color = `var(${n})`; return [n, getComputedStyle(essai).color] })
      essai.remove()
      return { couleur: c, jeton: valeurs.find(([, v]) => v === c)?.[0] ?? null, largeur: parseFloat(getComputedStyle(e).borderTopWidth) }
    }, [sel, jetons])
  }
  const sansBrutFrais = async (page, quoi) => { const t = await page.evaluate(() => document.querySelector('.mc')?.innerText.replace(/[  ]/g, ' ') ?? ''); for (const [k, v] of [['brut', T.tire.brut], ['frais', T.tire.frais]]) if (t.includes(espaces(euros(v)))) faute('SA-3', `${quoi} affiche le ${k} de la trésorerie (${euros(v)}) : les Recettes seulement`) }
  const pieges = async (page, sel, quoi) => { const p = await x.piegesDans(page, sel); for (const m of p.echecs) faute('SA-12', `${quoi} : ${m}`); return p }

  const srv = await demarrer({ critere: 'SA-2' })
  const captures = {}
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // Trésorerie (SA-4, SA-19, SA-20, SA-11 bureau, SA-13 bureau) ouverte par la liste des salles (SA-2).
  scenario(['SA-4', 'SA-19', 'SA-20', 'SA-11', 'SA-13', 'SA-2', 'SA-12'], 'trésorerie', async () => {
    const { page, s, dialogues, fermer } = await ouvrir('/controle/station', base(), { minuteries: true })
    await page.waitForSelector('[data-liste-salles] [data-salle="tresorerie"]', { timeout: 15_000 }).catch(() => {})
    await attendre(600)
    const minut0 = await page.evaluate(() => window.__JUGE_MINUTERIES__?.() ?? null)
    await page.click('[data-liste-salles] [data-salle="tresorerie"]').catch((e) => faute('SA-2', `bouton Trésorerie de la liste des salles (${court(e.message, 50)})`))
    await pret(page, PAN('tresorerie'))
    if (!(await page.$(PAN('tresorerie')))) { faute('SA-2', 'le bouton Trésorerie de la liste des salles n’ouvre pas [data-salle-panneau="tresorerie"]'); await fermer(); return }
    const v = TR.reponse.valeur
    const tout = await toutLeTexte(page, PAN('tresorerie'))
    for (const a of v.parAgent) if (!tout.includes(espaces(euros(a.cout_mois_eur))) || !tout.includes(String(a.appels))) faute('SA-4', `dépense de ${a.nom} : ${euros(a.cout_mois_eur)} et ${a.appels} appels (tirés) absents`)
    for (const t of v.parTache) if (!tout.includes(t.id) || !tout.includes(espaces(euros(t.eur)))) faute('SA-4', `tâche #${t.id} : ${euros(t.eur)} absent`)
    for (const [k, m] of Object.entries(v.parNature.valeur)) if (!tout.includes(espaces(euros(m)))) faute('SA-4', `nature ${k} : ${euros(m)} absent`)
    for (const m of v.modeles) if (!tout.includes(m.modele) || !tout.includes(m.fournisseur) || !tout.includes(espaces(euros(m.eur)))) faute('SA-20', `modèle ${m.modele} · ${m.fournisseur} · ${euros(m.eur)} (tiré) absent`)
    if (!tout.includes(espaces(euros(v.total_modeles_eur)))) faute('SA-20', `total des modèles ${euros(v.total_modeles_eur)} absent`)
    for (const a of v.abonnements) if (!tout.includes(a.fournisseur) || !tout.includes(espaces(euros(a.ttc_eur)))) faute('SA-4', `abonnement ${a.fournisseur} ${euros(a.ttc_eur)} absent`)
    if (!tout.includes(espaces(euros(T.tire.marge)))) faute('SA-4', `la marge de la trésorerie servie (${euros(T.tire.marge)}) absente`)
    if (!tout.includes(T.tire.tva)) faute('SA-4', `la TVA de la trésorerie servie (« ${T.tire.tva} ») absente`)
    if (/cr[ée]dit/i.test(tout)) { faute('SA-4', 'une pastille ou un texte de crédit dans la Trésorerie'); faute('SA-20', 'une pastille de crédit dans la Trésorerie') }
    // SA-19 : le résumé de salle.
    const r = await page.evaluate((p) => { const e = document.querySelector(`${p} [data-resume-salle]`); return e ? { texte: window.__JUGE__.texte(e) } : null }, PAN('tresorerie'))
    if (!r) faute('SA-19', 'Trésorerie : [data-resume-salle] absent')
    else {
      for (const l of ETIQUETTES) if (!r.texte.includes(l)) faute('SA-19', `résumé : « ${l} » absent`)
      const i = r.texte.indexOf('ACTIVE AUJ.')
      const apres = i < 0 ? '' : r.texte.slice(i + 'ACTIVE AUJ.'.length).trim()
      if (!apres.startsWith('—') || /^0\b/.test(apres)) faute('SA-19', `ACTIVE AUJ. non servie : « ${court(apres, 20)} », « — » attendu`)
    }
    // L'âge de `a` servi, borné par les instants d'avant et d'après la lecture de l'écran : « à 2 s près » autour d'eux.
    const aReel = Date.parse(TR.reponse.a) + s.decal
    const tAvant = Date.now()
    const synchro = await page.evaluate((p) => { const m = /synchro il y a (\d+) s · auto 30 s/.exec(document.querySelector(p)?.innerText.replace(/[  ]/g, ' ') ?? ''); return m ? Number(m[1]) : null }, PAN('tresorerie'))
    const tApres = Date.now()
    const age = Math.round((tApres - aReel) / 1000)
    if (synchro === null) faute('SA-19', '« synchro il y a n s · auto 30 s » absent')
    else if (synchro < (tAvant - aReel) / 1000 - 2 || synchro > (tApres - aReel) / 1000 + 2) faute('SA-19', `« synchro il y a ${synchro} s », l'âge de a servi est ${age} s (à 2 s près)`)
    const bd = await bordure(page, PAN('tresorerie'))
    bordures.tresorerie = bd
    if (!bd || !bd.jeton || !(bd.largeur > 0)) faute('SA-19', `la bordure du panneau (${bd?.couleur}) n'est pas un jeton --mc- de la station`)
    const compteEtiquettes = () => page.evaluate(([p, l]) => { const e = document.querySelector(`${p} [data-resume-salle]`); const t = e ? e.innerText : ''; return l.filter((x) => t.includes(x)).length }, [PAN('tresorerie'), ETIQUETTES])
    await page.mouse.click(720, 60)
    await page.keyboard.press('i'); await attendre(200)
    const replie = await compteEtiquettes()
    await page.keyboard.press('i'); await attendre(200)
    const deplie = await compteEtiquettes()
    if (!(replie < ETIQUETTES.length && deplie === ETIQUETTES.length)) faute('SA-19', `la touche I ne replie puis ne déplie pas le résumé (${replie} puis ${deplie} étiquettes)`)
    if (await page.evaluate((p) => [...document.querySelectorAll(`${p} button, ${p} a`)].some((e) => /upgrade/i.test(e.textContent)), PAN('tresorerie'))) faute('SA-19', 'un bouton UPGRADE')
    for (const m of await x.sousLaBarre(page, PAN('tresorerie'))) faute('SA-11', `Trésorerie : ${m}`)
    await pieges(page, PAN('tresorerie'), 'Trésorerie')
    for (const d of dialogues) faute('SA-12', `boîte ouverte par la page : ${d}`)
    captures.bureau = await capturer(page, x.cheminCapture('bureau.jpg'))
    // GÉRER pose ?agent=<titulaire>.
    const titulaires = AGENTS.filter((a) => a.salle === 'tresorerie').map((a) => a.nom)
    await page.evaluate(() => { window.__marque = 'juge' })
    await page.click(`${PAN('tresorerie')} [data-resume-salle] button:has-text("GÉRER")`).catch((e) => faute('SA-19', `GÉRER introuvable (${court(e.message, 40)})`))
    await attendre(300)
    // D-0510-D4 : sur une machine saturée, `router.replace` (racine réelle, next dev) pose le paramètre plus de 300 ms après l'appui : l'adresse est relue jusqu'à ce qu'il y soit (au plus 12 s) ; passé ce délai, ce qui est lu est jugé comme avant.
    let ag = await page.evaluate(() => ({ agent: new URL(location.href).searchParams.get('agent'), marque: window.__marque }))
    for (const t0 = Date.now(); !ag.agent && Date.now() - t0 < 12_000;) { await attendre(150); ag = await page.evaluate(() => ({ agent: new URL(location.href).searchParams.get('agent'), marque: window.__marque })) }
    if (!titulaires.includes(ag.agent) || ag.marque !== 'juge') faute('SA-19', `GÉRER pose ?agent=${ag.agent}, un titulaire (${titulaires.join(', ')}) attendu sans changer de page`)
    // Fermé : plus aucune minuterie de plus qu'avant l'ouverture, aucune animation en cours.
    await page.keyboard.press('Escape'); await attendre(200)
    await page.evaluate(() => { const u = new URL(location.href); u.searchParams.delete('agent'); u.searchParams.delete('salle'); history.replaceState(null, '', u.pathname + u.search); window.dispatchEvent(new PopStateEvent('popstate')) })
    await attendre(500)
    const apres = await page.evaluate(() => ({ n: window.__JUGE_MINUTERIES__?.() ?? null, anim: window.__JUGE__.animations('.mc'), ouvert: !!document.querySelector('[data-salle-panneau], [data-fiche-agent]') }))
    if (apres.ouvert) faute('SA-19', 'le panneau ne se ferme pas')
    if (minut0 === null || apres.n === null) faute('SA-19', 'minuteries non relevées')
    else if (apres.n > minut0) faute('SA-19', `panneau fermé : ${apres.n} minuterie(s) actives, ${minut0} avant l'ouverture (la synchro se recalcule encore ?)`)
    if (apres.anim.length) faute('SA-19', `panneau fermé : une animation tourne (${apres.anim[0]})`)
    DETAILS['SA-19'] = `résumé : ${ETIQUETTES.join(', ')} ; ACTIVE AUJ. non servie → « — » ; « synchro il y a ${synchro} s · auto 30 s » = âge de a servi (${age} s) ; I replie et déplie ; GÉRER → ?agent=${ag.agent} ; pas d’UPGRADE ; bordure ${bd?.jeton} ; fermé : minuteries revenues à ${minut0}, aucune animation`
    await fermer()
    // parNature en manque : le manque tel quel, jamais « 0 € ».
    const manque = `Répartition par nature pas encore mesurée (${H.entre(10, 99)}).`
    const tr2 = structuredClone(TR); tr2.reponse.valeur.parNature = { valeur: null, source: 'supabase', a: MAINTENANT_JEUX, cache: false, manque }
    const o2 = await ouvrir('/controle/station?salle=tresorerie', base({ 'salle:tresorerie': tr2 }))
    await pret(o2.page, PAN('tresorerie'))
    const t2 = await toutLeTexte(o2.page, PAN('tresorerie'))
    if (!t2.includes(manque)) faute('SA-4', `parNature en manque : « ${manque} » absent`)
    await o2.fermer()
    DETAILS['SA-4'] = `dépenses par agent et par tâche, nature (texte, image, vidéo, voix) ou son manque tel quel, abonnements, marge ${euros(T.tire.marge)} et « ${T.tire.tva} » de la trésorerie servie, tous tirés ; aucun crédit`
  })
  // Recettes (SA-3) et l'adresse (SA-2 : ouverture, Fermer, Échap).
  scenario(['SA-3', 'SA-2'], 'recettes', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=recettes', base())
    await pret(page, PAN('recettes'))
    if (!(await page.$(PAN('recettes')))) { faute('SA-2', '?salle=recettes n’ouvre pas [data-salle-panneau="recettes"]'); await fermer(); return }
    const dlg = await page.evaluate((p) => document.querySelector(p)?.getAttribute('role'), PAN('recettes'))
    if (dlg !== 'dialog') faute('SA-2', `[data-salle-panneau="recettes"] : role « ${dlg} », dialog attendu`)
    const v = RE.reponse.valeur
    const tout = await toutLeTexte(page, PAN('recettes'))
    const onglets = await page.$$eval(`${PAN('recettes')} [data-onglet]`, (l) => l.length)
    if (onglets !== 5) faute('SA-3', `${onglets} [data-onglet], cinq attendus`)
    for (const [k, l] of [['agents', 'Venu des agents (froid)'], ['hors_agents', 'Hors agents']]) if (!tout.includes(l) || !tout.includes(espaces(euros(v.sites[k].montant_eur)))) faute('SA-3', `« ${l} » ${euros(v.sites[k].montant_eur)} (tiré) absent`)
    const jours = await page.$$eval(`${PAN('recettes')} [data-jour]`, (l) => l.length)
    if (jours !== 30) faute('SA-3', `${jours} [data-jour], trente attendus`)
    if (!tout.includes(v.packs.manque)) faute('SA-3', `packs : le manque servi « ${v.packs.manque} » absent`)
    if (!tout.includes(espaces(euros(T.tire.mrr)))) faute('SA-3', `MRR ${euros(T.tire.mrr)} (trésorerie tirée) absent`)
    if (!new RegExp(`PAIEMENTS\\D{0,6}${T.tire.paiements}\\b`).test(tout)) faute('SA-3', `PAIEMENTS ${T.tire.paiements} (trésorerie tirée) absent`)
    for (const [k, m] of [['brut', T.tire.brut], ['frais', T.tire.frais], ['net', T.tire.net]]) if (!tout.includes(espaces(euros(m)))) faute('SA-3', `CANAUX : ${k} ${euros(m)} (tiré) absent`)
    // Fermer, puis Échap.
    await page.evaluate(() => { window.__marque = 'juge' })
    await page.click(`${PAN('recettes')} [data-fermer], ${PAN('recettes')} button:has-text("Fermer")`).catch(() => {})
    await attendre(300)
    // D-0510-D4 : « Fermer » et Échap retirent `?salle=` par `router.replace` : sur une machine saturée (racine réelle) l'adresse change plus de 300 ms après le geste ; elle est relue jusqu'à la fermeture (au plus 12 s), puis jugée comme avant.
    const lireFerme = async () => { const lire1 = () => page.evaluate(() => ({ salle: new URL(location.href).searchParams.get('salle'), ouvert: !!document.querySelector('[data-salle-panneau]'), marque: window.__marque })); let v = await lire1(); for (const t0 = Date.now(); (v.salle !== null || v.ouvert) && Date.now() - t0 < 12_000;) { await attendre(150); v = await lire1() } return v }
    let r = await lireFerme()
    if (r.salle !== null || r.ouvert || r.marque !== 'juge') faute('SA-2', `« Fermer » : ?salle=${r.salle}${r.ouvert ? ', panneau ouvert' : ''}${r.marque ? '' : ' (page rechargée)'}`)
    await sansBrutFrais(page, 'la station sans panneau')
    await page.click('[data-liste-salles] [data-salle="recettes"]').catch(() => {})
    await pret(page, PAN('recettes'))
    await page.keyboard.press('Escape'); await attendre(300)
    r = await lireFerme()
    if (r.salle !== null || r.ouvert || r.marque !== 'juge') faute('SA-2', `Échap : ?salle=${r.salle}${r.ouvert ? ', panneau ouvert' : ''}`)
    for (const c of ['tresorerie', 'usine', 'machines', 'envois']) {
      await page.click(`[data-liste-salles] [data-salle="${c}"]`).catch(() => {})
      await pret(page, PAN(c)); await toutLeTexte(page, PAN(c))
      await sansBrutFrais(page, `le panneau ${c}`)
      await page.keyboard.press('Escape'); await attendre(200)
    }
    DETAILS['SA-3'] = `cinq onglets ; « Venu des agents (froid) » et « Hors agents » tirés ; trente [data-jour] ; packs : le manque ; MRR ${euros(T.tire.mrr)} et PAIEMENTS ${T.tire.paiements} de la trésorerie ; CANAUX brut ${euros(T.tire.brut)}, frais ${euros(T.tire.frais)}, net ${euros(T.tire.net)} ; brut et frais absents de la station et des panneaux Trésorerie, Usine, Machines et Envois`
    await fermer()
  })
  // Usine (SA-5) : à valider > 0 puis = 0 ; COMMANDES · MOIS = la barre ; aperçus signés ; tâches du Livreur.
  scenario(['SA-5', 'SA-19'], 'usine', async () => {
    const n = H.entre(1, 3), u = US(n)
    const { page, fermer } = await ouvrir('/controle/station?salle=usine', base({ 'salle:usine': u }))
    await pret(page, PAN('usine'))
    await page.waitForFunction((p) => /#\d+/.test(document.querySelector(p)?.innerText ?? ''), PAN('usine'), { timeout: 5000 }).catch(() => {})
    const v = u.reponse.valeur
    const tout = await toutLeTexte(page, PAN('usine'))
    const onglets = await page.$$eval(`${PAN('usine')} [data-onglet]`, (l) => l.length)
    if (onglets !== 4) faute('SA-5', `${onglets} [data-onglet], quatre attendus`)
    for (const l of ['COMMANDES · MOIS', 'À VALIDER', 'EN GÉNÉRATION', 'EN LIGNE']) if (!tout.includes(l)) faute('SA-5', `tuile « ${l} » absente`)
    const cm = await page.evaluate(() => window.__JUGE__.texte('[data-zone="barre"] [data-compteur="commandes_mois"] [data-valeur]'))
    const iCm = tout.indexOf('COMMANDES · MOIS')
    if (!cm || iCm < 0 || !tout.slice(iCm, iCm + 40).includes(cm)) faute('SA-5', `COMMANDES · MOIS du panneau (« ${court(tout.slice(iCm, iCm + 30), 30)} ») différent de la barre (« ${cm} »)`)
    for (const c of v.commandes) if (!tout.includes(c.metier) || !tout.includes(c.commune)) faute('SA-5', `commande ${c.id.slice(0, 8)} : métier ou commune absent`)
    const liens = await page.$$eval(`${PAN('usine')} a`, (l) => l.map((a) => ({ href: a.getAttribute('href'), texte: a.textContent.trim(), cible: a.getAttribute('target') })))
    const apercus = v.commandes.filter((c) => c.apercu).map((c) => c.apercu)
    for (const a of apercus) if (!liens.some((l) => l.href === a)) faute('SA-5', `aperçu signé ${court(a, 50)} sans lien`)
    const autresApercus = liens.filter((l) => /aper[çc]u/i.test(l.texte) && !apercus.includes(l.href))
    if (autresApercus.length) faute('SA-5', `${autresApercus.length} aperçu(s) sans le lien signé servi (${court(autresApercus[0].href, 40)})`)
    if (!liens.some((l) => l.href === '/controle?onglet=sites')) faute('SA-5', `aValider ${n} > 0 : aucun lien vers /controle?onglet=sites`)
    const L = jeu('vues/agent-livreur.json').reponse.valeur.taches
    for (const t of L) if (!tout.includes(`#${t.numero}`) || !tout.includes(t.statut)) faute('SA-5', `tâche du Livreur #${t.numero} (${t.statut}) absente`)
    const bd = await bordure(page, PAN('usine'))
    bordures.usine = bd
    await fermer()
    const o2 = await ouvrir('/controle/station?salle=usine', base({ 'salle:usine': US(0) }))
    await pret(o2.page, PAN('usine'))
    if (await o2.page.$(`${PAN('usine')} a[href="/controle?onglet=sites"]`)) faute('SA-5', 'aValider = 0 : la carte « à valider » est là')
    await o2.fermer()
    DETAILS['SA-5'] = `quatre tuiles, quatre onglets ; COMMANDES · MOIS = « ${cm} » de la barre ; chaque commande (métier, commune) ; aperçus = les liens signés tirés, aucun autre ; « à valider » → /controle?onglet=sites seulement si aValider > 0 (${n} puis 0) ; tâches du Livreur (vue=agent&nom=livreur) et leurs pastilles`
  })
  // Atelier (SA-6).
  scenario(['SA-6'], 'atelier', async () => {
    const taux = Math.round(H.suivant() * 100) / 100, a = AT(taux)
    const { page, fermer } = await ouvrir('/controle/station?salle=atelier', base({ 'salle:atelier': a }))
    await pret(page, PAN('atelier'))
    const v = a.reponse.valeur
    const tout = await toutLeTexte(page, PAN('atelier'))
    const onglets = await page.$$eval(`${PAN('atelier')} [data-onglet]`, (l) => l.length)
    if (onglets !== 3) faute('SA-6', `${onglets} [data-onglet], trois attendus`)
    for (const m of v.maquettes) if (!tout.includes(m.metier) || !tout.includes(m.commune) || !tout.includes(m.verdict)) faute('SA-6', `maquette ${m.id} : métier, commune ou verdict absent`)
    if (!new RegExp(`REJET\\D{0,6}${v.rejet}\\b`).test(tout)) faute('SA-6', `REJET ${v.rejet} (tiré) absent`)
    if (!tout.includes(`${Math.round(taux * 100)} %`)) faute('SA-6', `taux de PASS ${Math.round(taux * 100)} % (tiré) absent`)
    const rev = v.maquettes.find((m) => m.revision)
    if (!tout.includes('RÉVISION DEMANDÉE') || !tout.includes(rev.revision)) faute('SA-6', `« RÉVISION DEMANDÉE » et « ${rev.revision} » absents`)
    const liens = await page.$$eval(`${PAN('atelier')} a`, (l) => l.map((y) => y.getAttribute('href')))
    for (const m of v.maquettes.filter((y) => y.apercu)) if (!liens.includes(m.apercu)) faute('SA-6', `aperçu signé de ${m.id} sans lien`)
    await fermer()
    const o2 = await ouvrir('/controle/station?salle=atelier', base({ 'salle:atelier': AT(null) }))
    await pret(o2.page, PAN('atelier'))
    const t2 = await texte(o2.page, PAN('atelier'))
    if (!/PASS\s*—/.test(t2) || /PASS\s*0\s*%/.test(t2)) faute('SA-6', `taux de PASS inconnu : « ${court(t2.slice(t2.indexOf('PASS'), t2.indexOf('PASS') + 12), 12)} », « — » attendu`)
    await o2.fermer()
    DETAILS['SA-6'] = `trois onglets ; maquettes (métier, commune, verdict), aperçu signé, « RÉVISION DEMANDÉE » et sa raison ; REJET ${v.rejet} et PASS ${Math.round(taux * 100)} % tirés ; PASS inconnu → « — »`
  })
  // Réunion (SA-7).
  scenario(['SA-7'], 'réunion', async () => {
    const vus = []
    for (const [jeuR, enCours] of [['reunion-en-cours.json', true], ['reunion-close.json', false]]) {
      const r = J(jeuR)
      const { page, fermer } = await ouvrir('/controle/station?salle=reunion', base({ 'salle:reunion': r }))
      await pret(page, PAN('reunion'))
      const t = await texte(page, PAN('reunion'))
      const v = r.reponse.valeur
      if (/Réunion en cours/.test(t) !== enCours) faute('SA-7', `${jeuR} : « Réunion en cours » ${enCours ? 'absent' : 'affiché'}`)
      let k = -1
      for (const l of v.derniere.lignes) { const i = t.indexOf(l, k + 1); if (i <= k) { faute('SA-7', `${jeuR} : la ligne « ${l} » absente ou hors d'ordre`); break } k = i }
      if (!t.includes(v.objectif.libelle) || !t.includes('PAR LE CHEF')) faute('SA-7', `${jeuR} : l'objectif « ${v.objectif.libelle} » signé « PAR LE CHEF » absent`)
      for (const i of v.idees) if (!t.includes(i.question) || !t.includes(i.statut)) faute('SA-7', `${jeuR} : l'idée « ${i.question} » et son statut « ${i.statut} » absents`)
      vus.push(`${jeuR} ${enCours ? 'avec' : 'sans'} « Réunion en cours »`)
      await fermer()
    }
    DETAILS['SA-7'] = `les 5 lignes dans l'ordre, l'objectif « PAR LE CHEF », les idées et leur statut ; ${vus.join(', ')}`
  })
  // Salle des envois (SA-8, SA-18 direction, SA-12).
  scenario(['SA-8', 'SA-18', 'SA-12'], 'envois', async () => {
    const e = jeu('vues/salle-envois.json').reponse.valeur
    const { page, fermer } = await ouvrir('/controle/station?salle=envois', base())
    await pret(page, PAN('envois'))
    const t = await texte(page, PAN('envois'))
    for (const c of e.parCanal) if (!t.includes(c.libelle ?? c.canal) || !t.includes(c.texte) || !t.includes(c.sante)) faute('SA-8', `canal ${c.canal} : libellé, compteur « ${c.texte} » ou santé « ${c.sante} » absent`)
    for (const g of e.parTechnologie) if (!t.includes(g.technologie) || !new RegExp(`\\b${g.envois}\\b`).test(t) || !new RegExp(`\\b${g.echecs_affilee}\\b`).test(t) || !t.includes(g.etat === 'pause' ? 'en pause' : 'active') || (g.motif && !t.includes(g.motif))) faute('SA-8', `technologie ${g.technologie} : envois, échecs d'affilée, état ou motif absent`)
    const anomalie = await page.evaluate(([p, txt]) => { const el = [...document.querySelectorAll(`${p} *`)].find((y) => y.children.length === 0 && y.textContent.includes(txt)); const mc = document.querySelector('.mc'); if (!el || !mc) return null; const s = document.createElement('span'); mc.appendChild(s); s.style.color = 'var(--mc-crit)'; const crit = getComputedStyle(s).color; s.remove(); return { couleur: getComputedStyle(el).color, crit } }, [PAN('envois'), e.anomalies[0].texte])
    if (!anomalie) faute('SA-8', `anomalie « ${e.anomalies[0].texte} » absente`)
    else if (anomalie.couleur !== anomalie.crit) faute('SA-8', `anomalie en ${anomalie.couleur}, le rouge de la station (${anomalie.crit}) attendu`)
    const pastilles = (t.match(/\bJ1\b/g) ?? []).length, j3 = (t.match(/\bJ3\b/g) ?? []).length, j2 = (t.match(/2e juge/g) ?? []).length
    if (pastilles < e.envois.length || j3 < e.envois.length || j2 < e.envois.length) faute('SA-8', `pastilles de verdicts : J1 ×${pastilles}, J3 ×${j3}, 2e juge ×${j2} pour ${e.envois.length} envois`)
    for (const m of [/chauffe/i, /boîte d.envoi/i, /R1-R3/]) if (m.test(t)) faute('SA-8', `texte interdit « ${m.source} » dans la Salle des envois`)
    for (const g of await x.gestesInterdits(page, PAN('envois'), INTERDITS_ENVOIS)) faute('SA-8', `bouton ou lien « ${court(g, 40)} »`)
    const ge = await page.evaluate((p) => ({ present: !!document.querySelector(`${p} [data-gestes-envoi]`), techs: document.querySelectorAll(`${p} [data-gestes-envoi] [data-geste="reprendre_technologie"]`).length, leves: document.querySelectorAll(`${p} [data-gestes-envoi] [data-geste="lever_modele"]`).length }), PAN('envois'))
    if (!ge.present) faute('SA-18', 'rôle direction : [data-gestes-envoi] absent')
    else if (ge.techs !== e.gestes.technologies_pause.length || ge.leves !== e.gestes.modeles_suspendus.length) faute('SA-18', `[data-gestes-envoi] : ${ge.techs} reprise(s) et ${ge.leves} levée(s), ${e.gestes.technologies_pause.length} et ${e.gestes.modeles_suspendus.length} servies (gestes tel que servi)`)
    await pieges(page, PAN('envois'), 'Salle des envois')
    await fermer()
    const f = J('envois-formulaire-ferme.json')
    const o2 = await ouvrir('/controle/station?salle=envois', base({ 'salle:envois': f }))
    await pret(o2.page, PAN('envois'))
    const t2 = await texte(o2.page, PAN('envois'))
    const vide = f.reponse.valeur.vide
    if (!t2.includes(vide)) faute('SA-8', `formulaire fermé : la phrase vide « ${vide} » absente`)
    const tableau = await o2.page.evaluate(([p, c]) => !!document.querySelector(`${p} table`) || c.some((x) => (document.querySelector(p)?.innerText ?? '').includes(x)), [PAN('envois'), f.reponse.valeur.parCanal.filter((c) => c.plafond).map((c) => c.texte)])
    if (tableau) faute('SA-8', 'formulaire fermé : un tableau des canaux est rendu')
    await o2.fermer()
    DETAILS['SA-8'] = 'une ligne par canal (compteur, santé) et par technologie (envois, échecs, état, motif) ; l’anomalie en --mc-crit ; J1, J3 et « 2e juge » par envoi ; ni « chauffe », ni « boîte d’envoi », ni « R1-R3 » ; aucun bouton d’envoi ; formulaire fermé : la phrase vide exacte, aucun tableau'
  })
  // SA-18, rôle lecture ; SA-11 et la capture du téléphone.
  scenario(['SA-18'], 'envois lecture', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=envois', { ...base(), journal: J('role-lecture.json') })
    await pret(page, PAN('envois'))
    if (!(await page.$(PAN('envois')))) faute('SA-18', 'rôle lecture : la Salle des envois ne s’ouvre pas')
    if (await page.$(`${PAN('envois')} [data-gestes-envoi]`)) faute('SA-18', 'rôle lecture : [data-gestes-envoi] est rendu')
    DETAILS['SA-18'] = 'rôle direction : [data-gestes-envoi] avec les gestes servis ; rôle lecture : absent'
    await fermer()
  })
  scenario(['SA-11', 'SA-13'], 'téléphone', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=envois', base(), { largeur: 390, hauteur: 844, mobile: true })
    await pret(page, PAN('envois'))
    for (const m of await x.feuilleTelephone(page, PAN('envois'))) faute('SA-11', `Salle des envois à 390×844 : ${m}`)
    captures.telephone = await capturer(page, x.cheminCapture('telephone.jpg'))
    await page.goto(`${srv.base}/controle/station?agent=chef`, { waitUntil: 'domcontentloaded' })
    await pret(page, '[data-fiche-agent="chef"]')
    for (const m of await x.feuilleTelephone(page, '[data-fiche-agent="chef"]')) faute('SA-11', `fiche du Chef à 390×844 : ${m}`)
    DETAILS['SA-11'] = 'à 390×844 : Salle des envois et fiche d’agent en feuilles plein écran, scrollWidth ≤ 390, boutons ≥ 44 px, textes ≥ 12 px ; à 1440×900 le panneau sous la barre'
    await fermer()
  })
  // Standard (SA-15, SA-12).
  scenario(['SA-15', 'SA-12'], 'standard', async () => {
    const { page, dialogues, fermer } = await ouvrir('/controle/station?salle=standard', base())
    await pret(page, PAN('standard'))
    if (await page.$('[data-salle-agents="standard"]')) faute('SA-15', '?salle=standard ouvre [data-salle-agents="standard"]')
    if (!(await page.$(PAN('standard')))) { faute('SA-15', '?salle=standard n’ouvre pas [data-salle-panneau="standard"]'); await fermer(); return }
    const v = STD.reponse.valeur
    const t = await texte(page, PAN('standard'))
    for (const c of v.parClasse) if (!new RegExp(`${c.classe}\\s*${c.nombre}\\b`).test(t)) faute('SA-15', `pastille ${c.classe} ${c.nombre} (tirée) absente`)
    let k = -1
    for (const r of v.reponses) { const i = t.indexOf(espaces(r.texte_recu), k + 1); if (i <= k) { faute('SA-15', `réponse ${r.id} « ${court(r.texte_recu, 40)} » absente ou hors d'ordre`); break } k = i }
    const boutons = await page.evaluate((p) => [...document.querySelectorAll(`${p} button, ${p} [role="button"]`)].filter((b) => !b.hasAttribute('data-fermer') && !b.closest('[data-resume-salle]') && b.getAttribute('role') !== 'tab').map((b) => b.textContent.trim().slice(0, 30)), PAN('standard'))
    if (boutons.length) faute('SA-15', `${boutons.length} bouton(s) dans le Standard (${boutons.slice(0, 3).join(', ')}) : lecture seule`)
    const p = await pieges(page, PAN('standard'), 'Standard')
    if (!p.texteHtml) faute('SA-12', 'Standard : « <img src=x onerror=alert(1)> » ne s’affiche pas tel quel')
    for (const d of dialogues) faute('SA-12', `boîte ouverte par la page : ${d}`)
    DETAILS['SA-15'] = `une pastille par classe (nombres tirés) ; les 10 réponses tirées dans l'ordre, texte exact ; [data-salle-panneau="standard"], pas la liste des agents ; aucun bouton`
    await fermer()
  })
  // Rédaction (SA-16).
  scenario(['SA-16'], 'rédaction', async () => {
    const { page, fermer } = await ouvrir('/controle/station?salle=redaction', base())
    await pret(page, PAN('redaction'))
    const v = RED.reponse.valeur
    const t = await texte(page, PAN('redaction'))
    for (const [k, y] of Object.entries(v.variantes)) if (!new RegExp(`${k}\\b[^\\d]{0,6}${y.contacts}\\s*contacts[^\\d]{0,6}${y.oui}\\s*oui`).test(t)) faute('SA-16', `variante ${k} · ${y.contacts} contacts · ${y.oui} oui (tirés) absente`)
    if ((t.match(/\bJ1\b/g) ?? []).length < v.envois.length || (t.match(/2e juge/g) ?? []).length < v.envois.length) faute('SA-16', 'les trois pastilles de verdicts par envoi manquent')
    for (const m of v.modeles_suspendus) if (!t.includes(m)) faute('SA-16', `modèle suspendu « ${m} » absent`)
    const boutons = await page.evaluate((p) => [...document.querySelectorAll(`${p} button, ${p} [role="button"]`)].filter((b) => !b.hasAttribute('data-fermer') && !b.closest('[data-resume-salle]') && b.getAttribute('role') !== 'tab').length, PAN('redaction'))
    if (boutons) faute('SA-16', `${boutons} bouton(s) dans la Rédaction`)
    DETAILS['SA-16'] = 'variantes (contacts et oui tirés), J1, J3 et 2e juge par envoi, modèles suspendus ; aucun bouton'
    await fermer()
  })
  // Salle des machines (SA-17, SA-20).
  scenario(['SA-17', 'SA-20'], 'machines', async () => {
    const m = MA()
    const { page, fermer } = await ouvrir('/controle/station?salle=machines', base({ 'salle:machines': m }))
    await pret(page, PAN('machines'))
    await page.waitForFunction((p) => !/Chargement des jauges/.test(document.querySelector(p)?.innerText ?? ''), PAN('machines'), { timeout: 5000 }).catch(() => {})
    const v = m.reponse.valeur
    const t = await texte(page, PAN('machines'))
    for (const a of v.agents) if (!t.includes(a.nom) || !t.includes(a.etat)) faute('SA-17', `agent ${a.nom} (${a.etat}) absent`)
    for (const c of v.crons) if (!t.includes(c.nom)) faute('SA-17', `cron ${c.nom} absent`)
    if (!t.includes(v.usine.valeur.mesure)) faute('SA-17', `mesure de l'usine « ${v.usine.valeur.mesure} » absente`)
    const jg = jeu('jauges.json').reponse.jauges
    const js = await page.evaluate(([p, l]) => l.map((j) => { const el = [...document.querySelectorAll(`${p} *`)].filter((y) => y.textContent.includes(j.libelle)).sort((a, b) => a.textContent.length - b.textContent.length)[0]; const bloc = el ? (el.closest('[data-jauge]') ?? el.parentElement ?? el) : null; return { cle: j.cle, etat: j.etat, trouve: !!el, texte: bloc ? bloc.textContent : '', crit: bloc ? [bloc, ...bloc.querySelectorAll('*')].some((y) => [...y.attributes].some((a) => a.value === 'crit') || /\bcrit\b/.test(y.className)) : false } }), [PAN('machines'), jg])
    for (const j of js) {
      if (!j.trouve) { faute('SA-17', `jauge ${j.cle} absente`); continue }
      if (!j.texte.includes(j.etat)) faute('SA-17', `jauge ${j.cle} : état « ${j.etat} » servi absent`)
      if ((j.etat === 'pleine') !== j.crit) faute('SA-17', `jauge ${j.cle} (${j.etat}) : pastille crit ${j.crit ? 'posée' : 'absente'}`)
    }
    const ia = v.ia.valeur
    const r = await page.evaluate((p) => ({ f: [...document.querySelectorAll(`${p} [data-ia-fournisseur]`)].map((e) => ({ objet: e.getAttribute('data-ia-fournisseur'), texte: e.textContent.replace(/\s+/g, ' ').trim() })), b: document.querySelectorAll(`${p} [data-ia-bascule]`).length, c: window.__JUGE__.texte(`${p} [data-ia-cout]`) }), PAN('machines'))
    if (r.f.length !== ia.fournisseurs.length) faute('SA-20', `${r.f.length} [data-ia-fournisseur], ${ia.fournisseurs.length} servis`)
    for (const f of ia.fournisseurs) if (!r.f.some((y) => y.texte.includes(f.resume))) faute('SA-20', `fournisseur ${f.objet} : résumé « ${f.resume} » absent`)
    if (r.b !== Math.min(20, ia.bascules.length)) faute('SA-20', `${r.b} [data-ia-bascule], ${Math.min(20, ia.bascules.length)} attendues (${ia.bascules.length} servies, 20 au plus)`)
    if (!r.c || !r.c.includes(espaces(euros(ia.cout_jour_eur)))) faute('SA-20', `[data-ia-cout] « ${r.c} », ${euros(ia.cout_jour_eur)} (tiré) attendu`)
    await fermer()
    const m2 = MA(true, true)
    const o2 = await ouvrir('/controle/station?salle=machines', base({ 'salle:machines': m2 }))
    await pret(o2.page, PAN('machines'))
    const t2 = await texte(o2.page, PAN('machines'))
    if (!t2.includes(m2.reponse.valeur.ia.manque)) faute('SA-20', `ia nul : le manque « ${m2.reponse.valeur.ia.manque} » absent`)
    if (await o2.page.$(`${PAN('machines')} [data-ia-fournisseur]`)) faute('SA-20', 'ia nul : des fournisseurs sont rendus')
    if (!t2.includes(m2.reponse.valeur.usine.manque)) faute('SA-17', `usine nulle : le manque « ${m2.reponse.valeur.usine.manque} » absent`)
    await o2.fermer()
    DETAILS['SA-17'] = 'une ligne par agent et par cron ; la mesure de l’usine ou son manque ; chaque jauge de /api/controle/jauges avec son état, la pleine en crit ; ni part ni seuil dans Machines.tsx'
    DETAILS['SA-20'] = `IA gratuites : ${ia.fournisseurs.length} fournisseurs (résumé tel quel), ${Math.min(20, ia.bascules.length)} bascules sur ${ia.bascules.length} tirées, coût ${euros(ia.cout_jour_eur)} ; ia nul → le manque ; Trésorerie : chaque modèle et le total tirés, aucun crédit ; aucun « 0 € » écrit dans Machines.tsx`
  })
  // Fiches d'agent (SA-9, SA-12 : le Répondeur sans piège).
  scenario(['SA-9', 'SA-2'], 'fiches', async () => {
    const { page, fermer } = await ouvrir('/controle/station?agent=chef', base())
    for (const nom of ['chef', 'facteur', 'facteur_usine', 'repondeur', 'livreur']) {
      if (nom !== 'chef') await page.goto(`${srv.base}/controle/station?agent=${nom}`, { waitUntil: 'domcontentloaded' })
      const F = `[data-fiche-agent="${nom}"]`
      await pret(page, F)
      if (!(await page.$(F))) { faute(nom === 'chef' ? 'SA-2' : 'SA-9', `?agent=${nom} n'ouvre pas ${F}`); continue }
      const v = (() => { try { return jeu(`vues/agent-${nom}.json`).reponse.valeur } catch { return null } })()
      const t = await texte(page, F)
      for (const k of ['libelle', 'role', 'etat', 'cadence']) if (v?.[k] && !t.includes(espaces(v[k]))) faute('SA-9', `${nom} : ${k} « ${v[k]} » absent`)
      const mo = await page.evaluate((f) => { const e = document.querySelector(`${f} [data-modele]`); return e ? { texte: window.__JUGE__.texte(e), vis: e.checkVisibility() } : null }, F)
      if (!mo || !mo.vis || !mo.texte.includes(espaces(v.modele.texte))) faute('SA-9', `${nom} : [data-modele] « ${mo?.texte} », « ${v.modele.texte} » servi`)
      if (!t.includes(dateParis(Date.parse(v.modele_le) + Date.now() - Date.parse(MAINTENANT_JEUX)))) faute('SA-9', `${nom} : la date du modèle (modele_le) absente`)
      for (const tk of v.taches) if (!t.includes(`#${tk.numero}`) || !t.includes(tk.statut)) faute('SA-9', `${nom} : tâche #${tk.numero} et sa pastille ${tk.statut} absentes`)
      if (nom === 'chef') for (const c of v.consignes) { if (!t.includes(c.texte)) faute('SA-9', `chef : consigne « ${c.texte} » absente`) ; if (c.lue && !/reçue/.test(t)) faute('SA-9', 'chef : « reçue » absent pour une consigne lue') }
      if (nom === 'facteur' || nom === 'facteur_usine') for (const g of v.technologies) if (!t.includes(g.technologie)) faute('SA-9', `${nom} : technologie ${g.technologie} absente`)
      if (nom === 'repondeur') for (const r of v.reponses) { if (!t.includes(r.texte_recu)) faute('SA-9', `repondeur : « ${r.texte_recu} » absent`); if (r.reponse_envoyee && !t.includes(r.reponse_envoyee)) faute('SA-9', `repondeur : « ${r.reponse_envoyee} » absent`) }
      else { const p = await x.piegesDans(page, F); for (const m of p.echecs) faute('SA-12', `fiche ${nom} : ${m}`) }
      if (!(await page.$(`${F} [data-pause-agent="${nom}"], ${F} [data-pause-agent]`))) faute('SA-9', `${nom}, rôle direction : [data-pause-agent] absent`)
    }
    await fermer()
    const l = await ouvrir('/controle/station?agent=chef', { ...base(), journal: J('role-lecture.json') })
    await pret(l.page, '[data-fiche-agent="chef"]')
    if (await l.page.$('[data-fiche-agent="chef"] [data-pause-agent]')) faute('SA-9', 'rôle lecture : [data-pause-agent] dans la fiche')
    await l.fermer()
    DETAILS['SA-9'] = 'chef, facteur, facteur_usine, repondeur, livreur : libellé, rôle, état, cadence, [data-modele] et sa date, tâches et pastilles ; consignes (et « reçue ») du Chef, technologies des facteurs, réponses exactes du Répondeur ; [data-pause-agent] pour la direction, absent pour la lecture'
  })
  // L'adresse (SA-2) : une salle sans panneau (s'il en reste), puis chaque salle a le sien.
  // D-0510-D4 (correction du chef, 05/10, 026-120) : ce scénario supposait que `commandement`, `repos` et `ecommerce` n'avaient pas de panneau et ouvraient la liste de leurs
  // agents. 026-188 et 026-189 leur ont donné leur panneau (Panneaux.tsx : SALLES_SANS_PANNEAU est vide), la liste d'agents n'est plus que le repli d'une salle future : le juge
  // lit cette liste dans le source. Pour chaque salle SANS panneau il joue l'ancien contrôle (liste d'agents, un bouton par agent, la fiche, « Aucun agent… ») ; pour chacune des
  // AUTRES (les vingt et une salles du contrat) il exige que `?salle=<clé>` ouvre `[data-salle-panneau="<clé>"]` en `dialog`, et jamais la liste de repli. Plus de salles
  // contrôlées qu'avant, aucune retirée ; un source illisible reste rouge.
  scenario(['SA-2'], 'salles sans panneau', async () => {
    const m = (lire(`${ST}/Panneaux.tsx`) ?? '').match(/SALLES_SANS_PANNEAU\s*:\s*string\[\]\s*=\s*\[([^\]]*)\]/)
    if (!m) { faute('SA-2', 'SALLES_SANS_PANNEAU introuvable dans Panneaux.tsx : le repli des salles sans panneau ne se juge pas'); return }
    const sans = [...m[1].matchAll(/['"]([\w-]+)['"]/g)].map((q) => q[1])
    const { page, fermer } = await ouvrir('/controle/station', base())
    try {
      for (const cle of sans) {
        const siens = AGENTS.filter((a) => a.salle === cle)
        await page.goto(`${srv.base}/controle/station?salle=${cle}`, { waitUntil: 'domcontentloaded' })
        await pret(page, `[data-salle-agents="${cle}"]`)
        const r = await page.evaluate((c) => [...document.querySelectorAll(`[data-salle-agents="${c}"] button`)].filter((b) => !b.hasAttribute('data-fermer')).map((b) => b.textContent.trim()), cle)
        if (!(await page.$(`[data-salle-agents="${cle}"]`))) faute('SA-2', `?salle=${cle} n'ouvre pas [data-salle-agents="${cle}"]`)
        for (const a of siens) if (!r.some((t) => t.includes(a.libelle))) faute('SA-2', `?salle=${cle} : pas de bouton pour ${a.libelle}`)
        if (siens.length) {
          await page.click(`[data-salle-agents="${cle}"] button:has-text("${siens[0].libelle}")`).catch(() => {})
          await pret(page, `[data-fiche-agent="${siens[0].nom}"]`)
          if (!(await page.$(`[data-fiche-agent="${siens[0].nom}"]`))) faute('SA-2', `?salle=${cle} : l'appui sur ${siens[0].libelle} n'ouvre pas sa fiche`)
        } else {
          const t = (await texte(page, `[data-salle-agents="${cle}"]`) ?? '').replace(/[’]/g, '\'')
          if (!t.includes('Aucun agent dans cette salle pour l\'instant.')) faute('SA-2', `?salle=${cle} : « Aucun agent dans cette salle pour l'instant. » absent`)
        }
      }
      for (const cle of CLES_SALLE.filter((c) => !sans.includes(c))) {
        await page.goto(`${srv.base}/controle/station?salle=${cle}`, { waitUntil: 'domcontentloaded' })
        await pret(page, PAN(cle))
        const o = await page.evaluate(([c]) => { const e = document.querySelector(`[data-salle-panneau="${c}"]`); return { panneau: !!e, role: e?.getAttribute('role') ?? null, repli: !!document.querySelector(`[data-salle-agents="${c}"]`) } }, [cle])
        if (!o.panneau) faute('SA-2', `?salle=${cle} n'ouvre pas ${PAN(cle)}`)
        else if (o.role !== 'dialog') faute('SA-2', `${PAN(cle)} : role « ${o.role} », dialog attendu`)
        if (o.repli) faute('SA-2', `?salle=${cle} : la liste de repli [data-salle-agents] s'affiche à côté du panneau`)
      }
    } finally { await fermer() }
    DETAILS['SA-2'] = `?salle=recettes → [data-salle-panneau="recettes"] (dialog), « Fermer » et Échap retirent ?salle= ; ?agent=chef → sa fiche ; salles sans panneau (${sans.length ? sans.join(', ') : 'aucune : SALLES_SANS_PANNEAU est vide'}) → liste d'agents ; les ${CLES_SALLE.length - sans.length} autres salles → leur panneau en dialog, jamais la liste de repli ; un bouton de la liste des salles ouvre le panneau`
  })
  // Le rythme (SA-10) : horloge de la page avancée par le juge.
  scenario(['SA-10'], 'rythme', async () => {
    const avancer = async (page, ms, pas = 2000) => { for (let t = 0; t < ms; t += pas) { await page.clock.runFor(Math.min(pas, ms - t)); await attendre(30) } }
    const { page, s, fermer } = await ouvrir('/controle/station?salle=recettes', base(), { horloge: Date.now() })
    await page.clock.runFor(300); await pret(page, PAN('recettes'))
    const lectures = () => s.journal.filter((a) => a.cle.startsWith('salle:') || a.cle.startsWith('agent:')).length
    const n0 = s.journal.filter((a) => a.cle === 'salle:recettes').length
    await avancer(page, 60_000)
    const n1 = s.journal.filter((a) => a.cle === 'salle:recettes').length - n0
    if (n0 < 1) faute('SA-10', 'le panneau ouvert ne lit pas sa vue à l’ouverture')
    if (n1 > 3) faute('SA-10', `panneau ouvert : ${n1} lectures de vue=salle en 60 s, 3 au plus`)
    // Borne basse (contre-vérification) : un panneau qui lit à l'ouverture puis plus jamais, en affichant « auto 30 s », est figé.
    if (n1 < 1) faute('SA-10', `panneau ouvert : aucune relecture de vue=salle en 60 s d’horloge (cadence de 30 s) — un panneau figé`)
    await page.keyboard.press('Escape'); await page.clock.runFor(200); await attendre(200)
    const f0 = lectures()
    await avancer(page, 60_000)
    if (lectures() > f0) faute('SA-10', `panneau fermé : ${lectures() - f0} lecture(s) vue=salle ou vue=agent en 60 s`)
    // La fiche d'agent : lue à l'ouverture, relue au moins une fois et au plus trois en 60 s d'horloge, plus rien fermée.
    await page.click('[data-zone="equipage"] [data-agent="chef"]').catch((e) => faute('SA-10', `carte du Chef introuvable dans l’équipage (${court(e.message, 50)})`))
    await page.clock.runFor(300); await pret(page, '[data-fiche-agent="chef"]')
    const nChef = () => s.journal.filter((a) => a.cle === 'agent:chef').length
    const a0 = nChef()
    await avancer(page, 60_000)
    const a1 = nChef() - a0
    if (a0 < 1) faute('SA-10', 'la fiche du Chef ne lit pas vue=agent à l’ouverture')
    if (a1 < 1) faute('SA-10', 'fiche du Chef ouverte : aucune relecture de vue=agent en 60 s d’horloge — une fiche figée')
    if (a1 > 3) faute('SA-10', `fiche du Chef ouverte : ${a1} lectures de vue=agent en 60 s, 3 au plus`)
    await page.keyboard.press('Escape'); await page.clock.runFor(200); await attendre(200)
    const g0 = lectures()
    await avancer(page, 30_000)
    if (lectures() > g0) faute('SA-10', `fiche fermée : ${lectures() - g0} lecture(s) vue=salle ou vue=agent en 30 s`)
    await page.click('[data-liste-salles] [data-salle="recettes"]').catch(() => {})
    await page.clock.runFor(300); await attendre(300)
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
    const c0 = s.journal.length
    await avancer(page, 60_000, 5000)
    const pendant = s.journal.slice(c0).filter((a) => a.methode === 'GET')
    if (pendant.length) faute('SA-10', `page cachée : ${pendant.length} requête(s) en 60 s (${pendant[0].chemin})`)
    DETAILS['SA-10'] = `horloge de la page avancée : panneau Recettes ouvert, lu à l’ouverture puis ${n1} fois en 60 s (1 à 3 : ni figé, ni trop souvent) ; fermé : aucune lecture ; fiche du Chef lue à l’ouverture puis ${a1} fois en 60 s (1 à 3), plus rien fermée ; page cachée : aucune`
    await fermer()
  })

  const LONGS = ['trésorerie', 'recettes', 'fiches', 'machines', 'rythme', 'envois', 'usine']
  file.sort((a, b) => (LONGS.includes(b.nom) ? 1 : 0) - (LONGS.includes(a.nom) ? 1 : 0))
  await x.enParallele(file)
  // La bordure prend la couleur de SA salle : Trésorerie (argent) et Usine (travail) diffèrent.
  if (bordures.tresorerie && bordures.usine && bordures.tresorerie.couleur === bordures.usine.couleur) faute('SA-19', `Trésorerie et Usine ont la même bordure (${bordures.tresorerie.couleur}) : la couleur de la salle n'est pas posée`)
  {
    const r = x.jugerCaptures(captures)
    for (const m of r.echecs) faute('SA-13', m)
    vu('SA-13')
    DETAILS['SA-13'] = `${r.detail} ; bureau : la Trésorerie ouverte ; téléphone : la Salle des envois`
  }
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('SA-14', t.detail); else DETAILS['SA-14'] = `salles.css sans hexadécimal, gardes prefers-reduced-motion ; ${t.detail}` }
  else DETAILS['SA-14'] = 'salles.css sans hexadécimal, gardes prefers-reduced-motion (le typecheck se juge sur la racine réelle)'
  DETAILS['SA-12'] = 'aucun champ _piege dans la Trésorerie, la Salle des envois, le Standard ni les fiches (hors Répondeur, servi sans piège) ; « <img src=x onerror=alert(1)> » du Standard affiché tel quel, aucune image ni boîte'
  void CLES_SALLES; void heureParis; void lignesAjoutees; void srv
}
