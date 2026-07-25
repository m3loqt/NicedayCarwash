#!/usr/bin/env bash
# One-time registration of Maya webhook events against the deployed mayaWebhook function.
# Run this yourself in your own terminal - it prompts for the secret key with echo off and
# never writes it to disk or to any log.
#
# Usage:
#   ./register-webhooks.sh            # sandbox (pg-sandbox.paymaya.com)
#   ./register-webhooks.sh production # production (pg.maya.ph)

set -euo pipefail

ENVIRONMENT="${1:-sandbox}"
if [ "$ENVIRONMENT" = "production" ]; then
  BASE_URL="https://pg.maya.ph"
else
  BASE_URL="https://pg-sandbox.paymaya.com"
fi

CALLBACK_URL="https://us-central1-ndcw-12f99.cloudfunctions.net/mayaWebhook"
EVENTS=(PAYMENT_SUCCESS PAYMENT_FAILED PAYMENT_EXPIRED PAYMENT_CANCELLED)

echo "Registering webhooks against: $BASE_URL"
echo "Callback URL: $CALLBACK_URL"
echo

read -r -s -p "Maya secret key ($ENVIRONMENT): " MAYA_SECRET
echo
echo

RESP_FILE="$(mktemp)"
trap 'rm -f "$RESP_FILE"; unset MAYA_SECRET' EXIT

for name in "${EVENTS[@]}"; do
  echo "Registering ${name}..."
  status=$(curl -sS -o "$RESP_FILE" -w "%{http_code}" \
    -u "${MAYA_SECRET}:" \
    -X POST "${BASE_URL}/payments/v1/webhooks" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\",\"callbackUrl\":\"${CALLBACK_URL}\"}")
  echo "  HTTP ${status}"
  sed 's/^/  /' "$RESP_FILE"
  echo
done

echo "Done."
