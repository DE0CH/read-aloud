#!/usr/bin/env bash
# Checks the live site past Cloudflare Access: the page, the voice list, and real speech from each provider.
set -euo pipefail
URL="${URL:-https://read.deyaochen.com}"
H=(-H "CF-Access-Client-Id: $ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $ACCESS_CLIENT_SECRET")

page=$(curl -sf "${H[@]}" "$URL/")
grep -q "<title>Read aloud</title>" <<<"$page"
[ "$(curl -sf "${H[@]}" "$URL/api/voices" | jq length)" -gt 0 ]
[ "$(curl -s -o /dev/null -w '%{http_code}' "$URL/")" = 302 ]   # no Access token: sent to the login

for v in aura-thalia qwen-Cherry; do
  bytes=$(curl -sf "${H[@]}" "$URL/api/tts" -H 'content-type: application/json' \
    -d "{\"voice\":\"$v\",\"text\":\"The quarterly report is out. Let's walk through the numbers.\"}" | wc -c)
  echo "$v: $bytes bytes of audio"
  [ "$bytes" -gt 48000 ]   # over one second of 24 kHz 16-bit audio
done
echo ok
