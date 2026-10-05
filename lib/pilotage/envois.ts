// Source : voie gratuite du 25/09, §2 et §3.2.
export const SEUILS_SANTE = { plaintes7j: 0, avisAbus: 0, stop100: 3, echecsAffilee: 3 } as const

export const LIBELLES_CANAUX: Record<string, string> = {
  formulaire_site: 'Formulaire du site',
  email_sollicite: 'E-mail (sollicité)',
  reponse_privee: 'Réponse privée',
  messagerie: 'Messagerie',
  instagram: 'Instagram (entrant)',
  facebook: 'Facebook (entrant)',
}

type Verdict = 'pass' | 'refus' | null
type Ligne = {
  id: string
  canal: string
  technologie: string | null
  type: 'premier_contact' | 'relance' | 'lien_maquette' | 'reponse'
  statut: string
  metier: string | null
  commune: string | null
  variante: string | null
  froid: boolean
  verdicts: { j1: Verdict; j3: Verdict; second: Verdict }
  prepare_le: string | null
  envoye_le: string | null
}
type Canal = {
  canal: string
  palier: string | null
  plafond: number | null
  utilises: number
  plaintes_7j: number | null
  avis_abus: number | null
  stop_100: number | null
  echecs_affilee: number | null
  reponses_positives: number | null
}
type Technologie = {
  technologie: string
  envois_jour: number
  echecs_affilee: number
  etat: 'active' | 'pause'
  pause_motif: string | null
}

export function compteur(utilises: number, plafond: number | null) {
  return plafond === null
    ? { texte: `${utilises} / plafond non réglé`, plein: true, reste: null }
    : { texte: `${utilises}/${plafond}`, plein: utilises >= plafond, reste: Math.max(0, plafond - utilises) }
}

export function santeCanal(c: Canal): { etat: 'vert' | 'rouge' | 'inconnu'; raisons: string[] } {
  const raisons: string[] = []
  if (c.plaintes_7j !== null && c.plaintes_7j > SEUILS_SANTE.plaintes7j) raisons.push(`${c.plaintes_7j} plainte(s) en 7 jours`)
  if (c.avis_abus !== null && c.avis_abus > SEUILS_SANTE.avisAbus) raisons.push(`${c.avis_abus} avis d’abus`)
  if (c.stop_100 !== null && c.stop_100 > SEUILS_SANTE.stop100) raisons.push(`${c.stop_100} STOP sur les 100 derniers envois`)
  if (c.echecs_affilee !== null && c.echecs_affilee >= SEUILS_SANTE.echecsAffilee) raisons.push(`${c.echecs_affilee} échecs de soumission d’affilée`)
  if (c.palier === 'P3' || c.palier === 'P4') {
    if (c.reponses_positives !== null && c.reponses_positives < 1) raisons.push('0 réponse positive au palier ' + c.palier)
  }
  if (raisons.length) return { etat: 'rouge', raisons }
  const mesures = [c.plaintes_7j, c.avis_abus, c.stop_100, c.echecs_affilee, c.reponses_positives]
  return { etat: mesures.some((x) => x == null) ? 'inconnu' : 'vert', raisons: [] }
}

function jourParis(date: string | null): string | null {
  if (!date) return null
  const valeur = new Date(date)
  if (!Number.isFinite(valeur.getTime())) return null
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(valeur)
}

export function envoisDesAgents(lignes: readonly Ligne[], canaux: readonly Canal[], technologies: readonly Technologie[], maintenant: Date) {
  const aujourdHui = jourParis(maintenant.toISOString())
  const duJour = lignes.filter((ligne) => jourParis(ligne.envoye_le ?? ligne.prepare_le) === aujourdHui)
    .sort((a, b) => Date.parse(b.envoye_le ?? b.prepare_le ?? '') - Date.parse(a.envoye_le ?? a.prepare_le ?? ''))
  const envois = duJour.map((ligne) => {
    const verdicts = { j1: ligne.verdicts?.j1 ?? null, j3: ligne.verdicts?.j3 ?? null, second: ligne.verdicts?.second ?? null }
    return {
      id: ligne.id, canal: ligne.canal, technologie: ligne.technologie ?? null, type: ligne.type,
      statut: ligne.statut, metier: ligne.metier ?? null, commune: ligne.commune ?? null,
      variante: ligne.variante ?? null, froid: ligne.froid, verdicts,
      complet: verdicts.j1 === 'pass' && verdicts.j3 === 'pass' && verdicts.second === 'pass',
      envoye_le: ligne.envoye_le ?? null,
    }
  })
  const formulaire = canaux.find((c) => c.canal === 'formulaire_site')
  return {
    palier: formulaire?.palier ?? null,
    parCanal: canaux.map((c) => ({ canal: c.canal, libelle: LIBELLES_CANAUX[c.canal] ?? c.canal, ...compteur(c.utilises, c.plafond), sante: santeCanal(c) })),
    parTechnologie: technologies.map((t) => ({ technologie: t.technologie, envois: t.envois_jour, echecs_affilee: t.echecs_affilee, etat: t.etat, pause_motif: t.pause_motif ?? null })),
    envois,
    rejets: envois.filter((e) => Object.values(e.verdicts).includes('refus')).length,
    anomalies: envois.filter((e) => e.statut === 'envoye' && !e.complet).map((e) => ({ id: e.id, raison: 'verdicts_incomplets' as const })),
    vide: (!formulaire || formulaire.plafond === 0) && !envois.some((e) => e.froid)
      ? "Aucun envoi à froid : le canal formulaire s'ouvre après la mesure à sec, l'épreuve de bout en bout et l'ouverture par Benj."
      : null,
  }
}
