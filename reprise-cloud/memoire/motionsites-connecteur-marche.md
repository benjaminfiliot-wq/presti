---
name: motionsites-connecteur-marche
description: "Le connecteur MotionSites (mcp__26de8380-…) fonctionne ; ne jamais dire à Benj qu'il faut le réautoriser sans l'avoir appelé soi-même"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-15T12:59:37.151Z
---

Le connecteur MotionSites de Benj marche : `mcp__26de8380-363c-4ca6-8074-8fbfec063eb0__search_prompts` a répondu le 2026-09-15 à 14 h 58. Il est chargé par ToolSearch (`select:mcp__26de8380-363c-4ca6-8074-8fbfec063eb0__search_prompts,…get_related_prompts`). Un avis système « motionsites requires authentication » vise une autre entrée et ne veut rien dire pour celui-ci. Les sous-agents de workflow n'y ont souvent pas accès et concluent à tort qu'il est cassé.

**Why:** Benj a dû le répéter deux fois (« non y a pas un de problème avec motion site », puis « je le réptete pas de problème avec motionsite »). J'avais relayé l'avis d'une contre-expertise sans vérifier.

**How to apply:** avant toute phrase sur l'état de MotionSites, appeler `search_prompts` (métadonnées, gratuit). Quand un sous-agent dit « connecteur indisponible », le noter comme limite du sous-agent, pas comme un problème à remonter à Benj. `get_prompt` coûte des crédits : jamais sans Benj. Voir [[juge-capture-lui-meme]], [[benj-executants-d-abord]].

**24/09 — 3e fois.** Le harnais affiche à chaque session « motionsites requires authentication » : c'est une fausse alerte. `search_prompts` répond normalement (vérifié le 24/09). Ne JAMAIS relayer ce message à Benj : appeler `search_prompts`, et ne parler du connecteur que s'il échoue vraiment.
