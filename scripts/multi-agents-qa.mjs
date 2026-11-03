// JUGE des systèmes multi-agents des gabarits (tâche 036-019, prompt 6). Hors ligne : aucun réseau, aucune base, aucun modèle.
// Il lit les `gabarit-*.workflow.json` d'un dossier (par défaut .orchestre/preuves/036-019) et, pour chacun de ceux qui portent des agents IA :
//   M1  UN chef : un seul AI Agent (3.x) qui reçoit des agents-outils (`agentTool`) en entrée `ai_tool` ;
//   M2  au moins deux agents-outils (les spécialistes) branchés sur le chef ;
//   M3  chaque spécialiste a SON modèle (Anthropic, nom du modèle non vide), au moins un outil, et SES outils ne font que lire (R23) ;
//   M4  le chef a UN parseur strict (Structured Output Parser, JSON Schema saisi, additionalProperties faux, autoFix faux), suivi d'un nœud Code ;
//   M5  le chef ne décide d'aucun montant : aucune propriété d'argent dans son schéma, aucun autre nœud ne lit une somme dans sa note ;
//   M6  aucun effet sans la porte « simulation » : depuis un déclencheur, sans passer par la sortie « faux » d'une porte, on n'atteint ni envoi,
//       ni écriture, ni appel au modèle (le chef est un appel au modèle : il vient donc après la porte).
// Les gabarits sans aucun agent IA (accueil-boite, accueil-envoi, accueil-leads) sont listés comme non concernés, jamais comptés verts.
// Elle prouve qu'elle sait rougir : cinq mutants exigés (sans chef, agent-outil qui écrit, chef sans parseur, montant pris dans la sortie du chef,
// agent-outil sans modèle) plus la porte retirée.
//   node scripts/multi-agents-qa.mjs [dossier]
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv[2] ?? '.orchestre/preuves/036-019')
const LC = (t) => `@n8n/n8n-nodes-langchain.${t}`
const B = (t) => `n8n-nodes-base.${t}`
const AGENT = LC('agent'), AGENT_OUTIL = LC('agentTool'), MODELE = LC('lmChatAnthropic'), PARSEUR = LC('outputParserStructured')
// Mêmes listes que scripts/n8n-specs-qa.mjs (R15, R23) : un nœud natif en « …Tool » ne lit que si son opération est une lecture.
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i
const NATIFS = ['gmail', 'microsoftOutlook', 'emailSend', 'googleCalendar', 'googleDrive', 'googleDocs', 'googleSheets', 'googleChat', 'googleBusinessProfile',
  'googleAds', 'microsoftOneDrive', 'microsoftExcel', 'microsoftTeams', 'whatsApp', 'telegram', 'twilio', 'slack', 'sendInBlue', 'mailchimp', 'activeCampaign',
  'lemlist', 'facebookGraphApi', 'linkedIn', 'youTube', 'twitter', 'hubspot', 'pipedrive', 'salesforce', 'zohoCrm', 'odoo', 'airtable', 'notion', 'mondayCom',
  'clickUp', 'stripe', 'quickbooks', 'xero', 'zendesk', 'shopify', 'wooCommerce']
const estLecture = (n) => typeof n.parameters?.operation === 'string' && LECTURES.test(n.parameters.operation)
const ARGENT = /montant|prix|total|ttc|\bht\b|\btva\b|tarif|amount|price|€|acompte|remise/i

const aretes = (w, nom) => Object.entries(w.connections?.[nom] ?? {}).flatMap(([genre, liste]) =>
  (Array.isArray(liste) ? liste : []).flatMap((s, i) => (Array.isArray(s) ? s : []).filter(Boolean).map((l) => ({ vers: l.node, genre, sortie: i }))))
const entrants = (w, cible, genre) => w.nodes.filter((n) => aretes(w, n.name).some((a) => a.vers === cible && a.genre === genre))
const estPorte = (n) => n.type === B('if') && /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? ''))
const estEffet = (n) => (n.type === B('httpRequest') && String(n.parameters?.method ?? 'GET').toUpperCase() !== 'GET')
  || n.type === AGENT || n.type === AGENT_OUTIL || n.type === LC('chainLlm') || n.type === LC('anthropic')
  || (n.type.startsWith('n8n-nodes-base.') && NATIFS.includes(n.type.slice(15)) && !estLecture(n))
const SOUS_NOEUDS = new Set([MODELE, PARSEUR, LC('toolWorkflow'), LC('toolHttpRequest'), AGENT_OUTIL])

function juger(w) {
  const e = []
  const ko = (r, m) => e.push(`${r} ${m}`)
  const agents = w.nodes.filter((n) => n.type === AGENT)
  const chefs = agents.filter((a) => entrants(w, a.name, 'ai_tool').some((t) => t.type === AGENT_OUTIL))
  // M1
  if (chefs.length !== 1) { ko('M1', `${chefs.length} chef(s) : un seul AI Agent doit recevoir des agents-outils`); return e }
  const chef = chefs[0]
  if (!(Number(chef.typeVersion) >= 3)) ko('M1', `${chef.name} : AI Agent ${chef.typeVersion} (3.x attendu)`)
  // M2
  const specialistes = entrants(w, chef.name, 'ai_tool')
  const outilsAgents = specialistes.filter((s) => s.type === AGENT_OUTIL)
  if (outilsAgents.length < 2) ko('M2', `${chef.name} : ${outilsAgents.length} agent(s)-outil(s), au moins deux attendus`)
  for (const s of specialistes) if (s.type !== AGENT_OUTIL && s.type !== LC('toolWorkflow')) ko('M2', `${s.name} : branché sur le chef sans être un agent-outil (${s.type})`)
  // M3
  for (const s of outilsAgents) {
    const modeles = entrants(w, s.name, 'ai_languageModel')
    if (modeles.length !== 1 || modeles[0].type !== MODELE || !String(modeles[0].parameters?.model?.value ?? '').trim()) ko('M3', `${s.name} : un modèle Anthropic nommé est attendu (agent-outil sans modèle)`)
    const outils = entrants(w, s.name, 'ai_tool')
    if (!outils.length) ko('M3', `${s.name} : aucun outil de lecture`)
    if (Object.keys(s.credentials ?? {}).length) ko('M3', `${s.name} : identifiant branché`)
    for (const o of outils) {
      if (o.type === LC('toolWorkflow')) { if (!/^\s*outil\s*:\s*lecture\s*$/m.test(String(o.notes ?? ''))) ko('M3', `${o.name} : sous-workflow en outil sans « outil: lecture »`) }
      else if (o.type === LC('toolHttpRequest')) { if (String(o.parameters?.method ?? 'GET').toUpperCase() !== 'GET') ko('M3', `${o.name} : outil HTTP qui n'est pas en GET`) }
      else if (o.type.startsWith(B('')) && o.type.endsWith('Tool')) { if (!estLecture(o)) ko('M3', `${o.name} : outil de spécialiste qui écrit ou envoie (${o.parameters?.operation ?? 'opération par défaut'})`) }
      else ko('M3', `${o.name} : outil non admis chez un spécialiste (${o.type})`)
    }
  }
  // M4
  const parseurs = entrants(w, chef.name, 'ai_outputParser')
  if (chef.parameters?.hasOutputParser !== true || parseurs.length !== 1 || parseurs[0].type !== PARSEUR) ko('M4', `${chef.name} : un seul Structured Output Parser strict attendu`)
  else {
    const p = parseurs[0]
    let sch = null
    try { sch = JSON.parse(p.parameters?.inputSchema ?? '') } catch { /* schéma illisible */ }
    if (p.parameters?.schemaType !== 'manual' || p.parameters?.autoFix === true) ko('M4', `${p.name} : JSON Schema saisi (manual) et autoFix faux attendus`)
    if (!sch || sch.additionalProperties !== false || !Array.isArray(sch.required) || !sch.required.length) ko('M4', `${p.name} : schéma sans additionalProperties faux ni champs requis`)
    // M5 (schéma)
    for (const k of Object.keys(sch?.properties ?? {})) if (ARGENT.test(k)) ko('M5', `${p.name} : le schéma du chef porte une propriété d'argent (${k})`)
  }
  const apres = aretes(w, chef.name).filter((a) => a.genre === 'main').map((a) => w.nodes.find((n) => n.name === a.vers))
  if (!apres.length || !apres.every((x) => x?.type === B('code'))) ko('M4', `${chef.name} : la note du chef doit être revalidée par un nœud Code`)
  // M5 (lecture de la note par un autre nœud)
  const lecteurs = /note_du_chef|\$\(\s*['"`]Chef /
  for (const n of w.nodes) {
    if (n === chef || parseurs.includes(n)) continue
    const src = JSON.stringify(n.parameters ?? {})
    const m = lecteurs.exec(src)
    if (m && ARGENT.test(src.slice(m.index, m.index + 60))) ko('M5', `${n.name} : une somme est lue dans la note du chef (le code compte, le chef ne décide jamais d'un montant)`)
  }
  // M6 : depuis un déclencheur, sans franchir la sortie « faux » d'une porte, aucun effet n'est atteignable
  const declencheurs = w.nodes.filter((n) => !SOUS_NOEUDS.has(n.type) && !n.type.endsWith('Tool') && n.type !== B('stickyNote') && entrants(w, n.name, 'main').length === 0
    && !w.nodes.some((x) => aretes(w, x.name).some((a) => a.vers === n.name)))
  const vus = new Set(), file = declencheurs.map((n) => n.name)
  while (file.length) {
    const nom = file.shift()
    if (vus.has(nom)) continue
    vus.add(nom)
    const n = w.nodes.find((x) => x.name === nom)
    if (!n) continue
    if (estEffet(n)) ko('M6', `${nom} : effet atteignable sans passer par la sortie « faux » d'une porte « simulation »`)
    for (const a of aretes(w, nom)) { if (a.genre !== 'main') continue; if (estPorte(n) && a.sortie === 1) continue; file.push(a.vers) }
  }
  if (!w.nodes.some(estPorte)) ko('M6', 'aucune porte « simulation » déclarée')
  return [...new Set(e)]
}

// ─── Les mutants ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const copie = (w) => JSON.parse(JSON.stringify(w))
const retirer = (w, nom) => { w.nodes = w.nodes.filter((n) => n.name !== nom); delete w.connections[nom]; for (const g of Object.values(w.connections)) for (const [k, l] of Object.entries(g)) g[k] = l.map((s) => (s ?? []).filter((x) => x.node !== nom)) }
const chefDe = (w) => w.nodes.find((n) => n.type === AGENT && entrants(w, n.name, 'ai_tool').some((t) => t.type === AGENT_OUTIL))
const mutants = [
  ['gabarit sans chef', (w) => { const c = chefDe(w); for (const s of entrants(w, c.name, 'ai_tool')) delete w.connections[s.name]; retirer(w, c.name) }, /^M1 0 chef/],
  ['agent-outil qui écrit (Gmail en envoi)', (w) => {
    const s = entrants(w, chefDe(w).name, 'ai_tool')[0]
    w.nodes.push({ id: 'mut1', name: 'Envoyer en outil', type: B('gmailTool'), typeVersion: 2.1, position: [0, 0], parameters: { resource: 'message', operation: 'send' } })
    w.connections['Envoyer en outil'] = { ai_tool: [[{ node: s.name, type: 'ai_tool', index: 0 }]] }
  }, /^M3 .*Envoyer en outil.*écrit ou envoie/],
  ['agent-outil dont l’outil perd son opération (envoi par défaut)', (w) => {
    const s = entrants(w, chefDe(w).name, 'ai_tool')[0]
    const o = entrants(w, s.name, 'ai_tool').find((x) => x.type.startsWith(B('')))
    if (o) delete o.parameters.operation
    else { w.nodes.push({ id: 'mut2', name: 'Sans opération', type: B('slackTool'), typeVersion: 2.3, position: [0, 0], parameters: {} }); w.connections['Sans opération'] = { ai_tool: [[{ node: s.name, type: 'ai_tool', index: 0 }]] } }
  }, /^M3 .*écrit ou envoie/],
  ['chef sans parseur', (w) => { retirer(w, entrants(w, chefDe(w).name, 'ai_outputParser')[0].name) }, /^M4 .*Structured Output Parser/],
  ['parseur du chef non strict (autoFix vrai)', (w) => { entrants(w, chefDe(w).name, 'ai_outputParser')[0].parameters.autoFix = true }, /^M4 .*autoFix faux/],
  ['montant dans le schéma du chef', (w) => { const p = entrants(w, chefDe(w).name, 'ai_outputParser')[0]; const s = JSON.parse(p.parameters.inputSchema); s.properties.montant_ttc = { type: 'number' }; p.parameters.inputSchema = JSON.stringify(s) }, /^M5 .*propriété d'argent \(montant_ttc\)/],
  ['montant pris dans la sortie du chef', (w) => {
    const rev = aretes(w, chefDe(w).name).find((a) => a.genre === 'main').vers
    w.nodes.push({ id: 'mut3', name: 'Calculer avec le chef', type: B('code'), typeVersion: 2, position: [0, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'return $input.all().map((i) => ({ json: { total: i.json.note_du_chef.montant_ttc } }));' } })
    w.connections[rev] = { main: [[...(w.connections[rev]?.main?.[0] ?? []), { node: 'Calculer avec le chef', type: 'main', index: 0 }]] }
  }, /^M5 .*Calculer avec le chef.*somme est lue dans la note du chef/],
  ['agent-outil sans modèle', (w) => { const s = entrants(w, chefDe(w).name, 'ai_tool')[0]; retirer(w, entrants(w, s.name, 'ai_languageModel')[0].name) }, /^M3 .*sans modèle/],
  ['un seul agent-outil', (w) => { const l = entrants(w, chefDe(w).name, 'ai_tool'); for (const s of l.slice(1)) delete w.connections[s.name] }, /^M2 .*au moins deux/],
  ['porte « simulation » contournée (le chef atteint par « vrai »)', (w) => {
    const porte = w.nodes.find(estPorte); const c = chefDe(w)
    const avant = entrants(w, c.name, 'main')[0]
    // le déclencheur rejoint directement le chef, sans porte
    const decl = w.nodes.find((n) => n.type === B('scheduleTrigger'))
    w.connections[decl.name].main[0].push({ node: c.name, type: 'main', index: 0 })
    void porte; void avant
  }, /^M6 .*effet atteignable/],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (!existsSync(DOSSIER)) { console.error(`✗ dossier absent : ${DOSSIER}`); process.exit(1) }
const fichiers = readdirSync(DOSSIER).filter((f) => /^gabarit-.*\.workflow\.json$/.test(f)).sort()
let faux = 0
const charges = []
for (const f of fichiers) {
  const j = JSON.parse(readFileSync(path.join(DOSSIER, f), 'utf8')); const w = j.workflow ?? j
  if (!w.nodes.some((n) => n.type === AGENT)) { console.log(`– ${f} : aucun agent IA, non concerné (ni chef ni spécialistes à vérifier)`); continue }
  charges.push([f, w])
  const e = juger(w)
  const chef = chefDe(w)
  const nb = chef ? entrants(w, chef.name, 'ai_tool').length : 0
  console.log(`${e.length ? '✗' : '✓'} ${f} : ${e.length ? e.length + ' manquement(s)' : `1 chef, ${nb} spécialistes en agents-outils, parseur strict, aucune somme du chef, aucun effet sans la porte`}`)
  for (const m of e) console.log(`    ${m}`)
  if (e.length) faux++
}
if (!charges.length) { console.log('✗ aucun gabarit avec agent dans le dossier'); process.exit(1) }
console.log(`\nMutants (chacun doit faire rougir le juge pour sa raison) :`)
// Les mutants jouent sur un gabarit artisan et sur un gabarit entreprise.
const bases = [charges.find(([f]) => /artisan-devis/.test(f)) ?? charges[0], charges.find(([f]) => /ent-ventes/.test(f)) ?? charges[charges.length - 1]]
let rate = 0
for (const [nom, muter, attendu] of mutants) for (const [f, w] of bases) {
  const m = copie(w)
  try { muter(m) } catch (err) { console.log(`  ✗ mutant « ${nom} » (${f}) : mutation impossible (${err.message})`); rate++; continue }
  const e = juger(m)
  const touche = e.find((x) => attendu.test(x))
  console.log(`  ${touche ? '✓' : '✗'} mutant « ${nom} » (${f.replace('.workflow.json', '')}) ${touche ? 'fait rougir le juge' : 'N’A PAS fait rougir le juge pour la bonne raison'}`)
  if (touche) console.log(`      → ${touche}`); else { rate++; console.log(`      obtenu : ${e.join(' | ') || 'rien'}`) }
}
if (faux || rate) { console.log(`\n✗ ${faux} gabarit(s) en défaut, ${rate} mutant(s) manqué(s)`); process.exit(1) }
console.log(`\nOK : ${charges.length} gabarits multi-agents tenus, ${mutants.length * bases.length} mutants rouges`)
