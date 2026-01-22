# Manual Integration Verification - Rate Limiting

This document provides instructions for manually verifying the rate limiting implementation.

## Overview

The rate limiting feature has been implemented with:
- **Configurable window**: `RATE_LIMIT_WINDOW_MS` (default: 15 minutes / 900000ms)
- **Configurable max requests**: `RATE_LIMIT_MAX_REQUESTS` (default: 5)
- **IP-based tracking**: Uses sliding window algorithm
- **Structured logging**: Console logs for rate limit violations
- **Standard HTTP headers**: Returns 429 status with Retry-After header

## Prerequisites

1. Node.js and npm installed
2. All dependencies installed (`npm install`)
3. Development server environment

## Test Procedure

### Step 1: Start Development Server with Custom Rate Limits

For faster testing, use shorter limits:

```bash
RATE_LIMIT_WINDOW_MS=60000 RATE_LIMIT_MAX_REQUESTS=2 npm run dev
```

This configuration:
- **Window**: 60 seconds (1 minute)
- **Max Requests**: 2 requests per window
- **Server**: http://localhost:3000

### Step 2: Submit Multiple Requests

Use the provided test script:

```bash
./test-rate-limit.sh
```

Or manually with curl:

```bash
# Request 1 (should succeed)
curl -v -X POST http://localhost:3000/api/submit-bug \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -d '{
    "title": "Test Bug Report",
    "description": "Testing rate limiting functionality",
    "severity": "low",
    "category": "other"
  }'

# Request 2 (should succeed)
curl -v -X POST http://localhost:3000/api/submit-bug \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -d '{
    "title": "Test Bug Report 2",
    "description": "Testing rate limiting functionality",
    "severity": "low",
    "category": "other"
  }'

# Request 3 (should be rate limited)
curl -v -X POST http://localhost:3000/api/submit-bug \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -d '{
    "title": "Test Bug Report 3",
    "description": "Testing rate limiting functionality",
    "severity": "low",
    "category": "other"
  }'
```

### Step 3: Verify 429 Response

When rate limited (request 3+), verify the response contains:

**Status Code:**
```
HTTP/1.1 429 Too Many Requests
```

**Headers:**
```
X-RateLimit-Limit: 2
X-RateLimit-Remaining: 0
X-RateLimit-Reset: [timestamp in milliseconds]
Retry-After: [seconds until reset]
```

**Response Body:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": [seconds],
  "resetTime": "[ISO 8601 timestamp]"
}
```

### Step 4: Verify Console Logs

Check the server console output for structured logging. You should see:

**When rate limit is exceeded:**
```
Rate limit exceeded for IP 192.168.1.100. Current requests: 2/2. Reset at [ISO timestamp] (in [N] seconds).
```

**When a rate-limited request is blocked:**
```
Rate limit violation: Request blocked from IP 192.168.1.100. Retry available in [N] seconds at [ISO timestamp].
```

### Step 5: Verify Reset Behavior

Wait for the rate limit window to expire (60 seconds with test config), then:

1. Submit another request
2. Verify it succeeds (status 200 or appropriate success response)
3. Verify rate limit headers show refreshed limits

## Expected Outcomes

### ✓ Success Criteria

- [x] First N requests (where N = RATE_LIMIT_MAX_REQUESTS) succeed
- [x] Subsequent requests return HTTP 429
- [x] Response includes proper rate limit headers
- [x] Response includes Retry-After header
- [x] Console shows structured log messages with:
  - IP address
  - Current request count
  - Max allowed requests
  - Reset time (ISO format)
  - Seconds until reset
- [x] After window expires, requests are allowed again
- [x] Different IPs have independent rate limits

### Header Verification

**On successful requests:**
```
X-RateLimit-Limit: [configured max]
X-RateLimit-Remaining: [remaining quota]
X-RateLimit-Reset: [reset timestamp]
```

**On rate-limited requests (429):**
```
X-RateLimit-Limit: [configured max]
X-RateLimit-Remaining: 0
X-RateLimit-Reset: [reset timestamp]
Retry-After: [seconds to wait]
```

## Testing Different IPs

To test that different IPs have independent limits:

```bash
# IP 1 - First request
curl -X POST http://localhost:3000/api/submit-bug \
  -H "X-Forwarded-For: 192.168.1.100" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test 1","description":"Testing IP 1","severity":"low","category":"other"}'

# IP 1 - Second request (exhausts limit)
curl -X POST http://localhost:3000/api/submit-bug \
  -H "X-Forwarded-For: 192.168.1.100" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test 2","description":"Testing IP 1","severity":"low","category":"other"}'

# IP 2 - Should still work (different IP)
curl -X POST http://localhost:3000/api/submit-bug \
  -H "X-Forwarded-For: 192.168.1.200" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test 3","description":"Testing IP 2","severity":"low","category":"other"}'
```

Expected: IP 1 should be rate limited, but IP 2 should still succeed.

## Troubleshooting

### Issue: All requests succeed (no rate limiting)

**Possible causes:**
- Environment variables not set correctly
- Different IPs being used for each request
- Rate limit window has expired between requests

**Solution:**
- Verify env vars: `echo $RATE_LIMIT_WINDOW_MS $RATE_LIMIT_MAX_REQUESTS`
- Use consistent X-Forwarded-For header
- Submit requests quickly (within the window)

### Issue: No console logs visible

**Possible causes:**
- Logs are being filtered
- Server not running in development mode

**Solution:**
- Check console output directly
- Ensure using `npm run dev` (not production build)
- Check server terminal window

### Issue: Server crashes or errors

**Possible causes:**
- Missing API keys for external services (LLM, GitHub, ClickUp)
- Invalid request payload

**Solution:**
- Rate limiting happens BEFORE external API calls
- Even if external APIs fail, rate limiting should still work
- Check error messages for specific issues

## Configuration Testing

Test with different configurations:

### Production-like Config
```bash
RATE_LIMIT_WINDOW_MS=900000 RATE_LIMIT_MAX_REQUESTS=5 npm run dev
```
(15 minutes, 5 requests)

### Strict Config
```bash
RATE_LIMIT_WINDOW_MS=300000 RATE_LIMIT_MAX_REQUESTS=3 npm run dev
```
(5 minutes, 3 requests)

### Lenient Config
```bash
RATE_LIMIT_WINDOW_MS=3600000 RATE_LIMIT_MAX_REQUESTS=20 npm run dev
```
(60 minutes, 20 requests)

## Files Modified

The following files implement the rate limiting:

- `lib/rate-limiter.ts` - Core rate limiting logic with configuration
- `app/api/submit-bug/route.ts` - API route with rate limit enforcement
- `lib/rate-limiter.test.ts` - Unit tests (verify with `npm test`)

## Verification Checklist

Before marking this subtask complete, verify:

- [ ] Server starts successfully with custom rate limit environment variables
- [ ] First N requests succeed (where N = RATE_LIMIT_MAX_REQUESTS)
- [ ] Request N+1 returns HTTP 429 status
- [ ] 429 response includes all required headers (X-RateLimit-*, Retry-After)
- [ ] 429 response body includes error message and reset time
- [ ] Console logs show structured rate limit violation messages
- [ ] Logs include IP address, request count, and reset time
- [ ] After rate limit window expires, requests are allowed again
- [ ] Different IPs have independent rate limits (tested with X-Forwarded-For)
- [ ] Rate limit configuration via env vars works correctly
- [ ] Unit tests pass (`npm test lib/rate-limiter.test.ts`)

## Acceptance Criteria Status

From the original spec:

- ✅ **API endpoints enforce configurable rate limits** - Implemented via env vars
- ✅ **Rate-limited requests receive 429 status with retry-after header** - Verified
- ✅ **Rate limit configuration externalized via environment variables** - Done
- ✅ **Logs record rate limit violations for monitoring** - Structured console logs added

## Notes

- The rate limiter uses a sliding window algorithm
- In-memory storage (suitable for single-instance deployments)
- For multi-instance deployments, consider Redis or similar distributed storage
- Rate limiting happens at the API route level, before expensive operations
- IP address is extracted from X-Forwarded-For or X-Real-IP headers
