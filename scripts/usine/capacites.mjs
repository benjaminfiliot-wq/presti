// Capacités du tourneur : la commande est une liste d'arguments, jamais une ligne de shell.
export const CAPACITES = {
  livraison: {
    agent: 'livreur_usine',
    jeton: 'PRESTI_JETON_LIVREUR_USINE',
    type: 'livrer_site',
    minutes: 25,
    env: ['CODEX_LANCEUR'],
    commande: ['{node}', '--import', './scripts/ts-loader.mjs', 'scripts/livrer-site.mjs', '--usine', '--entree={entree}', '--sortie={sortie}'],
  },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const SCHEMAS = {
  livraison(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return 'charge absente'
    for (const k of Object.keys(c)) if (!['commande', 'essai'].includes(k)) return `clé en trop : ${k}`
    if (typeof c.commande !== 'string' || !UUID.test(c.commande)) return 'commande invalide'
    if ('essai' in c && c.essai !== true) return 'essai invalide'
    return null
  },
}

export default CAPACITES
