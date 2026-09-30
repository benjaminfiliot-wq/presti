// A0, le veilleur : sans modèle, il lit la base (le bus, la file de l'argent, l'état de l'envoi que 0111 tient), en fait des
// lignes d'Attention colorées et ordonnées, envoie tout de suite ce qui bloque, garde le reste pour « À faire », et envoie le
// digest de 7 h 30 et de 18 h 30 (heure de Paris), 3 notifications par jour au plus hors urgences. Il n'écrit rien du côté
// de l'envoi : la base a déjà coupé ; lui montre.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ops_battement, ops_evenement_ajouter, ops_etat, ops_stockage_octets, ops_agent_pause, ops_decision_creer } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { encaisseDuMois } from '@/lib/direction/stripe'
import { envoyerAlertes, garderAlerte, type Alerte, type Motif } from '@/lib/alertes'

export type Couleur = 'rouge' | 'orange' | 'jaune' | 'bleu'
export const URGENTS = ['paiement', 'appel', 'panne_agent', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'canal_arrete', 'gmail_bloque']
const ROUGES = ['panne_agent', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'jeton_meta_expire', 'canal_arrete', 'gmail_bloque', 'notice_perimee', 'jauge_pleine']
const JAUNES = ['agent_muet', 'disjoncteur', 'jeton_externe', 'stockage', 'technologie_en_pause', 'modele_suspendu', 'changer_message', 'bilan', 'vercel_pro', 'quota_haut', 'meta_erreur', 'non_mesure']
export const COULEURS: Record<string, Couleur> = Object.fromEntries([...ROUGES.map((m) => [m, 'rouge'] as const), ...JAUNES.map((m) => [m, 'jaune'] as const)])
export const AGENTS_DE_L_USINE = ['atelier_maquettes', 'livreur_usine', 'chef']

const MIN = 60_000
const HEURE = 3_600_000
const GO = 1_073_741_824
const JETON_META = 'presti-secrets/meta-bibliotheque-pubs.txt'
const CAPACITES_EPARGNEES = ['livraison', 'support', 'surveillance']

export type Ligne = { motif: string; couleur: Couleur; nombre: number; texte: string; geste: string }
type Interne = Ligne & { objet: string; urgent: boolean }
type Agent = { nom: string; capacites?: string[] | null; battement_le?: string | null; periode_minutes?: number | null; en_pause?: boolean | null; disjoncteur_ouvert?: boolean | null; disjoncteur?: boolean | null; jeton_externe_expire_le?: string | null }
type Decision = { id: string; question?: string; echeance?: string | null; defaut?: string | null; portee?: string | null }
type Etat = { agents?: Agent[]; decisions_ouvertes?: Decision[]; couts_mois?: number; notifications_jour?: number; interrupteurs?: unknown; taches?: unknown }
type Technologie = { technologie: string; etat?: string; pause_motif?: string | null }
type Envoi = {
  palier?: string | null; formulaire_coupe_jusqua?: string | null; formulaire_coupe_motif?: string | null; gmail_coupe_jusqua?: string | null
  meta_coupe_jusqua?: string | null; notice_verifiee_le?: string | null; bilan?: { le?: string | null; verdict?: string | null } | null
  technologies?: Technologie[]; modeles_suspendus?: ({ modele_id?: string } | string)[]; alerte_message?: unknown; formulaires_jour?: number; email_sollicite_jour?: number
}
type Carte = { couleur?: string; titre?: string; geste?: string }

/** Le jour de Paris (AAAA-MM-JJ) et l'heure de Paris, par Intl : le changement d'heure est celui de la base des fuseaux. */
const jourParis = (d: Date) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
function minutesParis(d: Date): number {
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0)
  return v('hour') * 60 + v('minute')
}

/** « matin » de 07 h 30 à 08 h 59, « soir » de 18 h 30 à 19 h 59, heure de Paris ; sinon null. */
export function creneauDigest(d: Date): 'matin' | 'soir' | null {
  const m = minutesParis(d)
  if (m >= 7 * 60 + 30 && m < 9 * 60) return 'matin'
  if (m >= 18 * 60 + 30 && m < 20 * 60) return 'soir'
  return null
}

const futur = (iso: string | null | undefined, t: number) => iso === 'infinity' || (!!iso && Date.parse(iso) > t)
const arrondi = (n: number) => Math.round(n)

/** Les modules d'autres fiches, chargés à la demande : absents, le veilleur garde ses propres titres (import protégé). */
async function carteDe(evenement: Record<string, unknown>): Promise<Carte | null> {
  try {
    const moduleDisjoncteurs: string = '@/lib/agents/acquisition/disjoncteurs'
    const m = (await import(moduleDisjoncteurs)) as { carteAttention?: (e: Record<string, unknown>) => Carte }
    return typeof m.carteAttention === 'function' ? m.carteAttention(evenement) : null
  } catch { return null }
}
async function etatsDesJauges(donnees: unknown, maintenant: Date): Promise<{ id?: string; libelle?: string; utilise?: number; plafond?: number; etat?: string }[] | null> {
  try {
    const moduleJauges: string = '@/lib/agents/acquisition/jauges'
    const m = (await import(moduleJauges)) as { calculerJauges?: (d: unknown, t: Date) => { etat?: string }[] }
    return typeof m.calculerJauges === 'function' ? m.calculerJauges(donnees, maintenant) : null
  } catch { return null }
}
/** Une lecture de la base par rpc : { ok, data } ; { absente } si la fonction n'existe pas encore (PGRST202). */
async function lire(fonction: string): Promise<{ ok: boolean; data?: unknown; absente?: boolean }> {
  try {
    const r = await supabaseAdmin.rpc(fonction)
    if (!r.error) return { ok: true, data: r.data }
    if (r.error.code === 'PGRST202') return { ok: false, absente: true }
    return { ok: false }
  } catch { return { ok: false } }
}

export async function veilleur({ maintenant = new Date() }: { maintenant?: Date } = {}) {
  const t = maintenant.getTime()
  const jour = jourParis(maintenant)
  const lignes: Interne[] = []
  const ajouter = (motif: string, objet: string, nombre: number, texte: string, geste: string, urgent = URGENTS.includes(motif)) =>
    lignes.push({ motif, couleur: COULEURS[motif] ?? 'jaune', nombre, texte, geste, objet, urgent })

  // 1. le battement et le passage (l'épreuve des 24 h les compte)
  await ops_battement({ p_nom: 'a0' })
  await ops_evenement_ajouter({ p_agent: 'a0', p_type: 'passage', p_objet: null, p_resume: 'passage du veilleur', p_tache: null })

  // 2. les lectures : une lecture qui échoue devient « non mesuré », jamais une exception
  const re = await ops_etat()
  const etat: Etat | null = re.ok && re.data && typeof re.data === 'object' ? (re.data as Etat) : null
  if (!etat) ajouter('non_mesure', 'ops_etat', 1, 'L’état du bus n’a pas pu être lu : agents, décisions et coûts non mesurés.', 'relancer le passage ; si cela dure, lire les journaux Vercel du tic')
  const rs = await ops_stockage_octets()
  const octets = rs.ok && typeof rs.data === 'number' ? rs.data : rs.ok && typeof rs.data === 'string' ? Number(rs.data) : null
  if (octets === null) ajouter('non_mesure', 'stockage', 1, 'Le stockage de la base n’a pas pu être mesuré.', 'regarder la taille de la base dans le tableau de bord Supabase')
  const ra = await lire('ops_argent_etat')
  const argent = ra.ok ? (ra.data as { en_file?: number; plus_vieux_s?: number; abandonnes_24h?: number; non_faits_plus_de_15_min?: number } | null) : null
  if (!argent) ajouter('non_mesure', 'argent', 1, 'La file de l’argent n’a pas pu être lue.', 'lancer node scripts/file-argent-qa.mjs --reel depuis le poste')
  const rd = await lire('acq_disjoncteurs_etat')
  const envoi = rd.ok ? (rd.data as Envoi | null) : null
  if (!rd.ok && !rd.absente) ajouter('non_mesure', 'envoi', 1, 'L’état de l’envoi n’a pas pu être lu.', 'ouvrir la salle des envois de la station')
  const rj = await lire('acq_jauges')
  const pause = await pauseGenerale().catch(() => ({ active: false }))
  const encaisse = await encaisseDuMois()
  const brut = encaisse.valeur ? encaisse.valeur.brut : null

  // 3. les agents, l'usine, les disjoncteurs d'agents, les jetons, le stockage, l'argent
  const agents = etat?.agents ?? []
  const age = (a: Agent) => (a.battement_le ? t - Date.parse(a.battement_le) : null)
  const muet = (a: Agent) => { const x = age(a); return x !== null && !!a.periode_minutes && x > 2 * a.periode_minutes * MIN }
  const usine = agents.find((a) => a.nom === 'usine')
  const usineMuette = !!usine && muet(usine)
  if (usine && usineMuette) {
    const aussi = agents.filter((a) => AGENTS_DE_L_USINE.includes(a.nom) && muet(a)).map((a) => a.nom)
    ajouter('usine_injoignable', 'usine', arrondi((age(usine) ?? 0) / MIN), `L’usine ne bat plus depuis ${arrondi((age(usine) ?? 0) / MIN)} min${aussi.length ? ` ; muets avec elle : ${aussi.join(', ')}` : ''}.`, 'node scripts/usine.mjs etat depuis le poste ; si l’instance a été reprise : docs/agents/usine.md, section Reprise par le poste')
  }
  for (const a of agents) {
    if (['a0', 'systeme', 'usine'].includes(a.nom) || !a.battement_le || a.en_pause || pause.active) continue
    if (usineMuette && AGENTS_DE_L_USINE.includes(a.nom)) continue
    const x = age(a) ?? 0
    const seuil = 2 * (a.periode_minutes ?? 0) * MIN
    if (!a.periode_minutes || x <= seuil) continue
    if (x > seuil + 2 * HEURE) ajouter('panne_agent', a.nom, arrondi(x / MIN), `${a.nom} ne bat plus depuis ${arrondi(x / HEURE)} h (période de ${a.periode_minutes} min).`, `lire les journaux de ${a.nom} ; le relancer depuis la station`)
    else ajouter('agent_muet', a.nom, arrondi(x / MIN), `${a.nom} est muet depuis ${arrondi(x / MIN)} min (période de ${a.periode_minutes} min).`, `vérifier que ${a.nom} tourne ; il sonnera en panne après 2 h de plus`)
  }
  for (const a of agents) {
    if (a.disjoncteur_ouvert === true || a.disjoncteur === true) ajouter('disjoncteur', a.nom, 1, `Le disjoncteur de ${a.nom} est ouvert.`, `lire la cause dans la station, puis reprendre ${a.nom} depuis la station`)
    if (a.jeton_externe_expire_le) {
      const reste = Date.parse(a.jeton_externe_expire_le) - t
      if (reste <= 0) ajouter('jeton_meta_expire', a.nom, arrondi(-reste / (24 * HEURE)), `Le jeton Meta de ${a.nom} a expiré.`, `coller le nouveau jeton dans ${JETON_META} ; Claude Code le pose`)
      else if (reste <= 7 * 24 * HEURE) ajouter('jeton_externe', a.nom, Math.ceil(reste / (24 * HEURE)), `Le jeton Meta de ${a.nom} expire dans ${Math.ceil(reste / (24 * HEURE))} jour(s).`, `générer un nouveau jeton Meta et le coller dans ${JETON_META} ; Claude Code le pose, jeton-meta-poser.mjs`)
    }
  }
  if (octets !== null && octets > 0.6 * GO) ajouter('stockage', 'base', arrondi((octets / GO) * 100), `La base occupe ${arrondi(octets / 1_048_576)} Mo sur 1 024 (${arrondi((octets / GO) * 100)} %).`, 'purger les événements anciens (ops_evenements_purger) ou passer à l’offre supérieure de Supabase')
  if (argent && ((argent.abandonnes_24h ?? 0) > 0 || (argent.non_faits_plus_de_15_min ?? 0) > 0)) ajouter('argent_bloque', 'file', (argent.abandonnes_24h ?? 0) + (argent.non_faits_plus_de_15_min ?? 0), `File de l’argent : ${argent.abandonnes_24h ?? 0} message(s) abandonné(s) en 24 h, ${argent.non_faits_plus_de_15_min ?? 0} en attente depuis plus de 15 min.`, 'lancer node scripts/file-argent-qa.mjs --reel ; vérifier que chaque commande payée a sa tâche livrer_site')

  // 4. l'envoi, tel que la base le tient (aucune écriture de ce côté)
  if (envoi) {
    const tech = (envoi.technologies ?? []).filter((x) => x.etat === 'pause')
    if (tech.length) {
      const c = await carteDe({ type: 'disjoncteur_technologie', nombre: tech.length })
      ajouter('technologie_en_pause', 'formulaire_site', tech.length, c?.titre ?? `${tech.length} technologie(s) de formulaire en pause : ${tech.map((x) => `${x.technologie} (${x.pause_motif ?? '3 échecs de soumission d’affilée'})`).join(', ')}.`, c?.geste ?? 'reprendre la technologie depuis la station quand la cause est comprise')
    }
    if (futur(envoi.formulaire_coupe_jusqua, t)) {
      const cause = envoi.formulaire_coupe_motif ?? (envoi.formulaire_coupe_jusqua === 'infinity' ? '2 plaintes en 7 jours : arrêt jusqu’à ta décision' : '1 avis d’abus : arrêt de 48 h')
      const c = await carteDe({ type: 'disjoncteur_formulaire', cause })
      ajouter('canal_arrete', 'formulaire_site', 1, c?.titre ?? `Formulaire arrêté : ${cause}.`, c?.geste ?? 'lire la salle des envois ; rouvrir le canal depuis la station quand la cause est réglée')
    }
    if (futur(envoi.gmail_coupe_jusqua, t)) ajouter('gmail_bloque', 'gmail', 1, 'Le Gmail de prospection refuse (mot de passe d’application ou quota).', 'vérifier le mot de passe d’application dans Vercel ; les envois reprennent seuls après 24 h')
    if (envoi.notice_verifiee_le && t - Date.parse(envoi.notice_verifiee_le) > 7 * 24 * HEURE) ajouter('notice_perimee', 'notice', arrondi((t - Date.parse(envoi.notice_verifiee_le)) / (24 * HEURE)), 'La notice en ligne ne répond plus ou a changé : le formulaire est arrêté.', 'Claude Code la republie (026-162)')
    if (futur(envoi.meta_coupe_jusqua, t)) ajouter('meta_erreur', 'meta', 1, 'Meta a refusé : les réponses privées et la messagerie sont coupées pour 24 h.', 'aucun agent ne résout jamais un captcha : attendre la fin de la coupure ; si elle revient, ouvrir le compte Meta')
    const suspendus = envoi.modeles_suspendus ?? []
    if (suspendus.length) ajouter('modele_suspendu', 'modeles', suspendus.length, `${suspendus.length} modèle(s) de message suspendu(s) (4 STOP sur 100 envois).`, 'le modèle suivant a pris le relais ; en écrire un nouveau et l’approuver, ou lever la suspension depuis la station, sous mot de passe')
    const alerte = Array.isArray(envoi.alerte_message) ? envoi.alerte_message.length : envoi.alerte_message ? 1 : 0
    if (alerte) ajouter('changer_message', 'message', alerte, '300 envois d’une technologie sans réponse : le message ne prend pas.', 'écrire un nouveau message et l’approuver depuis la station')
    if (envoi.bilan?.le === jour) {
      const v = envoi.bilan.verdict ?? null
      const geste = v === 'P3' ? 'rien à faire : le palier monte' : v === 'nouveau_message' ? 'approuver le nouveau message ; P2 prolongé de 10 jours ouvrés' : v === 'arret_froid' ? 'choisir un autre segment ou une autre offre' : 'lire le bilan dans la station ce soir'
      ajouter('bilan', 'bilan', 1, `Jour du bilan des 100 premiers contacts froids${v ? ` : verdict ${v}` : ''}.`, geste)
    }
  }

  // les jauges : l'état vient de calculerJauges (026-064), jamais d'un second calcul ici
  if (rj.ok) {
    const jauges = await etatsDesJauges(rj.data, maintenant)
    for (const j of jauges ?? []) {
      const nom = j.libelle ?? j.id ?? 'jauge'
      if (j.etat === 'pleine') ajouter('jauge_pleine', String(j.id ?? nom), j.utilise ?? 0, `Jauge pleine : ${j.utilise ?? '?'} sur ${j.plafond ?? '?'} (${nom}).`, 'l’agent concerné attend la remise à zéro de la jauge ; relever le plafond est un geste de Benj')
      else if (j.etat === 'attention') ajouter('quota_haut', String(j.id ?? nom), j.utilise ?? 0, `${j.utilise ?? '?'} sur ${j.plafond ?? '?'} ce mois-ci chez ${nom}.`, 'surveiller : la jauge approche de son plafond')
    }
  }

  // Vercel Pro au premier site vendu : une seule décision (idempotente par clé)
  if (brut !== null && brut > 0) {
    await ops_decision_creer({ p_agent: 'a0', p_question: 'Le premier site est vendu : passer Vercel en Pro ?', p_contexte: 'Vercel Pro (20 $ par mois) est la seule dépense décidée, au premier site vendu.', p_options: [{ cle: 'passer', libelle: 'Passer en Pro', recommandee: true }, { cle: 'rappeler_demain', libelle: 'Rappeler demain', recommandee: false }], p_defaut: 'rappeler_demain', p_montant_cents: 2000, p_portee: 'argent', p_echeance: new Date(t + 24 * HEURE).toISOString(), p_cle: 'vercel_pro', p_tache: null })
    ajouter('vercel_pro', 'vercel', 1, 'Premier site vendu : c’est le moment de passer Vercel en Pro.', 'passer Vercel en Pro : c’est la seule dépense décidée')
  }

  // 5. le coupe-circuit : tout euro de coût sans recette (plafond de 0 € par agent)
  const couts = Number(etat?.couts_mois ?? 0)
  if (couts > 0) {
    if (brut === null) ajouter('non_mesure', 'recette', 1, `Coûts du mois : ${arrondi(couts)} € ; la recette est inconnue, le coupe-circuit attend.`, 'vérifier que Stripe répond (onglet Aujourd’hui)')
    else if (brut === 0) {
      const epargne = (a: Agent) => ['a0', 'systeme'].includes(a.nom) || (a.capacites ?? []).some((c) => CAPACITES_EPARGNEES.includes(c))
      const coupes = agents.filter((a) => !epargne(a) && !a.en_pause)
      for (const a of coupes) await ops_agent_pause({ p_nom: a.nom, p_pause: true, p_motif: 'coupe-circuit : des euros dépensés sans recette' })
      const mois = jour.slice(0, 7)
      await ops_decision_creer({ p_agent: 'a0', p_question: 'Coupe-circuit : des euros dépensés ce mois sans aucune recette. Laisser les agents en pause ?', p_contexte: `Agents mis en pause : ${coupes.map((a) => a.nom).join(', ') || 'aucun'}.`, p_options: [{ cle: 'laisser_en_pause', libelle: 'Laisser en pause', recommandee: true }, { cle: 'reprendre', libelle: 'Reprendre', recommandee: false }], p_defaut: 'laisser_en_pause', p_montant_cents: null, p_portee: 'argent', p_echeance: new Date(t + 24 * HEURE).toISOString(), p_cle: `coupe_circuit:${mois}`, p_tache: null })
      ajouter('coupe_circuit', mois, coupes.length, `Coupe-circuit : ${arrondi(couts)} € dépensés ce mois sans recette ; ${coupes.length} agent(s) en pause.`, 'trancher la décision du coupe-circuit dans la station')
    }
  }

  // 6. l'ordre : rouge, orange, jaune, puis l'ordre d'apparition ; 7 au plus
  const rang: Record<Couleur, number> = { rouge: 0, orange: 1, jaune: 2, bleu: 3 }
  const triees = lignes.map((l, i) => ({ l, i })).sort((a, b) => rang[a.l.couleur] - rang[b.l.couleur] || a.i - b.i).map((x) => x.l)
  const attention: Ligne[] = triees.slice(0, 7).map(({ motif, couleur, nombre, texte, geste }) => ({ motif, couleur, nombre, texte, geste }))

  // 7. les urgents partent tout de suite (clés datées du jour de Paris) ; les autres sont gardés pour « À faire »
  const alerte = (l: Interne): Alerte => ({ motif: l.motif as Motif, a: 'entreprise', cle: `${l.motif}:${l.objet}:${jour}`, sujet: `Presti — ${l.texte.slice(0, 120)}`, corps: `${l.texte}\n\nÀ faire : ${l.geste}` })
  const urgents = triees.filter((l) => l.urgent)
  const envoyes = urgents.length ? await envoyerAlertes(urgents.map(alerte)) : 0
  for (const l of triees.filter((x) => !x.urgent)) await garderAlerte(alerte(l))

  // 8. le digest
  let digest: string | null = null
  let notifications = 0
  const creneau = creneauDigest(maintenant)
  if (creneau && Number(etat?.notifications_jour ?? 0) < 3) {
    const corps = corpsDigest({ attention, etat, argent, envoi, octets, pause: pause.active, encaisse: { brut, a: encaisse.a, source: encaisse.source }, t, jour })
    const n = await envoyerAlertes([{ motif: 'digest', a: 'entreprise', cle: `agents:${jour}:${creneau}`, sujet: `Presti — le point du ${creneau}`, corps }])
    if (n > 0) {
      digest = corps
      notifications = n
      await ops_evenement_ajouter({ p_agent: 'a0', p_type: 'notification', p_objet: null, p_resume: `digest du ${creneau}`, p_tache: null })
    }
  }
  return { attention, urgents: envoyes, digest, notifications }
}

function corpsDigest(x: { attention: Ligne[]; etat: Etat | null; argent: Record<string, number | undefined> | null; envoi: Envoi | null; octets: number | null; pause: boolean; encaisse: { brut: number | null; a: string; source: string }; t: number; jour: string }): string {
  const L: string[] = []
  const heure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(x.encaisse.a))
  L.push(`Argent : ${x.encaisse.brut === null ? 'non mesuré (Stripe injoignable)' : `${x.encaisse.brut.toFixed(2).replace('.', ',')} € encaissés ce mois`} (source ${x.encaisse.source}, lu à ${heure})`)
  const decisions = (x.etat?.decisions_ouvertes ?? []).slice(0, 5)
  L.push('', `À décider : ${decisions.length}`)
  for (const d of decisions) L.push(`- ${d.portee ?? 'décision'}${d.echeance ? `, échéance ${new Date(d.echeance).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}` : ''} : /controle?onglet=pilotage&decision=${d.id}`)
  L.push('', `Attention : ${x.attention.length}`)
  for (const l of x.attention) L.push(`- ${l.couleur} — ${l.texte} → ${l.geste}`)
  const agents = x.etat?.agents ?? []
  L.push('', `Agents : ${agents.length}, dont ${agents.filter((a) => a.en_pause).length} en pause`)
  const u = agents.find((a) => a.nom === 'usine')
  L.push('', `Usine : ${u?.battement_le ? `dernier battement il y a ${arrondi((x.t - Date.parse(u.battement_le)) / MIN)} min` : 'pas encore semée'}`)
  const e = x.envoi
  L.push('', `Délivrabilité : ${e ? `palier ${e.palier ?? '—'} ; formulaires du jour ${e.formulaires_jour ?? 0} ; email_sollicite du jour ${e.email_sollicite_jour ?? 0} ; technologies en pause ${(e.technologies ?? []).filter((t) => t.etat === 'pause').length} ; notice vérifiée le ${e.notice_verifiee_le ? new Date(e.notice_verifiee_le).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : '—'} ; bilan le ${e.bilan?.le ?? '—'}` : 'pas encore d’envoi'}`)
  L.push('', `File de l’argent : ${x.argent ? `${x.argent.en_file ?? 0} en file, plus vieux ${x.argent.plus_vieux_s ?? 0} s, ${x.argent.abandonnes_24h ?? 0} abandonné(s) en 24 h, ${x.argent.non_faits_plus_de_15_min ?? 0} en attente depuis plus de 15 min` : 'non mesurée'}`)
  L.push('', `Stockage : ${x.octets === null ? 'non mesuré' : `${arrondi(x.octets / 1_048_576)} Mo sur 1 024 (${arrondi((x.octets / GO) * 100)} %)`}`)
  L.push('', `Pause générale : ${x.pause ? 'ACTIVE' : 'non'}`)
  L.push('', `Coûts du mois : ${arrondi(Number(x.etat?.couts_mois ?? 0))} € (0 € attendu)`)
  return L.join('\n')
}
