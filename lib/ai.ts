import Anthropic from '@anthropic-ai/sdk'

// ⚙️ Modèle utilisé pour rédiger les réponses aux prospects.
// Haiku = rapide + très économique, parfait pour des réponses courtes en volume.
// Pour des réponses plus soignées, remplace par 'claude-opus-5' (plus cher).
const AI_MODEL = 'claude-haiku-4-5'

// Lit automatiquement ANTHROPIC_API_KEY depuis .env.local (côté serveur uniquement).
const client = new Anthropic()

type Artisan = { nom: string | null; metier: string | null; ton_style: string | null }
type Lead = { nom_prospect?: string | null; contact?: string | null; message?: string | null }

/**
 * Rédige, dans le ton de l'artisan, la première réponse à envoyer au prospect.
 * Renvoie uniquement le corps du message (français, 1re personne).
 */
export async function generateLeadReply(artisan: Artisan, lead: Lead): Promise<string> {
  const nomArtisan = artisan.nom?.trim() || "l'artisan"
  const metier = artisan.metier?.trim() || 'artisan'
  const ton = artisan.ton_style?.trim() || 'professionnel, chaleureux et rassurant'
  const nomProspect = lead.nom_prospect?.trim() || 'non précisé'
  const besoin = lead.message?.trim() || '(aucune précision donnée)'

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE la toute première réponse à un prospect qui vient de demander un devis via son site.
Ton et style à respecter absolument : ${ton}

Règles :
- Écris en français, à la première personne (comme si c'était ${nomArtisan} qui écrivait lui-même).
- Remercie le prospect, montre que tu as bien compris son besoin, et propose la prochaine étape concrète : un appel, une visite pour chiffrer, ou une question de précision si le besoin est trop flou.
- Reste court : 4 à 7 phrases maximum, pas de blabla.
- Ne donne JAMAIS de prix chiffré (tu n'as pas les détails).
- Termine par une formule de politesse signée « ${nomArtisan} ».
- Renvoie UNIQUEMENT le texte de l'email : pas d'objet, pas de « Voici la réponse », pas de balises.`

  const user = `Nom du prospect : ${nomProspect}
Besoin décrit par le prospect : ${besoin}`

  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  })

  let out = ''
  for (const block of res.content) {
    if (block.type === 'text') out += block.text
  }
  return out.trim()
}

/**
 * Rédige une relance (follow-up) dans le ton de l'artisan.
 * rang : 1 = douce, 2 = rappel avec créneau, 3 = dernière relance.
 */
export async function generateRelanceReply(artisan: Artisan, lead: Lead, rang: number): Promise<string> {
  const nomArtisan = artisan.nom?.trim() || "l'artisan"
  const metier = artisan.metier?.trim() || 'artisan'
  const ton = artisan.ton_style?.trim() || 'professionnel, chaleureux et rassurant'
  const nomProspect = lead.nom_prospect?.trim() || 'non précisé'
  const besoin = lead.message?.trim() || '(aucune précision donnée)'
  const contexte =
    rang <= 1
      ? "C'est une PREMIÈRE relance douce : le prospect n'a pas répondu depuis quelques jours."
      : rang === 2
        ? "C'est une DEUXIÈME relance : rappelle-toi sans insister et propose un créneau concret."
        : "C'est une DERNIÈRE relance : reste courtois, laisse la porte ouverte sans relancer davantage."

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE un email de relance à un prospect qui avait demandé un devis mais n'a pas donné suite.
Ton et style à respecter : ${ton}
${contexte}

Règles :
- Français, première personne (comme si c'était ${nomArtisan}).
- Très court : 3 à 5 phrases. Aucune pression, aucune culpabilisation.
- Rappelle brièvement le besoin et propose une prochaine étape simple.
- Jamais de prix chiffré.
- Termine par une formule de politesse signée « ${nomArtisan} ».
- Renvoie UNIQUEMENT le texte de l'email.`

  const user = `Nom du prospect : ${nomProspect}
Besoin initial : ${besoin}
Numéro de relance : ${rang}`

  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 700,
    system,
    messages: [{ role: 'user', content: user }],
  })

  let out = ''
  for (const block of res.content) {
    if (block.type === 'text') out += block.text
  }
  return out.trim()
}

/** Modèle de relance de secours (utilisé si l'IA n'est pas disponible). */
export function relanceTemplate(nomArtisan: string | null, nomProspect: string | null, rang: number): string {
  const a = nomArtisan?.trim() || 'votre artisan'
  const p = nomProspect?.trim() ? `${nomProspect.trim()}, ` : ''
  if (rang <= 1) {
    return `Bonjour ${p}

Je reviens vers vous suite à votre demande. Souhaitez-vous qu'on avance ensemble ? Je reste à votre disposition pour convenir d'un rendez-vous ou répondre à vos questions.

Bien à vous,
${a}`
  }
  if (rang === 2) {
    return `Bonjour ${p}

Je me permets de vous relancer concernant votre projet. Si c'est toujours d'actualité, dites-moi simplement quand vous êtes disponible et je m'organise.

Bien à vous,
${a}`
  }
  return `Bonjour ${p}

Sans nouvelles de votre part, je mets votre demande de côté pour l'instant — mais n'hésitez pas à me recontacter dès que vous le souhaitez, je serai ravi de vous aider.

Bien à vous,
${a}`
}
