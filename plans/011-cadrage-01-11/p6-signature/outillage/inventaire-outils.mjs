// Relevé mécanique des OUTILS cités dans les prompts de Benj, les fiches et les transcriptions des vidéos, les fiches des dépôts et la
// carte des outils du vault : pour chaque outil, le nombre de mentions par groupe de sources et les premières références fichier:ligne.
// Deuxième passe : les noms propres fréquents absents du dictionnaire, pour qu'aucun outil cité ne passe à travers (relecture humaine).
//   node inventaire-outils.mjs <depot> <transcriptions restructureai> <vault> <types-depots.json> <sortie.md> <sortie.json>
import fs from 'node:fs'
import path from 'node:path'

const [depot, dirTranscr, vault, typesJson, sortieMd, sortieJson] = process.argv.slice(2)
const P = (...x) => path.join(depot, ...x)
const SOURCES = {
  prompts: fs.readdirSync(P('plans/011-cadrage-01-11/prompts-benj')).filter((f) => f.endsWith('.md')).map((f) => P('plans/011-cadrage-01-11/prompts-benj', f)),
  'videos-0111': [P('plans/analyse-videos.md'), P('plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md')],
  restructureai: [P('plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md'), P('plans/011-cadrage-01-11/p5-entreprise/fiches-compte-restructureai-lot1.md'),
    P('plans/011-cadrage-01-11/p5-entreprise/fiches-compte-restructureai-lot2.md'), P('plans/011-cadrage-01-11/p5-entreprise/fiches-compte-restructureai-lot3.md'),
    P('plans/011-cadrage-01-11/p5-entreprise/synthese-videos-restructureai.md')],
  transcriptions: fs.existsSync(dirTranscr) ? fs.readdirSync(dirTranscr).filter((f) => f.endsWith('.transcription.json')).map((f) => path.join(dirTranscr, f)) : [],
  depots: [P('plans/011-cadrage-01-11/p5-entreprise/fiches-depots.md'), P('plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md')],
  plans: [P('plans/011-cadrage-01-11/p6-signature/premiere-reponse.md'), P('plans/011-cadrage-01-11/p5-entreprise/premiere-reponse.md'), P('plans/011-cadrage-01-11/p5-entreprise/inventaire.md')],
  vault: [path.join(vault, 'wiki/outils/Carte-des-outils.md')].filter((f) => fs.existsSync(f)),
}
// Le texte d'une transcription : ses segments, un par ligne (la « ligne » d'une référence est alors le numéro du segment).
function lignes(f) {
  if (f.endsWith('.transcription.json')) { try { return (JSON.parse(fs.readFileSync(f, 'utf8')).segments ?? []).map((s) => String(s.texte ?? '')) } catch { return [] } }
  return fs.readFileSync(f, 'utf8').split('\n')
}
// Le dictionnaire : des outils nommés à la main (métier, leads, réseaux, IA, vidéo, compta, BTP) + chaque intégration vue dans les 2 669
// workflows des dépôts (type n8n → nom lisible).
const MAIN = `Gmail|Outlook|Microsoft 365|Office 365|IMAP|SMTP|Google Agenda|Google Calendar|Outlook Agenda|Google Drive|OneDrive|Dropbox|Google Sheets|Excel|Google Docs|Google Forms|Google Business Profile|fiche Google|avis Google|Google Ads|Google Analytics|Google Contacts|Google Meet|YouTube|WhatsApp|WhatsApp Business|Telegram|SMS|Twilio|Vonage|Brevo|Sendinblue|Mailchimp|MailerLite|SendGrid|Mailgun|Resend|Klaviyo|ActiveCampaign|ConvertKit|Lemlist|Instantly|Smartlead|Apollo|Clay|Hunter|Dropcontact|Kaspr|Lusha|Phantombuster|Waalaxy|Sales Navigator|LinkedIn|Instagram|Facebook|Messenger|Meta|Facebook Lead Ads|TikTok|Twitter|Pinterest|Threads|Snapchat|Reddit|Discord|Slack|Microsoft Teams|Teams|Zoom|Calendly|Cal\\.com|Typeform|Tally|Jotform|Webflow|WordPress|Wix|Shopify|WooCommerce|Framer|Lovable|Bolt|Notion|Airtable|Baserow|NocoDB|Monday|ClickUp|Trello|Asana|Jira|Linear|HubSpot|Pipedrive|Salesforce|Zoho|Odoo|GoHighLevel|HighLevel|Close|Attio|Folk|Axonaut|Sellsy|Pennylane|Qonto|Stripe|PayPal|SumUp|GoCardless|QuickBooks|Xero|Sage|Yousign|DocuSign|PandaDoc|Obat|Tolteck|Batappli|Habitatpresto|Travaux\\.com|Quotatis|MesDépanneurs|StarOfService|PagesJaunes|Leboncoin|Houzz|Trustpilot|Zapier|Make|n8n|Apify|Firecrawl|Crawlee|SearXNG|ScrapeGraphAI|SerpAPI|Perplexity|OpenAI|ChatGPT|GPT|Claude|Anthropic|Gemini|Mistral|DeepSeek|Llama|Qwen|Ollama|OpenRouter|Groq|Hermes|Orca|Claude Code|Cursor|ElevenLabs|Vapi|Retell|Bland|Deepgram|Whisper|Fish|Kokoro|Langfuse|Qdrant|Pinecone|Supabase|Postgres|PostgreSQL|MySQL|Redis|Obsidian|NotebookLM|Anki|Canva|Figma|Midjourney|Runway|HeyGen|Synthesia|Higgsfield|Kling|Veo|Sora|CapCut|Blender|Three\\.js|Spline|Remotion|HyperFrames|Fathom|Fireflies|Loom|Intercom|Zendesk|Freshdesk|Crisp|Tidio|Chatwoot|Docker|Hostinger|Vercel|GitHub|Stripe Checkout|Lemon Squeezy|Gumroad|Skool|Systeme\\.io|Kajabi|Bannerbear|Placid|Airtop|Browserless|Puppeteer|Playwright|Google Maps|Google Places|Societe\\.com|Pappers|INSEE|Sirene|Data\\.gouv|Indy|Tiime|Freebe|Henrri|Facture\\.net`
const nommes = MAIN.split('|')
const lisible = (t) => t.replace(/^(n8n-nodes-base|@n8n\/n8n-nodes-langchain)\./, '').replace(/(Trigger|Tool)$/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
const types = fs.existsSync(typesJson) ? JSON.parse(fs.readFileSync(typesJson, 'utf8')).types : []
const GENERIQUES = /^(sticky Note|set|if|code|function|function Item|merge|no Op|switch|split In Batches|filter|wait|item Lists|split Out|aggregate|manual|start|execute Workflow|respond To Webhook|date Time|crypto|html|xml|markdown|move Binary Data|convert To File|extract From File|limit|remove Duplicates|sort|summarize|rename Keys|compare Datasets|execution Data|stop And Error|error|schedule|cron|interval|webhook|http Request|n8n|debug Helper|edit Image|read Binary File|write Binary File|read Binary Files|spreadsheet File|form|chat|agent|chain Llm|output Parser Structured|memory Buffer Window|read Write File|document Default Data Loader|tool Workflow|text Splitter.*|embeddings.*|vector Store.*|retriever.*|chain.*|information Extractor|text Classifier|output Parser.*|lm Chat.*|lm.*|tool Http Request|tool Code|sentiment Analysis|compression|graphql|local File|ssh|execute Command|execute Workflow|n8n Training.*|e-?mail Send|e-?mail Read Imap|rss Feed Read|uproc|open Weather Map|hacker News|spotify|totp|jwt|ftp|mqtt|kafka|amqp|rabbitmq|redis|ldap|git|quick Chart|html Extract|xml|mail Check)$/i
const depuisDepots = [...new Set(types.map((t) => lisible(t.type)).filter((n) => n.length > 2 && !GENERIQUES.test(n)))]
const dico = [...new Map([...nommes, ...depuisDepots].map((n) => [n.toLowerCase().replace(/\\/g, ''), n])).values()]
const motif = (n) => new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/ /g, '[\\s-]?')}(?![\\p{L}\\p{N}])`, n === n.toUpperCase() && n.length <= 5 ? 'u' : 'iu')
const DICO = dico.map((n) => ({ nom: n.replace(/\\/g, ''), re: motif(n) }))

const res = new Map() // nom -> { total, par: {groupe: n}, refs: [] }
const inconnus = new Map()
const COURANTS = new Set('Le La Les Un Une Des Et Ou Il Elle On Nous Vous Ils Ce Cette Ces Son Sa Ses Leur Leurs Pour Par Avec Sans Dans Sur Sous Mais Donc Car Si Quand Comme Plus Moins Tout Tous Toute Toutes Rien Aucun Aucune Chaque Ici Là Oui Non The A An And Or Of To In On For With Without This That These Those It Is Are Was Be You We They He She I My Your Our Their If So But Not No Yes All Any Each Every Some What When Where Why How Who Which Then There Here Just Now Like Get Got Make Do Does Did Have Has Had Can Will Would Could Should May Might Must One Two Three First Last Next New Old Benj Presti Studio Signature Entreprise Essentiel Okay Ok Alors Voilà Bon Bref Ensuite Puis Après Avant Enfin Déjà Encore Toujours Jamais Aussi Très Bien Fait Faire Être Avoir Prompt Note Fiche Source Vidéo Vidéos Ligne Lignes Lot Lots Partie Tâche Agent Agents IA AI API URL'.split(' '))
for (const [groupe, fichiers] of Object.entries(SOURCES)) {
  for (const f of fichiers) {
    if (!fs.existsSync(f)) continue
    const L = lignes(f)
    const court = path.relative(depot, f).startsWith('..') ? f.replace(/.*restructureai[\\/]/, 'transcr/') : path.relative(depot, f)
    L.forEach((texte, i) => {
      for (const { nom, re } of DICO) {
        if (!re.test(texte)) continue
        const x = res.get(nom) ?? { total: 0, par: {}, refs: [] }
        x.total++; x.par[groupe] = (x.par[groupe] ?? 0) + 1
        if (x.refs.length < 6) x.refs.push(`${court}:${i + 1}`)
        res.set(nom, x)
      }
      if (groupe === 'transcriptions' || groupe === 'videos-0111' || groupe === 'restructureai' || groupe === 'prompts') {
        for (const m of texte.matchAll(/(?<![\p{L}\p{N}])([A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+|[A-Z][a-z]{2,}(?:\.(?:io|ai|com|so|app))?)(?![\p{L}\p{N}])/gu)) {
          const mot = m[1]
          if (COURANTS.has(mot) || DICO.some((d) => d.re.test(mot))) continue
          const x = inconnus.get(mot) ?? { n: 0, ref: `${court}:${i + 1}` }
          x.n++; inconnus.set(mot, x)
        }
      }
    })
  }
}
const tries = [...res.entries()].sort((a, b) => b[1].total - a[1].total)
const groupes = Object.keys(SOURCES)
const md = ['# Inventaire mécanique des outils cités (prompts, vidéos, dépôts, vault)', '',
  `Sources : ${groupes.map((g) => `${g} (${SOURCES[g].length} fichier(s))`).join(', ')}. Dictionnaire : ${DICO.length} noms (${nommes.length} à la main, ${depuisDepots.length} tirés des types de nœuds des dépôts).`, '',
  `| Outil | Total | ${groupes.join(' | ')} | Premières références |`, `|---|---|${groupes.map(() => '---').join('|')}|---|`,
  ...tries.map(([n, x]) => `| ${n} | ${x.total} | ${groupes.map((g) => x.par[g] ?? '').join(' | ')} | ${x.refs.slice(0, 3).join(' ; ')} |`), '',
  '## Noms propres fréquents absents du dictionnaire (à relire : outil oublié ?)', '',
  [...inconnus.entries()].filter(([, x]) => x.n >= 3).sort((a, b) => b[1].n - a[1].n).slice(0, 220).map(([m, x]) => `${m} (${x.n}, ${x.ref})`).join(' · ')]
fs.writeFileSync(sortieMd, md.join('\n'))
fs.writeFileSync(sortieJson, JSON.stringify({ outils: Object.fromEntries(tries), inconnus: Object.fromEntries([...inconnus.entries()].filter(([, x]) => x.n >= 3)) }, null, 1))
console.log(`${tries.length} outils cités, ${[...inconnus.values()].filter((x) => x.n >= 3).length} noms propres à relire`)
