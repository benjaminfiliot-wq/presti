#!/usr/bin/env python
# scripts/fixtures/026-pubs-contenu/pack/transcrire.py — transcription en français par faster-whisper (fiche 026-126,
# PL-8 : « transcription par faster-whisper small (en cache sur le poste) »). Le modèle et son cache sont déjà sur ce
# poste (~5 s de chargement, aucun téléchargement au premier essai). `npx hyperframes transcribe` n'est pas utilisé
# ici : il dépend d'un binaire whisper.cpp absent de ce poste (« whisper_unavailable »), alors que le paquet Python
# faster-whisper, lui, y est installé.
#
# Usage : python scripts/fixtures/026-pubs-contenu/pack/transcrire.py <fichier audio/vidéo> [--modele=small]
# Sortie : un seul objet JSON sur stdout { texte, langue, probabilite }. Code 0 si la transcription a produit du
# texte (même vide, si le fichier est bien silencieux) ; 1 sur erreur (fichier introuvable, modèle en échec…).
import sys
import json


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"erreur": "usage: transcrire.py <fichier> [--modele=small]"}))
        sys.exit(1)
    fichier = sys.argv[1]
    modele = "small"
    for a in sys.argv[2:]:
        if a.startswith("--modele="):
            modele = a.split("=", 1)[1]
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(modele, device="cpu", compute_type="int8")
        segments, info = model.transcribe(fichier, language="fr", vad_filter=True)
        texte = " ".join(s.text.strip() for s in segments).strip()
        print(json.dumps({"texte": texte, "langue": info.language, "probabilite": info.language_probability}))
    except Exception as e:  # noqa: BLE001 — toute panne doit sortir en JSON lisible par le juge, jamais une trace brute
        print(json.dumps({"erreur": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
