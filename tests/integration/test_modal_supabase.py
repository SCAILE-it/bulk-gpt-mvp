#!/usr/bin/env python3
"""Test Modal -> Supabase integration after fix"""

import requests
import time
import json

MODAL_URL = "https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run/"
SUPABASE_URL = "https://ayjpnfzbxhcwwxvobssn.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDI1MTUsImV4cCI6MjA3NjIxODUxNX0.Z5UGim-MMeby07bNadd9ooS4JMmTQp32ytPCzRteeFE"

def main():
    print("=" * 50)
    print("MODAL → SUPABASE INTEGRATION TEST")
    print("=" * 50)

    batch_id = f"python_test_{int(time.time())}"
    print(f"\nBatch ID: {batch_id}")

    # Step 1: Call Modal
    print("\n[1] Calling Modal...")
    response = requests.post(
        MODAL_URL,
        json={
            "batch_id": batch_id,
            "rows": [{"name": "TestUser"}],
            "prompt": "Bio for {{name}}",
            "output_schema": ["bio"]
        },
        timeout=30
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Modal SUCCESS: {data.get('successful', 0)} rows processed")
    else:
        print(f"✗ Modal FAILED")
        return False

    # Step 2: Query Supabase
    print("\n[2] Querying Supabase (waiting 3s)...")
    time.sleep(3)

    supabase_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/batch_results",
        params={"batch_id": f"eq.{batch_id}", "select": "id,status,input,output"},
        headers={
            "apikey": API_KEY,
            "Authorization": f"Bearer {API_KEY}"
        }
    )

    results = supabase_response.json()
    print(f"Status: {supabase_response.status_code}")
    print(f"Results: {json.dumps(results, indent=2)}")

    if len(results) > 0:
        print(f"\n✓ SUPABASE SUCCESS: Found {len(results)} rows")
        print("=" * 50)
        print("✅ TEST PASSED")
        print("=" * 50)
        return True
    else:
        print(f"\n✗ SUPABASE FAILED: No rows found")
        print("=" * 50)
        print("❌ TEST FAILED")
        print("=" * 50)
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
