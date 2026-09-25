#!/usr/bin/env node
// Juge de la tâche 022-04 — scripts/publier-serie.mjs : publier une série écrite au format de plans/publications-10.md
// (textes dans le fichier maître, calendrier en tableau) sur la Page Facebook Presti et Instagram, sans toucher au pipeline
// de la série 1, qui a fait ses preuves.
//
// Il ne publie rien. Il lance le script en `--plan-json` avec `fetch` remplacé par une exception (le mode plan ne doit faire
// AUCUN appel réseau), puis recalcule lui-même, depuis le fichier maître, ce que le plan doit contenir : les lignes du
// calendrier, le texte exact de chaque variante, la date à Paris, l'image, et rien pour une publication « EN ATTENTE ».
//
// Usage : node scripts/publier-serie-qa.mjs
//
// Section 3 (16/09) : la reprise quotidienne `--programmer --essai`, relancée telle quelle par l'automatisation de 20 h,
// contre un Publora SIMULÉ (fetch remplacé : toute méthode autre que GET lève une exception, toute URL inconnue aussi) et un
// journal factice. Elle vérifie l'ancre sans --ancre, le plafond de 3 programmées sur le compte, l'horizon, le brouillon
// Facebook programmé tel quel, le brouillon Instagram 9:16 remplacé par une nouvelle parution, la n° 16 bloquée, et
// (023-05) l'état réel du 16/09 au soir : 12 A programmée avec l'image de pub-04, 11 A publiée avec celle de pub-01.
//
// Section 4 : écritures et reprises contre un faux Publora PERSISTANT, qui refuse une 4e programmée comme le vrai, dans un
// bac hors du dépôt (script copié, images de publications/ copiées, y compris celles d'AUTRES publications). Tout est jugé
// par comportement : appels envoyés, état Publora, journal, lignes « ALERTE BENJ : » en début de ligne, code de sortie.
// 023-05 : lecture de .env.local, remplacement du visuel d'une parution programmée (brouillon PUIS création), refus à moins
// de 3 h, échec de chaque étape, orpheline au mauvais visuel, publiée signalée une seule fois, verrou entre deux lancements.
// 023-05 reprise 1 (section 4 ter) : update-post qui répond 200 sans rien changer, nouvelle parution du remplacement
// relue pending, orpheline en échec, échec alerté à CHAQUE passage, parution supprimée dans Publora (404) signalée une
// fois, lecture en échec alertée à chaque passage, parution pas partie à son heure, créneau passé signalé une fois (et de
// nouveau si le lancement s'est arrêté avant d'écrire sa marque).
//
// Maître réel et copie neutre (25/09, avant 027-02) : depuis le 24/09, le vrai maître porte des lignes « PROGRAMMATION
// BLOQUÉE » (n° 14, 15, 16 : créneaux ratés faute de quota, puis abandonnées ou postées hors Publora, décision de Benj).
// C'est un état VOULU, jugé tel quel : le plan du maître réel doit marquer bloquées exactement ces publications (section 2),
// et un passage --programmer sur le maître réel, en --essai (section 3) puis en écriture (section 4), ne doit rien faire
// pour elles. Les contrôles qui ont besoin de parutions à programmer (sections 3 et 4, écrits quand 14 à 16 étaient à
// venir) portent sur une COPIE NEUTRE du maître, écrite hors du dépôt, dont ces seules lignes sont retirées. Le vrai maître
// n'est jamais modifié. Les passages en --essai reçoivent les quatre clés (factices) : le script ne lit jamais le
// .env.local du dépôt.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const SCRIPT = 'scripts/publier-serie.mjs'
const MAITRE = 'plans/publications-serie-2.md'
const ANCRE = '2026-09-14'
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const fin = () => { console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués`); process.exit(ko === 0 ? 0 : 1) }

if (!fs.existsSync(SCRIPT)) { T(`${SCRIPT} existe`, false); fin() }
const src = fs.readFileSync(SCRIPT, 'utf8')
console.log('1. Le code')
T('options --maitre, --ancre, --plan-json, --programmer, --une-seule, --essai présentes', ['--maitre', '--ancre', '--plan-json', '--programmer', '--une-seule', '--essai'].every((o) => src.includes(o)))
T('aucun appel de suppression (DELETE) dans le script', !/method:\s*['"]DELETE['"]/i.test(src) && !/delete-post|\/media\/\$\{/.test(src))
T('la clé Publora vient de l’environnement ou de presti-secrets, jamais écrite en dur', !/x-publora-key['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{12,}['"]/i.test(src))
T('le journal des publications est relu pour refuser les doublons', /journal-publications\.md/.test(src))
T('une image n’est déposée qu’après contrôle de la place libre (même garde-fou que promo-heberger)', /promo/.test(src) && /marge/i.test(src))
T('une publication « EN ATTENTE » est écartée', /EN ATTENTE/.test(src))

// Ce que le plan DOIT contenir, recalculé ici.
const md = fs.readFileSync(MAITRE, 'utf8')
const lignes = md.split(/\r?\n/)
const debut = lignes.findIndex((l) => /^#\s+Calendrier de la série 2/.test(l))
T('le fichier maître a son chapitre « Calendrier de la série 2 »', debut >= 0)
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const blocDe = (num) => {
  const m = new RegExp(`^# Publication n° ${num} — .*$`, 'm').exec(md)
  if (!m) return null
  const reste = md.slice(m.index + m[0].length)
  const suite = reste.search(/^# /m)
  return suite < 0 ? reste : reste.slice(0, suite)
}
// Publications du maître réel marquées « PROGRAMMATION BLOQUÉE » (état voulu), et la copie neutre sans ces lignes.
const BLOCAGE = /PROGRAMMATION BLOQU[ÉE]E/
const BLOQUEES = [...md.matchAll(/^# Publication n° (\d+) — /gm)].map((m) => m[1]).filter((num) => (blocDe(num) || '').split(/\r?\n/).some((l) => BLOCAGE.test(l)))
const mdNeutre = md.split('\n').filter((l) => !BLOCAGE.test(l)).join('\n')
console.log(`  · maître réel : publications bloquées ${BLOQUEES.length ? `n° ${BLOQUEES.join(', ')}` : 'aucune'} (état voulu) ; copie neutre = maître réel moins ses ${md.split('\n').length - mdNeutre.split('\n').length} ligne(s) « PROGRAMMATION BLOQUÉE »`)
const texteVariante = (bloc, v) => {
  const partie = bloc.split(new RegExp(`^##\\s+Variante ${v}\\b.*$`, 'm'))[1]
  if (!partie) return null
  return partie.split(/^##\s/m)[0].split(/\r?\n/).filter((l) => /^>\s?/.test(l)).map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
}
const visuel = (bloc) => {
  const partie = (bloc.split(/^##\s+Variante B\b.*$/m)[1] || '').split(/^##\s/m)[0]
  const m = /^\s*Visuel\s*:\s*`?([^`\n]+?)`?\s*$/im.exec(partie)
  return m ? m[1].trim() : null
}
const heureParisEnUtc = (jourIso, h, mn) => {
  const midi = new Date(`${jourIso}T12:00:00Z`)
  const hParis = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(midi))
  return new Date(Date.parse(`${jourIso}T${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}:00Z`) - (hParis - 12) * 3600_000).toISOString()
}
const attendu = []
for (let i = debut + 1; debut >= 0 && i < lignes.length; i++) {
  if (/^#\s/.test(lignes[i])) break
  const c = lignes[i].split('|').map((x) => x.trim())
  if (c.length < 6 || !/^\d$/.test(c[1] || '')) continue
  const num = (c[4].match(/\d+/) || [])[0]
  const jour = JOURS.indexOf(c[2].toLowerCase())
  const hm = /(\d{1,2})\s*h\s*(\d{2})?/.exec(c[3])
  if (!num || jour < 0 || !hm) continue
  const bloc = blocDe(num)
  if (!bloc || /⏸\s*\*\*EN ATTENTE/.test(bloc)) continue
  const variante = /var/i.test(c[4]) ? 'B' : 'A'
  const d = new Date(`${ANCRE}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + (Number(c[1]) - 1) * 7 + jour)
  const jourIso = d.toISOString().slice(0, 10)
  attendu.push({ num, variante, canal: c[5].toLowerCase(), quand: heureParisEnUtc(jourIso, Number(hm[1]), Number(hm[2] || 0)), jourIso, texte: texteVariante(bloc, variante), media: visuel(bloc) })
}
T('le calendrier donne au moins huit parutions à publier', attendu.length >= 8, String(attendu.length))

console.log('\n2. Le plan, sans réseau')
const sansReseau = 'data:text/javascript,globalThis.fetch=()=>{throw new Error("RESEAU INTERDIT EN --plan-json")}'
const r = spawnSync(process.execPath, ['--import', sansReseau, SCRIPT, `--maitre=${MAITRE}`, '--plan-json', `--ancre=${ANCRE}`], { encoding: 'utf8', timeout: 60000 })
T('--plan-json sort en 0, sans appel réseau', r.status === 0, `${r.status} ${(r.stderr || '').slice(0, 300)}`)
let plan = null
try { plan = JSON.parse((r.stdout || '').trim()) } catch (e) { T('la sortie standard est un JSON seul', false, (r.stdout || '').slice(0, 200)) }
if (!Array.isArray(plan)) fin()
T('autant d’entrées que le calendrier en attend', plan.length === attendu.length, `${plan.length} / ${attendu.length}`)
for (const a of attendu) {
  const p = plan.find((x) => String(x.num).padStart(2, '0') === a.num.padStart(2, '0') && x.variante === a.variante && String(x.canal).toLowerCase() === a.canal)
  const nom = `n° ${a.num} ${a.variante} → ${a.canal}`
  if (!p) { T(`${nom} : présent au plan`, false); continue }
  T(`${nom} : ${a.jourIso} à l’heure de Paris`, new Date(p.quand).toISOString() === a.quand, `${p.quand} au lieu de ${a.quand}`)
  T(`${nom} : texte identique à la variante du fichier maître`, typeof p.texte === 'string' && p.texte.trim() === a.texte, (p.texte || '').slice(0, 80))
  if (a.canal === 'instagram') T(`${nom} : image jointe, qui existe (${a.media})`, p.media === a.media && !!a.media && fs.existsSync(a.media) && /\.(jpe?g|png|webp)$/i.test(a.media), String(p.media))
  else T(`${nom} : image absente ou identique au visuel de la publication`, p.media == null || (p.media === a.media && fs.existsSync(p.media)), String(p.media))
}
const parJourCanal = new Set()
const doublons = []
for (const p of plan) {
  const cle = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(p.quand))}|${p.canal}`
  if (parJourCanal.has(cle)) doublons.push(cle)
  parJourCanal.add(cle)
}
T('jamais deux parutions le même jour sur le même canal', doublons.length === 0, doublons.join(', '))
T('aucune entrée pour une publication en attente (n° 13)', !plan.some((p) => String(p.num) === '13'))
const entreesBloquees = attendu.filter((a) => BLOQUEES.includes(a.num))
T(`maître réel : le plan marque bloquées exactement les ${entreesBloquees.length} parutions des publications ${BLOQUEES.length ? `n° ${BLOQUEES.join(', ')}` : '(aucune)'}, et elles seules`, plan.every((p) => Boolean(p.bloque) === BLOQUEES.includes(String(p.num).padStart(2, '0'))) && plan.filter((p) => p.bloque).length === entreesBloquees.length, JSON.stringify(plan.filter((p) => p.bloque).map((p) => `${p.num} ${p.variante}`)))
const sansOption = spawnSync(process.execPath, ['--import', sansReseau, SCRIPT, `--maitre=${MAITRE}`, '--plan-json'], { encoding: 'utf8', timeout: 60000 })
T('sans --ancre, le plan est le même (ancre lue dans le fichier maître)', sansOption.status === 0 && sansOption.stdout === r.stdout, (sansOption.stderr || '').slice(0, 200))

console.log('\n3. La reprise quotidienne --programmer --essai, Publora simulé')
const TMP = path.join(os.tmpdir(), 'publier-serie-qa')
fs.mkdirSync(TMP, { recursive: true })
const FAUX = path.join(TMP, 'faux-reseau.mjs')
fs.writeFileSync(FAUX, `import fs from 'node:fs'
const fx = JSON.parse(fs.readFileSync(process.env.PUBLIER_SERIE_FAUX, 'utf8'))
globalThis.fetch = async (url, options = {}) => {
  const methode = String(options.method || 'GET').toUpperCase()
  fs.appendFileSync(process.env.PUBLIER_SERIE_APPELS, methode + ' ' + url + '\\n')
  if (methode !== 'GET') throw new Error('ECRITURE INTERDITE EN --essai : ' + methode + ' ' + url)
  const json = (statut, corps) => new Response(JSON.stringify(corps), { status: statut })
  const u = new URL(url)
  if (u.hostname === 'api.publora.com') {
    if (u.pathname.endsWith('/platform-connections')) return json(200, { connections: fx.connexions })
    if (u.pathname.endsWith('/list-posts')) return json(200, { posts: fx.groupes, pagination: { hasNextPage: false } })
    const id = (u.pathname.match(/\\/get-post\\/([^/]+)$/) || [])[1]
    if (id) return fx.posts[id] ? json(200, fx.posts[id]) : json(404, { error: 'Post not found' })
  }
  if (fx.medias[url]) return new Response(fs.readFileSync(fx.medias[url]), { status: 200 })
  throw new Error('URL inattendue dans le faux reseau : ' + url)
}
`)
const MEDIAS = {
  v01: 'publications/pub-01/vertical-miniature.jpg', // 1080×1920, image de la 11 A PUBLIÉE le 16/09
  v04: 'publications/pub-04/vertical-miniature.jpg', // 1080×1920, visuel des brouillons 12 du 15/09 et de la 12 A programmée
  v10: 'publications/pub-10/vertical-miniature.jpg', // 1080×1920, brouillons 14
  v02: 'publications/pub-02/vertical-miniature.jpg', // 1080×1920, brouillons 15
  photo: 'public/demo/portfolio/cuisine-bois.webp', // photo CC BY-SA des brouillons 16
  ig11: 'publications/serie-2/pub-11-instagram.jpg',
  ig12: 'publications/serie-2/pub-12-instagram.jpg',
  ig14: 'publications/serie-2/pub-14-instagram.jpg',
  ig15: 'publications/serie-2/pub-15-instagram.jpg',
}
const CANAL = { A: 'facebook', B: 'instagram' }
const maitreDeTest = (nom, transformer, base = md) => { const f = path.join(TMP, `${nom}.md`); fs.writeFileSync(f, transformer(base)); return f }
// Les passages qui ont besoin de parutions à programmer lisent la copie neutre ; le maître réel est passé explicitement.
const MAITRE_NEUTRE = maitreDeTest('maitre-neutre', (texte) => texte, mdNeutre)
const scenario = (nom, { maintenant, parutions, extras = [], maitre = MAITRE_NEUTRE, args = ['--programmer', '--essai'] }) => {
  const fx = { connexions: [{ platformId: 'facebook-111', tokenStatus: 'valid' }, { platformId: 'instagram-222', tokenStatus: 'valid' }], groupes: [], posts: {}, medias: {} }
  const lignesJ = ['# Journal factice du juge', '', '| Créé le | Programmé | Canal | N° | Variante | postGroupId |', '|---|---|---|---|---|---|']
  for (const p of parutions) {
    const num = p.cle.slice(0, 2), variante = p.cle.slice(2, 3), canal = CANAL[variante]
    const id = crypto.createHash('md5').update(`${nom}|${p.cle}|${p.media}|${p.statut}`).digest('hex').slice(0, 24)
    const texte = attendu.find((a) => a.num === num && a.variante === variante)?.texte || 'texte'
    const url = `https://media.test/${id}`
    fx.medias[url] = MEDIAS[p.media]
    fx.posts[id] = { postGroupId: id, status: p.statut, scheduledTime: p.programme || null, platforms: [`${canal}-${canal === 'facebook' ? 111 : 222}`], posts: [{ platform: canal, content: texte, status: p.statut }], media: [{ url, status: 'ready' }] }
    fx.groupes.push({ postGroupId: id, status: p.statut, scheduledTime: p.programme || null, content: texte, platforms: [{ platform: canal, platformId: `${canal}-1`, status: p.statut }] })
    lignesJ.push(`| 2026-09-15 | ${p.journal || (p.statut === 'draft' ? 'brouillon' : p.programme)} | ${canal} | ${num} | ${variante} | ${id} |`)
  }
  fx.groupes.push(...extras)
  const journal = path.join(TMP, `${nom}-journal.md`), fixture = path.join(TMP, `${nom}-publora.json`), appels = path.join(TMP, `${nom}-appels.txt`)
  fs.writeFileSync(journal, `${lignesJ.join('\n')}\n`)
  fs.writeFileSync(fixture, JSON.stringify(fx))
  fs.writeFileSync(appels, '')
  const avant = fs.readFileSync(journal, 'utf8')
  const options = [`--maitre=${maitre}`, `--journal=${journal}`, ...args, ...(args.includes('--essai') ? [`--maintenant=${maintenant}`] : [])]
  const res = spawnSync(process.execPath, ['--import', pathToFileURL(FAUX).href, SCRIPT, ...options], {
    encoding: 'utf8', timeout: 120000,
    // Les quatre clés, factices : le script n'a jamais à lire le .env.local du dépôt (dont PUBLORA_QUOTA_MENSUEL).
    env: { ...process.env, PUBLORA_API_KEY: 'cle-factice-du-juge', NEXT_PUBLIC_SUPABASE_URL: 'https://faux.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'cle-factice-du-juge', PUBLORA_QUOTA_MENSUEL: '15', PUBLIER_SERIE_FAUX: fixture, PUBLIER_SERIE_APPELS: appels },
  })
  const lignesAppels = fs.readFileSync(appels, 'utf8').split('\n').filter(Boolean)
  return {
    code: res.status, sortie: res.stdout || '', erreurs: res.stderr || '',
    actions: (res.stdout || '').split(/\r?\n/).map((l) => /^SERAIT (?:PROGRAMMÉE|REMPLACÉE) · (pub-\d+ [AB] \w+) · (\S+) · (brouillon programmé|nouvelle parution|remplacement de visuel)/.exec(l)).filter(Boolean).map((m) => `${m[1]} · ${m[2]} · ${m[3]}`),
    lectureSeule: lignesAppels.length > 0 && lignesAppels.every((l) => l.startsWith('GET ')) && lignesAppels.some((l) => l.includes('/list-posts')),
    journalIntact: fs.readFileSync(journal, 'utf8') === avant,
  }
}
const detail = (s) => `code ${s.code} · actions ${JSON.stringify(s.actions)}\n     ${(s.sortie + s.erreurs).split('\n').slice(0, 16).join('\n     ')}`
const BROUILLONS_15_09 = [
  { cle: '14A', statut: 'draft', media: 'v10' },
  { cle: '14B', statut: 'draft', media: 'v10' },
  { cle: '15A', statut: 'draft', media: 'v02' },
  { cle: '15B', statut: 'draft', media: 'v02' },
  { cle: '16A', statut: 'draft', media: 'photo' },
  { cle: '16B', statut: 'draft', media: 'photo' },
]
const BASE_SOIR = [
  { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
  { cle: '11B', statut: 'scheduled', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
  { cle: '12A', statut: 'scheduled', programme: '2026-09-18T17:30:00.000Z', media: 'ig12' },
  { cle: '12B', statut: 'draft', media: 'v04' },
  ...BROUILLONS_15_09,
]

let s = scenario('soir-16-09', { maintenant: '2026-09-16T19:30:00.000Z', parutions: BASE_SOIR })
T('16/09 au soir : code 0, lectures GET seulement, journal intact', s.code === 0 && s.lectureSeule && s.journalIntact, detail(s))
T('16/09 au soir : une seule action, pub-12 B Instagram le 19/09 10:30Z en NOUVELLE parution (brouillon 9:16)', JSON.stringify(s.actions) === JSON.stringify(['pub-12 B instagram · 2026-09-19T10:30:00.000Z · nouvelle parution']), detail(s))
T('16/09 au soir : pub-14 A attend une place, pub-16 A et B hors horizon de 7 jours', /attend une place : pub-14 A facebook/.test(s.sortie) && /hors horizon de 7 jours : pub-16 A facebook/.test(s.sortie) && /hors horizon de 7 jours : pub-16 B instagram/.test(s.sortie), detail(s))

s = scenario('soir-17-09', {
  maintenant: '2026-09-17T18:00:00.000Z',
  parutions: [
    { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
    { cle: '11B', statut: 'published', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
    { cle: '12A', statut: 'scheduled', programme: '2026-09-18T17:30:00.000Z', media: 'ig12' },
    { cle: '12B', statut: 'draft', media: 'v04', journal: 'brouillon remplacé' },
    { cle: '12B', statut: 'scheduled', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
    ...BROUILLONS_15_09,
  ],
})
T('17/09 au soir : pub-14 A Facebook est recréée avec le visuel exact du maître, 12 B jamais recréée', s.code === 0 && s.lectureSeule && JSON.stringify(s.actions) === JSON.stringify(['pub-14 A facebook · 2026-09-20T17:30:00.000Z · nouvelle parution']) && /pub-14-instagram\.jpg/.test(s.sortie) && /déjà programmée : pub-12 B instagram/.test(s.sortie), detail(s))

s = scenario('soir-18-09', {
  maintenant: '2026-09-18T18:00:00.000Z',
  parutions: [
    { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
    { cle: '11B', statut: 'published', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
    { cle: '12A', statut: 'published', programme: '2026-09-18T17:30:00.000Z', media: 'ig12' },
    { cle: '12B', statut: 'scheduled', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
    { cle: '14A', statut: 'scheduled', programme: '2026-09-20T17:30:00.000Z', media: 'ig14' },
    { cle: '14B', statut: 'draft', media: 'ig14' },
  ],
})
T('brouillon Instagram déjà au bon visuel 1080×1350 : programmé tel quel, pas recréé', s.code === 0 && JSON.stringify(s.actions) === JSON.stringify(['pub-14 B instagram · 2026-09-21T10:30:00.000Z · brouillon programmé']), detail(s))

s = scenario('compte-plein', {
  maintenant: '2026-09-16T19:30:00.000Z',
  parutions: BASE_SOIR,
  extras: [{ postGroupId: 'ffffffffffffffffffffffff', status: 'scheduled', scheduledTime: '2026-09-18T07:00:00.000Z', content: 'hors série', platforms: [{ platform: 'linkedin', platformId: 'linkedin-9', status: 'scheduled' }] }],
})
T('3 programmées sur le compte (dont une hors série) : « Rien à programmer. », code 0', s.code === 0 && s.actions.length === 0 && /Rien à programmer\./.test(s.sortie), detail(s))

const PUBLIEES_11_12 = [
  { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
  { cle: '11B', statut: 'published', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
  { cle: '12A', statut: 'published', programme: '2026-09-18T17:30:00.000Z', media: 'ig12' },
]
s = scenario('rattrapage', {
  maintenant: '2026-09-19T12:00:00.000Z',
  parutions: [...PUBLIEES_11_12, ...BASE_SOIR.slice(3)],
})
T('créneau passé signalé bruyamment avec code 3, sans marque écrite en --essai (journal intact), et jamais plus de 3 actions sur un compte vide', s.code === 3 && s.lectureSeule && s.journalIntact && /^ALERTE BENJ : créneau passé : pub-12 B instagram/m.test(s.sortie) && JSON.stringify(s.actions) === JSON.stringify([
  'pub-14 A facebook · 2026-09-20T17:30:00.000Z · nouvelle parution',
  'pub-14 B instagram · 2026-09-21T10:30:00.000Z · nouvelle parution',
  'pub-15 A facebook · 2026-09-22T17:30:00.000Z · nouvelle parution',
]) && /attend une place : pub-15 B instagram/.test(s.sortie), detail(s))

const PUBLIEES_11_A_15 = [
  ...PUBLIEES_11_12,
  { cle: '12B', statut: 'published', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
  { cle: '14A', statut: 'published', programme: '2026-09-20T17:30:00.000Z', media: 'ig14' },
  { cle: '14B', statut: 'published', programme: '2026-09-21T10:30:00.000Z', media: 'ig14' },
  { cle: '15A', statut: 'published', programme: '2026-09-22T17:30:00.000Z', media: 'ig15' },
  { cle: '15B', statut: 'published', programme: '2026-09-23T10:30:00.000Z', media: 'ig15' },
]
s = scenario('seize-debloquee', {
  maintenant: '2026-09-23T18:00:00.000Z',
  parutions: [...PUBLIEES_11_A_15, { cle: '16A', statut: 'draft', media: 'photo' }, { cle: '16B', statut: 'draft', media: 'photo' }],
})
T('n° 16 débloquée : la photo sous licence ne part pas, même sur Facebook (deux nouvelles parutions avec la carte)', s.code === 0 && JSON.stringify(s.actions) === JSON.stringify([
  'pub-16 A facebook · 2026-09-24T17:30:00.000Z · nouvelle parution',
  'pub-16 B instagram · 2026-09-25T10:30:00.000Z · nouvelle parution',
]), detail(s))

const avecBlocage = maitreDeTest('maitre-avec-blocage', (texte) => texte.replace(/(# Publication n° 16 — [^\n]+)/, '$1\n\n> ⛔ **PROGRAMMATION BLOQUÉE — test de licence.**\n'), mdNeutre)
s = scenario('seize-bloquee', {
  maintenant: '2026-09-23T18:00:00.000Z',
  maitre: avecBlocage,
  parutions: [...PUBLIEES_11_A_15, { cle: '16A', statut: 'draft', media: 'photo' }, { cle: '16B', statut: 'draft', media: 'photo' }],
})
T('marqueur PROGRAMMATION BLOQUÉE : publication 16 reste bloquée si le maître porte le marqueur', s.code === 0 && s.actions.length === 0 && /bloquée : pub-16 A facebook/.test(s.sortie) && /bloquée : pub-16 B instagram/.test(s.sortie), detail(s))

// Le maître RÉEL tel quel : même soir que « soir-17-09 », où la copie neutre recrée pub-14 A. Ses publications bloquées
// (état voulu) ne donnent aucune action, chacune de leurs parutions est annoncée « bloquée : ».
const jugerMaitreReel = (etiquette, { code, sortie, sansEcriture, detailTexte }) => T(`${etiquette} (n° ${BLOQUEES.join(', ')} bloquées, décision de Benj) : aucune action ni écriture pour elles, « bloquée : » pour chacune de leurs ${entreesBloquees.length} parutions, code 0`,
  code === 0 && sansEcriture && entreesBloquees.every((a) => new RegExp(`bloquée : pub-${a.num} ${a.variante} ${a.canal}`).test(sortie)), detailTexte)
if (!entreesBloquees.length) console.log('  ⏭  maître réel sans publication bloquée : identique à la copie neutre, contrôle sans objet (non compté)')
else {
  s = scenario('maitre-reel', {
    maintenant: '2026-09-17T18:00:00.000Z',
    maitre: MAITRE,
    parutions: [
      { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
      { cle: '11B', statut: 'published', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
      { cle: '12A', statut: 'scheduled', programme: '2026-09-18T17:30:00.000Z', media: 'ig12' },
      { cle: '12B', statut: 'scheduled', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
      ...BROUILLONS_15_09,
    ],
  })
  jugerMaitreReel('maître réel, --essai, 17/09 au soir', { code: s.code, sortie: s.sortie, sansEcriture: s.lectureSeule && s.journalIntact && !s.actions.some((a) => BLOQUEES.includes(a.slice(4, 6))), detailTexte: detail(s) })
}

const sansAncre = maitreDeTest('maitre-sans-ancre', (texte) => texte.replace(/--ancre=\d{4}-\d{2}-\d{2}/g, 'ancre retirée par le juge'))
s = scenario('ancre-du-journal', { maintenant: '2026-09-16T19:30:00.000Z', maitre: sansAncre, parutions: BASE_SOIR, args: ['--plan-json'] })
T('maître sans ancre : l’ancre est retrouvée dans le journal (plan identique)', s.code === 0 && s.sortie === r.stdout, detail(s))
s = scenario('sans-ancre-du-tout', { maintenant: '2026-09-16T19:30:00.000Z', maitre: sansAncre, parutions: BASE_SOIR.filter((p) => p.statut === 'draft') })
T('--programmer sans ancre nulle part : refus, code 1, aucun appel', s.code === 1 && /Ancre introuvable/.test(s.erreurs), detail(s))
s = scenario('ancre-contredite', {
  maintenant: '2026-09-16T19:30:00.000Z',
  parutions: [{ cle: '11A', statut: 'scheduled', programme: '2026-09-23T17:30:00.000Z', media: 'ig11' }, ...BASE_SOIR.slice(3)],
})
T('--programmer avec une ancre du maître contredite par le journal : refus, code 1', s.code === 1 && /contredite par le journal/.test(s.erreurs), detail(s))

// L'état réel lu dans Publora le 16/09 vers 22 h 40 : 11 A PUBLIÉE avec l'image de pub-01, 12 A programmée avec celle de
// pub-04 (« Dans les trois formules. »), 11 B et 12 B justes, ancien brouillon 12 B remplacé, brouillons 14 à 16.
const REEL_16_09 = [
  { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'v01' },
  { cle: '11B', statut: 'scheduled', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
  { cle: '12A', statut: 'scheduled', programme: '2026-09-18T17:30:00.000Z', media: 'v04' },
  { cle: '12B', statut: 'draft', media: 'v04', journal: 'brouillon remplacé' },
  { cle: '12B', statut: 'scheduled', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
  ...BROUILLONS_15_09,
]
s = scenario('reel-16-09-22h45', { maintenant: '2026-09-16T20:45:00.000Z', parutions: REEL_16_09 })
const ligneRemplacee = s.sortie.split(/\r?\n/).find((l) => /^SERAIT REMPLACÉE · pub-12 A facebook/.test(l)) || ''
T('état réel du 16/09 : 12 A (image de pub-04) serait remplacée à la même heure par la carte 12, en lectures seules', s.lectureSeule && s.journalIntact && JSON.stringify(s.actions) === JSON.stringify(['pub-12 A facebook · 2026-09-18T17:30:00.000Z · remplacement de visuel']) && /pub-12-instagram\.jpg/.test(ligneRemplacee) && /attend une place : pub-14 A facebook/.test(s.sortie), detail(s))
T('état réel du 16/09 : 11 A publiée avec l’image de pub-01 → ligne commençant par « ALERTE BENJ : », code 3 ; 11 B et 12 B, justes, restent programmées', s.code === 3 && /^ALERTE BENJ : visuel faux sur une parution PUBLIÉE : pub-11 A facebook/m.test(s.sortie) && !/^ALERTE BENJ : .*pub-1[12] B/m.test(s.sortie) && /déjà programmée : pub-11 B instagram/.test(s.sortie) && /déjà programmée : pub-12 B instagram/.test(s.sortie), detail(s))

s = scenario('visuel-faux-moins-de-3h', {
  maintenant: '2026-09-18T15:00:00.000Z',
  parutions: [
    { cle: '11A', statut: 'published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
    { cle: '11B', statut: 'published', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
    { cle: '12A', statut: 'scheduled', programme: '2026-09-18T17:30:00.000Z', media: 'v04' },
    { cle: '12B', statut: 'scheduled', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
    ...BROUILLONS_15_09,
  ],
})
T('12 A au mauvais visuel à 2 h 30 de sa parution : rien n’est prévu pour elle, « ALERTE BENJ : … visuel faux … moins de 3 h », code 3', s.code === 3 && s.lectureSeule && !s.actions.some((a) => a.startsWith('pub-12 A')) && /^ALERTE BENJ : visuel faux : pub-12 A facebook.*moins de 3 h/m.test(s.sortie), detail(s))

s = scenario('statuts-en-echec', {
  maintenant: '2026-09-17T18:00:00.000Z',
  parutions: [
    { cle: '11A', statut: 'partially_published', programme: '2026-09-16T17:30:00.000Z', media: 'ig11' },
    { cle: '11B', statut: 'published', programme: '2026-09-17T10:30:00.000Z', media: 'ig11' },
    { cle: '12A', statut: 'failed', programme: '2026-09-18T17:30:00.000Z', media: 'ig12' },
    { cle: '12B', statut: 'scheduled', programme: '2026-09-19T10:30:00.000Z', media: 'ig12' },
    ...BROUILLONS_15_09,
  ],
})
T('parution « failed » et parution « partially_published » : une ligne « ALERTE BENJ : » chacune, code 3, rien n’est recréé', s.code === 3 && /^ALERTE BENJ : statut Publora « failed » : pub-12 A facebook/m.test(s.sortie) && /^ALERTE BENJ : statut Publora « partially_published » : pub-11 A facebook/m.test(s.sortie) && !s.actions.some((a) => /^pub-1[12] A/.test(a)), detail(s))

console.log('\n4. Écritures et reprises, faux Publora persistant')
const BAC = path.join(TMP, 'integration')
fs.rmSync(BAC, { recursive: true, force: true })
fs.mkdirSync(path.join(BAC, 'scripts'), { recursive: true })
fs.mkdirSync(path.join(BAC, 'plans'), { recursive: true })
fs.copyFileSync(SCRIPT, path.join(BAC, 'scripts', 'publier-serie.mjs'))
// Le maître du bac est la copie NEUTRE (les reprises ci-dessous programment 14 à 16) ; le maître réel est copié à côté,
// tel quel, pour un passage en écriture qui ne doit rien programmer de ses publications bloquées.
fs.writeFileSync(path.join(BAC, 'plans', 'publications-serie-2.md'), mdNeutre)
const MAITRE_REEL_BAC = path.join(BAC, 'plans', 'publications-serie-2.reel.md')
fs.copyFileSync(MAITRE, MAITRE_REEL_BAC)
// Les visuels du maître ET les images d'autres publications (pub-01, 02, 04, 10) : un brouillon qui porte une image
// « Presti » d'une autre publication doit être vu comme faux même quand elle existe dans le publications/ du bac.
for (const media of [...new Set([...attendu.map((a) => a.media), ...Object.values(MEDIAS)])]) {
  const destination = path.join(BAC, media)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(media, destination)
}

const FAUX_ECRITURE = path.join(TMP, 'faux-reseau-ecriture.mjs')
fs.writeFileSync(FAUX_ECRITURE, `import fs from 'node:fs'
import crypto from 'node:crypto'
const fichier = process.env.PUBLIER_SERIE_ETAT
const base = Date.parse(process.env.PUBLIER_SERIE_MAINTENANT)
const lenteur = Number(process.env.PUBLIER_SERIE_LENTEUR_MS || 0)
Date.now = () => base
const lire = () => JSON.parse(fs.readFileSync(fichier, 'utf8'))
const sauver = (etat) => fs.writeFileSync(fichier, JSON.stringify(etat))
const json = (statut, corps) => new Response(JSON.stringify(corps), { status: statut })
const OCCUPANTS = ['scheduled', 'pending', 'processing']
const occupants = (etat, sauf) => Object.values(etat.groupes).filter((g) => g.postGroupId !== sauf && OCCUPANTS.includes(g.status)).length
const noter = (etat, liste, valeur) => { etat[liste] = etat[liste] || []; if (valeur !== undefined && !etat[liste].includes(valeur)) etat[liste].push(valeur) }
globalThis.fetch = async (url, options = {}) => {
  if (lenteur) await new Promise((suite) => setTimeout(suite, lenteur))
  const etat = lire(), methode = String(options.method || 'GET').toUpperCase(), u = new URL(url), entetes = options.headers || {}
  etat.appels = (etat.appels || 0) + 1
  etat.ecritures = etat.ecritures || []
  const finir = (reponse) => { if (occupants(etat) > 3) etat.depassements = (etat.depassements || 0) + 1; sauver(etat); return reponse }
  if (methode === 'DELETE') throw new Error('DELETE interdit')
  if (u.hostname === 'api.publora.com') {
    noter(etat, 'clesPublora', entetes['x-publora-key'])
    if (u.pathname.endsWith('/platform-connections')) return finir(json(200, { connections: etat.connexions }))
    if (u.pathname.endsWith('/list-posts')) return finir(json(200, { posts: Object.values(etat.groupes).map((g) => ({ ...g, media: undefined })), pagination: { hasNextPage: false } }))
    const lu = (u.pathname.match(/\\/get-post\\/([^/]+)$/) || [])[1]
    if (methode === 'GET' && lu) {
      const panne = (etat.lectureEnEchec || {})[lu]
      if (panne) return finir(json(panne, { error: 'panne de lecture simulée' }))
      const g = etat.groupes[lu]
      if (!g) return finir(json(404, { error: 'absent' }))
      const copie = structuredClone(g)
      if (etat.pendingUneFois && etat.dernierEcrit === lu) { copie.status = 'pending'; etat.pendingUneFois = false }
      const attente = (etat.pendingPour || []).indexOf(lu)
      if (attente >= 0 && (etat.ecrits || []).includes(lu)) { copie.status = 'pending'; etat.pendingPour.splice(attente, 1) }
      return finir(json(200, copie))
    }
    const corps = options.body ? JSON.parse(options.body) : {}
    if (methode === 'POST' && u.pathname.endsWith('/create-post')) {
      etat.ecritures.push({ methode, chemin: u.pathname, corps })
      if (etat.refuserCreations > 0) { etat.refuserCreations--; return finir(json(500, { error: 'panne simulée' })) }
      if (corps.scheduledTime && occupants(etat) >= 3) { etat.refusPlafond = (etat.refusPlafond || 0) + 1; return finir(json(403, { error: 'LimitExceededError' })) }
      const id = 'cree-' + String(++etat.sequence).padStart(3, '0')
      etat.groupes[id] = { postGroupId: id, content: corps.content, status: corps.scheduledTime ? 'scheduled' : 'draft', scheduledTime: corps.scheduledTime || null, platforms: corps.platforms, media: (corps.mediaUrls || []).map((adresse) => ({ url: adresse, status: 'ready' })) }
      etat.dernierEcrit = id
      noter(etat, 'ecrits', id)
      if (etat.perdreCreationUneFois) { etat.perdreCreationUneFois = false; sauver(etat); throw new Error('réponse perdue après création') }
      return finir(json(200, { postGroupId: id, scheduledTime: corps.scheduledTime }))
    }
    const maj = (u.pathname.match(/\\/update-post\\/([^/]+)$/) || [])[1]
    if (methode === 'PUT' && maj) {
      etat.ecritures.push({ methode, chemin: u.pathname, corps })
      const g = etat.groupes[maj]
      if (!g) return finir(json(404, { error: 'absent' }))
      if ((etat.refuserMajPour || []).includes(maj) || !['draft', 'scheduled'].includes(g.status)) return finir(json(400, { error: 'POST_NOT_EDITABLE' }))
      if ((etat.ignorerMajPour || []).includes(maj)) return finir(json(200, { success: true, postGroup: { _id: maj, status: g.status }, scheduledTime: g.scheduledTime }))
      if (corps.status === 'scheduled' && g.status !== 'scheduled' && occupants(etat, maj) >= 3) { etat.refusPlafond = (etat.refusPlafond || 0) + 1; return finir(json(403, { error: 'LimitExceededError' })) }
      Object.assign(g, { status: corps.status || g.status, scheduledTime: corps.scheduledTime || g.scheduledTime, content: corps.content || g.content })
      etat.dernierEcrit = maj
      noter(etat, 'ecrits', maj)
      return finir(json(200, { success: true, postGroup: { _id: maj, status: g.status }, scheduledTime: g.scheduledTime }))
    }
  }
  if (u.hostname === 'media.test') return finir(new Response(fs.readFileSync(etat.medias[u.href]), { status: 200 }))
  if (u.hostname === 'faux.supabase.co') {
    noter(etat, 'clesSupabase', entetes.apikey)
    if (methode === 'GET' && u.pathname === '/storage/v1/bucket') return finir(json(200, [{ id: 'promo', name: 'promo', public: true }]))
    if (methode === 'POST' && u.pathname === '/storage/v1/object/list/promo') {
      const prefixe = JSON.parse(options.body).prefix || ''
      return finir(json(200, Object.keys(etat.objets).filter((cle) => cle.startsWith(prefixe)).map((cle) => ({ name: cle.slice(prefixe.length + (prefixe ? 1 : 0)), id: crypto.createHash('md5').update(cle).digest('hex'), metadata: { size: Buffer.from(etat.objets[cle], 'base64').length } }))))
    }
    const publicCle = (u.pathname.match(/^\\/storage\\/v1\\/object\\/public\\/promo\\/(.+)$/) || [])[1]
    if (methode === 'GET' && publicCle) return finir(new Response(Buffer.from(etat.objets[decodeURIComponent(publicCle)], 'base64'), { status: 200 }))
    const depot = (u.pathname.match(/^\\/storage\\/v1\\/object\\/promo\\/(.+)$/) || [])[1]
    if (methode === 'POST' && depot) { etat.objets[decodeURIComponent(depot)] = Buffer.from(options.body).toString('base64'); return finir(json(200, { ok: true })) }
  }
  throw new Error('appel inattendu ' + methode + ' ' + url)
}
`)

const texteDe = (cle) => attendu.find((a) => `${a.num}${a.variante}` === cle)?.texte || `texte ${cle}`
const heureDe = (cle) => attendu.find((a) => `${a.num}${a.variante}` === cle)?.quand || null
const mediaDe = (cle) => attendu.find((a) => `${a.num}${a.variante}` === cle)?.media
const BASE_CAS = [
  ['11A', 'published', 'ig11'], ['11B', 'published', 'ig11'], ['12A', 'published', 'ig12'], ['12B', 'published', 'ig12'],
  ['14A', 'draft', 'v10'], ['14B', 'draft', 'v10'], ['15A', 'draft', 'v02'], ['15B', 'draft', 'v02'], ['16A', 'draft', 'photo'], ['16B', 'draft', 'photo'],
]
const creerCas = (nom, { pending = false, perte = false, surcharges = {}, orphelines = [], pendingPour = [], refuserMajPour = [], refuserCreations = 0, ignorerMajPour = [], lectureEnEchec = {}, absents = [] } = {}) => {
  const dossier = path.join(BAC, nom)
  fs.mkdirSync(dossier, { recursive: true })
  const groupes = {}, journal = ['# Journal factice', '', '| Créé le | Programmé | Canal | N° | Variante | postGroupId |', '|---|---|---|---|---|---|']
  const medias = {}
  const ajouterGroupe = (id, cle, statut, media) => {
    const canal = CANAL[cle[2]], adresse = `https://media.test/${id}`
    medias[adresse] = path.resolve(MEDIAS[media])
    groupes[id] = { postGroupId: id, content: texteDe(cle), status: statut, scheduledTime: statut === 'draft' ? null : heureDe(cle), platforms: [`${canal}-1`], media: [{ url: adresse, status: 'ready' }] }
  }
  for (const [cle, statutBase, mediaBase] of BASE_CAS) {
    const [statut, media] = surcharges[cle] || [statutBase, mediaBase]
    const id = `initial-${cle}`
    ajouterGroupe(id, cle, statut, media)
    journal.push(`| 2026-09-15 | ${statut === 'draft' ? 'brouillon' : heureDe(cle)} | ${CANAL[cle[2]]} | ${cle.slice(0, 2)} | ${cle[2]} | ${id} |`)
  }
  for (const orpheline of orphelines) ajouterGroupe(orpheline.id, orpheline.cle, orpheline.statut, orpheline.media)
  for (const id of absents) delete groupes[id] // supprimée dans Publora, sa ligne reste au journal
  const journalF = path.join(dossier, 'journal.md'), etatF = path.join(dossier, 'etat.json')
  fs.writeFileSync(journalF, `${journal.join('\n')}\n`)
  fs.writeFileSync(etatF, JSON.stringify({
    connexions: [{ platformId: 'facebook-1', tokenStatus: 'valid' }, { platformId: 'instagram-1', tokenStatus: 'valid' }],
    groupes, medias, objets: {}, sequence: 0, pendingUneFois: pending, perdreCreationUneFois: perte, dernierEcrit: null,
    pendingPour, refuserMajPour, refuserCreations, ignorerMajPour, lectureEnEchec, ecritures: [], appels: 0,
  }))
  return { dossier, journalF, etatF }
}
const argumentsReels = (cas, maitre = path.join(BAC, 'plans', 'publications-serie-2.md')) => ['--import', pathToFileURL(FAUX_ECRITURE).href, path.join(BAC, 'scripts', 'publier-serie.mjs'), `--maitre=${maitre}`, `--journal=${cas.journalF}`, '--programmer']
// PUBLORA_QUOTA_MENSUEL aussi : une valeur héritée du lanceur ne doit pas changer le plafond des reprises du bac.
const CLES_ENV = ['PUBLORA_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PUBLORA_QUOTA_MENSUEL']
const environnementReel = (cas, maintenant, { cles = { PUBLORA_API_KEY: 'factice', NEXT_PUBLIC_SUPABASE_URL: 'https://faux.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'factice' }, lenteur = 0 } = {}) => {
  const env = { ...process.env }
  for (const cle of CLES_ENV) delete env[cle]
  return { ...env, ...cles, PUBLIER_SERIE_ETAT: cas.etatF, PUBLIER_SERIE_MAINTENANT: maintenant, PUBLIER_SERIE_LENTEUR_MS: String(lenteur) }
}
const lu = (cas, code, sortie) => ({ code, sortie, etat: JSON.parse(fs.readFileSync(cas.etatF, 'utf8')), journal: fs.readFileSync(cas.journalF, 'utf8') })
const lancerReel = (cas, maintenant, options) => {
  const res = spawnSync(process.execPath, argumentsReels(cas, options?.maitre), { cwd: BAC, encoding: 'utf8', timeout: 120000, env: environnementReel(cas, maintenant, options) })
  return lu(cas, res.status, `${res.stdout || ''}${res.stderr || ''}`)
}
const lancerReelEnFond = (cas, maintenant, options) => new Promise((resolve) => {
  const enfant = spawn(process.execPath, argumentsReels(cas), { cwd: BAC, env: environnementReel(cas, maintenant, options) })
  let sortie = ''
  enfant.stdout.on('data', (morceau) => { sortie += morceau })
  enfant.stderr.on('data', (morceau) => { sortie += morceau })
  enfant.on('close', (code) => resolve({ code, sortie }))
})
const empreinteBase64 = (base64) => crypto.createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex')
const empreinteFichier = (fichier) => crypto.createHash('sha256').update(fs.readFileSync(fichier)).digest('hex')
const objetDe = (g, etat) => etat.objets[decodeURIComponent(new URL(g.media[0].url).pathname.split('/promo/')[1])]
const empreinteDuGroupe = (g, etat) => { try { return empreinteBase64(objetDe(g, etat)) } catch { return null } }
const lignesDe = (journal, id) => journal.split(/\r?\n/).filter((ligne) => { const c = ligne.split('|').map((x) => x.trim()); return c.length >= 7 && c[6] === id })
const creationsDe = (etat, cle) => etat.ecritures.filter((e) => e.chemin.endsWith('/create-post') && e.corps.content === texteDe(cle))
const actifsDe = (etat, cle) => Object.values(etat.groupes).filter((g) => g.content === texteDe(cle) && ['scheduled', 'pending', 'processing', 'published', 'partially_published'].includes(g.status))
const resume = (reel) => `code ${reel.code} · écritures ${JSON.stringify(reel.etat.ecritures.map((e) => `${e.methode} ${e.chemin.split('/').slice(-1)[0]} ${e.corps.status || ''}`))}\n     ${reel.sortie.split('\n').slice(0, 24).join('\n     ')}`

let cas = creerCas('pending', { pending: true })
let reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
const cree14A = Object.values(reel.etat.groupes).find((g) => g.postGroupId.startsWith('cree-') && g.content === texteDe('14A'))
const cree15A = Object.values(reel.etat.groupes).find((g) => g.postGroupId.startsWith('cree-') && g.content === texteDe('15A'))
T('14 A et 15 A (brouillons portant les images de pub-10 et pub-02, présentes dans le bac) sont recréées avec le visuel exact déclaré par le maître', reel.code === 0 && cree14A && cree15A
  && empreinteDuGroupe(cree14A, reel.etat) === empreinteFichier(path.join(BAC, mediaDe('14A')))
  && empreinteDuGroupe(cree15A, reel.etat) === empreinteFichier(path.join(BAC, mediaDe('15A'))), resume(reel))
T('une relecture pending marque à reconfirmer et ne bloque pas les publications suivantes', /À RECONFIRMER · pub-14 A/.test(reel.sortie) && /PROGRAMMÉE · pub-14 B/.test(reel.sortie) && /PROGRAMMÉE · pub-15 A/.test(reel.sortie) && /à reconfirmer \| facebook \| 14 \| A/.test(reel.journal), reel.sortie)
const lignes14APending = cree14A ? lignesDe(reel.journal, cree14A.postGroupId) : []
T('après le soir pending : la nouvelle 14 A n’a qu’UNE ligne au journal, « à reconfirmer », sans aucune heure inscrite', lignes14APending.length === 1 && /\| à reconfirmer \|/.test(lignes14APending[0]) && !/\d{4}-\d{2}-\d{2}T/.test(lignes14APending[0]), lignes14APending.join('\n'))
reel = lancerReel(cas, '2026-09-18T18:00:00.000Z')
T('le soir suivant scheduled confirme le journal sans nouvelle publication', reel.code === 0 && /CONFIRMÉE · pub-14 A/.test(reel.sortie) && /2026-09-20T17:30:00\.000Z \| facebook \| 14 \| A/.test(reel.journal) && reel.etat.sequence === 3, reel.sortie)
const lignes14AConfirme = cree14A ? lignesDe(reel.journal, cree14A.postGroupId) : []
T('le soir suivant : « à reconfirmer » a disparu pour la 14 A, il ne reste qu’une ligne pour son identifiant, horodatée', lignes14AConfirme.length === 1 && !/à reconfirmer/.test(lignes14AConfirme[0]) && /\| 2026-09-20T17:30:00\.000Z \|/.test(lignes14AConfirme[0]), lignes14AConfirme.join('\n'))

cas = creerCas('update-post-pending', { surcharges: { '14A': ['scheduled', 'ig14'], '14B': ['draft', 'ig14'] }, pendingPour: ['initial-14B'] })
reel = lancerReel(cas, '2026-09-18T18:00:00.000Z')
const miseAJour14B = reel.etat.ecritures.filter((e) => e.chemin.endsWith('/update-post/initial-14B'))
T('brouillon 14 B déjà au visuel du maître : update-post envoie status « scheduled » à son heure, sans recréation', miseAJour14B.length === 1 && miseAJour14B[0].corps.status === 'scheduled' && miseAJour14B[0].corps.scheduledTime === heureDe('14B') && creationsDe(reel.etat, '14B').length === 0, resume(reel))
const lignes14BPending = lignesDe(reel.journal, 'initial-14B')
T('update-post relu pending : « À RECONFIRMER », la ligne de 14 B dit « à reconfirmer » et ne porte aucune heure', /À RECONFIRMER · pub-14 B/.test(reel.sortie) && lignes14BPending.length === 1 && /\| à reconfirmer \|/.test(lignes14BPending[0]) && !/\d{4}-\d{2}-\d{2}T/.test(lignes14BPending[0]), `${lignes14BPending.join('\n')}\n${resume(reel)}`)
reel = lancerReel(cas, '2026-09-19T18:00:00.000Z')
const lignes14BConfirme = lignesDe(reel.journal, 'initial-14B')
T('le soir suivant, 14 B relue scheduled : CONFIRMÉE, une seule ligne horodatée, jamais recréée ni remise à jour', reel.code === 0 && /CONFIRMÉE · pub-14 B/.test(reel.sortie) && lignes14BConfirme.length === 1 && /\| 2026-09-21T10:30:00\.000Z \|/.test(lignes14BConfirme[0]) && reel.etat.groupes['initial-14B'].status === 'scheduled' && reel.etat.ecritures.filter((e) => e.chemin.endsWith('/update-post/initial-14B')).length === 1 && creationsDe(reel.etat, '14B').length === 0, `${lignes14BConfirme.join('\n')}\n${resume(reel)}`)

cas = creerCas('reponse-perdue', { perte: true })
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
const apresPerte = reel.etat.sequence
for (const cle of ['14B', '15A', '15B', '16A', '16B']) {
  reel.etat.groupes[`initial-${cle}`].status = 'published'
  reel.etat.groupes[`initial-${cle}`].scheduledTime = heureDe(cle)
}
// Comme dans la réalité, la parution créée malgré la réponse perdue (14 A, le 20/09 à 19 h 30) est partie à son heure.
for (const groupe of Object.values(reel.etat.groupes)) {
  if (groupe.status === 'scheduled' && Date.parse(groupe.scheduledTime) <= Date.parse('2026-09-21T18:00:00.000Z')) groupe.status = 'published'
}
fs.writeFileSync(cas.etatF, JSON.stringify(reel.etat))
reel = lancerReel(cas, '2026-09-21T18:00:00.000Z')
T('réponse perdue après création : la parution est rattachée au journal avant le contrôle du créneau passé', apresPerte === 1 && reel.etat.sequence === 1 && /RETROUVÉE · pub-14 A/.test(reel.sortie) && !/^ALERTE BENJ :.*pub-14 A/m.test(reel.sortie) && /brouillon remplacé \| facebook \| 14 \| A/.test(reel.journal), reel.sortie)

cas = creerCas('trois-soirs-manques')
reel = lancerReel(cas, '2026-09-22T18:00:00.000Z')
T('trois soirs manqués : ALERTE BENJ en début de ligne et code 3 distinct', reel.code === 3 && /^ALERTE BENJ : créneau passé/m.test(reel.sortie), reel.sortie)
const MANQUEES = ['14A', '14B', '15A']
const nomDe = (cle) => `pub-${cle.slice(0, 2)} ${cle[2]} ${CANAL[cle[2]]}`
const marquesCreneau = (journal, cle) => journal.split(`créneau passé signalé : \`${nomDe(cle)} ${heureDe(cle)}\``).length - 1
T('trois soirs manqués : une ALERTE BENJ par créneau passé (14 A, 14 B, 15 A), une marque au journal pour chacun, aucun des trois programmé', MANQUEES.every((cle) => new RegExp(`^ALERTE BENJ : créneau passé : ${nomDe(cle)} `, 'm').test(reel.sortie) && marquesCreneau(reel.journal, cle) === 1 && creationsDe(reel.etat, cle).length === 0), `${reel.journal.slice(-900)}\n${resume(reel)}`)
reel = lancerReel(cas, '2026-09-22T18:05:00.000Z')
T('passage suivant : les créneaux déjà signalés ne donnent plus d’ALERTE BENJ (ATTENTION seulement), code 0, toujours une seule marque chacun, rien de programmé pour eux', reel.code === 0 && !/^ALERTE BENJ/m.test(reel.sortie) && MANQUEES.every((cle) => new RegExp(`^ATTENTION · créneau passé, déjà signalé : ${nomDe(cle)} `, 'm').test(reel.sortie) && marquesCreneau(reel.journal, cle) === 1 && creationsDe(reel.etat, cle).length === 0), resume(reel))
cas = creerCas('creneau-passe-puis-panne', { refuserCreations: 1 })
reel = lancerReel(cas, '2026-09-22T18:00:00.000Z')
T('créneaux passés puis panne de create-post (code 1) : aucune marque « signalé » écrite, puisque le lancement n’est pas allé au bout', reel.code === 1 && /^ALERTE BENJ : créneau passé : pub-14 A facebook/m.test(reel.sortie) && MANQUEES.every((cle) => marquesCreneau(reel.journal, cle) === 0), resume(reel))
reel = lancerReel(cas, '2026-09-22T18:05:00.000Z')
T('passage suivant : les trois créneaux passés sont de nouveau alertés, puis marqués, code 3', reel.code === 3 && MANQUEES.every((cle) => new RegExp(`^ALERTE BENJ : créneau passé : ${nomDe(cle)} `, 'm').test(reel.sortie) && marquesCreneau(reel.journal, cle) === 1), resume(reel))

cas = creerCas('du-16-au-26')
let invariants = true, detailInvariants = []
for (let jour = 16; jour <= 26; jour++) {
  const maintenant = `2026-09-${String(jour).padStart(2, '0')}T18:00:00.000Z`
  const etat = JSON.parse(fs.readFileSync(cas.etatF, 'utf8'))
  for (const groupe of Object.values(etat.groupes)) {
    if (groupe.status === 'scheduled' && Date.parse(groupe.scheduledTime) <= Date.parse(maintenant)) groupe.status = 'published'
  }
  fs.writeFileSync(cas.etatF, JSON.stringify(etat))
  const soir = lancerReel(cas, maintenant), groupes = Object.values(soir.etat.groupes)
  const occupants = groupes.filter((g) => ['scheduled', 'pending', 'processing'].includes(g.status))
  const actifs = groupes.filter((g) => ['scheduled', 'pending', 'processing', 'published', 'partially_published'].includes(g.status))
  const cles = actifs.map((g) => `${String(g.content).normalize('NFC').trim()}|${String(g.platforms[0]).split('-')[0]}`)
  const seizeMauvaisVisuel = groupes.filter((g) => [texteDe('16A'), texteDe('16B')].includes(g.content) && g.status !== 'draft' && (!g.media?.[0]?.url || !g.media[0].url.includes('pub-16-instagram')))
  const seizeBrouillonsPartis = [groupes.find((g) => g.postGroupId === 'initial-16A'), groupes.find((g) => g.postGroupId === 'initial-16B')].filter((g) => g && g.status !== 'draft')
  if (occupants.length > 3 || new Set(cles).size !== cles.length || seizeMauvaisVisuel.length || seizeBrouillonsPartis.length || soir.etat.depassements || soir.etat.refusPlafond) {
    invariants = false
    detailInvariants.push(`${jour}/09 occupants=${occupants.length} doublons=${cles.length - new Set(cles).size} mauvaisVisuel=${seizeMauvaisVisuel.length} brouillonsPartis=${seizeBrouillonsPartis.length} depassements=${soir.etat.depassements || 0} refusPlafond=${soir.etat.refusPlafond || 0}`)
  }
}
const dernierEtat = JSON.parse(fs.readFileSync(cas.etatF, 'utf8'))
const seizePubliees = Object.values(dernierEtat.groupes).filter((g) => [texteDe('16A'), texteDe('16B')].includes(g.content) && g.status === 'published')
T('du 16 au 26/09 : maximum 3 programmées, aucun doublon, n° 16 programmée avec la carte', invariants && seizePubliees.length === 2, detailInvariants.join(' ; '))

// Le maître RÉEL en écriture, le 17/09 au soir : 11 et 12 publiées, brouillons 14 à 16 au journal. Sur la copie neutre, ce
// soir-là programme 14 A, 14 B et 15 A ; sur le maître réel, rien ne doit partir.
if (!entreesBloquees.length) console.log('  ⏭  maître réel sans publication bloquée : passage en écriture sans objet (non compté)')
else {
  cas = creerCas('maitre-reel')
  const journalAvantReel = fs.readFileSync(cas.journalF, 'utf8')
  reel = lancerReel(cas, '2026-09-17T18:00:00.000Z', { maitre: MAITRE_REEL_BAC })
  jugerMaitreReel('maître réel en écriture, 17/09 au soir', { code: reel.code, sortie: reel.sortie, sansEcriture: reel.etat.ecritures.length === 0 && reel.journal === journalAvantReel, detailTexte: resume(reel) })
}

console.log('\n4 bis. Visuel faux sur une parution programmée ou publiée')
const ETAT_REEL = { '11A': ['published', 'v01'], '11B': ['scheduled', 'ig11'], '12A': ['scheduled', 'v04'], '12B': ['scheduled', 'ig12'] }
cas = creerCas('visuel-remplace', { surcharges: ETAT_REEL })
const journalAvantRemplacement = fs.readFileSync(cas.journalF, 'utf8')
reel = lancerReel(cas, '2026-09-16T20:45:00.000Z')
const indexBrouillon12A = reel.etat.ecritures.findIndex((e) => e.chemin.endsWith('/update-post/initial-12A') && e.corps.status === 'draft')
const indexCreation12A = reel.etat.ecritures.findIndex((e) => e.chemin.endsWith('/create-post') && e.corps.content === texteDe('12A'))
const nouvelle12A = actifsDe(reel.etat, '12A')
T('12 A programmée à plus de 3 h avec l’image de pub-04 : remise en brouillon (status draft) AVANT la création, plafond jamais dépassé', indexBrouillon12A >= 0 && indexCreation12A > indexBrouillon12A && !reel.etat.depassements && !reel.etat.refusPlafond && reel.etat.groupes['initial-12A']?.status === 'draft', resume(reel))
T('12 A : une seule nouvelle parution, programmée à la même heure, dont le média a l’empreinte de publications/serie-2/pub-12-instagram.jpg', nouvelle12A.length === 1 && nouvelle12A[0].postGroupId !== 'initial-12A' && nouvelle12A[0].status === 'scheduled' && nouvelle12A[0].scheduledTime === heureDe('12A') && empreinteDuGroupe(nouvelle12A[0], reel.etat) === empreinteFichier(MEDIAS.ig12) && reel.etat.ecritures.filter((e) => e.chemin.endsWith('/create-post')).length === 1, resume(reel))
const id12A = nouvelle12A[0]?.postGroupId || 'absent'
T('12 A au journal : l’ancienne « remplacé, visuel faux », la nouvelle horodatée, une note avec les deux identifiants', /\| remplacé, visuel faux \|/.test(lignesDe(reel.journal, 'initial-12A')[0] || '') && lignesDe(reel.journal, id12A).length === 1 && /\| 2026-09-18T17:30:00\.000Z \|/.test(lignesDe(reel.journal, id12A)[0] || '') && reel.journal.split(/\r?\n/).some((l) => /^>/.test(l) && l.includes('`initial-12A`') && l.includes(`\`${id12A}\``)), reel.journal.slice(journalAvantRemplacement.length - 200))
T('remplacement : ligne « ALERTE BENJ : visuel remplacé » en début de ligne pour 12 A, et 11 A publiée avec l’image de pub-01 signalée, code 3', reel.code === 3 && /^ALERTE BENJ : visuel remplacé : pub-12 A facebook/m.test(reel.sortie) && /^ALERTE BENJ : visuel faux sur une parution PUBLIÉE : pub-11 A facebook/m.test(reel.sortie) && reel.etat.groupes['initial-11A'].status === 'published' && !reel.etat.ecritures.some((e) => e.chemin.includes('initial-11A')), resume(reel))
const ecrituresApresRemplacement = reel.etat.ecritures.length
reel = lancerReel(cas, '2026-09-16T20:50:00.000Z')
T('passage suivant : aucune écriture, aucune ALERTE BENJ (11 A signalée une seule fois), 12 A déjà programmée, code 0', reel.code === 0 && !/^ALERTE BENJ/m.test(reel.sortie) && reel.etat.ecritures.length === ecrituresApresRemplacement && /déjà programmée : pub-12 A facebook/.test(reel.sortie) && lignesDe(reel.journal, id12A).length === 1, resume(reel))

cas = creerCas('visuel-faux-moins-de-3h', { surcharges: { '11B': ['published', 'ig11'], '12A': ['scheduled', 'v04'], '12B': ['scheduled', 'ig12'] } })
const journalAvant3h = fs.readFileSync(cas.journalF, 'utf8')
reel = lancerReel(cas, '2026-09-18T15:00:00.000Z')
T('12 A au mauvais visuel à moins de 3 h : aucune écriture sur 12 A, ligne du journal inchangée, « ALERTE BENJ : visuel faux … », code 3', reel.code === 3 && /^ALERTE BENJ : visuel faux : pub-12 A facebook.*moins de 3 h/m.test(reel.sortie) && !reel.etat.ecritures.some((e) => e.chemin.includes('initial-12A') || e.corps.content === texteDe('12A')) && reel.etat.groupes['initial-12A'].status === 'scheduled' && lignesDe(reel.journal, 'initial-12A')[0] === lignesDe(journalAvant3h, 'initial-12A')[0], resume(reel))

cas = creerCas('brouillon-refuse', { surcharges: { ...ETAT_REEL, '11A': ['published', 'ig11'] }, refuserMajPour: ['initial-12A'] })
reel = lancerReel(cas, '2026-09-16T20:45:00.000Z')
T('remise en brouillon refusée par Publora : aucune création, 12 A toujours programmée, ligne du journal horodatée, « ALERTE BENJ : visuel faux … », code 3', reel.code === 3 && /^ALERTE BENJ : visuel faux : pub-12 A facebook/m.test(reel.sortie) && creationsDe(reel.etat, '12A').length === 0 && reel.etat.groupes['initial-12A'].status === 'scheduled' && /\| 2026-09-18T17:30:00\.000Z \|/.test(lignesDe(reel.journal, 'initial-12A')[0] || ''), resume(reel))

cas = creerCas('creation-echouee', { surcharges: { ...ETAT_REEL, '11A': ['published', 'ig11'] }, refuserCreations: 1 })
reel = lancerReel(cas, '2026-09-16T20:45:00.000Z')
T('création refusée après la remise en brouillon : ancienne en brouillon, aucune 12 A programmée, « ALERTE BENJ : visuel faux … », code 3', reel.code === 3 && /^ALERTE BENJ : visuel faux : pub-12 A facebook.*n’a pas pu être créée/m.test(reel.sortie) && reel.etat.groupes['initial-12A'].status === 'draft' && actifsDe(reel.etat, '12A').length === 0 && /\| remis en brouillon, visuel faux \|/.test(lignesDe(reel.journal, 'initial-12A')[0] || ''), resume(reel))
reel = lancerReel(cas, '2026-09-16T20:50:00.000Z')
const reprise12A = actifsDe(reel.etat, '12A')
T('passage suivant : 12 A recréée une seule fois à son heure avec la carte 12, l’ancienne reste en brouillon, code 0', reel.code === 0 && reprise12A.length === 1 && reprise12A[0].scheduledTime === heureDe('12A') && empreinteDuGroupe(reprise12A[0], reel.etat) === empreinteFichier(MEDIAS.ig12) && reel.etat.groupes['initial-12A'].status === 'draft' && /\| brouillon remplacé \|/.test(lignesDe(reel.journal, 'initial-12A')[0] || '') && !reel.etat.depassements, resume(reel))

cas = creerCas('orpheline-visuel-faux', { orphelines: [{ id: 'orpheline-14A', cle: '14A', statut: 'scheduled', media: 'v10' }] })
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
const nouvelle14A = actifsDe(reel.etat, '14A')
T('orpheline 14 A programmée avec l’image de pub-10 : repassée en brouillon, recréée avec la carte 14, journal complet, « ALERTE BENJ : visuel remplacé », plafond tenu', reel.code === 3 && /^ALERTE BENJ : visuel remplacé : pub-14 A facebook/m.test(reel.sortie) && reel.etat.groupes['orpheline-14A'].status === 'draft' && nouvelle14A.length === 1 && nouvelle14A[0].scheduledTime === heureDe('14A') && empreinteDuGroupe(nouvelle14A[0], reel.etat) === empreinteFichier(MEDIAS.ig14) && /\| remplacé, visuel faux \|/.test(lignesDe(reel.journal, 'orpheline-14A')[0] || '') && /\| brouillon remplacé \|/.test(lignesDe(reel.journal, 'initial-14A')[0] || '') && !reel.etat.depassements && !reel.etat.refusPlafond, resume(reel))

console.log('\n4 ter. Pannes de Publora : jamais de silence, jamais de doublon')
// B2b : update-post répond 200 mais la parution reste programmée. Seule la RELECTURE draft autorise la création.
cas = creerCas('brouillon-non-applique', { surcharges: { ...ETAT_REEL, '11A': ['published', 'ig11'] }, ignorerMajPour: ['initial-12A'] })
reel = lancerReel(cas, '2026-09-16T20:45:00.000Z')
T('update-post répond 200 sans rien changer (12 A relue scheduled) : aucune création, une seule 12 A active (l’ancienne), journal non marqué, « ALERTE BENJ : visuel faux … la remise en brouillon a échoué », code 3', reel.code === 3
  && /^ALERTE BENJ : visuel faux : pub-12 A facebook.*la remise en brouillon a échoué/m.test(reel.sortie)
  && reel.etat.ecritures.some((e) => e.chemin.endsWith('/update-post/initial-12A') && e.corps.status === 'draft')
  && creationsDe(reel.etat, '12A').length === 0 && actifsDe(reel.etat, '12A').length === 1 && reel.etat.groupes['initial-12A'].status === 'scheduled'
  && /\| 2026-09-18T17:30:00\.000Z \|/.test(lignesDe(reel.journal, 'initial-12A')[0] || '') && !reel.etat.depassements, resume(reel))

// B2e : la nouvelle parution d'un remplacement relue « pending » n'est pas inscrite à son heure.
cas = creerCas('remplacement-pending', { surcharges: { ...ETAT_REEL, '11A': ['published', 'ig11'] }, pendingPour: ['cree-001'] })
reel = lancerReel(cas, '2026-09-16T20:45:00.000Z')
const lignesCree001 = lignesDe(reel.journal, 'cree-001')
T('remplacement dont la nouvelle 12 A (cree-001) est relue « pending » : UNE ligne « à reconfirmer » sans aucune heure, l’ancienne « remplacé, visuel faux », « ALERTE BENJ : visuel remplacé … à reconfirmer », code 3', reel.code === 3
  && actifsDe(reel.etat, '12A').map((g) => g.postGroupId).join() === 'cree-001'
  && lignesCree001.length === 1 && /\| à reconfirmer \|/.test(lignesCree001[0]) && !/\d{4}-\d{2}-\d{2}T/.test(lignesCree001[0])
  && /\| remplacé, visuel faux \|/.test(lignesDe(reel.journal, 'initial-12A')[0] || '')
  && /^ALERTE BENJ : visuel remplacé : pub-12 A facebook.*à reconfirmer/m.test(reel.sortie), `${lignesCree001.join('\n')}\n${resume(reel)}`)
const ecrituresRemplacementPending = reel.etat.ecritures.length
reel = lancerReel(cas, '2026-09-16T20:50:00.000Z')
const lignesCree001Confirmee = lignesDe(reel.journal, 'cree-001')
T('passage suivant, cree-001 relue scheduled : CONFIRMÉE, une seule ligne pour son identifiant, horodatée, aucune écriture, code 0', reel.code === 0
  && /CONFIRMÉE · pub-12 A facebook/.test(reel.sortie) && lignesCree001Confirmee.length === 1 && /\| 2026-09-18T17:30:00\.000Z \|/.test(lignesCree001Confirmee[0])
  && reel.etat.ecritures.length === ecrituresRemplacementPending && actifsDe(reel.etat, '12A').length === 1, `${lignesCree001Confirmee.join('\n')}\n${resume(reel)}`)

// C1c : orpheline retrouvée par son texte, en échec de publication.
cas = creerCas('orpheline-en-echec', { orphelines: [{ id: 'orpheline-14A', cle: '14A', statut: 'partially_published', media: 'ig14' }] })
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
T('brouillon 14 A au journal + orpheline de même texte en « partially_published » : « ALERTE BENJ : statut Publora « partially_published » … (orpheline rattachée au journal) », code 3, rien de créé ni modifié pour 14 A', reel.code === 3
  && /^ALERTE BENJ : statut Publora « partially_published » : pub-14 A facebook · orpheline-14A \(orpheline rattachée au journal\)/m.test(reel.sortie)
  && creationsDe(reel.etat, '14A').length === 0 && !reel.etat.ecritures.some((e) => /initial-14A|orpheline-14A/.test(e.chemin)), resume(reel))

// C1e : une parution en échec est alertée à CHAQUE passage.
cas = creerCas('echec-deux-passages', { surcharges: { '12A': ['failed', 'ig12'] } })
const passagesEchec = ['2026-09-17T18:00:00.000Z', '2026-09-17T18:05:00.000Z'].map((maintenant) => {
  const passage = lancerReel(cas, maintenant)
  return { code: passage.code, alerte: /^ALERTE BENJ : statut Publora « failed » : pub-12 A facebook · initial-12A/m.test(passage.sortie), passage }
})
const dernierEchec = passagesEchec.at(-1).passage
T('12 A « failed » au journal, deux passages réels : code 3 et « ALERTE BENJ : statut Publora « failed » » les deux fois, jamais recréée ni modifiée', passagesEchec.map((p) => p.code).join() === '3,3' && passagesEchec.every((p) => p.alerte)
  && creationsDe(dernierEchec.etat, '12A').length === 0 && !dernierEchec.etat.ecritures.some((e) => e.chemin.includes('initial-12A')), passagesEchec.map((p) => resume(p.passage)).join('\n'))

// Parution journalisée supprimée dans Publora : 404 et absente de la liste. Alerte une fois, jamais recréée.
cas = creerCas('brouillon-supprime', { absents: ['initial-14A'] })
const marquesIntrouvable = (journal) => journal.split('parution introuvable signalée : `initial-14A`').length - 1
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
T('brouillon 14 A journalisé mais supprimé dans Publora : « ALERTE BENJ : parution introuvable », code 3, rien de recréé, une marque au journal', reel.code === 3
  && /^ALERTE BENJ : parution introuvable : pub-14 A facebook · initial-14A/m.test(reel.sortie) && creationsDe(reel.etat, '14A').length === 0 && marquesIntrouvable(reel.journal) === 1, resume(reel))
reel = lancerReel(cas, '2026-09-18T18:00:00.000Z')
T('passage suivant : plus d’ALERTE BENJ pour 14 A (déjà signalée), code 0, toujours rien de recréé, toujours une seule marque', reel.code === 0 && !/^ALERTE BENJ/m.test(reel.sortie)
  && /^ATTENTION · pub-14 A facebook : initial-14A introuvable dans Publora \(HTTP 404\), déjà signalée/m.test(reel.sortie) && creationsDe(reel.etat, '14A').length === 0 && marquesIntrouvable(reel.journal) === 1, resume(reel))

// Lecture en échec d'une parution qui existe encore (500, ou 404 alors qu'elle est listée) : alerte à chaque passage.
cas = creerCas('lecture-en-echec', { surcharges: { '12A': ['scheduled', 'ig12'], '12B': ['scheduled', 'ig12'] }, lectureEnEchec: { 'initial-12A': 500, 'initial-12B': 404 } })
const passagesLecture = ['2026-09-17T18:00:00.000Z', '2026-09-17T18:05:00.000Z'].map((maintenant) => lancerReel(cas, maintenant))
T('get-post en HTTP 500 (12 A) et en 404 alors qu’elle est listée (12 B) : « ALERTE BENJ : lecture impossible » pour chacune aux DEUX passages, code 3, jamais recréées ni modifiées, aucune marque', passagesLecture.every((p) => p.code === 3
  && /^ALERTE BENJ : lecture impossible : pub-12 A facebook · initial-12A illisible dans Publora \(HTTP 500\)/m.test(p.sortie)
  && /^ALERTE BENJ : lecture impossible : pub-12 B instagram · initial-12B illisible dans Publora \(HTTP 404\)/m.test(p.sortie))
  && ['12A', '12B'].every((cle) => creationsDe(passagesLecture[1].etat, cle).length === 0 && !passagesLecture[1].etat.ecritures.some((e) => e.chemin.includes(`initial-${cle}`)))
  && !/introuvable signalée/.test(passagesLecture[1].journal), passagesLecture.map(resume).join('\n'))

// Parution encore programmée après son heure : elle n'est pas partie.
cas = creerCas('pas-partie', { surcharges: { '11B': ['scheduled', 'ig11'] } })
const passagesRetard = ['2026-09-17T10:40:00.000Z', '2026-09-17T18:00:00.000Z', '2026-09-18T18:00:00.000Z'].map((maintenant) => lancerReel(cas, maintenant))
const alerteRetard11B = (p) => /^ALERTE BENJ : parution pas partie : pub-11 B instagram · initial-11B toujours « scheduled »/m.test(p.sortie)
T('11 B encore « scheduled » 10 min après son heure (17/09 12 h 30) : aucune alerte, code 0', passagesRetard[0].code === 0 && !/^ALERTE BENJ/m.test(passagesRetard[0].sortie), resume(passagesRetard[0]))
T('11 B encore « scheduled » 7 h 30 puis 31 h 30 après son heure : « ALERTE BENJ : parution pas partie » aux deux passages, code 3, jamais modifiée ni recréée', passagesRetard.slice(1).every((p) => p.code === 3 && alerteRetard11B(p))
  && creationsDe(passagesRetard[2].etat, '11B').length === 0 && !passagesRetard[2].etat.ecritures.some((e) => e.chemin.includes('initial-11B')), passagesRetard.slice(1).map(resume).join('\n'))
cas = creerCas('orphelines-pas-parties', { orphelines: [{ id: 'orpheline-14A', cle: '14A', statut: 'scheduled', media: 'ig14' }, { id: 'orpheline-14B', cle: '14B', statut: 'pending', media: 'ig14' }] })
reel = lancerReel(cas, '2026-09-21T18:00:00.000Z')
T('orphelines 14 A « scheduled » et 14 B « pending » après leur heure : « ALERTE BENJ : parution pas partie » pour chacune, rattachées sans écriture chez Publora, code 3', reel.code === 3
  && /^ALERTE BENJ : parution pas partie : pub-14 A facebook \(orpheline\) · orpheline-14A toujours « scheduled »/m.test(reel.sortie)
  && /^ALERTE BENJ : parution pas partie : pub-14 B instagram \(orpheline\) · orpheline-14B toujours « pending »/m.test(reel.sortie)
  && ['14A', '14B'].every((cle) => creationsDe(reel.etat, cle).length === 0) && !reel.etat.ecritures.some((e) => /orpheline-14|initial-14/.test(e.chemin)), resume(reel))

console.log('\n4 quater. Clés : environnement du processus, sinon .env.local')
cas = creerCas('env-absent')
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z', { cles: {} })
T('ni variables ni .env.local : code 1, message qui nomme PUBLORA_API_KEY et .env.local, aucun appel réseau', reel.code === 1 && /PUBLORA_API_KEY absente/.test(reel.sortie) && /\.env\.local/.test(reel.sortie) && reel.etat.appels === 0, resume(reel))
const ENV_LOCAL_BAC = path.join(BAC, '.env.local')
fs.writeFileSync(ENV_LOCAL_BAC, [
  '# Fichier du juge : valeurs factices',
  'AUTRE_CLE=sans-rapport',
  'PUBLORA_API_KEY="cle-publora-du-fichier"   # commentaire',
  "export NEXT_PUBLIC_SUPABASE_URL='https://faux.supabase.co'",
  'SUPABASE_SERVICE_ROLE_KEY=cle-supabase-du-fichier # commentaire en fin de ligne',
  '',
].join('\r\n'))
cas = creerCas('env-fichier')
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z', { cles: {} })
T('processus sans variables, .env.local présent : les trois clés sont lues dans le fichier (guillemets, export, commentaires), la reprise se fait', reel.code === 0 && JSON.stringify(reel.etat.clesPublora) === JSON.stringify(['cle-publora-du-fichier']) && JSON.stringify(reel.etat.clesSupabase) === JSON.stringify(['cle-supabase-du-fichier']) && reel.etat.ecritures.filter((e) => e.chemin.endsWith('/create-post')).length === 3, resume(reel))
T('aucune valeur de clé n’est imprimée', !/cle-publora-du-fichier|cle-supabase-du-fichier/.test(reel.sortie), reel.sortie.slice(0, 400))
cas = creerCas('env-priorite')
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z', { cles: { PUBLORA_API_KEY: 'cle-de-l-environnement' } })
T('variable présente dans le processus : elle passe avant .env.local, les autres clés viennent du fichier', reel.code === 0 && JSON.stringify(reel.etat.clesPublora) === JSON.stringify(['cle-de-l-environnement']) && JSON.stringify(reel.etat.clesSupabase) === JSON.stringify(['cle-supabase-du-fichier']), resume(reel))
fs.rmSync(ENV_LOCAL_BAC)

console.log('\n4 quinquies. Un seul lancement à la fois')
cas = creerCas('verrou-tenu')
const verrou = `${cas.journalF}.lock`
const journalAvantVerrou = fs.readFileSync(cas.journalF, 'utf8')
fs.writeFileSync(verrou, JSON.stringify({ pid: process.pid, depuis: '2026-09-17T17:59:00.000Z' }))
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
T('verrou tenu par un lancement vivant : code 1, message clair, aucun appel, journal intact, verrou laissé à son tenant', reel.code === 1 && /tient le verrou/.test(reel.sortie) && reel.etat.appels === 0 && reel.journal === journalAvantVerrou && fs.existsSync(verrou) && JSON.parse(fs.readFileSync(verrou, 'utf8')).pid === process.pid, resume(reel))
const pidMort = spawnSync(process.execPath, ['-e', '0']).pid
fs.writeFileSync(verrou, JSON.stringify({ pid: pidMort, depuis: '2026-09-17T17:59:00.000Z' }))
reel = lancerReel(cas, '2026-09-17T18:00:00.000Z')
T('verrou abandonné (processus mort) : repris, la reprise se fait, verrou rendu à la fin', reel.code === 0 && /Verrou abandonné repris/.test(reel.sortie) && reel.etat.ecritures.filter((e) => e.chemin.endsWith('/create-post')).length === 3 && !fs.existsSync(verrou), resume(reel))
cas = creerCas('deux-lancements')
const [premier, second] = await Promise.all([
  lancerReelEnFond(cas, '2026-09-17T18:00:00.000Z', { lenteur: 120 }),
  lancerReelEnFond(cas, '2026-09-17T18:00:00.000Z', { lenteur: 120 }),
])
const apresDeux = lu(cas, null, '')
const refuses = [premier, second].filter((x) => x.code === 1 && /tient le verrou/.test(x.sortie))
const passes = [premier, second].filter((x) => x.code === 0)
const idsJournal = lignesJournalIds(apresDeux.journal)
function lignesJournalIds (journal) { return journal.split(/\r?\n/).map((l) => l.split('|').map((c) => c.trim())).filter((c) => c.length >= 7 && /^\d{4}-\d{2}-\d{2}$/.test(c[1])).map((c) => c[6]) }
T('deux lancements simultanés : un seul passe, l’autre sort en code 1 ; trois créations en tout, chaque identifiant une seule fois au journal, verrou rendu', refuses.length === 1 && passes.length === 1 && apresDeux.etat.ecritures.filter((e) => e.chemin.endsWith('/create-post')).length === 3 && new Set(idsJournal).size === idsJournal.length && !fs.existsSync(`${cas.journalF}.lock`), `${premier.code} ${second.code}\n${premier.sortie.slice(0, 300)}\n${second.sortie.slice(0, 300)}`)

T('le code documente 0, 1 et 3', /Codes de sortie[^\n]*0[^\n]*1[^\n]*3/.test(src))
fin()
