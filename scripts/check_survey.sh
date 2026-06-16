#!/usr/bin/env bash
set -euo pipefail

# Script de diagnostic Supabase pour sondages
# Usage:
#   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TOKEN=... ./scripts/check_survey.sh
# ou
#   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ./scripts/check_survey.sh <token>

SB_URL=${SUPABASE_URL:-}
KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
TOKEN=${TOKEN:-${1:-}}

if [ -z "$SB_URL" ] || [ -z "$KEY" ] || [ -z "$TOKEN" ]; then
  echo "Erreur: variables manquantes. Exemple :"
  echo "  SUPABASE_URL=https://.... SUPABASE_SERVICE_ROLE_KEY=sk_... TOKEN=... ./scripts/check_survey.sh"
  exit 2
fi

# helper
req() {
  local url="$1"
  echo "--- GET $url"
  curl -sS -H "apikey: $KEY" -H "Authorization: Bearer $KEY" "$url" | jq .
}

echo "Vérification du recipient pour token: $TOKEN"
req "$SB_URL/rest/v1/com_recipients?token=eq.$TOKEN&select=*" > /tmp/_recipient.json || true

RECIPIENT_COUNT=$(jq 'length' /tmp/_recipient.json 2>/dev/null || echo 0)
if [ "$RECIPIENT_COUNT" = "0" ] || [ -z "$RECIPIENT_COUNT" ]; then
  echo "\n-> Aucun recipient trouvé pour ce token. (token invalide ou non inséré)"
  echo "Tu peux lister les derniers recipients avec :"
  echo "  curl -sS -H \"apikey: $KEY\" -H \"Authorization: Bearer $KEY\" \"$SB_URL/rest/v1/com_recipients?select=*&order=id.desc&limit=50\" | jq ."
  exit 3
fi

echo "\nRecipient trouvé :"
jq .[0] /tmp/_recipient.json

COMM_ID=$(jq -r '.[0].communication_id' /tmp/_recipient.json)
if [ -z "$COMM_ID" ] || [ "$COMM_ID" = "null" ]; then
  echo "\nErreur: recipient trouvé mais communication_id vide"
  exit 4
fi

echo "\nRécupération de la communication id=$COMM_ID"
req "$SB_URL/rest/v1/com_communications?id=eq.$COMM_ID&select=*" > /tmp/_comm.json || true
COMM_COUNT=$(jq 'length' /tmp/_comm.json 2>/dev/null || echo 0)
if [ "$COMM_COUNT" = "0" ]; then
  echo "\n-> Communication introuvable (id=$COMM_ID)"
  exit 5
fi

echo "\nCommunication :"
jq .[0] /tmp/_comm.json

echo "\nRecherche d'un survey lié à cette communication"
req "$SB_URL/rest/v1/com_surveys?communication_id=eq.$COMM_ID&select=*" > /tmp/_survey.json || true
SURVEY_COUNT=$(jq 'length' /tmp/_survey.json 2>/dev/null || echo 0)
if [ "$SURVEY_COUNT" = "0" ]; then
  echo "\n-> Aucun sondage (com_surveys) trouvé pour communication_id=$COMM_ID"
  echo "Si tu veux que je crée rapidement un sondage vide, utilise l'option --create (non-interactif)."
  exit 6
fi

SURVEY_ID=$(jq -r '.[0].id' /tmp/_survey.json)

echo "\nSurvey trouvé : id=$SURVEY_ID"
jq .[0] /tmp/_survey.json

echo "\nRécupération des questions et options pour survey_id=$SURVEY_ID"
req "$SB_URL/rest/v1/com_survey_questions?survey_id=eq.$SURVEY_ID&select=*,com_survey_options(*)&order=id.asc" > /tmp/_questions.json || true

QCOUNT=$(jq 'length' /tmp/_questions.json 2>/dev/null || echo 0)
if [ "$QCOUNT" = "0" ]; then
  echo "\n-> Aucun question trouvé pour ce survey (survey vide)."
  exit 7
fi

echo "\nQuestions & options :"
jq . /tmp/_questions.json

echo "\nDiagnostic terminé. Copie-colle la sortie ci-dessus.
" 
exit 0
