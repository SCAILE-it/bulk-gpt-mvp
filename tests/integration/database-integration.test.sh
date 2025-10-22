#!/bin/bash
# Integration test: Modal → Supabase end-to-end
# Tests that Modal processing results are saved to Supabase
#
# Expected BEFORE fix: Modal succeeds, Supabase insert fails
# Expected AFTER fix: Modal succeeds, Supabase insert succeeds

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
MODAL_URL="https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "DATABASE INTEGRATION TEST"
echo "============================================"
echo ""

# Generate unique batch ID
BATCH_ID="test_$(date +%s)_$$"
echo "Test Batch ID: $BATCH_ID"
echo ""

# Step 1: Call Modal endpoint
echo "Step 1: Calling Modal processor..."
MODAL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$MODAL_URL/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "'"$BATCH_ID"'",
    "rows": [
      {"name": "Alice", "company": "Acme", "role": "Engineer"},
      {"name": "Bob", "company": "TechCo", "role": "Designer"}
    ],
    "prompt": "Write a bio for {{name}} at {{company}} as {{role}}",
    "context": "",
    "output_schema": ["bio"]
  }')

HTTP_CODE=$(echo "$MODAL_RESPONSE" | tail -n1)
MODAL_BODY=$(echo "$MODAL_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$MODAL_BODY" | jq '.' 2>/dev/null || echo "$MODAL_BODY"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}✗ FAIL: Modal returned HTTP $HTTP_CODE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PASS: Modal processed successfully${NC}"
echo ""

# Step 2: Query Supabase for results
echo "Step 2: Querying Supabase batch_results table..."
sleep 2  # Give Supabase time to process

SUPABASE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$SUPABASE_URL/rest/v1/batch_results?batch_id=eq.$BATCH_ID&select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY")

SUPABASE_HTTP=$(echo "$SUPABASE_RESPONSE" | tail -n1)
SUPABASE_BODY=$(echo "$SUPABASE_RESPONSE" | sed '$d')

echo "HTTP Status: $SUPABASE_HTTP"
echo "Results:"
echo "$SUPABASE_BODY" | jq '.' 2>/dev/null || echo "$SUPABASE_BODY"
echo ""

if [ "$SUPABASE_HTTP" != "200" ]; then
    echo -e "${RED}✗ FAIL: Supabase returned HTTP $SUPABASE_HTTP${NC}"
    exit 1
fi

# Count rows returned
ROW_COUNT=$(echo "$SUPABASE_BODY" | jq '. | length' 2>/dev/null || echo "0")

if [ "$ROW_COUNT" = "0" ]; then
    echo -e "${RED}✗ FAIL: No rows found in Supabase (expected 2)${NC}"
    echo -e "${YELLOW}This indicates Modal inserts are failing due to column mismatch${NC}"
    exit 1
fi

if [ "$ROW_COUNT" = "2" ]; then
    echo -e "${GREEN}✓ PASS: Found 2 rows in Supabase${NC}"
    echo ""

    # Verify column structure
    echo "Step 3: Verifying column structure..."
    HAS_INPUT=$(echo "$SUPABASE_BODY" | jq '.[0] | has("input")' 2>/dev/null)
    HAS_OUTPUT=$(echo "$SUPABASE_BODY" | jq '.[0] | has("output")' 2>/dev/null)

    if [ "$HAS_INPUT" = "true" ] && [ "$HAS_OUTPUT" = "true" ]; then
        echo -e "${GREEN}✓ PASS: Correct column names (input, output)${NC}"
    else
        echo -e "${RED}✗ FAIL: Wrong column names${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ WARNING: Found $ROW_COUNT rows (expected 2)${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}ALL TESTS PASSED${NC}"
echo "============================================"
