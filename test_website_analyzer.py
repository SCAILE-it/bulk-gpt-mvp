#!/usr/bin/env python3
"""Test script for website analyzer"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add services directory to path
sys.path.insert(0, str(Path(__file__).parent / 'services'))

from website_analyzer import analyze_website

async def test_analyze_website():
    """Test the website analyzer with scaile.tech"""
    
    # Check for API key
    api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        print("❌ ERROR: GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_API_KEY not found in environment")
        print("   Please set one of these environment variables")
        return False
    
    print("=" * 60)
    print("Website Analyzer Test")
    print("=" * 60)
    print(f"\n🧪 Testing website analyzer...")
    print(f"📋 URL: scaile.tech")
    print(f"📋 Mode: full")
    print(f"🔍 Use Google Search: True")
    print()
    
    try:
        result = await analyze_website(
            url="scaile.tech",
            mode="full",
            use_google_search=True,
            max_content_length=50000,
        )
        
        print("✅ Analysis successful!")
        print("\n📊 Extracted Data:")
        print("-" * 60)
        for key, value in result.items():
            if key == "_metadata":
                continue
            if isinstance(value, list):
                print(f"  {key}: {value}")
            elif isinstance(value, str) and len(value) > 100:
                print(f"  {key}: {value[:100]}...")
            else:
                print(f"  {key}: {value}")
        print("-" * 60)
        
        if "_metadata" in result:
            print(f"\n📝 Metadata: {result['_metadata']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_analyze_website())
    sys.exit(0 if success else 1)

