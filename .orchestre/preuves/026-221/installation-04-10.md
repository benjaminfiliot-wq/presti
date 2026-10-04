# 026-221 — preuve d'installation d'OpenClaw sur l'usine (lecture seule)

Relevé du 2026-10-04T16:03:24Z, depuis le PC par ssh, compte usine. Aucune valeur de secret : noms, empreintes, codes de réseau seulement. État : RÉEL (l'installation date du 28/09 ; rien n'a été installé ni modifié aujourd'hui par cette fiche).

## Conteneurs et image
```
openclaw-relais | Up 6 days | ghcr.io/openclaw/openclaw:2026.9.6-slim
openclaw | Up 5 hours (healthy) | ghcr.io/openclaw/openclaw:2026.9.6-slim
id=sha256:0a5ff5e682e62afa19149df126aa50063bf65ef885b5c94713ce32dc0eb12e15 | repoDigests=[ghcr.io/openclaw/openclaw@sha256:0a5ff5e682e62afa19149df126aa50063bf65ef885b5c94713ce32dc0eb12e15] | arch=arm64 | cree=2026-09-23T16:38:30.190114567Z
etat=running sante=healthy demarre=2026-10-04T10:49:14.138137207Z redemarrages=0
```

Empreinte attendue par le profil (lanceur.mjs) : sha256:0a5ff5e682e62afa19149df126aa50063bf65ef885b5c94713ce32dc0eb12e15 — comparée par controlerInstallation (image : écart sinon).

## Services locaux joignables depuis l'hôte (noms et codes seulement)
```
ollama local : modeles = qwen3:4b-instruct-2507-q4_K_M, qwen3:8b-q4_K_M
freellmapi : http=200
```

## Contrôle de l'installation contre le profil (lanceur.mjs --controler)
```
# installation OpenClaw contre le profil de 026-221 : CONFORME
# modèles servis (config vivante du conteneur (docker exec)) : CONFORMES
# écarts connus et acceptés (jamais un critère vert déguisé) :
  · sorties réseau : la liste fermée est vérifiée pour les VOIES MODÈLES (sortieAutorisee, choisirModele) ; le conteneur garde un accès Internet sortant pour web_fetch / web_search, sans pare-feu (iptables interdit sur l'usine)
  · montages : dossiers dédiés sous /srv/openclaw (liste fermée montages_installation), pas des volumes nommés comme dans la forme docker run
  · relais : le conteneur « openclaw-relais » est en réseau hôte (node seul, 128 Mo, lecture seule, toutes capacités retirées) : il porte les sockets Unix vers Ollama et freellmapi
  · service de métadonnées Oracle (169.254.169.254) joignable depuis le conteneur, comme depuis tout conteneur
code de sortie : 0
```

## Contrôle réseau depuis le conteneur
Connexions TCP tentées DEPUIS le conteneur openclaw (script lu sur l'entrée standard : le système de fichiers est en lecture seule). Cibles internes seulement : aucune tentative vers anthropic.com ni claude.ai (le réseau sortant n'est pas filtré, voir « Écarts connus » de docs/agents/openclaw.md ; c'est la configuration qui ferme ce chemin, pas le pare-feu).
```
127.0.0.1:11434 OUVERT
127.0.0.1:3001 OUVERT
127.0.0.1:22 ECONNREFUSED
127.0.0.1:18789 OUVERT
172.19.0.1:22 OUVERT
172.19.0.1:11434 EHOSTUNREACH
172.19.0.1:3001 EHOSTUNREACH
10.0.0.224:22 OUVERT
10.0.0.224:11434 EHOSTUNREACH
```

Lecture : 11434 et 3001 ne répondent que par le pont (127.0.0.1 du conteneur) ; l'hôte (172.19.0.1) et l'IP privée refusent ces deux ports (EHOSTUNREACH, pare-feu de l'usine inchangé) ; 127.0.0.1:22 est fermé dans le conteneur. Le port 22 de l'hôte répond (OUVERT) : le ssh est ouvert au monde de toute façon, noté le 28/09, et le conteneur n'a aucune clé ssh. 18789 est la passerelle du conteneur lui-même, publiée sur 127.0.0.1:18800 de l'hôte seulement.

## Configuration vivante contre les modèles déclarés
Incluse dans le contrôle ci-dessus (« modèles servis (config vivante du conteneur) »). La configuration n'est lue que pour comparer ; seuls les écarts sont imprimés. Aucune chaîne ressemblant à une clé n'y figure (les secrets y sont des références « source: file »).
