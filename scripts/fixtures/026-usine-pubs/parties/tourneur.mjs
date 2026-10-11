// La partie « tourneur » de usine-pubs-qa (026-199) : UP-6 à UP-9. Le tourneur scripts/usine/pubs.mjs de la racine jugée est LANCÉ (jamais importé), comme
// l'unité le lance — `node --import ./scripts/ts-loader.mjs scripts/usine/pubs.mjs --une-passe --base=<url>`, cwd = une racine déployée d'essai, HOME et TMPDIR
// à part, un PATH qui ne porte que les doublures du juge —, contre un faux Presti, un faux stockage et un faux site de marque sur 127.0.0.1.
// Le juge consigne CHAQUE requête reçue par les faux serveurs et CHAQUE appel d'outil (journal des doublures), à l'heure monotone du système : il ne se fie à
// aucun journal écrit par le code jugé. Linux seulement : ailleurs, usine-pubs-qa se relance sur l'usine.
import fs from 'node:fs'
import path from 'node:path'
import { DEPOT, ICI, SENTINELLES, TOKEN_FORMAT, donnees, court } from '../commun.mjs'
import { demarrerBanc, adresseMorte } from '../faux-presti.mjs'
import { preparerBac, arbre, difference, OUTILS_PAYANTS } from '../bac.mjs'
import { MP4, JPEG, sha256 } from '../doublures-outils/commun.mjs'
import { Bilan, rendre } from '../sortie.mjs'

const D = donnees('http://127.0.0.1:0')
const { A, DECISION, ART } = D.ids
const CLE = 'maison-temoin-seize'
const UA_RECENSEUR = (() => { try { return /UA_RECENSEUR\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(DEPOT, 'lib/agents/acquisition/contrat.ts'), 'utf8'))[1] } catch { return 'PrestiRecenseur/1.0 (+https://prestiapp.fr/confidentialite#prospection)' } })()
const EXTRAIT = 'Plateau en chêne massif de trente millimètres, huilé à la main.'
const MARQUEUR = 'Table basse Témoin-Seize'
const TEXTE_VOIX = 'Bonjour, atelier Témoin-Seize à Rennes, devis gratuit.'
const PHRASE_ACCORD = 'vous pouvez utiliser nos photos pour un essai vidéo'
const HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${MARQUEUR}</title><meta property="og:image" content="{{IMAGE}}"><style>.cache{display:none}</style><script>var suivi = "trace-script-jamais-lue";</script></head><body><h1>${MARQUEUR}</h1><p>${EXTRAIT}</p><p>Quatre pieds en acier, fabriquée en France.</p><p>Livraison en dix jours.</p></body></html>`
const IMAGE = JPEG('produit-marque', 4096)
const PREALABLES_OK = fs.readFileSync(path.join(ICI, 'prealables-conforme.md'), 'utf8')
const PREALABLES_MANQUE = fs.readFileSync(path.join(ICI, 'prealables-a-manque.md'), 'utf8')
const CHEMINS_PHOTOS = ['public/sites-demo/macon/images/parement-720.webp', 'public/sites-demo/carreleur/images/douche-720.webp', 'public/sites-demo/peintre/images/preparation-720.webp', 'public/sites-demo/menuisier/images/escalier-tournant-720.webp']
const PAYANTS = OUTILS_PAYANTS

/** Les photos du pack d'essai : celles du jeu 026-126, lues par leur chemin (jamais copiées dans les fixtures) ; à défaut, des octets synthétiques. */
function photosEssai() {
  return CHEMINS_PHOTOS.map((rel, i) => { let octets = null; try { octets = fs.readFileSync(path.join(DEPOT, rel)) } catch { /* absente d'un arbre réduit */ } return { nom: `photo-${i + 1}.jpg`, octets: octets ?? JPEG(`photo-${i + 1}`) } })
}
const PHOTOS = photosEssai()
const jobPack = (banc) => {
  const base = D.packs()[0]
  const matiere = { ...base.matiere, voix: 'synthese', texte_voix: TEXTE_VOIX, photos: base.matiere.photos.map((p, i) => ({ ...p, url: `${banc.web}/storage/v1/object/public/artisan-media/${ART}/photo-${i + 1}.jpg` })) }
  return { type: 'pack', id: A, pack: { pack_id: A, matiere, site: 'https://prestiapp.fr/p/menuiserie-temoin' }, photos: PHOTOS.map((p) => ({ nom: p.nom, url: banc.signerLecture(p.octets) })) }
}
const jobStudio = (banc) => ({ type: 'studio', decision: DECISION, marque_cle: CLE, page_produit: `${banc.web}/marque/produit.html`, accord: { message_id: SENTINELLES.message_id, recu_le: '2026-09-30T09:12:00Z', extrait: `Bonjour, oui, ${PHRASE_ACCORD}, avec plaisir.` }, echantillons_refuses: [] })

// ── les scénarios ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const SCENARIOS = [
  { nom: 'pack', type: 'pack' },
  { nom: 'pack-juge-rouge', type: 'pack', mode: { juge_pack: 1 } },
  { nom: 'pack-fabriquer-echec', type: 'pack', mode: { fabriquer: 'echec' } },
  { nom: 'pack-verrou', type: 'pack', mode: { lent: 1800 }, simultane: true },
  { nom: 'pack-sans-hyperframes', type: 'pack', outils: { hyperframes: false } },
  { nom: 'pack-stockage-panne', type: 'pack', banc: { depot: 'coupe' }, reprise: true },
  { nom: 'pack-bus-mort', type: 'pack', baseMorte: true },
  { nom: 'pack-bus-500', type: 'pack', banc: { presti: '500' } },
  { nom: 'studio', type: 'studio' },
  { nom: 'studio-garde-3', type: 'studio', prealables: 'manque' },
  { nom: 'studio-juge-rouge', type: 'studio', mode: { juge_studio: 1 } },
  { nom: 'studio-virtuel', type: 'studio', mode: { codex: 'virtuel' } },
  { nom: 'studio-extrait-faux', type: 'studio', mode: { codex: 'extrait_faux' } },
  { nom: 'studio-robots', type: 'studio', banc: { robots: 'interdit' } },
  { nom: 'studio-sans-hyperframes', type: 'studio', outils: { hyperframes: false } },
]
const PAR_CRITERE = {
  'UP-6': ['pack', 'pack-juge-rouge', 'pack-fabriquer-echec', 'pack-verrou'],
  'UP-7': ['studio', 'studio-garde-3', 'studio-juge-rouge', 'studio-virtuel', 'studio-extrait-faux', 'studio-robots'],
  'UP-9': ['pack-sans-hyperframes', 'pack-stockage-panne', 'pack-bus-mort', 'pack-bus-500', 'studio-sans-hyperframes'],
}
export const scenariosDe = (ids) => (ids.includes('UP-8') ? SCENARIOS.map((x) => x.nom) : [...new Set(ids.flatMap((i) => PAR_CRITERE[i] ?? []))])

/** Joue un scénario : les passes du tourneur, ce que les faux serveurs ont reçu, ce que les doublures ont consigné, les arbres avant et après. */
async function observer(def, racine) {
  const jeton = TOKEN_FORMAT('studio')
  const banc = await demarrerBanc({ jeton, page: { html: HTML, image: IMAGE } })
  const bac = preparerBac({ racine, nom: def.nom, mode: def.mode ?? {}, prealables: def.type === 'studio' ? (def.prealables === 'manque' ? PREALABLES_MANQUE : PREALABLES_OK) : null, jeton, outils: def.outils ?? {}, extrait: EXTRAIT })
  Object.assign(banc.mode, def.banc ?? {})
  const empiler = () => banc.file.push(def.type === 'pack' ? jobPack(banc) : jobStudio(banc))
  empiler()
  if (def.simultane) banc.servirToujours = true
  const avant = { home: arbre(bac.home), bac: arbre(bac.bac), tmp: arbre(bac.tmp) }
  const url = def.baseMorte ? await adresseMorte() : banc.presti
  let passes
  try {
    if (def.simultane) passes = await Promise.all([bac.lancer(url), bac.lancer(url)])
    else passes = [await bac.lancer(url)]
    if (def.reprise) { banc.mode.depot = null; empiler(); passes.push(await bac.lancer(url)) }
  } finally { await banc.arreter() }
  const apres = { home: arbre(bac.home), bac: arbre(bac.bac), tmp: arbre(bac.tmp) }
  return {
    def, jeton, bac, passes, avant, apres,
    requetes: banc.requetes.map((r) => ({ ...r })), refus: [...banc.refus],
    depots: [...banc.depots].map(([chemin, v]) => ({ chemin, sha256: v.sha256, taille: v.taille })),
    journal: bac.evenements(),
  }
}

async function jouerParLots(defs, racine, taille = 5) {
  const sortie = {}
  for (let i = 0; i < defs.length; i += taille) {
    const lot = await Promise.all(defs.slice(i, i + taille).map(async (d) => { try { return [d.nom, await observer(d, racine)] } catch (e) { return [d.nom, { def: d, erreur: String(e?.stack || e).split('\n').slice(0, 3).join(' | ') }] } }))
    for (const [n, o] of lot) sortie[n] = o
  }
  return sortie
}

// ── la lecture d'un scénario ───────────────────────────────────────────────────────────────────────────────────────────────
const etiquette = (q) => (q.serveur === 'presti' ? q.chemin.split('/').pop() : q.serveur === 'stockage' ? (q.chemin.startsWith('/lire/') ? 'lire' : 'put') : q.chemin === '/robots.txt' ? 'robots' : q.chemin.endsWith('.html') ? 'page' : 'image')
function evenements(o) {
  const r = o.requetes.map((q) => ({ ...q, src: q.serveur, quoi: etiquette(q) }))
  const j = o.journal.map((e) => ({ ...e, src: 'outil' }))
  return [...r, ...j].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0))
}
const outil = (ev, quoi) => ev.filter((e) => e.src === 'outil' && e.quoi === quoi)
const req = (ev, serveur, quoi) => ev.filter((e) => e.src === serveur && e.quoi === quoi)
const premier = (l) => l[0]
const avantQue = (a, b) => !!a && (!b || a.t < b.t)
const sortieDePasse = (o) => o.passes.map((p) => `${p.stdout}\n${p.stderr}`).join('\n')
const PILE = /Unhandled|Uncaught|unhandledRejection|node:internal\/|^\s+at .+:\d+:\d+\)?\s*$|TypeError|ReferenceError|SyntaxError/m
const rendusDe = (ev) => req(ev, 'presti', 'rendu').map((e) => e.corps)
const lignesNonVides = (o) => sortieDePasse(o).split('\n').filter((l) => l.trim()).length
const ecartDossier = (modeDossier) => (modeDossier & 0o777) === 0o700

const expPack = (n) => ({
  videos: [1, 2, 3].map((i) => ({ nom: `video-${i}.mp4`, type: 'video/mp4', octets: MP4(`video-${i}-${A}`) })),
  visuels: [1, 2, 3].map((i) => ({ nom: `visuel-${i}.jpg`, type: 'image/jpeg', octets: JPEG(`visuel-${i}-${A}`) })),
})[n]
const SIX = () => [...expPack('videos'), ...expPack('visuels')].map((f) => ({ ...f, chemin: `packs-pubs/${A}/livraison/${f.nom}` }))

/** Le scénario `n`, ou null (non joué : un échec au juge complet ; en erreur : toujours un échec). */
function joue(O, n, strict, b) {
  const o = O[n]
  if (!o) { if (strict) b.v(false, '', `scénario ${n} non joué`); return null }
  if (o.erreur) { b.v(false, '', `scénario ${n} : ${o.erreur}`); return null }
  return o
}

// ── UP-6 : un pack ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function up6(O, s, strict) {
  const b = Bilan()
  const manque = (n) => !!joue(O, n, strict, b)
  if (manque('pack')) {
    const o = O.pack, ev = evenements(o), home = o.bac.home
    const dossier = path.join(home, 'presti-pubs', A)
    b.v(o.passes[0].code === 0 && !PILE.test(sortieDePasse(o)), 'un pack payé : le passage finit en code 0, sans exception', `le passage finit en code ${o.passes[0].code}${PILE.test(sortieDePasse(o)) ? ' avec une trace de pile' : ''} : ${court(o.passes[0].stderr || o.passes[0].stdout, 160)}`)
    const t = premier(ev.filter((e) => e.src === 'presti'))
    b.v(t && t.quoi === 'travail' && t.methode === 'GET' && t.autorise, 'GET travail d\'abord, avec le jeton de l\'agent', `la première requête n'est pas GET travail avec Authorization : ${t ? `${t.methode} ${t.chemin} autorisé=${t.autorise}` : 'aucune requête'}`)
    // les photos, dans ~/presti-pubs/<pack>/ (dossiers 0700)
    const modes = ['presti-pubs', `presti-pubs/${A}`, `presti-pubs/${A}/photos`].map((r) => o.apres.home.get(r))
    b.v(modes.every((m) => m && m.type === 'dossier' && ecartDossier(m.mode)), '~/presti-pubs/<pack>/ et photos/ : dossiers en 0700', `dossiers de travail : ${['presti-pubs', 'presti-pubs/<pack>', 'presti-pubs/<pack>/photos'].map((n, i) => `${n} ${modes[i] ? modes[i].mode.toString(8) : 'absent'}`).join(', ')} (0700 attendu)`)
    let photos = []
    try { photos = fs.readdirSync(path.join(dossier, 'photos')).map((f) => sha256(fs.readFileSync(path.join(dossier, 'photos', f)))).sort() } catch { /* absent */ }
    b.v(JSON.stringify(photos) === JSON.stringify(PHOTOS.map((p) => sha256(p.octets)).sort()), 'les quatre photos sont téléchargées par leurs adresses signées, octets intacts', `photos de ~/presti-pubs/<pack>/photos : ${photos.length} fichier(s), empreintes ≠ celles des quatre photos servies`)
    b.v(req(ev, 'stockage', 'lire').length === 4 && req(ev, 'stockage', 'lire').every((e) => !e.autorise), 'les photos sont lues par des adresses signées, sans le jeton de l\'agent', `lectures du stockage : ${req(ev, 'stockage', 'lire').length}, dont ${req(ev, 'stockage', 'lire').filter((e) => e.autorise).length} avec le jeton de l'agent (4 sans jeton attendues)`)
    let pj = null; try { pj = JSON.parse(fs.readFileSync(path.join(dossier, 'pack.json'), 'utf8')) } catch { /* absent */ }
    const loc = pj?.matiere?.photos
    b.v(pj && pj.pack_id === A && Array.isArray(loc) && loc.length === 4 && loc.every((p, i) => typeof p.fichier === 'string' && !p.url && p.role === D.packs()[0].matiere.photos[i].role && fs.existsSync(path.resolve(dossier, p.fichier))), 'pack.json écrit : photos locales (fichier), rôles conservés, aucune adresse', `pack.json : ${pj ? `pack_id ${pj.pack_id}, ${loc?.length} photos, ${loc?.every((p) => !p.url) ? '' : 'des adresses y figurent, '}${loc?.every((p) => typeof p.fichier === 'string' && fs.existsSync(path.resolve(dossier, p.fichier))) ? '' : 'une photo locale manque'}` : 'absent ou illisible'} (photos locales et rôles du travail attendus : fabriquer.mjs refuse une adresse)`)
    // la voix avant la fabrication
    const tts = outil(ev, 'hyperframes').filter((e) => e.sous === 'tts')
    b.v(tts.length >= 1 && tts.every((e) => e.voix === 'ff_siwis') && tts.some((e) => String(e.texte).includes(TEXTE_VOIX)), 'la voix : hyperframes tts --voice ff_siwis sur le texte du pack', `voix : ${tts.length} appel(s) de hyperframes tts, voix ${[...new Set(tts.map((e) => e.voix))].join(', ') || '—'} ; ff_siwis sur le texte_voix du pack attendu`)
    const fab = outil(ev, 'fabriquer')
    b.v(fab.length === 1 && fab[0].argv.length === 1 && path.resolve(fab[0].argv[0]) === dossier && fab[0].pack_id === A, 'node scripts/pack-pub/fabriquer.mjs <dossier> lancé une fois', `fabriquer.mjs : ${fab.length} appel(s)${fab[0] ? `, arguments « ${court(fab[0].argv.join(' '), 80)} »` : ''} (un appel avec le dossier du pack attendu)`)
    b.v(avantQue(premier(tts), premier(fab)) && fab[0]?.voix_attendue && fab[0].voix_presente && !fab[0].photo_par_adresse && fab[0].photos_locales === 4, 'la voix est produite AVANT la fabrication (voix.mp3 présent quand fabriquer démarre)', `ordre : ${tts.length ? '' : 'aucune voix produite ; '}${avantQue(premier(tts), premier(fab)) ? '' : 'la voix vient après la fabrication ; '}${fab[0]?.voix_presente ? '' : 'voix.mp3 absent quand fabriquer démarre ; '}${fab[0]?.photos_locales === 4 ? '' : `photos locales vues : ${fab[0]?.photos_locales}`}`)
    const juge = outil(ev, 'pub-locale-qa')
    const depots = req(ev, 'presti', 'depot'), rendus = rendusDe(ev)
    b.v(juge.length >= 1 && juge[0].argv.includes('--partie=complet') && juge[0].argv.some((a) => a === `--dossier=${dossier}`) && avantQue(premier(fab), premier(juge)) && avantQue(juge[0], premier(depots)) && juge[0].code === 0, 'pub-locale-qa --partie=complet --dossier=<pack> lancé après fabriquer, vert, AVANT toute demande de dépôt', `pub-locale-qa : ${juge.length} appel(s)${juge[0] ? `, code ${juge[0].code}, arguments « ${court(juge[0].argv.join(' '), 80)} »` : ''}${avantQue(juge[0], premier(depots)) ? '' : ', pas avant le premier dépôt'}`)
    // le dépôt
    const annonces = depots.flatMap((d) => d.corps?.fichiers ?? [])
    const attendus = SIX()
    b.v(depots.length >= 1 && depots.every((d) => d.corps?.travail === A) && JSON.stringify(annonces.map((f) => f.chemin).sort()) === JSON.stringify(attendus.map((f) => f.chemin).sort()) && annonces.every((f) => { const e = attendus.find((x) => x.chemin === f.chemin); return e && e.type === f.type && e.octets.length === f.taille }), 'depot : les six fichiers sous packs-pubs/<pack>/livraison/, type et taille justes', `depot : fichiers annoncés [${court(annonces.map((f) => `${f.chemin.split('/').pop()} ${f.type} ${f.taille}`).join(', '), 160)}] ; trois MP4 et trois visuels, avec leur type et leur taille réelle, attendus`)
    b.v(o.refus.length === 0, 'le faux Presti n\'a refusé aucun dépôt ni aucun rendu', `le faux Presti a refusé : ${o.refus.map((r) => `${r.route} (${r.raison})`).join(' ; ')}`)
    b.v(attendus.every((f) => o.depots.find((d) => d.chemin === f.chemin)?.sha256 === sha256(f.octets)), 'les six fichiers sont déposés par les adresses signées, octets intacts', `dépôts reçus par le faux stockage : ${o.depots.length}, empreintes ≠ celles des fichiers fabriqués (six attendus)`)
    const ok = rendus.filter((r) => r?.ok === true)
    b.v(ok.length === 1 && ok[0].travail === A && ok[0].juge?.nom === 'pub-locale-qa' && ok[0].juge.code === 0 && ok[0].juge.empreinte_journal === juge[0]?.stdout_sha256, 'rendu : ok, juge pub-locale-qa code 0 et l\'empreinte du journal du juge', `rendu : ${rendus.length} appel(s), ${ok.length} ok${ok[0] ? ` ; juge ${JSON.stringify(ok[0].juge)}` : ''} (juge pub-locale-qa, code 0, empreinte_journal = SHA-256 de la sortie du juge, attendus)`)
    b.v(ok.length === 1 && Array.isArray(ok[0].fichiers) && ok[0].fichiers.length === 6 && attendus.every((f) => ok[0].fichiers.find((x) => x.chemin === f.chemin)?.sha256 === sha256(f.octets)), 'rendu : les empreintes SHA-256 des six fichiers', 'rendu : les empreintes des six fichiers manquent ou sont fausses')
    b.v(avantQue(premier(depots), premier(req(ev, 'stockage', 'put'))) && avantQue(req(ev, 'stockage', 'put').at(-1), req(ev, 'presti', 'rendu').at(-1)), 'ordre : depot, puis les envois, puis rendu', 'ordre faux : depot → envois par les adresses signées → rendu attendu')
    b.v(outil(ev, 'repli').length === 0 && outil(ev, 'payant').length === 0, `aucun script de repli du poste (exporter, deposer) ni outil payant (${PAYANTS.join(', ')})`, `un script de repli du poste ou un outil payant est lancé : ${[...outil(ev, 'repli'), ...outil(ev, 'payant')].map((e) => e.nom).join(', ')}`)
  }
  if (manque('pack-juge-rouge')) {
    const o = O['pack-juge-rouge'], ev = evenements(o), rendus = rendusDe(ev)
    b.v(outil(ev, 'pub-locale-qa').some((e) => e.code === 1) && req(ev, 'presti', 'depot').length === 0 && req(ev, 'stockage', 'put').length === 0, 'juge rouge : aucune demande de dépôt, aucun envoi', `juge rouge : ${req(ev, 'presti', 'depot').length} demande(s) de dépôt, ${req(ev, 'stockage', 'put').length} envoi(s) (aucun attendu)`)
    b.v(rendus.length >= 1 && rendus.every((r) => r?.ok === false && typeof r.raison === 'string' && r.raison.trim()), 'juge rouge : un rendu en échec, avec sa raison', `juge rouge : rendus ${court(JSON.stringify(rendus), 120)} (ok: false et une raison attendus, jamais ok: true)`)
    b.v(o.passes[0].code === 0 && !PILE.test(sortieDePasse(o)), '', `juge rouge : code ${o.passes[0].code} ou trace de pile`)
  }
  if (manque('pack-fabriquer-echec')) {
    const o = O['pack-fabriquer-echec'], ev = evenements(o), rendus = rendusDe(ev)
    b.v(outil(ev, 'fabriquer').length === 1 && req(ev, 'presti', 'depot').length === 0 && rendus.length >= 1 && rendus.every((r) => r?.ok === false && r.raison), 'fabriquer en échec : rien à déposer, un rendu en échec', `fabriquer en échec : ${req(ev, 'presti', 'depot').length} demande(s) de dépôt, rendus ${court(JSON.stringify(rendus), 100)} (aucun dépôt et ok: false attendus)`)
  }
  if (manque('pack-verrou')) {
    const o = O['pack-verrou'], ev = evenements(o)
    const ok = rendusDe(ev).filter((r) => r?.ok === true)
    b.v(outil(ev, 'fabriquer').length === 1 && ok.length === 1 && o.passes.every((p) => p.code === 0), 'un verrou par travail : deux passages simultanés, une seule fabrication', `deux passages simultanés : ${outil(ev, 'fabriquer').length} fabrication(s), ${ok.length} rendu(s) ok (une et un attendus), codes ${o.passes.map((p) => p.code).join('/')}`)
  }
  rendre(s, 'UP-6', b)
}

// ── UP-7 : un échantillon du Studio ──────────────────────────────────────────────────────────────────────────────────────
const APRES_GARDE = ['codex', 'hyperframes', 'ffmpeg', 'monter', 'pub-qa']
function rienApresGarde(ev) {
  const g = premier(outil(ev, 'garde'))
  if (!g) return { ok: false, detail: 'la garde n\'a pas été lancée' }
  const apres = ev.filter((e) => e.t > g.t && ((e.src === 'outil' && APRES_GARDE.includes(e.quoi)) || (e.src === 'presti' && (e.quoi === 'depot')) || (e.src === 'stockage' && e.quoi === 'put')))
  return { ok: apres.length === 0, detail: apres.map((e) => e.quoi).join(', ') }
}
function up7(O, s, strict) {
  const b = Bilan()
  const manque = (n) => !!joue(O, n, strict, b)
  const echecSansDepot = (n, libelle, { montage = false } = {}) => {
    if (!manque(n)) return
    const o = O[n], ev = evenements(o), rendus = rendusDe(ev)
    b.v(req(ev, 'presti', 'depot').length === 0 && req(ev, 'stockage', 'put').length === 0 && (montage || (outil(ev, 'monter').length === 0 && outil(ev, 'pub-qa').length === 0)) && rendus.length >= 1 && rendus.every((r) => r?.ok === false && typeof r.raison === 'string' && r.raison.trim()), `${libelle} : ${montage ? 'aucun dépôt' : 'ni montage, ni dépôt'}, un rendu en échec`, `${libelle} : ${outil(ev, 'monter').length} montage(s), ${req(ev, 'presti', 'depot').length} dépôt(s), rendus ${court(JSON.stringify(rendus), 100)} (rien monté ni déposé, ok: false et une raison attendus)`)
    b.v(o.passes[0].code === 0 && !PILE.test(sortieDePasse(o)), '', `${libelle} : code ${o.passes[0].code} ou trace de pile`)
  }
  if (manque('studio')) {
    const o = O.studio, ev = evenements(o), home = o.bac.home
    const vault = path.join(home, 'presti-studio', CLE), marque = path.join(vault, 'marques', CLE)
    b.v(o.passes[0].code === 0 && !PILE.test(sortieDePasse(o)), 'un échantillon : le passage finit en code 0, sans exception', `le passage finit en code ${o.passes[0].code}${PILE.test(sortieDePasse(o)) ? ' avec une trace de pile' : ''} : ${court(o.passes[0].stderr || o.passes[0].stdout, 160)}`)
    // le vault
    const dv = o.apres.home.get(`presti-studio/${CLE}`)
    b.v(dv && dv.type === 'dossier' && ecartDossier(dv.mode), 'le vault ~/presti-studio/<marque>/ est en 0700', `vault : ${dv ? `mode ${dv.mode.toString(8)}` : 'absent'} (0700 attendu)`)
    const lire = (r) => { try { return fs.readFileSync(path.join(vault, r)) } catch { return null } }
    const prealables = lire('prealables.md'), registre = lire('registre-refus.csv')
    b.v(prealables && prealables.toString('utf8') === PREALABLES_OK && registre && registre.length === 0, 'vault : prealables.md copié de docs/studio/prealables.md du code déployé, registre-refus.csv vide', `vault : prealables.md ${prealables ? (prealables.toString('utf8') === PREALABLES_OK ? 'conforme' : 'différent de docs/studio/prealables.md') : 'absent'}, registre-refus.csv ${registre ? `${registre.length} octets` : 'absent'}`)
    const accord = lire(`marques/${CLE}/accord-photos.md`)?.toString('utf8') ?? ''
    b.v(accord.includes(SENTINELLES.message_id.replace(/[<>]/g, '')) && /Reçu le\s*:?\**\s*30\/09\/2026/.test(accord) && accord.includes(PHRASE_ACCORD), 'vault : accord-photos.md (l\'extrait, le Message-ID et la date rendus par la route)', `vault : accord-photos.md ${accord ? 'sans le Message-ID, la date ou l\'extrait' : 'absent'}`)
    const nomPage = fs.existsSync(marque) ? fs.readdirSync(marque).find((f) => /^page-produit-\d{4}-\d{2}-\d{2}\.html$/.test(f)) : null
    const aujourdhui = new Date().toISOString().slice(0, 10)
    const pageLue = nomPage ? fs.readFileSync(path.join(marque, nomPage), 'utf8') : ''
    b.v(nomPage === `page-produit-${aujourdhui}.html` && pageLue.includes(EXTRAIT) && pageLue.includes(MARQUEUR), 'vault : la page produit copiée, datée du jour', `vault : page produit ${nomPage ? `« ${nomPage} » (attendue page-produit-${aujourdhui}.html)${pageLue.includes(EXTRAIT) ? '' : ', contenu ≠ page servie'}` : 'absente'}`)
    const photo = lire(`marques/${CLE}/produit.jpg`)
    b.v(photo && sha256(photo) === sha256(IMAGE), 'vault : produit.jpg est la vraie photo de la page (octets intacts)', `vault : produit.jpg ${photo ? 'différent de l\'image de la page' : 'absent'}`)
    // les règles du Lecteur
    const web = ev.filter((e) => e.src === 'web')
    b.v(web.length >= 3 && web[0].quoi === 'robots' && web[1].quoi === 'page' && web.every((e) => e.ua === UA_RECENSEUR), 'robots.txt d\'abord, puis la page, puis la photo ; UA_RECENSEUR partout', `lecture de la marque : ${web.map((e) => `${e.quoi}`).join(' → ') || 'aucune requête'} ; User-Agent ${[...new Set(web.map((e) => e.ua))].map((u) => court(u, 30)).join(' | ')} (robots, page, image avec UA_RECENSEUR attendus)`)
    const ecarts = web.slice(1).map((e, i) => Number(e.t - web[i].t) / 1e6)
    b.v(ecarts.length >= 2 && ecarts.every((x) => x >= 900), '1 requête par seconde au plus vers la marque', `écarts entre requêtes vers la marque : ${ecarts.map((x) => `${Math.round(x)} ms`).join(', ')} (1 000 ms au moins attendus)`)
    // la garde d'abord
    const garde = outil(ev, 'garde')
    const vaultAvant = new Set((garde[0]?.vault_avant ?? []).map((f) => f.chemin))
    b.v(garde.length === 1 && garde[0].argv.includes(`--marque=${CLE}`) && garde[0].argv.some((a) => a === `--vault=${vault}`) && garde[0].code === 0 && ['prealables.md', 'registre-refus.csv', `marques/${CLE}/accord-photos.md`, `marques/${CLE}/produit.jpg`].every((f) => vaultAvant.has(f)) && [...vaultAvant].some((f) => /\/page-produit-\d{4}-\d{2}-\d{2}\.html$/.test(f)), 'garde.mjs --marque=<cle> --vault=<vault> lancé quand le vault est rempli ; le code 0 la laisse passer', `garde : ${garde.length} appel(s)${garde[0] ? `, code ${garde[0].code}, arguments « ${court(garde[0].argv.join(' '), 90)} », vault ${vaultAvant.size} fichier(s) à son lancement` : ''} (le vault complet et --marque/--vault attendus)`)
    const g0 = premier(garde)
    const tot = ev.filter((e) => g0 && e.t < g0.t && ((e.src === 'outil' && APRES_GARDE.includes(e.quoi)) || (e.src === 'presti' && e.quoi === 'depot')))
    b.v(g0 && tot.length === 0, 'la garde précède le lecteur, la voix, le montage, le juge et le dépôt', `la garde vient trop tard : ${tot.map((e) => e.quoi).join(', ')} l'a précédée`)
    // le lecteur « studio » : la seule page produit
    const codex = outil(ev, 'codex')
    const donneesCodex = codex.map((c) => c.entree).join('\n')
    const fuites = [['le Message-ID de la marque', SENTINELLES.message_id.replace(/[<>]/g, '')], ['l\'adresse de la marque', SENTINELLES.courriel_marque], ['le téléphone de la marque', SENTINELLES.telephone_marque], ['la réponse d\'accord', PHRASE_ACCORD], ['le courriel du client', SENTINELLES.courriel_client], ['le téléphone de l\'artisan', SENTINELLES.telephone_artisan]].filter(([, x]) => donneesCodex.includes(x) || codex.some((c) => c.argv.join(' ').includes(x))).map(([n]) => n)
    b.v(codex.length >= 1 && donneesCodex.includes(MARQUEUR) && donneesCodex.includes(EXTRAIT) && fuites.length === 0, 'le script est écrit par le lecteur studio sur la seule page produit : aucune réponse, adresse ni Message-ID n\'atteint le lanceur', `lecteur : ${codex.length} appel(s) du lanceur${codex.length && !donneesCodex.includes(EXTRAIT) ? ', la page produit n\'est pas dans ses données' : ''}${fuites.length ? `, ses données portent ${fuites.join(', ')}` : ''}`)
    b.v(!/<script|<style|trace-script-jamais-lue/.test(donneesCodex), '', 'lecteur : du code de la page (script, style) est parti dans les données')
    // la voix, le montage, le juge
    const tts = outil(ev, 'hyperframes').filter((e) => e.sous === 'tts')
    const scriptEcrit = (() => { try { return JSON.parse(fs.readFileSync(path.join(marque, 'echantillon-1', 'script.json'), 'utf8')) } catch { return null } })()
    b.v(tts.length >= 1 && tts.every((e) => e.voix === 'ff_siwis') && scriptEcrit && tts.some((e) => String(e.texte).includes(scriptEcrit.lignes?.[0] ?? '\u0000')), 'la voix : hyperframes tts --voice ff_siwis sur les lignes du script', `voix : ${tts.length} appel(s), voix ${[...new Set(tts.map((e) => e.voix))].join(', ') || '—'}${scriptEcrit ? '' : ' ; script.json absent'} (ff_siwis sur les lignes du script attendu)`)
    const monter = outil(ev, 'monter'), qa = outil(ev, 'pub-qa'), depots = req(ev, 'presti', 'depot')
    const ech = path.join(marque, 'echantillon-1')
    b.v(monter.length === 1 && path.resolve(monter[0].argv[0] ?? '') === ech && avantQue(premier(tts), monter[0]) && monter[0].script?.marque === CLE && monter[0].script.presentateur_virtuel === false && Array.isArray(monter[0].script.allegations) && monter[0].script.allegations.length >= 1 && monter[0].voix_taille > 0 && monter[0].produit_sha === sha256(IMAGE), 'monter.mjs <echantillon> : script (marque, allégations, presentateur_virtuel: false), voix et photo réelle', `monter.mjs : ${monter.length} appel(s)${monter[0] ? `, script ${court(JSON.stringify(monter[0].script), 90)}, voix ${monter[0].voix_taille} octets, photo ${monter[0].produit_sha === sha256(IMAGE) ? 'réelle' : 'autre'}` : ''}`)
    b.v(qa.length >= 1 && path.resolve(qa[0].argv[0] ?? '') === ech && avantQue(monter[0], qa[0]) && avantQue(qa[0], premier(depots)) && qa[0].code === 0, 'pub-qa <echantillon> lancé après monter, vert, AVANT tout dépôt', `pub-qa : ${qa.length} appel(s)${qa[0] ? `, code ${qa[0].code}` : ''}${avantQue(qa[0], premier(depots)) ? '' : ', pas avant le premier dépôt'}`)
    const annonces = depots.flatMap((d) => d.corps?.fichiers ?? [])
    const f = annonces[0]
    b.v(depots.length >= 1 && depots[0].corps?.travail === DECISION && annonces.length === 1 && new RegExp(`^packs-pubs/studio/${CLE}/echantillon-[1-9][0-9]*\\.mp4$`).test(f.chemin) && f.type === 'video/mp4' && f.taille > 0 && f.taille <= 3 * 1024 * 1024, 'depot : un MP4 de 3 Mo au plus sous packs-pubs/studio/<marque>/', `depot : ${court(JSON.stringify(depots.map((d) => d.corps)), 160)} (un video/mp4 de 3 Mo au plus sous packs-pubs/studio/${CLE}/echantillon-<n>.mp4 attendu)`)
    const ok = rendusDe(ev).filter((r) => r?.ok === true)
    b.v(ok.length === 1 && ok[0].travail === DECISION && ok[0].juge?.nom === 'pub-qa' && ok[0].juge.code === 0 && ok[0].juge.empreinte_journal === qa[0]?.stdout_sha256 && ok[0].fichiers?.length === 1 && ok[0].fichiers[0].sha256 === o.depots[0]?.sha256, 'rendu : ok, juge pub-qa code 0, empreinte du journal et SHA-256 du MP4', `rendu : ${ok.length} ok${ok[0] ? ` ; juge ${JSON.stringify(ok[0].juge)}` : ''} (pub-qa code 0, empreinte_journal et sha256 justes attendus)`)
    b.v(o.refus.length === 0, '', `le faux Presti a refusé : ${o.refus.map((r) => `${r.route} (${r.raison})`).join(' ; ')}`)
    // aucun outil payant, aucun repli
    const payant = outil(ev, 'payant')
    b.v(payant.length === 0 && outil(ev, 'repli').length === 0, `aucun outil payant (${PAYANTS.join(', ')}) ni script de repli du poste`, `outil payant ou repli lancé : ${[...payant.map((e) => e.nom), ...outil(ev, 'repli').map((e) => e.nom)].join(', ')}`)
  }
  if (manque('studio-garde-3')) {
    const o = O['studio-garde-3'], ev = evenements(o), g = premier(outil(ev, 'garde'))
    b.v(g && g.code === 3, 'préalables à manque : la garde refuse (code 3)', `préalables à manque : la garde ${g ? `rend ${g.code}` : 'n\'est pas lancée'} (3 attendu)`)
    const r = rienApresGarde(ev)
    b.v(r.ok, 'garde en code 3 : rien d\'autre (ni lecteur, ni voix, ni montage, ni juge, ni dépôt)', `garde en code 3 : le tourneur continue (${r.detail})`)
    echecSansDepot('studio-garde-3', 'garde en code 3')
  }
  echecSansDepot('studio-juge-rouge', 'pub-qa rouge', { montage: true })
  if (manque('studio-juge-rouge')) b.v(outil(evenements(O['studio-juge-rouge']), 'pub-qa').some((e) => e.code === 1), '', 'pub-qa rouge : le juge n\'a pas été lancé')
  if (manque('studio-virtuel')) { echecSansDepot('studio-virtuel', 'script avec un présentateur virtuel'); b.v(outil(evenements(O['studio-virtuel']), 'monter').length === 0, '', 'un script avec presentateur_virtuel: true est monté') }
  if (manque('studio-extrait-faux')) echecSansDepot('studio-extrait-faux', 'allégation dont l\'extrait n\'est pas sur la page')
  if (manque('studio-robots')) {
    const o = O['studio-robots'], ev = evenements(o), web = ev.filter((e) => e.src === 'web')
    b.v(web.length >= 1 && web.every((e) => e.quoi === 'robots') && outil(ev, 'codex').length === 0, 'robots.txt qui interdit : la page n\'est pas lue, rien n\'est écrit par le lecteur', `robots.txt interdit : le tourneur lit ${web.map((e) => e.quoi).join(', ')} et lance le lecteur ${outil(ev, 'codex').length} fois`)
    echecSansDepot('studio-robots', 'robots.txt qui interdit')
  }
  rendre(s, 'UP-7', b)
}

// ── UP-8 : secrets et données ────────────────────────────────────────────────────────────────────────────────────────────
function up8(O, s, strict) {
  const b = Bilan()
  const joues = Object.values(O).filter((o) => o && !o.erreur)
  if (strict) for (const [n, o] of Object.entries(O)) if (o?.erreur) b.v(false, '', `scénario ${n} : ${o.erreur}`)
  if (!joues.length) { s.echoue('UP-8', 'aucun scénario joué'); return }
  const secrets = (o) => [o.jeton, o.jeton.slice('pa_studio_'.length)]
  const SENT = [['message_id', SENTINELLES.message_id.replace(/[<>]/g, '')], ['courriel_marque', SENTINELLES.courriel_marque], ['telephone_marque', SENTINELLES.telephone_marque], ['accord', PHRASE_ACCORD], ['courriel_client', SENTINELLES.courriel_client], ['telephone_artisan', SENTINELLES.telephone_artisan], ['courriel_artisan', SENTINELLES.courriel_artisan]]
  const fuiteJeton = [], fuiteSent = [], envs = [], horsLieux = [], tmpRestes = [], jetonAilleurs = []
  for (const o of joues) {
    const sortie = sortieDePasse(o), ev = evenements(o)
    if (secrets(o).some((x) => sortie.includes(x))) fuiteJeton.push(`${o.def.nom} : la sortie du tourneur`)
    for (const e of ev.filter((x) => x.src === 'outil')) {
      const argv = JSON.stringify(e.argv ?? []) + (e.entree ?? '')
      if (secrets(o).some((x) => argv.includes(x))) fuiteJeton.push(`${o.def.nom} : argv de ${e.quoi}`)
      if (e.env_jeton) envs.push(`${o.def.nom} : ${e.quoi}`)
    }
    for (const e of ev.filter((x) => x.src === 'stockage' || x.src === 'web')) if (e.autorise) jetonAilleurs.push(`${o.def.nom} : ${e.src}`)
    for (const [n, x] of SENT) if (sortie.includes(x)) fuiteSent.push(`${o.def.nom} : ${n} dans la sortie`)
    // les écritures : HOME (presti-pubs et presti-studio seulement), la racine déployée (rien), le dossier temporaire (vide à la fin)
    const d = difference(o.avant.home, o.apres.home), nouveaux = [...d.nouveaux, ...d.modifies].filter((r) => !/^(presti-pubs|presti-studio)(\/|$)/.test(r) && !/^travail(\/relais(\/|$)|$)/.test(r)) // + ~/travail/relais : la mémoire et le journal du relais d'IA (05/10/2026), non sensibles
    if (nouveaux.length) horsLieux.push(`${o.def.nom} : ${court(nouveaux.slice(0, 3).join(', '), 80)} sous HOME`)
    const db = difference(o.avant.bac, o.apres.bac)
    if (db.nouveaux.length || db.modifies.length) horsLieux.push(`${o.def.nom} : ${court([...db.nouveaux, ...db.modifies].slice(0, 3).join(', '), 80)} dans la racine déployée`)
    const tmp = [...o.apres.tmp.keys()]
    if (tmp.length) tmpRestes.push(`${o.def.nom} : ${court(tmp.slice(0, 3).join(', '), 80)}`)
  }
  // un tourneur qui ne joint jamais le bus ne fuit rien : UP-8 ne prouve rien tant qu'il n'a pas parlé au faux Presti au moins une fois
  b.v(joues.some((o) => o.requetes.some((r) => r.serveur === 'presti')), '', 'aucun passage n\'a joint le faux Presti : le tourneur n\'a rien fait, UP-8 ne prouve rien')
  b.v(!fuiteJeton.length, `le jeton d'agent (tiré au hasard) n'apparaît dans aucune sortie, aucun argv ni aucune donnée de lanceur, sur ${joues.length} passages`, `le jeton d'agent apparaît : ${[...new Set(fuiteJeton)].slice(0, 3).join(' ; ')}`)
  b.v(!envs.length, 'aucun outil lancé ne reçoit le jeton dans son environnement', `le jeton est transmis dans l'environnement d'un outil enfant : ${[...new Set(envs)].slice(0, 3).join(' ; ')} (les enfants reçoivent un environnement sans secret)`)
  b.v(!jetonAilleurs.length, 'le jeton n\'est envoyé qu\'au faux Presti (jamais au stockage ni à la marque)', `le jeton est envoyé à un autre serveur que Presti : ${[...new Set(jetonAilleurs)].slice(0, 3).join(' ; ')}`)
  b.v(!fuiteSent.length, 'la sortie ne contient ni adresse, ni numéro, ni texte de réponse, ni Message-ID (chaînes piégées)', `la sortie du tourneur contient : ${[...new Set(fuiteSent)].slice(0, 3).join(' ; ')}`)
  b.v(!horsLieux.length, 'rien n\'est écrit hors de ~/presti-pubs/, ~/presti-studio/ et du dossier temporaire', `écriture hors des lieux permis : ${horsLieux.slice(0, 3).join(' ; ')}`)
  b.v(!tmpRestes.length, 'le dossier temporaire du passage est effacé à la fin', `le dossier temporaire n'est pas vidé : ${tmpRestes.slice(0, 3).join(' ; ')}`)
  rendre(s, 'UP-8', b)
}

// ── UP-9 : les pannes ─────────────────────────────────────────────────────────────────────────────────────────────────────
function up9(O, s, strict) {
  const b = Bilan()
  const manque = (n) => !!joue(O, n, strict, b)
  const propre = (n, libelle) => {
    const o = O[n]
    const code = o.passes.every((p) => p.code === 0 && p.signal === null && !p.delai), pile = PILE.test(sortieDePasse(o)), lignes = lignesNonVides(o)
    b.v(code && !pile && lignes >= 1, `${libelle} : code 0, aucune exception, une ligne de journal`, `${libelle} : ${code ? '' : `code ${o.passes.map((p) => p.code ?? p.signal).join('/')} ; `}${pile ? 'trace de pile ; ' : ''}${lignes >= 1 ? '' : 'aucune ligne de journal'}${pile ? court(sortieDePasse(o), 140) : ''}`)
  }
  if (manque('pack-bus-mort')) { propre('pack-bus-mort', 'bus injoignable'); b.v(O['pack-bus-mort'].journal.every((e) => !['fabriquer', 'monter', 'hyperframes'].includes(e.quoi)), '', 'bus injoignable : le tourneur fabrique quand même') }
  if (manque('pack-bus-500')) propre('pack-bus-500', 'bus en erreur 500')
  if (manque('pack-stockage-panne')) {
    const o = O['pack-stockage-panne']
    propre('pack-stockage-panne', 'stockage injoignable au dépôt')
    const ev = evenements(o), ok = rendusDe(ev).filter((r) => r?.ok === true)
    const avantReprise = ev.filter((e) => e.src === 'presti' && e.quoi === 'travail')
    b.v(ok.length === 1 && avantReprise.length >= 2 && outil(ev, 'fabriquer').length >= 2, 'stockage injoignable : le travail est repris au passage suivant et mené à son terme', `reprise : ${outil(ev, 'fabriquer').length} fabrication(s), ${ok.length} rendu(s) ok (le passage suivant doit refaire le travail et le rendre : un verrou ne doit pas rester)`)
    b.v(rendusDe(ev).slice(0, -1).every((r) => r?.ok !== true), '', 'stockage injoignable : un rendu ok part sans dépôt (faux vert)')
  }
  for (const [n, libelle] of [['pack-sans-hyperframes', 'hyperframes absent (pack)'], ['studio-sans-hyperframes', 'hyperframes absent (échantillon)']]) {
    if (!manque(n)) continue
    const o = O[n], ev = evenements(o), rendus = rendusDe(ev)
    propre(n, libelle)
    b.v(rendus.length >= 1 && rendus.every((r) => r?.ok === false && /outil_absent/.test(String(r.raison))) && req(ev, 'presti', 'depot').length === 0, `${libelle} → rendu en échec outil_absent, aucun dépôt, jamais un faux vert`, `${libelle} : rendus ${court(JSON.stringify(rendus), 120)}, ${req(ev, 'presti', 'depot').length} dépôt(s) (ok: false, raison outil_absent et aucun dépôt attendus)`)
  }
  rendre(s, 'UP-9', b)
}

/** Le verdict des quatre critères. `strict` : un scénario non joué est un échec (le juge complet) ; sinon, les critères se jugent sur ce qui a été joué. */
export async function jouerTourneur({ racine, s, ids = ['UP-6', 'UP-7', 'UP-8', 'UP-9'], scenarios = null }) {
  const noms = scenarios ?? scenariosDe(ids)
  const strict = scenarios === null
  const O = await jouerParLots(SCENARIOS.filter((d) => noms.includes(d.nom)), racine)
  try {
    if (ids.includes('UP-6')) up6(O, s, strict)
    if (ids.includes('UP-7')) up7(O, s, strict)
    if (ids.includes('UP-8')) up8(O, s, strict)
    if (ids.includes('UP-9')) up9(O, s, strict)
  } finally { for (const o of Object.values(O)) { try { o.bac?.arreter() } catch { /* nettoyage */ } } }
  return O
}
