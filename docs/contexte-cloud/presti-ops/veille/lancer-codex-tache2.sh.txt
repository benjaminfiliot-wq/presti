#!/usr/bin/env bash
# Lanceur générique v2 (27/09/2026) — AVEC ENTRAIDE : après chaque tour refusé, une autre IA (Mistral / Cerebras, ou Ollama local si SANS_REPLI=1) relit et conseille.
# Lanceur générique (26/09/2026) : Codex fait une tâche décrite par une consigne et boucle jusqu'au PASS de son juge.
# Usage (sur l'usine) : nohup bash ~/veille/lancer-codex-tache.sh <consigne.md> <juges/juge.mjs> [tours=12] > ~/veille/journal-<nom>.log 2>&1 &
# Fournisseurs : chatgpt (Codex normal) → ol (Ollama Cloud gpt-oss:120b, gratuit) sur 401 → fl (freellmapi) si Ollama Cloud est à bout.
CONSIGNE="$1"; JUGE="$2"; TOURS="${3:-12}"
[ -f "$HOME/veille/$CONSIGNE" ] && [ -f "$HOME/veille/$JUGE" ] || { echo "usage : $0 <consigne.md> <juges/juge.mjs> [tours]"; exit 2; }
for p in "$HOME"/.nvm/versions/node/*/bin "$HOME/.npm-global/bin" "$HOME/.local/bin" /usr/local/bin; do [ -x "$p/codex" ] && export PATH="$p:$PATH"; done
cd "$HOME/veille" || exit 1
export FL_KEY=$(cat "$HOME/.config/presti/freellmapi.key")
export XDG_CACHE_HOME="$HOME/veille/.cache" HF_HOME="$HOME/veille/.cache/huggingface"
FL=(-c 'model_providers.fl={name="freellmapi",base_url="http://127.0.0.1:3001/v1",env_key="FL_KEY",wire_api="responses"}' -c model_provider=fl)
OL=(-c 'model_providers.ol={name="ollama",base_url="http://127.0.0.1:11434/v1",wire_api="responses"}' -c model_provider=ol)
MODELES=(gpt-oss-120b gemini-3.5-flash gpt-oss-20b)
FOURNISSEUR=${FOURNISSEUR:-chatgpt}
T="$HOME/veille/.dernier-tour-$(basename "$CONSIGNE" .md).log"
echo "codex=$(command -v codex) consigne=$CONSIGNE juge=$JUGE tours=$TOURS"
verdict=""
for tour in $(seq 1 "$TOURS"); do
  m=${MODELES[$(( (tour - 1) % ${#MODELES[@]} ))]}
  if [ "$FOURNISSEUR" = fl ]; then ARGS=("${FL[@]}" -m "$m"); elif [ "$FOURNISSEUR" = ol ]; then ARGS=("${OL[@]}" -m "${MODELE_OL:-gpt-oss:120b-cloud}"); else ARGS=(); fi
  echo "== tour $tour $(date '+%d/%m %H:%M') fournisseur $FOURNISSEUR"
  codex exec "${ARGS[@]}" --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true -C "$HOME/veille" \
    "$(cat "$CONSIGNE")${verdict:+

DERNIER VERDICT DU JUGE (tour précédent) :
$verdict}" < /dev/null 2>&1 | tee "$T"
  # SANS_REPLI=1 : tâche qui voit des données de prospects → jamais d'IA gratuite ni de modèle :cloud ; sur 401, on s'arrête.
  grep -q "401 Unauthorized" "$T" && [ "${SANS_REPLI:-0}" = 1 ] && { echo "401 et SANS_REPLI=1 : arrêt (aucune bascule vers une IA gratuite)"; exit 3; }
  grep -q "401 Unauthorized" "$T" && [ "$FOURNISSEUR" = chatgpt ] && { FOURNISSEUR=ol; echo "401 : bascule sur Ollama Cloud"; }
  [ "$FOURNISSEUR" = ol ] && grep -qE "not included in your free usage|usage limit|429" "$T" && { FOURNISSEUR=fl; echo "Ollama Cloud à bout : bascule sur freellmapi"; }
  grep -qE "429 Too Many|exceeded retry limit|usage limit" "$T" && { echo "quota : pause de 15 min"; sleep 900; }
  verdict=$(node "$JUGE" 2>&1) && { echo "$verdict"; echo "PASS $(date '+%d/%m %H:%M')"; exit 0; }
  echo "$verdict" | head -25
  echo "$verdict" > "$T.verdict"
  conseil=$(node "$HOME/veille/conseil.mjs" --verdict="$T.verdict" --journal="$T" --consigne="$CONSIGNE" $([ "${SANS_REPLI:-0}" = 1 ] && echo --prive) 2>/dev/null)
  echo "$conseil" | head -30
  verdict="$verdict

$conseil"
  sleep 120
done
echo "FAIL après $TOURS tours $(date '+%d/%m %H:%M')"
