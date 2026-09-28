// scripts/fixtures/026/pont/faux-bus-pont.mjs — le faux bus du PONT (026-160), écrit en 026-142.
//
// Le faux bus du chef (scripts/fixtures/026/chef/faux-bus.mjs, 026-102) ne porte pas les routes que le pont
// appelle (`taches/prendre`, `taches/<id>/rendre`) : ce petit serveur les porte, au même contrat que les routes
// réelles (app/api/agents/taches/prendre, app/api/agents/taches/[id]/rendre, app/api/agents/evenements,
// app/api/agents/battement — lues en lecture seule pour ce contrat). Il compte ce qu'il REÇOIT, jamais ce qu'un
// script dit avoir envoyé.
//
//   demarrerFauxBusPont({ jeton, taches, ... }) → { base, port, requetes, evenementsPostes, tachesRendues,
//     battements, arreter, fixer(changements) }
//
// Scénarios (fixer ou options d'ouverture) :
//   taches         file FIFO des tâches rendues par POST …/taches/prendre (objets du contrat 026-160 §prendre) ;
//   mode401        toute requête authentifiée normalement → 401 quand même (jeton refusé) ;
//   mode423        POST …/taches/prendre → 423 « agent_en_pause » (les autres routes répondent normalement) ;
//   mode429Apres   après ce nombre de requêtes reçues (authentifiées), 429 sur tout le reste du passage ;
//   refuserEvenements   POST …/evenements → 400 systématique (teste PO-9 : événement refusé ⇒ tâche non rendue) ;
//   evenementsEnCode    { verdict: 'proposition_rangee', 'verdict': 'verdict' } code numérique custom pour l'id rendu.
import http from 'node:http'
import crypto from 'node:crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const signes = (s) => [...s].length

export async function demarrerFauxBusPont(options = {}) {
  const etat = {
    jeton: options.jeton,
    taches: [...(options.taches || [])],
    mode401: Boolean(options.mode401),
    mode423: Boolean(options.mode423),
    mode429Apres: options.mode429Apres ?? null,
    refuserEvenements: Boolean(options.refuserEvenements),
    delaiMs: options.delaiMs ?? 0, // ralentit chaque réponse (PO-5, verrou : laisse le temps à un second passage de le trouver)
  }
  if (!etat.jeton) throw new Error('faux bus du pont : jeton requis')
  const requetes = []           // toutes les requêtes reçues, dans l'ordre
  const tachesRendues = []      // { id, corps, le }
  const evenementsPostes = []   // { id, corps, le }
  let battements = 0
  let prochainEvenementId = 1

  const serveur = http.createServer((req, res) => {
    const morceaux = []
    let taille = 0
    req.on('data', (d) => { taille += d.length; if (taille <= 32 * 1024) morceaux.push(d) })
    req.on('end', () => {
      const url = new URL(req.url, 'http://127.0.0.1')
      const auth = req.headers.authorization
      const brut = Buffer.concat(morceaux).toString('utf8')
      let corps = null
      let illisible = false
      if (brut.trim()) { try { corps = JSON.parse(brut) } catch { illisible = true } }
      const ligne = { n: requetes.length + 1, le: new Date().toISOString(), t: Date.now(), methode: req.method, chemin: url.pathname, jeton: !auth ? 'absent' : auth === `Bearer ${etat.jeton}` ? 'bon' : 'faux', corps: illisible ? { illisible: true } : corps }
      requetes.push(ligne)
      const repondre = (statut, json) => {
        ligne.statut = statut
        ligne.reponse = json
        const envoyer = () => { res.writeHead(statut, { 'content-type': 'application/json; charset=utf-8' }); res.end(json === undefined ? '' : JSON.stringify(json)) }
        if (etat.delaiMs > 0) setTimeout(envoyer, etat.delaiMs); else envoyer()
      }
      if (ligne.jeton !== 'bon') return repondre(401, { error: 'jeton', code: 'jeton' })
      if (etat.mode401) return repondre(401, { error: 'jeton', code: 'jeton' })
      if (etat.mode429Apres !== null && ligne.n > etat.mode429Apres) return repondre(429, { error: 'quota', code: 'quota' })
      if (illisible) return repondre(400, { error: 'json_invalide', code: 'json_invalide' })
      const cle = `${req.method} ${url.pathname}`

      if (cle === 'POST /api/agents/taches/prendre') {
        if (etat.mode423) return repondre(423, { error: 'agent_en_pause', code: 'agent_en_pause' })
        const t = etat.taches.shift()
        if (!t) { ligne.statut = 204; ligne.reponse = null; res.writeHead(204); return res.end() }
        return repondre(200, t)
      }
      const rendre = /^\/api\/agents\/taches\/([^/]+)\/rendre$/.exec(url.pathname)
      if (rendre && req.method === 'POST') {
        const id = rendre[1]
        if (!UUID_RE.test(id)) return repondre(400, { error: 'id_invalide', code: 'id_invalide' })
        if (!estObjet(corps) || !['faite', 'echec'].includes(String(corps.resultat)) ||
          (corps.preuve_url !== undefined && corps.preuve_url !== null && typeof corps.preuve_url !== 'string') ||
          (corps.erreur !== undefined && corps.erreur !== null && typeof corps.erreur !== 'string')) {
          return repondre(400, { error: 'corps_invalide', code: 'corps_invalide' })
        }
        tachesRendues.push({ id, corps, le: ligne.le, t: ligne.t })
        return repondre(200, { ok: true })
      }
      if (cle === 'POST /api/agents/evenements') {
        if (!estObjet(corps) || typeof corps.type !== 'string' || !corps.type.trim() ||
          typeof corps.resume !== 'string' || !corps.resume.trim() || signes(corps.resume) > 200 ||
          (corps.objet !== undefined && corps.objet !== null && typeof corps.objet !== 'string') ||
          (corps.tache !== undefined && corps.tache !== null && typeof corps.tache !== 'string')) {
          return repondre(400, { error: 'corps_invalide', code: 'corps_invalide' })
        }
        if (etat.refuserEvenements) return repondre(400, { error: 'refuse_pour_essai', code: 'refuse_pour_essai' })
        const id = prochainEvenementId++
        evenementsPostes.push({ id, corps, le: ligne.le, t: ligne.t })
        return repondre(201, { id })
      }
      if (cle === 'POST /api/agents/battement') {
        battements++
        return repondre(200, { le: new Date().toISOString() })
      }
      return repondre(404, { error: 'route', code: 'route' })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const port = serveur.address().port
  return {
    port,
    base: `http://127.0.0.1:${port}`,
    requetes,
    tachesRendues,
    evenementsPostes,
    battements: () => battements,
    ecritures: () => requetes.filter((r) => r.methode !== 'GET'),
    fixer(changements) { Object.assign(etat, changements) },
    pousserTache(t) { etat.taches.push(t) },
    fermer: () => new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) }),
  }
}

/** L'autocontrôle « --temoin » de PO-2/PO-9 : un corps de `rendre` au mauvais nom de champ doit être refusé. */
export async function autocontroleCorpsRefuse() {
  const bus = await demarrerFauxBusPont({ jeton: 'jeton-temoin-autocontrole', taches: [] })
  try {
    const id = crypto.randomUUID()
    const r = await fetch(`${bus.base}/api/agents/taches/${id}/rendre`, {
      method: 'POST',
      headers: { authorization: `Bearer jeton-temoin-autocontrole`, 'content-type': 'application/json' },
      body: JSON.stringify({ resultat_mal_nomme: 'faite' }), // le contrat attend `resultat`, pas `resultat_mal_nomme`
    })
    return r.status === 400
  } finally {
    await bus.fermer()
  }
}
