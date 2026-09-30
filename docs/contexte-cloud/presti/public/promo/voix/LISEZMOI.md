# Les voix off des dix publications

**Voix retenue : Nico** — `MAZdzkb78f8SA7DNBT41`, français natif, timbre chaud, modèle `eleven_multilingual_v2`.
Choisie par Benj le 2026-09-10, après comparaison à l’oreille avec Jérôme et Enrick.
**Une marque a une voix, pas dix** : les dix textes ont été dits par elle et par elle seule.

> ## ⚠️ Ces voix ne sont PLUS dans les vidéos livrées
>
> Benj, le 2026-09-10, après écoute : « enlève les voix c’est horrible mais mets de la
> musique à la place ». Les trente fichiers portent désormais une **musique de fond** — voir
> `promo-src/musique/LISEZMOI.md`.
>
> Ce dossier reste, et les MP3 aussi : le §7 du prompt les demande, et rien n’est perdu.
> Pour remettre la voix sur une publication : `node scripts/voix-mixer.mjs NN`.
>
> **La leçon, et elle vaut d’être écrite** : la voix était normalisée à **−16 LUFS**, un
> niveau de premier plan — celui d’un présentateur radio. La musique qui l’a remplacée est à
> **−23 LUFS**. Ce n’était pas seulement le timbre : c’était le niveau.

> Ces fichiers sont **dérivés**. La source, ce sont les textes de `promo-src/hf/voix.mjs` et le
> compte ElevenLabs de Benj. Ils sont copiés ici parce que le §7 du prompt les demande à cet
> endroit ; le pipeline, lui, lit `publications/pub-NN/voix.mp3`.

| N° | Durée | Vidéo | Marge | Mots | Poids |
|---|---|---|---|---|---|
| **01** | 21.9 s | 26.1 s | +4.2 s | 54 | 360 Ko |
| **02** | 16.9 s | 22.6 s | +5.8 s | 43 | 281 Ko |
| **03** | 20.9 s | 23.0 s | +2.1 s | 48 | 344 Ko |
| **04** | 13.7 s | 22.8 s | +9.1 s | 43 | 232 Ko |
| **05** | 17.6 s | 21.9 s | +4.4 s | 43 | 292 Ko |
| **06** | 15.6 s | 20.8 s | +5.3 s | 45 | 261 Ko |
| **07** | 16.2 s | 20.0 s | +3.8 s | 35 | 271 Ko |
| **08** | 12.9 s | 20.2 s | +7.3 s | 39 | 219 Ko |
| **09** | 18.9 s | 22.0 s | +3.1 s | 43 | 314 Ko |
| **10** | 15.0 s | 21.5 s | +6.5 s | 47 | 252 Ko |

**Aucune ne demande d’être resserrée** : toutes tiennent dans leur film, avec de la marge.
C’est le résultat de la règle des 45-60 mots du §3, apprise à mes dépens — un premier essai à
78 mots sortait à **27,6 s pour une vidéo de 26,2 s**.

## Refaire une voix

Corriger le texte dans `promo-src/hf/voix.mjs`, régénérer chez ElevenLabs avec la voix Nico,
déposer le MP3 en `publications/pub-NN/voix.mp3`, puis :

```bash
node scripts/voix-mixer.mjs NN && node scripts/voix-fiche.mjs
```

Le mixeur pose la piste sur la vidéo **déjà rendue** — une seconde, pas cinq heures — et il
remesure ensuite : il refuse si l’image a raccourci.
