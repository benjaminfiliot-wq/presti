// scripts/fixtures/026-pilotage/e/juge-reglages.mjs — la partie `reglages` du juge d'écran (lot e, fiche 026-172, écrit par Claude Code), pour 026-187.
//   CE-18  `?vue=reglages` ouvre un panneau de 480 px au bureau, une feuille au téléphone ; absent pour le rôle lecture
//   CE-19  aperçu en direct SANS écriture ; « Enregistrer » envoie UN PUT avec la version lue ; « Annuler » revient à la version enregistrée ; « Revenir au thème par défaut » ;
//          « Historique » montre 10 versions et « Rétablir » en fait une nouvelle ; un 409 servi affiche « modifié ailleurs : recharge »
//   CE-20  échanger deux salles ou en placer une : la réservée déplacée, deux salles dans un emplacement ou un graphe coupé sont refusés et l'écran dit pourquoi ;
//          une couleur #RRGGBB s'applique sur .mc seulement
//   CE-29  pour chaque thème livré, choisi dans les réglages : sa mise en page sur `data-mise-en-page` de .mc, sa palette (theme.json) sur .mc SEULEMENT
// Sélecteurs (CONTRAT.md) : `[data-vue="reglages"]` ; `select[data-theme-choix]` ; `input[data-couleur="--mc-accent"]` ; `select[data-salle-emplacement="<salle>"]` ; les boutons se trouvent à
// leur nom (« Enregistrer », « Annuler », « Revenir au thème par défaut », « Historique », « Rétablir ») ; `[data-version]` par version de l'historique ; `[data-message]` ou le texte du panneau.
import { nouvellePage, attendrePrete, attendre, jusqua, pool, jeuE, premiereLigne, copie } from './commun.mjs'
import { base, themeHublot } from './jeux.mjs'

const PANNEAU = '[data-vue="reglages"]'
async function ouvrirPanneau(ctx, o = {}) {
  const P = await nouvellePage(ctx, { chemin: '/controle/station?vue=reglages', ...o })
  await P.aller()
  // Au téléphone la carte (et le moteur) ne monte que dans l'onglet « station » : on attend la barre d'onglets, puis on l'ouvre.
  if (o.telephone) await P.page.locator('[data-onglet-tel="station"]').click({ timeout: 15_000 }).catch(() => {})
  P.panneau = await jusqua(async () => ((await P.page.locator(PANNEAU).count()) > 0 ? true : null), { delai: o.delai ?? 40_000, pas: 200 })
  return P
}
const bouton = (P, nom) => P.page.locator(PANNEAU).getByRole('button', { name: nom })
const texte = (P) => P.page.locator(PANNEAU).first().innerText().then((t) => t.replace(/\s+/g, ' '))
const mc = (page, jeton) => page.evaluate((j) => ({ mc: getComputedStyle(document.querySelector('.mc')).getPropertyValue(j).trim().toLowerCase(), html: getComputedStyle(document.documentElement).getPropertyValue(j).trim(), body: getComputedStyle(document.body).getPropertyValue(j).trim() }), jeton)
const reglee = (r, theme) => { r.themes = { essai: theme }; r.reglages.reglages.theme = 'essai'; return r }

async function scAffichage(ctx) {
  const out = {}
  const P = await ouvrirPanneau(ctx, { reponses: base() })
  try {
    out.bureau = P.panneau ? await P.page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { largeur: r.width, haut: r.top, bas: r.bottom, vh: innerHeight } }, PANNEAU) : null
  } finally { await P.fermer() }
  const T = await ouvrirPanneau(ctx, { reponses: base(), viewport: { width: 390, height: 844 }, telephone: true })
  try {
    out.telephone = T.panneau ? await T.page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { largeur: r.width, haut: r.top, bas: r.bottom, vw: innerWidth, vh: innerHeight, sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) } }, PANNEAU) : null
  } finally { await T.fermer() }
  const L = await ouvrirPanneau(ctx, { reponses: base(), role: 'lecture', delai: 14_000 })
  try { await attendre(1500); out.lecture = { present: (await L.page.locator(PANNEAU).count()) > 0 } } finally { await L.fermer() }
  return out
}
async function scGestes(ctx) {
  const out = { couleurs: [], puts: [] }
  const r = base(), P = await ouvrirPanneau(ctx, { reponses: r })
  try {
    if (!P.panneau) return { absent: true }
    out.versionLue = r.reglages.version
    const couleur = P.page.locator(`${PANNEAU} input[data-couleur="--mc-accent"]`)
    out.champCouleur = await couleur.count()
    if (!out.champCouleur) return out
    await couleur.fill('#112233'); await attendre(500)
    out.apercu = await mc(P.page, '--mc-accent'); out.putsApercu = P.puts.length
    await bouton(P, /Enregistrer/).click(); await jusqua(async () => P.puts.length > 0, { delai: 5000, pas: 100 }); await attendre(400)
    out.put = P.puts.map((p) => p.corps)
    await couleur.fill('#445566'); await attendre(400); out.avantAnnuler = (await mc(P.page, '--mc-accent')).mc
    await bouton(P, /Annuler/).click(); await attendre(900)
    out.apresAnnuler = (await mc(P.page, '--mc-accent')).mc; out.putsApresAnnuler = P.puts.length
    await bouton(P, /Revenir au thème par défaut/).click(); await attendre(700)
    out.defaut = (await mc(P.page, '--mc-accent')).mc
    await bouton(P, /Historique/).click()
    await jusqua(async () => (await P.page.locator(`${PANNEAU} [data-version]`).count()) > 0, { delai: 5000, pas: 100 })
    out.versions = await P.page.locator(`${PANNEAU} [data-version]`).count()
    const avant = P.puts.length
    const retablir = P.page.locator(`${PANNEAU} [data-version]`).first().getByRole('button', { name: /Rétablir/ })
    if (await retablir.count()) { await retablir.click(); await jusqua(async () => P.puts.length > avant, { delai: 5000, pas: 100 }) }
    out.putsRetablir = P.puts.length - avant; out.putRetablir = P.puts.at(-1)?.corps ?? null
    return out
  } finally { await P.fermer() }
}
async function sc409(ctx) {
  const P = await ouvrirPanneau(ctx, { reponses: base(), put409: true })
  try {
    if (!P.panneau) return { absent: true }
    const couleur = P.page.locator(`${PANNEAU} input[data-couleur="--mc-accent"]`)
    if (!(await couleur.count())) return { champ: false }
    await couleur.fill('#112233'); await bouton(P, /Enregistrer/).click(); await attendre(900)
    return { texte: await texte(P), puts: P.puts.length }
  } finally { await P.fermer() }
}
async function scDisposition(ctx) {
  const out = {}
  const ouvrir = async (r) => { const P = await ouvrirPanneau(ctx, { reponses: r }); if (!P.panneau) { await P.fermer(); throw new Error('le panneau ne s\'ouvre pas') } return P }
  const choisir = async (P, salle, valeur) => { const s = P.page.locator(`${PANNEAU} select[data-salle-emplacement="${salle}"]`); if (!(await s.count())) return false; await s.selectOption(valeur); await attendre(500); return true }
  let P = await ouvrir(base())
  try {
    out.champ = await choisir(P, 'ecommerce', 'radar'); out.reservee = await texte(P); out.putReservee = await refusEnregistrer(P)
  } finally { await P.fermer() }
  P = await ouvrir(base())
  try { out.champ2 = await choisir(P, 'repos', 'radar'); out.deux = await texte(P); out.putDeux = await refusEnregistrer(P) } finally { await P.fermer() }
  const coupe = themeHublot(); coupe.emplacements.find((e) => e.cle === 'audience').porte = { x: 9000, y: 9000 }
  P = await ouvrir(reglee(base(), coupe))
  try { await attendre(600); const c = P.page.locator(`${PANNEAU} input[data-couleur="--mc-accent"]`); if (await c.count()) await c.fill('#112233'); await attendre(500); out.graphe = await texte(P); out.putGraphe = await refusEnregistrer(P) } finally { await P.fermer() }
  P = await ouvrir(base())
  try {
    const c = P.page.locator(`${PANNEAU} input[data-couleur="--mc-accent"]`)
    if (await c.count()) { await c.fill('#abcdef'); await attendre(500); out.couleur = await mc(P.page, '--mc-accent') } else out.couleur = null
  } finally { await P.fermer() }
  return out
}
async function refusEnregistrer(P) {
  const b = bouton(P, /Enregistrer/), avant = P.puts.length
  if (!(await b.count())) return 'absent'
  const desactive = await b.first().isDisabled().catch(() => false)
  if (!desactive) { await b.first().click({ timeout: 2000 }).catch(() => {}); await attendre(600) }
  return desactive || P.puts.length === avant ? 'refuse' : 'PUT envoyé'
}
async function scThemes(ctx) {
  const lus = ctx.themesLus, cles = Object.keys(lus)
  if (!cles.length) return { aucun: true }
  const r = base(); r.themes = { ...lus }; r.reglages.reglages.theme = cles[0]
  const P = await ouvrirPanneau(ctx, { reponses: r })
  const out = { themes: [] }
  try {
    if (!P.panneau) return { absent: true }
    const choix = P.page.locator(`${PANNEAU} select[data-theme-choix]`)
    if (!(await choix.count())) return { champ: false }
    for (const cle of cles) {
      await choix.selectOption(cle); await attendre(900)
      const th = lus[cle], jetons = {}
      for (const j of Object.keys(th.palette)) jetons[j] = await mc(P.page, j)
      out.themes.push({ cle, miseEnPage: await P.page.evaluate(() => document.querySelector('.mc')?.dataset.miseEnPage ?? null), attendue: th.mise_en_page, palette: th.palette, jetons })
    }
    return out
  } finally { await P.fermer() }
}

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ce18(a) {
  const e = []
  if (!a.bureau) e.push('?vue=reglages n\'ouvre aucun [data-vue="reglages"] au bureau')
  else if (Math.abs(a.bureau.largeur - 480) > 2) e.push(`le panneau fait ${a.bureau.largeur.toFixed(0)} px au bureau, 480 attendus`)
  if (!a.telephone) e.push('?vue=reglages n\'ouvre aucune feuille au téléphone')
  else {
    const t = a.telephone
    if (t.largeur < t.vw - 2) e.push(`la feuille du téléphone fait ${t.largeur.toFixed(0)} px de large, ${t.vw} (plein écran) attendus`)
    if (t.bas < t.vh - 2 || t.haut > 2) e.push(`la feuille ne couvre pas l'écran (de ${Math.round(t.haut)} à ${Math.round(t.bas)} sur ${t.vh})`)
    if (t.sw > t.vw) e.push(`feuille ouverte : scrollWidth ${t.sw} px, ${t.vw} au plus`)
  }
  if (a.lecture.present) e.push('le panneau Réglages est présent pour le rôle lecture')
  return { echecs: e, detail: `?vue=reglages : un panneau de ${a.bureau ? a.bureau.largeur.toFixed(0) : '—'} px au bureau, une feuille de ${a.telephone ? a.telephone.largeur.toFixed(0) : '—'} px au téléphone, absent pour le rôle lecture` }
}
function ce19(g, n) {
  const e = []
  if (g.absent) return { echecs: ['le panneau ne s\'ouvre pas'], detail: '' }
  if (!g.champCouleur) return { echecs: ['aucun champ input[data-couleur="--mc-accent"] dans le panneau (CONTRAT.md)'], detail: '' }
  if (g.apercu?.mc !== '#112233') e.push(`aperçu en direct : --mc-accent vaut « ${g.apercu?.mc} » sur .mc, #112233 attendu`)
  if (g.putsApercu) e.push(`${g.putsApercu} PUT pendant l'aperçu : aucune écriture avant « Enregistrer »`)
  if (g.put.length !== 1) e.push(`« Enregistrer » envoie ${g.put.length} PUT, un seul attendu`)
  else {
    if (g.put[0]?.version !== g.versionLue) e.push(`le PUT porte la version ${g.put[0]?.version}, la version lue (${g.versionLue}) attendue`)
    if (g.put[0]?.reglages?.couleurs?.['--mc-accent'] !== '#112233') e.push('le PUT ne porte pas la couleur posée')
  }
  if (g.avantAnnuler !== '#445566') e.push(`l'aperçu d'une seconde couleur ne s'applique pas (${g.avantAnnuler})`)
  if (g.apresAnnuler !== '#112233') e.push(`« Annuler » ne revient pas à la version enregistrée : --mc-accent vaut ${g.apresAnnuler}, #112233 attendu`)
  if (g.putsApresAnnuler !== 1) e.push(`« Annuler » écrit (${g.putsApresAnnuler} PUT au total, 1 attendu)`)
  if (g.defaut === '#112233' || !g.defaut) e.push(`« Revenir au thème par défaut » ne rend pas la couleur du thème (${g.defaut || 'vide'})`)
  if (g.versions !== 10) e.push(`« Historique » montre ${g.versions} version(s), 10 attendues (douze servies)`)
  if (g.putsRetablir !== 1) e.push(`« Rétablir » envoie ${g.putsRetablir} PUT, un attendu (une version nouvelle)`)
  else if (g.putRetablir?.reglages?.affichage?.titre !== 'Version 12') e.push(`« Rétablir » n'envoie pas les réglages de la version choisie (${JSON.stringify(g.putRetablir?.reglages).slice(0, 60)})`)
  if (n.absent || n.champ === false) e.push('409 : le panneau ne s\'ouvre pas')
  else if (!/modifié ailleurs : recharge/.test(n.texte ?? '')) e.push(`un 409 servi n'affiche pas « modifié ailleurs : recharge » (${(n.texte ?? '').slice(-80)})`)
  return { echecs: e, detail: 'aperçu sans PUT, Enregistrer : un PUT avec la version lue, Annuler revient à la version enregistrée, thème par défaut, Historique de 10 versions, Rétablir en fait une nouvelle, un 409 affiche « modifié ailleurs : recharge »' }
}
function ce20(d) {
  const e = []
  if (!d.champ) e.push('aucun select[data-salle-emplacement="ecommerce"] dans le panneau (CONTRAT.md)')
  else {
    if (!/réservée/i.test(d.reservee ?? '')) e.push(`déplacer la réservée : le panneau ne dit pas pourquoi (« ${(d.reservee ?? '').slice(-90)} », « réservée » attendu)`)
    if (d.putReservee === 'PUT envoyé') e.push('la réservée déplacée peut être enregistrée')
  }
  if (!d.champ2) e.push('aucun select[data-salle-emplacement="repos"] dans le panneau')
  else {
    if (!/deux salles|occupent/i.test(d.deux ?? '')) e.push(`deux salles dans un emplacement : le panneau ne dit pas pourquoi (« ${(d.deux ?? '').slice(-90)} »)`)
    if (d.putDeux === 'PUT envoyé') e.push('deux salles dans le même emplacement peuvent être enregistrées')
  }
  if (!/n'est plus reliée au reste/.test(d.graphe ?? '')) e.push(`un graphe coupé : le panneau ne dit pas « n'est plus reliée au reste » (« ${(d.graphe ?? '').slice(-90)} »)`)
  if (d.putGraphe === 'PUT envoyé') e.push('un graphe coupé peut être enregistré')
  if (d.couleur === null) e.push('aucun champ de couleur à tester')
  else if (d.couleur.mc !== '#abcdef') e.push(`une couleur #RRGGBB ne s'applique pas sur .mc (${d.couleur.mc})`)
  else if (d.couleur.html || d.couleur.body) e.push(`la couleur posée déborde de .mc (html « ${d.couleur.html} », body « ${d.couleur.body} »)`)
  return { echecs: e, detail: 'la réservée déplacée, deux salles dans un emplacement et un graphe coupé sont refusés avec leur raison ; une couleur #RRGGBB se pose sur .mc seulement' }
}
function ce29(t) {
  const e = []
  if (t.aucun) return { echecs: ['aucun thème livré sous public/station/themes/'], detail: '' }
  if (t.absent) return { echecs: ['le panneau Réglages ne s\'ouvre pas'], detail: '' }
  if (t.champ === false) return { echecs: ['aucun select[data-theme-choix] dans le panneau (CONTRAT.md)'], detail: '' }
  for (const th of t.themes) {
    if (th.miseEnPage !== th.attendue) e.push(`thème ${th.cle} : data-mise-en-page « ${th.miseEnPage} » sur .mc, ${th.attendue} attendu`)
    for (const [j, v] of Object.entries(th.palette)) {
      const m = th.jetons[j]
      if (m.mc !== String(v).toLowerCase()) e.push(`thème ${th.cle} : ${j} vaut « ${m.mc} » sur .mc, ${v} attendu`)
      if (m.html || m.body) e.push(`thème ${th.cle} : ${j} posé hors de .mc (html « ${m.html} », body « ${m.body} »)`)
    }
  }
  return { echecs: e, detail: `thèmes ${t.themes.map((x) => `${x.cle} (${x.attendue})`).join(', ')} : leur mise en page sur data-mise-en-page et leur palette sur .mc seulement` }
}

export async function critereReglages(ctx, demandes) {
  const veut = (id) => demandes.includes(id), sorties = {}, taches = [], sortie = {}
  const lot = (cle, f) => taches.push(async () => { try { sorties[cle] = await f() } catch (err) { sorties[cle] = { interrompu: premiereLigne(err) } } })
  if (veut('CE-18')) lot('affichage', () => scAffichage(ctx))
  if (veut('CE-19')) { lot('gestes', () => scGestes(ctx)); lot('p409', () => sc409(ctx)) }
  if (veut('CE-20')) lot('disposition', () => scDisposition(ctx))
  if (veut('CE-29')) lot('themes', () => scThemes(ctx))
  await pool(taches)
  const brut = (cle, f) => { const s = sorties[cle]; return !s || s.interrompu ? { echecs: [`scénario ${cle} interrompu : ${s?.interrompu ?? 'non joué'}`], detail: '' } : f(s) }
  if (veut('CE-18')) sortie['CE-18'] = brut('affichage', ce18)
  if (veut('CE-19')) sortie['CE-19'] = brut('gestes', (g) => brut('p409', (n) => ce19(g, n)))
  if (veut('CE-20')) sortie['CE-20'] = brut('disposition', ce20)
  if (veut('CE-29')) sortie['CE-29'] = brut('themes', ce29)
  void attendrePrete; void jeuE; void copie
  return sortie
}
