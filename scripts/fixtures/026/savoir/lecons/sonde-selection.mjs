// scripts/fixtures/026/savoir/lecons/sonde-selection.mjs — sonde du juge savoir-lecons-qa (fiche 026-234, Claude Code).
// Lancée par le juge : node --experimental-strip-types --import <ts-loader> <ce fichier> <config.json>, cwd = la racine
// jugée. Importe lib/agents/lecons.ts (et lib/agents/moteurs.ts s'il existe) de CETTE racine, appelle ses fonctions sur
// les cas de la configuration et écrit les résultats BRUTS dans config.sortie : le juge calcule lui-même ce qui est
// attendu, jamais la sonde. Aucune écriture hors config.sortie.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const out = { nonce: cfg.nonce, exports: {}, erreurs: [], pour: {}, synth: {}, consignes: {} }
const essai = (nom, f) => { try { return f() } catch (e) { out.erreurs.push(`${nom} : ${e?.message || e}`); return undefined } }
const geleProfond = (v) => {
  if (v === null || typeof v !== 'object') return true
  if (!Object.isFrozen(v)) return false
  return Object.values(v).every(geleProfond)
}
const ids = (l) => (Array.isArray(l) ? l.map((x) => x?.id) : l)

let M = null
try { M = await import(pathToFileURL(cfg.module).href) } catch (e) { out.erreurImport = `import ${cfg.module} : ${e?.message || e}` }
if (M) {
  for (const n of ['DOMAINES', 'LECONS_DE', 'lireLecons', 'leconsPour', 'consigneAvecLecons']) out.exports[n] = n in M ? (Array.isArray(M[n]) ? 'array' : typeof M[n]) : 'absent'
  out.DOMAINES = M.DOMAINES
  out.domainesGele = geleProfond(M.DOMAINES)
  out.LECONS_DE = M.LECONS_DE
  out.leconsDeGele = geleProfond(M.LECONS_DE)
  const lu = essai('lireLecons', () => M.lireLecons(cfg.dossierEssai))
  out.lire = lu ? { ids: ids(lu.lecons), ignorees: lu.ignorees } : null
  const lecons = lu?.lecons || []
  for (const agent of cfg.agents) out.pour[agent] = essai(`leconsPour(${agent})`, () => ids(M.leconsPour(agent, lecons)))
  for (const c of cfg.synthetiques) out.synth[c.nom] = essai(`leconsPour(${c.nom})`, () => ids(c.options ? M.leconsPour(c.agent, c.lecons, c.options) : M.leconsPour(c.agent, c.lecons)))
  for (const c of cfg.consignes) {
    const choisies = c.ids ? c.ids.map((id) => lecons.find((l) => l.id === id)).filter(Boolean) : []
    out.consignes[c.nom] = essai(`consigneAvecLecons(${c.nom})`, () => [M.consigneAvecLecons(c.systeme, choisies), M.consigneAvecLecons(c.systeme, choisies), choisies.length])
  }
}
if (cfg.moteurs) {
  try { const X = await import(pathToFileURL(cfg.moteurs).href); out.moteurDe = X.MOTEUR_DE ? Object.keys(X.MOTEUR_DE) : null } catch (e) { out.erreurs.push(`import moteurs : ${e?.message || e}`) }
}
fs.writeFileSync(cfg.sortie, JSON.stringify(out))
