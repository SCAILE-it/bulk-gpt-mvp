#!/bin/bash

# ABOUTME: Automated dev server startup for Playwright E2E tests
# ABOUTME: Kills existing processes on port 3334, starts fresh dev server, waits for ready state

set -e  # Exit on error

PORT=3334
LOG_FILE="/tmp/playwright-dev-server.log"
PID_FILE="/tmp/playwright-dev-server.pid"
MAX_WAIT=60  # Maximum seconds to wait for server to be ready

echo "🚀 Starting dev server for Playwright tests on port $PORT..."

# Kill any existing process on the port (use fuser for reliability)
echo "🔍 Checking for existing processes on port $PORT..."
# Try multiple methods to ensure port is free
fuser -k -TERM $PORT/tcp 2>/dev/null || true
sleep 1
fuser -k -KILL $PORT/tcp 2>/dev/null || true
sleep 2

# Verify port is now free
if lsof -i:$PORT > /dev/null 2>&1; then
  echo "⚠️  Port $PORT still in use after cleanup, force killing..."
  lsof -ti:$PORT | xargs -r kill -9 2>/dev/null || true
  sleep 2
fi

echo "✅ Port $PORT is now free"

# Start dev server in background
echo "🔧 Starting Next.js dev server..."
npm run dev -- -p $PORT > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Save PID for later cleanup
echo $SERVER_PID > "$PID_FILE"
echo "📝 Server PID $SERVER_PID saved to $PID_FILE"

# Wait for server to be ready
echo "⏳ Waiting for server to be ready (max ${MAX_WAIT}s)..."
ELAPSED=0
SERVER_READY=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Check if process is still running
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server process died unexpectedly"
    echo "📋 Last 20 lines of server log:"
    tail -n 20 "$LOG_FILE"
    exit 1
  fi

  # Check if server is responding
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null | grep -qE "^(200|307|401)$"; then
    SERVER_READY=true
    break
  fi

  sleep 1
  ELAPSED=$((ELAPSED + 1))

  # Show progress every 10 seconds
  if [ $((ELAPSED % 10)) -eq 0 ]; then
    echo "  Still waiting... (${ELAPSED}s elapsed)"
  fi
done

# Check final status
if [ "$SERVER_READY" = true ]; then
  echo "✅ Dev server is ready on http://localhost:$PORT (took ${ELAPSED}s)"
  echo ""
  echo "Server PID: $SERVER_PID"
  echo "Log file: $LOG_FILE"
  echo "PID file: $PID_FILE"
  echo ""
  echo "To stop the server: kill $SERVER_PID"
  echo "To view logs: tail -f $LOG_FILE"
  exit 0
else
  echo "❌ Server failed to become ready within ${MAX_WAIT}s"
  echo ""
  echo "📋 Last 30 lines of server log:"
  tail -n 30 "$LOG_FILE"
  echo ""
  echo "💡 Troubleshooting:"
  echo "  - Check if port $PORT is actually free: lsof -i:$PORT"
  echo "  - Check full logs: cat $LOG_FILE"
  echo "  - Try manually: npm run dev -- -p $PORT"

  # Clean up
  kill $SERVER_PID 2>/dev/null || true
  rm -f "$PID_FILE"

  exit 1
fi
