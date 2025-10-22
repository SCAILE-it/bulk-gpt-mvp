#!/bin/bash
# SSH Tunnel to bulk-gpt-app on VM
# This forwards port 5177 from VM to your local machine

echo "🚇 Starting SSH tunnel to VM..."
echo "📍 VM: federicodeponte@34.78.185.56"
echo "🔗 Forwarding: localhost:5177 → VM:5177"
echo ""
echo "Once connected, access the app at:"
echo "   👉 http://localhost:5177"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

ssh -i ~/.ssh/google_compute_engine \
    -L 5177:localhost:5177 \
    federicodeponte@34.78.185.56 \
    -N
