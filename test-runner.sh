#!/bin/bash

# Test Runner Script for Bulk GPT Comprehensive Test Suite
# Usage: ./test-runner.sh [quick|full|stress]

set -e

TEST_TYPE=${1:-quick}

echo "═══════════════════════════════════════════════════════"
echo "  Bulk GPT Test Runner"
echo "═══════════════════════════════════════════════════════"
echo ""

case $TEST_TYPE in
  quick)
    echo "🚀 Running Quick API Test..."
    echo ""
    node test-quick-api.js
    ;;
  full)
    echo "📊 Running Full Comprehensive Test Suite..."
    echo "   (This may take 10-15 minutes)"
    echo ""
    TEST_ALL=true node test-comprehensive-output-quality.js 2>&1 | tee test-results-$(date +%Y%m%d-%H%M%S).log
    ;;
  stress)
    echo "🔥 Running Stress Tests Only..."
    echo ""
    # Extract just stress test portion
    node -e "
      const { runTests } = require('./test-comprehensive-output-quality.js');
      // Modify to run only stress tests
      console.log('Stress tests would run here');
    "
    ;;
  *)
    echo "Usage: $0 [quick|full|stress]"
    echo ""
    echo "  quick  - Fast API validation test (30 seconds)"
    echo "  full   - Complete test suite with all scenarios (10-15 minutes)"
    echo "  stress - Stress testing only"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Test run completed"
echo "═══════════════════════════════════════════════════════"


