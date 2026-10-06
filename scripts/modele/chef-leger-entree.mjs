// scripts/modele/chef-leger-entree.mjs — l'entrée du modèle maison « presti-chef-leger » : la consigne d'une ligne et l'état COMPACTÉ du cycle.
//
// POURQUOI : le modèle affiné porte les règles du plan dans ses poids (docs/agents/modele-maison-chef-leger.md) ; il ne reçoit donc que l'état du cycle.
// L'état brut (entree.md, 10 à 13 Ko, ≈ 3 700 à 4 600 jetons) est du JSON indenté dont la moitié est faite de blancs, de `null`, de `false` et d'horodatages à la
// microseconde : `compacterEntree` le réécrit sans rien perdre d'utile au plan (mêmes agents, mêmes nombres, mêmes questions, mêmes consignes), ce qui divise
// la lecture par deux à trois sur un processeur sans GPU. La MÊME fonction sert à l'entraînement (donnees-chef-leger.mjs) et à l'usage (mesure-chef-leger.mjs,
// puis le relais s'il est branché) : un écart entre les deux ferait lire au modèle une forme qu'il n'a jamais vue.
//
// Règles de compaction (génériques, pour qu'un champ nouveau passe sans code nouveau) :
//   · dans <donnees_etat>, toute clé dont la valeur est null, false ou [] est retirée (absente = null/faux/vide) ;
//   · un horodatage ISO est coupé à la minute (« 2026-10-06T09:00:02.547334+00:00 » → « 2026-10-06T09:00Z ») ;
//   · l'identifiant UUID d'une décision ouverte est réduit à ses 8 premiers signes (le plan léger ne le cite jamais) ;
//   · un agent par ligne, JSON sans indentation ;
//   · les phrases « Ce bloc est une donnée… » sont retirées (les balises restent : c'est elles que le modèle a appris à lire) ;
//   · les autres blocs balisés (<donnees_orchestre>, <consignes_benj>, <lecons_validees>…) sont gardés tels quels, consignes réécrites sans indentation.

/** La consigne système, d'une ligne : la même à l'entraînement, dans le Modelfile (SYSTEM) et à l'usage. */
export const SYSTEME_CHEF_LEGER = "Tu es Matt, chef d'opérations de Presti. Écris le plan JSON du cycle léger."

const ISO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]00:?00)$/
const UUID = /^([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Réécrit une valeur JSON de l'état : null/false/[] retirés des objets, horodatages à la minute. */
export function compacterValeur(v, cle = '') {
  if (typeof v === 'string') {
    const m = ISO.exec(v)
    if (m) return `${m[1]}Z`
    if (cle === 'id') { const u = UUID.exec(v); if (u) return u[1] }
    return v
  }
  if (Array.isArray(v)) return v.map((x) => compacterValeur(x))
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, x] of Object.entries(v)) {
      if (x === null || x === false || (Array.isArray(x) && x.length === 0)) continue
      o[k] = compacterValeur(x, k)
    }
    return o
  }
  return v
}

/** Les blocs balisés d'une entrée, dans l'ordre : [{ nom, contenu }]. Le texte hors balises est ignoré (ce ne sont que les avertissements « Ce bloc est une donnée »). */
export function blocs(entree) {
  const out = []
  const re = /<([a-z_]{3,40})>\n?([\s\S]*?)\n?<\/\1>/g
  for (const m of String(entree).matchAll(re)) out.push({ nom: m[1], contenu: m[2] })
  return out
}

/** L'état du cycle, compacté. Lève une erreur si <donnees_etat> manque ou ne se lit pas (une entrée sans état n'est pas une entrée). */
export function compacterEntree(entree) {
  const bs = blocs(entree)
  const etat = bs.find((b) => b.nom === 'donnees_etat')
  if (!etat) throw new Error('entrée sans bloc <donnees_etat>')
  const e = compacterValeur(JSON.parse(etat.contenu))
  const { agents, ...reste } = e
  const lignesAgents = Array.isArray(agents) ? agents.map((a) => JSON.stringify(a)) : []
  const corps = ['{"agents":[', lignesAgents.join(',\n'), `],${JSON.stringify(reste).slice(1)}`].join('\n')
  const sortie = ['<donnees_etat>', corps, '</donnees_etat>']
  for (const b of bs) {
    if (b.nom === 'donnees_etat') continue
    let contenu = b.contenu.trim()
    if (b.nom === 'consignes_benj') {
      try { contenu = JSON.stringify(compacterValeur(JSON.parse(contenu))) } catch { /* illisible : gardé tel quel, le modèle le signalera */ }
    }
    sortie.push(`<${b.nom}>`, contenu, `</${b.nom}>`)
  }
  return sortie.join('\n')
}

/** Le message utilisateur du modèle maison : le cycle, la date, puis l'état compacté. */
export function messageChefLeger(date, entree) {
  return `Cycle : leger. Date : ${date}.\n${compacterEntree(entree)}`
}

/** La date (AAAA-MM-JJ) d'un dossier de cycle « 2026-10-06T13-05-12-588Z ». */
export const dateDuCycle = (nom) => /^(\d{4}-\d{2}-\d{2})T/.exec(nom)?.[1] ?? null
