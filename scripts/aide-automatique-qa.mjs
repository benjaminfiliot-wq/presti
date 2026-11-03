// Test permanent — le centre d'aide dit ce que fait le code (« Ce qui est automatique », « Qui a quoi », pastilles d'offre, badge Studio).
//
// Un texte d'aide qui promet plus que le code est une promesse non tenue ; celui-ci fait échouer le lanceur quand l'un des deux bouge sans l'autre :
//  1. le badge « Le plus choisi » n'existe plus (CSS de la landing) ni ne revient sous un autre nom (« Populaire », « Recommandé ») sur les cartes d'offres ;
//  2. les nombres écrits dans lib/aideAutomatique.ts (réponses par conversation, relances J+2/5/10, impayés J+3/10/21, 10 par jour) sont ceux de leur source ;
//  3. le mode par défaut est « assistée » (CONFIG_DEFAUT) et l'envoi autonome exige plateforme.ia.auto (modeEffectif), comme l'aide le dit ;
//     25/10 (deux offres) : ce qui part seul est Signature, Studio prépare et l'artisan valide — l'aide le dit entrée par entrée ;
//  4. chaque entrée du centre d'aide (article ET vidéo) a une offre : aucune fonctionnalité listée sans pastille ; l'offre vient de PLANS et rejoint
//     `disponibleAvec` quand l'article en porte une ;
//  5. chaque automatisme annoncé existe dans le passage quotidien (app/api/cron/relances) ou dans son module, et son drapeau existe ;
//  6. la règle de l'assistant : tout ce qui part chez un client, est comptable, irréversible ou supprime est une CONFIRMATION dans SPEC
//     (lib/assistant/outils-actions.ts), la carte vaut 24 h, l'assistant n'est lancé par aucun passage planifié ;
//  7. l'essai gratuit : durées, crédits et plafond lus dans le code, jamais retapés ;
//  8. aucun octet de contrôle dans les fichiers de la section ;
//  9. (03/11, tâche 036-037) ce qui a changé le 03/11, et rien de plus : les prix de Studio et Signature LUS dans lib/plans.ts (jamais écrits en dur),
//     l'offre Entreprise sur devis (aucun montant, aucun chiffre de gain, aucun témoignage), l'outil de gestion (deux portes, devis et factures dedans),
//     « Mes outils » (Google seulement), « Vos assistants » par département et la boîte « À valider » en mode essai (aucune promesse d'envoi seul),
//     chaque sujet neuf sous le drapeau qui montre son écran ; chaque contrôle neuf a son mutant ;
// 10. les captures 390 et 1440 du centre d'aide, rendu par ses vrais composants, hors ligne (aucune requête sortante), dans .orchestre/preuves/036-037/.
// Il s'attaque aussi lui-même : chaque contrôle de texte est rejoué sur une copie fautive et DOIT rougir.
//
// Usage : node scripts/aide-automatique-qa.mjs   (aucun réseau, aucun compte ; le résolveur TypeScript se charge seul, ou par --import ./scripts/ts-loader.mjs)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
// 036-037 : le vérificateur de la tâche lance ce juge sans --import ; le résolveur des imports TypeScript se pose ici (sans effet s'il l'est déjà).
await import(pathToFileURL(path.join(RACINE, 'scripts/ts-loader.mjs')).href)
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8')
const charger = (f) => import(pathToFileURL(path.join(RACINE, f)).href)
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const A = await charger('lib/aideAutomatique.ts')
const P = await charger('lib/plans.ts')
const AIDE = await charger('lib/aide.ts')
const F = await charger('lib/flags.ts')
const SPECS = (await charger('lib/assistant/outils-actions.ts')).SPEC
const V = JSON.parse(lire('lib/aide-videos.json')).videos
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── Les contrôles de texte, en fonctions pures pour pouvoir les rejouer sur une copie fautive ──────────
const badgeRestant = (css) => /content:\s*["']Le plus choisi["']/i.test(css)
const badgeSurCartes = (page) => /Le plus choisi|Populaire|Recommand[ée]/.test(sansCommentaires(page))
const nombre = (src, re) => { const m = src.match(re); return m ? m[1] : null }
const liste = (src, re) => { const m = src.match(re); return m ? m[1].split(',').map((x) => Number(x.trim())) : null }
const lireSources = () => ({
  conf: lire('lib/plateformeConfig.ts'), rel: lire('lib/relances.ts'), imp: lire('lib/relancesImpayes.ts'),
})
const ecartsNombres = (s) => {
  const e = []
  if (Number(nombre(s.conf, /limite_messages:\s*(\d+)/)) !== A.REPONSES_PAR_CONVERSATION) e.push('réponses par conversation')
  if (nombre(s.conf, /mode_reponse:\s*'(\w+)'/) !== 'assistee') e.push('mode par défaut')
  if (JSON.stringify(liste(s.rel, /CADENCE_RELANCES\s*=\s*\[([^\]]*)\]/)) !== JSON.stringify([...A.CADENCE_CONVERSATION])) e.push('cadence des relances de conversation')
  if (JSON.stringify(liste(s.imp, /JOURS_PAR_DEFAUT[^=]*=\s*\[([^\]]*)\]/)) !== JSON.stringify([...A.CADENCE_IMPAYES])) e.push('calendrier des impayés')
  if (Number(nombre(s.imp, /MAX_PAR_COMPTE_JOUR\s*=\s*(\d+)/)) !== A.IMPAYES_MAX_PAR_JOUR) e.push('relances d’impayés par jour')
  if (!/actif:\s*false/.test(s.imp)) e.push('relances d’impayés désactivées par défaut')
  return e
}
const confirmationRequise = (spec) => Object.entries(spec).filter(([nom, s]) => /envoyer|relancer|répondre|créer une facture|encaisser|supprimer|lot de/.test(s.libelle) && !/écarter/.test(s.libelle) && s.cat !== 'confirmation').map(([nom]) => nom)

console.log('── 1. Le badge de l’offre Studio')
const css = lire('app/globals.css'), landing = lire('app/page.tsx'), abo = lire('app/abonnement/page.tsx')
T('le CSS ne pose plus « Le plus choisi » sur la carte Studio', !badgeRestant(css))
T('la landing et /abonnement n’affichent aucun badge « Populaire / Recommandé / Le plus choisi »', !badgeSurCartes(landing) && !badgeSurCartes(abo))
T('(mutation) un badge réintroduit dans le CSS est vu', badgeRestant(css + '\n.lp-plan--feat::before{content:"Le plus choisi"}'))
T('(mutation) un badge « Populaire » réintroduit sur la landing est vu', badgeSurCartes(landing + "\n<span>Populaire</span>"))

console.log('\n── 2. Les nombres de l’aide sont ceux du code')
const S = lireSources()
const ecarts = ecartsNombres(S)
T('réponses par conversation, relances J+2/5/10, impayés J+3/10/21, 10 par jour, assistée par défaut', ecarts.length === 0, ecarts.join(' · '))
T('(mutation) limite_messages: 9 est vu', ecartsNombres({ ...S, conf: S.conf.replace(/limite_messages:\s*8/, 'limite_messages: 9') }).includes('réponses par conversation'))
T('(mutation) CADENCE_RELANCES = [2, 5, 11] est vu', ecartsNombres({ ...S, rel: S.rel.replace('[2, 5, 10]', '[2, 5, 11]') }).includes('cadence des relances de conversation'))
T('(mutation) mode par défaut « auto » est vu', ecartsNombres({ ...S, conf: S.conf.replace("mode_reponse: 'assistee'", "mode_reponse: 'auto'") }).includes('mode par défaut'))

console.log('\n── 3. L’envoi autonome exige l’offre (lib/plans.ts)')
T('plateforme.ia.auto : Signature seulement (25/10), ni Studio ni l’Essai', !P.peut('studio', 'plateforme.ia.auto') && P.peut('signature', 'plateforme.ia.auto') && !P.peut('essentiel', 'plateforme.ia.auto') && !P.peut('gratuit', 'plateforme.ia.auto'))
T('modeEffectif rétrograde en « assistée » (verrou_offre) sans cette capacité', /cfg\.mode_reponse === 'auto' && !peut\(plan, 'plateforme\.ia\.auto'\)\) return \{ mode: 'assistee', motif: 'verrou_offre' \}/.test(S.conf))
T('relances préparées et assistant : Studio ; relances envoyées seules, CRM et Pilote : Signature', A.offrePremiere('relances') === 'studio' && A.offrePremiere('factures.relances') === 'studio' && A.offrePremiere('assistant') === 'studio' && A.offrePremiere('relances.auto') === 'signature' && A.offrePremiere('factures.relances.auto') === 'signature' && A.offrePremiere('crm') === 'signature' && A.offrePremiere('assistant.pilote') === 'signature')
T('l’aide ne nomme plus l’Essentiel comme offre (OFFRES_AIDE, NOM_OFFRE)', !A.OFFRES_AIDE.includes('essentiel') && !Object.values(A.NOM_OFFRE).includes('Essentiel'))
{
  // Ce que dit chaque entrée « automatique » sur qui envoie : Studio prépare (vous validez), Signature envoie seul — en nommant les offres de PLANS.
  const e = (id) => A.AUTOMATIQUE_SANS_ASSISTANT.find((x) => x.id === id)?.texte ?? ''
  const S = P.PLANS.studio.label, G = P.PLANS.signature.label
  const dit = (t) => t.includes(`l’offre ${G}`) && t.includes(`l’offre ${S}`)
  T('« réponse envoyée seule » : Signature, et Studio reste en « Assistée »', dit(e('reponse-seule')) && /Assistée/.test(e('reponse-seule')))
  T('« relances des conversations » : préparées en Studio (après votre clic), seules en Signature', dit(e('relances-conversation')) && /après votre clic/.test(e('relances-conversation')) && /partent seules/.test(e('relances-conversation')) && !/y compris en mode « Assistée »/.test(e('relances-conversation')))
  T('« relances d’impayés » : préparées en Studio (vous l’envoyez), seules en Signature', dit(e('relances-impayes')) && /part seul/.test(e('relances-impayes')) && /lorsque vous l’envoyez/.test(e('relances-impayes')))
  T('le passage quotidien ne fait partir la relance de conversation seule qu’avec relances.auto', /if \(!peut\(artisan\.plan, 'relances\.auto'\)\)/.test(lire('app/api/cron/relances/route.ts')))
  T('le tour des impayés ne fait partir la relance seule qu’avec factures.relances.auto', /peut\(art\.plan, 'factures\.relances\.auto'\)/.test(lire('lib/relancesImpayesTour.ts')))
  const chantiers = A.AUTOMATIQUE_AVEC_ASSISTANT.filter((x) => /^a-(chantiers|avancement)$/.test(x.id))
  T('les entrées de l’assistant qui touchent au CRM portent la capacité crm', chantiers.length === 2 && chantiers.every((x) => x.cap === 'crm'))
}

console.log('\n── 4. Chaque fonctionnalité listée a son offre')
const sansOffre = []
for (const a of AIDE.ARTICLES) if (!(a.id in A.CAPACITE_AIDE)) sansOffre.push(`article ${a.id}`)
for (const v of V) if (!(v.id in A.CAPACITE_AIDE)) sansOffre.push(`vidéo ${v.id}`)
T('tous les articles et toutes les vidéos de l’aide ont une entrée dans CAPACITE_AIDE', sansOffre.length === 0, sansOffre.join(', '))
// 25/10 : `disponibleAvec` (et l'`offre` d'une vidéo) vaut « toutes » quand la fonctionnalité est dans toutes les offres — la pastille dit
// alors « Gratuit » (dès l'essai) ; sinon elle vaut exactement la première offre qui l'inclut.
const attendue = (o) => (o === 'gratuit' ? 'toutes' : o)
const incoherents = []
for (const a of AIDE.ARTICLES) {
  const o = A.offreAide(a.id)
  if (o === null || o === 'sur_devis') continue // « commandé à part » ou « sur devis » (Entreprise, 03/11) : pas une des deux offres
  if (attendue(o) !== a.disponibleAvec) incoherents.push(`${a.id} : pastille ${o} ≠ disponibleAvec ${a.disponibleAvec}`)
}
for (const v of V) {
  const o = A.offreAide(v.id)
  if (o !== null && attendue(o) !== v.offre) incoherents.push(`vidéo ${v.id} : pastille ${o} ≠ offre ${v.offre}`)
}
T('la pastille rejoint l’offre déclarée de chaque article et de chaque vidéo', incoherents.length === 0, incoherents.join(' · '))
T('« site » (vidéo) est dit « commandé à part », pas rangé dans une offre', A.offreAide('site') === null && P.CAPACITES_HORS_FORMULES.includes('site.essentiel'))
const lignes = A.LIGNES_OFFRES.filter((l) => P.OFFRES.some(() => true))
const decalage = lignes.filter((l) => { const m = P.offreMinimale(l.cap); const a = A.offrePremiere(l.cap); return m && a !== m && !(a === 'gratuit' && m === 'studio') })
T('chaque ligne de « Qui a quoi » commence à l’offre que dit offreMinimale (lib/plans.ts)', decalage.length === 0, decalage.map((l) => l.id).join(', '))
const sansFlag = A.LIGNES_OFFRES.filter((l) => l.flag && !(l.flag in F.FLAGS))
T('les drapeaux des lignes du tableau existent', sansFlag.length === 0, sansFlag.map((l) => l.id).join(', '))

console.log('\n── 5. Chaque automatisme annoncé existe dans le code')
const cron = lire('app/api/cron/relances/route.ts'), vercel = lire('vercel.json')
const attendus = [
  ['relances de conversation', /from '@\/lib\/mentionAssistant'/, cron, 'avecMentionAssistant'],
  ['expiration des devis', /expirerDevisDepasses\(\)/, cron],
  ['purges RGPD', /purgerRgpd\(\)/, cron],
  ['relances d’impayés', /tourRelancesImpayes\(/, cron],
  ['après-chantier', /tourApresChantier\(/, cron],
  ['rappels du matin', /tourRappels\(/, cron],
  ['validation automatique du chantier', /validationAuto/, lire('app/api/crm/taches/[id]/route.ts')],
  ['temps réel du CRM', /postgres_changes/, lire('app/crm/useTempsReel.ts')],
  ['alertes de l’atelier', /'retard' \| 'livraison' \| 'attendue' \| 'stock' \| 'facturer' \| 'sans_equipe'/, lire('lib/crm/alertes.ts')],
  ['briefing sur demande (bouton)', /envoyer\('Briefing du matin'\)/, lire('app/assistant/page.tsx')],
]
for (const [nom, re, src] of attendus) T(`${nom}`, re.test(src))
T('les deux passages planifiés sont ceux de vercel.json (relances, relève)', /\/api\/cron\/relances/.test(vercel) && /\/api\/canaux\/relever/.test(vercel))
T('l’assistant n’est lancé par AUCUN passage planifié (il n’agit que sur message)', !/lib\/assistant|api\/assistant/.test(sansCommentaires(cron)) && !/assistant/i.test(vercel) && !/lib\/assistant|api\/assistant/.test(sansCommentaires(lire('app/api/canaux/relever/route.ts'))))
const drapeauxManquants = [...A.AUTOMATIQUE_SANS_ASSISTANT, ...A.AUTOMATIQUE_AVEC_ASSISTANT].filter((e) => e.flag && !(e.flag in F.FLAGS))
T('les drapeaux des entrées « automatique » existent', drapeauxManquants.length === 0, drapeauxManquants.map((e) => e.id).join(', '))
const sansCap = [...A.AUTOMATIQUE_SANS_ASSISTANT, ...A.AUTOMATIQUE_AVEC_ASSISTANT].filter((e) => e.cap && !P.PLANS.signature.capacites.includes(e.cap))
T('les capacités citées existent dans la formule la plus haute', sansCap.length === 0, sansCap.map((e) => e.id).join(', '))

console.log('\n── 6. La règle de l’assistant : ce qui part chez un client attend un clic')
const fautifs = confirmationRequise(SPECS)
T('envoyer, relancer, répondre, facturer, encaisser, supprimer, lot de prix : tous en « confirmation »', fautifs.length === 0, fautifs.join(', '))
T('(mutation) un « envoyer un devis » passé en direct est vu', confirmationRequise({ ...SPECS, envoyer_devis: { cat: 'direct', libelle: 'envoyer un devis' } }).includes('envoyer_devis'))
T('au moins 8 actions en confirmation et des actions directes (la liste de SPEC a été lue)', Object.values(SPECS).filter((s) => s.cat === 'confirmation').length >= 8 && Object.values(SPECS).some((s) => s.cat === 'direct'))
T('la carte à confirmer vaut 24 heures, et le texte publié le dit', /VALIDITE_CARTE_MS\s*=\s*24 \* 3600 \* 1000/.test(lire('lib/assistant/cartes.ts')) && /24 heures/.test(A.REPONSE_ASSISTANT.paragraphes[0]))
T('le texte publié cite la limite de messages de plans.ts', A.REPONSE_ASSISTANT.paragraphes.join(' ').includes(`${P.ASSISTANT_TOURS_MAX} messages`))
T('la réponse commence par « Non »', /^Non/.test(A.REPONSE_ASSISTANT.titre))
{
  const regles = lire('lib/pilote/regles.ts')
  const delai = Number(/DELAI_ANNULATION_MIN\s*=\s*(\d+)/.exec(regles)?.[1]), plafond = Number(/PLAFOND_AUTO_JOUR\s*=\s*(\d+)/.exec(regles)?.[1])
  T('Pilote : délai et plafond de l’aide = ceux de lib/pilote/regles.ts', A.PILOTE_DELAI_MIN === delai && A.PILOTE_PLAFOND_JOUR === plafond, `${A.PILOTE_DELAI_MIN}/${delai} · ${A.PILOTE_PLAFOND_JOUR}/${plafond}`)
  const pilote = A.AUTOMATIQUE_AVEC_ASSISTANT.find((e) => e.id === 'a-pilote')
  T('Pilote : l’entrée est réservée à assistant.pilote, sous son drapeau, et « à activer »', pilote?.cap === 'assistant.pilote' && pilote?.flag === 'piloteAutomatique' && pilote?.surDemande === true)
  const tout = A.REPONSE_ASSISTANT.paragraphes.join(' ')
  const art = lire('lib/aide.ts'), artPilote = art.slice(art.indexOf("id: 'pilote'"), art.indexOf("id: 'pilote'") + 2500), artAssistant = art.slice(art.indexOf("id: 'assistant'"), art.indexOf("id: 'pilote'"))
  T('Pilote : l’article du centre d’aide existe, Signature, avec le délai et le plafond du code', art.includes("id: 'pilote'") && /disponibleAvec: 'signature'/.test(artPilote) && artPilote.includes(`${delai} minutes`) && artPilote.includes(`${plafond} envois`) && A.offreAide('pilote') === 'signature')
  T('Pilote : l’article de l’assistant ne promet plus « rien sans votre clic » sans nommer l’exception', /Pilote automatique/.test(artAssistant) && /sauf pour les types d’envoi que vous avez confiés au Pilote automatique/.test(artAssistant))
  T('Pilote : drapeau levé, la réponse nomme l’exception, le délai et les garde-fous', !F.FLAGS.piloteAutomatique || (/Pilote automatique/.test(A.REPONSE_ASSISTANT.titre) && tout.includes(`${delai} minutes`) && /prix ne vient pas de vos tarifs/.test(tout) && /encaissement/.test(tout) && tout.includes(`${plafond} envois`)))
}

console.log('\n── 7. L’essai gratuit sans carte')
const essais = A.ESSAIS_AIDE()
T('durées 14 / 21 lues dans ESSAI_JOURS (deux offres)', essais.map((e) => e.jours).join() === [P.ESSAI_JOURS.studio, P.ESSAI_JOURS.signature].join())
T('crédits d’essai = prorata arrondi, plafonné à ESSAI_CREDITS_PLAFOND', essais.every((e) => e.credits === Math.min(P.ESSAI_CREDITS_PLAFOND, Math.floor((P.PLANS[e.offre].creditsMois * P.ESSAI_JOURS[e.offre]) / 30))) && A.PLAFOND_CREDITS_ESSAI === P.ESSAI_CREDITS_PLAFOND)
const tab = lire('app/aide/TableauOffres.tsx')
T('le tableau lit les essais et le plafond dans le code (aucun chiffre retapé)', /ESSAIS_AIDE\(\)/.test(tab) && /PLAFOND_CREDITS_ESSAI/.test(tab) && !/\b(7|14|21|150) (jours|crédits)\b/.test(sansCommentaires(tab)))

console.log('\n── 8. Les fichiers')
const FICHIERS = ['lib/aideAutomatique.ts', 'app/aide/Automatique.tsx', 'app/aide/TableauOffres.tsx', 'app/aide/PastilleOffre.tsx', 'app/aide/page.tsx', 'app/AidePanneau.tsx', 'app/aide/VideoAide.tsx', 'lib/aide.ts', 'scripts/aide-automatique-qa.mjs']
for (const f of FICHIERS) {
  const s = lire(f)
  T(`${f} : aucun octet de contrôle`, !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))
}
const page = lire('app/aide/page.tsx')
T('la page /aide montre « Ce qui est automatique » et « Qui a quoi » et les cherche', /<Automatique \/>/.test(page) && /<TableauOffres \/>/.test(page) && /autoTrouvees/.test(page))
T('chaque article du centre d’aide affiche sa pastille', /<PastilleOffre offre=\{offreAide\(article\.id\)\}/.test(page))


const SUJETS_NEUFS_IDS = ['gestion', 'assistants', 'mes-outils', 'entreprise']
// ── 9. Ce qui a changé le 03/11 (tâche 036-037), et rien de plus ──────────────────────────────────────────────────────────
console.log('\n── 9. Le 03/11 : prix, Entreprise, outil de gestion, « Mes outils », « Vos assistants »')
const art = (liste, id) => liste.find((a) => a.id === id)
const texteArticle = (a) => (a ? [a.titre, a.aQuoiCaSert, ...a.commentOnSenSert, a.pourVosClients, a.credits].join(' ') : '')
const SOURCES_AIDE = { aide: lire('lib/aide.ts'), auto: lire('lib/aideAutomatique.ts'), tableau: lire('app/aide/TableauOffres.tsx'), page: lire('app/aide/page.tsx'), automatique: lire('app/aide/Automatique.tsx') }

// Effaceur de commentaires ligne à ligne : `sansCommentaires` (plus haut) avale du code dès qu'un chemin « app/** » traîne dans un commentaire
// (son /* … */ court jusqu'au prochain */) ; ici, seuls un commentaire de ligne et un bloc qui OUVRE une ligne sont retirés.
const sansCommentairesLignes = (src) => src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/(^|[ \t])\/\/.*$/gm, '$1')
// 9a. Les prix : lus dans PLANS, jamais écrits en dur. Un montant mensuel en chiffres dans une source de l'aide (hors commentaires) est une faute.
const prixEnDur = (sources) => Object.entries(sources).filter(([, src]) => {
  const s = sansCommentairesLignes(src)
  return /\b\d+(?:[,.]\d+)?\s*(?:€|euros?)\s*(?:HT\s*|TTC\s*)?(?:par mois|\/\s*mois|mensuels?)/i.test(s) ||
    /(?:Studio|Signature|Entreprise)[^\n.;]{0,40}?(?<![}\w])\d+(?:[,.]\d+)?\s*(?:€|euros?)/.test(s)
}).map(([nom]) => nom)
T('l’effaceur de commentaires garde le code (la phrase des prix de lib/aide.ts y reste)', sansCommentairesLignes(SOURCES_AIDE.aide).includes('(${PLANS.studio.prixMois} € par mois)') && sansCommentairesLignes(SOURCES_AIDE.tableau).includes('{prixParMois(o)}'))
T('aucun prix d’offre écrit en dur dans l’aide (lib/aide.ts, lib/aideAutomatique.ts, app/aide/*)', prixEnDur(SOURCES_AIDE).length === 0, prixEnDur(SOURCES_AIDE).join(', '))
T('(mutation) « 30 € par mois » écrit en dur dans l’article des offres est vu', prixEnDur({ ...SOURCES_AIDE, aide: SOURCES_AIDE.aide.replace('${PLANS.studio.prixMois} € par mois', `${P.PLANS.studio.prixMois} € par mois`) }).includes('aide'))
T('(mutation) un prix Signature écrit en dur dans le tableau est vu', prixEnDur({ ...SOURCES_AIDE, tableau: SOURCES_AIDE.tableau.replace('{prixParMois(o)}', `Signature ${P.PLANS.signature.prixMois} €`) }).includes('tableau'))
const offresArt = art(AIDE.ARTICLES, 'offres')
const ditLesPrix = (t) => t.includes(`${P.PLANS.studio.label} (${P.PLANS.studio.prixMois} € par mois)`) && t.includes(`${P.PLANS.signature.label} (${P.PLANS.signature.prixMois} € par mois)`)
T(`l’article des offres dit les prix de lib/plans.ts (${P.PLANS.studio.label} ${P.PLANS.studio.prixMois} €, ${P.PLANS.signature.label} ${P.PLANS.signature.prixMois} €)`, ditLesPrix(texteArticle(offresArt)))
T('(mutation) un ancien prix (59 €) dans le texte rendu est vu', !ditLesPrix(texteArticle(offresArt).replace(`(${P.PLANS.studio.prixMois} € par mois)`, '(59 € par mois)')))
T('« Qui a quoi » a une ligne « Prix par mois » calculée par prixParMois (lu dans PLANS)', /data-ligne="prix"/.test(SOURCES_AIDE.tableau) && /\{prixParMois\(o\)\}/.test(SOURCES_AIDE.tableau) &&
  /Prix par mois/.test(SOURCES_AIDE.tableau) && A.OFFRES_AIDE.every((o) => A.prixParMois(o) === `${P.PLANS[o].prixMois} €`))
const pastilleEntreprise = (offreAide) => offreAide('entreprise') === 'sur_devis'
T('l’article Entreprise porte la pastille « Sur devis », jamais « Gratuit »', pastilleEntreprise(A.offreAide) && /offre === 'sur_devis'/.test(lire('app/aide/PastilleOffre.tsx')) && />Sur devis</.test(lire('app/aide/PastilleOffre.tsx')))
T('(mutation) une pastille Entreprise rendue « gratuit » est vue', !pastilleEntreprise((id) => (id === 'entreprise' ? 'gratuit' : A.offreAide(id))))

// 9b. L'offre Entreprise : sur devis, aucun montant, aucun chiffre de gain, aucun témoignage.
const fauteVente = (t) => {
  const f = []
  if (/\d\s*(?:€|euros?)/i.test(t)) f.push('montant')
  if (/\d+\s*%|\bx\s?\d\b|\d+\s*fois plus|(?:gagn|économis)\p{L}*\s+(?:jusqu’à\s+)?\d/iu.test(t)) f.push('chiffre de gain')
  if (/témoign|«[^»]{3,}»\s*[—–-]\s*\p{Lu}\p{L}+,/iu.test(t)) f.push('témoignage')
  return f
}
const entArt = art(AIDE.ARTICLES, 'entreprise')
const tEnt = texteArticle(entArt)
T(`article « ${P.PLANS.entreprise.label} » : présent, sur devis, sans prix public`, !!entArt && P.PLANS.entreprise.surDevis === true && /sur devis/.test(tEnt) && /pas de prix public/.test(tEnt) && tEnt.includes(P.PLANS.entreprise.label))
T('article Entreprise : aucun montant, aucun chiffre de gain, aucun témoignage', fauteVente(tEnt).length === 0, fauteVente(tEnt).join(', '))
T('(mutation) « 30 % de temps gagné » est vu', fauteVente(tEnt + ' 30 % de temps gagné.').includes('chiffre de gain'))
T('(mutation) un témoignage « … » — Marc, plombier, est vu', fauteVente(tEnt + ' « Un vrai gain » — Marc, plombier.').includes('témoignage'))
T('(mutation) un prix Entreprise (« 199 € ») est vu', fauteVente(tEnt + ' À partir de 199 €.').includes('montant'))
T('sous « Qui a quoi » : l’offre Entreprise, sur devis, vers /entreprise (lue dans PLANS.entreprise)', A.ENTREPRISE_AIDE.surDevis === true && A.ENTREPRISE_AIDE.nom === P.PLANS.entreprise.label &&
  /ENTREPRISE_AIDE\.surDevis/.test(SOURCES_AIDE.tableau) && /href=\{ENTREPRISE_AIDE\.page\}/.test(SOURCES_AIDE.tableau) && fs.existsSync(path.join(RACINE, 'app/entreprise/page.tsx')))
T('les gestes de l’article Entreprise existent sur la carte et la page (« Parler à l’équipe », « Tout savoir sur l’offre Entreprise », « Parlons de votre entreprise »)',
  /Parler à l’équipe/.test(lire('app/OffreEntreprise.tsx')) && /Tout savoir sur l’offre Entreprise/.test(lire('app/OffreEntreprise.tsx')) && /Parlons de votre <span>entreprise/.test(lire('app/contact/page.tsx')))

// 9c. L'outil de gestion : les deux portes et chaque écran nommé dans l'article existent dans app/crm/Gestion.tsx ; devis et factures sont sortis du menu.
const GESTION = lire('app/crm/Gestion.tsx'), SHELL = lire('app/AppShell.tsx')
const libellesGestion = [...GESTION.matchAll(/\{ cle: '[a-z0-9]+', label: '([^']+)'/g)].map((m) => m[1])
const ecransManquants = (t, libelles) => libelles.filter((l) => !t.includes(l))
const gesArt = art(AIDE.ARTICLES, 'gestion')
T(`l’article « Outil de gestion » nomme les ${libellesGestion.length} portes et écrans de app/crm/Gestion.tsx`, libellesGestion.length >= 12 && ecransManquants(texteArticle(gesArt), libellesGestion).length === 0, ecransManquants(texteArticle(gesArt), libellesGestion).join(', '))
T('(mutation) un article qui oublie « Factures » est vu', ecransManquants(texteArticle(gesArt).replaceAll('Factures', 'Pièces comptables'), libellesGestion).includes('Factures'))
const menuSansPieces = (shell) => !/href: '\/(devis|factures|tarifs|inventaire)'/.test(shell) && /label: 'Outil de gestion', href: '\/crm'/.test(shell)
T('le menu n’a plus Devis, Factures, Mes tarifs, Inventaire, et a « Outil de gestion » (l’article le dit)', menuSansPieces(SHELL) && /ne sont plus dans le menu/.test(gesArt?.aQuoiCaSert ?? ''))
T('(mutation) « Devis » remis au menu est vu', !menuSansPieces(SHELL.replace("{ key: 'dashboard',", "{ key: 'devis', label: 'Devis', href: '/devis' },\n      { key: 'dashboard',")))
T('/crm ouvre d’abord l’outil de gestion : le panneau « ? » de /crm montre son article', AIDE.ARTICLES.find((a) => a.page === '/crm')?.id === 'gestion')
const sansCrmAtelier = (textes) => !textes.some((t) => /CRM atelier/.test(t))
const textesRendus = [...AIDE.ARTICLES.map(texteArticle), ...A.LIGNES_OFFRES.map((l) => l.label), ...[...A.AUTOMATIQUE_SANS_ASSISTANT, ...A.AUTOMATIQUE_AVEC_ASSISTANT].map((e) => `${e.titre} ${e.texte}`),
  ...[...sansCommentairesLignes(SOURCES_AIDE.page).matchAll(/titre: '([^']+)'/g)].map((m) => m[1])]
T('plus aucun « CRM atelier » dans l’aide : l’écran s’appelle « Outil de gestion », la maquette « CRM 3D »', sansCrmAtelier(textesRendus) && /titre: 'CRM 3D/.test(SOURCES_AIDE.aide))
// Les « Réglages liés » se lisent avec les libellés de app/AidePanneau.tsx : un sujet neuf ne renvoie vers aucun libellé périmé.
const LIBELLES_PANNEAU = Object.fromEntries([...lire('app/AidePanneau.tsx').matchAll(/^\s*'([^']+)': '([^']+)',/gm)].map((m) => [m[1], m[2]]))
const liensPerimes = (articles) => articles.filter((a) => SUJETS_NEUFS_IDS.includes(a.id)).flatMap((a) => a.reglagesLies.filter((r) => /CRM atelier/.test(LIBELLES_PANNEAU[r] ?? '')).map((r) => `${a.id} → ${r}`))
T('les « Réglages liés » des sujets neufs ne montrent aucun libellé périmé (« CRM atelier »)', Object.keys(LIBELLES_PANNEAU).length > 10 && liensPerimes(AIDE.TOUS_ARTICLES).length === 0, liensPerimes(AIDE.TOUS_ARTICLES).join(', '))
T('(mutation) « Vos assistants » qui renvoie vers /crm est vu', liensPerimes(AIDE.TOUS_ARTICLES.map((a) => (a.id === 'assistants' ? { ...a, reglagesLies: ['/crm'] } : a))).length === 1)
T('(mutation) un « CRM atelier » resté dans un titre est vu', !sansCrmAtelier([...textesRendus, 'CRM atelier : votre entreprise en maquette vivante']))

// 9d. « Mes outils » : seuls les outils dont le circuit existe (OUTILS de app/crm/outils/vue.tsx, tous Google) sont annoncés.
const VUE = lire('app/crm/outils/vue.tsx')
const OUTILS_REELS = [...(VUE.match(/export const OUTILS[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? '').matchAll(/nom: '([^']+)'/g)].map((m) => m[1])
const AUTRES_OUTILS = ['Outlook', 'Slack', 'Teams', 'WhatsApp', 'Microsoft', 'Dropbox', 'OneDrive', 'Notion', 'iCloud', 'Yahoo', 'Trello', 'HubSpot', 'Salesforce', 'Pipedrive', 'Calendly', 'Instagram', 'Facebook', 'Messenger', 'Zapier', 'Qonto', 'Pennylane']
const outilsAbsents = (textes, reels) => {
  const f = new Set()
  for (const t of textes) {
    for (const o of AUTRES_OUTILS) if (new RegExp(`\\b${o}\\b`).test(t)) f.add(o)
    for (const m of t.matchAll(/«\s*(?:Re)?[Cc]onnecter ([^»]+?)\s*»/g)) if (!reels.includes(m[1].trim())) f.add(m[1].trim())
  }
  return [...f]
}
const SUJETS_NEUFS = ['gestion', 'assistants', 'mes-outils', 'entreprise']
const textesNeufs = [...SUJETS_NEUFS.map((id) => texteArticle(art(AIDE.TOUS_ARTICLES, id))), ...A.LIGNES_OFFRES.filter((l) => ['mes-outils', 'assistants'].includes(l.id)).map((l) => l.label),
  ...A.AUTOMATIQUE_SANS_ASSISTANT.filter((e) => e.id === 'assistants-essai').map((e) => `${e.titre} ${e.texte}`)]
T(`les outils à brancher lus dans app/crm/outils/vue.tsx : ${OUTILS_REELS.join(', ')} (tous Google)`, OUTILS_REELS.length >= 1 && OUTILS_REELS.every((o) => /^G/.test(o) && /Gmail|Google/.test(o)))
T('aucun outil absent n’est annoncé dans les sujets du 03/11 (Google seulement)', outilsAbsents(textesNeufs, OUTILS_REELS).length === 0, outilsAbsents(textesNeufs, OUTILS_REELS).join(', '))
T('(mutation) « Connecter Outlook » annoncé est vu', outilsAbsents([...textesNeufs, 'Cliquez « Connecter Outlook » pour brancher votre boîte.'], OUTILS_REELS).includes('Outlook'))
T('(mutation) « Slack se branche aussi » est vu', outilsAbsents([...textesNeufs, 'Slack se branche aussi.'], OUTILS_REELS).includes('Slack'))
const outArt = art(AIDE.ARTICLES, 'mes-outils')
const tOut = texteArticle(outArt)
T('l’article « Mes outils » nomme chaque outil réel, son bouton « Connecter … » et le retrait', !!outArt && OUTILS_REELS.every((o) => tOut.includes(`« Connecter ${o} »`)) && /« Retirer »/.test(tOut) && /« Retirer l’accès »/.test(tOut) && /rien n’est supprimé chez Google/.test(tOut))
T('les gestes cités existent dans la vue (« Connecter ${o.nom} », « Retirer », « Retirer l’accès », « Connecté », « Reconnecter »)', /`Connecter \$\{o\.nom\}`/.test(VUE) && /\}>Retirer<\/button>/.test(VUE) && /'Retirer l’accès'/.test(VUE) && /texte: 'Connecté'/.test(VUE) && /`Reconnecter \$\{o\.nom\}`/.test(VUE) && /Rien n’est supprimé chez Google/.test(VUE))
T('« Mes outils » commence à l’offre où l’écran l’ouvre (canaux.email : Studio)', A.offreAide('mes-outils') === 'studio' && /peut\(fondateur \? 'business' : plan, o\.capacite\)/.test(GESTION))

// 9e. « Vos assistants » : un par département, la boîte « À valider » en mode essai ; aucune promesse d'envoi seul (le palier réel n'est pas servi).
const promesseEnvoiSeul = (t) => /\b(?:envoi(?:e|ent)?|répond(?:ent)?|part(?:ent)?|écri(?:t|vent))\b[^.;:]{0,30}?(?:\bseule?s?\b|tout seuls?|à votre place|sans vous|automatiquement|d’eux-mêmes)|envoyée?s?\s+(?:seule?s?|automatiquement)\s+par\s+(?:vos\s+)?assistants|assistants?\s+(?:envoie|envoient|répond|répondent)\b/iu.test(t)
const textesAssistants = [texteArticle(art(AIDE.TOUS_ARTICLES, 'assistants')), ...A.LIGNES_OFFRES.filter((l) => l.id === 'assistants').map((l) => l.label), ...A.AUTOMATIQUE_SANS_ASSISTANT.filter((e) => e.id === 'assistants-essai').map((e) => `${e.titre} ${e.texte}`)]
T('aucun texte des assistants ne promet un envoi seul', textesAssistants.length === 3 && !textesAssistants.some(promesseEnvoiSeul) && !textesNeufs.some(promesseEnvoiSeul))
T('(mutation) « vos assistants répondent seuls à vos clients » est vu', promesseEnvoiSeul('Vos assistants répondent seuls à vos clients.'))
T('(mutation) « l’assistant envoie la relance à votre place » est vu', promesseEnvoiSeul('L’assistant de l’Accueil envoie la relance à votre place.'))
T('chaque texte des assistants dit « rien n’est envoyé »', textesAssistants.every((t) => /[Rr]ien n’est envoyé|rien n’est envoyé/.test(t) || /Rien ne leur est envoyé/.test(t)))
const BOITE = lire('app/crm/BoiteAgents.tsx'), ROUTE_AGENTS = lire('app/api/assistant/agents/route.ts')
T('le code est toujours en mode essai : la boîte le dit et la route n’envoie rien (sinon, l’aide est à revoir)', /Mode essai/.test(BOITE) && /Rien n’est envoyé à vos clients, répondez comme d’habitude/.test(BOITE) && /« Valider » ou « Refuser » nous aide à les régler/.test(BOITE) && /CETTE ROUTE N'ENVOIE RIEN/.test(ROUTE_AGENTS))
const tAss = texteArticle(art(AIDE.ARTICLES, 'assistants'))
const CARTES = await charger('lib/agents/n8n/cartes.ts')
const nomsDep = CARTES.DEPARTEMENTS.map((d) => CARTES.NOMS_DEPARTEMENTS[d])
T(`l’article nomme les ${nomsDep.length} départements de lib/agents/n8n/cartes.ts, la boîte « À valider », « Valider » et « Refuser »`, nomsDep.every((n) => tAss.includes(n)) && /« À valider »/.test(tAss) && /« Valider »/.test(tAss) && /« Refuser »/.test(tAss) && /mode essai/.test(tAss) && /comme d’habitude/.test(tAss))
T('le message cité après « Valider » est celui de la boîte (« Carte validée. Rien n’est parti »)', tAss.includes('« Carte validée. Rien n’est parti »') && BOITE.includes('Carte validée. Rien n’est parti : le mode réel n’est pas ouvert.'))
T('« Vos assistants » commence à l’offre de la garde de la boîte (assistant : Studio)', A.offreAide('assistants') === 'studio' && /gardeAssistant\(req\)/.test(ROUTE_AGENTS))

// 9f. Chaque sujet neuf sous le drapeau qui montre son écran — le même, lu dans le code de l'écran ; un sujet sans drapeau doit le justifier.
const SUJETS_DRAPEAUX = [
  { id: 'gestion', drapeau: 'crm', fichier: 'app/AppShell.tsx', garde: "enEssai('crm') ? [{ key: 'crm'" },
  { id: 'assistants', drapeau: 'boiteAgents', fichier: 'app/crm/BoiteAgents.tsx', garde: "if (!actif('boiteAgents')) return null" },
  { id: 'mes-outils', drapeau: 'connexions', fichier: 'app/crm/Gestion.tsx', garde: "actif('connexions')" },
  { id: 'entreprise', drapeau: undefined, fichier: 'app/OffreEntreprise.tsx', garde: null }, // montrée à tous : aucune garde dans le code
]
const sujetsSansDrapeau = (articles) => SUJETS_DRAPEAUX.filter((s) => art(articles, s.id)?.drapeau !== s.drapeau).map((s) => s.id)
T('chaque sujet neuf porte le drapeau de son écran (gestion → crm, assistants → boiteAgents, mes-outils → connexions ; Entreprise : aucun)', sujetsSansDrapeau(AIDE.TOUS_ARTICLES).length === 0, sujetsSansDrapeau(AIDE.TOUS_ARTICLES).join(', '))
T('(mutation) « Mes outils » sans drapeau est vu', sujetsSansDrapeau(AIDE.TOUS_ARTICLES.map((a) => (a.id === 'mes-outils' ? { ...a, drapeau: undefined } : a))).includes('mes-outils'))
T('les écrans sont bien gardés par ces drapeaux (et l’Entreprise par aucun)', SUJETS_DRAPEAUX.every((s) => (s.garde ? lire(s.fichier).includes(s.garde) : !/actif\(|enEssai\(/.test(sansCommentairesLignes(lire(s.fichier))))))
T('les drapeaux des articles existent dans lib/flags.ts', AIDE.TOUS_ARTICLES.every((a) => !a.drapeau || a.drapeau in F.FLAGS))
T('ARTICLES = les articles dont le drapeau est levé (articlesVisibles)', AIDE.ARTICLES.length === AIDE.articlesVisibles(AIDE.TOUS_ARTICLES).length && AIDE.ARTICLES.length === AIDE.TOUS_ARTICLES.filter((a) => !a.drapeau || F.FLAGS[a.drapeau]).length)
T('(mutation) drapeau boiteAgents baissé : « Vos assistants » disparaît de l’aide', !AIDE.articlesVisibles(AIDE.TOUS_ARTICLES, { ...F.FLAGS, boiteAgents: false }).some((a) => a.id === 'assistants') && AIDE.articlesVisibles(AIDE.TOUS_ARTICLES, { ...F.FLAGS, boiteAgents: false }).some((a) => a.id === 'gestion'))
T('(mutation) drapeau connexions baissé : « Mes outils » disparaît, de l’aide comme du tableau', !AIDE.articlesVisibles(AIDE.TOUS_ARTICLES, { ...F.FLAGS, connexions: false }).some((a) => a.id === 'mes-outils') && A.LIGNES_OFFRES.find((l) => l.id === 'mes-outils')?.flag === 'connexions')
T('l’entrée « automatique » des assistants et la ligne du tableau sont sous boiteAgents', A.AUTOMATIQUE_SANS_ASSISTANT.find((e) => e.id === 'assistants-essai')?.flag === 'boiteAgents' && A.LIGNES_OFFRES.find((l) => l.id === 'assistants')?.flag === 'boiteAgents')
T('chaque sujet neuf a son groupe dans /aide (Outil de gestion : /crm et /crm/outils)', /\{ id: 'crm', titre: 'Outil de gestion', pages: \['\/crm', PAGE_MES_OUTILS\] \}/.test(SOURCES_AIDE.page) && AIDE.PAGE_MES_OUTILS === '/crm/outils' && !/\/crm\/outils/.test(SOURCES_AIDE.page) && AIDE.ARTICLES.filter((a) => SUJETS_NEUFS.includes(a.id)).every((a) => ['/crm', '/crm/outils', '/abonnement'].includes(a.page)))

// ── 10. Les captures 390 et 1440 du centre d'aide, rendu par ses vrais composants ─────────────────────────────────────────
console.log('\n── 10. Les captures (centre d’aide rendu hors ligne, données du code, aucune requête sortante)')
{
  const PREUVE = '.orchestre/preuves/036-037'
  const exiger = createRequire(path.join(RACINE, 'package.json'))
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-qa-'))
  try {
    const ts = exiger('typescript')
    const { renderToStaticMarkup } = exiger('react-dom/server')
    const React = exiger('react')
    const urlDe = (m) => pathToFileURL(exiger.resolve(m)).href
    // Les composants de l'aide, transpilés tels quels ; leurs imports d'app pointent vers leurs copies transpilées, ceux de lib/ vers les vrais modules.
    const COMPOSANTS = { PastilleOffre: 'app/aide/PastilleOffre.tsx', AidePanneau: 'app/AidePanneau.tsx', TableauOffres: 'app/aide/TableauOffres.tsx', Automatique: 'app/aide/Automatique.tsx' }
    for (const [nom, f] of Object.entries(COMPOSANTS)) {
      let js = ts.transpileModule(lire(f), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      js = js.replace(/(['"])react\/jsx-runtime\1/g, `'${urlDe('react/jsx-runtime')}'`).replace(/from (['"])react\1/g, `from '${urlDe('react')}'`)
        .replace(/(['"])(?:@\/app\/aide\/|\.\/)(PastilleOffre)\1/g, "'./$2.mjs'").replace(/(['"])@\/app\/AidePanneau\1/g, "'./AidePanneau.mjs'")
        .replace(/(['"])@\/lib\/([\w/.-]+)\1/g, (_, q, m) => `'${pathToFileURL(path.join(RACINE, 'lib', m + (fs.existsSync(path.join(RACINE, 'lib', m + '.ts')) ? '.ts' : '.tsx'))).href}'`)
      fs.writeFileSync(path.join(TMP, `${nom}.mjs`), js)
    }
    const imp = (n) => import(pathToFileURL(path.join(TMP, `${n}.mjs`)).href)
    const [{ default: TableauOffres }, { default: Automatique }, { ArticleCorps }, { default: PastilleOffre }] = await Promise.all(['TableauOffres', 'Automatique', 'AidePanneau', 'PastilleOffre'].map(imp))
    const h = React.createElement
    const LIB = { '/crm': 'Outil de gestion', '/crm/outils': 'Outil de gestion · Mes outils', '/abonnement': 'Abonnement' }
    const detail = (a, ouvert) => h('details', { className: 'aide-art', id: a.id, open: ouvert, key: a.id },
      h('summary', null, h('span', null, a.titre), h(PastilleOffre, { offre: A.offreAide(a.id) }), h('span', { className: 'pg' }, LIB[a.page] ?? a.page)),
      h('div', { className: 'aide-art-b' }, h(ArticleCorps, { article: a })))
    const neufs = SUJETS_NEUFS.map((id) => art(AIDE.ARTICLES, id)).filter(Boolean)
    const corps = renderToStaticMarkup(h('div', null,
      h('h1', { style: { margin: '0 0 1rem' } }, 'Centre d’aide · ce qui a changé le 03/11'),
      h('section', { className: 'aide-grp', id: 'grp-crm' }, h('h2', null, 'Outil de gestion'), ...neufs.filter((a) => a.id !== 'entreprise').map((a) => detail(a, true))),
      h(TableauOffres), h('section', { className: 'aide-grp' }, h('h2', null, 'Abonnement'), detail(entArt, true)), h(Automatique)))
    T('le rendu contient les prix lus dans PLANS, la ligne Entreprise et les quatre sujets', corps.includes(`>${P.PLANS.studio.prixMois} €<`) && corps.includes(`>${P.PLANS.signature.prixMois} €<`) && /data-offre="sur_devis"/.test(corps) && /data-offre-entreprise/.test(corps) && SUJETS_NEUFS.every((id) => corps.includes(`id="${id}"`)) && /id="auto-assistants-essai"/.test(corps))
    const css = ['app/base.css', 'app/globals.css'].map(lire).join('\n')
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
      body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
      .banc{max-width:1100px;margin:0 auto;padding:32px 40px} @media (max-width:720px){.banc{padding:20px 16px}}</style></head><body><main class="banc">${corps}</main></body></html>`
    const { chromium } = exiger('playwright')
    const navigateur = await chromium.launch({ args: ['--no-sandbox'] })
    try {
      fs.mkdirSync(path.join(RACINE, PREUVE), { recursive: true })
      for (const [nom, l, hauteur] of [['capture-1440.png', 1440, 900], ['capture-390.png', 390, 844]]) {
        const ctx = await navigateur.newContext({ viewport: { width: l, height: hauteur }, deviceScaleFactor: 1 })
        const pg = await ctx.newPage()
        let sortantes = 0
        await pg.route('**/*', (r) => { sortantes++; return r.abort() })
        await pg.setContent(html, { waitUntil: 'load' })
        const debord = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        const cible = path.join(RACINE, PREUVE, nom)
        await pg.screenshot({ path: cible, fullPage: true })
        const png = fs.readFileSync(cible)
        const largeur = png.readUInt32BE(16)
        T(`${nom} : PNG de ${largeur} px, ${png.length} octets, sans débordement horizontal (${debord}), ${sortantes} requête sortante refusée`, png.subarray(1, 4).toString() === 'PNG' && largeur === l && png.length > 20000 && debord <= 0)
        await ctx.close()
      }
    } finally { await navigateur.close() }
  } catch (e) {
    T('les captures sont prises', false, String(e?.stack ?? e).slice(0, 300))
  } finally { fs.rmSync(TMP, { recursive: true, force: true }) }
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} contrôles passés, ${ko} échecs`)
process.exit(ko ? 1 : 0)
