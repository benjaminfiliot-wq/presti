#!/usr/bin/env python3
"""Voix off de la chaîne TikTok : synthèse locale Kokoro (voix française ff_siwis) et écoute par faster-whisper.

Appelé par voix.mjs (jamais à la main en production) :
  python voix.py lot <lot.json>        synthétise (si demandé) puis transcrit chaque réplique du lot, avec les temps des mots ;
  python voix.py transcrire <audio>    transcrit une piste (contrôle final de la vidéo) et rend les mots datés.

Lot : {"repliques": [{"texte": "...", "wav": "chemin.wav", "synthese": true|false}], "voix": "ff_siwis", "vitesse": 1.1}
Sortie (stdout, une ligne JSON) : {"repliques": [{"wav", "duree", "transcription", "mots": [{"mot", "debut", "fin"}]}]}

Modèles : Kokoro v1.0 (onnx, Apache-2.0) pris dans le cache de HyperFrames (~/.cache/hyperframes/tts), téléchargé s'il
manque ; faster-whisper (TIKTOK_WHISPER, « small » par défaut) dans le cache Hugging Face. Aucune clé, rien ne sort du poste.
"""
import json
import os
import sys
import urllib.request

KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
CACHE = os.path.join(os.path.expanduser("~"), ".cache", "hyperframes", "tts")


def modeles_kokoro():
    m = os.path.join(CACHE, "models", "kokoro-v1.0.onnx")
    v = os.path.join(CACHE, "voices", "voices-v1.0.bin")
    for chemin, nom in ((m, "kokoro-v1.0.onnx"), (v, "voices-v1.0.bin")):
        if not os.path.exists(chemin) or os.path.getsize(chemin) < 1_000_000:
            os.makedirs(os.path.dirname(chemin), exist_ok=True)
            urllib.request.urlretrieve(KOKORO + nom, chemin + ".part")
            os.replace(chemin + ".part", chemin)
    return m, v


_whisper = None


def whisper():
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel(os.environ.get("TIKTOK_WHISPER", "small"), device="cpu", compute_type="int8",
                                cpu_threads=int(os.environ.get("TIKTOK_WHISPER_FILS", "2")))
    return _whisper


def charger(chemin):
    """Audio en float32 mono 16 kHz, sans PyAV (ses versions récentes cassent faster-whisper.decode_audio)."""
    import numpy as np
    import soundfile as sf
    x, taux = sf.read(chemin, dtype="float32", always_2d=True)
    x = x.mean(axis=1)
    if taux != 16000:
        n = int(round(len(x) * 16000 / taux))
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype("float32")
    return x


def ecouter(chemin, indice=None):
    segments, _ = whisper().transcribe(charger(chemin), language="fr", word_timestamps=True, beam_size=5,
                                      vad_filter=False, condition_on_previous_text=False,
                                      initial_prompt=indice)
    mots, texte = [], []
    for s in segments:
        texte.append(s.text.strip())
        for w in s.words or []:
            mots.append({"mot": w.word.strip(), "debut": round(w.start, 3), "fin": round(w.end, 3)})
    return " ".join(texte).strip(), mots


def lot(chemin_lot):
    import soundfile as sf
    L = json.load(open(chemin_lot, encoding="utf-8"))
    kokoro = None
    sortie = []
    for r in L["repliques"]:
        if r.get("synthese"):
            if kokoro is None:
                import kokoro_onnx
                kokoro = kokoro_onnx.Kokoro(*modeles_kokoro())
            echantillons, taux = kokoro.create(r.get("dit") or r["texte"], voice=L.get("voix", "ff_siwis"),
                                               speed=float(L.get("vitesse", 1.0)), lang="fr-fr")
            sf.write(r["wav"], echantillons, taux)
        info = sf.info(r["wav"])
        # Pas d'indice pour Whisper : on veut entendre ce que la voix dit, pas ce qu'on espère.
        transcription, mots = ecouter(r["wav"])
        sortie.append({"wav": r["wav"], "duree": round(info.frames / info.samplerate, 3),
                       "transcription": transcription, "mots": mots})
    return {"repliques": sortie}


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("lot", "transcrire"):
        print("usage : voix.py lot <lot.json> | voix.py transcrire <audio>", file=sys.stderr)
        return 2
    if sys.argv[1] == "lot":
        res = lot(sys.argv[2])
    else:
        texte, mots = ecouter(sys.argv[2])
        res = {"transcription": texte, "mots": mots}
    sys.stdout.write(json.dumps(res, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
