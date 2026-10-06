# scripts/modele/kaggle/chef-leger-entrainement.py — l'entraînement du modèle maison « presti-chef-leger » sur Kaggle (GPU T4), poussé par scripts/modele/kaggle-chef-leger.mjs.
#
# Étapes, chacune journalisée dans /kaggle/working/journal.jsonl (une ligne JSON par étape, durée comprise) :
#   0. GPU présent ? Sans GPU (compte Kaggle non vérifié par téléphone : la session tourne alors sur CPU et sans internet), on s'arrête tout de suite, code 3.
#   1. données : le JSONL du dataset privé (paires { messages: [system, user, assistant] } de scripts/modele/donnees-chef-leger.mjs), découpé 95 % / 5 % ;
#   2. QLoRA (PEFT + bitsandbytes 4 bits) sur Qwen2.5-Instruct ; la perte ne porte QUE sur la réponse (le plan) — l'état du cycle est masqué (-100) ;
#      si bitsandbytes ne s'installe pas, LoRA en fp16 (dit dans le journal : « qlora » faux) ;
#   3. génération sur la part de validation (jamais vue à l'entraînement), sorties brutes écrites pour être jugées par validerPlan sur le PC ;
#   4. fusion de l'adaptateur dans les poids fp16, conversion GGUF (llama.cpp convert_hf_to_gguf.py) puis quantification Q4_K_M (llama-quantize) ;
#   5. sorties : le GGUF, l'adaptateur, le Modelfile Ollama, les générations, le résumé chiffré.
# Réglages par variables en tête (réécrites par le pousseur) : MODELE, SUFFIXE, EPOQUES.
import glob, hashlib, json, os, random, shutil, subprocess, sys, time

MODELE = "Qwen/Qwen2.5-1.5B-Instruct"
SUFFIXE = "1.5b"
EPOQUES = 3
SORTIE = "/kaggle/working"
TMP = "/tmp/presti"
GRAINE = 42
T0 = time.time()
os.makedirs(TMP, exist_ok=True)


def journal(**k):
    k["t_s"] = round(time.time() - T0, 1)
    ligne = json.dumps(k, ensure_ascii=False)
    print(ligne, flush=True)
    with open(f"{SORTIE}/journal.jsonl", "a", encoding="utf-8") as f:
        f.write(ligne + "\n")


def sh(cmd, **kw):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        journal(etape="commande", ok=False, cmd=cmd[:200], code=r.returncode, erreur=(r.stderr or r.stdout)[-1500:])
        raise SystemExit(4)
    return r.stdout


# ── 0. GPU ─────────────────────────────────────────────────────────────────────────────────────────────────────────
import torch

if not torch.cuda.is_available():
    journal(etape="gpu", ok=False, torch=torch.__version__, message="aucun GPU dans la session (torch.cuda.is_available() = False) : sur Kaggle, le GPU et internet exigent un compte vérifié par téléphone")
    raise SystemExit(3)
journal(etape="gpu", ok=True, nom=torch.cuda.get_device_name(0), torch=torch.__version__)

# ── 1. données ─────────────────────────────────────────────────────────────────────────────────────────────────────
fichiers = glob.glob("/kaggle/input/**/donnees.jsonl", recursive=True)
if not fichiers:
    journal(etape="donnees", ok=False, message="donnees.jsonl introuvable sous /kaggle/input (dataset non attaché ?)")
    raise SystemExit(5)
paires = [json.loads(l) for l in open(fichiers[0], encoding="utf-8") if l.strip()]
random.Random(GRAINE).shuffle(paires)
n_val = max(8, len(paires) // 20)
val, train = paires[:n_val], paires[n_val:]
journal(etape="donnees", ok=True, fichier=fichiers[0], paires=len(paires), train=len(train), val=len(val))

# Le modèle de base : la copie Kaggle Models si elle est attachée (hors ligne), sinon le hub Hugging Face.
local = [os.path.dirname(c) for c in glob.glob("/kaggle/input/**/config.json", recursive=True) if MODELE.split("/")[-1].lower().replace("qwen2.5-", "") in c.lower()]
SOURCE = local[0] if local else MODELE
journal(etape="base", source=SOURCE)

# ── 2. QLoRA ───────────────────────────────────────────────────────────────────────────────────────────────────────
qlora = True
try:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "bitsandbytes"], check=True, capture_output=True, timeout=600)
    import bitsandbytes  # noqa: F401
except Exception as e:  # sans bitsandbytes : LoRA fp16, dit dans le journal
    qlora = False
    journal(etape="bitsandbytes", ok=False, erreur=str(e)[:300])

from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
from peft import LoraConfig, PeftModel, get_peft_model, prepare_model_for_kbit_training

tok = AutoTokenizer.from_pretrained(SOURCE)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
MAX = 4096


def encoder(p):
    m = p["messages"]
    complet = tok.apply_chat_template(m, tokenize=False)
    invite = tok.apply_chat_template(m[:2], tokenize=False, add_generation_prompt=True)
    assert complet.startswith(invite), "gabarit : la réponse ne prolonge pas l'invite"
    ids = tok(complet, add_special_tokens=False)["input_ids"][:MAX]
    n = len(tok(invite, add_special_tokens=False)["input_ids"])
    return {"input_ids": ids, "labels": [-100] * n + ids[n:]}


ex_train = [encoder(p) for p in train]
ex_val = [encoder(p) for p in val]
longueurs = sorted(len(e["input_ids"]) for e in ex_train)
journal(etape="jetons", mediane=longueurs[len(longueurs) // 2], max=longueurs[-1], reponse_mediane=sorted(sum(1 for x in e["labels"] if x != -100) for e in ex_train)[len(ex_train) // 2])


def assembler(lot):
    n = max(len(e["input_ids"]) for e in lot)
    pad = tok.pad_token_id
    return {
        "input_ids": torch.tensor([e["input_ids"] + [pad] * (n - len(e["input_ids"])) for e in lot]),
        "labels": torch.tensor([e["labels"] + [-100] * (n - len(e["labels"])) for e in lot]),
        "attention_mask": torch.tensor([[1] * len(e["input_ids"]) + [0] * (n - len(e["input_ids"])) for e in lot]),
    }


def charger(quatre_bits):
    kw = {"device_map": {"": 0}}
    if quatre_bits:
        from transformers import BitsAndBytesConfig
        kw["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True)
    try:
        return AutoModelForCausalLM.from_pretrained(SOURCE, dtype=torch.float16, **kw)
    except TypeError:
        return AutoModelForCausalLM.from_pretrained(SOURCE, torch_dtype=torch.float16, **kw)


modele = charger(qlora)
if qlora:
    modele = prepare_model_for_kbit_training(modele, use_gradient_checkpointing=True)
else:
    modele.gradient_checkpointing_enable()
    modele.enable_input_require_grads()
modele = get_peft_model(modele, LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
                                           target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]))
entrainables = sum(p.numel() for p in modele.parameters() if p.requires_grad)
journal(etape="modele", qlora=qlora, parametres_entrainables=entrainables)

args = TrainingArguments(
    output_dir=f"{TMP}/points", num_train_epochs=EPOQUES, per_device_train_batch_size=1, per_device_eval_batch_size=1, gradient_accumulation_steps=8,
    learning_rate=2e-4, lr_scheduler_type="cosine", warmup_ratio=0.05, logging_steps=5, eval_strategy="epoch", save_strategy="no",
    fp16=True, gradient_checkpointing=True, gradient_checkpointing_kwargs={"use_reentrant": False}, report_to="none", seed=GRAINE,
    optim="paged_adamw_8bit" if qlora else "adamw_torch", remove_unused_columns=False,
)
t = time.time()
entraineur = Trainer(model=modele, args=args, train_dataset=ex_train, eval_dataset=ex_val, data_collator=assembler)
res = entraineur.train()
historique = [h for h in entraineur.state.log_history if "loss" in h or "eval_loss" in h]
journal(etape="entrainement", ok=True, duree_s=round(time.time() - t), perte_finale=res.training_loss, historique=historique)
modele.save_pretrained(f"{SORTIE}/adaptateur")

# ── 3. génération sur la validation ───────────────────────────────────────────────────────────────────────────────
modele.eval()
modele.config.use_cache = True
t = time.time()
with open(f"{SORTIE}/generations-val.jsonl", "w", encoding="utf-8") as f:
    for p in val:
        invite = tok.apply_chat_template(p["messages"][:2], tokenize=False, add_generation_prompt=True)
        ids = tok(invite, return_tensors="pt", add_special_tokens=False).to(0)
        t1 = time.time()
        with torch.no_grad():
            out = modele.generate(**ids, max_new_tokens=1200, do_sample=False, pad_token_id=tok.pad_token_id)
        texte = tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True)
        f.write(json.dumps({"user": p["messages"][1]["content"], "attendu": p["messages"][2]["content"], "sortie": texte, "duree_s": round(time.time() - t1, 1)}, ensure_ascii=False) + "\n")
journal(etape="generation_val", ok=True, n=len(val), duree_s=round(time.time() - t))

# ── 4. fusion, GGUF, Q4_K_M ───────────────────────────────────────────────────────────────────────────────────────
del modele, entraineur
torch.cuda.empty_cache()
t = time.time()
base = charger(False)
fusion = PeftModel.from_pretrained(base, f"{SORTIE}/adaptateur").merge_and_unload()
fusion.save_pretrained(f"{TMP}/fusion", safe_serialization=True)
tok.save_pretrained(f"{TMP}/fusion")
del base, fusion
journal(etape="fusion", ok=True, duree_s=round(time.time() - t))

t = time.time()
if not os.path.exists(f"{TMP}/llama.cpp"):
    sh(f"git clone --depth 1 https://github.com/ggml-org/llama.cpp {TMP}/llama.cpp")
sh(f"{sys.executable} -m pip install -q gguf sentencepiece protobuf")
sh(f"cd {TMP}/llama.cpp && {sys.executable} convert_hf_to_gguf.py {TMP}/fusion --outfile {TMP}/f16.gguf --outtype f16")
sh(f"cd {TMP}/llama.cpp && cmake -B build -DGGML_CUDA=OFF -DLLAMA_CURL=OFF > /dev/null && cmake --build build --target llama-quantize -j 4 > /dev/null")
GGUF = f"{SORTIE}/presti-chef-leger-{SUFFIXE}-q4_K_M.gguf"
sh(f"{TMP}/llama.cpp/build/bin/llama-quantize {TMP}/f16.gguf {GGUF} Q4_K_M")
h = hashlib.sha256()
with open(GGUF, "rb") as f:
    for bloc in iter(lambda: f.read(1 << 20), b""):
        h.update(bloc)
journal(etape="gguf", ok=True, duree_s=round(time.time() - t), fichier=os.path.basename(GGUF), octets=os.path.getsize(GGUF), sha256=h.hexdigest())

# ── 5. Modelfile et résumé ────────────────────────────────────────────────────────────────────────────────────────
SYSTEME = paires[0]["messages"][0]["content"]
with open(f"{SORTIE}/Modelfile", "w", encoding="utf-8") as f:
    f.write(f"FROM ./{os.path.basename(GGUF)}\n")
    # Le gabarit de chat de Qwen2.5, sans outils : celui de l'entraînement (tok.apply_chat_template), message système compris une seule fois.
    f.write('TEMPLATE """{{- if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}{{- range .Messages }}{{- if ne .Role "system" }}<|im_start|>{{ .Role }}\n{{ .Content }}<|im_end|>\n{{ end }}{{- end }}<|im_start|>assistant\n"""\n')
    f.write(f'SYSTEM """{SYSTEME}"""\n')
    f.write('PARAMETER stop "<|im_end|>"\nPARAMETER stop "<|endoftext|>"\nPARAMETER temperature 0.2\nPARAMETER num_ctx 4096\n')
shutil.rmtree(f"{SORTIE}/adaptateur/.cache", ignore_errors=True)
journal(etape="fin", ok=True, duree_totale_s=round(time.time() - T0), modele=MODELE, qlora=qlora, epoques=EPOQUES)
