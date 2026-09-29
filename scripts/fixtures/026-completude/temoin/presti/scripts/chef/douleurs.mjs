// Témoin de 026-220 : implémentation de RÉFÉRENCE de la passe mensuelle des douleurs (jamais déployée). Elle prouve
// que le juge `scripts/juges-026-completude-qa.mjs --partie=douleurs` sait être vert ; chaque sabotage de
// --preuve-echecs le rend rouge. Le contrat : `node scripts/juges-026-completude-qa.mjs --contrat=douleurs`.
//
// Règles tenues : une passe par mois ÉCOULÉ, clé idempotente douleurs-AAAA-MM ; chaque douleur porte ses sources et un
// nombre, ou « non mesuré » dès qu'une source n'est pas comptée ; une source hors du mois est écartée ; une seule
// source n'est pas une tendance ; trois propositions au plus, coût estimé comme tel ; aucune donnée personnelle dans
// le rapport ni vers le classeur (Laya), qui annote sans jamais créer ni décider une douleur.

const PERSONNEL = /[\w.+-]+@[\w-]+(\.[\w-]+)+|(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g
const anonymiser = (t) => String(t || '').replace(PERSONNEL, '[masqué]')

export async function passeMensuelle({ mois, sources = [], magasin, horloge, classer = null }) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mois || ''))
  if (!m) return { refus: 'mois' }
  const debut = Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)
  const fin = Date.UTC(Number(m[1]), Number(m[2]), 1)
  if (horloge.maintenant() < fin) return { refus: 'mois_non_ecoule' }
  const cle = `douleurs-${mois}`
  const deja = await magasin.lire(cle)
  if (deja) return { cle, deja: true, rapport: deja }

  const ecartees = []
  const retenues = []
  for (const s of sources) {
    const t = Date.parse(s?.date)
    if (!s?.id || !s.source || !s.probleme || Number.isNaN(t)) { ecartees.push({ id: s?.id ?? null, raison: 'incomplete' }); continue }
    if (t < debut || t >= fin) { ecartees.push({ id: s.id, raison: 'perimee' }); continue }
    retenues.push(s)
  }

  let avis = []
  if (classer && retenues.length) {
    try { avis = await classer(retenues.map((s) => ({ id: s.id, probleme: s.probleme, extrait: anonymiser(s.extrait) }))) } catch { avis = [] }
  }

  const groupes = new Map()
  for (const s of retenues) {
    const g = groupes.get(s.probleme) || { probleme: s.probleme, sources: [], nombres: [], gravite: 0 }
    g.sources.push(s.id)
    g.nombres.push(typeof s.nombre === 'number' ? s.nombre : null)
    g.gravite = Math.max(g.gravite, Number(s.gravite) || 1)
    groupes.set(s.probleme, g)
  }
  const douleurs = [...groupes.values()].map((g) => {
    const a = (avis || []).find((x) => x?.probleme === g.probleme)
    return {
      probleme: g.probleme,
      sources: g.sources,
      nombre: g.nombres.includes(null) ? 'non mesuré' : g.nombres.reduce((x, y) => x + y, 0),
      gravite: g.gravite,
      tendance: new Set(g.sources).size >= 2,
      ...(a && typeof a.confiance === 'number' ? { confiance_classeur: a.confiance } : {}),
    }
  })
  const rang = (d) => (d.tendance ? 1000 : 0) + d.gravite * 100 + (typeof d.nombre === 'number' ? Math.min(d.nombre, 99) : 0)
  const propositions = [...douleurs].sort((a, b) => rang(b) - rang(a)).slice(0, 3).map((d) => ({
    titre: `Réduire « ${d.probleme} »`,
    preuve: [...d.sources],
    hypothese: `Si « ${d.probleme} » diminue, les demandes de support du mois suivant baissent.`,
    cout: { estime: true, eur: 0 },
    dependances: [],
    garde: 'fiche de conception après verdict ; drapeau produit éteint',
    prochain_essai: 'un essai borné sur une seule page',
    validation: ['claude-code'],
  }))
  const rapport = {
    mois,
    cle,
    genere_le: new Date(horloge.maintenant()).toISOString(),
    statut: douleurs.length ? 'mesuré' : 'rien de mesuré',
    douleurs,
    propositions,
    ecartees,
  }
  await magasin.ecrire(cle, rapport)
  return { cle, deja: false, rapport }
}
