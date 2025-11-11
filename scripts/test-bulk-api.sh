#!/bin/bash
# ABOUTME: Test script for Bulk GPT API endpoints with working curl examples
# ABOUTME: Tests /api/process, /api/batch/[id]/status, and /api/batch/[id]/stream

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${BULK_GPT_API_KEY:-}"

# Function to print colored output
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Install with: sudo apt-get install jq"
        exit 1
    fi
    print_success "jq is installed"

    if [ -z "$API_KEY" ]; then
        print_info "No API key provided. Using cookie-based authentication."
        print_info "Set BULK_GPT_API_KEY environment variable to use API key auth."
        AUTH_HEADER=""
    else
        print_success "API key found: ${API_KEY:0:10}..."
        AUTH_HEADER="Authorization: Bearer $API_KEY"
    fi

    echo -e "\nBase URL: ${BLUE}$BASE_URL${NC}"
}

# Test 1: Create Batch
test_create_batch() {
    print_section "Test 1: Create Batch (/api/process)"

    local request_body=$(cat <<EOF
{
  "csvFilename": "test-api-$(date +%s).csv",
  "rows": [
    {"name": "Alice Johnson", "company": "Stripe"},
    {"name": "Bob Smith", "company": "Anthropic"},
    {"name": "Carol White", "company": "OpenAI"}
  ],
  "prompt": "Write a professional bio for {{name}} at {{company}}. Return JSON with: company_name (string), industry (string), business_model (string describing their business in 1-2 sentences)",
  "context": "Professional bios for tech leaders",
  "outputColumns": ["company_name", "industry", "business_model"]
}
EOF
)

    echo "Request:"
    echo "$request_body" | jq .
    echo ""

    if [ -n "$AUTH_HEADER" ]; then
        response=$(curl -s -X POST "$BASE_URL/api/process" \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d "$request_body")
    else
        response=$(curl -s -X POST "$BASE_URL/api/process" \
            -H "Content-Type: application/json" \
            -d "$request_body")
    fi

    echo "Response:"
    echo "$response" | jq .

    # Extract batch ID
    BATCH_ID=$(echo "$response" | jq -r '.batchId // empty')

    if [ -z "$BATCH_ID" ]; then
        print_error "Failed to create batch. Check authentication or server status."
        echo "$response" | jq .
        exit 1
    fi

    print_success "Batch created with ID: $BATCH_ID"
    echo "$BATCH_ID" > /tmp/bulk-gpt-test-batch-id.txt
}

# Test 2: Poll Batch Status
test_poll_status() {
    print_section "Test 2: Poll Batch Status (/api/batch/[id]/status)"

    if [ -z "$BATCH_ID" ]; then
        BATCH_ID=$(cat /tmp/bulk-gpt-test-batch-id.txt 2>/dev/null || echo "")
    fi

    if [ -z "$BATCH_ID" ]; then
        print_error "No batch ID found. Run test_create_batch first."
        return 1
    fi

    print_info "Polling batch: $BATCH_ID"

    local max_attempts=30
    local attempt=0
    local status="pending"

    while [ "$attempt" -lt "$max_attempts" ]; do
        attempt=$((attempt + 1))

        if [ -n "$AUTH_HEADER" ]; then
            response=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/batch/$BATCH_ID/status")
        else
            response=$(curl -s "$BASE_URL/api/batch/$BATCH_ID/status")
        fi

        status=$(echo "$response" | jq -r '.status // "unknown"')
        total=$(echo "$response" | jq -r '.totalRows // 0')
        processed=$(echo "$response" | jq -r '.processedRows // 0')
        progress=$(echo "$response" | jq -r '.progressPercent // 0')

        echo -ne "\r[Attempt $attempt/$max_attempts] Status: $status | Progress: $processed/$total ($progress%)   "

        if [ "$status" == "completed" ] || [ "$status" == "completed_with_errors" ] || [ "$status" == "failed" ]; then
            echo ""
            print_success "Batch $status!"
            echo ""
            echo "Final Response:"
            echo "$response" | jq .
            break
        fi

        sleep 2
    done

    if [ "$attempt" -eq "$max_attempts" ]; then
        echo ""
        print_error "Timeout waiting for batch to complete"
        return 1
    fi
}

# Test 3: Stream Results (SSE)
test_stream_results() {
    print_section "Test 3: Stream Results (SSE - /api/batch/[id]/stream)"

    if [ -z "$BATCH_ID" ]; then
        BATCH_ID=$(cat /tmp/bulk-gpt-test-batch-id.txt 2>/dev/null || echo "")
    fi

    if [ -z "$BATCH_ID" ]; then
        print_error "No batch ID found. Run test_create_batch first."
        return 1
    fi

    print_info "Streaming batch: $BATCH_ID"
    print_info "This will stream for 30 seconds or until completion..."
    echo ""

    if [ -n "$AUTH_HEADER" ]; then
        timeout 30 curl -N -H "$AUTH_HEADER" "$BASE_URL/api/batch/$BATCH_ID/stream" 2>/dev/null || true
    else
        timeout 30 curl -N "$BASE_URL/api/batch/$BATCH_ID/stream" 2>/dev/null || true
    fi

    echo ""
    print_success "Stream test completed"
}

# Test 4: Error Handling
test_error_handling() {
    print_section "Test 4: Error Handling"

    # Test 4a: Missing required fields
    print_info "Testing missing csvFilename..."
    response=$(curl -s -X POST "$BASE_URL/api/process" \
        -H "Content-Type: application/json" \
        -d '{"rows": [], "prompt": "test"}')

    error=$(echo "$response" | jq -r '.error // empty')
    if [ -n "$error" ]; then
        print_success "Correctly rejected: $error"
    else
        print_error "Should have rejected missing csvFilename"
    fi

    # Test 4b: Invalid batch ID
    print_info "Testing invalid batch ID..."
    if [ -n "$AUTH_HEADER" ]; then
        response=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/batch/invalid_batch_id/status")
    else
        response=$(curl -s "$BASE_URL/api/batch/invalid_batch_id/status")
    fi

    error=$(echo "$response" | jq -r '.error // empty')
    if [ -n "$error" ]; then
        print_success "Correctly rejected: $error"
    else
        print_error "Should have rejected invalid batch ID"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         Bulk GPT API Test Suite                             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_prerequisites

    # Run tests based on arguments
    if [ $# -eq 0 ]; then
        # Run all tests
        test_create_batch
        sleep 2
        test_poll_status
        sleep 1
        test_stream_results
        sleep 1
        test_error_handling
    else
        # Run specific test
        case $1 in
            create)
                test_create_batch
                ;;
            status)
                test_poll_status
                ;;
            stream)
                test_stream_results
                ;;
            errors)
                test_error_handling
                ;;
            *)
                echo "Usage: $0 [create|status|stream|errors]"
                echo "  No arguments: Run all tests"
                echo "  create: Test POST /api/process"
                echo "  status: Test GET /api/batch/[id]/status"
                echo "  stream: Test GET /api/batch/[id]/stream (SSE)"
                echo "  errors: Test error handling"
                exit 1
                ;;
        esac
    fi

    print_section "Test Suite Complete"
    print_success "All tests finished!"
}

# Run main
main "$@"
