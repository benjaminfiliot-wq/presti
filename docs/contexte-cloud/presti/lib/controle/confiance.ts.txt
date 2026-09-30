import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Le faisceau d'indices d'un apport déclaré (prompt v11 §4.3).
//
// Ce que ce fichier fait, et surtout ce qu'il ne fait pas.
//
// Il ne DÉCIDE pas. Le §4.6 le dit sans détour : aucun système ne prouve qu'une conversation a eu lieu
// hors ligne. Ce qui est atteignable, c'est de rendre l'abus difficile, visible et documenté, et de
// donner à Benj de quoi trancher en connaissance de cause. Le score sert donc à TRIER une file de
// revue — jamais à valider ni à refuser tout seul.
//
// Chaque signal est un FAIT daté et vérifiable, jamais une supposition. C'est la raison pour laquelle
// on rend `signaux` et pas seulement un nombre : un score sans ses raisons donnerait l'illusion d'un
// verdict, et personne ne pourrait le contester utilement — ni Benj, ni Alexandre.
//
// Un apport « prouvé » (arrivé par le lien signé) n'est pas scoré : il n'y a rien à peser. Le score
// ne concerne que le déclaratif.

export type Sens = 'pour' | 'contre'
export type Signal = { cle: string; sens: Sens; poids: number; detail: string; constate_le: string }
export type Confiance = { score: number; signaux: Signal[]; verdictLisible: string }

/** Les faits qu'on sait établir, avec leur poids. Le poids est ici, en clair, pas dans une formule. */
const POIDS = {
  // ── En faveur ────────────────────────────────────────────────────────────────────────────────────
  origine_presente: 22,      // le client dit lui-même « on m'a présenté Presti »
  nom_correspond: 18,        // et il nomme l'apporteur
  declare_avant: 15,         // l'apport a été déclaré AVANT l'inscription — on ne réclame pas après coup
  piece_fournie: 10,         // un échange daté est joint
  produit_utilise: 12,       // le compte sert vraiment (demandes reçues, devis émis)
  abonnement_tenu: 15,       // il a passé le premier renouvellement
  // ── En défaveur ──────────────────────────────────────────────────────────────────────────────────
  origine_autre: -30,        // le client dit « Google » ou « bouche-à-oreille » : la déclaration le contredit
  declare_tardif: -20,       // déclaré près de la limite des 30 jours, après l'inscription
  compte_inactif: -25,       // 0 demande, 0 devis, aucune connexion depuis quatorze jours
  meme_ip: -35,              // même adresse entre la déclaration et l'inscription
  email_jetable: -20,        // domaine d'adresse improbable
  rembourse: -30,            // remboursé ou résilié dans les soixante jours
} as const

const JETABLES = /@(mailinator|yopmail|guerrillamail|10minutemail|tempmail|trashmail|sharklasers|getnada|dispostable)\./i

/** Le libellé d'un score, en français — jamais un nombre nu dans l'écran. */
export function verdictLisible(score: number): string {
  if (score >= 70) return 'faisceau solide'
  if (score >= 40) return 'à examiner'
  if (score >= 15) return 'faible'
  return 'très faible — à vérifier avant de payer'
}

type Apport = {
  id: string
  artisan_id: string
  apporteur_id: string
  statut: string
  piece: string | null
  premier_contact_le: string | null
  cree_le: string
}

/**
 * Pèse un apport déclaré. Ne lit QUE des faits que la base connaît déjà — aucun appel externe, aucune
 * IA : ce calcul tourne dans une boucle sur toute la file de revue et doit rester gratuit.
 *
 * `maintenant` est passé en paramètre plutôt que lu de l'horloge : deux apports pesés dans la même
 * revue doivent l'être à la même seconde, sinon deux exécutions donnent deux scores.
 */
export async function peser(a: Apport, maintenant = Date.now()): Promise<Confiance> {
  const signaux: Signal[] = []
  const quand = new Date(maintenant).toISOString()
  const ajouter = (cle: keyof typeof POIDS, detail: string, constate = quand) =>
    signaux.push({ cle, sens: POIDS[cle] >= 0 ? 'pour' : 'contre', poids: POIDS[cle], detail, constate_le: constate })

  const { data: art } = await supabaseAdmin.from('artisans')
    .select('id, email, created_at, origine_declaree, origine_precision, plan, stripe_subscription_id')
    .eq('id', a.artisan_id).maybeSingle()
  const { data: apporteur } = await supabaseAdmin.from('apporteurs').select('nom').eq('id', a.apporteur_id).maybeSingle()

  // ── Ce que le client a répondu de lui-même (§4.2) : la source indépendante ───────────────────────
  if (art?.origine_declaree === 'presente') {
    ajouter('origine_presente', 'Le client a répondu « on m’a présenté Presti » à son inscription.')
    const nom = (art.origine_precision ?? '').trim().toLowerCase()
    const attendu = (apporteur?.nom ?? '').trim().toLowerCase()
    if (nom && attendu && (nom.includes(attendu.split(' ')[0]) || attendu.includes(nom.split(' ')[0]))) {
      ajouter('nom_correspond', `Il a nommé « ${art.origine_precision} », ce qui correspond à l’apporteur.`)
    }
  } else if (art?.origine_declaree && art.origine_declaree !== 'autre') {
    const dit: Record<string, string> = { google: 'une recherche Google', reseaux: 'les réseaux sociaux', bouche_a_oreille: 'le bouche-à-oreille' }
    ajouter('origine_autre', `Le client dit avoir connu Presti par ${dit[art.origine_declaree] ?? art.origine_declaree} — la déclaration le contredit.`)
  }

  // ── La chronologie : réclamer après coup n'a pas la même valeur que présenter avant ──────────────
  const inscrit = art?.created_at ? Date.parse(art.created_at) : null
  const declare = Date.parse(a.cree_le)
  if (inscrit && Number.isFinite(declare)) {
    const jours = (declare - inscrit) / 86_400_000
    if (jours < 0) ajouter('declare_avant', `Déclaré ${Math.abs(Math.round(jours))} jour(s) AVANT l’inscription.`)
    else if (jours > 20) ajouter('declare_tardif', `Déclaré ${Math.round(jours)} jours après l’inscription, près de la limite des 30 jours.`)
  }
  if (a.piece) ajouter('piece_fournie', 'Une pièce est jointe à la déclaration.')

  // ── Le compte sert-il vraiment ? Un faux client ne travaille pas ─────────────────────────────────
  const [{ count: leads }, { count: devis }] = await Promise.all([
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', a.artisan_id),
    supabaseAdmin.from('devis').select('id', { count: 'exact', head: true }).eq('artisan_id', a.artisan_id),
  ])
  const actif = (leads ?? 0) > 0 || (devis ?? 0) > 0
  const age = inscrit ? (maintenant - inscrit) / 86_400_000 : 0
  if (actif) ajouter('produit_utilise', `${leads ?? 0} demande(s) reçue(s), ${devis ?? 0} devis émis.`)
  else if (age > 14) ajouter('compte_inactif', `Aucune demande ni devis depuis l’inscription, il y a ${Math.round(age)} jours.`)

  if (art?.stripe_subscription_id && age > 32) ajouter('abonnement_tenu', 'L’abonnement a passé son premier renouvellement.')

  // Remboursé ou résilié dans les soixante jours : l'argent n'est pas resté, et la commission non plus
  // (article 5.4 du contrat). On le lit dans le journal du Poste de contrôle, qui garde chaque geste
  // d'argent — pas besoin d'interroger Stripe dans une boucle qui balaie toute la file de revue.
  const { data: rendus } = await supabaseAdmin.from('journal_direction')
    .select('cree_le').eq('artisan_id', a.artisan_id).eq('action', 'artisan_rembourse')
    .gte('cree_le', new Date(maintenant - 60 * 86_400_000).toISOString()).limit(1)
  if (rendus?.length) ajouter('rembourse', `Un remboursement a été fait sur ce compte le ${String(rendus[0].cree_le).slice(0, 10)}.`, String(rendus[0].cree_le))
  if (art?.email && JETABLES.test(art.email)) ajouter('email_jetable', 'L’adresse vient d’un service d’emails jetables.')

  // ── Même appareil, même adresse : le signal le plus lourd, parce qu'il est difficile à expliquer ─
  // L'empreinte du lien d'apport garde l'IP de la visite ; le journal garde celle de la déclaration.
  const preuveIp = (a as { preuve?: { ip?: string } }).preuve?.ip
  if (preuveIp) {
    const { data: mêmeIp } = await supabaseAdmin.from('journal_direction')
      .select('id').eq('artisan_id', a.artisan_id).eq('ip', preuveIp).limit(1)
    if (mêmeIp?.length) ajouter('meme_ip', 'La déclaration et l’inscription viennent de la même adresse IP.')
  }

  // Ce qu'on ne pèse PAS : l'absence d'abonnement sur un compte récent. Ce n'est ni une preuve
  // d'abus ni une preuve de rien — beaucoup d'artisans essaient avant de payer, et un signal qui
  // punit l'essai punirait surtout les vrais clients. Le remboursement, lui, se traitera à la
  // reprise sur commission (§4.4), là où il a un effet chiffré.

  const score = Math.max(0, Math.min(100, 50 + signaux.reduce((n, s) => n + s.poids, 0)))
  return { score, signaux, verdictLisible: verdictLisible(score) }
}

/** Pèse un apport et enregistre le résultat. Rend le score, ou null si l'apport n'a pas à être pesé. */
export async function peserEtEnregistrer(id: string, maintenant = Date.now()): Promise<Confiance | null> {
  const { data } = await supabaseAdmin.from('registre_apports')
    .select('id, artisan_id, apporteur_id, statut, piece, preuve, premier_contact_le, cree_le').eq('id', id).maybeSingle()
  if (!data) return null
  // Un apport prouvé par le lien signé n'a rien à peser : la preuve est établie par le serveur.
  if (data.statut === 'prouve' || data.statut === 'retire') return null
  // 0086 — ni un CANAL d'acquisition : peser « ce client vient-il vraiment de Facebook ? » n'a pas
  // de sens (personne ne réclame rien) et ferait tourner huit requêtes par arrivée organique. La
  // requête échoue tant que 0086 n'est pas collée : `data` est alors nul, on pèse comme avant.
  const { data: canal } = await supabaseAdmin.from('apporteurs')
    .select('id').eq('id', data.apporteur_id).eq('canal', true).maybeSingle()
  if (canal) return null
  const c = await peser(data as never, maintenant)
  await supabaseAdmin.from('registre_apports')
    .update({ score: c.score, signaux: c.signaux, score_maj_le: new Date(maintenant).toISOString() }).eq('id', id)
  return c
}
