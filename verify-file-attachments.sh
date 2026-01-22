#!/bin/bash

# End-to-End Verification Script for File Attachment Feature
# This script performs automated checks to verify the file attachment implementation

echo "🔍 File Attachment Feature Verification"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment configuration
echo "1. Checking environment configuration..."
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo "   Please create .env.local with required API keys"
    echo "   See README.md for setup instructions"
    exit 1
fi

# Check for required environment variables
required_vars=("ANTHROPIC_API_KEY" "GITHUB_TOKEN" "GITHUB_OWNER" "GITHUB_REPO" "CLICKUP_API_KEY" "CLICKUP_LIST_ID")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env.local; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration found${NC}"
echo ""

# Check if dev server is running
echo "2. Checking development server..."
if ! lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Development server not running${NC}"
    echo "   Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Development server is running on port 3000${NC}"
echo ""

# Check TypeScript compilation
echo "3. Running TypeScript compilation check..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ TypeScript compilation errors found${NC}"
    npx tsc --noEmit
    exit 1
fi
echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
echo ""

# Check modified files exist
echo "4. Verifying implementation files..."
files=(
    "lib/types.ts"
    "app/page.tsx"
    "app/api/submit-bug/route.ts"
    "lib/github-service.ts"
    "lib/clickup-service.ts"
)

for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing file: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ All implementation files present${NC}"
echo ""

# Check for Attachment type in types.ts
echo "5. Verifying type definitions..."
if ! grep -q "attachments?" lib/types.ts; then
    echo -e "${RED}❌ Attachments field not found in BugReport interface${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Attachments type definition found${NC}"
echo ""

# Check for file input in page.tsx
echo "6. Verifying frontend file upload component..."
if ! grep -q "type=\"file\"" app/page.tsx; then
    echo -e "${RED}❌ File input not found in app/page.tsx${NC}"
    exit 1
fi

if ! grep -q "FormData" app/page.tsx; then
    echo -e "${RED}❌ FormData handling not found in app/page.tsx${NC}"
    exit 1
fi
echo -e "${GREEN}✅ File upload component implemented${NC}"
echo ""

# Check FormData parsing in API route
echo "7. Verifying API FormData handling..."
if ! grep -q "formData()" app/api/submit-bug/route.ts; then
    echo -e "${RED}❌ FormData parsing not found in API route${NC}"
    exit 1
fi
echo -e "${GREEN}✅ API FormData parsing implemented${NC}"
echo ""

# Check GitHub file upload
echo "8. Verifying GitHub file upload functions..."
if ! grep -q "uploadFileToGitHub" lib/github-service.ts; then
    echo -e "${RED}❌ GitHub file upload function not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ GitHub file upload implemented${NC}"
echo ""

# Check ClickUp file attachment
echo "9. Verifying ClickUp file attachment functions..."
if ! grep -q "uploadFilesToClickUpTask" lib/clickup-service.ts; then
    echo -e "${RED}❌ ClickUp file upload function not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ClickUp file attachment implemented${NC}"
echo ""

# Create test files
echo "10. Creating test files..."
cat > test-image.txt << 'EOF'
This is a simulated image file for testing.
In a real test, use an actual PNG or JPG image.
EOF

cat > test-log.log << 'EOF'
[2026-01-22 10:00:00] INFO: Application started
[2026-01-22 10:00:01] ERROR: Test error for verification
[2026-01-22 10:00:02] WARN: This is a test log file
EOF

echo -e "${GREEN}✅ Test files created${NC}"
echo ""

# API test
echo "11. Testing API endpoint..."
echo "   Submitting test bug report with file attachments..."

response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/submit-bug \
  -F 'title=E2E Test: File Attachment Verification' \
  -F 'description=Automated test of file upload functionality' \
  -F 'severity=medium' \
  -F 'category=ui' \
  -F 'stepsToReproduce=1. Run verification script\n2. Check results' \
  -F 'expectedBehavior=Files should upload successfully' \
  -F 'actualBehavior=Testing implementation' \
  -F 'file=@test-image.txt;type=text/plain' \
  -F 'file=@test-log.log;type=text/plain' \
  2>&1)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
    echo -e "${RED}❌ API test failed with status code: $http_code${NC}"
    echo "Response: $body"
    exit 1
fi

# Parse response
if echo "$body" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ API test successful${NC}"

    # Extract URLs
    github_url=$(echo "$body" | grep -o '"githubIssue":"[^"]*"' | cut -d'"' -f4)
    clickup_url=$(echo "$body" | grep -o '"clickupTask":"[^"]*"' | cut -d'"' -f4)

    echo ""
    echo "📋 Test Results:"
    echo "   GitHub Issue: $github_url"
    echo "   ClickUp Task: $clickup_url"
    echo ""
    echo "   Please manually verify:"
    echo "   - GitHub issue contains file attachments"
    echo "   - ClickUp task has files attached"
    echo "   - Files are downloadable from both platforms"
else
    echo -e "${RED}❌ API returned unsuccessful response${NC}"
    echo "Response: $body"
    exit 1
fi

# Cleanup test files
echo ""
echo "12. Cleaning up test files..."
rm -f test-image.txt test-log.log
echo -e "${GREEN}✅ Test files removed${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ All automated checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open the GitHub issue URL and verify attachments"
echo "2. Open the ClickUp task URL and verify attached files"
echo "3. Test the form manually at http://localhost:3000"
echo "4. Complete the full E2E checklist in E2E_VERIFICATION.md"
echo ""
