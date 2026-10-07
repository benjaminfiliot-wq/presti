#!/bin/bash
# scripts/modele/usine/preneur-fusion.sh — sur l'usine (compte gardien), la voie qui a marché le 06/10 pour le Chef léger, adaptée au preneur :
# l'adaptateur QLoRA rapatrié de Kaggle → fusion dans Qwen2.5-1.5B-Instruct (CPU, basse priorité) → GGUF f16 (convert_hf_to_gguf.py) → Q4_K_M (llama-quantize)
# → import dans l'Ollama de l'usine par son API locale (/api/blobs puis /api/create avec files, gabarit de chat Qwen, consigne, paramètres) :
# Ollama 0.34 ne quantifie pas en Q4_K_M à l'import, on lui donne le fichier déjà quantifié.
# Réutilise le venv (torch CPU, transformers, peft) et llama.cpp (llama-quantize compilé) de ~/modele-fusion ; travaille dans ~/modele-fusion-preneur.
# Prérequis : ~/modele-fusion-preneur/adaptateur (copié par scp) et ~/modele-fusion-preneur/systeme.txt (la consigne du preneur sans passages).
# Jamais entre H:05 et H:20 UTC (cycles du Chef) : le script attend la fin de la plage avant chaque étape lourde.
set -euo pipefail
cd ~/modele-fusion-preneur
exec >> fusion.log 2>&1
attendre_hors_cycle() { while m=$(date -u +%-M); [ "$m" -ge 5 ] && [ "$m" -le 20 ]; do echo "   pause (cycle du Chef, $(date -u +%T))"; sleep 60; done; }
echo "== début $(date -u +%T)"
. ~/modele-fusion/venv/bin/activate
attendre_hors_cycle
nice -n 19 python - <<'PY'
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
base = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct", torch_dtype=torch.float16, low_cpu_mem_usage=True)
tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct")
fusion = PeftModel.from_pretrained(base, "adaptateur").merge_and_unload()
fusion.save_pretrained("fusion", safe_serialization=True)
tok.save_pretrained("fusion")
print("fusion ok")
PY
echo "== fusion ok $(date -u +%T)"
attendre_hors_cycle
nice -n 19 python ~/modele-fusion/llama.cpp/convert_hf_to_gguf.py fusion --outfile f16.gguf --outtype f16
attendre_hors_cycle
nice -n 19 ~/modele-fusion/llama.cpp/build/bin/llama-quantize f16.gguf presti-preneur-1.5b-q4_K_M.gguf Q4_K_M | tail -3
ls -la presti-preneur-1.5b-q4_K_M.gguf
python - <<'PY'
import hashlib, json, os, urllib.request
B = "http://127.0.0.1:11434"
p = "presti-preneur-1.5b-q4_K_M.gguf"
h = hashlib.sha256()
with open(p, "rb") as f:
    for bloc in iter(lambda: f.read(1 << 20), b""): h.update(bloc)
d = "sha256:" + h.hexdigest()
with open(p, "rb") as f:
    urllib.request.urlopen(urllib.request.Request(f"{B}/api/blobs/{d}", data=f, method="POST", headers={"content-length": str(os.path.getsize(p))}), timeout=3600).read()
print("blob", p, os.path.getsize(p), d)
corps = {
  "model": "presti-preneur:1.5b",
  "files": {p: d},
  "template": "{{- if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}{{- range .Messages }}{{- if ne .Role \"system\" }}<|im_start|>{{ .Role }}\n{{ .Content }}<|im_end|>\n{{ end }}{{- end }}<|im_start|>assistant\n",
  "system": open("systeme.txt", encoding="utf-8").read().strip(),
  "parameters": {"stop": ["<|im_end|>", "<|endoftext|>"], "temperature": 0.3, "num_ctx": 8192},
  "stream": False,
}
try:
    r = urllib.request.urlopen(urllib.request.Request(f"{B}/api/create", data=json.dumps(corps).encode(), headers={"content-type": "application/json"}), timeout=3600)
    print(r.read().decode()[-500:])
except urllib.error.HTTPError as e:
    print("ERREUR create", e.code, e.read().decode()[:500]); raise SystemExit(1)
PY
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import json,sys; print([m['name'] for m in json.load(sys.stdin)['models']])"
echo "== FIN OK $(date -u +%T)"
