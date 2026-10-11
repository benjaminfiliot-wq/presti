# scripts/modele/kaggle/preneur-maitre.py — le MAÎTRE de la distillation du preneur, sur le GPU gratuit de Kaggle (poussé par scripts/modele/kaggle-preneur.mjs --maitre-pousser).
#
# Pourquoi : les modèles forts gratuits de freellmapi et d'Ollama Cloud étaient à bout de quota la nuit du 06 au 07/10 (59 appels, 14 réponses gardées).
# Un modèle ouvert de 14 à 32 B, servi par vLLM sur les T4 gratuits de Kaggle, écrit les réponses de toutes les entrées en une session.
# Les entrées viennent du dataset privé presti-preneur-maitre-entrees : déjà passées par la garde d'entrée (aucune donnée de prospect), avec la consigne
# du maître (CONSIGNE_MAITRE). Les sorties sont jugées sur le PC par les mêmes gardes (donnees-preneur.mjs --importer-maitre) : ici, on ne filtre rien.
# Journal : /kaggle/working/journal.jsonl ; sorties : /kaggle/working/sorties.jsonl ({ cle, id, sorties: [n textes] }).
import glob, json, os, subprocess, sys, time

SORTIE = "/kaggle/working"
N = 3  # réponses par entrée (température 0,7) : le PC garde la première qui passe toutes les gardes
T0 = time.time()
# 07/10 : vLLM lance ses processus de calcul par « spawn », qui réimporte ce script : tout le travail est dans main(), sous la garde __main__.


def journal(**k):
    k["t_s"] = round(time.time() - T0, 1)
    ligne = json.dumps(k, ensure_ascii=False)
    print(ligne, flush=True)
    with open(f"{SORTIE}/journal.jsonl", "a", encoding="utf-8") as f:
        f.write(ligne + "\n")



def main():
    fichiers = glob.glob("/kaggle/input/**/entrees-maitre.jsonl", recursive=True)
    if not fichiers:
        journal(etape="donnees", ok=False, message="entrees-maitre.jsonl introuvable sous /kaggle/input")
        raise SystemExit(5)
    entrees = [json.loads(l) for l in open(fichiers[0], encoding="utf-8") if l.strip()]
    journal(etape="donnees", ok=True, n=len(entrees))

    r = subprocess.run(f"{sys.executable} -m pip install -q vllm", shell=True, capture_output=True, text=True, timeout=1800)
    journal(etape="vllm_installe", ok=r.returncode == 0, erreur=(r.stderr or "")[-800:] if r.returncode else None)
    # 07/10 : vllm installe sa propre version de torch (cu130) ; torchaudio de l'image reste en cu128 et transformers l'importe → « compiled with different
    # CUDA versions » à l'import de vllm. Le maître n'a besoin ni du son ni de l'image : on retire torchaudio, et torchvision s'il ne s'importe plus.
    subprocess.run(f"{sys.executable} -m pip uninstall -y -q torchaudio", shell=True, capture_output=True)
    if subprocess.run([sys.executable, "-c", "import torchvision"], capture_output=True).returncode != 0:
        subprocess.run(f"{sys.executable} -m pip uninstall -y -q torchvision", shell=True, capture_output=True)
        journal(etape="torchvision", retire=True)
    import torch  # noqa: E402

    ngpu = torch.cuda.device_count()
    journal(etape="gpu", n=ngpu, noms=[torch.cuda.get_device_name(i) for i in range(ngpu)], torch=torch.__version__)
    if not ngpu:
        raise SystemExit(3)

    from vllm import LLM, SamplingParams  # noqa: E402

    CANDIDATS = [("Qwen/Qwen3-32B-AWQ", 2), ("Qwen/Qwen3-14B-AWQ", 1), ("Qwen/Qwen2.5-14B-Instruct-AWQ", 1)]
    llm, nom = None, None
    for modele, tp_min in CANDIDATS:
        if ngpu < tp_min:
            continue
        try:
            t = time.time()
            llm = LLM(model=modele, tensor_parallel_size=min(ngpu, 2) if tp_min > 1 or ngpu > 1 else 1, dtype="half", quantization="awq",
                      max_model_len=6144, gpu_memory_utilization=0.92, enforce_eager=False, seed=7)
            nom = modele
            journal(etape="modele", ok=True, modele=modele, duree_s=round(time.time() - t))
            break
        except Exception as e:  # le suivant de la liste
            journal(etape="modele", ok=False, modele=modele, erreur=str(e)[-800:])
            llm = None
    if llm is None:
        raise SystemExit(4)

    params = SamplingParams(n=N, temperature=0.7, top_p=0.9, max_tokens=1400)
    conversations = [e["messages"] for e in entrees]
    t = time.time()
    try:
        sorties = llm.chat(conversations, params, chat_template_kwargs={"enable_thinking": False}, use_tqdm=False)
    except TypeError:
        sorties = llm.chat(conversations, params, use_tqdm=False)
    jetons = sum(len(o.token_ids) for s in sorties for o in s.outputs)
    journal(etape="generation", ok=True, modele=nom, entrees=len(entrees), reponses=len(entrees) * N, jetons=jetons, duree_s=round(time.time() - t))
    with open(f"{SORTIE}/sorties.jsonl", "w", encoding="utf-8") as f:
        for e, s in zip(entrees, sorties):
            f.write(json.dumps({"cle": e["cle"], "id": e["id"], "modele": nom, "sorties": [o.text for o in s.outputs]}, ensure_ascii=False) + "\n")
    journal(etape="fin", ok=True, duree_totale_s=round(time.time() - T0))


if __name__ == "__main__":
    main()
