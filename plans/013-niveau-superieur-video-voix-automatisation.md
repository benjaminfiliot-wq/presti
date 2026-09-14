# PROMPT v14 — Changement de niveau : le juge, la voix, l'automatisation totale

> À coller dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`.
> **Ce prompt remplace le v13.** Le v13 a échoué sur trois points mesurables : zéro skill LinkedIn ou Facebook réellement utilisée, zéro skill d'animation utilisée, et des vidéos qui ne passent pas la barre. Cette fois, la barre n'est plus une phrase — c'est un script qui rend un verdict.
> **Protocole** : travail continu, jamais de pause, affichage de ce qui est en cours et du temps écoulé. Format à chaque bloc : **Vérifié · Produit · Preuve · Journal · Suivant**.

---

## §0. Pourquoi les deux tentatives précédentes ont raté

Pas par manque d'effort : parce que « fais une belle vidéo dynamique » n'est vérifiable par personne, donc rien ne t'obligeait à y arriver. On corrige ça d'abord.

**Le fichier `scripts/video-qa.mjs` est fourni avec ce prompt.** Copie-le dans `scripts/`. Il n'a aucune dépendance : ffmpeg, ffprobe, Node. Il mesure neuf critères et rend un code de sortie. **Une vidéo n'existe pas tant que ce script ne dit pas « Tout passe ».**

Voilà ce qu'il dit de la vidéo actuelle, `public/promo/presti-vertical.mp4` — je l'ai exécuté, ce ne sont pas des estimations :

```
presti-vertical.mp4  1080×1920 · 22.0 s · 946 kbps · 2.6 Mo
  OK    Format reconnu                 1080×1920 (vertical)
  OK    Durée                          22.0 s
  OK    Images par seconde             30.0
ÉCHEC   Débit                          946 kbps            attendu ≥ 3000 kbps
ÉCHEC   Aucun plan figé                2.00 s à 13.1 s     attendu ≤ 0.8 s
  OK    L'image vit                    0.0253              attendu ≥ 0.02
ÉCHEC   Rythme des coupes              4.5 / 10 s          attendu ≥ 5 / 10 s
  OK    Le cadre est rempli            96 % des images
  OK    Dernière image non blanche     15
✗ 3 critère(s) en échec — la vidéo n'est pas livrable.
```

Un plan **figé pendant deux secondes pleines à 13,1 s**, un débit trois fois trop bas, et un rythme de coupes en dessous du plancher. Ce n'est pas une question de goût, c'est mesuré. Ces trois lignes doivent passer au vert, sur **chaque** vidéo et **chaque** format, avant la moindre livraison.

Et le script n'est pas le plafond, c'est le plancher. Il attrape les défauts grossiers ; il ne juge pas si c'est beau. Le beau, ce sont les skills du §2.

---

## §1. Les skills — la preuve d'usage, sinon ça n'a pas eu lieu

Le v13 demandait d'utiliser les skills LinkedIn et Facebook. **Aucune n'a été utilisée.** Donc cette fois, l'usage se prouve.

Tu tiens `plans/preuve-skills.md`. Pour **chaque** skill invoquée : son nom, l'entrée que tu lui as donnée, **la sortie brute qu'elle a rendue**, et ce que tu as changé à cause d'elle. Une skill sans ces quatre lignes est réputée non utilisée, et le bloc est à refaire.

### 1.1 Ce qui dort déjà dans le dépôt

`.claude/skills/` contient **huit skills d'animation et de design** installées et jamais ouvertes. C'est exactement ce qui manquait aux vidéos :

| Skill | Ce que tu en fais |
|---|---|
| `animation-vocabulary` | **À lire en premier.** Le vocabulaire des mouvements : tu ne peux pas composer ce que tu ne sais pas nommer. |
| `animate` | La construction des timelines. |
| `find-animation-opportunities` | Passe chaque plan dedans : où est-ce que rien ne bouge alors que quelque chose le devrait ? |
| `improve-animations` | Sur chaque composition, avant rendu. |
| `review-animations` | **Après** rendu, sur la composition — la relecture critique. |
| `apple-design` | Le sens du détail : espacements, courbes d'accélération, retenue. |
| `emil-design-eng` | La rigueur d'exécution côté ingénierie visuelle. |
| `presti-design` | La marque : `#0A0C11` nuit, `#D97757` corail, `#F3EEE6` crème, Bricolage Grotesque + Hanken Grotesk. |

Ordre imposé par vidéo : `animation-vocabulary` → composition → `find-animation-opportunities` → `improve-animations` → rendu → `video-qa` → `review-animations` → correction → rendu → `video-qa`. **Deux passes minimum.** Une vidéo qui n'a vu qu'une passe n'est pas finie.

### 1.2 LinkedIn et Facebook

`linkedin-skills` **1.0.33** (11 skills) et `facebook-skills` **1.0.18** (8 skills), installées au niveau utilisateur. Commence par **lister leur contenu réel** et l'écrire au journal — n'invente pas les noms.

Ordre imposé par texte LinkedIn : `linkedin-post-writer` → la skill de hooks s'il y en a une → **`linkedin-humanizer --mode audit`, obligatoire**, avec ce qu'il a relevé et ce que tu en as fait, consigné.

Deux réserves qui tiennent toujours : elles sont **écrites en anglais** pour une cible d'artisans français — elles servent à la structure, jamais au ton ; et elles tournent **en mode brouillon** sans clés, ce qui est voulu au §4.

---

## §2. La barre visuelle — ce que « professionnel » veut dire, concrètement

Le script du §0 attrape les fautes. Ce paragraphe dit ce qu'il faut viser au-dessus.

**Le montage.** Battements de 1,3 à 1,6 s. Coupes franches. Si un plan dure plus de 2 s, il s'y passe deux choses distinctes. Aucun fondu au noir mou entre deux idées — les fondus servent aux respirations, pas aux transitions.

**Les changements de plan.** Ce sont eux qui font la différence entre un diaporama et un film. Trois familles à alterner, jamais la même deux fois de suite :

- **La coupe sur mouvement** — le texte sort par la gauche à la vitesse où l'image suivante entre par la gauche. L'œil ne voit pas la couture.
- **Le raccord d'échelle** — on passe du plan large de la conversation au gros plan sur la ligne du devis, en gardant le même point d'ancrage à l'écran.
- **Le masque qui balaie** — une forme (la ligne d'horizon de l'aube, un bloc corail) traverse le cadre et découvre le plan suivant.

**Les slides.** Une idée par écran, six mots maximum, le texte à 70-85 % de la largeur utile. La typographie entre **par lettres ou par mots décalés** (30 à 60 ms d'écart), jamais d'un bloc avec un fondu. Les courbes d'accélération sont asymétriques — sortie rapide, arrivée qui s'installe — jamais du `linear`.

**Les captures produit.** Recadrages de détail : la bulle du message qui arrive, la ligne du devis, le total. Jamais un téléphone entier posé au milieu du cadre. La capture bouge toujours légèrement (translation de 2 à 4 %, ou une échelle qui respire), et un élément s'y surligne au moment précis où le sous-titre en parle.

**Le fond.** Il n'est jamais mort : grain fin animé, halo corail qui dérive lentement, ligne d'horizon qui se déplace. C'est ce qui sépare une vidéo d'une image fixe avec du texte dessus.

**Le réalisme.** Aucune interface redessinée, aucune scène générée par IA, aucun artisan de synthèse. Les captures viennent du vrai produit (`public/demo/*.webp`, ou `scripts/demo-captures.mjs` sur le compte de démonstration) — vérifie qu'aucune donnée réelle d'artisan ou de prospect n'y figure. Une interface inventée dans une publicité est une fausse représentation du produit.

**Formats** : vertical 1080×1920 (Reels, Stories), carré haut 1080×1350 (fils), paysage 1920×1080 (LinkedIn natif). Le vertical est la référence ; les autres en dérivent par **réagencement**, jamais par bandes noires. Une miniature lisible par format.

---

## §3. La voix — humaine, française, et pas un présentateur radio

`mcp__ElevenLabs__*` est disponible. Si le connecteur n'est pas branché côté Claude Code, utilise l'API HTTP avec `ELEVENLABS_API_KEY` (jamais la clé en dur : `.env.local`, et `.env.local` reste dans `.gitignore`).

**La méthode :**

1. `creative_list_voices` — liste les voix, et **choisis-en une seule** que tu gardes pour les dix vidéos. Une marque a une voix, pas dix.
2. Le profil recherché : **homme, français natif, 35-50 ans, timbre grave, débit posé**. Pas d'énergie de publicité, pas de sourire dans la voix. Quelqu'un qui explique un métier à un collègue.
3. `creative_generate_speech` par vidéo. **45 à 60 mots pour 25 secondes** — au-delà, ça débite et ça sonne faux.
4. Le texte dit est **différent** du sous-titre : le sous-titre est ramassé (six mots), la voix développe. Si la voix récite le sous-titre mot pour mot, on entend un prompteur.
5. Musique : discrète, libre de droits, **−18 dB sous la voix**, et coupée pendant les silences.

**Et malgré la voix, la vidéo reste entièrement compréhensible sans son** : sous-titres incrustés, ≥ 54 px sur 1080 de large, fort contraste. La majorité des lectures se font en silence.

Vérifie une chose avant de tout produire : génère **une seule** phrase avec la voix retenue, écoute-la, et si elle sonne synthétique, change de voix avant les neuf autres. Une mauvaise voix ruine dix bonnes vidéos.

---

## §4. L'automatisation à 100 % — ce qui la rend possible

C'est faisable, et gratuitement. La brique qui manque n'est pas du code : c'est une clé d'API.

**Publora** — c'est exactement le service que les skills `linkedin-skills` et `facebook-skills` attendent déjà (`PUBLORA_API_KEY`, `LINKEDIN_PLATFORM_ID`, `FACEBOOK_PLATFORM_ID`). Il publie et programme sur dix réseaux, dont LinkedIn, Facebook et Instagram, avec la vidéo.

| Ce qu'il faut savoir | |
|---|---|
| Authentification | en-tête `x-publora-key` |
| Programmer un post | `POST /create-post` (plusieurs plateformes en un appel) |
| Envoyer une vidéo | `GET /get-upload-url` puis dépôt sur l'URL signée |
| Suivre / annuler | `/get-post/:id`, `/list-posts`, `/delete-post/:id` |
| Offre gratuite | **15 publications par mois, 3 comptes connectés, accès API complet** |

Trois comptes, dix publications par mois : **l'offre gratuite suffit exactement**. Si le volume double plus tard, c'est 2,99 $ par compte.

**Ce que tu construis** — `scripts/pipeline.mjs`, une seule commande de bout en bout :

```
node scripts/pipeline.mjs --dry-run   # tout sauf l'envoi : rend, juge, montre le calendrier
node scripts/pipeline.mjs             # + dépose les médias et programme les publications
```

Les étapes, dans cet ordre, et **chacune bloque la suivante** :

1. Rend les dix vidéos, trois formats chacune, depuis les compositions versionnées.
2. Passe **toutes** les sorties dans `video-qa.mjs`. **Un seul échec arrête le pipeline** — on ne publie pas une vidéo qui ne passe pas.
3. Lit `plans/publications-10.md` : texte retenu, canal, date, heure.
4. Dépose les médias (`/get-upload-url`), crée les publications programmées (`/create-post`), avec le lien tracké `prestiapp.fr/a/<code>` du canal.
5. Écrit au journal : date, heure, canal, numéro, variante, identifiant Publora retourné.
6. En cas d'erreur d'API : réessaie une fois, puis s'arrête en disant précisément quoi. **Jamais de reprise en boucle sur un compte social** — c'est comme ça qu'on se fait suspendre.

**Le déclencheur** : une tâche planifiée Windows ou une GitHub Action hebdomadaire qui appelle `--dry-run`, et n'envoie que si le juge est vert. Benj garde une chose et une seule : **valider la variante de texte**. Le reste tourne sans lui.

**Une limite honnête** : LinkedIn reste le réseau le plus strict sur l'automatisation. Un rythme régulier et modéré passe ; une rafale se fait sanctionner. Le calendrier du §5 est calé là-dessus, ne l'accélère pas.

---

## §5. Le calendrier et la mesure

Dix publications sur trois semaines, trois par semaine, jamais deux le même jour sur le même canal. Les créneaux où un artisan regarde son téléphone : **6 h 30 – 7 h 30**, la pause de midi, et **après 19 h**. Propose les dates dans le livrable.

Un code d'apport **par canal** (`facebook`, `linkedin`, `instagram`), posé dans chaque lien — `app/a/[code]/route.ts`. **Avant la première publication**, vérifie que les trois codes existent, sont actifs, et que la colonne « canal d'arrivée » de l'onglet Clients du Poste de contrôle se remplit. Une campagne qu'on ne mesure pas se refait à l'aveugle.

---

## §6. Le socle — ce qui prime sur tout ce que j'écris ici

Avant la première phrase de publication, relis et considère comme la loi :

- `plans/publications-lancement.md` **§0 — Le socle vérifié** ;
- `plans/accroches-par-metier.md` **« Les neuf phrases interdites »**.

En cas de conflit avec ce prompt, **ce sont eux qui gagnent**, et tu notes la correction.

**Et la dette du v13 reste due** — `SaaS/Prospection/Guide-Presti-Demarchage.md` contient trois affirmations que ton audit contredit (« rien ne part sans votre clic » alors que l'accusé de réception part seul ; « relances automatiques toutes formules » alors qu'elles ne sont planifiées que si l'assistant a répondu lui-même ; « aucun barème imposé » alors que des ordres de grandeur du marché servent pour ce qui n'est pas saisi). Corrige-les **en premier** : ce guide est entre les mains de gens qui démarchent aujourd'hui.

**Interdits absolus, quelle que soit la tentation** : aucun chiffre non sourcé — seul le **7 ×** de la Harvard Business Review passe, avec sa source à l'écran ; aucun témoignage, avis, logo client ou « ils nous font confiance » ; aucune capture fabriquée ; aucune promesse sur WhatsApp, les réseaux sociaux, le SMS ou le téléphone ; aucune remise inventée.

---

## §7. Livrables

- `scripts/video-qa.mjs` en place, et **la sortie complète du juge, verte, pour les trente fichiers** (10 vidéos × 3 formats) collée au journal.
- `promo-src/` — les compositions versionnées, une par publication.
- `public/promo/pub-01/` … `pub-10/` — vidéos + miniatures.
- `public/promo/voix/` — les pistes de voix, et le nom de la voix retenue.
- `scripts/pipeline.mjs` — la commande unique, avec son `--dry-run`.
- `plans/publications-10.md` — par publication : deux variantes, premier commentaire, trois réponses type, sourçage ligne à ligne, canal, date.
- `plans/preuve-skills.md` — le registre d'usage des skills (§1).
- `SaaS/Prospection/Guide-Presti-Demarchage.md` corrigé.

---

## §8. Ce que seul Benj peut faire

| # | Action | Pourquoi |
|---|---|---|
| H1 | Créer le compte **Publora** (offre gratuite) et connecter les trois réseaux | Il faut ses identifiants ; ensuite tout est automatique |
| H2 | Poser `PUBLORA_API_KEY` et `ELEVENLABS_API_KEY` dans `.env.local` | Aucune clé ne passe par le dépôt |
| H3 | Choisir la variante de texte pour chacune des dix | C'est sa voix — et c'est la seule chose qui lui reste à faire |
| H4 | Écouter la voix retenue avant les dix générations | Une mauvaise voix ruine tout le lot |
| H5 | Valider le titulaire OVH de `prestiapp.fr` **avant le 2026-10-01** | Sinon dix publications pointent vers un domaine suspendu |

---

**La règle qui résume ce prompt** : tu ne déclares rien terminé sur une impression. Une vidéo est terminée quand `video-qa.mjs` sort au vert et que `review-animations` est passé dessus. Un texte est terminé quand `linkedin-humanizer` est passé dessus et que c'est écrit dans `preuve-skills.md`. Tout le reste est une opinion, et les opinions ont déjà échoué deux fois.
