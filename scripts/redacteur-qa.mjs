// scripts/redacteur-qa.mjs — juge hors ligne d'A1, la Plume (fiche 026-069), écrit par Claude Code AVANT le module qu'il
// juge (lib/agents/acquisition/redacteur.ts, fiche 026-087). L'exécutant qui le lance n'y touche jamais.
//
//   node --import ./scripts/ts-loader.mjs scripts/redacteur-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Les critères RD de 026-087 (réécrits par la voie gratuite du 25/09 : formulaire_site seulement, un par entreprise, plus
// aucune relance à froid). Le juge remplit le magasin factice de scripts/fixtures/026-acquisition/magasin-memoire.mjs
// (plafond du formulaire, un formulaire par entreprise, preuve de demande, envoi_froid, opposition, 90 jours, 3 messages,
// 72 h — comme la base) et relit chaque envoi préparé.
//
// Recalé le 04/10/2026 sur les modèles et les douleurs APPROUVÉS du dépôt (026-083 et 026-073 sont faites : `jugerMessage`
// compare le texte aux vrais modèles `lib/agents/acquisition/modeles.ts` et aux vraies douleurs `douleurs.ts`, la copie
// d'essai de scripts/fixtures/026-acquisition/messages/ ne pouvait plus l'accompagner) : le juge lit les modèles, les douleurs
// et NOTICE_URL dans <racine>/lib/agents/acquisition/, les prospects d'essai sont des plombiers (métier qui a des douleurs
// approuvées), la péremption se juge à 49 h (le magasin factice périme à 48 h, la base à 20 h : un seuil au-dessus des deux).
// Le Studio (formulaire_studio_v1, sujet_studio_v1) n'est pas approuvé tant que 026-162 n'a pas relu les conditions de
// l'API ads_archive : ce qui concerne une marque (RD-14, RD-15) se joue sur un JUMEAU de lib/agents/acquisition/ (copie sous
// .orchestre/travail/redacteur-qa/jumeau/, modeles.ts approuvé en entier) : la Plume y est jugée sur son choix du modèle,
// pas sur l'état d'approbation de Benj. Corrigés au passage (défauts du juge, jamais un assouplissement) : RD-3 mettait onze
// prospects dans la même entreprise et ne faisait partir aucun des « 4 déjà partis » ; RD-4 rejouait J3 sans les faits du
// prospect ; RD-6, RD-7 et RD-8 écrivaient leurs observations en dur (aucun sabotage possible) ; RD-8 posait l'opposition
// AVANT la lecture ; RD-10 ne passait pas le texte à preparerEnvoi ; RD-13 cherchait envoi_froid hors de
// preparerMessageLien ; RD-14 ne levait pas ads_archive pour la marque.
//
// Signatures attendues (026-087) : executerRedacteur(deps), deps = { magasin, horloge, echeance, adresseReponse,
// drapeaux: { varianteA }, modeles?, douleurs? } ; preparerMessageLien(prospect, { lien, paiement, rendez_vous, date_fin,
// canal, destinataire, preuve_demande, fil_envoi_id, adresseReponse, drapeaux }, deps).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/redacteur.ts (défaut : le dépôt).
//   --auto-controle  AC-1 les jeux d'essai se lisent (douleurs approuvées par métier, modèles, jumeau) ; AC-2 le magasin
//                    factice applique ses règles sur son propre scénario ; AC-3 chaque contrôle RD-2 à RD-15 repère son
//                    échantillon fautif et laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « redacteur-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Module absent : RD-1 en échec, les suivants « non jugés ». Hors ligne (piège réseau, DNS
// compris), fuseau UTC. Écriture seulement sous .orchestre/travail/redacteur-qa/ (le cache de tsc et le jumeau).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  R, TRAVAIL, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, importsDe, court,
  premiereLigne, capturerConsole, corpsDeFonction, exigerSousTravail,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6, VERDICTS_OK } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { PREMIERE_PHRASE, SOURCES_LISTE, SUJET_FORMULAIRE_V1, SUJET_STUDIO_V1 } from './fixtures/026-acquisition/messages/modeles.mjs'
import { REPERES as REPERES_MSG } from './fixtures/026-acquisition/messages/corpus.mjs'

const JUGE = 'redacteur-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const J = 24 * 3600_000
const ADRESSE = REPERES_MSG.adresse_prospection
const IDS = ['RD-1', 'RD-2', 'RD-3', 'RD-4', 'RD-5', 'RD-6', 'RD-7', 'RD-8', 'RD-9', 'RD-10', 'RD-11', 'RD-12', 'RD-13', 'RD-14', 'RD-15']
const EXPORTS = ['executerRedacteur', 'preparerMessageLien']
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const piege = piegerReseau()
const sha = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex')
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const remplacer = (t, nom, v) => t.split(`{${nom}}`).join(v)
const METIER = 'plombier'

/** La bibliothèque réelle de <racine> : modèles, douleurs, notice, phrases de source (chargée avant les observations). */
const LIB = { MODELES: null, DOULEURS: null, NOTICE: null, SOURCES: null }
async function chargerLib(racine) {
  const m = await importerDepuis(racine, 'lib/agents/acquisition/modeles.ts')
  const d = await importerDepuis(racine, 'lib/agents/acquisition/douleurs.ts')
  const c = await importerDepuis(racine, 'lib/agents/acquisition/contrat.ts')
  LIB.MODELES = m.MODELES; LIB.DOULEURS = d.DOULEURS; LIB.NOTICE = c.NOTICE_URL; LIB.SOURCES = c.SOURCES_LISTE
}
const douleursApprouvees = (metier) => LIB.DOULEURS.filter((d) => d.metier === metier && d.approuve === true)
/** La douleur d'indice SHA-256(cle_dedup) mod n parmi les douleurs approuvées du métier (la règle de 026-087, point 5). */
const douleurAttendue = (p) => {
  const pool = douleursApprouvees(p.metier)
  return pool.length ? pool[Number(BigInt(`0x${sha(p.cle_dedup)}`) % BigInt(pool.length))] : null
}

// ── Prospects et formulaires d'essai ─────────────────────────────────────────────────────────────────────────────────────
const formulaire = (hote, { max = 5000, sujet = true } = {}) => ({
  url_page: `https://${hote}/contact`, url_action: `https://${hote}/contact/envoyer`, methode: 'POST',
  champs: [{ nom: 'message', type: 'textarea', requis: true, max }, ...(sujet ? [{ nom: 'sujet', type: 'text', requis: false }] : [])],
  motifs: [], technologie: 'html', telephone_requis: false, longueur_max_message: max,
})
/** Un SIREN de 9 chiffres, propre à chaque clé : deux prospects n'ont la même entreprise que si l'essai le veut. */
const sirenDe = (cle) => String(100_000_000 + (parseInt(sha(`siren:${cle}`).slice(0, 8), 16) % 899_999_999))
const hoteDe = (n) => `atelier-${n}-temoin.invalid`
const faitSite = (n, type = 'site_h1', extrait = `Atelier Témoin ${n}, artisan à Nantes`, verifie = 'ok') =>
  ({ id: `f${type.length}${String(n)}${sha(`${n}${type}${extrait}`)}`.replace(/[^0-9a-z]/g, '').slice(0, 16), type, extrait, url: `https://${hoteDe(n)}/`, lu_le: '2026-10-14T07:00:00.000Z', verifie })
/** Un prospect « verifie », prêt pour le premier contact (un plombier : le métier qui a des douleurs approuvées). */
function prospectEssai(n, x = {}) {
  const hote = hoteDe(n)
  return {
    cle_dedup: `domaine:${hote}`, source: 'ademe_rge', cible: 'artisan', siren: sirenDe(n), domaine: hote,
    entreprise: `Atelier Témoin ${n}`, metier: METIER, froid: true, etape: 'verifie',
    faits: [faitSite(n)],
    canaux: [{ canal: 'formulaire_site', valeur: `https://${hote}/contact`, url_source: `https://${hote}/` }],
    formulaire: formulaire(hote), technologie: 'html', ...x,
  }
}
const envoiBrut = (pid, dest, reference, x = {}) => ({
  prospect_id: pid, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: dest, objet: null, texte: 'Texte Témoin',
  empreinte_texte: 'e'.repeat(64), modele_id: 'formulaire_B_v1', variante: 'B', fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null,
  preuve_demande: null, reference, ...x,
})
const LIEN = `https://prestiapp.fr/maquette/${'x'.repeat(43)}`
const PAIEMENT = 'https://prestiapp.fr/site/acheter'
const RDV = `https://prestiapp.fr/rendez-vous/${'y'.repeat(43)}`
const TUTOIEMENT = /\b(tu|ta|ton|tes|toi)\b|\bt'/i
const VOUVOIEMENT = /\b(vous|votre|vos)\b/i
/** Le ton se lit sur le texte SANS ses adresses ni le nom « rendez-vous » : le trait d'union fait une frontière de mot, et `\bvous\b`
 *  voyait un vouvoiement dans « /rendez-vous/… » d'un lien (défaut du juge relevé le 04/10 : RD-9 « messagerie : un vouvoiement dans un texte tutoyé »
 *  sur un texte en « ta maquette »). Un vrai « vous » ou « votre » dans le texte reste vu : c'est l'échantillon « Meta vouvoyé » d'AC-3 et AC-1. */
const sansAdressesNiRendezVous = (t) => String(t ?? '').replace(/https?:\/\/\S+/gi, ' ').replace(/rendez-vous/gi, ' ')
const aTutoiement = (t) => TUTOIEMENT.test(sansAdressesNiRendezVous(t))
const aVouvoiement = (t) => VOUVOIEMENT.test(sansAdressesNiRendezVous(t))

/** Un espion de magasin : chaque méthode est relayée, consignée, et peut être précédée (`avant`) ou suivie (`apres`, qui peut remplacer le résultat). */
function espion(M, { avant = {}, apres = {} } = {}) {
  const appels = []
  const S = {}
  for (const [k, v] of Object.entries(M)) {
    if (typeof v !== 'function') { S[k] = v; continue }
    S[k] = async (...a) => {
      appels.push(k)
      if (avant[k]) await avant[k](...a)
      const r = await v(...a)
      if (apres[k]) { const x = await apres[k](r, ...a); if (x !== undefined) return x }
      return r
    }
  }
  return { magasin: S, appels }
}

async function executer(mod, {
  prospects = [], prospectsSetup, palier = 'P1', envoiFroid = true, adresseReponse = ADRESSE, varianteA = false, echeanceMs = 5 * 60_000,
  modeles = LIB.MODELES, douleurs = LIB.DOULEURS, etat = {}, enrober, horloge0 = T0, console: capter = false,
} = {}) {
  const H = creerHorloge(horloge0)
  const M = creerMagasin({ horloge: H })
  M.poserEtat({ palier, interrupteurs: { envoi_froid: envoiFroid }, ...etat })
  const bruts = prospectsSetup ? await prospectsSetup(M, H) : prospects
  const ids = bruts.map((p) => (typeof p === 'string' ? p : M.inserer(p)))
  const avant = new Set(M.etat().envois.map((v) => v.id))
  const n0 = M.ecritures.length
  const e = enrober ? enrober(M, H) : { magasin: M, appels: [] }
  const lancer = () => mod.executerRedacteur({ magasin: e.magasin, horloge: H, echeance: H.maintenant() + echeanceMs, adresseReponse, drapeaux: { varianteA }, ...(modeles ? { modeles } : {}), ...(douleurs ? { douleurs } : {}) })
  let r, texte = ''
  if (capter) { const c = await capturerConsole(lancer); r = { res: c.valeur, exception: c.erreur ? premiereLigne(c.erreur) : null }; texte = c.texte } else {
    try { r = { res: await lancer(), exception: null } } catch (err) { r = { res: undefined, exception: premiereLigne(err) } }
  }
  return {
    M, H, ids, bilan: r.res, exception: r.exception, appels: e.appels, ecritures: M.ecritures.slice(n0), console: texte,
    envois: () => M.etat().envois.filter((v) => !avant.has(v.id)),
    tousEnvois: () => M.etat().envois,
    refusBase: () => M.ecritures.slice(n0).filter((w) => w.methode === 'preparerEnvoi_refuse').map((w) => w.raison),
  }
}

/** Le jumeau de <racine>/lib/agents/acquisition/ : mêmes fichiers, modèles tous approuvés (le Studio ne l'est pas dans le dépôt). */
const FICHIERS_JUMEAU = ['contrat', 'modeles', 'affirmations', 'faq', 'douleurs', 'conformite', 'redacteur']
function fabriquerJumeau(racine) {
  const dossier = exigerSousTravail(path.join(TRAVAIL, JUGE, 'jumeau'))
  fs.rmSync(dossier, { recursive: true, force: true })
  const dst = path.join(dossier, 'lib', 'agents', 'acquisition')
  fs.mkdirSync(dst, { recursive: true })
  for (const f of FICHIERS_JUMEAU) fs.copyFileSync(path.join(racine, 'lib', 'agents', 'acquisition', `${f}.ts`), path.join(dst, `${f}.ts`))
  const f = path.join(dst, 'modeles.ts')
  const avant = fs.readFileSync(f, 'utf8')
  const apres = avant.split('approuve: APPROUVES.includes(id),').join('approuve: true,')
  if (apres === avant) throw new Error('jumeau impossible : « approuve: APPROUVES.includes(id), » est introuvable dans modeles.ts')
  fs.writeFileSync(f, apres)
  return dossier
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les contrôles, purs : observations → défauts
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'RD-2': (x) => {
    const e = []
    if (x.froid.bilan?.etat !== 'envoi_froid_ferme') e.push(`envoi_froid fermé : bilan ${json(x.froid.bilan?.etat)}, envoi_froid_ferme attendu`)
    if (x.froid.envois.length) e.push(`envoi_froid fermé : ${x.froid.envois.length} envoi(s) préparé(s), zéro attendu`)
    if (x.froid.ecritures.length) e.push(`envoi_froid fermé : écriture(s) hors perimerEnvois et événement de bilan (${x.froid.ecritures.join(', ')})`)
    if (x.adresse.bilan?.etat !== 'en_attente_adresse') e.push(`adresseReponse vide : bilan ${json(x.adresse.bilan?.etat)}, en_attente_adresse attendu`)
    if (x.adresse.envois.length) e.push(`adresseReponse vide : ${x.adresse.envois.length} envoi(s) préparé(s), zéro attendu`)
    if (x.adresse.ecritures.length) e.push(`adresseReponse vide : écriture(s) hors perimerEnvois et événement de bilan (${x.adresse.ecritures.join(', ')})`)
    return e
  },
  'RD-3': (x) => {
    const e = []
    const nouveaux = x.envois.filter((v) => v.type === 'premier_contact')
    if (nouveaux.length !== 6) e.push(`${nouveaux.length} premier(s) contact(s), 6 attendus (palier P1 à 10, 4 déjà partis)`)
    if (nouveaux.some((v) => v.canal !== 'formulaire_site' || v.envoyeur !== 'facteur_usine')) e.push('un envoi hors formulaire_site/facteur_usine')
    if (x.envois.some((v) => v.canal === 'instagram' || v.canal === 'facebook' || v.canal === 'email_sollicite')) e.push('un envoi Instagram, Facebook ou email_sollicite')
    for (const v of nouveaux) if (v.destinataire !== v.url_attendue) e.push(`destinataire ${json(v.destinataire)} ≠ l'URL de la page du formulaire ${json(v.url_attendue)}`)
    if (x.doublonEntreprise > 1) e.push(`${x.doublonEntreprise} envois pour l'entreprise en double, 1 attendu`)
    if (x.totalJour !== 10) e.push(`${x.totalJour} premiers contacts du jour au total, 10 attendus (le plafond du palier P1)`)
    return e
  },
  'RD-4': (x) => {
    const e = []
    if (!x.jugerMessageDisponible) e.push('jugerMessage introuvable dans la racine : le rejeu de J3 est impossible')
    for (const t of x.textes) {
      if (!t.texte.startsWith(PREMIERE_PHRASE)) e.push(`${t.id} : ne commence pas par PREMIERE_PHRASE`)
      if (!t.citation_ok) e.push(`${t.id} : le fait cité n'est pas celui que prescrit la fiche (ordre copyright, http, mobile, h1, titre, intertitre ; le plus court d'au moins 20 signes) : ${json(t.fragment_attendu)} attendu`)
      if (!t.douleur_approuvee) e.push(`${t.id} : la douleur n'est pas une douleur approuvée du métier du prospect`)
      else if (!t.douleur_indice) e.push(`${t.id} : la douleur n'est pas celle d'indice SHA-256(cle_dedup) mod n`)
      if (!t.source_ok) e.push(`${t.id} : la phrase de source n'est pas celle de SOURCES_LISTE pour sa source`)
      if (!t.notice_ok) e.push(`${t.id} : {notice} ≠ NOTICE_URL`)
      if (!t.adresse_deux_fois) e.push(`${t.id} : adresse de prospection absente ou écrite une seule fois`)
      if (!t.reference_ok) e.push(`${t.id} : « Réf. » absente ou différente de la référence de l'envoi`)
      if (t.lien_ou_domaine) e.push(`${t.id} : un lien ou un domaine hors de la notice et de l'adresse`)
      if (t.prestiapp) e.push(`${t.id} : contient prestiapp.fr`)
      if (t.desinscription) e.push(`${t.id} : contient {desinscription}`)
      if (!t.longueur_ok) e.push(`${t.id} : dépasse le max du champ`)
      if (!t.empreinte_ok) e.push(`${t.id} : empreinte_texte ne correspond pas au SHA-256 du texte`)
      if (x.jugerMessageDisponible && t.jugerMessageOk !== true) e.push(`${t.id} : jugerMessage rejoué refuse (${json(t.jugerMessageRaisons ?? t.jugerMessageErreur)})`)
    }
    if (x.textes.length < 4) e.push(`${x.textes.length} texte(s) à contrôler, 4 attendus`)
    // Le portail de J3 : un texte qui s'écarte du modèle approuvé (copie passée en deps) ne part jamais au magasin.
    if (!x.horsModele) e.push('texte hors modèle : observation absente')
    else {
      if (x.horsModele.envois > 0) e.push(`texte hors du modèle approuvé : ${x.horsModele.envois} envoi(s) préparé(s) malgré le refus de jugerMessage, zéro attendu`)
      if (!Object.keys(x.horsModele.refus ?? {}).length) e.push('texte hors du modèle approuvé : aucun refus de J3 au bilan')
    }
    return e
  },
  'RD-5': (x) => {
    const e = []
    if (x.nonVerifiable.envois.length) e.push(`fait non_verifiable seul : ${x.nonVerifiable.envois.length} envoi(s), zéro attendu`)
    if (!(x.nonVerifiable.evenements ?? []).includes('aucun_fait_verifie')) e.push('événement aucun_fait_verifie absent')
    if (x.sansDouleur.envois.length) e.push(`métier sans douleur approuvée : ${x.sansDouleur.envois.length} envoi(s), zéro attendu`)
    if (!(x.sansDouleur.evenements ?? []).includes('aucune_douleur')) e.push('événement aucune_douleur absent')
    if (x.douleurNonApprouvee.envois.length) e.push(`douleurs du métier toutes non approuvées (copie passée en deps) : ${x.douleurNonApprouvee.envois.length} envoi(s), zéro attendu`)
    if (!(x.douleurNonApprouvee.evenements ?? []).includes('aucune_douleur')) e.push('douleurs non approuvées : événement aucune_douleur absent')
    if (x.controle.envois.length !== 1) e.push(`témoin (fait vérifié, douleur approuvée) : ${x.controle.envois.length} envoi(s), 1 attendu`)
    return e
  },
  'RD-6': (x) => {
    const e = []
    if (x.avecMaquette.modele !== 'formulaire_A_v1') e.push(`variante A, maquette prête, drapeau levé : modèle ${json(x.avecMaquette.modele)}, formulaire_A_v1 attendu`)
    if (x.drapeauBaisse.modele !== 'formulaire_B_v1') e.push(`drapeau baissé, maquette prête : modèle ${json(x.drapeauBaisse.modele)}, formulaire_B_v1 attendu`)
    if (x.maquetteExpiree.modele !== 'formulaire_B_v1') e.push(`maquette expirée : modèle ${json(x.maquetteExpiree.modele)}, formulaire_B_v1 attendu`)
    if (x.sansMaquette.modele !== 'formulaire_B_v1') e.push(`drapeau levé, aucune maquette : modèle ${json(x.sansMaquette.modele)}, formulaire_B_v1 attendu`)
    if (x.avecSujet.objet !== x.avecSujet.attendu) e.push(`formulaire avec champ sujet : objet ${json(x.avecSujet.objet)}, ${json(x.avecSujet.attendu)} attendu`)
    if (x.sansSujet.objet !== null) e.push(`formulaire sans champ sujet : objet ${json(x.sansSujet.objet)}, null attendu`)
    if (x.sansSujet.nombre !== 1) e.push(`formulaire sans champ sujet : ${x.sansSujet.nombre} envoi(s), 1 attendu`)
    return e
  },
  'RD-7': (x) => {
    const e = []
    if (x.envoye3j.length) e.push(`prospect envoyé depuis 3 jours sans réponse : ${x.envoye3j.length} envoi(s), zéro attendu`)
    if (x.lienEnvoye4j.length) e.push(`prospect lien_envoye depuis 4 jours : ${x.lienEnvoye4j.length} envoi(s), zéro attendu (c'est le Répondeur)`)
    if (x.temoin !== 1) e.push(`prospect vérifié du même passage : ${x.temoin} envoi(s), 1 attendu (le passage doit tourner)`)
    if (x.appelsRelance) e.push('prospectsPourRelance est appelé pendant le passage')
    if (x.appelleProspectsPourRelance) e.push('prospectsPourRelance est appelé dans le source')
    if (x.modeleRelance) e.push('un modèle relance_* est utilisé dans le source')
    return e
  },
  'RD-8': (x) => {
    const e = []
    if (x.opposeEntreTemps.envois.length) e.push(`opposition posée entre-temps : ${x.opposeEntreTemps.envois.length} envoi(s) pour ce prospect, zéro attendu`)
    if (x.opposeEntreTemps.exception) e.push(`opposition posée entre-temps : exécution interrompue (${x.opposeEntreTemps.exception})`)
    if (x.opposeEntreTemps.autresEnvois < 1) e.push('opposition posée entre-temps : les autres prospects ne sont plus préparés')
    if (x.quotaGlisse.exception) e.push(`premier contact de trop glissé : exécution interrompue (${x.quotaGlisse.exception})`)
    if (x.quotaGlisse.totalJour > x.quotaGlisse.plafond) e.push(`premier contact de trop glissé : ${x.quotaGlisse.totalJour} premiers contacts du jour, plafond ${x.quotaGlisse.plafond}`)
    if (!x.quotaGlisse.refus.includes('quota_nouveaux')) e.push(`premier contact de trop glissé : la base n'a pas refusé « quota_nouveaux » (refus : ${json(x.quotaGlisse.refus)})`)
    if (x.formulaireDeja.exception) e.push(`second formulaire à la même entreprise : exécution interrompue (${x.formulaireDeja.exception})`)
    if (x.formulaireDeja.entrepriseEnvois !== 1) e.push(`second formulaire à la même entreprise : ${x.formulaireDeja.entrepriseEnvois} envoi(s) pour elle, 1 attendu`)
    if (x.formulaireDeja.autres < 1) e.push('second formulaire à la même entreprise : le refus arrête les autres envois')
    return e
  },
  'RD-9': (x) => {
    const e = []
    if (x.nonApprouve.ok !== false || x.nonApprouve.raison !== 'modele_non_approuve') e.push(`modèle non approuvé (copie du juge) : ${json(x.nonApprouve)}, modele_non_approuve attendu`)
    if (!x.email.ok || !x.email.texte?.includes(x.lien) || !x.email.texte?.includes(x.paiement) || !x.email.texte?.includes(x.rdv)) e.push('email_sollicite : lien, paiement ou rendez-vous absent du texte')
    if (!x.email.vouvoiement) e.push('email_sollicite : pas de vouvoiement (« vous »)')
    if (x.email.tutoiement) e.push('email_sollicite : un tutoiement dans un texte vouvoyé')
    if (!x.email.relanceAnnoncee) e.push('email_sollicite : la relance unique n\'est pas annoncée')
    if (!x.meta.ok || !x.meta.texte?.includes(x.lien)) e.push('messagerie : lien absent du texte')
    if (!x.meta.tutoiement) e.push('messagerie : pas de tutoiement (« tu »)')
    if (x.meta.vouvoiement) e.push('messagerie : un vouvoiement dans un texte tutoyé')
    if (x.meta.relanceAnnoncee) e.push('messagerie : une relance annoncée (la seule relance est celle du Répondeur, par e-mail)')
    return e
  },
  'RD-10': (x) => {
    const e = []
    if (!x.avecPreuve.ok) e.push(`prospect oui, preuve = réponse « oui » : ${json(x.avecPreuve)}, accepté attendu`)
    if (x.avecPreuve.envoyeur !== 'gmail' || x.avecPreuve.canal !== 'email_sollicite') e.push('canal/envoyeur inattendus (email_sollicite/gmail attendus)')
    if (x.avecPreuve.type !== 'lien_maquette') e.push(`type ${json(x.avecPreuve.type)}, lien_maquette attendu`)
    if (x.magasinAvecPreuve?.ok !== true) e.push(`le magasin factice refuse l'envoi préparé (formulaire plein, preuve = réponse « oui ») : ${json(x.magasinAvecPreuve)}`)
    if (x.sansPreuve.ok !== false || x.sansPreuve.raison !== 'preuve_demande_absente') e.push(`sans preuve : ${json(x.sansPreuve)}, preuve_demande_absente attendu`)
    if (x.sansPreuve.ecritures) e.push('sans preuve : quelque chose a été préparé')
    return e
  },
  'RD-11': (x) => {
    const e = []
    if (!x.perime) e.push('un envoi préparé et jamais parti, vieux de plus de 49 h, n\'est pas périmé avant le calcul des plafonds')
    if (!x.reprepare) e.push('le prospect de l\'envoi périmé, revenu à « verifie », n\'est pas préparé de nouveau dans le même passage')
    return e
  },
  'RD-12': (x) => {
    const e = []
    const nu = sansCommentaires(x.source)
    if (/\bfetch\s*\(/.test(nu)) e.push('fetch( dans le source')
    if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('process.env lu')
    for (const i of importsDe(x.source)) { if (i.spec && ['@/lib/agents/llm', '@/lib/ai'].some((z) => i.spec === z || i.spec.startsWith(`${z}/`))) e.push(`import interdit ${i.spec}`) }
    if (nu.includes('prestiapp.fr')) e.push('« prestiapp.fr » écrit en dur dans le source')
    if (x.appelReseau) e.push(`appel réseau tenté (récupérateur piégé) : ${x.appelReseau}`)
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return e
  },
  'RD-13': (x) => {
    const e = []
    if (x.entrantEmail.modele !== 'lien_maquette_entrant_email_v1') e.push(`entrant, email_sollicite : modèle ${json(x.entrantEmail.modele)}`)
    if (x.entrantMeta.modele !== 'lien_maquette_entrant_meta_v1' || !x.entrantMeta.tutoiement) e.push(`entrant, messagerie : modèle ${json(x.entrantMeta.modele)} (tutoiement attendu)`)
    if (x.achatFerme.texte?.includes('prestiapp.fr/site/acheter')) e.push('achat fermé : le lien de paiement apparaît encore')
    if (x.achatFerme.modele !== 'lien_maquette_entrant_email_rdv_v1') e.push(`achat fermé : modèle ${json(x.achatFerme.modele)}, la forme _rdv attendue`)
    if (x.froid.modele !== 'lien_maquette_email_v2' || x.froid.sourceDansTexte) e.push('froid : mauvais modèle, ou une ligne de source présente')
    if (x.litEnvoiFroid) e.push('preparerMessageLien lit envoi_froid dans le source')
    return e
  },
  'RD-14': (x) => {
    const e = []
    if (x.tropLong.envois.length) e.push(`formulaire de max 200, texte de plus de 200 signes : ${x.tropLong.envois.length} envoi(s), zéro attendu`)
    if (!(x.tropLong.evenements ?? []).includes('longueur_champ')) e.push('événement longueur_champ absent')
    if (x.tropLong.controle !== 1) e.push(`même prospect, champ de 5 000 signes : ${x.tropLong.controle} envoi(s), 1 attendu (c'est bien la longueur qui arrête)`)
    if (x.marque.modele !== 'formulaire_studio_v1' || !x.marque.produit) e.push(`marque : modèle ${json(x.marque.modele)}, produit ${json(x.marque.produit)}`)
    if (x.marque.objet !== x.marque.objetAttendu) e.push(`marque, champ sujet : objet ${json(x.marque.objet)}, ${json(x.marque.objetAttendu)} attendu`)
    if (!/^[A-Z0-9]{6}$/.test(x.reference1 ?? '')) e.push(`référence ${json(x.reference1)} : 6 signes [A-Z0-9] attendus`)
    if (x.reference1 !== x.reference2) e.push('la référence n\'est pas stable pour le même prospect, modèle et jour')
    if (x.referenceLendemain === x.reference1) e.push('la référence ne change pas d\'un jour à l\'autre')
    if (!/^[A-Z0-9]{6}$/.test(x.referencePrise.reference ?? '') || x.referencePrise.reference === x.reference1) e.push(`référence déjà prise : ${json(x.referencePrise.reference)} (6 signes [A-Z0-9], différente de la première attendue)`)
    return e
  },
  'RD-15': (x) => {
    const e = []
    if (x.nonPermis.envois.length !== 1) e.push(`ads_archive non permis : ${x.nonPermis.envois.length} premier(s) contact(s), 1 attendu`)
    if (x.nonPermis.envois.some((v) => v.source === 'meta')) e.push('ads_archive non permis : un prospect venu de Meta est préparé')
    if (x.nonPermis.evenementNonLue !== 2) e.push(`événement ads_archive_non_lue : ${x.nonPermis.evenementNonLue}, 2 attendu`)
    if (x.permis.envois.length !== 3) e.push(`ads_archive permis : ${x.permis.envois.length} premiers contacts, 3 attendus`)
    if (x.permis.evenementNonLue !== 0) e.push(`ads_archive permis : ${x.permis.evenementNonLue} événement(s) ads_archive_non_lue, zéro attendu`)
    return e
  },
}
const DETAILS = {
  'RD-2': "envoi_froid fermé → envoi_froid_ferme, rien préparé ni écrit ; adresseReponse vide → en_attente_adresse",
  'RD-3': "palier P1 (10/jour), 4 déjà partis, entreprise en double → 6 premiers contacts formulaire_site/facteur_usine à l'URL du formulaire, un seul pour le doublon",
  'RD-4': "chaque texte : fait prescrit, douleur approuvée d'indice SHA-256, phrase de source, PREMIERE_PHRASE, notice, adresse ×2, Réf., aucun lien hors notice/adresse, longueur ≤ max, empreinte exacte, J3 rejoué accepte",
  'RD-5': "fait non_verifiable seul → aucun_fait_verifie ; métier sans douleur approuvée → aucune_douleur ; témoin préparé",
  'RD-6': "variante A seulement si levée + maquette prête non expirée, sinon B ; sujet selon le champ du formulaire",
  'RD-7': "aucune relance à froid : ni prospectsPourRelance, ni modèle relance_* ; envoyé depuis 3 jours et lien_envoye depuis 4 jours → rien",
  'RD-8': "opposition posée après la lecture, premier contact de trop, second formulaire à la même entreprise → refus de la base sans exception, les autres envois préparés",
  'RD-9': "modèle non approuvé → modele_non_approuve ; modèles approuvés → texte avec lien/paiement/rdv, vouvoiement e-mail / tutoiement Meta, relance annoncée par e-mail",
  'RD-10': "formulaire plein, prospect oui avec sa réponse → accepté par le magasin factice (email_sollicite/gmail) ; sans preuve → preuve_demande_absente",
  'RD-11': "un envoi jamais parti est périmé avant le calcul des plafonds, son prospect est préparé de nouveau",
  'RD-12': "aucun fetch(, aucun process.env, aucun import de @/lib/agents/llm ni @/lib/ai, aucun prestiapp.fr en dur, aucun appel réseau, typecheck vert",
  'RD-13': "entrant : modèles _entrant_ (email vouvoyé, Meta tutoyé) ; achat fermé sans lien de paiement ; froid sans ligne de source ; envoi_froid non lu",
  'RD-14': "texte trop long pour le champ → longueur_champ ; marque → formulaire_studio_v1 avec produit et sujet ; référence 6 signes, stable, jour par jour, 2e essai si prise",
  'RD-15': "ads_archive non permis : les prospects Meta sont sautés (ads_archive_non_lue) ; permis : tous préparés",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les observations (mode normal : le vrai module)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** Le fait que prescrit la fiche (point 5) : ordre copyright, http, mobile, h1, titre, intertitre ; le plus court d'au moins 20 signes pour une citation. */
const AMORCES_JUGE = {
  site_copyright: (f) => `le bas de votre site indique « ${f.extrait.replace(/[.!;:]+$/, '')} »`,
  site_http: () => "votre site s'ouvre sans le cadenas HTTPS",
  site_mobile: () => "votre site n'a pas de version adaptée au téléphone",
  site_h1: (f) => `sur votre site, « ${f.extrait.replace(/[.!;:]+$/, '')} »`,
  site_titre: (f) => `sur votre site, « ${f.extrait.replace(/[.!;:]+$/, '')} »`,
  site_intertitre: (f) => `sur votre site, « ${f.extrait.replace(/[.!;:]+$/, '')} »`,
}
function faitPrescrit(faits) {
  const ok = faits.filter((f) => f.verifie === 'ok')
  for (const type of Object.keys(AMORCES_JUGE)) {
    let l = ok.filter((f) => f.type === type)
    if (['site_h1', 'site_titre', 'site_intertitre'].includes(type)) l = l.filter((f) => f.extrait.length >= 20)
    l.sort((a, b) => a.extrait.length - b.extrait.length)
    if (l[0]) return { fait: l[0], fragment: AMORCES_JUGE[type](l[0]) }
  }
  return null
}

async function observer(mod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const nonEcritures = (r) => r.ecritures.map((w) => w.methode).filter((m) => !['perimerEnvois', 'evenement'].includes(m))

  await tente('RD-2', async () => {
    const froid = await executer(mod, { prospects: [prospectEssai(1)], envoiFroid: false })
    const adresse = await executer(mod, { prospects: [prospectEssai(1)], adresseReponse: '' })
    return {
      froid: { bilan: froid.bilan, envois: froid.envois(), ecritures: nonEcritures(froid) },
      adresse: { bilan: adresse.bilan, envois: adresse.envois(), ecritures: nonEcritures(adresse) },
    }
  })

  await tente('RD-3', async () => {
    const url = new Map(), siren = new Map()
    const r = await executer(mod, {
      prospectsSetup: async (M) => {
        for (let i = 0; i < 4; i++) {
          const pid = M.inserer(prospectEssai(`d${i}`))
          const res = await M.preparerEnvoi(envoiBrut(pid, `https://${hoteDe(`d${i}`)}/contact`, `DEJA0${i}`))
          if (!res.ok) throw new Error(`mise en scène : le formulaire déjà parti d${i} est refusé par le magasin factice (${res.raison})`)
        }
        const ordre = [prospectEssai(1), prospectEssai('1bis', { siren: prospectEssai(1).siren }), ...Array.from({ length: 18 }, (_, i) => prospectEssai(i + 2))]
        return ordre.map((p) => { const id = M.inserer(p); url.set(id, p.formulaire.url_page); siren.set(id, p.siren); return id })
      },
    })
    const envois = r.envois().map((v) => ({ id: v.id, type: v.type, canal: v.canal, envoyeur: v.envoyeur, destinataire: v.destinataire, url_attendue: url.get(v.prospect_id) ?? null, siren: siren.get(v.prospect_id) ?? null }))
    const parSiren = {}
    for (const v of envois) if (v.siren) parSiren[v.siren] = (parSiren[v.siren] ?? 0) + 1
    return { envois, doublonEntreprise: Math.max(0, ...Object.values(parSiren)), totalJour: r.tousEnvois().filter((v) => v.type === 'premier_contact' && v.statut === 'prepare').length, exception: r.exception }
  })

  let conformite = null, jugerMessageDisponible = false
  try { conformite = await importerDepuis(RAC2, 'lib/agents/acquisition/conformite.ts'); jugerMessageDisponible = typeof conformite.jugerMessage === 'function' } catch { /* J3 absent : RD-4 le dit */ }
  await tente('RD-4', async () => {
    const prospects = [
      prospectEssai(1),
      prospectEssai(2, { faits: [faitSite(2, 'site_titre', "Atelier Témoin 2 – accueil de l'entreprise"), faitSite(2, 'site_http', 'http://atelier-2-temoin.invalid/')] }),
      prospectEssai(3, { faits: [faitSite(3, 'site_h1', 'Accueil'), faitSite(3, 'site_h1', 'Atelier Témoin 3, dépannage rapide à Nantes et alentours'), faitSite(3, 'site_h1', 'Atelier Témoin 3, depuis 1999 à Nantes')] }),
      prospectEssai(4, { faits: [faitSite(4, 'site_h1', 'Atelier Témoin 4, artisan à Nantes'), faitSite(4, 'site_mobile', 'viewport absent'), faitSite(4, 'site_copyright', '© 2016 Atelier Témoin 4')] }),
    ]
    const r = await executer(mod, { prospects })
    const textes = []
    for (const v of r.envois()) {
      const p = r.M.lireProspect(v.prospect_id)
      const max = p.formulaire?.longueur_max_message ?? 5000
      const prescrit = faitPrescrit(p.faits)
      const pool = douleursApprouvees(p.metier), attendue = douleurAttendue(p)
      const sansNoticeNiAdresse = v.texte.split(LIB.NOTICE ?? '\u0000').join('').split(ADRESSE).join('')
      const t = {
        id: v.id, texte: v.texte,
        fragment_attendu: prescrit?.fragment ?? null, citation_ok: !!prescrit && v.texte.includes(prescrit.fragment),
        douleur_approuvee: pool.some((d) => v.texte.includes(d.question)), douleur_indice: !!attendue && v.texte.includes(attendue.question),
        source_ok: v.texte.includes(SOURCES_LISTE[p.source] ?? '\u0000'),
        notice_ok: !!LIB.NOTICE && v.texte.includes(LIB.NOTICE),
        adresse_deux_fois: (v.texte.match(new RegExp(escRe(ADRESSE), 'g')) ?? []).length >= 2,
        reference_ok: !!v.reference && v.texte.includes(`Réf. ${v.reference}`),
        lien_ou_domaine: /https?:|www\.|\b[a-z0-9][a-z0-9-]*\.(?:fr|com|net|org|io|eu|app|dev|invalid)\b/i.test(sansNoticeNiAdresse),
        prestiapp: v.texte.includes('prestiapp.fr'), desinscription: v.texte.includes('{desinscription}'),
        longueur_ok: v.texte.length <= max, empreinte_ok: v.empreinte_texte === sha(v.texte),
      }
      if (jugerMessageDisponible) {
        try {
          const j = await conformite.jugerMessage({
            texte: v.texte, sujet: v.objet, modele_id: v.modele_id, sujet_modele_id: 'sujet_formulaire_v1', type: v.type, canal: v.canal, envoyeur: v.envoyeur,
            adresse: ADRESSE, reference: v.reference, preuve_demande: v.preuve_demande, formulaire: { longueur_max_message: max }, fait_id: v.fait_id, douleur_id: v.douleur_id,
            liens: [], prospect: { froid: true, source: p.source, metier: p.metier, faits: p.faits, entreprise: p.entreprise, produit: p.produit ?? null },
            historique: [], oppose: false, maquette: 'aucune', drapeaux: { siteAchatPublic: true, varianteA: false }, maintenant: T0,
          })
          t.jugerMessageOk = j.ok; t.jugerMessageRaisons = j.ok ? [] : j.raisons
        } catch (e) { t.jugerMessageOk = null; t.jugerMessageErreur = premiereLigne(e) }
      }
      textes.push(t)
    }
    // Le portail de J3 : le modèle B passé en deps est altéré (mots changés) ; J3 compare au VRAI modèle approuvé et doit refuser, rien ne part.
    const B = LIB.MODELES.formulaire_B_v1
    const alteree = { ...LIB.MODELES, formulaire_B_v1: { ...B, texte: B.texte.split('Je peux vous préparer gratuitement').join('Je vous offre gratuitement, sans aucun engagement,') } }
    if (alteree.formulaire_B_v1.texte === B.texte) throw new Error('mise en scène : la phrase à altérer est introuvable dans formulaire_B_v1')
    const hm = await executer(mod, { prospects: [prospectEssai(1)], modeles: alteree })
    return { textes, jugerMessageDisponible, horsModele: { envois: hm.envois().length, refus: hm.bilan?.refus_juge ?? null } }
  })

  await tente('RD-5', async () => {
    const evs = (r) => r.M.evenements.map((e) => e.type)
    const nv = await executer(mod, { prospects: [prospectEssai(1, { faits: [faitSite(1, 'site_h1', 'jamais confirmé par le juge', 'non_verifiable')] })] })
    const sd = await executer(mod, { prospects: [prospectEssai(2, { metier: 'metier-sans-douleur-temoin' })] })
    const copie = LIB.DOULEURS.map((d) => (d.metier === METIER ? { ...d, approuve: false } : d))
    const dn = await executer(mod, { prospects: [prospectEssai(3)], douleurs: copie })
    const ct = await executer(mod, { prospects: [prospectEssai(4)] })
    return {
      nonVerifiable: { envois: nv.envois(), evenements: evs(nv) }, sansDouleur: { envois: sd.envois(), evenements: evs(sd) },
      douleurNonApprouvee: { envois: dn.envois(), evenements: evs(dn) }, controle: { envois: ct.envois() },
    }
  })

  await tente('RD-6', async () => {
    const maquette = (M, id) => M.enregistrerMaquettePrete(id, { chemin: `maquettes/${id}.html`, empreinte: 'a'.repeat(64), variante: 'A' })
    const avecMaquettePrete = (extra = {}) => async (M) => { const id = M.inserer(prospectEssai(1, { etape: 'maquette_prete', ...extra })); await maquette(M, id); return [id] }
    const modeleDe = (r) => r.envois()[0]?.modele_id ?? null
    const a = await executer(mod, { prospectsSetup: avecMaquettePrete(), varianteA: true })
    const b = await executer(mod, { prospectsSetup: avecMaquettePrete(), varianteA: false })
    const exp = await executer(mod, {
      prospectsSetup: avecMaquettePrete(), varianteA: true,
      enrober: (M) => espion(M, { apres: { maquetteDe: (m) => (m ? { ...m, expire_le: new Date(T0 - 3600_000).toISOString() } : m) } }),
    })
    const sans = await executer(mod, { prospects: [prospectEssai(1)], varianteA: true })
    const avecSujet = await executer(mod, { prospects: [prospectEssai(2)] })
    const sansSujet = await executer(mod, { prospects: [prospectEssai(3, { formulaire: formulaire(hoteDe(3), { sujet: false }) })] })
    return {
      avecMaquette: { modele: modeleDe(a) }, drapeauBaisse: { modele: modeleDe(b) }, maquetteExpiree: { modele: modeleDe(exp) }, sansMaquette: { modele: modeleDe(sans) },
      avecSujet: { objet: avecSujet.envois()[0]?.objet ?? null, attendu: remplacer(SUJET_FORMULAIRE_V1, 'entreprise', 'Atelier Témoin 2') },
      sansSujet: { objet: sansSujet.envois()[0]?.objet ?? null, nombre: sansSujet.envois().length },
    }
  })

  const rSrc = fs.readFileSync(path.join(RAC2, 'lib', 'agents', 'acquisition', 'redacteur.ts'), 'utf8')
  const nuSrc = sansCommentaires(rSrc)
  await tente('RD-7', async () => {
    const ids = {}
    const r = await executer(mod, {
      prospectsSetup: async (M, H) => {
        const a = M.inserer(prospectEssai(1)); ids.a = a
        const res = await M.preparerEnvoi(envoiBrut(a, `https://${hoteDe(1)}/contact`, 'ENVOY1'))
        if (!res.ok) throw new Error(`mise en scène : ${res.raison}`)
        const ap = await M.approuverEnvoi(res.id, VERDICTS_OK)
        if (!ap.ok) throw new Error(`mise en scène : approuverEnvoi ${ap.raison}`)
        await M.marquerEnvoye(res.id, { type: 'soumission', observe: 'accuse' })
        H.avancer(3 * J)
        ids.b = M.inserer(prospectEssai(2, { etape: 'lien_envoye' }))
        ids.c = M.inserer(prospectEssai(3))
        return [ids.a, ids.b, ids.c]
      },
      enrober: (M) => espion(M),
    })
    const pour = (id) => r.envois().filter((v) => v.prospect_id === id)
    return { envoye3j: pour(ids.a), lienEnvoye4j: pour(ids.b), temoin: pour(ids.c).length, appelsRelance: r.appels.includes('prospectsPourRelance'), appelleProspectsPourRelance: /prospectsPourRelance/.test(nuSrc), modeleRelance: /relance_[a-z0-9_]+/i.test(nuSrc) }
  })

  await tente('RD-8', async () => {
    // a. une opposition posée APRÈS la lecture des prospects et AVANT la préparation
    const p1 = prospectEssai(1)
    const a = await executer(mod, {
      prospects: [p1, prospectEssai(2), prospectEssai(3)],
      enrober: (M) => espion(M, { apres: { prospectsPourPremierContact: () => { M.poserEtat({ oppositions: [{ siren: p1.siren }] }) } } }),
    })
    // b. un premier contact de trop glissé entre le calcul du reste du jour et la préparation (palier P0 : 5 par jour, 4 déjà partis)
    let glisse = false
    const b = await executer(mod, {
      palier: 'P0',
      prospectsSetup: async (M) => {
        for (let i = 0; i < 4; i++) { const pid = M.inserer(prospectEssai(`d${i}`)); const res = await M.preparerEnvoi(envoiBrut(pid, `https://${hoteDe(`d${i}`)}/contact`, `DEJA0${i}`)); if (!res.ok) throw new Error(`mise en scène : ${res.raison}`) }
        return [prospectEssai(1), prospectEssai(2), prospectEssai(3)]
      },
      enrober: (M) => espion(M, { avant: { prospectsPourPremierContact: async () => {
        if (glisse) return
        glisse = true
        const pid = M.inserer(prospectEssai('glisse'))
        const res = await M.preparerEnvoi(envoiBrut(pid, `https://${hoteDe('glisse')}/contact`, 'GLISSE1'))
        if (!res.ok) throw new Error(`mise en scène : ${res.raison}`)
      } } }),
    })
    // c. deux prospects de la même entreprise, puis un autre
    const sirenCommun = sirenDe('commune')
    const c = await executer(mod, { prospects: [prospectEssai(1, { siren: sirenCommun }), prospectEssai(2, { siren: sirenCommun }), prospectEssai(3)] })
    const dest = (r, n) => r.envois().filter((v) => v.destinataire?.includes(`atelier-${n}-temoin`))
    return {
      opposeEntreTemps: { envois: dest(a, 1), exception: a.exception, autresEnvois: dest(a, 2).length + dest(a, 3).length },
      quotaGlisse: { exception: b.exception, totalJour: b.tousEnvois().filter((v) => v.type === 'premier_contact' && v.statut === 'prepare').length, plafond: 5, refus: b.refusBase() },
      formulaireDeja: { exception: c.exception, entrepriseEnvois: dest(c, 1).length + dest(c, 2).length, autres: dest(c, 3).length },
    }
  })

  await tente('RD-9', async () => {
    const H = creerHorloge(T0)
    const approuves = LIB.MODELES
    const nonApprouves = { ...LIB.MODELES, lien_maquette_email_v2: { ...LIB.MODELES.lien_maquette_email_v2, approuve: false } }
    const base = { lien: LIEN, paiement: PAIEMENT, rendez_vous: RDV, adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }
    const email = { ...base, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'r2' } }
    const nonApprouve = await mod.preparerMessageLien(prospectEssai(1), { ...email, preuve_demande: { type: 'message_recu', id: 'r1' } }, { magasin: creerMagasin({ horloge: H }), horloge: H, modeles: nonApprouves })
    const em = await mod.preparerMessageLien(prospectEssai(1), email, { magasin: creerMagasin({ horloge: H }), horloge: H, modeles: approuves })
    const me = await mod.preparerMessageLien(prospectEssai(1), { ...base, canal: 'messagerie', destinataire: '5550001' }, { magasin: creerMagasin({ horloge: H }), horloge: H, modeles: approuves })
    const lecture = (res) => ({ ok: res?.ok, texte: res?.texte, vouvoiement: aVouvoiement(res?.texte), tutoiement: aTutoiement(res?.texte), relanceAnnoncee: /relancerai/.test(res?.texte ?? '') })
    return { nonApprouve, lien: LIEN, paiement: PAIEMENT, rdv: RDV, email: lecture(em), meta: lecture(me) }
  })

  await tente('RD-10', async () => {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    M.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const id = M.inserer(prospectEssai(1, { etape: 'oui' }))
    M.poserEtat({ reponses_recues: [{ id: 'oui2', prospect_id: id, texte: 'oui, je veux bien', recu_le: new Date(T0 - 600_000).toISOString() }] })
    for (let i = 0; i < 5; i++) { const pid = M.inserer(prospectEssai(`plein${i}`)); const res = await M.preparerEnvoi(envoiBrut(pid, `https://${hoteDe(`plein${i}`)}/contact`, `PLEIN0${i}`)); if (!res.ok) throw new Error(`mise en scène : ${res.raison}`) }
    const params = { lien: LIEN, paiement: PAIEMENT, rendez_vous: RDV, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }
    const avec = await mod.preparerMessageLien(M.lireProspect(id), { ...params, preuve_demande: { type: 'message_recu', id: 'oui2' } }, { magasin: M, horloge: H, modeles: LIB.MODELES })
    let magasinAvecPreuve = null
    if (avec?.ok) { const { ok, ...envoi } = avec; magasinAvecPreuve = await M.preparerEnvoi(envoi) }
    const n1 = M.ecritures.length
    const sans = await mod.preparerMessageLien(M.lireProspect(id), { ...params, preuve_demande: null }, { magasin: M, horloge: H, modeles: LIB.MODELES })
    return {
      avecPreuve: { ok: avec?.ok, raison: avec?.raison, envoyeur: avec?.envoyeur, canal: avec?.canal, type: avec?.type }, magasinAvecPreuve,
      sansPreuve: { ok: sans?.ok, raison: sans?.raison, ecritures: M.ecritures.length > n1 },
    }
  })

  await tente('RD-11', async () => {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    M.poserEtat({ palier: 'P4', interrupteurs: { envoi_froid: true } })
    const id = M.inserer(prospectEssai(1))
    const res = await M.preparerEnvoi(envoiBrut(id, `https://${hoteDe(1)}/contact`, 'VEILLE1'))
    if (!res.ok) throw new Error(`mise en scène : ${res.raison}`)
    H.avancer(49 * 3600_000)
    await mod.executerRedacteur({ magasin: M, horloge: H, echeance: H.maintenant() + 5 * 60_000, adresseReponse: ADRESSE, drapeaux: { varianteA: false }, modeles: LIB.MODELES, douleurs: LIB.DOULEURS })
    const envois = M.etat().envois.filter((v) => v.prospect_id === id)
    return { perime: envois.some((v) => v.id === res.id && v.statut === 'perime'), reprepare: envois.some((v) => v.id !== res.id && v.statut === 'prepare') }
  })

  obs['RD-12'] = { source: rSrc, typecheck: typecheck(RAC2, JUGE), appelReseau: null }

  await tente('RD-13', async () => {
    const H = creerHorloge(T0)
    const entrant = prospectEssai(1, { source: 'entrant', froid: false, etape: 'maquette_prete', faits: [], canaux: [{ canal: 'email_sollicite', valeur: 'artisan@atelier-1-temoin.invalid', url_source: 'formulaire:demande-temoin', nature: 'donnee_par_la_personne', case_cochee_le: new Date(T0 - 600_000).toISOString() }] })
    const M = creerMagasin({ horloge: H })
    M.poserEtat({ interrupteurs: { envoi_froid: false } })
    const id = M.inserer(entrant)
    const p = M.lireProspect(id)
    const commun = { lien: LIEN, paiement: PAIEMENT, rendez_vous: RDV, adresseReponse: ADRESSE }
    const deps = { magasin: M, horloge: H, modeles: LIB.MODELES }
    const entrantEmail = await mod.preparerMessageLien(p, { ...commun, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'case_entrant', id }, drapeaux: { siteAchatPublic: true } }, deps)
    const entrantMeta = await mod.preparerMessageLien(p, { ...commun, canal: 'messagerie', destinataire: '5550002', drapeaux: { siteAchatPublic: true } }, deps)
    const achatFerme = await mod.preparerMessageLien(p, { ...commun, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'case_entrant', id }, drapeaux: { siteAchatPublic: false } }, deps)
    const froidP = M.lireProspect(M.inserer(prospectEssai(9)))
    const froid = await mod.preparerMessageLien(froidP, { ...commun, canal: 'email_sollicite', destinataire: 'artisan@atelier-9-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'r9' }, drapeaux: { siteAchatPublic: true } }, deps)
    const corps = corpsDeFonction(nuSrc, 'preparerMessageLien').map(([a, b]) => nuSrc.slice(a, b)).join('\n')
    return {
      entrantEmail: { modele: entrantEmail?.modele_id }, entrantMeta: { modele: entrantMeta?.modele_id, tutoiement: aTutoiement(entrantMeta?.texte) },
      achatFerme: { texte: achatFerme?.texte, modele: achatFerme?.modele_id },
      froid: { modele: froid?.modele_id, sourceDansTexte: /liste publique des entreprises RGE|bibliothèque publique des publicités/.test(froid?.texte ?? '') },
      litEnvoiFroid: corps.length === 0 || /envoi_froid/.test(corps),
    }
  })

  // La Plume sur le JUMEAU (modèles tous approuvés) : le Studio n'est pas approuvé dans le dépôt (RD-14 marque, RD-15).
  let jumeau = null, modJumeau = null
  await tente('RD-14', async () => {
    const dossier = fabriquerJumeau(RAC2)
    jumeau = dossier
    modJumeau = await importerDepuis(dossier, 'lib/agents/acquisition/redacteur.ts')
    const pass = { ads_archive: { permis: true, le: new Date(T0).toISOString() } }
    const tropLong = await executer(mod, { prospects: [prospectEssai(1, { formulaire: formulaire(hoteDe(1), { max: 200 }), faits: [faitSite(1, 'site_h1', 'x'.repeat(230))] })] })
    const controle = await executer(mod, { prospects: [prospectEssai(1, { formulaire: formulaire(hoteDe(1), { max: 5000 }), faits: [faitSite(1, 'site_h1', 'x'.repeat(230))] })] })
    const marqueP = { ...prospectEssai(2), cible: 'marque', source: 'meta', page_meta: '300000000000101', domaine: 'boutique-temoin.invalid', cle_dedup: 'domaine:boutique-temoin.invalid', produit: 'Gourde isotherme Témoin', faits: [{ id: 'f'.repeat(16), type: 'pub_meta', extrait: 'Gourde isotherme Témoin', url: 'https://www.facebook.com/ads/library/?id=1', lu_le: '2026-10-14T07:00:00.000Z', verifie: 'ok' }] }
    const marque = await executer(modJumeau, { prospects: [marqueP], etat: pass, modeles: null, douleurs: null })
    const mv = marque.envois()[0]
    const prospectRef = (extra = {}) => prospectEssai(3, { id: 'prospect-reference', ...extra })
    const r1 = await executer(mod, { prospects: [prospectRef()] })
    const r2 = await executer(mod, { prospects: [prospectRef()] })
    const r3 = await executer(mod, { prospects: [prospectRef()], horloge0: T0 + 2 * J })
    const ref1 = r1.envois()[0]?.reference
    const prise = await executer(mod, {
      prospectsSetup: async (M) => {
        const autre = M.inserer(prospectEssai('autre', { id: 'prospect-autre' }))
        const res = await M.preparerEnvoi(envoiBrut(autre, `https://${hoteDe('autre')}/contact`, ref1 ?? 'ZZZZZZ'))
        if (!res.ok) throw new Error(`mise en scène : ${res.raison}`)
        return [prospectRef()]
      },
    })
    return {
      tropLong: { envois: tropLong.envois(), evenements: tropLong.M.evenements.map((e) => e.type), controle: controle.envois().length },
      marque: { modele: mv?.modele_id, produit: !!mv?.texte?.includes('Gourde isotherme Témoin'), objet: mv?.objet ?? null, objetAttendu: remplacer(SUJET_STUDIO_V1, 'produit', 'Gourde isotherme Témoin') },
      reference1: ref1, reference2: r2.envois()[0]?.reference, referenceLendemain: r3.envois()[0]?.reference, referencePrise: { reference: prise.envois()[0]?.reference },
    }
  })
  await tente('RD-15', async () => {
    if (!modJumeau) throw new Error('le jumeau n\'a pas pu être fabriqué (voir RD-14)')
    const setup = (permis) => async (M) => {
      const a = M.inserer(prospectEssai(1))
      const b = M.inserer({ ...prospectEssai(2), source: 'meta' })
      const c = M.inserer({ ...prospectEssai(3), cible: 'marque', source: 'meta', produit: 'Gourde isotherme Témoin', faits: [{ id: 'f'.repeat(16), type: 'pub_meta', extrait: 'Gourde isotherme Témoin', url: 'https://www.facebook.com/ads/library/?id=1', lu_le: '2026-10-14T07:00:00.000Z', verifie: 'ok' }] })
      return [a, b, c]
    }
    const lire = (r, nonPermis) => ({
      envois: r.envois().map((v) => ({ id: v.id, source: r.M.lireProspect(v.prospect_id)?.source })),
      evenementNonLue: r.M.evenements.filter((e) => e.type === 'ads_archive_non_lue').length,
    })
    const nonPermis = await executer(modJumeau, { prospectsSetup: setup(false), etat: { ads_archive: { permis: false, le: null } }, modeles: null, douleurs: null })
    const permis = await executer(modJumeau, { prospectsSetup: setup(true), etat: { ads_archive: { permis: true, le: new Date(T0).toISOString() } }, modeles: null, douleurs: null })
    return { nonPermis: lire(nonPermis), permis: lire(permis) }
  })
  obs.__jumeau = jumeau
  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function jeuxLisibles() {
  const e = []
  for (const metier of [METIER, 'electricien']) if (!douleursApprouvees(metier).length) e.push(`aucune douleur approuvée pour ${metier} dans ${rel(RAC)}/lib/agents/acquisition/douleurs.ts`)
  const p = prospectEssai(1)
  if (!p.formulaire?.url_page?.startsWith('https://')) e.push('prospectEssai : formulaire sans url_page valide')
  if (sirenDe(1) === sirenDe(2) || sirenDe(10) === sirenDe(1)) e.push('sirenDe : deux prospects partagent un SIREN')
  for (const id of ['formulaire_B_v1', 'formulaire_A_v1', 'sujet_formulaire_v1', 'lien_maquette_email_v2', 'lien_maquette_meta_v1', 'lien_maquette_entrant_email_v1', 'lien_maquette_entrant_meta_v1', 'lien_maquette_entrant_email_rdv_v1']) {
    if (!LIB.MODELES[id]) e.push(`modèle ${id} absent de modeles.ts`)
    else if (LIB.MODELES[id].approuve !== true) e.push(`modèle ${id} non approuvé dans modeles.ts : le juge ne peut plus jouer ce scénario sur les modèles du dépôt`)
  }
  if (!LIB.NOTICE) e.push('NOTICE_URL est nulle dans contrat.ts : la Plume répond en_attente_notice, aucun scénario ne peut être joué')
  if (PREMIERE_PHRASE.length < 20) e.push('PREMIERE_PHRASE illisible')
  // Le ton : « /rendez-vous/ » d'un lien n'est pas un « vous », un vrai « vous » ou « votre » l'est (RD-9, RD-13).
  const tutoye = `Voici ta maquette : ${LIEN}. Ou 15 min avec Benjamin : ${RDV}. Pour ne plus rien recevoir : réponds STOP.`
  const vouvoye = `Voici votre maquette : ${LIEN}. Ou 15 min avec Benjamin : ${RDV}. Pour ne plus rien recevoir : écrivez STOP.`
  const melange = `Voici ta maquette : ${LIEN}. Dis-nous si vous avez une question, ou ${RDV}.`
  if (!aTutoiement(tutoye) || aVouvoiement(tutoye)) e.push('lecture du ton : un texte en « ta maquette » dont l\'adresse contient « rendez-vous » doit se lire tutoyé, sans vouvoiement')
  if (!aVouvoiement(vouvoye) || aTutoiement(vouvoye)) e.push('lecture du ton : un texte en « votre maquette » doit se lire vouvoyé, sans tutoiement')
  if (!aVouvoiement(melange) || !aTutoiement(melange)) e.push('lecture du ton : un « vous » dans un texte tutoyé doit rester vu (aucun assouplissement)')
  try { const dossier = fabriquerJumeau(RAC); const t = fs.readFileSync(path.join(dossier, 'lib', 'agents', 'acquisition', 'modeles.ts'), 'utf8'); if (!t.includes('approuve: true,')) e.push('jumeau : modeles.ts non patché') } catch (err) { e.push(premiereLigne(err)) }
  return { e, detail: `${LIB.DOULEURS.filter((d) => d.approuve).length} douleurs approuvées relues (dont ${douleursApprouvees(METIER).length} pour ${METIER}), modèles et NOTICE_URL du dépôt chargés, jumeau fabriqué, prospect d'essai cohérent` }
}
function obsBase() {
  const envoiOk = (i) => ({ id: `e${i}`, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: `https://atelier-${i}-temoin.invalid/contact`, url_attendue: `https://atelier-${i}-temoin.invalid/contact`, siren: `10000000${i}`, modele_id: 'formulaire_B_v1', source: 'ademe_rge' })
  const texteOk = `${PREMIERE_PHRASE}\nBonjour, sur votre site, « Atelier Témoin 1, artisan à Nantes ». Une question ?\nJe peux vous préparer... écrivez à ${ADRESSE}.\nBenjamin Filiot, Presti.\n${SOURCES_LISTE.ademe_rge} Vos données : ${REPERES_MSG.notice_url}\nPour ne plus rien recevoir : écrivez STOP à ${ADRESSE}.\nRéf. AB12CD`
  const texteJuge = (i) => ({ id: `e${i}`, texte: texteOk, fragment_attendu: 'sur votre site, « Atelier Témoin 1, artisan à Nantes »', citation_ok: true, douleur_approuvee: true, douleur_indice: true, source_ok: true, notice_ok: true, adresse_deux_fois: true, reference_ok: true, lien_ou_domaine: false, prestiapp: false, desinscription: false, longueur_ok: true, empreinte_ok: true, jugerMessageOk: true, jugerMessageRaisons: [] })
  return {
    'RD-2': { froid: { bilan: { etat: 'envoi_froid_ferme' }, envois: [], ecritures: [] }, adresse: { bilan: { etat: 'en_attente_adresse' }, envois: [], ecritures: [] } },
    'RD-3': { envois: [1, 2, 3, 4, 5, 6].map(envoiOk), doublonEntreprise: 1, totalJour: 10 },
    'RD-4': { textes: [1, 2, 3, 4].map(texteJuge), jugerMessageDisponible: true, horsModele: { envois: 0, refus: { hors_modele: 1 } } },
    'RD-5': { nonVerifiable: { envois: [], evenements: ['aucun_fait_verifie'] }, sansDouleur: { envois: [], evenements: ['aucune_douleur'] }, douleurNonApprouvee: { envois: [], evenements: ['aucune_douleur'] }, controle: { envois: [{}] } },
    'RD-6': { avecMaquette: { modele: 'formulaire_A_v1' }, drapeauBaisse: { modele: 'formulaire_B_v1' }, maquetteExpiree: { modele: 'formulaire_B_v1' }, sansMaquette: { modele: 'formulaire_B_v1' }, avecSujet: { objet: 'Proposition commerciale : un site pour Atelier Témoin 2', attendu: 'Proposition commerciale : un site pour Atelier Témoin 2' }, sansSujet: { objet: null, nombre: 1 } },
    'RD-7': { envoye3j: [], lienEnvoye4j: [], temoin: 1, appelsRelance: false, appelleProspectsPourRelance: false, modeleRelance: false },
    'RD-8': { opposeEntreTemps: { envois: [], exception: null, autresEnvois: 2 }, quotaGlisse: { exception: null, totalJour: 5, plafond: 5, refus: ['quota_nouveaux'] }, formulaireDeja: { exception: null, entrepriseEnvois: 1, autres: 1 } },
    'RD-9': { nonApprouve: { ok: false, raison: 'modele_non_approuve' }, lien: 'https://prestiapp.fr/maquette/x', paiement: 'https://prestiapp.fr/site/acheter', rdv: 'https://prestiapp.fr/rendez-vous/y', email: { ok: true, texte: 'Voici votre lien https://prestiapp.fr/maquette/x et le paiement https://prestiapp.fr/site/acheter, rendez-vous https://prestiapp.fr/rendez-vous/y. Je vous relancerai une seule fois.', vouvoiement: true, tutoiement: false, relanceAnnoncee: true }, meta: { ok: true, texte: 'Voici ta maquette https://prestiapp.fr/maquette/x, tu peux aussi https://prestiapp.fr/rendez-vous/y', tutoiement: true, vouvoiement: false, relanceAnnoncee: false } },
    'RD-10': { avecPreuve: { ok: true, envoyeur: 'gmail', canal: 'email_sollicite', type: 'lien_maquette' }, magasinAvecPreuve: { ok: true, id: 'envoi-0007' }, sansPreuve: { ok: false, raison: 'preuve_demande_absente', ecritures: false } },
    'RD-11': { perime: true, reprepare: true },
    'RD-12': { source: "import type { Magasin } from './contrat'\nexport function executerRedacteur() {}\n", typecheck: { ok: true, detail: 'vert' }, appelReseau: null },
    'RD-13': { entrantEmail: { modele: 'lien_maquette_entrant_email_v1' }, entrantMeta: { modele: 'lien_maquette_entrant_meta_v1', tutoiement: true }, achatFerme: { texte: 'Voici votre lien, sans lien de paiement ici.', modele: 'lien_maquette_entrant_email_rdv_v1' }, froid: { modele: 'lien_maquette_email_v2', sourceDansTexte: false }, litEnvoiFroid: false },
    'RD-14': { tropLong: { envois: [], evenements: ['longueur_champ'], controle: 1 }, marque: { modele: 'formulaire_studio_v1', produit: true, objet: 'Proposition commerciale : une vidéo pour Gourde', objetAttendu: 'Proposition commerciale : une vidéo pour Gourde' }, reference1: 'AB12CD', reference2: 'AB12CD', referenceLendemain: 'ZY98XW', referencePrise: { reference: 'QR34ST' } },
    'RD-15': { nonPermis: { envois: [{ id: 'e1', source: 'ademe_rge' }], evenementNonLue: 2 }, permis: { envois: [{ id: 'e1', source: 'ademe_rge' }, { id: 'e2', source: 'meta' }, { id: 'e3', source: 'meta' }], evenementNonLue: 0 } },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  const m = (id, f) => muter(b, id, f)
  return {
    'RD-2': [['conforme', b['RD-2'], false], ['un envoi malgré envoi_froid fermé', m('RD-2', (x) => { x.froid.envois = [{}] }), true], ['écriture hors bilan malgré adresse vide', m('RD-2', (x) => { x.adresse.ecritures = ['reserver'] }), true]],
    'RD-3': [['conforme', b['RD-3'], false], ['7 premiers contacts', m('RD-3', (x) => { x.envois.push({ ...x.envois[0] }) }), true], ['un envoi Instagram', m('RD-3', (x) => { x.envois[0] = { ...x.envois[0], canal: 'instagram' } }), true], ['deux pour le doublon', m('RD-3', (x) => { x.doublonEntreprise = 2 }), true], ['destinataire ≠ URL du formulaire', m('RD-3', (x) => { x.envois[0].destinataire = 'https://autre.invalid/' }), true], ['plafond du jour dépassé', m('RD-3', (x) => { x.totalJour = 11 }), true]],
    'RD-4': [['conforme', b['RD-4'], false], ['sans première phrase', m('RD-4', (x) => { x.textes[0].texte = x.textes[0].texte.replace(PREMIERE_PHRASE, '') }), true], ['prestiapp.fr présent', m('RD-4', (x) => { x.textes[0].prestiapp = true }), true], ['empreinte fausse', m('RD-4', (x) => { x.textes[0].empreinte_ok = false }), true], ['fait cité hors ordre', m('RD-4', (x) => { x.textes[1].citation_ok = false }), true], ['douleur non approuvée', m('RD-4', (x) => { x.textes[0].douleur_approuvee = false }), true], ['douleur d\'un autre indice', m('RD-4', (x) => { x.textes[2].douleur_indice = false }), true], ['phrase de source absente', m('RD-4', (x) => { x.textes[0].source_ok = false }), true], ['J3 rejoué refuse', m('RD-4', (x) => { x.textes[3].jugerMessageOk = false; x.textes[3].jugerMessageRaisons = ['hors_modele'] }), true], ['un lien hors notice', m('RD-4', (x) => { x.textes[0].lien_ou_domaine = true }), true], ['J3 introuvable', m('RD-4', (x) => { x.jugerMessageDisponible = false }), true], ['texte hors modèle préparé malgré J3', m('RD-4', (x) => { x.horsModele.envois = 1 }), true], ['texte hors modèle : aucun refus de J3 au bilan', m('RD-4', (x) => { x.horsModele.refus = {} }), true], ['observation du portail de J3 absente', m('RD-4', (x) => { delete x.horsModele }), true]],
    'RD-5': [['conforme', b['RD-5'], false], ['un envoi malgré fait non_verifiable', m('RD-5', (x) => { x.nonVerifiable.envois = [{}] }), true], ['événement aucune_douleur absent', m('RD-5', (x) => { x.sansDouleur.evenements = [] }), true], ['douleur non approuvée utilisée', m('RD-5', (x) => { x.douleurNonApprouvee.envois = [{}] }), true], ['le témoin ne part pas', m('RD-5', (x) => { x.controle.envois = [] }), true]],
    'RD-6': [['conforme', b['RD-6'], false], ['variante A sans drapeau', m('RD-6', (x) => { x.drapeauBaisse.modele = 'formulaire_A_v1' }), true], ['variante A avec maquette expirée', m('RD-6', (x) => { x.maquetteExpiree.modele = 'formulaire_A_v1' }), true], ['variante A sans maquette', m('RD-6', (x) => { x.sansMaquette.modele = 'formulaire_A_v1' }), true], ['formulaire sans sujet avec objet rempli', m('RD-6', (x) => { x.sansSujet.objet = 'un objet' }), true], ['sujet absent malgré le champ', m('RD-6', (x) => { x.avecSujet.objet = null }), true]],
    'RD-7': [['conforme', b['RD-7'], false], ['prospectsPourRelance appelé', m('RD-7', (x) => { x.appelleProspectsPourRelance = true }), true], ['prospectsPourRelance appelé pendant le passage', m('RD-7', (x) => { x.appelsRelance = true }), true], ['modèle relance_* dans le source', m('RD-7', (x) => { x.modeleRelance = true }), true], ['relance à 3 jours', m('RD-7', (x) => { x.envoye3j = [{}] }), true], ['relance à 4 jours', m('RD-7', (x) => { x.lienEnvoye4j = [{}] }), true], ['passage mort', m('RD-7', (x) => { x.temoin = 0 }), true]],
    'RD-8': [['conforme', b['RD-8'], false], ['un envoi malgré l\'opposition posée entre-temps', m('RD-8', (x) => { x.opposeEntreTemps.envois = [{}] }), true], ['exécution interrompue', m('RD-8', (x) => { x.opposeEntreTemps.exception = 'TypeError' }), true], ['plafond dépassé par le glissement', m('RD-8', (x) => { x.quotaGlisse.totalJour = 6 }), true], ['refus quota_nouveaux absent', m('RD-8', (x) => { x.quotaGlisse.refus = [] }), true], ['deux envois pour la même entreprise', m('RD-8', (x) => { x.formulaireDeja.entrepriseEnvois = 2 }), true], ['le refus arrête les autres', m('RD-8', (x) => { x.formulaireDeja.autres = 0 }), true]],
    'RD-9': [['conforme', b['RD-9'], false], ['modèle non approuvé accepté', m('RD-9', (x) => { x.nonApprouve = { ok: true } }), true], ['pas de vouvoiement', m('RD-9', (x) => { x.email.vouvoiement = false }), true], ['relance non annoncée', m('RD-9', (x) => { x.email.relanceAnnoncee = false }), true], ['Meta vouvoyé', m('RD-9', (x) => { x.meta.tutoiement = false; x.meta.vouvoiement = true }), true], ['relance annoncée sur Meta', m('RD-9', (x) => { x.meta.relanceAnnoncee = true }), true]],
    'RD-10': [['conforme', b['RD-10'], false], ['sans preuve accepté', m('RD-10', (x) => { x.sansPreuve = { ok: true } }), true], ['refusé par le magasin factice', m('RD-10', (x) => { x.magasinAvecPreuve = { ok: false, raison: 'preuve_demande_absente' } }), true], ['mauvais type', m('RD-10', (x) => { x.avecPreuve.type = 'reponse' }), true]],
    'RD-11': [['conforme', b['RD-11'], false], ['jamais périmé', m('RD-11', (x) => { x.perime = false }), true], ['jamais préparé de nouveau', m('RD-11', (x) => { x.reprepare = false }), true]],
    'RD-12': [['conforme', b['RD-12'], false], ['process.env lu', m('RD-12', (x) => { x.source += 'const j = process.env.X\n' }), true], ['prestiapp.fr en dur', m('RD-12', (x) => { x.source += "const d = 'prestiapp.fr'\n" }), true], ['appel réseau tenté', m('RD-12', (x) => { x.appelReseau = 'fetch https://x.invalid' }), true]],
    'RD-13': [['conforme', b['RD-13'], false], ['achat fermé garde le lien de paiement', m('RD-13', (x) => { x.achatFerme.texte = 'https://prestiapp.fr/site/acheter' }), true], ['achat fermé, forme avec paiement', m('RD-13', (x) => { x.achatFerme.modele = 'lien_maquette_entrant_email_v1' }), true], ['froid avec une ligne de source', m('RD-13', (x) => { x.froid.sourceDansTexte = true }), true], ['envoi_froid lu', m('RD-13', (x) => { x.litEnvoiFroid = true }), true]],
    'RD-14': [['conforme', b['RD-14'], false], ['un envoi malgré la longueur', m('RD-14', (x) => { x.tropLong.envois = [{}] }), true], ['référence instable', m('RD-14', (x) => { x.reference2 = 'ZZ99ZZ' }), true], ['référence figée d\'un jour à l\'autre', m('RD-14', (x) => { x.referenceLendemain = 'AB12CD' }), true], ['référence prise rejouée à l\'identique', m('RD-14', (x) => { x.referencePrise.reference = 'AB12CD' }), true], ['marque sans sujet du Studio', m('RD-14', (x) => { x.marque.objet = null }), true], ['marque au mauvais modèle', m('RD-14', (x) => { x.marque.modele = 'formulaire_B_v1' }), true]],
    'RD-15': [['conforme', b['RD-15'], false], ['les trois préparés malgré ads_archive non permis', m('RD-15', (x) => { x.nonPermis.envois = [...x.permis.envois]; x.nonPermis.evenementNonLue = 0 }), true], ['un prospect Meta préparé', m('RD-15', (x) => { x.nonPermis.envois = [{ id: 'e2', source: 'meta' }] }), true], ['permis : un prospect saute encore', m('RD-15', (x) => { x.permis.envois.pop(); x.permis.evenementNonLue = 1 }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — modèles, douleurs et notice du dépôt ; magasin-memoire ; jumeau pour le Studio`)
let libOk = true
try { await chargerLib(RAC) } catch (e) { libOk = false; console.log(`· bibliothèque de ${rel(RAC)} illisible : ${premiereLigne(e)}`) }
if (o.autoControle) {
  try { if (!libOk) throw new Error('modèles, douleurs ou contrat illisibles'); const r = await jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try {
    const l = await scenarioMagasin()
    const manquantes = REGLES_JP6.filter((k) => !l.some((x) => x.cle === k))
    s.juger('AC-2', [...l.filter((x) => !x.ok).map((x) => `${x.nom} : obtenu ${court(json(x.obtenu), 80)}`), ...manquantes.map((k) => `règle ${k} absente du scénario`)], `magasin-memoire : ${l.length} règles vertes sur son scénario, dont les ${REGLES_JP6.length} de JP-6`)
  } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
  try {
    const E = echantillons()
    const e = [], compte = { conformes: 0, fautifs: 0 }
    for (const id of IDS.slice(1)) {
      const liste = E[id]
      if (!liste || !liste.some(([, , rouge]) => rouge) || !liste.some(([, , rouge]) => !rouge)) { e.push(`${id} : pas d'échantillon conforme et fautif`); continue }
      for (const [nom, x, rouge] of liste) {
        let d
        try { d = C[id](x) } catch (err) { d = [`contrôle interrompu : ${premiereLigne(err)}`] }
        if (rouge && !d.length) e.push(`${id} : l'échantillon fautif « ${nom} » n'est pas repéré`)
        if (!rouge && d.length) e.push(`${id} : l'échantillon conforme « ${nom} » est refusé (${court(d[0], 100)})`)
        compte[rouge ? 'fautifs' : 'conformes']++
      }
    }
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles RD-2 à RD-15`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const f = path.join(RAC, 'lib', 'agents', 'acquisition', 'redacteur.ts')
  let mod = null
  const e1 = []
  if (!fs.existsSync(f)) e1.push(`module absent : ${rel(f)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/redacteur.ts') } catch (e) { e1.push(`redacteur.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod) for (const n of EXPORTS) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de redacteur.ts (ou pas une fonction)`)
  }
  s.juger('RD-1', e1, `redacteur.ts importé depuis ${rel(RAC)} : ${EXPORTS.join(', ')}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'RD-1 en échec')
  else if (!libOk) s.nonJuges(IDS.slice(1), 'modèles, douleurs ou contrat de la racine illisibles')
  else {
    let obs
    try { obs = await observer(mod, RAC) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
    if (obs) for (const id of IDS.slice(1)) {
      const x = obs[id]
      if (!x) { s.echoue(id, 'non observé'); continue }
      if (x.exception && Object.keys(x).length === 1) { s.echoue(id, `interrompu : ${x.exception}`); continue }
      let d
      try { d = C[id](x) } catch (e) { d = [`contrôle interrompu : ${premiereLigne(e)}`] }
      s.juger(id, d, DETAILS[id] ?? 'conforme')
    }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exitCode = s.finir()
