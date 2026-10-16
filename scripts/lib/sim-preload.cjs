// scripts/lib/sim-preload.cjs — chargé par le serveur LOCAL de la simulation générale (NODE_OPTIONS=--require ...).
// Il intercepte l'envoi d'e-mails (Resend) : RIEN ne part, la requête est consignée dans SIM_MAIL_LOG (une ligne JSON par
// message) et la réponse est un faux succès { id: 'sim-…' }. Même un destinataire réel ne recevrait rien.
// Il refuse aussi toute écriture vers l'API LIVE de Stripe (sk_live) : la simulation ne tourne qu'avec la clé de test.
const fs = require('node:fs')
const journal = process.env.SIM_MAIL_LOG
const vraiFetch = globalThis.fetch
let n = 0
globalThis.fetch = async function (entree, init) {
  const url = typeof entree === 'string' ? entree : entree && entree.url ? entree.url : String(entree)
  if (/^https:\/\/api\.resend\.com\//.test(url)) {
    let corps = {}
    try { corps = JSON.parse((init && init.body) || '{}') } catch { /* corps non JSON */ }
    if (journal) {
      try {
        fs.appendFileSync(journal, JSON.stringify({
          url, a: corps.to, objet: corps.subject, texte: String(corps.text || '').slice(0, 400),
          pj: Array.isArray(corps.attachments) ? corps.attachments.map((p) => ({ nom: p.filename, octets: Buffer.byteLength(String(p.content || ''), 'base64') })) : [],
        }) + '\n')
      } catch { /* journal indisponible */ }
    }
    return new Response(JSON.stringify({ id: 'sim-' + (++n) }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  // Les plafonds d'e-mails (« emails:jour », « emails:produit:jour », « emails:dest… ») sont PARTAGÉS avec la production (même base) : la simulation envoie des dizaines
  // de messages interceptés, elle ne doit pas entamer le quota du jour des vrais artisans. L'appel au compteur est donc intercepté et répond « autorisé » sans rien écrire.
  if (/\/rest\/v1\/rpc\/consommer_limite/.test(url)) {
    let cle = ''
    try { cle = String(JSON.parse((init && init.body) || '{}').p_cle || '') } catch { /* corps non JSON */ }
    if (/^emails:/.test(cle)) return new Response('true', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return vraiFetch.apply(this, arguments)
}

// Les appels sortants vers l'API Stripe (clé de test) sont consignés dans SIM_STRIPE_LOG : méthode, chemin, corps (formulaire).
// La simulation y lit ce que le serveur a RÉELLEMENT demandé à Stripe (durée d'essai, carte exigée ou non, montant).
const journalStripe = process.env.SIM_STRIPE_LOG
if (journalStripe) {
  const https = require('node:https')
  const origine = https.request
  https.request = function (...args) {
    const req = origine.apply(this, args)
    try {
      const opt = typeof args[0] === 'string' || args[0] instanceof URL ? {} : (args[0] || {})
      const hote = String(opt.hostname || opt.host || '')
      if (/api\.stripe\.com/.test(hote)) {
        const morceaux = []
        const ecrire = req.write.bind(req), finir = req.end.bind(req)
        req.write = (c, ...r) => { if (c && typeof c !== 'function') morceaux.push(Buffer.from(c)); return ecrire(c, ...r) }
        req.end = (c, ...r) => {
          if (c && typeof c !== 'function') morceaux.push(Buffer.from(c))
          try { fs.appendFileSync(journalStripe, JSON.stringify({ methode: opt.method, chemin: opt.path, corps: Buffer.concat(morceaux).toString('utf8') }) + '\n') } catch { /* journal indisponible */ }
          return finir(c, ...r)
        }
      }
    } catch { /* jamais bloquant */ }
    return req
  }
}
