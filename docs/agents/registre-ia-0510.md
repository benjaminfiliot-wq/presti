# Registre des IA et outils branchés — relevé du 05/10/2026

Source de la liste : `lib/agents/moteurs.ts` (CATALOGUE du 27/09), complétée par ce qui a été ajouté depuis. Colonne « Vérifié » = constaté ce jour par une commande ou un appel réel.

| IA / outil | Rôle | État au 05/10 | Vérifié |
|---|---|---|---|
| Claude Code (PC, le chef) | juges, décisions, relecture | en service ; limite hebdomadaire à 64 % | oui |
| Claude Code (usine, exécutant) | exécutant de fiches | en service, MÊME limite que le PC | oui (essai du 05/10) |
| ECC (plugin Claude, version minimale, + plugin Codex) | ~60 agents spécialisés (revue de code, sécurité, build, SEO, marketing…) et skills | installé sur le PC ; pas sur l'usine | liste d'agents lue dans la session |
| Codex / GPT-6 (sol, luna, astra) | prospects, clients, rédaction, cycles du chef | branché, HORS QUOTA jusqu'au 9/10 21 h 15 (401 sur la file des agents) | oui |
| Antigravity (Gemini) | exécutant de code | branché, application fermée sur le PC | oui |
| freellmapi | masse sans donnée personnelle ; secours du chef | en service : 53 modèles utilisables sur 271 | oui (appel réel) |
| Ollama local | données privées après « oui » de Benj ; secours | en service (usine 4B et 8B ; PC 1,7B) | oui |
| Ollama Cloud | secours code seulement | limite gratuite atteinte | oui |
| Hermes (usine + PC) | relecture, recoupement | en service | oui |
| OpenClaw (usine + PC) | assistant en conteneur / local | en service | oui |
| StarNet | rendu de bureau, 28 agents | installé ; agents sans réponse directe (modèle trop lent) | capture regardée |
| AtomicAgent | assistant PC | installé | NON revérifié ce jour |
| **Perplexity** (connecteur Computer) | recherche ponctuelle d'une source publique | connecté : `models_list` répond (Claude Opus 5.5, modes light et standard) ; plan et coût par appel non connus | oui (appel réel) |
| **Firecrawl** | lecture d'une page publique (URL d'entreprise seulement) | clé valide : 282 crédits restants sur 1 000 (période finissant le 26/10) | oui (appel réel) |
| **Fish Audio** | voix de synthèse | NON branché : aucune clé, aucun adaptateur ; licence commerciale à prouver (essais internes seulement) | oui (absence constatée) |
| ElevenLabs | voix, compte gratuit | usage interne seulement (pas de droit commercial) | non revérifié |
| Kokoro (`ff_siwis`) | voix locale par défaut | local | non revérifié |
| faster-whisper | transcription locale | local | non revérifié |
| Laya | scores et décisions locales | local (ONNX) | non revérifié |
| Groq | — | EXCLU par Benj le 25/09 | — |

**À faire par Benj :** une clé Fish Audio et la preuve d'une licence commerciale ; pour Firecrawl, 718 crédits déjà consommés depuis le 26/09, à surveiller (la clé est dans `presti-secrets/clé api firecrawl.odt`, qui est en réalité un fichier texte).
