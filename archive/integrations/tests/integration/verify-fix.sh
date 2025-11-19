#!/bin/bash
# Simple verification test for Modal → Supabase integration
# Run after Modal deployment to verify fix

set -e

echo "=========================================="
echo "MODAL → SUPABASE VERIFICATION TEST"
echo "=========================================="
echo ""

# Step 1: Call Modal
echo "Step 1: Calling Modal processor..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "verify_1760962700",
    "rows": [{"name": "Alice"}],
    "prompt": "Bio for {{name}}",
    "output_schema": ["bio"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Modal: SUCCESS"
else
    echo "✗ Modal: FAILED (HTTP $HTTP_CODE)"
    exit 1
fi

# Step 2: Query Supabase
echo ""
echo "Step 2: Querying Supabase (waiting 3s)..."
sleep 3

SUPABASE_URL="https://ayjpnfzbxhcwwxvobssn.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDI1MTUsImV4cCI6MjA3NjIxODUxNX0.Z5UGim-MMeby07bNadd9ooS4JMmTQp32ytPCzRteeFE"

RESULT=$(curl -s \
  "$SUPABASE_URL/rest/v1/batch_results?batch_id=eq.verify_1760962700&select=id,status" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY")

echo "Supabase response: $RESULT"

# Check if we got any rows
if echo "$RESULT" | grep -q "\"id\""; then
    echo "✓ Supabase: FOUND RESULTS"
    echo ""
    echo "=========================================="
    echo "✓ TEST PASSED - Fix verified!"
    echo "=========================================="
    exit 0
else
    echo "✗ Supabase: NO RESULTS FOUND"
    echo ""
    echo "=========================================="
    echo "✗ TEST FAILED - Results not saved"
    echo "=========================================="
    exit 1
fi
