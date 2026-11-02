---
type: playbook
title: "{{title}}"
description: ""
date: "{{date}}"
status: brouillon
project: presti
declencheur: ""
executant: ""
workflow: ""
version: 1
created: "{{date}}"
updated: "{{date}}"
tags:
  - playbook
aliases: []
liens: []
sources: []
---

# {{title}}

%% Mode d'emploi : une méthode qu'on rejoue à l'identique. Elle dit qui fait quoi. Si elle est automatisée, c'est le workflow n8n qui l'exécute ; cette note en garde le pourquoi et le nom du workflow. %%
%% Statuts : brouillon → a-blanc (joué sans effet réel) → en-service ; perime quand un autre playbook le remplace. %%
%% Exemple (à effacer) : Campagne d'e-mails de prospection : lire le quota Brevo restant, envoyer, mettre le reste en file pour le lendemain. %%

## Quand s'en servir

%% Quel déclencheur ? Pour quel segment, quelle situation ? Quand ne faut-il pas s'en servir ? %%

## Avant de commencer

%% Quelles règles vérifier avec regles_pour ? Quelles décisions s'appliquent (ADR) ? Quelles données faut-il, et où sont-elles dans Supabase ? %%

## Étapes

%% Qui fait chaque étape : n8n, Hermes, Claude Code ou Benj ? Tout est automatique par défaut. Benj valide une action irréversible, sauf les exceptions écrites : la prospection e-mail, et les carrousels et vidéos une fois leurs 2-3 premiers validés. Un contenu que la QA signale repasse par lui. %%

1. 

## Garde-fous

%% Quels plafonds, quelles interdictions ? Que se passe-t-il quand un garde-fou saute : arrêt, file d'attente, alerte, retour en validation de Benj ? %%

## Mode à blanc

%% Comment le jouer sans effet réel avant la production ? À quel ancien comportement le compare-t-on ? S'il remplace une automatisation du code, une seule à la fois : workflow n8n créé → testé à blanc → comparé à l'ancien comportement → ancien code désactivé → drapeau vérifié. On ne rase rien en attendant (règle de migration de Benj, 01/11). %%

## Mesure

%% Comment sait-on que ça marche ? Quel indicateur, lu où, à quelle fréquence ? %%

## Versions

%% Une ligne par version : date, ce qui change, pourquoi (lien vers l'apprentissage ou l'erreur qui l'a provoqué). %%

- v1, {{date}} : première version.
