// Relevé mécanique des dépôts d'automatisations n8n clonés sur Oracle (~/agents/depots) : quels types de nœuds les vrais workflows
// utilisent, au total et par thème (leads, CRM, réseaux sociaux, e-mailing, devis, factures, rendez-vous, avis, support…).
// Lecture seule : aucun JSON n'est importé ni exécuté ; on compte. Sortie : un JSON et un résumé Markdown.
//   node miner-depots.mjs ~/agents/depots sortie.json sortie.md
import fs from 'node:fs'
import path from 'node:path'

const [racine, sortieJson, sortieMd] = process.argv.slice(2)
const THEMES = {
  leads: /lead|prospect|outreach|cold.?e?mail|cold.?call|enrich|apollo|hunter|clay|lemlist|instantly|smartlead|phantom|waalaxy|scrap|lead.?gen|qualif/i,
  crm: /crm|hubspot|pipedrive|salesforce|zoho|odoo|airtable|notion|monday|clickup|attio|close\.?io|copper|freshsales|gohighlevel|highlevel|keap|activecampaign/i,
  reseaux: /instagram|facebook|meta|linkedin|tiktok|twitter|x\.com|youtube|pinterest|threads|social|post|carousel|reel/i,
  emailing: /brevo|sendinblue|mailchimp|mailerlite|sendgrid|mailgun|newsletter|campaign|klaviyo|convertkit|lemlist|resend/i,
  devis_factures: /quote|devis|invoice|factur|estimate|proposal|quickbooks|xero|pennylane|stripe|paypal|payment|billing|receipt/i,
  rdv_agenda: /calendar|calendly|cal\.com|booking|appointment|schedul|reservation|rendez/i,
  avis: /review|avis|google.?business|trustpilot|reputation|rating/i,
  messagerie: /whatsapp|telegram|sms|twilio|messenger|chat|slack|discord|teams/i,
  support_inbox: /support|ticket|helpdesk|zendesk|freshdesk|intercom|inbox|email.?(triage|classif|reply|respond)|gmail|outlook/i,
  documents: /drive|dropbox|onedrive|sheet|excel|pdf|docs?\b|ocr|extract|signature|docusign|yousign|pandadoc/i,
  voix: /voice|vapi|retell|elevenlabs|twilio.?voice|call|phone|bland/i,
}
const types = new Map() // type -> { workflows: Set, occurrences }
const parTheme = Object.fromEntries(Object.keys(THEMES).map((t) => [t, { workflows: 0, types: new Map(), exemples: [] }]))
let lus = 0, workflows = 0, illisibles = 0

function* fichiers(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* fichiers(p)
    else if (e.name.endsWith('.json') && !/^(package|package-lock|tsconfig|composer)\.json$/.test(e.name)) yield p
  }
}
for (const f of fichiers(racine)) {
  lus++
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { illisibles++; continue }
  const wf = Array.isArray(j?.nodes) ? j : Array.isArray(j?.workflow?.nodes) ? j.workflow : Array.isArray(j?.data?.nodes) ? j.data : null
  if (!wf) continue
  workflows++
  const nom = String(wf.name ?? path.basename(f, '.json'))
  const notes = wf.nodes.filter((n) => /stickyNote/.test(n.type)).map((n) => String(n.parameters?.content ?? '')).join(' ').slice(0, 4000)
  const texte = `${nom} ${f} ${notes}`
  const sesTypes = new Set(wf.nodes.map((n) => String(n.type ?? '?')))
  for (const t of sesTypes) {
    const x = types.get(t) ?? { workflows: 0, occurrences: 0 }
    x.workflows++
    types.set(t, x)
  }
  for (const n of wf.nodes) types.get(String(n.type ?? '?')).occurrences++
  for (const [theme, re] of Object.entries(THEMES)) {
    if (!re.test(texte)) continue
    const th = parTheme[theme]
    th.workflows++
    for (const t of sesTypes) th.types.set(t, (th.types.get(t) ?? 0) + 1)
    if (th.exemples.length < 25) th.exemples.push({ nom: nom.slice(0, 90), fichier: path.relative(racine, f), noeuds: wf.nodes.length })
  }
}
const generique = /\.(stickyNote|set|if|code|function|functionItem|merge|noOp|switch|splitInBatches|filter|wait|itemLists|splitOut|aggregate|manualTrigger|start|executeWorkflow|executeWorkflowTrigger|respondToWebhook|dateTime|crypto|html|xml|markdown|moveBinaryData|convertToFile|extractFromFile|limit|removeDuplicates|sort|summarize|renameKeys|compareDatasets|executionData|stopAndError|errorTrigger|scheduleTrigger|cron|interval|webhook|httpRequest|n8n|debugHelper|editImage|readBinaryFile|writeBinaryFile|readBinaryFiles|spreadsheetFile)$/
const tri = (m) => [...m.entries()].sort((a, b) => (b[1].workflows ?? b[1]) - (a[1].workflows ?? a[1]))
const resume = {
  lus, workflows, illisibles,
  types: tri(types).map(([t, x]) => ({ type: t, workflows: x.workflows, occurrences: x.occurrences })),
  themes: Object.fromEntries(Object.entries(parTheme).map(([k, v]) => [k, { workflows: v.workflows, types: tri(v.types).filter(([t]) => !generique.test(t)).slice(0, 45).map(([t, c]) => ({ type: t, workflows: c })), exemples: v.exemples }])),
}
fs.writeFileSync(sortieJson, JSON.stringify(resume, null, 1))
const md = [`# Relevé des dépôts n8n (${workflows} workflows lus sur ${lus} fichiers JSON, ${illisibles} illisibles)`, '',
  '## Types de nœuds métier les plus utilisés (hors logique générique), nombre de workflows qui les emploient', '',
  ...resume.types.filter((x) => !generique.test(x.type)).slice(0, 160).map((x) => `- \`${x.type}\` : ${x.workflows}`), '',
  ...Object.entries(resume.themes).flatMap(([k, v]) => [`## Thème ${k} (${v.workflows} workflows)`, '',
    v.types.map((x) => `\`${x.type.replace(/^n8n-nodes-base\.|^@n8n\/n8n-nodes-langchain\./, '')}\` ${x.workflows}`).join(' · '), '',
    ...v.exemples.slice(0, 12).map((e) => `- ${e.nom} (${e.noeuds} nœuds) — ${e.fichier}`), ''])]
fs.writeFileSync(sortieMd, md.join('\n'))
console.log(`${workflows} workflows, ${resume.types.length} types de nœuds`)
