#!/bin/bash

# Script to test the Spool transcription service
# Usage: ./scripts/test-spool.sh <API_URL> <TARGET_URL> [TITLE]

set -e

API_BASE_URL="${1%/}"
TARGET_URL="${2}"
TITLE="${3}"

if [[ -z "$API_BASE_URL" || -z "$TARGET_URL" ]]; then
  echo "Usage: $0 <API_BASE_URL> <TARGET_URL> [TITLE]"
  echo "Example: $0 http://localhost:3001/spool https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  exit 1
fi

echo "🚀 Starting transcription test..."
echo "URL: $TARGET_URL"
echo "API: $API_BASE_URL"
[[ -n "$TITLE" ]] && echo "Title: $TITLE"
echo "----------------------------------------"

# 1. Trigger Transcription
echo "📡 Triggering transcription..."
JSON_BODY=$(jq -n --arg url "$TARGET_URL" --arg title "${TITLE:-}" '{url: $url, title: $title | if . == "" then empty else . end}')
RESPONSE=$(curl -s -X POST "$API_BASE_URL/transcribe" \
  -H "Content-Type: application/json" \
  -d "$JSON_BODY")

ID=$(echo $RESPONSE | jq -r '.id')

if [[ "$ID" == "null" || -z "$ID" ]]; then
  echo "❌ Error: Failed to get task ID from response."
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Task queued. ID: $ID"
echo "----------------------------------------"

# 2. Poll for completion
MAX_RETRIES=60
RETRY_INTERVAL=5
COUNT=0

echo "⏳ Polling for completion (max ${MAX_RETRIES} attempts)..."

while [ $COUNT -lt $MAX_RETRIES ]; do
  # Fetch the item status
  # Since we don't have an endpoint for a single ID via GET /queue, 
  # we use the existing /queue and grep for our ID.
  # However, a better implementation would be to have GET /queue/:id.
  # For now, we'll check the /queue endpoint.
  
  STATUS_JSON=$(curl -s "$API_BASE_URL/queue")
  
  # Extract status of our item using jq
  # We look for the object in the array where id == $ID
  STATUS=$(echo $STATUS_JSON | jq -r ".[] | select(.id == \"$ID\") | .status")

  if [[ -z "$STATUS" ]]; then
    echo "⚠️ Task ID $ID not found in queue yet. Retrying..."
  elif [[ "$STATUS" == "completed" ]]; then
    echo "🎉 SUCCESS: Transcription completed!"
    echo "Final details:"
    echo $STATUS_JSON | jq ".[] | select(.id == \"$ID\")"
    exit 0
  elif [[ "$STATUS" == "failed" ]]; then
    echo "❌ FAILED: Task status is 'failed'."
    echo "Error details:"
    echo $STATUS_JSON | jq ".[] | select(.id == \"$ID\") | .error"
    exit 1
  else
    echo "🔄 Current status: $STATUS (attempt $((COUNT+1))/$MAX_RETRIES)"
  fi

  sleep $RETRY_INTERVAL
  COUNT=$((COUNT + 1))
done

echo "❌ Timeout: Task did not complete in time."
exit 1
