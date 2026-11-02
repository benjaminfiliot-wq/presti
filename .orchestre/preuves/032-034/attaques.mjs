// Banc d'attaques de l'audit 032-034 (lot L19, demandes de démo entreprise). HORS LIGNE : aucun réseau, aucune base, aucune clé.
// Écrit par l'auditeur, distinct de scripts/demandes-demo-qa.mjs (écrit par l'auteur du lot) : l'ORACLE « drapeau baissé » n'est pas
// la copie de la suite QA, il est RECONSTRUIT des lignes « - » du diff fourni par le PC (.orchestre/preuves/032-034/diff-032-026.patch).
//
// Lancement : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/032-034/attaques.mjs
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const lib = await import(pathToFileURL(path.join(RACINE, 'lib/demandesDemo.ts')).href)
const { peutFaire } = await import(pathToFileURL(path.join(RACINE, 'lib/controle/droits.ts')).href)
const { traiterContact, enregistrerDemandeDemo, listeDemandesDemo, marquerDemandeTraitee, EMAIL_LIEN } = lib

const resultats = []
const essai = (id, titre, ok, detail = '') => { resultats.push({ id, titre, ok, detail }); console.log(`${ok ? 'BLOQUÉ/TIENT' : '**FAILLE**'}  ${id}  ${titre}${detail ? ' — ' + detail : ''}`) }
const json = (x) => JSON.stringify(x)

// ─── 0. L'oracle : la route d'AVANT, tirée du diff (lignes « - » du bloc app/api/contact/route.ts) ─────────────────────────────
const patch = readFileSync(path.join(RACINE, '.orchestre/preuves/032-034/diff-032-026.patch'), 'utf8')
const bloc = patch.split('diff --git a/app/api/contact/route.ts')[1].split('diff --git ')[0]
// Le fichier d'avant = lignes de contexte (« ␠ ») + lignes retirées (« - ») ; les lignes ajoutées (« + ») sont écartées.
const moins = bloc.split('\n').filter((l) => (l.startsWith('-') && !l.startsWith('---')) || l.startsWith(' ')).map((l) => l.slice(1))
const debut = moins.findIndex((l) => l.startsWith('const clip'))
const ancien = moins.slice(debut).join('\n')
if (!ancien.includes('export async function POST(req: Request)')) throw new Error('oracle : la route d’avant est introuvable dans le diff')
const dossier = mkdtempSync(path.join(tmpdir(), 'audit-032-034-'))
const fichierOracle = path.join(dossier, 'ancien.ts')
writeFileSync(fichierOracle, `// généré depuis le diff — la route d'avant le 02/11, imports remplacés par des doublures
let D: any
export const poser = (d: any) => { D = d }
const NextResponse = { json: (corps: any, init?: any) => ({ statut: init?.status ?? 200, corps }) }
const getIp = (_req: any) => D.ip()
const isBanned = (ip: string) => D.banni(ip)
const recordAbuse = (ip: string, r: string) => D.abus(ip, r)
const consommerLimiteStricte = (k: string, m: number, f: number) => D.limite(k, m, f)
const notifierEntreprise = (s: string, c: string, r?: string) => D.notifier(s, c, r)
${ancien}
`)
const oracle = await import(pathToFileURL(fichierOracle).href)
const lancerAvant = async (d) => { oracle.poser(d); return oracle.POST({ json: () => d.corps() }) }

// Des doublures qui ENREGISTRENT chaque appel, dans l'ordre.
function doublures(corps, o = {}) {
  const appels = []
  const journaux = []
  const d = {
    drapeau: o.drapeau ?? false,
    ip: () => { appels.push(['ip']); return o.ip ?? '203.0.113.7' },
    banni: async (ip) => { appels.push(['banni', ip]); return o.banni ?? false },
    abus: async (ip, r) => { appels.push(['abus', ip, r]) },
    limite: async (k, m, f) => { appels.push(['limite', k, m, f]); return o.limite ?? true },
    corps: () => (typeof corps === 'function' ? corps() : Promise.resolve(JSON.parse(JSON.stringify(corps)))),
    notifier: async (s, c, r) => { appels.push(['notifier', s, c, r]); if (o.notifierJette) throw new Error('resend'); return { ok: o.notifierOk ?? true } },
    enregistrer: async (ligne) => { appels.push(['enregistrer', ligne]); if (o.enregistrer) return o.enregistrer(ligne); return true },
  }
  return { d, appels, journaux }
}
async function avecConsole(f) {
  const lignes = []
  const err = console.error, log = console.log, warn = console.warn
  console.error = (...a) => lignes.push(a.map(String).join(' '))
  console.warn = console.error
  try { return { r: await f(), lignes } } finally { console.error = err; console.log = log; console.warn = warn }
}

// ─── 1. Drapeau baissé : identique à l'octet près à la route d'avant, sur un corpus HOSTILE ─────────────────────────────────────
const geant = 'A'.repeat(5_000_000)
const hostiles = [
  null, 'texte', 42, [], [{ nom: 'x' }], {},
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.' },
  { nom: geant, email: 'x@exemple.invalid', message: geant },
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.', motif: 'entreprise', taille: '2 à 5', activite: 'Architecte' },
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.', motif: 'pirate', taille: 'x', activite: 'y' },
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.', societe: 'robot' },
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.', societe: '   ' },
  { nom: ['Ana'], email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.' },
  { nom: 'Ana\r\nBcc: x@y.z', email: 'ana@exemple.invalid', message: 'Bonjour\r\nSubject: piège' },
  { nom: '<script>alert(1)</script>', email: '"<x>"@exemple.invalid', message: "'); drop table demandes_demo; --" },
  { nom: 'Ana', email: 'ana@exemple.invalid?cc=b@c.d', message: 'Bonjour, une démo svp.' },
  { nom: 'Ana', email: 'pas-une-adresse', message: 'Bonjour, une démo svp.' },
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'court' },
  { nom: '\uD83D'.repeat(130), email: 'ana@exemple.invalid', message: '\uDE00'.repeat(20) },
  JSON.parse('{"__proto__": {"motif": "entreprise", "taille": "1", "activite": "Autre"}, "nom": "Ana", "email": "ana@exemple.invalid", "message": "Bonjour, une démo svp."}'),
  { nom: 'Ana', email: 'ana@exemple.invalid', message: 'Bonjour, une démo svp.', id: '00000000-0000-4000-8000-000000000000', etat: 'traitee', traitee_par: 'x', cree_le: '1970-01-01', fiche_diagnostic: { a: 1 }, ip: '1.1.1.1' },
]
const situations = [{}, { banni: true }, { limite: false }, { notifierOk: false }, { notifierJette: true }, { ip: 'unknown' }]
let comparaisons = 0, ecarts = []
for (const c of hostiles) for (const s of situations) for (const corpsJette of [false, true]) {
  const corps = corpsJette ? () => Promise.reject(new SyntaxError('Unexpected token')) : c
  const a = doublures(corps, { ...s }), b = doublures(corps, { ...s, drapeau: false })
  const ra = await avecConsole(() => lancerAvant(a.d)), rb = await avecConsole(() => traiterContact(b.d))
  comparaisons++
  if (json(ra.r) !== json(rb.r) || json(a.appels) !== json(b.appels) || json(ra.lignes) !== json(rb.lignes)) ecarts.push({ c: json(c).slice(0, 80), s, avant: ra.r, apres: rb.r })
}
essai('1.1', `drapeau baissé : réponse, appels (ban, piège, plafond, e-mail : sujet, corps, Reply-To) et journaux identiques à la route d'avant tirée du diff (${comparaisons} cas hostiles : corps géant 5 Mo, non-JSON, tableaux, __proto__, CRLF, injections, champs hors liste, pannes)`, ecarts.length === 0, ecarts.length ? json(ecarts[0]).slice(0, 400) : '')
{
  let ecrit = 0
  for (const c of hostiles) { const x = doublures(c, { drapeau: false }); await avecConsole(() => traiterContact(x.d)); ecrit += x.appels.filter((p) => p[0] === 'enregistrer').length }
  essai('1.2', 'drapeau baissé : aucune écriture en base, même pour une demande de démo valide', ecrit === 0, `${ecrit} écriture(s)`)
}
// Drapeau LEVÉ mais message de contact ordinaire (sans motif) : doit rester celui d'avant (le canal de contact n'est pas touché).
{
  let ecart = 0
  for (const c of hostiles.filter((h) => h && typeof h === 'object' && !Array.isArray(h) && !('motif' in h) && !('taille' in h) && !('activite' in h))) for (const s of situations) {
    const a = doublures(c, s), b = doublures(c, { ...s, drapeau: true })
    const ra = await avecConsole(() => lancerAvant(a.d)), rb = await avecConsole(() => traiterContact(b.d))
    if (json(ra.r) !== json(rb.r) || json(a.appels) !== json(b.appels)) ecart++
  }
  essai('1.3', 'drapeau levé, message de contact sans motif : identique à la route d’avant (aucune écriture, même e-mail)', ecart === 0, `${ecart} écart(s)`)
}

// ─── 2. Drapeau levé : la demande n'est jamais perdue ──────────────────────────────────────────────────────────────────────────
const demo = { nom: 'Prenom-essai', email: 'demandeur@exemple.invalid', message: '[Démo entreprise] Équipe : 6 à 20 · activité : Architecte\nOn voudrait voir l’outil.', motif: 'entreprise', taille: '6 à 20', activite: 'Architecte' }
const pannes = {
  'enregistrer rend false': () => false,
  'enregistrer jette': () => { throw new Error('base morte') },
  'enregistrer rejette': () => Promise.reject(new Error('base morte')),
  'enregistrer rend "true" (chaîne)': () => 'true',
  'enregistrer rend undefined': () => undefined,
}
for (const [nomPanne, f] of Object.entries(pannes)) {
  const x = doublures(demo, { drapeau: true, enregistrer: f })
  const { r, lignes } = await avecConsole(() => traiterContact(x.d))
  const parti = x.appels.some((p) => p[0] === 'notifier')
  const fuite = lignes.some((l) => /Prenom-essai|demandeur@|voir l’outil/.test(l))
  essai('2.' + Object.keys(pannes).indexOf(nomPanne), `écriture en panne (${nomPanne}) : l'e-mail part, 200, rien de personnel au journal`, parti && r.statut === 200 && !fuite, `statut ${r.statut}, e-mail ${parti ? 'parti' : 'PERDU'}, journal ${json(lignes)}`)
}
{
  const x = doublures(demo, { drapeau: true, notifierOk: false })
  const { r } = await avecConsole(() => traiterContact(x.d))
  essai('2.5', 'e-mail en panne, demande rangée : 200 (elle se lit dans le Poste)', r.statut === 200 && x.appels.some((p) => p[0] === 'enregistrer'))
  const y = doublures(demo, { drapeau: true, notifierOk: false, enregistrer: () => false })
  const ry = (await avecConsole(() => traiterContact(y.d))).r
  essai('2.6', 'e-mail ET écriture en panne : 502, le demandeur est invité à réessayer (rien de perdu en silence)', ry.statut === 502)
}
// La vraie fonction d'écriture face à une base qui ne répond pas : elle doit abandonner au bout de 8 s et rendre false.
{
  const clientMuet = { from: () => ({ insert: () => ({ abortSignal: (s) => new Promise((_, rej) => s.addEventListener('abort', () => rej(new Error('abort')))) }) }) }
  // AbortSignal.timeout ne retient pas la boucle d'événements : une minuterie témoin la tient ouverte le temps de l'essai.
  const temoin = setTimeout(() => {}, 12_000)
  const t0 = Date.now(); const ok = await enregistrerDemandeDemo(clientMuet, { motif: 'entreprise', taille: '1', activite: 'Autre', prenom: 'a', email: 'a@b.cd', message: null }); const dt = Date.now() - t0
  clearTimeout(temoin)
  essai('2.7', `base muette : enregistrerDemandeDemo abandonne et rend false (${dt} ms), l'e-mail peut partir`, ok === false && dt < 9_000 && dt >= 7_500, `${dt} ms`)
  const clientJette = { from: () => { throw new Error('client cassé') } }
  essai('2.8', 'client Supabase qui jette à from() : false, jamais une exception', (await enregistrerDemandeDemo(clientJette, {})) === false)
  const clientErreur = { from: () => ({ insert: () => ({ abortSignal: async () => ({ data: null, error: { message: 'new row violates check constraint' } }) }) }) }
  essai('2.9', 'CHECK de 0190 violé (erreur PostgREST) : false', (await enregistrerDemandeDemo(clientErreur, {})) === false)
}

// ─── 3. Champs hors liste, inattendus, injections ──────────────────────────────────────────────────────────────────────────────
const horsListe = [
  { motif: 'Entreprise' }, { motif: 'entreprise ' }, { motif: ['entreprise'] }, { motif: { toString: 'entreprise' } }, { motif: 'entreprise\u0000' },
  { taille: '2 a 5' }, { taille: 'plus de 20 ' }, { taille: 1 }, { taille: ['1'] }, { activite: 'architecte' }, { activite: 'Architecte​' },
  { activite: "Autre'); drop table demandes_demo; --" }, { motif: undefined }, { taille: null }, { activite: '' },
]
let rangesHL = 0, perdusHL = 0, fuitesHL = 0, reponsesHL = new Set()
for (const h of horsListe) {
  const corps = { ...demo, ...h }
  const x = doublures(corps, { drapeau: true })
  const { r, lignes } = await avecConsole(() => traiterContact(x.d))
  rangesHL += x.appels.filter((p) => p[0] === 'enregistrer').length
  perdusHL += x.appels.some((p) => p[0] === 'notifier') ? 0 : 1
  fuitesHL += lignes.some((l) => /Prenom-essai|demandeur@|voir l’outil|drop table/.test(l)) ? 1 : 0
  reponsesHL.add(json(r))
}
essai('3.1', `${horsListe.length} valeurs hors liste (casse, espace, NUL, espace de largeur nulle, tableau, objet, nombre, injection SQL) : jamais rangées`, rangesHL === 0, `${rangesHL} rangée(s)`)
essai('3.2', 'hors liste : la demande n’est jamais perdue (l’e-mail part) et la réponse ne dit rien de plus que pour une demande acceptée', perdusHL === 0 && reponsesHL.size === 1 && [...reponsesHL][0] === json({ statut: 200, corps: { ok: true } }), `${perdusHL} perdue(s), réponses ${[...reponsesHL].join(' | ')}`)
essai('3.3', 'hors liste : le journal ne porte ni prénom, ni adresse, ni message, ni la valeur reçue', fuitesHL === 0, `${fuitesHL} fuite(s)`)
{
  const corps = { ...demo, id: '00000000-0000-4000-8000-000000000000', etat: 'traitee', traitee_le: '2020-01-01', traitee_par: '00000000-0000-4000-8000-000000000001', cree_le: '1970-01-01', maj_le: '1970-01-01', rendez_vous_le: '2030-01-01', fiche_diagnostic: { prix: 1 }, ip: '1.1.1.1' }
  const x = doublures(corps, { drapeau: true })
  await avecConsole(() => traiterContact(x.d))
  const ligne = x.appels.find((p) => p[0] === 'enregistrer')?.[1]
  const cles = ligne ? Object.keys(ligne).sort().join(',') : 'aucune'
  essai('3.4', 'champs inattendus (id, etat, traitee_*, cree_le, maj_le, rendez_vous_le, fiche_diagnostic, ip) : la ligne écrite ne porte que motif, taille, activité, prénom, e-mail, message', cles === 'activite,email,message,motif,prenom,taille', cles)
}
{
  const corps = JSON.parse('{"__proto__": {"motif": "entreprise", "taille": "1", "activite": "Autre"}, "nom": "Ana", "email": "ana@exemple.invalid", "message": "Bonjour, une démo svp."}')
  const x = doublures(corps, { drapeau: true }); await avecConsole(() => traiterContact(x.d))
  essai('3.5', 'pollution de prototype (__proto__ porteur de motif) : rien n’est rangé', !x.appels.some((p) => p[0] === 'enregistrer'))
}
{
  const corps = { ...demo, nom: "Ana'); delete from demandes_demo; --<img src=x onerror=alert(1)>", message: '<script>alert(1)</script> bonjour la démo' }
  const x = doublures(corps, { drapeau: true }); await avecConsole(() => traiterContact(x.d))
  const ligne = x.appels.find((p) => p[0] === 'enregistrer')?.[1]
  essai('3.6', 'injection SQL / HTML dans prénom et message : rangée telle quelle (PostgREST paramètre, React échappe), non interprétée', ligne?.prenom === corps.nom && ligne?.message === corps.message)
  const ecran = readFileSync(path.join(RACINE, 'app/controle/DemandesDemo.tsx'), 'utf8')
  essai('3.7', 'écran Démos : aucun dangerouslySetInnerHTML, aucun innerHTML', !/dangerouslySetInnerHTML|innerHTML/.test(ecran))
}
{
  const piegees = ['a@b.co?cc=x@y.z', 'a@b.co&body=x', 'javascript:alert(1)@x.fr', 'a@b.co%0Abcc:x@y.z', 'a@b.co#x', '"a"@b.co', 'a@b/../c.co']
  const passent = piegees.filter((e) => EMAIL_LIEN.test(e))
  essai('3.8', 'lien mailto : aucune adresse piégée (?, &, :, %, #, guillemets, /) ne devient un lien', passent.length === 0 && EMAIL_LIEN.test('ana@exemple.fr'), passent.join(' '))
}
{
  // Corps géant drapeau levé : la ligne rangée respecte les bornes du CHECK (prénom ≤ 120, e-mail ≤ 200, message ≤ 4000).
  const corps = { ...demo, nom: 'N'.repeat(1_000_000), message: 'M'.repeat(5_000_000), email: 'a@' + 'b'.repeat(500) + '.fr' }
  const x = doublures(corps, { drapeau: true }); const { r } = await avecConsole(() => traiterContact(x.d))
  const l = x.appels.find((p) => p[0] === 'enregistrer')?.[1]
  essai('3.9', 'corps géant (5 Mo) drapeau levé : tronqué comme avant ; e-mail coupé à 200 ne passe plus la validation → rien de rangé, 400 comme avant', r.statut === 400 || (l && l.prenom.length <= 120 && l.message.length <= 4000), `statut ${r.statut}`)
  const corps2 = { ...demo, nom: 'N'.repeat(1_000_000), message: 'M'.repeat(5_000_000) }
  const y = doublures(corps2, { drapeau: true }); await avecConsole(() => traiterContact(y.d))
  const l2 = y.appels.find((p) => p[0] === 'enregistrer')?.[1]
  essai('3.10', 'corps géant (prénom 1 Mo, message 5 Mo) : ligne bornée prénom ≤ 120, message ≤ 4000', !!l2 && l2.prenom.length <= 120 && l2.message.length <= 4000, l2 ? `${l2.prenom.length} / ${l2.message.length}` : 'pas rangée')
}
{
  // Demi-caractères seuls : `propre` les retire ; un message qui n'est fait QUE de demi-caractères devient '' et viole le CHECK.
  const corps = { ...demo, message: '\uDE00'.repeat(12) }
  const x = doublures(corps, { drapeau: true }); await avecConsole(() => traiterContact(x.d))
  const l = x.appels.find((p) => p[0] === 'enregistrer')?.[1]
  essai('3.11', 'message fait de demi-caractères seuls : la ligne ne viole pas le CHECK de 0190 (message null ou 1..4000)', !l || l.message === null || l.message.length >= 1, l ? `message rangé = ${json(l.message)} (CHECK message between 1 and 4000 : l’insertion échouera, l’e-mail part quand même)` : '')
}

// ─── 4. Doublon rejoué, flood, en-têtes forgés ─────────────────────────────────────────────────────────────────────────────────
{
  const compteur = new Map()
  const limite = async (k, m) => { const n = (compteur.get(k) ?? 0) + 1; compteur.set(k, n); return n <= m }
  let lignes = 0, mails = 0, statuts = []
  for (let i = 0; i < 6; i++) {
    const x = doublures(demo, { drapeau: true }); x.d.limite = limite
    const { r } = await avecConsole(() => traiterContact(x.d)); statuts.push(r.statut)
    lignes += x.appels.filter((p) => p[0] === 'enregistrer').length; mails += x.appels.filter((p) => p[0] === 'notifier').length
  }
  essai('4.1', 'doublon rejoué 6 fois depuis la même adresse : 3 lignes et 3 e-mails au plus (plafond 3/h), puis 429 sans écriture', lignes === 3 && mails === 3 && json(statuts) === json([200, 200, 200, 429, 429, 429]), `${lignes} lignes, ${mails} e-mails, ${json(statuts)} — pas de dédoublonnage : 3 lignes identiques possibles`)
  const b = doublures(demo, { drapeau: true, banni: true }); await avecConsole(() => traiterContact(b.d))
  const p = doublures({ ...demo, societe: 'robot' }, { drapeau: true }); await avecConsole(() => traiterContact(p.d))
  essai('4.2', 'adresse bannie et champ piège : aucune écriture', !b.appels.some((q) => q[0] === 'enregistrer') && !p.appels.some((q) => q[0] === 'enregistrer'))
  const ordre = doublures(demo, { drapeau: true }); await avecConsole(() => traiterContact(ordre.d))
  const noms = ordre.appels.map((q) => q[0])
  essai('4.3', 'ordre : ban → plafond → écriture → e-mail (le plafond passe AVANT toute écriture)', noms.indexOf('limite') < noms.indexOf('enregistrer') && noms.indexOf('enregistrer') < noms.indexOf('notifier'), noms.join(' → '))
}
{
  const { getIp } = await import(pathToFileURL(path.join(RACINE, 'lib/security.ts')).href)
  const r = (h) => getIp(new Request('https://x.invalid/', { headers: h }))
  const a = r({ 'x-forwarded-for': '198.51.100.1, 203.0.113.9' }), b = r({ 'x-forwarded-for': '198.51.100.2' }), c = r({})
  essai('4.4', 'en-tête X-Forwarded-For forgé : getIp prend la PREMIÈRE valeur (code d’avant, inchangé) — chaque fausse adresse ouvre un plafond neuf, sauf si Vercel réécrit l’en-tête', a !== b, `getIp → ${a} / ${b} / ${c} (risque hérité, pas introduit ; drapeau levé, il permet aussi d’écrire des lignes)`)
}

// ─── 5. Le Poste : /api/controle/demandes-demo ─────────────────────────────────────────────────────────────────────────────────
const UID_B = '00000000-0000-4000-8000-0000000000bb'
const fondateur = { uid: UID_B, email: 'b@exemple.invalid', role: 'direction', roleInterne: 'fondateur', iat: 0, ip: '203.0.113.1' }
const exigerDomaine = (f, dom, verbe) => { const v = peutFaire(f.roleInterne, dom, verbe); return v.permis ? { borne: v.borne } : { error: v.raison, status: 403, code: 'hors_perimetre' } }
function client(lignes = [], o = {}) {
  const chaine = []
  const q = {
    select: (c) => { chaine.push(['select', c]); return q }, update: (v) => { chaine.push(['update', v]); return q }, insert: (v) => { chaine.push(['insert', v]); return q },
    eq: (c, v) => { chaine.push(['eq', c, v]); return q }, order: (c, x) => { chaine.push(['order', c, x]); return q }, limit: (n) => { chaine.push(['limit', n]); return q },
    abortSignal: () => q,
    then: (res, rej) => {
      if (o.panne) return Promise.resolve({ data: null, error: { message: 'down' } }).then(res, rej)
      const maj = chaine.find((c) => c[0] === 'update')
      if (maj) { const id = chaine.find((c) => c[0] === 'eq' && c[1] === 'id')?.[2]; const l = lignes.find((x) => x.id === id && x.etat === 'nouvelle'); if (l) Object.assign(l, maj[1]); chaine.length = 0; return Promise.resolve({ data: l ? [l] : [], error: null }).then(res, rej) }
      const id = chaine.find((c) => c[0] === 'eq' && c[1] === 'id')?.[2]; chaine.length = 0
      return Promise.resolve({ data: id ? lignes.filter((x) => x.id === id) : lignes, error: null }).then(res, rej)
    },
  }
  const appels = []
  return { c: { from: (t) => { appels.push(t); return q } }, appels }
}
const req = (corps) => new Request('https://qg.prestiapp.fr/api/controle/demandes-demo', { method: corps === undefined ? 'GET' : 'POST', body: corps === undefined ? undefined : JSON.stringify(corps) })
const deps = (o) => {
  const journal = []
  const cl = o.client ?? client()
  return {
    journal, cl,
    d: { drapeau: o.drapeau ?? true, client: cl.c, estFondateur: async () => o.qui, estDirection: async () => (o.quiEcrit ?? o.qui),
      exigerDomaine, journaliser: async (e) => { journal.push(e); return o.journalOk ?? true } },
  }
}
const sansSession = { error: 'Non connecté.', status: 401, code: 'jeton' }
const artisan = { error: 'Réservé aux fondateurs.', status: 403 }
const partenaire = { ...fondateur, uid: '00000000-0000-4000-8000-0000000000cc', role: 'lecture', roleInterne: 'partenaire' }
const lectureSeule = { error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' }
for (const [nom, qui, attendu] of [['sans session', sansSession, 401], ['compte artisan (is_founder faux)', artisan, 403], ['partenaire', partenaire, 403]]) {
  for (const verbe of ['GET', 'POST']) {
    const x = deps({ qui })
    const r = verbe === 'GET' ? await listeDemandesDemo(req(), x.d) : await marquerDemandeTraitee(req({ id: '11111111-1111-4111-8111-111111111111' }), x.d)
    essai(`5.${nom}.${verbe}`, `${verbe} /api/controle/demandes-demo, ${nom} : ${attendu}, aucune lecture ni écriture, rien au journal`, r.statut === attendu && x.cl.appels.length === 0 && x.journal.length === 0, `statut ${r.statut}, ${x.cl.appels.length} accès base`)
  }
}
{
  const x = deps({ qui: fondateur, drapeau: false })
  const r = await listeDemandesDemo(req(), x.d)
  essai('5.drapeau', 'drapeau baissé, même fondateur : 404, rien n’est lu', r.statut === 404 && x.cl.appels.length === 0)
  const y = deps({ qui: fondateur, quiEcrit: lectureSeule })
  const ry = await marquerDemandeTraitee(req({ id: '11111111-1111-4111-8111-111111111111' }), y.d)
  essai('5.lecture', 'fondateur au rôle « lecture » qui marque traitée : 403, rien écrit', ry.statut === 403 && y.cl.appels.length === 0 && y.journal.length === 0)
}
{
  const lignes = [
    { id: '11111111-1111-4111-8111-111111111111', motif: 'entreprise', taille: '1', activite: 'Artisan', prenom: 'P', email: 'p@exemple.invalid', message: null, etat: 'nouvelle', rendez_vous_le: null, traitee_le: null, cree_le: '2026-11-02T09:00:00Z', maj_le: '2026-11-02T09:00:00Z', traitee_par: UID_B, fiche_diagnostic: { secret: 1 } },
    { id: '22222222-2222-4222-8222-222222222222', motif: 'entreprise', taille: 'beaucoup', activite: 'Artisan', prenom: 'Q', email: 'q@exemple.invalid', message: null, etat: 'nouvelle', rendez_vous_le: null, traitee_le: null, cree_le: '2026-11-02T09:00:00Z', maj_le: '2026-11-02T09:00:00Z' },
  ]
  const x = deps({ qui: fondateur, client: client(lignes) })
  const r = await listeDemandesDemo(req(), x.d)
  const cles = Object.keys(r.corps.demandes?.[0] ?? {})
  essai('5.lecture-fondateur', 'fondateur : 200 ; ni traitee_par ni fiche_diagnostic rendus ; ligne hors liste écartée', r.statut === 200 && r.corps.demandes.length === 1 && !cles.includes('traitee_par') && !cles.includes('fiche_diagnostic'), cles.join(','))
}
{
  const injections = ['1', "11111111-1111-4111-8111-111111111111' or '1'='1", '11111111-1111-4111-8111-111111111111,etat.eq.traitee', '*', ['11111111-1111-4111-8111-111111111111'], { eq: 1 }, null]
  let ok = 0
  for (const id of injections) { const x = deps({ qui: fondateur }); const r = await marquerDemandeTraitee(req({ id }), x.d); if (r.statut === 400 && x.cl.appels.length === 0 && x.journal.length === 0) ok++ }
  essai('5.injection-id', `geste « traitée » avec ${injections.length} identifiants forgés (injection PostgREST, tableau, objet, nul) : 400, rien lu, rien journalisé`, ok === injections.length, `${ok}/${injections.length}`)
}
{
  const lignes = [{ id: '11111111-1111-4111-8111-111111111111', etat: 'nouvelle' }]
  const x = deps({ qui: fondateur, client: client(lignes) })
  const r1 = await marquerDemandeTraitee(req({ id: '11111111-1111-4111-8111-111111111111' }), x.d)
  const r2 = await marquerDemandeTraitee(req({ id: '11111111-1111-4111-8111-111111111111' }), x.d)
  const r3 = await marquerDemandeTraitee(req({ id: '99999999-9999-4999-8999-999999999999' }), x.d)
  essai('5.geste', 'geste « traitée » : 1er = 200, rejeu = 200 « déjà », id inconnu = 404 ; traitee_par = uid du fondateur', r1.statut === 200 && r2.statut === 200 && r2.corps.deja === true && r3.statut === 404 && lignes[0].traitee_par === UID_B,
    `journal : ${x.journal.length} entrées pour 1 changement réel (rejeu et id inconnu journalisés « nouvelle → traitée »)`)
  const y = deps({ qui: fondateur, journalOk: false, client: client([{ id: '11111111-1111-4111-8111-111111111111', etat: 'nouvelle' }]) })
  const ry = await marquerDemandeTraitee(req({ id: '11111111-1111-4111-8111-111111111111' }), y.d)
  essai('5.journal', 'journal indisponible : 503, rien écrit', ry.statut === 503 && y.cl.appels.length === 0)
}

rmSync(dossier, { recursive: true, force: true })
const failles = resultats.filter((r) => !r.ok)
console.log(`\n${resultats.length} essais, ${resultats.length - failles.length} tiennent, ${failles.length} en défaut : ${failles.map((f) => f.id).join(', ') || 'aucun'}`)
