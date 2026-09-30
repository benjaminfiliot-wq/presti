import { SEUILS } from './contrat'
import type { Canal, EtatEnvoi, Signal, TypeEnvoi, TechnologieFormulaire } from './contrat'

type Motif = 'technologie_en_pause' | 'formulaire_coupe' | 'gmail_coupe' | 'meta_coupe' | 'modele_suspendu' | 'envoi_froid_ferme' | 'notice_perimee' | 'ads_archive_non_lue'
type CandidatEnvoi = { canal: Canal; type: TypeEnvoi; modele_id?: string; technologie?: TechnologieFormulaire; source?: string }

export function peutEnvoyer(etat: EtatEnvoi, envoi: CandidatEnvoi, maintenant: number | Date): { ok: true } | { ok: false; raison: Motif } {
  const instant = Number(maintenant)
  const coupe = (le: string | null) => le !== null && (le === 'infinity' || Date.parse(le) > instant)
  const refus = (raison: Motif): { ok: false; raison: Motif } => ({ ok: false, raison })
  if (envoi.modele_id && etat.modeles_suspendus.includes(envoi.modele_id)) return refus('modele_suspendu')
  if (envoi.type === 'premier_contact' && !etat.envoi_froid) return refus('envoi_froid_ferme')
  if (envoi.type === 'premier_contact' && envoi.source === 'meta' && !etat.ads_archive?.permis) return refus('ads_archive_non_lue')
  if (envoi.canal === 'formulaire_site') {
    if (envoi.technologie && etat.technologies.some(t => t.technologie === envoi.technologie && t.etat === 'pause')) return refus('technologie_en_pause')
    if (coupe(etat.formulaire_coupe_jusqua)) return refus('formulaire_coupe')
    if (!etat.notice_verifiee_le || Date.parse(etat.notice_verifiee_le) + 7 * 86400_000 < instant) return refus('notice_perimee')
  }
  if (envoi.canal === 'email_sollicite' && coupe(etat.gmail_coupe_jusqua)) return refus('gmail_coupe')
  if ((envoi.canal === 'reponse_privee' || envoi.canal === 'messagerie') && coupe(etat.meta_coupe_jusqua)) return refus('meta_coupe')
  return { ok: true }
}

export function estAuVert(fenetres: { plaintes_7j: number; avis_abus: number; stop_100: number; echecs_affilee: number; reponses_positives: number }, palier: string): boolean {
  return fenetres.plaintes_7j === 0 && fenetres.avis_abus === 0 && fenetres.stop_100 < SEUILS.stop_100 && fenetres.echecs_affilee < SEUILS.echecs_affilee && (palier !== 'P3' && palier !== 'P4' || fenetres.reponses_positives >= 1)
}

export function carteAttention(evenement: Pick<Signal, 'type' | 'technologie'> & { type: string; resume?: string }): { couleur: 'rouge' | 'jaune' | 'bleu'; titre: string; geste: string } {
  const technologie = evenement.technologie ?? 'inconnue'
  const cartes: Record<string, { couleur: 'rouge' | 'jaune' | 'bleu'; titre: string; geste: string }> = {
    disjoncteur_formulaire: { couleur: 'rouge', titre: 'Formulaire arrêté', geste: 'Examiner le signal et décider de la reprise depuis la station.' },
    disjoncteur_gmail: { couleur: 'rouge', titre: 'Gmail arrêté 24 h', geste: 'Vérifier la relève avant de rouvrir le canal.' },
    disjoncteur_meta: { couleur: 'rouge', titre: 'Meta arrêté 24 h', geste: 'Vérifier la cause avant de rouvrir le canal.' },
    disjoncteur_modele: { couleur: 'jaune', titre: 'Modèle suspendu', geste: 'Examiner les STOP et choisir une autre variante.' },
    disjoncteur_technologie: { couleur: 'jaune', titre: `Technologie ${technologie} en pause : 3 échecs de soumission d’affilée`, geste: 'Reprendre la technologie depuis la station quand la cause est comprise.' },
    alerte_message: { couleur: 'jaune', titre: '300 envois sans réponse', geste: 'Changer de message.' },
    palier_descendu: { couleur: 'rouge', titre: 'Palier descendu', geste: 'Examiner le voyant rouge.' },
    palier_monte: { couleur: 'bleu', titre: 'Palier monté', geste: 'Surveiller les prochains envois.' },
    bilan_p3: { couleur: 'bleu', titre: 'Bilan : passage à P3', geste: 'Suivre les réponses positives.' },
    bilan_nouveau_message: { couleur: 'jaune', titre: 'Bilan : nouveau message', geste: 'Préparer un nouveau message.' },
    bilan_arret_froid: { couleur: 'jaune', titre: 'Bilan : 0 oui sur 100 contacts froids', geste: 'Changer de segment ou d’offre avant toute reprise.' },
    notice_perimee: { couleur: 'rouge', titre: 'Notice périmée', geste: 'Vérifier la notice en ligne.' },
  }
  return cartes[evenement.type] ?? { couleur: 'jaune', titre: 'Signal d’envoi', geste: 'Examiner le journal.' }
}
