// Banc du contrôle « horloge-simulee » de scripts/juges-026-horloge-bus-preuve.mjs (026-009). Lancé dans un processus à
// part, fuseau TZ=UTC : il importe l'horloge à juger (BANC_MODULE), appelle figer(BANC_FIGER), lit l'heure de Paris par Intl,
// Date.now(), new Date() et performance.now(), puis avancer(BANC_AVANCER_MS) et relit. Il rend les mesures sur sa dernière
// ligne « RESULTAT <BANC_NONCE> {…} » ; c'est la preuve qui les juge. BANC_SABOTAGE n'est lu que par le témoin.
import { pathToFileURL } from 'node:url'

const E = process.env
// le jeton du résultat est lu puis ôté de l'environnement AVANT l'import du code jugé : il ne peut pas le recopier
const NONCE = E.BANC_NONCE
delete process.env.BANC_NONCE
const fin = (o) => { console.log(`RESULTAT ${NONCE} ${JSON.stringify(o)}`); process.exit(0) }
let mod
try { mod = await import(pathToFileURL(E.BANC_MODULE).href) } catch (e) { fin({ erreur: `import : ${String(e.message).slice(0, 120)}` }) }
if (typeof mod.figer !== 'function' || typeof mod.avancer !== 'function') fin({ erreur: 'figer et avancer doivent être exportées' })
try {
  mod.figer(E.BANC_FIGER)
  const paris = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  const now0 = Date.now(), neuf0 = new Date().getTime(), p0 = performance.now()
  await mod.avancer(Number(E.BANC_AVANCER_MS))
  const now1 = Date.now(), neuf1 = new Date().getTime(), p1 = performance.now()
  fin({ paris, now0, dNow: now1 - now0, dNew: neuf1 - neuf0, dPerf: p1 - p0, ecartNew: neuf0 - now0 })
} catch (e) { fin({ erreur: String(e.message).slice(0, 160) }) }
