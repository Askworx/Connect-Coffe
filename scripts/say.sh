#!/usr/bin/env bash
# Pretend to be a customer messaging the bot, without WhatsApp.
#
#   scripts/say.sh "hi"                      # type a message
#   scripts/say.sh --button book             # tap a button (its id)
#   PHONE=919900000002 scripts/say.sh "hi"   # as someone else
#
# Posts the same payload Meta would to the local bot's webhook. The bot's
# replies appear in its log (as "[dry-run]" lines when no Meta credentials are
# set) and in the panel's Inbox. Only works while META_APP_SECRET is empty,
# because the bot checks Meta's signature otherwise.
set -euo pipefail

BOT=${BOT:-http://localhost:8090}
PHONE=${PHONE:-919900000001}
NAME=${NAME:-Test Customer}
ID="wamid.local.$(date +%s%N)"

if [[ "${1:-}" == "--button" ]]; then
  message=$(printf '{"from":"%s","id":"%s","type":"interactive","interactive":{"type":"button_reply","button_reply":{"id":"%s","title":"%s"}}}' "$PHONE" "$ID" "$2" "$2")
else
  text=${1:?usage: say.sh "message" | say.sh --button <id>}
  text=${text//\\/\\\\}; text=${text//\"/\\\"}
  message=$(printf '{"from":"%s","id":"%s","type":"text","text":{"body":"%s"}}' "$PHONE" "$ID" "$text")
fi

curl -sS -o /dev/null -w "webhook: %{http_code}\n" -X POST "$BOT/webhook" \
  -H 'Content-Type: application/json' \
  -d "{\"entry\":[{\"changes\":[{\"value\":{\"contacts\":[{\"wa_id\":\"$PHONE\",\"profile\":{\"name\":\"$NAME\"}}],\"messages\":[$message]}}]}]}"
