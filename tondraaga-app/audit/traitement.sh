#!/usr/bin/env bash
# Traitement ponctuel lancé par le runner d'audit (s'il existe) : voix off ElevenLabs des vidéos Tondraaga.
# La clé vient du secret de dépôt ELEVENLABS_API_KEY ; sans clé, le script ne fait rien.
set -euo pipefail
python3 tondraaga-video/tools/elevenlabs.py tondraaga-app/audit/out/voix-el || echo "ElevenLabs : échec (voir ci-dessus)"
ls -la tondraaga-app/audit/out/voix-el 2>/dev/null || true
