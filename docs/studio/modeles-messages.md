# Messages du Studio

La seule source des textes prêts à envoyer est `lib/agents/acquisition/modeles.ts`. Ce document précise quand employer ses trois modèles ; il ne fournit pas de variante rédactionnelle.

| Modèle | Usage et limites |
| --- | --- |
| `formulaire_studio_v1` | Premier contact par `formulaire_site`, soumis par le porteur de l’usine. Texte seul, sans lien, pièce jointe, prix ou affirmation qu’un essai existe déjà. Conserver la phrase de refus prévue par le modèle. |
| `studio_echantillon_v1` | Après le oui de la marque et son accord sur les photos. Le Répondeur envoie depuis le Gmail de prospection, sur le canal `email_sollicite`, la pièce jointe portant le mot « Échantillon ». Rappeler l’absence de diffusion. |
| `studio_offre_v1` | Proposition commerciale : `{videos}` et `{prix}` viennent de `lib/studio/offre.ts`. Décrire ce qui est livré et inclure le lien de commande. Exiger un accord écrit avant toute diffusion. |

Avant l’accord sur les photos, le premier message ne prétend ni avoir déjà préparé une vidéo ni pouvoir l’envoyer immédiatement.
