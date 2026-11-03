// JUGE de 036-015 : les trois gabarits OUTILLÉS du terrain (OUTILLAGE.md § 5, lignes 5 à 7) — Après-chantier et réputation, Opérations, Direction.
// Hors ligne : aucun réseau, aucune base, aucun modèle. Il lit les exports et les essais rapatriés dans .orchestre/preuves/036-015 (ou le dossier donné en argument).
//   1. STRUCTURE : les vrais nœuds des outils sont là ; les agents sont conformes (Claude, un parseur à schéma manuel, des outils qui ne font que lire, sortie revalidée
//      par un Code) ; aucun effet n'est atteignable sans la sortie « faux » de la porte « simulation » ; aucun identifiant ; aucun webhook ; une note sur chaque nœud d'outil ;
//      la marque blanche ; l'idempotence par clé ; le filtre du compte.
//   2. REJEU : chaque nœud Code est rejoué sur les données épinglées des essais n8n (test_workflow) ; sa sortie doit être celle que n8n a rendue.
//   3. INVARIANTS sur chaque essai et sur des cas HORS LIGNE joués par ce juge (pas par n8n, dits comme tels) : un avis négatif ne part jamais seul, un créneau vient de l'agenda lu,
//      un rendez-vous ne se pose qu'après le choix du client, une commande reste un brouillon, un chiffre de la page vient du code.
//   4. MUTANTS : chacun doit faire rougir le juge, pour sa raison. Il rejoue aussi la garde commune scripts/n8n-specs-qa.mjs sur le dossier.
//   node scripts/gabarits-terrain-qa.mjs [dossier]
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv[2] || '.orchestre/preuves/036-015')
const lire = (f) => readFileSync(path.join(DOSSIER, f), 'utf8')
const NOMS = { apres: 'gabarit-artisan-apres', operations: 'gabarit-artisan-operations', direction: 'gabarit-artisan-direction' }

// Les deux textes de la plateforme, CHARGÉS dans leur source (jamais recopiés).
const MENTION = (() => { const m = /Message rédigé et envoyé automatiquement par l’assistant/.exec(readFileSync(path.join(RACINE, 'lib/mentionAssistant.ts'), 'utf8')); if (!m) throw new Error('mention introuvable dans lib/mentionAssistant.ts'); return m[0] })()
const PIED_APRES = (() => { const m = /export const PIED_APRES = '([^']+)'/.exec(readFileSync(path.join(RACINE, 'lib/apresChantier.ts'), 'utf8')); if (!m) throw new Error('PIED_APRES introuvable dans lib/apresChantier.ts'); return m[1] })()

const copie = (o) => JSON.parse(JSON.stringify(o))
const B = (t) => `n8n-nodes-base.${t}`
const LC = (t) => `@n8n/n8n-nodes-langchain.${t}`
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i
const TYPES_ENVOI = new Set(['gmail', 'microsoftOutlook', 'emailSend', 'whatsApp', 'telegram', 'twilio', 'slack'].map(B))
const OUTILS_NATIFS = ['gmail', 'microsoftOutlook', 'emailSend', 'googleCalendar', 'googleDrive', 'googleSheets', 'googleBusinessProfile', 'microsoftOneDrive', 'microsoftExcel', 'microsoftTeams', 'whatsApp', 'telegram', 'twilio', 'slack']
const AGENT = LC('agent')
const estEffet = (n) => (OUTILS_NATIFS.includes(n.type.replace(/^n8n-nodes-base\./, '')) && !(typeof n.parameters?.operation === 'string' && LECTURES.test(n.parameters.operation)))
  || n.type === AGENT || (n.type === B('httpRequest') && String(n.parameters?.method ?? 'GET').toUpperCase() !== 'GET')

// ─── Le graphe ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, liste]) => (liste || []).flatMap((sortie, i) => (sortie || []).filter(Boolean).map((l) => ({ vers: l.node, genre, sortie: i }))))
const parNom = (wf, nom) => wf.nodes.find((n) => n.name === nom)
function atteintSansPorte(wf) {
  const portes = new Set(wf.nodes.filter((n) => /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? ''))).map((n) => n.name))
  const file = wf.nodes.filter((n) => /Trigger$/.test(n.type)).map((n) => n.name), vus = new Set()
  while (file.length) {
    const x = file.shift(); if (vus.has(x)) continue; vus.add(x)
    for (const a of aretes(wf, x)) if (a.genre === 'main' && !(portes.has(x) && a.sortie === 1)) file.push(a.vers)
  }
  return { vus, portes }
}
const remonte = (wf, nom) => wf.nodes.flatMap((n) => aretes(wf, n.name).filter((a) => a.genre === 'main' && a.vers === nom).map((a) => ({ de: n.name, sortie: a.sortie })))

// ─── 1. La structure ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Ce que chaque gabarit DOIT porter : des vrais nœuds d'outils (type, ressource, opération).
const REQUIS = {
  apres: [[B('googleBusinessProfile'), 'review', 'getAll'], [B('googleBusinessProfile'), 'review', 'reply'], [B('googleBusinessProfileTool'), 'review', 'getAll'], [B('gmail'), 'message', 'send'], [B('whatsApp'), 'message', 'send'], [B('emailSend')], [LC('toolWorkflow')]],
  operations: [[B('googleCalendar'), 'calendar', 'availability'], [B('googleCalendar'), 'event', 'create'], [B('googleCalendarTool'), 'calendar', 'availability'], [B('microsoftOutlook'), 'event', 'getAll'], [B('microsoftOutlook'), 'event', 'create'],
    [B('microsoftOutlook'), 'draft', 'create'], [B('microsoftOutlookTool'), 'event', 'getAll'], [B('googleDrive'), 'folder', 'create'], [B('googleDrive'), 'file', 'move'], [B('googleDriveTrigger')], [B('microsoftOneDrive'), 'folder', 'create'],
    [B('microsoftOneDrive'), 'file', 'move'], [B('googleSheets'), 'sheet', 'read'], [B('microsoftExcel'), 'worksheet', 'readRows'], [B('gmail'), 'draft', 'create'], [B('telegram'), 'message', 'sendMessage'], [B('whatsApp'), 'message', 'send'], [B('twilio'), 'sms', 'send']],
  direction: [[B('telegram'), 'message', 'sendMessage'], [B('whatsApp'), 'message', 'send'], [B('gmail'), 'message', 'send'], [B('slack'), 'message', 'post'], [B('microsoftTeams'), 'chatMessage', 'create'], [B('googleSheets'), 'sheet', 'append'], [LC('toolWorkflow')]],
}
const AGENTS = { apres: ['Préparateur de réponses'], operations: ['Planificateur', 'Gardien du stock', 'Archiviste'], direction: ['Rédacteur de la page', 'Rédacteur du rapport'] }
const CIBLE_EFFET = { apres: 'Répondre sur la fiche Google', operations: 'Poser le rendez-vous dans Google Agenda', direction: 'Page par Telegram' }

function structure(cle, wf) {
  const e = []
  const ko = (m) => e.push(m)
  if (wf.active !== false || wf.activeVersionId) ko('actif ou publié : un gabarit est INACTIF')
  for (const n of wf.nodes) {
    if (n.credentials && Object.keys(n.credentials).length) ko(`${n.name} : identifiant branché (${Object.keys(n.credentials).join(', ')}) : un gabarit n'en porte aucun`)
    if (/webhook/i.test(n.type) || (/Trigger$/.test(n.type) && ![B('scheduleTrigger'), B('googleDriveTrigger')].includes(n.type))) ko(`${n.name} : déclencheur à webhook ou hors liste (${n.type}) : n8n n'est pas exposé`)
  }
  // les vrais outils
  for (const [type, ressource, op] of REQUIS[cle]) {
    const ok = wf.nodes.some((n) => n.type === type && (!ressource || n.parameters?.resource === ressource) && (!op || n.parameters?.operation === op))
    if (!ok) ko(`outil absent : ${type.replace(/^.*\./, '')}${ressource ? ` · ${ressource} · ${op}` : ''}`)
  }
  // la porte devant chaque effet
  const { vus, portes } = atteintSansPorte(wf)
  if (portes.size !== 1) ko(`${portes.size} porte(s) « simulation » (une seule attendue)`)
  for (const p of portes) {
    const n = parNom(wf, p), c = n.parameters?.conditions
    if (n.type !== B('if') || c?.conditions?.length !== 1 || !/\$json\.simulation/.test(String(c.conditions[0].leftValue)) || c.conditions[0].operator?.operation !== 'true' || c.options?.typeValidation !== 'strict') ko(`${p} : porte mal formée`)
  }
  for (const n of wf.nodes) if (estEffet(n) && vus.has(n.name)) ko(`${n.name} : effet atteignable sans passer par la sortie « faux » de la porte « simulation »`)
  // le mode à blanc par défaut
  const compte = parNom(wf, 'Compte et mode')
  if (!compte || !/simulation: true/.test(String(compte.parameters?.jsCode)) || /simulation: false/.test(String(compte.parameters?.jsCode))) ko('« Compte et mode » ne pose pas simulation: true')
  // les agents (R18)
  for (const nom of AGENTS[cle]) {
    const a = parNom(wf, nom)
    if (!a || a.type !== AGENT) { ko(`agent absent : ${nom}`); continue }
    const o = a.parameters?.options ?? {}
    if (!(Number(a.typeVersion) >= 3)) ko(`${nom} : AI Agent 3.x attendu`)
    if (o.passthroughBinaryImages !== false) ko(`${nom} : passthroughBinaryImages doit valoir faux`)
    if (!Number.isInteger(o.maxIterations) || o.maxIterations < 1 || o.maxIterations > 10) ko(`${nom} : maxIterations de 1 à 10`)
    const vers = wf.nodes.flatMap((x) => aretes(wf, x.name).filter((r) => r.vers === nom).map((r) => ({ x, genre: r.genre })))
    const modeles = vers.filter((r) => r.genre === 'ai_languageModel'), parseurs = vers.filter((r) => r.genre === 'ai_outputParser'), outils = vers.filter((r) => r.genre === 'ai_tool')
    if (modeles.length !== 1 || modeles[0].x.type !== LC('lmChatAnthropic')) ko(`${nom} : un seul modèle Claude branché attendu`)
    if (a.parameters?.hasOutputParser !== true || parseurs.length !== 1 || parseurs[0].x.type !== LC('outputParserStructured') || parseurs[0].x.parameters?.schemaType !== 'manual' || parseurs[0].x.parameters?.autoFix === true) ko(`${nom} : un seul parseur structuré à schéma manuel, sans autoFix`)
    if (!outils.length) ko(`${nom} : aucun outil de lecture branché`)
    for (const { x } of outils) {
      const lecture = x.type === LC('toolWorkflow') ? /^\s*outil\s*:\s*lecture\s*$/m.test(String(x.notes ?? '')) : x.type.endsWith('Tool') && typeof x.parameters?.operation === 'string' && LECTURES.test(x.parameters.operation)
      if (!lecture) ko(`${x.name} : outil d'agent qui n'est pas une lecture seule (${x.type}${x.parameters?.operation ? ` · ${x.parameters.operation}` : ''})`)
    }
    const apres = aretes(wf, nom).filter((r) => r.genre === 'main').map((r) => parNom(wf, r.vers))
    if (!apres.length || !apres.every((x) => x?.type === B('code'))) ko(`${nom} : la sortie du modèle doit être revalidée par un Code`)
  }
  // une note sur chaque nœud d'outil
  const OUTIL = /^(n8n-nodes-base\.(google|microsoft|gmail|whatsApp|telegram|twilio|slack|emailSend|httpRequest)|@n8n\/n8n-nodes-langchain\.(agent|lmChat|outputParser|tool))/
  for (const n of wf.nodes) if (OUTIL.test(n.type) && !String(n.notes ?? '').trim()) ko(`${n.name} : un nœud d'outil sans note`)
  // marque blanche : aucun « Presti » dans ce qui part ; la mention de l'assistant en aval du modèle
  for (const n of wf.nodes) {
    const envoi = TYPES_ENVOI.has(n.type) || n.type === B('microsoftTeams') || (n.type === B('googleBusinessProfile') && n.parameters?.operation === 'reply')
    if (envoi && /presti/i.test(JSON.stringify(n.parameters))) ko(`${n.name} : « Presti » dans un message (marque blanche)`)
    const pied = /^\s*pied\s*:\s*(\S+)\s*$/m.exec(String(n.notes ?? ''))?.[1]
    if (envoi && pied === 'mention' && !JSON.stringify(n.parameters).includes(MENTION)) ko(`${n.name} : pied « mention » déclaré, texte absent`)
    if (envoi && pied === 'PIED_APRES' && !JSON.stringify(n.parameters).includes(PIED_APRES)) ko(`${n.name} : pied « PIED_APRES » déclaré, texte absent`)
    // le dépôt dans la plateforme : filtre du compte, clé, doublon ignoré
    if (n.type === B('httpRequest')) {
      const p = n.parameters ?? {}
      if (String(p.method ?? 'GET').toUpperCase() === 'POST') {
        const corps = String(p.jsonBody ?? '')
        if (!/organisation_id/.test(corps)) ko(`${n.name} : dépôt sans organisation_id`)
        if (!/\bcle\b/.test(corps)) ko(`${n.name} : dépôt sans clé d'idempotence`)
        if (!JSON.stringify(p.headerParameters ?? {}).includes('resolution=ignore-duplicates')) ko(`${n.name} : dépôt sans « ignore-duplicates » (un crash créerait un doublon)`)
      } else if (!JSON.stringify(p.queryParameters ?? {}).includes('organisation_id')) ko(`${n.name} : lecture sans filtre du compte`)
    }
  }
  // les invariants de structure propres à chaque gabarit
  const parents = (nom) => remonte(wf, nom)
  if (cle === 'apres') {
    const r = parNom(wf, 'Répondre sur la fiche Google'), p = r && parents(r.name)
    const si = p && p.length === 1 ? parNom(wf, p[0].de) : null
    if (!si || si.name !== 'Publication permise ?' || p[0].sortie !== 0 || !/negatif === false/.test(JSON.stringify(si.parameters)) || !/route === 'publier'/.test(JSON.stringify(si.parameters))) ko('la réponse sur la fiche Google n\'est pas gardée par « Publication permise ? » (route publier ET avis non négatif)')
    for (const nom of ['Demande d’avis par Gmail', 'Demande d’avis par WhatsApp', 'Demande d’avis par SMTP']) if (!wf.nodes.some((n) => n.name === nom)) ko(`${nom} absent`)
    const d = parNom(wf, 'Demande à envoyer ?')
    if (!d || !/route === 'envoyer'/.test(JSON.stringify(d.parameters))) ko('« Demande à envoyer ? » ne garde pas la route envoyer')
    // Le rappel d'entretien est PROPOSÉ, jamais envoyé seul : la ligne du Code qui le décide porte la route « carte » (le même aiguillage le dirigerait vers une carte de toute façon).
    if (!/kind: 'entretien', cle: cleE, route: 'carte'/.test(String(parNom(wf, 'Décider')?.parameters?.jsCode))) ko('« Décider » : le rappel d\'entretien n\'a plus la route « carte » (proposé, jamais envoyé seul)')
  }
  if (cle === 'operations') {
    for (const nom of ['Commande en brouillon Gmail', 'Commande en brouillon Outlook']) {
      const n = parNom(wf, nom)
      if (!n || n.parameters?.resource !== 'draft' || n.parameters?.operation !== 'create') ko(`${nom} : une commande reste un BROUILLON (draft · create), jamais un envoi`)
    }
    const n = wf.nodes.filter((x) => x.type === B('gmail') && x.parameters?.resource === 'message')
    if (n.length) ko(`${n.map((x) => x.name).join(', ')} : un envoi Gmail dans Opérations (les commandes sont des brouillons)`)
    for (const nom of ['Poser le rendez-vous dans Google Agenda', 'Poser le rendez-vous dans Outlook']) {
      const ps = parents(nom), si = ps.length === 1 ? ps[0].de : null
      if (!['Poser sur Outlook ?'].includes(si)) ko(`${nom} : doit suivre « Poser sur Outlook ? »`)
    }
    const pose = parNom(wf, 'Pose permise ?')
    if (!pose || !/route === 'poser'/.test(JSON.stringify(pose.parameters))) ko('« Pose permise ? » ne garde pas la route poser')
    const lecteurs = ['Disponibilité Google Agenda', 'Événements Outlook']
    for (const nom of lecteurs) if (!parNom(wf, nom)) ko(`${nom} : la lecture de l'agenda manque (un créneau vient de l'agenda lu)`)
    const pl = wf.nodes.filter((x) => aretes(wf, x.name).some((r) => r.genre === 'ai_tool' && r.vers === 'Planificateur')).map((x) => x.type)
    if (!pl.includes(B('googleCalendarTool')) || !pl.includes(B('microsoftOutlookTool'))) ko('le Planificateur n\'a pas pour outils la disponibilité Google Agenda ET les événements Outlook')
    const rd = parNom(wf, 'Rappel autorisé ?')
    if (!rd || !/route === 'envoyer'/.test(JSON.stringify(rd.parameters))) ko('« Rappel autorisé ? » ne garde pas la route envoyer')
  }
  if (cle === 'direction') {
    if (!wf.nodes.some((n) => n.type === LC('toolWorkflow') && n.parameters?.workflowId?.value === 'JtGOKOG1ssFP5z1u')) ko('lib-cout-ia (JtGOKOG1ssFP5z1u) n\'est pas branché en outil de lecture')
    const lu = parNom(wf, 'Lire le coût IA')
    if (!lu) ko('le coût IA n\'est pas lu dans la plateforme')
    const horaires = wf.nodes.filter((n) => n.type === B('scheduleTrigger')).map((n) => JSON.stringify(n.parameters))
    if (!horaires.some((h) => /"triggerAtHour":7/.test(h)) || !horaires.some((h) => /"triggerAtHour":8/.test(h) && /"triggerAtDay":\[1\]/.test(h))) ko('7 h chaque jour et lundi 8 h attendus')
    for (const nom of ['Page par Telegram', 'Page par WhatsApp', 'Page par Slack', 'Page par Teams', 'Page par Gmail']) {
      const n = parNom(wf, nom)
      if (n && !JSON.stringify(n.parameters).includes('$json.message')) ko(`${nom} : le texte envoyé ne vient pas de la page revalidée`)
    }
  }
  return e
}

// ─── 2. Le rejeu des nœuds Code ──────────────────────────────────────────────────────────────────────────────────────────────
function executeur(wf, pins) {
  const memo = new Map()
  const parents = (nom) => remonte(wf, nom).map((p) => p.de)
  const items = (nom, pile = []) => {
    if (memo.has(nom)) return memo.get(nom)
    if (pile.includes(nom)) return null
    let r = null
    const n = parNom(wf, nom)
    if (pins[nom]) r = pins[nom].map((j) => j)
    else if (n?.type === B('code')) r = lancer(n, pile.concat(nom))
    else if (n?.type === B('if')) { for (const p of parents(nom)) { const x = items(p, pile.concat(nom)); if (x !== null) { r = x; break } } }
    memo.set(nom, r)
    return r
  }
  const lancer = (n, pile) => {
    let entree = null
    for (const p of parents(n.name)) { const x = items(p, pile); if (x !== null) { entree = x; break } }
    if (entree === null) return null
    const paquet = (arr) => arr.map((j) => ({ json: j }))
    const acces = (nom) => {
      const x = items(nom, pile)
      if (x === null) throw new Error(`Node '${nom}' hasn't been executed`)
      return { first: () => paquet(x)[0], all: () => paquet(x), item: paquet(x)[0] }
    }
    const bac = { $input: { all: () => paquet(entree), first: () => paquet(entree)[0] }, $: acces, console: { log() {} } }
    const sortie = vm.runInNewContext(`(function(){${n.parameters.jsCode}\n})()`, bac, { timeout: 2000 })
    return JSON.parse(JSON.stringify(sortie)).map((i) => i.json)
  }
  return { items, lancer: (nom) => items(nom) }
}
const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v))
const premiere = (rec) => rec?.[0]?.[0] ?? null

// ─── 3. Les invariants (essais n8n ET cas hors ligne) ────────────────────────────────────────────────────────────────────────
// Rend la liste des manquements. « sortie » = la sortie REJOUÉE du nœud « Effets prévus ».
function invariants(cle, wf, pins, sortie, attendu) {
  const e = [], ko = (m) => e.push(m)
  const effets = sortie?.[0]?.effets_prevus
  if (!Array.isArray(effets)) return ['« Effets prévus » ne rend pas effets_prevus']
  if (sortie[0].effets_faits.length) ko('un effet est dit FAIT en simulation')
  const lister = (nom) => (pins[nom] || [])
  if (cle === 'apres') {
    const avis = new Map(lister('Lire les avis de la fiche Google').map((a) => [`avis:${a.reviewId}`, a]))
    for (const x of effets) {
      if (x.effet === 'reponse_google_publiee') {
        const a = avis.get(x.cle), cfg = lister('Lire la configuration')[0] || {}
        if (!a || ['ONE', 'TWO', 'THREE'].includes(a.starRating) || x.negatif) ko(`${x.cle} : un avis négatif (≤ 3 étoiles) est publié seul`)
        if (!(cfg.offre === 'signature' && cfg.actif === true && cfg.types?.reponse_avis_positif === true)) ko(`${x.cle} : une réponse part seule hors Signature ou sans type activé`)
      }
      if (/^demande_avis_envoyee_/.test(x.effet)) {
        const cfg = lister('Lire la configuration')[0] || {}
        const c = lister('Lire les chantiers finis').find((k) => `demande_avis:${k.id}` === x.cle)
        if (!c || c.opposition === true || !c.canal_consenti) ko(`${x.cle} : demande d'avis envoyée sans canal consenti`)
        if (!(cfg.offre === 'signature' && cfg.actif === true && cfg.types?.demande_avis === true)) ko(`${x.cle} : demande d'avis envoyée hors Signature ou sans type activé`)
      }
      if (/^entretien:/.test(x.cle) && x.effet !== 'carte_rappel_entretien') ko(`${x.cle} : le rappel d'entretien est proposé, jamais envoyé seul`)
    }
  }
  if (cle === 'operations') {
    for (const x of effets) {
      if (/^rendez_vous_pose_/.test(x.effet)) {
        const ev = lister('Lire les demandes').find((d) => d.cle === x.cle)
        const f = ev?.faits || {}
        const dispo = lister('Disponibilité Google Agenda')
        if (!ev || ev.type !== 'creneau_choisi' || f.choisi_par !== 'client') ko(`${x.cle} : rendez-vous posé sans le choix du client`)
        if (!(Array.isArray(f.propose) && f.propose.some((p) => p.debut === f.debut))) ko(`${x.cle} : rendez-vous posé sur un créneau jamais proposé`)
        if (!dispo.length || !dispo.every((d) => d.available === true)) ko(`${x.cle} : rendez-vous posé alors que l'agenda lu ne dit pas libre`)
        const cfg = lister('Lire la configuration')[0] || {}
        if (!(f.valide_par === 'artisan' || (cfg.offre === 'signature' && cfg.actif === true && cfg.types?.rendez_vous === true))) ko(`${x.cle} : rendez-vous posé sans validation de l'artisan ni type activé`)
      }
      if (x.creneaux) {
        const dispo = lister('Disponibilité Google Agenda'), cands = wf._candidats || []
        for (const c of x.creneaux) { const i = cands.findIndex((k) => k.debut === c.debut); if (i < 0 || !dispo[i] || dispo[i].available !== true) ko(`${x.cle} : créneau absent de la disponibilité lue (${c.debut})`) }
        if (x.creneaux.length > 3) ko(`${x.cle} : plus de trois créneaux`)
      }
      if (/^commande_/.test(x.effet)) {
        const s = lister('Lire le stock sous le seuil').find((l) => x.cle.startsWith(`commande:${l.materiau_id}:`))
        if (!s || !(Number(s.seuil) > 0 && Number(s.quantite) <= Number(s.seuil)) || s.commande_ouverte === true || !s.fournisseur_ref) ko(`${x.cle} : commande préparée hors des conditions du stock`)
        else if (x.quantite_commande !== Math.max(1, Math.round(Number(s.seuil) * 2 - Number(s.quantite)))) ko(`${x.cle} : quantité commandée différente du calcul du code`)
        if (!/^commande_brouillon_/.test(x.effet)) ko(`${x.cle} : une commande n'est jamais envoyée, elle reste un brouillon`)
      }
      if (/^rappel_envoye_/.test(x.effet)) {
        const r = lister('Lire les rendez-vous de demain').find((k) => `rappel:${k.id}` === x.cle)
        if (!r || r.consentement !== true || r.opposition === true) ko(`${x.cle} : rappel envoyé sans consentement`)
      }
    }
  }
  if (cle === 'direction') {
    for (const x of effets) {
      if (x.lignes) for (const l of x.lignes) if (!/^[^:]+ : (non lu|[\d\s\u00a0\u202f]+( €)?|\d+,\d{2} €)$/.test(l)) ko(`${x.cle} : ligne qui ne vient pas du code (${l})`)
      if (/€/.test(x.phrase || '')) ko(`${x.cle} : un montant dans la phrase du modèle`)
    }
  }
  if (attendu) for (const [effet, n] of Object.entries(attendu.effets || {})) { const k = effets.filter((x) => x.effet === effet).length; if (k !== n) ko(`attendu ${n} « ${effet} », rendu ${k}`) }
  if (attendu?.absents) for (const a of attendu.absents) if (effets.some((x) => x.cle === a)) ko(`${a} : ne devait produire aucun effet`)
  if (attendu?.lignes) for (const l of attendu.lignes) if (!effets.some((x) => (x.lignes || []).includes(l))) ko(`ligne attendue absente : « ${l} »`)
  return e
}

// Ce que les essais n8n DOIVENT montrer (contre-vérifié à la main sur les données épinglées).
const ATTENDU_ESSAIS = {
  619: { effets: { carte_reponse_avis: 1, reponse_google_publiee: 0 } },
  620: { effets: { reponse_google_publiee: 1, carte_reponse_avis: 0 } },
  621: { effets: { demande_avis_envoyee_email: 1, carte_demande_avis: 1, carte_rappel_entretien: 1 }, absents: ['demande_avis:exemple-c3', 'demande_avis:exemple-c4', 'demande_avis:exemple-c6', 'demande_avis:exemple-c7'] },
  622: { effets: { carte_reponse_avis: 1, reponse_google_publiee: 0 }, absents: ['avis:exemple-deja-vu'] },
  638: { effets: { carte_aucun_creneau: 1 }, absents: [] },
  639: { effets: { rendez_vous_pose_google: 1, apercu_import_excel: 1 } },
  640: { effets: { commande_brouillon_gmail: 1, carte_rappel: 1 }, absents: ['rappel:exemple-rdv-8'] },
  643: { effets: { carte_document: 1 } },
  653: { effets: { envoi_telegram: 1 }, lignes: ['Impayés échus : 1 250 €', 'Devis sans réponse : 3', 'Demandes sans réponse : 2', 'Rendez-vous du jour : 1', 'Coût IA du jour : 0,42 €', 'Cartes à valider : 4'] },
  654: { effets: { envoi_teams: 1 }, lignes: ['Impayés échus : non lu', 'Devis sans réponse : non lu', 'Cartes à valider : non lu'] },
  655: { effets: { envoi_slack: 1, export_sheets: 1 }, lignes: ['Encaissé cette semaine : 8 400 €', 'Signé cette semaine : 3 000 €', 'En cours : 5 200 €', 'Coût IA de la semaine : 3,80 €'] },
}

// Les cas HORS LIGNE : joués par ce juge sur les Code des exports, jamais par n8n (dit dans le rapport).
const T = (h, m = '00') => ({ json: { timestamp: `2026-11-03T${h}:${m}:00.000+01:00` } })
const CONFIG = (o = {}) => ({ actif: false, offre: 'studio', types: {}, outil_agenda: 'google', outil_courrier: 'gmail', outil_fichiers: 'drive', outil_tableur: 'sheets', ...o })
const SIG = (types) => CONFIG({ actif: true, offre: 'signature', types })
const avisG = (id, s) => ({ reviewId: id, name: `accounts/x/locations/x/reviews/${id}`, starRating: s, comment: 'Exemple. Un commentaire.' })
const vide = [{}]
const APRES_BASE = { 'Chaque jour à 8 h': [T('08').json], 'Lire les clés déjà traitées': vide, 'Lire les chantiers finis': vide }
const CAS_HORS_LIGNE = [
  ['apres', 'trois étoiles, Signature, type activé : carte (≤ 3 = à l’artisan)', { ...APRES_BASE, 'Lire la configuration': [SIG({ reponse_avis_positif: true })], 'Lire les avis de la fiche Google': [avisG('a3', 'THREE')] }, { effets: { carte_reponse_avis: 1, reponse_google_publiee: 0 } }],
  ['apres', 'quatre étoiles, Signature, type activé : réponse prévue', { ...APRES_BASE, 'Lire la configuration': [SIG({ reponse_avis_positif: true })], 'Lire les avis de la fiche Google': [avisG('a4', 'FOUR')] }, { effets: { reponse_google_publiee: 1 } }],
  ['apres', 'quatre étoiles, Signature, type NON activé : carte', { ...APRES_BASE, 'Lire la configuration': [SIG({})], 'Lire les avis de la fiche Google': [avisG('a4', 'FOUR')] }, { effets: { reponse_google_publiee: 0, carte_reponse_avis: 1 } }],
  ['apres', 'Studio avec des types « activés » par erreur dans les réglages : carte, jamais un envoi ni une publication', { ...APRES_BASE, 'Lire la configuration': [CONFIG({ types: { reponse_avis_positif: true, demande_avis: true } })], 'Lire les avis de la fiche Google': [avisG('s5', 'FIVE')], 'Lire les chantiers finis': [{ id: 'oc4', client_id: 'cl4', fini_le: '2026-10-30T10:00:00Z', canal_consenti: 'email', opposition: false }] }, { effets: { reponse_google_publiee: 0, demande_avis_envoyee_email: 0, carte_reponse_avis: 1, carte_demande_avis: 1 } }],
  ['apres', 'demande d’avis : opposition du client = rien', { ...APRES_BASE, 'Lire la configuration': [SIG({ demande_avis: true })], 'Lire les avis de la fiche Google': vide, 'Lire les chantiers finis': [{ id: 'oc1', client_id: 'cl1', fini_le: '2026-10-30T10:00:00Z', canal_consenti: 'email', opposition: true }] }, { effets: { demande_avis_envoyee_email: 0, carte_demande_avis: 0 } }],
  ['apres', 'demande d’avis en Studio : carte, jamais un envoi', { ...APRES_BASE, 'Lire la configuration': [CONFIG()], 'Lire les avis de la fiche Google': vide, 'Lire les chantiers finis': [{ id: 'oc2', client_id: 'cl2', fini_le: '2026-10-30T10:00:00Z', canal_consenti: 'email', opposition: false }] }, { effets: { demande_avis_envoyee_email: 0, carte_demande_avis: 1 } }],
  ['apres', 'rappel d’entretien en Signature : carte, jamais seul', { ...APRES_BASE, 'Lire la configuration': [SIG({ demande_avis: true, reponse_avis_positif: true })], 'Lire les avis de la fiche Google': vide, 'Lire les chantiers finis': [{ id: 'oc3', client_id: 'cl3', fini_le: '2025-11-10T10:00:00Z', entretien_echeance: '2026-11-12T10:00:00Z' }] }, { effets: { carte_rappel_entretien: 1 } }],
]
const CHOIX = (o = {}) => ({ cle: 'choix:oc', type: 'creneau_choisi', faits: { choisi_par: 'client', valide_par: 'artisan', debut: '2026-11-04T14:00:00+01:00', fin: '2026-11-04T14:00:00.000Z', propose: [{ debut: '2026-11-04T14:00:00+01:00', fin: '2026-11-04T14:00:00.000Z' }], ...o } })
const OPS_BASE = { 'Toutes les 15 minutes': [T('10', '30').json], 'Lire les rendez-vous de demain': vide, 'Lire le stock sous le seuil': vide, 'Lire les chantiers': vide, 'Disponibilité Google Agenda': [{ available: true }] }
const SOIR = { 'Chaque jour à 17 h 05': [T('17', '05').json], 'Lire les demandes': vide, 'Lire les chantiers': vide }
const CAS_OPS = [
  ['operations', 'créneau choisi PAR L’ARTISAN (pas par le client) : aucun rendez-vous', { ...OPS_BASE, 'Lire la configuration': [CONFIG()], 'Lire les demandes': [{ ...CHOIX({ choisi_par: 'artisan' }) }] }, { effets: { rendez_vous_pose_google: 0 }, absents: ['choix:oc'] }],
  ['operations', 'créneau choisi jamais proposé : une carte, aucun rendez-vous', { ...OPS_BASE, 'Lire la configuration': [CONFIG()], 'Lire les demandes': [{ ...CHOIX({ propose: [] }) }] }, { effets: { rendez_vous_pose_google: 0, carte_aucun_creneau: 1 } }],
  ['operations', 'créneau choisi mais occupé dans l’agenda lu : une carte, aucun rendez-vous', { ...OPS_BASE, 'Disponibilité Google Agenda': [{ available: false }], 'Lire la configuration': [CONFIG()], 'Lire les demandes': [{ ...CHOIX() }] }, { effets: { rendez_vous_pose_google: 0, carte_aucun_creneau: 1 } }],
  ['operations', 'créneau choisi, libre, mais sans validation en Studio : carte à valider', { ...OPS_BASE, 'Lire la configuration': [CONFIG()], 'Lire les demandes': [{ ...CHOIX({ valide_par: null }) }] }, { effets: { rendez_vous_pose_google: 0, carte_rendez_vous_a_valider: 1 } }],
  ['operations', 'créneau choisi, libre, validé, agenda Outlook : rendez-vous prévu dans Outlook', { ...OPS_BASE, 'Disponibilité Google Agenda': undefined, 'Événements Outlook': [{ start: { dateTime: '2026-11-04T20:00:00+01:00' }, end: { dateTime: '2026-11-04T21:00:00+01:00' } }], 'Lire la configuration': [CONFIG({ outil_agenda: 'outlook' })], 'Lire les demandes': [{ ...CHOIX() }] }, { effets: {} }],
  ['operations', 'stock : commande déjà ouverte ou sans fournisseur = rien', { ...SOIR, 'Lire la configuration': [CONFIG()], 'Lire les rendez-vous de demain': vide, 'Lire le stock sous le seuil': [{ materiau_id: 'm1', reference: 'EX-1', quantite: 1, seuil: 5, fournisseur_ref: 'f1', commande_ouverte: true }, { materiau_id: 'm2', reference: 'EX-2', quantite: 1, seuil: 5, fournisseur_ref: null, commande_ouverte: false }] }, { effets: { commande_brouillon_gmail: 0 } }],
  ['operations', 'stock Outlook : la commande reste un brouillon Outlook', { ...SOIR, 'Lire la configuration': [CONFIG({ outil_courrier: 'outlook' })], 'Lire les rendez-vous de demain': vide, 'Lire le stock sous le seuil': [{ materiau_id: 'm3', reference: 'EX-3', quantite: 0, seuil: 4, fournisseur_ref: 'f1', commande_ouverte: false }] }, { effets: { commande_brouillon_outlook: 1 } }],
  ['operations', 'rappel : sans consentement ou avec opposition = rien ; Signature + type activé = envoi prévu', { ...SOIR, 'Lire la configuration': [SIG({ rappel_rendez_vous: true })], 'Lire les rendez-vous de demain': [{ id: 'r1', debut: '2026-11-04T09:00:00+00:00', canal_rappel: 'whatsapp', consentement: true, opposition: false, client_id: 'c1' }, { id: 'r2', debut: '2026-11-04T09:00:00+00:00', canal_rappel: 'sms', consentement: false, opposition: false, client_id: 'c2' }, { id: 'r3', debut: '2026-11-04T09:00:00+00:00', canal_rappel: 'telegram', consentement: true, opposition: true, client_id: 'c3' }], 'Lire le stock sous le seuil': vide }, { effets: { rappel_envoye_whatsapp: 1 }, absents: ['rappel:r2', 'rappel:r3'] }],
]
const DIR_BASE = { 'Chaque jour à 7 h': [T('07').json], 'Lire le rapport de la semaine': vide, 'Lire le coût IA': vide }
const CAS_DIR = [
  ['direction', 'aucune lecture : « non lu » partout, jamais un zéro', { ...DIR_BASE, 'Lire la configuration': [{ canal_direction: 'gmail', destination_direction: 'x' }], 'Lire les chiffres du jour': vide }, { effets: { envoi_gmail: 1 }, lignes: ['Impayés échus : non lu'] }],
  ['direction', 'impayé de zéro euro : « 0 € » écrit par le code', { ...DIR_BASE, 'Lire la configuration': [{ canal_direction: 'whatsapp', destination_direction: 'x' }], 'Lire les chiffres du jour': [{ impayes_echus_centimes: 0, devis_a_relancer: 0, demandes_sans_reponse: 0, rendez_vous_jour: 0, cartes_a_valider: 0 }] }, { effets: { envoi_whatsapp: 1 }, lignes: ['Impayés échus : 0 €', 'Devis sans réponse : 0'] }],
]
// Les REVALIDATIONS, rejouées avec une sortie de modèle choisie par le juge : doivent jeter, ou corriger la route.
const REVALIDATIONS = [
  ['direction', 'Revalider la page', 'Rédacteur de la page', { ...DIR_BASE, 'Lire la configuration': [{ canal_direction: 'telegram', destination_direction: 'x' }], 'Lire les chiffres du jour': [{ impayes_echus_centimes: 125000, devis_a_relancer: 3, demandes_sans_reponse: 2, rendez_vous_jour: 1, cartes_a_valider: 4 }] },
    [[{ cle: 'page:matin:2026-11-03', intro: 'Bonjour, voici votre journée.', priorites: [0, 1] }], 'ok'], [[{ cle: 'page:matin:2026-11-03', intro: 'Vous avez 1 500 euros d’impayés ce matin.', priorites: [0] }], 'jette'],
    [[{ cle: 'page:matin:2026-11-03', intro: 'Bonjour, voici votre journée.', priorites: [9] }], 'jette'], [[{ cle: 'page:matin:2026-11-04', intro: 'Bonjour, voici votre journée.', priorites: [] }], 'jette']],
  ['direction', 'Revalider le rapport', 'Rédacteur du rapport', { 'Le lundi à 8 h': [{ timestamp: '2026-11-02T08:00:00.000+01:00' }], 'Lire la configuration': [{ canal_direction: 'slack', destination_direction: 'x' }], 'Lire les chiffres du jour': vide, 'Lire le rapport de la semaine': [{ semaine: 'S44', encaisse_centimes: 840000, signe_centimes: 300000, en_cours_centimes: 520000, relances_creditees: 2 }], 'Lire le coût IA': vide },
    [[{ cle: 'page:lundi:2026-11-02', commentaire: 'Une semaine sobre, sans surprise.' }], 'ok'], [[{ cle: 'page:lundi:2026-11-02', commentaire: 'Un gain notable cette semaine.' }], 'jette'], [[{ cle: 'page:lundi:2026-11-02', commentaire: 'Une belle semaine, 3 signatures.' }], 'jette']],
  ['apres', 'Revalider la réponse', 'Préparateur de réponses', { ...APRES_BASE, 'Lire la configuration': [SIG({ reponse_avis_positif: true })], 'Lire les avis de la fiche Google': [avisG('v5', 'FIVE'), avisG('v1', 'ONE')] },
    [[{ cle: 'avis:v5', reponse: 'Merci beaucoup pour votre confiance, au plaisir de vous retrouver.' }], 'route:publier'], [[{ cle: 'avis:v5', reponse: 'Merci ! Nous vous offrons une remise de 10 euros sur votre prochain chantier.' }], 'route:carte'],
    [[{ cle: 'avis:v1', reponse: 'Nous sommes désolés de votre ressenti, merci de nous appeler pour en parler.' }], 'route:carte'], [[{ cle: 'avis:v5', reponse: 'Merci de la part de Presti, à bientôt.' }], 'jette'], [[{ cle: 'avis:inconnu', reponse: 'Merci beaucoup pour votre confiance, au plaisir de vous retrouver.' }], 'jette']],
  ['operations', 'Revalider la proposition', 'Planificateur', { ...OPS_BASE, 'Lire la configuration': [CONFIG()], 'Lire les demandes': [{ cle: 'rdv:oc', type: 'rdv_a_proposer', faits: { du: '2026-11-04', au: '2026-11-04', duree_min: 60 } }], 'Disponibilité Google Agenda': [{ available: true }, { available: true }, { available: false }, { available: true }] },
    [[{ cle: 'rdv:oc', message: 'Je vous propose mercredi à 9 h ou à 11 h, qu’en dites-vous ?', indices: [0, 1] }], 'ok'], [[{ cle: 'rdv:oc', message: 'Je vous propose mercredi à 15 h, qu’en dites-vous ?', indices: [0, 1] }], 'jette'], [[{ cle: 'rdv:oc', message: 'Je vous propose mercredi à 9 h, qu’en dites-vous ?', indices: [5] }], 'jette']],
  ['operations', 'Revalider la commande', 'Gardien du stock', { ...SOIR, 'Lire la configuration': [CONFIG()], 'Lire les rendez-vous de demain': vide, 'Lire le stock sous le seuil': [{ materiau_id: 'm1', reference: 'EX-2040', quantite: 2, seuil: 5, fournisseur_ref: 'f1', commande_ouverte: false }] },
    [[{ cle: 'commande:m1:2026-11', objet: 'Commande EX-2040', corps: 'Bonjour, je souhaite commander 8 unités de la référence EX-2040. Merci.' }], 'ok'], [[{ cle: 'commande:m1:2026-11', objet: 'Commande', corps: 'Bonjour, je souhaite commander 12 unités de la référence EX-2040. Merci.' }], 'jette'], [[{ cle: 'commande:m1:2026-11', objet: 'Commande', corps: 'Bonjour, commande de 8 unités à 45 € pièce, merci beaucoup.' }], 'jette']],
]
const DROITS = (wf) => {
  const e = []
  // l'accès « $() » d'un nœud non exécuté doit jeter, comme n8n : vérifié par la présence de try/catch dans les Code qui lisent un nœud conditionnel
  for (const n of wf.nodes) if (n.type === B('code') && /\$\('Garder les créneaux libres'\)/.test(n.parameters.jsCode) && !/try\s*\{/.test(n.parameters.jsCode)) e.push(`${n.name} : lit un nœud conditionnel sans try/catch`)
  return e
}

function rejouerEssais(cle, wf, essais) {
  const e = []
  const ko = (m) => e.push(m)
  const nom = NOMS[cle]
  for (const es of essais.filter((x) => x.workflow === nom)) {
    const ex = executeur(wf, es.entrees_epinglees)
    if (cle === 'operations') wf._candidats = ex.items('Créneaux à vérifier') || []
    for (const [noeud, passages] of Object.entries(es.sorties)) {
      const n = parNom(wf, noeud)
      if (n?.type !== B('code')) continue
      let rejoue
      try { rejoue = ex.items(noeud) } catch (err) { ko(`#${es.execution} ${noeud} : le rejeu jette (${String(err.message).slice(0, 80)})`); continue }
      if (stable(rejoue) !== stable(premiere(passages))) ko(`#${es.execution} ${noeud} : la sortie rejouée diffère de celle de n8n`)
    }
    let effets
    try { effets = ex.items('Effets prévus') } catch (err) { ko(`#${es.execution} Effets prévus : le rejeu jette (${String(err.message).slice(0, 80)})`); continue }
    const recu = premiere(es.sorties['Effets prévus'])
    if (recu && stable(effets) !== stable(recu)) ko(`#${es.execution} Effets prévus : rejoué ≠ n8n`)
    for (const m of invariants(cle, wf, es.entrees_epinglees, effets, ATTENDU_ESSAIS[es.execution])) ko(`#${es.execution} « ${es.etiquette.slice(0, 60)} » : ${m}`)
  }
  return e
}
function rejouerHorsLigne(cle, wf) {
  const e = []
  for (const [c, titre, pinsBruts, attendu] of [...CAS_HORS_LIGNE, ...CAS_OPS, ...CAS_DIR]) {
    if (c !== cle) continue
    const pins = Object.fromEntries(Object.entries(pinsBruts).filter(([, v]) => v !== undefined))
    const ex = executeur(wf, pins)
    if (cle === 'operations') wf._candidats = ex.items('Créneaux à vérifier') || []
    let effets
    try { effets = ex.items('Effets prévus') } catch (err) { e.push(`hors ligne « ${titre} » : le rejeu jette (${String(err.message).slice(0, 90)})`); continue }
    const outlook = /Outlook/.test(titre) && /rendez-vous prévu/.test(titre)
    if (outlook) { if (!(effets?.[0]?.effets_prevus || []).some((x) => x.effet === 'rendez_vous_pose_outlook')) e.push(`hors ligne « ${titre} » : pas de rendez-vous Outlook prévu`); continue }
    for (const m of invariants(cle, wf, pins, effets, attendu)) e.push(`hors ligne « ${titre} » : ${m}`)
  }
  for (const [c, titre, agent, pinsBruts, ...cas] of REVALIDATIONS) {
    if (c !== cle) continue
    const nomRev = titre
    for (const [sortieModele, verdict] of cas) {
      const pins = { ...pinsBruts, [agent]: sortieModele.map((o) => ({ output: o })) }
      const ex = executeur(wf, pins)
      if (cle === 'operations') wf._candidats = ex.items('Créneaux à vérifier') || []
      let r = null, jette = false
      try { r = ex.items(nomRev) } catch { jette = true }
      const resume = JSON.stringify(sortieModele[0]).slice(0, 70)
      if (verdict === 'jette' && !jette) e.push(`revalidation « ${titre} » : ${resume} aurait dû être rejeté`)
      if (verdict === 'ok' && (jette || !r?.length)) e.push(`revalidation « ${titre} » : ${resume} aurait dû passer`)
      if (/^route:/.test(verdict) && (jette || r?.[0]?.route !== verdict.slice(6))) e.push(`revalidation « ${titre} » : ${resume} devait avoir la route « ${verdict.slice(6)} » (rendu ${jette ? 'un rejet' : r?.[0]?.route})`)
      if (cle === 'direction' && verdict === 'ok' && r?.[0]?.message && /[€]|\d{4,}/.test(r[0].message.split('\n\n')[0])) e.push(`revalidation « ${titre} » : un chiffre dans la phrase du modèle`)
    }
  }
  return e
}

function tout(exports, essais) {
  const e = []
  for (const cle of Object.keys(NOMS)) {
    const wf = copie(exports[cle])
    for (const m of structure(cle, wf)) e.push(`${NOMS[cle]} : ${m}`)
    for (const m of DROITS(wf)) e.push(`${NOMS[cle]} : ${m}`)
    for (const m of rejouerEssais(cle, wf, essais)) e.push(`${NOMS[cle]} : ${m}`)
    for (const m of rejouerHorsLigne(cle, wf)) e.push(`${NOMS[cle]} : ${m}`)
  }
  return e
}

// ─── 4. Les mutants ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeud = (wf, nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n }
const remplace = (wf, nom, de, vers) => { const n = noeud(wf, nom); const js = n.parameters.jsCode; if (!js.includes(de)) throw new Error(`mutant : « ${de.slice(0, 40)} » absent de ${nom}`); n.parameters.jsCode = js.replace(de, vers) }
const MUTANTS = [
  ['un avis négatif publié seul (le seuil des 3 étoiles ôté)', 'apres', (w) => remplace(w, 'Décider', 'etoiles <= 3', 'etoiles <= 0')],
  ['un avis négatif publié seul (la garde « Publication permise ? » ouverte)', 'apres', (w) => { const c = noeud(w, 'Publication permise ?').parameters.conditions.conditions[0]; c.leftValue = c.leftValue.replace(" && $json.negatif === false", '') }],
  ['une réponse positive publiée en Studio (le pilote supposé actif)', 'apres', (w) => remplace(w, 'Décider', "const pilote = cfg.actif === true && cfg.offre === 'signature';", 'const pilote = true;')],
  ['le rappel d’entretien envoyé seul', 'apres', (w) => remplace(w, 'Décider', "kind: 'entretien', cle: cleE, route: 'carte'", "kind: 'entretien', cle: cleE, route: 'envoyer'")],
  ['une demande d’avis sans le consentement du client', 'apres', (w) => remplace(w, 'Décider', "canal !== 'aucun' && c.opposition !== true", 'true')],
  ['un créneau inventé (absent de la disponibilité lue)', 'operations', (w) => remplace(w, 'Garder les créneaux libres', 'google[i] && google[i].available === true', 'true')],
  ['un rendez-vous posé sans le choix du client', 'operations', (w) => remplace(w, 'Décider', "if (f.choisi_par !== 'client') continue;", '')],
  ['un rendez-vous posé sur un créneau jamais proposé', 'operations', (w) => remplace(w, 'Décider', 'if (!propose || !libre)', 'if (!libre)')],
  ['une commande fournisseur envoyée au lieu du brouillon', 'operations', (w) => { const n = noeud(w, 'Commande en brouillon Gmail'); n.parameters.resource = 'message'; n.parameters.operation = 'send'; n.parameters.sendTo = 'x' }],
  ['une quantité de commande qui ne vient pas du code', 'operations', (w) => remplace(w, 'Décider', 'Math.round(seuil * 2 - q)', 'Math.round(seuil * 3 - q)')],
  ['un rappel sans consentement', 'operations', (w) => remplace(w, 'Décider', 'r.consentement !== true || r.opposition === true ||', '')],
  ['le nœud Agenda retiré', 'operations', (w) => { w.nodes = w.nodes.filter((n) => n.name !== 'Disponibilité Google Agenda'); delete w.connections['Disponibilité Google Agenda'] }],
  ['un chiffre de la page du matin pris dans la sortie du modèle', 'direction', (w) => remplace(w, 'Revalider la page', '/\\d/.test(r.intro) ||', '')],
  ['un commentaire du rapport qui parle de gain', 'direction', (w) => remplace(w, 'Revalider le rapport', '|gain|économi|rentab', '')],
  ['un zéro écrit à la place de « non lu »', 'direction', (w) => remplace(w, 'Compter', "v === null ? 'non lu' : fmt(v)", "v === null ? '0' : fmt(v)")],
  ['un identifiant branché sur un nœud d’envoi', 'apres', (w) => { noeud(w, 'Demande d’avis par Gmail').credentials = { gmailOAuth2: { id: 'IdentifiantFictif01', name: 'Gmail essai' } } }],
  ['un identifiant branché sur le modèle', 'direction', (w) => { noeud(w, 'Claude · Rédacteur de la page').credentials = { anthropicApi: { id: 'IdentifiantFictif02', name: 'Claude essai' } } }],
  ['un outil d’agent qui écrit (la fiche Google : répondre)', 'apres', (w) => { noeud(w, 'Outil : relire les avis de la fiche').parameters.operation = 'reply' }],
  ['un outil d’agent qui écrit (l’Agenda : créer)', 'operations', (w) => { noeud(w, 'Outil : disponibilité Google Agenda').parameters = { resource: 'event', operation: 'create' } }],
  ['« Presti » dans un message', 'apres', (w) => { const n = noeud(w, 'Demande d’avis par Gmail'); n.parameters.message = n.parameters.message + '\nPresti' }],
  ['« Presti » dans la page envoyée', 'direction', (w) => { const n = noeud(w, 'Page par Telegram'); n.parameters.text = n.parameters.text.replace('l’assistant', 'Presti') }],
  ['la porte « simulation » contournée (le Code des chiffres relié à l’agent)', 'direction', (w) => { w.connections['Compter'].main[0] = [{ node: 'Page du matin ?', type: 'main', index: 0 }] }],
  ['un effet branché sur la sortie « simulation »', 'apres', (w) => { w.connections['Porte simulation'].main[0].push({ node: 'Déposer la carte', type: 'main', index: 0 }) }],
  ['un déclencheur à webhook', 'operations', (w) => { w.nodes.push({ id: 'wh', name: 'Entrée publique', type: B('webhook'), typeVersion: 2, position: [0, 0], parameters: { path: 'x' } }) }],
  ['l’agent sans parseur de sortie', 'operations', (w) => { noeud(w, 'Archiviste').parameters.hasOutputParser = false; w.connections['Schéma · Archiviste'] = {} }],
  ['le gabarit actif', 'direction', (w) => { w.active = true }],
  ['le mode à blanc levé dans le gabarit', 'operations', (w) => remplace(w, 'Compte et mode', 'simulation: true', 'simulation: false')],
  ['un dépôt sans clé d’idempotence', 'apres', (w) => { const n = noeud(w, 'Déposer la carte'); n.parameters.jsonBody = n.parameters.jsonBody.replace('cle: $json.cle, ', '') }],
  ['un nœud d’outil sans note', 'direction', (w) => { delete noeud(w, 'Page par Slack').notes }],
]

// La raison attendue de chaque mutant (même ordre que MUTANTS) : un mutant doit rougir POUR SA RAISON, pas pour une autre.
const RAISONS = [/négatif|Décider : la sortie rejouée diffère/, /Publication permise/, /hors Signature|reponse_google_publiee/, /rappel d.entretien/, /consentement|demande_avis|rejouée diffère|Effets prévus/,
  /Garder les créneaux libres|absente de la disponibilité/, /sans le choix du client/, /jamais proposé/, /BROUILLON|draft/, /quantité|rejouée diffère|Effets prévus/, /consentement|rejouée diffère/,
  /googleCalendar · calendar · availability|Disponibilité Google Agenda/, /Revalider la page/, /Revalider le rapport/, /non lu|rejouée diffère|Impayés/, /identifiant branché/, /identifiant branché/,
  /outil d.agent qui n.est pas une lecture/, /outil d.agent qui n.est pas une lecture/, /Presti/, /Presti/, /sans passer par la sortie/, /sans passer par la sortie/, /webhook/, /parseur/, /INACTIF/,
  /simulation: true/, /clé d.idempotence/, /sans note/]

function principal() {
  if (RAISONS.length !== MUTANTS.length) throw new Error(`${RAISONS.length} raisons pour ${MUTANTS.length} mutants`)
  const e = []
  const exports = {}
  for (const [cle, nom] of Object.entries(NOMS)) {
    const f = `${nom}.workflow.json`
    if (!existsSync(path.join(DOSSIER, f))) { console.error(`✗ ${f} absent de ${path.relative(RACINE, DOSSIER)}`); process.exit(1) }
    exports[cle] = JSON.parse(lire(f))
  }
  const essais = JSON.parse(lire('essais-n8n.json'))
  const reg = JSON.parse(lire('empreintes-code.json'))
  // les empreintes : le registre ne ment pas sur le code exporté
  for (const [cle, nom] of Object.entries(NOMS)) for (const n of exports[cle].nodes.filter((x) => x.type === B('code'))) {
    const h = (await_sha(n.parameters.jsCode))
    if (reg[nom]?.[n.name] !== h) e.push(`${nom} · ${n.name} : empreinte du registre ≠ code exporté`)
  }
  e.push(...tout(exports, essais))
  const nbEssais = essais.length
  if (nbEssais < 11) e.push(`${nbEssais} essai(s) n8n seulement (11 attendus : 4 + 4 + 3)`)
  for (const id of Object.keys(ATTENDU_ESSAIS)) if (!essais.some((x) => String(x.execution) === id)) e.push(`essai n8n #${id} absent d'essais-n8n.json`)
  console.log(`gabarits-terrain-qa : ${Object.keys(NOMS).length} gabarits, ${exports.apres.nodes.length + exports.operations.nodes.length + exports.direction.nodes.length} nœuds, ${nbEssais} essais n8n rejoués, ${CAS_HORS_LIGNE.length + CAS_OPS.length + CAS_DIR.length} cas hors ligne, ${REVALIDATIONS.reduce((s, r) => s + r.length - 4, 0)} revalidations`)
  if (e.length) { for (const m of e) console.log(`  ✗ ${m}`) } else console.log('  ✓ structure, rejeu des nœuds Code, invariants et cas hors ligne tenus')
  // les mutants
  let survivants = 0
  for (const [titre, cle, f] of MUTANTS) {
    const m = { apres: copie(exports.apres), operations: copie(exports.operations), direction: copie(exports.direction) }
    f(m[cle])
    const avant = { ...exports, [cle]: m[cle] }
    const sortie = [...structure(cle, copie(avant[cle])), ...DROITS(avant[cle]), ...rejouerEssais(cle, copie(avant[cle]), essais), ...rejouerHorsLigne(cle, copie(avant[cle]))]
    const i = MUTANTS.findIndex((x) => x[0] === titre), voulue = RAISONS[i], pile = sortie.find((m) => voulue.test(m))
    if (!sortie.length) { survivants++; console.log(`  ✗ mutant « ${titre} » SURVIT (le juge ne rougit pas)`) }
    else if (!pile) { survivants++; console.log(`  ✗ mutant « ${titre} » rougit pour une AUTRE raison que ${voulue} : ${sortie[0].slice(0, 120)}`) }
    else console.log(`  ✓ mutant « ${titre} » fait rougir le juge\n      → ${pile.slice(0, 170)}`)
  }
  if (survivants) e.push(`${survivants} mutant(s) survivant(s)`)
  // la garde commune
  const r = spawnSync('node', ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs', path.relative(RACINE, DOSSIER)], { cwd: RACINE, encoding: 'utf8', timeout: 240000 })
  const derniere = (r.stdout || '').trim().split('\n').filter(Boolean).slice(-1)[0]
  if (r.status !== 0) { e.push(`la garde commune scripts/n8n-specs-qa.mjs échoue (${derniere})`); console.log((r.stdout || '').split('\n').filter((l) => /^✗|^    ✗/.test(l)).join('\n')) } else console.log(`  ✓ garde commune scripts/n8n-specs-qa.mjs : ${derniere}`)
  console.log(`gabarits-terrain-qa : ${MUTANTS.length} mutants, ${MUTANTS.length - survivants} fait rougir le juge`)
  console.log(e.length ? 'ÉCHEC' : 'OK')
  process.exit(e.length ? 1 : 0)
}
import { createHash } from 'node:crypto'
function await_sha(t) { return createHash('sha256').update(String(t), 'utf8').digest('hex') }
principal()
