#!/bin/bash
# Test AEO Analytics Agent Flow
# This script tests the full AEO Analytics flow

echo "🧪 Testing AEO Analytics Agent Flow"
echo "===================================="

# Step 1: Get keyword resources
echo ""
echo "1️⃣ Fetching keyword resources..."
KEYWORD_RESOURCES=$(curl -s "http://localhost:3000/api/resources?type=keyword&limit=5" | jq -r '.resources[].id' | head -2)
KEYWORD_IDS=$(echo $KEYWORD_RESOURCES | tr '\n' ' ')

if [ -z "$KEYWORD_IDS" ]; then
    echo "❌ No keyword resources found. Please create some keyword resources first."
    exit 1
fi

echo "✅ Found keyword resources: $KEYWORD_IDS"

# Step 2: Run AEO Analytics agent
echo ""
echo "2️⃣ Running AEO Analytics agent..."
RUN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/agents/aeo_analytics/run" \
  -H "Content-Type: application/json" \
  -d "{
    \"input_resource_ids\": [$(echo $KEYWORD_IDS | sed 's/ /, /g')],
    \"config\": {
      \"domain\": \"example.com\"
    }
  }")

BATCH_ID=$(echo $RUN_RESPONSE | jq -r '.batch_id // empty')
STATUS=$(echo $RUN_RESPONSE | jq -r '.status // empty')

if [ -z "$BATCH_ID" ]; then
    echo "❌ Failed to run agent:"
    echo "$RUN_RESPONSE" | jq '.'
    exit 1
fi

echo "✅ Agent run started!"
echo "   Batch ID: $BATCH_ID"
echo "   Status: $STATUS"

# Step 3: Wait a bit for processing
echo ""
echo "3️⃣ Waiting for processing..."
sleep 3

# Step 4: Check batch status
echo ""
echo "4️⃣ Checking batch status..."
BATCH_STATUS=$(curl -s "http://localhost:3000/api/batches/$BATCH_ID" | jq -r '.batch.status // empty')
echo "   Batch Status: $BATCH_STATUS"

# Step 5: Check analytics resources
echo ""
echo "5️⃣ Checking analytics resources..."
ANALYTICS_COUNT=$(curl -s "http://localhost:3000/api/resources?type=analytics&agent_id=aeo_analytics" | jq '.resources | length')
echo "   Analytics resources created: $ANALYTICS_COUNT"

if [ "$ANALYTICS_COUNT" -gt 0 ]; then
    echo "✅ Analytics resources created successfully!"
    echo ""
    echo "📊 Sample analytics resource:"
    curl -s "http://localhost:3000/api/resources?type=analytics&agent_id=aeo_analytics&limit=1" | jq '.resources[0] | {id, type, agent_id, data: {keyword: .data.keyword, aeo_score: .data.aeo_insights.answer_engine_optimization_score}}'
else
    echo "⚠️  No analytics resources found yet (may still be processing)"
fi

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "1. Check Resources page: http://localhost:3000/resources?type=analytics"
echo "2. View batch details: http://localhost:3000/batches/$BATCH_ID"
echo "3. Check AnalyticsDataDisplay component rendering"

