#!/usr/bin/env bash
# Traitement ponctuel lancé par le runner d'audit (s'il existe) : voix off des vidéos Tondraaga avec Chatterbox
# Multilingual (Resemble AI, licence MIT), téléchargé depuis Hugging Face et exécuté sur le processeur du runner.
set -euo pipefail
OUT=tondraaga-app/audit/out/voix-cb
mkdir -p "$OUT"
sudo apt-get -qq update >/dev/null && sudo apt-get -qq install -y ffmpeg >/dev/null || true
python3 -m pip install -q uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv venv -q -p 3.11 "$RUNNER_TEMP/cb"
. "$RUNNER_TEMP/cb/bin/activate"
uv pip install -q torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install -q chatterbox-tts==0.1.7
python tondraaga-video/tools/chatterbox_voix.py "$OUT" 2>&1 | grep -v -i "warn" || echo "Chatterbox : échec (voir ci-dessus)"
ls -la "$OUT" || true
