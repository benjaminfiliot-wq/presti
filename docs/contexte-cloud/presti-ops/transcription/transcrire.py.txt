import sys, json, time
from pathlib import Path
from faster_whisper import WhisperModel
dossier = Path(sys.argv[1])
modele = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
for f in sorted(dossier.glob("*.m4a")):
    sortie = f.with_suffix(".txt")
    if sortie.exists() and sortie.stat().st_size > 0:
        continue
    t0 = time.time()
    segments, info = modele.transcribe(str(f), beam_size=5, vad_filter=True)
    lignes = [f"[{s.start:6.1f}-{s.end:6.1f}] {s.text.strip()}" for s in segments]
    sortie.write_text(f"# {f.name} — langue {info.language} ({info.language_probability:.2f}), durée {info.duration:.1f} s\n" + "\n".join(lignes) + "\n", encoding="utf-8")
    print(f"{f.name}: {len(lignes)} segments, {time.time()-t0:.0f} s", flush=True)
