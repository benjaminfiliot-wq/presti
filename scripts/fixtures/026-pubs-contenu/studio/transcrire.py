#!/usr/bin/env python3
# scripts/fixtures/026-pubs-contenu/studio/transcrire.py — transcription français de scripts/pub-qa.mjs (PQ-4, fiche
# 026-128), par faster-whisper (modèle "small", déjà en cache le 24/09 — mémoire outils locaux vérifiés). Aucun appel
# réseau : le modèle est chargé depuis le cache local ; si le cache est absent, l'appel lève une erreur claire.
#
# Usage : python transcrire.py <fichier audio ou video>
# Sortie : une seule ligne JSON sur stdout, {"texte": "...", "langue": "fr", "duree": <secondes>}. Code 1 sur erreur
# (message clair sur stderr), 0 sinon.
import sys
import io
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

if len(sys.argv) != 2:
    print("usage : python transcrire.py <fichier>", file=sys.stderr)
    sys.exit(2)

fichier = sys.argv[1]

try:
    from faster_whisper import WhisperModel
except Exception as e:  # pragma: no cover — message clair si le paquet manque
    print(f"faster_whisper introuvable : {e}", file=sys.stderr)
    sys.exit(1)

try:
    modele = WhisperModel("small", device="cpu", compute_type="int8")
    segments, info = modele.transcribe(fichier, language="fr", beam_size=5, vad_filter=False)
    texte = " ".join(s.text.strip() for s in segments)
    print(json.dumps({"texte": texte, "langue": info.language, "duree": info.duration}, ensure_ascii=False))
except Exception as e:
    print(f"transcription de {fichier} : {e}", file=sys.stderr)
    sys.exit(1)
