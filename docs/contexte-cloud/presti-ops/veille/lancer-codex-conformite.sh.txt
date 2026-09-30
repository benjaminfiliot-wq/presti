#!/usr/bin/env bash
# Sur l'usine : Codex fait la relecture de conformité (vidéos TikTok/Instagram + décisions de Benj vs conçu),
# et boucle jusqu'au PASS de juges/juge-conformite.mjs (10 tours max, pause entre les tours). 26/09/2026.
for p in "$HOME"/.nvm/versions/node/*/bin "$HOME/.npm-global/bin" "$HOME/.local/bin" /usr/local/bin; do [ -x "$p/codex" ] && export PATH="$p:$PATH"; done
cd "$HOME/veille" || exit 1
# 26/09 : la connexion ChatGPT de la ligne de commande rend 401 -> Codex tourne sur freellmapi (gratuit), modèle MODELE.
export FL_KEY=$(cat "$HOME/.config/presti/freellmapi.key")
FL=(-c 'model_providers.fl={name="freellmapi",base_url="http://127.0.0.1:3001/v1",env_key="FL_KEY",wire_api="responses"}' -c model_provider=fl )
MODELES=(${MODELES:-gpt-oss-120b gemini-3.5-flash gemini-3.7-flash gpt-oss-20b})
mkdir -p .cache conformite
export XDG_CACHE_HOME="$HOME/veille/.cache" HF_HOME="$HOME/veille/.cache/huggingface"
echo "codex=$(command -v codex) cpu=$(nproc)"
verdict=""
FOURNISSEUR=${FOURNISSEUR:-chatgpt}   # chatgpt (Codex normal) → ol (Ollama Cloud gpt-oss:120b, gratuit) sur 401 → fl (freellmapi) si Ollama Cloud est à bout
T="$HOME/veille/.dernier-tour-conformite.log"
for tour in $(seq 1 30); do
  m=${MODELES[$(( (tour - 1) % ${#MODELES[@]} ))]}
  echo "== tour $tour $(date '+%d/%m %H:%M') modèle $m"
  if [ "$FOURNISSEUR" = fl ]; then ARGS=("${FL[@]}" -m "$m"); elif [ "$FOURNISSEUR" = ol ]; then ARGS=(-c 'model_providers.ol={name="ollama",base_url="http://127.0.0.1:11434/v1",wire_api="responses"}' -c model_provider=ol -m "${MODELE_OL:-gpt-oss:120b-cloud}"); else ARGS=(); fi
  echo "fournisseur $FOURNISSEUR"
  codex exec "${ARGS[@]}" --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true -C "$HOME/veille" \
    "$(cat consigne-codex-conformite.md)${verdict:+

DERNIER VERDICT DU JUGE (tour précédent) :
$verdict}" < /dev/null 2>&1 | tee "$T"
  grep -q "401 Unauthorized" "$T" && [ "$FOURNISSEUR" = chatgpt ] && { FOURNISSEUR=ol; echo "401 : bascule sur Ollama Cloud (gpt-oss:120b)"; }
  [ "$FOURNISSEUR" = ol ] && grep -qE "not included in your free usage|usage limit|429" "$T" && { FOURNISSEUR=fl; echo "Ollama Cloud à bout : bascule sur freellmapi"; }
  grep -qE "429 Too Many|exceeded retry limit|usage limit" "$T" && { echo "quota : pause de 15 min"; sleep 900; }
  verdict=$(node juges/juge-conformite.mjs 2>&1) && { echo "$verdict"; echo "PASS $(date '+%d/%m %H:%M')"; exit 0; }
  echo "$verdict" | head -25
  sleep 180
done
echo "FAIL après 30 tours $(date '+%d/%m %H:%M')"
