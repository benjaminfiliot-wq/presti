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
//  8. aucun octet de contrôle dans les fichiers de la section.
// Il s'attaque aussi lui-même : chaque contrôle de texte est rejoué sur une copie fautive et DOIT rougir.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/aide-automatique-qa.mjs   (aucun réseau, aucun compte)
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
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
  if (o === null) continue
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

console.log(`\n${ko ? '❌' : '✅'} ${ok} contrôles passés, ${ko} échecs`)
process.exit(ko ? 1 : 0)
