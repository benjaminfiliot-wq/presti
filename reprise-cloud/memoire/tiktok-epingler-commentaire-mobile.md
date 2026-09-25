---
name: tiktok-epingler-commentaire-mobile
description: "Épingler un commentaire TikTok : impossible sur le web (prouvé par le code), et distribué de façon inégale sur mobile — ne pas promettre à Benj que l'appui long marchera"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 72af3754-17f0-4d57-a7e6-48b7bf69d76a
  modified: 2026-09-22T13:32:25.660Z
---

La campagne ForgeGUI exige un commentaire épinglé. Le 22/09/2026 j'ai dit à Benj de le faire au
téléphone par appui long ; **il a répondu « ça ne marche pas »**. Enquête menée, voici ce qui est établi.

**Sur le web : impossible, et c'est structurel.** Le menu « … » d'un commentaire ne propose que
« Supprimer » sur `tiktok.com`, et « Répondre » + « Supprimer » dans TikTok Studio. Preuve dans le code,
mesurée moi-même sur **6,3 Mo** de bundles chargés par la page vidéo : les seules routes commentaires
sont `comment/list`, `comment/publish`, `comment/digg`, `comment/delete`, `comment/search` — **aucune
route d'épinglage**. Témoin qui valide la mesure : l'épinglage de **vidéo**, lui, est bien présent
(`isPinnedItem`, `pinnedItem`, une cinquantaine d'occurrences de `Pinned`).

```bash
# le relevé, à refaire si besoin
grep -roh "comment/[a-z_]*" . --include=*.js | sort | uniq -c | sort -rn
```

**Sur mobile : ni documenté, ni fiable.** L'aide officielle TikTok sur les commentaires d'une
publication ne décrit que commenter et supprimer (appui long → Supprimer). Le mot « épingler »
n'apparaît dans le centre d'aide que pour le **chat d'un LIVE**, avec la note « disponible uniquement
dans l'application ». Des créateurs signalent la disparition du bouton **depuis mars 2025 au moins**,
pendant que des guides de 2026 le décrivent encore comme actuel. Formulation qui résiste :
*non documenté pour les publications, absent du web, et servi de façon inégale selon le compte et la
version d'app — sans règle publiée ni annonce de retrait.*

Thèses **réfutées** en cours de route, à ne pas resservir : « TikTok l'a supprimé en 2025 » (aucune
annonce, aucun changelog, et des plaintes antérieures à la date invoquée) ; « il faut un compte
Business » (rien côté TikTok Ads ne le suggère) ; « l'aide officielle n'en parle plus donc c'est mort »
(argument du silence : la même page ne documente pas non plus « Répondre », qui existe).

**Ce qui produit le même effet visible, et qui marche :** être le **premier** à commenter sa propre
vidéo (TikTok met en avant le commentaire du créateur), et **aimer son propre commentaire** depuis le
compte. Sur un post neuf à faible volume, le commentaire du créateur est de toute façon en tête.

Méthode : le menu « … » n'existe dans le DOM **que pendant le survol**, et les coordonnées d'un clic ne
se déduisent pas de la taille de la capture — ici la page était en `innerWidth` 1920 pour une fenêtre de
1280. Calibrer avec un écouteur `mousemove` sur deux points connus, ou cliquer par `ref`.

Voir [[clipforge-forgegui]], [[tiktok-studio-affichage-menteur]], [[content-rewards-compte-a-verifier]].
