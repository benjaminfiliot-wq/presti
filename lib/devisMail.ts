// Le texte de l'e-mail qui accompagne un devis envoyé. Une seule écriture : la route d'envoi (app/api/devis/[id]/envoyer)
// l'envoie, et l'assistant de gestion (lib/assistant) l'affiche en entier sur la carte de confirmation AVANT l'envoi.
export function mailDevis(d: { numero?: string | null; client_nom?: string | null; objet?: string | null; validite_jours?: number | null }, nomEntreprise: string): { subject: string; text: string } {
  return {
    subject: `Votre devis ${d.numero || ''} — ${nomEntreprise}`,
    text: `Bonjour ${d.client_nom || ''},\n\nVeuillez trouver ci-joint votre devis${d.objet ? ` pour : ${d.objet}` : ''}. Il est valable ${d.validite_jours || 90} jours.\n\nN'hésitez pas à me contacter pour toute question.\n\nBien à vous,\n${nomEntreprise}`,
  }
}
