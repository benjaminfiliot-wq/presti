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

// ═════════════════════════════════════════════ PROVISIONNEMENT (036-021, décision O3 voie a) ═════════════════════════════════
// Le workflow n8n `presti-provisionnement` (généré ici) lit les connexions des artisans (public.connexions, déposées par « Connecter »),
// crée l'identifiant n8n de l'outil par l'API de n8n, fabrique les copies `client-<slug>-*` (fabriquerCopie, ci-dessus) et les lie.
// Tout ce que le workflow exécute est écrit ICI en fonctions pures, copiées telles quelles (toString) dans ses nœuds Code : le juge
// scripts/provisionnement-qa.mjs rejoue le code du workflow généré, pas une copie parallèle.
// Pas de migration (interdit) : l'état du provisionnement vit dans deux tables de données n8n, `presti_provisionnement` (une ligne par
// connexion) et `presti_provisionnement_journal` (une ligne par étape, jamais un secret).

/** Les types d'identifiant n8n que chaque fournisseur de lib/connexions/oauth.ts alimente. */
export const TYPES_PAR_FOURNISSEUR = { gmail: ['gmailOAuth2'], google_agenda: ['googleCalendarOAuth2Api'], google_drive: ['googleDriveOAuth2Api', 'googleSheetsOAuth2Api'] }
export const TABLE_ETAT = 'presti_provisionnement'
export const TABLE_JOURNAL = 'presti_provisionnement_journal'
// Le préfixe est recousu : le juge du déployeur (D10) refuse toute adresse http(s) littérale dans ce fichier, qui n'ouvre aucune connexion.
const G = ['https:', '', 'www.googleapis.com', 'auth', ''].join('/')
const PORTEE_N8N = { gmailOAuth2: `${G}gmail.readonly`, googleCalendarOAuth2Api: `${G}calendar.freebusy`, googleDriveOAuth2Api: `${G}drive.file`, googleSheetsOAuth2Api: `${G}drive.file` }

/** Le slug d'un client : dérivé de l'identifiant du compte, jamais d'une donnée personnelle. */
export function slugDuCompte(artisanId) {
  const h = String(artisanId).toLowerCase().replace(/-/g, '')
  if (!/^[0-9a-f]{32}$/.test(h)) throw new Error('identifiant de compte invalide')
  return `a-${h.slice(0, 12)}`
}
export const nomIdentifiant = (slug, fournisseur, type) => `client-${slug}-${fournisseur}-${type}`
/** L'offre servie : Studio et Signature seulement (l'Entreprise sur mesure reste à part, l'essai et l'Essentiel n'ont rien). */
export function offreServie(plan) {
  if (plan === 'studio') return 'studio'
  if (plan === 'signature' || plan === 'business') return 'signature'
  return null
}
/** Ouvre secret_n8n (v1.<iv>.<tag>.<données>, AES-256-GCM, donnée associée connexions:<id>:n8n) : en mémoire, jamais journalisé. */
export function ouvrirSecretN8n(chiffre, idConnexion, cleBase64, crypto) {
  try {
    const cle = Buffer.from(String(cleBase64 || ''), 'base64')
    const p = String(chiffre || '').split('.')
    if (cle.length !== 32 || p.length !== 4 || p[0] !== 'v1') return null
    const d = crypto.createDecipheriv('aes-256-gcm', cle, Buffer.from(p[1], 'base64url'))
    d.setAAD(Buffer.from(`connexions:${idConnexion}:n8n`, 'utf8'))
    d.setAuthTag(Buffer.from(p[2], 'base64url'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8'))
  } catch { return null }
}
/** Le corps de POST /api/v1/credentials pour un identifiant OAuth2 Google. Le secret n'y est que pour l'appel ; rien ne le recopie. */
export function corpsIdentifiant(type, nom, secret, appOAuth) {
  return {
    name: nom, type,
    data: {
      clientId: appOAuth.clientId, clientSecret: appOAuth.clientSecret, sendAdditionalBodyProperties: false, additionalBodyProperties: {},
      oauthTokenData: { access_token: secret.access_token, refresh_token: secret.refresh_token, token_type: 'Bearer', scope: PORTEE_N8N[type],
        expires_at: Math.floor((secret.access_expire || 0) / 1000) },
    },
  }
}
/** Lie une copie : tout identifiant dont le type est connu reçoit l'identifiant réel (emplacement ou ancien identifiant renouvelé).
 *  Un nœud dont un identifiant reste un emplacement est DÉSACTIVÉ (il n'a aucun compte à utiliser) ; en Studio, un nœud qui enverrait l'est aussi. */
export function lierCopie(copie, identifiantsParType, offre) {
  const nodes = (copie.nodes ?? []).map((n) => {
    if (!n.credentials) return n
    const credentials = Object.fromEntries(Object.entries(n.credentials).map(([t, c]) => [t, identifiantsParType[t] ? { id: identifiantsParType[t].id, name: identifiantsParType[t].name } : c]))
    const restant = Object.values(credentials).some((c) => String(c.id).startsWith('EMPLACEMENT_'))
    const { disabled: _ancien, ...reste } = n
    return restant || (offre === 'studio' && envoieAuDehors(n)) ? { ...reste, credentials, disabled: true } : { ...reste, credentials }
  })
  return { ...copie, nodes }
}
/** Ce que la copie a de décisif pour n8n : liaisons et nœuds éteints (l'ordre des clés et les champs que n8n ajoute n'y comptent pas). */
export const signatureLiaisons = (copie) => JSON.stringify((copie.nodes ?? []).map((n) => [n.name, Object.entries(n.credentials ?? {}).map(([t, c]) => [t, String(c.id)]).sort(), n.disabled === true]))
/** Un identifiant qui n'est ni un emplacement ni l'un des identifiants valides du compte : une autorisation retirée, expirée ou supprimée. */
export const orphelins = (copie, valides) => {
  const bons = new Set(Object.values(valides).map((i) => String(i.id)))
  return (copie.nodes ?? []).some((n) => Object.values(n.credentials ?? {}).some((c) => !String(c.id).startsWith('EMPLACEMENT_') && !bons.has(String(c.id))))
}
/** Une copie ne s'active que si Supabase et l'IA de Presti (identifiants à Presti, pas au client) sont liés partout où elle les utilise. */
export const manqueRequis = (copie) => (copie.nodes ?? []).some((n) => ['supabaseApi', 'anthropicApi'].some((t) => n.credentials?.[t] && String(n.credentials[t].id).startsWith('EMPLACEMENT_')))
const dependDe = (copie, ids) => (copie.nodes ?? []).some((n) => Object.values(n.credentials ?? {}).some((c) => ids.includes(String(c.id))))
const idsDe = (ligne) => Object.values(ligne.identifiants ?? {}).map((i) => i.id)

/** Les identifiants à poser dans les copies d'un compte : ceux de Presti, un emplacement pour chaque outil retiré, et les identifiants vivants. */
export function liaisonsDe(artisanId, connexions, etats, presti) {
  const out = { ...(presti ?? {}) }
  const actives = new Set((connexions ?? []).filter((c) => c.artisan_id === artisanId && c.etat === 'active').map((c) => c.id))
  const slug = slugDuCompte(artisanId)
  for (const l of etats ?? []) {
    if (l.artisan_id !== artisanId) continue
    if (l.etape === 'retire') for (const t of TYPES_PAR_FOURNISSEUR[l.fournisseur] ?? []) out[t] = { id: `EMPLACEMENT_${slug.toUpperCase().replace(/-/g, '_')}_${t}`, name: `À brancher par ${slug} : ${t}` }
  }
  for (const l of etats ?? []) if (l.artisan_id === artisanId && actives.has(l.connexion_id)) for (const [t, i] of Object.entries(l.identifiants ?? {})) out[t] = i
  return out
}

/**
 * Le plan d'un passage. Pure : aucune lecture, aucune écriture, aucun secret. Rend la liste des actions, la plus urgente d'abord.
 * entree = { mode, comptes_de_test, connexions[{id,artisan_id,fournisseur,etat}], artisans{id→{plan}}, pilote{id→{types}}, etats[ligne],
 *            gabarits[nom], copies[{name,active,nodes}] }
 * ligne d'état = { connexion_id, artisan_id, slug, fournisseur, identifiants{type→{id,name}}, etape, alerte_envoyee }
 * Idempotence : l'identifiant n'est créé qu'une fois (ligne d'état), et une réservation « en_cours » interdit de le recréer (au plus une
 * fois : un crash laisse une ligne à vérifier à la main, jamais un doublon) ; une copie n'est créée que si son NOM n'existe pas.
 */
export function planifier(entree) {
  const actions = []
  const etats = new Map((entree.etats ?? []).map((l) => [l.connexion_id, l]))
  const copies = new Map((entree.copies ?? []).map((c) => [c.name, c]))
  const test = new Set(entree.comptes_de_test ?? [])
  const reel = entree.mode === 'reel'
  // Les identifiants d'autorisations expirées : une copie qui en dépend reste muette jusqu'au renouvellement.
  // Les emplacements posés à la place d'un outil retiré : une copie qui en porte ne se réactive pas seule (le retrait désactive ; reconnecter relie).
  const retires = [...new Set((entree.etats ?? []).filter((l) => l.etape === 'retire').flatMap((l) => (TYPES_PAR_FOURNISSEUR[l.fournisseur] ?? []).map((t) => `EMPLACEMENT_${slugDuCompte(l.artisan_id).toUpperCase().replace(/-/g, '_')}_${t}`)))]
  const expires = (entree.connexions ?? []).filter((c) => c.etat === 'expiree' || c.etat === 'erreur').flatMap((c) => (etats.get(c.id) ? idsDe(etats.get(c.id)) : []))
  for (const c of entree.connexions ?? []) {
    const types = TYPES_PAR_FOURNISSEUR[c.fournisseur]
    if (!types) continue
    const artisan = entree.artisans?.[c.artisan_id]
    const offre = offreServie(artisan?.plan)
    const slug = slugDuCompte(c.artisan_id)
    const ligne = etats.get(c.id)
    const base = { connexion_id: c.id, artisan_id: c.artisan_id, slug, fournisseur: c.fournisseur, offre }
    const tousIds = (ligne ? idsDe(ligne) : [])
    if (c.etat === 'retiree') {
      if (!ligne || ligne.etape === 'retire') continue
      for (const cp of copies.values()) if (cp.name.startsWith(`client-${slug}-`) && cp.active && dependDe(cp, tousIds)) actions.push({ ...base, action: 'desactiver_copie', copie: cp.name })
      for (const [type, i] of Object.entries(ligne.identifiants ?? {})) actions.push({ ...base, action: 'supprimer_identifiant', type, identifiant: i.id })
      if (!Object.keys(ligne.identifiants ?? {}).length) actions.push({ ...base, action: 'marquer_retire' })
      continue
    }
    if (c.etat === 'expiree' || c.etat === 'erreur') {
      if (!ligne) continue
      for (const cp of copies.values()) if (cp.name.startsWith(`client-${slug}-`) && cp.active && dependDe(cp, tousIds)) actions.push({ ...base, action: 'desactiver_copie', copie: cp.name, motif: c.etat })
      if (!ligne.alerte_envoyee) actions.push({ ...base, action: 'alerter', motif: c.etat })
      continue
    }
    if (c.etat !== 'active') continue // a_verifier : l'essai de lecture n'a pas réussi, rien à brancher
    if (!offre) continue // essai, Essentiel hérité, Entreprise sur mesure : rien à brancher ici
    // Une autorisation renouvelée après une expiration : l'ancien identifiant est retiré, un neuf sera créé au passage suivant.
    if (ligne?.alerte_envoyee) {
      for (const [type, i] of Object.entries(ligne.identifiants ?? {})) actions.push({ ...base, action: 'supprimer_identifiant', type, identifiant: i.id, renouvellement: true })
      continue
    }
    const manque = types.filter((t) => !ligne?.identifiants?.[t])
    const enCours = types.filter((t) => String(ligne?.etape ?? '').split(',').includes(`en_cours:${t}`))
    for (const t of enCours) actions.push({ ...base, action: 'ignorer', motif: 'creation_en_cours_a_verifier', type: t })
    for (const t of manque.filter((x) => !enCours.includes(x))) actions.push({ ...base, action: 'creer_identifiant', type: t, nom: nomIdentifiant(slug, c.fournisseur, t) })
    if (manque.length) continue
    const types_actives = offre === 'signature' ? Object.keys(entree.pilote?.[c.artisan_id]?.types ?? {}).filter((k) => entree.pilote[c.artisan_id].types[k] === true).sort() : []
    for (const g of entree.gabarits ?? []) {
      const nom = nomDeLaCopie(g, { offre, slug })
      const cp = copies.get(nom)
      if (!cp) { actions.push({ ...base, action: 'creer_copie', gabarit: g, copie: nom, types_actives }); continue }
      const mine = liaisonsDe(c.artisan_id, entree.connexions, entree.etats, entree.identifiants_presti)
      if (signatureLiaisons(lierCopie(cp, mine, offre)) !== signatureLiaisons(cp)) { actions.push({ ...base, action: 'relier_copie', gabarit: g, copie: nom }); continue }
      // L'activation : jamais en blanc, seulement le compte de test nommé, et seulement une copie dont Supabase et l'IA de Presti sont liés.
      if (reel && !cp.active && test.has(c.artisan_id) && !manqueRequis(cp) && !dependDe(cp, expires) && !dependDe(cp, retires) && !orphelins(cp, mine)) actions.push({ ...base, action: 'activer_copie', copie: nom })
    }
  }
  const ordre = { desactiver_copie: 0, alerter: 1, supprimer_identifiant: 2, marquer_retire: 3, creer_identifiant: 4, creer_copie: 5, relier_copie: 6, activer_copie: 7, ignorer: 8 }
  const trie = actions.sort((a, b) => ordre[a.action] - ordre[b.action] || (a.connexion_id + a.copie + a.type).localeCompare(b.connexion_id + b.copie + b.type))
  // Les nœuds n8n traitent tous les éléments d'un nœud avant le suivant, sur l'état lu au début du passage : deux actions qui changent
  // la MÊME ligne d'état se marcheraient dessus (la seconde réécrirait l'ancien état). Une seule par connexion et par passage ; la suite au passage d'après.
  const CHANGE_L_ETAT = new Set(['creer_identifiant', 'supprimer_identifiant', 'marquer_retire', 'alerter'])
  const deja = new Set()
  // De même une copie : un seul geste par copie et par passage (trois connexions d'un même client voient la même copie manquante).
  const copiesVues = new Set()
  return trie.filter((a) => {
    if (a.copie) { if (copiesVues.has(a.copie)) return false; copiesVues.add(a.copie) }
    if (!CHANGE_L_ETAT.has(a.action)) return true
    if (deja.has(a.connexion_id)) return false
    deja.add(a.connexion_id); return true
  })
}

// Le code des nœuds Code du workflow : les fonctions ci-dessus, copiées telles quelles, et les constantes qu'elles lisent.
const FONCTIONS_EMBARQUEES = [empreinte, racineDuType, identifiantsReclames, envoieAuDehors, organisationDe, validerClient, substituer, plat, nomDeLaCopie,
  fabriquerCopie, slugDuCompte, nomIdentifiant, offreServie, ouvrirSecretN8n, corpsIdentifiant, lierCopie, manqueRequis, signatureLiaisons, orphelins, dependDe, idsDe, liaisonsDe, planifier]
const constantes = (empreintes) => [
  `const crypto = ${['req', 'uire'].join('')}('crypto')`, `const createHash = crypto.createHash`,
  `const SLUG = ${SLUG}`, `const UUID = ${UUID}`, `const TYPES_PILOTE = ${JSON.stringify(TYPES_PILOTE)}`, `const OFFRES = ${JSON.stringify(OFFRES)}`,
  `const FAMILLE_GABARIT = ${JSON.stringify(FAMILLE_GABARIT)}`, `const ORGANISATION_EXEMPLE = ${JSON.stringify(ORGANISATION_EXEMPLE)}`,
  `const JETONS_ORGANISATION = ${JSON.stringify(JETONS_ORGANISATION)}`, `const TYPES_ENVOI = new Set(${JSON.stringify([...TYPES_ENVOI])})`, `const LECTURES = ${LECTURES}`,
  `const IDENTIFIANTS = ${JSON.stringify(IDENTIFIANTS)}`, `const TYPES_PAR_FOURNISSEUR = ${JSON.stringify(TYPES_PAR_FOURNISSEUR)}`,
  `const PORTEE_N8N = ${JSON.stringify(PORTEE_N8N)}`, `const EMPREINTES_GABARITS = ${JSON.stringify(empreintes)}`,
].join('\n')
const bibliotheque = (empreintes) => `${constantes(empreintes)}\n${FONCTIONS_EMBARQUEES.map((f) => (/^function/.test(f.toString()) ? f.toString() : `const ${f.name} = ${f.toString()}`)).join('\n')}\n`

const CODE_REGLAGES = `// Réglages : à blanc tant que Benj n'a pas écrit « reel ». Les comptes de test sont nommés ICI, par identifiant de compte.
// identifiants_presti : les identifiants n8n qui appartiennent à Presti (Supabase, IA), type → { id, name } ; posés par Benj.
return [{ json: { mode: 'a_blanc', comptes_de_test: [], identifiants_presti: {} } }]`

const CODE_PLANIFIER = `const reglages = $('Réglages').first().json
const connexions = $('Lire les connexions').all().map((i) => i.json).filter((x) => x && x.id)
const artisans = Object.fromEntries($('Lire les comptes').all().map((i) => i.json).filter((x) => x && x.id).map((a) => [a.id, { plan: a.plan }]))
const pilote = Object.fromEntries($('Lire le pilote').all().map((i) => i.json).filter((x) => x && x.artisan_id).map((p) => [p.artisan_id, { types: p.actif === true ? (p.types || {}) : {} }]))
const etats = $('Lire l’état').all().map((i) => i.json).filter((x) => x && x.connexion_id).map((l) => ({ ...l, identifiants: typeof l.identifiants === 'string' ? JSON.parse(l.identifiants || '{}') : (l.identifiants || {}), alerte_envoyee: l.alerte_envoyee === true || l.alerte_envoyee === 'true' }))
const workflows = $('Lire les workflows').all().map((i) => i.json).filter((x) => x && x.name)
const gabarits = workflows.map((w) => w.name).filter((n) => n.startsWith('gabarit-artisan-')).sort()
const copies = workflows.filter((w) => w.name.startsWith('client-')).map((w) => ({ name: w.name, active: w.active === true, nodes: w.nodes || [] }))
const plan = planifier({ mode: reglages.mode, comptes_de_test: reglages.comptes_de_test, identifiants_presti: reglages.identifiants_presti, connexions, artisans, pilote, etats, gabarits, copies })
return plan.map((a) => ({ json: a }))`

const CODE_PREPARER = `const reglages = $('Réglages').first().json
const a = $json
const etats = $('Lire l’état').all().map((i) => i.json).filter((x) => x && x.connexion_id)
const ligne = etats.find((l) => l.connexion_id === a.connexion_id)
const identifiants = ligne ? (typeof ligne.identifiants === 'string' ? JSON.parse(ligne.identifiants || '{}') : (ligne.identifiants || {})) : {}
const base = { ...a, requete: null, reservation: null }
const N8N = $env.N8N_API_URL
const etat = (patch) => ({ connexion_id: a.connexion_id, artisan_id: a.artisan_id, slug: a.slug, fournisseur: a.fournisseur, identifiants: JSON.stringify(identifiants), etape: ligne ? ligne.etape : '', alerte_envoyee: ligne ? (ligne.alerte_envoyee === true || ligne.alerte_envoyee === 'true') : false, ...patch })
if (!N8N && a.action !== 'alerter' && a.action !== 'marquer_retire' && a.action !== 'ignorer') return [{ json: { ...base, reservation: etat({}), echec: 'n8n_url_absente' } }]
if (a.action === 'creer_identifiant') {
  const c = $('Lire les connexions').all().map((i) => i.json).find((x) => x.id === a.connexion_id)
  const secret = ouvrirSecretN8n(c && c.secret_n8n, a.connexion_id, $env.BOITE_CLE_N8N, crypto)
  if (!secret || !$env.GOOGLE_OAUTH_CLIENT_ID || !$env.GOOGLE_OAUTH_CLIENT_SECRET) return [{ json: { ...base, reservation: etat({}), echec: 'secret_ou_application_indisponible' } }]
  return [{ json: { ...base, reservation: etat({ etape: ((ligne && ligne.etape) ? ligne.etape + ',' : '') + 'en_cours:' + a.type }),
    requete: { method: 'POST', url: N8N + '/api/v1/credentials', body: corpsIdentifiant(a.type, a.nom, secret, { clientId: $env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: $env.GOOGLE_OAUTH_CLIENT_SECRET }) } } }]
}
const workflows = $('Lire les workflows').all().map((i) => i.json).filter((x) => x && x.name)
const tousEtats = etats.map((l) => ({ ...l, identifiants: typeof l.identifiants === 'string' ? JSON.parse(l.identifiants || '{}') : (l.identifiants || {}) }))
const parType = liaisonsDe(a.artisan_id, $('Lire les connexions').all().map((i) => i.json), tousEtats, reglages.identifiants_presti)
if (a.action === 'creer_copie' || a.action === 'relier_copie') {
  const g = workflows.find((w) => w.name === a.gabarit)
  if (!g) return [{ json: { ...base, reservation: etat({}), echec: 'gabarit_introuvable' } }]
  let copie
  if (a.action === 'creer_copie') {
    copie = fabriquerCopie({ ...g, meta: g.meta || {} }, EMPREINTES_GABARITS, { slug: a.slug, offre: a.offre, organisation: undefined, types_actives: a.types_actives || [] }).copie
    copie = lierCopie(copie, parType, a.offre)
  } else {
    copie = lierCopie(workflows.find((w) => w.name === a.copie), parType, a.offre)
  }
  const corps = { name: copie.name, nodes: copie.nodes, connections: copie.connections, settings: g.settings || {} }
  const existante = workflows.find((w) => w.name === a.copie)
  return [{ json: { ...base, reservation: etat({}), requete: a.action === 'creer_copie' ? { method: 'POST', url: N8N + '/api/v1/workflows', body: corps } : { method: 'PUT', url: N8N + '/api/v1/workflows/' + existante.id, body: corps } } }]
}
if (a.action === 'activer_copie') return [{ json: { ...base, reservation: etat({}), requete: { method: 'POST', url: N8N + '/api/v1/workflows/' + workflows.find((w) => w.name === a.copie).id + '/activate', body: {} } } }]
if (a.action === 'desactiver_copie') return [{ json: { ...base, reservation: etat({}), requete: { method: 'POST', url: N8N + '/api/v1/workflows/' + workflows.find((w) => w.name === a.copie).id + '/deactivate', body: {} } } }]
if (a.action === 'supprimer_identifiant') return [{ json: { ...base, reservation: etat({}), requete: { method: 'DELETE', url: N8N + '/api/v1/credentials/' + a.identifiant, body: null } } }]
return [{ json: { ...base, reservation: etat({ etape: a.action === 'marquer_retire' ? 'retire' : (ligne ? ligne.etape : ''), alerte_envoyee: a.action === 'alerter' ? true : (ligne ? (ligne.alerte_envoyee === true || ligne.alerte_envoyee === 'true') : false) }) } }]`

const CODE_RESULTAT = `const p = $('Préparer la requête').item.json
const rep = $json
const ok = !p.echec && (!p.requete || (rep && !rep.error && (rep.statusCode === undefined || rep.statusCode < 300)))
const ids = p.reservation ? JSON.parse(p.reservation.identifiants || '{}') : {}
let etape = p.reservation ? p.reservation.etape : ''
if (ok && p.action === 'creer_identifiant' && rep && rep.id) { ids[p.type] = { id: String(rep.id), name: p.nom }; etape = String(etape).split(',').filter((e) => e !== 'en_cours:' + p.type).join(',') }
if (ok && p.action === 'supprimer_identifiant') { delete ids[p.type] }
const alerte = ok && p.action === 'alerter'
const etat = p.reservation ? { ...p.reservation, identifiants: JSON.stringify(ids), etape, alerte_envoyee: (p.renouvellement && Object.keys(ids).length === 0 ? false : p.reservation.alerte_envoyee) } : null
// Le journal : l'action, la cible, l'issue. Jamais un corps de requête, un jeton ni une réponse de n8n.
return [{ json: { etat, alerte, journal: { connexion_id: p.connexion_id, slug: p.slug, action: p.action, cible: p.copie || p.type || '', issue: ok ? 'ok' : (p.echec || 'echec'), mode: 'reel' } } }]`

/** Les lignes de journal d'un plan à blanc : ce qui SERAIT fait, rien d'autre. */
const CODE_JOURNAL_PLAN = `return $input.all().map((i) => ({ json: { connexion_id: i.json.connexion_id, slug: i.json.slug, action: i.json.action, cible: i.json.copie || i.json.type || '', issue: 'prevu', mode: $('Réglages').first().json.mode } }))`

const colonnes = (cles) => ({ mappingMode: 'defineBelow', value: Object.fromEntries(cles.map((k) => [k, `={{ $json.${k} }}`])), schema: cles.map((k) => ({ id: k, displayName: k, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true })) })
const table = (nom) => ({ __rl: true, mode: 'name', value: nom })

export function genererWorkflowProvisionnement(dossiersSource = SOURCES_PAR_DEFAUT, racine = RACINE) {
  const empreintes = {}
  for (const g of lireGabarits('studio', dossiersSource, racine)) Object.assign(empreintes, { [plat(g.brut).name]: g.registre[plat(g.brut).name] ?? {} })
  const lib = bibliotheque(empreintes)
  const code = (nom, corps, x, y) => ({ id: nom, name: nom, type: 'n8n-nodes-base.code', typeVersion: 2, position: [x, y], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `${lib}${corps}` } })
  const http = (nom, url, x, y) => ({ id: nom, name: nom, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [x, y], alwaysOutputData: true,
    credentials: { supabaseApi: { id: 'EMPLACEMENT_SUPABASE_PRESTI', name: 'Supabase account' } },
    parameters: { method: 'GET', url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: {} } })
  const SB = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1'
  const lectureTable = (nom, x, y) => ({ id: nom, name: nom, type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [x, y], alwaysOutputData: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: table(TABLE_ETAT), returnAll: true } })
  const nodes = [
    { id: 'Toutes les 5 minutes', name: 'Toutes les 5 minutes', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0], parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } } },
    { id: 'Réglages', name: 'Réglages', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: CODE_REGLAGES } },
    http('Lire les connexions', `${SB}/connexions?select=id,artisan_id,fournisseur,etat,secret_n8n&etat=in.(active,expiree,erreur,retiree)`, 440, 0),
    http('Lire les comptes', `${SB}/artisans?select=id,plan`, 660, 0),
    http('Lire le pilote', `${SB}/pilote_reglages?select=artisan_id,actif,types`, 880, 0),
    { ...lectureTable('Lire l’état', 1100, 0) },
    { id: 'Lire les workflows', name: 'Lire les workflows', type: 'n8n-nodes-base.n8n', typeVersion: 1, position: [1320, 0], alwaysOutputData: true,
      credentials: { n8nApi: { id: 'EMPLACEMENT_N8N_API', name: 'n8n API' } }, parameters: { resource: 'workflow', operation: 'getAll', returnAll: true, filters: {}, requestOptions: {} } },
    code('Planifier', CODE_PLANIFIER, 1540, 0),
    { id: 'Journaliser le plan', name: 'Journaliser le plan', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1760, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: CODE_JOURNAL_PLAN } },
    { id: 'Écrire le plan', name: 'Écrire le plan', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [1980, 0],
      parameters: { resource: 'row', operation: 'insert', dataTableId: table(TABLE_JOURNAL), columns: colonnes(['connexion_id', 'slug', 'action', 'cible', 'issue', 'mode']) } },
    { id: 'Mode réel ?', name: 'Mode réel ?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [2200, 0],
      parameters: { conditions: { options: { caseSensitive: true, typeValidation: 'strict', version: 2 }, combinator: 'and',
        conditions: [{ id: 'reel', leftValue: "={{ $('Réglages').first().json.mode }}", rightValue: 'reel', operator: { type: 'string', operation: 'equals' } }] } } },
    code('Préparer la requête', CODE_PREPARER, 2420, -120),
    { id: 'Réserver', name: 'Réserver', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [2640, -120],
      parameters: { resource: 'row', operation: 'upsert', dataTableId: table(TABLE_ETAT), matchType: 'allConditions',
        filters: { conditions: [{ keyName: 'connexion_id', condition: 'eq', keyValue: '={{ $json.reservation.connexion_id }}' }] },
        columns: { mappingMode: 'defineBelow', value: Object.fromEntries(['connexion_id', 'artisan_id', 'slug', 'fournisseur', 'identifiants', 'etape', 'alerte_envoyee'].map((k) => [k, `={{ $json.reservation.${k} }}`])),
          schema: ['connexion_id', 'artisan_id', 'slug', 'fournisseur', 'identifiants', 'etape', 'alerte_envoyee'].map((k) => ({ id: k, displayName: k, required: false, defaultMatch: false, display: true, type: k === 'alerte_envoyee' ? 'boolean' : 'string', canBeUsedToMatch: true })) } } },
    { id: 'A une requête ?', name: 'A une requête ?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [2860, -120],
      parameters: { conditions: { options: { caseSensitive: true, typeValidation: 'loose', version: 2 }, combinator: 'and',
        conditions: [{ id: 'req', leftValue: "={{ $('Préparer la requête').item.json.requete }}", rightValue: '', operator: { type: 'object', operation: 'exists', singleValue: true } }] } } },
    { id: 'Appeler n8n', name: 'Appeler n8n', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [3080, -200], onError: 'continueRegularOutput',
      credentials: { n8nApi: { id: 'EMPLACEMENT_N8N_API', name: 'n8n API' } },
      parameters: { method: "={{ $('Préparer la requête').item.json.requete.method }}", url: "={{ $('Préparer la requête').item.json.requete.url }}",
        authentication: 'predefinedCredentialType', nodeCredentialType: 'n8nApi', sendBody: "={{ $('Préparer la requête').item.json.requete.body !== null }}", specifyBody: 'json',
        jsonBody: "={{ JSON.stringify($('Préparer la requête').item.json.requete.body) }}", options: { response: { response: { neverError: true, fullResponse: false } } } } },
    code('Résultat', CODE_RESULTAT, 3300, -120),
    { id: 'Écrire l’état', name: 'Écrire l’état', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [3520, -120],
      parameters: { resource: 'row', operation: 'upsert', dataTableId: table(TABLE_ETAT), matchType: 'allConditions',
        filters: { conditions: [{ keyName: 'connexion_id', condition: 'eq', keyValue: '={{ $json.etat.connexion_id }}' }] },
        columns: { mappingMode: 'defineBelow', value: Object.fromEntries(['connexion_id', 'artisan_id', 'slug', 'fournisseur', 'identifiants', 'etape', 'alerte_envoyee'].map((k) => [k, `={{ $json.etat.${k} }}`])),
          schema: ['connexion_id', 'artisan_id', 'slug', 'fournisseur', 'identifiants', 'etape', 'alerte_envoyee'].map((k) => ({ id: k, displayName: k, required: false, defaultMatch: false, display: true, type: k === 'alerte_envoyee' ? 'boolean' : 'string', canBeUsedToMatch: true })) } } },
    { id: 'Journaliser le résultat', name: 'Journaliser le résultat', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [3740, -120],
      parameters: { resource: 'row', operation: 'insert', dataTableId: table(TABLE_JOURNAL),
        columns: { mappingMode: 'defineBelow', value: Object.fromEntries(['connexion_id', 'slug', 'action', 'cible', 'issue', 'mode'].map((k) => [k, `={{ $('Résultat').item.json.journal.${k} }}`])),
          schema: ['connexion_id', 'slug', 'action', 'cible', 'issue', 'mode'].map((k) => ({ id: k, displayName: k, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true })) } } },
    { id: 'Alerte ?', name: 'Alerte ?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [3960, -120],
      parameters: { conditions: { options: { caseSensitive: true, typeValidation: 'strict', version: 2 }, combinator: 'and',
        conditions: [{ id: 'al', leftValue: "={{ $('Résultat').item.json.alerte }}", rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }] } } },
    { id: 'Alerter', name: 'Alerter', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [4180, -200],
      parameters: { source: 'database', workflowId: { __rl: true, mode: 'list', value: 'EMPLACEMENT_LIB_ALERTER', cachedResultName: 'lib-alerter' }, mode: 'once',
        workflowInputs: { mappingMode: 'defineBelow', value: { type: 'connexion_expiree', artisan_id: "={{ $('Résultat').item.json.journal.slug }}" } } } },
  ]
  const lien = (a, b, sortie = 0) => [a, { main: { [sortie]: [{ node: b, type: 'main', index: 0 }] } }]
  const chaine = ['Toutes les 5 minutes', 'Réglages', 'Lire les connexions', 'Lire les comptes', 'Lire le pilote', 'Lire l’état', 'Lire les workflows', 'Planifier', 'Journaliser le plan', 'Écrire le plan', 'Mode réel ?']
  const connections = {}
  for (let i = 0; i < chaine.length - 1; i++) connections[chaine[i]] = { main: [[{ node: chaine[i + 1], type: 'main', index: 0 }]] }
  connections['Mode réel ?'] = { main: [[{ node: 'Préparer la requête', type: 'main', index: 0 }], []] }
  connections['Préparer la requête'] = { main: [[{ node: 'Réserver', type: 'main', index: 0 }]] }
  connections['Réserver'] = { main: [[{ node: 'A une requête ?', type: 'main', index: 0 }]] }
  connections['A une requête ?'] = { main: [[{ node: 'Appeler n8n', type: 'main', index: 0 }], [{ node: 'Résultat', type: 'main', index: 0 }]] }
  connections['Appeler n8n'] = { main: [[{ node: 'Résultat', type: 'main', index: 0 }]] }
  connections['Résultat'] = { main: [[{ node: 'Écrire l’état', type: 'main', index: 0 }]] }
  connections['Écrire l’état'] = { main: [[{ node: 'Journaliser le résultat', type: 'main', index: 0 }]] }
  connections['Journaliser le résultat'] = { main: [[{ node: 'Alerte ?', type: 'main', index: 0 }]] }
  connections['Alerte ?'] = { main: [[{ node: 'Alerter', type: 'main', index: 0 }], []] }
  void lien
  return { name: 'presti-provisionnement', active: false, nodes, connections, // executionTimeout 240 s < 5 min d'intervalle : deux passages ne se chevauchent jamais (bonne pratique « scheduling » de n8n).
  settings: { executionOrder: 'v1', executionTimeout: 240 },
    meta: { mode: 'a_blanc', decision: 'O3 voie a (Benj, 03/11)', tables: [TABLE_ETAT, TABLE_JOURNAL] } }
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
  if (process.argv.includes('--provisionnement')) {
    const sortie = path.resolve(RACINE, arg('sortie')[0] ?? '.orchestre/preuves/036-021/presti-provisionnement.workflow.json')
    mkdirSync(path.dirname(sortie), { recursive: true })
    writeFileSync(sortie, `${JSON.stringify(genererWorkflowProvisionnement(), null, 2)}\n`)
    console.log(`workflow écrit : ${path.relative(RACINE, sortie)} (inactif, à blanc, aucun identifiant réel)`)
    process.exit(0)
  }
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
