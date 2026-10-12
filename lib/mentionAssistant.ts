// La mention « écrit par un assistant » des e-mails qui partent SANS relecture de l'artisan.
//
// Ma plateforme promet : « Votre client voit toujours qu'il parle à un assistant » (app/plateforme/Reglages.tsx). C'était vrai
// sur la page de conversation (PlatChat), faux par e-mail : la première réponse automatique et les relances J+2/5/10 partaient
// sous le nom de l'artisan, à la première personne, sans rien dire (audit des promesses du 12/10, produit, ligne 67). Le
// règlement européen sur l'IA (règlement (UE) 2024/1689, art. 50, applicable depuis le 02/08/2026) impose d'informer la
// personne qu'elle échange avec un système d'IA.
//
// Un message que l'artisan a relu et validé (ou écrit) est le sien : il ne porte pas cette mention.
//
// Module pur (aucun import) : testable avec `node --experimental-strip-types`.

/** La ligne ajoutée en pied d'un e-mail écrit et envoyé par l'assistant, sans relecture. Courte et sobre. */
export function mentionAssistant(nomArtisan: string | null | undefined): string {
  const nom = String(nomArtisan ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 70)
  return `Message rédigé et envoyé automatiquement par l’assistant${nom ? ` de ${nom}` : ''}.`
}

/** Le texte de l'e-mail, mention comprise (séparée du corps par un filet). N'ajoute jamais la mention deux fois. */
export function avecMentionAssistant(texte: string, nomArtisan: string | null | undefined): string {
  const corps = String(texte ?? '').trimEnd()
  const mention = mentionAssistant(nomArtisan)
  if (corps.endsWith(mention)) return corps
  return `${corps}\n\n—\n${mention}`
}
