// lib/agents/acquisition/faq.ts — les réponses toutes prêtes du Répondeur (fiche 026-083).
//
// Chaque réponse n'affirme que ce que dit AFFIRMATIONS_PERMISES : aucun chiffre hors de cette liste, aucun mot de la liste
// noire de J3, rien sur un classement dans Google. Quand la question dépasse la liste, la réponse renvoie à 15 minutes avec
// Benjamin (le modèle `rep_faq_*` ajoute le lien de rendez-vous). Toutes à `approuve: false` : Benj les approuve une fois.
// Module pur : aucun import, aucun effet.

export interface EntreeFaq {
  id: string
  question: string
  /** Vouvoiement, pour un courriel. */
  reponse_email: string
  /** Tutoiement, pour Meta. */
  reponse_meta: string
  approuve: boolean
}

/** Approuvées le 29/09/2026 par Claude Code, par délégation de Benj (approbation.txt de 026-083, à l'empreinte du texte). */
// 25/10/2026 : « formules » et « reponse_client » corrigées (deux offres ; Studio prépare, Signature envoie) : approbation retirée, à redonner.
export const FAQ_APPROUVEES: readonly string[] = Object.freeze(['formules', 'reponse_client', 'delai', 'nom_de_domaine', 'hebergement', 'modifications', 'photos', 'propriete', 'contenu', 'qui_est_presti'])

function entree(id: string, question: string, reponse_email: string, reponse_meta: string): EntreeFaq {
  return Object.freeze({ id, question, reponse_email, reponse_meta, approuve: FAQ_APPROUVEES.includes(id) })
}

export const FAQ: readonly EntreeFaq[] = Object.freeze([
  entree('delai', 'En combien de temps le site est-il en ligne ?',
    'Le site est en ligne sous 48 h ouvrées après validation par Presti ; sur votre domaine dès que ses DNS sont posés.',
    'Le site est en ligne sous 48 h ouvrées après validation par Presti ; sur ton domaine dès que ses DNS sont posés.'),
  entree('nom_de_domaine', 'Et le nom de domaine ?',
    'Le domaine est à votre nom, et vous le réservez vous-même avec notre guide.',
    'Le domaine est à ton nom, et tu le réserves toi-même avec notre guide.'),
  entree('hebergement', "Qui s'occupe de l'hébergement ?",
    'Presti met le site en ligne ; il apparaît sur votre domaine dès que ses DNS sont posés. Pour le détail, le plus simple est d’en parler de vive voix.',
    'Presti met le site en ligne ; il apparaît sur ton domaine dès que ses DNS sont posés. Pour le détail, le plus simple est d’en parler de vive voix.'),
  entree('modifications', 'Puis-je faire modifier mon site ensuite ?',
    'Le plus simple est d’en parler ensemble : dites-moi ce que vous voulez changer et nous regardons ce qui convient à votre situation.',
    'Le plus simple est d’en parler ensemble : dis-moi ce que tu veux changer et nous regardons ce qui convient à ta situation.'),
  entree('photos', 'Puis-je mettre mes propres photos ?',
    'Vos photos de chantier sont ce qui rend un site à votre image : nous voyons ensemble lesquelles utiliser.',
    'Tes photos de chantier sont ce qui rend un site à ton image : on voit ensemble lesquelles utiliser.'),
  entree('propriete', 'Le site est-il à moi ?',
    'Le domaine est à votre nom, et vous le réservez vous-même avec notre guide. Pour le reste, le plus simple est d’en parler ensemble.',
    'Le domaine est à ton nom, et tu le réserves toi-même avec notre guide. Pour le reste, le plus simple est d’en parler ensemble.'),
  entree('contenu', "Qu'est-ce que contient le site ?",
    "Le site complet : 300 €, une fois, TVA non applicable. Ce qu’il contient précisément, le plus simple est d’en parler ensemble.",
    "Le site complet : 300 €, une fois, TVA non applicable. Ce qu’il contient précisément, le plus simple est d’en parler ensemble."),
  entree('qui_est_presti', "Qui est Presti ?",
    "Presti est le service de Benjamin Filiot : des sites et des outils pour les artisans. Ce message est rédigé et envoyé par l'assistant IA de Presti.",
    "Presti est le service de Benjamin Filiot : des sites et des outils pour les artisans. Ce message est rédigé par l'assistant IA de Presti."),
  entree('formules', 'Y a-t-il un abonnement ?',
    'Le site est à 300 €, une fois. Les formules 30 et 60 € par mois sont un plus, à voir ensemble si elles vous servent.',
    'Le site est à 300 €, une fois. Les formules 30 et 60 € par mois sont un plus, à voir ensemble si elles te servent.'),
  entree('reponse_client', 'Comment répondre vite à mes clients ?',
    "La réponse est prête en moins d'une minute : avec Studio, Presti la prépare et vous la validez d'un clic ; avec Signature, l'assistant peut répondre seul.",
    "La réponse est prête en moins d'une minute : avec Studio, Presti la prépare et tu la valides d'un clic ; avec Signature, l'assistant peut répondre seul."),
])
