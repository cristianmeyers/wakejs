#!/bin/bash

# Diagnostic script - queries the API

API_URL="http://localhost:3000/api/action"

echo "=== WAKEJS DIAGNOSTIC - QUERYING API ==="
echo ""

# 1. Check if API is running
echo "1. Checking if API is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "   ✓ API responding on port 3000"
else
  echo "   ✗ API NOT responding on port 3000"
  echo "   Make sure to run: node index.js"
  exit 1
fi

echo ""

# 2. Test: Ping room B316
echo "2. Test: Querying room 'B316' from API..."
RESPONSE=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"type":"Room","name":"B316","action":"ping"}')

echo "Complete response:"
echo "$RESPONSE" | jq '.'

COUNT=$(echo "$RESPONSE" | jq -r '.count // 0')
echo ""
echo "Hosts found in room B316: $COUNT"

echo ""
echo "─────────────────────────────────────────────"
echo ""

# 3. Test: Ping specific hosts
echo "3. Test: Querying hosts 'eiutf220,eiutf221,eiutf222' from API..."
RESPONSE2=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"type":"Hosts","name":"eiutf220,eiutf221,eiutf222","action":"ping"}')

echo "Complete response:"
echo "$RESPONSE2" | jq '.'

echo ""

# Analyze individual results
echo "Individual host analysis:"
echo "$RESPONSE2" | jq -r '.results[] | "  - \(.id): found=\(.found // false), online=\(.online // "null")"'

echo ""
echo "─────────────────────────────────────────────"
echo ""

# 4. Test: Awake range
echo "4. Test: Awake range 'eiutf 220 222' from API..."
RESPONSE3=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"type":"Hosts","name":"eiutf220,eiutf221,eiutf222","action":"awake"}')

echo "Complete response:"
echo "$RESPONSE3" | jq '.'

echo ""
echo "=== END OF DIAGNOSTIC ==="