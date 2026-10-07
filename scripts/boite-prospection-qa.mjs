#!/usr/bin/env node
// scripts/boite-prospection-qa.mjs — juge de la boîte d'envoi de la prospection (06/10/2026, revu le 07/10).
//
// POURQUOI : les variables PROSPECTION_GMAIL_* n'ont jamais été posées sur Vercel. Le 06/10, un repli LARGE sur la boîte de
// l'entreprise (IMAP_USER, le Gmail personnel de Benj) a fait relever toute la boîte. Décision de Benj du 07/10 : « on fait par
// mon mail mais on ne touche pas à mes mails perso » → deux modes seulement : boîte dédiée, ou boîte de l'entreprise en
// « fil seul » (PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL=oui : envoi avec Reply-To <local>+presti@<domaine>, relève des SEULS
// messages adressés à cette adresse, cherchés côté serveur). Ce juge prouve les deux modes, l'absence de tout repli large, la
// relève filtrée (aucun message hors du fil n'est ouvert), le Reply-To, la barrière du répondeur et les règles de la base.
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/boite-prospection-qa.mjs   (code 0 : PASS)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.join(ICI, '..')
const { boiteProspection, adresseReponseProspection, adresseFil } = await import('../lib/agents/acquisition/boiteProspection.ts')
const { releverGmail, creerPorteurGmail } = await import('../lib/agents/acquisition/porteurs/gmail.ts')
const rouges = []
let nbCriteres = 0
const ok = (nom, cond, detail = '') => { nbCriteres++; console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }

const gmailEntreprise = () => ({ hote: 'imap.gmail.com', port: 993, user: 'atelier.presti@gmail.com', pass: 'motdepasseapp', devine: true, passNettoye: false })
const autreEntreprise = () => ({ hote: 'imap.ionos.fr', port: 993, user: 'contact@exemple.fr', pass: 'x', devine: true, passNettoye: false })
const aucune = () => null

// 07/10/2026 — INCIDENT puis DÉCISION DE BENJ. Le repli LARGE du 06/10 (toute la boîte IMAP_USER, le Gmail personnel de Benj)
// est supprimé : l'ancienne variable PROSPECTION_AUTORISER_BOITE_ENTREPRISE n'a plus aucun effet. À sa place, le mode « fil
// seul » (PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL=oui) : envoi depuis la boîte, Reply-To et relève sur l'adresse « plus » seule.
// BP-2, BP-5 et BP-6 exigeaient le repli large sous la variable d'autorisation : ils exigent maintenant le mode « fil seul »
// (mêmes gardes : Gmail seulement, boîte dédiée d'abord), et BP-17 prouve que l'ancienne variable ne rouvre plus rien.
const FIL = { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: 'oui' }
const ORDINAIRE = gmailEntreprise().user
const PLUS = adresseFil(ORDINAIRE)
const b1 = boiteProspection({ PROSPECTION_GMAIL_USER: 'dedie@gmail.com', PROSPECTION_GMAIL_PASS: 'p1', ACQ_ADRESSE_REPONSE: 'rep@exemple.fr' }, gmailEntreprise)
ok('BP-1 les variables propres à la prospection passent en premier', b1?.user === 'dedie@gmail.com' && b1.pass === 'p1' && b1.adresse === 'rep@exemple.fr' && b1.expediteur === 'rep@exemple.fr' && b1.repondreA === null && b1.source === 'prospection', JSON.stringify(b1 && { ...b1, pass: '…' }))
const b1bis = boiteProspection({ ...FIL, PROSPECTION_GMAIL_USER: 'dedie@gmail.com', PROSPECTION_GMAIL_PASS: 'p1' }, gmailEntreprise)
const b2 = boiteProspection({ ...FIL }, gmailEntreprise)
ok("BP-2 mode « fil seul » : identifiants de la boîte de l'entreprise, envoi « De » la boîte, Reply-To ET adresse relevée = <local>+presti@<domaine> dérivée ; la boîte dédiée passe toujours devant",
  PLUS === ORDINAIRE.replace('@', '+presti@') && b2?.user === ORDINAIRE && b2.pass === 'motdepasseapp' && b2.expediteur === ORDINAIRE && b2.adresse === PLUS && b2.repondreA === PLUS
  && b2.source === 'entreprise_fil_seul' && b1bis?.source === 'prospection', JSON.stringify(b2 && { ...b2, user: '…', pass: '…', adresse: '…', expediteur: '…', repondreA: '…' }))
ok("BP-3 une boîte d'entreprise qui n'est pas Gmail n'est jamais prise, même en « fil seul » (le porteur envoie et relève par Gmail)", boiteProspection({}, autreEntreprise) === null && boiteProspection({ ...FIL }, autreEntreprise) === null)
ok('BP-4 aucune boîte : null (le facteur reste « en_attente_gmail », rien ne part)', boiteProspection({}, aucune) === null && boiteProspection({ ...FIL }, aucune) === null)
ok('BP-5 un utilisateur dédié sans mot de passe : null par défaut, le « fil seul » seulement si sa variable est posée',
  boiteProspection({ PROSPECTION_GMAIL_USER: 'dedie@gmail.com' }, gmailEntreprise) === null && boiteProspection({ ...FIL, PROSPECTION_GMAIL_USER: 'dedie@gmail.com' }, gmailEntreprise)?.source === 'entreprise_fil_seul')
ok("BP-6 adresse de réponse : boîte dédiée → celle posée ; « fil seul » → l'adresse « plus », une ACQ_ADRESSE_REPONSE différente coupe tout (elle ferait répondre ou relever hors du fil) ; sinon ''",
  adresseReponseProspection({ ACQ_ADRESSE_REPONSE: 'rep@exemple.fr' }, gmailEntreprise) === 'rep@exemple.fr' && adresseReponseProspection({ ...FIL }, gmailEntreprise) === PLUS
  && adresseReponseProspection({ ...FIL, ACQ_ADRESSE_REPONSE: PLUS }, gmailEntreprise) === PLUS
  && boiteProspection({ ...FIL, ACQ_ADRESSE_REPONSE: ORDINAIRE }, gmailEntreprise) === null && adresseReponseProspection({ ...FIL, ACQ_ADRESSE_REPONSE: ORDINAIRE }, gmailEntreprise) === ''
  && adresseReponseProspection({}, gmailEntreprise) === '' && adresseReponseProspection({}, aucune) === '')

// BP-17..BP-19 : aucun repli large, au comportement (le vrai module).
let lectures = 0
const espion = () => { lectures++; return gmailEntreprise() }
const sansFil = [{}, { PROSPECTION_AUTORISER_BOITE_ENTREPRISE: 'oui' }, { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: '' }, { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: '1' },
  { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: 'true' }, { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: 'yes' }, { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: 'non' },
  { PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL: 'ouii' }, { IMAP_USER: 'perso@gmail.com', IMAP_PASS: 'x' }]
const toutesCombinaisons = [...sansFil, FIL, { ...FIL, PROSPECTION_AUTORISER_BOITE_ENTREPRISE: 'oui' }, { ...FIL, ACQ_ADRESSE_REPONSE: ORDINAIRE }]
ok("BP-17 aucun repli LARGE : sans boîte dédiée ni PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL=oui (exactement), aucune boîte ; l'ancienne PROSPECTION_AUTORISER_BOITE_ENTREPRISE=oui ne rouvre rien ; et dans AUCUNE combinaison l'adresse relevée ou de réponse n'est l'adresse ordinaire de la boîte",
  sansFil.every((env) => boiteProspection(env, gmailEntreprise) === null && adresseReponseProspection(env, gmailEntreprise) === '')
  && toutesCombinaisons.every((env) => { const b = boiteProspection(env, gmailEntreprise); return (!b || b.adresse !== ORDINAIRE) && adresseReponseProspection(env, gmailEntreprise) !== ORDINAIRE }))
lectures = 0
for (const env of sansFil) { boiteProspection(env, espion); adresseReponseProspection(env, espion) }
ok("BP-18 sans boîte dédiée ni « fil seul », la boîte de l'entreprise n'est même pas lue (aucun identifiant IMAP chargé, donc aucune relève possible)", lectures === 0, `${lectures} lecture(s)`)
lectures = 0
boiteProspection({ ...FIL, PROSPECTION_GMAIL_USER: 'dedie@gmail.com', PROSPECTION_GMAIL_PASS: 'p1' }, espion)
ok("BP-19 avec une boîte dédiée, la boîte de l'entreprise n'est jamais lue", lectures === 0, `${lectures} lecture(s)`)
ok("BP-26 l'adresse « plus » est dérivée, jamais écrite : étiquette existante remplacée, majuscules ramenées, adresse invalide → ''",
  adresseFil('Jean.Dupont+news@Gmail.com') === 'jean.dupont+presti@gmail.com' && adresseFil('a@gmail.com') === 'a+presti@gmail.com' && adresseFil('pas une adresse') === '' && adresseFil('') === '' && adresseFil('a"b@gmail.com') === '')

// BP-27 : la relève en « fil seul », au comportement (le vrai releverGmail sur une boîte factice honnête : le serveur filtre
// selon les critères qu'on lui donne ; une recherche sans critère rendrait TOUT, comme Gmail).
// DÉCISION (07/10) : un message personnel adressé à l'adresse ORDINAIRE n'est jamais lu, même s'il vient d'un prospect connu.
// Raison : le savoir exigerait d'ouvrir le message (ou au moins ses en-têtes), c'est-à-dire de toucher aux mails perso ; et un
// prospect qui répond à notre envoi répond au Reply-To, donc à l'adresse « plus » : le fil normal ne perd rien.
const BOITE_FACTICE = [
  { uid: 11, to: [PLUS], cc: [], de: 'artisan@prospect-connu.invalid', id: '<a@x.invalid>' },
  { uid: 12, to: [ORDINAIRE], cc: [], de: 'artisan@prospect-connu.invalid', id: '<b@x.invalid>' },
  { uid: 13, to: ['ami@perso.invalid'], cc: [PLUS], de: 'collegue@prospect-connu.invalid', id: '<c@x.invalid>' },
  { uid: 14, to: [ORDINAIRE], cc: ['autre@perso.invalid'], de: 'banque@perso.invalid', id: '<d@x.invalid>' },
  { uid: 15, to: [ORDINAIRE.replace('@', '+news@')], cc: [], de: 'lettre@perso.invalid', id: '<e@x.invalid>' },
]
const journalImap = { recherches: [], ouverts: [], lus: [] }
const correspond = (m, q) => {
  const champs = Object.entries(q.header ?? {}), gm = /^(to|cc):"([^"]+)"$/.exec(String(q.gmraw ?? ''))
  if (!champs.length && !q.gmraw) return true
  return champs.every(([c, v]) => (m[c] ?? []).some((x) => x.includes(String(v).toLowerCase()))) && (!q.gmraw || (!!gm && (m[gm[1]] ?? []).includes(gm[2])))
}
const imapFactice = {
  async mailboxOpen() { return { uidValidity: 7, uidNext: 100 } },
  async search(q) { journalImap.recherches.push(q); return BOITE_FACTICE.filter((m) => correspond(m, q)).map((m) => m.uid) },
  async fetchOne(uid) { journalImap.ouverts.push(uid); const m = BOITE_FACTICE.find((x) => x.uid === uid); return { envelope: { messageId: m.id, from: [{ address: m.de }], to: m.to.map((address) => ({ address })), cc: m.cc.map((address) => ({ address })), subject: 'Objet' }, headers: new Map(), bodyStructure: { type: 'text/plain', part: '1' } } },
  async download(uid) { journalImap.lus.push(uid); return { content: (async function* () { yield 'Texte' })() } },
  async logout() {},
}
const releve = await releverGmail({ imap: imapFactice, adresse: b2.adresse, curseur: 0, uidValidity: 7 })
const egal = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
ok("BP-27 relève « fil seul » : chaque recherche serveur porte l'en-tête ET X-GM-RAW sur l'adresse « plus » exacte ; seuls les messages adressés (À ou Cc) à cette adresse sont ouverts et lus — jamais un message personnel, même d'un prospect connu, ni une autre étiquette « plus »",
  !('erreur' in releve) && journalImap.recherches.length > 0
  && journalImap.recherches.every((q) => q.header && Object.values(q.header)[0] === PLUS && /^(to|cc):"/.test(String(q.gmraw)) && String(q.gmraw).endsWith(`"${PLUS}"`))
  && egal(journalImap.ouverts, [11, 13]) && egal(journalImap.lus, [11, 13]) && egal(releve.messages.map((m) => m.imap_uid), [11, 13]),
  JSON.stringify({ ouverts: journalImap.ouverts, lus: journalImap.lus, recherches: journalImap.recherches.length }))
const injection = await releverGmail({ imap: imapFactice, adresse: `x" OR to:"${ORDINAIRE}`, curseur: 0 })
ok('BP-28 une adresse relevée qui contient un guillemet ou un espace (injection dans X-GM-RAW) : aucune recherche, rien n\'est ouvert', 'erreur' in injection)

// BP-29 : l'envoi en « fil seul », au comportement (le vrai porteur, un transport factice).
let courrielEnvoye = null
const porteur = creerPorteurGmail({ user: b2.user, pass: b2.pass, adresse: b2.expediteur, repondreA: b2.repondreA, pauseGenerale: async () => ({ active: false }), transport: { async sendMail(o) { courrielEnvoye = o; return { messageId: '<essai@x.invalid>' } } } })
const envoi = await porteur.envoyer({ a: 'client@prospect-connu.invalid', objet: 'Bonjour', texte: 'Texte' })
ok("BP-29 envoi « fil seul » : « De » la boîte de l'entreprise, Reply-To = l'adresse « plus » (les réponses des prospects arrivent dans le fil relevé)",
  envoi.ok === true && !!courrielEnvoye && courrielEnvoye.from.includes(`<${ORDINAIRE}>`) && courrielEnvoye.replyTo === PLUS)

// BP-20 : le répondeur, au comportement : muet sur toute réponse venue d'un fil que nous n'avons pas ouvert.
const { filInitieParNous } = await import('../lib/agents/acquisition/repondeur.ts')
const FILS = [
  [{ envoi_id: null, conversation_id: null, prospect_id: null, notre_dernier_envoi_le: null }, false, 'courriel hors de tout fil (la boîte personnelle)'],
  [{ envoi_id: '', conversation_id: '', prospect_id: '', notre_dernier_envoi_le: '2026-10-01T10:00:00Z' }, false, 'champs vides (aucun rattachement réel)'],
  [{ envoi_id: 'e-1', conversation_id: null, prospect_id: null, notre_dernier_envoi_le: null }, true, 'cite un de nos envois'],
  [{ envoi_id: null, conversation_id: 'c-1', prospect_id: null, notre_dernier_envoi_le: null }, true, 'conversation sur nos canaux'],
  [{ envoi_id: null, conversation_id: null, prospect_id: 'p-1', notre_dernier_envoi_le: '2026-10-01T10:00:00Z' }, true, 'prospect à qui nous avons écrit'],
]
const filsFaux = FILS.filter(([r, attendu]) => filInitieParNous(r) !== attendu).map(([, , nom]) => nom)
ok("BP-20 le répondeur ne reconnaît comme rattaché à la prospection qu'un message qui cite un de nos envois, arrive dans une conversation ou vient d'un prospect (la base exige en plus notre envoi, BP-25)", filsFaux.length === 0, filsFaux.join(' ; '))

// ── Les critères sur les sources : des fonctions, pour que chaque sabotage (plus bas) soit rejoué en mémoire ──────────────
// BP-12..BP-15 (07/10/2026) : le chemin « demande entrante → maquette → e-mail » passait encore par trois variables jamais posées.
// L'atelier (app/api/usine/atelier/lien) refusait tout lien par courriel (`en_attente_gmail`) et l'avis du second juge
// (app/api/usine/facteur/avis) jugeait J3 avec une adresse de réponse vide, alors que le message porte celle du module.
const FICHIERS = {
  facteur: 'app/api/cron/facteur/route.ts', standardiste: 'app/api/cron/standardiste/route.ts', repondeur: 'app/api/cron/repondeur/route.ts',
  redacteur: 'app/api/cron/redacteur/route.ts', module: 'lib/agents/acquisition/boiteProspection.ts',
  atelier: 'app/api/usine/atelier/lien/route.ts', avis: 'app/api/usine/facteur/avis/route.ts',
  repondeurModule: 'lib/agents/acquisition/repondeur.ts', migration0134: 'supabase/migrations/0134_neutralisation_boite_personnelle.sql',
  porteurGmail: 'lib/agents/acquisition/porteurs/gmail.ts',
}
// Les usages de prospection (BP-23) : aucun ne touche la boîte de l'entreprise autrement que par le module.
const USAGES = ['facteur', 'standardiste', 'repondeur', 'redacteur', 'atelier', 'avis', 'repondeurModule']
const BOITE_ENTREPRISE_DIRECTE = /boiteEntrepriseResolue|IMAP_USER|IMAP_PASS|PRESTI_MAIL_IMAP|@\/lib\/canaux/
// BP-24 : personne ne pose la variable d'autorisation dans le dépôt (seul Benj la pose, sur Vercel, à la main).
const POSE_AUTORISATION = /(PROSPECTION_AUTORISER_BOITE_ENTREPRISE|PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL)\s*[=:]\s*['"`]?oui/i
const LIEUX_POSE = ['app', 'lib', 'scripts', 'usine', '.github', 'vercel.json', 'package.json', '.env.example']
const SOI = path.relative(RACINE, fileURLToPath(import.meta.url)).replaceAll('\\', '/')
function poses() {
  const trouves = []
  const visiter = (rel) => {
    const abs = path.join(RACINE, rel)
    if (!fs.existsSync(abs)) return
    const st = fs.statSync(abs)
    if (st.isDirectory()) { for (const n of fs.readdirSync(abs)) if (n !== 'node_modules' && n !== '.next' && n !== 'fixtures') visiter(path.posix.join(rel, n)); return }
    if (rel === SOI || st.size > 2_000_000 || !/\.(m?[jt]sx?|json|ya?ml|sh|ps1|env|example|toml|service|timer)$|^\.env/.test(path.basename(rel))) return
    // Une ligne de commentaire qui DÉCRIT la variable (l'en-tête du module) n'est pas une pose.
    const lignes = fs.readFileSync(abs, 'utf8').split(/\r?\n/)
    if (lignes.some((l) => !/^\s*(\/\/|\/\*|\*|#)/.test(l) && POSE_AUTORISATION.test(l))) trouves.push(rel)
  }
  for (const l of LIEUX_POSE) visiter(l)
  return trouves
}
const POSES = poses()
// Le dernier fichier de migration qui (re)définit acq_reponses_a_repondre doit garder la règle du fil (BP-25).
const DERNIERE_A_REPONDRE = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort()
  .filter((n) => /function public\.acq_reponses_a_repondre/.test(fs.readFileSync(path.join(RACINE, 'supabase/migrations', n), 'utf8'))).pop()
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8')
const SOURCES = Object.fromEntries(Object.entries(FICHIERS).map(([k, f]) => [k, lire(f)]))
// Les fichiers du chemin entrant que BP-15 balaie : la route du formulaire, l'atelier (travail, dépôt, maquette, lien), l'avis,
// le facteur et le module qui prépare le message. Le porteur de formulaire (froid) n'est pas sur ce chemin.
const CHEMIN_ENTRANT = ['app/api/prospects/entrant/route.ts', 'app/api/usine/atelier/travail/route.ts', 'app/api/usine/atelier/depot/route.ts',
  'app/api/usine/atelier/maquette/route.ts', FICHIERS.atelier, FICHIERS.avis, 'app/api/usine/facteur/travail/route.ts', FICHIERS.facteur,
  'lib/agents/acquisition/redacteur.ts', 'lib/agents/acquisition/facteur.ts', 'lib/agents/acquisition/entrant.ts']
for (const f of CHEMIN_ENTRANT) if (!SOURCES[f]) SOURCES[f] = fs.existsSync(path.join(RACINE, f)) ? lire(f) : null
const VAR_A_LA_MAIN = /process\.env\.(PROSPECTION_GMAIL_USER|PROSPECTION_GMAIL_PASS|ACQ_ADRESSE_REPONSE)|process\.env\[['"](PROSPECTION_GMAIL_USER|PROSPECTION_GMAIL_PASS|ACQ_ADRESSE_REPONSE)['"]\]/
const IMPORT_MODULE = /import \{[^}]*\} from '@\/lib\/agents\/acquisition\/boiteProspection'/

const CRITERES = [
  ['BP-7 le facteur envoie par boiteProspection() et ne lit plus les variables à la main', (s) => /boiteProspection\(\)/.test(s.facteur) && !/process\.env\.PROSPECTION_GMAIL/.test(s.facteur)],
  ['BP-8 le standardiste relève par boiteProspection()', (s) => /boiteProspection\(\)/.test(s.standardiste) && !/process\.env\.PROSPECTION_GMAIL/.test(s.standardiste)],
  ["BP-9 le répondeur et le rédacteur prennent l'adresse de réponse du module", (s) => /adresseReponseProspection\(\)/.test(s.repondeur) && /adresseReponseProspection\(\)/.test(s.redacteur) && !/process\.env\.ACQ_ADRESSE_REPONSE/.test(s.repondeur + s.redacteur)],
  ['BP-10 le module ne journalise ni ne recopie le mot de passe', (s) => !/console\.|writeFile|fetch\(/.test(s.module)],
  ["BP-11 après un refus d'identifiants, le standardiste ne retente pas avant 6 h (Google bloque un compte qui insiste) et efface le refus au premier succès",
    (s) => /p_nom: 'gmail_refus'/.test(s.standardiste) && /6 \* 3_600_000/.test(s.standardiste) && /&& !refusRecent\)/.test(s.standardiste) && /resultat\.erreur === 'auth'\) \{[\s\S]{0,200}acq_curseur_poser', \{ p_nom: 'gmail_refus', p_valeur: new Date\(\)\.toISOString\(\) \}/.test(s.standardiste) && /p_nom: 'gmail_refus', p_valeur: '' \}/.test(s.standardiste)],
  ["BP-12 l'atelier prépare le lien par courriel avec la boîte du module : adresse de réponse = adresseReponseProspection(), refus `en_attente_gmail` seulement sans boiteProspection()",
    (s) => IMPORT_MODULE.test(s.atelier) && /const adresseReponse = adresseReponseProspection\(\)/.test(s.atelier)
      && /canal === 'email_sollicite' && \(!adresseReponse \|\| !boiteProspection\(\)\)\) return repondre\(\{ ok: false, raison: 'en_attente_gmail' \}\)/.test(s.atelier)
      && /preparerMessageLien\([\s\S]{0,600}adresseReponse,/.test(s.atelier)],
  ["BP-13 l'avis du second juge rejoue J3 avec la même adresse de réponse que celle écrite dans le message",
    (s) => IMPORT_MODULE.test(s.avis) && /adresseReponse: adresseReponseProspection\(\) \|\| null/.test(s.avis)],
  ["BP-14 l'atelier ne lit plus aucune des trois variables à la main (le refus `en_attente_gmail` ne dépend plus d'elles)", (s) => !VAR_A_LA_MAIN.test(s.atelier) && !VAR_A_LA_MAIN.test(s.avis)],
  ['BP-15 aucun fichier du chemin « demande entrante → maquette → e-mail » ne lit PROSPECTION_GMAIL_* ni ACQ_ADRESSE_REPONSE hors du module',
    (s) => CHEMIN_ENTRANT.every((f) => s[f] === null || !VAR_A_LA_MAIN.test(s[f]))],
  // BP-16 (07/10) : l'essai en production a buté sur la contrainte `maquettes_21_jours` (expire_le ≤ cree_le + 21 j) : le lien,
  // créé une passe après la maquette, demandait « maintenant + 21 j » et chaque lien répondait 503 (étape lien_maquette).
  ["BP-16 l'atelier plafonne la fin du lien à celle de la maquette (expire_le, sinon cree_le + 21 j) et la passe au lien comme au rendez-vous",
    (s) => /expireLe = expirationDuLien\(maintenant, m\)/.test(s.atelier) && /function expirationDuLien\([\s\S]{0,700}m\.expire_le[\s\S]{0,200}m\.cree_le|function expirationDuLien\([\s\S]{0,700}m\.cree_le[\s\S]{0,300}m\.expire_le/.test(s.atelier)
      && /Math\.min\(voulue, \.\.\.plafonds\)/.test(s.atelier) && /creerLienMaquette\(p\.id, [^\n]*, expireLe\)/.test(s.atelier) && /creerLienRdv\(p\.id, [^\n]*, expireLe\)/.test(s.atelier)],
  // BP-21..BP-25 (07/10/2026, incident de la boîte personnelle) : la coupure, dans les sources.
  ["BP-21 le module : aucun repli large ; la boîte de l'entreprise n'est lue qu'APRÈS le contrôle du « fil seul » (« oui » exact) ; en « fil seul », adresse relevée = Reply-To = l'adresse « plus », « De » = la boîte, et une ACQ_ADRESSE_REPONSE différente coupe tout ; l'ancienne variable n'est plus lue",
    (s) => { const m = s.module, i = m.indexOf('if (!filSeulAutorise(env)) return null'), j = m.indexOf('const b = entreprise()'), code = m.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
      return i > 0 && j > i && /\(env\.PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL \?\? ''\)\.trim\(\)\.toLowerCase\(\) === 'oui'/.test(m) && (m.match(/entreprise\(\)/g) ?? []).length === 1
        && /return \{ user: b\.user, pass: b\.pass, adresse: fil, expediteur: b\.user, repondreA: fil, source: 'entreprise_fil_seul' \}/.test(m)
        && /if \(adresseP && adresseP\.toLowerCase\(\) !== fil\) return null/.test(m) && /if \(!fil\) return null/.test(m)
        && !/PROSPECTION_AUTORISER_BOITE_ENTREPRISE/.test(code) && m.includes("return m ? `${m[1]}+${ETIQUETTE_FIL}@${m[2]}` : ''") && /export const ETIQUETTE_FIL = 'presti'\r?\n/.test(m) }],
  ["BP-22 le répondeur abandonne (rien ne part) toute réponse sans rattachement à notre prospection, avant toute lecture du prospect et toute préparation (la règle stricte du fil est en base, BP-25)",
    (s) => { const t = s.repondeurModule, d = t.indexOf('async function traiterReponse('), g = t.indexOf("if (!filInitieParNous(r)) { await abandonner(ctx, r, 'fil_non_initie'); return }", d), p = t.indexOf('await preparer(', d), l = t.indexOf('await lireInfo(', d)
      return d > 0 && g > d && p > g && l > g && /export function filInitieParNous\(r: ReponseARepondre\): boolean \{\s*return !!r\.envoi_id \|\| !!r\.conversation_id \|\| !!r\.prospect_id\s*\}/.test(t) }],
  ["BP-23 aucun usage de prospection (relève, réponse, envoi, rédaction, lien, avis) ne lit la boîte de l'entreprise en direct (IMAP_USER, boiteEntrepriseResolue)",
    (s) => USAGES.every((k) => !BOITE_ENTREPRISE_DIRECTE.test(s[k]))],
  ['BP-24 aucune des deux variables (PROSPECTION_AUTORISER_BOITE_ENTREPRISE, interdite ; PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL, posée sur Vercel seulement) n\'est posée dans le dépôt (app, lib, scripts, usine, CI, vercel.json)',
    (s) => (s.__poses ?? POSES).length === 0, () => POSES.join(', ')],
  ["BP-25 la base : la dernière définition d'acq_reponses_a_repondre exclut les lignes neutralisées et tout fil non ouvert par nous ; acq_reponses_a_traiter et acq_reponse_classer ignorent les lignes neutralisées",
    (s) => DERNIERE_A_REPONDRE === path.basename(FICHIERS.migration0134) && /and r\.neutralisee_le is null\s+and r\.classe in/.test(s.migration0134)
      && /and \(r\.envoi_id is not null or r\.conversation_id is not null or \(r\.prospect_id is not null and d\.envoye_le is not null\)\)/.test(s.migration0134)
      && /where classe is null and neutralisee_le is null/.test(s.migration0134) && /where id = p_id\s+and neutralisee_le is null;/.test(s.migration0134)],
  // BP-30..BP-32 (07/10, mode « fil seul ») : la relève et l'envoi, dans les sources.
  ["BP-30 la relève : chaque recherche porte l'en-tête ET X-GM-RAW sur l'adresse exacte, l'adresse est validée (ni guillemet ni espace), et seuls les UID rendus par ces recherches sont ouverts (aucune liste de la boîte, aucune recherche « all »)",
    (s) => { const g = s.porteurGmail, r = g.slice(g.indexOf('export async function releverGmail'))
      return r.includes('const requete: Record<string, unknown> = { header: { [champ]: adresse } }') && r.includes('requete.gmraw = `${champ}:"${adresse}"`')
        && r.includes(`if (!adresse || !/^[^\\s"<>@,;]+@[^\\s"<>@,;]+$/.test(adresse)) return { erreur: 'injoignable' }`)
        && (r.match(/imap\.search\(/g) ?? []).length === 1 && (r.match(/imap\.fetchOne\(/g) ?? []).length === 1 && /for \(const uid of liste\) \{\s*const brut = await imap\.fetchOne\(uid,/.test(r)
        && /const liste = \[\.\.\.trouves\]/.test(r) && !/all: true|fetch\(['"]1:\*|imap\.fetch\(|\.fetch\(|listMessages|status\(/.test(r) }],
  ["BP-31 l'envoi : le porteur pose Reply-To quand le module en donne un, et le facteur passe « De » = expediteur et Reply-To = repondreA du module",
    (s) => s.porteurGmail.includes('...(repondreA ? { replyTo: repondreA } : {}),') && s.porteurGmail.includes("const repondreA = String(options.repondreA ?? '').trim()")
      && s.facteur.includes('creerPorteurGmail({ user: boite.user, pass: boite.pass, adresse: boite.expediteur, repondreA: boite.repondreA,')],
  ["BP-32 le standardiste ne relève, en « fil seul », que si l'adresse est exactement l'adresse « plus » dérivée de la boîte",
    (s) => s.standardiste.includes("const filSeulSur = !boite || boite.source !== 'entreprise_fil_seul' || (boite.adresse === adresseFil(boite.user) && boite.adresse.includes('+'))")
      && s.standardiste.includes('const user = filSeulSur ? boite?.user : undefined, pass = filSeulSur ? boite?.pass : undefined, adresse = filSeulSur ? boite?.adresse : undefined')],
]
const evaluer = (s) => CRITERES.filter(([, f]) => { try { return !f(s) } catch { return true } }).map(([nom]) => nom.split(' ')[0])
for (const [nom, f] of CRITERES) { let v = false; try { v = f(SOURCES) } catch { v = false } ok(nom, v) }

// ── Sabotages : chaque défaut connu, injecté en mémoire, doit faire rougir au moins un critère ─────────────────────────────
const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error(`sabotage sans prise : ${a.slice(0, 60)}`); return s.replace(a, b) }
const SABOTAGES = [
  ["l'atelier exige de nouveau les trois variables (l'état d'avant le 07/10)", 'atelier', (t) => remplacer(t, "(!adresseReponse || !boiteProspection())", '(!adresseReponse || !process.env.PROSPECTION_GMAIL_USER || !process.env.PROSPECTION_GMAIL_PASS)')],
  ["l'atelier relit ACQ_ADRESSE_REPONSE à la main", 'atelier', (t) => remplacer(t, 'const adresseReponse = adresseReponseProspection()', "const adresseReponse = (process.env.ACQ_ADRESSE_REPONSE ?? '').trim()")],
  ["l'atelier ne vérifie plus qu'une boîte existe (un lien préparé que personne ne peut envoyer)", 'atelier', (t) => remplacer(t, "(!adresseReponse || !boiteProspection())", '(!adresseReponse)')],
  ["l'atelier oublie l'import du module", 'atelier', (t) => t.replace(IMPORT_MODULE, '')],
  ["l'atelier passe une adresse vide au rédacteur", 'atelier', (t) => remplacer(t, 'conversation_id: conversationId, adresseReponse,', "conversation_id: conversationId, adresseReponse: '',")],
  ["l'avis juge J3 sans adresse (l'état d'avant le 07/10)", 'avis', (t) => remplacer(t, 'adresseReponse: adresseReponseProspection() || null', "adresseReponse: (process.env.ACQ_ADRESSE_REPONSE ?? '').trim() || null")],
  ["l'avis lit la variable par crochets", 'avis', (t) => remplacer(t, 'adresseReponse: adresseReponseProspection() || null', "adresseReponse: process.env['ACQ_ADRESSE_REPONSE'] || adresseReponseProspection() || null")],
  ['le facteur relit PROSPECTION_GMAIL_USER', 'facteur', (t) => remplacer(t, 'const boite = boiteProspection()', "const boite = process.env.PROSPECTION_GMAIL_USER ? null : boiteProspection()")],
  ["l'atelier redemande « maintenant + 21 j » (l'état qui faisait échouer chaque lien le 07/10)", 'atelier', (t) => remplacer(t, 'expireLe = expirationDuLien(maintenant, m)', 'expireLe = expiration(maintenant)')],
  ["l'atelier ignore le plafond de la maquette", 'atelier', (t) => remplacer(t, 'Math.min(voulue, ...plafonds)', 'voulue')],
  ["le rendez-vous garde « maintenant + 21 j »", 'atelier', (t) => remplacer(t, 'hacherJeton(jetonRdv), expireLe)', 'hacherJeton(jetonRdv), expiration(maintenant))')],
  ['le module journalise la boîte', 'module', (t) => remplacer(t, 'const b = entreprise()', 'const b = entreprise(); console.log(b)')],
  ['la route du formulaire lit ACQ_ADRESSE_REPONSE', 'app/api/prospects/entrant/route.ts', (t) => remplacer(t, "export async function POST(req: Request) {", "export async function POST(req: Request) {\n  void process.env.ACQ_ADRESSE_REPONSE")],
  ['le rédacteur (module) lit PROSPECTION_GMAIL_PASS', 'lib/agents/acquisition/redacteur.ts', (t) => t + '\nexport const _x = process.env.PROSPECTION_GMAIL_PASS\n'],
  // 07/10 : la coupure du repli.
  // 07/10 : aucun repli large, le mode « fil seul » et sa relève filtrée.
  ["le module retombe sur la boîte de l'entreprise sans « fil seul » (l'état du 06/10)", 'module', (t) => remplacer(t, '  if (!filSeulAutorise(env)) return null\n', '')],
  ["le « fil seul » accepte n'importe quelle valeur non vide", 'module', (t) => remplacer(t, ".trim().toLowerCase() === 'oui'", ".trim() !== ''")],
  ["le module lit la boîte de l'entreprise avant le contrôle", 'module', (t) => remplacer(t, '  if (!filSeulAutorise(env)) return null\n  const b = entreprise()\n', '  const b = entreprise()\n  if (!filSeulAutorise(env)) return null\n')],
  ["le « fil seul » relève l'adresse ordinaire (toute la boîte)", 'module', (t) => remplacer(t, 'adresse: fil, expediteur: b.user', 'adresse: b.user, expediteur: b.user')],
  ["le « fil seul » n'a plus de Reply-To", 'module', (t) => remplacer(t, 'repondreA: fil, source', 'repondreA: null, source')],
  ["le « fil seul » prend une ACQ_ADRESSE_REPONSE quelconque", 'module', (t) => remplacer(t, '  if (adresseP && adresseP.toLowerCase() !== fil) return null\n', '')],
  ["l'ancienne variable rouvre le repli large", 'module', (t) => remplacer(t, '  if (!filSeulAutorise(env)) return null\n', "  if (env.PROSPECTION_AUTORISER_BOITE_ENTREPRISE === 'oui') return null\n  if (!filSeulAutorise(env)) return null\n")],
  ["l'étiquette « plus » change", 'module', (t) => remplacer(t, "export const ETIQUETTE_FIL = 'presti'", "export const ETIQUETTE_FIL = 'perso'")],
  ["la relève cherche sans X-GM-RAW", 'porteurGmail', (t) => { const u = t.replace(/ {6}requete\.gmraw = [^\n]*\n/, ''); if (u === t) throw new Error('sabotage sans prise : gmraw'); return u }],
  ["la relève cherche toute la boîte (recherche « all »)", 'porteurGmail', (t) => remplacer(t, 'const requete: Record<string, unknown> = { header: { [champ]: adresse } }', 'const requete: Record<string, unknown> = { all: true }')],
  ["la relève ouvre aussi des messages hors recherche (liste de la boîte)", 'porteurGmail', (t) => remplacer(t, 'const liste = [...trouves]', "for await (const x of (imap as any).fetch('1:*', { envelope: true })) trouves.add(x.uid)\n    const liste = [...trouves]")],
  ["la relève accepte une adresse avec guillemets (injection X-GM-RAW)", 'porteurGmail', (t) => { const u = t.replace(/ {4}if \(!adresse \|\| !\/[^\n]*\n/, "    if (!adresse) return { erreur: 'injoignable' }\n"); if (u === t) throw new Error('sabotage sans prise : validation'); return u }],
  ["le porteur n'écrit plus le Reply-To", 'porteurGmail', (t) => remplacer(t, '...(repondreA ? { replyTo: repondreA } : {}),', '')],
  ["le facteur envoie « De » l'adresse « plus » sans Reply-To", 'facteur', (t) => remplacer(t, 'adresse: boite.expediteur, repondreA: boite.repondreA,', 'adresse: boite.adresse,')],
  ["le standardiste ne contrôle plus l'adresse du « fil seul »", 'standardiste', (t) => remplacer(t, "boite.source !== 'entreprise_fil_seul' || (boite.adresse === adresseFil(boite.user) && boite.adresse.includes('+'))", 'true')],
  ["le répondeur ne contrôle plus le fil", 'repondeurModule', (t) => { const u = t.replace(/ {2}if \(!filInitieParNous\(r\)\) \{[^\n]*\}\r?\n/, ''); if (u === t) throw new Error('sabotage sans prise : garde du fil'); return u }],
  ["le répondeur prend pour « à nous » un message sans aucun rattachement", 'repondeurModule', (t) => remplacer(t, 'return !!r.envoi_id || !!r.conversation_id || !!r.prospect_id', 'return true')],
  ["le répondeur lit le prospect avant de contrôler le fil", 'repondeurModule', (t) => { const u = t.replace(/( {2}if \(!filInitieParNous\(r\)\) \{[^\n]*\}\r?\n)([\s\S]*?)( {2}const info = prospectId \? await lireInfo\(ctx, prospectId\) : null\r?\n)/, '$2$3$1'); if (u === t) throw new Error('sabotage sans prise : ordre'); return u }],
  ["le standardiste relève la boîte de l'entreprise en direct", 'standardiste', (t) => remplacer(t, 'const boite = boiteProspection()', "const boite = boiteProspection() ?? (await import('@/lib/canaux')).boiteEntrepriseResolue()")],
  ["le facteur envoie par IMAP_USER", 'facteur', (t) => remplacer(t, 'const boite = boiteProspection()', "const boite = boiteProspection() ?? { user: process.env.IMAP_USER, pass: process.env.IMAP_PASS }")],
  ["un script pose l'autorisation", '__poses', () => ['scripts/exemple.mjs']],
  ["la base répond de nouveau hors fil (règle du fil ôtée)", 'migration0134', (t) => remplacer(t, '     and (r.envoi_id is not null or r.conversation_id is not null or (r.prospect_id is not null and d.envoye_le is not null))\n', '')],
  ["la base reclasse les lignes neutralisées", 'migration0134', (t) => remplacer(t, 'where classe is null and neutralisee_le is null', 'where classe is null')],
]
let manques = 0
for (const [nom, cle, muter] of SABOTAGES) {
  let rougesS
  try { rougesS = evaluer({ ...SOURCES, [cle]: muter(SOURCES[cle]) }) } catch (e) { rougesS = []; console.log(`  sabotage INVALIDE : ${nom} → ${e.message}`) }
  if (rougesS.length) console.log(`  sabotage vu    : ${nom} → ${rougesS.join(', ')}`)
  else { console.log(`  sabotage MANQUÉ : ${nom} → tout reste vert`); manques++ }
}
if (manques) rouges.push(`${manques} sabotage(s) manqué(s)`)

console.log(rouges.length ? `boite-prospection-qa : ÉCHEC (${rouges.join(', ')})` : `boite-prospection-qa : PASS (${nbCriteres} critères, ${SABOTAGES.length} sabotages vus)`)
process.exitCode = rouges.length ? 1 : 0
