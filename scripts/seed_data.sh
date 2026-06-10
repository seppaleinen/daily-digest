#!/bin/bash

# API URL - change if your API is running on a different port
API_URL="http://localhost:3000/items"

echo "Seeding sample data for Daily Digest..."

# Function to post an item
post_item() {
  local date=$1
  local source=$2
  local title=$3
  local html=$4

  curl -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"date\": \"$date\",
      \"source\": \"$source\",
      \"title\": \"$title\",
      \"html\": \"$html\"
    }"
  echo ""
}

# Current date for context
TODAY=$(date +%Y-%m-%d)

echo "--- Seeding items for $TODAY ---"
post_item "$TODAY" "email" "Morning Newsletter" "<p>Great news! Your digest is ready.</p>"
post_item "$TODAY" "podcast" "Tech Talk Daily" "<p>Today's episode: The Future of AI.</p>"
post_item "$TODAY" "youtube" "Dev Tips" "<p>How to master prompt engineering.</p>"

echo "--- Seeding items for yesterday ---"
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d)
post_item "$YESTERDAY" "email" "Yesterday's Recap" "<p>Summary of your missed items.</p>"
post_item "$YESTERDAY" "youtube" "React Patterns" "<p>Deep dive into React hooks.</p>"

echo "Done!"
