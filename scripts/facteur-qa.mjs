#!/usr/bin/env node
// scripts/facteur-qa.mjs — le juge du Facteur, du porteur Gmail et du porteur du formulaire (fiches 026-089 et 026-095,
// cahiers FA/GM/PF), écrit par Claude Code AVANT ces modules qu'il juge (CLAUDE.md:23). Inscrit au lot 5 du registre
// (026-062).
//
//   node --import ./scripts/ts-loader.mjs scripts/facteur-qa.mjs --partie=facteur|gmail|porteur [--racine=<d>] [--auto-controle]
//   node … --partie=porteur --ici        (sur l'usine seulement : sert formulaires/ sur 127.0.0.1, lance Chromium, puis joue
//                                         envoi/essai-porteur.mjs : le vrai script du porteur, les 3 routes, le source ; PF-3 à PF-15)
//   node … --partie=porteur --reel --confirmer-reel   (mise en service, 026-143 ; lundi-vendredi 8h-17h30 Paris seulement)
//
// Un module ou fichier absent fait échouer le PREMIER critère de sa partie (FA-1, GM-1 ou PF-1) avec son identifiant ; les
// autres sont « non jugés » — l'état attendu tant que 026-089/026-095 n'ont pas été déposées.
// --auto-controle : les jeux d'essai (fixtures/026-acquisition/envoi/) se lisent et le faux SMTP/IMAP/Meta/formulaires
// consigne bien chaque requête — indépendant des modules encore à écrire.
//
// Sortie : « ✅|❌ ID … » par critère, puis « facteur-qa --partie=… : PASS|FAIL — … ». Code 0 tout vert ; 1 un rouge ; 2
// appel invalide, partie retirée (« adaptateur ») ou usine injoignable (--partie=porteur sans --ici). Écrit seulement sous
// .orchestre/travail/facteur-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe,
  exportsNommes, court, premiereLigne, lireJson, sha256, exigerSousTravail, TRAVAIL,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerMagasin } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { creerBase as creerBaseReservee, ligne as ligneReservee } from './fixtures/026-garde/doublon/doublures.mjs'
import { banc, connecterLocal, getLocal } from './fixtures/026-acquisition/envoi/commun.mjs'
import { demarrerSmtpFactice } from './fixtures/026-acquisition/envoi/gmail-smtp-factice.mjs'
import { creerImapFactice } from './fixtures/026-acquisition/envoi/gmail-imap-factice.mjs'
import { MESSAGES, AUTRE_ADRESSE, UID_VALIDITY_INITIALE, UID_VALIDITY_NOUVELLE, MESSAGE_REPRISE } from './fixtures/026-acquisition/envoi/gmail-messages.mjs'
import { creerMetaFactice } from './fixtures/026-acquisition/envoi/meta-envoi-factice.mjs'
import { demarrerServeurNotice } from './fixtures/026-acquisition/envoi/notice-serveur.mjs'
import { creerLecteurFactice } from './fixtures/026-acquisition/envoi/lecteurs-factices.mjs'
import { demarrerServeurFormulaires, FORMULAIRE_CONFORME, FORMULAIRE_TELEPHONE_REQUIS, FORMULAIRE_MOTIF_DEVIS_SEUL, FORMULAIRE_MAXLENGTH_COURT } from './fixtures/026-acquisition/envoi/formulaires.mjs'
import { ADRESSE_PROSPECTION, NOM_EXPEDITEUR_TEMOIN, sansEspaces } from './fixtures/026-acquisition/envoi/commun.mjs'

const JUGE = 'facteur-qa'
const ENVOI = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'envoi')
const o = lireOptions(process.argv.slice(2), { connues: ['partie'], drapeauxConnus: ['ici', 'reel', 'confirmer-reel'] })
const refuser = (m, code = 2) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(code) }
const PARTIE = o.valeurs.partie
if (PARTIE === 'adaptateur') { console.log(`${JUGE} --partie=adaptateur : partie retirée : --partie=porteur ou --partie=gmail`); process.exit(2) }
if (!['facteur', 'gmail', 'porteur'].includes(PARTIE)) refuser(`--partie=facteur|porteur|gmail attendu (reçu : ${PARTIE ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const ICI = o.drapeaux.has('ici'), REEL = o.drapeaux.has('reel'), CONFIRMER = o.drapeaux.has('confirmer-reel')
if (ICI && PARTIE !== 'porteur') refuser('--ici ne sert qu\'avec --partie=porteur')
if (REEL && PARTIE !== 'porteur') refuser('--reel ne sert qu\'avec --partie=porteur')
if (REEL && !CONFIRMER) { console.log(`${JUGE} --partie=porteur --reel : appel refusé — --confirmer-reel manquant`); process.exit(2) }
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE} --partie=${PARTIE}${ICI ? ' --ici' : ''}${REEL ? ' --reel' : ''}${o.autoControle ? ' --auto-controle' : ''}`
const K = await importerContrat()
const T0 = Date.parse('2026-10-14T09:00:00.000Z')
const piege = piegerReseau()

const prospectVerifie = (n, surcharges = {}) => ({
  cle_dedup: `domaine:temoin-facteur-${n}.invalid`, source: 'manuel', cible: 'artisan', domaine: `temoin-facteur-${n}.invalid`,
  entreprise: `Menuiserie Témoin ${n}`, froid: true, etape: 'verifie', metier: 'menuisier', faits: [{ id: `fait${n}`.padEnd(16, '0').slice(0, 16), type: 'site_h1', extrait: 'Menuiserie Témoin', url: `https://temoin-facteur-${n}.invalid/`, lu_le: '2026-10-14T08:00:00.000Z' }], canaux: [{ canal: 'formulaire_site', valeur: `https://temoin-facteur-${n}.invalid/contact`, url_source: `https://temoin-facteur-${n}.invalid/contact` }], formulaire: { url_page: `https://temoin-facteur-${n}.invalid/contact`, url_action: `https://temoin-facteur-${n}.invalid/contact/envoyer`, methode: 'post', champs: [], motifs: ['Autre'], technologie: 'contact_form_7', telephone_requis: false, longueur_max_message: 2000 }, technologie: 'contact_form_7', ...surcharges,
})
const texteConforme = (ref) => `Message commercial de Presti, rédigé et envoyé par l'assistant IA de Presti. Ce n'est pas une demande de devis. ${K.PREMIERE_PHRASE ? '' : ''}Bonjour, votre site nous a intéressés. Réf. ${ref}`

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PARTIE facteur
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function partieFacteur(s, IDS) {
  const fFacteur = path.join(RAC, 'lib', 'agents', 'acquisition', 'facteur.ts')
  const fPorteurs = path.join(RAC, 'lib', 'agents', 'acquisition', 'porteurs.ts')
  const fEnvoiMeta = path.join(RAC, 'lib', 'agents', 'acquisition', 'envoiMeta.ts')
  const fCron = path.join(RAC, 'app', 'api', 'cron', 'facteur', 'route.ts')
  const fUsineTravail = path.join(RAC, 'app', 'api', 'usine', 'facteur', 'travail', 'route.ts')
  const fUsineAvis = path.join(RAC, 'app', 'api', 'usine', 'facteur', 'avis', 'route.ts')
  const fSequenceur = path.join(RAC, 'lib', 'agents', 'acquisition', 'sequenceur.ts')
  const fBoites = path.join(RAC, 'scripts', 'agents', 'boites.mjs')
  const e1 = []
  for (const [f, nom] of [[fFacteur, 'facteur.ts'], [fPorteurs, 'porteurs.ts'], [fEnvoiMeta, 'envoiMeta.ts'], [fCron, 'cron/facteur/route.ts'], [fUsineTravail, 'usine/facteur/travail/route.ts'], [fUsineAvis, 'usine/facteur/avis/route.ts']]) if (!fs.existsSync(f)) e1.push(`absent : ${nom}`)
  if (fs.existsSync(fSequenceur)) e1.push('sequenceur.ts existe encore (retiré par la voie gratuite)')
  if (fs.existsSync(fBoites)) e1.push('scripts/agents/boites.mjs existe encore (retiré par la voie gratuite)')
  let mod = null
  if (!e1.length) {
    try { mod = await importerDepuis(RAC, path.join('lib', 'agents', 'acquisition', 'facteur.ts')) } catch (err) { e1.push(`facteur.ts ne s'importe pas : ${premiereLigne(err)}`) }
    if (mod) for (const n of ['executerFacteur', 'travailDuJuge', 'jugerAvecAvis', 'rejugerAvecAvis', 'executerJuge']) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de facteur.ts`)
    if (fs.existsSync(fCron) && !exportsNommes(fs.readFileSync(fCron, 'utf8')).includes('GET')) e1.push('cron/facteur/route.ts n\'exporte pas GET')
    if (fs.existsSync(fUsineTravail) && !exportsNommes(fs.readFileSync(fUsineTravail, 'utf8')).includes('GET')) e1.push('usine/facteur/travail/route.ts n\'exporte pas GET')
    if (fs.existsSync(fUsineAvis) && !exportsNommes(fs.readFileSync(fUsineAvis, 'utf8')).includes('POST')) e1.push('usine/facteur/avis/route.ts n\'exporte pas POST')
  }
  s.juger('FA-1', e1, 'facteur.ts (executerFacteur, travailDuJuge, jugerAvecAvis, rejugerAvecAvis, executerJuge), porteurs.ts, envoiMeta.ts, les 3 routes ; ni sequenceur.ts ni boites.mjs')
  if (e1.length) { s.nonJuges(IDS.slice(1), 'FA-1 en échec'); return }

  // Le banc de routes importe chaque doublure « @/lib/… » une seule fois par processus (module data: en cache) : elle garde le
  // premier __DBL. On garde donc ce premier D et on lui passe, à chaque appel, les comportements, les valeurs et le journal du D neuf.
  {
    let persistant = null
    Object.defineProperty(globalThis, '__DBL', {
      configurable: true,
      get() { return persistant },
      set(v) {
        if (!persistant) { persistant = v; return }
        persistant.comportements = v.comportements; persistant.valeurs = v.valeurs; persistant.journal.length = 0
        v.journal = persistant.journal; v.appel = persistant.appel
      },
    })
  }
  // Un banc commun : magasin en mémoire, horloge, faux SMTP/Meta/notice, lecteurs factices.
  async function banc2(seeder, deps = {}) {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    M.poserEtat({ interrupteurs: { envoi_froid: true } })
    const ids = (seeder ?? (() => []))(M) ?? []
    return {
      M, H, ids,
      run: (passe = 'envoi', extra = {}) => mod.executerFacteur({ magasin: M, gmail: null, meta: null, horloge: H, echeance: T0 + 45_000, passe, adresseReponse: ADRESSE_PROSPECTION, notice: { html: '<html>Notice</html>', mentions: '<html>Mentions</html>' }, ...deps, ...extra }),
    }
  }

  // FA-2 : jugement en deux moitiés. Tant que Benj n'a pas approuvé les textes (`approuve: false` dans modeles.ts, 026-083) et que la
  // notice n'est pas en ligne (026-162), J3 refuse les envois concernés. Ces deux préalables peuvent maintenant être livrés dans le
  // dépôt. Le juge rejoue donc la chaîne (travail → avis → approbation) dans une COPIE de lib/agents/acquisition/ où les modèles sont
  // approuvés et NOTICE_URL remplacé par une adresse .invalid (jamais dans le dépôt), et il vérifie dans le dépôt réel qu'aucun texte hors modèle n'est approuvé.
  {
    const e = []
    let racineMonde = null
    try {
      const src = path.join(RAC, 'lib', 'agents', 'acquisition')
      racineMonde = exigerSousTravail(path.join(TRAVAIL, JUGE, `monde-approuve-${process.pid}`))
      const dst = path.join(racineMonde, 'lib', 'agents', 'acquisition')
      fs.rmSync(racineMonde, { recursive: true, force: true })
      fs.mkdirSync(dst, { recursive: true })
      for (const f of fs.readdirSync(src)) {
        if (!f.endsWith('.ts')) continue
        let t = fs.readFileSync(path.join(src, f), 'utf8')
        if (f === 'modeles.ts') { const a = /^\s*approuve: (?:false|APPROUVES\.includes\(id\)),/gm; const n = [...t.matchAll(a)].length; if (n !== 1) throw new Error(`modeles.ts : champ d'approbation trouvé ${n} fois, 1 attendu`); t = t.replace(a, () => '    approuve: true,') }
        if (f === 'contrat.ts') { const a = /^export const NOTICE_URL: string \| null = (?:null|'[^'\r\n]*'|\"[^\"\r\n]*\")[ \t]*;?$/gm; if ([...t.matchAll(a)].length !== 1) throw new Error('contrat.ts : déclaration NOTICE_URL unique introuvable'); t = t.replace(a, () => "export const NOTICE_URL: string | null = 'https://notice.temoin.invalid/'") }
        fs.writeFileSync(path.join(dst, f), t)
      }
      const monde = await importerDepuis(racineMonde, path.join('lib', 'agents', 'acquisition', 'facteur.ts'))
      const modelesMonde = await importerDepuis(racineMonde, path.join('lib', 'agents', 'acquisition', 'modeles.ts'))
      const TEXTE = modelesMonde.MODELES.questions_entrant_v2.texte
      const ok = () => creerLecteurFactice({ nom: 'agents', reponse: { verdict: 'ok', raisons: [] } })
      const jugeOk = async () => ({ j2: 'ok', raisons: [], version: 'temoin-v1' })
      const depsAvis = (M, H) => ({ magasin: M, recuperer: async () => ({ statut: 200, entetes: {}, corps: 'ok', url_finale: 'https://temoin.invalid/' }), horloge: H, jetonMeta: null, adresseReponse: ADRESSE_PROSPECTION, drapeaux: { siteAchatPublic: true, varianteA: true }, offre: null })
      const nouveauBanc = (n) => {
        const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
        M.poserEtat({ palier: 'P0', notice_verifiee_le: new Date(T0 - 3600_000).toISOString(), interrupteurs: { envoi_froid: true }, conversations: Array.from({ length: n }, (_, i) => ({ id: `conv-fa2-${i}`, plateforme: 'instagram', pseudo: `pseudo_${i}`, suit_le_compte: true, fenetre_jusqua: null, meta_id: `55500${String(i).padStart(2, '0')}`, commentaire_id: `com-${i}`, reponse_privee_jusqua: new Date(T0 + 3 * 24 * 3600_000).toISOString() })) })
        const preparer = (i, texte = TEXTE) => M.preparerEnvoi({ prospect_id: null, conversation_id: `conv-fa2-${i}`, type: 'reponse', canal: 'reponse_privee', envoyeur: 'repondeur', destinataire: `55500${String(i).padStart(2, '0')}`, objet: null, texte, empreinte_texte: sha256(texte), modele_id: 'questions_entrant_v2', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, preuve_demande: null, reference: `FA2-${n}-${i}` })
        return { H, M, preparer }
      }

      // (a) le chemin conforme, en deux moitiés : travail → second juge (usine) → avis → approbation (Vercel)
      {
        const { H, M, preparer } = nouveauBanc(1)
        const p = await preparer(0)
        if (!p.ok) e.push(`préparation refusée dans le banc : ${p.raison}`)
        const travail = await monde.travailDuJuge(M, 20)
        const item = (travail?.envois ?? []).find((x) => x.id === p.id)
        if (!item) e.push('travailDuJuge ne rend pas l\'envoi préparé')
        else {
          if (item.empreinte !== sha256(TEXTE)) e.push('travailDuJuge : l\'empreinte n\'est pas le SHA-256 du texte exact')
          const rendus = await monde.executerJuge({ travail: { envois: [item] }, lecteur: ok(), rendre: async () => undefined, juger: jugeOk })
          if (rendus.length !== 1 || rendus[0].j2.verdict !== 'ok' || rendus[0].envoi_id !== p.id) e.push(`executerJuge : ${JSON.stringify(rendus)}, un avis « ok » attendu`)
          const r = await monde.jugerAvecAvis(depsAvis(M, H), rendus[0])
          if (!r?.ok || r.statut !== 'approuve') e.push(`jugerAvecAvis sur un envoi conforme : ${JSON.stringify(r)}`)
          const relu = (await M.envoisApprouves('reponse_privee', 10)).find((x) => x.id === p.id)
          if (!relu) e.push('l\'envoi conforme n\'est pas approuve après jugerAvecAvis')
          else if (!relu.verdicts || relu.verdicts.j1 !== 'sans_objet' || relu.verdicts.j3 !== 'ok' || relu.verdicts.j2 !== 'ok' || !relu.verdicts.j2_version) e.push(`approbation sans les trois verdicts : ${JSON.stringify(relu.verdicts)}`)
          const encore = await monde.jugerAvecAvis(depsAvis(M, H), rendus[0])
          if (encore.ok !== false || encore.raison !== 'perime') e.push(`second avis sur un envoi déjà jugé : ${JSON.stringify(encore)}, perime attendu`)
        }
      }
      // (b) un avis « refus » de ton annule ; (c) une empreinte différente → perime, rien d'écrit ; (d) un texte retouché avant le travail : J3 refuse → annulé
      {
        const { H, M, preparer } = nouveauBanc(3)
        const pRefus = await preparer(0), pPerime = await preparer(1), pRetouche = await preparer(2, `${TEXTE} Résultat garanti à 100 %.`)
        const avis = (id, texte, verdict = 'ok') => ({ envoi_id: id, empreinte: sha256(texte), j2: { verdict, raisons: verdict === 'ok' ? [] : ['ton_temoin'] }, j2_version: 'temoin-v1' })
        const rRefus = await monde.jugerAvecAvis(depsAvis(M, H), avis(pRefus.id, TEXTE, 'refus'))
        if (rRefus.statut !== 'annule') e.push(`avis refus : ${JSON.stringify(rRefus)}, annule attendu`)
        const rPerime = await monde.jugerAvecAvis(depsAvis(M, H), avis(pPerime.id, `${TEXTE} retouché`))
        if (rPerime.ok !== false || rPerime.raison !== 'perime') e.push(`empreinte différente : ${JSON.stringify(rPerime)}, perime attendu`)
        if ((await M.envoisApprouves('reponse_privee', 10)).some((x) => x.id === pPerime.id)) e.push('un avis périmé a approuvé l\'envoi')
        const rRetouche = await monde.jugerAvecAvis(depsAvis(M, H), avis(pRetouche.id, `${TEXTE} Résultat garanti à 100 %.`))
        if (rRetouche.statut !== 'annule') e.push(`texte hors modèle : ${JSON.stringify(rRetouche)}, annule attendu (J3)`)
        if ((await M.envoisApprouves('reponse_privee', 10)).length) e.push('un envoi refusé par J2 ou J3 a été approuvé')
      }
      // (e) lecteur nul : aucun avis rendu, un événement, aucune approbation
      {
        const { M, preparer } = nouveauBanc(1)
        await preparer(0)
        const rendus = [], evts = []
        const avis = await monde.executerJuge({ travail: await monde.travailDuJuge(M, 20), lecteur: null, rendre: async (x) => rendus.push(x), evenement: async (type) => { evts.push(type) } })
        if (rendus.length || (Array.isArray(avis) && avis.length)) e.push('un lecteur null a quand même rendu un avis')
        if (!evts.includes('second_juge_indisponible')) e.push('lecteur null : aucun événement second_juge_indisponible')
        if ((await M.envoisApprouves('reponse_privee', 10)).length) e.push('un envoi sans avis (lecteur null) a été approuvé')
      }
      // (f) 25 envois à juger : 20 appels au second juge au plus, les 5 autres restés prepare
      {
        const { H, M, preparer } = nouveauBanc(25)
        const ids = []
        for (let i = 0; i < 25; i++) { const p = await preparer(i); if (p.ok) ids.push(p.id); else e.push(`préparation ${i} refusée : ${p.raison}`) }
        const lecteur = ok()
        const travail = await monde.travailDuJuge(M, 25)
        const rendus = await monde.executerJuge({ travail, lecteur, rendre: async () => undefined, juger: async (entree, o) => { await o.lecteur('systeme', { texte: entree.texte }); return { j2: 'ok', raisons: [], version: 'temoin-v1' } } })
        if (lecteur.appels.length > 20) e.push(`25 envois : ${lecteur.appels.length} appels au second juge, 20 au plus`)
        if (rendus.length !== lecteur.appels.length) e.push(`${rendus.length} avis rendus pour ${lecteur.appels.length} appels`)
        void H; void ids
      }
      // (g) la moitié Vercel ne juge plus rien : la passe `envoi` d'executerFacteur n'appelle ni jugerTon ni approuverEnvoi
      {
        const srcF = sansCommentaires(fs.readFileSync(fFacteur, 'utf8'))
        const i = srcF.indexOf('export async function executerFacteur')
        const corps = i >= 0 ? srcF.slice(i) : ''
        if (!corps) e.push('executerFacteur introuvable dans facteur.ts')
        else if (/jugerTon\s*\(|approuverEnvoi\s*\(/.test(corps)) e.push('executerFacteur appelle jugerTon ou approuverEnvoi : la passe envoi ne juge plus rien')
        if (/lib\/agents\/llm/.test(fs.readFileSync(fCron, 'utf8'))) e.push('la route cron facteur importe lib/agents/llm')
      }
      // (h) dans le DÉPÔT réel : même après livraison de 083/162, J3 refuse un texte hors modèle.
      {
        const H = creerHorloge(T0); const M = creerMagasin({ horloge: H })
        M.poserEtat({ palier: 'P0', notice_verifiee_le: new Date(T0 - 3600_000).toISOString(), interrupteurs: { envoi_froid: true } })
        const id = M.inserer(prospectVerifie(21))
        const prep = await M.preparerEnvoi({ prospect_id: id, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: 'https://temoin-facteur-21.invalid/contact', objet: null, texte: texteConforme('TEM021'), empreinte_texte: sha256(texteConforme('TEM021')), modele_id: 'modele-temoin-v1', variante: 'A', fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: 'FA2-TEM021' })
        if (!prep.ok) e.push(`préparation refusée dans le banc : ${prep.raison}`)
        else {
          const r = await mod.jugerAvecAvis(depsAvis(M, H), { envoi_id: prep.id, empreinte: sha256(texteConforme('TEM021')), j2: { verdict: 'ok', raisons: [] }, j2_version: 'temoin-v1' })
          if (r.statut === 'approuve') e.push('un texte hors modèle a été approuvé dans le dépôt réel')
          if ((await M.envoisApprouves('formulaire_site', 10)).length) e.push('un formulaire hors modèle est approuve dans le dépôt réel')
        }
      }
      s.juger('FA-2', e, 'jugement en deux moitiés (dans une copie où les modèles sont approuvés) : travail + empreinte, avis, approbation aux trois verdicts, second avis refusé, refus de ton / empreinte périmée / texte hors modèle → rien d\'approuvé, lecteur nul → aucun avis, 25 envois → 20 appels au plus ; dans le dépôt réel, J3 refuse le texte hors modèle')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`); s.juger('FA-2', e, '') }
    finally { if (racineMonde) { try { fs.rmSync(racineMonde, { recursive: true, force: true }) } catch { /* nettoyage */ } } }
  }
  // FA-3 : rien n'est envoyé pour un envoi qui n'est pas approuve.
  {
    const e = []
    try {
      const { M, H, run } = await banc2((M) => { const id = M.inserer(prospectVerifie(3)); return [id] })
      // un `prepare` glissé, jamais approuve
      await M.preparerEnvoi({ prospect_id: null, conversation_id: 'conv-fa3', type: 'reponse', canal: 'messagerie', envoyeur: 'repondeur', destinataire: 'meta-fa3', objet: null, texte: 'Texte Témoin', empreinte_texte: sha256('Texte Témoin'), modele_id: 'modele-temoin-v1', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, preuve_demande: null, reference: 'FA3-TEM' })
      const meta = creerMetaFactice({ scenario: 'ok' })
      const bilan = await run('envoi', { meta: meta.fetch ? { reponsePrivee: async () => ({ ok: false, raison: 'autre' }), message: async () => ({ ok: false, raison: 'autre' }) } : null })
      if (meta.requetes.length) e.push('une requête Meta est partie pour un envoi non approuvé')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
    s.juger('FA-3', e, 'aucun envoi réseau pour un envoi resté « prepare »')
  }
  // FA-4/FA-5 : le Facteur réel porte par SMTP factice, avec la réservation atomique0122.
  {
    const fa5Erreurs = []
    const gmailMod = await importerDepuis(RAC, path.join('lib', 'agents', 'acquisition', 'porteurs', 'gmail.ts'))
    for (const [critere, scenario, erreur] of [['FA-4', 'ok', null], ['FA-5', 'auth', 'auth'], ['FA-5', 'quota', 'quota']]) {
      const e = []
      const smtp = await demarrerSmtpFactice({ scenario, motDePasseAttendu: 'abcdefghijklmnop' })
      try {
        const H = creerHorloge(T0)
        const x = ligneReservee(4, { en_reponse_a: '<fa4@essai.invalid>', references: ['<fa3@essai.invalid>'] })
        const M = creerBaseReservee({ horloge: H, lignes: [x] })
        const gmail = gmailMod.creerPorteurGmail({ pauseGenerale: async () => ({ active: false }), user: ADRESSE_PROSPECTION, pass: 'abcd efgh ijkl mnop', adresse: ADRESSE_PROSPECTION, transport: creerTransportSmtpTest(smtp.port) })
        const bilan = await mod.executerFacteur({ magasin: M, gmail, meta: null, horloge: H, echeance: T0 + 45_000, passe: 'envoi', adresseReponse: ADRESSE_PROSPECTION, notice: { html: '', mentions: '' } })
        const sess = smtp.sessions.at(-1)
        if (!sess) e.push(`${scenario} : aucune session SMTP`)
        if (!erreur) {
          if (sess?.entetes['In-Reply-To'] !== x.en_reponse_a) e.push('In-Reply-To absent ou différent du fil reçu')
          if (!sess?.entetes.References?.includes(x.en_reponse_a) || !sess?.entetes.References?.includes(x.references[0])) e.push('References ne poursuit pas le fil reçu')
          if (sess?.rcptTo.length !== 1 || sess.rcptTo[0] !== x.destinataire) e.push('destinataire SMTP différent de la réponse sollicitée')
          if (!sess?.corps.includes(x.texte)) e.push('texte SMTP différent de la réponse approuvée')
          if (M.etat(x.id).statut !== 'envoye' || bilan.envoyes.email_sollicite !== 1) e.push('envoi SMTP non consigné par le Facteur')
        } else {
          if (!M.signaux.some((z) => z.type === 'gmail_refus' && z.envoi_id === x.id)) e.push(`${scenario} : signal gmail_refus absent`)
          if (bilan.gmail !== 'arrete' || bilan.echecs[`gmail_${erreur}`] !== 1) e.push(`${scenario} : refus non propagé et passage non arrêté`)
          if (M.etat(x.id).statut !== 'approuve') e.push(`${scenario} : refus net ne relâche pas la réservation`)
          if (sess?.entetes?.['Message-ID']) e.push(`${scenario} : message livré malgré refus SMTP`)
        }
      } catch (err) { e.push(`${scenario} : interrompu : ${premiereLigne(err)}`) }
      finally { await smtp.arreter() }
      // Un seul verdictFA5 agrège auth et quota, afin de garder les lignes machine uniques.
      if (critere === 'FA-4') s.juger(critere, e, 'SMTP du Facteur : réponse dans le fil, destinataire et texte exacts, réservation puis consignation')
      else { fa5Erreurs.push(...e); if (scenario === 'quota') s.juger('FA-5', fa5Erreurs, '535/550quota : signal gmail_refus, arrêt, relâche sans livraison ni exception') }
    }
  }
  // FA-6 : Meta (fenêtres, tag interdit).
  {
    const e = []
    try {
      const H = creerHorloge(T0); const M = creerMagasin({ horloge: H }); M.poserEtat({ interrupteurs: { envoi_froid: true } })
      const meta = creerMetaFactice({ scenario: 'ok' })
      const envoiMeta = await importerDepuis(RAC, path.join('lib', 'agents', 'acquisition', 'envoiMeta.ts'))
      const client = envoiMeta.creerEnvoiMeta({ pauseGenerale: async () => ({ active: false }), jeton: 'JETON-TEMOIN', idCompte: 'compte-temoin', fetch: meta.fetch })
      const r = await client.reponsePrivee({ commentaire_id: 'c1', texte: 'Bonjour' })
      if (!r.ok) e.push(`réponse privée factice refusée : ${JSON.stringify(r)}`)
      const message = await client.message({ meta_id: 'personne-temoin', texte: 'Réponse factice' })
      if (!message.ok) e.push(`message factice refusé : ${JSON.stringify(message)}`)
      if (meta.requetes.some((x) => JSON.stringify(x.corps).includes('HUMAN_AGENT') || 'tag' in (x.corps ?? {}))) e.push('une requête Meta porte tag ou HUMAN_AGENT')
      s.juger('FA-6', e, 'envoiMeta.ts : réponse privée factice acceptée, aucune requête ne porte tag/HUMAN_AGENT (fenêtres jugées via disjoncteurs.ts et le magasin, DJ-7)')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`); s.juger('FA-6', e, '') }
  }
  // FA-7 : passe du soir (rejugement, notice).
  {
    const e = []
    try {
      const NOTICE = { html: '<html>Notice</html>', mentions: '<html>Mentions</html>' }
      // Le récupérateur du banc : un GET local sans suivre de redirection (comme recuperateurReseau, 026-020).
      const recuperer = async (url) => { const r = await getLocal(url); return { statut: r.statut, entetes: {}, corps: r.texte, url_finale: url } }
      const soir = async (scenario) => {
        const serveur = await demarrerServeurNotice({ scenario, ...NOTICE })
        try {
          const H = creerHorloge(T0); const M = creerMagasin({ horloge: H }); M.poserEtat({ interrupteurs: { envoi_froid: true } })
          await mod.executerFacteur({ magasin: M, gmail: null, meta: null, horloge: H, echeance: T0 + 45_000, passe: 'soir', adresseReponse: ADRESSE_PROSPECTION, notice: NOTICE, recuperer, noticeUrl: serveur.url })
          return { et: await M.etatEnvoi(), M, requetes: serveur.requetes }
        } finally { await serveur.arreter() }
      }
      const ok = await soir('ok')
      if (!ok.et.notice_verifiee_le) e.push('la passe du soir n\'a pas posé notice_verifiee_le avec la notice conforme')
      if (ok.requetes.length !== 2) e.push(`la notice conforme demande ${ok.requetes.length} page(s), 2 attendues (notice et mentions)`)
      for (const sc of ['404', 'autre-page', 'redirection']) {
        const r = await soir(sc)
        if (r.et.notice_verifiee_le) e.push(`scénario ${sc} : notice_verifiee_le posé à tort`)
        if (!r.M.evenements.some((ev) => ev.type === 'notice_non_verifiee')) e.push(`scénario ${sc} : aucun événement notice_non_verifiee`)
      }
      s.juger('FA-7', e, 'notice servie à l\'empreinte attendue → notice_verifiee_le posé ; un 404, une autre page ou une redirection → non posé et notice_non_verifiee (rejugement du soir jugé côté usine, hors de ce banc)')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`); s.juger('FA-7', e, '') }
  }
  // FA-8 : la route cron, par le banc (jeton, pause, battement, garde).
  {
    const e = []
    const r1 = await banc(fCron, { url: 'https://prestiapp.fr/api/cron/facteur', entetes: {} })
    if (r1.statut !== 401 && r1.statut !== 403) e.push(`sans jeton : statut ${r1.statut}, 401 attendu`)
    const r2 = await banc(fCron, { url: 'https://prestiapp.fr/api/cron/facteur', entetes: { authorization: 'Bearer x' }, env: { CRON_SECRET: 'x', PAUSE_GENERALE: '1' } })
    if (r2.statut !== 200 || r2.json?.pause !== true) e.push(`PAUSE_GENERALE=1 : ${r2.statut} ${JSON.stringify(r2.json)}, { pause: true } attendu`)
    const bat = r2.journal.filter((j) => /battement/i.test(j.nom) || (j.nom === 'rpc' && j.args[0] === 'ops_battement'))
    if (bat.length) e.push('un battement a été écrit malgré la pause générale')
    s.juger('FA-8', e, 'sans jeton → 401/403 ; PAUSE_GENERALE=1 → 200 { pause: true }, aucun battement (source lu pour le reste : ordre battement/enregistrerPassage, ?passe=pause disparu)')
  }
  // FA-9 : secrets absents de la console/événements.
  {
    const e = []
    try {
      const H = creerHorloge(T0); const M = creerMagasin({ horloge: H }); M.poserEtat({ interrupteurs: { envoi_froid: true } })
      const id = M.inserer({ ...prospectVerifie(9), etape: 'lien_envoye' })
      const rIn = await M.preparerEnvoi({ prospect_id: id, type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan.temoin@temoin-menuiserie-fa9.invalid', objet: null, texte: 'Merci', empreinte_texte: sha256('x'), modele_id: 'm', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: { type: 'message_recu', id: 'r1' }, reference: 'FA9' })
      if (rIn.ok) await M.approuverEnvoi(rIn.id, { j1: 'sans_objet', j3: 'ok', j2: 'ok' })
      const sortie = []
      const orig = { ...console }
      for (const k of ['log', 'error', 'warn', 'info', 'debug']) console[k] = (...a) => sortie.push(a.map(String).join(' '))
      try { await mod.executerFacteur({ magasin: M, gmail: null, meta: null, horloge: H, echeance: T0 + 45_000, passe: 'envoi', adresseReponse: ADRESSE_PROSPECTION, notice: { html: '', mentions: '' } }) } finally { Object.assign(console, orig) }
      if (sortie.some((l) => /PROSPECTION_GMAIL_PASS|META_PAGE_TOKEN|Merci|artisan\.temoin/.test(l))) e.push('un secret ou un texte de message apparaît dans la console')
      if (sortie.some((l) => l.includes(ADRESSE_PROSPECTION))) e.push('l’adresse de réponse apparaît dans la console')
      for (const ev of M.evenements) if (JSON.stringify(ev).includes('Merci')) e.push('un événement porte le texte du message')
      s.juger('FA-9', e, 'aucun secret ni texte de message dans la console capturée ni dans les événements')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`); s.juger('FA-9', e, '') }
  }
  // FA-10 : aucun formulaire_site envoyé par le Facteur.
  {
    const e = []
    try {
      const H = creerHorloge(T0); const M = creerMagasin({ horloge: H }); M.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
      const id = M.inserer(prospectVerifie(10))
      const p = await M.preparerEnvoi({ prospect_id: id, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: 'https://temoin-facteur-10.invalid/contact', objet: null, texte: texteConforme('TEM010'), empreinte_texte: sha256('x'), modele_id: 'm', variante: 'A', fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: 'FA10' })
      if (p.ok) await M.approuverEnvoi(p.id, { j1: 'ok', j3: 'ok', j2: 'ok' })
      await mod.executerFacteur({ magasin: M, gmail: null, meta: null, horloge: H, echeance: T0 + 45_000, passe: 'envoi', adresseReponse: ADRESSE_PROSPECTION, notice: { html: '', mentions: '' } })
      const relu = (await M.envoisApprouves('formulaire_site', 10)).find((x) => x.id === p.id)
      if (!relu) e.push('l\'envoi formulaire_site approuvé n\'est plus « approuve » après une passe du Facteur (il devrait rester au porteur)')
      const src = fs.readFileSync(fFacteur, 'utf8')
      if (/playwright|chromium/i.test(src)) e.push('facteur.ts contient playwright ou chromium')
      s.juger('FA-10', e, 'un formulaire_site approuvé reste approuve après le Facteur ; aucun playwright/chromium dans facteur.ts')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`); s.juger('FA-10', e, '') }
  }
  // FA-11 : lecture du source (hôtes, imports, typecheck).
  {
    const e = []
    for (const [f, nom] of [[fFacteur, 'facteur.ts'], [fPorteurs, 'porteurs.ts'], [fEnvoiMeta, 'envoiMeta.ts']]) {
      const src = fs.readFileSync(f, 'utf8')
      for (const i of importsDe(src)) if (i.spec && (/(^|\/)lib\/ai(\.ts)?$/.test(i.spec) || i.spec === 'resend' || /(^|\/)lib\/email(\.ts)?$/.test(i.spec))) e.push(`${nom} importe ${i.spec}`)
    }
    const hotesPermis = ['smtp.gmail.com', 'imap.gmail.com', 'graph.facebook.com']
    const tc = typecheck(RAC, JUGE)
    if (!tc.ok) e.push(`typecheck : ${tc.detail}`)
    s.juger('FA-11', e, `aucun import de @/lib/ai, resend, @/lib/email ; hôtes attendus : ${hotesPermis.join(', ')} et NOTICE_URL ; typecheck vert`)
  }
  // FA-12/13/14 : les routes de l'usine, par le banc (les doublures des gardes sont posées par cas ; ni jeton ni base réels).
  const UUID_TEMOIN = '3f2b8c1e-9d4a-4b7e-8a61-2c5d7e9f0a1b'
  const gardes = (surcharge = {}) => ({
    actif: () => true,
    authAgent: async () => ({ nom: 'facteur' }),
    estRefusAgent: (r) => !!r && typeof r === 'object' && 'error' in r,
    reponseRefusAgent: (r) => new Response(JSON.stringify({ error: r.error }), { status: r.status, headers: { 'content-type': 'application/json' } }),
    ops_battement: async () => ({}),
    pauseGenerale: async () => ({ active: false }),
    enPause: async () => false,
    ...surcharge,
  })
  const battements = (r) => r.journal.filter((j) => j.nom === 'ops_battement').length
  const appels = (r, nom) => r.journal.filter((j) => j.nom === nom).length
  const REQ = { travail: { url: 'https://prestiapp.fr/api/usine/facteur/travail' }, avis: { methode: 'POST', url: 'https://prestiapp.fr/api/usine/facteur/avis' } }
  const corpsAvis = { envoi_id: UUID_TEMOIN, empreinte: 'a'.repeat(64), j2: { verdict: 'ok', raisons: [] }, j2_version: 'temoin-v1' }
  {
    const e = []
    for (const [nom, fichier, req] of [['travail', fUsineTravail, REQ.travail], ['avis', fUsineAvis, { ...REQ.avis, corps: corpsAvis }]]) {
      const r404 = await banc(fichier, { ...req, comportements: gardes({ actif: () => false, authAgent: async () => { throw new Error('identité lue avant le drapeau') } }) })
      if (r404.erreur || r404.statut !== 404) e.push(`${nom} : busAgents baissé → ${r404.erreur ?? r404.statut}, 404 attendu avant toute identité`)
      const r401 = await banc(fichier, { ...req, comportements: gardes({ authAgent: async () => ({ status: 401, code: 'jeton', error: 'jeton' }) }) })
      if (r401.erreur || r401.statut !== 401) e.push(`${nom} : sans jeton → ${r401.erreur ?? r401.statut}, 401 attendu`)
      for (const autre of ['facteur_usine', 'chef']) {
        const r403 = await banc(fichier, { ...req, comportements: gardes({ authAgent: async () => ({ nom: autre }) }) })
        if (r403.erreur || r403.statut !== 403) e.push(`${nom} : jeton de ${autre} → ${r403.erreur ?? r403.statut}, 403 attendu`)
        if (battements(r403)) e.push(`${nom} : battement écrit pour l'agent ${autre}`)
      }
      const rp = await banc(fichier, { ...req, comportements: gardes({ pauseGenerale: async () => ({ active: true }) }) })
      if (nom === 'travail') { if (rp.erreur || rp.statut !== 200 || JSON.stringify(rp.json) !== '{"envois":[]}') e.push(`travail : pause générale → ${rp.erreur ?? rp.statut} ${rp.texte}, { envois: [] } attendu`) }
      else if (rp.erreur || rp.statut !== 423) e.push(`avis : pause générale → ${rp.erreur ?? rp.statut}, 423 attendu`)
      if (appels(rp, 'jugerAvecAvis') || appels(rp, 'travailDuJuge')) e.push(`${nom} : le juge a travaillé malgré la pause générale`)
      const rb = await banc(fichier, { ...req, comportements: gardes({ travailDuJuge: async () => ({ envois: [] }), jugerAvecAvis: async () => ({ ok: true, statut: 'approuve' }) }) })
      if (rb.erreur || rb.statut !== 200) e.push(`${nom} : appel authentifié → ${rb.erreur ?? rb.statut}, 200 attendu`)
      if (battements(rb) < 1) e.push(`${nom} : aucun battement facteur pour un appel authentifié`)
    }
    s.juger('FA-12', e, 'routes de l\'usine : busAgents baissé → 404 avant toute identité ; sans jeton → 401 ; jeton d\'un autre agent → 403 ; pause → { envois: [] } / 423 ; battement à chaque appel authentifié')
  }
  {
    const e = []
    const PIEGES = ['adresse-piege@temoin.invalid', 'FAIT-PIEGE-ID', 'REFERENCE-PIEGE', 'PROSPECT-PIEGE']
    const piegeux = { id: 'x1', canal: 'formulaire_site', type: 'premier_contact', modele_id: 'm', texte: 'Texte Témoin', empreinte: 'a'.repeat(64), destinataire: PIEGES[0], fait_id: PIEGES[1], reference: PIEGES[2], prospect_id: PIEGES[3], references: [PIEGES[2]] }
    const r1 = await banc(fUsineTravail, { ...REQ.travail, comportements: gardes({ travailDuJuge: async () => ({ envois: [piegeux] }) }) })
    if (r1.erreur || r1.statut !== 200) e.push(`GET travail → ${r1.erreur ?? r1.statut}`)
    else {
      const champs = Object.keys(r1.json?.envois?.[0] ?? {}).sort().join(',')
      if (champs !== 'canal,empreinte,id,modele_id,texte,type') e.push(`GET travail rend les champs « ${champs} », attendus : canal, empreinte, id, modele_id, texte, type`)
      for (const x of PIEGES) if (r1.texte.includes(x)) e.push(`GET travail laisse passer la chaîne piégée ${x}`)
    }
    const r2 = await banc(fUsineTravail, { ...REQ.travail, url: 'https://prestiapp.fr/api/usine/facteur/travail?passe=soir', comportements: gardes({ travailDuSoir: async () => ({ envois: [] }), travailDuJuge: async () => { throw new Error('la passe du soir n\'appelle pas travailDuJuge') } }) })
    if (r2.erreur || r2.statut !== 200) e.push(`GET travail?passe=soir → ${r2.erreur ?? r2.statut}`)
    const r3 = await banc(fUsineTravail, { ...REQ.travail, url: 'https://prestiapp.fr/api/usine/facteur/travail?passe=pause', comportements: gardes() })
    if (r3.erreur || r3.statut !== 400) e.push(`GET travail?passe=pause → ${r3.erreur ?? r3.statut}, 400 attendu`)
    const src = fs.readFileSync(fUsineTravail, 'utf8')
    if (importsDe(src).some((i) => i.spec && /lib\/agents\/llm/.test(i.spec))) e.push('travail/route.ts importe lib/agents/llm')
    s.juger('FA-13', e, 'GET travail : seulement id, canal, type, modele_id, texte, empreinte (chaînes piégées absentes) ; ?passe=soir servi par travailDuSoir ; passe inconnue → 400')
  }
  {
    const e = []
    const post = (corps, comp) => banc(fUsineAvis, { ...REQ.avis, corps, comportements: gardes(comp) })
    const mal = [['JSON illisible', '{malforme'], ['champs absents', {}], ['empreinte courte', { ...corpsAvis, empreinte: 'abc' }], ['verdict inconnu', { ...corpsAvis, j2: { verdict: 'peut-etre', raisons: [] } }], ['6 raisons', { ...corpsAvis, j2: { verdict: 'ok', raisons: ['a', 'b', 'c', 'd', 'e', 'f'] } }], ['raison de 201 signes', { ...corpsAvis, j2: { verdict: 'refus', raisons: ['x'.repeat(201)] } }], ['identifiant non uuid', { ...corpsAvis, envoi_id: 'pas-un-uuid' }], ['j2_version vide', { ...corpsAvis, j2_version: '' }], ['passe inconnue', { ...corpsAvis, passe: 'matin' }]]
    for (const [nom, corps] of mal) {
      const r = await post(corps, { jugerAvecAvis: async () => ({ ok: true, statut: 'approuve' }), rejugerAvecAvis: async () => ({ ok: true, statut: 'envoye' }) })
      if (r.erreur || r.statut !== 400) e.push(`corps mal formé (${nom}) : ${r.erreur ?? r.statut}, 400 attendu`)
      if (appels(r, 'jugerAvecAvis') || appels(r, 'rejugerAvecAvis')) e.push(`corps mal formé (${nom}) : le juge a été appelé`)
    }
    const rOk = await post(corpsAvis, { jugerAvecAvis: async () => ({ ok: true, statut: 'approuve' }) })
    if (rOk.erreur || rOk.statut !== 200 || rOk.json?.ok !== true) e.push(`avis conforme → ${rOk.erreur ?? rOk.statut} ${rOk.texte}, 200 { ok: true } attendu`)
    if (appels(rOk, 'jugerAvecAvis') !== 1) e.push(`avis conforme : jugerAvecAvis appelé ${appels(rOk, 'jugerAvecAvis')} fois, 1 attendu`)
    const rPerime = await post(corpsAvis, { jugerAvecAvis: async () => ({ ok: false, raison: 'perime' }) })
    if (rPerime.erreur || rPerime.statut !== 200 || rPerime.json?.ok !== false || rPerime.json?.statut !== 'perime') e.push(`empreinte périmée → ${rPerime.erreur ?? rPerime.statut} ${rPerime.texte}, { ok: false, statut: 'perime' } attendu`)
    const rDeja = await post(corpsAvis, { jugerAvecAvis: async () => ({ ok: false, raison: 'perime', detail: 'deja_juge' }) })
    if (rDeja.erreur || rDeja.statut !== 409) e.push(`second avis sur un envoi déjà jugé → ${rDeja.erreur ?? rDeja.statut}, 409 attendu`)
    const rSoir = await post({ ...corpsAvis, passe: 'soir' }, { rejugerAvecAvis: async () => ({ ok: true, statut: 'envoye' }), jugerAvecAvis: async () => { throw new Error('passe du soir : jugerAvecAvis appelé') } })
    if (rSoir.erreur || rSoir.statut !== 200 || appels(rSoir, 'rejugerAvecAvis') !== 1) e.push(`avis du soir → ${rSoir.erreur ?? rSoir.statut}, rejugerAvecAvis une fois attendu`)
    const src = fs.readFileSync(fUsineAvis, 'utf8')
    if (importsDe(src).some((i) => i.spec && /lib\/agents\/llm/.test(i.spec))) e.push('avis/route.ts importe lib/agents/llm')
    if (!/jugerAvecAvis/.test(src)) e.push('avis/route.ts n\'appelle pas jugerAvecAvis')
    for (const r of [rOk, rPerime, rDeja]) if (/artisan|@|Texte Témoin/.test(r.console)) e.push('un texte ou une adresse apparaît dans la console de la route avis')
    s.juger('FA-14', e, 'POST avis : 9 corps mal formés → 400 sans juge ; avis conforme → 200 ; périmé → { ok: false } ; second avis → 409 ; passe du soir → rejugerAvecAvis ; ni llm ni texte en console')
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PARTIE gmail
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function partieGmail(s, IDS) {
  const fGmail = path.join(RAC, 'lib', 'agents', 'acquisition', 'porteurs', 'gmail.ts')
  const e1 = []
  let mod = null
  if (!fs.existsSync(fGmail)) e1.push(`module absent : ${rel(fGmail)}`)
  else {
    try { mod = await importerDepuis(RAC, path.join('lib', 'agents', 'acquisition', 'porteurs', 'gmail.ts')) } catch (err) { e1.push(`gmail.ts ne s'importe pas : ${premiereLigne(err)}`) }
    if (mod && typeof mod.creerPorteurGmail !== 'function') e1.push('export creerPorteurGmail absent')
    if (mod && typeof mod.releverGmail !== 'function') e1.push('export releverGmail absent')
  }
  s.juger('GM-1', e1, 'creerPorteurGmail et releverGmail exportés')
  if (e1.length) { s.nonJuges(IDS.slice(1), 'GM-1 en échec'); return }

  const MOT_DE_PASSE = 'abcd efgh ijkl mnop'
  // GM-2 : session SMTP exacte, mot de passe sans espaces, une pièce jointe MP4 correcte / refusée.
  {
    const e = []
    const smtp = await demarrerSmtpFactice({ scenario: 'ok', motDePasseAttendu: sansEspaces(MOT_DE_PASSE) })
    try {
      const transport = creerTransportSmtpTest(smtp.port)
      const porteur = mod.creerPorteurGmail({ pauseGenerale: async () => ({ active: false }), user: ADRESSE_PROSPECTION, pass: MOT_DE_PASSE, adresse: ADRESSE_PROSPECTION, transport })
      if (porteur.canal !== 'email_sollicite') e.push(`porteur.canal = ${porteur.canal}, email_sollicite attendu`)
      const r = await porteur.envoyer({ a: 'artisan.temoin@temoin-menuiserie-gm.invalid', objet: 'Objet Témoin', texte: 'Bonjour Témoin', enReponseA: '<msg1@temoin.invalid>', references: ['<msg1@temoin.invalid>'] })
      if (!r?.ok) e.push(`envoi refusé : ${JSON.stringify(r)}`)
      const sess = smtp.sessions.at(-1)
      if (!sess) e.push('aucune session SMTP consignée')
      else {
        if (sess.auth?.motDePasse !== sansEspaces(MOT_DE_PASSE)) e.push(`mot de passe transmis : « ${sess.auth?.motDePasse} », « ${sansEspaces(MOT_DE_PASSE)} » attendu (sans espaces)`)
        if (sess.mailFrom !== ADRESSE_PROSPECTION) e.push(`MAIL FROM : ${sess.mailFrom}, ${ADRESSE_PROSPECTION} attendu`)
        if (sess.rcptTo.length !== 1 || sess.rcptTo[0] !== 'artisan.temoin@temoin-menuiserie-gm.invalid') e.push(`RCPT TO : ${JSON.stringify(sess.rcptTo)}, un seul destinataire attendu`)
        for (const h of ['From', 'To', 'Subject', 'In-Reply-To', 'References']) if (!sess.entetes[h]) e.push(`en-tête ${h} absent`)
        if (!/text\/plain/i.test(sess.entetes['Content-Type'] ?? '')) e.push('Content-Type n\'est pas text/plain')
        if (/text\/html|<html/i.test(sess.corps)) e.push('le corps contient du HTML')
      }
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
    s.juger('GM-2', e, 'session SMTP exacte : mot de passe sans espaces, MAIL FROM, un seul RCPT TO, en-têtes, texte brut sans HTML')
    await smtp.arreter()
  }
  // GM-3 : erreurs sans exception.
  {
    const e = []
    for (const [scenario, attendu] of [['auth', 'auth'], ['quota', 'quota'], ['coupure', 'injoignable']]) {
      const smtp = await demarrerSmtpFactice({ scenario })
      try {
        const porteur = mod.creerPorteurGmail({ pauseGenerale: async () => ({ active: false }), user: ADRESSE_PROSPECTION, pass: MOT_DE_PASSE, adresse: ADRESSE_PROSPECTION, transport: creerTransportSmtpTest(smtp.port) })
        const r = await porteur.envoyer({ a: 'artisan.temoin@temoin-erreur-gm.invalid', objet: 'x', texte: 'x', enReponseA: null, references: [] })
        if (r?.ok !== false || r?.erreur !== attendu) e.push(`${scenario} : ${JSON.stringify(r)}, erreur ${attendu} attendue`)
      } catch (err) { e.push(`${scenario} : une exception est sortie (${premiereLigne(err)}), un objet { ok:false } attendu`) }
      await smtp.arreter()
    }
    s.juger('GM-3', e, '535 → auth, 550 5.4.5 → quota, coupure → injoignable, jamais une exception')
  }
  // GM-4 : la relève ne lit jamais le message adressé ailleurs (EXAMINE, pas SELECT ; ni STORE/COPY/MOVE/EXPUNGE).
  {
    const e = []
    const imap = creerImapFactice({ messages: MESSAGES, autreAdresse: AUTRE_ADRESSE, uidValidity: UID_VALIDITY_INITIALE })
    try {
      const r = await mod.releverGmail({ imap, adresse: ADRESSE_PROSPECTION, curseur: 0 })
      if (imap.ouvertureEnLectureSeule() !== true) e.push('la boîte n\'a pas été ouverte en lecture seule (EXAMINE)')
      if (imap.commandes.some((c) => /^(STORE|COPY|MOVE|EXPUNGE)\b/.test(c))) e.push('une commande STORE/COPY/MOVE/EXPUNGE a été émise')
      const texteTout = imap.commandes.join(' ')
      if (/uid 105\b/i.test(texteTout) || JSON.stringify(r).includes('jamais être ouvert')) e.push('le message adressé à l\'autre boîte (uid 105) a été lu')
      if (!Array.isArray(r?.messages) || !r.messages.length) e.push('releverGmail ne rend aucun message')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
    s.juger('GM-4', e, 'EXAMINE (pas SELECT), aucune commande d\'écriture, le message d\'une autre boîte jamais lu')
  }
  // GM-5 : reprise (curseur, UIDVALIDITY changé).
  {
    const e = []
    try {
      const imapReprise = creerImapFactice({ messages: MESSAGES, uidValidity: UID_VALIDITY_INITIALE, uidValiditeChangee: true, reprise: MESSAGE_REPRISE })
      const r = await mod.releverGmail({ imap: imapReprise, adresse: ADRESSE_PROSPECTION, curseur: 999999 })
      const ids = (r?.messages ?? []).map((m) => m.id_externe ?? m.messageId)
      const doublons = ids.filter((id, i) => ids.indexOf(id) !== i)
      if (doublons.length) e.push(`des messages sont dédoublonnés : ${doublons.join(', ')}`)
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
    s.juger('GM-5', e, 'UIDVALIDITY changé → reprise sans doublon de Message-ID (jugement structurel ; le détail des 14 jours dépend de l\'implémentation)')
  }
  // GM-6 : auto/accusé.
  {
    const e = []
    try {
      const imap = creerImapFactice({ messages: MESSAGES, uidValidity: UID_VALIDITY_INITIALE })
      const r = await mod.releverGmail({ imap, adresse: ADRESSE_PROSPECTION, curseur: 0 })
      const auto = (r?.messages ?? []).find((m) => /autoreply/i.test(m.id_externe ?? ''))
      const accuse = (r?.messages ?? []).find((m) => /accuse-cf7/i.test(m.id_externe ?? ''))
      const vraie = (r?.messages ?? []).find((m) => /reponse-artisan/i.test(m.id_externe ?? ''))
      if (auto && auto.auto !== true) e.push('le message Auto-Submitted n\'est pas marqué auto:true')
      if (accuse && accuse.accuse_site !== true) e.push('l\'accusé Contact Form 7 n\'est pas marqué accuse_site:true')
      if (vraie && (vraie.auto === true || vraie.accuse_site === true)) e.push('une vraie réponse est marquée auto ou accuse_site')
      s.juger('GM-6', e, 'Auto-Submitted → auto:true ; accusé Contact Form 7 → accuse_site:true ; une vraie réponse → les deux faux')
    } catch (err) { s.juger('GM-6', [`interrompu : ${premiereLigne(err)}`], '') }
  }
  // GM-7 : secrets absents.
  {
    const e = []
    const smtp = await demarrerSmtpFactice({ scenario: 'auth' })
    try {
      const sortie = []
      const orig = { ...console }
      for (const k of ['log', 'error', 'warn']) console[k] = (...a) => sortie.push(a.map(String).join(' '))
      let erreurTexte = ''
      try { const r = await mod.creerPorteurGmail({ pauseGenerale: async () => ({ active: false }), user: ADRESSE_PROSPECTION, pass: MOT_DE_PASSE, adresse: ADRESSE_PROSPECTION, transport: creerTransportSmtpTest(smtp.port) }).envoyer({ a: 'x@temoin.invalid', objet: 'x', texte: 'Texte Secret Témoin', enReponseA: null, references: [] }); erreurTexte = JSON.stringify(r) } catch (err) { erreurTexte = String(err) } finally { Object.assign(console, orig) }
      if (sortie.some((l) => l.includes(MOT_DE_PASSE) || l.includes(sansEspaces(MOT_DE_PASSE)))) e.push('le mot de passe apparaît dans la console')
      if (erreurTexte.includes(MOT_DE_PASSE)) e.push('le mot de passe apparaît dans l\'erreur rendue')
      if (erreurTexte.includes('Texte Secret Témoin')) e.push('le texte du message apparaît dans l\'erreur rendue')
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) }
    await smtp.arreter()
    s.juger('GM-7', e, 'ni le mot de passe, ni l\'utilisateur, ni un texte de message dans la console capturée ni dans une erreur rendue')
  }
}

/** Un transport minimal, compatible de l'API nodemailer (sendMail), qui parle SMTP en clair au faux serveur local. */
function creerTransportSmtpTest(port) {
  return {
    async sendMail(options) {
      const s = await connecterLocal(port)
      return new Promise((resolve) => {
        let etape = 0
        const lignes = []
        let tampon = ''
        const ecrire = (t) => s.write(`${t}\r\n`)
        const corpsMime = [
          `From: ${options.from}`, `To: ${options.to}`, `Subject: ${options.subject ?? ''}`,
          ...(options.inReplyTo ? [`In-Reply-To: ${options.inReplyTo}`] : []),
          ...(options.references?.length ? [`References: ${options.references.join(' ')}`] : []),
          'Content-Type: text/plain; charset=utf-8', '', options.text ?? '',
        ].join('\r\n')
        s.on('data', (buf) => {
          tampon += buf.toString('utf8')
          const rep = tampon.slice(-4)
          if (!/^\d{3} /.test(tampon.split('\r\n').filter(Boolean).at(-1) ?? '')) return
          const code = Number((tampon.split('\r\n').filter(Boolean).at(-1) ?? '').slice(0, 3))
          tampon = ''
          if (etape === 0) { ecrire('EHLO temoin'); etape = 1; return }
          if (etape === 1) {
            if (code >= 400) { s.end(); resolve({ ok: false, erreur: 'injoignable' }); return }
            ecrire('AUTH LOGIN'); etape = 2; return
          }
          if (etape === 2) { ecrire(Buffer.from(options.auth?.user ?? '').toString('base64')); etape = 3; return }
          if (etape === 3) { ecrire(Buffer.from(options.auth?.pass ?? '').toString('base64')); etape = 4; return }
          if (etape === 4) {
            if (code === 535) { s.end(); resolve({ ok: false, erreur: 'auth' }); return }
            ecrire(`MAIL FROM:<${options.from2 ?? extraireAdresse(options.from)}>`); etape = 5; return
          }
          if (etape === 5) {
            // la réponse à MAIL FROM : 550 5.4.5 = quota de Gmail (le faux serveur le rend là)
            if (code === 550) { s.end(); resolve({ ok: false, erreur: 'quota' }); return }
            ecrire(`RCPT TO:<${options.to}>`); etape = 6; return
          }
          if (etape === 6) { ecrire('DATA'); etape = 7; return }
          if (etape === 7) {
            if (code === 550) { s.end(); resolve({ ok: false, erreur: 'quota' }); return }
            ecrire(`${corpsMime.split('\r\n').map((l) => (l.startsWith('.') ? `.${l}` : l)).join('\r\n')}\r\n.`); etape = 8; return
          }
          if (etape === 8) { ecrire('QUIT'); s.end(); resolve({ ok: true, messageId: `<temoin-${Date.now()}@presti-prospection.invalid>`, response: String(code) }); return }
        })
        s.on('error', () => resolve({ ok: false, erreur: 'injoignable' }))
        s.setTimeout(2000, () => { s.destroy(); resolve({ ok: false, erreur: 'injoignable' }) })
      })
    },
    options: { auth: { user: ADRESSE_PROSPECTION, pass: '' } },
  }
}
const extraireAdresse = (from) => (/<([^>]+)>/.exec(from ?? '') || [, from])[1]

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PARTIE porteur
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function partiePorteur(s, IDS) {
  const fModule = path.join(RAC, 'lib', 'agents', 'acquisition', 'porteurFormulaire.ts')
  const fScript = path.join(RAC, 'scripts', 'agents', 'porteur-formulaire.mjs')
  const fTravail = path.join(RAC, 'app', 'api', 'usine', 'porteur', 'travail', 'route.ts')
  const fRendu = path.join(RAC, 'app', 'api', 'usine', 'porteur', 'rendu', 'route.ts')
  const fOppositions = path.join(RAC, 'app', 'api', 'usine', 'porteur', 'oppositions', 'route.ts')
  const unites = ['presti-porteur.service', 'presti-porteur.timer', 'presti-export-nuit.service', 'presti-export-nuit.timer'].map((n) => path.join(RAC, 'scripts', 'usine', 'systemd', n))
  const e1 = []
  let mod = null
  for (const [f, nom] of [[fModule, 'porteurFormulaire.ts'], [fScript, 'porteur-formulaire.mjs'], [fTravail, 'usine/porteur/travail/route.ts'], [fRendu, 'usine/porteur/rendu/route.ts'], [fOppositions, 'usine/porteur/oppositions/route.ts']]) if (!fs.existsSync(f)) e1.push(`absent : ${nom}`)
  for (const f of unites) if (!fs.existsSync(f)) e1.push(`unité systemd absente : ${path.basename(f)}`)
  if (fs.existsSync(fModule)) {
    try { mod = await importerDepuis(RAC, path.join('lib', 'agents', 'acquisition', 'porteurFormulaire.ts')) } catch (err) { e1.push(`porteurFormulaire.ts ne s'importe pas : ${premiereLigne(err)}`) }
    if (mod) for (const n of ['planDeRemplissage', 'controlesEnDirect']) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent`)
  }
  for (const [f, methode] of [[fTravail, 'GET'], [fRendu, 'POST'], [fOppositions, 'GET']]) if (fs.existsSync(f) && !exportsNommes(fs.readFileSync(f, 'utf8')).includes(methode)) e1.push(`${rel(f)} n'exporte pas ${methode}`)
  s.juger('PF-1', e1, 'porteurFormulaire.ts (planDeRemplissage, controlesEnDirect), les 3 routes, le script et les 4 unités systemd')
  if (e1.length) { s.nonJuges(IDS.slice(1).filter((x) => !x.startsWith('PF-R')), 'PF-1 en échec'); return }

  // PF-2 : le plan de remplissage, sans navigateur.
  {
    const e = []
    const cas = [
      ['conforme', FORMULAIRE_CONFORME, { objet: 'Objet Témoin', texte: 'Texte Témoin', adresse: ADRESSE_PROSPECTION }, (r) => {
        if (!r.ok) return [`refusé : ${JSON.stringify(r)}`]
        const err = []
        const champ = (nom) => r.champs.find((c) => c.nom === nom)?.valeur
        if (champ('your-name') !== NOM_EXPEDITEUR_TEMOIN) err.push(`champ nom = ${champ('your-name')}`)
        if (champ('your-email') !== ADRESSE_PROSPECTION) err.push(`champ e-mail = ${champ('your-email')}`)
        if (champ('your-phone')) err.push('le téléphone n\'est pas laissé vide')
        if (r.motif !== 'Autre demande' && r.motif !== 'Autre') err.push(`motif = ${r.motif}, « Autre » attendu`)
        if (r.cases?.some((c) => !/rgpd|consentement/i.test(c))) err.push('une case hors consentement est cochée')
        return err
      }],
      ['téléphone obligatoire', FORMULAIRE_TELEPHONE_REQUIS, { objet: 'x', texte: 'x', adresse: ADRESSE_PROSPECTION }, (r) => (r.ok !== false || r.raison !== 'telephone_requis' ? [`${JSON.stringify(r)}, { ok:false, raison:'telephone_requis' } attendu`] : [])],
      ['motif devis seul', FORMULAIRE_MOTIF_DEVIS_SEUL, { objet: 'x', texte: 'x', adresse: ADRESSE_PROSPECTION }, (r) => (r.ok !== false || r.raison !== 'motif_devis_seul' ? [`${JSON.stringify(r)}, motif_devis_seul attendu`] : [])],
      ['texte trop long', FORMULAIRE_MAXLENGTH_COURT, { objet: 'x', texte: 'x'.repeat(230), adresse: ADRESSE_PROSPECTION }, (r) => (r.ok !== false || r.raison !== 'longueur' ? [`${JSON.stringify(r)}, longueur attendu (230 signes pour un max de 200)`] : [])],
    ]
    for (const [nom, formulaire, envoi, verif] of cas) {
      try { const r = await mod.planDeRemplissage(formulaire, envoi); e.push(...verif(r).map((x) => `${nom} : ${x}`)) } catch (err) { e.push(`${nom} : ${premiereLigne(err)}`) }
    }
    s.juger('PF-2', e, 'plan de remplissage exact sur le formulaire conforme ; téléphone obligatoire → telephone_requis ; motif devis seul → motif_devis_seul ; texte trop long → longueur')
  }
  // PF-3 à PF-8, PF-10, PF-12, PF-13 : demandent un vrai Chromium — exercés seulement en --ici (sur l'usine).
  const CHROMIUM = ['PF-3', 'PF-4', 'PF-5', 'PF-6', 'PF-7', 'PF-8', 'PF-10', 'PF-12', 'PF-13']
  const ESSAI_IDS = ['PF-3', 'PF-4', 'PF-5', 'PF-6', 'PF-7', 'PF-8', 'PF-9', 'PF-10', 'PF-11', 'PF-12', 'PF-13', 'PF-14', 'PF-15'] // ce que l'essai réel doit rendre, sur l'usine
  if (!ICI) {
    // PF-6/PF-7/PF-11 : les routes de l'usine sont jugeables sans Chromium (ce sont des routes Vercel), par le banc.
    {
      const e = []
      const r1 = await banc(fTravail, { url: 'https://prestiapp.fr/api/usine/porteur/travail' })
      if (r1.statut !== 401 && r1.erreur === null) e.push(`sans jeton : statut ${r1.statut}, 401 attendu`)
      s.juger('PF-6', e, 'route travail : garde du jeton (lecture assistée par le banc ; le plafond exact et le calendrier se jugent avec la base réelle, 026-095)')
    }
    {
      const e = []
      const r1 = await banc(fRendu, { methode: 'POST', url: 'https://prestiapp.fr/api/usine/porteur/rendu', corps: '{malforme' })
      if (r1.statut !== 400 && r1.erreur === null) e.push(`corps mal formé : statut ${r1.statut}, 400 attendu`)
      s.juger('PF-7', e, 'route rendu : corps mal formé → 400 (lecture assistée par le banc)')
    }
    {
      const e = []
      const r1 = await banc(fOppositions, { methode: 'POST', url: 'https://prestiapp.fr/api/usine/porteur/oppositions', corps: { envois: Array.from({ length: 501 }, (_, i) => `id-${i}`) } })
      if (r1.statut !== 400 && r1.erreur === null) e.push(`501 ids : statut ${r1.statut}, 400 attendu (500 au plus)`)
      s.juger('PF-11', e, 'route oppositions POST : 501 ids refusés (lecture assistée par le banc ; releve_gmail_le exact avec la base réelle)')
    }
    // PF-9 : lecture du source, sans navigateur.
    {
      const e = []
      const srcScript = fs.readFileSync(fScript, 'utf8'), srcModule = fs.readFileSync(fModule, 'utf8')
      for (const mot of ['2captcha', 'anti-captcha', 'capsolver', 'stealth', 'proxy', 'puppeteer-extra']) if (srcScript.toLowerCase().includes(mot) || srcModule.toLowerCase().includes(mot)) e.push(`chaîne interdite « ${mot} »`)
      if (/storageState/.test(srcScript)) e.push('storageState (cookie persistant) présent')
      const tc = typecheck(RAC, JUGE)
      if (!tc.ok) e.push(`typecheck : ${tc.detail}`)
      s.juger('PF-9', e, 'ni 2captcha/anti-captcha/capsolver/stealth/proxy/puppeteer-extra, ni storageState ; typecheck vert')
    }
    for (const id of CHROMIUM) {
      // Ces critères se relancent sur l'usine par ce même juge, --partie=porteur --ici (Chromium réel, formulaires/ servi
      // localement) : ils ne sont pas « non jugés » par erreur, mais explicitement réservés à l'exécution sur l'usine.
      s.passe(id, 'réservé à l\'exécution sur l\'usine (--ici), où un vrai Chromium tourne (le poste ne le lance jamais pour ce juge)')
    }
    // Le poste relance sa propre partie navigateur sur l'usine, comme le prescrit la fiche, et recopie le verdict.
    const r = spawnSync(process.execPath, ['scripts/usine.mjs', 'executer', '--nom=porteur-qa', '--', 'node', '--import', './scripts/ts-loader.mjs', 'scripts/facteur-qa.mjs', '--partie=porteur', '--ici'], { cwd: R, encoding: 'utf8', timeout: 20 * 60_000, windowsHide: true })
    if (r.error || r.status === 5 || r.status === 3 || r.status === null) {
      console.log(String(r.stdout ?? '')); console.log(String(r.stderr ?? ''))
      console.log(`${JUGE} --partie=porteur : usine injoignable — ${r.error ? premiereLigne(r.error) : `code usine ${r.status}`}`)
      piege.retirer(); process.exit(2)
    }
    console.log('--- sortie de facteur-qa --partie=porteur --ici (usine) ---')
    console.log(String(r.stdout ?? ''))
    if (r.stderr) console.log(String(r.stderr))
    piege.retirer()
    // le verdict du poste ne se contente pas de celui de l'usine : un critère rouge ici (PF-1, PF-2, PF-9 et son typecheck) reste rouge
    const rougesPoste = IDS.filter((id) => s.enEchec(id))
    if (rougesPoste.length) console.log(`${NOM} : FAIL sur le poste — ${rougesPoste.join(', ')}`)
    process.exit(r.status === 0 && !rougesPoste.length ? 0 : (r.status || 1))
  } else {
    // --ici : sur l'usine, vrai Chromium. Playwright doit être installé (026-143, mise en service) ; sinon, refus explicite
    // plutôt qu'un faux vert.
    let chromium
    try { ({ chromium } = await import('playwright')) } catch { for (const id of CHROMIUM) s.echoue(id, 'Playwright indisponible sur cet hôte (mise en service 026-143 non faite)'); return }
    const serveur = await demarrerServeurFormulaires()
    const navigateur = await chromium.launch()
    try {
      const page = await navigateur.newPage({ userAgent: K.UA_RECENSEUR })
      // PF-3 : chaque page d'abandon → sa raison exacte, aucune requête de soumission.
      const { RAISONS } = await import('./fixtures/026-acquisition/envoi/formulaires.mjs')
      const e3 = []
      for (const r of RAISONS) {
        await page.goto(serveur.urlDe(r.chemin), { waitUntil: 'load' })
        const c = await mod.controlesEnDirect(page)
        if (c.ok !== false || c.raison !== r.raison) e3.push(`${r.id} : ${JSON.stringify(c)}, ${r.raison} attendu`)
      }
      const soumissionsAvant = serveur.requetes.filter((x) => x.methode === 'POST').length
      if (serveur.requetes.filter((x) => x.methode === 'POST').length !== soumissionsAvant) e3.push('une requête de soumission a été consignée sur une page d\'abandon')
      s.juger('PF-3', e3, `${RAISONS.length} pages d'abandon jugées par un vrai Chromium, chacune à sa raison exacte, aucune soumission`)
    } finally { await navigateur.close(); await serveur.arreter() }
    // L'essai réel (026-095, juge corrigé le 29/09 : PF-4 était vide et PF-5, 6, 7, 8, 10, 12, 13 « passe » sans essai, PF-9 et PF-11
    // non évalués) : le vrai script du porteur dans un vrai Chromium, contre des sites témoins en 127.0.0.1 et une doublure de l'API ;
    // les trois routes par le banc ; le source. Une ligne ✅/❌ par critère, recopiée ici. Un critère sans ligne est rouge.
    const essaiF = path.join(ENVOI, 'essai-porteur.mjs')
    if (!fs.existsSync(essaiF)) { for (const id of ESSAI_IDS) s.echoue(id, 'essai-porteur.mjs absent des jeux d\'essai'); return }
    const essai = spawnSync(process.execPath, ['--import', pathToFileURL(LOADER).href, essaiF, `--racine=${RAC}`], { cwd: R, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true })
    const sortieEssai = `${essai.stdout ?? ''}\n${essai.stderr ?? ''}`
    const finEssai = /^essai-porteur : (PASS|FAIL)(?: — (.*))?$/mu.exec(sortieEssai)
    const vus = new Set()
    for (const m of sortieEssai.matchAll(/^(✅|❌) (PF-\d+) (.*)$/gmu)) { vus.add(m[2]); s.juger(m[2], m[1] === '✅' ? [] : [m[3]], m[3]) }
    if (finEssai?.[1] === 'FAIL') for (const id of (finEssai[2] ?? '').split(/,\s*/).filter(Boolean)) if (!s.enEchec(id)) s.echoue(id, 'l\'essai annonce FAIL sur ce critère')
    const raisonSansVerdict = finEssai ? 'l\'essai n\'a rendu aucune ligne pour ce critère' : `l'essai n'a pas rendu de verdict : ${essai.error ? premiereLigne(essai.error) : court(sortieEssai.split('\n').filter(Boolean).slice(-3).join(' · '), 300)}`
    for (const id of ESSAI_IDS) if (!vus.has(id)) s.echoue(id, raisonSansVerdict)
  }

  // --reel --confirmer-reel : mise en service (026-143), lundi-vendredi 8h-17h30 Paris seulement.
  if (REEL) {
    const heureParis = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()))
    const jourParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date())
    const ouvre = !['sam.', 'dim.'].includes(jourParis) && heureParis >= 8 && heureParis < 17
    if (!ouvre) { console.log(`${JUGE} --partie=porteur --reel : hors lundi-vendredi 8h-17h30 (Paris) — rien n'est fait`); process.exit(2) }
    console.log(`${JUGE} --partie=porteur --reel : mise en service (026-143), non exercé par cette fiche (026-062 écrit les juges, pas la production réelle)`)
    process.exit(2)
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Auto-contrôle (les trois parties)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function autoControle(s) {
  if (PARTIE === 'gmail' || PARTIE === 'facteur') {
    const e = []
    const smtp = await demarrerSmtpFactice({ scenario: 'ok', motDePasseAttendu: 'test' })
    try {
      const transport = creerTransportSmtpTest(smtp.port)
      await transport.sendMail({ from: ADRESSE_PROSPECTION, to: 'x@temoin.invalid', subject: 'x', text: 'x', auth: { user: 'u', pass: 'test' } })
      if (!smtp.sessions.length || smtp.sessions[0].ehlo === null) e.push('la session SMTP n\'a pas consigné EHLO')
    } catch (err) { e.push(premiereLigne(err)) }
    await smtp.arreter()
    const imap = creerImapFactice({ messages: MESSAGES, uidValidity: UID_VALIDITY_INITIALE })
    await imap.mailboxOpen('INBOX', { readOnly: true })
    const uids = await imap.search({ header: { to: ADRESSE_PROSPECTION } })
    if (!uids.length) e.push('le faux client IMAP ne rend aucun UID pour l\'adresse de prospection')
    if (uids.includes(105)) e.push('le faux client IMAP rend l\'UID du message adressé ailleurs sans filtre explicite')
    const meta = creerMetaFactice({ scenario: 'ok' })
    await meta.fetch('https://graph.facebook.com/v26.0/c1/private_replies', { method: 'POST', body: JSON.stringify({ message: 'x', access_token: 't' }) })
    if (!meta.requetes.length) e.push('l\'API Meta factice ne consigne aucune requête')
    s.juger('AC-1', e, 'le faux SMTP consigne la session, le faux IMAP filtre par adresse, l\'API Meta factice consigne ses requêtes')
  }
  if (PARTIE === 'facteur' || PARTIE === 'porteur') {
    const e = []
    const serveur = await demarrerServeurFormulaires()
    try {
      const r = await getLocal(serveur.urlDe('/robots.txt'))
      if (!r.texte.includes('User-agent')) e.push('robots.txt ne se sert pas correctement')
      const r2 = await getLocal(serveur.urlDe('/conforme/contact'))
      if (!r2.texte.includes('<form')) e.push('la page conforme n\'a pas de <form>')
      if (serveur.requetes.length < 2) e.push('le serveur de formulaires ne consigne pas les requêtes')
    } catch (err) { e.push(premiereLigne(err)) } finally { await serveur.arreter() }
    s.juger('AC-2', e, 'le serveur de formulaires sert les pages et consigne chaque requête')
  }
  {
    const e = []
    const sc = lireJson(path.join(ENVOI, 'scenarios.json'))
    const et = lireJson(path.join(ENVOI, 'envois-approuves.json'))
    if (!et.envois?.some((x) => x.opposant === true)) e.push('aucun envoi approuvé « à un opposant » dans les fixtures')
    if (!et.envois?.some((x) => x.technologie === 'wpforms')) e.push('aucun envoi approuvé sur la technologie en pause')
    if (!et.envois?.some((x) => x.modele_id?.includes('suspendu'))) e.push('aucun envoi approuvé d\'un modèle suspendu')
    s.juger('AC-3', e, 'envois-approuves.json : un opposant, une technologie en pause, un modèle suspendu (FA-3/FA-10)')
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const IDS_FACTEUR = Array.from({ length: 14 }, (_, i) => `FA-${i + 1}`)
const IDS_GMAIL = Array.from({ length: 7 }, (_, i) => `GM-${i + 1}`)
const IDS_PORTEUR = Array.from({ length: 15 }, (_, i) => `PF-${i + 1}`) // PF-14 (relecture avant le clic) et PF-15 (route oppositions) : ajoutés le 29/09 avec l'essai réel
const IDS = { facteur: IDS_FACTEUR, gmail: IDS_GMAIL, porteur: IDS_PORTEUR }[PARTIE]
const idsAuto = { facteur: ['AC-1', 'AC-2', 'AC-3'], gmail: ['AC-1'], porteur: ['AC-2', 'AC-3'] }[PARTIE]
const ids = o.autoControle ? idsAuto : IDS
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — fixtures ${rel(ENVOI)}`)
if (o.autoControle) await autoControle(s)
else if (PARTIE === 'facteur') await partieFacteur(s, IDS)
else if (PARTIE === 'gmail') await partieGmail(s, IDS)
else await partiePorteur(s, IDS)
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
