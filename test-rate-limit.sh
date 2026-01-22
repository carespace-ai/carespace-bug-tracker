#!/bin/bash

# Manual Integration Test for Rate Limiting
# Tests rate limiting with custom configuration

set -e

API_URL="http://localhost:3000/api/submit-bug"
TEST_PAYLOAD='{
  "title": "Test Bug Report for Rate Limiting",
  "description": "This is a test bug report to verify rate limiting functionality works correctly.",
  "severity": "low",
  "category": "other",
  "stepsToReproduce": "1. Submit multiple requests\n2. Verify rate limiting",
  "expectedBehavior": "Rate limit should kick in after max requests",
  "actualBehavior": "Testing rate limiting behavior"
}'

echo "========================================"
echo "Rate Limiting Integration Test"
echo "========================================"
echo ""
echo "Configuration:"
echo "  RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-60000 (1 minute)}"
echo "  RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-2}"
echo ""
echo "Test Plan:"
echo "  1. Submit requests until rate limited"
echo "  2. Verify 429 status code"
echo "  3. Verify Retry-After header"
echo "  4. Check rate limit headers"
echo ""
echo "========================================"
echo ""

# Function to make a request and display results
make_request() {
    local request_num=$1
    echo "Request #$request_num:"
    echo "----------------------------------------"

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: 192.168.1.100" \
        -d "$TEST_PAYLOAD" 2>&1)

    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    echo "Status Code: $status_code"

    # Get headers separately
    headers=$(curl -s -I -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: 192.168.1.100" \
        -d "$TEST_PAYLOAD" 2>&1)

    # Extract rate limit headers
    rate_limit=$(echo "$headers" | grep -i "x-ratelimit-limit" || echo "")
    rate_remaining=$(echo "$headers" | grep -i "x-ratelimit-remaining" || echo "")
    rate_reset=$(echo "$headers" | grep -i "x-ratelimit-reset" || echo "")
    retry_after=$(echo "$headers" | grep -i "retry-after" || echo "")

    if [ -n "$rate_limit" ]; then
        echo "$rate_limit"
    fi
    if [ -n "$rate_remaining" ]; then
        echo "$rate_remaining"
    fi
    if [ -n "$rate_reset" ]; then
        echo "$rate_reset"
    fi
    if [ -n "$retry_after" ]; then
        echo "$retry_after"
    fi

    # Show response body snippet
    if [ "$status_code" = "429" ]; then
        echo "Response (Rate Limited):"
        echo "$body" | head -c 200
    elif [ "$status_code" = "200" ]; then
        echo "Response: SUCCESS"
    else
        echo "Response:"
        echo "$body" | head -c 200
    fi

    echo ""
    echo ""
}

# Wait for server to be ready
echo "Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "Server is ready!"
        echo ""
        break
    fi
    if [ $i -eq 30 ]; then
        echo "ERROR: Server did not start in time"
        exit 1
    fi
    sleep 1
done

# Make multiple requests to trigger rate limit
for i in {1..5}; do
    make_request $i
    sleep 0.5
done

echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""
echo "✓ Test completed"
echo ""
echo "Expected Results:"
echo "  - First 2 requests: Status 200 or appropriate response"
echo "  - Requests 3+: Status 429 (Rate Limited)"
echo "  - Headers should include:"
echo "    - X-RateLimit-Limit"
echo "    - X-RateLimit-Remaining"
echo "    - X-RateLimit-Reset"
echo "    - Retry-After (on 429 responses)"
echo ""
echo "Check the server console logs for:"
echo "  - Rate limit violation messages"
echo "  - Structured log output with IP, count, and reset time"
echo ""
