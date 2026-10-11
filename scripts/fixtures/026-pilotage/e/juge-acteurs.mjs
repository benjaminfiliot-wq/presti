// scripts/fixtures/026-pilotage/e/juge-acteurs.mjs — la partie `acteurs` du juge d'écran (lot e, fiche 026-172, écrit par Claude Code).
//   CE-12  le tapis : les huit étapes et REJET affichent les compteurs servis ; « +1 » servi en `contacte` → exactement un carré part, puis tout s'arrête ; deux
//          relevés identiques → aucun carré ; « +1 CONTACTÉ » flotte 1,5 s, un par mouvement
//   CE-13  les lignes du Crieur (contenu) et de l'Usine (sites, packs) suivent `lignes` servies ; l'égaliseur du Radar reste figé ; l'écran de l'Expérience dit
//          « FERMÉE · R13 » ; les badges LV seulement là où `paliers` en sert un ; tout est dans les calques, JAMAIS dans le décor (canevas identique entre deux jeux)
// Sélecteurs (CONTRAT.md) : `[data-tapis-etape="<clé>"]`, `[data-tapis-rejet]`, `[data-carre]` (un par carré en mouvement), `[data-plus-un]`, `[data-ligne-etape="<ligne>:<clé>"]`,
// `[data-egaliseur] [data-barre]` (data-valeur), `[data-ecran="experience"]`, `[data-badge-lv="<salle>"]`.
import { nouvellePage, attendrePrete, attendreCalme, immobile, attendre, jusqua, hashToile, jeuE, premiereLigne, sansEspaces, pool, copie } from './commun.mjs'
import { base, tapisPlusUn, bulle, carte, relecture } from './jeux.mjs'

async function ouvrir(ctx, o = {}) {
  const P = await nouvellePage(ctx, { reponses: o.reponses ?? base(), ...o })
  await P.aller()
  const raison = await attendrePrete(P)
  if (raison) { await P.fermer(); throw new Error(raison) }
  return P
}
const textes = (page, sel) => page.evaluate((s) => Object.fromEntries([...document.querySelectorAll(s)].map((e) => [e.getAttribute(s.match(/\[([\w-]+)/)[1]), (e.textContent ?? '').replace(/\s+/g, ' ').trim()])), sel)
const texteDe = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? (e.textContent ?? '').replace(/\s+/g, ' ').trim() : null }, sel)
const compteur = (page, nom) => page.evaluate((n) => window[n], nom)
/** Ce que la ligne doit dire d'une étape : son libellé et son compteur (« — » si la source est absente, jamais 0). */
const ditEtape = (texte, e) => texte && texte.includes(e.libelle) && (e.source === 'absente' ? texte.includes('—') && !/(^|\s)0(\s|$)/.test(texte.replace(e.libelle, '')) : texte.includes(String(e.jour)))

// ── Les scénarios ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function scTapis(ctx) {
  const ev = jeuE('tapis-plus-un.json'), r = base(), P = await ouvrir(ctx, { reponses: r })
  try {
    await attendreCalme(P, { ms: 800 })
    const etapes = await textes(P.page, '[data-tapis-etape]'), rejet = await texteDe(P.page, '[data-tapis-rejet]')
    // Des COPIES : tapisPlusUn() modifie `r` en place plus bas, et ce que la page affichait avant ne se compare pas à ce qui est servi après.
    const servies = copie(r.direct.valeur.tapis.valeur.etapes), paye = copie(r.direct.valeur.tapis.valeur.paye)
    const avant = await compteur(P.page, '__carres')
    // +1 en contacte
    tapisPlusUn(P.reponses, ev.etape, ev.delta); bulle(P.reponses, ev.bulle)
    const t0 = Date.now()
    const vu = await jusqua(async () => (await compteur(P.page, '__carres')) > avant, { delai: 15_000, pas: 100 })
    let plusVu = null, plusFin = null
    const fenetre = Date.now()
    while (Date.now() - fenetre < 5000) {
      const n = await P.page.locator('[data-plus-un]').count()
      if (n && plusVu === null) plusVu = Date.now()
      if (!n && plusVu !== null && plusFin === null) { plusFin = Date.now(); break }
      await attendre(80)
    }
    const carres = (await compteur(P.page, '__carres')) - avant
    const textesPlus = await P.page.evaluate(() => window.__plusunTextes.slice())
    await attendreCalme(P, { ms: 800, delai: 12_000 })
    const imm = await immobile(P, { duree: 2000 })
    // deux relevés identiques : aucun carré de plus
    relecture(P.reponses); bulle(P.reponses, { agent: 'facteur', texte: 'Envoi d’essai', pastille: 'FACTEUR', type: 'envoi' })
    await attendre(9000)
    const apres = (await compteur(P.page, '__carres')) - avant
    return { etapes, rejet, rejetServi: copie(r.direct.valeur.tapis.valeur.rejet), servies, paye, vu: !!vu, delai: Date.now() - t0, carres, apres, plus: { vu: plusVu !== null, duree: plusVu && plusFin ? plusFin - plusVu : null, textes: textesPlus }, imm, erreurs: P.erreurs }
  } finally { await P.fermer() }
}
async function scCarte(ctx) {
  const r = base(), P = await ouvrir(ctx, { reponses: r })
  const sx = {}
  try {
    await attendreCalme(P, { ms: 800 })
    const lire = async () => ({
      lignes: await textes(P.page, '[data-ligne-etape]'), barres: await P.page.evaluate(() => [...document.querySelectorAll('[data-egaliseur] [data-barre]')].map((b) => b.dataset.valeur)),
      experience: await texteDe(P.page, '[data-ecran="experience"]'), badges: await P.page.evaluate(() => [...document.querySelectorAll('[data-badge-lv]')].map((b) => `${b.dataset.badgeLv}=${(b.textContent ?? '').trim()}`).sort()),
      toile: await hashToile(P.page),
    })
    sx.a = await lire(); sx.anims = await P.page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('[data-egaliseur]')).length)
    // deux relevés identiques de l'égaliseur : figé
    relecture(P.reponses); bulle(P.reponses, { agent: 'facteur', texte: 'Envoi d’essai', pastille: 'FACTEUR', type: 'envoi' }); await attendre(8000)
    sx.b = await lire()
    const c = carte(P.reponses)
    // les lignes changent, l'expérience ferme, les paliers s'en vont
    const contenu = c.lignes.valeur.contenu.valeur.etapes
    contenu.find((e) => e.cle === 'programmee').jour = 3
    c.lignes.valeur.sites.valeur.etapes.find((e) => e.cle === 'en_ligne').jour = 4
    c.lignes.valeur.packs.valeur.etapes.find((e) => e.cle === 'livre').jour = 2
    c.experience = jeuE('experience-sans-vente.json').experience
    c.paliers = { valeur: {}, source: 'supabase', a: c.paliers.a, cache: false }
    c.egaliseur.valeur = [5, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5]
    bulle(P.reponses, { agent: 'facteur', texte: 'Envoi d’essai bis', pastille: 'FACTEUR', type: 'envoi' })
    sx.servies = { contenu: copieEtapes(contenu), sites: copieEtapes(c.lignes.valeur.sites.valeur.etapes), packs: copieEtapes(c.lignes.valeur.packs.valeur.etapes), egaliseur: c.egaliseur.valeur.map(String) }
    await jusqua(async () => (await texteDe(P.page, '[data-ecran="experience"]')) !== sx.a.experience, { delai: 15_000, pas: 150 })
    await attendreCalme(P, { ms: 800 })
    sx.c = await lire()
    return sx
  } finally { await P.fermer() }
}
const copieEtapes = (l) => l.map((e) => ({ cle: e.cle, libelle: e.libelle, jour: e.jour, source: e.source }))

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ce12(t) {
  const e = []
  const attendues = [...t.servies, { cle: 'paye', libelle: t.paye.valeur?.libelle ?? 'PAYÉ', jour: t.paye.valeur?.jour, source: t.paye.valeur ? 'mesure' : 'absente' }]
  const cles = Object.keys(t.etapes)
  if (cles.length !== 8) e.push(`${cles.length} étape(s) [data-tapis-etape] affichée(s), huit attendues`)
  for (const s of attendues) {
    const tx = t.etapes[s.cle]
    if (tx === undefined) e.push(`l'étape ${s.cle} n'est pas affichée`)
    else if (!ditEtape(tx, s)) e.push(`l'étape ${s.cle} dit « ${tx} », ${s.libelle} ${s.source === 'absente' ? '—' : s.jour} servi`)
  }
  if (!t.rejet) e.push('aucun [data-tapis-rejet]')
  else if (!t.rejet.includes('REJET') || !t.rejet.includes(String(t.rejetServi.nombre)) || !t.rejet.includes(String(Math.round(t.rejetServi.tauxPass * 100)))) e.push(`REJET dit « ${t.rejet} », REJET ${t.rejetServi.nombre} et PASS ${Math.round(t.rejetServi.tauxPass * 100)} % servis`)
  if (!t.vu) e.push('« +1 » servi en contacte : aucun [data-carre] ne part en 15 s')
  if (t.carres !== 1) e.push(`« +1 » servi : ${t.carres} carré(s) partent, exactement un attendu`)
  if (!t.imm.constant) e.push(`après le carré tout ne s'arrête pas : ${t.imm.frames.join('→')} (image du jeu), ${t.imm.empreintes} empreinte(s), ${t.imm.animations} animation(s)`)
  if (t.apres !== t.carres) e.push(`deux relevés identiques : ${t.apres - t.carres} carré(s) de plus`)
  if (!t.plus.vu) e.push('aucun « +1 CONTACTÉ » [data-plus-un] affiché')
  else {
    if (!t.plus.textes.some((x) => /\+1\s*CONTACTÉ/i.test(sansEspaces(x)))) e.push(`« +1 CONTACTÉ » attendu, affiché : ${t.plus.textes.join(' / ')}`)
    if (t.plus.textes.length !== 1) e.push(`${t.plus.textes.length} « +1 » pour un mouvement, un seul attendu`)
    if (t.plus.duree === null || t.plus.duree < 900 || t.plus.duree > 2600) e.push(`« +1 » flotte ${t.plus.duree === null ? 'sans disparaître' : `${(t.plus.duree / 1000).toFixed(1)} s`}, 1,5 s attendues`)
  }
  return { echecs: e, detail: `les huit étapes et REJET affichent les compteurs servis ; « +1 » en contacte : un seul carré part (${t.carres}), « +1 CONTACTÉ » flotte ${t.plus.duree === null ? '—' : (t.plus.duree / 1000).toFixed(1)} s, tout s'arrête ; deux relevés identiques : aucun carré` }
}
function ce13(s) {
  const e = []
  for (const [ligne, etapes] of [['contenu', s.servies.contenu], ['sites', s.servies.sites], ['packs', s.servies.packs]]) {
    for (const x of etapes) { const t = s.c.lignes[`${ligne}:${x.cle}`]; if (t === undefined) e.push(`ligne ${ligne} : l'étape ${x.cle} n'est pas affichée`); else if (!ditEtape(t, x)) e.push(`ligne ${ligne}, ${x.cle} : « ${t} », ${x.libelle} ${x.source === 'absente' ? '—' : x.jour} servi`) }
  }
  if (s.a.barres.length !== 12) e.push(`l'égaliseur du Radar porte ${s.a.barres.length} barre(s), 12 attendues`)
  if (JSON.stringify(s.a.barres) !== JSON.stringify(s.b.barres)) e.push('l\'égaliseur change entre deux lectures identiques')
  if (s.anims) e.push(`${s.anims} animation(s) en cours dans l'égaliseur : il reste figé entre deux lectures`)
  if (JSON.stringify(s.c.barres) !== JSON.stringify(s.servies.egaliseur)) e.push(`l'égaliseur ne suit pas les valeurs servies (${s.c.barres.join(',')})`)
  if (!(s.a.experience ?? '').includes('J6/30') || !(s.a.experience ?? '').includes('0 €')) e.push(`l'écran de l'Expérience en cours dit « ${s.a.experience} », « J6/30 · 0 € » attendu`)
  if (!(s.c.experience ?? '').includes('FERMÉE · R13')) e.push(`l'écran de l'Expérience sans vente dit « ${s.c.experience} », « FERMÉE · R13 » attendu`)
  const attenduA = ['commandement=LV.2', 'envois=LV.2', 'usine=LV.1']
  if (JSON.stringify(s.a.badges) !== JSON.stringify(attenduA)) e.push(`badges LV ${s.a.badges.join(', ') || 'aucun'}, ${attenduA.join(', ')} attendus (là où palierSalle en rend un)`)
  if (s.c.badges.length) e.push(`aucun palier servi : les badges ${s.c.badges.join(', ')} restent`)
  // jamais dans le décor : le canevas est identique entre le jeu d'avant et le jeu qui change lignes, égaliseur, expérience et paliers
  if (s.a.toile !== s.b.toile) e.push('le canevas change entre deux lectures identiques')
  if (s.a.toile !== s.c.toile) e.push('les lignes, l\'égaliseur, l\'écran de l\'Expérience ou les badges sont peints dans le canevas : ils vont dans les calques, jamais dans le décor')
  return { echecs: e, detail: 'lignes du Crieur et de l\'Usine suivent `lignes` servies, égaliseur figé entre deux lectures, « J6/30 · 0 € » puis « FERMÉE · R13 », badges LV seulement là où un palier est servi, canevas identique entre deux jeux (rien dans le décor)' }
}

export async function critereActeurs(ctx, demandes) {
  const veut = (id) => demandes.includes(id), sorties = {}, taches = [], sortie = {}
  const lot = (cle, f) => taches.push(async () => { try { sorties[cle] = await f() } catch (err) { sorties[cle] = { interrompu: premiereLigne(err) } } })
  if (veut('CE-12')) lot('tapis', () => scTapis(ctx))
  if (veut('CE-13')) lot('carte', () => scCarte(ctx))
  await pool(taches)
  const brut = (cle, f) => { const s = sorties[cle]; return !s || s.interrompu ? { echecs: [`scénario ${cle} interrompu : ${s?.interrompu ?? 'non joué'}`], detail: '' } : f(s) }
  if (veut('CE-12')) sortie['CE-12'] = brut('tapis', ce12)
  if (veut('CE-13')) sortie['CE-13'] = brut('carte', ce13)
  return sortie
}
