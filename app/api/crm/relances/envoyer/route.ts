import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreur, gardeCrm, INDISPONIBLE, json, nonPermise } from '@/lib/crm/serveur'
import { champsPermis, estObjet, identifiant, lireCorps } from '@/lib/crm/valider'
import { ajouterJours, controlerMessageRelance, decisionRelance, MAX_RELANCES_DEVIS } from '@/lib/crm/rappels'
import { jourParis } from '@/lib/comptaTableau'
import { sendEmail } from '@/lib/email'
import { consommerLimite } from '@/lib/limites'
import { historiqueRelances, phraseRefus, relanceRecente } from '@/lib/relancesRegistre'

export const runtime = 'nodejs'

// POST /api/crm/relances/envoyer { devis_id, message } — ENVOIE la relance d'un devis, après relecture et confirmation de l'artisan
// (le geste « Envoyer » de l'écran). Par e-mail, au nom de l'artisan (marque blanche : son nom en expéditeur, son adresse en
// réponse, lib/email.ts), sans lien ni pièce jointe ; le texte est celui que l'artisan a relu. Puis :
//   • l'historique : un rappel « relancer le devis » FAIT, daté de l'envoi (crm_rappels.envoye_le) — sans garder le texte ;
//   • les rappels « relancer le devis » encore ouverts de ce devis sont cochés ;
//   • un nouveau rappel dans 7 jours, tant que le devis n'a pas atteint 3 relances (après, mieux vaut appeler).
// Un double clic ne fait pas deux e-mails : une seule relance par devis passe par minute. Rien n'est écrit si l'envoi échoue.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req, 16_384)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  if (!estObjet(corps.valeur)) return erreur('Corps de requête invalide.', 400)
  const permis = champsPermis(corps.valeur, ['devis_id', 'message'])
  if (!permis.ok) return erreur(permis.erreur, 400)
  const id = identifiant(corps.valeur.devis_id, 'Devis', true)
  if (!id.ok) return erreur(id.erreur, 400)
  const devisId = id.valeur as string
  const msg = controlerMessageRelance(corps.valeur.message)
  if (!msg.ok) return erreur(msg.erreur, 400)

  const [devisR, artR, rappelsR] = await Promise.all([
    supabaseAdmin.from('devis').select('id, statut, numero, objet, client_email').eq('id', devisId).eq('artisan_id', g.uid).maybeSingle(),
    supabaseAdmin.from('artisans').select('nom, email').eq('id', g.uid).maybeSingle(),
    supabaseAdmin.from('crm_rappels').select('id, type, fait_le, envoye_le').eq('artisan_id', g.uid).eq('devis_id', devisId),
  ])
  if (devisR.error || artR.error) { console.error('[crm/relances] lecture :', (devisR.error ?? artR.error)?.message); return erreur(INDISPONIBLE, 503) }
  if (rappelsR.error) { console.error('[crm/relances] rappels :', rappelsR.error.message); return erreur('Les rappels ne sont pas encore installés sur cette base (migration 0162) : la relance ne serait pas tracée.', 503) }
  const envoyees = (rappelsR.data ?? []).filter((r) => !!r.envoye_le).length
  const dec = decisionRelance(devisR.data, envoyees)
  if (!dec.ok) return erreur(dec.erreur, dec.statut)
  if (!(await consommerLimite(`crm-relance:${g.uid}:${devisId}`, 1, 60))) return erreur('Cette relance vient de partir : patientez une minute avant d’en envoyer une autre.', 429, { code: 'debit' })
  // 02/11 (S4) : le registre commun des relances — ce client a-t-il été relancé, par n'importe quel chemin (assistant, pilote, CRM,
  // impayés, conversation), depuis moins de 3 jours ? Registre illisible : rien ne part (côté sûr).
  const reg = relanceRecente(await historiqueRelances(g.uid, { type: 'devis', id: devisId }), new Date())
  if (reg.refus) return reg.raison === 'illisible' ? erreur(INDISPONIBLE, 503) : erreur(phraseRefus(reg, (iso) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })), 409, { code: 'deja_relance' })

  const d = devisR.data!
  const nom = (artR.data?.nom as string | null)?.trim() || 'Votre artisan'
  const r = await sendEmail({
    to: String(d.client_email).trim(),
    subject: d.numero ? `Votre devis ${d.numero}${d.objet ? ` — ${String(d.objet).slice(0, 80)}` : ''}` : `Votre devis${d.objet ? ` — ${String(d.objet).slice(0, 80)}` : ''}`,
    text: msg.texte,
    fromName: nom,
    replyTo: (artR.data?.email as string | null) || undefined,
    transactionnel: true, // le geste de l'artisan, confirmé : la pause des agents ne le coupe pas (lib/email.ts)
  })
  if (!r.ok) { console.error('[crm/relances] envoi :', r.error); return erreur('L’e-mail n’a pas pu partir : rien n’a été noté, réessayez dans un instant.', 502) }

  const maintenant = new Date()
  const jour = jourParis(maintenant)
  const ouverts = (rappelsR.data ?? []).filter((x) => x.type === 'relancer_devis' && !x.fait_le).map((x) => x.id)
  const ecritures = await Promise.all([
    supabaseAdmin.from('crm_rappels').insert({ artisan_id: g.uid, devis_id: devisId, type: 'relancer_devis', echeance: jour, fait_le: maintenant.toISOString(), envoye_le: maintenant.toISOString(), origine: 'artisan', texte: `Relance n° ${envoyees + 1} envoyée par e-mail` }),
    ouverts.length ? supabaseAdmin.from('crm_rappels').update({ fait_le: maintenant.toISOString() }).eq('artisan_id', g.uid).in('id', ouverts) : Promise.resolve({ error: null }),
    envoyees + 1 < MAX_RELANCES_DEVIS
      ? supabaseAdmin.from('crm_rappels').upsert({ artisan_id: g.uid, devis_id: devisId, type: 'relancer_devis', echeance: ajouterJours(jour, 7), origine: 'systeme', cle: `relance-devis:${devisId}:${envoyees + 2}`, texte: 'Pas de réponse ? Relancer le devis' }, { onConflict: 'artisan_id,cle', ignoreDuplicates: true })
      : Promise.resolve({ error: null }),
  ])
  const enErreur = ecritures.find((e) => e.error)
  // L'e-mail est parti : on le dit, même si l'historique n'a pas pu s'écrire (l'artisan ne doit pas renvoyer par erreur).
  if (enErreur?.error) console.error('[crm/relances] historique :', enErreur.error.message)
  return json({ ok: true, relances: envoyees + 1, prochainRappel: envoyees + 1 < MAX_RELANCES_DEVIS ? ajouterJours(jour, 7) : null, historique: !enErreur }, 201)
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function GET(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('POST')
}
