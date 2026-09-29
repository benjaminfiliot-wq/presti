// .orchestre/preuves/026-207/cas-essai.mjs — cas d'essai de la garde des lignes (fiche 026-207, étape 6), écrit par
// Claude Code. Le module réel lib/contenu/lignes.ts est appelé dans l'enfant isolé du juge (appelerFonction) ; aucun
// réseau, aucun compte : personnes, dates et sources fictives ; le faux jev du juge répond en sous-processus.
// Usage : node .orchestre/preuves/026-207/cas-essai.mjs [--racine=<dossier>]   (code 0 si tous les cas donnent l'attendu)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEPOT, appelerFonction, envJev, retirerJonctions } from '../../../scripts/fixtures/contenu/lib/commun.mjs'

const arg = process.argv.find((a) => a.startsWith('--racine='))
const racineEff = arg ? path.resolve(arg.slice(9)) : DEPOT
const ACC = (id, texte, extra = {}) => ({ statut: 'tranchee', choix: 'accorder', cible: id, texte_version: texte, ...extra })
const L = (extra = {}) => ({ id: 'L1', suspendue: false, canaux: ['tiktok', 'instagram'], ...extra })
const P = (extra = {}) => ({ id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Voir la démo', decision: ACC('p1', 'Voir la démo'), ...extra })
const FAITS = { 'reponse-rapide': {}, 'site-sur-mesure': { drapeau: 'siteCommandeVente' } }

// [nom, post, ligne, env, attendu('publier'|'refuser'), fragment de motif]
const CAS = [
  ['témoin vert : accord valide', P(), L(), {}, 'publier', ''],
  ['ligne suspendue', P(), L({ suspendue: true }), {}, 'refuser', 'suspendue'],
  ['ligne absente', P(), null, {}, 'refuser', 'ligne'],
  ['ligne non approuvée', P(), L({ approuvee: false }), {}, 'refuser', 'non approuvée'],
  ['ligne hors cadre (L9)', P({ ligne: 'L9' }), L({ id: 'L9' }), {}, 'refuser', 'cadre'],
  ['post d\'une autre ligne', P({ ligne: 'L2' }), L(), {}, 'refuser', 'ligne'],
  ['canal non permis par la ligne', P({ canal: 'facebook', decision: ACC('p1', 'Voir la démo') }), L(), {}, 'refuser', 'canal'],
  ['canal hors cadre (L4 ne parle qu\'à TikTok)', P({ ligne: 'L4', canal: 'instagram' }), L({ id: 'L4', canaux: ['tiktok', 'instagram'] }), {}, 'refuser', 'cadre'],
  ['quota du jour atteint', P(), L({ quotaJour: 2, publieAujourdhui: 2 }), {}, 'refuser', 'plafond'],
  ['quota du jour non atteint', P(), L({ quotaJour: 2, publieAujourdhui: 1 }), {}, 'publier', ''],
  ['cadence de la semaine atteinte', P(), L({ cadenceSemaine: 3, publieCetteSemaine: 3 }), {}, 'refuser', 'cadence'],
  ['cadence non renseignée en entier', P(), L({ cadenceSemaine: 3 }), {}, 'refuser', 'cadence'],
  ['accord pour un AUTRE post', P({ decision: ACC('p2', 'Voir la démo') }), L(), {}, 'refuser', 'autorise jamais B'],
  ['accord absent', P({ decision: undefined }), L(), {}, 'refuser', 'absent'],
  ['décision ouverte', P({ decision: { statut: 'ouverte', cible: 'p1', texte_version: 'Voir la démo' } }), L(), {}, 'refuser', 'ouverte'],
  ['défaut appliqué à l\'échéance', P({ decision: { statut: 'defaut_applique', choix: 'refuser', cible: 'p1', texte_version: 'Voir la démo' } }), L(), {}, 'refuser', 'defaut_applique'],
  ['choix refuser', P({ decision: { statut: 'tranchee', choix: 'refuser', cible: 'p1', texte_version: 'Voir la démo' } }), L(), {}, 'refuser', 'refuser'],
  ['texte retouché après l\'accord', P({ texte: 'Voir la démo !' }), L(), {}, 'refuser', 'caduc'],
  ['accord sans version de texte', P({ decision: { statut: 'tranchee', choix: 'accorder', cible: 'p1' } }), L(), {}, 'refuser', 'version'],
  ['portée autre que sécurité', P({ decision: ACC('p1', 'Voir la démo', { portee: 'budget' }) }), L(), {}, 'refuser', 'portée'],
  ['accord trop ancien', P({ decision: ACC('p1', 'Voir la démo', { le: '2020-01-01T00:00:00Z' }) }), L(), {}, 'refuser', 'caduc'],
  ['légende retouchée : la version change', P({ legende: 'Nouvelle légende' }), L(), {}, 'refuser', 'caduc'],
  ['drapeau du post baissé', P({ drapeau: 'aimantSite', contexte: { drapeaux: { aimantSite: false } } }), L(), {}, 'refuser', 'drapeau'],
  ['drapeau du post inconnu', P({ drapeau: 'aimantSite' }), L(), {}, 'refuser', 'drapeau'],
  ['drapeau du post levé', P({ drapeau: 'aimantSite', contexte: { drapeaux: { aimantSite: true } } }), L(), {}, 'publier', ''],
  ['fait à drapeau baissé', P({ fait_ids: ['site-sur-mesure'], contexte: { faits: FAITS, drapeaux: { siteCommandeVente: false } } }), L(), {}, 'refuser', 'drapeau'],
  ['fait absent du registre', P({ fait_ids: ['inventé'], contexte: { faits: FAITS, drapeaux: {} } }), L(), {}, 'refuser', 'registre'],
  ['faits sans registre', P({ fait_ids: ['reponse-rapide'] }), L(), {}, 'refuser', 'registre'],
  ['gabarit non autorisé', P({ gabarit: 'texte-visuel' }), L(), {}, 'refuser', 'gabarit'],
  ['gabarit autorisé', P({ gabarit: 'video-vertical' }), L(), {}, 'publier', ''],
  ['doublon exact sur le même réseau', P({ contexte: { existants: [{ id: 'p0', canal: 'tiktok', texte: 'voir la démo' }] } }), L(), {}, 'refuser', 'doublon'],
  ['chiffre sous le seuil (p=0,1)', P({ texte: 'Devis en 24h', source: 'mesure.md', decision: ACC('p1', 'Devis en 24h') }), L(), envJev({ reponse: { p: 0.1 } }), 'refuser', 'insuffisant'],
  ['chiffre au seuil (p=0,5)', P({ texte: 'Devis en 24h', source: 'mesure.md', decision: ACC('p1', 'Devis en 24h') }), L(), envJev({ reponse: { p: 0.5 } }), 'publier', ''],
  ['chiffre sans source (preuve absente)', P({ texte: 'Devis en 24h', decision: ACC('p1', 'Devis en 24h') }), L(), envJev({ reponse: { p: 0.9 } }), 'refuser', 'source'],
  ['chiffre, Laya indisponible', P({ texte: 'Devis en 24h', source: 'mesure.md', decision: ACC('p1', 'Devis en 24h') }), L(), envJev({ indisponible: true }), 'refuser', 'Laya indisponible'],
  ['chiffre caché dans la légende', P({ legende: '3 jours', source: 'mesure.md', decision: ACC('p1', ['Voir la démo', '3 jours', '', ''].join('\n---\n')) }), L(), envJev({ reponse: { p: 0.1 } }), 'refuser', 'insuffisant'],
  ['Crieur : brouillon_publora + accord', P({ origine: 'crieur_posts', crieurStatut: 'brouillon_publora' }), L(), {}, 'refuser', "se donne dans Publora"],
  ['Crieur : statut programmee', P({ origine: 'crieur_posts', crieurStatut: 'programmee' }), L(), {}, 'refuser', 'Publora'],
  ['Crieur déguisé (origine contenu + statut Crieur)', P({ origine: 'contenu', crieurStatut: 'brouillon_publora' }), L(), {}, 'refuser', 'Crieur'],
  ['Crieur déguisé (id crieur: sans origine)', P({ id: 'crieur:7', decision: ACC('crieur:7', 'Voir la démo') }), L(), {}, 'refuser', 'Publora'],
  ['Crieur hors ligne (canal)', P({ origine: 'crieur_posts', crieurStatut: 'brouillon_publora', canal: 'facebook' }), L(), {}, 'refuser', 'hors ligne'],
  ['Crieur doublon', P({ origine: 'crieur_posts', crieurStatut: 'brouillon_publora', contexte: { existants: [{ id: 'c0', canal: 'tiktok', texte: 'Voir la démo' }] } }), L(), {}, 'refuser', 'doublon'],
  ['origine inconnue', P({ origine: 'ailleurs' }), L(), {}, 'refuser', 'origine'],
  ['post sans texte', P({ texte: '  ' }), L(), {}, 'refuser', 'texte'],
  ['post absent', null, L(), {}, 'refuser', 'absent'],
]

const filtre = (process.argv.find((a) => a.startsWith("--filtre=")) || "").slice(9)
let fautes = 0
for (const [nom, post, ligne, env, attendu, fragment] of CAS) {
  if (filtre && !nom.includes(filtre)) continue
  const r = await appelerFonction({ racineEff, moduleRel: 'lib/contenu/lignes', fonction: 'verdictPublication', args: [post, ligne], env, delaiMs: 60_000 })
  const v = r.valeur
  const decision = v?.decision
  const motif = v?.motif || ''
  const bon = r.ok && !r.erreurImport && !r.exception && decision === attendu && (!fragment || motif.includes(fragment)) && (decision !== 'publier' || !motif)
  if (!bon) fautes += 1
  console.log(`${bon ? 'OK ' : 'KO '} ${nom} → ${decision ?? r.erreur ?? r.erreurImport ?? r.exception}${motif ? ` (${motif})` : ''}${bon ? '' : `  [attendu ${attendu} ~ « ${fragment} »]`}`)
}

// Fonctions du pont (pures, hors verdict) : normalisation, plafond Publora, doublon.
const pont = async (fonction, args) => (await appelerFonction({ racineEff, moduleRel: 'lib/contenu/lignes', fonction, args, delaiMs: 60_000 })).valeur
const verifier = (nom, bon) => { if (!bon) fautes += 1; console.log(`${bon ? 'OK ' : 'KO '} ${nom}`) }
const now = Date.parse('2026-09-29T10:00:00Z')
const n1 = await pont('normaliserPostCrieur', [{ id: 7, canal: ' Instagram ', statut: 'brouillon_publora', texte: 'Un fait.', fait_ids: ['reponse-rapide'] }, 'L5'])
verifier('pont : normalise id, canal et preuve', n1?.ok && n1.post.id === 'crieur:7' && n1.post.canal === 'instagram' && n1.post.origine === 'crieur_posts' && n1.post.source === 'faits:reponse-rapide')
const n2 = await pont('normaliserPostCrieur', [{ id: 8, canal: 'tiktok', texte: 'Un fait.' }, 'L5'])
verifier('pont : canal hors ligne refusé', n2?.ok === false)
const n3 = await pont('normaliserPostCrieur', [{ canal: 'facebook', texte: 'Un fait.' }, 'L5'])
verifier('pont : sans identifiant refusé', n3?.ok === false)
const trois = [1, 2, 3].map((i) => ({ statut: 'brouillon_publora', programmee_pour: `2026-10-0${i}T12:00:00Z` }))
const c1 = await pont('chargePublora', [trois, now])
verifier('Publora : 3 à venir = plein', c1?.plein === true && c1.aVenir === 3)
const c2 = await pont('chargePublora', [trois.slice(0, 2), now])
verifier('Publora : 2 à venir = pas plein', c2?.plein === false && c2.aVenir === 2)
const quinze = Array.from({ length: 15 }, (_, i) => ({ statut: 'publiee', programmee_pour: `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00Z` }))
const c3 = await pont('chargePublora', [quinze, now])
verifier('Publora : 15 dans le mois = plein', c3?.plein === true && c3.mois === 15)
const c4 = await pont('chargePublora', [[{ statut: 'refuse', programmee_pour: '2026-10-05T12:00:00Z' }, { statut: 'programmee' }], now])
verifier('Publora : refusé et sans date ne comptent pas', c4?.plein === false && c4.aVenir === 0 && c4.mois === 0)

retirerJonctions()
console.log(fautes === 0 ? `cas-essai : ${CAS.length + 7} cas, tous conformes` : `cas-essai : ${fautes} cas non conformes`)
process.exitCode = fautes === 0 ? 0 : 1
void fileURLToPath
