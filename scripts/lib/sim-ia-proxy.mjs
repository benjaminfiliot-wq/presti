// scripts/lib/sim-ia-proxy.mjs — le compteur d'appels IA de la simulation générale.
//
// Le serveur local de la simulation reçoit ANTHROPIC_BASE_URL = ce proxy. Chaque appel au modèle passe ici :
//   · en mode « réel » (basculé par le script, pour deux parcours précis) ET tant que le plafond n'est pas atteint
//     (REELS_MAX = 2 pour toute la simulation) : l'appel est transmis à l'API Anthropic, pour de vrai ;
//   · sinon : une réponse SIMULÉE de même forme (un devis JSON si le prompt le demande, un texte sinon), sans réseau.
// Le journal dit, appel par appel, ce qui était réel et ce qui était simulé : le rapport l'affiche tel quel.
import http from 'node:http'

export async function demarrerProxyIA({ reelsMax = 2, port = 0 } = {}) {
  const etat = { reel: false, permis: 0, reelsUtilises: 0, marqueur: null, journal: [] }
  const srv = http.createServer(async (req, res) => {
    const morceaux = []
    for await (const c of req) morceaux.push(c)
    const brut = Buffer.concat(morceaux)
    if (req.method !== 'POST' || !/\/v1\/messages/.test(req.url)) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"sim"}'); return }
    let corps = {}
    try { corps = JSON.parse(brut.toString('utf8')) } catch { /* corps illisible */ }
    const sys = typeof corps.system === 'string' ? corps.system : JSON.stringify(corps.system ?? '')
    const dernier = (corps.messages ?? []).slice(-1)[0]
    const note = String(typeof dernier?.content === 'string' ? dernier.content : JSON.stringify(dernier?.content ?? '')).replace(/\s+/g, ' ').slice(0, 80)
    const resume = { outils: (corps.tools ?? []).length, modele: corps.model, note, contientMarqueur: !!etat.marqueur && brut.toString('utf8').includes(etat.marqueur) }

    if (etat.reel && etat.permis > 0 && etat.reelsUtilises < reelsMax) {
      etat.permis--
      etat.reelsUtilises++
      etat.journal.push({ mode: 'reel', ...resume })
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': String(req.headers['x-api-key'] || ''), 'anthropic-version': String(req.headers['anthropic-version'] || '2023-06-01') },
          body: brut,
        })
        const t = await r.text()
        res.writeHead(r.status, { 'content-type': 'application/json' }); res.end(t)
      } catch (e) {
        res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: String(e) } }))
      }
      return
    }

    etat.journal.push({ mode: 'simule', ...resume })
    // L'assistant de gestion (appel avec des outils) : un « modèle » scripté, pour que la boucle réelle (outils, carte, confirmation)
    // soit jouée par le vrai code du serveur sans appel payant. Message « Envoie le devis DEV-… » → outil envoyer_devis ; retour d'outil → conclusion.
    if (Array.isArray(corps.tools) && corps.tools.length) {
      const msgs = corps.messages ?? []
      const dernierMsg = msgs[msgs.length - 1]
      const resultatOutil = Array.isArray(dernierMsg?.content) && dernierMsg.content.some((b) => b.type === 'tool_result')
      const premier = msgs.find((m) => m.role === 'user')
      const texteUser = typeof premier?.content === 'string' ? premier.content : JSON.stringify(premier?.content ?? '')
      const numero = /Envoie le devis (DEV-\d{4}-\d{4})/.exec(texteUser)?.[1]
      res.writeHead(200, { 'content-type': 'application/json' })
      if (numero && !resultatOutil) {
        res.end(JSON.stringify({ id: 'msg_sim_t' + etat.journal.length, type: 'message', role: 'assistant', model: corps.model || 'claude-sim', stop_reason: 'tool_use', stop_sequence: null,
          content: [{ type: 'tool_use', id: 'toolu_sim_' + etat.journal.length, name: 'envoyer_devis', input: { numero } }], usage: { input_tokens: 10, output_tokens: 20 } }))
      } else {
        res.end(JSON.stringify({ id: 'msg_sim_f' + etat.journal.length, type: 'message', role: 'assistant', model: corps.model || 'claude-sim', stop_reason: 'end_turn', stop_sequence: null,
          content: [{ type: 'text', text: numero ? `J’ai préparé l’envoi du devis ${numero} : vérifiez la carte, rien ne part avant votre confirmation.` : 'Bonjour, que puis-je faire pour vous ?' }], usage: { input_tokens: 10, output_tokens: 20 } }))
      }
      return
    }
    let texte
    if (/"lignes"/.test(sys)) {
      texte = JSON.stringify({
        lignes: [
          { designation: 'Dépose et évacuation de l’existant', quantite: 1, unite: 'forfait', prix_unitaire_ht: 180, tva_taux: 10, source_prix: 'estimation' },
          { designation: 'Fourniture et pose (réponse simulée)', quantite: 8, unite: 'm²', prix_unitaire_ht: 45, tva_taux: 10, source_prix: 'estimation' },
        ],
        note: 'Réponse SIMULÉE par la simulation générale : estimations HT à confirmer après visite.',
      })
    } else texte = 'Bonjour, merci pour votre message. Pouvez-vous me préciser l’adresse du chantier et vos disponibilités ? Je reviens vers vous très vite avec une proposition.'
    const modele = corps.model || 'claude-sim'
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      id: 'msg_sim_' + etat.journal.length, type: 'message', role: 'assistant', model: modele,
      content: [{ type: 'text', text: texte }], stop_reason: 'end_turn', stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 20 },
    }))
  })
  await new Promise((ok) => srv.listen(port, '127.0.0.1', ok))
  return {
    url: `http://127.0.0.1:${srv.address().port}`,
    etat,
    /** Active/désactive la transmission réelle. Le plafond (reelsMax) reste valable pour toute la simulation. */
    /** Autorise `n` appels réels (dans la limite globale reelsMax) ; 0 revient au tout-simulé. */
    autoriser: (n) => { etat.reel = n > 0; etat.permis = n },
    marqueur: (m) => { etat.marqueur = m },
    fermer: () => new Promise((ok) => srv.close(() => ok())),
  }
}
