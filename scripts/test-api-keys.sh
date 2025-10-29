#!/bin/bash
# E2E Test Script for API Keys Feature
# Tests API key management endpoints on production

set -e

# Configuration
SUPABASE_URL="https://ayjpnfzbxhcwwxvobssn.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDI1MTUsImV4cCI6MjA3NjIxODUxNX0.Z5UGim-MMeby07bNadd9ooS4JMmTQp32ytPCzRteeFE"
APP_URL="https://bulk-gpt-app.vercel.app"

echo "🧪 API Keys E2E Test Suite"
echo "==========================="
echo ""

# Step 1: Authenticate
echo "Step 1: Authenticating test user..."
# Try to login first with existing test user
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"bulkgpt-test-confirmed@tempmail.com","password":"TestPass123456"}')

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Authentication failed:"
  echo "$AUTH_RESPONSE" | jq '.'
  echo ""
  echo "Note: User may already exist. Try manual login at ${APP_URL}/auth"
  echo "Then export ACCESS_TOKEN manually and skip to Step 2"
  exit 1
fi

echo "✅ Authenticated successfully"
echo "   Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 2: List existing API keys
echo "Step 2: Listing existing API keys..."
LIST_RESPONSE=$(curl -s "${APP_URL}/api/keys" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Response:"
echo "$LIST_RESPONSE" | jq '.'
echo ""

# Step 3: Create new API key
echo "Step 3: Creating new API key..."
CREATE_RESPONSE=$(curl -s -X POST "${APP_URL}/api/keys" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E-Test-Key-'$(date +%s)'"}')

API_KEY=$(echo "$CREATE_RESPONSE" | jq -r '.key // empty')
KEY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [ -z "$API_KEY" ] || [ "$API_KEY" == "null" ]; then
  echo "❌ API key creation failed:"
  echo "$CREATE_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ API key created successfully"
echo "   Key: ${API_KEY:0:15}..."
echo "   ID: $KEY_ID"
echo ""

# Step 4: Test API key authentication
echo "Step 4: Testing API key authentication..."
USAGE_RESPONSE=$(curl -s "${APP_URL}/api/usage" \
  -H "Authorization: Bearer ${API_KEY}")

echo "Response:"
echo "$USAGE_RESPONSE" | jq '.'

BATCHES_TODAY=$(echo "$USAGE_RESPONSE" | jq -r '.batchesToday // empty')
if [ -z "$BATCHES_TODAY" ]; then
  echo "❌ API key authentication failed"
  exit 1
fi

echo "✅ API key authentication successful"
echo "   Usage: ${BATCHES_TODAY}/${$(echo "$USAGE_RESPONSE" | jq -r '.dailyBatchLimit')} batches today"
echo ""

# Step 5: Revoke API key
echo "Step 5: Revoking API key..."
REVOKE_RESPONSE=$(curl -s -X DELETE "${APP_URL}/api/keys" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"keyId\":\"${KEY_ID}\"}")

echo "Response:"
echo "$REVOKE_RESPONSE" | jq '.'
echo ""

# Step 6: Verify revoked key is rejected
echo "Step 6: Verifying revoked key is rejected..."
REVOKED_RESPONSE=$(curl -s -w "\n%{http_code}" "${APP_URL}/api/usage" \
  -H "Authorization: Bearer ${API_KEY}")

HTTP_CODE=$(echo "$REVOKED_RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "401" ]; then
  echo "✅ Revoked key correctly rejected (401)"
else
  echo "❌ Expected 401, got $HTTP_CODE"
  echo "$REVOKED_RESPONSE" | head -n -1
  exit 1
fi

echo ""
echo "==========================="
echo "✅ ALL TESTS PASSED"
echo "==========================="
echo ""
echo "Summary:"
echo "- ✅ User authentication"
echo "- ✅ API key creation"
echo "- ✅ API key authentication"
echo "- ✅ API key revocation"
echo "- ✅ Revoked key rejection"
echo ""
echo "The API Keys feature is working correctly on production!"
