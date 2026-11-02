# Brief Hermes — fiches de lecture des vidéos de @restructureai (prompt 5, sources)

**Pour qui** : Hermes (volume, annexe 2 du prompt 5 : « fiches de lecture de vidéos »). Claude Code relit ensuite et écrit la colonne
« ce qui s'applique à Presti », qui demande du jugement.

**Entrées** (déjà sur le PC, rien à télécharger) : `D:/presti-travail/videos/references-2026-11-02/restructureai/` — pour chaque vidéo,
`<id>.transcription.json` (segments horodatés, Whisper local) et `<id>.info.json` (titre, date, légende). Les images une par seconde sont
dans `<id>-images/` si tu dois lire un schéma.

**À faire** : une fiche par vidéo, au format OBLIGATOIRE du prompt 5 (`plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`,
« Sources à étudier obligatoirement ») :

```text
Source : <titre, @restructureai, lien TikTok> · date de publication · lue le <date> · intégralement : oui/non
Ce qu'elle montre : <3 à 8 lignes, faits seulement, avec les horodatages [mm:ss]>
Principes et patterns réutilisables : <liste>
Erreurs à éviter : <liste>
Ce qui s'applique à Presti / à ce client : (laisser « à remplir par Claude Code »)
Ce qui ne s'applique pas, et pourquoi : <liste>
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés : <cités tels quels, marqués « annoncé par l'auteur, non vérifié »>
```

**Sortie** : un seul fichier, `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`, les fiches dans l'ordre des dates,
puis une liste « Vidéos manquantes ou sans son ».

**Règles** : réseau neuronal d'abord (MCP `cerveau` : `regles_pour` sur « vidéos, sources, offre entreprise ») ; faits seulement, rien
d'inventé ; un chiffre d'auteur est toujours marqué « annoncé par l'auteur, non vérifié » ; aucune donnée personnelle ; aucun envoi, aucun
compte, aucune publication ; tu n'écris que le fichier de sortie. En fin : `--fini <id> --resume "<n> fiches écrites, <m> manquantes"`.
