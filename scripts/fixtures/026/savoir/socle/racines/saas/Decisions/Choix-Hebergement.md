# Décision : l'usine sur Oracle Cloud

Les agents tournent sur une machine Oracle Cloud ARM Ampere, deux cœurs et douze gigaoctets de mémoire, sous Ubuntu.
Les services sont des unités systemd lancées sous le compte agents ; Ollama y sert les modèles en local.
L'adresse publique de la machine change si l'instance est recréée : elle vit dans une variable, jamais dans le code.
