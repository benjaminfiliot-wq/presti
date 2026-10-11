// scripts/fixtures/026-pilotage/e/juge-calque.mjs — la partie `calque` du juge d'écran (lot e, fiche 026-172, écrit par Claude Code).
//   CE-14  plaques, noms, bulles, « Zz » et « +1 » : du texte HTML dans la police pixel OFL (`--mc-police-pixel`, posée par next/font sur le layout de la station),
//          12 px au moins ; les accents (« Salle de réunion », « Trésorerie ») et « 0 € » s'affichent ; plus aucune police 3 × 5
//   CE-15  le miroir `ul[data-miroir]` complet (data-salle, data-motif, data-etat, data-x, data-y, un texte) ; `[data-liste-salles]` sous la carte ; le clavier :
//          Tab parcourt les salles, + et − zooment, ⊞ revient à l'ensemble, les flèches déplacent la vue, I replie le résumé de salle, Échap ferme
//   CE-16  `<img src=x onerror=alert(1)>` servi dans un nom d'agent réglé, une plaque réglée et une bulle du fil, et par eux dans le miroir et l'info-bulle : affiché
//          tel quel, aucun élément img créé dans la station, aucune boîte de dialogue
//   CE-28  l'info-bulle d'un personnage (survol, puis focus du clavier) : son nom, son rôle et EXACTEMENT le `modele.texte` servi (« sans IA » sans modèle), en texte
// Sélecteurs (CONTRAT.md) : `[data-plaque="<clé>"]`, `[data-nom="<agent>"]`, `[data-bulle]`, `[data-zz]`, `[data-plus-un]`, `[data-infobulle]`, et pour le clavier un
// élément focusable par personnage : `[data-perso="<agent>"]` ou `li[data-personnage="<agent>"][tabindex]`.
import fs from 'node:fs'
import path from 'node:path'
import { nouvellePage, attendrePrete, attendreCalme, attendre, jusqua, pool, jeuE, premiereLigne, sansEspaces, sansCommentaires, listerFichiers, R } from './commun.mjs'
import { base, agents, agentDe, bulle, tapisPlusUn, modeles, PIEGE_HTML } from './jeux.mjs'

async function ouvrir(ctx, o = {}) {
  const P = await nouvellePage(ctx, { reponses: o.reponses ?? base(), ...o })
  await P.aller()
  const raison = await attendrePrete(P)
  if (raison) { await P.fermer(); throw new Error(raison) }
  return P
}
const salleUrl = (page) => new URL(page.url()).searchParams.get('salle')
const zoom = (page) => page.evaluate(() => document.querySelector('[data-station-carte]')?.dataset.zoom ?? null)
const vueX = (page) => page.evaluate(() => document.querySelector('[data-station-carte]')?.dataset.vueX ?? null)
/** La position d'un personnage sur la page (px), d'après le miroir et la grille, en vue d'ensemble. */
async function surPage(P, theme, nom) {
  return P.page.evaluate(([n, gw, gh]) => {
    const li = document.querySelector(`li[data-personnage="${n}"]`), c = document.querySelector('[data-station-carte] canvas')?.getBoundingClientRect()
    if (!li || !c) return null
    return { x: c.left + (Number(li.dataset.x) * c.width) / gw, y: c.top + (Number(li.dataset.y) * c.height) / gh }
  }, [nom, theme.grille.largeur, theme.grille.hauteur])
}
const infobulle = (page) => page.evaluate(() => { const e = document.querySelector('[data-infobulle]'); if (!e) return null; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { visible: !e.hidden && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0, texte: (e.textContent ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), balises: [...e.querySelectorAll('*')].map((x) => x.tagName.toLowerCase()) } })
async function survol(P, theme, nom) {
  const p = await surPage(P, theme, nom)
  if (!p) return null
  await P.page.mouse.move(p.x + 30, p.y + 30); await P.page.mouse.move(p.x, p.y, { steps: 4 })
  const ok = await jusqua(async () => (await infobulle(P.page))?.visible, { delai: 3000, pas: 100 })
  return ok ? infobulle(P.page) : await infobulle(P.page)
}
async function focusClavier(P, nom) {
  const sel = `[data-perso="${nom}"], li[data-personnage="${nom}"][tabindex]`
  if (!(await P.page.locator(sel).count())) return { absent: true }
  await P.page.mouse.move(2, 2)
  await P.page.locator(sel).first().focus()
  await jusqua(async () => (await infobulle(P.page))?.visible, { delai: 2500, pas: 100 })
  return infobulle(P.page)
}

// ── Les scénarios ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function scPolice(ctx) {
  const P = await ouvrir(ctx, { reponses: ((r) => r)(base()) })
  try {
    await attendreCalme(P, { ms: 800 })
    tapisPlusUn(P.reponses); bulle(P.reponses, { agent: 'recenseur', texte: 'Contact envoyé (essai)', pastille: 'RECENSEUR', type: 'radar' })
    // La mesure se fait dans l'appel même qui voit le « +1 » : il ne flotte que 1,5 s, et une capture lente le ferait disparaître entre le constat et la mesure.
    const mesurer = (exiger) => P.page.evaluate(([exiger, grilleLargeur]) => {
      if (exiger && !document.querySelector('[data-plus-un]')) return null
      const mc = document.querySelector('.mc'), variable = mc ? getComputedStyle(mc).getPropertyValue('--mc-police-pixel').trim() : ''
      const famille = (variable.split(',')[0] || '').replace(/['"]/g, '').trim().toLowerCase()
      const mesure = (sel) => { const es = [...document.querySelectorAll(sel)]; const e = es[0]; if (!e) return { n: 0 }; const s = getComputedStyle(e); return { n: es.length, famille: s.fontFamily.toLowerCase(), taille: parseFloat(s.fontSize), texte: (e.textContent ?? '').trim(), toutes: es.map((x) => parseFloat(getComputedStyle(x).fontSize)).filter((v) => v < 12).length } }
      const plaques = Object.fromEntries([...document.querySelectorAll('[data-plaque]')].map((p) => [p.dataset.plaque, (p.textContent ?? '').trim()]))
      // 026-193 (lot « carte lisible », D-0510-14) : la carte est GRANDE (canevas = le plus grand entier de la grille que le cadre permet) et AUCUN texte VISIBLE n'en recouvre un
      // autre (un texte masqué : visibility, data-masquee, boîte vide, ne compte pas : il n'est pas à l'écran).
      const cv = document.querySelector('[data-station-carte] canvas'), rc = cv ? cv.getBoundingClientRect() : null
      const visible = (x) => { const st = getComputedStyle(x), b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !x.hasAttribute('data-masquee') }
      const vus = [...document.querySelectorAll('[data-station-carte] :is([data-plaque], [data-nom], [data-bulle], [data-tapis-etape], [data-tapis-rejet], [data-ecran="experience"], [data-ligne], [data-badge-lv], [data-zz])')].filter((x) => (x.textContent ?? '').trim() && visible(x))
      const libelle = (x) => `${[...x.attributes].find((a) => a.name.startsWith('data-'))?.name ?? x.tagName} « ${(x.textContent ?? '').trim().slice(0, 24)} »`
      const gene = []
      for (let i = 0; i < vus.length; i++) for (let j = i + 1; j < vus.length; j++) {
        const a = vus[i].getBoundingClientRect(), b = vus[j].getBoundingClientRect()
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) gene.push(`${libelle(vus[i])} sur ${libelle(vus[j])}`)
      }
      // Le plus grand entier k que le cadre permet (8 % de débord admis, densité 1 du juge) : la carte ne peut pas être plus petite que ×k.
      const cadre = cv?.parentElement?.clientWidth ?? 0, kMax = Math.max(1, Math.floor((cadre * 1.08) / grilleLargeur))
      const carte = { largeur: rc ? Math.round(rc.width) : 0, attendue: kMax * grilleLargeur, vus: vus.length, gene }
      return { carte, variable, famille, mesures: { plaque: mesure('[data-plaque]'), nom: mesure('[data-nom]'), bulle: mesure('[data-bulle]'), zz: mesure('[data-zz]'), plusUn: mesure('[data-plus-un]') }, plaques, experience: (document.querySelector('[data-ecran="experience"]')?.textContent ?? '').replace(/[  ]/g, ' ') }
    }, [exiger, ctx.theme.grille.largeur])
    return (await jusqua(() => mesurer(true), { delai: 15_000, pas: 60 })) ?? mesurer(false)
  } finally { await P.fermer() }
}
async function scMiroir(ctx) {
  const P = await ouvrir(ctx), { page } = P, r = {}
  try {
    await attendreCalme(P, { ms: 800 })
    r.miroir = await page.evaluate(() => [...document.querySelectorAll('ul[data-miroir] > li[data-personnage]')].map((li) => ({ nom: li.dataset.personnage, d: ['salle', 'motif', 'etat', 'x', 'y'].map((k) => li.dataset[k] ?? null), texte: (li.textContent ?? '').trim() })))
    r.liste = await page.evaluate(() => { const l = document.querySelector('[data-liste-salles]'), c = document.querySelector('[data-station-carte] canvas'); if (!l || !c) return null; return { haut: l.getBoundingClientRect().top, bas: c.getBoundingClientRect().bottom, boutons: l.querySelectorAll('[data-salle]').length } })
    // le clavier
    await page.evaluate(() => document.activeElement?.blur?.())
    const vus = new Set()
    for (let i = 0; i < 110 && vus.size < 4; i++) { await page.keyboard.press('Tab'); const s = await page.evaluate(() => document.activeElement?.dataset?.salle ?? null); if (s) vus.add(s) }
    r.tab = [...vus]
    // un clic sur le vide donne le focus au cadre, puis + − ⊞ et les flèches
    const vide = await page.evaluate(() => { const c = document.querySelector('[data-station-carte] canvas').getBoundingClientRect(), zs = [...document.querySelectorAll('[data-station-carte] [data-zone-salle],[data-camera]')].map((z) => z.getBoundingClientRect()); for (let y = c.top + 3; y < c.bottom - 3; y += 6) for (let x = c.left + 3; x < c.right - 3; x += 6) if (!zs.some((b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)) return { x, y }; return null })
    if (vide) { await page.mouse.click(vide.x, vide.y); await attendre(200) }
    r.zoom0 = await zoom(page)
    await page.keyboard.press('+'); await attendre(300); r.zoomPlus = await zoom(page)
    const x0 = await vueX(page)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
    await attendre(300); const x1 = await vueX(page)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft')
    await attendre(300); r.fleches = { x0, x1, x2: await vueX(page) }
    await page.keyboard.press('-'); await attendre(300); r.zoomMoins = await zoom(page)
    await page.keyboard.press('+'); await attendre(300)
    await page.locator('[data-action="vue-ensemble"]').focus(); await page.keyboard.press('Enter'); await attendre(300); r.ensemble = await zoom(page)
    // Échap ferme ; I replie le résumé de salle (quand le panneau en porte un)
    await page.goto(`${ctx.base}/controle/station?salle=recettes`, { waitUntil: 'domcontentloaded' })
    await attendrePrete(P, { delai: 30_000 })
    r.resume = await jusqua(async () => (await page.locator('[data-resume-salle]').count()) > 0, { delai: 6000, pas: 150 })
    if (r.resume) {
      const long = () => page.evaluate(() => (document.querySelector('[data-resume-salle]')?.innerText ?? '').length)
      r.resumeAvant = await long(); await page.keyboard.press('i'); await attendre(400); r.resumeReplie = await long(); await page.keyboard.press('i'); await attendre(300)
    }
    await page.keyboard.press('Escape')
    r.fermee = await jusqua(async () => !salleUrl(page), { delai: 3000, pas: 100 })
    r.erreurs = P.erreurs
    return r
  } finally { await P.fermer() }
}
async function scPieges(ctx) {
  const pg = jeuE('reglages-pieges.json'), r = base()
  r.reglages.reglages.equipage = pg.equipage; r.reglages.reglages.salles = pg.salles
  bulle(r, pg.bulle)
  const P = await ouvrir(ctx, { reponses: r })
  try {
    await attendreCalme(P, { ms: 800 }); await attendre(600)
    const res = await P.page.evaluate((piege) => ({
      imgs: document.querySelectorAll('[data-station] img').length, imgPiege: [...document.querySelectorAll('img')].filter((i) => i.getAttribute('src') === 'x').length,
      nom: document.querySelector('[data-nom="facteur"]')?.textContent ?? null, plaque: document.querySelector('[data-plaque="radar"]')?.textContent ?? null, bulle: document.querySelector('[data-bulle="facteur"]')?.textContent ?? null,
      miroir: document.querySelector('li[data-personnage="facteur"]')?.textContent ?? null, piege,
    }), PIEGE_HTML)
    const ib = await survol(P, ctx.theme, 'facteur')
    res.infobulle = ib
    res.dialogues = P.dialogues.slice()
    await attendre(1200)
    res.dialoguesFin = P.dialogues.slice(); res.imgsFin = await P.page.evaluate(() => document.querySelectorAll('[data-station] img, img[src="x"]').length)
    return res
  } finally { await P.fermer() }
}
async function scInfobulle(ctx) {
  const tbl = jeuE('equipage-modeles.json').modeles, r = modeles(base(), tbl)
  const P = await ouvrir(ctx, { reponses: r })
  const out = { survol: [], focus: [] }
  try {
    await attendreCalme(P, { ms: 800 }); await attendre(400)
    for (const nom of ['chef', 'garde', 'facteur']) {
      const a = agentDe(r, nom), nomRegle = r.reglages.reglages.equipage?.[nom]?.nom
      out.survol.push({ nom, a: { libelle: a.libelle, role: a.role, modele: a.modele.texte, regle: nomRegle }, ib: await survol(P, ctx.theme, nom) })
    }
    await P.page.mouse.move(2, 2); await attendre(300)
    for (const nom of ['standardiste', 'chef']) { const a = agentDe(r, nom); out.focus.push({ nom, a: { libelle: a.libelle, role: a.role, modele: a.modele.texte }, ib: await focusClavier(P, nom) }) }
    return out
  } finally { await P.fermer() }
}

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les sources du moteur sans leurs commentaires : plus aucune police 3 × 5. */
export function police35(racine) {
  const d = path.join(racine, 'app', 'controle', 'station', 'moteur'), trouves = []
  if (!fs.existsSync(d)) return trouves
  for (const f of listerFichiers(d)) {
    if (!/\.(?:tsx?|jsx?|mjs|css)$/.test(f)) continue
    const code = sansCommentaires(fs.readFileSync(path.join(d, f), 'utf8'))
    if (/\b3\s*[x×X]\s*5\b|font_?3x5|bitmap_?font_?3|police_?3x5/i.test(code)) trouves.push(f)
  }
  return trouves
}
function ce14(p, racine) {
  const e = []
  if (!p.variable) e.push('--mc-police-pixel est vide sur .mc : la police pixel OFL n\'est pas chargée (next/font, layout de la station)')
  for (const [nom, m] of Object.entries(p.mesures)) {
    if (!m.n) { e.push(`aucun élément ${{ plaque: '[data-plaque]', nom: '[data-nom]', bulle: '[data-bulle]', zz: '[data-zz]', plusUn: '[data-plus-un]' }[nom]} (CONTRAT.md)`); continue }
    if (p.famille && !m.famille.includes(p.famille)) e.push(`${nom} : police « ${m.famille.slice(0, 50)} », ${p.famille} (--mc-police-pixel) attendue`)
    if (!(m.taille >= 12) || m.toutes) e.push(`${nom} : ${m.toutes ? `${m.toutes} élément(s)` : 'corps'} sous 12 px (${m.taille} px)`)
  }
  const reunion = p.plaques.reunion ?? '', tres = p.plaques.tresorerie ?? ''
  if (!/réunion/.test(reunion)) e.push(`la plaque de la salle de réunion dit « ${reunion} », « Salle de réunion » attendu (accents)`)
  if (!/Trésorerie/.test(tres)) e.push(`la plaque de la trésorerie dit « ${tres} », « Trésorerie » attendu (accents)`)
  if (!sansEspaces(p.experience).includes('0 €')) e.push(`l'écran de l'Expérience dit « ${sansEspaces(p.experience)} », « 0 € » attendu`)
  const f35 = police35(racine)
  if (f35.length) e.push(`une police 3 × 5 reste sous moteur/ : ${f35.slice(0, 3).join(', ')}`)
  // 026-193 : la carte est grande et lisible (ajout : rien n'est retiré ni assoupli ci-dessus).
  if (p.carte) {
    if (p.carte.largeur < p.carte.attendue) e.push(`la carte ne fait que ${p.carte.largeur} px de large, ${p.carte.attendue} attendus (le plus grand entier de la grille que le cadre permet : elle doit occuper la zone du centre)`)
    if (p.carte.gene.length) e.push(`${p.carte.gene.length} recouvrement(s) de texte visible à l'écran : ${p.carte.gene.slice(0, 4).join(' ; ')}`)
  }
  return { echecs: e, detail: `plaques, noms, bulles, Zz et +1 en texte HTML dans ${p.famille || '—'} (--mc-police-pixel), 12 px au moins ; « Salle de réunion », « Trésorerie » et « 0 € » lisibles ; aucune police 3 × 5 ; carte de ${p.carte?.largeur ?? '—'} px (le plus grand entier de la grille que le cadre permet) et ${p.carte?.vus ?? '—'} texte(s) visible(s) sans recouvrement` }
}
function ce15(m) {
  const e = []
  if (!m.miroir.length) e.push('le miroir ul[data-miroir] est vide')
  for (const l of m.miroir) {
    const [salle, motif, etat, x, y] = l.d
    if (!salle || !motif || !etat) e.push(`${l.nom} : data-salle/data-motif/data-etat incomplets (${l.d.slice(0, 3).join(', ')})`)
    if (!/^-?\d+$/.test(x ?? '') || !/^-?\d+$/.test(y ?? '')) e.push(`${l.nom} : data-x/data-y non entiers (${x}, ${y})`)
    if (!l.texte) e.push(`${l.nom} : aucun texte accessible dans le miroir`)
  }
  if (!m.liste) e.push('aucune liste [data-liste-salles] sous la carte')
  else { if (m.liste.haut < m.liste.bas - 2) e.push(`la liste des salles (haut ${Math.round(m.liste.haut)}) n'est pas sous la carte (bas ${Math.round(m.liste.bas)})`); if (m.liste.boutons < 21) e.push(`${m.liste.boutons} bouton(s) [data-salle], 21 attendus`) }
  if (m.tab.length < 3) e.push(`Tab parcourt ${m.tab.length} salle(s) de la liste (${m.tab.join(', ')}), 3 au moins`)
  if (m.zoomPlus !== '2') e.push(`la touche + : zoom ${m.zoom0} → ${m.zoomPlus}, 2 attendu`)
  if (m.zoomMoins !== '1') e.push(`la touche − : zoom ${m.zoomMoins}, 1 attendu`)
  if (m.ensemble !== '1') e.push(`⊞ (focus puis Entrée) : zoom ${m.ensemble}, 1 attendu`)
  if (!(Number(m.fleches.x1) > Number(m.fleches.x0)) || m.fleches.x2 !== m.fleches.x0) e.push(`les flèches ne déplacent pas la vue (${m.fleches.x0} → ${m.fleches.x1} → ${m.fleches.x2})`)
  if (m.resume && !(m.resumeReplie < m.resumeAvant)) e.push(`la touche I ne replie pas le résumé de salle (${m.resumeAvant} → ${m.resumeReplie} caractères)`)
  if (!m.fermee) e.push('Échap ne ferme pas le panneau de salle (?salle= reste dans l\'adresse)')
  return { echecs: e, detail: `miroir complet (${m.miroir.length} personnages : data-salle, -motif, -etat, -x, -y et un texte), liste des salles sous la carte, Tab (${m.tab.slice(0, 3).join(', ')}…), + et −, ⊞, flèches, ${m.resume ? 'I replie le résumé, ' : '(aucun résumé de salle sur ce panneau : I non jugé), '}Échap ferme` }
}
function ce16(r) {
  const e = []
  const tel = (nom, v) => { if (v !== PIEGE_HTML) e.push(`${nom} dit « ${String(v).slice(0, 60)} », ${PIEGE_HTML} tel quel attendu`) }
  tel('le nom réglé de facteur ([data-nom])', r.nom); tel('la plaque réglée du radar ([data-plaque])', r.plaque); tel('la bulle du fil de facteur ([data-bulle])', r.bulle)
  if (!(r.miroir ?? '').includes(PIEGE_HTML)) e.push(`le miroir de facteur dit « ${String(r.miroir).slice(0, 60)} », le nom réglé tel quel attendu`)
  if (!r.infobulle?.visible) e.push('l\'info-bulle de facteur n\'apparaît pas au survol')
  else { if (!r.infobulle.texte.includes(PIEGE_HTML)) e.push(`l'info-bulle dit « ${r.infobulle.texte.slice(0, 60)} », le nom réglé tel quel attendu`); if (r.infobulle.balises.includes('img')) e.push('l\'info-bulle contient un élément img') }
  if (r.imgs || r.imgsFin || r.imgPiege) e.push(`${Math.max(r.imgs, r.imgsFin, r.imgPiege)} élément(s) img créé(s) dans la station : le texte venu d'un agent ou d'un réglage n'est jamais du HTML`)
  if (r.dialoguesFin.length) e.push(`une boîte de dialogue s'est ouverte (${r.dialoguesFin[0]}) : alert(1) a été exécuté`)
  return { echecs: e, detail: `${PIEGE_HTML} servi dans un nom réglé, une plaque réglée et une bulle du fil : affiché tel quel (calque, miroir, info-bulle), aucun img créé, aucune boîte de dialogue` }
}
function ce28(o) {
  const e = []
  const dit = (ib, a, qui) => {
    if (!ib || ib.absent) { e.push(`${qui} : ${ib?.absent ? 'aucun élément focusable pour ce personnage ([data-perso] ou li[tabindex])' : 'aucune info-bulle'}`); return }
    if (!ib.visible) { e.push(`${qui} : l'info-bulle n'apparaît pas`); return }
    if (!ib.texte.includes(a.modele)) e.push(`${qui} : l'info-bulle dit « ${ib.texte.slice(0, 80)} », le modèle « ${a.modele} » servi exactement attendu`)
    if (!(ib.texte.includes(a.libelle) || (a.regle && ib.texte.includes(a.regle)))) e.push(`${qui} : l'info-bulle ne porte pas le nom (${a.libelle})`)
    if (a.role && !ib.texte.includes(a.role)) e.push(`${qui} : l'info-bulle ne porte pas le rôle « ${a.role} »`)
  }
  for (const s of o.survol) dit(s.ib, s.a, `survol de ${s.nom}`)
  for (const s of o.focus) dit(s.ib, s.a, `focus de ${s.nom}`)
  if (!o.survol.some((s) => s.a.modele === 'sans IA' && s.ib?.texte?.includes('sans IA'))) e.push('« sans IA » n\'est montré pour aucun agent sans modèle')
  return { echecs: e, detail: 'au survol puis au focus du clavier, l\'info-bulle d\'un personnage montre son nom, son rôle et exactement le modele.texte servi (« sans IA » sans modèle), en texte' }
}

export async function critereCalque(ctx, demandes) {
  const veut = (id) => demandes.includes(id), sorties = {}, taches = [], sortie = {}
  const lot = (cle, f) => taches.push(async () => { try { sorties[cle] = await f() } catch (err) { sorties[cle] = { interrompu: premiereLigne(err) } } })
  if (veut('CE-14')) lot('police', () => scPolice(ctx))
  if (veut('CE-15')) lot('miroir', () => scMiroir(ctx))
  if (veut('CE-16')) lot('pieges', () => scPieges(ctx))
  if (veut('CE-28')) lot('infobulle', () => scInfobulle(ctx))
  await pool(taches)
  const brut = (cle, f) => { const s = sorties[cle]; return !s || s.interrompu ? { echecs: [`scénario ${cle} interrompu : ${s?.interrompu ?? 'non joué'}`], detail: '' } : f(s) }
  if (veut('CE-14')) sortie['CE-14'] = brut('police', (s) => ce14(s, ctx.racine))
  if (veut('CE-15')) sortie['CE-15'] = brut('miroir', ce15)
  if (veut('CE-16')) sortie['CE-16'] = brut('pieges', ce16)
  if (veut('CE-28')) sortie['CE-28'] = brut('infobulle', ce28)
  void R; void agents
  return sortie
}
