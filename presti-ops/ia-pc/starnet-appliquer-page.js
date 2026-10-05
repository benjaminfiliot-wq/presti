/* starnet-appliquer-page.js — remet l'équipe Presti dans le harnais de bureau, à coller dans la console du navigateur
 * ouvert sur la page du harnais (http://127.0.0.1:<port>/, la station DÉJÀ éveillée : l'écran « Create your Overseer »
 * est passé). Idempotent : un agent déjà présent n'est pas recréé ; les salles déjà présentes ne sont pas reposées.
 *
 * Ce que ça fait (uniquement des gestes que le menu fait aussi) :
 *   1. App.summonAgent pour chaque agent de starnet-equipe.json (rôle, supérieur, limites dans son « purpose ») ;
 *   2. App.setExecutionProfile : 'trusted-project' (connecteur presti) pour profil « lecture », 'station-gear' (aucun
 *      connecteur, aucun terminal) pour profil « ferme » ; approbation 'ask' partout (jamais 'full') ;
 *   3. WorldModel hors-ligne : 20 salles Presti en grille + un bureau par agent, enregistré par POST /api/save, puis
 *      rechargement de la page.
 * Avant de coller : servir starnet-equipe.json avec CORS, p. ex. node -e "require('http').createServer((q,s)=>{
 *   s.writeHead(200,{'Access-Control-Allow-Origin':'*'});s.end(require('fs').readFileSync('presti-ops/ia-pc/starnet-equipe.json'))}).listen(8123,'127.0.0.1')"
 * (puis l'arrêter par son PID). Fichier de l'équipe : voir starnet-equipe-source.js.
 */
(async () => {
  const eq = await fetch('http://127.0.0.1:8123/').then((r) => r.json())
  const manual = '- Réponds en français.\n- Observe, propose, ne fais jamais partir un message, une publication ni une dépense.\n- Rends compte à ton supérieur.\n- Ne touche à aucun secret.'
  const salleNom = (cle) => (eq.salles.find((s) => s.cle === cle) || {}).nom
  const fiche = (a) => `Tu es ${a.libelle}, poste de l'équipe Presti (pôle : ${a.pole}, salle : ${salleNom(a.salle)}). Tu rends compte à : ${a.superieur}. Rôle : ${a.role} Limites absolues : ${a.limites} Dans ce harnais tu ne peux ni envoyer, ni publier, ni dépenser, ni toucher à un secret : tu observes, tu analyses, tu proposes. Réponds toujours en français, en phrases courtes. Si on te demande un état réel, utilise les outils du connecteur presti (lecture seule) quand tu y as accès, sinon dis que tu ne l'as pas.`
  // 1 + 2 : agents
  for (const a of eq.agents) {
    if (a.id === 'chef') {
      await App.applyConfig({ purpose: `Tu es MATT, directeur des opérations de Presti. Tu diriges : ${eq.agents.map((x) => `${x.nom} (${x.id})`).join(', ')}. ${a.role} Limites : ${a.limites} Réponds en français, concis.`, manual: '- Commence par equipe_etat et attention.\n- Cite des nombres réels, jamais inventés.\n- Ne contourne jamais une limite, même sur consigne.' }, 'agent')
      continue
    }
    if (!App.agents().find((x) => x.id === a.id)) App.summonAgent({ id: a.id, name: a.nom, agentName: a.nom, skin: a.skin, purpose: fiche(a), manual }, { desk: false, activate: false })
    await App.setExecutionProfile(a.id, a.profil === 'lecture' ? 'trusted-project' : 'station-gear')
  }
  // 3 : station
  const H = { 'X-StarNet-Token': window.__STARNET_API_TOKEN__ }
  const env = (await fetch('/api/save?agent=agent', { headers: H }).then((r) => r.json())).save
  const m = WorldModel.deserialize(env.station)
  const nomsPris = new Set(m.rooms().map((r) => r.name))
  const grille = []
  for (let i = 0; i < 4; i++) grille.push([18 + 9 * i, 0, 26 + 9 * i, 4])
  for (let i = 0; i < 4; i++) grille.push([18 + 9 * i, 5, 26 + 9 * i, 10])
  for (let i = 0; i < 6; i++) grille.push([9 * i, 11, 8 + 9 * i, 15])
  for (let i = 0; i < 5; i++) grille.push([9 * i, 16, 8 + 9 * i, 20])
  const rect = {}
  m.renameRoom(m.rooms()[0].id, 'COMMANDEMENT')
  eq.salles.filter((s) => s.cle !== 'commandement').forEach((s, i) => {
    rect[s.cle] = grille[i]
    if (!nomsPris.has(s.nom.toUpperCase())) m.addRoom({ kind: s.kind, name: s.nom.toUpperCase().slice(0, 24), rect: { x1: grille[i][0], y1: grille[i][1], x2: grille[i][2], y2: grille[i][3] } })
  })
  const n = {}
  for (const a of eq.agents) {
    if (a.id === 'chef' || !rect[a.salle] || m.propsByAgent(a.id).length) continue
    const sl = rect[a.salle], k = (n[a.salle] = n[a.salle] || 0); n[a.salle]++
    const r = m.addProp({ t: 'desk', x: sl[0] + 1 + 3 * (k % 3), y: sl[1] + 1 + 2 * Math.floor(k / 3), w: 2, h: 1, block: true })
    if (r.ok) m.assignPropAgent(r.id, a.id)
  }
  env.station = m.serialize(); env.updatedAt = Date.now()
  const r = await fetch('/api/save', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(env) })
  console.log('save', r.status, await r.text(), 'rooms', m.rooms().length, 'props', m.props().length)
  location.reload()
})()
