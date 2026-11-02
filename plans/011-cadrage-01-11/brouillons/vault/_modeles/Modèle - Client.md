---
type: segment
title: "{{title}}"
description: ""
date: "{{date}}"
status: hypothese
project: presti
relation: ""
metiers: []
zone: ""
taille: ""
ref_supabase: ""
created: "{{date}}"
updated: "{{date}}"
tags:
  - segment
  - icp
aliases: []
liens: []
sources: []
---

# {{title}}

%% Mode d'emploi : un client type (un segment), jamais un vrai client. Aucune donnée opérationnelle ici : ni nom, ni coordonnées, ni adresse, ni SIREN, ni montant, ni lien vers sa fiche publique. Les vrais dossiers restent dans Supabase. %%
%% Renvoi : au plus un identifiant Supabase dans ref_supabase. De préférence le nom d'une vue ou d'un filtre, plutôt que l'identifiant d'un compte réel. %%
%% Statuts : hypothese → confirme (des échanges réels le montrent, chiffres agrégés et sourcés) ; abandonne s'il ne répond à rien. %%
%% Exemple (à effacer) : Plombier indépendant de Charente-Maritime, sans site, qui reçoit ses clients lui-même. %%

## Qui

%% Quel métier, quelle taille, quelle zone (un département, jamais une adresse) ? Comment travaille-t-il ? Prospect ou artisan déjà abonné (relation) ? %%

## Comment le reconnaître

%% Quels signaux publics le trahissent ? Quelles vérifications faire avant de lui écrire ? %%

## Ses besoins

%% Qu'est-ce qui lui fait perdre du temps ou des chantiers ? Ses mots, reformulés, jamais recopiés avec leur auteur. %%

## Comment il fait aujourd'hui

%% Papier, WhatsApp, tableur, un autre logiciel ? %%

## Ses objections

%% Que répond-il ? Quelle réponse préparée marche (renvoyer à la note des objections) ? %%

## Ce qui marche

%% Quelle accroche, quel canal, quelle offre ont obtenu une réponse ? Combien de cas, lus où ? %%

## Ce qui ne marche pas

%% Qu'est-ce qui l'a fait fuir, ou ne lui a rien dit ? %%

## L'offre qui lui va

%% Studio ou Signature ? Renvoyer à lib/plans.ts, qui fait foi. Ne recopier aucun prix. %%
