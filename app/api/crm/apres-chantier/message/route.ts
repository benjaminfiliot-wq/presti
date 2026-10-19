import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { champsPermis, estObjet, estUuid, identifiant, lireCorps } from '@/lib/crm/valider'
import { ajouterJours } from '@/lib/crm/rappels'
import { sendEmail } from '@/lib/email'
import { consommerLimite } from '@/lib/limites'
import {
  ajouterMois, decisionEnvoiApres, equipementDe, erreurTexteApres, finDe, messageCompletApres, PIED_APRES, PREAVIS_JOURS,
  remplirApres, sujetApres, texteApres, type GenreApres, type VariablesApres,
} from '@/lib/apresChantier'

export const runtime = 'nodejs'

// Le MESSAGE de l'après-chantier (plan du 18/10, n°7, migration 0165, drapeau crmApresChantier), pour un rappel « Demander un avis »
// ou « Proposer l'entretien » posé par le passage quotidien :
//   GET  ?rappel_id=<uuid>          → PRÉPARE le message (destinataire, sujet, texte de l'artisan rempli, avertissements). Rien
//                                     n'est écrit, rien ne part.
//   POST { rappel_id, message }     → ENVOIE le texte que l'artisan a relu et confirmé, par e-mail, à son nom (marque blanche,
//                                     réponse vers son adresse), sans lien ni pièce jointe. Puis le rappel est coché avec la date
//                                     d'envoi (l'historique, sans le texte) ; pour l'entretien, le rappel de l'échéance suivante.
// Un message par jour et par client ; au plus 10 par compte et par jour ; l'envoi désactivé dans les réglages est refusé.
type Contexte = {
  genre: GenreApres; rappel: { id: string; chantier_id: string; envoye_le: string | null; cle: string | null }
  email: string | null; variables: VariablesApres; sujet: string; clientAEcrit: boolean; reglageActif: boolean; texte: string
  fin: string | null; moisEntretien: number | null; replyTo: string | undefined
}

async function contexte(g: { uid: string }, rappelId: string): Promise<{ ok: true; c: Contexte } | { ok: false; statut: number; erreur: string }> {
  const r = await supabaseAdmin.from('crm_rappels').select('id, type, chantier_id, envoye_le, cle').eq('id', rappelId).eq('artisan_id', g.uid).maybeSingle()
  if (r.error) return { ok: false, statut: 503, erreur: INDISPONIBLE }
  if (!r.data || !['demande_avis', 'entretien'].includes(r.data.type as string) || !r.data.chantier_id) return { ok: false, statut: 404, erreur: 'Rappel introuvable.' }
  const genre: GenreApres = r.data.type === 'demande_avis' ? 'avis' : 'entretien'
  const [ch, reg, art] = await Promise.all([
    supabaseAdmin.from('chantiers').select('id, titre, statut, date_fin_reelle, client_nom, devis_id').eq('id', r.data.chantier_id).eq('artisan_id', g.uid).maybeSingle(),
    supabaseAdmin.from('crm_apres_chantier').select('avis, entretien, texte_avis, texte_entretien').eq('artisan_id', g.uid).maybeSingle(),
    supabaseAdmin.from('artisans').select('nom, email').eq('id', g.uid).maybeSingle(),
  ])
  if (ch.error || reg.error || art.error) return { ok: false, statut: 503, erreur: INDISPONIBLE }
  if (!ch.data) return { ok: false, statut: 404, erreur: 'Chantier introuvable.' }
  const devis = { id: ch.data.devis_id as string | null }
  const [dv, lignes] = devis.id
    ? await Promise.all([
        supabaseAdmin.from('devis').select('client_email, client_nom, lead_id, objet').eq('id', devis.id).eq('artisan_id', g.uid).maybeSingle(),
        supabaseAdmin.from('devis_lignes').select('designation').eq('devis_id', devis.id).limit(300),
      ])
    : [{ data: null, error: null }, { data: [], error: null }]
  if (dv.error || lignes.error) return { ok: false, statut: 503, erreur: INDISPONIBLE }
  const fin = finDe({ statut: ch.data.statut as string, date_fin_reelle: ch.data.date_fin_reelle as string | null })
  const eq = equipementDe([ch.data.titre as string | null, dv.data?.objet as string | null, ...(lignes.data ?? []).map((l) => l.designation as string | null)])
  // Le client a écrit depuis la fin du chantier : l'écran le dit avant l'envoi (relire la conversation d'abord).
  let clientAEcrit = false
  // La demande vient du devis DU COMPTE (lu ci-dessus avec artisan_id) : messages n'a pas d'artisan_id, on le lit par elle.
  const c = { leads: dv.data?.lead_id ? [dv.data.lead_id as string] : [] }
  if (c.leads.length && fin) {
    const m = await supabaseAdmin.from('messages').select('id').in('lead_id', c.leads).eq('sens', 'in').gte('sent_at', `${fin}T00:00:00Z`).limit(1)
    clientAEcrit = !m.error && (m.data ?? []).length > 0
  }
  const artisan = (art.data?.nom as string | null)?.trim() || 'Votre artisan'
  const variables: VariablesApres = {
    client: (dv.data?.client_nom as string | null)?.trim() || (ch.data.client_nom as string | null)?.trim() || 'Madame, Monsieur',
    chantier: (ch.data.titre as string | null)?.trim() || 'votre chantier', artisan, equipement: eq?.nom ?? 'installation',
  }
  const reglages = reg.data ?? { avis: false, entretien: false, texte_avis: null, texte_entretien: null }
  const email = typeof dv.data?.client_email === 'string' && dv.data.client_email.trim() ? dv.data.client_email.trim() : null
  return { ok: true, c: {
    genre, rappel: { id: r.data.id as string, chantier_id: r.data.chantier_id as string, envoye_le: r.data.envoye_le as string | null, cle: r.data.cle as string | null },
    email, variables, sujet: sujetApres(genre, variables.chantier, eq?.nom ?? null), clientAEcrit, reglageActif: genre === 'avis' ? !!reglages.avis : !!reglages.entretien,
    texte: remplirApres(texteApres(genre, reglages), variables), fin, moisEntretien: eq?.mois ?? null, replyTo: (art.data?.email as string | null) || undefined,
  } }
}

export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  const id = new URL(req.url).searchParams.get('rappel_id')
  if (!estUuid(id)) return erreur('Rappel introuvable.', 404)
  const x = await contexte(g, id)
  if (!x.ok) return erreur(x.erreur, x.statut)
  const c = x.c
  const avertissements = [
    ...(c.clientAEcrit ? ['Ce client vous a écrit depuis la fin du chantier : relisez la conversation avant d’envoyer.'] : []),
    ...(c.email ? [] : ['Aucune adresse e-mail pour ce client : appelez-le plutôt.']),
    ...(c.reglageActif ? [] : ['Cet envoi est désactivé dans vos réglages de l’après-chantier.']),
    ...(c.rappel.envoye_le ? ['Ce message est déjà parti.'] : []),
  ]
  return json({ genre: c.genre, destinataire: c.email, sujet: c.sujet, texte: c.texte, pied: PIED_APRES, avertissements, envoyable: !!c.email && c.reglageActif && !c.rappel.envoye_le })
}

export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req, 16_384)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  if (!estObjet(corps.valeur)) return erreur('Corps de requête invalide.', 400)
  const permis = champsPermis(corps.valeur, ['rappel_id', 'message'])
  if (!permis.ok) return erreur(permis.erreur, 400)
  const id = identifiant(corps.valeur.rappel_id, 'Rappel', true)
  if (!id.ok) return erreur(id.erreur, 400)
  if (typeof corps.valeur.message !== 'string') return erreur('Le message est vide.', 400)
  const eTexte = erreurTexteApres(corps.valeur.message)
  if (eTexte) return erreur(eTexte, 400)
  const x = await contexte(g, id.valeur as string)
  if (!x.ok) return erreur(x.erreur, x.statut)
  const c = x.c

  const envoyes = await supabaseAdmin.from('crm_rappels').select('id', { count: 'exact', head: true }).eq('artisan_id', g.uid).in('type', ['demande_avis', 'entretien']).gte('envoye_le', new Date(Date.now() - 86_400_000).toISOString()) // sur 24 heures glissantes
  if (envoyes.error) return erreur(INDISPONIBLE, 503)
  const dec = decisionEnvoiApres({ email: c.email, envoyesAujourdhuiCompte: envoyes.count ?? 0, dejaEcritAujourdhuiAuClient: false, dejaEnvoye: !!c.rappel.envoye_le, reglageActif: c.reglageActif })
  if (!dec.ok) return erreur(dec.erreur, dec.statut)
  // Un message par jour et par client (empreinte de l'adresse : la clé de débit ne garde pas l'adresse en clair). Couvre aussi le double clic.
  const empreinte = createHash('sha256').update(c.email!.toLowerCase()).digest('hex').slice(0, 32)
  if (!(await consommerLimite(`crm-apres:${g.uid}:${empreinte}`, 1, 86_400))) return erreur('Un message est déjà parti aujourd’hui à ce client : attendez demain.', 429, { code: 'debit' })

  const texte = remplirApres(corps.valeur.message, c.variables)
  const r = await sendEmail({ to: c.email!, subject: c.sujet, text: messageCompletApres(texte), fromName: c.variables.artisan, replyTo: c.replyTo, transactionnel: true })
  if (!r.ok) { console.error('[crm/apres-chantier] envoi :', r.error); return erreur('L’e-mail n’a pas pu partir : rien n’a été noté, réessayez demain ou appelez le client.', 502) }

  const maintenant = new Date().toISOString()
  const ecritures = await Promise.all([
    supabaseAdmin.from('crm_rappels').update({ fait_le: maintenant, envoye_le: maintenant, texte: c.genre === 'avis' ? 'Demande d’avis envoyée par e-mail' : 'Proposition d’entretien envoyée par e-mail' }).eq('id', c.rappel.id).eq('artisan_id', g.uid),
    // L'entretien suivant : un nouveau rappel à l'échéance d'après (clé unique : jamais deux fois).
    c.genre === 'entretien' && c.fin && c.moisEntretien && /^entretien:[0-9a-f-]{36}:\d+$/.test(c.rappel.cle ?? '')
      ? (() => {
          const n = Number(c.rappel.cle!.split(':')[2]) + 1
          return supabaseAdmin.from('crm_rappels').upsert({ artisan_id: g.uid, chantier_id: c.rappel.chantier_id, type: 'entretien', origine: 'systeme', cle: `entretien:${c.rappel.chantier_id}:${n}`, echeance: ajouterJours(ajouterMois(c.fin!, n * c.moisEntretien!), -PREAVIS_JOURS), texte: `Proposer l’entretien (${c.variables.equipement}) à ${c.variables.client}`.slice(0, 300) }, { onConflict: 'artisan_id,cle', ignoreDuplicates: true })
        })()
      : Promise.resolve({ error: null }),
  ])
  const enErreur = ecritures.find((e) => e.error)
  // L'e-mail est parti : on le dit, même si l'historique n'a pas pu s'écrire (l'artisan ne doit pas renvoyer par erreur).
  if (enErreur?.error) console.error('[crm/apres-chantier] historique :', enErreur.error.message)
  return json({ ok: true, historique: !enErreur }, 201)
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmApresChantier' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
