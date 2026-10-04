// scripts/fixtures/026-pilotage/e/juge-salles.mjs — la partie `salles2` du juge d'écran (lot e, fiche 026-172, écrit par Claude Code).
//   --lot=a (026-188)  CE-21  `?salle=commandement` ouvre `[data-salle-panneau="commandement"]` : l'objectif, les missions, les succès, le compte rendu et les consignes
//                              reçues par le Chef, tels que servis ; le niveau et les euros sous `comptabilite` (« hors périmètre » sinon, jamais 0)
//   --lot=b (026-189)  CE-22  Audience, Sécurité, Presti, Observatoire, Salle de repos et E-commerce ouvrent leur panneau ; chaque sous-partie refusée dit « hors périmètre »,
//                              jamais 0 ; aucun nom de personne ; Presti montre un NOMBRE de tickets, jamais un contenu ; l'Observatoire agrège par département ; la Salle de
//                              repos monte « Reprendre » (026-117) et ne dit jamais « bientôt » ; E-commerce dit « Branche réservée : rien n'est construit. », sans chiffre ni bouton
//   les deux lots       CE-23  chaque panneau porte le résumé `[data-resume-salle]` (026-120) ; scrollWidth ≤ 390 à 390×844 ; captures bureau.jpg et telephone.jpg prises par le juge
// Les réponses servies sont celles de s/ (salle-<clé>.json, validées par s/contrat-vues.mjs) ; les variantes (hors périmètre, pièges) viennent de salles-*.json.
import { nouvellePage, attendrePrete, attendre, jusqua, pool, jeuE, premiereLigne, copie } from './commun.mjs'
import { base, agents, PIEGE_NOM } from './jeux.mjs'

const apostrophes = (t) => String(t ?? '').replace(/[’‘]/g, "'").replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const HORS = { valeur: null, nonMesure: true, raison: 'hors périmètre' }
const estEnveloppe = (x) => x && typeof x === 'object' && !Array.isArray(x) && 'valeur' in x && 'source' in x

async function ouvrir(ctx, o = {}) {
  const P = await nouvellePage(ctx, { reponses: o.reponses ?? base(), ...o })
  await P.aller()
  if (o.telephone) await P.page.locator('[data-onglet-tel="station"]').click({ timeout: 30_000 })
  const raison = await attendrePrete(P)
  if (raison) { await P.fermer(); throw new Error(raison) }
  return P
}
/** Ouvre la salle par l'adresse (replaceState : Next suit, la page ne se recharge pas) et lit le panneau. */
async function lirePanneau(P, cle) {
  await P.page.evaluate((c) => { const u = new URL(location.href); u.searchParams.set('salle', c); u.searchParams.delete('agent'); history.replaceState(null, '', u) }, cle)
  const sel = `[data-salle-panneau="${cle}"]`
  const ok = await jusqua(async () => ((await P.page.locator(sel).count()) > 0 && (await P.page.locator(`${sel} :not([data-resume-salle])`).count()) > 1 ? true : null), { delai: 12_000, pas: 150 })
  if (!ok) return { cle, absent: true }
  await attendre(400)
  const r = await P.page.evaluate((s) => {
    const p = document.querySelector(s), b = p.getBoundingClientRect(), resume = p.querySelector('[data-resume-salle]')
    const clone = p.cloneNode(true); clone.querySelector('[data-resume-salle]')?.remove()
    const boutons = [...clone.querySelectorAll('button')].map((x) => (x.textContent ?? '').trim()).filter((t) => !/fermer|×|✕|^x$/i.test(t))
    return { texte: (p.textContent ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), sansResume: (clone.textContent ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), resume: !!resume, boutons, largeur: b.width, sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }
  }, sel)
  await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.delete('salle'); history.replaceState(null, '', u) })
  await attendre(250)
  return { cle, ...r }
}
const lesSalles = (lot) => { const j = jeuE('salles2-vingt.json'); return lot === 'a' ? j.lot_a : j.lot_b }
/** Les réponses servies avec une salle refusée : chaque enveloppe devient « hors périmètre », sinon la vue entière l'est. */
function refuser(r, cle, entiere) {
  const s = r.salles[cle]
  if (!s) return r
  if (entiere || !s.valeur || typeof s.valeur !== 'object') { r.salles[cle] = { ...s, valeur: null, nonMesure: true, raison: 'hors périmètre', manque: undefined }; return r }
  const patches = jeuE('salles-hors-perimetre.json')[cle] || {}
  let n = 0
  for (const k of Object.keys(s.valeur)) if (estEnveloppe(s.valeur[k])) { s.valeur[k] = copie(HORS); n++ }
  for (const [k, v] of Object.entries(patches)) { s.valeur[k] = copie(v); n++ }
  if (!n) r.salles[cle] = { ...s, valeur: null, nonMesure: true, raison: 'hors périmètre' }
  return r
}
function piegee(r, cle) {
  const p = jeuE('salles-pieges.json')[cle]
  if (p && r.salles[cle]?.valeur) for (const [k, v] of Object.entries(p)) r.salles[cle].valeur[k] = copie(v)
  return r
}

async function scBase(ctx, cles) {
  const r = base(), P = await ouvrir(ctx, { reponses: r }), out = { r, panneaux: {} }
  try { for (const c of cles) out.panneaux[c] = await lirePanneau(P, c) } finally { await P.fermer() }
  return out
}
async function scHors(ctx, cles, entiere) {
  const r = base()
  for (const c of cles) refuser(r, c, entiere)
  const P = await ouvrir(ctx, { reponses: r }), out = { panneaux: {} }
  try { for (const c of cles) out.panneaux[c] = await lirePanneau(P, c) } finally { await P.fermer() }
  return out
}
async function scPieges(ctx, cles) {
  const r = base()
  for (const c of cles) piegee(r, c)
  const P = await ouvrir(ctx, { reponses: r }), out = { panneaux: {} }
  try { for (const c of cles) out.panneaux[c] = await lirePanneau(P, c) } finally { await P.fermer() }
  return out
}
async function scTelephone(ctx, cles, captures, lot) {
  const P = await ouvrir(ctx, { viewport: { width: 390, height: 844 }, telephone: true }), out = { panneaux: {} }
  try {
    for (const c of cles) out.panneaux[c] = await lirePanneau(P, c)
    if (captures) {
      const cible = lot === 'a' ? 'commandement' : 'presti'
      await P.page.evaluate((c) => { const u = new URL(location.href); u.searchParams.set('salle', c); history.replaceState(null, '', u) }, cible)
      await attendre(1200)
      out.capture = await captures(P.page, 'telephone.jpg', { largeur: 390, hauteur: 844 })
    }
  } finally { await P.fermer() }
  return out
}
async function scBureau(ctx, lot, captures) {
  if (!captures) return {}
  const P = await ouvrir(ctx)
  try {
    const cible = lot === 'a' ? 'commandement' : 'presti'
    await P.page.evaluate((c) => { const u = new URL(location.href); u.searchParams.set('salle', c); history.replaceState(null, '', u) }, cible)
    await attendre(1500)
    return { capture: await captures(P.page, 'bureau.jpg', { largeur: 1440, hauteur: 900 }) }
  } finally { await P.fermer() }
}

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ce21(b, h) {
  const e = [], p = b.panneaux.commandement, v = b.r.salles.commandement.valeur
  if (!p || p.absent) return { echecs: ['?salle=commandement n\'ouvre aucun [data-salle-panneau="commandement"] avec du contenu en 12 s'], detail: '' }
  const t = apostrophes(p.texte)
  const dit = (quoi, x) => { if (x && !t.includes(apostrophes(x))) e.push(`${quoi} « ${apostrophes(x).slice(0, 50)} » absent du panneau`) }
  dit('l\'objectif', v.objectif.libelle)
  for (const m of v.missions) dit('la mission', m.libelle)
  for (const s of v.tousSucces) dit('le succès', s.libelle)
  for (const l of v.compteRendu) dit('le compte rendu', l)
  for (const c of v.consignes) dit('la consigne reçue par le Chef', c.texte)
  dit('le niveau', v.argent.valeur.niveau.texte)
  const hp = h.panneaux.commandement
  if (!hp || hp.absent) e.push('commandement sans comptabilite : le panneau ne s\'ouvre pas')
  else {
    const ht = apostrophes(hp.texte)
    if (!/hors périmètre/.test(ht)) e.push('commandement sans comptabilite : « hors périmètre » n\'est pas dit pour le niveau et les euros')
    if (ht.includes(v.argent.valeur.niveau.texte) || /(^|\s)0\s*€|niveau 0|LV\.0/.test(ht)) e.push(`commandement sans comptabilite : le niveau ou les euros se lisent encore (« ${ht.slice(-70)} ») : « hors périmètre », jamais 0`)
  }
  return { echecs: e, detail: 'le panneau du Commandement porte l\'objectif, les missions, les succès, le compte rendu, les consignes reçues par le Chef et le niveau servis ; sans comptabilite : « hors périmètre », jamais 0' }
}
function ce22(b, h, pg, role) {
  const e = []
  const cles = Object.keys(b.panneaux)
  for (const c of cles) {
    const p = b.panneaux[c]
    if (!p || p.absent) { e.push(`?salle=${c} n'ouvre aucun [data-salle-panneau="${c}"] avec du contenu`); continue }
    const hp = h.panneaux[c]
    if (c !== 'ecommerce') {
      if (!hp || hp.absent) e.push(`${c} refusée : le panneau ne s'ouvre pas`)
      else {
        if (!/hors périmètre/.test(hp.sansResume)) e.push(`${c} refusée : « hors périmètre » n'est pas dit`)
        if (/(^|[^\d])0(?!\d)/.test(hp.sansResume.replace(/hors périmètre/g, ''))) e.push(`${c} refusée : un 0 s'affiche (« ${hp.sansResume.slice(0, 70)} ») : « hors périmètre », jamais 0`)
      }
    }
    const piege = pg.panneaux[c]
    if (piege && !piege.absent && (new RegExp(`${PIEGE_NOM}|jean\\.temoin|ne marche plus|Plomberie`, 'i').test(piege.texte))) e.push(`${c} : un nom de personne ou un contenu s'affiche (« ${piege.texte.match(new RegExp(`.{0,20}(${PIEGE_NOM}|jean\\.temoin|ne marche plus|Plomberie).{0,20}`, 'i'))?.[0]} »)`)
  }
  const presti = b.panneaux.presti, pgp = pg.panneaux.presti
  if (presti && !presti.absent && !/(^|[^\d])3(?!\d)/.test(presti.sansResume)) e.push(`Presti ne montre pas le nombre de tickets servi (3) : « ${presti.sansResume.slice(0, 80)} »`)
  if (pgp && !pgp.absent && /tickets?\s*:\s*[^\d\s]{3,}/i.test(pgp.sansResume)) e.push('Presti montre autre chose qu\'un nombre de tickets')
  const obs = b.panneaux.observatoire
  if (obs && !obs.absent && !/69/.test(obs.sansResume)) e.push(`l'Observatoire n'agrège pas par département (69 attendu) : « ${obs.sansResume.slice(0, 80)} »`)
  const repos = b.panneaux.repos
  if (repos && !repos.absent) { if (!repos.boutons.some((t) => /Reprendre/.test(t))) e.push('la Salle de repos ne monte pas « Reprendre » (026-117)'); if (/bientôt/i.test(repos.texte)) e.push('la Salle de repos dit « bientôt »') }
  const ec = b.panneaux.ecommerce
  if (ec && !ec.absent) {
    if (!apostrophes(ec.sansResume).includes("Branche réservée : rien n'est construit.")) e.push(`le panneau E-commerce dit « ${ec.sansResume.slice(0, 80)} », « Branche réservée : rien n'est construit. » attendu`)
    if (/\d/.test(ec.sansResume)) e.push('le panneau E-commerce porte un chiffre')
    if (ec.boutons.length) e.push(`le panneau E-commerce porte un bouton (${ec.boutons.join(', ')})`)
  }
  void role
  return { echecs: e, detail: `${cles.join(', ')} ouvrent leur panneau ; refusées : « hors périmètre », jamais 0 ; aucun nom de personne ; Presti : un nombre de tickets ; l'Observatoire agrège par département ; Salle de repos : « Reprendre », jamais « bientôt » ; E-commerce : « Branche réservée : rien n'est construit. », sans chiffre ni bouton` }
}
function ce23(b, t, bureau, tel) {
  const e = []
  for (const [c, p] of Object.entries(b.panneaux)) {
    if (!p || p.absent) { e.push(`${c} : aucun panneau`); continue }
    if (!p.resume) e.push(`${c} : aucun résumé de salle [data-resume-salle] (026-120)`)
    const pt = t.panneaux[c]
    if (!pt || pt.absent) e.push(`${c} au téléphone : le panneau ne s'ouvre pas`)
    else if (pt.sw > 390) e.push(`${c} au téléphone : scrollWidth ${pt.sw} px, 390 au plus`)
  }
  for (const c of [bureau.capture, tel.capture]) if (c?.echecs) e.push(...c.echecs)
  return { echecs: e, detail: `${Object.keys(b.panneaux).join(', ')} : le résumé [data-resume-salle] sur chaque panneau, scrollWidth ≤ 390 à 390×844${bureau.capture ? ', captures bureau.jpg et telephone.jpg prises par le juge' : ''}` }
}

export async function critereSalles(ctx, demandes, lot) {
  const veut = (id) => demandes.includes(id), sorties = {}, taches = [], sortie = {}
  const cles = lesSalles(lot)
  const lotId = lot === 'a' ? 'CE-21' : 'CE-22'
  const lotT = (cle, f) => taches.push(async () => { try { sorties[cle] = await f() } catch (err) { sorties[cle] = { interrompu: premiereLigne(err) } } })
  lotT('base', () => scBase(ctx, cles)); lotT('hors', () => scHors(ctx, cles, lot === 'b')); lotT('pieges', () => scPieges(ctx, cles))
  if (veut('CE-23')) { lotT('tel', () => scTelephone(ctx, cles, ctx.captures, lot)); lotT('bureau', () => scBureau(ctx, lot, ctx.captures)) }
  await pool(taches)
  const brut = (cle, f) => { const s = sorties[cle]; return !s || s.interrompu ? { echecs: [`scénario ${cle} interrompu : ${s?.interrompu ?? 'non joué'}`], detail: '' } : f(s) }
  if (veut(lotId)) sortie[lotId] = lot === 'a' ? brut('base', (b) => brut('hors', (h) => ce21(b, h))) : brut('base', (b) => brut('hors', (h) => brut('pieges', (pg) => ce22(b, h, pg))))
  if (veut('CE-23')) sortie['CE-23'] = brut('base', (b) => brut('tel', (t) => brut('bureau', (bu) => ce23(b, t, bu, t))))
  void attendrePrete; void agents
  return sortie
}
