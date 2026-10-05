#!/usr/bin/env node
// Contre-épreuves des quatre postes : chaque faute vit uniquement dans la copie.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const SOURCE = process.cwd()
const TRAVAIL = path.join(SOURCE, '.orchestre/travail/juges-026-postes-mutations')
const PREUVES = path.join(SOURCE, '.orchestre/preuves/026-250')
const RACINE = path.join(TRAVAIL, 'copie')
const JUGES = {
  CPT: 'scripts/comptable-qa.mjs', SAV: 'scripts/sav-qa.mjs',
  QSI: 'scripts/qualite-sites-qa.mjs', VG: 'scripts/vigile-qa.mjs',
}
const PARTIES = {
  'CPT-1': 'rapprochement', 'CPT-2': 'rapprochement', 'CPT-3': 'seuil', 'CPT-4': 'montants',
  'CPT-5': 'mentions', 'CPT-6': 'libelle', 'CPT-7': 'montants', 'CPT-8': 'rapprochement',
  'SAV-1': 'classement', 'SAV-2': 'classement', 'SAV-4': 'escalade', 'SAV-5': 'brouillon',
  'SAV-6': 'automatique', 'SAV-7': 'automatique', 'SAV-8': 'ton', 'SAV-9': 'brouillon',
  'QSI-1': 'disponibilite', 'QSI-2': 'disponibilite', 'QSI-3': 'poids', 'QSI-4': 'accessibilite',
  'QSI-5': 'liens', 'QSI-6': 'mentions', 'QSI-7': 'formulaire', 'QSI-8': 'decision', 'QSI-9': 'decision',
  'VG-1': 'releve', 'VG-2': 'releve', 'VG-3': 'serveur', 'VG-4': 'serveur', 'VG-5': 'usine',
  'VG-6': 'usine', 'VG-7': 'resume', 'VG-8': 'resume', 'VG-9': 'unites', 'VG-12': 'pause',
  'VG-13': 'pause', 'VG-14': 'pause',
}
const C = 'lib/direction/comptable.ts', S = 'lib/agents/sav/repondeurClient.ts'
const Q = 'scripts/agents/controleur-qualite.mjs', V = 'lib/vigile/releve.ts'
const U = 'scripts/vigile/releve.mjs'
const M = (critere, fichier, avant, apres) => ({ critere, fichier, avant, apres })
const mutations = [
  M('CPT-1', C, "export const AGENT = 'tresorier'", "export const AGENT = 'tresorier'\nfunction payerParErreur(stripe: any) { return stripe.refunds.create({}) }"),
  M('CPT-2', C, '    vus.add(e.id)\n    const date', '    const date'),
  M('CPT-2', C, "if (!vente) { orphelins.push({ id: e.id, montant: e.amount, date }); continue }", "if (!vente) { orphelins.push({ id: e.id, montant: e.amount, date }); recettes.push({ id: e.id, montant: e.amount, date }); continue }"),
  M('CPT-2', C, 'if (vente.prix_cents !== e.amount) { ecarts.push({ id: e.id, montant: e.amount, date, attendu: vente.prix_cents }); continue }', 'if (vente.prix_cents !== e.amount && Math.abs(vente.prix_cents - e.amount) > 1) { ecarts.push({ id: e.id, montant: e.amount, date, attendu: vente.prix_cents }); continue }'),
  M('CPT-3', C, "t.alerte ? 'approche_seuil' : null", "false ? 'approche_seuil' : null"),
  M('CPT-3', C, "if (!seuil || !seuil.source || !seuil.date_source)", "if (!seuil)"),
  M('CPT-4', C, "return { periode, recettes, tva: 0, source:", "return { periode, recettes, tva: 1, source:"),
  M('CPT-4', C, '  const recettes = await totalRecettes(periode, deps)\n  return { periode, recettes, tva:', "  await fetch('https://presti-test.invalid/declaration')\n  const recettes = await totalRecettes(periode, deps)\n  return { periode, recettes, tva:"),
  M('CPT-5', C, "export const LIBELLE_FIXE = 'Encaissement rapproché'", "export const LIBELLE_FIXE = 'Encaissement rapproché'\nfunction altererMention(fs: any) { fs.writeFileSync('gabarits-pubs/mentions.json', 'TVA') }"),
  M('CPT-6', C, "(configuration.moteur === 'codex' || configuration.moteur === 'ollama_local')", "(configuration.moteur === 'codex' || configuration.moteur === 'ollama_local' || configuration.moteur === 'freellmapi')"),
  M('CPT-6', C, "&& !String(configuration.modele ?? '').includes(':cloud')", ""),
  M('CPT-7', C, '  return totalRecettes(periode, deps)\n}', '  const { recettes } = await calculer(periode, deps)\n  return recettes.reduce((s, r) => s + r.montant, 0)\n}'),
  M('CPT-8', C, 'cle: `${periode}:${recette.id}`', 'cle: `${recette.id}`'),
  M('SAV-1', S, '  const e = await etudier(message, d)\n  if (e.fini) return journaliser(message, e.fini, d)', "  const e = await etudier(message, d)\n  if (typeof (globalThis as any).envoyerEmail === 'function') await (globalThis as any).envoyerEmail(message.texte)\n  if (e.fini) return journaliser(message, e.fini, d)"),
  M('SAV-2', S, "if (!ref && !compte) return { ok: false, motif: 'sans_identifiant' }", "if (!ref && !compte && !message.texte) return { ok: false, motif: 'sans_identifiant' }"),
  M('SAV-4', S, "if (filet) return { fini: { ...lie, decision: 'escalade_benj', classe: filet.classe, motif: filet.motif } }", "if (filet) return { fini: { ...lie, decision: 'brouillon', classe: filet.classe, motif: filet.motif } }"),
  M('SAV-5', S, "const texte = modele.texte.replaceAll('{reference}', () => reference).replaceAll('{sujet}', () => sujet)", "const texte = String(decision.question ?? message.texte)"),
  M('SAV-6', S, 'export const SEUIL_AUTOMATIQUE = 20', 'export const SEUIL_AUTOMATIQUE = 19'),
  M('SAV-6', S, 'const n = approbation.final === approbation.propose ? (await compteurApprobations(type, d)) + 1 : 0', 'const n = (await compteurApprobations(type, d)) + 1'),
  M('SAV-6', S, "if (l.classe === 'question_faq' && l.certitude >= CERTITUDE_MIN && estFaq(l.type_question, d))", "if ((l.classe === 'question_faq' || l.classe === 'question_autre') && l.certitude >= CERTITUDE_MIN && estFaq(l.type_question, d))"),
  M('SAV-6', S, "certitude >= CERTITUDE_AUTO && ", ""),
  M('SAV-7', S, "(cfg.moteur === 'codex' || cfg.moteur === 'ollama_local')", "(cfg.moteur === 'codex' || cfg.moteur === 'ollama_local' || cfg.moteur === 'freellmapi')"),
  M('SAV-7', S, " && !String(cfg.modele ?? '').includes(':cloud')", ""),
  M('SAV-7', S, "cfg?.personnelles === true && ", ""),
  M('SAV-8', S, "const texte = modele.texte.replaceAll('{reference}', () => reference).replaceAll('{sujet}', () => sujet)", "const texte = modele.texte.replaceAll('{reference}', () => reference).replaceAll('{sujet}', () => sujet) + '\\nVotre site sera livré sous 24 h pour 49 €.'"),
  M('SAV-9', S, "motif: r.motif, client_id: r.client_id, commande_ref: r.commande_ref,", "motif: r.motif, client_id: r.client_id, commande_ref: r.commande_ref, texte: message.texte,"),
  M('QSI-1', Q, "navigateur.ouvrir(site.url_en_ligne, { method: 'GET' })", "navigateur.ouvrir(site.url_en_ligne, { method: 'PUT' })"),
  M('QSI-2', Q, "    if (site.compte_supprime_le || site.retiree_le || site.etat === 'retiree') { audits.push({ commande_id: site.commande_id, statut: 'exclu_retrait' }); continue }", ""),
  M('QSI-2', Q, 'const statut = obs.statut ?? null', 'const statut = obs.statut ?? 200'),
  M('QSI-3', Q, 'const octets = obs.octets?.length ?? 0', "const octets = Number(obs.entetes?.['content-length'] ?? 0)"),
  M('QSI-4', Q, 'const ratio = ratioContraste(fg, bg), seuil', 'const ratio = 10, seuil'),
  M('QSI-5', Q, 'if (r.statut >= 400) return', 'if (r.statut >= 500) return'),
  M('QSI-5', Q, "if (r.refus === 'redirections') return { url, mort: true, statut: null, raison: 'boucle_redirections' }", "if (r.refus === 'redirections') return { url, mort: false, statut: null, raison: 'boucle_redirections' }"),
  M('QSI-6', Q, "const trouve = nom === 'siren' ?", "const trouve = true || nom === 'siren' ?"),
  M('QSI-7', Q, 'const r = await verifierLien(form.action, lecteurPrudent)', "const r = await lecteurPrudent(form.action, { method: 'POST' })"),
  M('QSI-8', Q, "cfg.moteur === 'codex' && cfg.personnelles === true", "cfg.moteur === 'freellmapi' && cfg.personnelles === true"),
  M('QSI-9', Q, 'cle_idempotence: `qualite_site:${commande}:${code}:${periode(ms)}`', 'cle_idempotence: `qualite_site:${commande}:${code}:${ms}`'),
  M('VG-1', V, "niveau: 'inconnu' as Niveau", "niveau: 'vert' as Niveau"),
  M('VG-1', V, "j <= rouge ? 'rouge' : j <= orange", "j < rouge ? 'rouge' : j <= orange"),
  M('VG-2', V, "    poses_24h: poses.length,\n", "    poses_24h: poses.length,\n    derniere_ip: poses[0]?.ip ?? null,\n"),
  M('VG-2', V, "if (auto !== true) return 'manuel'", "if (auto !== true) return String(raison ?? 'manuel').slice(0, 60)"),
  M('VG-3', 'app/api/agents/vigile/route.ts', "if (agent.nom !== 'vigile')", "if (false)"),
  M('VG-3', 'app/api/agents/vigile/route.ts', "if (!actif('busAgents')) return", "if (false && !actif('busAgents')) return"),
  M('VG-4', 'lib/vigile/sources.ts', "export const sourcesParDefaut", "const lectureBans = supabaseAdmin.from('ip_bans')\nexport const sourcesParDefaut"),
  M('VG-5', U, 'if (local.dernier_jour_poste !== jour) {', 'if (true) {'),
  M('VG-5', U, "if (e.statut === 423) {", "if (false && e.statut === 423) {"),
  M('VG-6', U, 'env: envReduit(env), delaiMs: Math.max', 'env: { ...envReduit(env), PRESTI_JETON_VIGILE: env.PRESTI_JETON_VIGILE }, delaiMs: Math.max'),
  M('VG-6', U, 'shell: false, windowsHide: true', 'shell: true, windowsHide: true'),
  M('VG-6', U, "await bus('POST', '/api/agents/battement')", "await bus('POST', '/api/agents/taches')\n    await bus('POST', '/api/agents/battement')"),
  M('VG-6', U, "const jeton = env.PRESTI_JETON_VIGILE", "const secrets = fs.readFileSync('/home/agents/.config/presti/agents.env', 'utf8')\n  const jeton = env.PRESTI_JETON_VIGILE"),
  M('VG-7', V, "if (nombreOrphelin(texte, releve) !== null || nombreOrphelin(evenement, releve) !== null) return 'nombre'", "if (false) return 'nombre'"),
  M('VG-8', U, "e.moteur === 'codex' ||", "e.moteur === 'codex' || e.moteur === 'freellmapi' ||"),
  M('VG-8', U, "!e.modele.endsWith(':cloud')", "true"),
  M('VG-9', 'scripts/usine/systemd/presti-vigile.service', 'Environment=PRESTI_HOTE=usine', 'Environment=PRESTI_HOTE=usine\nEnvironmentFile=/home/agents/.config/presti/agents.env'),
  M('VG-12', V, 'strict ? v > s : v >= s', 'strict ? v >= s : v >= s - 1'),
  M('VG-12', V, "  declenchements.sort((a, b) => a.rang - b.rang", "  if (!declenchements.length && etat.ok && [erreurs, dependances, conseiller, echeances, bannissements].some((x) => x.niveau === 'rouge')) declenchements.push({ agent: 'facteur', seuil: 'qualite', mesure: 1, rang: 9 })\n  declenchements.sort((a, b) => a.rang - b.rang"),
  M('VG-12', V, 'pauses.length >= max', 'pauses.length > max'),
  M('VG-12', V, "Object.freeze(['chef', 'pont'", "Object.freeze(['pont'"),
  M('VG-13', U, "const jeton = env.PRESTI_JETON_VIGILE", "const levéeInterdite = { pause: false }\n  const jeton = env.PRESTI_JETON_VIGILE"),
  M('VG-13', U, "await bus('POST', '/api/agents/battement')", "await bus('POST', '/api/controle/pause', { active: true })\n    await bus('POST', '/api/agents/battement')"),
  M('VG-13', U, "if (r.statut < 200 || r.statut >= 300) {", "if (r.statut === 404) await bus('POST', '/api/controle/pause', { agent: p.agent })\n      if (r.statut < 200 || r.statut >= 300) {"),
  M('VG-14', U, "await bus('POST', '/api/agents/evenements', { type: 'vigile_pause'", "await bus('GET', '/api/agents/evenements', { type: 'vigile_pause'"),
  M('VG-14', U, "resume: couper(`pause de sécurité posée sur ${p.agent}", "resume: couper(`pause de sécurité posée sur ${p.agent} : ${jeton} " ),
]

function nettoyer() {
  if (!fs.existsSync(RACINE)) return
  const liens = []
  const visiter = (d) => {
    for (const nom of fs.readdirSync(d)) {
      const f = path.join(d, nom), st = fs.lstatSync(f)
      if (st.isSymbolicLink()) liens.push(f)
      else if (st.isDirectory()) visiter(f)
    }
  }
  visiter(RACINE)
  for (const lien of liens) fs.unlinkSync(lien)
  fs.rmSync(RACINE, { recursive: true })
}
function copier() {
  nettoyer()
  fs.mkdirSync(RACINE, { recursive: true })
  const r = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'app', 'lib', 'components', 'plans', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', 'public'], { cwd: SOURCE, encoding: 'buffer' })
  if (r.status !== 0) throw new Error('git ls-files a échoué')
  const fichiers = Buffer.from(r.stdout).toString('utf8').split('\0').filter(Boolean)
  for (const rel of [...fichiers, 'package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']) {
    const de = path.join(SOURCE, rel), vers = path.join(RACINE, rel)
    if (!fs.existsSync(de) || !fs.lstatSync(de).isFile()) continue
    fs.mkdirSync(path.dirname(vers), { recursive: true }); fs.copyFileSync(de, vers)
  }
  fs.symlinkSync(path.join(SOURCE, 'node_modules'), path.join(RACINE, 'node_modules'), 'junction')
}
function lancer(juge, partie) {
  const args = ['--import', './scripts/ts-loader.mjs', juge, `--partie=${partie}`]
  const debut = Date.now()
  const r = spawnSync(process.execPath, args, { cwd: RACINE, encoding: 'utf8', timeout: 150_000, maxBuffer: 8_000_000, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
  return { code: r.status ?? 124, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}`, duree_s: (Date.now() - debut) / 1000 }
}
const ligne = (sortie, critere) => sortie.split(/\r?\n/).find((l) => l.startsWith(`FAIL ${critere} — `))
const bilan = (sortie, critere) => sortie.split(/\r?\n/).some((l) => / : FAIL — /.test(l) && l.split(' : FAIL — ')[1].split(/,\s*/).includes(critere))
function une(m) {
  const juge = JUGES[m.critere.split('-')[0]], partie = PARTIES[m.critere]
  const cible = path.join(RACINE, m.fichier)
  const original = fs.readFileSync(cible, 'utf8')
  const occurrences = original.split(m.avant).length - 1
  if (occurrences !== 1) throw new Error(`${m.critere} : « avant » présent ${occurrences} fois dans ${m.fichier}`)
  const commande = `cd {racine} && node --import ./scripts/ts-loader.mjs ${juge} --partie=${partie}`
  const remplace = original.replace(m.avant, m.apres)
  try {
    fs.writeFileSync(cible, remplace)
    const r = lancer(juge, partie), extrait = ligne(r.sortie, m.critere)
    if (r.code === 0 || !extrait || !bilan(r.sortie, m.critere)) return { survit: `${m.critere} · ${m.fichier} · « ${m.avant.slice(0, 60).replace(/\n/g, ' ')} » survit (code ${r.code}) : ${r.sortie.slice(-600).replace(/\n/g, ' | ')}` }
    console.log(`${m.critere} · ${m.fichier} · ${r.duree_s.toFixed(1)} s · ${extrait}`)
    return { juge, commande, fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait, duree_s: r.duree_s }
  } finally { fs.writeFileSync(cible, original) }
}
function principal() {
  fs.mkdirSync(PREUVES, { recursive: true })
  copier()
  const depuis = Number(process.env.MUTATIONS_DEPUIS ?? 0)
  const SEUL = process.argv.find((a) => a.startsWith('--seul='))?.slice(7).split(',') ?? null
  const juges = [...new Set(Object.keys(PARTIES).map((x) => JUGES[x.split('-')[0]]))].filter((j) => !SEUL || SEUL.some((c) => JUGES[c.split('-')[0]] === j))
  const temoins = []
  for (const juge of depuis ? [] : juges) {
    const id = Object.keys(JUGES).find((k) => JUGES[k] === juge)
    const parties = [...new Set(Object.entries(PARTIES).filter(([c]) => c.startsWith(`${id}-`)).map(([, p]) => p))].join(',')
    const r = lancer(juge, parties)
    const rouges = [...new Set([...r.sortie.matchAll(/^FAIL ([A-Z0-9]+-[A-Z0-9-]+) — /gm)].map((x) => x[1]))]
    if (r.code !== 0 && !rouges.length) throw new Error(`témoin ${juge} en code ${r.code} sans critère nommé : ${r.sortie.slice(-1500)}`)
    for (const c of rouges) if (mutations.some((m) => m.critere === c)) throw new Error(`le critère ${c} de ${juge} est déjà rouge sur la copie intacte : sa mutation ne prouverait rien`)
    temoins.push(r.code === 0 ? `${juge} : PASS (${r.duree_s.toFixed(1)} s)` : `${juge} : code ${r.code}, critères rouges hors mutations : ${rouges.join(', ')} (${r.duree_s.toFixed(1)} s)`)
    console.log(temoins.at(-1))
  }
  const rapport = { temoins, mutations: [] }
  const survivantes = []
  for (const m of mutations.slice(depuis).filter((y) => !SEUL || SEUL.includes(y.critere))) { const x = une(m); if (x.survit) { survivantes.push(x.survit); console.log(`SURVIT ${m.critere}`) } else rapport.mutations.push(x) }
  rapport.survivantes = survivantes
  const SORTIE = SEUL ? path.join(PREUVES, `essai-${SEUL.join('-')}`) : PREUVES
  fs.mkdirSync(SORTIE, { recursive: true })
  fs.writeFileSync(path.join(SORTIE, 'mutations.json'), JSON.stringify(rapport, null, 2) + '\n')
  fs.writeFileSync(path.join(SORTIE, 'mutations.md'), `# Mutations 026-250\n\n${temoins.join('\n')}\n\n${rapport.mutations.map((m, i) => `${i + 1}. ${m.critere} · ${m.fichier} · ${m.extrait}`).join('\n')}\n`)
  nettoyer()
  console.log(`${rapport.mutations.length} mutations attrapées, ${survivantes.length} survivante(s)`)
  if (survivantes.length) throw new Error(`mutation(s) non prise(s) : ${survivantes.join(' ## ')}`)
}
try { principal() } catch (e) { console.error(e.message); process.exitCode = 1; try { nettoyer() } catch (x) { console.error(`copie non nettoyée : ${x.message}`) } }
