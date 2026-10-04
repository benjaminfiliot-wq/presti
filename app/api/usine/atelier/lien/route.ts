import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { creerJeton, hacherJeton, expiration } from '@/lib/agents/acquisition/maquettesLien'
import { preparerMessageLien } from '@/lib/agents/acquisition/redacteur'
import type { ProspectReserve, PreuveDemande } from '@/lib/agents/acquisition/contrat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const repondre = (corps: object, status = 200) => Response.json(corps, { status })
async function occupation() {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
  if (error || !buckets) throw new Error('stockage')
  let octets = 0
  for (const bucket of buckets) {
    const parcourir = async (prefixe: string): Promise<void> => {
      let page = 0
      while (true) {
        const { data, error: e } = await supabaseAdmin.storage.from(bucket.name).list(prefixe, { limit: 100, offset: page * 100 })
        if (e || !data) throw new Error('stockage')
        for (const objet of data) {
          if (objet.id === null) await parcourir(prefixe ? `${prefixe}/${objet.name}` : objet.name)
          else octets += Number(objet.metadata?.size ?? 0)
        }
        if (data.length < 100) break
        page++
      }
    }
    await parcourir('')
  }
  return octets
}
function adresse(p: ProspectReserve): string | null {
  return p.canaux?.find((c) => c.canal === 'email_sollicite' && c.nature === 'donnee_par_la_personne')?.valeur ?? null
}
export async function POST(req: Request) {
  if (!actif('busAgents')) return repondre({}, 404)
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return repondre({ erreur: agent.code }, agent.status)
  if (agent.nom !== 'atelier_maquettes') return repondre({ erreur: 'agent' }, 403)
  if ((await pauseGenerale()).active) return repondre({ erreur: 'pause' }, 423)
  let corps: { prospect_id?: string }
  try { corps = await req.json() } catch { return repondre({ erreur: 'corps' }, 400) }
  if (!corps.prospect_id || !/^[0-9a-f-]{36}$/i.test(corps.prospect_id)) return repondre({ erreur: 'entree' }, 400)
  try {
    const maintenant = Date.now()
    const p = (await magasinSupabase.prospectsOui(100)).find((x) => x.id === corps.prospect_id)
    const m = p ? await magasinSupabase.maquetteDe(p.id) : null
    // La base rend la ligne de la maquette telle quelle (acq_maquette_de) : pas de champ `etat` à attendre, seulement une
    // maquette non purgée et non expirée (`prospectsOui` ne rend d'ailleurs que les prospects qui en ont une).
    const utilisable = !!m && m.etat !== 'purgee' && !(m.expire_le && Date.parse(m.expire_le) <= maintenant)
    if (!p || !m || !utilisable || (p.etape !== 'oui' && !(p.source === 'entrant' && p.etape === 'maquette_prete'))) return repondre({ ok: false, raison: 'etat' }, 409)
    let canal: 'messagerie' | 'email_sollicite' = 'email_sollicite'
    let destinataire: string | null = adresse(p)
    let preuve: PreuveDemande | null = null
    let filEnvoi: string | null = null
    let conversationId: string | null = null
    if (p.source === 'entrant') {
      const conversation = p.conversation_id ? await magasinSupabase.conversation(p.conversation_id) : null
      const dernier = conversation && 'dernier_message_recu_le' in conversation ? String(conversation.dernier_message_recu_le) : ''
      if (dernier && maintenant - Date.parse(dernier) < 24 * 3600_000 && conversation?.meta_id) { canal = 'messagerie'; destinataire = conversation.meta_id; conversationId = conversation.id }
      else preuve = { type: 'case_entrant', id: p.id }
    } else {
      // Un froid qui a dit « oui » : sa réponse se lit parmi celles que la base rend (une ligne porte `classe` ou `classement.classe`).
      const reponses = await magasinSupabase.reponsesARepondre(100)
      const oui = reponses.find((r) => r.prospect_id === p.id && String(r.classement?.classe ?? (r as { classe?: string }).classe ?? '') === 'oui')
      if (oui) {
        destinataire = oui.expediteur ?? destinataire
        preuve = { type: 'message_recu', id: oui.id }
        filEnvoi = oui.envoi_id
        const idConversation = oui.conversation_id ?? p.conversation_id ?? null
        if (oui.canal === 'messagerie' && idConversation) {
          // Sur Meta, l'adresse du message est l'identifiant Meta de la personne, jamais l'identifiant de la conversation.
          const conversation = await magasinSupabase.conversation(idConversation)
          canal = 'messagerie'; destinataire = conversation?.meta_id ?? null; conversationId = conversation ? idConversation : null
        }
      }
    }
    if (!destinataire) return repondre({ ok: false, raison: 'aucune_adresse' })
    const adresseReponse = (process.env.ACQ_ADRESSE_REPONSE ?? '').trim()
    if (canal === 'email_sollicite' && (!adresseReponse || !process.env.PROSPECTION_GMAIL_USER || !process.env.PROSPECTION_GMAIL_PASS)) return repondre({ ok: false, raison: 'en_attente_gmail' })
    // Le stockage se mesure en dernier parmi les refus : un prospect sans adresse ou sans Gmail ne déclenche pas le parcours de tous les buckets.
    if (await occupation() > 0.6 * 1024 * 1024 ** 2) {
      await magasinSupabase.creerDecision({ type: 'stockage', prospect_id: p.id, resume: 'Stockage des maquettes au plafond.', options: [{ cle: 'liberer', libelle: 'Libérer du stockage', recommandee: true }, { cle: 'attendre', libelle: 'Attendre', recommandee: false }], defaut: 'attendre', cle_idempotence: `atelier:stockage:${new Date().toISOString().slice(0, 10)}` })
      return repondre({ ok: false, raison: 'stockage' }, 507)
    }
    // Les jetons en clair ne vivent qu'ici, le temps de la requête : la base ne reçoit que leur empreinte, la réponse ne les porte jamais.
    const jeton = creerJeton(), jetonRdv = creerJeton(), expireLe = expiration(maintenant)
    const resultat = await preparerMessageLien(p, { lien: `https://prestiapp.fr/maquette/${jeton}`, paiement: 'https://prestiapp.fr/site/acheter', rendez_vous: `https://prestiapp.fr/rendez-vous/${jetonRdv}`, date_fin: expireLe, canal, destinataire, preuve_demande: preuve, fil_envoi_id: filEnvoi, conversation_id: conversationId, adresseReponse, drapeaux: { siteAchatPublic: actif('siteAchatPublic') } }, { magasin: magasinSupabase, horloge: { maintenant: () => maintenant, attendre: async () => {} } })
    if (!resultat.ok) return repondre({ ok: false, raison: resultat.raison === 'modele_inconnu' ? 'modele_non_approuve' : resultat.raison })
    // Le lien existe en base AVANT que le message qui le porte soit préparé : jamais un message avec un lien mort.
    await magasinSupabase.creerLienMaquette(p.id, m.objet ?? m.chemin, hacherJeton(jeton), expireLe)
    await magasinSupabase.creerLienRdv(p.id, hacherJeton(jetonRdv), expireLe)
    const envoi = await magasinSupabase.preparerEnvoi(resultat)
    if (!envoi.ok) return repondre({ ok: false, raison: envoi.raison })
    return repondre({ ok: true })
  } catch { return repondre({ ok: false, raison: 'indisponible' }, 503) }
}
