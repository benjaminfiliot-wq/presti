// .orchestre/preuves/026-026/outils/sait-echouer.mjs — la preuve que les quatre juges du lot D savent être verts sur un vrai
// code ET savent échouer, écrite par Claude Code le 27/09 (fiche 026-026, rouverte : les juges Gemini du 26/09 étaient des
// coquilles). Pour chaque critère : une entrée cassée dans la maquette témoin (jamais dans le dépôt), le juge relancé, la
// ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.
//
//   node .orchestre/preuves/026-026/outils/sait-echouer.mjs [--seulement=DZ,RT] [--mutation=DZ-2,PS-4] [--neuve]
//   --seulement  ne joue que ces juges ; --mutation ne rejoue que ces critères (lignes remplacées dans la preuve existante) ;
//   --neuve      reconstruit la maquette de zéro.
//
// Trois terrains (sous .orchestre/travail/, jamais livrés) :
//   026-026-maquette  l'arbre courant + les préalables (d/temoin-base/) dans un commit « base », puis par-dessus les
//                     implémentations témoins de 026-028, 026-031, 026-078 et 026-141 (d/temoin/) : chaque juge, en mode
//                     complet, y est VERT (code 0) avant toute mutation ;
//   026-026-temoin    app, lib, supabase de l'arbre courant : les critères (NR) s'y prouvent en --temoin ;
//   le dépôt lui-même, en lecture : chaque juge y est ROUGE (critère 1) en mode complet, et vert en --temoin.
// Écrit sait-echouer-juges.md et sait-echouer-juges.json dans .orchestre/preuves/026-026/. Aucun réseau hors 127.0.0.1.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { construireMaquette, MAQUETTE as M } from './maquette.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const PREUVES = path.resolve(ICI, '..')
const R = path.resolve(PREUVES, '..', '..', '..')
const T = path.join(R, '.orchestre', 'travail', '026-026-temoin')
const JUGES = { DZ: 'dossier-zip-qa', RT: 'retrait-site-qa', PS: 'poste-sites-qa', BL: 'bus-livraison-qa' }
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3).split(',').filter(Boolean)
const seulement = arg('seulement'), seulesMutations = arg('mutation')
const rel = (p) => path.relative(R, p).split(path.sep).join('/')
const court = (t, n = 300) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

function lancer(prefixe, racine, temoin) {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', `scripts/${JUGES[prefixe]}.mjs`, ...(racine ? [`--racine=${racine}`] : []), ...(temoin ? ['--temoin'] : [])], { cwd: R, encoding: 'utf8', timeout: 900_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  const lignes = sortie.split(/\r?\n/).map((l) => l.trim())
  return { code: r.status, sortie, lignes, criteres: lignes.filter((l) => /^(✅|❌) [A-Z]{2}-/.test(l)), duree: Math.round((Date.now() - t0) / 1000) }
}
/** Remplace `de` par `a` (fins de ligne du fichier respectées) ; rend l'original pour la restauration. */
function muter(fichier, remplacements) {
  const original = fs.readFileSync(fichier)
  let t = original.toString('utf8')
  const eol = t.includes('\r\n') ? '\r\n' : '\n'
  for (const [de, a] of remplacements) {
    const re = new RegExp(de.split('\n').map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'))
    if (!re.test(t)) throw new Error(`« ${court(de, 70)} » introuvable dans ${rel(fichier)}`)
    t = t.replace(re, () => a.replace(/\n/g, eol))
  }
  fs.writeFileSync(fichier, t)
  return original
}

const TYPE = "export const temoinType: number = 'texte'"
const MUTATIONS = [
  // ── DZ : dossier-zip-qa (026-028) ──────────────────────────────────────────────────────────────────────────────────────
  { juge: 'DZ', critere: 'DZ-1', fichier: 'app/api/site-dossier/[commande]/route.ts', de: '  const { commande } = await ctx.params', a: '  const { commande } = ctx.params as unknown as { commande: string }', quoi: 'la route lit params sans l’attendre (promesse de Next 16)' },
  { juge: 'DZ', critere: 'DZ-2', fichier: 'lib/siteDossier.ts', de: 'update({ dossier_jeton_hash: empreinte(jeton),', a: 'update({ dossier_jeton_hash: jeton,', quoi: 'le jeton en clair écrit dans dossier_jeton_hash' },
  { juge: 'DZ', critere: 'DZ-2', fichier: 'lib/siteDossier.ts', de: '  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false', a: "  if (a.toString('hex') !== b.toString('hex')) return false", quoi: 'comparaison par === au lieu de timingSafeEqual' },
  { juge: 'DZ', critere: 'DZ-3', fichier: 'lib/siteDossier.ts', de: '        if (e.id === null) await parcourir(chemin)', a: '        if (e.id === null) continue', quoi: 'listerSite ne descend pas dans les sous-dossiers' },
  { juge: 'DZ', critere: 'DZ-4', fichier: 'lib/siteDossier.ts', de: '  if (!(await verifierJetonDossier(id, jeton, d))) return introuvable()', a: "  if (!(await verifierJetonDossier(id, jeton, d))) return new Response('Jeton refusé.', { status: 404 })", quoi: 'un mauvais jeton dit pourquoi (404 différente)' },
  { juge: 'DZ', critere: 'DZ-4', fichier: 'lib/siteDossier.ts', de: ', 10, 3600)', a: ', 11, 3600)', quoi: 'plafond de 11 par heure au lieu de 10' },
  { juge: 'DZ', critere: 'DZ-5', fichier: 'lib/siteDossier.ts', de: ".select('id, email').eq('etat', 'retiree').lt(", a: ".select('id, email').lt(", quoi: 'la purge ne filtre plus l’état retiree' },
  { juge: 'DZ', critere: 'DZ-6', fichier: 'lib/siteDossier.ts', de: "  'Le dossier complet de votre site',", a: "  'Le dossier complet de votre site, dont le classement est garanti',", quoi: 'LISEZ-MOI promet un classement garanti' },
  { juge: 'DZ', critere: 'DZ-7', fichier: 'lib/siteDossier.ts', de: 'export async function creerJetonDossier(', a: `${TYPE}\nexport async function creerJetonDossier(`, quoi: 'une erreur de type' },
  { juge: 'DZ', critere: 'DZ-3', temoin: true, fichier: 'lib/zip.ts', de: '    const crc = crc32(donnees)', a: '    const crc = crc32(donnees) ^ 1', quoi: '(NR) ZipFlux écrit un CRC faux' },
  // ── RT : retrait-site-qa (026-031) ─────────────────────────────────────────────────────────────────────────────────────
  { juge: 'RT', critere: 'RT-1', fichier: 'lib/siteRetrait.ts', de: "export const ETAT_RETIRE = 'retiree'", a: "export const ETAT_RETIRE = 'retire'", quoi: 'ETAT_RETIRE mal écrit' },
  { juge: 'RT', critere: 'RT-2', fichier: 'lib/siteRetrait.ts', de: '  cible.setUTCDate(Math.min(x.getUTCDate(), dernier))', a: '  cible.setUTCDate(x.getUTCDate())', quoi: 'le 29/02 déborde au 1er mars' },
  { juge: 'RT', critere: 'RT-3', fichier: 'lib/siteRetrait.ts', de: "    if (!r.ok) return 'envoi_echoue'", a: "    if (!r.ok) console.warn('[retrait] envoi refusé')", quoi: 'un envoi refusé n’arrête pas le retrait' },
  { juge: 'RT', critere: 'RT-3', fichier: 'lib/siteRetrait.ts', de: ".eq('id', commande.id).eq('etat', 'en_ligne').select('id')", a: ".eq('id', commande.id).select('id')", quoi: 'la mise à jour n’est plus conditionnée à en_ligne' },
  { juge: 'RT', critere: 'RT-4', fichier: 'lib/purgeComptes.ts', de: "      try { enLigne = await commandesEnLigneDe(c.id) } catch (e) { console.error('[purge-comptes] sites en ligne', c.id, e instanceof Error ? e.message : e) }", a: '      enLigne = await commandesEnLigneDe(c.id)', quoi: 'commandesEnLigneDe hors d’un try (une erreur arrête la purge)' },
  { juge: 'RT', critere: 'RT-4', fichier: 'lib/siteRetrait.ts', de: ".in('id', ids).eq('etat', 'en_ligne').is('compte_supprime_le', null)", a: ".in('id', ids).eq('etat', 'en_ligne')", quoi: 'marquerSuppression réécrit une date existante' },
  { juge: 'RT', critere: 'RT-5', fichier: 'lib/siteRetrait.ts', de: 'ou avant sur simple demande (répondez simplement à ce message)', a: 'ou avant si vous le demandez (répondez à ce message)', quoi: 'l’e-mail « suppression » perd « sur simple demande »' },
  { juge: 'RT', critere: 'RT-7', fichier: 'lib/siteLivraison.ts', de: '      for (const c of dus.slice(0, 10)) {', a: '      for (const c of dus) {', quoi: 'plus de plafond de 10 retraits par passage' },
  { juge: 'RT', critere: 'RT-7', fichier: 'lib/siteLivraison.ts', de: "  // 026-031 : l'article 3 bis — les retraits dus (10 au plus), puis la purge des dossiers expirés ; rien en pause.\n  if (!pause) {", a: "  // 026-031 : l'article 3 bis — les retraits dus (10 au plus), puis la purge des dossiers expirés ; rien en pause.\n  if (true) {", quoi: 'retraits et purge sans garde sur la pause' },
  { juge: 'RT', critere: 'RT-8', fichier: 'lib/siteRetrait.ts', de: 'export async function retirer(', a: `${TYPE}\nexport async function retirer(`, quoi: 'une erreur de type' },
  { juge: 'RT', critere: 'RT-6', temoin: true, fichier: 'lib/siteCommande.ts', de: "export const ETATS = ['brouillon', 'payee', 'generee', 'validee', 'en_ligne'] as const", a: "export const ETATS = ['brouillon', 'payee', 'generee', 'validee', 'en_ligne', 'retiree'] as const", quoi: '(NR) retiree ajouté à ETATS de lib/siteCommande.ts' },
  { juge: 'RT', critere: 'RT-6', temoin: true, fichier: 'app/site-genere/[commande]/[[...chemin]]/route.ts', de: "  const enLigne = c.etat === 'en_ligne'", a: "  const enLigne = c.etat !== 'brouillon'", quoi: '(NR) la route site-genere sert autre chose que en_ligne' },
  // ── PS : poste-sites-qa (026-078) ──────────────────────────────────────────────────────────────────────────────────────
  { juge: 'PS', critere: 'PS-1', fichier: 'app/api/controle/sites/[id]/route.ts', de: "const NOUVELLES = ['valider_et_mettre_en_ligne', 'search_console', 'envoyer_dossier'] as const", a: "const NOUVELLES = ['valider_et_mettre_en_ligne', 'search_console'] as const", quoi: 'la route ne reconnaît plus envoyer_dossier' },
  { juge: 'PS', critere: 'PS-3', fichier: 'app/api/controle/sites/[id]/route.ts', de: ".eq('id', id).eq('etat', 'generee').select('id, etat, valide_le, en_ligne_le')", a: ".eq('id', id).select('id, etat, valide_le, en_ligne_le')", quoi: 'mise en ligne non conditionnée à generee' },
  { juge: 'PS', critere: 'PS-3', fichier: 'app/api/controle/sites/[id]/route.ts', de: "    if (!(await journal('site_en_ligne', { etat: 'generee' }, { etat: 'en_ligne' }))) return refusJournal()", a: "    void journal('site_en_ligne', { etat: 'generee' }, { etat: 'en_ligne' })", quoi: 'journal indisponible : le geste passe quand même' },
  { juge: 'PS', critere: 'PS-4', fichier: 'app/api/controle/sites/[id]/route.ts', de: '  if (refus) return refus', a: '  void refus', quoi: 'envoyer_dossier sans reconfirmation' },
  { juge: 'PS', critere: 'PS-4', fichier: 'app/api/controle/sites/[id]/route.ts', remplacements: [["    if (c.search_console_le) return NextResponse.json({ ok: true, deja: true, search_console_le: c.search_console_le })\n", ''], [".update({ search_console_le: maintenant }).eq('id', id).is('search_console_le', null)", ".update({ search_console_le: maintenant }).eq('id', id)"]], quoi: 'le second « Plan soumis » réécrit la date' },
  { juge: 'PS', critere: 'PS-5', fichier: 'app/api/controle/a-faire/route.ts', de: "gravite: heures(c.valide_le) > 48 ? 'critique' : 'attention'", a: "gravite: heures(c.valide_le) > 80 ? 'critique' : 'attention'", quoi: 'seuil critique à 80 h au lieu de 48' },
  { juge: 'PS', critere: 'PS-5', fichier: 'app/api/controle/a-faire/route.ts', de: "    let libelle: string | null = null, detail = nom, action = onglet", a: "    let libelle: string | null = null, detail = `${nom} · ${c.id.slice(0, 4)}@presti-test.invalid`, action = onglet", quoi: 'une adresse dans le détail d’une ligne' },
  { juge: 'PS', critere: 'PS-6', fichier: 'app/api/controle/sites/route.ts', de: '.map(({ matiere: _matiere, ...c }) => ({ ...c, matiere_resume:', a: '.map(({ matiere: _matiere, ...c }) => ({ ...c, matiere: _matiere, matiere_resume:', quoi: 'la matière brute rendue' },
  { juge: 'PS', critere: 'PS-7', fichier: 'app/controle/Sites.tsx', de: "                          {(c.etat === 'en_ligne' || c.etat === 'retiree') && role === 'direction' && (", a: "                          {(c.etat === 'en_ligne' || c.etat === 'retiree' || c.etat === 'generee') && role === 'direction' && (", quoi: '« Envoyer le dossier » aussi sur une commande générée' },
  { juge: 'PS', critere: 'PS-8', fichier: 'app/api/controle/sites/route.ts', de: 'export async function GET(', a: `${TYPE}\nexport async function GET(`, quoi: 'une erreur de type' },
  { juge: 'PS', critere: 'PS-2', temoin: true, fichier: 'app/api/controle/sites/[id]/route.ts', de: "  const perimetre = exigerDomaine(f, 'clients', 'ecrire')", a: "  const perimetre = exigerDomaine(f, 'clients', 'voir')", quoi: '(NR) la garde de la route [id] affaiblie' },
  { juge: 'PS', critere: 'PS-2', temoin: true, fichier: 'app/api/controle/sites/[id]/route.ts', de: "  if (action === 'regenerer' && consigne.length < 10)", a: "  if (action === 'regenerer' && consigne.length < 3)", quoi: '(NR) la branche regenerer changée' },
  // ── BL : bus-livraison-qa (026-141) ────────────────────────────────────────────────────────────────────────────────────
  { juge: 'BL', critere: 'BL-1', fichier: 'lib/siteLivraisonBus.ts', de: "p_cle: `livrer_site:${commandeId}`", a: "p_cle: `livraison:${commandeId}`", quoi: 'la clé livraison:<id> au lieu de livrer_site:<id>' },
  { juge: 'BL', critere: 'BL-1', fichier: 'lib/siteLivraisonBus.ts', de: "rpc('ops_battement', { p_nom: 'livreur' })", a: "rpc('ops_battement', { nom: 'livreur' })", quoi: 'un nom de paramètre hors contrat' },
  { juge: 'BL', critere: 'BL-2', fichier: 'lib/siteLivraisonBus.ts', de: '    return data !== false', a: '    return data === true', quoi: 'une réponse null lue « pas en pause »' },
  { juge: 'BL', critere: 'BL-3', fichier: 'lib/siteLivraison.ts', de: '  if (bilan.erreurs === 0) await battementLivreur()', a: '  await battementLivreur()', quoi: 'le livreur bat même quand le tour a échoué' },
  { juge: 'BL', critere: 'BL-3', fichier: 'lib/siteLivraison.ts', de: '  enPause: d.enPause ?? busEnPause,', a: '  enPause: d.enPause ?? (async () => false),', quoi: 'tourLivraison ne lit plus la pause du bus' },
  { juge: 'BL', critere: 'BL-4', fichier: 'app/api/agents/tic/route.ts', de: '  if (minute % 15 === 0) {', a: '  if (minute % 5 === 0) {', quoi: 'le tic appelle la livraison toutes les 5 minutes' },
  { juge: 'BL', critere: 'BL-4', fichier: 'app/api/agents/tic/route.ts', de: "    try { await tourLivraison() } catch { etapes.livraison = { statut: 'echec' } }", a: '    await tourLivraison()', quoi: 'l’appel sort de son try/catch' },
  { juge: 'BL', critere: 'BL-6', fichier: 'lib/siteLivraisonBus.ts', de: 'export async function busEnPause(', a: `${TYPE}\nexport async function busEnPause(`, quoi: 'une erreur de type' },
  { juge: 'BL', critere: 'BL-8', fichier: 'lib/siteLivraisonUsine.ts', de: "      if (!magiqueJuste(f.type, octets)) { raison = 'sortie:type'; break }\n", a: '', quoi: 'les octets magiques ne sont plus lus (un PDF passe pour un JPEG)' },
  { juge: 'BL', critere: 'BL-8', fichier: 'lib/siteLivraisonUsine.ts', de: '    if (entree.essai === true) continue', a: '    if (entree.essai === true && Date.now() < 0) continue', quoi: 'une tâche d’essai est consommée' },
  { juge: 'BL', critere: 'BL-9', fichier: 'lib/siteLivraisonUsine.ts', de: ".eq('id', commandeId).eq('etat', 'payee').select('id')", a: ".eq('id', commandeId).select('id')", quoi: 'la mise à jour ne porte plus etat = payee' },
  { juge: 'BL', critere: 'BL-5', temoin: true, fichier: 'app/api/cron/relances/route.ts', de: "  try { await tourLivraison() } catch (e) { console.error('[cron/relances] livraison', e) }", a: '  void 0', quoi: '(NR) le filet quotidien retiré du cron des relances' },
]

const FICHIER_JSON = path.join(PREUVES, 'sait-echouer-juges.json')
const precedent = seulesMutations.length && fs.existsSync(FICHIER_JSON) ? JSON.parse(fs.readFileSync(FICHIER_JSON, 'utf8')) : null
const resultat = precedent ? { ...precedent, rejoue_le: new Date().toISOString(), rejouees: seulesMutations } : { produit_le: new Date().toISOString(), maquette: null, temoins: {}, mutations: [] }
const prefixes = Object.keys(JUGES).filter((p) => !seulement.length || seulement.includes(p))

// ── Les terrains ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const maquette = construireMaquette({ neuve: process.argv.includes('--neuve') })
if (!precedent) resultat.maquette = { dossier: rel(maquette.dossier), base: maquette.base, temoins: maquette.fichiers }
console.log(`maquette ${rel(maquette.dossier)} (base ${maquette.base.slice(0, 7)}) : ${maquette.fichiers.length} fichiers témoins posés`)
fs.rmSync(T, { recursive: true, force: true })
fs.mkdirSync(T, { recursive: true })
for (const d of ['app', 'lib', 'supabase']) fs.cpSync(path.join(R, d), path.join(T, d), { recursive: true })

// ── Vert sur le témoin, rouge sur l'arbre courant, vert en --temoin ─────────────────────────────────────────────────────
for (const p of precedent ? [] : prefixes) {
  const c = lancer(p, M, false), t = lancer(p, null, true), a = lancer(p, null, false)
  const premiere = a.criteres[0] ?? '(aucune ligne de critère)'
  resultat.temoins[p] = {
    maquette: { code: c.code, duree: c.duree, verts: c.criteres.filter((l) => l.startsWith('✅')).length, rouges: c.criteres.filter((l) => l.startsWith('❌')).map((l) => court(l, 200)) },
    temoin: { code: t.code, duree: t.duree, rouges: t.criteres.filter((l) => l.startsWith('❌')).map((l) => court(l, 200)) },
    arbre: { code: a.code, duree: a.duree, premiere: court(premiere, 220) },
  }
  console.log(`${p} : maquette → code ${c.code} (${c.duree} s, ${resultat.temoins[p].maquette.verts} vert(s), ${resultat.temoins[p].maquette.rouges.length} rouge(s)) ; arbre --temoin → code ${t.code} ; arbre complet → code ${a.code}, « ${court(premiere, 90)} »`)
}

// ── Les mutations ────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const m of MUTATIONS) {
  if (!prefixes.includes(m.juge)) continue
  if (seulesMutations.length && !seulesMutations.includes(m.critere)) continue
  const racine = m.temoin ? T : M
  const fichier = path.join(racine, m.fichier)
  const entree = { juge: m.juge, critere: m.critere, mode: m.temoin ? 'temoin' : 'complet', fichier: rel(fichier), quoi: m.quoi, pris: false, code: null, ligne: null, autres_rouges: [], restaure: false, duree: null }
  let original = null
  try {
    original = muter(fichier, m.remplacements ?? [[m.de, m.a]])
    const r = lancer(m.juge, racine, !!m.temoin)
    entree.code = r.code; entree.duree = r.duree
    const rouge = r.criteres.find((l) => l.startsWith(`❌ ${m.critere} `) || l.startsWith(`❌ ${m.critere} (NR)`))
    entree.pris = r.code !== 0 && !!rouge
    entree.ligne = rouge ? court(rouge, 320) : court(r.criteres.find((l) => l.startsWith(`✅ ${m.critere}`)) ?? r.sortie.trim().split(/\r?\n/).pop(), 200)
    entree.autres_rouges = r.criteres.filter((l) => l.startsWith('❌') && !l.startsWith(`❌ ${m.critere} `)).map((l) => l.slice(2, 8).trim())
  } catch (err) { entree.ligne = `mutation impossible : ${court(err.message, 200)}` } finally {
    if (original) { fs.writeFileSync(fichier, original); entree.restaure = fs.readFileSync(fichier).equals(original) }
  }
  console.log(`${m.critere} (${entree.mode}) ${entree.pris ? 'PRIS' : 'RATÉ'} — code ${entree.code} — ${court(entree.ligne, 150)}${entree.restaure ? '' : ' — NON RESTAURÉ'}`)
  if (precedent) resultat.mutations = resultat.mutations.filter((x) => !(x.critere === entree.critere && x.quoi === entree.quoi))
  resultat.mutations.push(entree)
}

// ── Le rapport ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const ordre = (x) => `${Object.keys(JUGES).indexOf(x.juge)}-${x.critere.split('-')[0]}-${String(x.critere.split('-')[1]).padStart(2, '0')}`
resultat.mutations.sort((a, b) => ordre(a).localeCompare(ordre(b)))
fs.writeFileSync(FICHIER_JSON, `${JSON.stringify(resultat, null, 1)}\n`)
const criteresAttendus = { DZ: ['DZ-1', 'DZ-2', 'DZ-3', 'DZ-4', 'DZ-5', 'DZ-6', 'DZ-7'], RT: ['RT-1', 'RT-2', 'RT-3', 'RT-4', 'RT-5', 'RT-6', 'RT-7', 'RT-8'], PS: ['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5', 'PS-6', 'PS-7', 'PS-8'], BL: ['BL-1', 'BL-2', 'BL-3', 'BL-4', 'BL-5', 'BL-6', 'BL-8', 'BL-9'] }
const md = [
  '# Les quatre juges du lot D sont verts sur un vrai code et savent échouer',
  '',
  `Produit par \`node .orchestre/preuves/026-026/outils/sait-echouer.mjs\` le ${resultat.produit_le}${resultat.rejoue_le ? ` (rejoué le ${resultat.rejoue_le} : ${resultat.rejouees.join(', ')})` : ''}. Maquette : \`${resultat.maquette?.dossier}\`, l'arbre courant plus les préalables (\`scripts/fixtures/026-livraison-tresor/d/temoin-base/\`) dans un commit « base » ${String(resultat.maquette?.base).slice(0, 7)}, et par-dessus les implémentations témoins de 026-028, 026-031, 026-078 et 026-141 (\`scripts/fixtures/026-livraison-tresor/d/temoin/\`, jamais livrées) ; copie témoin : \`.orchestre/travail/026-026-temoin/\` (app, lib, supabase de l'arbre courant), où les critères (NR) se prouvent en \`--temoin\`. Pour chaque ligne : une entrée cassée, le juge relancé, la ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.`,
  '',
  '## Avant toute mutation',
  '',
  '| Juge | Maquette témoin (mode complet) | Arbre courant, --temoin | Arbre courant, mode complet : première ligne |',
  '|---|---|---|---|',
  ...Object.entries(resultat.temoins).map(([p, x]) => `| ${JUGES[p]} | code ${x.maquette.code}, ${x.maquette.verts} critère(s) vert(s)${x.maquette.rouges.length ? `, ROUGE : ${x.maquette.rouges.join(' ; ').replace(/\|/g, '\\|')}` : ', aucun rouge'} (${x.maquette.duree} s) | code ${x.temoin.code}${x.temoin.rouges.length ? `, ROUGE : ${x.temoin.rouges.join(' ; ').replace(/\|/g, '\\|')}` : ''} | code ${x.arbre.code} : ${x.arbre.premiere.replace(/\|/g, '\\|')} |`),
  '',
  '## Mutations',
  '',
  '| Juge | Critère | Mode | Sabotage | Fichier cassé | Code | Pris | Restauré | Ligne rouge (extrait réel) | Autres rouges |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...resultat.mutations.map((x) => `| ${x.juge} | ${x.critere} | ${x.mode} | ${x.quoi.replace(/\|/g, '\\|')} | ${x.fichier} | ${x.code} | ${x.pris ? 'oui' : 'NON'} | ${x.restaure ? 'oui' : 'NON'} | ${String(x.ligne).replace(/\|/g, '\\|')} | ${x.autres_rouges.join(', ') || '—'} |`),
  '',
  '## Couverture',
  '',
  ...Object.entries(criteresAttendus).map(([p, ids]) => { const pris = ids.filter((id) => resultat.mutations.some((x) => x.critere === id && x.pris)); const manque = ids.filter((id) => !pris.includes(id)); return `- ${JUGES[p]} : ${pris.length}/${ids.length} critères pris par au moins un sabotage${manque.length ? ` ; SANS PREUVE : ${manque.join(', ')}` : ''}.` }),
  '- Les critères `--reel` (DZ-8, RT-9, PS-9, BL-7) ne se jugent qu’en production, après le déploiement de leur fiche : ils ne sont pas éprouvés ici (la fiche 026-026 interdit tout `--reel`).',
  '- Le critère <P>-PV (preuve de 0 octet) de chaque juge est éprouvé par `juges-026-lt-preuve.mjs --lot=D` lui-même (JL-4).',
  '',
]
fs.writeFileSync(path.join(PREUVES, 'sait-echouer-juges.md'), md.join('\n'))
const rates = resultat.mutations.filter((x) => !x.pris || !x.restaure)
const temoinsRouges = Object.values(resultat.temoins).filter((x) => x.maquette.code !== 0 || x.temoin.code !== 0 || x.arbre.code === 0)
console.log(`\n${resultat.mutations.length} mutation(s), ${rates.length} ratée(s) ou non restaurée(s) ; ${temoinsRouges.length} terrain(s) inattendu(s) → ${rel(path.join(PREUVES, 'sait-echouer-juges.md'))}`)
process.exit(rates.length || temoinsRouges.length ? 1 : 0)
