// JUGE des gabarits OUTILLÉS de l'argent (tâche 036-014, prompt 6, outillage, lot 2) : gabarit-artisan-devis, gabarit-artisan-suivi, gabarit-artisan-facturation.
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucun compte. Il lit les EXPORTS (`.orchestre/preuves/036-014/*.workflow.json`, tels que n8n les rend) et le
// registre des empreintes ; il ne lit jamais la fabrique. Le garde commun (scripts/n8n-specs-qa.mjs, R1 à R23) se lance à part, sur le même dossier.
//   node scripts/gabarits-argent-qa.mjs [dossier]
// Ce qu'il prouve :
//   S  structure : les outils des lignes 2 à 4 de la matrice (OUTILLAGE.md § 5) sont là avec leur vrai type de nœud ; chaque agent a son modèle Claude, son parseur à schéma
//      strict et des outils de LECTURE ; aucun effet (envoi, brouillon, écriture, rangement, signature, appel du modèle) n'est atteignable sans la sortie « faux » d'une porte
//      « simulation » ; aucun identifiant, aucun webhook ; Stripe en lecture seule ; « Presti » nulle part dans un message ; la mention d'assistant dans chaque envoi.
//   M  l'argent : aucun opérateur arithmétique dans un nœud Code (arbre syntaxique) ; le modèle ne voit aucun prix, ne peut en écrire aucun (schéma, revalidation) ; un prix est LU.
//   E  les essais : les nœuds Code et l'aiguillage des exports sont REJOUÉS sur des dossiers d'exemple, pins à la place des lectures, des outils et du modèle ; chaque essai
//      du prompt est joué en simulation puis en mode réel (devis tarifé en Signature, prix estimé, Studio, STOP, paiement lu, facture non émise…).
//   X  les mutants : chaque faute plausible doit faire rougir le juge pour sa raison.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-014')
const NOMS = ['gabarit-artisan-devis', 'gabarit-artisan-suivi', 'gabarit-artisan-facturation']
const B = (t) => `n8n-nodes-base.${t}`, LC = (t) => `@n8n/n8n-nodes-langchain.${t}`
const MENTION = 'Message rédigé et envoyé automatiquement par l’assistant'
const copie = (o) => JSON.parse(JSON.stringify(o))
const lire = (f) => JSON.parse(readFileSync(f, 'utf8'))
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, liste]) => (liste ?? []).flatMap((s, i) => (s ?? []).map((l) => ({ vers: l.node, genre, sortie: i }))))
const parNom = (wf) => new Map(wf.nodes.map((n) => [n.name, n]))
const op = (n) => n.parameters?.operation
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|availability)$/i

// ─── S : la structure ────────────────────────────────────────────────────────────────────────────────────────────────────────
const TYPES_ENVOI = [B('gmail'), B('microsoftOutlook'), B('emailSend'), B('whatsApp'), B('telegram'), B('twilio')]
const ECRIVANTS = [...TYPES_ENVOI, B('googleDrive'), B('microsoftOneDrive'), B('googleSheets'), B('microsoftExcel'), B('stripe'), LC('agent')]
const estEffet = (n) => (ECRIVANTS.includes(n.type) && !LECTURES.test(op(n) ?? '')) || (n.type === B('httpRequest') && String(n.parameters?.method ?? 'GET').toUpperCase() !== 'GET')
const REQUIS = {
  'gabarit-artisan-devis': [B('scheduleTrigger'), B('gmail'), B('microsoftOutlook'), B('googleDrive'), B('microsoftOneDrive'), B('googleSheetsTool'), B('microsoftExcelTool'), B('gmailTool'), B('microsoftOutlookTool'),
    B('googleDriveTool'), LC('agent'), LC('lmChatAnthropic'), LC('outputParserStructured'), B('executeWorkflow'), B('convertToFile'), B('switch')],
  'gabarit-artisan-suivi': [B('scheduleTrigger'), B('gmail'), B('microsoftOutlook'), B('emailSend'), B('whatsApp'), B('telegram'), B('twilio'), LC('agent'), LC('lmChatAnthropic'), LC('outputParserStructured'),
    LC('toolWorkflow'), B('gmailTool'), B('microsoftOutlookTool'), B('googleSheetsTool'), B('executeWorkflow'), B('switch')],
  'gabarit-artisan-facturation': [B('scheduleTrigger'), B('stripe'), B('stripeTool'), B('gmail'), B('microsoftOutlook'), B('googleDrive'), B('microsoftOneDrive'), B('googleSheets'), B('microsoftExcel'),
    LC('agent'), LC('lmChatAnthropic'), LC('outputParserStructured'), LC('toolWorkflow'), B('gmailTool'), B('microsoftOutlookTool'), B('convertToFile'), B('switch')],
}
const HOTES_SIGNATURE = ['api.yousign.app', 'eu.docusign.net']
function structure(wf) {
  const e = [], ko = (r, m) => e.push(`${r} ${m}`)
  const nom = wf.name, noeuds = parNom(wf)
  // S1 inactif, jamais publié ; S2 aucun identifiant ; S3 aucun webhook
  if (wf.active !== false || wf.activeVersionId) ko('S1', `${nom} : actif ou publié`)
  for (const n of wf.nodes) {
    if (Object.keys(n.credentials ?? {}).length) ko('S2', `${nom} / ${n.name} : identifiant branché (${Object.keys(n.credentials).join(', ')}) : un gabarit n'a aucun compte`)
    if (/webhook|formTrigger|chatTrigger|telegramTrigger|stripeTrigger|whatsAppTrigger/i.test(n.type)) ko('S3', `${nom} / ${n.name} : déclencheur à webhook (${n.type}) : n8n n'est pas exposé`)
  }
  // T : les outils des lignes 2 à 4 sont là, avec leur vrai type
  for (const t of REQUIS[nom] ?? []) if (!wf.nodes.some((n) => n.type === t)) ko('T1', `${nom} : nœud ${t} absent (outil de la matrice OUTILLAGE.md § 5)`)
  if (nom === 'gabarit-artisan-devis') for (const h of HOTES_SIGNATURE) if (!wf.nodes.some((n) => n.type === B('httpRequest') && String(n.parameters?.url ?? '').startsWith(`https://${h}/`))) ko('T1', `${nom} : signature par l'API ${h} absente`)
  // A : agents conformes (R18 en bref : le commun les contrôle à fond)
  for (const a of wf.nodes.filter((n) => n.type === LC('agent'))) {
    const entrants = Object.keys(wf.connections).flatMap((de) => aretes(wf, de).filter((x) => x.vers === a.name).map((x) => ({ de, genre: x.genre })))
    const modele = entrants.filter((x) => x.genre === 'ai_languageModel').map((x) => noeuds.get(x.de))
    if (modele.length !== 1 || modele[0].type !== LC('lmChatAnthropic') || !/^claude-/.test(String(modele[0].parameters?.model?.value))) ko('A1', `${a.name} : un seul modèle Claude attendu`)
    const parseurs = entrants.filter((x) => x.genre === 'ai_outputParser').map((x) => noeuds.get(x.de))
    if (parseurs.length !== 1 || parseurs[0].type !== LC('outputParserStructured') || parseurs[0].parameters?.schemaType !== 'manual') ko('A1', `${a.name} : un seul parseur structuré à schéma saisi attendu`)
    const outils = entrants.filter((x) => x.genre === 'ai_tool').map((x) => noeuds.get(x.de))
    if (outils.length < 3) ko('A1', `${a.name} : au moins trois outils de lecture attendus (${outils.length})`)
    for (const o of outils) {
      const lecture = o.type === LC('toolHttpRequest') ? String(o.parameters?.method ?? 'GET').toUpperCase() === 'GET'
        : o.type === LC('toolWorkflow') ? /^\s*outil\s*:\s*lecture\s*$/m.test(String(o.notes ?? ''))
        : LECTURES.test(op(o) ?? '')
      if (!lecture) ko('A2', `${a.name} : l'outil ${o.name} (${o.type}, ${op(o) ?? o.parameters?.method ?? 'sans opération'}) écrit ou envoie : un outil d'agent ne fait que lire`)
    }
  }
  // P : aucun effet sans la sortie « faux » d'une porte « simulation »
  const portes = new Set(wf.nodes.filter((n) => /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? '')) && n.type === B('if')
    && n.parameters?.conditions?.conditions?.length === 1 && n.parameters.conditions.conditions[0].operator?.operation === 'true' && /simulation/.test(n.parameters.conditions.conditions[0].leftValue)).map((n) => n.name))
  const entrantsMain = new Set(wf.nodes.flatMap((n) => aretes(wf, n.name).filter((a) => a.genre === 'main').map((a) => a.vers)))
  const racines = wf.nodes.filter((n) => !entrantsMain.has(n.name) && n.type !== B('stickyNote'))
  const libres = new Set(), file = racines.map((n) => n.name)
  while (file.length) { const x = file.shift(); if (libres.has(x)) continue; libres.add(x); for (const a of aretes(wf, x)) if (a.genre === 'main' && !(portes.has(x) && a.sortie === 1)) file.push(a.vers) }
  if (!portes.size) ko('P1', `${nom} : aucune porte « simulation » bien formée`)
  for (const n of wf.nodes) {
    if (estEffet(n) && libres.has(n.name)) ko('P1', `${nom} / ${n.name} : effet atteignable sans la sortie « faux » d'une porte « simulation »`)
    // un sous-nœud d'agent (outil, modèle, parseur) ne s'atteint jamais par le chemin principal : l'agent est l'effet
    if ((n.type === LC('agent')) && !Object.keys(wf.connections).some((de) => portes.has(de) && aretes(wf, de).some((a) => a.vers === n.name && a.sortie === 1))) ko('P2', `${nom} / ${n.name} : l'agent doit se brancher DIRECTEMENT sur la sortie « faux » d'une porte « simulation »`)
  }
  // Stripe : lecture seule
  for (const n of wf.nodes.filter((x) => [B('stripe'), B('stripeTool'), B('stripeTrigger')].includes(x.type))) if (!LECTURES.test(op(n) ?? '')) ko('R-STRIPE', `${nom} / ${n.name} : Stripe en ${op(n) ?? 'opération par défaut'} (lecture seule)`)
  // Marque blanche et mention : chaque envoi porte la mention d'assistant et jamais « Presti »
  for (const n of wf.nodes.filter((x) => TYPES_ENVOI.includes(x.type))) {
    const t = JSON.stringify(n.parameters)
    if (!t.includes(MENTION)) ko('MB1', `${nom} / ${n.name} : la mention d'assistant manque dans le message`)
    if (/presti/i.test(t)) ko('MB2', `${nom} / ${n.name} : « Presti » dans un message envoyé au nom d'un artisan (marque blanche)`)
  }
  // Supabase : le compte dans chaque écriture ; l'hôte écrit en dur
  for (const n of wf.nodes.filter((x) => x.type === B('httpRequest'))) {
    const p = n.parameters ?? {}
    if (typeof p.url !== 'string' || p.url.startsWith('=') || p.url.includes('{{')) ko('H1', `${nom} / ${n.name} : adresse calculée`)
    if (/supabase\.co/.test(p.url ?? '') && String(p.method ?? 'GET').toUpperCase() !== 'GET' && !/organisation_id/.test(String(p.jsonBody ?? ''))) ko('H2', `${nom} / ${n.name} : écriture sans organisation_id`)
  }
  // M : l'argent par le code
  for (const n of wf.nodes.filter((x) => x.type === B('code'))) for (const m of arithmetique(n.parameters?.jsCode ?? '')) ko('M1', `${nom} / ${n.name} : ${m} (un montant n'est ni calculé, ni converti, ni additionné ici : il est LU)`)
  for (const p of wf.nodes.filter((x) => x.type === LC('outputParserStructured'))) {
    const noms = []
    ;(function marcher(s) { if (s && typeof s === 'object') for (const [k, v] of Object.entries(s)) { if (k === 'properties') noms.push(...Object.keys(v)); marcher(v) } })(JSON.parse(p.parameters?.inputSchema ?? '{}'))
    const prix = noms.filter((k) => /prix|montant|total|tva|ttc|\bht\b|_ht|centime|amount|price|cout|coût/i.test(k))
    if (prix.length) ko('M2', `${nom} / ${p.name} : le schéma du modèle permet un montant (${prix.join(', ')})`)
  }
  for (const a of wf.nodes.filter((x) => x.type === LC('agent'))) if (/prix|montant|total_|centime|ttc/i.test(String(a.parameters?.text ?? '')) || (/tarifs/.test(String(a.parameters?.text ?? '')) && !/tarifs\.map\(/.test(String(a.parameters?.text ?? '')))) ko('M3', `${nom} / ${a.name} : le modèle reçoit un prix ou un montant`)
  return e
}
/** Les opérateurs arithmétiques d'un nœud Code, lus sur l'arbre syntaxique (une concaténation de textes n'en est pas un). */
function arithmetique(js) {
  const src = ts.createSourceFile('n.js', `async function f(){\n${js}\n}`, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS)
  const trouves = [], estTexte = (x) => ts.isStringLiteralLike(x) || ts.isTemplateExpression(x)
  const ARITH = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken, ts.SyntaxKind.AsteriskAsteriskToken])
  const ARITH_AFF = new Set([ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken])
  ;(function v(n) {
    if (ts.isBinaryExpression(n) && (ARITH.has(n.operatorToken.kind) || ARITH_AFF.has(n.operatorToken.kind)) && !(n.operatorToken.kind === ts.SyntaxKind.PlusToken && (estTexte(n.left) || estTexte(n.right)))) trouves.push(`opérateur « ${n.operatorToken.getText(src)} » ligne ${src.getLineAndCharacterOfPosition(n.getStart(src)).line}`)
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator)) trouves.push('incrément')
    if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Math') trouves.push(`Math.${n.name.text}`)
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['reduce', 'reduceRight'].includes(n.expression.name.text)) trouves.push('.reduce')
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['parseFloat', 'parseInt'].includes(n.expression.text)) trouves.push(n.expression.text)
    ts.forEachChild(n, v)
  })(src)
  return trouves
}

// ─── E : le moteur de rejeu ──────────────────────────────────────────────────────────────────────────────────────────────────
// Rejoue les nœuds Code (leur vrai code), les portes If, les Switch (leur vraie expression), et enregistre tout nœud à effet SANS l'exécuter.
function rejouer(wf, { pins = {}, trace = false } = {}) {
  const noeuds = parNom(wf), sorties = new Map(), effets = [], executes = [], erreurs = []
  const items = (nom) => sorties.get(nom) ?? []
  const acces = (nom) => { const l = items(nom); if (!sorties.has(nom)) throw new Error(`nœud « ${nom} » non exécuté`); return { first: () => l[0], all: () => l, last: () => l[l.length - 1], item: l[0] } }
  const fn = (expr, json, entree) => new Function('$json', '$', '$input', '$now', `return (${expr})`)(json, acces, { all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, { toISO: () => '2026-11-09T10:00:00.000+01:00' })
  const evaluer = (v, json, entree = []) => {
    if (typeof v !== 'string' || !v.startsWith('=')) return v
    const corps = v.slice(1), seul = /^\{\{([\s\S]*)\}\}$/.exec(corps)
    if (seul && !seul[1].includes('{{')) return fn(seul[1], json, entree)
    return corps.replace(/\{\{([\s\S]*?)\}\}/g, (_, x) => String(fn(x, json, entree)))
  }
  const evaluerTout = (o, json, entree) => (o && typeof o === 'object' ? (Array.isArray(o) ? o.map((x) => evaluerTout(x, json, entree)) : Object.fromEntries(Object.entries(o).map(([k, x]) => [k, evaluerTout(x, json, entree)]))) : (() => { try { return evaluer(o, json, entree) } catch { return o } })())
  const pile = []
  const diffuser = (nom, sortiesNoeud) => { // sortiesNoeud : tableau (par sortie) de tableaux d'items
    const liens = aretes(wf, nom).filter((a) => a.genre === 'main')
    for (const a of liens) { const lot = sortiesNoeud[a.sortie] ?? []; if (lot.length) pile.push([a.vers, lot]) }
  }
  const declencheur = wf.nodes.find((n) => n.type === B('scheduleTrigger'))
  pile.push([declencheur.name, [{ json: {} }]])
  let pas = 0
  while (pile.length) {
    if (++pas > 400) throw new Error('boucle : plus de 400 pas')
    const [nom, entree] = pile.shift() // largeur d'abord, comme n8n (executionOrder v1 par branche)
    const n = noeuds.get(nom)
    executes.push(nom)
    const p = n.parameters ?? {}
    let sortie
    try {
      if (n.type === B('scheduleTrigger')) sortie = [entree]
      else if (n.type === B('code')) {
        const res = new Function('$input', '$', '$now', '$json', `"use strict"; ${p.jsCode}`)({ all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, acces, { toISO: () => '2026-11-09T10:00:00.000+01:00' }, undefined)
        if (!Array.isArray(res)) throw new Error('un nœud Code doit rendre une liste')
        sortie = [res.map((x) => ({ json: x.json }))]
      } else if (n.type === B('if')) {
        const vrai = [], faux = []
        for (const it of entree) { const l = p.conditions.conditions[0], v = evaluer(l.leftValue, it.json, entree); if (typeof v !== 'boolean') throw new Error(`condition non booléenne (${typeof v}) : typage strict`); (v ? vrai : faux).push(it) }
        sortie = [vrai, faux]
      } else if (n.type === B('switch')) {
        const regles = p.rules.values, out = regles.map(() => []), extra = []
        for (const it of entree) { const v = evaluer(regles[0].conditions.conditions[0].leftValue, it.json, entree); const i = regles.findIndex((r) => r.conditions.conditions[0].rightValue === v); (i >= 0 ? out[i] : extra).push(it) }
        sortie = [...out, extra]
      } else if (n.type === B('httpRequest') && String(p.method ?? 'GET').toUpperCase() === 'GET') {
        const l = pins[nom] ?? []
        sortie = [l.length ? l.map((j) => ({ json: j })) : (n.alwaysOutputData ? [{ json: {} }] : [])]
        effets.push({ nœud: nom, genre: 'lecture' })
      } else if (n.type === B('stripe') && LECTURES.test(op(n))) {
        const l = pins[nom] ?? []
        sortie = [l.length ? l.map((j) => ({ json: j })) : [{ json: {} }]]
        effets.push({ nœud: nom, genre: 'lecture' })
      } else if (n.type === B('executeWorkflow')) {
        effets.push({ nœud: nom, genre: 'appel', entree: entree[0]?.json })
        sortie = [(pins[nom] ?? [{ error: 'sous-workflow non publié' }]).map((j) => ({ json: j }))]
      } else if (n.type === B('convertToFile')) sortie = [entree.map((it) => ({ json: it.json, binary: { data: true } }))]
      else { // un effet : jamais exécuté, enregistré avec ses paramètres évalués
        const it = entree[0]
        effets.push({ nœud: nom, genre: 'effet', type: n.type, operation: op(n), url: p.url, parametres: evaluerTout(p, it.json, entree), binaire: Boolean(it.binary) })
        sortie = [(pins[nom] ?? [{ ok: true }]).map((j) => ({ json: j, ...(n.type === LC('agent') ? {} : { binary: it.binary }) }))]
      }
    } catch (err) { erreurs.push({ nœud: nom, message: String(err.message ?? err) }); if (n.onError === 'continueRegularOutput') { sortie = [[{ json: { error: String(err.message) } }]] } else break }
    sorties.set(nom, (sortie[0] ?? []).length || sortie.length > 1 ? sortie.flat() : [])
    diffuser(nom, sortie)
    if (trace) console.log('  ·', nom, sortie.map((s) => s.length).join('/'))
  }
  return { sorties, effets, executes, erreurs, derniere: (nom) => items(nom).at(-1)?.json }
}

// ─── Les essais ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const U = (x) => `00000000-0000-4000-8000-${String(x).padStart(12, '0')}`
const CPT = U(225)
const PILOTE_ACTIF = { drapeau: true, actif: true, types: { envoi_devis: true, envoi_facture: true, relance_impaye: true, relance_devis: true } }
const CAPS_SIGNATURE = ['assistant', 'assistant.pilote', 'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm']
const config = (extra = {}) => ({ artisan_id: CPT, enseigne: 'Exemple. Menuiserie', ton: 'courtois', signature: 'Exemple.', offre: 'signature', capacites: CAPS_SIGNATURE, pilote: PILOTE_ACTIF, parties_depuis_24h: 2, plafond_jour: 20,
  interrupteur_general: true, interrupteur_departement: true, cles_existantes: [], maintenant: '2026-11-09T10:00:00.000+01:00', simulation: true, boite: 'gmail', stockage: 'drive', ...extra })
const studio = { offre: 'studio', capacites: ['assistant', 'crm'], pilote: { drapeau: true, actif: false, types: {} } }
const TARIFS = [
  { reference: 'REF-PORTE', designation: 'Exemple. Porte d’entrée', unite: 'u', prix_unitaire_ht_centimes: 70000, source_prix: 'vos tarifs · Exemple. Porte' },
  { reference: 'REF-POSE', designation: 'Exemple. Pose', unite: 'forfait', prix_unitaire_ht_centimes: 30000, source_prix: 'vos tarifs · Exemple. Pose' },
  { reference: 'REF-ESTIME', designation: 'Exemple. Finitions', unite: 'forfait', prix_unitaire_ht_centimes: 42000, source_prix: '' },
]
const L = (reference, designation = 'Exemple. Poste') => ({ designation, quantite: 1, unite: 'u', reference_tarif: reference, motif: 'Exemple.' })
const CHEF = (tous, total = '1 200,00 € TTC') => ({ contrat: 'presti-dep-devis@1', statut: 'ok', simulation: true, resultat: { devis_prets: [{ devis_id: U(2), numero: 'DEV-EX-0002', total_ttc_affiche: total, tous_prix_sources: tous, a_estimer: tous ? 0 : 1 }] } })
const DEVIS_PINS = (o = {}) => ({ 'Relire la configuration': [config(o.cfg)], 'Lire les demandes à chiffrer': [{ lead_id: U(1), devis_id: U(2), qualifiee: true, escalade: false, resume_demande: 'Exemple. Porte et pose.', delai_annulation_ecoule: o.annul ?? true, ...(o.modele ? { enregistrement_modele: o.modele } : {}) }],
  'Lire les tarifs': TARIFS, 'Lire les devis prêts': [{ artisan_id: CPT, devis_id: U(2), lead_id: U(1), numero: 'DEV-EX-0002', statut: 'brouillon', total_ttc_centimes: 120000, total_ttc_affiche: '1 200,00 € TTC' }],
  'Lire les lignes des devis': [], 'Lire les repères de prix': [{ reference: 'REF-ESTIME', repere_affiche: '420,00 € HT', repere_chantier_le: '2026-02-02' }], 'Appeler presti-dep-devis (montants par le code)': [o.chef ?? CHEF(true)], 'Lire le destinataire': [{ objet_id: U(1), client_email: 'client@exemple.invalid', client_telephone: '+33600000000' }],
  'Lire le PDF du devis (rendu par le code)': [{ pdf_base64: 'RXhlbXBsZS4=' }], 'Rédacteur de lignes': [{ output: o.sortie ?? { resume: 'Exemple.', lignes: [L('REF-PORTE', 'Exemple. Porte'), L('REF-POSE', 'Exemple. Pose')] } }] })
const SIGNATURE_OK = { modele: { resume: 'Exemple.', lignes: [L('REF-PORTE', 'Exemple. Porte'), L('REF-POSE', 'Exemple. Pose')] } }
const tous = (r) => r.effets.filter((x) => x.genre === 'effet').map((x) => x.nœud)
// Les effets hors appel du modèle (le modèle appelé en mode réel est attendu ; ce qu'on surveille ici, ce sont les envois et les écritures).
const noms = (r) => r.effets.filter((x) => x.genre === 'effet' && x.type !== LC('agent')).map((x) => x.nœud)

const SUIVI_LIGNE = (o = {}) => ({ objet_type: 'conversation', objet_id: U(11), dossier_id: U(12), statut: 'repondu', canal: 'email', paliers_envoyes: [], jours_depuis_dernier: 3, main_prise: false, exclu: false, stop: false, opposition: false, sensible: false,
  carte: 'aucune', ecartee_le: null, historique: { ok: true, traces: [] }, delai_annulation_ecoule: true, ...o })
const SUIVI_CFG = (o = {}) => config({ paliers_conversation_jours: [2, 5, 10], paliers_devis_jours: [7], mots_escalade_artisan: [], sms_api: 'aucune', expediteur: 'noreply', ...o })
const CONFLIT_OK = { contrat: 'lib-controler-conflit@1', statut: 'ok', simulation: true, resultat: { continuer: true, issue: 'continue', motifs: [] } }
const SUIVI_PINS = (o = {}) => ({ 'Relire la configuration': [SUIVI_CFG(o.cfg)], 'Lire les relances dues': [SUIVI_LIGNE(o.ligne)], 'Contrôler le conflit (lib-controler-conflit)': [o.conflit ?? CONFLIT_OK],
  'Relanceur': [{ output: o.sortie ?? { objet: 'Exemple. Un petit mot', texte: 'Exemple. Bonjour, je reviens vers vous au sujet de votre demande. Je reste disponible pour en parler.' } }],
  'Lire le destinataire': [{ objet_id: U(11), client_email: 'client@exemple.invalid', client_telephone: '+33600000000', telegram_chat: '42', whatsapp_numero_pro: '1', sms_expediteur: 'ARTISAN' }] })

const FACT_FACTURE = (o = {}) => ({ facture_id: U(21), numero: 'FAC-EX-0021', statut: 'emise', emise: true, envoyee: true, total_ttc_centimes: 120000, total_ttc_affiche: '1 200,00 € TTC', echeance_affichee: '1er novembre 2026', retard_affiche: '8 jours de retard',
  jours_retard: 8, salutation: 'Madame, Monsieur', contestation: false, motif: null, paliers_envoyes: [], canal: 'email', stop: false, sensible: false, delai_annulation_ecoule: true, ...o })
const FACT_PINS = (o = {}) => ({ 'Relire la configuration': [config({ relances_impayes: { actif: true, jours: [3, 10, 21] }, comptable: 'sheets', ...o.cfg })], 'Lire les factures': o.factures ?? [FACT_FACTURE()], 'Lire les chantiers terminés': o.chantiers ?? [],
  'Lire les paiements Stripe': o.stripe ?? [], "Relanceur d'impayés": [{ output: o.sortie ?? { objet: 'Exemple. Rappel facture {numero}', texte: 'Exemple. {client}, sauf erreur de ma part la facture {numero} de {montant}, échue le {echeance} ({retard}), reste à régler. Merci de votre retour.' } }],
  'Lire le destinataire': [{ objet_id: U(21), client_email: 'client@exemple.invalid', client_telephone: '+33600000000' }], 'Lire le PDF de la facture (rendu par le code)': [{ pdf_base64: 'RXhlbXBsZS4=' }] })

/** Les essais : [titre, gabarit, pins, vérification(r) → message d'échec ou null]. `reel` rejoue avec la simulation levée. */
const dossiers = (nom) => nom
function essais() {
  const E = []
  const ajoute = (gabarit, titre, pins, verif, reel = false) => E.push({ gabarit, titre, pins, verif, reel })
  const eff = (r) => r.derniere('Effets prévus')
  const sans = (r, ...n) => n.filter((x) => noms(r).includes(x))
  const SIM = (pins, cle = 'Relire la configuration') => pins
  const reel = (pins) => { const p = copie(pins); p['Relire la configuration'][0].simulation = false; return p }
  // ─── Devis ───
  ajoute('gabarit-artisan-devis', 'Signature, tous les prix tarifés : envoi PRÉVU, rien ne part (simulation)', DEVIS_PINS({ modele: SIGNATURE_OK.modele }), (r) =>
    r.erreurs.length ? `erreur ${r.erreurs[0].message}` : eff(r)?.voie !== 'envoi' || !eff(r).effets_prevus.includes('envoi_gmail') || !eff(r).effets_prevus.includes('pdf_drive') ? `effets prévus ${JSON.stringify(eff(r)?.effets_prevus)}` : noms(r).length ? `effets réels en simulation : ${noms(r)}` : null)
  ajoute('gabarit-artisan-devis', 'un prix estimé : carte, jamais d’envoi (simulation)', DEVIS_PINS({ modele: { resume: 'Exemple.', lignes: [L('REF-PORTE', 'Exemple. Porte'), L('REF-ESTIME', 'Exemple. Finitions')] }, chef: CHEF(false) }), (r) =>
    eff(r)?.voie !== 'carte' || eff(r).motif !== 'prix_non_source' || eff(r).effets_prevus.some((x) => /envoi/.test(x)) ? `voie ${eff(r)?.voie} / ${eff(r)?.motif}` : null)
  ajoute('gabarit-artisan-devis', 'un prix estimé en Signature, mode réel : aucun envoi, aucun brouillon', reel(DEVIS_PINS({ modele: { resume: 'Exemple.', lignes: [L('REF-ESTIME', 'Exemple. Finitions')] }, chef: CHEF(false) })), (r) =>
    sans(r, 'Envoyer par Gmail', 'Envoyer par Outlook', 'Brouillon Gmail').length || r.derniere('Décider de la voie')?.voie !== 'carte' ? `envoi ou brouillon : ${noms(r)}` : null, true)
  ajoute('gabarit-artisan-devis', 'Studio : brouillon (simulation), jamais d’envoi', DEVIS_PINS({ modele: SIGNATURE_OK.modele, cfg: studio }), (r) =>
    eff(r)?.voie !== 'brouillon' || !eff(r).effets_prevus.includes('brouillon_gmail') || eff(r).effets_prevus.some((x) => /^envoi_/.test(x)) ? `voie ${eff(r)?.voie} ${JSON.stringify(eff(r)?.effets_prevus)}` : null)
  ajoute('gabarit-artisan-devis', 'Studio, mode réel : le brouillon Gmail seul, jamais d’envoi', reel(DEVIS_PINS({ modele: SIGNATURE_OK.modele, cfg: studio })), (r) =>
    !noms(r).includes('Brouillon Gmail') || sans(r, 'Envoyer par Gmail', 'Envoyer par Outlook').length ? `effets : ${noms(r)}` : null, true)
  ajoute('gabarit-artisan-devis', 'Signature tarifée, mode réel : PDF rangé, envoi Gmail avec pièce jointe et mention, signature demandée', reel(DEVIS_PINS({ modele: SIGNATURE_OK.modele, cfg: { signature_electronique: 'yousign' } })), (r) => {
    const gm = r.effets.find((x) => x.nœud === 'Envoyer par Gmail')
    if (!gm) return `pas d’envoi Gmail (${noms(r)})`
    if (!gm.binaire) return 'l’envoi n’a pas le PDF en pièce jointe'
    if (!String(gm.parametres.message).includes(MENTION)) return 'la mention d’assistant manque'
    if (/presti/i.test(JSON.stringify(gm.parametres))) return '« Presti » dans le message'
    if (!String(gm.parametres.message).includes('1 200,00 € TTC')) return 'le total n’est pas celui du chef'
    return ['Ranger le PDF dans Google Drive', 'Demander la signature (Yousign)', 'Inscrire au registre', 'Rédacteur de lignes'].filter((x) => !tous(r).includes(x)).map((x) => `${x} absent`)[0] ?? null
  }, true)
  ajoute('gabarit-artisan-devis', 'OneDrive, Outlook, DocuSign : les autres outils du client', reel(DEVIS_PINS({ modele: SIGNATURE_OK.modele, cfg: { stockage: 'onedrive', boite: 'outlook', signature_electronique: 'docusign' } })), (r) =>
    ['Ranger le PDF dans OneDrive', 'Envoyer par Outlook', 'Demander la signature (DocuSign)'].filter((x) => !noms(r).includes(x)).map((x) => `${x} absent`)[0] ?? (noms(r).includes('Ranger le PDF dans Google Drive') ? 'Drive aussi' : null), true)
  ajoute('gabarit-artisan-devis', 'le modèle glisse un prix dans une ligne : rejet, rien ne part', DEVIS_PINS({ modele: { resume: 'Exemple.', lignes: [{ ...L('REF-PORTE'), prix_unitaire_ht_centimes: 1 }] } }), (r) =>
    !r.erreurs.some((x) => x.nœud === 'Revalider les lignes' && /clé de ligne/.test(x.message)) || r.executes.includes('Décider de la voie') ? `erreurs ${JSON.stringify(r.erreurs)}` : null)
  ajoute('gabarit-artisan-devis', 'le modèle glisse un total : rejet', DEVIS_PINS({ modele: { resume: 'Exemple.', total_ttc: '1 €', lignes: [L('REF-PORTE')] } }), (r) =>
    !r.erreurs.some((x) => x.nœud === 'Revalider les lignes') ? 'total accepté' : null)
  ajoute('gabarit-artisan-devis', 'un prix vient des tarifs, le total du chef, jamais d’un nœud', DEVIS_PINS({ modele: SIGNATURE_OK.modele }), (r) => {
    const l = r.derniere('Revalider les lignes')?.lignes
    if (!l || l[0].prix_unitaire_ht_centimes !== 70000 || l[1].prix_unitaire_ht_centimes !== 30000) return `prix ${JSON.stringify(l?.map((x) => x.prix_unitaire_ht_centimes))}`
    const d = r.derniere('Décider de la voie')
    return d.total_affiche !== '1 200,00 € TTC' ? `total ${d.total_affiche}` : null
  })
  ajoute('gabarit-artisan-devis', 'un tarif sans source (repère cité) n’est jamais un prix sourcé', DEVIS_PINS({ modele: { resume: 'Exemple.', lignes: [L('REF-ESTIME')] }, chef: CHEF(true) }), (r) => {
    const l = r.derniere('Revalider les lignes')
    return l.lignes[0].statut_prix !== 'estime' || l.lignes[0].prix_unitaire_ht_centimes !== null || l.tous_prix_sources || r.derniere('Décider de la voie').voie === 'envoi' ? 'prix sans source traité comme sourcé' : (l.lignes[0].repere?.affiche === '420,00 € HT' && l.lignes[0].repere.chantier_le === '2026-02-02' ? null : 'le repère d’un ancien chantier n’est pas cité')
  })
  ajoute('gabarit-artisan-devis', 'une escalade : carte, jamais d’envoi', (() => { const p = DEVIS_PINS({ modele: SIGNATURE_OK.modele }); p['Lire les demandes à chiffrer'][0].escalade = null; return p })(), (r) => r.derniere('Décider de la voie')?.voie !== 'carte' ? 'escalade ignorée' : null)
  ajoute('gabarit-artisan-devis', 'délai d’annulation non écoulé : carte, l’envoi attend', DEVIS_PINS({ modele: SIGNATURE_OK.modele, annul: false }), (r) => r.derniere('Décider de la voie')?.voie !== 'carte' ? 'envoi avant le délai' : null)
  ajoute('gabarit-artisan-devis', 'plafond du jour atteint : carte', DEVIS_PINS({ modele: SIGNATURE_OK.modele, cfg: { parties_depuis_24h: 20 } }), (r) => r.derniere('Décider de la voie')?.voie !== 'carte' ? 'plafond ignoré' : null)
  ajoute('gabarit-artisan-devis', 'interrupteur fermé : rien', DEVIS_PINS({ cfg: { interrupteur_departement: false } }), (r) => r.executes.includes('Porte simulation (modèle)') ? 'a continué' : null)
  ajoute('gabarit-artisan-devis', 'en simulation le modèle n’est jamais appelé', DEVIS_PINS({ modele: SIGNATURE_OK.modele }), (r) => r.executes.includes('Rédacteur de lignes') ? 'agent appelé' : null)
  // ─── Suivi ───
  const S = 'gabarit-artisan-suivi'
  ajoute(S, 'une relance due, Signature : envoi prévu en simulation, rien ne part', SUIVI_PINS(), (r) => !eff(r)?.effets_prevus?.includes('envoi_gmail') || noms(r).length ? `prévus ${JSON.stringify(eff(r)?.effets_prevus)} réels ${noms(r)}` : null)
  for (const [ligne, titre] of [[{ stop: true }, 'STOP'], [{ stop: undefined }, 'STOP absent (lecture manquante)'], [{ opposition: true }, 'opposition'], [{ opposition: undefined }, 'opposition absente'], [{ main_prise: true }, 'main reprise'], [{ exclu: true }, 'exclu'], [{ sensible: true }, 'client sensible'], [{ sensible: undefined }, 'sensibilité non lue'], [{ statut: 'accepte' }, 'dossier clos']])
    ajoute(S, `une relance avec ${titre} : rien (aucun appel, aucun effet)`, SUIVI_PINS({ ligne }), (r) => r.executes.includes('Contrôler le conflit (lib-controler-conflit)') || noms(r).length || r.executes.includes('Porte simulation (modèle)') ? `a continué : ${r.executes.at(-1)}` : null)
  ajoute(S, 'le contrôleur de conflit dit non : rien', SUIVI_PINS({ conflit: { ...CONFLIT_OK, resultat: { continuer: false, issue: 'annule', motifs: ['client_sensible'] } } }), (r) => r.executes.includes('Porte simulation (modèle)') ? 'relance malgré le contrôleur' : null)
  ajoute(S, 'le contrôleur absent (sous-workflow non publié) : rien (côté sûr)', (() => { const p = SUIVI_PINS(); delete p['Contrôler le conflit (lib-controler-conflit)']; return p })(), (r) => r.executes.includes('Porte simulation (modèle)') ? 'relance sans contrôleur' : null)
  ajoute(S, 'Studio, mode réel : une carte « À valider », jamais d’envoi', reel(SUIVI_PINS({ cfg: studio })), (r) => !noms(r).includes('Déposer la carte') || noms(r).some((x) => /^Relance/.test(x)) ? `effets ${noms(r)}` : null, true)
  for (const [canal, ligne, cfg, attendu] of [['email', {}, { boite: 'gmail' }, 'Relance Gmail'], ['email', {}, { boite: 'outlook' }, 'Relance Outlook'], ['smtp', { canal: 'smtp' }, {}, 'Relance SMTP'], ['whatsapp', { canal: 'whatsapp' }, {}, 'Relance WhatsApp'],
    ['telegram', { canal: 'telegram' }, {}, 'Relance Telegram'], ['sms', { canal: 'sms' }, { sms_api: 'twilio' }, 'Relance SMS (Twilio)'], ['sms', { canal: 'sms' }, {}, 'SMS préparé']])
    ajoute(S, `mode réel, canal d’origine ${canal}${cfg.boite ? ` (${cfg.boite})` : cfg.sms_api ? ' (API Twilio)' : ''} : ${attendu}`, reel(SUIVI_PINS({ ligne, cfg })), (r) => {
      const envois = noms(r).filter((x) => /^Relance/.test(x))
      if (attendu === 'SMS préparé') { if (envois.length) return `un SMS part : ${envois}`; const s = r.derniere('SMS préparé'); return s?.sms_prepare && /STOP/.test(decodeURIComponent(s.lien)) && !/https?:/.test(decodeURIComponent(s.lien).replace(/^sms:/, '')) ? null : 'SMS préparé absent, sans STOP ou avec un lien' }
      if (envois.join() !== attendu) return `envoi ${envois} au lieu de ${attendu}`
      const x = r.effets.find((e) => e.nœud === attendu), t = JSON.stringify(x.parametres)
      if (!t.includes(MENTION) || /presti/i.test(t)) return 'mention manquante ou « Presti »'
      if (attendu.includes('Twilio') && !/STOP/.test(t)) return 'STOP absent du SMS'
      return !noms(r).includes('Inscrire au registre') && !r.executes.includes('Inscrire au registre') ? 'registre des relances absent' : null
    }, true)
  ajoute(S, 'un message du modèle qui cite un montant : rejet', reel(SUIVI_PINS({ cfg: {}, sortie: { objet: 'Exemple.', texte: 'Exemple. Bonjour, il reste 120 € à régler sur votre devis, merci de revenir vers moi.' } })), (r) => !r.erreurs.some((x) => x.nœud === 'Revalider le message') || noms(r).length ? 'montant accepté' : null, true)
  ajoute(S, 'un devis (pilote relance_devis activé, 7 jours) part seul ; sans le type activé, c’est une carte', SUIVI_PINS({ ligne: { objet_type: 'devis', statut: 'envoye', jours_depuis_dernier: 7 } }), (r) => eff(r)?.voie !== 'envoi' ? `voie ${eff(r)?.voie}` : null)
  ajoute(S, 'un devis sans le type relance_devis activé : carte', SUIVI_PINS({ ligne: { objet_type: 'devis', statut: 'envoye', jours_depuis_dernier: 7 }, cfg: { pilote: { drapeau: true, actif: true, types: {} } } }), (r) => eff(r)?.voie !== 'carte' ? `voie ${eff(r)?.voie}` : null)
  // ─── Facturation ───
  const F = 'gabarit-artisan-facturation'
  const PAYE_STRIPE = { id: 'ch_Exemple', paid: true, refunded: false, amount: 120000, metadata: { facture_id: U(21) } }
  ajoute(F, 'un paiement lu dans Stripe : la relance d’impayé s’arrête (carte « vérifier le paiement »), aucun envoi', FACT_PINS({ stripe: [PAYE_STRIPE] }), (r) =>
    eff(r)?.kind !== 'paiement_lu' || eff(r).effets_prevus.some((x) => /envoi|sms/.test(x)) || r.executes.includes('Porte simulation (modèle)') ? `kind ${eff(r)?.kind} ${JSON.stringify(eff(r)?.effets_prevus)}` : null)
  ajoute(F, 'un paiement lu (mode réel) : une carte, ni relance ni agent', reel(FACT_PINS({ stripe: [PAYE_STRIPE] })), (r) => noms(r).join() !== 'Déposer la carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'un paiement Stripe d’un autre montant ne vaut pas paiement : la relance continue', FACT_PINS({ stripe: [{ ...PAYE_STRIPE, amount: 100 }] }), (r) => eff(r)?.kind !== 'relance_impaye' ? `kind ${eff(r)?.kind}` : null)
  ajoute(F, 'une facture NON émise : jamais envoyée, jamais relancée', FACT_PINS({ factures: [FACT_FACTURE({ emise: false, statut: 'brouillon', envoyee: false })] }), (r) => r.executes.includes('Décider de la voie') ? 'a été décidée' : null)
  ajoute(F, 'une facture non émise (mode réel) : aucun effet', reel(FACT_PINS({ factures: [FACT_FACTURE({ emise: false, statut: 'brouillon', envoyee: false })] })), (r) => noms(r).length ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'un chantier terminé : « facture prête », une carte, jamais une émission ni un envoi (Signature comprise)', reel(FACT_PINS({ factures: [], chantiers: [{ devis_id: U(30), chantier_termine: true, deja_facturee: false, apercu_ok: true, apercu_type: 'standard', apercu_total_ttc_affiche: '1 200,00 € TTC' }] })), (r) =>
    noms(r).join() !== 'Déposer la carte' || r.derniere('Décider de la voie')?.voie !== 'carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'facture émise non envoyée, Signature, simulation : envoi prévu, rien ne part', FACT_PINS({ factures: [FACT_FACTURE({ envoyee: false, jours_retard: 0 })] }), (r) => !eff(r)?.effets_prevus?.includes('envoi_gmail') || !eff(r).effets_prevus.includes('export_sheets') || noms(r).length ? `prévus ${JSON.stringify(eff(r)?.effets_prevus)} réels ${noms(r)}` : null)
  ajoute(F, 'facture émise, mode réel : PDF rangé, envoi Gmail avec PDF, export au comptable', reel(FACT_PINS({ factures: [FACT_FACTURE({ envoyee: false, jours_retard: 0 })] })), (r) => {
    const gm = r.effets.find((x) => x.nœud === 'Envoyer la facture par Gmail')
    if (!gm?.binaire || !String(gm.parametres.message).includes('1 200,00 € TTC') || !String(gm.parametres.message).includes(MENTION)) return 'envoi incomplet'
    return ['Ranger le PDF dans Google Drive', 'Exporter vers Google Sheets', 'Inscrire au registre'].filter((x) => !noms(r).includes(x)).map((x) => `${x} absent`)[0] ?? null
  }, true)
  ajoute(F, 'facture émise, OneDrive + Outlook + Excel', reel(FACT_PINS({ factures: [FACT_FACTURE({ envoyee: false, jours_retard: 0 })], cfg: { stockage: 'onedrive', boite: 'outlook', comptable: 'excel' } })), (r) =>
    ['Ranger le PDF dans OneDrive', 'Envoyer la facture par Outlook', 'Exporter vers Excel'].filter((x) => !noms(r).includes(x)).map((x) => `${x} absent`)[0] ?? null, true)
  ajoute(F, 'facture émise, Studio : une carte, jamais d’envoi', reel(FACT_PINS({ factures: [FACT_FACTURE({ envoyee: false, jours_retard: 0 })], cfg: studio })), (r) => noms(r).join() !== 'Déposer la carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'Studio avec un pilote activé : l’offre prime, la relance reste une carte', reel(FACT_PINS({ cfg: { offre: 'studio', capacites: ['assistant', 'crm'] } })), (r) => noms(r).join() !== 'Déposer la carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'un impayé échu, Signature, opt-in : relance (mode réel) avec les montants LUS, pas ceux du modèle', reel(FACT_PINS()), (r) => {
    const g = r.effets.find((x) => x.nœud === 'Relance Gmail')
    if (!g) return `pas de relance (${noms(r)})`
    const t = String(g.parametres.message)
    if (!t.includes('1 200,00 € TTC') || !t.includes('FAC-EX-0021') || !t.includes('1er novembre 2026') || /\{[a-z]+\}/.test(t)) return `variables mal remplacées : ${t.slice(0, 120)}`
    return !t.includes(MENTION) || /presti/i.test(t) ? 'mention ou marque' : (noms(r).includes('Inscrire le palier') ? null : 'palier non inscrit')
  }, true)
  ajoute(F, 'sans l’opt-in de l’artisan : aucune relance d’impayé', FACT_PINS({ cfg: { relances_impayes: { actif: false, jours: [3, 10, 21] } } }), (r) => r.executes.includes('Décider de la voie') ? 'relancé sans opt-in' : null)
  ajoute(F, 'une contestation : carte « à relire », jamais d’envoi', reel(FACT_PINS({ factures: [FACT_FACTURE({ contestation: true })] })), (r) => noms(r).join() !== 'Déposer la carte' || r.derniere('Décider de la voie')?.motif !== 'a_relire' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'une contestation non lue (null) : carte, jamais d’envoi', reel(FACT_PINS({ factures: [FACT_FACTURE({ contestation: null })] })), (r) => noms(r).join() !== 'Déposer la carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'un motif « litige » rangé : carte', reel(FACT_PINS({ factures: [FACT_FACTURE({ motif: 'litige' })] })), (r) => noms(r).join() !== 'Déposer la carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'un motif « oubli » : les relances continuent', reel(FACT_PINS({ factures: [FACT_FACTURE({ motif: 'oubli' })] })), (r) => !noms(r).includes('Relance Gmail') ? 'relance arrêtée sur un oubli' : null, true)
  ajoute(F, 'Studio, impayé : relance préparée en carte (le texte est dans la carte), jamais envoyée', reel(FACT_PINS({ cfg: studio })), (r) => noms(r).join() !== 'Déposer la carte' ? `effets ${noms(r)}` : null, true)
  ajoute(F, 'le modèle écrit un montant : rejet', reel(FACT_PINS({ sortie: { objet: 'Exemple.', texte: 'Exemple. {client}, il reste 1 200 € à régler sur la facture {numero}, merci.' } })), (r) => !r.erreurs.some((x) => x.nœud === 'Revalider le texte') || noms(r).length ? 'montant accepté' : null, true)
  ajoute(F, 'le modèle invente une variable : rejet', reel(FACT_PINS({ sortie: { objet: 'Exemple.', texte: 'Exemple. {client}, voici votre {iban} pour la facture {numero}, merci.' } })), (r) => !r.erreurs.some((x) => x.nœud === 'Revalider le texte') || noms(r).length ? 'variable inconnue acceptée' : null, true)
  ajoute(F, 'le palier suivant attend son jour (J+3 déjà envoyé, 8 jours de retard)', FACT_PINS({ factures: [FACT_FACTURE({ paliers_envoyes: [1] })] }), (r) => r.executes.includes('Décider de la voie') ? 'relance trop tôt' : null)
  return E
}

// ─── La suite ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger(exports, registre) {
  const manquements = []
  for (const wf of exports) {
    manquements.push(...structure(wf))
    for (const n of wf.nodes.filter((x) => x.type === B('code'))) {
      const attendu = registre?.[wf.name]?.[n.name], h = createHash('sha256').update(n.parameters.jsCode, 'utf8').digest('hex')
      if (attendu !== h) manquements.push(`E0 ${wf.name} / ${n.name} : empreinte ${attendu ? 'changée' : 'inconnue'}`)
    }
  }
  const parGabarit = Object.fromEntries(exports.map((w) => [w.name, w]))
  let jouesEssais = 0
  for (const t of essais()) {
    const wf = parGabarit[t.gabarit]
    if (!wf) continue
    jouesEssais++
    let r
    try { r = rejouer(wf, { pins: t.pins }) } catch (err) { manquements.push(`E1 ${t.gabarit} : « ${t.titre} » : le rejeu plante (${err.message})`); continue }
    let m
    try { m = t.verif(r) } catch (err) { m = `la vérification plante (${err.message})` }
    if (m) manquements.push(`E1 ${t.gabarit} : « ${t.titre} » : ${m}`)
  }
  return { manquements, jouesEssais }
}

// ─── Les mutants ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeudDe = (wf, nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n }
const remplace = (wf, nom, de, vers) => { const n = noeudDe(wf, nom); if (!n.parameters.jsCode.includes(de)) throw new Error(`texte absent de ${nom} : ${de.slice(0, 40)}`); n.parameters.jsCode = n.parameters.jsCode.replace(de, vers) }
const MUTANTS = [
  // — l'argent —
  ['un montant pris dans la sortie du modèle (le prix de la ligne vient du modèle)', 'gabarit-artisan-devis', (w) => { remplace(w, 'Revalider les lignes', "const CLES = ['designation',", "const CLES = ['prix_unitaire_ht_centimes', 'designation',"); remplace(w, 'Revalider les lignes', 'prix_unitaire_ht_centimes: sourcee ? prix : null', 'prix_unitaire_ht_centimes: l.prix_unitaire_ht_centimes ?? (sourcee ? prix : null)') }, /^E1 .*glisse un prix|^E1 .*tarifs, le total/],
  ['un total pris dans la sortie du modèle (le total du chef écarté)', 'gabarit-artisan-devis', (w) => { remplace(w, 'Décider de la voie', 'const total = pret ? pret.total_ttc_affiche : null', "const total = $('Revalider les lignes').first().json.total_modele ?? null") }, /^E1 .*total/],
  ['un montant calculé dans un nœud Code (une somme)', 'gabarit-artisan-devis', (w) => { remplace(w, 'Décider de la voie', 'const numero = pret', 'const numero = (dossier.parties_depuis_24h + 1) && pret') }, /^M1 /],
  ['un montant réduit en somme (reduce)', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Décider de la voie', 'const peut =', 'const cumul = [1, 2].reduce((a, b) => a, 0);\nconst peut =') }, /^M1 .*reduce/],
  ['le schéma du modèle accepte un prix', 'gabarit-artisan-devis', (w) => { const p = noeudDe(w, 'Schéma des lignes'); const s = JSON.parse(p.parameters.inputSchema); s.properties.lignes.items.properties.prix_unitaire_ht_centimes = { type: 'number' }; p.parameters.inputSchema = JSON.stringify(s) }, /^M2 /],
  ['le modèle reçoit les prix des tarifs', 'gabarit-artisan-devis', (w) => { noeudDe(w, 'Rédacteur de lignes').parameters.text = "={{ JSON.stringify({ demande: $json.resume_demande, tarifs: $json.tarifs }) }}" }, /^M3 /],
  ['un prix estimé envoyé seul (la règle des prix sourcés ôtée)', 'gabarit-artisan-devis', (w) => { remplace(w, 'Décider de la voie', 'pret.tous_prix_sources !== true || revalide.tous_prix_sources !== true', 'false') }, /^E1 .*estimé|^E1 .*Signature, tous les prix|^E1 .*repère/],
  ['un repère (prix sans source) traité comme sourcé', 'gabarit-artisan-devis', (w) => { remplace(w, 'Revalider les lignes', 'const sourcee = prix !== null && SOURCE_OK.test(source);', 'const sourcee = prix !== null;') }, /^E1 .*repère|^E1 .*estimé/],
  ['Studio qui envoie (le test de l’offre ôté)', 'gabarit-artisan-devis', (w) => { remplace(w, 'Décider de la voie', "else if (!peut('assistant.pilote')) { voie = 'brouillon'; motif = 'studio'; }", '') ; remplace(w, 'Décider de la voie', 'else if (!type_actif) {', 'else if (false) {') }, /^E1 .*Studio/],
  ['Studio, relance d’impayé qui part seule (le droit relances.auto ôté)', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Décider de la voie', "peut('factures.relances.auto') && actif('relance_impaye')", "actif('relance_impaye')") }, /^E1 .*Studio/],
  ['Studio, relance de conversation qui part seule', 'gabarit-artisan-suivi', (w) => { remplace(w, 'Décider de la voie', ": peut('relances.auto');", ': true;'); remplace(w, 'Décider de la voie', "dossier.objet_type === 'devis' ? peut('assistant.pilote') && type_actif", "dossier.objet_type === 'devis' ? true") }, /^E1 .*Studio/],
  ['l’escalade ignorée sur un devis', 'gabarit-artisan-devis', (w) => { remplace(w, 'Décider de la voie', 'if (dossier.escalade) {', 'if (false) {') }, /^E1 .*escalade/],
  ['le délai d’annulation ignoré', 'gabarit-artisan-devis', (w) => { remplace(w, 'Décider de la voie', 'else if (dossier.annulation_ecoulee !== true)', 'else if (false)') }, /^E1 .*annulation/],
  // — Stripe, factures —
  ['une écriture dans Stripe (remboursement)', 'gabarit-artisan-facturation', (w) => { Object.assign(noeudDe(w, 'Lire les paiements Stripe').parameters, { operation: 'create' }) }, /^R-STRIPE /],
  ['un outil Stripe d’agent qui écrit', 'gabarit-artisan-facturation', (w) => { Object.assign(noeudDe(w, 'Lire un paiement (Stripe)').parameters, { operation: 'create' }) }, /^R-STRIPE |^A2 /],
  ['une facture non émise envoyée (le filtre « émise » ôté partout)', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Constituer le dossier', "const emises = factures.filter((f) => f.emise === true && f.statut === 'emise');", "const emises = factures.filter((f) => f.statut !== 'payee');"); remplace(w, 'Décider de la voie', "if (d.emise !== true) { voie = 'aucune'; motif = 'facture_non_emise'; }\n  else if (", 'if (') }, /^E1 .*NON émise/],
  ['une facture non émise relancée (le filtre ôté dans le dossier seulement : la garde de la décision tient)', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Constituer le dossier', "const emises = factures.filter((f) => f.emise === true && f.statut === 'emise');", "const emises = factures.filter((f) => f.statut !== 'payee');") }, /^E1 .*NON émise/],
  ['la facture prête qui part seule (l’émission envoyée)', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Décider de la voie', "let voie = 'carte';", "let voie = d.kind === 'facture_prete' ? 'envoi' : 'carte';") }, /^E1 .*chantier terminé/],
  ['un paiement lu qui n’arrête pas la relance', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Constituer le dossier', 'const reglePayee = (f) => paiements.some(', 'const reglePayee = (f) => false && paiements.some(') }, /^E1 .*paiement/],
  ['un paiement d’un autre montant pris pour le paiement', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Constituer le dossier', ' && c.amount === f.total_ttc_centimes', '') }, /^E1 .*autre montant/],
  ['l’opt-in de l’artisan ignoré', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Constituer le dossier', 'if (!kind && optin) {', 'if (!kind) {') }, /^E1 .*opt-in/],
  ['une contestation qui part seule', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Décider de la voie', 'const calme = d.contestation === false && (d.motif === null || d.motif === \'oubli\');', 'const calme = true;') }, /^E1 .*contestation|^E1 .*litige/],
  ['un montant écrit par le modèle accepté dans un rappel', 'gabarit-artisan-facturation', (w) => { remplace(w, 'Revalider le texte', "if (/[€$£]|\\d\\s*(€|eur|euros)\\b|https?:|www\\./i.test(brut.texte.concat(' ', brut.objet))) rejet('montant ou lien écrit par le modèle');", '') }, /^E1 .*montant/],
  // — STOP et conflits —
  ['un STOP ignoré', 'gabarit-artisan-suivi', (w) => { remplace(w, 'Constituer la relance due', 'r.stop === false && ', '') }, /^E1 .*STOP/],
  ['un STOP absent compté comme « faux » (lecture manquante)', 'gabarit-artisan-suivi', (w) => { remplace(w, 'Constituer la relance due', 'r.stop === false &&', 'r.stop !== true &&') }, /^E1 .*STOP absent/],
  ['une opposition ignorée', 'gabarit-artisan-suivi', (w) => { remplace(w, 'Constituer la relance due', 'r.opposition === false && ', '') }, /^E1 .*opposition/],
  ['le contrôleur de conflit contourné', 'gabarit-artisan-suivi', (w) => { remplace(w, 'Décider de la voie', 'const dossier =', 'const dossier =') ; w.connections["Préparer l'appel du contrôleur"] = { main: [[{ node: 'Porte simulation (modèle)', type: 'main', index: 0 }]] } }, /^E1 .*contrôleur/],
  ['un message de relance avec un montant accepté', 'gabarit-artisan-suivi', (w) => { remplace(w, 'Revalider le message', "if (/[€$£]|\\d\\s*(€|eur|euros)\\b|https?:|www\\./i.test(brut.texte) || /[{}]/.test(brut.texte)) rejet('montant, lien ou variable dans le message');", '') }, /^E1 .*montant/],
  // — la porte, l'agent, les outils —
  ['la porte « simulation » retirée devant l’envoi', 'gabarit-artisan-devis', (w) => { w.connections['Décider de la voie'].main = [[{ node: 'Choisir la voie', type: 'main', index: 0 }]] }, /^P1 .*Choisir|^P1 /],
  ['l’agent branché avant la porte (il serait appelé en simulation)', 'gabarit-artisan-devis', (w) => { w.connections['Constituer le dossier'].main[0].push({ node: 'Rédacteur de lignes', type: 'main', index: 0 }) }, /^P1 .*Rédacteur|^P2 /],
  ['le brouillon Gmail posé sur la sortie « vrai » de la porte', 'gabarit-artisan-devis', (w) => { w.connections['Porte simulation (effets)'].main[0].push({ node: 'Brouillon Gmail', type: 'main', index: 0 }) }, /^P1 .*Brouillon Gmail/],
  ['la signature électronique sans porte', 'gabarit-artisan-devis', (w) => { w.connections['Effets prévus'] = { main: [[{ node: 'Demander la signature (Yousign)', type: 'main', index: 0 }]] } }, /^P1 .*Yousign/],
  ['une écriture d’export comptable avant la porte', 'gabarit-artisan-facturation', (w) => { w.connections['Constituer le dossier'].main[0].push({ node: 'Exporter vers Google Sheets', type: 'main', index: 0 }) }, /^P1 .*Exporter/],
  ['la porte inversée (condition « faux »)', 'gabarit-artisan-suivi', (w) => { noeudDe(w, 'Porte simulation (effets)').parameters.conditions.conditions[0].operator.operation = 'false' }, /^P1 |^E1 /],
  ['un outil d’agent qui envoie (Gmail send)', 'gabarit-artisan-suivi', (w) => { Object.assign(noeudDe(w, 'Lire le fil (Gmail)').parameters, { resource: 'message', operation: 'send' }) }, /^A2 /],
  ['un outil d’agent qui écrit dans Sheets', 'gabarit-artisan-devis', (w) => { Object.assign(noeudDe(w, 'Tarifs (Google Sheets)').parameters, { operation: 'append' }) }, /^A2 /],
  ['un sous-workflow en outil sans « outil: lecture »', 'gabarit-artisan-suivi', (w) => { delete noeudDe(w, 'Contrôleur de conflit (lib-controler-conflit)').notes }, /^A2 /],
  ['un agent sans parseur', 'gabarit-artisan-facturation', (w) => { delete w.connections['Schéma du rappel'] }, /^A1 /],
  ['un agent avec moins de trois outils', 'gabarit-artisan-suivi', (w) => { delete w.connections['Registre des relances (Google Sheets)']; delete w.connections['Lire le message (Outlook)'] }, /^A1 /],
  // — identifiants, webhooks, marque —
  ['un identifiant branché sur Gmail', 'gabarit-artisan-devis', (w) => { noeudDe(w, 'Envoyer par Gmail').credentials = { gmailOAuth2: { id: 'IdentifiantFictif09', name: 'Gmail du client' } } }, /^S2 /],
  ['un identifiant sur le modèle', 'gabarit-artisan-suivi', (w) => { noeudDe(w, 'Claude (Haiku 5.5)').credentials = { anthropicApi: { id: 'IdentifiantFictif08', name: 'Anthropic' } } }, /^S2 /],
  ['un identifiant sur Stripe', 'gabarit-artisan-facturation', (w) => { noeudDe(w, 'Lire les paiements Stripe').credentials = { stripeApi: { id: 'IdentifiantFictif07', name: 'Stripe du client' } } }, /^S2 /],
  ['un déclencheur Telegram (webhook)', 'gabarit-artisan-suivi', (w) => { w.nodes.push({ id: 'tt', name: 'Message Telegram', type: B('telegramTrigger'), typeVersion: 1.2, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['un déclencheur Stripe (webhook)', 'gabarit-artisan-facturation', (w) => { w.nodes.push({ id: 'st', name: 'Paiement reçu', type: B('stripeTrigger'), typeVersion: 1, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['« Presti » dans un message', 'gabarit-artisan-devis', (w) => { noeudDe(w, 'Envoyer par Gmail').parameters.message += ' — envoyé avec Presti' }, /^MB2 /],
  ['« Presti » dans un SMS', 'gabarit-artisan-suivi', (w) => { noeudDe(w, 'Relance SMS (Twilio)').parameters.message += ' Presti' }, /^MB2 /],
  ['la mention d’assistant ôtée d’un envoi', 'gabarit-artisan-facturation', (w) => { noeudDe(w, 'Relance Outlook').parameters.bodyContent = '={{ $json.texte }}' }, /^MB1 /],
  ['la mention ôtée du WhatsApp', 'gabarit-artisan-suivi', (w) => { noeudDe(w, 'Relance WhatsApp').parameters.textBody = '={{ $json.texte }}' }, /^MB1 /],
  // — les outils de la matrice —
  ['le nœud Drive retiré', 'gabarit-artisan-devis', (w) => { w.nodes = w.nodes.filter((n) => n.type !== B('googleDrive')); delete w.connections['Ranger le PDF dans Google Drive'] }, /^T1 .*googleDrive/],
  ['le nœud Stripe retiré', 'gabarit-artisan-facturation', (w) => { w.nodes = w.nodes.filter((n) => n.type !== B('stripe')); w.connections['Lire les chantiers terminés'].main = [[{ node: 'Constituer le dossier', type: 'main', index: 0 }]] }, /^T1 .*stripe/],
  ['le nœud Twilio retiré', 'gabarit-artisan-suivi', (w) => { w.nodes = w.nodes.filter((n) => n.type !== B('twilio')) }, /^T1 .*twilio/],
  ['la signature DocuSign retirée', 'gabarit-artisan-devis', (w) => { w.nodes = w.nodes.filter((n) => n.name !== 'Demander la signature (DocuSign)') }, /^T1 .*docusign/],
  ['Outlook retiré', 'gabarit-artisan-facturation', (w) => { w.nodes = w.nodes.filter((n) => n.type !== B('microsoftOutlook')) }, /^T1 .*microsoftOutlook/],
  ['une écriture sans organisation_id', 'gabarit-artisan-suivi', (w) => { const n = noeudDe(w, 'Inscrire au registre'); n.parameters.jsonBody = n.parameters.jsonBody.replaceAll('organisation_id', 'compte') }, /^H2 /],
  ['un nœud Code modifié sans le registre', 'gabarit-artisan-devis', (w) => { noeudDe(w, 'Bilan').parameters.jsCode += '\n// ajout' }, /^E0 /],
]

// ─── Les essais rejoués dans n8n (--essais-n8n) : les mêmes données épinglées, au format de `test_workflow` ───────────────────────────
// Sortie : un tableau { gabarit, titre, pinData, attendu } où `attendu` est ce que le rejeu hors ligne rend ; la session rejoue ensuite `test_workflow` avec ce pinData et
// compare, nœud Code par nœud Code, ce que n8n rend (essais-n8n.json).
const ESSAIS_N8N = ['Signature, tous les prix tarifés : envoi PRÉVU', 'un prix estimé : carte, jamais d’envoi (simulation)', 'Studio : brouillon (simulation)', 'une relance due, Signature : envoi prévu',
  'une relance avec STOP : rien', 'un paiement lu dans Stripe', 'une facture NON émise : jamais envoyée']
if (process.argv.includes('--essais-n8n')) {
  const exps = chargerExports(DOSSIER), par = Object.fromEntries(exps.map((w) => [w.name, w]))
  const sortie = []
  for (const t of essais().filter((x) => ESSAIS_N8N.some((q) => x.titre.startsWith(q)))) {
    const wf = par[t.gabarit], r = rejouer(wf, { pins: t.pins })
    const pinData = { [wf.nodes.find((n) => n.type === B('scheduleTrigger')).name]: [{ json: {} }] }
    for (const n of wf.nodes) if (n.type === B('httpRequest') && String(n.parameters.method ?? 'GET').toUpperCase() === 'GET') pinData[n.name] = (t.pins[n.name] ?? [{}]).map((j) => ({ json: j }))
    for (const n of wf.nodes) if ([B('executeWorkflow'), B('stripe')].includes(n.type)) pinData[n.name] = (t.pins[n.name] ?? [{}]).map((j) => ({ json: j }))
    const dernier = ['Effets prévus', 'Décider de la voie', 'Constituer le dossier', 'Constituer la relance due'].find((x) => r.sorties.has(x) && r.sorties.get(x).length)
    sortie.push({ gabarit: t.gabarit, titre: t.titre, pinData, noeuds_executes_hors_ligne: r.executes, attendu: { noeud: r.executes.includes('Effets prévus') ? 'Effets prévus' : r.executes.at(-1), json: r.derniere(r.executes.includes('Effets prévus') ? 'Effets prévus' : r.executes.at(-1)) ?? null } })
  }
  console.log(JSON.stringify(sortie))
  process.exit(0)
}

// ─── Lancement ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function chargerExports(dossier) { return NOMS.map((n) => { const f = path.join(dossier, `${n}.workflow.json`); if (!existsSync(f)) throw new Error(`export absent : ${path.relative(RACINE, f)}`); const j = lire(f); return j.workflow ?? j }) }
const registre = existsSync(path.join(DOSSIER, 'empreintes-code.json')) ? lire(path.join(DOSSIER, 'empreintes-code.json')) : {}
const t0 = Date.now()
let exports
try { exports = chargerExports(DOSSIER) } catch (err) { console.log(`✗ ${err.message}`); process.exit(1) }
const base = juger(exports, registre)
const nbEssais = essais().length
console.log(`${base.manquements.length ? '✗' : '✓'} ${exports.length} gabarits (${exports.map((w) => `${w.name.replace('gabarit-artisan-', '')} : ${w.nodes.length} nœuds`).join(', ')}) : structure, argent par le code, ${base.jouesEssais}/${nbEssais} essais rejoués`)
for (const m of base.manquements) console.log(`    ✗ ${m}`)
let verts = 0
if (!base.manquements.length) {
  for (const [titre, gabarit, fabrique, attendu] of MUTANTS) {
    const mut = copie(exports)
    let applique = true
    try { fabrique(mut.find((w) => w.name === gabarit)) } catch (err) { applique = false; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`); verts++ }
    if (!applique) continue
    // Le registre des empreintes suit le code muté (sinon E0 masquerait la raison), sauf pour le mutant qui éprouve E0 lui-même.
    const reg = /sans le registre/.test(titre) ? copie(registre) : Object.fromEntries(mut.map((w) => [w.name, Object.fromEntries(w.nodes.filter((n) => n.type === B('code')).map((n) => [n.name, createHash('sha256').update(n.parameters.jsCode, 'utf8').digest('hex')]))]))
    const m = juger(mut, reg).manquements
    const bon = m.filter((x) => attendu.test(x))
    console.log(`  ${bon.length ? '✓' : '✗'} « ${titre} » → ${bon.length ? bon[0].slice(0, 170) : m.length ? `rougit, mais pas pour sa raison : ${m[0].slice(0, 130)}` : 'le juge reste VERT'}`)
    if (!bon.length) verts++
  }
}
const joues = base.manquements.length ? 0 : MUTANTS.length
console.log(`gabarits-argent-qa : ${joues} mutants joués, ${joues - verts} rouges (${Math.round((Date.now() - t0) / 1000)} s)`)
if (base.manquements.length || verts) { console.log(verts ? `  ✗ ${verts} mutant(s) ne font pas rougir le juge pour leur raison` : ''); console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
