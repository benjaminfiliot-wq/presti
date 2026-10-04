// scripts/fixtures/026-garde/doublon/controles.mjs — le contrôle « JA-3 » du lot gdoublon : les jeux d'essai de garde-doublon-qa se
// contrôlent eux-mêmes. Une doublure fausse ferait rougir (ou verdir) le juge pour une mauvaise raison ; ce contrôle attrape la
// doublure, pas le Facteur. fonction(ctx) → { echecs, detail }
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const T = path.dirname(new URL(import.meta.url).pathname)

export async function controleJeuxGD(ctx) {
  const e = []
  const d = []
  const D = await import(pathToFileURL(path.join(T, 'doublures.mjs')).href)

  // ── Les lignes d'essai : la forme de EnvoiApprouve, aucune donnée réelle ─────────────────────────────────────────────────
  const CHAMPS = ['id', 'prospect_id', 'type', 'canal', 'envoyeur', 'destinataire', 'objet', 'texte', 'empreinte_texte', 'modele_id', 'variante', 'fait_id', 'douleur_id', 'fil_envoi_id', 'conversation_id', 'preuve_demande', 'reference', 'verdicts', 'prepare_le']
  for (const [nom, l] of [['ligne', D.ligne(1)], ['ligneMeta', D.ligneMeta(1)], ['ligneFormulaire', D.ligneFormulaire(1)]]) {
    for (const c of CHAMPS) if (!(c in l)) e.push(`${nom} : champ ${c} absent (forme EnvoiApprouve)`)
    if (!/^[0-9a-f]{64}$/.test(l.empreinte_texte)) e.push(`${nom} : empreinte_texte n'est pas un sha256`)
  }
  if (!D.ligne(1).destinataire.endsWith('.invalid') || !D.ligneFormulaire(1).destinataire.includes('.invalid')) e.push('une adresse d\'essai n\'est pas en .invalid (aucune donnée réelle)')
  if (D.ligneMeta(1).envoyeur !== 'repondeur' || D.ligneFormulaire(1).envoyeur !== 'facteur_usine' || D.ligne(1).envoyeur !== 'gmail') e.push('les trois envoyeurs (gmail, repondeur, facteur_usine) ne sont pas portés par les trois lignes types')
  d.push('lignes types des trois envoyeurs, .invalid')

  // ── La base d'essai : atomique, clé unique, envoye refusé hors réservation, relâchement d'un refus net ────────────────────────
  const b = D.creerBase({ lignes: [D.ligne(1), D.ligne(2, { destinataire: 'x@essai.invalid' }), D.ligne(3), D.ligne(4)], quotas: { email_sollicite: 2 } })
  const c = 'a'.repeat(64)
  const deux = await Promise.all([b.reserverEnvoi('env-0001', c), b.reserverEnvoi('env-0001', c)])
  if (deux.filter((x) => x.ok).length !== 1) e.push('la base d\'essai n\'est pas atomique (deux réservations simultanées de la même ligne ont réussi)')
  if ((await b.reserverEnvoi('env-0002', c)).raison !== 'deja_reserve') e.push('la clé d\'idempotence n\'est pas unique dans la base d\'essai')
  if ((await b.reserverEnvoi('env-0002', 'b'.repeat(64))).ok !== true) e.push('une seconde réservation, de clé différente, échoue')
  if ((await b.reserverEnvoi('env-0003', 'd'.repeat(64))).raison !== 'plafond') e.push('le plafond du jour n\'est pas tenu par la base d\'essai (plafond 2, 2 déjà réservés)')
  b.mettrePause(true)
  if ((await b.reserverEnvoi('env-0004', 'e'.repeat(64))).raison !== 'pause') e.push('la pause n\'est pas lue à la réservation dans la base d\'essai')
  b.mettrePause(false)
  let refus = null; try { await b.marquerEnvoye('env-0003', {}) } catch (err) { refus = err.message }
  if (refus !== 'ops:envoye_sans_reservation') e.push('la base d\'essai accepte envoye sans réservation')
  await b.marquerEchec('env-0001', 'auth')
  if (b.etat('env-0001').statut !== 'approuve' || b.cles.has(c)) e.push('un refus net ne relâche pas la réservation (statut et clé)')
  await b.marquerIncertain('env-0002', 'x')
  await b.marquerEchec('env-0002', 'x')
  if (b.etat('env-0002').statut !== 'envoi_incertain') e.push('un envoi incertain revient à approuve (renvoi automatique) : la base d\'essai doit l\'interdire')
  if (!b.reconcilier('env-0002', 'parti').ok || b.etat('env-0002').statut !== 'envoye') e.push('la réconciliation « parti » ne consigne pas envoye')
  d.push('base atomique, clé unique, plafond, pause, envoye refusé hors réservation, relâchement net, incertain sans retour')

  // ── Le plafond est compté au jour de Paris, pas au jour UTC ───────────────────────────────────────────────────────────────
  if (D.jourParis(Date.parse('2026-10-14T21:30:00Z')) === D.jourParis(Date.parse('2026-10-14T22:30:00Z'))) e.push('jourParis ne change pas à minuit à Paris (22 h UTC en octobre)')
  d.push('jour de Paris')

  // ── Les doublures de transport : un envoi est consigné avec l'état de la base au moment de l'appel ─────────────────────────────
  const ch = D.chronometre(), base = D.creerBase({ chrono: ch, lignes: [D.ligne(1)] })
  const g = D.creerGmail({ chrono: ch, base, mode: 'injoignable_apres_envoi' })
  await base.reserverEnvoi('env-0001', c)
  const s = await g.envoyer({ a: D.ligne(1).destinataire, objet: 'x', texte: 'y' })
  if (g.appels[0]?.etatBase?.statut !== 'en_cours_envoi') e.push('le Gmail factice ne consigne pas l\'état de la base au moment de l\'appel')
  if (s.ok !== false || g.livres.length !== 1) e.push('le mode injoignable_apres_envoi doit LIVRER le message et rendre injoignable')
  d.push('Gmail factice : état de la base consigné, livraison distincte de la réponse')

  // ── Le témoin : chaque fichier suffixé, aucun fichier vide, les trois apports ─────────────────────────────────────────────────
  const dossier = path.join(T, 'temoin')
  const tous = []
  const marcher = (x) => { for (const f of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, f.name); if (f.isDirectory()) marcher(p); else tous.push(p) } }
  marcher(dossier)
  for (const f of tous) {
    if (!f.endsWith('.temoin')) e.push(`témoin : ${path.relative(T, f)} sans le suffixe .temoin`)
    if (fs.statSync(f).size === 0) e.push(`témoin : ${path.relative(T, f)} vide`)
  }
  for (const attendu of ['lib/agents/acquisition/facteur.ts.temoin', 'lib/agents/acquisition/contrat.ts.temoin', 'lib/agents/acquisition/magasinSupabase.ts.temoin', 'supabase/migrations/0121_reservation_envoi.sql.temoin']) {
    if (!tous.some((f) => f.split(path.sep).join('/').endsWith(`temoin/${attendu}`))) e.push(`témoin : ${attendu} absent`)
  }
  d.push(`${tous.length} fichiers de témoin suffixés, non vides`)

  // ── Le juge se contrôle lui-même (sans aucun module jugé) ─────────────────────────────────────────────────────────────────
  if (ctx?.lancerNode) {
    const r = ctx.lancerNode(['--import', './scripts/ts-loader.mjs', 'scripts/garde-doublon-qa.mjs', '--auto-controle'], { nom: 'auto-controle' })
    if (r.code !== 0 || !/PASS/.test(r.sortie)) e.push(`garde-doublon-qa --auto-controle : code ${r.code}, « ${String(r.sortie).trim().split('\n').pop()} »`)
    else d.push('--auto-controle PASS')
  }
  return { echecs: e, detail: d.join(' ; ') }
}
