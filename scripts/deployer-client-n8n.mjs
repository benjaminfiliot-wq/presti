// DÉPLOYEUR DE COPIES CLIENT — À BLANC SEULEMENT (prompt 6, lot 036-012, ajout du 03/11 : « y a pas besoin de connexion »).
//
// À partir des gabarits d'une offre (`gabarit-artisan-*` pour Studio et Signature, `gabarit-ent-*` pour l'Entreprise, exports de
// `.orchestre/preuves/036-013` à `036-018`), il fabrique SUR LE DISQUE les exports `client-<slug>-*` d'un client fictif :
//   • avec ses réglages : organisation, offre, types activés (écrits dans `meta.client` et dans les nœuds qui portaient un emplacement) ;
//   • avec des EMPLACEMENTS d'identifiants nommés (`EMPLACEMENT_<SLUG>_<type>`) : jamais un identifiant réel ;
//   • inactifs, sans identifiant de workflow, sans version publiée ;
//   • déterministes : le même client rejoué donne les mêmes octets (aucune date, aucun hasard) ;
//   • Studio : tout nœud qui enverrait au dehors (hors brouillon et lecture) est DÉSACTIVÉ — Studio prépare, l'artisan valide.
//
// Il n'ouvre aucune connexion : ni n8n, ni Supabase, ni aucune API. Il ne lit que le disque. Déployer pour de vrai (importer la
// copie dans n8n, brancher les identifiants, publier) est un geste de Benj : `plans/011-cadrage-01-11/p6-signature/mise-en-service.md`.
//
// Usage :
//   node scripts/deployer-client-n8n.mjs --client=<slug> --offre=studio|signature|entreprise [--types=a,b] [--organisation=<uuid>]
//        [--ressource=JETON=valeur …] [--source=<dossier>,<dossier>] [--sortie=<dossier>]
// Sans --sortie : .orchestre/preuves/036-012/clients/<slug>/ . Le juge : scripts/deployer-client-n8n-qa.mjs.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = process.cwd()
const SOURCES_PAR_DEFAUT = ['036-013', '036-014', '036-015', '036-016', '036-018'].map((d) => `.orchestre/preuves/${d}`)

/** Les types que le pilote peut faire partir seuls (lib/pilote/regles.ts, TYPES_PILOTE) : le juge relit le fichier et compare. */
export const TYPES_PILOTE = ['reponse_prospect', 'relance_devis', 'relance_impaye', 'envoi_devis', 'envoi_facture', 'assistant_client']
export const OFFRES = ['studio', 'signature', 'entreprise']
/** Le gabarit de l'artisan sert Studio et Signature ; celui de l'Entreprise sert l'Entreprise. */
export const FAMILLE_GABARIT = { studio: 'gabarit-artisan-', signature: 'gabarit-artisan-', entreprise: 'gabarit-ent-' }
/** L'organisation d'exemple que les gabarits portent dans leurs nœuds Code, et les jetons qu'une copie remplace. */
export const ORGANISATION_EXEMPLE = '00000000-0000-4000-8000-0000000000e1'
export const JETONS_ORGANISATION = ['ORGANISATION_DU_CLIENT', 'A_RENSEIGNER_A_LA_COPIE']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

// Les nœuds qui enverraient au dehors (la même liste que scripts/n8n-specs-qa.mjs, TYPES_ENVOI) et ceux qui publient chez un tiers.
const TYPES_ENVOI = new Set(['emailSend', 'gmail', 'microsoftOutlook', 'sendGrid', 'mailgun', 'mailjet', 'sendInBlue', 'brevo', 'slack', 'telegram', 'twilio',
  'whatsApp', 'discord', 'mattermost', 'microsoftTeams', 'googleChat', 'mailchimp', 'activeCampaign', 'lemlist', 'facebookGraphApi', 'linkedIn', 'youTube', 'twitter'].map((t) => `n8n-nodes-base.${t}`))
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i

/** Le type d'identifiant que chaque nœud réclame (noms habituels de n8n ; à reconfirmer à l'import réel, c'est un emplacement). */
const IDENTIFIANTS = {
  gmail: 'gmailOAuth2', microsoftOutlook: 'microsoftOutlookOAuth2Api', emailSend: 'smtp', googleCalendar: 'googleCalendarOAuth2Api', googleDrive: 'googleDriveOAuth2Api',
  googleDocs: 'googleDocsOAuth2Api', googleSheets: 'googleSheetsOAuth2Api', googleChat: 'googleApi', googleBusinessProfile: 'googleBusinessProfileOAuth2Api',
  googleAds: 'googleAdsOAuth2Api', microsoftOneDrive: 'microsoftOneDriveOAuth2Api', microsoftExcel: 'microsoftExcelOAuth2Api', microsoftTeams: 'microsoftTeamsOAuth2Api',
  whatsApp: 'whatsAppApi', telegram: 'telegramApi', twilio: 'twilioApi', slack: 'slackOAuth2Api', sendInBlue: 'sendInBlueApi', mailchimp: 'mailchimpApi',
  activeCampaign: 'activeCampaignApi', lemlist: 'lemlistApi', facebookGraphApi: 'facebookGraphApi', linkedIn: 'linkedInOAuth2Api', youTube: 'youTubeOAuth2Api',
  twitter: 'twitterOAuth2Api', hubspot: 'hubspotAppToken', pipedrive: 'pipedriveApi', salesforce: 'salesforceOAuth2Api', zohoCrm: 'zohoOAuth2Api', odoo: 'odooApi',
  airtable: 'airtableTokenApi', notion: 'notionApi', mondayCom: 'mondayComApi', clickUp: 'clickUpApi', stripe: 'stripeApi', quickbooks: 'quickBooksOAuth2Api',
  xero: 'xeroOAuth2Api', zendesk: 'zendeskApi', shopify: 'shopifyApi', wooCommerce: 'wooCommerceApi', lmChatAnthropic: 'anthropicApi', anthropic: 'anthropicApi',
}
/** `gmailTool`, `gmailTrigger`, `slackHitlTool`… → `gmail`, `slack`. */
export const racineDuType = (type) => String(type).replace(/^.*\./, '').replace(/(HitlTool|Tool|Trigger)$/, '')

export function identifiantsReclames(n) {
  const t = racineDuType(n.type)
  if (String(n.type).startsWith('n8n-nodes-base.httpRequest')) {
    return n.parameters?.authentication === 'predefinedCredentialType' && typeof n.parameters?.nodeCredentialType === 'string' ? [n.parameters.nodeCredentialType] : []
  }
  return IDENTIFIANTS[t] && !/toolWorkflow|toolHttpRequest|agentTool/.test(n.type) ? [IDENTIFIANTS[t]] : []
}

const empreinte = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')

/** Un nœud qui enverrait au dehors : de type d'envoi, ni lecture ni brouillon ; ou HTTP en écriture hors Supabase. */
export function envoieAuDehors(n) {
  const op = n.parameters?.operation
  // L'API Graph de Meta se règle par sa méthode HTTP : un GET lit (les leads), tout autre verbe publie ou envoie.
  if (n.type === 'n8n-nodes-base.facebookGraphApi') return String(n.parameters?.httpRequestMethod ?? 'GET').toUpperCase() !== 'GET'
  if (TYPES_ENVOI.has(n.type)) return !(typeof op === 'string' && LECTURES.test(op)) && n.parameters?.resource !== 'draft'
  if (n.type === 'n8n-nodes-base.httpRequest') {
    const m = String(n.parameters?.method ?? 'GET').toUpperCase()
    let hote = ''
    try { hote = new URL(String(n.parameters?.url ?? '')).host } catch { /* expression ou vide */ }
    return m !== 'GET' && !/\.supabase\.co$/.test(hote)
  }
  return false
}

/** L'organisation fictive d'un client sans organisation donnée : stable, et jamais celle de l'exemple ni celle d'un autre slug. */
export const organisationDe = (slug) => `00000000-0000-4000-8000-${empreinte(`client:${slug}`).slice(0, 12)}`

export function validerClient(client) {
  const e = []
  if (typeof client?.slug !== 'string' || !SLUG.test(client.slug) || client.slug.length > 40) e.push(`slug « ${client?.slug} » : minuscules, chiffres et tirets (40 au plus)`)
  else if (client.slug === 'ent' || client.slug.startsWith('ent-')) e.push('slug « ent… » refusé : il se confondrait avec les copies de l’offre Entreprise (client-ent-…)')
  if (!OFFRES.includes(client?.offre)) e.push(`offre « ${client?.offre} » : studio, signature ou entreprise`)
  if (client?.organisation !== undefined && (typeof client.organisation !== 'string' || !UUID.test(client.organisation))) e.push('organisation : un UUID')
  if (client?.organisation === ORGANISATION_EXEMPLE) e.push('organisation : celle de l’exemple des gabarits est refusée')
  const types = client?.types_actives ?? []
  if (!Array.isArray(types) || types.some((t) => !TYPES_PILOTE.includes(t))) e.push(`types activés : parmi ${TYPES_PILOTE.join(', ')} (la liste fermée du pilote)`)
  else if (new Set(types).size !== types.length) e.push('types activés : un type deux fois')
  else if (types.length && client?.offre !== 'signature') e.push(`types activés : seule l’offre Signature fait partir un type seul (offre ${client?.offre})`)
  return e
}

/** Remplace, dans toutes les chaînes d'une valeur JSON, les jetons par leurs valeurs. Rend la valeur neuve. */
function substituer(valeur, paires) {
  if (typeof valeur === 'string') { let s = valeur; for (const [de, vers] of paires) s = s.split(de).join(vers); return s }
  if (Array.isArray(valeur)) return valeur.map((v) => substituer(v, paires))
  if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, substituer(v, paires)]))
  return valeur
}
const plat = (x) => (x && x.workflow && x.workflow.nodes ? x.workflow : x)

export const nomDeLaCopie = (nomGabarit, client) => {
  const reste = client.offre === 'entreprise' ? nomGabarit.replace(/^gabarit-ent-/, '') : nomGabarit.replace(/^gabarit-artisan-/, '')
  if (reste === nomGabarit) throw new Error(`« ${nomGabarit} » n'est pas un gabarit de l'offre ${client.offre}`)
  return client.offre === 'entreprise' ? `client-ent-${client.slug}-${reste}` : `client-${client.slug}-${reste}`
}

/** La copie d'UN gabarit pour un client. Pure : rien n'est lu ni écrit ici. */
export function fabriquerCopie(gabaritBrut, registreGabarit, client) {
  const g = plat(gabaritBrut)
  const organisation = client.organisation ?? organisationDe(client.slug)
  const nom = nomDeLaCopie(g.name, client)
  const paires = [...JETONS_ORGANISATION.map((j) => [j, organisation]), [ORGANISATION_EXEMPLE, organisation],
    ...Object.entries(client.ressources ?? {}).map(([j, v]) => [j, String(v)])]
  const emplacements = []
  const jetonsOuverts = new Set()
  const studio = client.offre === 'studio'
  const nodes = g.nodes.map((n0) => {
    // La garde du gabarit : un nœud Code n'a le droit d'être copié que tel que le registre l'a empreint.
    if (n0.type === 'n8n-nodes-base.code') {
      const attendu = registreGabarit?.[g.name]?.[n0.name]
      if (attendu !== empreinte(n0.parameters?.jsCode)) throw new Error(`${g.name} / ${n0.name} : le code du gabarit ne correspond pas à son empreinte : copie refusée`)
    }
    const n = { ...n0, parameters: substituer(n0.parameters, paires) }
    if (n0.credentials && Object.keys(n0.credentials).length) throw new Error(`${g.name} / ${n0.name} : un gabarit ne porte aucun identifiant`)
    const reclames = identifiantsReclames(n)
    if (reclames.length) {
      n.credentials = Object.fromEntries(reclames.map((c) => {
        const id = `EMPLACEMENT_${client.slug.toUpperCase().replace(/-/g, '_')}_${c}`
        emplacements.push({ workflow: nom, noeud: n.name, type: c, id })
        return [c, { id, name: `À brancher par ${client.slug} : ${c}` }]
      }))
    }
    if (studio && envoieAuDehors(n)) n.disabled = true
    for (const j of JSON.stringify(n.parameters ?? {}).match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_DU_CLIENT\b|\bORGANISATION_XERO_DU_CLIENT\b/g) ?? []) jetonsOuverts.add(j)
    return n
  })
  const copie = {
    name: nom, active: false, isArchived: false, activeVersionId: null, settings: g.settings, nodes, connections: g.connections,
    meta: {
      ...(g.meta ?? {}),
      client: {
        slug: client.slug, offre: client.offre, organisation, gabarit: g.name, mode: 'a_blanc',
        types_actives: client.offre === 'signature' ? [...(client.types_actives ?? [])].sort() : [],
        envois_actifs: !studio, jetons_a_renseigner: [...jetonsOuverts].sort(),
      },
    },
  }
  const registre = Object.fromEntries(nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, empreinte(n.parameters.jsCode)]))
  return { copie, registre, emplacements }
}

/** Les gabarits d'une offre trouvés sur le disque (nom → { brut, registre, chemin }), triés par nom. */
export function lireGabarits(offre, dossiers = SOURCES_PAR_DEFAUT, racine = RACINE) {
  const prefixe = FAMILLE_GABARIT[offre]
  const trouves = []
  for (const d of dossiers) {
    const dir = path.resolve(racine, d)
    if (!existsSync(dir)) continue
    const registreFichier = path.join(dir, 'empreintes-code.json')
    const registre = existsSync(registreFichier) ? JSON.parse(readFileSync(registreFichier, 'utf8')) : {}
    for (const f of readdirSync(dir).filter((x) => x.startsWith(prefixe) && x.endsWith('.workflow.json')).sort()) {
      trouves.push({ chemin: path.join(dir, f), brut: JSON.parse(readFileSync(path.join(dir, f), 'utf8')), registre })
    }
  }
  const noms = trouves.map((t) => plat(t.brut).name)
  if (new Set(noms).size !== noms.length) throw new Error('deux gabarits portent le même nom')
  return trouves.sort((a, b) => plat(a.brut).name.localeCompare(plat(b.brut).name))
}

/** Les fichiers (nom → texte) d'un client, sans rien écrire. Même client, mêmes octets. */
export function fabriquerClient(client, dossiersSource = SOURCES_PAR_DEFAUT, racine = RACINE) {
  const erreurs = validerClient(client)
  if (erreurs.length) throw new Error(`client refusé : ${erreurs.join(' ; ')}`)
  const gabarits = lireGabarits(client.offre, dossiersSource, racine)
  if (!gabarits.length) throw new Error(`aucun gabarit pour l'offre ${client.offre} dans ${dossiersSource.join(', ')}`)
  const fichiers = new Map()
  const registre = {}
  const emplacements = []
  for (const g of gabarits) {
    const r = fabriquerCopie(g.brut, g.registre, client)
    fichiers.set(`${r.copie.name}.workflow.json`, `${JSON.stringify(r.copie, null, 2)}\n`)
    registre[r.copie.name] = r.registre
    emplacements.push(...r.emplacements)
  }
  fichiers.set('empreintes-code.json', `${JSON.stringify(registre, null, 2)}\n`)
  const resume = {
    client: client.slug, offre: client.offre, organisation: client.organisation ?? organisationDe(client.slug),
    types_actives: client.offre === 'signature' ? [...(client.types_actives ?? [])].sort() : [],
    copies: [...fichiers.keys()].filter((f) => f.endsWith('.workflow.json')),
    emplacements_identifiants: emplacements,
    gestes_de_benj: ['importer chaque copie dans n8n (inactive)', 'brancher les emplacements EMPLACEMENT_* sur les vrais identifiants du client (geste de compte, jamais d\'un agent)',
      'poser les jetons *_DU_CLIENT restants', 'passer en mode ombre avant tout envoi réel', 'publier les enfants avant les parents'],
  }
  fichiers.set(`client-${client.offre === 'entreprise' ? 'ent-' : ''}${client.slug}-emplacements.json`, `${JSON.stringify(resume, null, 2)}\n`)
  return fichiers
}

export function ecrireClient(client, sortie, dossiersSource, racine = RACINE) {
  const fichiers = fabriquerClient(client, dossiersSource, racine)
  mkdirSync(sortie, { recursive: true })
  for (const [nom, texte] of fichiers) writeFileSync(path.join(sortie, nom), texte)
  return [...fichiers.keys()]
}

// ─── Ligne de commande ───────────────────────────────────────────────────────────────────────────────────────────
const lance = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (lance) {
  const arg = (nom) => process.argv.slice(2).filter((a) => a.startsWith(`--${nom}=`)).map((a) => a.slice(nom.length + 3))
  const client = {
    slug: arg('client')[0], offre: arg('offre')[0],
    organisation: arg('organisation')[0], types_actives: (arg('types')[0] ?? '').split(',').filter(Boolean),
    ressources: Object.fromEntries(arg('ressource').map((r) => [r.split('=')[0], r.slice(r.indexOf('=') + 1)])),
  }
  if (client.organisation === undefined) delete client.organisation
  try {
    const sortie = path.resolve(RACINE, arg('sortie')[0] ?? `.orchestre/preuves/036-012/clients/${client.slug}`)
    const sources = arg('source')[0]?.split(',')
    const ecrits = ecrireClient(client, sortie, sources)
    console.log(`À BLANC : ${ecrits.length} fichier(s) écrits dans ${path.relative(RACINE, sortie)} (aucune connexion, aucun identifiant réel, rien d'importé dans n8n)`)
    for (const f of ecrits) console.log(`  ${f}`)
  } catch (err) {
    console.error(`✗ ${err.message}`)
    process.exit(1)
  }
}
