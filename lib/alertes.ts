import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { sendEmail, notifierEntreprise, EMAIL_ENTREPRISE } from '@/lib/email'
import { planConf } from '@/lib/plans'

// Les alertes de Presti (prompt v6 §6) : Benj doit être prévenu AVANT que ça casse.
//
// Le 04/09/2026, le solde de l'API s'est vidé en pleine journée et tout le produit s'est arrêté
// sans qu'aucun signal ne parte. `lib/alerteService.ts` a réglé le cas « le service est déjà
// tombé ». Ce fichier règle les cas « ça va tomber » et « ça mérite un œil » : budget IA qui
// s'épuise, crédits d'un artisan à sec, erreurs en rafale, cron muet, domaine mail cassé,
// révocation de sessions, et le point hebdomadaire du lundi.
//
// Trois règles, valables pour chaque alerte :
// · UNE fois par motif et par jour (verrou `consommerLimite`), sinon on inonde et on finit ignoré.
// · Un sujet explicite, une action recommandée, un lien direct. Jamais « quelque chose ne va pas ».
// · Ne jamais jeter : une alerte qui échoue est journalisée, elle ne fait pas échouer le cron.
//
// La vérification tourne en « à sec » (rien n'est envoyé, on rend ce qui partirait) ou en réel.
// Chaque motif se simule pour prouver le tuyau de bout en bout : `?simuler=<motif>`.

export type Motif = 'solde_ia' | 'credits_artisan' | 'paiement' | 'erreurs' | 'cron_muet' | 'domaine_mail' | 'securite' | 'digest'

export type Alerte = {
  motif: Motif
  sujet: string
  corps: string
  /** 'entreprise' → adresse des alertes ; sinon l'artisan concerné. */
  a: 'entreprise' | { email: string; artisanId: string }
  /** Clé de dédoublonnage : un motif peut concerner plusieurs artisans le même jour. */
  cle?: string
}

const LIEN_CONSOLE_ANTHROPIC = 'https://console.anthropic.com/settings/billing'
const LIEN_APP = 'https://prestiapp.fr'
const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

// ── 1. Le budget IA du mois ──────────────────────────────────────────────────
/**
 * Coût cumulé du mois via l'API Admin d'Anthropic. Demande ANTHROPIC_ADMIN_KEY (clé d'organisation,
 * pas la clé d'usage) et BUDGET_IA_MENSUEL_EUR. Sans les deux, la vérification est sautée et le dit.
 *
 * ⚠️ La forme exacte de la réponse (montant en dollars ou en centimes, chaîne ou nombre) sera
 * confirmée sur une vraie réponse dès que la clé existera (action humaine H5). D'ici là, le calcul
 * additionne tout champ `amount` numérique et le signale dans `detail` pour contrôle.
 */
export async function coutIADuMois(): Promise<{ usd: number; brut?: unknown; erreur?: string } | null> {
  const cle = process.env.ANTHROPIC_ADMIN_KEY
  if (!cle) return null
  const debut = new Date(); debut.setUTCDate(1); debut.setUTCHours(0, 0, 0, 0)
  const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${debut.toISOString()}&bucket_width=1d&limit=31`
  try {
    const r = await fetch(url, { headers: { 'x-api-key': cle, 'anthropic-version': '2023-06-01' } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return { usd: 0, erreur: `${r.status} ${JSON.stringify(j).slice(0, 160)}` }
    let total = 0
    const visiter = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(visiter)
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>
        if ('amount' in o) { const n = Number(o.amount); if (Number.isFinite(n)) total += n }
        Object.values(o).forEach(visiter)
      }
    }
    visiter(j)
    return { usd: total, brut: Array.isArray((j as { data?: unknown[] }).data) ? (j as { data: unknown[] }).data.slice(0, 1) : j }
  } catch (e) {
    return { usd: 0, erreur: e instanceof Error ? e.message : String(e) }
  }
}

async function verifierSoldeIA(): Promise<Alerte[]> {
  const budget = Number(process.env.BUDGET_IA_MENSUEL_EUR)
  const cout = await coutIADuMois()
  if (!cout || !Number.isFinite(budget) || budget <= 0) return []
  if (cout.erreur) return [{ motif: 'solde_ia', a: 'entreprise', cle: 'lecture',
    sujet: 'Le budget IA ne peut pas être lu',
    corps: `L’API Admin d’Anthropic a répondu : ${cout.erreur}\n\nSans cette lecture, personne ne verra venir la fin du budget. Vérifie ANTHROPIC_ADMIN_KEY sur Vercel.` }]
  const taux = Number(process.env.TAUX_USD_EUR) || 0.92
  const depense = cout.usd * taux
  const jour = new Date().getUTCDate()
  const joursDuMois = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0).getDate()
  const projection = (depense / Math.max(jour, 1)) * joursDuMois
  const part = depense / budget
  const seuil = part >= 0.9 ? '90' : part >= 0.7 ? '70' : projection > budget ? 'projection' : null
  if (!seuil) return []
  const finEstimee = new Date(); finEstimee.setUTCDate(jour + Math.max(1, Math.floor((budget - depense) / Math.max(depense / Math.max(jour, 1), 0.01))))
  return [{ motif: 'solde_ia', a: 'entreprise', cle: seuil,
    sujet: seuil === 'projection' ? 'Budget IA : à ce rythme, dépassé avant la fin du mois' : `Budget IA : ${seuil} % consommés`,
    corps: `Dépensé ce mois : ${euros(depense)} sur ${euros(budget)} (${Math.round(part * 100)} %).\nProjection à fin de mois : ${euros(projection)}.\nÀ ce rythme, le budget est épuisé vers le ${finEstimee.toLocaleDateString('fr-FR')}.\n\nRecharger ou relever le budget : ${LIEN_CONSOLE_ANTHROPIC}\n\nRappel : quand le solde tombe à zéro, TOUT le produit s’arrête pour tous les artisans.` }]
}

// ── 2. Les crédits des artisans ──────────────────────────────────────────────
async function verifierCreditsArtisans(lundi: boolean): Promise<Alerte[]> {
  const { data } = await supabaseAdmin.from('artisans').select('id, email, nom, plan, credits, credits_reset_le, is_founder')
    .not('email', 'like', '%@presti-test.invalid')
  const out: Alerte[] = []
  const aSec: string[] = []
  for (const a of data ?? []) {
    if (a.is_founder || !a.email) continue
    const conf = planConf(a.plan)
    const max = conf.creditsMois || 1
    const credits = Number(a.credits ?? 0)
    if (credits <= 0) aSec.push(`${a.nom ?? a.email} (${a.plan ?? 'gratuit'})`)
    const bas = credits <= 0 || credits <= Math.ceil(max * 0.2)
    if (!bas) continue
    const renouv = a.credits_reset_le ? new Date(a.credits_reset_le).toLocaleDateString('fr-FR') : 'le mois prochain'
    out.push({ motif: 'credits_artisan', a: { email: a.email, artisanId: a.id }, cle: `${a.id}:${credits <= 0 ? 'zero' : 'bas'}`,
      sujet: credits <= 0 ? 'Vos crédits sont épuisés' : `Il vous reste ${credits} crédits sur ${max}`,
      corps: credits <= 0
        ? `Vos crédits sont à zéro : l’assistant ne répond plus à vos clients et ne chiffre plus de devis jusqu’au renouvellement, ${renouv}.\n\nPour ne rien manquer d’ici là, passez à l’offre supérieure : ${LIEN_APP}/abonnement`
        : `Il vous reste ${credits} crédits sur ${max} ce mois-ci. Renouvellement ${renouv}.\n\nSi votre activité grandit, l’offre supérieure vous en donne davantage : ${LIEN_APP}/abonnement` })
  }
  if (lundi && aSec.length) out.push({ motif: 'credits_artisan', a: 'entreprise', cle: 'hebdo',
    sujet: `${aSec.length} compte(s) à zéro crédit cette semaine`,
    corps: `Ces artisans ont épuisé leurs crédits — signal de montée en gamme :\n- ${aSec.join('\n- ')}` })
  return out
}

// ── 3. Les erreurs en rafale ─────────────────────────────────────────────────
async function verifierErreurs(): Promise<Alerte[]> {
  const depuis = new Date(Date.now() - 10 * 60_000).toISOString()
  const { data, error } = await supabaseAdmin.from('app_errors').select('route, message, created_at').gte('created_at', depuis).limit(50)
  if (error || !data || data.length < 5) return []
  const parRoute = new Map<string, number>()
  for (const e of data) parRoute.set(String(e.route ?? '?'), (parRoute.get(String(e.route ?? '?')) ?? 0) + 1)
  const pire = [...parRoute.entries()].sort((a, b) => b[1] - a[1])[0]
  return [{ motif: 'erreurs', a: 'entreprise', cle: pire[0],
    sujet: `Presti a produit ${data.length} erreurs en 10 min`,
    corps: `${data.length} erreurs entre ${new Date(depuis).toLocaleTimeString('fr-FR')} et maintenant, dont ${pire[1]} sur ${pire[0]}.\n\nExtrait :\n${data.slice(0, 5).map((e) => `- ${e.route ?? '?'} — ${String(e.message ?? '').slice(0, 120)}`).join('\n')}\n\nJournaux : https://vercel.com` }]
}

// ── 4. Les crons muets ───────────────────────────────────────────────────────
const CRONS_ATTENDUS: { nom: string; maxHeures: number }[] = [
  { nom: 'relances', maxHeures: 26 }, { nom: 'canaux-relever', maxHeures: 26 }, { nom: 'alertes', maxHeures: 26 },
]
export async function enregistrerPassage(nom: string, detail: Record<string, unknown> = {}, reussi = true): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('passages_cron').upsert({ nom, dernier_passage: new Date().toISOString(), detail, reussi }, { onConflict: 'nom' })
    if (error) console.error('[alertes] passage', nom, error.message)
  } catch (e) { console.error('[alertes] passage', nom, e instanceof Error ? e.message : e) }
}
async function verifierCrons(): Promise<Alerte[]> {
  const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi')
  if (error) return [] // table absente (migration 0057 pas encore posée) : rien à dire encore
  const out: Alerte[] = []
  for (const c of CRONS_ATTENDUS) {
    const p = (data ?? []).find((x) => x.nom === c.nom)
    if (!p) continue // jamais passé encore : on ne peut pas dire qu'il est en retard
    const age = (Date.now() - new Date(p.dernier_passage).getTime()) / 3_600_000
    if (age > c.maxHeures) out.push({ motif: 'cron_muet', a: 'entreprise', cle: c.nom,
      sujet: `La tâche « ${c.nom} » n’a pas tourné depuis ${Math.round(age)} h`,
      corps: `Dernier passage : ${new Date(p.dernier_passage).toLocaleString('fr-FR')}${p.reussi ? '' : ' (en erreur)'}.\nAttendu au moins toutes les ${c.maxHeures} h.\n\nVérifie le cron sur Vercel (vercel.json) et CRON_SECRET.` })
    else if (!p.reussi) out.push({ motif: 'cron_muet', a: 'entreprise', cle: `${c.nom}:erreur`,
      sujet: `La tâche « ${c.nom} » a tourné mais a échoué`,
      corps: `Dernier passage : ${new Date(p.dernier_passage).toLocaleString('fr-FR')}, terminé en erreur. Regarde ses journaux sur Vercel.` })
  }
  return out
}

// ── 5. Le domaine et le mail ─────────────────────────────────────────────────
async function dns(nom: string, type: string): Promise<string[]> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${nom}&type=${type}`)
    const d = await r.json()
    return ((d.Answer ?? []) as { data?: string }[]).map((a) => String(a.data ?? ''))
  } catch { return [] }
}
async function verifierDomaineMail(): Promise<Alerte[]> {
  const D = 'prestiapp.fr'
  const manques: string[] = []
  if (!(await dns(D, 'MX')).length) manques.push('MX absent : personne ne peut écrire au domaine')
  if (!(await dns(D, 'TXT')).some((t) => t.includes('v=spf1'))) manques.push('SPF absent')
  if (!(await dns(`resend._domainkey.${D}`, 'TXT')).length) manques.push('DKIM Resend absent : les devis partent sans signature')
  if (!(await dns(`_dmarc.${D}`, 'TXT')).some((t) => t.includes('v=DMARC1'))) manques.push('DMARC absent (protection contre l’usurpation)')
  if (!manques.length) return []
  return [{ motif: 'domaine_mail', a: 'entreprise', cle: manques.length === 1 && /DMARC/.test(manques[0]) ? 'dmarc' : 'grave',
    sujet: manques.some((m) => !/DMARC/.test(m)) ? 'Chaîne mail cassée' : 'DMARC toujours absent',
    corps: `${manques.map((m) => `- ${m}`).join('\n')}\n\nContrôle : node scripts/mail-verifier.mjs · Zone DNS : OVH → prestiapp.fr → Zone DNS.` }]
}

// ── 6. Sécurité ──────────────────────────────────────────────────────────────
async function verifierSecurite(): Promise<Alerte[]> {
  const depuis = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const { data } = await supabaseAdmin.from('artisans').select('email, nom, sessions_invalides_avant, is_founder').gte('sessions_invalides_avant', depuis)
  const revoques = (data ?? []).filter((a) => a.email && !String(a.email).endsWith('@presti-test.invalid'))
  if (!revoques.length) return []
  return [{ motif: 'securite', a: 'entreprise', cle: 'revocations',
    sujet: `${revoques.length} révocation(s) de sessions en 24 h`,
    corps: `Comptes ayant fermé toutes leurs sessions :\n${revoques.map((a) => `- ${a.nom ?? a.email}${a.is_founder ? ' (fondateur)' : ''}`).join('\n')}\n\nNormal après un changement de mot de passe ; à regarder si ce n’est pas eux.` }]
}

// ── 7. Paiement (déclenchée par le webhook, pas par la ronde) ────────────────
export function alertePaiement(type: 'echec' | 'annulation' | 'litige', artisan: { email: string; id: string; nom?: string | null }, detail = ''): Alerte[] {
  const libelle = { echec: 'Votre paiement a échoué', annulation: 'Votre abonnement est annulé', litige: 'Un litige a été ouvert sur votre paiement' }[type]
  return [
    { motif: 'paiement', a: { email: artisan.email, artisanId: artisan.id }, cle: `${artisan.id}:${type}`, sujet: libelle,
      corps: type === 'echec'
        ? `Le prélèvement de votre abonnement n’a pas abouti${detail ? ` (${detail})` : ''}. Vos fonctions restent actives quelques jours ; mettez à jour votre moyen de paiement : ${LIEN_APP}/parametres`
        : type === 'annulation' ? `Votre abonnement prend fin à la date prévue. Vos données restent en place ; vous pourrez vous réabonner à tout moment : ${LIEN_APP}/abonnement`
        : `Votre banque conteste un paiement${detail ? ` (${detail})` : ''}. Nous reviendrons vers vous ; en attendant, rien ne change sur votre compte.` },
    { motif: 'paiement', a: 'entreprise', cle: `${artisan.id}:${type}:entreprise`, sujet: `${libelle} — ${artisan.nom ?? artisan.email}`, corps: `Artisan : ${artisan.nom ?? ''} ${artisan.email}\nType : ${type}${detail ? `\nDétail : ${detail}` : ''}` },
  ]
}

// ── 8. Le point hebdomadaire ─────────────────────────────────────────────────
async function digest(): Promise<Alerte[]> {
  const depuis = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()
  const nb = async (table: string, filtre?: (q: ReturnType<typeof supabaseAdmin.from>) => unknown) => {
    let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).gte('created_at', depuis)
    const { count } = await (filtre ? (filtre(q as never) as typeof q) : q)
    return count ?? 0
  }
  const inscriptions = await nb('artisans')
  const leads = await nb('leads')
  const devis = await nb('devis')
  const factures = await nb('factures')
  const { count: aZero } = await supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true }).lte('credits', 0).eq('is_founder', false)
  const cout = await coutIADuMois()
  const { data: passages } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi')
  const lignes = [
    `Inscriptions : ${inscriptions}`, `Demandes reçues : ${leads}`, `Devis créés : ${devis}`, `Factures émises : ${factures}`,
    `Comptes à zéro crédit : ${aZero ?? 0}`,
    cout ? (cout.erreur ? `Coût IA du mois : illisible (${cout.erreur.slice(0, 60)})` : `Coût IA du mois : ${euros(cout.usd * (Number(process.env.TAUX_USD_EUR) || 0.92))}`) : 'Coût IA du mois : non mesuré (ANTHROPIC_ADMIN_KEY absente)',
    `Tâches planifiées : ${(passages ?? []).map((p) => `${p.nom} ${p.reussi ? '✅' : '❌'} ${new Date(p.dernier_passage).toLocaleDateString('fr-FR')}`).join(' · ') || 'aucune trace (migration 0057 ?)'}`,
  ]
  return [{ motif: 'digest', a: 'entreprise', cle: new Date().toISOString().slice(0, 10), sujet: 'Presti — point de la semaine', corps: `Sept derniers jours :\n- ${lignes.join('\n- ')}\n\nAudit récurrent : plans/audit-recurrent/ dans le dépôt.` }]
}

// ── L'envoi, avec le verrou « une fois par jour » ────────────────────────────
/** Envoie des alertes hors ronde (webhook Stripe) : mêmes tuyaux, même verrou quotidien par motif. */
export async function envoyerAlertes(alertes: Alerte[]): Promise<number> {
  let n = 0
  for (const al of alertes) if (await envoyer(al, false)) n++
  return n
}

async function envoyer(al: Alerte, simulation: boolean): Promise<boolean> {
  const cle = `alerte:${al.motif}:${al.cle ?? '-'}`
  if (!simulation && !(await consommerLimite(cle, 1, 86_400))) return false
  const sujet = simulation ? `[SIMULATION] ${al.sujet}` : al.sujet
  const corps = simulation ? `${al.corps}\n\n— Ceci est une simulation lancée volontairement (scripts/alertes-e2e.mjs). Aucun incident réel.` : al.corps
  try {
    if (al.a === 'entreprise') { const r = await notifierEntreprise(sujet, corps); return r.ok }
    const r = await sendEmail({ to: al.a.email, subject: `Presti — ${sujet}`, text: corps, replyTo: EMAIL_ENTREPRISE })
    return r.ok
  } catch (e) { console.error('[alertes]', al.motif, e instanceof Error ? e.message : e); return false }
}

/** Exemples réalistes de chaque motif, pour prouver le tuyau sans attendre l'incident. */
function simulation(motif: Motif): Alerte[] {
  const artisan = { email: EMAIL_ENTREPRISE, artisanId: 'simulation' }
  switch (motif) {
    case 'solde_ia': return [{ motif, a: 'entreprise', cle: 's', sujet: 'Budget IA : 70 % consommés', corps: `Dépensé ce mois : ${euros(35)} sur ${euros(50)} (70 %).\nProjection à fin de mois : ${euros(58)}.\nÀ ce rythme, le budget est épuisé vers le 26 du mois.\n\nRecharger : ${LIEN_CONSOLE_ANTHROPIC}` }]
    case 'credits_artisan': return [{ motif, a: artisan, cle: 's', sujet: 'Il vous reste 12 crédits sur 80', corps: `Il vous reste 12 crédits sur 80 ce mois-ci. Renouvellement le 1er du mois.\n\nSi votre activité grandit : ${LIEN_APP}/abonnement` }]
    case 'paiement': return alertePaiement('echec', { email: EMAIL_ENTREPRISE, id: 'simulation', nom: 'Artisan de simulation' }, 'carte expirée')
    case 'erreurs': return [{ motif, a: 'entreprise', cle: 's', sujet: 'Presti a produit 7 erreurs en 10 min', corps: '7 erreurs, dont 5 sur /api/conversation/stream.\n\nExtrait :\n- /api/conversation/stream — délai dépassé (simulation)' }]
    case 'cron_muet': return [{ motif, a: 'entreprise', cle: 's', sujet: 'La tâche « relances » n’a pas tourné depuis 31 h', corps: 'Dernier passage : hier 08:00. Attendu au moins toutes les 26 h.\n\nVérifie vercel.json et CRON_SECRET.' }]
    case 'domaine_mail': return [{ motif, a: 'entreprise', cle: 's', sujet: 'DMARC toujours absent', corps: '- DMARC absent (protection contre l’usurpation)\n\nContrôle : node scripts/mail-verifier.mjs' }]
    case 'securite': return [{ motif, a: 'entreprise', cle: 's', sujet: '1 révocation de sessions en 24 h', corps: 'Comptes ayant fermé toutes leurs sessions :\n- Artisan de simulation\n\nNormal après un changement de mot de passe.' }]
    case 'digest': return [{ motif, a: 'entreprise', cle: 's', sujet: 'Presti — point de la semaine', corps: 'Sept derniers jours (simulation) :\n- Inscriptions : 3\n- Demandes reçues : 11\n- Devis créés : 6\n- Factures émises : 2\n- Comptes à zéro crédit : 1\n- Coût IA du mois : 12,40 €' }]
  }
}

export const MOTIFS: Motif[] = ['solde_ia', 'credits_artisan', 'paiement', 'erreurs', 'cron_muet', 'domaine_mail', 'securite', 'digest']

/**
 * La ronde. `aSec` : on rend ce qui partirait sans rien envoyer. `simuler` : on envoie l'exemple
 * du motif, marqué [SIMULATION], sans verrou quotidien.
 */
export async function ronde(opts: { aSec?: boolean; simuler?: Motif } = {}): Promise<{ candidates: Alerte[]; envoyees: string[]; ignorees: string[] }> {
  let candidates: Alerte[] = []
  if (opts.simuler) candidates = simulation(opts.simuler)
  else {
    const lundi = new Date().getUTCDay() === 1
    const blocs = await Promise.allSettled([verifierSoldeIA(), verifierCreditsArtisans(lundi), verifierErreurs(), verifierCrons(), lundi ? verifierDomaineMail() : Promise.resolve([]), verifierSecurite(), lundi ? digest() : Promise.resolve([])])
    for (const b of blocs) { if (b.status === 'fulfilled') candidates.push(...b.value); else console.error('[alertes] bloc :', b.reason) }
  }
  const envoyees: string[] = [], ignorees: string[] = []
  if (!opts.aSec) for (const al of candidates) { (await envoyer(al, !!opts.simuler) ? envoyees : ignorees).push(`${al.motif}:${al.cle ?? '-'}`) }
  return { candidates, envoyees, ignorees }
}
