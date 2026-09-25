---
name: instagram-compte-presti
description: "Le compte Instagram de Presti est @prestiapp (ex-@prem_iumagence converti), et les trois limites d'Instagram qui obligent Benj à finir sur son téléphone"
metadata:
  node_type: memory
  type: project
---

Le **2026-09-09**, le compte Instagram de l'agence OFM `@prem_iumagence` a été **converti en compte
Presti** — choix explicite de Benj (option B : l'agence perd son compte). Il avait **0 publication**,
donc rien à effacer.

État vérifié **sans session** (navigateur intégré de l'app, la « fenêtre privée » — voir
[[facebook-page-pieges]]) :

- nom de profil **`prestiapp`**, calé sur le domaine `prestiapp.fr`
- nom **`Presti · Assistant artisans`**, photo `public/marque/presti-icone-512.png`
- bio 132/150, catégorie `Produit/service` (non affichée)

**Les trois limites d'Instagram, mesurées, qui ne se devinent pas :**

1. **Le champ « Site Web » est grisé sur le web** — « la modification des liens est disponible
   uniquement sur mobile ». Le lien de bio ne se pose QUE depuis l'app. Il reste donc à
   `premiumagence.netlify.app` tant que Benj ne l'a pas changé en `https://prestiapp.fr/a/instagram`.
2. **Le nom ne change que deux fois tous les 14 jours** — une des deux est consommée depuis le 09/09.
3. **La recherche de catégorie ne répond qu'en anglais** (« Software », « Software Company »…) même
   dans une interface française, alors que les suggestions, elles, sont en français. Sur un profil
   qui s'adresse à des artisans français, garder `Produit/service` vaut mieux qu'un mot anglais.

**Le lien de bio n'a de valeur qu'après le collage de
`supabase/migrations/_A_COLLER_sql_editor_0087_NU.sql`** : sans le code `instagram` en base,
`app/a/[code]/route.ts` redirige vers l'accueil **sans poser d'empreinte**, et la colonne « Arrivé
par » du Poste de contrôle dira « Organique » pour tout le monde. Même raisonnement que 0086 pour
Facebook et LinkedIn — et le `canal = true` évite les 20 % de commission dus à personne.

**L'adresse e-mail professionnelle n'est pas remplie, exprès** : `contact@prestiapp.fr` ne reçoit
rien (voir [[presti-messagerie-entreprise]]) et `benjaminfiliot@gmail.com` est personnelle. Le choix
appartient à Benj ; la bonne réponse à terme est une vraie boîte derrière le domaine.

Publier les vidéos reste manuel : voir [[upload-video-reseaux-impossible]].
