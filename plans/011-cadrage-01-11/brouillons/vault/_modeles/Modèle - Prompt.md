---
type: prompt
title: "{{title}}"
description: ""
date: "{{date}}"
status: brouillon
project: presti
emplacement: ""
modele: ""
version: 1
evaluation: ""
created: "{{date}}"
updated: "{{date}}"
tags:
  - prompt
  - ia
aliases: []
liens: []
sources: []
---

# {{title}}

%% Mode d'emploi : la fiche d'un prompt (un « cerveau »). Son texte fait foi là où il tourne : fichier du code, workflow n8n, skill d'agent. Ici on garde à quoi il sert, ses garde-fous et ses évaluations. %%
%% Statuts : brouillon → a-blanc (évalué sans effet réel) → en-service ; retire quand un autre prompt le remplace. %%
%% Exemple (à effacer) : Réponse au prospect sur la page publique de l'artisan : jamais de prix chiffré, signature de l'artisan présente. %%

## À quoi il sert

%% Quelle tâche ? Pour qui : artisan, prospect, client de l'artisan, usage interne ? Quelle sortie attend-on ? %%

## Où il vit

%% Quel fichier:ligne, quel workflow n8n, quelle skill ? Qui a le droit de le modifier ? Reporter l'emplacement en tête de note. %%

## Entrées et sortie

%% Quelles données entrent ? Viennent-elles d'un prospect ou d'un client ? Quel schéma strict valide la sortie ? %%

## Garde-fous

%% Que ne doit-il jamais inventer : prix sourcé, fournisseur, délai, créneau ? Le nom « Presti » peut-il apparaître devant le prospect ou le client d'un artisan ? (jamais : white-label) À l'inverse, un premier message de prospection de Presti vers un artisan présente Presti (règle de Benj du 21/10). Une donnée de prospect ou de client part-elle vers un modèle gratuit en ligne ? (jamais) %%

## Évaluation

%% Quelle mesure avant toute modification ? Quelle commande la rejoue ? Quel résultat, à quelle date ? %%

## Versions

%% Une ligne par version : date, ce qui change, résultat de l'évaluation, verdict. %%

- v1, {{date}} : première version.

## Texte

%% Seulement si cette note est la source de vérité (brouillon, prompt d'agent sans autre emplacement). Sinon, renvoyer à l'emplacement : deux copies finissent par diverger. Aucun secret, aucune donnée réelle dans les exemples. %%
