// CRM — le CONTEXTE de l'assistant, VÉRIFIÉ côté serveur (route /api/assistant). Serveur seulement.
//
// L'écran envoie { type, id } (« ce chantier », « cette commande ») ; ici, l'objet est RELU sous la RLS, avec le jeton de l'artisan, ET
// filtré par `artisan_id = uid` : un identifiant d'un autre compte, inventé ou supprimé ne rend rien, et le message part alors SANS
// contexte (jamais d'erreur qui dirait si l'objet existe ailleurs). Le libellé vient de la base, jamais de l'écran ni du modèle.
import type { SupabaseClient } from '@supabase/supabase-js'
import { libellePropre, lireContexteBrut, type ContexteAssistant } from './assistantCrm'

type Ligne = Record<string, unknown> | null
const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const joindre = (...p: unknown[]) => p.map(txt).filter(Boolean).join(' · ')

export async function resoudreContexte(session: SupabaseClient, uid: string, brut: unknown): Promise<ContexteAssistant | null> {
  const c = lireContexteBrut(brut)
  if (!c || !uid) return null
  const un = async (table: string, colonnes: string, champ = 'id', valeur: string = c.id): Promise<Ligne> => {
    const { data, error } = await session.from(table).select(colonnes).eq(champ, valeur).eq('artisan_id', uid).limit(1).maybeSingle()
    return error ? null : ((data as unknown as Ligne) ?? null)
  }
  let libelle = ''
  try {
    switch (c.type) {
      case 'chantier': { const l = await un('chantiers', 'titre, client_nom'); libelle = l ? joindre(l.titre, l.client_nom) : ''; break }
      case 'devis': { const l = await un('devis', 'numero, client_nom'); libelle = l ? joindre(l.numero, l.client_nom) : ''; break }
      case 'facture': { const l = await un('factures', 'numero, client_nom'); libelle = l ? joindre(l.numero, l.client_nom) : ''; break }
      case 'commande': { const l = await un('commandes_fournisseur', 'fournisseur_nom, reference'); libelle = l ? joindre(l.fournisseur_nom, l.reference) : ''; break }
      case 'article': { const l = await un('materiaux', 'nom'); libelle = l ? txt(l.nom) : ''; break }
      case 'categorie': { const l = await un('materiaux', 'categorie', 'categorie', c.id); libelle = l ? txt(l.categorie) : ''; break }
      case 'vehicule': { const l = await un('vehicules', 'nom'); libelle = l ? txt(l.nom) : ''; break }
      case 'membre': { const l = await un('equipe_membres', 'nom'); libelle = l ? txt(l.nom) : ''; break }
      case 'rappel': { const l = await un('crm_rappels', 'texte, echeance'); libelle = l ? joindre(l.texte, l.echeance) : ''; break }
      case 'conversation': { const l = await un('leads', 'nom_prospect'); libelle = l ? txt(l.nom_prospect) || 'demande sans nom' : ''; break }
      case 'client': {
        // La référence d'un client du CRM : la pièce d'où il vient (d = devis, l = demande, c = chantier, f = facture).
        const id = c.id.slice(2)
        const l = c.id[0] === 'd' ? await un('devis', 'client_nom', 'id', id)
          : c.id[0] === 'f' ? await un('factures', 'client_nom', 'id', id)
          : c.id[0] === 'c' ? await un('chantiers', 'client_nom', 'id', id)
          : await un('leads', 'nom_prospect', 'id', id)
        libelle = l ? txt(l.client_nom ?? l.nom_prospect) : ''
        break
      }
    }
  } catch { return null }
  const propre = libellePropre(libelle)
  return propre ? { type: c.type, id: c.id, libelle: propre } : null
}
