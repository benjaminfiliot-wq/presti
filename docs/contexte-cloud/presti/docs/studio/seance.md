# Séance de fabrication du Studio sur l’usine

La séance commence uniquement par une décision `studio_echantillon` : la marque a répondu oui et autorisé par écrit l’usage de ses photos. Le tourneur des pubs (026-200) reçoit la route de travail et son vault temporaire. Il ne démarre pas sur une routine.

1. Lancer `scripts/studio/garde.mjs --marque=<cle> --vault=<dossier>` sur ce vault. Un refus arrête la séance.
2. Copier la page produit datée dans le dossier de l’échantillon. Elle est la seule source des caractéristiques et promesses.
3. Relire l’accord de photos : copie de la réponse écrite, avec date et Message-ID.
4. Faire écrire sur l’usine, par Codex et le lecteur `studio`, un script de démonstration à partir de cette seule page. Chaque allégation porte l’extrait exact qui la justifie. Aucune donnée personnelle n’entre dans le modèle.
5. Prendre la vraie photo du produit sur cette page, après l’accord de la marque ; construire les plans à partir de cette photo.
6. Si des décors sont nécessaires, générer seulement des fonds avec FLUX.1 [schnell] ; ni produit ni personnage généré.
7. Produire la voix `ff_siwis` par `hyperframes tts`, avec les nombres écrits en lettres.
8. Lancer `node scripts/studio/monter.mjs <echantillon>` puis `node scripts/pub-qa.mjs <echantillon>`. Un résultat rouge arrête le dépôt.
9. Benj regarde le premier échantillon une seule fois, depuis la station. Les suivants suivent la vérification mécanique.
10. Après un `pub-qa` vert, la route de l’usine dépose l’échantillon et tranche la décision en `depose`. En repli, poste allumé : `node scripts/studio/deposer-echantillon.mjs <echantillon>`.
11. Le Répondeur envoie la pièce jointe par `studio_echantillon_v1`, depuis le Gmail de prospection.

Règles permanentes : jamais publié ; aucun témoignage ; aucun visage réel ; aucune personne ; aucun modèle vidéo ; aucun outil payant ; aucune donnée personnelle transmise à un modèle.
