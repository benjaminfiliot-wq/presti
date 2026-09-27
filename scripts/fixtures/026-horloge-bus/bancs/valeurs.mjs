// Banc du contrôle « reutilise » de scripts/juges-026-horloge-bus-preuve.mjs (026-009). Lancé dans un processus à part : il
// importe le module source (BANC_SOURCE) et rend, pour chaque nom de BANC_NOMS, son type et son texte (la valeur d'une
// chaîne, le code d'une fonction), pour que la preuve cherche une recopie. Avec BANC_FICHIER (identité demandée), il
// importe aussi le fichier jugé et dit, pour chaque nom qu'il exporte, s'il est LE MÊME objet que celui de la source.
// Dernière ligne : « RESULTAT <BANC_NONCE> {…} ».
import { pathToFileURL } from 'node:url'

const E = process.env
// le jeton du résultat est lu puis ôté de l'environnement AVANT l'import du code jugé : il ne peut pas le recopier
const NONCE = E.BANC_NONCE
delete process.env.BANC_NONCE
const fin = (o) => { console.log(`RESULTAT ${NONCE} ${JSON.stringify(o)}`); process.exit(0) }
const noms = String(E.BANC_NOMS || '').split(',').filter(Boolean)
let src, fic = null
try { src = await import(pathToFileURL(E.BANC_SOURCE).href) } catch (e) { fin({ erreur: `import de la source : ${String(e.message).slice(0, 120)}` }) }
if (E.BANC_FICHIER) { try { fic = await import(pathToFileURL(E.BANC_FICHIER).href) } catch (e) { fin({ erreur: `import du fichier jugé : ${String(e.message).slice(0, 120)}` }) } }
const valeurs = {}, identite = {}
for (const n of noms) {
  const v = src[n]
  valeurs[n] = { type: typeof v, texte: typeof v === 'function' ? Function.prototype.toString.call(v) : typeof v === 'string' ? v : null }
  if (fic && n in fic) identite[n] = fic[n] === v
}
fin({ valeurs, identite })
