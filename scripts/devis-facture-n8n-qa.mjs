// JUGE des départements Devis et Facturation-encaissement (tâche 036-005 ; plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-005) :
// `presti-dep-devis`, `presti-dep-facturation` et le banc `presti-banc-argent`. Hors ligne : aucun réseau, aucune base, aucun modèle. Il ne lit QUE ce que
// n8n a rendu (les exports .orchestre/preuves/036-005/*.workflow.json et essais-n8n.json), les contrats versionnés
// (plans/011-cadrage-01-11/p6-signature/contrats/{devis,facturation}.json) et le CODE de l'application (lib/pilote/regles.ts, lib/plans.ts,
// lib/relancesImpayes.ts), jamais la fabrique. Il rejoue les nœuds des exports dans node:vm (moteur de scripts/demo-entreprise-qa.mjs) et les lib-*
// existants depuis LEURS exports (035-003 à 035-005). Il rougit (code 1) sur :
//   S  structure : inactif, réglages, politique d'appel, types permis, aucun identifiant, trois étages au plus ;
//   C  contrats : le schéma embarqué et les lectures = les contrats versionnés ; M1 : chaque lecture filtre sur artisan_id ;
//   G6 « le code calcule, n8n route » : aucun montant calculé, converti ni additionné dans un nœud (syntaxe), et tout montant d'une sortie est un montant LU
//      (sémantique) ; G2 aucun modèle dans un chef ; G4 la porte « simulation », aucun envoi, aucune écriture, aucun effet fait, des effets d'une liste fermée ;
//   D  devis : « source » seulement si l'application dit « sourcée » (ligneSourcee), un repère n'est jamais une source, aucune ligne du pilote pour un devis ;
//   E  émission : n8n n'émet aucune facture, ne marque aucun paiement ; « facture prête » est toujours une carte ;
//   B  impayés : J+3, J+10, J+21 ; la relance s'arrête sur un paiement ou sur un motif, jamais sur le silence ; un motif ignoré, une relance après paiement ;
//   A  Studio et Signature : rien ne part seul en Studio, ni un type non activé, ni un geste OUTILS_JAMAIS_AUTO, ni sur une contestation ;
//   G7 un montant du modèle qui n'est pas le fait est refusé par la porte ; I idempotence ; M2 multi-tenant ; R lecture absente = rien ;
//   N/P les essais n8n (sortie rejouée = sortie de n8n ; sortie épinglée = export rejoué) ; H « Exemple. » partout, aucune adresse.
// Chaque règle a son MUTANT, qui doit la faire rougir pour sa raison.
//   node scripts/devis-facture-n8n-qa.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { executer, T } from './demo-entreprise-qa.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREUVE = path.join(RACINE, '.orchestre/preuves/036-005')
const CONTRATS = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats')
const copie = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lireJson = (f) => JSON.parse(readFileSync(f, 'utf8'))
const CHEFS = ['presti-dep-devis', 'presti-dep-facturation']
const NOMS = [...CHEFS, 'presti-banc-argent']
const DEP = { 'presti-dep-devis': 'devis', 'presti-dep-facturation': 'facturation' }
const PERMIS_CHEF = [T.trigger, T.code, T.si, T.appel, T.rien, T.arret, T.note]
const PERMIS_BANC = [T.horloge, T.code, T.appel, T.note]
const ENVOI_ECRITURE = /email|gmail|outlook|slack|telegram|twilio|whatsapp|discord|mattermost|sendgrid|mailgun|mailjet|brevo|sendinblue|httprequest|supabase|postgres|mysql|redis|ftp|ssh|executecommand/i
const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/
const CREATEURS = new Set(['ecrire_carte', 'mettre_en_file_pilote'])
const EFFETS_PERMIS = new Set(['ecrire_carte', 'mettre_en_file_pilote', 'inserer_journal'])
const GESTES_ARGENT = /^(marquer_facture_payee|rembourser|payer|creer_avoir|encaisser|toucher_moyen_paiement)$/
// Le code d'un nœud sans commentaires ni chaînes : ce qui reste est ce qui CALCULE.
const nu = (js) => String(js).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''")
const cleDe = (x) => x.cle ?? x.corps?.cle
const orgDe = (x) => x.organisation_id ?? x.corps?.organisation_id
const aretes = (wf, nom) => Object.values(wf.connections?.[nom] ?? {}).flatMap((liste) => (liste ?? []).flatMap((s, i) => (s ?? []).filter(Boolean).map((l) => ({ vers: l.node, sortie: i }))))
const noeud = (w, nom) => w?.nodes.find((n) => n.name === nom)
const schemaEmbarque = (w) => { const js = noeud(w, "Contrat d'entrée")?.parameters?.jsCode ?? ''; const m = /\nconst SCHEMA = (.*);\n/.exec(js); return m ? JSON.parse(m[1]) : null }
// Les montants d'un objet : tout champ « *_centimes » (entier) ou « *_affiche » (texte), et tout montant écrit dans un texte (« 1 200,00 € »).
const MONTANT_TEXTE = /(\d[\d\s  .]*),(\d{2})\s?€/g
const chiffres = (s) => String(s).replace(/\D/g, '')
function montants(o, sortie = new Set()) {
  if (Array.isArray(o)) { for (const x of o) montants(x, sortie); return sortie }
  if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if (/_centimes$/.test(k) && Number.isInteger(v)) sortie.add(String(v)); else if (/_affiche$/.test(k) && typeof v === 'string') for (const m of v.matchAll(MONTANT_TEXTE)) sortie.add(chiffres(m[1]) + m[2]); else montants(v, sortie) } return sortie }
  if (typeof o === 'string') for (const m of o.matchAll(MONTANT_TEXTE)) sortie.add(chiffres(m[1]) + m[2])
  return sortie
}

// ─── Le code de l'application, lu par un sous-processus (TypeScript) : la vérité contre laquelle tout est comparé ─────────────────────
export function lireCode(questions) {
  const u = (f) => JSON.stringify(path.join(RACINE, f))
  const prog = `const r = await import(${u('lib/pilote/regles.ts')}); const p = await import(${u('lib/plans.ts')}); const i = await import(${u('lib/relancesImpayes.ts')});
let q = ''; for await (const x of process.stdin) q += x; q = JSON.parse(q);
process.stdout.write(JSON.stringify({ OUTILS_JAMAIS_AUTO: r.OUTILS_JAMAIS_AUTO, OUTILS_EXECUTABLES_PILOTE: r.OUTILS_EXECUTABLES_PILOTE, OUTIL_TYPE: r.OUTIL_TYPE, TYPES_PILOTE: r.TYPES_PILOTE,
  JOURS_PAR_DEFAUT: i.JOURS_PAR_DEFAUT, PLAFOND_AUTO_JOUR: r.PLAFOND_AUTO_JOUR,
  lignes: q.lignes.map((l) => r.ligneSourcee({ prix_unitaire_ht: l.centimes / 100, source_prix: l.source_prix })),
  prixSources: q.devis.map((d) => r.prixSources(d.map((l) => ({ prix_unitaire_ht: l.centimes / 100, source_prix: l.source_prix })))),
  pilote: Object.fromEntries(q.plans.map((plan) => [plan, p.peut(plan, 'assistant.pilote')])),
  relancesAuto: Object.fromEntries(q.plans.map((plan) => [plan, p.peut(plan, 'factures.relances.auto')])) }));`
  const sortie = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8', input: JSON.stringify(questions), maxBuffer: 1 << 26 })
  const code = JSON.parse(sortie)
  const src = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
  const m = /^const SOURCE_OK = \/(.+)\/([gimsuy]*)$/m.exec(src); code.SOURCE_PRIX = m ? m[1] : null
  return code
}

// ─── Le monde jugé ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function chargerMonde() {
  const W = {}
  for (const n of NOMS) { const f = path.join(PREUVE, `${n}.workflow.json`); if (existsSync(f)) W[n] = lireJson(f) }
  const L = {}
  for (const d of ['035-003', '035-004', '035-005']) { const dir = path.join(RACINE, '.orchestre/preuves', d); for (const f of readdirSync(dir).filter((x) => x.endsWith('.workflow.json'))) { const w = lireJson(path.join(dir, f)); L[w.name] = w } }
  const c = (f) => (existsSync(path.join(CONTRATS, f)) ? lireJson(path.join(CONTRATS, f)) : null)
  return { W, L, essais: existsSync(path.join(PREUVE, 'essais-n8n.json')) ? lireJson(path.join(PREUVE, 'essais-n8n.json')) : [], devis: c('devis.json'), facturation: c('facturation.json'), cerveau: c('cerveau.json') }
}
// Le « modèle » épinglé du juge : un texte de relance sobre qui recopie les faits (jamais celui de la fabrique) ; `piege` ajoute un montant que le fait ne porte pas.
const lettres = (iso) => { const [a, m, d] = iso.split('-'); return `${Number(d) === 1 ? '1er' : Number(d)} ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][Number(m) - 1]} ${a}` }
const eur = (c) => `${String(c).slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${String(c).slice(-2)} € TTC`
const modeleJuge = (piege = false) => (j) => {
  const f = j.enveloppe?.donnees?.faits ?? j.faits
  return { objet: `Exemple. Rappel : facture ${f.numero}`, faits_cites: ['numero', 'montant', 'echeance'], champs_inconnus: [],
    texte: `{{salutation}}\n\nNous nous permettons de revenir vers vous au sujet de la facture ${f.numero} (${f.objet ?? 'Exemple. Travaux'}), d'un montant de ${piege ? eur(f.montant_ttc_centimes + 10000) : eur(f.montant_ttc_centimes)}, arrivée à échéance le ${lettres(f.echeance_le)}. Si le règlement est déjà parti, merci de ne pas tenir compte de ce message ; s'il y a une difficulté, il vous suffit de nous répondre.\n\nBien cordialement,\nExemple. L’équipe` }
}

export function juger(M, K) {
  const e = [], ko = (r, m) => e.push(`${r} ${m}`)
  const W = { ...M.L, ...M.W }
  const id = (n) => M.W[n]?.id, nomDe = (i) => Object.values(W).find((w) => w.id === i)?.name
  const ERREUR = M.L['lib-erreur-commune']?.id
  const CERVEAU = '596OC5mL2aMBq6SD'
  // ── S : structure
  for (const nom of NOMS) {
    const w = M.W[nom]; if (!w) { ko('S1', `${nom} : export absent`); continue }
    if (w.active !== false || w.activeVersionId) ko('S1', `${nom} : actif ou publié`)
    const s = w.settings ?? {}
    if (s.errorWorkflow !== ERREUR || s.timezone !== 'Europe/Paris' || s.saveDataSuccessExecution !== 'none' || !Number.isInteger(s.executionTimeout) || s.executionTimeout < 1 || s.executionTimeout > 3600) ko('S2', `${nom} : réglages (workflow d'erreur, fuseau, rétention, délai)`)
    const appelants = String(s.callerIds ?? '').split(',').map((x) => x.trim()).filter(Boolean)
    const attendus = CHEFS.includes(nom) ? [CERVEAU, id('presti-banc-argent')].filter(Boolean) : null
    if (attendus ? !(s.callerPolicy === 'workflowsFromAList' && egal([...appelants].sort(), [...attendus].sort())) : s.callerPolicy !== 'none') ko('S2', `${nom} : politique d'appel ${s.callerPolicy}/${s.callerIds} (attendu : ${attendus ? attendus.join(',') : 'none'})`)
    const permis = CHEFS.includes(nom) ? PERMIS_CHEF : PERMIS_BANC
    for (const n of w.nodes) {
      if (ENVOI_ECRITURE.test(n.type)) ko('G4', `${nom} / ${n.name} : nœud d'envoi, d'écriture ou de lecture réelle (${n.type}) : interdit en simulation`)
      else if (String(n.type).includes('langchain')) ko('G2', `${nom} / ${n.name} : un modèle dans un chef (la rédaction vit dans lib-rediger-message, modèle épinglé)`)
      else if (!permis.includes(n.type)) ko('S3', `${nom} / ${n.name} : type hors liste (${n.type})`)
      if (n.credentials && Object.keys(n.credentials).length) ko('S2', `${nom} / ${n.name} : identifiant posé (aucun en simulation)`)
      if (n.type === T.appel) {
        const cible = nomDe(n.parameters?.workflowId?.value)
        if (n.parameters?.source !== 'database' || !cible) ko('S3', `${nom} / ${n.name} : sous-workflow inconnu ou hors source database`)
        else if (CHEFS.includes(nom) && !cible.startsWith('lib-')) ko('S3', `${nom} appelle ${cible} : trois étages au plus (Cerveau, chef, lib-*)`)
        else if (nom === 'presti-banc-argent' && !CHEFS.includes(cible)) ko('S3', `le banc appelle ${cible}`)
      }
    }
  }
  const devis = M.W['presti-dep-devis'], fact = M.W['presti-dep-facturation'], banc = M.W['presti-banc-argent']
  if (!devis || !fact || !banc) return e
  // ── C : les contrats versionnés = ce que vérifient les exports
  for (const [nom, w] of [['devis', devis], ['facturation', fact]]) {
    const c = M[nom]
    if (!c || !/^\d+\.\d+\.\d+$/.test(String(c.version))) { ko('C1', `contrats/${nom}.json absent ou non versionné`); continue }
    const sa = schemaEmbarque(w)
    if (!sa || !egal({ config: sa.config, donnees: sa.donnees }, c.entree)) ko('C1', `presti-dep-${nom} : le schéma de son « Contrat d’entrée » diffère de contrats/${nom}.json`)
    if (!new RegExp(`^contrat: presti-dep-${nom}@1$`, 'm').test(noeud(w, "Contrat d'entrée")?.notes ?? '')) ko('C1', `presti-dep-${nom} : contrat presti-dep-${nom}@1 non déclaré`)
    if (M.cerveau && !Object.values(M.cerveau.routes).includes(nom)) ko('C1', `contrats/cerveau.json ne route rien vers ${nom}`)
    // M1 : chaque lecture filtre sur le compte, telle que le contrat la déclare
    const lectures = w.nodes.filter((n) => n.type === T.rien)
    if (lectures.length < 3) ko('M1', `presti-dep-${nom} : ${lectures.length} lecture(s) déclarée(s) (trois au moins attendues)`)
    for (const n of lectures) {
      const r = /^requete: (.+)$/m.exec(n.notes ?? '')?.[1]
      if (!r || !/[?&]artisan_id=eq\.</.test(r)) ko('M1', `presti-dep-${nom} / ${n.name} : requête sans filtre artisan_id (« Supabase account » passe outre la RLS)`)
      else if (c.lectures?.[n.name]?.requete !== r) ko('M1', `presti-dep-${nom} / ${n.name} : requête différente de contrats/${nom}.json`)
      if (/select=[^&]*(nom|email|contact|adresse|message|contenu|texte)\b/i.test(r ?? '')) ko('M1', `presti-dep-${nom} / ${n.name} : une colonne de coordonnées ou de texte client est lue`)
    }
  }
  // ── G6 : « le code calcule, n8n route ». Syntaxe : ni arithmétique ni conversion dans un nœud Code d'un chef.
  for (const nom of CHEFS) for (const n of M.W[nom].nodes.filter((x) => x.type === T.code && !["Contrat d'entrée", 'Contrat de sortie'].includes(x.name))) {
    const c = nu(n.parameters?.jsCode)
    if (/\bMath\b|toFixed|parseFloat|parseInt|\bNumber\s*\(|\.reduce\s*\(|toLocaleString|Intl\./.test(c)) ko('G6', `${nom} / ${n.name} : un calcul ou une conversion de nombre dans n8n (le montant vient du code de l'application)`)
    if (/[^\s=!<>]\s*[*/%]\s*[^\s=]|\s[*/%]\s|\+\+|--|[-+*/%]=/.test(c.replace(/=>/g, '=@').replace(/<=|>=|===|!==/g, '@'))) ko('G6', `${nom} / ${n.name} : un opérateur arithmétique dans un nœud (somme, produit, quotient ou reste)`)
    if (/(montant|total|prix|ttc|\bht\b|tva|centimes|solde|apercu_total)\w*\s*[-+]\s*[\w(]|[\w)]\s*[-+]\s*\w*(montant|total|prix|ttc|\bht\b|tva|centimes|solde)/i.test(c)) ko('G6', `${nom} / ${n.name} : un montant additionné ou soustrait dans un nœud`)
  }
  // ── G4 : la porte « simulation » avant tout appel (chefs) ; hors simulation, aucun appel
  for (const nom of CHEFS) {
    const w = M.W[nom], porte = noeud(w, 'Porte simulation')
    if (!porte || porte.type !== T.si || !/simulation/.test(JSON.stringify(porte.parameters?.conditions ?? {}))) { ko('G4', `${nom} : porte « simulation » absente`); continue }
    const vus = new Set(), file = [w.nodes.find((n) => n.type === T.trigger)?.name]
    while (file.length) { const x = file.shift(); if (!x || vus.has(x)) continue; vus.add(x); for (const a of aretes(w, x)) if (!(x === porte.name && a.sortie === 0)) file.push(a.vers) }
    for (const x of vus) if (noeud(w, x)?.type === T.appel) ko('G4', `${nom} / ${x} : atteignable sans passer la porte « simulation »`)
  }
  // ── Les enveloppes du banc (deux comptes), lues dans l'export du banc et rejouées
  const jb = []
  const rb = executer(banc, [{}], W, { modele: modeleJuge(), politique: 'notee', journal: jb })
  const env = (dep) => jb.filter((x) => x.appelant === 'presti-banc-argent' && x.enfant === `presti-dep-${dep}`).flatMap((x) => x.entrees)
  const E = { devis: env('devis'), facturation: env('facturation') }
  if (rb.erreur || E.devis.length !== 2 || E.facturation.length !== 2) { ko('A0', `banc illisible (${rb.erreur ?? `${E.devis.length}/${E.facturation.length} enveloppe(s)`})`); return e }
  const lecturesDe = (v) => v.config.lectures_simulees
  for (const v of [...E.devis, ...E.facturation]) {
    if (!/^Exemple\. /.test(lecturesDe(v).configuration[0].nom_artisan)) ko('H1', 'banc : nom d’artisan sans « Exemple. »')
    if (COURRIEL.test(JSON.stringify(v))) ko('H2', 'banc : adresse e-mail dans une enveloppe')
    for (const l of lecturesDe(v).lignes ?? []) if (!/^Exemple\. /.test(l.designation)) ko('H1', `banc : ligne sans « Exemple. » (${l.designation})`)
  }
  for (const nom of NOMS) if (COURRIEL.test(JSON.stringify(M.W[nom]))) ko('H2', `${nom} : adresse e-mail dans l'export`)
  // ── La vérité du code : lignes sourcées, jours des relances, offres
  const lignesBanc = E.devis.flatMap((v) => lecturesDe(v).lignes)
  const devisBanc = E.devis.flatMap((v) => { const par = {}; for (const l of lecturesDe(v).lignes) (par[l.devis_id] ??= []).push(l); return Object.entries(par).map(([k, ls]) => ({ k, ls })) })
  const offres = [...new Set([...E.devis, ...E.facturation].map((v) => lecturesDe(v).configuration[0].offre))]
  const V = lireCode({ lignes: lignesBanc.map((l) => ({ centimes: l.prix_unitaire_ht_centimes, source_prix: l.source_prix })), devis: devisBanc.map(({ ls }) => ls.map((l) => ({ centimes: l.prix_unitaire_ht_centimes, source_prix: l.source_prix }))), plans: offres })
  const sourceeCode = new Map(lignesBanc.map((l, i) => [`${l.devis_id}|${l.rang}`, V.lignes[i]]))
  const prixSourcesCode = new Map(devisBanc.map(({ k }, i) => [k, V.prixSources[i]]))
  if (K.SOURCE_PRIX && !egal(V.SOURCE_PRIX, K.SOURCE_PRIX)) ko('D0', 'la règle des prix sourcés a changé')
  for (const v of E.facturation) for (const c of lecturesDe(v).configuration) if (!egal(c.relances_impayes.jours, V.JOURS_PAR_DEFAUT)) ko('B5', `le calendrier des relances d'impayés du banc (${c.relances_impayes.jours}) n'est pas celui du code (${V.JOURS_PAR_DEFAUT}, lib/relancesImpayes.ts:38)`)
  const copieSource = /new RegExp\(("(?:[^"\\]|\\.)*"), 'i'\)/.exec(noeud(devis, 'Constituer les dossiers')?.parameters?.jsCode ?? '')
  if (!copieSource || JSON.parse(copieSource[1]) !== V.SOURCE_PRIX) ko('D0', 'presti-dep-devis : la copie figée de SOURCE_OK diffère de lib/pilote/regles.ts')
  // ── Le rejeu des deux chefs sur le banc, et ses variantes
  const lancer = (nom, enveloppes, modele = modeleJuge()) => { const j = []; const r = executer(M.W[nom], copie(enveloppes), W, { modele, politique: 'notee', journal: j }); return { r, j, s: r.sorties ?? [] } }
  const base = { 'presti-dep-devis': lancer('presti-dep-devis', E.devis), 'presti-dep-facturation': lancer('presti-dep-facturation', E.facturation) }
  for (const [nom, x] of Object.entries(base)) if (x.r.erreur || x.s.length !== 2 || x.s.some((s) => s.statut !== 'ok')) { ko('A0', `rejeu de ${nom} en erreur (${x.r.erreur ?? x.s.map((s) => s.statut + ' ' + (s.erreurs || [])[0]).join(' | ')})`); return e }
  const effets = (x) => x.s.flatMap((s) => s.effets_prevus)
  const executeurs = (x) => x.j.filter((a) => a.enfant === 'lib-executer').flatMap((a) => a.entrees)
  const pilotes = (x) => executeurs(x).filter((y) => y.donnees?.cible === 'pilote').map((y) => ({ org: y.organisation_id, objet: y.donnees.charge.objet_id, type: y.donnees.charge.type_action, palier: y.donnees.charge.palier, cle: y.donnees.cle_idempotence }))
  const cartes = (x) => executeurs(x).filter((y) => y.donnees?.cible === 'carte').map((y) => ({ org: y.organisation_id, objet: y.donnees.charge.objet_id, type: y.donnees.charge.type_action, palier: y.donnees.charge.palier, cle: y.donnees.cle_idempotence }))
  // Pour chaque compte : l'offre, le pilote, les types activés (lus dans la lecture de configuration, jamais devinés)
  const confDe = (v) => lecturesDe(v).configuration[0]
  const parOrg = new Map([...E.devis, ...E.facturation].map((v) => [v.organisation_id, confDe(v)]))
  const jugerPilotes = (x, quoi, lot) => {
    const conf = new Map(lot.map((v) => [v.organisation_id, confDe(v)]))
    for (const p of pilotes(x)) {
      const c = conf.get(p.org)
      if (!c) { ko('M3', `${quoi} : ligne du pilote hors de ses comptes`); continue }
      if (V.pilote[c.offre] !== true) ko('A1', `${quoi} : ${c.offre} fait partir seul ${p.type} (Studio prépare, l'artisan valide)`)
      else if (!(c.pilote.drapeau && c.pilote.actif && c.pilote.types?.[p.type] === true)) ko('A2', `${quoi} : Signature fait partir ${p.type} alors que ce type n'est pas activé`)
      else if (p.type !== 'relance_impaye') ko('A3', `${quoi} : ${p.type} part seul (seule la relance d'impayé est portée par ce département ; l'émission et l'envoi d'un devis restent à l'artisan)`)
      else if (V.OUTILS_JAMAIS_AUTO.includes(p.type) || !V.OUTILS_EXECUTABLES_PILOTE.includes('relancer_facture') || V.relancesAuto[c.offre] !== true) ko('A3', `${quoi} : relance_impaye part seule sans l'offre ou hors liste fermée du pilote`)
    }
    for (const c of cartes(x)) if (V.OUTILS_JAMAIS_AUTO.includes(c.type) && c.type !== 'creer_facture') ko('E3', `${quoi} : une carte porte le geste ${c.type}, que ce département ne prépare jamais`)
  }
  for (const [nom, x] of Object.entries(base)) {
    jugerPilotes(x, nom, nom === 'presti-dep-devis' ? E.devis : E.facturation)
    for (const [i, s] of x.s.entries()) {
      const v = (nom === 'presti-dep-devis' ? E.devis : E.facturation)[i]
      for (const y of s.effets_prevus) {
        if (!EFFETS_PERMIS.has(y.effet)) ko('G4', `${nom} : effet ${y.effet} hors de la liste fermée (${[...EFFETS_PERMIS].join(', ')})`)
        if (orgDe(y) !== v.organisation_id) ko('M2', `${nom} : un effet ${y.effet} sort de son compte`)
        const t = y.corps?.type_action ?? y.type_action ?? ''
        if (GESTES_ARGENT.test(t) || GESTES_ARGENT.test(y.outil ?? '') || /factures?$/.test(y.table ?? '') || y.statut === 'payee') ko('E3', `${nom} : un effet touche à l'argent (${t || y.outil || y.table}) : n8n n'émet, n'encaisse ni ne marque rien`)
      }
      if (s.effets_faits.length) ko('G4', `${nom} : effet fait en simulation`)
      if (s.resultat.sorties_vers_un_modele !== 0) ko('G2', `${nom} : un appel à un modèle compté`)
    }
  }
  if (!cartes(base['presti-dep-devis']).length || !cartes(base['presti-dep-facturation']).length) ko('A0', 'le banc ne prépare aucune carte : les règles ne prouvent rien')
  if (!pilotes(base['presti-dep-facturation']).length) ko('A0', 'le banc ne fait rien partir en Signature : les règles A ne prouvent rien')
  // G6, sémantique : tout montant d'une sortie est un montant LU dans les lectures
  for (const [nom, x] of Object.entries(base)) {
    const lus = montants((nom === 'presti-dep-devis' ? E.devis : E.facturation).map(lecturesDe))
    const sortis = montants(x.s.map((s) => ({ resultat: s.resultat, effets: s.effets_prevus })))
    for (const m of sortis) if (!lus.has(m)) ko('G6', `${nom} : un montant de la sortie (${m} centimes) n'est dans aucune lecture : il a été calculé ou inventé`)
  }
  // ── D : devis
  { const s = base['presti-dep-devis'].s
    for (const [i, sortie] of s.entries()) {
      const lues = lecturesDe(E.devis[i]), numeros = new Map(lues.devis.map((d) => [d.devis_id, d]))
      for (const f of sortie.resultat.devis_prets) {
        const mine = lues.lignes.filter((l) => l.devis_id === f.devis_id)
        if (f.lignes.length !== mine.length) ko('D1', `devis ${f.numero} : ${f.lignes.length} ligne(s) montrée(s) pour ${mine.length} lue(s)`)
        for (const [k, l] of f.lignes.entries()) {
          const lue = mine.find((y) => y.rang === l.rang), attendu = sourceeCode.get(`${f.devis_id}|${l.rang}`)
          if (!lue) { ko('D1', `devis ${f.numero} : ligne ${l.rang} absente des lectures`); continue }
          if ((l.statut_prix === 'source') !== attendu) ko('D1', `devis ${f.numero} ligne ${l.rang} : « ${l.statut_prix} » alors que l'application dit ${attendu ? 'sourcée' : 'non sourcée (estimé)'}`)
          if (l.statut_prix === 'source' && l.source !== lue.source_prix) ko('D1', `devis ${f.numero} ligne ${l.rang} : la source montrée n'est pas celle de la ligne`)
          if (l.statut_prix !== 'source' && l.source !== null) ko('D1', `devis ${f.numero} ligne ${l.rang} : une source montrée pour un prix estimé`)
          if (lue.repere_affiche && l.statut_prix === 'source' && !attendu) ko('D2', `devis ${f.numero} ligne ${l.rang} : un repère d'ancien chantier présenté comme une source (B9)`)
          if (lue.repere_affiche && (!l.repere || l.repere.affiche !== lue.repere_affiche)) ko('D2', `devis ${f.numero} ligne ${l.rang} : le repère cité n'est pas montré`)
          if (l.prix_affiche !== lue.prix_affiche || l.designation !== lue.designation) ko('D1', `devis ${f.numero} ligne ${l.rang} : prix ou désignation recopiés autrement`)
          void k
        }
        if (f.tous_prix_sources !== prixSourcesCode.get(f.devis_id)) ko('D3', `devis ${f.numero} : tous_prix_sources=${f.tous_prix_sources} alors que prixSources du code dit ${prixSourcesCode.get(f.devis_id)}`)
        if (f.a_estimer !== f.lignes.filter((l) => l.statut_prix === 'estime').length) ko('D3', `devis ${f.numero} : le nombre de prix estimés ne correspond pas aux lignes`)
        if (f.cible !== 'carte' || f.envoi !== 'au clic de l artisan') ko('D4', `devis ${f.numero} : une carte « devis prêt » doit être une carte et l'envoi un clic de l'artisan`)
        if (f.total_ttc_affiche !== numeros.get(f.devis_id)?.total_ttc_affiche) ko('D1', `devis ${f.numero} : total recopié autrement`)
      }
    } }
  if (!base['presti-dep-devis'].s.some((x) => x.resultat.devis_prets.some((f) => f.lignes.some((l) => l.statut_prix === 'estime')) && x.resultat.devis_prets.some((f) => f.lignes.every((l) => l.statut_prix === 'source')))) ko('A0', 'le banc de devis ne mélange pas prix sourcés et estimés : D1 ne prouve rien')
  // ── E : facture prête ; B : impayés
  { const s = base['presti-dep-facturation'].s
    for (const [i, sortie] of s.entries()) {
      const lues = lecturesDe(E.facturation[i]), r = sortie.resultat
      for (const f of r.factures_a_emettre) {
        const a = lues.apercus.find((y) => y.devis_id === f.devis_id)
        if (f.cible !== 'carte' || f.emission !== 'au clic de l artisan' || !/\?$/.test(f.question)) ko('E1', `facture prête (${f.devis_id.slice(-4)}) : l'émission doit rester un clic de l'artisan (carte, question « Ask you »)`)
        if (!a || a.chantier_termine !== true || a.deja_facturee !== false || a.apercu_ok !== true) ko('E1', `facture prête (${f.devis_id.slice(-4)}) : proposée alors que le chantier n'est pas terminé, déjà facturé ou sans aperçu`)
        else if (f.total_ttc_affiche !== a.apercu_total_ttc_affiche || f.type !== a.apercu_type || f.nb_deduites !== a.apercu_nb_deduites) ko('E2', `facture prête (${f.devis_id.slice(-4)}) : l'aperçu n'est pas recopié tel que l'application l'a rendu`)
      }
      const aretees = new Map(r.relances_arretees.map((x) => [x.facture_id, x.raison])), relances = new Map(r.relances.map((x) => [x.facture_id, x]))
      for (const f of lues.factures) {
        const arret = lues.arrets.find((a) => a.facture_id === f.facture_id), rel = relances.get(f.facture_id)
        const motif = arret && !arret.reprise_le && arret.motif !== 'oubli' ? (arret.motif ?? 'a_ranger') : null
        if (f.statut === 'payee' && (rel || r.cartes_motif.some((c) => c.facture_id === f.facture_id) || aretees.get(f.facture_id) !== 'paiement')) ko('B1', `facture ${f.numero} payée : une relance ou une carte part encore (la relance s'arrête sur un paiement)`)
        else if (f.statut === 'emise' && motif) {
          if (rel) ko('B2', `facture ${f.numero} : relancée alors qu'un motif (${motif}) est rangé (la relance s'arrête sur un motif)`)
          if (!r.cartes_motif.some((c) => c.facture_id === f.facture_id && c.motif === motif)) ko('B2', `facture ${f.numero} : motif ${motif} sans carte pour l'artisan`)
        } else if (f.statut === 'emise' && !rel && !(f.contestation === null)) {
          const ancienne = f.date_echeance <= '2026-10-20'
          if (ancienne && f.paliers_envoyes.length < 3) ko('B4', `facture ${f.numero} : échue depuis plus de 20 jours, sans paiement ni motif, et pourtant plus relancée (la relance ne s'arrête pas sur le silence)`)
        }
        if (rel) {
          const attendu = f.contestation === true ? 'carte' : null
          if (attendu && rel.cible !== 'carte') ko('A4', `facture ${f.numero} : le client conteste et la relance part seule : une contestation rend la relance en carte « à relire »`)
          if (f.contestation === true && !rel.a_relire) ko('B6', `facture ${f.numero} : contestation sans carte « à relire »`)
          if (!V.JOURS_PAR_DEFAUT.includes(rel.palier) && ![1, 2, 3].includes(rel.palier)) ko('B5', `facture ${f.numero} : palier ${rel.palier} hors du calendrier`)
          if (rel.brouillon && !rel.brouillon.texte.includes(String(f.total_ttc_affiche).replace(/ TTC$/, ' TTC'))) ko('G7', `facture ${f.numero} : le brouillon ne porte pas le montant du fait`)
        }
      }
      // « oubli » : les relances continuent ; le silence ne les arrête pas
      for (const a of lues.arrets.filter((y) => y.motif === 'oubli')) if (!relances.has(a.facture_id)) ko('B3', `motif « oubli » (${a.facture_id.slice(-4)}) : les relances devaient continuer`)
    } }
  // ── G7 : un montant que le modèle invente est refusé par la porte (rien n'est préparé pour cette relance)
  { const x = lancer('presti-dep-facturation', E.facturation, modeleJuge(true)); const n0 = base['presti-dep-facturation'].s.flatMap((s) => s.resultat.relances).length
    const n1 = x.s.flatMap((s) => s.resultat.relances).length, refus = x.s.flatMap((s) => s.resultat.refus_porte)
    const crees = effets(x).filter((y) => CREATEURS.has(y.effet) && (y.corps?.type_action ?? y.type_action) === 'relance_impaye').length
    if (crees !== 0 || n1 !== 0 || !refus.some((y) => y.motifs.includes('prix_sans_source')) || refus.length < n0) ko('G7', `un montant inventé par le modèle passe la porte (${crees} effet(s) et ${n1} relance(s) préparés sur ${n0} ; refus ${refus.length})`) }
  // ── A : variantes de réglages (Studio ne part jamais seul ; un type non activé ne part pas ; un geste jamais automatique n'est jamais une ligne du pilote)
  const varier = (nom, f) => { const lot = copie(nom === 'presti-dep-devis' ? E.devis : E.facturation); f(lot); return lot }
  const essayer = (nom, f, quoi) => { const lot = varier(nom, f); jugerPilotes(lancer(nom, lot), quoi, lot) }
  essayer('presti-dep-facturation', (v) => { for (const x of v) lecturesDe(x).configuration[0].pilote.types = { relance_impaye: false } }, 'variante « type non activé »')
  essayer('presti-dep-facturation', (v) => { for (const x of v) { const c = lecturesDe(x).configuration[0]; c.pilote = { drapeau: true, actif: true, types: { relance_impaye: true, envoi_facture: true, envoi_devis: true } } } }, 'variante « tous les types activés »')
  essayer('presti-dep-facturation', (v) => { for (const x of v) lecturesDe(x).configuration[0].capacites = lecturesDe(x).configuration[0].capacites.filter((c) => c !== 'factures.relances.auto') }, 'variante « sans relances automatiques »')
  essayer('presti-dep-devis', (v) => { for (const x of v) { const c = lecturesDe(x).configuration[0]; c.pilote = { drapeau: true, actif: true, types: { envoi_devis: true } } } }, 'variante « envoi_devis activé »')
  // ── I : le même lot rejoué (clés du 1er passage connues) ne crée rien ; la même action deux fois dans un lot n'en donne qu'une
  for (const nom of CHEFS) {
    const x = base[nom], creeurs = effets(x).filter((y) => CREATEURS.has(y.effet)), cles = [...new Set(creeurs.map(cleDe))]
    if (!creeurs.length) { ko('I1', `${nom} : le premier passage ne crée rien, le rejeu ne prouve rien`); continue }
    const lot = varier(nom, (v) => { for (const y of v) lecturesDe(y).configuration[0].cles_existantes = cles })
    const c2 = effets(lancer(nom, lot)).filter((y) => CREATEURS.has(y.effet))
    if (c2.length) ko('I1', `${nom} : le même lot rejoué recrée ${c2.length} carte(s) ou ligne(s) du pilote`)
    const c3 = effets(lancer(nom, varier(nom, (v) => { for (const y of v) y.donnees.evenements = y.donnees.evenements.concat(copie(y.donnees.evenements).map((z) => ({ ...z, id: z.id.replace(/.$/, '0'), cle: z.cle + '-bis' }))) }))).filter((y) => CREATEURS.has(y.effet)).map(cleDe)
    if (c3.length !== new Set(c3).size) ko('I1', `${nom} : le même dossier deux fois dans un lot donne ${c3.length - new Set(c3).size} action(s) en double`)
  }
  // ── M2 : un événement d'un autre compte (glissé dans le lot) est rejeté, et ses effets ne sortent pas de leur compte
  for (const nom of CHEFS) {
    const x = base[nom]; const rejets = x.s.flatMap((s) => s.resultat.rejets)
    if (!rejets.some((y) => y.motif === 'autre_compte') && nom === 'presti-dep-devis') ko('M2', `${nom} : l'événement d'un autre compte n'est pas rejeté`)
    if (!rejets.some((y) => y.motif === 'doublon') && nom === 'presti-dep-devis') ko('M2', `${nom} : le doublon n'est pas rejeté`)
  }
  // ── R : une lecture absente ne fait agir personne (fail-closed)
  for (const nom of CHEFS) {
    const x = lancer(nom, varier(nom, (v) => { for (const y of v) y.config = {} }))
    if (x.r.erreur || effets(x).some((y) => CREATEURS.has(y.effet))) ko('R1', `${nom} : sans lecture, des cartes ou des lignes du pilote sont prévues`)
  }
  // ── Hors simulation : le chef s'arrête avant tout appel
  for (const nom of CHEFS) { const j = []; const r = executer(M.W[nom], [{ ...copie((nom === 'presti-dep-devis' ? E.devis : E.facturation)[0]), simulation: false }], W, { modele: modeleJuge(), politique: 'notee', journal: j }); if (j.length || !/Hors simulation/.test(r.erreur ?? '')) ko('G4', `${nom} : avec simulation à faux, ${j.length} appel(s) partent (« ${(r.erreur ?? 'aucune erreur').slice(0, 50)} »)`) }
  // ── N : chaque essai n8n, rejoué sur l'export, rend la sortie de n8n ; P : ce qui est épinglé à la place d'un appel est l'export rejoué
  if (M.essais.filter((x) => !x.sonde).length < 2) ko('N1', `${M.essais.filter((x) => !x.sonde).length} essai(s) n8n sur un chef : deux attendus (un par chef)`)
  for (const x of M.essais) {
    const w = M.W[x.workflow]; if (!w) { ko('N1', `essai ${x.execution} : export ${x.workflow} absent`); continue }
    if (x.sonde) { // n8n n'appelle un sous-workflow que dans sa version PUBLIÉE (aucune ici, voulu) : le banc ne fait tourner aucun chef ; on n'y vérifie que le fail-closed
      const bilan = x.sorties?.[0] ?? {}
      for (const dep of ['devis', 'facturation']) if (!Array.isArray(bilan[dep]) || !bilan[dep].length || bilan[dep].some((s) => s.statut === 'ok' || s.cartes || s.pilote)) ko('N1', `sonde ${x.execution} : ${dep} appelé hors version publiée ne doit produire ni carte ni ligne du pilote (fail-closed)`)
      continue }
    const r = executer(w, x.entrees, W, { pins: x.epingles, modele: modeleJuge(), politique: 'stricte' })
    if (r.erreur) ko('N1', `essai ${x.execution} : le rejeu échoue (${r.erreur})`)
    else if (!egal(r.sorties, x.sorties)) ko('N1', `essai ${x.execution} (${x.workflow}) : la sortie rejouée diffère de celle de n8n`)
    for (const s of x.sorties ?? []) if (s.effets_faits?.length) ko('G4', `essai ${x.execution} : effet fait en simulation`)
    const appels = w.nodes.filter((n) => n.type === T.appel && n.name in (x.epingles ?? {}))
    const sans = Object.fromEntries(Object.entries(x.epingles ?? {}).filter(([n]) => !appels.some((a) => a.name === n)))
    const r2 = executer(w, x.entrees, W, { pins: sans, modele: (j) => { const p = (x.epingles['Appeler lib-rediger-message'] ?? []).find((y) => y.resultat?.action_cle === j.action_cle); return { objet: p?.resultat?.objet ?? null, texte: p?.resultat?.texte ?? 'x'.repeat(20), faits_cites: ['numero', 'montant', 'echeance'], champs_inconnus: [] } }, politique: 'notee' })
    for (const a of appels) {
      const vrai = r2.par[a.name]?.[0], pin = x.epingles[a.name]
      if (!vrai || !egal(vrai, pin)) ko('P1', `essai ${x.execution} / ${a.name} : la sortie épinglée n'est pas celle que rend ${nomDe(a.parameters.workflowId.value)} rejoué`)
    }
  }
  return e
}

// ─── Les mutants : chacun doit faire rougir sa règle ──────────────────────────────────────────────────────────────────────────────
const n_ = (M, wf, nom) => { const n = noeud(M.W[wf], nom); if (!n) throw new Error(`nœud absent : ${wf} / ${nom}`); return n }
const remplacer = (M, wf, nom, de, vers) => { const n = n_(M, wf, nom); if (!n.parameters.jsCode.includes(de)) throw new Error(`mutant inapplicable : ${wf} / ${nom} / « ${de.slice(0, 40)} »`); n.parameters.jsCode = n.parameters.jsCode.split(de).join(vers) }
const partout = (M, wf, de, vers) => { let n = 0; for (const x of M.W[wf].nodes.filter((y) => y.type === T.code && typeof y.parameters.jsCode === 'string' && y.parameters.jsCode.includes(de))) { x.parameters.jsCode = x.parameters.jsCode.split(de).join(vers); n++ } if (!n) throw new Error(`mutant inapplicable : ${wf} / « ${de.slice(0, 40)} »`) }
const FACT = 'presti-dep-facturation', DEV = 'presti-dep-devis'
const PLAN_PILOTE = "{ drapeau: true, actif: true, types: { relance_impaye: true, envoi_facture: true, envoi_devis: true } }"
export const MUTANTS = [
  ['un prix sans source présenté comme sourcé (la règle des prix ôtée)', (M) => partout(M, DEV, "const sourcee = (l) => Number.isInteger(l.prix_unitaire_ht_centimes) && l.prix_unitaire_ht_centimes > 0 && typeof l.source_prix === 'string' && l.source_prix.trim() !== '' && SOURCE.test(l.source_prix.trim());", 'const sourcee = (l) => true;'), /^D1 /],
  ['un prix d’ancien chantier (repère) traité comme une source', (M) => partout(M, DEV, "const sourcee = (l) => Number.isInteger(", 'const sourcee = (l) => !!l.repere_affiche || Number.isInteger('), /^D[12] /],
  ['« tous les prix sont sourcés » affirmé à tort', (M) => remplacer(M, DEV, 'Assembler', 'tous_prix_sources: tousSources(d)', 'tous_prix_sources: true'), /^D3 /],
  ['une ligne du pilote pour un devis (cible forcée)', (M) => { remplacer(M, DEV, 'Préparer la porte', "const c = d.c, cible = r.resultat.action === 'pilote' ? 'pilote' : 'carte';", "const c = d.c, cible = 'pilote';"); remplacer(M, DEV, "Préparer l'exécution", 'niveau_max: niveauMax(c)', 'niveau_max: 3') }, /^(A[123]|D4) |^A0 /],
  ['une facture émise par n8n (une écriture dans les factures)', (M) => remplacer(M, FACT, 'Assembler', "const j = jr['j:' + e.cle_idempotence];", "effets.push({ effet: 'ecrire_facture', table: 'factures', organisation_id: e.organisation_id, cle: 'emission', statut: 'emise' }); const j = jr['j:' + e.cle_idempotence];"), /^(G4|E3) /],
  ['une facture prête qui part seule (l’émission envoyée au pilote)', (M) => { remplacer(M, FACT, 'Préparer la porte', "const c = d.c, cible = r.resultat.action === 'pilote' ? 'pilote' : 'carte', b = red[r.resultat.cle_idempotence];", "const c = d.c, cible = 'pilote', b = red[r.resultat.cle_idempotence];"); remplacer(M, FACT, "Préparer l'exécution", 'niveau_max: niveauMax(c, p.outil)', 'niveau_max: 3') }, /^(A[123]|E1) |^A0 .*geste non permis/],,
  ['un montant calculé dans un nœud Code (un produit)', (M) => remplacer(M, FACT, 'Assembler', "total_ttc_affiche: d.row.apercu_total_ttc_affiche,", "total_ttc_affiche: d.row.apercu_total_ttc_centimes * 2,"), /^G6 /],
  ['un montant calculé hors syntaxe visible (une somme de deux faits)', (M) => remplacer(M, DEV, 'Assembler', "total_ttc_affiche: d.devis.total_ttc_affiche,", "total_ttc_centimes: d.devis.total_ttc_centimes + d.lignes[0].prix_unitaire_ht_centimes,"), /^G6 /],
  ['un montant calculé par le modèle (la porte ôtée pour les relances)', (M) => { remplacer(M, FACT, "Préparer l'exécution", "q.resultat.verdict !== 'passe'", 'false'); remplacer(M, FACT, "Préparer l'exécution", 'cible: q.resultat.cible,', "cible: 'carte',") }, /^G7 /],
  ['un modèle dans un chef', (M) => { M.W[FACT].nodes.push({ name: 'Calculer (modèle)', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [0, 0], parameters: {} }) }, /^G2 /],
  ['une relance d’impayé après paiement', (M) => remplacer(M, FACT, 'Constituer les dossiers', "else if (r.statut === 'payee') d.etat = 'payee';", ''), /^B1 /],
  ['un motif rangé ignoré', (M) => remplacer(M, FACT, 'Constituer les dossiers', "else if (d.arret && !d.arret.reprise_le && d.arret.motif !== 'oubli') d.etat = 'motif_' + (d.arret.motif || 'a_ranger');", ''), /^B2 /],
  ['la relance arrêtée sur le silence (au-delà de 7 jours)', (M) => remplacer(M, FACT, 'Constituer les dossiers', "else d.etat = 'a_relancer';", "else d.etat = r.paliers_envoyes.length >= 1 ? 'pas_relancable' : 'a_relancer';"), /^B4 /],
  ['un motif « oubli » qui arrête les relances', (M) => { partout(M, FACT, '"autre":"traiter_impaye_a_la_main"}', '"autre":"traiter_impaye_a_la_main","oubli":"traiter_impaye_a_la_main"}'); remplacer(M, FACT, 'Constituer les dossiers', "d.arret.motif !== 'oubli'", 'true') }, /^B3 /],
  ['un paiement marqué sans l’artisan', (M) => remplacer(M, FACT, 'Assembler', "const j = jr['j:' + e.cle_idempotence];", "for (const x of r0.relances_arretees) if (x.raison === 'paiement') effets.push({ effet: 'ecrire_carte', organisation_id: e.organisation_id, cle: 'paye:' + x.facture_id, objet_type: 'facture', objet_id: x.facture_id, type_action: 'marquer_facture_payee', outil: 'marquer_facture_payee' }); const j = jr['j:' + e.cle_idempotence];"), /^E3 /],
  ['Studio qui envoie (offre, niveau et pilote forcés partout)', (M) => { remplacer(M, FACT, 'Préparer la décision', 'niveau_max: niveauMax(c, p.outil), niveau_defaut: 2, niveaux: {} }, plan: c.offre, pilote: c.pilote,', `niveau_max: 3, niveau_defaut: 2, niveaux: {} }, plan: 'signature', pilote: ${PLAN_PILOTE},`); remplacer(M, FACT, "Préparer l'exécution", 'niveau_max: niveauMax(c, p.outil)', 'niveau_max: 3') }, /^A1 /],
  ['Signature : un type non activé qui part', (M) => remplacer(M, FACT, 'Préparer la décision', 'pilote: c.pilote,', `pilote: ${PLAN_PILOTE},`), /^A2 /],
  ['une contestation qui part seule (l’escalade ignorée)', (M) => remplacer(M, FACT, 'Préparer la décision', 'constat: { outil: p.outil, etape: p.etape, escalade: p.escalade }', 'constat: { outil: p.outil, etape: p.etape, escalade: false }'), /^A4 /],
  ['le même dossier rejoué recrée une carte (clés ignorées)', (M) => partout(M, DEV, 'cles_existantes: c.cles_existantes', 'cles_existantes: []'), /^I1 /],
  ['un événement d’un autre compte accepté', (M) => remplacer(M, DEV, 'Constituer les dossiers', 'if (ev.artisan_id !== org) { REJETS.push({ org: org, id: ev.id, motif: \'autre_compte\' }); continue; }', ''), /^M2 /],
  ['une lecture sans filtre artisan_id', (M) => { const n = n_(M, FACT, 'Lire les factures (simulation : épinglé)'); n.notes = n.notes.replace('&artisan_id=eq.<compte>', '') }, /^M1 .*sans filtre artisan/],
  ['une lecture absente qui fait agir (configuration par défaut)', (M) => remplacer(M, DEV, 'Constituer les dossiers', "if (!c) d.etat = 'configuration_non_lue';", "if (!c) { d.c = { offre: 'signature', capacites: [], pilote: { drapeau: true, actif: true, types: { envoi_devis: true } }, parties_depuis_24h: 0, interrupteur_general: true, interrupteur_departement: true, mots_escalade_artisan: [], horaires: { jours_permis: [1], heures_permises: { debut: '00:00', fin: '23:59' } }, plafond_jour: 20, cles_existantes: [], maintenant: '2026-11-09T10:00:00.000+01:00' }; d.etat = 'a_preparer'; } else if (false) d.etat = 'x';"), /^R1 /],
  ['un workflow actif', (M) => { M.W[DEV].active = true }, /^S1 presti-dep-devis : actif/],
  ['un chef appelable par tous', (M) => { M.W[FACT].settings.callerPolicy = 'any' }, /^S2 presti-dep-facturation : politique/],
  ['un nœud d’envoi dans un chef', (M) => { M.W[DEV].nodes.push({ name: 'Envoyer', type: 'n8n-nodes-base.emailSend', typeVersion: 2, position: [0, 0], parameters: {} }) }, /^G4 /],
  ['la porte « simulation » contournée', (M) => { M.W[FACT].connections['Entrée conforme ?'].main[0] = [{ node: 'Constituer les dossiers', type: 'main', index: 0 }] }, /^G4 presti-dep-facturation/],
  ['un contrat versionné retouché', (M) => { M.devis.entree.donnees.properties.evenements.maxItems = 500 }, /^C1 presti-dep-devis/],
  ['un calendrier de relances qui n’est pas celui du code', (M) => { M.facturation.entree = M.facturation.entree }, null],
  ['une sortie n8n retouchée après coup', (M) => { M.essais[0].sorties[0].resultat.cartes.push('h:faux') }, /^N1 essai \S+ \(presti-dep-/],
  ['une sortie épinglée retouchée', (M) => { const x = M.essais.find((y) => y.epingles?.['Appeler lib-decider']); x.epingles['Appeler lib-decider'][0].resultat.motif = 'pilote' }, /^P1 essai \S+ \/ Appeler lib-decider/],
].filter(([, , att]) => att)

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now()
  const M = chargerMonde()
  const K = lireCode({ lignes: [], devis: [], plans: [] })
  const erreurs = juger(M, K)
  if (erreurs.length) { console.error('✗ devis et facturation :\n  ' + erreurs.join('\n  ')); process.exit(1) }
  console.log(`✓ devis et facturation (${NOMS.length} exports, ${M.essais.length} essais n8n rejoués) : S, C, M1, G2, G4, G6, G7, D1 à D4, E1 à E3, B1 à B6, A1 à A4, I1, M2, R1, N1, P1, H1, H2 tenus`)
  let rouges = 0
  for (const [titre, muter, attendu] of MUTANTS) {
    const m = copie(M); let res
    try { muter(m); res = juger(m, K) } catch (err) { res = [`mutant inapplicable : ${err.message}`] }
    const ok = res.some((x) => attendu.test(x))
    if (ok) rouges++
    console.log(`  ${ok ? '✓' : '✗'} « ${titre} » → ${ok ? res.find((x) => attendu.test(x)).slice(0, 170) : 'RESTÉ VERT ou mauvaise raison : ' + (res[0] ?? 'aucune erreur')}`)
  }
  console.log(`devis-facture-n8n-qa : ${MUTANTS.length} mutants, ${rouges} rouges (${Math.round((Date.now() - t0) / 1000)} s)`)
  if (rouges !== MUTANTS.length) process.exit(1)
  console.log('OK')
}
