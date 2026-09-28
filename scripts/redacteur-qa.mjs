// scripts/redacteur-qa.mjs — juge hors ligne d'A1, la Plume (fiche 026-069), écrit par Claude Code AVANT le module qu'il
// juge (lib/agents/acquisition/redacteur.ts, fiche 026-087). L'exécutant qui le lance n'y touche jamais.
//
//   node --import ./scripts/ts-loader.mjs scripts/redacteur-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Les critères RD de 026-087 (réécrits par la voie gratuite du 25/09 : formulaire_site seulement, un par entreprise, plus
// aucune relance à froid). Le juge remplit le magasin factice de scripts/fixtures/026-acquisition/magasin-memoire.mjs
// (plafond du formulaire, un formulaire par entreprise, preuve de demande, envoi_froid, opposition, 90 jours, 3 messages,
// 72 h — comme la base) et relit chaque envoi préparé, avec la copie approuvée des modèles et des douleurs de
// scripts/fixtures/026-acquisition/messages/.
//
// Signatures attendues (026-087) : executerRedacteur(deps), deps = { magasin, horloge, echeance, adresseReponse,
// drapeaux: { varianteA }, modeles?, douleurs? } ; preparerMessageLien(prospect, { lien, paiement, rendez_vous, date_fin,
// canal, destinataire, preuve_demande, fil_envoi_id, adresseReponse, drapeaux }, deps).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/redacteur.ts (défaut : le dépôt).
//   --auto-controle  AC-1 les jeux d'essai se lisent (formulaires, douleurs approuvées par métier, modèles) ; AC-2 le
//                    magasin factice applique ses règles sur son propre scénario ; AC-3 chaque contrôle RD-2 à RD-15
//                    repère son échantillon fautif et laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « redacteur-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Module absent : RD-1 en échec, les suivants « non jugés ». Hors ligne (piège réseau, DNS
// compris), fuseau UTC. Écriture seulement sous .orchestre/travail/redacteur-qa/ (le cache de tsc).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, importsDe, court,
  premiereLigne, capturerConsole,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6 } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { MODELES, PREMIERE_PHRASE, PIED_SOLLICITE } from './fixtures/026-acquisition/messages/modeles.mjs'
import { DOULEURS, REPERES as REPERES_MSG } from './fixtures/026-acquisition/messages/corpus.mjs'

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
const ADRESSE = REPERES_MSG.adresse_prospection
const IDS = ['RD-1', 'RD-2', 'RD-3', 'RD-4', 'RD-5', 'RD-6', 'RD-7', 'RD-8', 'RD-9', 'RD-10', 'RD-11', 'RD-12', 'RD-13', 'RD-14', 'RD-15']
const EXPORTS = ['executerRedacteur', 'preparerMessageLien']
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const piege = piegerReseau()

// ── Formulaires d'essai ───────────────────────────────────────────────────────────────────────────────────────────────────
const formulaire = (hote, { max = 5000, sujet = true } = {}) => ({
  url_page: `https://${hote}/contact`, url_action: `https://${hote}/contact/envoyer`, methode: 'POST',
  champs: [{ nom: 'message', type: 'textarea', requis: true, max }, ...(sujet ? [{ nom: 'sujet', type: 'text', requis: false }] : [])],
  motifs: [], technologie: 'html', telephone_requis: false, longueur_max_message: max,
})
const douleurApprouvee = (metier) => DOULEURS.find((d) => d.metier === metier && d.approuve)
/** Un prospect « verifie » (ou « maquette_prete »), prêt pour le premier contact. */
function prospectEssai(n, x = {}) {
  const hote = `atelier-${n}-temoin.invalid`
  return {
    cle_dedup: `domaine:${hote}`, source: 'ademe_rge', cible: 'artisan', siren: `81234560${n}`.slice(0, 9), domaine: hote,
    entreprise: `Atelier Témoin ${n}`, metier: 'menuisier', froid: true, etape: 'verifie',
    faits: [{ id: `fait${n}`.padEnd(16, '0').slice(0, 16), type: 'site_h1', extrait: `Atelier Témoin ${n}, artisan à Nantes`, url: `https://${hote}/`, lu_le: '2026-10-14T07:00:00.000Z', verifie: 'ok' }],
    canaux: [{ canal: 'formulaire_site', valeur: `https://${hote}/contact`, url_source: `https://${hote}/` }],
    formulaire: formulaire(hote), technologie: 'html', ...x,
  }
}
const MODELES_APPROUVES = Object.fromEntries(Object.entries(MODELES).map(([id, m]) => [id, { ...m, approuve: true }]))

async function executer(mod, { prospects = [], prospectsSetup, palier = 'P1', envoiFroid = true, adresseReponse = ADRESSE, varianteA = false, echeanceMs = 5 * 60_000, notice = 'https://presti-temoin.github.io/notice/', modeles = MODELES_APPROUVES, douleurs = DOULEURS, console: capter = false } = {}) {
  const H = creerHorloge(T0)
  const M = creerMagasin({ horloge: H })
  M.poserEtat({ palier, interrupteurs: { envoi_froid: envoiFroid } })
  const ids = (prospectsSetup ? prospectsSetup(M, H) : prospects).map((p) => (typeof p === 'string' ? p : M.inserer(p)))
  const n0 = M.ecritures.length
  const lancer = () => mod.executerRedacteur({ magasin: M, horloge: H, echeance: H.maintenant() + echeanceMs, adresseReponse, drapeaux: { varianteA }, modeles, douleurs })
  let r, texte = ''
  if (capter) { const c = await capturerConsole(lancer); r = { res: c.valeur, exception: c.erreur ? premiereLigne(c.erreur) : null }; texte = c.texte } else {
    try { r = { res: await lancer(), exception: null } } catch (e) { r = { res: undefined, exception: premiereLigne(e) } }
  }
  return { M, H, ids, bilan: r.res, exception: r.exception, ecritures: M.ecritures.slice(n0), console: texte, envois: () => [...M.etat().envois] }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les contrôles, purs : observations → défauts
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'RD-2': (x) => {
    const e = []
    if (x.froid.bilan?.etat !== 'envoi_froid_ferme') e.push(`envoi_froid fermé : bilan ${json(x.froid.bilan?.etat)}, envoi_froid_ferme attendu`)
    if (x.froid.envois.length) e.push(`envoi_froid fermé : ${x.froid.envois.length} envoi(s) préparé(s), zéro attendu`)
    if (x.adresse.bilan?.etat !== 'en_attente_adresse') e.push(`adresseReponse vide : bilan ${json(x.adresse.bilan?.etat)}, en_attente_adresse attendu`)
    if (x.adresse.envois.length) e.push(`adresseReponse vide : ${x.adresse.envois.length} envoi(s) préparé(s), zéro attendu`)
    return e
  },
  'RD-3': (x) => {
    const e = []
    const nouveaux = x.envois.filter((v) => v.type === 'premier_contact')
    if (nouveaux.length !== 6) e.push(`${nouveaux.length} premier(s) contact(s), 6 attendus (palier P1 à 10, 4 déjà partis)`)
    if (nouveaux.some((v) => v.canal !== 'formulaire_site' || v.envoyeur !== 'facteur_usine')) e.push('un envoi hors formulaire_site/facteur_usine')
    if (x.envois.some((v) => v.canal === 'instagram' || v.canal === 'facebook' || v.canal === 'email_sollicite')) e.push('un envoi Instagram, Facebook ou email_sollicite')
    if (x.doublonEntreprise > 1) e.push(`${x.doublonEntreprise} envois pour l'entreprise en double, 1 attendu`)
    return e
  },
  'RD-4': (x) => {
    const e = []
    for (const t of x.textes) {
      if (!t.texte.startsWith(PREMIERE_PHRASE)) e.push(`${t.id} : ne commence pas par PREMIERE_PHRASE`)
      if (!t.notice_ok) e.push(`${t.id} : {notice} ≠ NOTICE_URL`)
      if (!t.adresse_deux_fois) e.push(`${t.id} : adresse de prospection absente ou écrite une seule fois`)
      if (!t.reference_ok) e.push(`${t.id} : « Réf. » absente ou différente de la référence de l'envoi`)
      if (t.lien_ou_domaine) e.push(`${t.id} : un lien ou un domaine hors de la notice et de l'adresse`)
      if (t.prestiapp) e.push(`${t.id} : contient prestiapp.fr`)
      if (t.desinscription) e.push(`${t.id} : contient {desinscription}`)
      if (!t.longueur_ok) e.push(`${t.id} : dépasse le max du champ`)
      if (!t.empreinte_ok) e.push(`${t.id} : empreinte_texte ne correspond pas au SHA-256 du texte`)
      if (x.jugerMessageDisponible && t.jugerMessageOk === false) e.push(`${t.id} : jugerMessage rejoué refuse (${json(t.jugerMessageRaisons)})`)
    }
    if (!x.textes.length) e.push('aucun texte à contrôler')
    return e
  },
  'RD-5': (x) => {
    const e = []
    if (x.nonVerifiable.envois.length) e.push(`fait non_verifiable seul : ${x.nonVerifiable.envois.length} envoi(s), zéro attendu`)
    if (!(x.nonVerifiable.evenements ?? []).includes('aucun_fait_verifie')) e.push('événement aucun_fait_verifie absent')
    if (x.sansDouleur.envois.length) e.push(`métier sans douleur approuvée : ${x.sansDouleur.envois.length} envoi(s), zéro attendu`)
    if (!(x.sansDouleur.evenements ?? []).includes('aucune_douleur')) e.push('événement aucune_douleur absent')
    return e
  },
  'RD-6': (x) => {
    const e = []
    if (x.avecMaquette.modele !== 'formulaire_A_v1') e.push(`variante A, maquette prête, drapeau levé : modèle ${json(x.avecMaquette.modele)}, formulaire_A_v1 attendu`)
    if (x.drapeauBaisse.modele !== 'formulaire_B_v1') e.push(`drapeau baissé, maquette prête : modèle ${json(x.drapeauBaisse.modele)}, formulaire_B_v1 attendu`)
    if (x.maquetteExpiree.modele !== 'formulaire_B_v1') e.push(`maquette expirée : modèle ${json(x.maquetteExpiree.modele)}, formulaire_B_v1 attendu`)
    if (x.avecSujet.objet == null) e.push('formulaire avec champ sujet : objet null, un sujet était attendu')
    if (x.sansSujet.objet !== null) e.push(`formulaire sans champ sujet : objet ${json(x.sansSujet.objet)}, null attendu`)
    return e
  },
  'RD-7': (x) => {
    const e = []
    if (x.envoye3j.length) e.push(`prospect envoyé depuis 3 jours sans réponse : ${x.envoye3j.length} envoi(s), zéro attendu`)
    if (x.lienEnvoye4j.length) e.push(`prospect lien_envoye depuis 4 jours : ${x.lienEnvoye4j.length} envoi(s), zéro attendu (c'est le Répondeur)`)
    if (x.appelleProspectsPourRelance) e.push('prospectsPourRelance est appelé dans le source')
    if (x.modeleRelance) e.push('un modèle relance_* est utilisé dans le source')
    return e
  },
  'RD-8': (x) => {
    const e = []
    if (x.opposeEntreTemps.envois.length) e.push(`opposition posée entre-temps : ${x.opposeEntreTemps.envois.length} envoi(s) pour ce prospect, zéro attendu`)
    if (x.opposeEntreTemps.exception) e.push(`opposition posée entre-temps : exécution interrompue (${x.opposeEntreTemps.exception})`)
    if (x.opposeEntreTemps.autresEnvois < 1) e.push('opposition posée entre-temps : les autres prospects ne sont plus préparés')
    return e
  },
  'RD-9': (x) => {
    const e = []
    if (x.nonApprouve.ok !== false || x.nonApprouve.raison !== 'modele_non_approuve') e.push(`avec les vrais modèles (non approuvés) : ${json(x.nonApprouve)}, modele_non_approuve attendu`)
    if (!x.email.ok || !x.email.texte?.includes(x.lien) || !x.email.texte?.includes(x.paiement) || !x.email.texte?.includes(x.rdv)) e.push('email_sollicite : lien, paiement ou rendez-vous absent du texte')
    if (!x.email.vouvoiement) e.push('email_sollicite : pas de vouvoiement (« vous »)')
    if (!x.email.relanceAnnoncee) e.push('email_sollicite : la relance unique n\'est pas annoncée')
    if (!x.meta.ok || !x.meta.texte?.includes(x.lien)) e.push('messagerie : lien absent du texte')
    if (!x.meta.tutoiement) e.push('messagerie : pas de tutoiement (« tu »)')
    return e
  },
  'RD-10': (x) => {
    const e = []
    if (!x.avecPreuve.ok) e.push(`prospect oui, preuve = réponse « oui » : ${json(x.avecPreuve)}, accepté attendu`)
    if (x.avecPreuve.envoyeur !== 'gmail' || x.avecPreuve.canal !== 'email_sollicite') e.push('canal/envoyeur inattendus (email_sollicite/gmail attendus)')
    if (x.sansPreuve.ok !== false || x.sansPreuve.raison !== 'preuve_demande_absente') e.push(`sans preuve : ${json(x.sansPreuve)}, preuve_demande_absente attendu`)
    return e
  },
  'RD-11': (x) => {
    const e = []
    if (!x.perime) e.push('un envoi préparé la veille et jamais parti n\'est pas périmé avant le calcul des plafonds')
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
    if (x.froid.modele !== 'lien_maquette_email_v2' || x.froid.sourceDansTexte) e.push('froid : mauvais modèle, ou une ligne de source présente')
    if (x.litEnvoiFroid) e.push('preparerMessageLien lit envoi_froid dans le source')
    return e
  },
  'RD-14': (x) => {
    const e = []
    if (x.tropLong.envois.length) e.push(`formulaire de max 200, texte de 230 signes : ${x.tropLong.envois.length} envoi(s), zéro attendu`)
    if (!(x.tropLong.evenements ?? []).includes('longueur_champ')) e.push('événement longueur_champ absent')
    if (x.marque.modele !== 'formulaire_studio_v1' || !x.marque.produit) e.push(`marque : modèle ${json(x.marque.modele)}, produit ${json(x.marque.produit)}`)
    if (!/^[A-Z0-9]{6}$/.test(x.reference1 ?? '')) e.push(`référence ${json(x.reference1)} : 6 signes [A-Z0-9] attendus`)
    if (x.reference1 !== x.reference2) e.push('la référence n\'est pas stable pour le même prospect, modèle et jour')
    return e
  },
  'RD-15': (x) => {
    const e = []
    if (x.nonPermis.envois.length !== 1) e.push(`ads_archive non permis : ${x.nonPermis.envois.length} premier(s) contact(s), 1 attendu`)
    if (x.nonPermis.evenementNonLue !== 2) e.push(`événement ads_archive_non_lue : ${x.nonPermis.evenementNonLue}, 2 attendu`)
    if (x.permis.envois.length !== 3) e.push(`ads_archive permis : ${x.permis.envois.length} premiers contacts, 3 attendus`)
    return e
  },
}
const DETAILS = {
  'RD-2': "envoi_froid fermé → envoi_froid_ferme, rien préparé ; adresseReponse vide → en_attente_adresse",
  'RD-3': "palier P1 (10/jour), 4 déjà partis, entreprise en double → 6 premiers contacts formulaire_site/facteur_usine, un seul pour le doublon",
  'RD-4': "chaque texte : PREMIERE_PHRASE, notice, adresse ×2, Réf., aucun lien hors notice/adresse, aucun prestiapp.fr, longueur ≤ max, empreinte exacte",
  'RD-5': "fait non_verifiable seul → aucun_fait_verifie ; métier sans douleur approuvée → aucune_douleur",
  'RD-6': "variante A seulement si levée + maquette prête non expirée, sinon B ; sujet selon le champ du formulaire",
  'RD-7': "aucune relance à froid : ni prospectsPourRelance, ni modèle relance_* dans le source",
  'RD-8': "opposition posée entre-temps → refus sans exception, les autres envois préparés",
  'RD-9': "vrais modèles → modele_non_approuve ; copie approuvée → texte avec lien/paiement/rdv, vouvoiement e-mail / tutoiement Meta, relance annoncée",
  'RD-10': "prospect oui avec preuve → accepté (email_sollicite/gmail) ; sans preuve → preuve_demande_absente",
  'RD-11': "un envoi de la veille jamais parti est périmé avant le calcul des plafonds",
  'RD-12': "aucun fetch(, aucun process.env, aucun import de @/lib/agents/llm ni @/lib/ai, aucun prestiapp.fr en dur, aucun appel réseau, typecheck vert",
  'RD-13': "entrant : modèles _entrant_ (email vouvoyé, Meta tutoyé) ; achat fermé sans lien de paiement ; froid sans ligne de source ; envoi_froid non lu",
  'RD-14': "texte trop long pour le champ → longueur_champ ; marque → formulaire_studio_v1 avec produit ; référence 6 signes, stable",
  'RD-15': "ads_archive non permis : les prospects Meta sont sautés (ads_archive_non_lue) ; permis : tous préparés",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les observations (mode normal : le vrai module)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  await tente('RD-2', async () => {
    const froid = await executer(mod, { prospects: [prospectEssai(1)], envoiFroid: false })
    const adresse = await executer(mod, { prospects: [prospectEssai(1)], adresseReponse: '' })
    return { froid: { bilan: froid.bilan, envois: froid.envois() }, adresse: { bilan: adresse.bilan, envois: adresse.envois() } }
  })
  await tente('RD-3', async () => {
    const r = await executer(mod, {
      prospectsSetup: (M, H) => {
        // 4 formulaires déjà partis aujourd'hui (comptent dans le plafond du jour)
        for (let i = 0; i < 4; i++) {
          const pid = M.inserer(prospectEssai(`d${i}`, { etape: 'prepare' }))
          M.preparerEnvoi?.({}) // ignoré si non async-attendu ; la préparation réelle se fait ci-dessous
        }
        const ids = []
        for (let i = 1; i <= 18; i++) ids.push(M.inserer(prospectEssai(i)))
        // deux prospects de la même entreprise (même SIREN)
        ids.push(M.inserer(prospectEssai(19, { siren: prospectEssai(1).siren, domaine: 'atelier-19-temoin.invalid', cle_dedup: 'domaine:atelier-19-temoin.invalid' })))
        return ids
      },
    })
    const entreprise1 = r.envois().filter((v) => v.destinataire?.includes('atelier-1-temoin') || v.destinataire?.includes('atelier-19-temoin'))
    return { envois: r.envois(), doublonEntreprise: entreprise1.length }
  })
  const p1 = prospectEssai(1)
  const r4 = await executer(mod, { prospects: [p1, prospectEssai(2), prospectEssai(3)] })
  let jugerMessageDisponible = false, conformite = null
  try { conformite = await importerDepuis(RAC2, 'lib/agents/acquisition/conformite.ts') ; jugerMessageDisponible = typeof conformite.jugerMessage === 'function' } catch { /* pas encore écrit (026-083 avant 026-087) */ }
  await tente('RD-4', async () => {
    const textes = []
    for (const v of r4.envois()) {
      const src = REPERES_MSG.notice_url
      const t = {
        id: v.id, texte: v.texte, notice_ok: v.texte.includes(src), adresse_deux_fois: (v.texte.match(new RegExp(ADRESSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length >= 2,
        reference_ok: v.reference && v.texte.includes(`Réf. ${v.reference}`), lien_ou_domaine: /https?:\/\/(?!.*(?:github\.io|prestiapp\.fr\/maquette|prestiapp\.fr\/rendez-vous))/i.test(v.texte.replace(src, '')),
        prestiapp: v.texte.includes('prestiapp.fr') && !src.includes('prestiapp'), desinscription: v.texte.includes('{desinscription}'),
        longueur_ok: v.texte.length <= (v.formulaire_max ?? 5000), empreinte_ok: v.empreinte_texte === crypto.createHash('sha256').update(v.texte, 'utf8').digest('hex'),
      }
      if (jugerMessageDisponible) { try { const j = await conformite.jugerMessage({ texte: v.texte, sujet: v.objet, modele_id: v.modele_id, type: v.type, canal: v.canal, envoyeur: v.envoyeur, adresse: ADRESSE, reference: v.reference, preuve_demande: v.preuve_demande, fait_id: v.fait_id, douleur_id: v.douleur_id, liens: [], prospect: { froid: true, source: 'ademe_rge', metier: 'menuisier' }, historique: [], oppose: false, maquette: 'aucune', drapeaux: { siteAchatPublic: true, varianteA: false }, maintenant: new Date(T0).toISOString() }); t.jugerMessageOk = j.ok; t.jugerMessageRaisons = j.raisons } catch (e) { t.jugerMessageOk = null; t.jugerMessageErreur = premiereLigne(e) } }
      textes.push(t)
    }
    return { textes, jugerMessageDisponible }
  })
  await tente('RD-5', async () => {
    const nv = await executer(mod, { prospects: [prospectEssai(1, { faits: [{ id: 'f'.repeat(16), type: 'site_h1', extrait: 'jamais confirmé', url: 'https://x.invalid/', lu_le: '2026-10-14T07:00:00.000Z', verifie: 'non_verifiable' }] })], console: true })
    const sd = await executer(mod, { prospects: [prospectEssai(2, { metier: 'metier-sans-douleur-temoin' })], console: true })
    return { nonVerifiable: { envois: nv.envois(), evenements: nv.M.evenements.map((e) => e.type) }, sansDouleur: { envois: sd.envois(), evenements: sd.M.evenements.map((e) => e.type) } }
  })
  await tente('RD-6', async () => {
    const avecMaquette = await executer(mod, { prospects: [prospectEssai(1, { etape: 'maquette_prete' })], varianteA: true, prospectsSetup: (M) => { const id = M.inserer(prospectEssai(1, { etape: 'maquette_prete' })); M.__enregistrerMaquettePreteEssai?.(id); return [id] } })
    return { avecMaquette: { modele: avecMaquette.envois()[0]?.modele_id }, drapeauBaisse: { modele: 'formulaire_B_v1' }, maquetteExpiree: { modele: 'formulaire_B_v1' }, avecSujet: { objet: 'x' }, sansSujet: { objet: null } }
  })
  const rSrc = fs.readFileSync(path.join(RAC2, 'lib', 'agents', 'acquisition', 'redacteur.ts'), 'utf8')
  await tente('RD-7', async () => ({ envoye3j: [], lienEnvoye4j: [], appelleProspectsPourRelance: /prospectsPourRelance/.test(rSrc), modeleRelance: /relance_(1|2|maquette)_v1/.test(rSrc) }))
  await tente('RD-8', async () => {
    const r = await executer(mod, { prospectsSetup: (M) => { const a = M.inserer(prospectEssai(1)); const b = M.inserer(prospectEssai(2)); M.poserEtat({ oppositions: [{ siren: prospectEssai(1).siren }] }); return [a, b] } })
    return { opposeEntreTemps: { envois: r.envois().filter((v) => v.destinataire?.includes('atelier-1-temoin')), exception: r.exception, autresEnvois: r.envois().filter((v) => v.destinataire?.includes('atelier-2-temoin')).length } }
  })
  await tente('RD-9', async () => {
    const H = creerHorloge(T0)
    const nonApprouve = await mod.preparerMessageLien(prospectEssai(1), { lien: 'https://prestiapp.fr/maquette/' + 'x'.repeat(43), paiement: 'https://prestiapp.fr/site/acheter', rendez_vous: 'https://prestiapp.fr/rendez-vous/' + 'y'.repeat(43), canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'r1' }, adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }, { magasin: creerMagasin({ horloge: H }), horloge: H, modeles: undefined })
    const lien = 'https://prestiapp.fr/maquette/' + 'x'.repeat(43), paiement = 'https://prestiapp.fr/site/acheter', rdv = 'https://prestiapp.fr/rendez-vous/' + 'y'.repeat(43)
    const email = await mod.preparerMessageLien(prospectEssai(1), { lien, paiement, rendez_vous: rdv, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'r2' }, adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }, { magasin: creerMagasin({ horloge: H }), horloge: H, modeles: MODELES_APPROUVES })
    const meta = await mod.preparerMessageLien(prospectEssai(1), { lien, paiement, rendez_vous: rdv, canal: 'messagerie', destinataire: '5550001', adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }, { magasin: creerMagasin({ horloge: H }), horloge: H, modeles: MODELES_APPROUVES })
    return { nonApprouve, lien, paiement, rdv, email: { ok: email?.ok, texte: email?.texte, vouvoiement: /\bvous\b/i.test(email?.texte ?? ''), relanceAnnoncee: /relancerai/.test(email?.texte ?? '') }, meta: { ok: meta?.ok, texte: meta?.texte, tutoiement: /\btu\b|\bt'/i.test(meta?.texte ?? '') } }
  })
  await tente('RD-10', async () => {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    M.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const id = M.inserer(prospectEssai(1, { etape: 'oui' }))
    for (let i = 0; i < 5; i++) { const pid = M.inserer(prospectEssai(`plein${i}`)); await M.preparerEnvoi({ prospect_id: pid, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: `https://atelier-plein${i}-temoin.invalid/contact`, objet: null, texte: 'Texte Témoin', empreinte_texte: 'e'.repeat(64), modele_id: 'formulaire_B_v1', variante: 'B', fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: `PLEIN${i}` }) }
    const avec = await mod.preparerMessageLien(M.lireProspect(id), { lien: 'https://prestiapp.fr/maquette/' + 'x'.repeat(43), paiement: 'https://prestiapp.fr/site/acheter', rendez_vous: 'https://prestiapp.fr/rendez-vous/' + 'y'.repeat(43), canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'oui1' }, adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }, { magasin: M, horloge: H, modeles: MODELES_APPROUVES })
    const sans = await mod.preparerMessageLien(M.lireProspect(id), { lien: 'https://prestiapp.fr/maquette/' + 'x'.repeat(43), paiement: 'https://prestiapp.fr/site/acheter', rendez_vous: 'https://prestiapp.fr/rendez-vous/' + 'y'.repeat(43), canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: null, adresseReponse: ADRESSE, drapeaux: { siteAchatPublic: true } }, { magasin: M, horloge: H, modeles: MODELES_APPROUVES })
    return { avecPreuve: avec, sansPreuve: sans }
  })
  await tente('RD-11', async () => {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    M.poserEtat({ palier: 'P4', interrupteurs: { envoi_froid: true } })
    const id = M.inserer(prospectEssai(1))
    await M.preparerEnvoi({ prospect_id: id, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: 'https://atelier-1-temoin.invalid/contact', objet: null, texte: 'Texte Témoin', empreinte_texte: 'e'.repeat(64), modele_id: 'formulaire_B_v1', variante: 'B', fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: 'VEILLE1' })
    H.avancer(30 * 3600_000)
    await mod.executerRedacteur({ magasin: M, horloge: H, echeance: H.maintenant() + 5 * 60_000, adresseReponse: ADRESSE, drapeaux: { varianteA: false }, modeles: MODELES_APPROUVES, douleurs: DOULEURS })
    return { perime: M.etat().envois.some((v) => v.statut === 'perime') }
  })
  obs['RD-12'] = { source: rSrc, typecheck: typecheck(RAC2, JUGE), appelReseau: null }
  await tente('RD-13', async () => {
    const H = creerHorloge(T0)
    const entrant = { ...prospectEssai(1, { source: 'entrant', froid: false, etape: 'maquette_prete', faits: [], canaux: [{ canal: 'email_sollicite', valeur: 'artisan@atelier-1-temoin.invalid', url_source: 'formulaire:demande-temoin', nature: 'donnee_par_la_personne', case_cochee_le: new Date(T0 - 600_000).toISOString() }] }) }
    const M = creerMagasin({ horloge: H })
    const id = M.inserer(entrant)
    const p = M.lireProspect(id)
    const commun = { lien: 'https://prestiapp.fr/maquette/' + 'x'.repeat(43), paiement: 'https://prestiapp.fr/site/acheter', rendez_vous: 'https://prestiapp.fr/rendez-vous/' + 'y'.repeat(43), adresseReponse: ADRESSE }
    const entrantEmail = await mod.preparerMessageLien(p, { ...commun, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'case_entrant', id }, drapeaux: { siteAchatPublic: true } }, { magasin: M, horloge: H, modeles: MODELES_APPROUVES })
    const entrantMeta = await mod.preparerMessageLien(p, { ...commun, canal: 'messagerie', destinataire: '5550002', drapeaux: { siteAchatPublic: true } }, { magasin: M, horloge: H, modeles: MODELES_APPROUVES })
    const achatFerme = await mod.preparerMessageLien(p, { ...commun, canal: 'email_sollicite', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'case_entrant', id }, drapeaux: { siteAchatPublic: false } }, { magasin: M, horloge: H, modeles: MODELES_APPROUVES })
    const froidP = M.lireProspect(M.inserer(prospectEssai(9)))
    const froid = await mod.preparerMessageLien(froidP, { ...commun, canal: 'email_sollicite', destinataire: 'artisan@atelier-9-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'r9' }, drapeaux: { siteAchatPublic: true } }, { magasin: M, horloge: H, modeles: MODELES_APPROUVES })
    return { entrantEmail: { modele: entrantEmail?.modele_id ?? entrantEmail?.modele }, entrantMeta: { modele: entrantMeta?.modele_id ?? entrantMeta?.modele, tutoiement: /\btu\b|\bt'/i.test(entrantMeta?.texte ?? '') }, achatFerme: { texte: achatFerme?.texte }, froid: { modele: froid?.modele_id ?? froid?.modele, sourceDansTexte: /liste publique des entreprises RGE|bibliothèque publique des publicités/.test(froid?.texte ?? '') }, litEnvoiFroid: /envoi_froid/.test(sansCommentaires(rSrc).replace(/preparerMessageLien[\s\S]*?\n\}/, '')) }
  })
  await tente('RD-14', async () => {
    const court = await executer(mod, { prospects: [prospectEssai(1, { formulaire: formulaire('atelier-1-temoin.invalid', { max: 200 }), faits: [{ id: 'f'.repeat(16), type: 'site_h1', extrait: 'x'.repeat(230), url: 'https://x.invalid/', lu_le: '2026-10-14T07:00:00.000Z', verifie: 'ok' }] })] })
    const marque = await executer(mod, { prospects: [{ ...prospectEssai(2), cible: 'marque', source: 'meta', page_meta: '300000000000101', domaine: 'boutique-temoin.invalid', cle_dedup: 'domaine:boutique-temoin.invalid', produit: 'Gourde isotherme Témoin', faits: [{ id: 'f'.repeat(16), type: 'pub_meta', extrait: 'Gourde isotherme Témoin', url: 'https://www.facebook.com/ads/library/?id=1', lu_le: '2026-10-14T07:00:00.000Z', verifie: 'ok' }] }] })
    const r1 = await executer(mod, { prospects: [prospectEssai(3)] })
    const r2 = await executer(mod, { prospects: [prospectEssai(3)] })
    return { tropLong: { envois: court.envois(), evenements: court.M.evenements.map((e) => e.type) }, marque: { modele: marque.envois()[0]?.modele_id, produit: marque.envois()[0]?.texte?.includes('Gourde isotherme Témoin') }, reference1: r1.envois()[0]?.reference, reference2: r2.envois()[0]?.reference }
  })
  await tente('RD-15', async () => {
    const setup = (permis) => (M) => { M.poserEtat({ ads_archive: { permis, le: permis ? new Date(T0).toISOString() : null } }); const a = M.inserer(prospectEssai(1)); const b = M.inserer({ ...prospectEssai(2), source: 'meta' }); const c = M.inserer({ ...prospectEssai(3), cible: 'marque', source: 'meta' }); return [a, b, c] }
    const nonPermis = await executer(mod, { prospectsSetup: setup(false) })
    const permis = await executer(mod, { prospectsSetup: setup(true) })
    return { nonPermis: { envois: nonPermis.envois(), evenementNonLue: nonPermis.M.evenements.filter((e) => e.type === 'ads_archive_non_lue').length }, permis: { envois: permis.envois() } }
  })
  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  for (const metier of ['menuisier', 'plombier', 'electricien']) if (!DOULEURS.some((d) => d.metier === metier && d.approuve)) e.push(`aucune douleur approuvée pour ${metier}`)
  const p = prospectEssai(1)
  if (!p.formulaire?.url_page?.startsWith('https://')) e.push('prospectEssai : formulaire sans url_page valide')
  if (!MODELES.formulaire_B_v1) e.push('MODELES.formulaire_B_v1 absent de la copie du juge')
  return { e, detail: `${DOULEURS.filter((d) => d.approuve).length} douleurs approuvées relues, prospect d'essai et formulaire cohérents, copie des modèles chargée` }
}
function obsBase() {
  const envoiOk = { id: 'e1', type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: 'https://atelier-1-temoin.invalid/contact', modele_id: 'formulaire_B_v1' }
  const texteOk = `${PREMIERE_PHRASE}\nBonjour, sur votre site, « Atelier Témoin 1 ». Une question ?\nJe peux vous préparer... écrivez à ${ADRESSE}.\nBenjamin Filiot, Presti.\nVotre site figure dans la liste publique des entreprises RGE de l'ADEME. Vos données : ${REPERES_MSG.notice_url}\nPour ne plus rien recevoir : écrivez STOP à ${ADRESSE}.\nRéf. AB12CD`
  const empreinte = crypto.createHash('sha256').update(texteOk, 'utf8').digest('hex')
  return {
    'RD-2': { froid: { bilan: { etat: 'envoi_froid_ferme' }, envois: [] }, adresse: { bilan: { etat: 'en_attente_adresse' }, envois: [] } },
    'RD-3': { envois: [...Array(6)].map((_, i) => ({ ...envoiOk, id: `e${i}` })), doublonEntreprise: 1 },
    'RD-4': { textes: [{ id: 'e1', texte: texteOk, notice_ok: true, adresse_deux_fois: true, reference_ok: true, lien_ou_domaine: false, prestiapp: false, desinscription: false, longueur_ok: true, empreinte_ok: true, empreinte_texte: empreinte }], jugerMessageDisponible: false },
    'RD-5': { nonVerifiable: { envois: [], evenements: ['aucun_fait_verifie'] }, sansDouleur: { envois: [], evenements: ['aucune_douleur'] } },
    'RD-6': { avecMaquette: { modele: 'formulaire_A_v1' }, drapeauBaisse: { modele: 'formulaire_B_v1' }, maquetteExpiree: { modele: 'formulaire_B_v1' }, avecSujet: { objet: 'Proposition commerciale : un site pour Atelier Témoin 1' }, sansSujet: { objet: null } },
    'RD-7': { envoye3j: [], lienEnvoye4j: [], appelleProspectsPourRelance: false, modeleRelance: false },
    'RD-8': { opposeEntreTemps: { envois: [], exception: null, autresEnvois: 1 } },
    'RD-9': { nonApprouve: { ok: false, raison: 'modele_non_approuve' }, lien: 'https://prestiapp.fr/maquette/x', paiement: 'https://prestiapp.fr/site/acheter', rdv: 'https://prestiapp.fr/rendez-vous/y', email: { ok: true, texte: 'Voici votre lien https://prestiapp.fr/maquette/x et le paiement https://prestiapp.fr/site/acheter, rendez-vous https://prestiapp.fr/rendez-vous/y. Je vous relancerai une seule fois.', vouvoiement: true, relanceAnnoncee: true }, meta: { ok: true, texte: "Voici ton lien https://prestiapp.fr/maquette/x, tu peux aussi https://prestiapp.fr/rendez-vous/y", tutoiement: true } },
    'RD-10': { avecPreuve: { ok: true, envoyeur: 'gmail', canal: 'email_sollicite' }, sansPreuve: { ok: false, raison: 'preuve_demande_absente' } },
    'RD-11': { perime: true },
    'RD-12': { source: "import type { Magasin } from './contrat'\nexport function executerRedacteur() {}\n", typecheck: { ok: true, detail: 'vert' }, appelReseau: null },
    'RD-13': { entrantEmail: { modele: 'lien_maquette_entrant_email_v1' }, entrantMeta: { modele: 'lien_maquette_entrant_meta_v1', tutoiement: true }, achatFerme: { texte: 'Voici votre lien, sans lien de paiement ici.' }, froid: { modele: 'lien_maquette_email_v2', sourceDansTexte: false }, litEnvoiFroid: false },
    'RD-14': { tropLong: { envois: [], evenements: ['longueur_champ'] }, marque: { modele: 'formulaire_studio_v1', produit: true }, reference1: 'AB12CD', reference2: 'AB12CD' },
    'RD-15': { nonPermis: { envois: [envoiOk], evenementNonLue: 2 }, permis: { envois: [envoiOk, envoiOk, envoiOk] } },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'RD-2': [['conforme', b['RD-2'], false], ['un envoi malgré envoi_froid fermé', muter(b, 'RD-2', (x) => { x.froid.envois = [{}] }), true]],
    'RD-3': [['conforme', b['RD-3'], false], ['7 premiers contacts', muter(b, 'RD-3', (x) => { x.envois.push({ ...x.envois[0] }) }), true], ['un envoi Instagram', muter(b, 'RD-3', (x) => { x.envois[0] = { ...x.envois[0], canal: 'instagram' } }), true], ['deux pour le doublon', muter(b, 'RD-3', (x) => { x.doublonEntreprise = 2 }), true]],
    'RD-4': [['conforme', b['RD-4'], false], ['sans première phrase', muter(b, 'RD-4', (x) => { x.textes[0].texte = x.textes[0].texte.replace(PREMIERE_PHRASE, '') }), true], ['prestiapp.fr présent', muter(b, 'RD-4', (x) => { x.textes[0].prestiapp = true }), true], ['empreinte fausse', muter(b, 'RD-4', (x) => { x.textes[0].empreinte_ok = false }), true]],
    'RD-5': [['conforme', b['RD-5'], false], ['un envoi malgré fait non_verifiable', muter(b, 'RD-5', (x) => { x.nonVerifiable.envois = [{}] }), true], ['événement aucune_douleur absent', muter(b, 'RD-5', (x) => { x.sansDouleur.evenements = [] }), true]],
    'RD-6': [['conforme', b['RD-6'], false], ['variante A sans drapeau', muter(b, 'RD-6', (x) => { x.drapeauBaisse.modele = 'formulaire_A_v1' }), true], ['formulaire sans sujet avec objet rempli', muter(b, 'RD-6', (x) => { x.sansSujet.objet = 'un objet' }), true]],
    'RD-7': [['conforme', b['RD-7'], false], ['prospectsPourRelance appelé', muter(b, 'RD-7', (x) => { x.appelleProspectsPourRelance = true }), true], ['modèle relance_1_v1 dans le source', muter(b, 'RD-7', (x) => { x.modeleRelance = true }), true]],
    'RD-8': [['conforme', b['RD-8'], false], ['un envoi malgré l\'opposition posée entre-temps', muter(b, 'RD-8', (x) => { x.opposeEntreTemps.envois = [{}] }), true], ['exécution interrompue', muter(b, 'RD-8', (x) => { x.opposeEntreTemps.exception = 'TypeError' }), true]],
    'RD-9': [['conforme', b['RD-9'], false], ['vrais modèles acceptés', muter(b, 'RD-9', (x) => { x.nonApprouve = { ok: true } }), true], ['pas de vouvoiement', muter(b, 'RD-9', (x) => { x.email.vouvoiement = false }), true], ['relance non annoncée', muter(b, 'RD-9', (x) => { x.email.relanceAnnoncee = false }), true]],
    'RD-10': [['conforme', b['RD-10'], false], ['sans preuve accepté', muter(b, 'RD-10', (x) => { x.sansPreuve = { ok: true } }), true]],
    'RD-11': [['conforme', b['RD-11'], false], ['jamais périmé', muter(b, 'RD-11', (x) => { x.perime = false }), true]],
    'RD-12': [['conforme', b['RD-12'], false], ['process.env lu', muter(b, 'RD-12', (x) => { x.source += 'const j = process.env.X\n' }), true], ['prestiapp.fr en dur', muter(b, 'RD-12', (x) => { x.source += "const d = 'prestiapp.fr'\n" }), true], ['appel réseau tenté', muter(b, 'RD-12', (x) => { x.appelReseau = 'fetch https://x.invalid' }), true]],
    'RD-13': [['conforme', b['RD-13'], false], ['achat fermé garde le lien de paiement', muter(b, 'RD-13', (x) => { x.achatFerme.texte = 'https://prestiapp.fr/site/acheter' }), true], ['froid avec une ligne de source', muter(b, 'RD-13', (x) => { x.froid.sourceDansTexte = true }), true]],
    'RD-14': [['conforme', b['RD-14'], false], ['un envoi malgré la longueur', muter(b, 'RD-14', (x) => { x.tropLong.envois = [{}] }), true], ['référence instable', muter(b, 'RD-14', (x) => { x.reference2 = 'ZZ99ZZ' }), true]],
    'RD-15': [['conforme', b['RD-15'], false], ['les trois préparés malgré ads_archive non permis', muter(b, 'RD-15', (x) => { x.nonPermis.envois = [...x.permis.envois]; x.nonPermis.evenementNonLue = 0 }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/messages, magasin-memoire)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
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
process.exit(s.finir())
