#!/bin/bash

# Test Execution Script for Bulk GPT MVP
# Created: October 22, 2025
# Run this to execute the deployment plan

set -e  # Exit on error

echo "========================================="
echo "🚀 Bulk GPT MVP - Test & Deploy Plan"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/federicodeponte/projects/bulk-gpt-app

echo "📁 Working Directory: $(pwd)"
echo ""

# Step 1: Run Hook Tests
echo "========================================="
echo "Step 1: Running Hook Tests (30 min)"
echo "========================================="
echo ""

echo "${YELLOW}Running useFileUpload tests...${NC}"
npm test hooks/__tests__/useFileUpload.test.ts || { echo "${RED}❌ useFileUpload tests failed${NC}"; exit 1; }
echo "${GREEN}✅ useFileUpload tests passed${NC}"
echo ""

echo "${YELLOW}Running useCSVParser tests...${NC}"
npm test hooks/__tests__/useCSVParser.test.ts || { echo "${RED}❌ useCSVParser tests failed${NC}"; exit 1; }
echo "${GREEN}✅ useCSVParser tests passed${NC}"
echo ""

echo "${YELLOW}Running useBatchProcessor tests...${NC}"
npm test hooks/__tests__/useBatchProcessor.test.ts || { echo "${RED}❌ useBatchProcessor tests failed${NC}"; exit 1; }
echo "${GREEN}✅ useBatchProcessor tests passed${NC}"
echo ""

echo "${YELLOW}Running useFileUpload integration tests...${NC}"
npm test hooks/__tests__/useFileUpload.integration.test.tsx || { echo "${RED}❌ Integration tests failed${NC}"; exit 1; }
echo "${GREEN}✅ Integration tests passed${NC}"
echo ""

echo "${GREEN}=========================================${NC}"
echo "${GREEN}✅ All Hook Tests Passed!${NC}"
echo "${GREEN}=========================================${NC}"
echo ""

# Step 2: Verify Duplicate Service Removed
echo "========================================="
echo "Step 2: Verify Duplicate Service Removed"
echo "========================================="
echo ""

if [ -f "services/batchProcessingService.ts" ]; then
    echo "${RED}❌ Duplicate service still exists: services/batchProcessingService.ts${NC}"
    echo "Run: rm services/batchProcessingService.ts"
    exit 1
else
    echo "${GREEN}✅ Duplicate service already removed${NC}"
fi
echo ""

# Step 3: Type Check
echo "========================================="
echo "Step 3: TypeScript Type Check"
echo "========================================="
echo ""

echo "${YELLOW}Running TypeScript compiler...${NC}"
npm run type-check || { echo "${RED}❌ TypeScript errors found${NC}"; exit 1; }
echo "${GREEN}✅ No TypeScript errors${NC}"
echo ""

# Step 4: Build Test
echo "========================================="
echo "Step 4: Production Build Test (15 min)"
echo "========================================="
echo ""

echo "${YELLOW}Running production build...${NC}"
npm run build || { echo "${RED}❌ Build failed${NC}"; exit 1; }
echo "${GREEN}✅ Build successful${NC}"
echo ""

# Step 5: Summary
echo "========================================="
echo "🎉 SUCCESS - ALL CHECKS PASSED!"
echo "========================================="
echo ""
echo "✅ All hook tests passed"
echo "✅ No duplicate services"
echo "✅ No TypeScript errors"
echo "✅ Production build successful"
echo ""
echo "========================================="
echo "📋 Next Steps:"
echo "========================================="
echo ""
echo "1. Manual Smoke Test (15 min):"
echo "   npm start"
echo "   # Test at http://localhost:3000"
echo ""
echo "2. Deploy to Production (30 min):"
echo "   vercel --prod"
echo ""
echo "========================================="
echo "🚀 Ready to Deploy!"
echo "========================================="
