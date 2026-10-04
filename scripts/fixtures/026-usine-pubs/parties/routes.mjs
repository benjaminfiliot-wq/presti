// La partie « routes » de usine-pubs-qa (026-199) : UP-2 à UP-5. La sonde (sonde-routes.mjs) fait tourner les TROIS vraies routes de la racine
// jugée dans un processus à part, contre un faux Supabase (PostgREST + stockage) : elle OBSERVE (statuts, corps, appels reçus par le faux, appels
// aux doublures), le juge ci-dessous en tire les verdicts. Le juge ne croit aucun journal écrit par le code jugé : il compte ce que le faux a reçu.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { ICI, DEPOT, TRAVAIL, ROUTES, SENTINELLES, AGENT, BUCKET, BUCKET_PHOTOS, donnees, hasard, court, vider } from '../commun.mjs'

const D = donnees('http://127.0.0.1:0')
const { A, B, ART, DECISION } = D.ids
const EXTRAIT_MAX = 400
const CINQ_XX = (s) => typeof s === 'number' && s >= 500
const REFUS_GARDE = new Set([401, 403, 423])

/** Lance la sonde sur la racine jugée → { obs, fautes } ou { erreur }. */
export async function observer(racine) {
  const dossier = vider(path.join(TRAVAIL, `routes-${hasard(8)}`))
  const nonce = hasard(24), sortie = path.join(dossier, 'obs.json'), cfg = path.join(dossier, 'cfg.json')
  fs.writeFileSync(cfg, JSON.stringify({ nonce, sortie, racine, depot: DEPOT, fichiers: ROUTES }))
  const args = ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(path.join(DEPOT, 'scripts', 'ts-loader.mjs')).href, '--import', pathToFileURL(path.join(ICI, 'crochet.mjs')).href, path.join(ICI, 'sonde-routes.mjs'), cfg]
  const env = { PATH: process.env.PATH, UP_RACINE: racine, UP_DEPOT: DEPOT }
  for (const k of ['SystemRoot', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'TMPDIR']) if (process.env[k]) env[k] = process.env[k]
  const r = await new Promise((ok) => {
    let sortieStd = '', erreurStd = ''
    const e = spawn(process.execPath, args, { cwd: racine, env, windowsHide: true })
    e.stdout.on('data', (d) => { sortieStd += d }); e.stderr.on('data', (d) => { erreurStd += d })
    const minuteur = setTimeout(() => { try { e.kill('SIGKILL') } catch { /* déjà fini */ } }, 120_000)
    e.on('close', (code) => { clearTimeout(minuteur); ok({ code, sortieStd, erreurStd }) })
    e.on('error', (x) => { clearTimeout(minuteur); ok({ code: 1, sortieStd, erreurStd: String(x) }) })
  })
  let lu = null
  try { lu = JSON.parse(fs.readFileSync(sortie, 'utf8')) } catch { /* sonde tombée avant d'écrire */ }
  fs.rmSync(dossier, { recursive: true, force: true })
  if (!lu || lu.nonce !== nonce) return { erreur: `la sonde des routes n'a rien rendu (code ${r.code}) : ${court(r.erreurStd || r.sortieStd, 300)}` }
  return { obs: lu.obs, fautes: lu.fautes || [] }
}

// ── petits outils de lecture ─────────────────────────────────────────────────────────────────────────────────────────────
const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x))
const texte = (r) => r?.texte ?? JSON.stringify(r?.json ?? null)
const appelsDe = (r) => (Array.isArray(r?.appels) ? r.appels : [])
const rpc = (r, nom) => appelsDe(r).filter((a) => a.genre === 'rpc' && a.fonction === nom)
const tables = (r, nom, methode) => appelsDe(r).filter((a) => a.genre === 'table' && (!nom || a.table === nom) && (!methode || a.methode === methode))
const stock = (r, action) => appelsDe(r).filter((a) => a.genre === 'stockage' && (!action || a.action === action))
const ecritures = (r) => appelsDe(r).filter((a) => a.genre === 'table' && a.methode !== 'GET')
const battements = (r) => rpc(r, 'ops_battement')
const nomBattement = (a) => (a?.params ? Object.values(a.params)[0] : undefined)
const estRefus = (r) => r && typeof r.status === 'number' && r.status >= 400
const jsonObjet = (r) => (r?.json && typeof r.json === 'object' && !Array.isArray(r.json) ? r.json : null)
const sansSentinelle = (t, noms) => noms.filter((n) => String(t).includes(SENTINELLES[n]) || String(t).includes(SENTINELLES[n].replace(/ /g, '')))
const chiffresTel = (t, tel) => String(t).replace(/\D/g, '').includes(tel.replace(/\D/g, ''))

function Bilan() {
  const ko = [], ok = []
  return { ko, ok, v: (cond, bien, mal) => { (cond ? ok : ko).push(cond ? bien : mal) }, fin: () => ({ ko: [...new Set(ko)], ok: [...new Set(ok)] }) }
}
function rendre(s, id, b) { const r = b.fin(); if (r.ko.length) s.echoue(id, r.ko.slice(0, 3).join(' ; ') + (r.ko.length > 3 ? ` (+${r.ko.length - 3})` : '')); else s.passe(id, r.ok.slice(0, 5).join(' ; ')) }
const fautesDe = (liste) => liste.flatMap((r) => appelsDe(r)).filter((a) => a.faute).map((a) => `${a.fonction || a.table || a.action} : ${a.faute}`)

// ── UP-2 : les gardes des trois routes ────────────────────────────────────────────────────────────────────────────────────
function up2(obs, s) {
  const b = Bilan()
  const toutes = []
  for (const route of ['travail', 'depot', 'rendu']) {
    const g = obs.gardes?.[route]
    if (!g) { b.v(false, '', `${route} : aucune observation des gardes`); continue }
    toutes.push(...Object.values(g))
    const n = `${route}`
    b.v(g.drapeau_bas?.status === 404 && !g.drapeau_bas.journal.some((j) => j.quoi === 'garde.authAgent') && appelsDe(g.drapeau_bas).length === 0, `${n} : busAgents baissé → 404 avant toute identité (aucun appel à la garde, aucun accès à la base)`,
      `${n} : busAgents baissé : statut ${g.drapeau_bas?.status}, ${g.drapeau_bas?.journal.some((j) => j.quoi === 'garde.authAgent') ? 'la garde a été interrogée avant le drapeau' : appelsDe(g.drapeau_bas).length ? 'la base a été touchée' : 'pas un 404'} (404 sans identité attendu)`)
    b.v(g.sans_jeton?.status === 401 && g.jeton_inconnu?.status === 401, `${n} : sans jeton et jeton inconnu → 401`, `${n} : sans jeton ${g.sans_jeton?.status}, jeton inconnu ${g.jeton_inconnu?.status} (401 attendu)`)
    b.v(g.autre_agent?.status === 403, `${n} : le jeton d'un autre agent → 403`, `${n} : le jeton d'un autre agent donne ${g.autre_agent?.status} (403 attendu)`)
    b.v(g.livreur?.status === 403 && battements(g.livreur).length === 0, `${n} : le jeton de livreur_usine → 403, aucun battement`, `${n} : le jeton de livreur_usine donne ${g.livreur?.status}${battements(g.livreur).length ? ' et un battement est posé' : ''} (403 attendu : seule l'identité studio est admise)`)
    for (const k of ['sans_jeton', 'jeton_inconnu', 'autre_agent', 'livreur']) b.v(ecritures(g[k]).length === 0 && stock(g[k]).length === 0, '', `${n} : un refus (${k}) a écrit dans la base ou signé une adresse`)
    // studio : admis
    const st = g.studio
    b.v(st && !REFUS_GARDE.has(st.status) && st.status !== 404 && !CINQ_XX(st.status) && !st.exception || (route !== 'travail' && st?.status === 404 && !st.exception), `${n} : le jeton de studio passe les gardes (statut ${st?.status})`, `${n} : le jeton de studio est refusé ou la route plante (statut ${st?.status} ${st?.exception || ''})`)
    b.v(battements(st).some((a) => nomBattement(a) === AGENT && a.statut === 200), `${n} : battement de studio à l'appel authentifié`, `${n} : aucun battement de studio (ops_battement) à l'appel authentifié`)
    // pause générale
    const pg = g.pause_generale
    if (route === 'travail') b.v(pg?.status === 200 && pg.json?.travail === null && ecritures(pg).length === 0 && stock(pg).length === 0, `${n} : pause générale → { travail: null }, rien d'écrit ni de signé`, `${n} : pause générale : statut ${pg?.status}, corps ${court(texte(pg), 80)} ({ travail: null } sans écriture attendu)`)
    else b.v(pg?.status === 423 && ecritures(pg).length === 0 && stock(pg).length === 0, `${n} : pause générale → 423`, `${n} : pause générale : statut ${pg?.status} (423 attendu), ${ecritures(pg).length} écriture(s)`)
    b.v(battements(pg).some((a) => nomBattement(a) === AGENT), `${n} : battement de studio même sous la pause générale`, `${n} : pas de battement de studio sous la pause générale (appel authentifié)`)
    // agent en pause
    const ap = g.agent_en_pause
    if (route === 'travail') b.v(ap?.status === 200 && ap.json?.travail === null && ecritures(ap).length === 0, `${n} : agent studio en pause → { travail: null }`, `${n} : agent studio en pause : statut ${ap?.status}, corps ${court(texte(ap), 80)} ({ travail: null } attendu)`)
    else b.v(ap?.status === 423 && ecritures(ap).length === 0, `${n} : agent studio en pause → 423`, `${n} : agent studio en pause : statut ${ap?.status} (423 attendu)`)
    for (const k of Object.keys(g)) if (g[k]?.exception) b.v(false, '', `${n} : exception dans le cas ${k} : ${g[k].exception}`)
  }
  // jamais le battement d'un autre agent que studio, dans aucune route ni aucun cas
  const tout = [...toutes, ...Object.values(obs.travail || {}).filter((x) => x && !Array.isArray(x) && x.appels), ...Object.values(obs.depot || {}), ...Object.values(obs.rendu || {}).filter((x) => x && !Array.isArray(x) && x.appels)]
  const autres = [...new Set(tout.flatMap((r) => battements(r)).map(nomBattement).filter((x) => x !== AGENT))]
  b.v(autres.length === 0, 'aucun battement d\'un autre agent que studio', `battement posé pour ${autres.join(', ')} (seul studio bat)`)
  const f = fautesDe(toutes)
  b.v(f.length === 0, '', `appels à la base refusés par le contrat : ${[...new Set(f)].slice(0, 3).join(' ; ')}`)
  rendre(s, 'UP-2', b)
}

// ── UP-3 : GET travail ──────────────────────────────────────────────────────────────────────────────────────────────────────
function up3(obs, s) {
  const b = Bilan(), T = obs.travail || {}
  const rien = (r) => r?.status === 200 && r.json && Object.keys(r.json).length === 1 && r.json.travail === null
  b.v(rien(T.vide), 'aucun travail → { travail: null }', `aucun travail : statut ${T.vide?.status}, corps ${court(texte(T.vide), 80)} ({ travail: null } attendu)`)
  const p1 = jsonObjet(T.pack_1)
  b.v(T.pack_1?.status === 200 && p1?.type === 'pack' && p1.id === A, `le plus ancien pack payée est pris : { type: 'pack', id }`, `1er passage : statut ${T.pack_1?.status}, type ${p1?.type}, id ${p1?.id} (pack ${A} attendu : le plus ancien pack payee)`)
  if (p1?.type === 'pack') {
    if (!obs.pack_attendu) b.v(false, '', `l'exporteur du dépôt (scripts/pack-pub/exporter.mjs) n'a pas écrit pack.json : ${court(JSON.stringify(obs.exporter || {}), 160)}`)
    else b.v(canon(p1.pack) === canon(obs.pack_attendu), 'pack = exactement le pack.json de exporter.mjs', `pack ≠ pack.json de exporter.mjs (reçu ${court(canon(p1.pack), 120)} ; attendu ${court(canon(obs.pack_attendu), 120)})`)
    const fuites = sansSentinelle(texte(T.pack_1), ['courriel_client', 'telephone_artisan', 'courriel_artisan'])
    b.v(!fuites.length && !chiffresTel(texte(T.pack_1), SENTINELLES.telephone_artisan), 'ni courriel ni téléphone dans la réponse', `la réponse porte ${fuites.join(', ') || 'le téléphone de l\'artisan'} : ni courriel ni téléphone attendus`)
    const photos = Array.isArray(p1.photos) ? p1.photos : []
    const signes = stock(T.pack_1, 'signer_plusieurs').concat(stock(T.pack_1, 'signer'))
    const chemins = signes.flatMap((a) => (a.chemins ? a.chemins : [a.chemin]))
    const attendus = [1, 2, 3, 4].map((i) => `${ART}/photo-${i}.jpg`).sort()
    b.v(signes.length >= 1 && signes.every((a) => a.bucket === BUCKET_PHOTOS && typeof a.expiresIn === 'number' && a.expiresIn > 0 && a.expiresIn <= 600), 'adresses de lecture signées de 600 s au plus, dans le bucket des photos', `adresses de lecture : ${signes.length ? signes.map((a) => `${a.bucket} ${a.expiresIn} s`).join(', ') : 'aucune signature demandée'} (bucket ${BUCKET_PHOTOS}, 600 s au plus attendus)`)
    b.v(canon([...new Set(chemins)].sort()) === canon(attendus), 'les quatre photos du pack, et elles seules, sont signées', `chemins signés : ${court(chemins.join(', '), 160)} ; les quatre photos du pack (${ART}/photo-1…4.jpg) attendues`)
    const jetons = signes.flatMap((a) => a.jetons || (a.jeton ? [a.jeton] : []))
    b.v(photos.length === 4 && photos.every((p) => p && typeof p.url === 'string' && p.url) && jetons.length >= 4 && jetons.every((t) => texte(T.pack_1).includes(t)), 'photos : [{ nom, url }] portant les adresses signées', `photos : ${photos.length} entrée(s) ; les adresses signées ne sont pas toutes rendues (4 [{ nom, url }] attendues)`)
    b.v(photos.every((p) => typeof p?.nom === 'string' && p.nom), '', 'photos : un nom manque')
    const maj = tables(T.pack_1, 'packs_pubs', 'PATCH')
    b.v(maj.length >= 1 && maj.every((a) => a.requete?.id === `eq.${A}` && a.requete?.etat === 'eq.payee'), 'le bail est posé par une mise à jour conditionnelle (id et etat = payee)', `bail : ${maj.length ? 'une mise à jour sans filtre id et etat = payee' : 'aucune mise à jour du pack (pas de bail posé)'}`)
  }
  const p2 = jsonObjet(T.pack_2)
  b.v(p2?.type === 'pack' && p2.id === B, 'le pack suivant au 2e passage (jamais deux fois le même)', `2e passage : ${p2?.type} ${p2?.id} (pack ${B} attendu : le premier est sous bail)`)
  b.v(T.pack_3 && T.pack_3.json?.type !== 'pack', 'plus de pack à prendre au 3e passage', `3e passage : ${court(texte(T.pack_3), 100)} (aucun pack attendu, les deux sont sous bail)`)
  const apres = T.etat_apres_3 || []
  b.v([A, B].every((id) => apres.find((x) => x.id === id)?.etat === 'payee') && apres.find((x) => x.id === '66666666-6666-4666-8666-666666666666')?.etat === 'brouillon' && apres.find((x) => x.id === '77777777-7777-4777-8777-777777777777')?.etat === 'fabriquee', 'le travail pris reste payee ; brouillon et fabriquee ne sont jamais pris', `états après prise : ${court(JSON.stringify(apres.map((x) => `${x.id.slice(0, 2)}:${x.etat}`)), 120)} (payee, payee, brouillon, fabriquee attendus)`)
  b.v(T.bail_89 && T.bail_89.json?.type !== 'pack', 'bail de 90 min : rien à 89 min', `à 89 min : ${court(texte(T.bail_89), 100)} (le bail court encore)`)
  const r91 = jsonObjet(T.bail_91)
  b.v(r91?.type === 'pack' && r91.id === A, 'bail de 90 min : le pack revient à 91 min', `à 91 min : ${court(texte(T.bail_91), 100)} (le pack ${A} doit revenir)`)
  // le leurre : ses seules photos
  const l = T.leurre
  const signesL = stock(l, 'signer_plusieurs').concat(stock(l, 'signer'))
  const cheminsL = signesL.flatMap((a) => (a.chemins ? a.chemins : [a.chemin]).map((c) => `${a.bucket}/${c}`))
  b.v(cheminsL.every((c) => c.startsWith(`${BUCKET_PHOTOS}/${ART}/`)) && !texte(l?.json?.photos ?? null).includes('secret'), 'une photo hors du dossier de l\'artisan n\'est jamais signée', `une adresse hors du dossier de l'artisan est signée ou rendue : ${court(cheminsL.filter((c) => !c.startsWith(`${BUCKET_PHOTOS}/${ART}/`)).join(', ') || texte(l?.json?.photos ?? null), 140)}`)
  // le Studio
  const s1 = jsonObjet(T.studio_1)
  const six = ['type', 'decision', 'marque_cle', 'page_produit', 'accord', 'echantillons_refuses']
  b.v(T.studio_1?.status === 200 && s1?.type === 'studio' && s1.decision === DECISION && s1.marque_cle === 'maison-temoin-seize', 'une décision d\'échantillon accordée → { type: \'studio\', decision, marque_cle }', `Studio : statut ${T.studio_1?.status}, ${court(texte(T.studio_1), 140)} (la décision ${DECISION} de maison-temoin-seize attendue : refusée et opposée écartées)`)
  if (s1?.type === 'studio') {
    b.v(Object.keys(s1).sort().join() === [...six].sort().join(), 'le Studio ne rend que type, decision, marque_cle, page_produit, accord, echantillons_refuses', `Studio : clés ${Object.keys(s1).join(', ')} (exactement ${six.join(', ')} : rien d'autre)`)
    b.v(typeof s1.page_produit === 'string' && /\/marque\/produit\.html$/.test(s1.page_produit), 'page_produit rendue', `page_produit : ${court(s1.page_produit, 80)}`)
    const ac = s1.accord
    b.v(ac && typeof ac === 'object' && Object.keys(ac).sort().join() === 'extrait,message_id,recu_le', 'accord : { message_id, recu_le, extrait } et rien d\'autre', `accord : clés ${ac && typeof ac === 'object' ? Object.keys(ac).join(', ') : typeof ac} (message_id, recu_le, extrait attendues)`)
    b.v(ac?.message_id === SENTINELLES.message_id && Date.parse(ac?.recu_le) === Date.parse('2026-09-30T09:12:00Z'), 'accord : Message-ID et date de réception rendus tels quels', `accord : message_id ${court(ac?.message_id, 40)}, recu_le ${ac?.recu_le}`)
    const ex = String(ac?.extrait ?? '')
    b.v(ex.length > 0 && ex.length <= EXTRAIT_MAX && /oui|avec plaisir|utiliser nos photos/i.test(ex) && !/@/.test(ex) && !sansSentinelle(ex, ['courriel_marque']).length && !chiffresTel(ex, SENTINELLES.telephone_marque), `extrait : la phrase d'accord, ${ex.length} signes (≤ 400), adresses et numéros masqués`, `extrait : ${ex.length} signes ${ex.length > EXTRAIT_MAX ? '(> 400) ' : ''}« ${court(ex, 100)} » ${/@/.test(ex) || chiffresTel(ex, SENTINELLES.telephone_marque) ? '— adresse ou numéro non masqué' : ''}`)
    b.v(Array.isArray(s1.echantillons_refuses) && s1.echantillons_refuses.length === 0, 'echantillons_refuses : liste vide pour cette marque', `echantillons_refuses : ${court(JSON.stringify(s1.echantillons_refuses), 60)} ([] attendu)`)
    const fuitesM = sansSentinelle(texte(T.studio_1), ['courriel_marque']).concat(chiffresTel(texte(T.studio_1), SENTINELLES.telephone_marque) ? ['telephone_marque'] : [])
    b.v(!fuitesM.length, '', `la réponse du Studio porte ${fuitesM.join(', ')}`)
  }
  b.v(T.studio_2 && T.studio_2.json?.type !== 'studio', 'la même décision n\'est jamais rendue deux fois (bail)', `2e passage Studio : ${court(texte(T.studio_2), 100)} (rien attendu : la décision est sous bail, les autres marques refusent)`)
  const baux = (T.baux_studio || []).map((x) => x.decision)
  b.v(!baux.includes('44444444-4444-4444-8444-444444444444') && !baux.includes('55555555-5555-4555-8555-555555555555'), 'une marque en opposition ou en refus n\'est jamais prise', 'un bail est posé sur une marque en opposition ou en refus')
  const o = T.ordre || []
  b.v(o[0]?.json?.type === 'pack' && o[0].json.id === A && o[1]?.json?.type === 'pack' && o[1].json.id === B && o[2]?.json?.type === 'studio' && o[3]?.json?.travail === null, 'l\'ordre : les packs payés d\'abord, puis le Studio', `ordre des passages : ${o.map((x) => x?.json?.type ?? 'rien').join(', ')} (pack, pack, studio, rien attendus)`)
  for (const k of Object.keys(T)) if (T[k]?.exception) b.v(false, '', `exception dans ${k} : ${T[k].exception}`)
  const f = fautesDe(Object.values(T).filter((x) => x && !Array.isArray(x) && typeof x === 'object' && x.appels))
  b.v(f.length === 0, '', `appels à la base refusés par le contrat : ${[...new Set(f)].slice(0, 3).join(' ; ')}`)
  rendre(s, 'UP-3', b)
}

// ── UP-4 : POST depot ───────────────────────────────────────────────────────────────────────────────────────────────────────
function up4(obs, s) {
  const b = Bilan(), De = obs.depot || {}
  const signes = (r) => stock(r, 'signer_depot')
  const accepte = (nom, attendus, libelle) => {
    const r = De[nom]
    const sg = signes(r)
    const rel = sg.map((a) => `${a.bucket}/${a.chemin}`).sort()
    const att = attendus.map((c) => c).sort()
    b.v(r?.status === 200 && jsonObjet(r)?.ok !== false && canon(rel) === canon(att) && sg.every((a) => a.bucket === BUCKET && a.jeton && texte(r).includes(a.jeton)) && attendus.every((c) => texte(r).includes(c)),
      `${libelle} : une adresse signée de dépôt par fichier`,
      `${libelle} : statut ${r?.status}, ${sg.length} adresse(s) signée(s) [${court(rel.join(', '), 120)}] pour [${court(att.join(', '), 120)}], corps ${court(texte(r), 80)}`)
  }
  const refuse = (nom, libelle, statut = 400) => {
    const r = De[nom]
    b.v(r && r.status === statut && signes(r).length === 0 && !r.exception, `${libelle} → ${statut}, aucune adresse`, `${libelle} : statut ${r?.status}${r?.exception ? ` (${r.exception})` : ''}, ${signes(r).length} adresse(s) signée(s) (${statut} sans adresse attendu)`)
  }
  const six = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.png'].map((n) => `${BUCKET}/${A}/livraison/${n}`)
  accepte('ok_pack', six.map((c) => c), 'pack : trois MP4 et trois visuels (jpeg et png)')
  accepte('ok_60_mo', [`${BUCKET}/${A}/livraison/video-1.mp4`], 'fichier de 60 Mo')
  refuse('trop_gros', 'fichier de plus de 60 Mo')
  refuse('autre_pack', 'chemin sous le dossier d\'un autre pack')
  refuse('hors_livraison', 'chemin hors de livraison/')
  refuse('traversee', 'chemin avec « .. »')
  refuse('double_barre', 'chemin avec « // »')
  refuse('nom_majuscule', 'nom en majuscules')
  refuse('nom_espace', 'nom avec une espace')
  refuse('type_avi', 'type video/avi')
  refuse('type_gif', 'type image/gif')
  for (const [k, l] of [['taille_zero', 'taille 0'], ['taille_negative', 'taille négative'], ['taille_flottante', 'taille non entière'], ['taille_texte', 'taille en texte']]) refuse(k, l)
  refuse('sept_fichiers', 'sept fichiers pour un pack')
  refuse('doublon', 'le même chemin deux fois')
  refuse('chemin_studio', 'chemin du Studio pour un travail de pack')
  refuse('corps_invalide', 'corps qui n\'est pas du JSON')
  const ti = De.travail_inconnu
  b.v(ti && ti.status >= 400 && ti.status < 500 && signes(ti).length === 0, 'travail inconnu → 4xx, aucune adresse', `travail inconnu : statut ${ti?.status}, ${signes(ti).length} adresse(s) (4xx sans adresse attendu)`)
  accepte('stockage_59', [`${BUCKET}/${A}/livraison/video-1.mp4`], 'stockage à 59 %')
  refuse('stockage_61', 'stockage à 61 %', 507)
  refuse('stockage_erreur', 'stockage non mesurable (erreur)', 507)
  refuse('stockage_nul', 'stockage non mesurable (valeur nulle)', 507)
  // le Studio : un MP4 de 3 Mo sous studio/<marque>/echantillon-<n>.mp4
  const M = 'maison-temoin-seize'
  accepte('studio_ok', [`${BUCKET}/studio/${M}/echantillon-1.mp4`], 'échantillon du Studio')
  accepte('studio_n_5', [`${BUCKET}/studio/${M}/echantillon-5.mp4`], 'échantillon n° 5 du Studio')
  refuse('studio_trop_gros', 'échantillon de plus de 3 Mo')
  refuse('studio_autre_marque', 'échantillon sous une autre marque')
  refuse('studio_deux_fichiers', 'deux fichiers pour un échantillon')
  refuse('studio_mov', 'échantillon .mov')
  refuse('studio_chemin_pack', 'chemin de pack pour un travail du Studio')
  refuse('studio_image', 'échantillon image')
  for (const k of Object.keys(De)) if (De[k]?.exception) b.v(false, '', `exception dans ${k} : ${De[k].exception}`)
  const f = fautesDe(Object.values(De))
  b.v(f.length === 0, '', `appels à la base refusés par le contrat : ${[...new Set(f)].slice(0, 3).join(' ; ')}`)
  // aucune adresse de dépôt ne sort de packs-pubs/<pack>/livraison/ ou packs-pubs/studio/<marque>/echantillon-<n>.mp4
  const tousSignes = Object.values(De).flatMap((r) => signes(r))
  const mauvais = tousSignes.filter((a) => !(a.bucket === BUCKET && (new RegExp(`^${A}/livraison/(video-[1-3]\\.mp4|visuel-[1-3]\\.(jpg|png))$`).test(a.chemin) || new RegExp(`^studio/${M}/echantillon-[0-9]+\\.mp4$`).test(a.chemin))))
  b.v(mauvais.length === 0, `${tousSignes.length} adresses signées au total, toutes sous packs-pubs/<pack>/livraison/ ou packs-pubs/studio/<marque>/`, `adresse signée hors des chemins permis : ${mauvais.map((a) => `${a.bucket}/${a.chemin}`).slice(0, 3).join(', ')}`)
  rendre(s, 'UP-4', b)
}

// ── UP-5 : POST rendu ───────────────────────────────────────────────────────────────────────────────────────────────────────
function up5(obs, s) {
  const b = Bilan(), R = obs.rendu || {}
  const SIX = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.png'].map((n) => `${A}/livraison/${n}`).sort()
  const ok = R.ok, lg = ok?.ligne
  b.v(ok?.status === 200 && jsonObjet(ok)?.ok === true && lg?.etat === 'fabriquee' && typeof lg.fabrique_le === 'string' && Number.isFinite(Date.parse(lg.fabrique_le)), 'pack bon : payee → fabriquee, fabrique_le posé', `pack bon : statut ${ok?.status}, corps ${court(texte(ok), 80)}, état ${lg?.etat} (fabriquee attendu)`)
  b.v(lg?.verifications?.juge === 'pub-locale-qa' && lg.verifications.verdict === 'PASS', 'verifications : juge pub-locale-qa, verdict PASS (comme deposer.mjs)', `verifications : ${court(JSON.stringify(lg?.verifications ?? null), 120)} (juge pub-locale-qa, verdict PASS attendus)`)
  const lus = [...new Set(appelsDe(ok).filter((a) => a.genre === 'stockage' && (a.action === 'telecharger' || a.action === 'lire_signe') && a.bucket === BUCKET).map((a) => a.chemin))].sort()
  b.v(canon(lus) === canon(SIX), 'la route relit chacun des six fichiers dans le stockage', `fichiers relus : ${court(lus.join(', '), 140) || 'aucun'} ; les six du pack attendus`)
  const maj = tables(ok, 'packs_pubs', 'PATCH').filter((a) => a.corps?.etat === 'fabriquee')
  b.v(maj.length === 1 && maj[0].requete?.etat === 'eq.payee' && maj[0].requete?.id === `eq.${A}`, 'écriture conditionnelle : etat = payee → fabriquee', `écriture : ${maj.length} mise(s) à jour vers fabriquee${maj[0] ? ` (filtres ${court(JSON.stringify(maj[0].requete), 80)})` : ''} (une seule, conditionnée à id et etat = payee, attendue)`)
  // les refus : rien ne change hors le compteur d'échecs
  const refus = (nom, libelle) => {
    const r = R[nom], j = jsonObjet(r), lg2 = r?.ligne
    const changements = tables(r, 'packs_pubs', 'PATCH').filter((a) => a.corps && Object.keys(a.corps).some((k) => k !== 'verifications'))
    b.v(r && j?.ok === false && typeof j.raison === 'string' && j.raison && !CINQ_XX(r.status) && !REFUS_GARDE.has(r.status) && !r.exception && lg2?.etat === 'payee' && !lg2.fabrique_le && changements.length === 0,
      `${libelle} → { ok: false, raison }, le pack reste payee`,
      `${libelle} : statut ${r?.status}, corps ${court(texte(r), 90)}, état ${lg2?.etat}${changements.length ? ', la route a modifié autre chose que le compteur d\'échecs' : ''} ({ ok: false, raison } et payee attendus)`)
  }
  refus('fichier_absent', 'un fichier absent du stockage')
  refus('sha_faux', 'une empreinte SHA-256 fausse')
  refus('magiques_faux', 'un contenu changé après l\'annonce')
  refus('magiques_faux_sha_juste', 'des octets magiques faux (empreinte juste)')
  refus('juge_rouge', 'un juge au code 1')
  refus('juge_mauvais_nom', 'un juge au mauvais nom (pub-qa pour un pack)')
  refus('juge_absent', 'un juge absent')
  refus('journal_vide', 'une empreinte de journal vide')
  refus('fichier_manquant', 'cinq fichiers sur six')
  refus('fichier_hors_livraison', 'un septième fichier hors de livraison/')
  refus('ok_faux', 'ok: false annoncé par le tourneur')
  // trois échecs : plus de reprise automatique
  const t3 = R.trois_echecs_repris, d2 = R.deux_echecs_repris, v3 = R.trois_verifs_repris
  b.v(R.trois_echecs_ligne?.etat === 'payee' && t3 && !(t3.json?.type === 'pack' && t3.json.id === A), 'au 3e échec annoncé : le pack reste payee et n\'est plus repris', `après trois ok: false : état ${R.trois_echecs_ligne?.etat}, le pack ${t3?.json?.id === A ? 'est repris à 91 min (plus de reprise attendue)' : 'n\'est plus repris'}`)
  b.v(d2?.json?.type === 'pack' && d2.json.id === A, 'après deux échecs seulement : le pack est repris', `après deux échecs : ${court(texte(d2), 80)} (le pack ${A} doit être repris à 91 min)`)
  b.v(R.trois_verifs_ligne?.etat === 'payee' && v3 && !(v3.json?.type === 'pack' && v3.json.id === A) && (R.trois_verifs || []).every((x) => jsonObjet(x)?.ok === false), 'au 3e échec constaté par la route : plus de reprise non plus', `après trois empreintes fausses : état ${R.trois_verifs_ligne?.etat}, le pack ${v3?.json?.id === A ? 'est repris à 91 min' : 'n\'est plus repris'} (plus de reprise attendue)`)
  // le Studio
  const premier = R.studio_premier, dec = (r) => (r?.decisions || [])
  const regarder = dec(premier).filter((d) => d.options.includes('envoyer'))
  b.v(premier?.status === 200 && jsonObjet(premier)?.ok !== false && premier.decision?.statut === 'ouverte', 'premier échantillon : accepté, la décision studio_echantillon reste ouverte', `premier échantillon : statut ${premier?.status}, corps ${court(texte(premier), 80)}, décision ${premier?.decision?.statut} (ouverte attendue : Benj regarde d'abord)`)
  const rg = regarder[0]
  b.v(regarder.length === 1 && canon([...rg.options].sort()) === canon(['envoyer', 'refaire']) && rg.statut === 'ouverte' && rg.creee_par === AGENT && /regarder_premier|premier échantillon|premier echantillon/i.test(`${rg.cle} ${rg.question}`), 'une décision regarder_premier_echantillon, options envoyer et refaire', `décision pour Benj : ${regarder.length} décision(s) à options envoyer/refaire${rg ? ` [${rg.options.join(', ')}], créée par ${rg.creee_par}, « ${court(`${rg.cle} ${rg.question}`, 80)} »` : ''} (une seule, créée par studio, attendue)`)
  const lien = stock(premier, 'signer').filter((a) => a.bucket === BUCKET && /^studio\/maison-temoin-seize\/echantillon-1\.mp4$/.test(a.chemin))
  b.v(rg && lien.length >= 1 && lien.every((a) => typeof a.expiresIn === 'number' && a.expiresIn > 0 && a.expiresIn <= 600) && lien.some((a) => `${rg.contexte ?? ''} ${rg.question ?? ''}`.includes(a.jeton)), 'l\'aperçu : un lien signé de 10 min au plus, porté par la décision', `aperçu : ${lien.length ? `lien signé ${lien.map((a) => `${a.expiresIn} s`).join(', ')}` : 'aucun lien signé'}, ${rg && lien.some((a) => `${rg.contexte ?? ''} ${rg.question ?? ''}`.includes(a.jeton)) ? 'porté par la décision' : 'absent de la décision'} (10 min au plus, dans la décision, attendu)`)
  const apres = R.studio_apres_envoyer
  b.v(apres?.status === 200 && jsonObjet(apres)?.ok !== false && apres.decision?.statut === 'tranchee' && apres.decision.choix === 'depose', 'après le « envoyer » de Benj : studio_echantillon tranchée en depose', `après « envoyer » : statut ${apres?.status}, décision ${apres?.decision?.statut}/${apres?.decision?.choix} (tranchee/depose attendu)`)
  const pp = R.studio_pas_premier
  b.v(pp?.status === 200 && jsonObjet(pp)?.ok !== false && pp.decision?.statut === 'tranchee' && pp.decision.choix === 'depose' && dec(pp).filter((d) => d.options.includes('envoyer')).length === 0, 'un échantillon qui n\'est pas le premier : tranchée en depose sans décision pour Benj', `échantillon suivant : statut ${pp?.status}, décision ${pp?.decision?.statut}/${pp?.decision?.choix}, ${dec(pp).filter((d) => d.options.includes('envoyer')).length} décision(s) pour Benj (depose direct, aucune décision attendus)`)
  for (const [nom, libelle] of [['studio_juge_pack', 'échantillon avec le juge d\'un pack'], ['studio_sha_faux', 'échantillon à l\'empreinte fausse'], ['studio_fichier_absent', 'échantillon absent du stockage']]) {
    const r = R[nom], j = jsonObjet(r)
    b.v(r && j?.ok === false && typeof j.raison === 'string' && j.raison && !CINQ_XX(r.status) && !REFUS_GARDE.has(r.status) && r.decision?.statut === 'ouverte' && !dec(r).some((d) => d.options.includes('envoyer')), `${libelle} → { ok: false, raison }, rien ne change`, `${libelle} : statut ${r?.status}, corps ${court(texte(r), 80)}, décision ${r?.decision?.statut} ({ ok: false, raison } et décision ouverte attendus)`)
  }
  for (const k of Object.keys(R)) { const x = R[k]; if (x && !Array.isArray(x) && x.exception) b.v(false, '', `exception dans ${k} : ${x.exception}`) }
  const f = fautesDe(Object.values(R).flatMap((x) => (Array.isArray(x) ? x : x && typeof x === 'object' && x.appels ? [x] : [])))
  b.v(f.length === 0, '', `appels à la base refusés par le contrat : ${[...new Set(f)].slice(0, 3).join(' ; ')}`)
  rendre(s, 'UP-5', b)
}

/** Le verdict des quatre critères. `s` : la sortie du juge. */
export async function jouerRoutes({ racine, s, ids = ['UP-2', 'UP-3', 'UP-4', 'UP-5'] }) {
  const r = await observer(racine)
  if (r.erreur) { for (const id of ids) s.echoue(id, r.erreur); return null }
  const { obs } = r
  if (obs.exception) { for (const id of ids) s.echoue(id, `la sonde s'est arrêtée : ${obs.exception}`); return obs }
  const manquants = Object.entries(obs.import || {}).filter(([, e]) => e)
  if (manquants.length) { for (const id of ids) s.echoue(id, `route non importable : ${manquants.map(([k, e]) => `${k} (${court(e, 120)})`).join(' ; ')}`); return obs }
  if (ids.includes('UP-2')) up2(obs, s)
  if (ids.includes('UP-3')) up3(obs, s)
  if (ids.includes('UP-4')) up4(obs, s)
  if (ids.includes('UP-5')) up5(obs, s)
  return obs
}
