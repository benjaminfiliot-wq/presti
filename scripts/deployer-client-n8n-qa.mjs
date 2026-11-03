// JUGE du déployeur de copies client (scripts/deployer-client-n8n.mjs) — prompt 6, lot 036-012. Hors ligne, à blanc, gratuit.
//
// Il ne croit pas le déployeur : il lit les GABARITS sur le disque, fait fabriquer quatre clients fictifs (Studio, Signature, Entreprise,
// et un second Studio) dans un dossier temporaire, puis juge les fichiers produits avec ses propres listes.
//   D0  chaque gabarit de l'offre a sa copie, et aucune copie sans gabarit ;
//   D1  chaque copie passe scripts/n8n-specs-qa.mjs (R1 à R23) ;
//   D2  deux clients n'ont aucun réglage commun : slug, organisation, identifiants, noms ; et le fichier de l'un ne cite rien de l'autre ;
//   D3  une copie Studio n'a aucun envoi actif (brouillons et lectures exceptés) ; une copie Signature garde les siens ;
//   D4  le déploiement rejoué deux fois donne les mêmes octets, sans date ;
//   D5  jamais un identifiant réel : tout identifiant est un emplacement EMPLACEMENT_<CLIENT>_<type> ; aucun secret ;
//   D6  les réglages (organisation, offre, types activés) sont ceux du client ; la liste fermée du pilote est celle de lib/pilote/regles.ts ;
//       les clients incohérents sont refusés ;
//   D7  aucun jeton « à la copie » ni organisation d'exemple ne reste dans les paramètres ;
//   D8  la copie est le gabarit, aux emplacements près : mêmes nœuds, mêmes liaisons, mêmes codes (à l'organisation près) ;
//   D9  inactive, sans identifiant de workflow ni version publiée ;
//   D10 aucun appel réseau : imports permis seulement, aucun fetch / http / socket / processus, et rien ne part pendant la fabrication.
// Puis il prouve qu'il sait rougir : chaque MUTANT (un identifiant réel écrit, deux clients mélangés, un appel réseau, Studio qui envoie, un
// rejeu qui diffère, un jeton oublié, un code retouché, une copie active) doit faire échouer la règle visée.
//
// Usage : node scripts/deployer-client-n8n-qa.mjs

import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const D = await import(pathToFileURL(path.join(RACINE, 'scripts/deployer-client-n8n.mjs')).href)
const SOURCES = ['036-013', '036-014', '036-015', '036-016', '036-018'].map((d) => `.orchestre/preuves/${d}`)
const t0 = Date.now()

// ─── Les listes du juge (indépendantes de celles du déployeur) ───────────────────────────────────────────────────
const ENVOIS = new Set(['emailSend', 'gmail', 'microsoftOutlook', 'sendInBlue', 'slack', 'telegram', 'twilio', 'whatsApp', 'microsoftTeams', 'googleChat',
  'mailchimp', 'activeCampaign', 'lemlist', 'linkedIn', 'youTube', 'twitter'].map((t) => `n8n-nodes-base.${t}`))
const sha = (t) => createHash('sha256').update(t).digest('hex')
const plat = (x) => (x.workflow && x.workflow.nodes ? x.workflow : x)
/** Ce juge-ci décide seul si un nœud envoie : un brouillon ou une lecture n'envoie pas, tout le reste d'un type d'envoi, si. */
const envoie = (n) => {
  const op = n.parameters?.operation
  if (n.type === 'n8n-nodes-base.facebookGraphApi') return String(n.parameters?.httpRequestMethod ?? 'GET').toUpperCase() !== 'GET'
  if (ENVOIS.has(n.type)) return !(typeof op === 'string' && /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i.test(op)) && n.parameters?.resource !== 'draft'
  if (n.type === 'n8n-nodes-base.httpRequest') {
    let h = ''
    try { h = new URL(String(n.parameters?.url ?? '')).host } catch { /* expression */ }
    return String(n.parameters?.method ?? 'GET').toUpperCase() !== 'GET' && !h.endsWith('.supabase.co')
  }
  return false
}

// ─── Les gabarits, lus sur le disque ─────────────────────────────────────────────────────────────────────────────
const gabaritsSur = (prefixe) => SOURCES.flatMap((d) => (existsSync(path.join(RACINE, d)) ? readdirSync(path.join(RACINE, d)) : [])
  .filter((f) => f.startsWith(prefixe) && f.endsWith('.workflow.json')).map((f) => plat(JSON.parse(readFileSync(path.join(RACINE, d, f), 'utf8'))))).sort((a, b) => a.name.localeCompare(b.name))
const DATES_DES_GABARITS = new Set(SOURCES.flatMap((d) => (existsSync(path.join(RACINE, d)) ? readdirSync(path.join(RACINE, d)) : []).filter((f) => f.endsWith('.workflow.json'))
  .flatMap((f) => readFileSync(path.join(RACINE, d, f), 'utf8').match(/\b20\d\d-\d\d-\d\dT\d\d:\d\d[0-9:.Z+-]*/g) ?? [])))
const GAB = { artisan: gabaritsSur('gabarit-artisan-'), ent: gabaritsSur('gabarit-ent-') }

// ─── Les clients fictifs ─────────────────────────────────────────────────────────────────────────────────────────
const CLIENTS = [
  { slug: 'atelier-studio-exemple', offre: 'studio' },
  { slug: 'bureau-signature-exemple', offre: 'signature', types_actives: ['reponse_prospect', 'relance_devis'] },
  { slug: 'groupe-exemple', offre: 'entreprise', ressources: { CLASSEUR_SHEETS_DU_CLIENT: 'classeur-fictif-groupe' } },
  { slug: 'menuiserie-studio-deux', offre: 'studio' },
]
const lire = (dossier) => new Map(readdirSync(dossier).sort().map((f) => [f, readFileSync(path.join(dossier, f), 'utf8')]))
const TMP = mkdtempSync(path.join(tmpdir(), 'presti-deployer-qa-'))
const ecrire = async (client, nom) => { const dir = path.join(TMP, nom); D.ecrireClient(client, dir, SOURCES, RACINE); return dir }
const dossiers = [], sorties = [], echecsFabrication = []
for (const [i, c] of CLIENTS.entries()) { try { const dir = await ecrire(c, `c${i}`); dossiers.push(dir); sorties.push(lire(dir)) } catch (err) { echecsFabrication.push(`${c.slug} : ${err.message}`) } }
const copiesDe = (m) => [...m.entries()].filter(([f]) => f.endsWith('.workflow.json')).map(([f, t]) => [f, JSON.parse(t)])

// ─── Les règles ──────────────────────────────────────────────────────────────────────────────────────────────────
const SECRETS = [/sk_live_/, /sk-ant-[A-Za-z0-9_-]{8,}/, /sb_secret_/, /\bBearer\s+[A-Za-z0-9._-]{16,}/, /eyJhbGciOiJ/, /-----BEGIN/, /"(?:apiKey|accessToken|refresh_token|password)"\s*:\s*"[^"]{6,}/i]

/** Juge les sorties de CLIENTS (dans l'ordre) ; rend la liste des manquements « code texte ». `ctx` : la source du déployeur et le rejeu. */
function juger(S, ctx) {
  const e = []
  const ko = (code, msg) => e.push(`${code} ${msg}`)
  // D0
  S.forEach((m, i) => {
    const c = CLIENTS[i], attendu = c.offre === 'entreprise' ? GAB.ent : GAB.artisan
    const copies = copiesDe(m)
    if (!attendu.length) ko('D0', `aucun gabarit trouvé sur le disque pour ${c.offre}`)
    if (copies.length !== attendu.length) ko('D0', `${c.slug} : ${copies.length} copie(s) pour ${attendu.length} gabarit(s)`)
    for (const g of attendu) {
      const nom = c.offre === 'entreprise' ? g.name.replace(/^gabarit-ent-/, `client-ent-${c.slug}-`) : g.name.replace(/^gabarit-artisan-/, `client-${c.slug}-`)
      if (!copies.some(([, w]) => w.name === nom)) ko('D0', `${c.slug} : la copie « ${nom} » du gabarit ${g.name} manque`)
    }
    for (const [f, w] of copies) if (f !== `${w.name}.workflow.json`) ko('D0', `${f} : le nom du fichier n'est pas celui du workflow (${w.name})`)
  })
  // D2
  const empreintesClient = S.map((m, i) => {
    const copies = copiesDe(m)
    return {
      slug: CLIENTS[i].slug, orgs: new Set(copies.map(([, w]) => w.meta?.client?.organisation)),
      ids: new Set(copies.flatMap(([, w]) => w.nodes.flatMap((n) => Object.values(n.credentials ?? {}).map((c) => c.id)))),
      noms: new Set(copies.map(([, w]) => w.name)), texte: [...m.values()].join('\n'),
    }
  })
  for (let a = 0; a < S.length; a++) for (let b = a + 1; b < S.length; b++) {
    const A = empreintesClient[a], B = empreintesClient[b]
    for (const k of ['orgs', 'ids', 'noms']) { const commun = [...A[k]].filter((x) => B[k].has(x)); if (commun.length) ko('D2', `${A.slug} et ${B.slug} partagent ${k} : ${commun.slice(0, 2).join(', ')}`) }
    for (const x of [...B.orgs, B.slug]) if (A.texte.includes(x)) ko('D2', `un fichier de ${A.slug} cite « ${x} », qui est à ${B.slug}`)
    for (const x of [...A.orgs, A.slug]) if (B.texte.includes(x)) ko('D2', `un fichier de ${B.slug} cite « ${x} », qui est à ${A.slug}`)
  }
  // D3
  S.forEach((m, i) => {
    const c = CLIENTS[i]
    const noeuds = copiesDe(m).flatMap(([f, w]) => w.nodes.map((n) => [f, n]))
    const envois = noeuds.filter(([, n]) => envoie(n))
    if (c.offre === 'studio') {
      if (envois.length < 10) ko('D3', `${c.slug} : ${envois.length} nœud(s) d'envoi trouvés dans les gabarits : la règle ne regarderait presque rien`)
      for (const [f, n] of envois) if (n.disabled !== true) ko('D3', `${c.slug} (Studio) / ${f} / ${n.name} : un envoi actif (Studio prépare, l'artisan valide)`)
      for (const [f, w] of copiesDe(m)) if (w.meta?.client?.envois_actifs !== false) ko('D3', `${f} : meta.client.envois_actifs doit valoir faux en Studio`)
    } else {
      const eteints = envois.filter(([, n]) => n.disabled === true)
      if (eteints.length) ko('D3', `${c.slug} (${c.offre}) : ${eteints.length} envoi(s) éteints à tort, le gabarit les garde (${eteints[0][1].name})`)
    }
    // un brouillon ou une lecture n'est jamais éteint
    for (const [f, n] of noeuds) if (n.disabled === true && !envoie(n)) ko('D3', `${c.slug} / ${f} / ${n.name} : éteint alors qu'il ne fait que lire ou écrire un brouillon`)
  })
  // D4
  if (ctx.rejeu) S.forEach((m, i) => { const r = ctx.rejeu[i]; if (!r || [...m.keys()].sort().join() !== [...r.keys()].sort().join() || [...m.entries()].some(([f, t]) => r.get(f) !== t)) ko('D4', `${CLIENTS[i].slug} : le déploiement rejoué ne donne pas les mêmes fichiers`) })
  else ko('D4', 'aucun rejeu à comparer')
  for (const m of S) for (const [f, t] of m) for (const d of t.match(/\b20\d\d-\d\d-\d\dT\d\d:\d\d[0-9:.Z+-]*/g) ?? []) if (!DATES_DES_GABARITS.has(d)) ko('D4', `${f} : une date (${d}) que les gabarits ne portent pas s'est glissée dans le fichier`)
  // D5
  S.forEach((m, i) => {
    const hautSlug = CLIENTS[i].slug.toUpperCase().replace(/-/g, '_')
    for (const [f, w] of copiesDe(m)) for (const n of w.nodes) for (const [genre, c] of Object.entries(n.credentials ?? {})) {
      if (Object.keys(c).sort().join() !== 'id,name') ko('D5', `${f} / ${n.name} : l'identifiant ${genre} porte autre chose que { id, name }`)
      else if (!new RegExp(`^EMPLACEMENT_${hautSlug}_[A-Za-z0-9]+$`).test(c.id)) ko('D5', `${f} / ${n.name} : « ${c.id} » n'est pas un emplacement du client (identifiant réel ?)`)
      if (!String(c.name).startsWith('À brancher')) ko('D5', `${f} / ${n.name} : le nom « ${c.name} » ne dit pas qu'il reste à brancher`)
    }
    for (const [f, t] of m) for (const re of SECRETS) if (re.test(t)) ko('D5', `${f} : un motif de secret (${re})`)
  })
  // D6
  S.forEach((m, i) => {
    const c = CLIENTS[i]
    for (const [f, w] of copiesDe(m)) {
      const k = w.meta?.client ?? {}
      if (k.slug !== c.slug || k.offre !== c.offre || k.mode !== 'a_blanc') ko('D6', `${f} : meta.client (${k.slug}, ${k.offre}, ${k.mode}) n'est pas celui du client`)
      if (JSON.stringify(k.types_actives) !== JSON.stringify([...(c.types_actives ?? [])].sort())) ko('D6', `${f} : types activés ${JSON.stringify(k.types_actives)} au lieu de ${JSON.stringify(c.types_actives ?? [])}`)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(k.organisation ?? '') || k.organisation === '00000000-0000-4000-8000-0000000000e1') ko('D6', `${f} : organisation « ${k.organisation} » invalide ou d'exemple`)
    }
  })
  // D7
  S.forEach((m, i) => {
    for (const [f, w] of copiesDe(m)) for (const n of w.nodes) {
      const p = JSON.stringify(n.parameters ?? {})
      for (const j of ['ORGANISATION_DU_CLIENT', 'A_RENSEIGNER_A_LA_COPIE', '00000000-0000-4000-8000-0000000000e1']) if (p.includes(j)) ko('D7', `${CLIENTS[i].slug} / ${f} / ${n.name} : « ${j} » est resté dans les paramètres`)
    }
    const c = CLIENTS[i]
    if (c.ressources) for (const [j, v] of Object.entries(c.ressources)) {
      if (JSON.stringify(copiesDe(m).map(([, w]) => w.nodes)).includes(j)) ko('D7', `${c.slug} : le jeton ${j} donné au déploiement est resté`)
      if (!copiesDe(m).some(([, w]) => JSON.stringify(w.nodes).includes(v))) ko('D7', `${c.slug} : la valeur donnée pour ${j} n'apparaît nulle part`)
    }
  })
  // D8
  S.forEach((m, i) => {
    const c = CLIENTS[i], gabs = c.offre === 'entreprise' ? GAB.ent : GAB.artisan
    for (const [f, w] of copiesDe(m)) {
      const g = gabs.find((x) => (c.offre === 'entreprise' ? x.name.replace(/^gabarit-ent-/, `client-ent-${c.slug}-`) : x.name.replace(/^gabarit-artisan-/, `client-${c.slug}-`)) === w.name)
      if (!g) continue
      const org = w.meta.client.organisation
      if (JSON.stringify(w.connections) !== JSON.stringify(g.connections)) ko('D8', `${f} : les liaisons ne sont pas celles du gabarit`)
      if (w.nodes.length !== g.nodes.length) { ko('D8', `${f} : ${w.nodes.length} nœuds pour ${g.nodes.length} au gabarit`); continue }
      w.nodes.forEach((n, k) => {
        const n0 = g.nodes[k]
        if (n.name !== n0.name || n.type !== n0.type) ko('D8', `${f} : le nœud ${k} n'est plus « ${n0.name} »`)
        const retour = (x) => JSON.stringify(x ?? {}).split(org).join('0RG').replace(/0RG/g, '0RG')
        // à l'organisation, aux jetons donnés et aux emplacements près, les paramètres sont ceux du gabarit
        let attendu = JSON.stringify(n0.parameters ?? {}).replace(/ORGANISATION_DU_CLIENT|A_RENSEIGNER_A_LA_COPIE|00000000-0000-4000-8000-0000000000e1/g, '0RG')
        for (const [j, v] of Object.entries(c.ressources ?? {})) attendu = attendu.split(JSON.stringify(j).slice(1, -1)).join(JSON.stringify(v).slice(1, -1))
        if (retour(n.parameters) !== attendu) ko('D8', `${f} / ${n.name} : les paramètres ne sont pas ceux du gabarit (hors organisation et jetons donnés)`)
        if (n.type === 'n8n-nodes-base.code' && n.parameters.jsCode.split(org).join('ORG') !== n0.parameters.jsCode.replace(/00000000-0000-4000-8000-0000000000e1/g, 'ORG')) ko('D8', `${f} / ${n.name} : le code a changé en plus de l'organisation`)
        if ((n.notes ?? '') !== (n0.notes ?? '')) ko('D8', `${f} / ${n.name} : les notes ont changé`)
      })
      if (JSON.stringify(w.settings) !== JSON.stringify(g.settings)) ko('D8', `${f} : les réglages du workflow ont changé`)
    }
    // le registre des empreintes écrit couvre chaque nœud Code de chaque copie
    const reg = JSON.parse(m.get('empreintes-code.json') ?? '{}')
    for (const [f, w] of copiesDe(m)) for (const n of w.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) if (reg[w.name]?.[n.name] !== sha(n.parameters.jsCode)) ko('D8', `${f} / ${n.name} : l'empreinte du registre n'est pas celle du code`)
  })
  // D9
  S.forEach((m, i) => { for (const [f, w] of copiesDe(m)) {
    if (w.active !== false) ko('D9', `${f} : active`)
    if (w.id !== undefined || w.versionId !== undefined || w.activeVersion !== undefined || (w.activeVersionId ?? null) !== null) ko('D9', `${f} : porte un identifiant de workflow ou une version publiée`)
  } })
  // D10
  const src = ctx.source
  const imports = [...src.matchAll(/^import\s.*?from\s+'([^']+)'/gm)].map((x) => x[1])
  for (const im of imports) if (!['node:fs', 'node:crypto', 'node:path', 'node:url'].includes(im)) ko('D10', `import « ${im} » non permis dans le déployeur`)
  for (const re of [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /node:(?:https?|net|tls|dgram|dns|child_process|worker_threads)/, /\bimport\s*\(/, /\brequire\s*\(/, /\bprocess\.env\b/, /https?:\/\/(?!gorc)/])
    if (re.test(src.replace(/^\s*\/\/.*$/gm, '').replace(/`[^`]*Usage[^`]*`/g, ''))) ko('D10', `le déployeur contient ${re}`)
  if (ctx.appelsReseau > 0) ko('D10', `${ctx.appelsReseau} appel(s) réseau pendant la fabrication`)
  return e
}

// ─── Le rejeu, l'appel réseau surveillé, la source ───────────────────────────────────────────────────────────────
const SOURCE = readFileSync(path.join(RACINE, 'scripts/deployer-client-n8n.mjs'), 'utf8')
let appelsReseau = 0
const fetchOrigine = globalThis.fetch
globalThis.fetch = () => { appelsReseau++; throw new Error('appel réseau interdit') }
const rejeu = []
for (const [i, c] of CLIENTS.entries()) { try { rejeu.push(D.fabriquerClient(c, SOURCES, RACINE)) } catch (err) { echecsFabrication.push(`rejeu ${c.slug} : ${err.message}`); rejeu.push(null) } }
globalThis.fetch = fetchOrigine
const CTX = { source: SOURCE, rejeu, appelsReseau }

const echecs = [...echecsFabrication.map((x) => `D0 fabrication refusée — ${x}`), ...juger(sorties, CTX)]

// D1 : la garde commune, une fois par client
for (const [i, dir] of dossiers.entries()) {
  const r = spawnSync('node', ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs', dir], { cwd: RACINE, encoding: 'utf8' })
  const sortie = `${r.stdout}${r.stderr}`
  const bonnes = (sortie.match(/^✓ .*client-.*R1 à R23 tenues/gm) ?? []).length, mauvaises = (sortie.match(/^✗ .*client-/gm) ?? []).length
  const attendu = (CLIENTS[i].offre === 'entreprise' ? GAB.ent : GAB.artisan).length
  if (r.status !== 0 || mauvaises || bonnes !== attendu) echecs.push(`D1 ${CLIENTS[i].slug} : n8n-specs-qa → ${bonnes}/${attendu} copies tenues, ${mauvaises} refusée(s), code ${r.status}\n${(sortie.match(/^\s+✗ .*/gm) ?? []).slice(0, 4).join('\n')}`)
}

// D6 (suite) : les clients incohérents sont refusés, la liste fermée est celle du code
{
  const regles = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
  const bloc = regles.match(/export const TYPES_PILOTE = \[([^\]]*)\]/)?.[1] ?? ''
  const types = [...bloc.matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
  if (JSON.stringify(types) !== JSON.stringify(D.TYPES_PILOTE)) echecs.push(`D6 TYPES_PILOTE du déployeur (${D.TYPES_PILOTE}) ≠ lib/pilote/regles.ts (${types})`)
  const jamais = [...(regles.match(/export const OUTILS_JAMAIS_AUTO[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
  if (!jamais.length) echecs.push('D6 OUTILS_JAMAIS_AUTO illisible dans lib/pilote/regles.ts')
  for (const j of jamais) if (D.TYPES_PILOTE.includes(j)) echecs.push(`D6 « ${j} » (OUTILS_JAMAIS_AUTO) est un type activable`)
  const refus = [
    ['Studio avec des types activés', { slug: 'x-un', offre: 'studio', types_actives: ['reponse_prospect'] }],
    ['un type hors de la liste fermée', { slug: 'x-deux', offre: 'signature', types_actives: [jamais[0] ?? 'marquer_facture_payee'] }],
    ['un type deux fois', { slug: 'x-trois', offre: 'signature', types_actives: ['relance_devis', 'relance_devis'] }],
    ['un slug qui se confond avec l’Entreprise', { slug: 'ent-x', offre: 'studio' }],
    ['l’organisation d’exemple des gabarits', { slug: 'x-quatre', offre: 'studio', organisation: '00000000-0000-4000-8000-0000000000e1' }],
    ['une offre inconnue', { slug: 'x-cinq', offre: 'essentiel' }],
    ['un slug avec une majuscule', { slug: 'X-six', offre: 'studio' }],
  ]
  for (const [nom, c] of refus) { try { D.fabriquerClient(c, SOURCES, RACINE); echecs.push(`D6 client accepté à tort : ${nom}`) } catch { /* refusé : voulu */ } }
  // un gabarit dont le code ne correspond plus à son empreinte n'est pas copié
  const g = D.lireGabarits('studio', SOURCES, RACINE)[0]
  const code = plat(g.brut).nodes.find((n) => n.type === 'n8n-nodes-base.code')
  const avant = code.parameters.jsCode
  code.parameters.jsCode += '\n// retouché'
  try { D.fabriquerCopie(g.brut, g.registre, { slug: 'x-sept', offre: 'studio' }); echecs.push('D8 un gabarit retouché a été copié malgré son empreinte') } catch { /* refusé : voulu */ }
  code.parameters.jsCode = avant
}

// ─── Les mutants ─────────────────────────────────────────────────────────────────────────────────────────────────
const copieProfonde = (S) => S.map((m) => new Map(m))
const modifier = (S, i, motif, fn) => {
  const M = copieProfonde(S)
  const f = [...M[i].keys()].find((k) => motif.test(k))
  const w = JSON.parse(M[i].get(f)); fn(w, f, M); M[i].set(f, `${JSON.stringify(w, null, 2)}\n`)
  return M
}
const premierEnvoi = (w) => w.nodes.find((n) => envoie(n))
const MUTANTS = [
  ['un identifiant réel écrit', () => ({ S: modifier(sorties, 0, /devis\.workflow/, (w) => { const n = w.nodes.find((x) => x.credentials); const k = Object.keys(n.credentials)[0]; n.credentials[k] = { id: 'AbC123xYz789Qw', name: 'Gmail de Marie' } }), C: CTX }), /^D5 /],
  ['un identifiant du client A donné au client B (deux clients mélangés)', () => ({ S: modifier(sorties, 1, /devis\.workflow/, (w) => { const n = w.nodes.find((x) => x.credentials); const k = Object.keys(n.credentials)[0]; n.credentials[k].id = [...sorties[0].values()].join('').match(/EMPLACEMENT_ATELIER_STUDIO_EXEMPLE_\w+/)[0] }), C: CTX }), /^D2 /],
  ['l’organisation du client A écrite chez le client B', () => ({ S: modifier(sorties, 3, /suivi\.workflow/, (w) => { w.meta.client.organisation = JSON.parse(sorties[0].get([...sorties[0].keys()].find((k) => /suivi\.workflow/.test(k)))).meta.client.organisation }), C: CTX }), /^D2 /],
  ['un appel réseau dans le déployeur', () => ({ S: sorties, C: { ...CTX, source: `${SOURCE}\nawait fetch('https://exemple.invalid/ping')\n` } }), /^D10 /],
  ['un appel réseau pendant la fabrication', () => ({ S: sorties, C: { ...CTX, appelsReseau: 1 } }), /^D10 /],
  ['Studio qui envoie (un nœud d’envoi rallumé)', () => ({ S: modifier(sorties, 0, /facturation\.workflow/, (w) => { delete premierEnvoi(w).disabled }), C: CTX }), /^D3 /],
  ['Signature qui n’envoie plus (un envoi éteint à tort)', () => ({ S: modifier(sorties, 1, /facturation\.workflow/, (w) => { premierEnvoi(w).disabled = true }), C: CTX }), /^D3 /],
  ['un rejeu qui diffère (un octet de plus au second passage)', () => ({ S: sorties, C: { ...CTX, rejeu: rejeu.map((m, i) => { const c = new Map(m); const f = [...c.keys()][0]; if (i === 0) c.set(f, `${c.get(f)} `); return c }) } }), /^D4 /],
  ['une date glissée dans une copie', () => ({ S: modifier(sorties, 2, /accueil\.workflow/, (w) => { w.meta.client.deploye_le = '2026-11-03T14:00:00Z' }), C: CTX }), /^D4 /],
  ['un jeton « à la copie » oublié', () => ({ S: modifier(sorties, 2, /ventes\.workflow/, (w) => { const n = w.nodes.find((x) => x.type === 'n8n-nodes-base.set' && JSON.stringify(x.parameters).includes(w.meta.client.organisation)); n.parameters = JSON.parse(JSON.stringify(n.parameters).split(w.meta.client.organisation).join('ORGANISATION_DU_CLIENT')) }), C: CTX }), /^D7 /],
  ['un code retouché en plus de l’organisation', () => ({ S: modifier(sorties, 0, /devis\.workflow/, (w) => { const n = w.nodes.find((x) => x.type === 'n8n-nodes-base.code'); n.parameters.jsCode += '\nreturn []' }), C: CTX }), /^D8 /],
  ['une liaison retirée', () => ({ S: modifier(sorties, 1, /suivi\.workflow/, (w) => { w.connections = {} }), C: CTX }), /^D8 /],
  ['une copie active', () => ({ S: modifier(sorties, 1, /direction\.workflow/, (w) => { w.active = true }), C: CTX }), /^D9 /],
  ['une copie qui garde l’identifiant du workflow', () => ({ S: modifier(sorties, 1, /direction\.workflow/, (w) => { w.id = 'UVOEbLSzSEKe5sJp' }), C: CTX }), /^D9 /],
  ['un gabarit sans copie', () => ({ S: (() => { const M = copieProfonde(sorties); M[3].delete([...M[3].keys()].find((k) => /operations\.workflow/.test(k))); return M })(), C: CTX }), /^D0 /],
  ['un type activé qui n’est pas celui du client', () => ({ S: modifier(sorties, 1, /apres\.workflow/, (w) => { w.meta.client.types_actives = ['envoi_facture'] }), C: CTX }), /^D6 /],
]
let rouges = 0
const lignesMutants = []
for (const [nom, fab, motif] of MUTANTS) {
  let res
  try { const { S, C } = fab(); res = juger(S, C) } catch (err) { res = [`mutant inapplicable : ${err.message}`] }
  const vu = res.find((l) => motif.test(l))
  if (vu) rouges++
  lignesMutants.push(`  ${vu ? '✓' : '✗'} « ${nom} » → ${vu ? vu.slice(0, 150) : `LAISSE LA GARDE VERTE (${res[0] ?? 'aucun manquement'})`}`)
  if (!vu) echecs.push(`mutant « ${nom} » non vu (attendu ${motif})`)
}
rmSync(TMP, { recursive: true, force: true })

const copiesTotal = sorties.reduce((s, m) => s + copiesDe(m).length, 0)
if (!echecs.length) console.log(`✓ déployeur à blanc : ${CLIENTS.length} clients fictifs (Studio, Signature, Entreprise, Studio), ${copiesTotal} copies ; D0 à D10 tenues`)
for (const l of lignesMutants) console.log(l)
for (const x of echecs) console.log(`✗ ${x}`)
console.log(`deployer-client-n8n-qa : ${MUTANTS.length} mutants, ${rouges} rouges (${Math.round((Date.now() - t0) / 1000)} s)`)
console.log(echecs.length ? 'ÉCHEC' : 'OK')
process.exit(echecs.length ? 1 : 0)
