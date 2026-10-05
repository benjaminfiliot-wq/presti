// scripts/fixtures/026-pilotage/e/juge-verite.mjs — la partie `verite` du juge d'écran (lot e, fiche 026-172, écrit par Claude Code) : la règle de vérité de la
// carte, jugée DANS LE NAVIGATEUR sur des données connues. CE-2 le miroir, CE-3 l'immobilité (trois témoins), CE-4 un événement injecté, CE-5 la réunion,
// CE-6 la pause et la panne, CE-7 le mouvement réduit, CE-8 la cadence, CE-25 le premier relevé, CE-26 l'antenne, CE-27 le halo et la nuit.
// Chaque scénario est une page neuve (un contexte) ; ils tournent quatre à la fois. Aucun crochet n'est demandé au moteur : le juge lit le DOM de
// CONTRAT.md (miroir, bulle, Zz, halo, antenne) et deux instruments qu'il pose lui-même (le jeu Phaser instrumenté dans la copie, un journal du miroir).
import {
  nouvellePage, attendrePrete, attendreCalme, immobile, lireMiroir, journal, imageFrame, hashToile, attendre, jusqua, pool, coordsPoste, jeuE, court, premiereLigne,
} from './commun.mjs'
import { base, agents, appliquerEvenement, photoPositions, tapisPlusUn, nuit, relecture, bulle } from './jeux.mjs'

export const SEUIL_IMAGES = 30 // CE-8 : images par seconde pendant une marche, à 390 px, processeur ×4 (mesuré sur le témoin, sur l'usine : voir CONTRAT.md §8)
const EV = () => jeuE('evenements.json')
const ID_ATTR = /^-?\d+$/

async function ouvrir(ctx, o = {}) {
  const P = await nouvellePage(ctx, { reponses: o.reponses ?? base(), ...o })
  await P.aller()
  if (o.telephone) { await P.page.locator('[data-onglet-tel="station"]').click({ timeout: 30_000 }) }
  const raison = await attendrePrete(P)
  if (raison) { await P.fermer(); throw new Error(raison) }
  return P
}
const attendu = (r) => agents(r).filter((a) => a.position && a.position.salle).map((a) => ({ nom: a.nom, salle: a.position.salle, motif: a.position.motif })).sort((a, b) => (a.nom < b.nom ? -1 : 1))
const de = (m, nom) => m.find((l) => l.nom === nom)
const lignes = (j, nom) => j.map((l) => l.split('|')).filter((p) => p[1] === nom)
/** Le nombre de marches d'un personnage dans un journal : les suites d'états « marche ». */
const marches = (j, nom) => { let n = 0, prec = null; for (const p of lignes(j, nom)) { if (p[4] === 'marche' && prec !== 'marche') n++; if (p[4]) prec = p[4] }; return n }
const attendreEtat = (P, nom, salle, motif, delai = 15_000) => jusqua(async () => { const l = de(await lireMiroir(P.page), nom); return l && l.salle === salle && l.motif === motif && l.etat === 'arrive' ? l : null }, { delai, pas: 120 })
const boiteAntenne = (P) => P.page.locator('[data-antenne]').first().boundingBox()

// ── Les scénarios ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function scBase(ctx) {
  const r = base(), P = await ouvrir(ctx, { reponses: r })
  try {
    await attendreCalme(P)
    const miroir = await lireMiroir(P.page)
    await attendre(3000) // « 3 s après le chargement »
    const imm = await immobile(P, { duree: 3000 })
    return { miroir, attendu: attendu(r), imm, erreurs: P.erreurs, dialogues: P.dialogues, nbCanevas: await P.page.locator('[data-station-carte] canvas').count() }
  } finally { await P.fermer() }
}
async function scTache(ctx) {
  const ev = EV(), r = base()
  appliquerEvenement(r, ev.depart_porte)
  const P = await ouvrir(ctx, { reponses: r })
  try {
    await attendreCalme(P); await attendre(1000)
    const avant = de(await lireMiroir(P.page), 'atelier_maquettes')
    const n0 = (await journal(P.page)).length
    const t0 = Date.now()
    appliquerEvenement(P.reponses, ev.tache_prise)
    const arrive = await attendreEtat(P, 'atelier_maquettes', 'atelier', 'tache')
    const dt = Date.now() - t0
    const j = (await journal(P.page)).slice(n0), fin = arrive ?? de(await lireMiroir(P.page), 'atelier_maquettes')
    const marche = lignes(j, 'atelier_maquettes').filter((p) => p[4] === 'marche').map((p) => `${p[5]},${p[6]}`)
    const intermediaires = [...new Set(marche)].filter((p) => p !== `${avant?.x},${avant?.y}` && p !== `${fin?.x},${fin?.y}`)
    const bulleTexte = await P.page.evaluate(() => document.querySelector('[data-bulle="atelier_maquettes"]')?.textContent ?? null)
    await attendreCalme(P)
    const imm = await immobile(P, { duree: 3000 })
    const autres = j.filter((l) => l.split('|')[1] !== 'atelier_maquettes')
    return { avant, fin, arrive: !!arrive, dt, intermediaires: intermediaires.length, bulleTexte, imm, autres, erreurs: P.erreurs }
  } finally { await P.fermer() }
}
async function scReunion(ctx) {
  const ev = EV(), r = base(), P = await ouvrir(ctx, { reponses: r })
  try {
    await attendreCalme(P)
    const avant = await lireMiroir(P.page)
    const photo = photoPositions(r)
    appliquerEvenement(P.reponses, ev.reunion_ouverte, photo)
    const visés = agents(P.reponses).filter((a) => a.position.motif === 'reunion').map((a) => a.nom)
    const ouverte = await jusqua(async () => { const m = await lireMiroir(P.page); return visés.every((n) => { const l = de(m, n); return l && l.motif === 'reunion' && l.etat === 'arrive' }) ? m : null }, { delai: 15_000, pas: 150 })
    const pendant = ouverte ?? (await lireMiroir(P.page))
    appliquerEvenement(P.reponses, ev.reunion_close, photo)
    const revenus = await jusqua(async () => { const m = await lireMiroir(P.page); return visés.every((n) => { const l = de(m, n), s = photo.get(n); return l && l.salle === s.salle && l.motif === s.motif && l.etat === 'arrive' }) ? m : null }, { delai: 25_000, pas: 150 }) // la fiche donne 15 s à l'ouverture ; le retour n'a pas de délai dit : 25 s, la lecture du fil et la relecture comprises
    return { avantReunion: avant.filter((l) => l.motif === 'reunion').map((l) => l.nom), visés, ouverte: !!ouverte, pendant, revenus: !!revenus, erreurs: P.erreurs }
  } finally { await P.fermer() }
}
async function scPause(ctx) {
  const ev = EV(), r = base(), P = await ouvrir(ctx, { reponses: r })
  try {
    await attendreCalme(P)
    const base0 = await lireMiroir(P.page)
    const n0 = (await journal(P.page)).length
    appliquerEvenement(P.reponses, ev.pause)
    const arrive = await attendreEtat(P, 'facteur', 'repos', 'pause', 20_000)
    await attendre(300)
    const j1 = (await journal(P.page)).slice(n0)
    const zz = await P.page.locator('[data-zz="facteur"]').count()
    const n1 = (await journal(P.page)).length
    const silence = await immobile(P, { duree: 3000 })
    const n2 = (await journal(P.page)).length
    const m1 = await lireMiroir(P.page)
    // la reprise
    appliquerEvenement(P.reponses, ev.reprise)
    const reprise = await attendreEtat(P, 'facteur', 'envois', 'tache', 20_000)
    const zzApres = await P.page.locator('[data-zz="facteur"]').count()
    // la panne : l'agent reste à son poste
    const posteAvant = de(await lireMiroir(P.page), 'redacteur')
    const n3 = (await journal(P.page)).length
    appliquerEvenement(P.reponses, ev.panne)
    const panne = await attendreEtat(P, 'redacteur', 'redaction', 'panne', 20_000)
    await attendre(500)
    const j3 = (await journal(P.page)).slice(n3)
    const immPanne = await immobile(P, { duree: 2000 })
    const finale = await lireMiroir(P.page)
    return { base0, arrive: !!arrive, marches: marches(j1, 'facteur'), zz, silence, entreJournal: n2 - n1, m1, reprise: !!reprise, zzApres, posteAvant, panne: panne ?? null, marchesPanne: marches(j3, 'redacteur'), immPanne, finale, erreurs: P.erreurs }
  } finally { await P.fermer() }
}
async function scReduit(ctx) {
  const ev = EV(), r = base()
  appliquerEvenement(r, ev.depart_porte)
  const P = await ouvrir(ctx, { reponses: r, reduit: true })
  try {
    await attendreCalme(P); await attendre(800)
    const avant = de(await lireMiroir(P.page), 'atelier_maquettes')
    const n0 = (await journal(P.page)).length
    appliquerEvenement(P.reponses, ev.tache_prise)
    const arrive = await attendreEtat(P, 'atelier_maquettes', 'atelier', 'tache')
    await attendre(800)
    const j = (await journal(P.page)).slice(n0)
    const lg = lignes(j, 'atelier_maquettes'), positions = [...new Set(lg.map((p) => `${p[5]},${p[6]}`))].filter((p) => p !== `${avant?.x},${avant?.y}`)
    const marche = lg.filter((p) => p[4] === 'marche').length
    // le tapis : aucun « +1 » en mouvement réduit
    tapisPlusUn(P.reponses); bulle(P.reponses, { agent: 'recenseur', texte: 'Contact envoyé (essai)', pastille: 'RECENSEUR', type: 'radar' })
    await attendre(9000)
    const plusUn = await P.page.evaluate(() => window.__plusun)
    return { arrive: !!arrive, positions, marche, plusUn, erreurs: P.erreurs }
  } finally { await P.fermer() }
}
async function scCadence(ctx) {
  const ev = EV(), P = await ouvrir(ctx, { viewport: { width: 390, height: 844 }, cpu: 4, telephone: true })
  try {
    await attendreCalme(P); await attendre(500)
    appliquerEvenement(P.reponses, ev.pause)
    const marche = await jusqua(async () => { const l = de(await lireMiroir(P.page), 'facteur'); return l && l.etat === 'marche' ? l : null }, { delai: 20_000, pas: 80 })
    if (!marche) return { erreur: 'aucune marche vue en 20 s après la pause servie' }
    const f0 = await imageFrame(P.page), t0 = Date.now()
    await attendre(1000)
    const f1 = await imageFrame(P.page), t1 = Date.now()
    const encore = de(await lireMiroir(P.page), 'facteur')
    return { images: ((f1 - f0) * 1000) / (t1 - t0), encore: encore?.etat === 'marche', f0, f1 }
  } finally { await P.fermer() }
}
async function scPremier(ctx) {
  const r = base(), fil = jeuE('fil-historique.json')
  r.fil = { vue: 'fil', role: 'direction', source: 'supabase', a: '2026-10-23T10:00:00.000Z', valeur: fil.valeur }
  const P = await ouvrir(ctx, { reponses: r })
  try {
    const t = await P.page.evaluate(() => 1)
    void t
    const cadre = await attendreCalme(P, { ms: 1000 })
    const f0 = await imageFrame(P.page)
    await attendre(1000)
    const f1 = await imageFrame(P.page)
    await attendre(2000)
    const j = await journal(P.page)
    const box = await boiteAntenne(P).catch(() => null)
    let hashes = new Set(), etats = new Set()
    if (box) for (let i = 0; i < 8; i++) { hashes.add(await hashToile(P.page, box)); etats.add(await P.page.locator('[data-antenne]').first().getAttribute('data-etat')); await attendre(300) }
    const theme = ctx.theme
    const premiers = new Map()
    for (const l of j) { const p = l.split('|'); if (p[0] === '+' && !premiers.has(p[1])) premiers.set(p[1], { salle: p[2], motif: p[3], etat: p[4], x: p[5], y: p[6] }) }
    const mal = []
    // D-0510-15 (lot « décor », 05/10, 026-181 CE-25) : plusieurs agents d'une même salle ne s'empilent plus sur un seul point, ils s'étalent sur les PLACES de la salle
    // (scene/places.ts) : un agent qui se tient seul au poste (ou à la porte) de sa salle y est EXACTEMENT, comme avant ; avec d'autres, il est sur l'une des places (le
    // poste décalé de PLACES, les rangées montent à la porte). L'exigence n'est pas relâchée : un point hors des places reste refusé, et deux agents de la même salle et du
    // même genre ne se superposent jamais (ajout).
    const PLACES = [[0, 0], [-15, 0], [15, 0], [-8, 9], [8, 9], [0, 18], [-15, 18], [15, 18]]
    // Les places restent DANS la salle (la spécification de scene/places.ts) : à 8 px au moins des côtés, à 6 px du bas au poste, à 26 px du haut à la porte. Un poste
    // qui n'est pas au centre de sa salle (le thème d'essai : poste à (x + 16, y + 16)) voit donc ses places du côté court ramenées dans la salle.
    const salleDe = (cle) => { const f = theme.emplacements.find((x) => x.cle === cle).forme; if (f.type === 'polygone') { const xs = f.points.map((q) => q[0]), ys = f.points.map((q) => q[1]); return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } } return { x: f.x, y: f.y, l: f.l, h: f.h } }
    const sur = (c, p) => {
      const b = salleDe(p.salle), porte = p.motif === 'porte'
      return PLACES.some(([dx, dy]) => {
        const x = Math.min(b.x + b.l - 8, Math.max(b.x + 8, c.x + dx))
        const y = porte ? Math.max(b.y + 26, c.y - dy) : Math.min(b.y + b.h - 6, c.y + dy)
        return Number(p.x) === Math.round(x) && Number(p.y) === Math.round(y)
      })
    }
    const groupes = new Map()
    for (const [nom, p] of premiers) { const k = `${p.salle}|${p.motif === 'porte' ? 'porte' : 'poste'}`; groupes.set(k, [...(groupes.get(k) ?? []), nom]) }
    for (const [nom, p] of premiers) {
      const c = coordsPoste(theme, p.salle, p.motif)
      const seul = groupes.get(`${p.salle}|${p.motif === 'porte' ? 'porte' : 'poste'}`).length === 1
      if (p.etat !== 'arrive' || (seul ? Number(p.x) !== c.x || Number(p.y) !== c.y : !sur(c, p))) mal.push(`${nom} apparaît ${p.etat} en ${p.x},${p.y} (${seul ? `${c.x},${c.y}` : `une des places de la salle autour de ${c.x},${c.y}`} attendu)`)
    }
    for (const [k, noms] of groupes) {
      if (noms.length < 2) continue
      const points = new Set(noms.map((n) => `${premiers.get(n).x},${premiers.get(n).y}`))
      if (points.size !== noms.length) mal.push(`${noms.length} agents (${noms.join(', ')}) se superposent ${k.endsWith('|porte') ? 'à la porte' : 'au poste'} de ${k.split('|')[0]} : ${points.size} position(s) distincte(s)`)
    }
    return { calme: cadre.ok, f0, f1, marches: j.filter((l) => l.split('|')[4] === 'marche').length, personnages: premiers.size, mal, antenne: { present: !!box, empreintes: hashes.size, etats: [...etats] }, erreurs: P.erreurs }
  } finally { await P.fermer() }
}
async function suivreTour(P, box, { delai = 16_000 } = {}) {
  let prec = await hashToile(P.page, box), debut = null, fin = null
  const hs = new Set([prec]), t0 = Date.now()
  for (;;) {
    const maintenant = Date.now() - t0
    const h = await hashToile(P.page, box)
    if (h !== prec) { if (debut === null) debut = maintenant; fin = maintenant; hs.add(h); prec = h }
    if (debut !== null && maintenant - fin > 900) break
    if (maintenant > delai) break
  }
  return { debut, fin, empreintes: hs.size }
}
// Compte les empreintes de la zone de l'antenne sur `ms` ms. Un seul relevé ne verrait aucun tour : sous la machine saturée, moins d'une capture par 2,5 s est dite trop
// clairsemée (le scénario est interrompu, donc rouge) plutôt que prise pour « aucun tour ».
async function sansTour(P, box, ms) { const hs = new Set(), t0 = Date.now(); let n = 0; while (Date.now() - t0 < ms) { hs.add(await hashToile(P.page, box)); n++; await attendre(120) } if (n < Math.ceil(ms / 2500)) throw new Error(`mesure trop clairsemée : ${n} capture(s) en ${ms} ms (la machine est saturée)`); return hs.size }
async function scAntenne(ctx) {
  const ev = EV(), P = await ouvrir(ctx)
  try {
    await attendreCalme(P, { ms: 800 })
    const box = await boiteAntenne(P).catch(() => null)
    if (!box) return { erreur: 'aucune zone [data-antenne] (CONTRAT.md : un élément qui recouvre la zone de l\'antenne)' }
    await sansTour(P, box, 800)
    bulle(P.reponses, ev.radar.bulle)
    const un = await suivreTour(P, box)
    await attendre(800)
    const apres = await sansTour(P, box, 1500)
    // deux lectures identiques du fil : aucun tour
    const identiques = await sansTour(P, box, 7000)
    // une bulle d'un autre agent : aucun tour
    bulle(P.reponses, ev.ailleurs.bulle)
    const autre = await sansTour(P, box, 8000)
    return { un, apres, identiques, autre }
  } finally { await P.fermer() }
}
async function scAntenneReduite(ctx) {
  const ev = EV(), P = await ouvrir(ctx, { reduit: true })
  try {
    await attendreCalme(P, { ms: 800 })
    const box = await boiteAntenne(P).catch(() => null)
    if (!box) return { erreur: 'aucune zone [data-antenne]' }
    bulle(P.reponses, ev.radar.bulle)
    return { reduit: await sansTour(P, box, 9000) }
  } finally { await P.fermer() }
}
async function scNuit(ctx) {
  const ev = EV(), P = await ouvrir(ctx)
  try {
    await attendreCalme(P, { ms: 800 }); await attendre(500)
    const h0 = await hashToile(P.page)
    const decor = () => P.page.evaluate(async () => { const g = globalThis.__stationGame; if (!g?.textures?.exists?.('decor')) return null; const s = g.textures.get('decor').getSourceImage(); const b = new TextEncoder().encode(s.toDataURL()); const d = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(d)].slice(0, 8).map((x) => x.toString(16)).join('') })
    const d0 = await decor()
    // nuit inchangée : une bulle d'un autre agent, et un autre changement de la lecture, ne touchent pas le décor
    bulle(P.reponses, ev.ailleurs.bulle)
    await attendre(7000)
    const hMemeNuit = await hashToile(P.page), dMemeNuit = await decor()
    nuit(P.reponses, true); bulle(P.reponses, { ...ev.ailleurs.bulle, texte: 'Envoi d’essai bis' })
    const h1 = await jusqua(async () => { const h = await hashToile(P.page); return h !== h0 ? h : null }, { delai: 16_000, pas: 250 })
    const lectures = []
    for (let i = 0; i < 3; i++) { await attendre(1000); lectures.push(await hashToile(P.page)) }
    const d1 = await decor()
    const attrNuit = await P.page.evaluate(() => document.querySelector('[data-station-carte]')?.dataset.nuit ?? null)
    return { h0, hMemeNuit, d0, dMemeNuit, h1, lectures, d1, attrNuit }
  } finally { await P.fermer() }
}

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const detailImm = (i) => `${i.insuffisant ? `mesure insuffisante (${i.releves} relevé(s)) — ` : ''}images ${i.frames.join('→')}, ${i.empreintes} empreinte(s) du canevas, ${i.animations ? `${i.animations} animation(s) en cours` : 'aucune animation en cours'}`
function ce2(s) {
  const e = [], m = s.miroir
  if (s.nbCanevas !== 1) e.push(`${s.nbCanevas} canevas dans [data-station-carte], 1 attendu`)
  const noms = new Set(m.map((l) => l.nom))
  if (noms.size !== m.length) e.push('un personnage du miroir est en double')
  for (const a of s.attendu) {
    const l = de(m, a.nom)
    if (!l) e.push(`${a.nom} (${a.salle}/${a.motif}) absent du miroir ul[data-miroir]`)
    else {
      if (l.salle !== a.salle) e.push(`${a.nom} : data-salle « ${l.salle} », ${a.salle} servie`)
      if (l.motif !== a.motif) e.push(`${a.nom} : data-motif « ${l.motif} », ${a.motif} servi`)
      if (l.etat !== 'arrive') e.push(`${a.nom} : data-etat « ${l.etat} », arrive attendu au repos`)
      if (!ID_ATTR.test(l.x ?? '') || !ID_ATTR.test(l.y ?? '')) e.push(`${a.nom} : data-x/data-y non entiers (${l.x}, ${l.y})`)
    }
  }
  for (const l of m) if (!s.attendu.some((a) => a.nom === l.nom)) e.push(`${l.nom} est dessiné alors que la vue servie ne lui donne pas de salle`)
  return { echecs: e, detail: `ul[data-miroir] porte ${m.length} personnage(s), un par agent servi avec une salle, aucun autre, data-salle, data-motif et data-etat égaux à la position servie ; un seul canevas` }
}
function ce3(s, t) {
  const e = []
  if (!s.imm.constant) e.push(`la carte bouge sans événement : ${detailImm(s.imm)}`)
  if (t && !t.imm.constant) e.push(`après l'événement la carte ne se rendort pas : ${detailImm(t.imm)}`)
  return { echecs: e, detail: `3 s après le chargement, sur 3 s : ${detailImm(s.imm)} ; et de nouveau après l'événement injecté : ${t ? detailImm(t.imm) : '—'}` }
}
function ce4(t) {
  const e = []
  if (!t.arrive) e.push(`atelier_maquettes n'est pas arrivé à atelier/tache en 15 s (${t.fin ? `${t.fin.salle}/${t.fin.motif}/${t.fin.etat}` : 'absent'})`)
  else if (t.dt > 15_000) e.push(`arrivé après ${(t.dt / 1000).toFixed(1)} s, plus de 15 s`)
  if (!t.intermediaires) e.push('aucune position intermédiaire relevée pendant la marche (le personnage a sauté de la porte au poste)')
  if (t.bulleTexte !== 'Maquette plombier, Lyon') e.push(`bulle « ${t.bulleTexte} », « Maquette plombier, Lyon » exactement attendu`)
  if (t.autres.length) e.push(`un autre personnage a bougé : ${t.autres.slice(0, 2).join(' / ')}`)
  return { echecs: e, detail: `tache_prise servi : atelier_maquettes à atelier/tache en ${(t.dt / 1000).toFixed(1)} s, ${t.intermediaires} position(s) intermédiaire(s) relevée(s), bulle exacte, aucun autre personnage n'a bougé` }
}
function ce5(c) {
  const e = []
  if (c.avantReunion.length) e.push(`sans événement de réunion, ${c.avantReunion.join(', ')} est en reunion`)
  if (!c.visés.length) e.push('le jeu servi ne met personne en réunion')
  if (!c.ouverte) e.push(`réunion ouverte servie : tous ne sont pas en reunion avant 15 s (${c.visés.filter((n) => de(c.pendant, n)?.motif !== 'reunion').join(', ')})`)
  if (!c.revenus) e.push('réunion close servie : tous ne sont pas revenus à leur salle avant 25 s')
  return { echecs: e, detail: `sans réunion personne en reunion ; ouverte : ${c.visés.length} agents ni en pause ni en panne en reunion avant 15 s ; close : chacun revenu à sa salle` }
}
function ce6(p) {
  const e = []
  if (!p.arrive) e.push('la pause servie ne mène pas facteur au Repos (repos/pause) en 20 s')
  if (p.marches !== 1) e.push(`${p.marches} marche(s) vers le Repos, une seule attendue`)
  if (p.zz !== 1) e.push(`« Zz » de facteur : ${p.zz} élément(s) [data-zz="facteur"], 1 attendu`)
  if (!p.silence.constant || p.entreJournal !== 0) e.push(`après l'arrivée au Repos la carte bouge encore (${detailImm(p.silence)}, ${p.entreJournal} position(s) relevée(s))`)
  for (const l of [...p.base0, ...p.m1, ...p.finale]) if (l.salle === 'repos' && (l.motif === 'porte' || l.motif === 'tache')) e.push(`${l.nom} (${l.motif}) est au Repos : seul le motif pause y mène`)
  if (!p.reprise) e.push('à la reprise facteur ne revient pas à envois/tache en 20 s')
  if (p.zzApres) e.push('« Zz » reste affiché après la reprise')
  if (!p.panne) e.push('la panne servie : redacteur n\'est pas à redaction/panne en 20 s')
  else if (p.posteAvant && (p.panne.x !== p.posteAvant.x || p.panne.y !== p.posteAvant.y)) e.push(`panne : redacteur a quitté son poste (${p.posteAvant.x},${p.posteAvant.y} → ${p.panne.x},${p.panne.y})`)
  if (p.marchesPanne) e.push(`panne : redacteur a marché (${p.marchesPanne} marche(s)) au lieu de rester à son poste`)
  if (!p.immPanne.constant) e.push(`panne : l'étincelle n'est pas fixe (${detailImm(p.immPanne)})`)
  return { echecs: e, detail: 'pause : une seule marche vers le Repos puis « Zz » et plus aucune position qui change (3 s), reprise : retour à la salle, jamais un agent porte ou tache au Repos ; panne : l\'agent reste à son poste, étincelle fixe' }
}
function ce7(r) {
  const e = []
  if (!r.arrive) e.push('mouvement réduit : atelier_maquettes n\'arrive pas à atelier/tache')
  if (r.marche) e.push(`mouvement réduit : ${r.marche} état(s) « marche » relevé(s)`)
  if (r.positions.length > 1) e.push(`mouvement réduit : ${r.positions.length} positions successives (${r.positions.slice(0, 3).join(' ; ')}), la porte au poste sans position intermédiaire attendu`)
  if (r.plusUn) e.push(`mouvement réduit : ${r.plusUn} « +1 » affiché(s)`)
  return { echecs: e, detail: 'reducedMotion=reduce : le personnage passe de la porte au poste sans état « marche » ni position intermédiaire, aucun « +1 »' }
}
function ce8(c) {
  if (c.erreur) return { echecs: [c.erreur], detail: '' }
  const e = []
  if (!c.encore) e.push('la marche s\'est arrêtée pendant la mesure (la fenêtre d\'une seconde n\'est pas une marche)')
  if (c.images < SEUIL_IMAGES) e.push(`${c.images.toFixed(1)} images par seconde pendant une marche à 390 px, processeur ×4, ${SEUIL_IMAGES} au moins`)
  return { echecs: e, detail: `${c.images.toFixed(1)} images par seconde pendant une marche à 390 px, processeur ralenti ×4 (seuil ${SEUIL_IMAGES})` }
}
function ce25(g) {
  const e = []
  if (!g.calme) e.push('game.loop.frame ne s\'arrête pas après le premier relevé')
  if (g.f1 !== g.f0) e.push(`game.loop.frame bouge encore une seconde après le premier relevé (${g.f0} → ${g.f1})`)
  if (g.marches) e.push(`${g.marches} état(s) « marche » au premier relevé : chaque personnage doit apparaître à son poste`)
  if (!g.personnages) e.push('aucun personnage au premier relevé')
  e.push(...g.mal)
  if (!g.antenne.present) e.push('aucune zone [data-antenne]')
  else if (g.antenne.empreintes !== 1 || g.antenne.etats.some((x) => x && x !== 'fixe')) e.push(`l'antenne tourne au premier relevé (${g.antenne.empreintes} empreinte(s), état ${g.antenne.etats.join('/')})`)
  return { echecs: e, detail: `100 bulles historiques dont 30 du Radar : ${g.personnages} personnages posés à leur poste dès la première image, aucune marche, game.loop.frame arrêté, l'antenne immobile` }
}
function ce26(a, red) {
  const e = []
  if (a.erreur) return { echecs: [a.erreur], detail: '' }
  if (a.un.debut === null) e.push('une bulle nouvelle du Radar servie : l\'antenne ne tourne pas')
  else {
    const duree = a.un.fin - a.un.debut
    // Le tour dure 2 s ; le juge l'échantillonne par captures (de 0,3 à 1 s chacune sous charge) : il voit le bras partir puis revenir (deux empreintes au moins) et mesure de la
    // première à la dernière variation vue, soit 2 s plus ou moins une capture à chaque bout.
    if (a.un.empreintes < 2) e.push(`un tour : ${a.un.empreintes} empreinte(s) seulement, l'antenne ne tourne pas vraiment`)
    if (duree < 1000 || duree > 4500) e.push(`un tour dure ${(duree / 1000).toFixed(1)} s, 2 s attendues (entre 1 et 4,5 s mesurées par captures)`)
  }
  if (a.apres !== 1) e.push('l\'antenne continue de tourner après son tour')
  if (a.identiques !== 1) e.push('deux lectures identiques du fil : l\'antenne tourne')
  if (a.autre !== 1) e.push('une bulle d\'un autre agent que le Radar ou le Veilleur : l\'antenne tourne')
  if (red.erreur) e.push(red.erreur); else if (red.reduit !== 1) e.push('mouvement réduit : l\'antenne tourne')
  return { echecs: e, detail: `une bulle nouvelle du Radar : un tour de ${a.un.debut === null ? '—' : ((a.un.fin - a.un.debut) / 1000).toFixed(1)} s (${a.un.empreintes} empreintes) puis constante ; deux lectures identiques, une bulle d'un autre agent, le mouvement réduit : aucun tour` }
}
function ce27(s, n) {
  const e = []
  const halos = s.miroir.filter((l) => l.motif === 'tache')
  if (!halos.length) e.push('aucun agent au motif tache dans le jeu servi')
  for (const l of s.miroir) { const attendu = l.motif === 'tache' ? 'oui' : 'non'; if (l.halo !== attendu) e.push(`${l.nom} (${l.motif}) : data-halo « ${l.halo} », « ${attendu} » attendu`) }
  if (!s.imm.constant) e.push(`le halo n'est pas fixe : ${detailImm(s.imm)}`)
  if (n.hMemeNuit !== n.h0 || n.dMemeNuit !== n.d0) e.push('carte.nuit inchangé : le décor a changé')
  if (!n.h1) e.push('carte.nuit passe de faux à vrai : le décor ne change pas en 16 s')
  else {
    if (new Set(n.lectures).size !== 1 || n.lectures[0] !== n.h1) e.push('après le passage à la nuit le décor change encore (il doit être redessiné UNE fois)')
    if (n.d0 && n.d1 && n.d0 === n.d1) e.push('la texture du décor n\'a pas changé à la nuit')
    if (n.attrNuit !== null && n.attrNuit !== 'oui') e.push(`[data-station-carte] data-nuit « ${n.attrNuit} », « oui » attendu`)
  }
  return { echecs: e, detail: `${halos.length} halo(s) fixe(s) (data-halo) ; carte.nuit inchangé : décor identique ; faux → vrai : le décor change une fois puis reste constant sur trois lectures` }
}

/** Rend { 'CE-2': { echecs, detail }, … } pour les critères demandés. */
export async function critereVerite(ctx, demandes) {
  const veut = (id) => demandes.includes(id)
  const taches = []
  const sorties = {}
  const lot = (cle, f) => taches.push(async () => { try { sorties[cle] = await f() } catch (e) { sorties[cle] = { interrompu: premiereLigne(e) } } })
  if (veut('CE-2') || veut('CE-3') || veut('CE-27')) lot('base', () => scBase(ctx))
  if (veut('CE-3') || veut('CE-4')) lot('tache', () => scTache(ctx))
  if (veut('CE-5')) lot('reunion', () => scReunion(ctx))
  if (veut('CE-6')) lot('pause', () => scPause(ctx))
  if (veut('CE-7')) lot('reduit', () => scReduit(ctx))
  if (veut('CE-8')) lot('cadence', () => scCadence(ctx))
  if (veut('CE-25')) lot('premier', () => scPremier(ctx))
  if (veut('CE-26')) { lot('antenne', () => scAntenne(ctx)); lot('antenneReduite', () => scAntenneReduite(ctx)) }
  if (veut('CE-27')) lot('nuit', () => scNuit(ctx))
  await pool(taches)
  const sortie = {}
  const brut = (cle, f) => { const s = sorties[cle]; return !s || s.interrompu ? { echecs: [`scénario ${cle} interrompu : ${s?.interrompu ?? 'non joué'}`], detail: '' } : f(s) }
  if (veut('CE-2')) sortie['CE-2'] = brut('base', ce2)
  if (veut('CE-3')) sortie['CE-3'] = brut('base', (s) => { const t = sorties.tache; return ce3(s, t && !t.interrompu ? t : null) })
  if (veut('CE-4')) sortie['CE-4'] = brut('tache', ce4)
  if (veut('CE-5')) sortie['CE-5'] = brut('reunion', ce5)
  if (veut('CE-6')) sortie['CE-6'] = brut('pause', ce6)
  if (veut('CE-7')) sortie['CE-7'] = brut('reduit', ce7)
  if (veut('CE-8')) sortie['CE-8'] = brut('cadence', ce8)
  if (veut('CE-25')) sortie['CE-25'] = brut('premier', ce25)
  if (veut('CE-26')) sortie['CE-26'] = brut('antenne', (a) => brut('antenneReduite', (r) => ce26(a, r)))
  if (veut('CE-27')) sortie['CE-27'] = brut('base', (s) => brut('nuit', (n) => ce27(s, n)))
  void court; void relecture
  return sortie
}
