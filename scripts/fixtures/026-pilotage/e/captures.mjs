// scripts/fixtures/026-pilotage/e/captures.mjs — les captures générales d'une partie du juge d'écran (lot e, fiche 026-172, écrit par Claude Code) :
// bureau.jpg (1440×900) et telephone.jpg (390×844) des parties qui n'ont pas de captures propres (verite, camera, acteurs, calque, reglages ; themes,
// salles2 et webkit nomment les leurs). Chaque capture est prise par page.screenshot( du juge, dans un état qui ne ressemble qu'à sa partie (un
// personnage au travail avec sa bulle, la carte zoomée, un « +1 » en vol, une info-bulle, le panneau Réglages) : deux parties n'écrivent donc jamais la
// même image. L'état n'est atteint qu'au mieux : si le moteur ne le permet pas, l'image est prise quand même et c'est le critère de la partie qui rougit.
import { nouvellePage, attendrePrete, attendreCalme, attendre, jusqua, jeuE } from './commun.mjs'
import { base, appliquerEvenement, photoPositions, tapisPlusUn, bulle } from './jeux.mjs'

const VUES = [
  ['bureau.jpg', { viewport: { width: 1440, height: 900 } }, { largeur: 1440, hauteur: 900 }],
  ['telephone.jpg', { viewport: { width: 390, height: 844 }, telephone: true }, { largeur: 390, hauteur: 844 }],
]
const PANNEAU = '[data-vue="reglages"]'

async function ouvrir(ctx, partie, o) {
  const reponses = base()
  const P = await nouvellePage(ctx, { reponses, viewport: o.viewport, chemin: partie === 'reglages' ? '/controle/station?vue=reglages' : '/controle/station' })
  await P.aller()
  // Au téléphone la carte vit dans l'onglet « station » : on attend la barre d'onglets, puis on l'ouvre (le panneau Réglages est une feuille, visible de tout onglet).
  if (o.telephone) await P.page.locator('[data-onglet-tel="station"]').click({ timeout: partie === 'reglages' ? 8000 : 30_000 }).catch((e) => { if (partie !== 'reglages') throw e })
  if (partie === 'reglages') await jusqua(async () => ((await P.page.locator(PANNEAU).count()) > 0 ? true : null), { delai: 30_000, pas: 200 })
  else {
    const raison = await attendrePrete(P)
    if (raison) { if (process.env.STATION_ECRAN_DEBUG) { console.error('DEBUG', ctx.nav.contexts().length, 'contextes ouverts'); console.error('DEBUG', await P.page.evaluate(() => (document.querySelector('[data-station]')?.outerHTML ?? '').slice(0, 2500))) } await P.fermer(); throw new Error(raison) }
    await attendreCalme(P, { ms: 600, delai: 8000 })
  }
  return P
}

/** L'état propre à la partie, atteint au mieux (jamais une erreur : l'image est prise dans tous les cas). */
async function decorer(P, partie) {
  try {
    if (partie === 'verite') {
      // La réunion rassemble les agents dans une salle visible au bureau comme au téléphone : l'image ne ressemble qu'à la partie `verite`.
      appliquerEvenement(P.reponses, jeuE('evenements.json').reunion_ouverte, photoPositions(P.reponses))
      await jusqua(async () => P.page.evaluate(() => { const l = [...document.querySelectorAll('ul[data-miroir] > li[data-personnage]')]; return l.length > 0 && l.filter((x) => x.dataset.motif === 'reunion' && x.dataset.etat === 'arrive').length >= 8 }), { delai: 20_000, pas: 200 })
      await attendre(300)
    } else if (partie === 'camera') {
      for (let i = 0; i < 2; i++) { await P.page.locator('[data-action="zoom-avant"]').click({ timeout: 3000 }); await attendre(250) }
      await attendre(300)
    } else if (partie === 'acteurs') {
      const ev = jeuE('tapis-plus-un.json')
      tapisPlusUn(P.reponses, ev.etape, ev.delta); bulle(P.reponses, ev.bulle)
      await jusqua(async () => (await P.page.locator('[data-plus-un]').count()) > 0, { delai: 15_000, pas: 60 })
    } else if (partie === 'calque') {
      const cible = await P.page.evaluate(() => { const li = document.querySelector('ul[data-miroir] > li[data-personnage]'); return li ? li.dataset.personnage : null })
      if (cible) { await P.page.locator(`[data-perso="${cible}"], li[data-personnage="${cible}"][tabindex]`).first().focus({ timeout: 3000 }).catch(() => {}); await attendre(400) }
    }
  } catch { /* l'état n'est pas atteint : le critère de la partie le dira */ }
}

/** → { echecs } : les défauts des deux captures (bornes, uniformité, dimensions). */
export async function capturesGenerales(ctx, partie) {
  const echecs = []
  for (const [nom, o, dims] of VUES) {
    const P = await ouvrir(ctx, partie, o)
    try {
      await decorer(P, partie)
      const c = await ctx.captures(P.page, nom, dims)
      echecs.push(...c.echecs)
    } finally { await P.fermer() }
  }
  return { echecs }
}
