#!/usr/bin/env node
// scripts/studio-garde-qa.mjs — le juge de la garde du Studio (fiche 026-128, « Ce qu'il faut faire », point 2),
// écrit par Claude Code AVANT ce qu'il juge : scripts/studio/garde.mjs, docs/studio/modeles-messages.md et
// docs/studio/seance.md (026-155) n'existent pas encore. Six critères (SG-1 à SG-6, « Cahier du juge » de 026-128).
//
// --temoin : SG-1, SG-2, SG-3, SG-4 et SG-6 dépendent tous d'un fichier que 026-155 n'a pas encore écrit ; ils sont
// SAUTÉS (comme scripts/pack-pub-paiement-qa.mjs --partie=route --temoin — même motif, même dépôt), avec le nom du
// fichier attendu dans le détail. Seul SG-5 est un critère de fabrication de CE juge (les jeux d'essai eux-mêmes,
// perimetre de 026-128) : il tourne réellement, ici et maintenant.
//
// Usage : node scripts/studio-garde-qa.mjs [--racine=<dossier>] [--temoin]
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide.
// N'écrit que sous .orchestre/travail/studio-garde-qa/. Aucune marque réelle.
import fs from 'node:fs'
import path from 'node:path'
import { R, lireOptionsOuQuitter, lancer as lancerCommun, gitGrepFichiers } from './fixtures/025/commun.mjs'
import { creerRapport, dossierTravail, court, lf } from './lib/sql-essai.mjs'
import * as St from './fixtures/026-pubs-contenu/studio/commun.mjs'

const NOM = 'studio-garde-qa'
const FICHE_CIBLE = '026-155'
const IDS = ['SG-1', 'SG-2', 'SG-3', 'SG-4', 'SG-5', 'SG-6']
const DELAI = 3 * 60_000
const posix = (p) => String(p).split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
let ARRET = false
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exitCode = 2; ARRET = true }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const TRAVAIL = dossierTravail(NOM)
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'studio')
const VAULT_OK = path.join(FIXTURES, 'vault-ok')
const MANQUES = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'manques.json'), 'utf8'))

function lancer(bin, args, opts = {}) { return lancerCommun(bin, args, { cwd: R, timeout: DELAI, ...opts }) }
const SAUT_TEMOIN = (fichier) => `témoin : dépend de ${fichier} (fiche ${FICHE_CIBLE}, pas encore écrite) — critère réel une fois ${fichier} en place, via « node scripts/studio-garde-qa.mjs »`

// ── Un vault de travail : copie de vault-ok, avec une mutation appliquée (ou aucune) ────────────────────────────────
function copierVault(dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(VAULT_OK, dest, { recursive: true })
  // page-produit-AAAA-MM-JJ.html n'est jamais committée (elle se périmerait) : régénérée ici, datée d'aujourd'hui.
  const dossierMarque = path.join(dest, 'marques', St.MARQUE_CLE)
  fs.mkdirSync(dossierMarque, { recursive: true })
  const aujourdhui = new Date()
  const jj = String(aujourdhui.getDate()).padStart(2, '0'), mm = String(aujourdhui.getMonth() + 1).padStart(2, '0'), aaaa = aujourdhui.getFullYear()
  St.fabriquerPageProduit(path.join(dossierMarque, `page-produit-${aaaa}-${mm}-${jj}.html`), aujourdhui)
  return dest
}
/** Applique une mutation de manques.json à un vault (déjà copié) ; lève si l'id est inconnu. */
function appliquerManque(vault, id) {
  const dossierMarque = path.join(vault, 'marques', St.MARQUE_CLE)
  const prealables = path.join(vault, 'prealables.md')
  switch (id) {
    case 'chaine_gratuite_absente': {
      const t = fs.readFileSync(prealables, 'utf8').split('\n').filter((l) => !l.startsWith('Chaîne gratuite lue le')).join('\n')
      fs.writeFileSync(prealables, t); break
    }
    case 'droit_commercial_non': {
      const t = fs.readFileSync(prealables, 'utf8').replace('droit commercial : oui', 'droit commercial : non')
      fs.writeFileSync(prealables, t); break
    }
    case 'elevenlabs_seul': {
      const t = fs.readFileSync(prealables, 'utf8').split('\n')
        .map((l) => l.startsWith('Chaîne gratuite lue le') ? 'Conditions ElevenLabs lues le 24/09/2026' : l).join('\n')
      fs.writeFileSync(prealables, t); break
    }
    case 'arpp_absente': {
      const t = fs.readFileSync(prealables, 'utf8').split('\n').filter((l) => !l.startsWith('Fiche ARPP lue le')).join('\n')
      fs.writeFileSync(prealables, t); break
    }
    case 'activite_absente': {
      const t = fs.readFileSync(prealables, 'utf8').split('\n').filter((l) => !l.startsWith('Activité déclarée le')).join('\n')
      fs.writeFileSync(prealables, t); break
    }
    case 'accord_photos_vide': fs.writeFileSync(path.join(dossierMarque, 'accord-photos.md'), ''); break
    case 'accord_photos_sans_message_id': {
      const f = path.join(dossierMarque, 'accord-photos.md')
      fs.writeFileSync(f, fs.readFileSync(f, 'utf8').split('\n').filter((l) => !l.includes('Message-ID')).join('\n')); break
    }
    case 'page_produit_perimee': {
      for (const n of fs.readdirSync(dossierMarque)) if (/^page-produit-\d{4}-\d{2}-\d{2}\.html$/.test(n)) fs.rmSync(path.join(dossierMarque, n))
      const ancienne = new Date(Date.now() - 45 * 86_400_000)
      const jj = String(ancienne.getDate()).padStart(2, '0'), mm = String(ancienne.getMonth() + 1).padStart(2, '0'), aaaa = ancienne.getFullYear()
      St.fabriquerPageProduit(path.join(dossierMarque, `page-produit-${aaaa}-${mm}-${jj}.html`), ancienne)
      break
    }
    case 'marque_au_registre_refus': fs.appendFileSync(path.join(vault, 'registre-refus.csv'), `${St.MARQUE_CLE},24/09/2026,jeu d'essai\n`); break
    case 'echantillon_refuse': fs.mkdirSync(path.join(dossierMarque, 'echantillon-1'), { recursive: true }); fs.writeFileSync(path.join(dossierMarque, 'echantillon-1', 'statut.txt'), 'refuse'); break
    default: throw new Error(`manque inconnu : ${id}`)
  }
}

async function principal() {
  const entete = `${NOM} — racine ${rel(o.racine)}${o.temoin ? ' — témoin' : ''}`
  const s = creerRapport(NOM, IDS, { entete })
  const scriptGarde = path.join(o.racine, 'scripts', 'studio', 'garde.mjs')
  const docModeles = path.join(o.racine, 'docs', 'studio', 'modeles-messages.md')
  const docSeance = path.join(o.racine, 'docs', 'studio', 'seance.md')

  // ── SG-1 : chaque vault à manque refusé en code 3, sans rien créer, en nommant ce qui manque ─────────────────────
  if (o.temoin) s.saute('SG-1', SAUT_TEMOIN('scripts/studio/garde.mjs'))
  else if (!fs.existsSync(scriptGarde)) s.echoue('SG-1', `${rel(scriptGarde)} absent`)
  else {
    for (const m of MANQUES.manques) {
      const vault = path.join(TRAVAIL, 'sg1', m.id)
      copierVault(vault); appliquerManque(vault, m.id)
      const avant = fs.readdirSync(path.join(vault, 'marques', St.MARQUE_CLE), { recursive: true }).length
      const r = lancer(process.execPath, [scriptGarde, `--marque=${St.MARQUE_CLE}`, `--vault=${vault}`])
      const apres = fs.readdirSync(path.join(vault, 'marques', St.MARQUE_CLE), { recursive: true }).length
      if (r.code !== 3) s.echoue('SG-1', `${m.id} : code ${r.code}, 3 attendu`)
      else if (apres !== avant) s.echoue('SG-1', `${m.id} : ${apres - avant} fichier(s) créé(s) alors que le vault est refusé`)
      else if (!(r.stdout + r.stderr).includes(m.ligne_attendue)) s.echoue('SG-1', `${m.id} : la sortie ne nomme pas « ${m.ligne_attendue} » — ${court(r.stdout + r.stderr, 140)}`)
    }
    if (!s.enEchec('SG-1')) s.passe('SG-1', `${MANQUES.manques.length} vault(s) à manque, tous refusés en code 3 sans rien créer, la ligne ou le fichier manquant nommé`)
  }

  // ── SG-2 : vault-ok accepté, echantillon-1 puis echantillon-2, le dépôt inchangé ────────────────────────────────
  if (o.temoin) s.saute('SG-2', SAUT_TEMOIN('scripts/studio/garde.mjs'))
  else if (!fs.existsSync(scriptGarde)) s.echoue('SG-2', `${rel(scriptGarde)} absent`)
  else {
    const vault = path.join(TRAVAIL, 'sg2'); copierVault(vault)
    const avantDepot = lancer('git', ['status', '--porcelain'], { cwd: R }).stdout
    const r1 = lancer(process.execPath, [scriptGarde, `--marque=${St.MARQUE_CLE}`, `--vault=${vault}`])
    const dirMarque = path.join(vault, 'marques', St.MARQUE_CLE)
    const ech1 = path.join(dirMarque, 'echantillon-1')
    if (r1.code !== 0) s.echoue('SG-2', `code ${r1.code} sur vault-ok, 0 attendu : ${court(r1.stderr || r1.stdout, 160)}`)
    else if (!fs.existsSync(path.join(ech1, 'script.json'))) s.echoue('SG-2', 'echantillon-1/script.json absent')
    else if (!fs.existsSync(path.join(ech1, 'CONSIGNES.md'))) s.echoue('SG-2', 'echantillon-1/CONSIGNES.md absent')
    else {
      const r2 = lancer(process.execPath, [scriptGarde, `--marque=${St.MARQUE_CLE}`, `--vault=${vault}`])
      if (r2.code !== 0) s.echoue('SG-2', `second passage : code ${r2.code}, 0 attendu`)
      else if (!fs.existsSync(path.join(dirMarque, 'echantillon-2'))) s.echoue('SG-2', 'second passage : echantillon-2/ non créé')
      else {
        const apresDepot = lancer('git', ['status', '--porcelain'], { cwd: R }).stdout
        if (apresDepot !== avantDepot) s.echoue('SG-2', 'git status --porcelain du dépôt a changé après les deux passages')
        else s.passe('SG-2', 'code 0 sur vault-ok, echantillon-1 puis echantillon-2 créés, dépôt inchangé')
      }
    }
  }

  // ── SG-3 : docs/studio/modeles-messages.md renvoie à modeles.ts, aucun texte complet recopié ────────────────────
  if (o.temoin) s.saute('SG-3', SAUT_TEMOIN('docs/studio/modeles-messages.md'))
  else if (!fs.existsSync(docModeles)) s.echoue('SG-3', `${rel(docModeles)} absent`)
  else {
    const texte = lf(fs.readFileSync(docModeles, 'utf8'))
    const echecs = []
    for (const id of ['formulaire_studio_v1', 'studio_echantillon_v1', 'studio_offre_v1']) if (!texte.includes(id)) echecs.push(`ne nomme pas ${id}`)
    if (!/lib\/agents\/acquisition\/modeles\.ts/.test(texte)) echecs.push('ne renvoie pas à lib/agents/acquisition/modeles.ts')
    for (const interdit of ['ci-joint', 'vidéo jointe', 'j’ai préparé', 'je vous l’envoie']) if (texte.toLowerCase().includes(interdit.toLowerCase())) echecs.push(`porte « ${interdit} »`)
    const modelesTs = path.join(o.racine, 'lib', 'agents', 'acquisition', 'modeles.ts')
    if (fs.existsSync(modelesTs)) {
      const phrasesTs = new Set(lf(fs.readFileSync(modelesTs, 'utf8')).split(/[.!?\n]/).map((p) => p.trim().toLowerCase()).filter((p) => p.split(/\s+/).length > 12))
      const phrasesDoc = lf(texte).split(/[.!?\n]/).map((p) => p.trim().toLowerCase()).filter((p) => p.split(/\s+/).length > 12)
      const commune = phrasesDoc.find((p) => phrasesTs.has(p))
      if (commune) echecs.push(`phrase de plus de 12 mots commune avec modeles.ts : « ${court(commune, 100)} »`)
    }
    if (echecs.length) for (const x of echecs) s.echoue('SG-3', x)
    else s.passe('SG-3', 'renvoie à modeles.ts, nomme les trois modèles, aucun texte complet recopié')
  }

  // ── SG-4 : docs/studio/seance.md décrit la fabrication sur l'usine, dans l'ordre, sans les interdits ────────────
  if (o.temoin) s.saute('SG-4', SAUT_TEMOIN('docs/studio/seance.md'))
  else if (!fs.existsSync(docSeance)) s.echoue('SG-4', `${rel(docSeance)} absent`)
  else {
    const texte = lf(fs.readFileSync(docSeance, 'utf8')).toLowerCase()
    const echecs = []
    const ETAPES = ['studio_echantillon', 'garde.mjs', 'page produit', 'accord', 'allégation', 'produit', 'flux.1', 'ff_siwis', 'monter.mjs', 'pub-qa.mjs']
    let curseur = -1
    for (const etape of ETAPES) {
      // Cherche à partir d'APRÈS l'étape précédente (jamais depuis le début) : « produit » (seul) est une sous-chaîne
      // de « page produit » (étape antérieure de la liste) — indexOf sans position de départ retombait sur cette
      // occurrence-là, plus tôt dans le texte, et signalait « produit » hors ordre même quand le document le répète
      // bien plus loin, après « allégation » (défaut trouvé en jugeant réellement le patch de 026-155).
      const i = texte.indexOf(etape.toLowerCase(), curseur + 1)
      if (i < 0) { echecs.push(`étape absente : ${etape}`); continue }
      curseur = i
    }
    for (const requis of ['jamais publié', 'aucun témoignage', 'aucun modèle vidéo', 'aucune personne', 'aucun outil payant']) if (!texte.includes(requis)) echecs.push(`interdit absent : « ${requis} »`)
    for (const banni of ['elevenlabs', 'estimate_only', 'quota gratuit']) if (texte.includes(banni)) echecs.push(`porte « ${banni} » (voie gratuite du 25/09)`)
    if (echecs.length) for (const x of echecs) s.echoue('SG-4', x)
    else s.passe('SG-4', 'les étapes dans l\'ordre, les interdits présents, aucune trace d\'ElevenLabs')
  }

  // ── SG-5 : aucun nom de marque des jeux d'essai hors des jeux d'essai (critère réel, y compris --temoin) ───────
  {
    const prefixeFixtures = 'scripts/fixtures/026-pubs-contenu/studio/'
    // 026-128 a choisi la même marque fictive pour SES TROIS juges du Studio (studio-garde-qa, pub-qa, studio-offre-qa :
    // « les juges du Studio pubs », a537149a), un seul scénario cohérent de bout en bout ; leur usage — et la preuve
    // d'étalonnage de pub-qa qui le documente — ne sont pas une fuite des jeux d'essai de CE juge. Sans ces exclusions,
    // SG-5 échouait sur son propre dépôt (défaut trouvé en jugeant réellement le patch de 026-155).
    // 04/10 : gitGrepFichiers écarte d'office les COPIES de documents (docs/contexte-cloud/ : 2 729 fichiers de contexte pour Claude
    // cloud, reprise-cloud/, .orchestre/preuves/ : commun.mjs, COPIES_DE_DOCUMENTATION) ; SG-5 voyait la marque dans ces copies et
    // échouait sans qu'un fichier de lib/, app/, components/ ou scripts/ la porte. Le balayage garde tout le reste (sabotage : une
    // ligne qui nomme la marque dans lib/ rend SG-5 rouge, .orchestre/preuves/reglages-0410/juges-balayage.md).
    // .orchestre/ entier (fiches, décisions, journal verdicts.jsonl qui cite la marque d'un verdict) : le même écart que SO-1 et MQ-9,
    // jamais déployé ni du code ; il remplace '.orchestre/preuves/026-128/' (04/10 : le journal des verdicts nommait la marque).
    const exclure = [prefixeFixtures, 'scripts/pub-qa.mjs', 'scripts/studio-offre-qa.mjs', '.orchestre/']
    let fuites = []
    try {
      const parNom = gitGrepFichiers(R, St.MARQUE_NOM, { exclure })
      const parCle = gitGrepFichiers(R, St.MARQUE_CLE, { exclure })
      fuites = [...new Set([...parNom, ...parCle])]
    } catch (e) { s.echoue('SG-5', `git grep : ${court(e.message, 160)}`) }
    if (!s.enEchec('SG-5')) {
      if (fuites.length) s.echoue('SG-5', `« ${St.MARQUE_NOM} » ou « ${St.MARQUE_CLE} » dans un fichier suivi hors des jeux d'essai : ${fuites.slice(0, 5).join(', ')}`)
      else s.passe('SG-5', `« ${St.MARQUE_NOM} » et « ${St.MARQUE_CLE} » n'apparaissent que sous ${prefixeFixtures} (et les autres juges du Studio, 026-128), hors copies de documentation (docs/contexte-cloud/, docs/relais-fiches-claude/, reprise-cloud/) et .orchestre/`)
    }
  }

  // ── SG-6 : la garde ne lit rien hors du vault et de docs/studio/, n'écrit que sous marques/<cle>/ ────────────────
  if (o.temoin) s.saute('SG-6', SAUT_TEMOIN('scripts/studio/garde.mjs'))
  else if (!fs.existsSync(scriptGarde)) s.echoue('SG-6', `${rel(scriptGarde)} absent`)
  else {
    // Portée d'écriture : réutilise SG-2 (rien hors marques/<cle>/ dans le vault, dépôt inchangé). Portée de lecture :
    // non instrumentée ici (aucun outil de trace disponible sans dépendance nouvelle) — signalé, jamais simulé en vert.
    if (s.enEchec('SG-2')) s.echoue('SG-6', 'non jugé : SG-2 (la portée d\'écriture) est déjà en échec')
    else if (!s.evalue('SG-2')) s.echoue('SG-6', 'non jugé : SG-2 non évalué')
    else s.passe('SG-6', 'portée d\'écriture confirmée par SG-2 (rien hors marques/<cle>/, dépôt inchangé) ; portée de lecture non instrumentée — à surveiller sur le premier passage réel')
  }

  return s.fin()
}

if (!ARRET) process.exitCode = await principal()
