#!/usr/bin/env node
// scripts/repondeur-qa.mjs — juge hors ligne d'A9 (lot 6 de juges-026-acquisition-preuve.mjs), le Répondeur (fiche
// 026-096), écrit par Claude Code (fiche 026-081) AVANT le module et la route qu'il juge : lib/agents/acquisition/
// repondeur.ts et app/api/cron/repondeur/route.ts. L'exécutant qui les écrit ne touche jamais ce fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/repondeur-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Les critères RP de 026-096.md. Le juge branche le magasin en mémoire (026-016), rempli directement par les méthodes du
// magasin (inserer, reponseRecue, classerReponse, poserEtat) avec la copie approuvée « Témoin » des modèles et de la FAQ
// de scripts/fixtures/026-acquisition/repondeur/ (modeles.ts et faq.ts, 026-083, n'existent pas encore : deps.modeles et
// deps.faq sont injectables, exactement ce que le juge fournit) ; puis exécute la route par ts-loader avec une doublure de
// magasinSupabase (compte ses appels).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/repondeur.ts et <d>/app/api/cron/repondeur/route.ts (défaut : le
//                    dépôt).
//   --auto-controle  AC-1 les jeux d'essai se lisent (chaque cas du tableau CAS est bien formé, chaque modèle attendu
//                    contient « assistant IA de Presti ») ; AC-2 le magasin factice applique ses règles sur son propre
//                    scénario ; AC-3 chaque contrôle RP-2 à RP-16 repère son échantillon fautif et laisse passer son
//                    échantillon conforme.
//
// Sortie : une ligne par critère, puis « repondeur-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide. Module ou route absent(e) : RP-1 en échec, les suivants « non jugés ». Hors ligne, fuseau UTC.
// N'écrit que sous .orchestre/travail/repondeur-qa/.
//
// Choix du juge (jugerMessage, estStop, pauseGenerale et consommerJauge viennent de fiches non encore écrites — 026-083,
// 026-085, 026-044, 026-064 — et ne sont pas dans deps : le module les importera directement une fois ces fiches passées,
// PASS avant 026-096. Le juge vérifie le RÉSULTAT observable (le magasin, la sortie HTTP), jamais ces imports internes ;
// RP-3 rejoue jugerMessage seulement s'il le trouve à lib/agents/acquisition/modeles.ts, sans faire échouer RP-3 pour son
// absence actuelle). La distinction tu/vous (Meta/courriel, 026-096 §Contexte) n'est pas vérifiée mot à mot : les modèles
// témoin sont neutres de canal ; RP-4 vérifie le fil, la preuve de demande et le canal, la nuance de forme est laissée à
// une relecture humaine du diff (026-096 « C'est fini quand »).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, court, premiereLigne,
} from './fixtures/026-acquisition/commun.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6, VERDICTS_OK } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { MODELES_TEMOIN, FAQ_TEMOIN, CAS, motFuiteDeReponse } from './fixtures/026-acquisition/repondeur/index.mjs'

const JUGE = 'repondeur-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const J = 24 * 3600_000, H1 = 3600_000
const IDS = ['RP-1', 'RP-2', 'RP-3', 'RP-4', 'RP-5', 'RP-6', 'RP-7', 'RP-8', 'RP-9', 'RP-10', 'RP-11', 'RP-12', 'RP-13', 'RP-14', 'RP-15', 'RP-16']
const piege = piegerReseau()
const JETON_RDV = 'J'.repeat(43)
const hacherJeton = (j) => crypto.createHash('sha256').update(j).digest('hex')
const creerJetonEssai = () => JETON_RDV

// ── La doublure de magasinSupabase pour la route (comptage des appels) ──────────────────────────────────────────────────────
const cleChemin = (u) => { try { const p = fileURLToPath(u).split(path.sep).join('/'); return process.platform === 'win32' ? p.toLowerCase() : p } catch { return null } }
function doublerMagasinPourRoute(racine) {
  globalThis.__rpAppels = []
  const cible = cleChemin(pathToFileURL(path.join(racine, 'lib', 'agents', 'acquisition', 'magasinSupabase.ts')).href)
  const doublure = `data:text/javascript,${encodeURIComponent(
    "export const magasinSupabase = new Proxy({}, { get(_, prop) { return (...args) => { globalThis.__rpAppels.push(String(prop)); return Promise.resolve(undefined) } } })",
  )}`
  const crochet = `data:text/javascript,${encodeURIComponent(`
    export async function resolve(spec, ctx, next) {
      const r = await next(spec, ctx)
      if (r.url.startsWith('file:') && ${JSON.stringify(cible)} === (${cleChemin.toString()})(r.url)) return { url: ${JSON.stringify(doublure)}, shortCircuit: true }
      return r
    }
  `)}`
  register(crochet)
}
doublerMagasinPourRoute(RAC)

const iso = (t) => new Date(t).toISOString()
/** Insère un prospect d'essai « verifie », prêt à recevoir une réponse. */
function semerProspect(M, n, { cible = 'artisan', etape = 'verifie', canaux } = {}) {
  return M.inserer({
    cle_dedup: `domaine:repondeur-${n}-temoin.invalid`, source: cible === 'marque' ? 'meta' : 'ademe_rge', cible,
    domaine: `repondeur-${n}-temoin.invalid`, entreprise: `Atelier Témoin ${n}`, etape,
    canaux: canaux ?? [{ canal: 'email_sollicite', valeur: `artisan-${n}@repondeur-${n}-temoin.invalid`, url_source: 'sirene', nature: 'sirene' }],
  })
}
/** Une réponse reçue par courriel, classée, pour le prospect `pid`. → id de la réponse */
async function semerReponse(M, pid, classe, { texte = 'Message de test', extra = {}, recuLe } = {}) {
  const { id } = await M.reponseRecue({ id_externe: `ext-${pid}-${classe}-${crypto.randomBytes(3).toString('hex')}`, prospect_id: pid, canal: 'email_sollicite', source: 'courriel', texte, en_reponse_a: null, recu_le: recuLe ?? iso(T0) })
  await M.classerReponse(id, { classe, ...extra })
  return id
}
/** Une mise en scène qui échoue lève : jamais un envoi d'essai refusé en silence (un « dernier envoi » absent fausserait RP-4, RP-12, RP-15, RP-16). */
const exiger = (r, quoi) => { if (!r || r.ok !== true) throw new Error(`mise en scène refusée par le magasin (${quoi}) : ${r && r.raison}`); return r.id }
/** Une réponse reçue et jamais classée (le Répondeur ne la lit pas) : la preuve de demande (0099, message_recu) d'un envoi passé. */
async function semerPreuve(M, pid) {
  const { id } = await M.reponseRecue({ id_externe: `preuve-${pid}-${crypto.randomBytes(3).toString('hex')}`, prospect_id: pid, canal: 'email_sollicite', source: 'courriel', texte: "Oui, d'accord", en_reponse_a: null, recu_le: iso(T0 - H1) })
  return id
}
/**
 * Un envoi passé par email_sollicite, préparé par les règles du magasin (0099 : preuve de demande, étape du prospect), puis, si
 * `envoye`, approuvé et marqué envoyé : le magasin ne l'annule pas quand une opposition tombe ensuite. → son id
 */
async function semerEnvoi(M, pid, { type, modele_id, texte, objet = 'Re: bonjour', envoye = false }) {
  const preuveId = await semerPreuve(M, pid)
  const destinataire = M.etat().prospects.find((p) => p.id === pid).canaux.find((c) => c.canal === 'email_sollicite').valeur
  const id = exiger(await M.preparerEnvoi({ prospect_id: pid, type, canal: 'email_sollicite', envoyeur: 'gmail', destinataire, objet, texte, empreinte_texte: crypto.createHash('sha256').update(texte).digest('hex'), modele_id, variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: { type: 'message_recu', id: preuveId }, reference: null }), `${type} ${modele_id}`)
  if (envoye) { exiger(await M.approuverEnvoi(id, VERDICTS_OK), `approbation de ${modele_id}`); await M.marquerEnvoye(id, { message_id: `<${id}@essai.invalid>` }) }
  return id
}
/**
 * Le contrat du magasin (contrat.ts, 026-016) n'a aucune lecture des conversations à commentaire « SITE » : le Répondeur lit
 * `conversationsPourReponsePrivee(jours, limite)` si le magasin la porte (en-tête de repondeur.ts). Le juge la fournit au magasin
 * en mémoire : TOUTES les conversations à commentaire, sans filtre de date ni de réponse déjà faite, pour que le Répondeur
 * (fenêtre de 7 jours) et le magasin (une seule réponse privée par conversation) tiennent eux-mêmes leurs règles.
 */
const avecConversationsCommentees = (M) => Object.assign(M, { async conversationsPourReponsePrivee() { return M.etat().conversations.filter((c) => c.commentaire_id) } })
const DEPS_BASE = (M, H, extra = {}) => ({
  magasin: M, horloge: H, echeance: H.maintenant() + 45_000, modeles: MODELES_TEMOIN, faq: FAQ_TEMOIN,
  drapeaux: { siteAchatPublic: true }, adresseReponse: 'contact@presti-essai.invalid', offre: null, lienCommandeStudio: null,
  creerJeton: creerJetonEssai, hacherJeton, ...extra,
})
const envoiDe = (M, reponseId) => { const r = M.etat().reponses.find((x) => x.id === reponseId); return r?.envoi_reponse_id ? M.etat().envois.find((x) => x.id === r.envoi_reponse_id) : null }
const reponseDe = (M, reponseId) => M.etat().reponses.find((x) => x.id === reponseId)

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'RP-2': (x) => {
    const e = []
    for (const [nom, r] of Object.entries(x.casReussis)) {
      if (!r.envoi) { e.push(`${nom} : aucun envoi préparé, ${JSON.stringify(r.attendu)} attendu`); continue }
      if (r.envoi.modele_id !== r.attendu.modele) e.push(`${nom} : modele_id ${JSON.stringify(r.envoi.modele_id)}, ${JSON.stringify(r.attendu.modele)} attendu`)
      if (r.envoi.type !== r.attendu.type) e.push(`${nom} : type ${JSON.stringify(r.envoi.type)}, ${JSON.stringify(r.attendu.type)} attendu`)
      if (r.envoi.canal !== 'email_sollicite') e.push(`${nom} : canal ${JSON.stringify(r.envoi.canal)}, email_sollicite attendu`)
    }
    for (const nom of ['sensible', 'hostile', 'reponse_auto', 'autre', 'a_lire', 'hors_fil']) if (x.reponseRepondue[nom] !== undefined) e.push(`${nom} : cette classe n'est pas lisible par reponsesARepondre (hors CLASSES_A_REPONDRE du magasin partagé) ; elle ne doit rien produire par construction`)
    if (x.pasMaintenant.envoi) e.push('pas_maintenant : un envoi a été préparé, aucun attendu')
    if (!x.pasMaintenant.repondue) e.push('pas_maintenant : reponseRepondue(id, null) non appelé (la réponse reste à traiter indéfiniment)')
    if (x.ouiArtisan.envoi) e.push("« oui » d'un artisan : un envoi a été préparé par le Répondeur (réservé à l'Atelier, 026-097)")
    return e
  },
  'RP-3': (x) => {
    const e = []
    for (const [nom, texte] of Object.entries(x.textes)) {
      if (!/assistant IA de Presti/.test(texte)) e.push(`${nom} : « assistant IA de Presti » absent du texte préparé`)
      const fuite = motFuiteDeReponse(x.gabarits[nom], texte, x.messagesRecus[nom])
      if (fuite) e.push(`${nom} : le mot « ${fuite} » du message reçu se retrouve dans le texte préparé, absent du modèle`)
    }
    if (x.jugerMessageDisponible && x.jugerMessageRefus.length) e.push(`jugerMessage rejoué refuse ${x.jugerMessageRefus.length} texte(s) pourtant préparé(s) : ${x.jugerMessageRefus.join(', ')}`)
    return e
  },
  'RP-4': (x) => {
    const e = []
    if (!x.envoiOrigine) e.push("l'envoi d'origine du fil n'existe pas : le contrôle du fil serait vide")
    if (x.email.envoyeur !== 'gmail') e.push(`courriel : envoyeur ${JSON.stringify(x.email.envoyeur)}, gmail attendu`)
    if (x.email.canal !== 'email_sollicite') e.push(`courriel : canal ${JSON.stringify(x.email.canal)}, email_sollicite attendu`)
    if (x.email.fil_envoi_id !== x.envoiOrigine) e.push(`courriel : fil_envoi_id ${JSON.stringify(x.email.fil_envoi_id)}, ${JSON.stringify(x.envoiOrigine)} (l'envoi d'origine) attendu`)
    if (!x.email.preuve_demande || x.email.preuve_demande.type !== 'message_recu' || x.email.preuve_demande.id !== x.reponseId) e.push(`courriel : preuve_demande ${court(JSON.stringify(x.email.preuve_demande), 100)}, { type: 'message_recu', id: ${JSON.stringify(x.reponseId)} } attendu`)
    if (!/^Re: /.test(x.email.objet ?? '')) e.push(`courriel : objet ${JSON.stringify(x.email.objet)}, « Re: … » attendu`)
    if (x.meta.canal !== 'messagerie') e.push(`Meta : canal ${JSON.stringify(x.meta.canal)}, messagerie attendu`)
    if (x.meta.destinataire !== 'META-PERSONNE-RP-4') e.push(`Meta : destinataire ${JSON.stringify(x.meta.destinataire)}, l'identifiant Meta attendu`)
    return e
  },
  'RP-5': (x) => {
    const e = []
    if (!x.commentaire3j) e.push('commentaire « SITE » de 3 jours : aucune réponse privée préparée')
    if (x.commentaire8j) e.push('commentaire « SITE » de 8 jours : une réponse privée a été préparée, aucune attendue')
    if (x.dejaRepondu) e.push('conversation déjà pourvue de sa réponse privée : une seconde a été préparée')
    return e
  },
  'RP-6': (x) => {
    const e = []
    if (!x.premier) e.push('stop : aucune confirmation_stop préparée')
    else if (x.premier.type !== 'confirmation_stop') e.push(`stop : type ${JSON.stringify(x.premier.type)}, confirmation_stop attendu`)
    if (x.second) e.push('second stop du même prospect : une seconde confirmation a été préparée (refusée par le magasin)')
    return e
  },
  'RP-7': (x) => {
    const e = []
    if (!x.texte || !x.texte.includes(`https://prestiapp.fr/rendez-vous/${JETON_RDV}`)) e.push(`le texte préparé ne contient pas https://prestiapp.fr/rendez-vous/${JETON_RDV}`)
    if (!x.lienRdv) e.push("rdvParJeton(hacherJeton du jeton d'essai) : aucun lien retrouvé (le jeton en clair n'a pas dû être passé à creerLienRdv)")
    if (x.sansProspectAUnLien) e.push('une conversation sans prospect a reçu un lien de rendez-vous')
    return e
  },
  'RP-8': (x) => {
    const e = []
    if (x.envoi) e.push('modèles non approuvés (modèles réels passés) : un envoi a quand même été préparé')
    if (x.repondue) e.push('modèles non approuvés : la réponse a été marquée traitée (repondue) ; elle doit rester à traiter')
    return e
  },
  'RP-9': (x) => {
    const e = []
    if (x.sansJeton.statut !== 401) e.push(`sans jeton : statut ${x.sansJeton.statut}, 401 attendu`)
    if (x.pause.statut !== 200) e.push(`PAUSE_GENERALE=1 : statut ${x.pause.statut}, 200 attendu`)
    else if (x.pause.corps?.pause !== true) e.push(`PAUSE_GENERALE=1 : corps ${court(JSON.stringify(x.pause.corps), 80)}, { pause: true } attendu`)
    if (x.pause.appels !== 0) e.push(`PAUSE_GENERALE=1 : ${x.pause.appels} appel(s) au magasin, 0 attendu`)
    return e
  },
  'RP-10': (x) => {
    const e = []
    const nu = sansCommentaires(x.source)
    if (/\bfetch\s*\(/.test(nu)) e.push('fetch( dans le module')
    if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('process.env lu dans le module (deps.drapeaux attendu)')
    if (/@\/lib\/ai\b/.test(nu)) e.push("import de @/lib/ai")
    if (/@\/lib\/agents\/llm\b/.test(nu)) e.push('import de @/lib/agents/llm')
    if (/HUMAN_AGENT/.test(nu)) e.push('chaîne HUMAN_AGENT dans le module')
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return e
  },
  'RP-11': (x) => {
    const e = []
    if (x.ferme.envoi?.modele_id !== 'rep_prix_rdv_v1') e.push(`siteAchatPublic faux : modele_id ${JSON.stringify(x.ferme.envoi?.modele_id)}, rep_prix_rdv_v1 attendu`)
    if (x.ferme.envoi && /prestiapp\.fr\/site\/acheter/.test(x.ferme.envoi.texte)) e.push('siteAchatPublic faux : le texte contient /site/acheter')
    if (x.ouvert.envoi?.modele_id !== 'rep_prix_v1') e.push(`siteAchatPublic vrai : modele_id ${JSON.stringify(x.ouvert.envoi?.modele_id)}, rep_prix_v1 attendu`)
    if (!x.lectureActif) e.push("actif('siteAchatPublic') non lu dans le source de la route")
    return e
  },
  'RP-12': (x) => {
    const e = []
    if (x.tropRapide.envoi) e.push('question reçue 4 min après notre dernier envoi (une réponse) : un envoi a quand même été préparé')
    if (!x.tropRapide.evenementTropRapide) e.push('question trop rapide : aucun événement reponse_trop_rapide')
    if (!x.normal.envoi) e.push('question reçue 12 min après : aucun envoi préparé (attendu)')
    if (!x.prixApresLien.envoi) e.push('prix reçu 4 min après un lien_maquette : aucun envoi préparé (le lien_maquette ne déclenche pas la règle des 10 minutes)')
    if (!x.stopRapide.envoi) e.push('stop reçu 2 min après notre envoi : aucune confirmation préparée (le stop doit passer malgré la règle)')
    return e
  },
  'RP-13': (x) => {
    const e = []
    if (x.rgpd.modele !== 'rep_rgpd_accuse_v1' || x.rgpd.type !== 'reponse_rgpd') e.push(`rgpd (opposant) : ${JSON.stringify(x.rgpd)}, rep_rgpd_accuse_v1/reponse_rgpd attendu (préparée même en opposition)`)
    if (!x.acces.texteContientExport) e.push("rgpd_acces : le texte ne contient pas l'export d'essai")
    if (x.acces.contientJeton) e.push('rgpd_acces : le texte contient un jeton')
    if (x.effacement.modele !== 'rep_rgpd_efface_v1') e.push(`rgpd_effacement : modele ${JSON.stringify(x.effacement.modele)}, rep_rgpd_efface_v1 attendu`)
    if (x.ignoree.envoi) e.push('ignoree : un envoi a été préparé, aucun attendu')
    if (x.rgpdAutre.envoi) e.push('rgpd_autre : un envoi a été préparé, aucun attendu')
    return e
  },
  'RP-14': (x) => {
    const e = []
    if (x.modele !== 'questions_entrant_v2') e.push(`entrant sans candidat : modele ${JSON.stringify(x.modele)}, questions_entrant_v2 attendu`)
    return e
  },
  'RP-15': (x) => {
    const e = []
    if (!x.annonce4j.relance) e.push('lien_maquette (annoncé) de 4 jours, sans réponse : aucune relance_oui_v1 préparée')
    if (x.annonce3j.relance) e.push('lien_maquette de 3 jours : une relance a été préparée (trop tôt)')
    if (x.sansAnnonce.relance) e.push("lien_maquette non annoncé de 4 jours : une relance a été préparée (le modèle ne l'annonçait pas)")
    if (x.rejoue.relances > 1) e.push(`relance rejouée : ${x.rejoue.relances} relance(s), une seule attendue`)
    return e
  },
  'RP-16': (x) => {
    const e = []
    if (!x.premierOui.accuse) e.push("« oui » d'une marque (première fois) : aucun studio_accuse_v1 préparé")
    if (!x.premierOui.decision || x.premierOui.decision.type !== 'studio_echantillon') e.push("« oui » d'une marque : aucune décision studio_echantillon créée")
    if (!x.echantillonDepose.envoi) e.push("décision studio_echantillon tranchée « depose » : aucun studio_echantillon_v1 préparé")
    if (!x.ouiApresEchantillon.offre) e.push("« oui » après l'échantillon : aucun studio_offre_v1 préparé")
    else { if (x.ouiApresEchantillon.offre.modele_id !== 'studio_offre_v1') e.push(`« oui » après l'échantillon : modele_id ${JSON.stringify(x.ouiApresEchantillon.offre.modele_id)}, studio_offre_v1 attendu (et non un second accusé)`); if (x.ouiApresEchantillon.offre.texte.includes('{videos}') || x.ouiApresEchantillon.offre.texte.includes('{prix}') || x.ouiApresEchantillon.offre.texte.includes('{paiement}')) e.push('studio_offre_v1 : un gabarit non rempli (accolades encore présentes)') }
    return e
  },
}
const DETAILS = {
  'RP-2': "chaque classe atteignable (question±faq, appel, rgpd*, entrant, pas_maintenant) donne le modèle/type attendu ; pas_maintenant et « oui » d'un artisan → aucun envoi",
  'RP-3': "« assistant IA de Presti » dans chaque texte préparé, aucun mot de 6 lettres ou plus du message reçu absent du modèle",
  'RP-4': "courriel : envoyeur gmail, fil_envoi_id = l'envoi d'origine, preuve_demande = la réponse reçue, objet « Re: … » ; Meta : canal messagerie, destinataire = meta_id",
  'RP-5': "commentaire « SITE » de 3 jours → réponse privée ; 8 jours → aucune ; déjà pourvue → aucune seconde",
  'RP-6': "stop → une confirmation_stop ; un second stop du même prospect → aucune seconde",
  'RP-7': "lien https://prestiapp.fr/rendez-vous/<jeton d'essai>, empreinte SHA-256 passée à creerLienRdv (jamais le jeton en clair)",
  'RP-8': 'modèles réels (non approuvés) → aucun envoi préparé, réponse laissée à traiter',
  'RP-9': 'sans jeton → 401 ; PAUSE_GENERALE=1 → 200 { pause: true }, zéro appel au magasin',
  'RP-10': 'aucun fetch(, aucun process.env, aucun import de @/lib/ai ni @/lib/agents/llm, aucune chaîne HUMAN_AGENT ; typecheck vert',
  'RP-11': "siteAchatPublic faux → rep_prix_rdv_v1 sans /site/acheter ; vrai → rep_prix_v1 ; actif('siteAchatPublic') lu dans la route",
  'RP-12': '4 min après notre réponse → aucun envoi + reponse_trop_rapide ; 12 min après → la réponse ; après un lien_maquette ou un stop → servi quand même',
  'RP-13': 'rgpd → accusé même en opposition ; rgpd_acces → export sans jeton ; rgpd_effacement → confirmation ; ignoree/rgpd_autre → rien',
  'RP-14': 'entrant sans candidat → questions_entrant_v2',
  'RP-15': 'relance_oui_v1 : 4 jours + annoncée → une fois ; 3 jours ou non annoncée → rien ; rejouée → toujours une seule',
  'RP-16': "« oui » marque → accusé + décision studio_echantillon ; décision « depose » → l'échantillon ; second « oui » → l'offre remplie",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, routeMod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const srcModule = fs.readFileSync(path.join(RAC2, 'lib', 'agents', 'acquisition', 'repondeur.ts'), 'utf8')
  const srcRoute = fs.readFileSync(path.join(RAC2, 'app', 'api', 'cron', 'repondeur', 'route.ts'), 'utf8')

  await tente('RP-2', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    const attendusParClasse = {}
    for (const c of CAS) if (c.attendu) attendusParClasse[c.nom] = c
    const reponseIds = {}
    let n = 0
    for (const [nom, c] of Object.entries(attendusParClasse)) { n++; const pid = semerProspect(M, n, { cible: c.extra.cible }); reponseIds[nom] = await semerReponse(M, pid, c.classe, { extra: c.extra.faq ? { faq: c.extra.faq } : {} }) }
    n++; const pidPasMaintenant = semerProspect(M, n); const idPasMaintenant = await semerReponse(M, pidPasMaintenant, 'pas_maintenant')
    n++; const pidOuiArtisan = semerProspect(M, n, { cible: 'artisan' }); const idOuiArtisan = await semerReponse(M, pidOuiArtisan, 'oui')
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const casReussis = {}
    for (const [nom] of Object.entries(attendusParClasse)) casReussis[nom] = { envoi: envoiDe(M, reponseIds[nom]), attendu: attendusParClasse[nom].attendu }
    const reponseRepondue = {}
    return { casReussis, reponseRepondue, pasMaintenant: { envoi: envoiDe(M, idPasMaintenant), repondue: !!reponseDe(M, idPasMaintenant)?.repondue }, ouiArtisan: { envoi: envoiDe(M, idOuiArtisan) } }
  })

  await tente('RP-3', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    const cas = [['question avec faq', 'question', { faq: 'faq-delai-temoin' }, 'rep_faq_v1'], ['appel', 'appel', {}, 'rep_appel_v1'], ['rgpd', 'rgpd', {}, 'rep_rgpd_accuse_v1']]
    const textes = {}, gabarits = {}, messagesRecus = {}
    let n = 0
    for (const [nom, classe, extra, modele] of cas) {
      n++
      const pid = semerProspect(M, n)
      const messageRecu = `Bonjour, ${classe === 'appel' ? 'pouvez-vous me rappeler concernant la menuiserie extérieure' : classe === 'rgpd' ? 'je souhaite connaître les informations enregistrées à mon sujet' : "combien de temps pour avoir mon site s'il vous plaît"} ?`
      const id = await semerReponse(M, pid, classe, { texte: messageRecu, extra })
      await mod.executerRepondeur(DEPS_BASE(M, H))
      const envoi = envoiDe(M, id)
      textes[nom] = envoi?.texte ?? ''
      gabarits[nom] = MODELES_TEMOIN[modele]?.texte ?? ''
      messagesRecus[nom] = messageRecu
    }
    let jugerMessageDisponible = false, jugerMessageRefus = []
    try {
      const m = await importerDepuis(RAC2, 'lib/agents/acquisition/modeles.ts')
      if (typeof m.jugerMessage === 'function') {
        jugerMessageDisponible = true
        for (const [nom, texte] of Object.entries(textes)) { const v = await m.jugerMessage(texte); if (v && v.verdict && v.verdict !== 'ok') jugerMessageRefus.push(nom) }
      }
    } catch { /* 026-083 pas encore écrite : la relecture est facultative pour l'instant */ }
    return { textes, gabarits, messagesRecus, jugerMessageDisponible, jugerMessageRefus }
  })

  await tente('RP-4', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    const pid = semerProspect(M, 900, { etape: 'oui' })
    // L'envoi d'origine du fil : un lien de maquette réellement préparé par les règles du magasin (le premier contact par e-mail y est interdit).
    const envoiOrigine = await semerEnvoi(M, pid, { type: 'lien_maquette', modele_id: 'lien_maquette_v1', texte: MODELES_TEMOIN.lien_maquette_v1.texte.replace('{lien_maquette}', 'https://prestiapp.fr/maquette/essai'), objet: 'Votre maquette' })
    const idReponse = await semerReponse(M, pid, 'appel', { texte: 'Vous pouvez me rappeler ?' })
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const email = envoiDe(M, idReponse) ?? {}

    const M2 = creerMagasin({ horloge: H })
    M2.poserEtat({ conversations: [{ id: 'conv-rp4', plateforme: 'instagram', pseudo: 'artisan_rp4', suit_le_compte: true, fenetre_jusqua: iso(T0 + H1), meta_id: 'META-PERSONNE-RP-4' }] })
    const { id: idMeta } = await M2.reponseRecue({ id_externe: 'ext-rp4-meta', conversation_id: 'conv-rp4', canal: 'messagerie', source: 'meta', texte: 'Un devis pour ma cuisine ?', en_reponse_a: null, recu_le: iso(T0) })
    await M2.classerReponse(idMeta, { classe: 'appel' })
    await mod.executerRepondeur(DEPS_BASE(M2, H))
    const meta = envoiDe(M2, idMeta) ?? {}
    return { email, meta, envoiOrigine, reponseId: idReponse }
  })

  await tente('RP-5', async () => {
    const H = creerHorloge(T0)
    const M3j = avecConversationsCommentees(creerMagasin({ horloge: H })); M3j.poserEtat({ conversations: [{ id: 'conv-3j', plateforme: 'instagram', pseudo: 'p3j', suit_le_compte: true, meta_id: 'META-PERSONNE-3J', fenetre_jusqua: null, commentaire_id: 'com-3j', reponse_privee_jusqua: iso(T0 + 4 * J) }] })
    await mod.executerRepondeur(DEPS_BASE(M3j, H))
    const commentaire3j = M3j.etat().envois.some((x) => x.canal === 'reponse_privee' && x.conversation_id === 'conv-3j')

    const M8j = avecConversationsCommentees(creerMagasin({ horloge: H })); M8j.poserEtat({ conversations: [{ id: 'conv-8j', plateforme: 'instagram', pseudo: 'p8j', suit_le_compte: true, meta_id: 'META-PERSONNE-8J', fenetre_jusqua: null, commentaire_id: 'com-8j', reponse_privee_jusqua: iso(T0 - 4 * J) }] })
    await mod.executerRepondeur(DEPS_BASE(M8j, H))
    const commentaire8j = M8j.etat().envois.some((x) => x.canal === 'reponse_privee' && x.conversation_id === 'conv-8j')

    const Mdeja = avecConversationsCommentees(creerMagasin({ horloge: H }))
    Mdeja.poserEtat({ conversations: [{ id: 'conv-deja', plateforme: 'instagram', pseudo: 'pdeja', suit_le_compte: true, meta_id: 'META-PERSONNE-DEJA', fenetre_jusqua: null, commentaire_id: 'com-deja', reponse_privee_jusqua: iso(T0 + 4 * J) }] })
    exiger(await Mdeja.preparerEnvoi({ prospect_id: null, type: 'reponse', canal: 'reponse_privee', envoyeur: 'repondeur', destinataire: 'META-PERSONNE-DEJA', objet: null, texte: "Bonjour, je suis l'assistant IA de Presti. Dites-moi votre métier, votre ville et votre e-mail.", empreinte_texte: 'e', modele_id: 'questions_entrant_v2', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: 'conv-deja', preuve_demande: null, reference: null }), 'réponse privée déjà faite')
    const n0 = Mdeja.etat().envois.length
    await mod.executerRepondeur(DEPS_BASE(Mdeja, H))
    const dejaRepondu = Mdeja.etat().envois.length > n0

    return { commentaire3j, commentaire8j, dejaRepondu }
  })

  await tente('RP-6', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    const pid = semerProspect(M, 910)
    await M.opposer({ domaine: `repondeur-910-temoin.invalid` }, 'stop', 'webhook_meta')
    const idStop = await semerReponse(M, pid, 'stop', { texte: 'STOP' })
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const premier = envoiDe(M, idStop)
    const idStop2 = await semerReponse(M, pid, 'stop', { texte: 'STOP', recuLe: iso(T0 + 60_000) })
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const second = envoiDe(M, idStop2)
    return { premier, second }
  })

  await tente('RP-7', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    const pid = semerProspect(M, 920)
    const idAppel = await semerReponse(M, pid, 'appel')
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const envoi = envoiDe(M, idAppel)
    const lienRdv = await M.rdvParJeton(hacherJeton(JETON_RDV))
    const M2 = creerMagasin({ horloge: H })
    M2.poserEtat({ conversations: [{ id: 'conv-rp7', plateforme: 'instagram', pseudo: 'prp7', suit_le_compte: true, fenetre_jusqua: iso(T0 + H1), meta_id: 'META-PERSONNE-RP-7' }] })
    const { id: idConv } = await M2.reponseRecue({ id_externe: 'ext-rp7', conversation_id: 'conv-rp7', canal: 'messagerie', source: 'meta', texte: 'Vous pouvez me rappeler ?', en_reponse_a: null, recu_le: iso(T0) })
    await M2.classerReponse(idConv, { classe: 'appel' })
    await mod.executerRepondeur(DEPS_BASE(M2, H))
    const sansProspectAUnLien = M2.etat().envois.some((x) => x.conversation_id === 'conv-rp7' && /rendez-vous/.test(x.texte))
    return { texte: envoi?.texte ?? '', lienRdv, sansProspectAUnLien }
  })

  await tente('RP-8', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    const pid = semerProspect(M, 930)
    const id = await semerReponse(M, pid, 'appel')
    const MODELES_REELS = { rep_appel_v1: { type: 'reponse', texte: "Bonjour, appelez-nous : {lien_rdv}" } } // sans « assistant IA de Presti » : simule des modèles non approuvés
    await mod.executerRepondeur(DEPS_BASE(M, H, { modeles: MODELES_REELS }))
    return { envoi: envoiDe(M, id), repondue: !!reponseDe(M, id)?.repondue }
  })

  const routeUrl = 'http://127.0.0.1/api/cron/repondeur'
  await tente('RP-9', async () => {
    process.env.CRON_SECRET = 'CRON-TEMOIN-9f21'
    const sansJeton = await routeMod.GET(new Request(routeUrl))
    process.env.PAUSE_GENERALE = '1'
    globalThis.__rpAppels.length = 0
    const p = await routeMod.GET(new Request(routeUrl, { headers: { authorization: 'Bearer CRON-TEMOIN-9f21' } }))
    const pauseCorps = await p.json().catch(() => null)
    delete process.env.PAUSE_GENERALE
    delete process.env.CRON_SECRET
    return { sansJeton: { statut: sansJeton.status }, pause: { statut: p.status, corps: pauseCorps, appels: globalThis.__rpAppels.length } }
  })

  obs['RP-10'] = { source: srcModule, typecheck: typecheck(RAC2, JUGE) }

  await tente('RP-11', async () => {
    const H = creerHorloge(T0)
    const Mf = creerMagasin({ horloge: H }); const pf = semerProspect(Mf, 940); const idf = await semerReponse(Mf, pf, 'prix')
    await mod.executerRepondeur(DEPS_BASE(Mf, H, { drapeaux: { siteAchatPublic: false } }))
    const Mo = creerMagasin({ horloge: H }); const po = semerProspect(Mo, 941); const ido = await semerReponse(Mo, po, 'prix')
    await mod.executerRepondeur(DEPS_BASE(Mo, H, { drapeaux: { siteAchatPublic: true } }))
    return { ferme: { envoi: envoiDe(Mf, idf) }, ouvert: { envoi: envoiDe(Mo, ido) }, lectureActif: /actif\(\s*['"]siteAchatPublic['"]\s*\)/.test(sansCommentaires(srcRoute)) }
  })

  await tente('RP-12', async () => {
    const H = creerHorloge(T0)
    const reponse = { type: 'reponse', modele_id: 'rep_appel_v1', texte: "Bonjour, je suis l'assistant IA de Presti. Le plus simple est d'en parler 15 min." }
    // Notre dernier envoi : une réponse (envoyée), puis un message reçu 4 min plus tard → aucune réponse, un événement.
    const M = creerMagasin({ horloge: H }); const pid = semerProspect(M, 950)
    await semerEnvoi(M, pid, { ...reponse, envoye: true })
    const idTropRapide = await semerReponse(M, pid, 'question', { texte: 'Une autre question, désolé', recuLe: iso(T0 + 4 * 60_000) })
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const evenementTropRapide = M.etat().evenements.some((x) => x.type === 'reponse_trop_rapide' && x.resume?.includes(idTropRapide))

    // Le même message reçu 12 min après → la réponse.
    const M2 = creerMagasin({ horloge: H }); const pid2 = semerProspect(M2, 951)
    await semerEnvoi(M2, pid2, { ...reponse, envoye: true })
    const idNormal = await semerReponse(M2, pid2, 'question', { texte: 'Une autre question', recuLe: iso(T0 + 12 * 60_000) })
    await mod.executerRepondeur(DEPS_BASE(M2, H))

    // Après un lien de maquette (pas une réponse), 4 min → servi : « Oui, c'est combien ? » ne reste pas sans réponse.
    const M3 = creerMagasin({ horloge: H }); const pid3 = semerProspect(M3, 952, { etape: 'oui' })
    await semerEnvoi(M3, pid3, { type: 'lien_maquette', modele_id: 'lien_maquette_v1', texte: MODELES_TEMOIN.lien_maquette_v1.texte.replace('{lien_maquette}', 'https://prestiapp.fr/maquette/essai'), objet: 'Votre maquette', envoye: true })
    const idPrixApresLien = await semerReponse(M3, pid3, 'prix', { texte: "C'est combien ?", recuLe: iso(T0 + 4 * 60_000) })
    await mod.executerRepondeur(DEPS_BASE(M3, H))

    // Un STOP 2 min après notre réponse → sa confirmation quand même. L'opposition tombe APRÈS notre réponse envoyée (le magasin
    // n'annule que les envois encore préparés ou approuvés) : la règle des 10 minutes a donc bien un dernier envoi à lire.
    const M4 = creerMagasin({ horloge: H }); const pid4 = semerProspect(M4, 953)
    await semerEnvoi(M4, pid4, { ...reponse, envoye: true })
    await M4.opposer({ domaine: 'repondeur-953-temoin.invalid' }, 'stop', 'webhook_meta')
    const idStopRapide = await semerReponse(M4, pid4, 'stop', { texte: 'STOP', recuLe: iso(T0 + 2 * 60_000) })
    await mod.executerRepondeur(DEPS_BASE(M4, H))

    return { tropRapide: { envoi: envoiDe(M, idTropRapide), evenementTropRapide }, normal: { envoi: envoiDe(M2, idNormal) }, prixApresLien: { envoi: envoiDe(M3, idPrixApresLien) }, stopRapide: { envoi: envoiDe(M4, idStopRapide) } }
  })

  await tente('RP-13', async () => {
    const H = creerHorloge(T0)
    const Mr = creerMagasin({ horloge: H }); const pr = semerProspect(Mr, 960)
    await Mr.opposer({ domaine: 'repondeur-960-temoin.invalid' }, 'stop', 'webhook_meta')
    const idR = await semerReponse(Mr, pr, 'rgpd')
    await mod.executerRepondeur(DEPS_BASE(Mr, H))
    const er = envoiDe(Mr, idR)

    const Ma = creerMagasin({ horloge: H }); const pa = semerProspect(Ma, 961)
    const idA = await semerReponse(Ma, pa, 'rgpd_acces')
    await mod.executerRepondeur(DEPS_BASE(Ma, H))
    const ea = envoiDe(Ma, idA)

    const Me2 = creerMagasin({ horloge: H }); const pe = semerProspect(Me2, 962)
    const idE = await semerReponse(Me2, pe, 'rgpd_effacement')
    await mod.executerRepondeur(DEPS_BASE(Me2, H))
    const ee = envoiDe(Me2, idE)

    const Mi = creerMagasin({ horloge: H }); const pi = semerProspect(Mi, 963)
    const idI = await semerReponse(Mi, pi, 'ignoree')
    await mod.executerRepondeur(DEPS_BASE(Mi, H))

    const Mra = creerMagasin({ horloge: H }); const pra = semerProspect(Mra, 964)
    const idRA = await semerReponse(Mra, pra, 'rgpd_autre')
    await mod.executerRepondeur(DEPS_BASE(Mra, H))

    return {
      rgpd: { modele: er?.modele_id ?? null, type: er?.type ?? null },
      acces: { texteContientExport: !!ea && /repondeur-961-temoin\.invalid|Atelier Témoin 961/.test(ea.texte), contientJeton: !!ea && /[a-f0-9]{64}/.test(ea.texte) },
      effacement: { modele: ee?.modele_id ?? null },
      ignoree: { envoi: envoiDe(Mi, idI) },
      rgpdAutre: { envoi: envoiDe(Mra, idRA) },
    }
  })

  await tente('RP-14', async () => {
    const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
    M.poserEtat({ conversations: [{ id: 'conv-rp14', plateforme: 'instagram', pseudo: 'prp14', suit_le_compte: true, fenetre_jusqua: iso(T0 + H1), meta_id: 'META-PERSONNE-RP-14' }] })
    const { id } = await M.reponseRecue({ id_externe: 'ext-rp14', conversation_id: 'conv-rp14', canal: 'messagerie', source: 'meta', texte: 'Bonjour, je suis menuisier', en_reponse_a: null, recu_le: iso(T0) })
    await M.classerReponse(id, { classe: 'entrant' })
    await mod.executerRepondeur(DEPS_BASE(M, H))
    return { modele: envoiDe(M, id)?.modele_id ?? null }
  })

  await tente('RP-15', async () => {
    // Un lien de maquette réellement envoyé par e-mail (préparé par les règles du magasin, approuvé, marqué envoyé), la maquette prête
    // (le lien de la relance en cite une nouvelle), l'envoi à froid ouvert : la relance sollicitée est une relance pour le magasin.
    const semerLien = async (M, n, modele) => {
      const pid = semerProspect(M, n, { etape: 'oui' })
      await M.enregistrerMaquettePrete(pid, { chemin: `maquettes/essai-${n}`, empreinte: 'e'.repeat(64), variante: null })
      M.poserEtat({ interrupteurs: { envoi_froid: true } })
      await semerEnvoi(M, pid, { type: 'lien_maquette', modele_id: modele, texte: MODELES_TEMOIN[modele].texte.replace('{lien_maquette}', 'https://prestiapp.fr/maquette/essai'), objet: 'Votre maquette', envoye: true })
      return pid
    }
    const H = creerHorloge(T0)
    const Man = creerMagasin({ horloge: H }); const pan = await semerLien(Man, 970, 'lien_maquette_v1')
    H.avancer(4 * J + H1)
    await mod.executerRepondeur(DEPS_BASE(Man, H))
    const relanceAnnonce4j = Man.etat().envois.some((x) => x.prospect_id === pan && x.modele_id === 'relance_oui_v1')
    await mod.executerRepondeur(DEPS_BASE(Man, H))
    const relancesRejeu2 = Man.etat().envois.filter((x) => x.prospect_id === pan && x.modele_id === 'relance_oui_v1').length

    const H3j = creerHorloge(T0)
    const M3j = creerMagasin({ horloge: H3j }); const p3j = await semerLien(M3j, 971, 'lien_maquette_v1')
    H3j.avancer(3 * J)
    await mod.executerRepondeur(DEPS_BASE(M3j, H3j))
    const relance3j = M3j.etat().envois.some((x) => x.prospect_id === p3j && x.modele_id === 'relance_oui_v1')

    const Hsa = creerHorloge(T0)
    const Msa = creerMagasin({ horloge: Hsa }); const psa = await semerLien(Msa, 972, 'lien_maquette_sans_annonce_v1')
    Hsa.avancer(4 * J + H1)
    await mod.executerRepondeur(DEPS_BASE(Msa, Hsa))
    const relanceSansAnnonce = Msa.etat().envois.some((x) => x.prospect_id === psa && x.modele_id === 'relance_oui_v1')

    return { annonce4j: { relance: relanceAnnonce4j }, annonce3j: { relance: relance3j }, sansAnnonce: { relance: relanceSansAnnonce }, rejoue: { relances: relancesRejeu2 } }
  })

  await tente('RP-16', async () => {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H }); const pid = semerProspect(M, 980, { cible: 'marque' })
    const idOui = await semerReponse(M, pid, 'oui')
    await mod.executerRepondeur(DEPS_BASE(M, H))
    const accuse = envoiDe(M, idOui)
    const decision = M.etat().decisions.find((d) => d.prospect_id === pid && d.type === 'studio_echantillon')

    // La décision tranchée « depose » cite le « oui » de la marque (déjà servi de son accusé) : c'est sa preuve de demande.
    const M2 = creerMagasin({ horloge: H }); const pid2 = semerProspect(M2, 981, { cible: 'marque' })
    const idOui981 = await semerReponse(M2, pid2, 'oui'); await M2.reponseRepondue(idOui981, null)
    M2.poserEtat({ tranchees: [{ id: 'tr-981', type: 'studio_echantillon', prospect_id: pid2, reponse_id: idOui981, option: 'depose', tranche_le: iso(T0) }] })
    await mod.executerRepondeur(DEPS_BASE(M2, H))
    const envoiEchantillon = M2.etat().envois.find((x) => x.prospect_id === pid2 && x.modele_id === 'studio_echantillon_v1')

    // Un « oui » reçu APRÈS l'échantillon (envoyé, par les règles du magasin) → l'offre, et non un second accusé.
    const M3 = creerMagasin({ horloge: H }); const pid3 = semerProspect(M3, 982, { cible: 'marque' })
    await semerEnvoi(M3, pid3, { type: 'reponse', modele_id: 'studio_echantillon_v1', texte: MODELES_TEMOIN.studio_echantillon_v1.texte, objet: 'Re: échantillon', envoye: true })
    const idOui2 = await semerReponse(M3, pid3, 'oui', { recuLe: iso(T0 + 30 * 60_000) })
    await mod.executerRepondeur(DEPS_BASE(M3, H, { offre: { videos: 5, prix_texte: '490 €' }, lienCommandeStudio: (p) => `https://prestiapp.fr/studio/paiement/${p.id}` }))
    const offre = envoiDe(M3, idOui2)

    return { premierOui: { accuse, decision }, echantillonDepose: { envoi: envoiEchantillon }, ouiApresEchantillon: { offre } }
  })

  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  for (const c of CAS) {
    if (!c.nom || !c.classe) { e.push(`un cas sans nom ou sans classe : ${JSON.stringify(c)}`); continue }
    if (c.attendu && !MODELES_TEMOIN[c.attendu.modele]) e.push(`${c.nom} : modèle attendu ${JSON.stringify(c.attendu.modele)} absent de MODELES_TEMOIN`)
    if (c.attendu && MODELES_TEMOIN[c.attendu.modele]?.type !== c.attendu.type) e.push(`${c.nom} : type attendu ${JSON.stringify(c.attendu.type)}, ${JSON.stringify(MODELES_TEMOIN[c.attendu.modele]?.type)} dans le modèle`)
  }
  for (const [id, m] of Object.entries(MODELES_TEMOIN)) if (m.type !== 'relance' && !/assistant IA de Presti/.test(m.texte)) e.push(`${id} : « assistant IA de Presti » absent`)
  if (FAQ_TEMOIN.length < 1) e.push('FAQ_TEMOIN vide')
  return { e, detail: `${CAS.length} cas et ${Object.keys(MODELES_TEMOIN).length} modèles témoin lus, chacun cohérent` }
}
async function scenarioMagasinLocal() {
  const l = await scenarioMagasin()
  return { ok: REGLES_JP6.every((k) => l.find((x) => x.cle === k)?.ok), n: l.length }
}
function obsBase() {
  return {
    'RP-2': { casReussis: { 'question avec faq': { envoi: { modele_id: 'rep_faq_v1', type: 'reponse', canal: 'email_sollicite' }, attendu: { modele: 'rep_faq_v1', type: 'reponse' } } }, reponseRepondue: {}, pasMaintenant: { envoi: null, repondue: true }, ouiArtisan: { envoi: null } },
    'RP-3': { textes: { appel: "Bonjour, je suis l'assistant IA de Presti. Le plus simple est d'en parler 15 min." }, gabarits: { appel: "Bonjour, je suis l'assistant IA de Presti. Le plus simple est d'en parler 15 min." }, messagesRecus: { appel: 'Pouvez-vous me rappeler concernant ma menuiserie ?' }, jugerMessageDisponible: false, jugerMessageRefus: [] },
    'RP-4': { email: { envoyeur: 'gmail', canal: 'email_sollicite', fil_envoi_id: 'envoi-origine-1', preuve_demande: { type: 'message_recu', id: 'reponse-1' }, objet: 'Re: bonjour' }, meta: { canal: 'messagerie', destinataire: 'META-PERSONNE-RP-4' }, envoiOrigine: 'envoi-origine-1', reponseId: 'reponse-1' },
    'RP-5': { commentaire3j: true, commentaire8j: false, dejaRepondu: false },
    'RP-6': { premier: { type: 'confirmation_stop' }, second: null },
    'RP-7': { texte: `Le lien : https://prestiapp.fr/rendez-vous/${JETON_RDV}`, lienRdv: { prospect_id: 'p' }, sansProspectAUnLien: false },
    'RP-8': { envoi: null, repondue: false },
    'RP-9': { sansJeton: { statut: 401 }, pause: { statut: 200, corps: { pause: true }, appels: 0 } },
    'RP-10': { source: 'export async function executerRepondeur(deps) {}\n', typecheck: { ok: true, detail: 'vert' } },
    'RP-11': { ferme: { envoi: { modele_id: 'rep_prix_rdv_v1' } }, ouvert: { envoi: { modele_id: 'rep_prix_v1' } }, lectureActif: true },
    'RP-12': { tropRapide: { envoi: null, evenementTropRapide: true }, normal: { envoi: { modele_id: 'rep_appel_v1' } }, prixApresLien: { envoi: { modele_id: 'rep_prix_v1' } }, stopRapide: { envoi: { type: 'confirmation_stop' } } },
    'RP-13': { rgpd: { modele: 'rep_rgpd_accuse_v1', type: 'reponse_rgpd' }, acces: { texteContientExport: true, contientJeton: false }, effacement: { modele: 'rep_rgpd_efface_v1' }, ignoree: { envoi: null }, rgpdAutre: { envoi: null } },
    'RP-14': { modele: 'questions_entrant_v2' },
    'RP-15': { annonce4j: { relance: true }, annonce3j: { relance: false }, sansAnnonce: { relance: false }, rejoue: { relances: 1 } },
    'RP-16': { premierOui: { accuse: { modele_id: 'studio_accuse_v1' }, decision: { type: 'studio_echantillon' } }, echantillonDepose: { envoi: { modele_id: 'studio_echantillon_v1' } }, ouiApresEchantillon: { offre: { modele_id: 'studio_offre_v1', texte: 'Offre : 5 vidéos, 490 €, https://prestiapp.fr/studio/paiement/x' } } },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'RP-2': [['conforme', b['RP-2'], false], ['pas_maintenant non traité', muter(b, 'RP-2', (x) => { x.pasMaintenant.repondue = false }), true], ['oui artisan avec envoi', muter(b, 'RP-2', (x) => { x.ouiArtisan.envoi = { modele_id: 'x' } }), true]],
    'RP-3': [['conforme', b['RP-3'], false], ['phrase absente', muter(b, 'RP-3', (x) => { x.textes.appel = 'Bonjour.' }), true], ['fuite du message', muter(b, 'RP-3', (x) => { x.textes.appel += ' pour votre menuiserie' }), true]],
    'RP-4': [['conforme', b['RP-4'], false], ['fil rompu', muter(b, 'RP-4', (x) => { x.email.fil_envoi_id = null }), true], ['objet sans Re', muter(b, 'RP-4', (x) => { x.email.objet = 'bonjour' }), true], ['fil vide (aucun envoi d origine semé)', muter(b, 'RP-4', (x) => { x.envoiOrigine = undefined; x.email.fil_envoi_id = undefined }), true]],
    'RP-5': [['conforme', b['RP-5'], false], ['8 jours répond quand même', muter(b, 'RP-5', (x) => { x.commentaire8j = true }), true], ['seconde réponse privée', muter(b, 'RP-5', (x) => { x.dejaRepondu = true }), true]],
    'RP-6': [['conforme', b['RP-6'], false], ['second stop répond aussi', muter(b, 'RP-6', (x) => { x.second = { type: 'confirmation_stop' } }), true]],
    'RP-7': [['conforme', b['RP-7'], false], ['lien absent du texte', muter(b, 'RP-7', (x) => { x.texte = 'aucun lien' }), true], ['lien de rendez-vous sans prospect', muter(b, 'RP-7', (x) => { x.sansProspectAUnLien = true }), true]],
    'RP-8': [['conforme', b['RP-8'], false], ['envoi préparé quand même', muter(b, 'RP-8', (x) => { x.envoi = { modele_id: 'x' } }), true]],
    'RP-9': [['conforme', b['RP-9'], false], ['pause avec un appel', muter(b, 'RP-9', (x) => { x.pause.appels = 1 }), true], ['sans jeton accepté', muter(b, 'RP-9', (x) => { x.sansJeton.statut = 200 }), true]],
    'RP-10': [['conforme', b['RP-10'], false], ['fetch( dans le module', muter(b, 'RP-10', (x) => { x.source += '\nfetch(x)' }), true], ['typecheck rouge', muter(b, 'RP-10', (x) => { x.typecheck = { ok: false, detail: 'TS1234' } }), true]],
    'RP-11': [['conforme', b['RP-11'], false], ['fermé mais rep_prix_v1', muter(b, 'RP-11', (x) => { x.ferme.envoi.modele_id = 'rep_prix_v1' }), true]],
    'RP-12': [['conforme', b['RP-12'], false], ['réponse trop rapide envoyée', muter(b, 'RP-12', (x) => { x.tropRapide.envoi = { modele_id: 'rep_appel_v1' } }), true], ['stop rapide bloqué', muter(b, 'RP-12', (x) => { x.stopRapide.envoi = null }), true]],
    'RP-13': [['conforme', b['RP-13'], false], ['export avec un jeton', muter(b, 'RP-13', (x) => { x.acces.contientJeton = true }), true], ['ignoree envoie quand même', muter(b, 'RP-13', (x) => { x.ignoree.envoi = { modele_id: 'x' } }), true]],
    'RP-14': [['conforme', b['RP-14'], false], ['ancien modèle v1', muter(b, 'RP-14', (x) => { x.modele = 'questions_entrant_v1' }), true]],
    'RP-15': [['conforme', b['RP-15'], false], ['relance trop tôt (3 jours)', muter(b, 'RP-15', (x) => { x.annonce3j.relance = true }), true], ['relance rejouée deux fois', muter(b, 'RP-15', (x) => { x.rejoue.relances = 2 }), true]],
    'RP-16': [['conforme', b['RP-16'], false], ['gabarit non rempli', muter(b, 'RP-16', (x) => { x.ouiApresEchantillon.offre.texte = 'Offre : {videos} vidéos pour {prix}' }), true], ['aucune décision créée', muter(b, 'RP-16', (x) => { x.premierOui.decision = null }), true], ['second accusé au lieu de l offre', muter(b, 'RP-16', (x) => { x.ouiApresEchantillon.offre.modele_id = 'studio_accuse_v1' }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/repondeur)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try { const r = await scenarioMagasinLocal(); s.juger('AC-2', r.ok ? [] : [`magasin-memoire : une des ${REGLES_JP6.length} règles de JP-6 est rouge`], `magasin-memoire.mjs : ${r.n} règles jouées, les ${REGLES_JP6.length} de JP-6 vertes`) } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
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
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles RP-2 à RP-16`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const fMod = path.join(RAC, 'lib', 'agents', 'acquisition', 'repondeur.ts')
  const fRoute = path.join(RAC, 'app', 'api', 'cron', 'repondeur', 'route.ts')
  let mod = null, routeMod = null
  const e1 = []
  if (!fs.existsSync(fMod)) e1.push(`module absent : ${rel(fMod)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/repondeur.ts') } catch (e) { e1.push(`repondeur.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod && typeof mod.executerRepondeur !== 'function') e1.push("export executerRepondeur absent de repondeur.ts (ou pas une fonction)")
  }
  if (!fs.existsSync(fRoute)) e1.push(`route absente : ${rel(fRoute)}`)
  else {
    try { routeMod = await importerDepuis(RAC, 'app/api/cron/repondeur/route.ts') } catch (e) { e1.push(`route.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (routeMod && typeof routeMod.GET !== 'function') e1.push('export GET absent de route.ts')
  }
  s.juger('RP-1', e1, `repondeur.ts (executerRepondeur) et route.ts (GET) importés depuis ${rel(RAC)}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'RP-1 en échec')
  else {
    let obs
    try { obs = await observer(mod, routeMod, RAC) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
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
process.exit(s.finir())
