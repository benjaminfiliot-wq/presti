// JUGE HORS LIGNE des gabarits OUTILLÉS du département Accueil et réponse (tâche 036-013, prompt 6, outillage, lot 1). Aucun réseau, aucune base, aucun
// modèle, aucune donnée réelle. Il lit les quatre exports (le JSON rendu par le MCP `get_workflow_details`) dans .orchestre/preuves/036-013/ :
//   gabarit-artisan-accueil-boite (Gmail, Outlook, IMAP, notifications de plateformes de devis → dépôt dans la plateforme),
//   gabarit-artisan-accueil-leads (Facebook Lead Ads lu par l'API Graph → dépôt), gabarit-artisan-accueil-reponse (événements → agents Claude → chef
//   presti-dep-accueil → carte, brouillon, file du pilote), gabarit-artisan-accueil-envoi (envois dus du pilote → Gmail, Outlook, SMTP, WhatsApp, Telegram,
//   Messenger, Instagram), et vérifie :
//   S  la STRUCTURE : inactifs ; AUCUN identifiant ; AUCUN webhook ; réglages ; chaque outil de la ligne Accueil du § 5 d'OUTILLAGE.md a son nœud ; l'agent a
//      Claude, un seul parseur, des outils de LECTURE ; aucun effet n'est atteignable sans la sortie « faux » d'une porte « simulation » (calcul propre au juge) ;
//      marque blanche et mention d'IA ; dépôt d'abord dans la plateforme ; nœuds Code identiques au registre des empreintes ;
//   C  le comportement REJOUÉ (node:vm) : sur les essais enregistrés de n8n (mêmes sorties) et sur des cas du juge, avec les VRAIES sorties du chef
//      (036-001/essais-n8n.json) : Studio n'envoie jamais ; Signature sans le type = une carte ; un doublon reçu par deux canaux = une conversation ;
//   K  les constantes comparées au code de Presti (lib/releveCanal.ts, lib/pilote/regles.ts, lib/plans.ts, lib/mentionAssistant.ts).
// Puis il prouve qu'il sait rougir : chaque MUTANT doit le faire échouer pour sa raison.
//   node scripts/gabarits-accueil-qa.mjs [dossier des exports]
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-013')
const P = 'gabarit-artisan-accueil-'
const CLES = ['boite', 'leads', 'reponse', 'envoi']
const B = (t) => `n8n-nodes-base.${t}`, LC = (t) => `@n8n/n8n-nodes-langchain.${t}`
const ID_ERREUR = 'yekMM9ewk03F9y2q', ID_CHEF = 'Ls0oFcQzzAk0rWcP', ID_TRIER = 'SrT4QJJmb6LLM1FK', ID_PHOTO = 'UWjCdC5kv3CXt6jm'
const copie = (o) => JSON.parse(JSON.stringify(o))
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const lire = (p) => JSON.parse(readFileSync(p, 'utf8'))
const lireSource = (p) => readFileSync(path.join(RACINE, p), 'utf8').replace(/\r\n/g, '\n')

// ─── Ce que disent le VRAI code de Presti, chargé ou extrait, jamais recopié ───────────────────────────────────────────────────────────────────
function codeDePresti() {
  const prog = `const r = await import(${JSON.stringify('file://' + path.join(RACINE, 'lib/pilote/regles.ts'))});
const p = await import(${JSON.stringify('file://' + path.join(RACINE, 'lib/plans.ts'))});
const m = await import(${JSON.stringify('file://' + path.join(RACINE, 'lib/mentionAssistant.ts'))});
process.stdout.write(JSON.stringify({ DELAI_ANNULATION_MIN: r.DELAI_ANNULATION_MIN, ATTENTE_MAX_MS: r.ATTENTE_MAX_MS,
  capacites: Object.fromEntries(['studio', 'signature'].map((pl) => [pl, ['plateforme.ia.auto', 'assistant.pilote'].filter((c) => p.peut(pl, c))])), mention_vide: m.mentionAssistant('') }));`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8' }))
}
const CODE = codeDePresti()
const MENTION = CODE.mention_vide.replace(/ de \.$/, '').replace(/\.$/, '')
const SRC_RELEVE = lireSource('lib/releveCanal.ts')
const AUTO_REF = /^const AUTOMATIQUE = (\/.+\/[a-z]*)$/m.exec(SRC_RELEVE)?.[1]
const INDES_REF = /^const INDESIRABLE = (\/.+\/[a-z]*)$/m.exec(SRC_RELEVE)?.[1]

// ─── Les données ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function charger() {
  const wf = Object.fromEntries(CLES.map((k) => [k, lire(path.join(DOSSIER, `${P}${k}.workflow.json`))]))
  return { wf, essais: lire(path.join(DOSSIER, 'essais-n8n.json')), reg: lire(path.join(DOSSIER, 'empreintes-code.json')), chef: lire(path.join(RACINE, '.orchestre/preuves/036-001/essais-n8n.json')) }
}
const noeud = (w, nom) => { const n = w.nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n }
const aretes = (w, nom) => Object.entries(w.connections?.[nom] ?? {}).flatMap(([genre, liste]) => (liste ?? []).flatMap((sortie, i) => (sortie ?? []).filter(Boolean).map((l) => ({ vers: l.node, genre, sortie: i }))))
const estPorte = (n) => n.type === B('if') && /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? ''))
const LECTURES = /^(get|getAll|search|list|read)$/i
const methode = (n) => String(n.parameters?.method ?? n.parameters?.httpRequestMethod ?? 'GET').toUpperCase()
const MODELES = [LC('agent'), LC('anthropic'), LC('chainLlm')]
// Un EFFET (définition du juge, indépendante de n8n-specs-qa) : écrire, envoyer, publier, lire chez Facebook, appeler le modèle.
const estEffet = (n) => (n.type === B('httpRequest') && methode(n) !== 'GET') || (n.type === B('facebookGraphApi'))
  || [B('gmail'), B('microsoftOutlook')].includes(n.type) && !LECTURES.test(String(n.parameters?.operation ?? '')) || [B('emailSend'), B('whatsApp'), B('telegram'), B('twilio'), B('slack')].includes(n.type) || MODELES.includes(n.type)
const estEnvoi = (n) => [B('gmail'), B('microsoftOutlook'), B('emailSend'), B('whatsApp'), B('telegram'), B('facebookGraphApi')].includes(n.type) && (n.type === B('facebookGraphApi') ? methode(n) === 'POST' : !LECTURES.test(String(n.parameters?.operation ?? '')))
function sansPorte(w) {
  const entrants = new Set(w.nodes.flatMap((n) => aretes(w, n.name).filter((a) => a.genre === 'main').map((a) => a.vers)))
  const portes = new Set(w.nodes.filter(estPorte).map((n) => n.name))
  const racines = w.nodes.filter((n) => n.type !== B('stickyNote') && !entrants.has(n.name) && !aretes(w, n.name).some((a) => a.genre !== 'main')).map((n) => n.name)
  const vus = new Set(), file = [...racines]
  while (file.length) { const x = file.shift(); if (vus.has(x)) continue; vus.add(x); for (const a of aretes(w, x)) if (a.genre === 'main' && !(portes.has(x) && a.sortie === 1)) file.push(a.vers) }
  return vus
}

// ─── S : la structure ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(d) {
  const e = []
  const ko = (c, m) => e.push(`${c} ${m}`)
  for (const k of CLES) {
    const w = d.wf[k], nom = P + k
    if (w.name !== nom) ko('S1', `${k} : nom ${w.name}`)
    if (w.active !== false || w.activeVersionId) ko('S1', `${nom} : actif ou publié`)
    const s = w.settings ?? {}
    if (s.errorWorkflow !== ID_ERREUR) ko('S4', `${nom} : workflow d'erreur ${s.errorWorkflow}`)
    if (s.timezone !== 'Europe/Paris') ko('S4', `${nom} : fuseau ${s.timezone}`)
    if (!(Number.isInteger(s.executionTimeout) && s.executionTimeout >= 1 && s.executionTimeout <= 3600)) ko('S4', `${nom} : délai ${s.executionTimeout}`)
    if (s.callerPolicy !== 'none') ko('S4', `${nom} : appelable (${s.callerPolicy})`)
    for (const n of w.nodes) {
      if (Object.keys(n.credentials ?? {}).length) ko('I', `${nom}/${n.name} : identifiant branché (${Object.keys(n.credentials).join(', ')})`)
      if (/webhook/i.test(n.type) || (/Trigger$/.test(n.type) && ![B('scheduleTrigger'), B('gmailTrigger'), B('microsoftOutlookTrigger'), B('emailReadImap')].includes(n.type))) ko('W', `${nom}/${n.name} : déclencheur à webhook ou non permis (${n.type})`)
      if (/sendAndWait/.test(JSON.stringify(n.parameters ?? {})) || /HitlTool$/.test(n.type)) ko('W', `${nom}/${n.name} : envoi avec attente de réponse (webhook de n8n)`)
      if (n.type === B('httpRequest') || n.type === B('facebookGraphApi')) {
        const hote = n.type === B('facebookGraphApi') ? 'graph.facebook.com' : (() => { try { return new URL(n.parameters.url).host } catch { return '?' } })()
        if (!['gorcdvmueakcncsmrouo.supabase.co', 'graph.facebook.com'].includes(hote)) ko('S5', `${nom}/${n.name} : hôte ${hote}`)
      }
    }
    // P : aucun effet sans la porte
    const libres = sansPorte(w)
    for (const n of w.nodes) if (estEffet(n) && libres.has(n.name)) ko('P', `${nom}/${n.name} : effet atteignable sans la sortie « faux » d'une porte « simulation »`)
    const portes = w.nodes.filter(estPorte)
    if (!portes.length) ko('P', `${nom} : aucune porte « simulation »`)
    for (const g of portes) {
      const c = g.parameters?.conditions?.conditions ?? []
      if (!(c.length === 1 && /\$json\.simulation/.test(c[0].leftValue ?? '') && c[0].operator?.type === 'boolean' && c[0].operator?.operation === 'true' && g.parameters.conditions.options?.typeValidation === 'strict')) ko('P', `${nom}/${g.name} : porte mal formée`)
    }
    // B : marque blanche et mention d'IA sur ce qui part après le modèle
    for (const n of w.nodes.filter((x) => estEnvoi(x) || (x.type === B('gmail') && x.parameters?.resource === 'draft') || (x.type === B('microsoftOutlook') && x.parameters?.resource === 'draft'))) {
      const t = JSON.stringify(n.parameters)
      if (/presti/i.test(t)) ko('B', `${nom}/${n.name} : « Presti » dans ce qui part au nom de l'artisan`)
      if (!t.includes(MENTION)) ko('B', `${nom}/${n.name} : la mention de l'assistant manque (${MENTION})`)
      if (/appendAttribution":true/.test(t)) ko('B', `${nom}/${n.name} : la mention de n8n est ajoutée`)
    }
    // E : les empreintes
    for (const n of w.nodes.filter((x) => x.type === B('code'))) {
      if (d.reg[nom]?.[n.name] !== sha(n.parameters.jsCode)) ko('H', `${nom}/${n.name} : empreinte du code changée ou inconnue`)
      if (/\brequire\s*\(|\bfetch\s*\(|\bhelpers\s*\.|\$env\b|\bprocess\s*\./.test(n.parameters.jsCode)) ko('H', `${nom}/${n.name} : module ou réseau dans un nœud Code`)
    }
  }
  const tous = CLES.flatMap((k) => d.wf[k].nodes.map((n) => ({ ...n, _w: k })))
  const a = (type, filtre = () => true) => tous.some((n) => n.type === type && filtre(n))
  // T : chaque outil de la ligne Accueil du § 5 a son nœud
  const matrice = [
    ['Gmail (déclencheur)', a(B('gmailTrigger'))], ['Outlook (déclencheur)', a(B('microsoftOutlookTrigger'))], ['IMAP (déclencheur)', a(B('emailReadImap'))],
    ['horaire (événements de la plateforme)', a(B('scheduleTrigger'), (n) => n._w === 'reponse')], ['Facebook Lead Ads lu par l’API Graph (GET)', a(B('facebookGraphApi'), (n) => n._w === 'leads' && methode(n) === 'GET' && n.parameters.edge === 'leads')],
    ['brouillon Gmail', a(B('gmail'), (n) => n.parameters.resource === 'draft')], ['brouillon Outlook', a(B('microsoftOutlook'), (n) => n.parameters.resource === 'draft')],
    ['réponse Gmail', a(B('gmail'), (n) => n.parameters.operation === 'reply')], ['réponse Outlook', a(B('microsoftOutlook'), (n) => n.parameters.operation === 'reply')], ['réponse SMTP', a(B('emailSend'))],
    ['réponse WhatsApp', a(B('whatsApp'))], ['réponse Telegram', a(B('telegram'))], ['réponse Messenger (API Graph)', a(B('facebookGraphApi'), (n) => n.name === 'Répondre sur Messenger' && methode(n) === 'POST')],
    ['réponse Instagram (API Graph)', a(B('facebookGraphApi'), (n) => n.name === 'Répondre sur Instagram' && methode(n) === 'POST')],
    ['photo par le nœud Anthropic', a(LC('anthropic'), (n) => n.parameters.resource === 'image')], ['chef presti-dep-accueil appelé', a(B('executeWorkflow'), (n) => n.parameters?.workflowId?.value === ID_CHEF)],
    ['carte et journal (HTTP Supabase)', a(B('httpRequest'), (n) => /opportunites/.test(n.parameters.url ?? '')) && a(B('httpRequest'), (n) => /journal_agents/.test(n.parameters.url ?? ''))],
    ['dépôt dans la plateforme', ['boite', 'leads'].every((k) => d.wf[k].nodes.some((n) => n.type === B('httpRequest') && /rpc\/deposer_message/.test(n.parameters.url ?? '') && /organisation_id/.test(n.parameters.jsonBody ?? '')))],
    ['notifications des plateformes de devis', ['habitatpresto', 'travaux.com', 'quotatis', 'starofservice', 'mesdepanneurs'].every((p) => (d.wf.boite.nodes.find((n) => n.name === 'Dédoublonner et classer')?.parameters.jsCode ?? '').includes(p))],
  ]
  for (const [nom, ok] of matrice) if (!ok) ko('T', `outil absent : ${nom}`)
  // A : les agents
  const w3 = d.wf.reponse
  const agents = w3.nodes.filter((n) => n.type === LC('agent'))
  if (agents.length !== 2) ko('A', `${agents.length} agent(s) IA (2 attendus : Qualificateur, Rédacteur)`)
  for (const ag of agents) {
    const sub = (genre) => w3.nodes.filter((x) => aretes(w3, x.name).some((l) => l.genre === genre && l.vers === ag.name))
    const modeles = sub('ai_languageModel'), parseurs = sub('ai_outputParser'), outils = sub('ai_tool')
    if (!(Number(ag.typeVersion) >= 3)) ko('A', `${ag.name} : AI Agent ${ag.typeVersion}`)
    if (modeles.length !== 1 || modeles[0].type !== LC('lmChatAnthropic') || modeles[0].parameters?.model?.value !== 'claude-haiku-5-5') ko('A', `${ag.name} : le modèle n'est pas Claude (claude-haiku-5-5)`)
    if (parseurs.length !== 1 || parseurs[0].type !== LC('outputParserStructured') || parseurs[0].parameters?.schemaType !== 'manual' || parseurs[0].parameters?.autoFix === true) ko('A', `${ag.name} : un seul parseur structuré en JSON Schema saisi attendu`)
    if (!outils.length) ko('A', `${ag.name} : aucun outil de lecture`)
    if (ag.parameters?.options?.passthroughBinaryImages !== false || !(ag.parameters?.options?.maxIterations >= 1 && ag.parameters.options.maxIterations <= 10)) ko('A', `${ag.name} : images ou itérations non bornées`)
    const apres = aretes(w3, ag.name).filter((l) => l.genre === 'main').map((l) => w3.nodes.find((x) => x.name === l.vers))
    if (!apres.length || !apres.every((x) => x.type === B('code') && /throw new Error/.test(x.parameters.jsCode))) ko('A', `${ag.name} : la sortie du modèle n'est pas revalidée par un nœud Code qui refuse`)
    for (const o of outils) {
      const lect = (o.type === B('gmailTool') || o.type === B('microsoftOutlookTool')) && o.parameters?.operation === 'get'
      const flux = o.type === LC('toolWorkflow') && [ID_TRIER, ID_PHOTO].includes(o.parameters?.workflowId?.value) && /^\s*outil\s*:\s*lecture\s*$/m.test(o.notes ?? '')
      if (!lect && !flux) ko('O', `${ag.name}/${o.name} : outil d'agent qui n'est pas une lecture (${o.type} ${o.parameters?.operation ?? ''})`)
    }
  }
  const qual = agents.find((x) => x.name === 'Qualificateur')
  if (qual) {
    const ids = w3.nodes.filter((x) => x.type === LC('toolWorkflow') && aretes(w3, x.name).some((l) => l.vers === 'Qualificateur')).map((x) => x.parameters.workflowId.value)
    if (!ids.includes(ID_TRIER) || !ids.includes(ID_PHOTO)) ko('O', 'Qualificateur : lib-trier-demande et lib-lire-photo doivent être branchés en outils')
  }
  // D : le dépôt d'abord dans la plateforme (aucun message n'est traité s'il n'y est pas) ; le chef et les agents ne lisent que la plateforme
  for (const k of ['boite', 'leads']) {
    const w = d.wf[k], dep = w.nodes.find((n) => n.type === B('httpRequest') && /rpc\/deposer_message/.test(n.parameters.url ?? ''))
    const entrees = w.nodes.filter((n) => /Trigger$|emailReadImap/.test(n.type))
    if (!dep) ko('D', `${P}${k} : aucun dépôt dans la plateforme`)
    else for (const t of entrees) if (!(function atteint(de, vers, vus = new Set()) { if (de === vers) return true; if (vus.has(de)) return false; vus.add(de); return aretes(w, de).some((l) => l.genre === 'main' && atteint(l.vers, vers, vus)) })(t.name, dep.name)) ko('D', `${P}${k} : ${t.name} n'atteint pas le dépôt dans la plateforme`)
  }
  const lecEv = w3.nodes.find((n) => /v_accueil_evenements/.test(n.parameters?.url ?? ''))
  if (!lecEv) ko('D', 'reponse : les événements de la plateforme ne sont pas lus')
  else if (!aretes(w3, 'Regrouper par conversation').length || !aretes(w3, lecEv.name).some((l) => l.vers === 'Regrouper par conversation')) ko('D', 'reponse : le travail ne part pas des événements de la plateforme')
  return e
}

// ─── L'exécuteur hors ligne : les nœuds de l'export, tels quels, dans node:vm ────────────────────────────────────────────────────────────
function executer(w, { pins, declencheur }) {
  const sorties = {}, visites = [], effets = []
  const res = { sorties, visites, effets, erreur: null }
  const parNom = new Map(w.nodes.map((n) => [n.name, n]))
  // sorties[nom][passage][sortie] = les éléments ; $('Nom') lit la première sortie du premier passage, comme n8n.
  const lu = (nom) => (sorties[nom]?.[0] ?? [])[0] ?? []
  const file = [[declencheur, (pins[declencheur] ?? []).map((j) => ({ json: copie(j) })), null]]
  for (let pas = 0; file.length; pas++) {
    if (pas > 400) return { ...res, erreur: 'boucle' }
    const [nom, items, precedent] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { ...res, erreur: `nœud absent : ${nom}` }
    if (!items.length && !/Trigger$|emailReadImap/.test(n.type)) continue // n8n n'exécute pas un nœud sans élément
    visites.push(nom)
    let outs
    try {
      if (/Trigger$|emailReadImap/.test(n.type)) outs = [items]
      else if (n.type === B('set')) outs = [items.map((it) => ({ json: Object.assign({}, n.parameters.includeOtherFields ? it.json : {}, Object.fromEntries((n.parameters.assignments?.assignments ?? []).map((a) => [a.name, a.value]))) }))]
      else if (n.type === B('httpRequest') && methode(n) === 'GET') { if (!pins[nom]) throw new Error(`lecture non épinglée : ${nom}`); outs = [pins[nom].map((j) => ({ json: copie(j) }))] }
      else if (n.type === B('executeWorkflow')) { if (!pins[nom]) throw new Error(`appel non épinglé : ${nom}`); outs = [pins[nom].map((j) => ({ json: copie(j) }))] }
      else if (n.type === B('code')) {
        const dollar = (x) => ({ first: () => (lu(x)[0] === undefined ? undefined : { json: copie(lu(x)[0]) }), all: () => lu(x).map((j) => ({ json: copie(j) })), get item() { throw new Error(`.item non rejoué (${x})`) } })
        const f = vm.runInNewContext(`(function ($input, $prevNode, $) {\n${n.parameters.jsCode}\n})`, {}, { timeout: 5000 })
        outs = [JSON.parse(JSON.stringify(f({ all: () => copie(items), first: () => copie(items[0]) }, { name: precedent }, dollar)))]
        if (!outs[0].every((x) => x && x.json)) throw new Error('un nœud Code doit rendre [{ json }]')
      } else if (n.type === B('if')) {
        const c = n.parameters.conditions.conditions[0]
        const vrai = [], faux = []
        for (const it of items) {
          const v = new Function('$json', `return (${c.leftValue.replace(/^=\{\{|\}\}$/g, '')})`)(it.json)
          if (typeof v !== 'boolean' && n.parameters.conditions.options?.typeValidation === 'strict' && c.operator.type === 'boolean') throw new Error(`${nom} : valeur non booléenne en typage strict`)
          const ok = c.operator.type === 'boolean' ? v === true : String(v) === String(c.rightValue)
          ;(ok ? vrai : faux).push(it)
        }
        outs = [vrai, faux]
      } else if (n.type === B('switch')) {
        const regles = n.parameters.rules.values
        outs = regles.map(() => []).concat([[]])
        for (const it of items) {
          const i = regles.findIndex((r) => r.conditions.conditions.every((c) => { if (/\$\(/.test(c.leftValue)) throw new Error('switch : référence à un autre nœud non rejouée'); return String(new Function('$json', `return (${c.leftValue.replace(/^=\{\{|\}\}$/g, '')})`)(it.json)) === String(c.rightValue) }))
          outs[i < 0 ? regles.length : i].push(it)
        }
      } else if (n.type === B('stickyNote')) outs = [[]]
      else if (estEffet(n)) { effets.push({ noeud: nom, type: n.type, simulation: items.map((it) => it.json.simulation) }); outs = [items] }
      else throw new Error(`type inconnu du rejeu : ${n.type}`)
    } catch (e) { return { ...res, erreur: `${nom} : ${e.message}` } }
    ;(sorties[nom] ??= []).push(outs.map((o) => o.map((i) => i.json)))
    outs.forEach((o, i) => { for (const l of (w.connections?.[nom]?.main?.[i] ?? [])) file.push([l.node, o, nom]) })
  }
  return res
}
const rejouer = (w, o) => executer(w, o)
const items = (r, nom, sortie = 0) => (r.sorties[nom]?.[0] ?? [])[sortie] ?? []

// ─── C : le comportement rejoué ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function comportement(d) {
  const e = []
  const ko = (c, m) => e.push(`${c} ${m}`)
  const essai = (id) => d.essais.find((x) => x.execution === id)
  const run = (k, id, surcharge = {}) => { const x = essai(id); if (!x) return null; return rejouer(d.wf[k], { pins: { ...copie(x.entrees_epinglees), ...surcharge }, declencheur: x.declencheur_epingle[0] }) }
  // N : le rejeu redonne EXACTEMENT ce que n8n a rendu
  for (const x of d.essais) {
    const k = x.workflow.replace(P, ''), w = d.wf[k]
    const r = run(k, x.execution)
    if (!r || r.erreur) { ko('N', `${x.workflow} #${x.execution} : rejeu impossible (${r?.erreur})`); continue }
    for (const [nom, passages] of Object.entries(x.sorties)) {
      const n = w.nodes.find((y) => y.name === nom)
      if (n?.type !== B('code')) continue
      const rejoue = r.sorties[nom]?.[0]
      if (JSON.stringify(rejoue) !== JSON.stringify(passages[0])) ko('N', `${x.workflow} #${x.execution} « ${nom} » : le rejeu ne redonne pas la sortie de n8n`)
    }
    for (const f of r.effets) if (f.simulation.some((s) => s === true)) ko('P', `${x.workflow} #${x.execution} : « ${f.noeud} » atteint en simulation`)
  }
  // boîte (615) : un message n'entre qu'une fois, un client n'a qu'une conversation, une lettre automatique est ignorée
  const r615 = run('boite', 615)
  if (r615 && !r615.erreur) {
    const prevus = items(r615, 'Dépôt prévu')[0]?.effets_prevus ?? []
    if (prevus.length !== 2 || new Set(prevus.map((p) => p.conversation_cle)).size !== 1) ko('C', 'boite : deux messages du même client doivent donner DEUX dépôts dans UNE conversation')
    if (new Set(prevus.map((p) => p.cle)).size !== prevus.length) ko('C', 'boite : un message déposé deux fois')
    const motifs = (items(r615, 'Ignoré (journal)')[0]?.ignores ?? []).map((x) => x.motif).sort().join(',')
    if (motifs !== 'automatique,doublon') ko('C', `boite : doublon et lettre automatique à ignorer (${motifs})`)
    if (items(r615, 'Dépôt prévu')[0]?.effets_faits?.length) ko('C', 'boite : effets_faits doit rester vide en simulation')
  } else ko('C', 'boite : essai 615 absent ou rejeu en erreur (' + (r615 && r615.erreur) + ')')
  // boîte, cas du juge : notification d'une plateforme de devis, interrupteur coupé, réglages absents de la simulation
  const base = essai(615)
  if (base) {
    const un = (m, cfg) => { const pins = copie(base.entrees_epinglees); pins['Nouvel e-mail Gmail'] = [m]; if (cfg) pins['Lire les réglages'] = [cfg]; return rejouer(d.wf.boite, { pins, declencheur: 'Nouvel e-mail Gmail' }) }
    const arobase = String.fromCharCode(64)
    const plat = un({ id: 'p1', messageId: '<pf1>', from: { value: [{ address: 'noreply' + arobase + 'quotatis.fr', name: 'Exemple. Plateforme' }] }, subject: 'Exemple. Nouvelle demande', text: 'Exemple. Un client souhaite un devis pour une terrasse.' })
    const c = items(plat, 'Dédoublonner et classer')[0]
    if (!c || c.voie !== 'deposer' || c.repondre_au_client !== false || c.canal_origine !== 'plateforme_devis') ko('C', 'boite : une notification de plateforme de devis doit être déposée SANS réponse au client')
    const coupe = un({ id: 'c1', messageId: '<c1>', from: { value: [{ address: 'x' + arobase + 'exemple.invalid' }] }, subject: 'Exemple.', text: 'Exemple. Bonjour, une demande assez longue.' }, { simulation: true, interrupteur_general: false })
    if (items(coupe, 'Dédoublonner et classer')[0]?.voie !== 'ignorer') ko('C', 'boite : un interrupteur coupé doit tout ignorer')
    const sansLigne = un({ id: 's1', messageId: '<s1>', from: { value: [{ address: 'x' + arobase + 'exemple.invalid' }] }, subject: 'Exemple.', text: 'Exemple. Bonjour, une demande assez longue.' }, {})
    if (items(sansLigne, 'Dédoublonner et classer')[0]?.simulation !== true) ko('C', 'boite : des réglages vides doivent laisser la simulation (fail-closed)')
  }
  // leads (617)
  const r617 = run('leads', 617)
  if (r617 && !r617.erreur) {
    if (r617.visites.includes('Lire les leads Facebook')) ko('C', 'leads : Facebook est lu en simulation')
    const p = items(r617, 'Dépôt prévu')[0]?.effets_prevus ?? []
    if (p.length !== 1 || p[0].canal_origine !== 'facebook_lead') ko('C', 'leads : un lead = un dépôt prévu, canal facebook_lead')
  } else ko('C', 'leads : essai 617 absent ou rejeu en erreur (' + (r617 && r617.erreur) + ')')
  // réponse : Studio, Signature avec le type, Signature sans le type, spam — avec les sorties enregistrées PUIS les VRAIES sorties du chef (036-001)
  const voies = (r) => items(r, 'Aiguiller les effets').map((x) => x.voie)
  const chef = (execution, i) => d.chef.find((x) => x.execution === execution)?.sorties?.[i]
  const studioReel = chef(470, 0), signatureReel = chef(470, 1), spamReel = chef(487, 0)
  const verifierStudio = (r, qui) => {
    const v = voies(r)
    if (v.includes('pilote')) ko('C', `${qui} : Studio met une réponse dans la file du pilote`)
    if (r.effets.some((f) => /Répondre|Mettre en file/.test(f.noeud))) ko('C', `${qui} : Studio atteint un nœud d'envoi`)
    if (v.filter((x) => x === 'carte').length < 1) ko('C', `${qui} : Studio doit préparer une carte`)
    if (!v.includes('brouillon')) ko('C', `${qui} : Studio doit préparer un brouillon pour un courriel Gmail ou Outlook`)
    if (items(r, 'Effets prévus')[0]?.effets_prevus?.some((p) => /^envoyer/.test(p.effet))) ko('C', `${qui} : Studio prévoit un envoi`)
  }
  const r623 = run('reponse', 623)
  if (r623 && !r623.erreur) {
    verifierStudio(r623, 'reponse #623')
    const ag = items(r623, 'Aiguiller les effets')
    if (ag.filter((x) => x.voie === 'brouillon').length !== 1 || ag.find((x) => x.voie === 'brouillon')?.canal_origine !== 'gmail') ko('C', 'reponse #623 : un seul brouillon, pour le courriel Gmail (le WhatsApp : une carte seule)')
    if (r623.visites.some((v) => /Qualificateur|Rédacteur|Claude|photo/i.test(v))) ko('C', 'reponse #623 : le modèle est appelé en simulation')
    if (studioReel) { const r = run('reponse', 623, { 'Appeler presti-dep-accueil': [studioReel] }); if (r.erreur) ko('C', `reponse (sortie réelle du chef, Studio) : ${r.erreur}`); else verifierStudio(r, 'reponse (sortie réelle du chef, Studio)') }
    else ko('C', 'la sortie réelle du chef (Studio, 036-001 essai 470) est introuvable')
  } else ko('C', 'reponse : essai 623 absent ou rejeu en erreur (' + (r623 && r623.erreur) + ')')
  const r627 = run('reponse', 627)
  if (r627 && !r627.erreur) {
    const g = items(r627, 'Regrouper par conversation')
    if (g.length !== 2) ko('C', `reponse #627 : trois messages dont deux d'un même client par deux canaux doivent donner 2 conversations (${g.length})`)
    if (!g.some((x) => x.canaux.length === 2 && x.evenement_ids.length === 2)) ko('C', 'reponse #627 : le doublon reçu par deux canaux n’est pas fusionné dans une seule conversation')
    const v = voies(r627)
    if (v.filter((x) => x === 'pilote').length !== 1 || v.includes('brouillon')) ko('C', 'reponse #627 : Signature avec le type : UNE ligne du pilote, aucun brouillon')
    if (items(r627, 'Aiguiller les effets').find((x) => x.voie === 'pilote')?.envoi_par !== 'whatsapp') ko('C', 'reponse #627 : la réponse doit repartir par le canal du dernier message (whatsapp)')
    if (r627.effets.length) ko('C', 'reponse #627 : un effet est atteint en simulation')
  } else ko('C', 'reponse : essai 627 absent ou rejeu en erreur (' + (r627 && r627.erreur) + ')')
  const r628 = run('reponse', 628)
  if (r628 && !r628.erreur) {
    const v = voies(r628)
    if (v.includes('pilote') || v.includes('brouillon') || v.filter((x) => x === 'carte').length !== 1) ko('C', 'reponse #628 : Signature SANS le type : une carte, ni file du pilote ni brouillon')
  } else ko('C', 'reponse : essai 628 absent ou rejeu en erreur (' + (r628 && r628.erreur) + ')')
  const r629 = run('reponse', 629)
  if (r629 && !r629.erreur) {
    if (voies(r629).join() !== 'journal') ko('C', `reponse #629 : un spam ne laisse que le journal (${voies(r629)})`)
    if (spamReel) { const r = run('reponse', 629, { 'Appeler presti-dep-accueil': [spamReel] }); if (r.erreur || voies(r).join() !== 'journal') ko('C', `reponse (sortie réelle du chef, spam) : ${r.erreur ?? voies(r)}`) }
  } else ko('C', 'reponse : essai 629 absent ou rejeu en erreur (' + (r629 && r629.erreur) + ')')
  // défense en profondeur : un chef qui demanderait la file du pilote à un compte qui n'y a pas droit
  if (essai(623) && studioReel) {
    const piege = copie(studioReel); piege.effets_prevus.push({ effet: 'mettre_en_file_pilote', corps: { organisation_id: 'x', cle: 'h:piege', type_action: 'reponse_prospect', objet_type: 'demande', objet_id: '00000000-0000-4000-8000-a00000000001', canal: 'email', brouillon: { objet: 'x', texte: 'x' } } })
    const r = run('reponse', 623, { 'Appeler presti-dep-accueil': [piege] })
    if (voies(r).includes('pilote') || !voies(r).includes('refus_offre')) ko('C', 'reponse : Studio ne doit jamais atteindre la file du pilote, même si le chef la demande')
  }
  if (essai(627) && signatureReel) {
    const inactif = (x) => { const pins = copie(essai(627).entrees_epinglees); pins['Lire les réglages'][0] = x(pins['Lire les réglages'][0]); pins['Appeler presti-dep-accueil'] = [signatureReel]; return rejouer(d.wf.reponse, { pins, declencheur: 'Cadence : événements de la plateforme' }) }
    for (const [nom, f] of [['pilote inactif', (c) => ({ ...c, pilote: { ...c.pilote, actif: false } })], ['mode assisté', (c) => ({ ...c, mode_reponse: 'assistee' })]]) {
      const r = inactif(f); if (voies(r).includes('pilote')) ko('C', `reponse : Signature avec ${nom} ne doit pas mettre en file du pilote`)
    }
    const interrupteur = inactif((c) => ({ ...c, interrupteur_departement: false }))
    if (interrupteur.sorties['Regrouper par conversation']?.[0]?.[0]?.length) ko('C', 'reponse : un interrupteur coupé doit tout arrêter')
  }
  // envoi : 624 (Signature), 625 (sans le type), 626 (Studio)
  const eff = (r) => (items(r, 'Envois prévus')[0]?.effets_prevus ?? []).map((p) => `${p.effet}${p.motif ? ':' + p.motif : ''}`).join(',')
  const r624 = run('envoi', 624)
  if (r624 && !r624.erreur) { if (eff(r624) !== 'envoyer_gmail,envoyer_whatsapp,repasser_en_carte:opposition,attendre:delai_10_minutes,envoyer_imap') ko('C', `envoi #624 : ${eff(r624)}`) } else ko('C', 'envoi : essai 624 absent ou rejeu en erreur (' + (r624 && r624.erreur) + ')')
  const r625 = run('envoi', 625)
  if (r625 && !r625.erreur) { if (eff(r625) !== 'repasser_en_carte:type') ko('C', `envoi #625 : Signature sans le type doit repasser en carte (${eff(r625)})`) } else ko('C', 'envoi : essai 625 absent ou rejeu en erreur (' + (r625 && r625.erreur) + ')')
  const r626 = run('envoi', 626)
  if (r626 && !r626.erreur) { if (eff(r626) !== 'repasser_en_carte:offre') ko('C', `envoi #626 : Studio n'envoie jamais (${eff(r626)})`) } else ko('C', 'envoi : essai 626 absent ou rejeu en erreur (' + (r626 && r626.erreur) + ')')
  // envoi, cas du juge : chaque condition du pilote retirée l'une après l'autre, et la propriété « Studio n'envoie jamais »
  const x624 = essai(624)
  if (x624) {
    const motifDe = (cfgF, ligneF = (l) => l) => { const pins = copie(x624.entrees_epinglees); pins['Lire les réglages'][0] = cfgF(pins['Lire les réglages'][0]); pins['Lire les envois dus'] = [ligneF(pins['Lire les envois dus'][0])]; const r = rejouer(d.wf.envoi, { pins, declencheur: x624.declencheur_epingle[0] }); const x = items(r, 'Contrôle avant envoi')[0]; return x ? `${x.decision}:${x.motif ?? ''}` : r.erreur }
    const cas = [
      ['tout est tenu', (c) => c, (l) => l, 'envoyer:'],
      ['plafond du jour atteint', (c) => ({ ...c, parties_depuis_24h: 20 }), (l) => l, 'repli:plafond'],
      ['mode non auto', (c) => ({ ...c, mode_reponse: 'assistee' }), (l) => l, 'repli:mode'],
      ['pilote coupé', (c) => ({ ...c, pilote: { ...c.pilote, actif: false } }), (l) => l, 'repli:pilote'],
      ['type non activé', (c) => ({ ...c, pilote: { ...c.pilote, types: {} } }), (l) => l, 'repli:type'],
      ['opposition inconnue', (c) => c, (l) => ({ ...l, opposition: null }), 'repli:opposition'],
      ['action d’un autre type', (c) => c, (l) => ({ ...l, type: 'relance_devis' }), 'repli:type_action'],
      ['réponse périmée (plus de 24 h)', (c) => c, (l) => ({ ...l, prete_le: '2026-11-01T10:00:00.000+01:00' }), 'repli:perime'],
      ['moins de 10 minutes', (c) => c, (l) => ({ ...l, prete_le: '2026-11-03T14:10:00.000+01:00' }), 'attendre:delai_10_minutes'],
      ['canal non branché', (c) => c, (l) => ({ ...l, canal_origine: 'sms' }), 'repli:canal_non_branche'],
      ['interrupteur coupé', (c) => ({ ...c, interrupteur_general: false }), (l) => l, 'repli:interrupteur'],
      ['offre sans pilote', (c) => ({ ...c, capacites: c.capacites.filter((x) => x !== 'assistant.pilote') }), (l) => l, 'repli:offre'],
    ]
    for (const [nom, cf, lf, attendu] of cas) { const m = motifDe(cf, lf); if (m !== attendu) ko('C', `envoi : « ${nom} » doit donner ${attendu} (${m})`) }
    for (const canal of ['gmail', 'outlook', 'imap', 'whatsapp', 'telegram', 'messenger', 'instagram']) {
      const m = motifDe((c) => ({ ...c, offre: 'studio', mode_reponse: 'assistee', capacites: ['canaux.email', 'assistant'], pilote: { drapeau: true, actif: false, types: {} } }), (l) => ({ ...l, canal_origine: canal }))
      if (!m.startsWith('repli:')) ko('C', `envoi : Studio ne doit jamais envoyer (${canal} : ${m})`)
    }
  }
  return e
}

// ─── K : les constantes comparées au code de Presti ─────────────────────────────────────────────────────────────────────────────────────────
function constantes(d) {
  const e = [], ko = (c, m) => e.push(`${c} ${m}`)
  const boite = d.wf.boite.nodes.find((n) => n.name === 'Dédoublonner et classer')?.parameters.jsCode ?? ''
  if (!AUTO_REF || !INDES_REF) ko('K', 'lib/releveCanal.ts : AUTOMATIQUE ou INDESIRABLE introuvables')
  if (!boite.includes(`const AUTOMATIQUE = ${AUTO_REF};`)) ko('K', 'boite : AUTOMATIQUE n’est plus celle de lib/releveCanal.ts')
  if (!boite.includes(`const INDESIRABLE = ${INDES_REF};`)) ko('K', 'boite : INDESIRABLE n’est plus celle de lib/releveCanal.ts')
  const envoi = d.wf.envoi.nodes.find((n) => n.name === 'Contrôle avant envoi')?.parameters.jsCode ?? ''
  if (!envoi.includes(`const DIX_MIN = ${CODE.DELAI_ANNULATION_MIN * 60000};`)) ko('K', `envoi : le délai d'annulation n'est plus ${CODE.DELAI_ANNULATION_MIN} minutes (lib/pilote/regles.ts)`)
  if (!envoi.includes(`const JOUR = ${CODE.ATTENTE_MAX_MS};`)) ko('K', `envoi : l'attente maximale n'est plus ${CODE.ATTENTE_MAX_MS} ms (lib/pilote/regles.ts)`)
  if (CODE.capacites.studio.length !== 0 || CODE.capacites.signature.length !== 2) ko('K', `lib/plans.ts : Studio ne doit avoir aucune capacité du pilote, Signature les deux (${JSON.stringify(CODE.capacites)})`)
  for (const c of ['plateforme.ia.auto', 'assistant.pilote']) if (!envoi.includes(`'${c}'`) || !d.wf.reponse.nodes.find((n) => n.name === 'Aiguiller les effets').parameters.jsCode.includes(`'${c}'`)) ko('K', `la capacité ${c} n'est pas relue par le gabarit`)
  if (!MENTION.includes('Message rédigé et envoyé automatiquement par l’assistant')) ko('K', `lib/mentionAssistant.ts : la mention a changé (${MENTION})`)
  return e
}

const verifier = (d) => [...structure(d), ...comportement(d), ...constantes(d)]

// ─── Les mutants ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lien = (vers, i = 0, type = 'main') => ({ node: vers, type, index: i })
// Modifier un nœud Code ET son empreinte : seul le REJEU peut alors le prendre (pas le registre).
const codeChange = (d, k, nom, f) => { const n = noeud(d.wf[k], nom); n.parameters.jsCode = f(n.parameters.jsCode); d.reg[P + k][nom] = sha(n.parameters.jsCode) }
const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error(`motif introuvable : ${a.slice(0, 50)}`); return s.replace(a, b) }
const MUTANTS = [
  ['un envoi atteint en simulation (la sortie « vrai » de la porte relie Gmail)', (d) => { d.wf.envoi.connections['Porte simulation'].main[0].push(lien('Répondre par Gmail')) }, /^P .*Répondre par Gmail.*sans la sortie « faux »/],
  ['un envoi atteint avant la porte (le contrôle relie WhatsApp)', (d) => { d.wf.envoi.connections['Contrôle avant envoi'].main[0].push(lien('Répondre par WhatsApp')) }, /^P .*Répondre par WhatsApp/],
  ['l’agent atteint en simulation (la porte « modèle » relie le Rédacteur)', (d) => { d.wf.reponse.connections['Porte simulation (modèle)'].main[0].push(lien('Rédacteur')) }, /^P .*Rédacteur/],
  ['une écriture dans la plateforme avant la porte (boîte)', (d) => { d.wf.boite.connections['Dédoublonner et classer'].main[0].push(lien('Déposer dans la plateforme')) }, /^P .*Déposer dans la plateforme/],
  ['la lecture Facebook hors de la porte (leads)', (d) => { d.wf.leads.connections['Lire les réglages'].main[0].push(lien('Lire les leads Facebook')) }, /^P .*Lire les leads Facebook/],
  ['la porte sans condition booléenne stricte', (d) => { noeud(d.wf.envoi, 'Porte simulation').parameters.conditions.options.typeValidation = 'loose' }, /^P .*Porte simulation.*mal formée/],
  ['un identifiant branché sur Gmail', (d) => { noeud(d.wf.envoi, 'Répondre par Gmail').credentials = { gmailOAuth2: { id: 'IdentifiantFictif09', name: 'Gmail du client' } } }, /^I .*Répondre par Gmail/],
  ['un identifiant branché sur le modèle', (d) => { noeud(d.wf.reponse, 'Claude (rédacteur)').credentials = { anthropicApi: { id: 'IdentifiantFictif08', name: 'Anthropic' } } }, /^I .*Claude \(rédacteur\)/],
  ['un déclencheur WhatsApp en webhook', (d) => { d.wf.reponse.nodes.push({ id: 'wa', name: 'Message WhatsApp', type: B('whatsAppTrigger'), typeVersion: 1, position: [0, 0], parameters: {} }); d.wf.reponse.connections['Message WhatsApp'] = { main: [[lien('Compte de cette copie')]] } }, /^W .*Message WhatsApp/],
  ['un webhook générique', (d) => { d.wf.boite.nodes.push({ id: 'wh', name: 'Entrée publique', type: B('webhook'), typeVersion: 2, position: [0, 0], parameters: { path: 'x' } }) }, /^W .*Entrée publique/],
  ['Facebook Lead Ads en webhook', (d) => { d.wf.leads.nodes.push({ id: 'fl', name: 'Nouveau lead', type: B('facebookLeadAdsTrigger'), typeVersion: 1, position: [0, 0], parameters: {} }) }, /^W .*Nouveau lead/],
  ['un envoi avec attente de réponse (webhook de n8n)', (d) => { noeud(d.wf.envoi, 'Répondre par Gmail').parameters.operation = 'sendAndWait' }, /^W .*Répondre par Gmail/],
  ['un outil d’agent qui envoie (Gmail send)', (d) => { Object.assign(noeud(d.wf.reponse, 'Lire le fil Gmail (rédacteur)').parameters, { resource: 'message', operation: 'send' }) }, /^O .*Lire le fil Gmail \(rédacteur\).*pas une lecture/],
  ['un outil d’agent qui écrit (brouillon Outlook en outil)', (d) => { noeud(d.wf.reponse, 'Lire le message Outlook (qualificateur)').parameters = { resource: 'draft', operation: 'create' } }, /^O .*Lire le message Outlook \(qualificateur\)/],
  ['un sous-workflow en outil sans « outil: lecture »', (d) => { delete noeud(d.wf.reponse, 'Trier la demande (lib-trier-demande)').notes }, /^O .*Trier la demande/],
  ['« Presti » dans la réponse Gmail', (d) => { const n = noeud(d.wf.envoi, 'Répondre par Gmail'); n.parameters.message += ' — Envoyé avec Presti' }, /^B .*Répondre par Gmail.*Presti/],
  ['« Presti » dans la réponse Telegram', (d) => { const n = noeud(d.wf.envoi, 'Répondre par Telegram'); n.parameters.text += ' Presti' }, /^B .*Répondre par Telegram.*Presti/],
  ['la mention de l’assistant retirée de WhatsApp', (d) => { noeud(d.wf.envoi, 'Répondre par WhatsApp').parameters.textBody = '={{ $("Contrôle avant envoi").item.json.texte }}' }, /^B .*Répondre par WhatsApp.*mention/],
  ['la mention de n8n ajoutée à Gmail', (d) => { noeud(d.wf.envoi, 'Répondre par Gmail').parameters.options.appendAttribution = true }, /^B .*Répondre par Gmail.*mention de n8n/],
  ['le nœud Gmail retiré', (d) => { const w = d.wf.boite; w.nodes = w.nodes.filter((n) => n.name !== 'Nouvel e-mail Gmail'); delete w.connections['Nouvel e-mail Gmail'] }, /^T outil absent : Gmail \(déclencheur\)/],
  ['le nœud Outlook de réponse retiré', (d) => { const w = d.wf.envoi; w.nodes = w.nodes.filter((n) => n.name !== 'Répondre par Outlook'); delete w.connections['Répondre par Outlook'] }, /^T outil absent : réponse Outlook/],
  ['la lecture Facebook retirée', (d) => { const w = d.wf.leads; w.nodes = w.nodes.filter((n) => n.name !== 'Lire les leads Facebook'); delete w.connections['Lire les leads Facebook']; w.connections['Porte simulation (lecture)'].main[1] = [] }, /^T outil absent : Facebook Lead Ads/],
  ['le parseur de l’agent débranché', (d) => { delete d.wf.reponse.connections['Schéma du rédacteur'] }, /^A Rédacteur.*parseur/],
  ['l’agent sans la revalidation en Code', (d) => { d.wf.reponse.connections['Rédacteur'].main[0] = [lien('Préparer la demande au chef')] }, /^A Rédacteur.*revalidée/],
  ['le modèle de l’agent n’est plus Claude', (d) => { const n = noeud(d.wf.reponse, 'Claude (qualificateur)'); n.type = LC('lmChatOpenAi') }, /^A Qualificateur.*pas Claude/],
  ['Studio qui envoie : la file du pilote ouverte sans condition', (d) => codeChange(d, 'reponse', 'Aiguiller les effets', (s) => remplacer(s, 'if (pilotePermis) sortie.push', 'if (true) sortie.push')), /^C .*Studio.*(file du pilote|nœud d'envoi)/],
  ['Studio qui n’écrit plus de brouillon : il envoie à la place', (d) => codeChange(d, 'reponse', 'Aiguiller les effets', (s) => remplacer(s, 'if (!autonome && g &&', 'if (false && g &&')), /^C .*Studio doit préparer un brouillon/],
  ['Signature sans le type : le pilote part quand même', (d) => codeChange(d, 'envoi', 'Contrôle avant envoi', (s) => remplacer(s, "else if (!(pilote.types && pilote.types.reponse_prospect === true)) motif = 'type';", '')), /^C .*(sans le type|type non activé)/],
  ['le délai de 10 minutes retiré', (d) => codeChange(d, 'envoi', 'Contrôle avant envoi', (s) => remplacer(s, "else if (age < DIX_MIN) { decision = 'attendre'; motif = 'delai_10_minutes'; }", '')), /^C .*(moins de 10 minutes|#624)/],
  ['Studio envoie dans l’envoi (l’offre n’est plus contrôlée)', (d) => codeChange(d, 'envoi', 'Contrôle avant envoi', (s) => remplacer(s, "else if (!autonome) motif = 'offre';", '')), /^C .*Studio n'envoie jamais|^C .*offre/],
  ['le plafond du jour retiré', (d) => codeChange(d, 'envoi', 'Contrôle avant envoi', (s) => remplacer(s, "else if (partis >= plafond) motif = 'plafond';", '')), /^C .*plafond/],
  ['l’opposition ignorée', (d) => codeChange(d, 'envoi', 'Contrôle avant envoi', (s) => remplacer(s, "else if (l.opposition !== false) motif = 'opposition';", '')), /^C .*opposition/],
  ['un doublon reçu par deux canaux : deux conversations', (d) => codeChange(d, 'reponse', 'Regrouper par conversation', (s) => remplacer(s, 'groupes.get(ev.conversation_cle)', 'groupes.get(ev.conversation_cle + ev.canal_origine)')), /^C .*(doublon reçu par deux canaux|2 conversations)/],
  ['un message déposé deux fois (la clé du courriel ignorée)', (d) => codeChange(d, 'boite', 'Dédoublonner et classer', (s) => remplacer(s, "else if (vus.has(cle)) motif = 'doublon';", '')), /^C .*(déposé deux fois|doublon et lettre automatique|DEUX dépôts)/],
  ['deux conversations pour un même client (la clé de conversation par canal)', (d) => codeChange(d, 'boite', 'Dédoublonner et classer', (s) => remplacer(s, "'c:' + m.de_adresse", "'c:' + m.de_adresse + m.source + m.ref_externe")), /^C .*(UNE conversation|DEUX dépôts)/],
  ['la notification d’une plateforme de devis reçoit une réponse', (d) => codeChange(d, 'boite', 'Dédoublonner et classer', (s) => remplacer(s, 'repondre_au_client: !plateforme', 'repondre_au_client: true')), /^C .*plateforme de devis/],
  ['le message non déposé dans la plateforme (boîte)', (d) => { d.wf.boite.connections['Porte simulation'].main[1] = [] }, /^D .*(Nouvel e-mail|dépôt)/],
  ['le dépôt sans compte (boîte)', (d) => { noeud(d.wf.boite, 'Déposer dans la plateforme').parameters.jsonBody = noeud(d.wf.boite, 'Déposer dans la plateforme').parameters.jsonBody.replaceAll('organisation_id', 'compte') }, /^T outil absent : dépôt dans la plateforme/],
  ['un lead qui n’atteint pas la plateforme', (d) => { d.wf.leads.connections['Normaliser les leads'].main[0] = [] }, /^D .*dépôt/],
  ['l’AUTOMATIQUE de releverCanal modifié', (d) => codeChange(d, 'boite', 'Dédoublonner et classer', (s) => remplacer(s, 'postmaster|', 'postmaster|facture|')), /^K boite : AUTOMATIQUE/],
  ['le délai d’annulation modifié', (d) => codeChange(d, 'envoi', 'Contrôle avant envoi', (s) => remplacer(s, 'const DIX_MIN = 600000;', 'const DIX_MIN = 60000;')), /^K envoi : le délai d'annulation/],
  ['un octet changé dans un nœud Code (empreinte)', (d) => { noeud(d.wf.leads, 'Dépôt prévu').parameters.jsCode += '\n// ajout' }, /^H .*Dépôt prévu.*empreinte/],
  ['un workflow publié', (d) => { d.wf.envoi.active = true }, /^S1 .*actif ou publié/],
  ['le workflow d’erreur retiré', (d) => { delete d.wf.reponse.settings.errorWorkflow }, /^S4 .*workflow d'erreur/],
  ['un workflow appelable par tous', (d) => { d.wf.boite.settings.callerPolicy = 'any' }, /^S4 .*appelable/],
  ['un hôte tiers', (d) => { noeud(d.wf.boite, 'Lire les réglages').parameters.url = 'https://exemple.invalid/rest/v1/x' }, /^S5 .*hôte/],
]

// ─── Lancement ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const d0 = charger()
const e0 = verifier(d0)
console.log(`${e0.length ? '✗' : '✓'} ${CLES.length} gabarits, ${d0.essais.length} essais n8n rejoués : ${e0.length ? e0.length + ' manquement(s)' : 'structure (S, I, W, P, B, T, A, O, D, H), comportement (C, N) et constantes (K) tenus'}`)
for (const m of e0) console.log(`    ✗ ${m}`)
let rouges = 0
if (!e0.length) {
  for (const [titre, f, attendu] of MUTANTS) {
    const d = copie(d0)
    let e
    try { f(d); e = verifier(d) } catch (err) { e = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`) }
    const bon = e.filter((m) => attendu.test(m))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » ${bon.length ? 'fait rougir le juge' : 'NE FAIT PAS rougir le juge pour sa raison'}\n      → ${(bon[0] ?? e[0] ?? 'aucun manquement').slice(0, 170)}`)
    if (bon.length) rouges++
  }
  console.log(`gabarits-accueil-qa : ${MUTANTS.length} mutants, ${rouges} rouges pour leur raison`)
}
const echec = e0.length > 0 || rouges !== MUTANTS.length
console.log(echec ? 'ÉCHEC' : 'OK')
process.exit(echec ? 1 : 0)
