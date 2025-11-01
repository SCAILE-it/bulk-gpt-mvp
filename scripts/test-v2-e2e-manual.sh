#!/bin/bash
# Manual E2E Test Script for V2 Migration
# This script provides step-by-step instructions for manual testing

set -e

echo "========================================="
echo "V2 Migration Manual E2E Test"
echo "========================================="
echo ""

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "❌ Dev server is not running!"
  echo "Please start it with: npm run dev"
  exit 1
fi

echo "✅ Dev server is running on http://localhost:3000"
echo ""

echo "========================================="
echo "MANUAL TEST STEPS"
echo "========================================="
echo ""

echo "Step 1: Open Browser"
echo "  → Open http://localhost:3000 in your browser"
echo ""

echo "Step 2: Upload Test CSV"
echo "  → File: test-data/test-migration.csv"
echo "  → Should contain 3 rows: Alice, Bob, Carol"
echo "  → Verify columns appear: name, company, role"
echo ""

echo "Step 3: Configure Prompt"
echo "  → Enter prompt: 'Write a professional bio for {{name}} who works as a {{role}} at {{company}}.'"
echo "  → Verify template variables are recognized"
echo ""

echo "Step 4: Add Output Column"
echo "  → Click 'Add Column' or similar button"
echo "  → Enter column name: 'bio'"
echo "  → Press Enter or Save"
echo ""

echo "Step 5: Run Batch Processing"
echo "  → Click 'Run All' or 'Process' button"
echo "  → Should see 'Processing' or 'Pending' status"
echo ""

echo "Step 6: Wait for V2 Processing"
echo "  → V2 Modal may cold start (60-90 seconds first time)"
echo "  → Processing time: ~3-5 seconds per row after cold start"
echo "  → Total time: 1-2 minutes for 3 rows"
echo ""

echo "Step 7: Verify Results"
echo "  → All 3 rows should show 'Success' or 'Done' status"
echo "  → 'bio' column should contain professional bio text"
echo "  → Bio should mention name, role, and company"
echo ""

echo "Step 8: Check Batch Status Card"
echo "  → Success count: 3"
echo "  → Failed count: 0"
echo "  → Pending count: 0"
echo ""

echo "========================================="
echo "AUTOMATED BACKEND TEST"
echo "========================================="
echo ""

echo "Testing V2 endpoint directly..."
echo ""

# Test V2 endpoint
RESPONSE=$(curl -s -X POST "https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [
      {"name": "Test User", "company": "TestCorp", "role": "Tester"}
    ],
    "prompt": "Write a bio for {{name}} at {{company}}.",
    "output_schema": [{"name": "bio"}],
    "temperature": 0.7,
    "max_tokens": 8192
  }')

# Check if response contains success
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ V2 endpoint test PASSED"
  echo ""
  echo "Response summary:"
  echo "$RESPONSE" | jq '{success, status, total_rows, successful, failed, processing_time_seconds}'
  echo ""
else
  echo "❌ V2 endpoint test FAILED"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | jq '.'
  echo ""
  exit 1
fi

echo "========================================="
echo "WHAT TO LOOK FOR"
echo "========================================="
echo ""

echo "✅ SUCCESS INDICATORS:"
echo "  - CSV uploads and parses correctly"
echo "  - All 3 rows show 'Success' or 'Done' status"
echo "  - Bio column contains meaningful text"
echo "  - Processing completes in < 2 minutes"
echo "  - No errors in browser console"
echo ""

echo "❌ FAILURE INDICATORS:"
echo "  - Rows stuck in 'Pending' or 'Processing'"
echo "  - Empty bio column (indicates transformation bug)"
echo "  - Error status on any row"
echo "  - Timeout errors (> 2 minutes)"
echo "  - Console errors about 'prompt_executor'"
echo ""

echo "========================================="
echo "DEBUGGING"
echo "========================================="
echo ""

echo "If test fails, check:"
echo "  1. Browser console for errors"
echo "  2. Network tab for /api/process request/response"
echo "  3. V2 endpoint logs (Modal dashboard)"
echo "  4. Database: SELECT * FROM batch_results ORDER BY created_at DESC LIMIT 5"
echo ""

echo "Common issues:"
echo "  - Cold start timeout: Increase timeout to 150s"
echo "  - Empty output: Check prompt_executor vs prompt-executor bug"
echo "  - Missing results: Check response transformation in route.ts:280"
echo ""

echo "========================================="
echo "NEXT STEPS"
echo "========================================="
echo ""

echo "After successful manual test:"
echo "  1. Update V2_MIGRATION_TEST_RESULTS.md with results"
echo "  2. Mark E2E test as completed in todo list"
echo "  3. Proceed to deployment"
echo ""

echo "Test script complete!"
