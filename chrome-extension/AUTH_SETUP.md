# Authentication Setup Guide

The Carespace Bug Reporter extension requires users to be authenticated on `*.carespace.ai` domains before they can submit bug reports.

## ⚠️ Important: Subdomain-Specific Authentication

The extension checks if the user is authenticated **on the current subdomain specifically**, not just any carespace.ai subdomain.

**Example:**
- ✅ Logged in to `moi.carespace.ai` → Can report bugs on `moi.carespace.ai`
- ❌ Logged in to `app.carespace.ai` only → Cannot report bugs on `moi.carespace.ai`
- ❌ Logged in to `dashboard.carespace.ai` only → Cannot report bugs on `moi.carespace.ai`

**Why?** This ensures bug reports are tied to the specific subdomain/application where the user is authenticated, preventing cross-subdomain issues and maintaining proper audit trails.

## How It Works

1. **Content Script** (`content.js`) runs on carespace.ai pages
2. Makes API call to current subdomain to verify authentication
3. Checks for subdomain-specific auth indicators
4. Sends auth status to the extension
5. **Popup** (`popup.js`) checks auth before showing the form
6. If not authenticated on current subdomain, shows login prompt
7. Auth token is included in bug submission

## Recommended: API-Based Auth Check (Default)

The extension now uses **API calls to verify authentication on the current subdomain**. This is the most reliable method.

**How it works:**
1. Extension makes GET request to `/api/auth/me` (or your auth endpoint)
2. Includes cookies with `credentials: 'include'`
3. If response is OK (200), user is authenticated on this subdomain
4. If response is 401/403, user is not authenticated

**Customize the endpoint** in `content.js` line ~20:
```javascript
const response = await fetch('/api/auth/me', {
  method: 'GET',
  credentials: 'include',
  headers: { 'Accept': 'application/json' }
});
```

**Common auth endpoints:**
- `/api/auth/me`
- `/api/user/profile`
- `/api/auth/verify`
- `/api/user/current`

**Your API should return:**
- `200 OK` if authenticated on this subdomain
- `401 Unauthorized` if not authenticated
- Optional: User data in JSON format

## Customizing for Your Auth System

The extension checks for common authentication patterns out of the box, but you should customize it to match your specific authentication system.

### Edit `content.js` - Line 15-120

```javascript
function checkAuthentication() {
  // CUSTOMIZE THIS SECTION based on your auth system
}
```

### Authentication Options

#### Option 1: Cookie-Based Authentication

If your app uses cookies like `auth_token`, `session_id`, etc:

```javascript
const authCookie = document.cookie.split('; ').find(row => row.startsWith('YOUR_COOKIE_NAME='));
if (authCookie) {
  const token = authCookie.split('=')[1];
  return { authenticated: true, token: token };
}
```

**Example cookie names:**
- `auth_token`
- `session_id`
- `connect.sid`
- `JSESSIONID`

#### Option 2: localStorage Authentication

If your app stores JWT or tokens in localStorage:

```javascript
const token = localStorage.getItem('YOUR_TOKEN_KEY');
if (token) {
  return { authenticated: true, token: token };
}
```

**Example localStorage keys:**
- `authToken`
- `token`
- `jwt`
- `accessToken`
- `user_token`

#### Option 3: sessionStorage Authentication

If your app uses sessionStorage:

```javascript
const token = sessionStorage.getItem('YOUR_TOKEN_KEY');
if (token) {
  return { authenticated: true, token: token };
}
```

#### Option 4: API Call to Verify Session

If you need to verify auth with an API call:

```javascript
async function checkAuthentication() {
  try {
    const response = await fetch('https://api.carespace.ai/auth/verify', {
      credentials: 'include' // Include cookies
    });

    if (response.ok) {
      const data = await response.json();
      return { authenticated: true, token: data.token };
    }
  } catch (error) {
    console.error('Auth check failed', error);
  }

  return { authenticated: false, token: null };
}
```

**Note:** If using async, you'll need to update the content script to handle promises.

### Getting User Information

The `getUserInfo()` function pre-fills the email field. Customize based on where your app stores user data:

```javascript
function getUserInfo() {
  // Option 1: From localStorage
  const userDataStr = localStorage.getItem('YOUR_USER_KEY');
  if (userDataStr) {
    const userData = JSON.parse(userDataStr);
    return {
      email: userData.email,
      name: userData.name,
      userId: userData.id
    };
  }

  // Option 2: From global variable
  if (window.currentUser) {
    return {
      email: window.currentUser.email,
      name: window.currentUser.name,
      userId: window.currentUser.id
    };
  }

  // Option 3: From DOM element
  const emailElement = document.querySelector('[data-user-email]');
  if (emailElement) {
    return {
      email: emailElement.dataset.userEmail,
      name: emailElement.dataset.userName,
      userId: emailElement.dataset.userId
    };
  }

  return null;
}
```

## Testing Authentication

### Test Authenticated State

1. Log in to your Carespace app
2. Open Chrome DevTools → Console
3. Check for your auth indicators:
   ```javascript
   // Check cookies
   console.log(document.cookie);

   // Check localStorage
   console.log(localStorage);

   // Check sessionStorage
   console.log(sessionStorage);
   ```
4. Update `content.js` to match your auth pattern
5. Reload extension
6. Click extension icon → Should show bug form ✅

### Test Unauthenticated State

1. Log out of your Carespace app (or open incognito window)
2. Navigate to a carespace.ai page
3. Click extension icon
4. Should show: "🔒 Authentication Required" ✅
5. Should have login link and retry button ✅

## Backend Validation (Optional)

The auth token is sent with bug submissions as `authToken` field. You can validate it in the backend:

### Update `app/api/submit-bug/route.ts`

```typescript
// Extract auth token from FormData
const authToken = formData.get('authToken') as string;
const userId = formData.get('userId') as string;

if (!authToken) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

// Validate token against your auth service
const isValid = await validateAuthToken(authToken);
if (!isValid) {
  return NextResponse.json(
    { error: 'Invalid authentication token' },
    { status: 401 }
  );
}

// Continue with bug submission...
```

### Example Validation Function

```typescript
async function validateAuthToken(token: string): Promise<boolean> {
  try {
    // Option 1: Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return !!decoded;

    // Option 2: Check with auth service
    const response = await fetch('https://api.carespace.ai/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;

    // Option 3: Check database session
    const session = await db.sessions.findOne({ token });
    return session && session.expiresAt > Date.now();
  } catch (error) {
    console.error('Token validation failed', error);
    return false;
  }
}
```

## Security Best Practices

1. **Never expose secrets** - Don't put API keys or secrets in content scripts
2. **Validate on backend** - Always validate auth tokens server-side
3. **Use HTTPS** - Ensure all API calls use HTTPS
4. **Token expiry** - Check token expiration dates
5. **Rate limiting** - Implement rate limiting on the backend
6. **Audit logs** - Log who submitted which bugs (using userId)

## Troubleshooting

### "Authentication Required" shows even when logged in

**Cause:** Content script can't find auth indicators

**Fix:**
1. Open DevTools on carespace.ai page
2. Check: `document.cookie`, `localStorage`, `sessionStorage`
3. Update `checkAuthentication()` in `content.js` to match your auth pattern
4. Reload extension

### Email field not pre-filled

**Cause:** Content script can't find user data

**Fix:**
1. Check where your app stores user info
2. Update `getUserInfo()` in `content.js`
3. Reload extension

### Auth token not sent with bug report

**Cause:** Token not being extracted properly

**Fix:**
1. Check `authStatus` object in popup console
2. Verify `formData.append('authToken', ...)` is called
3. Check backend receives the field

## Login Flow

```
┌─────────────────────────────────────┐
│ User clicks extension icon          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Check current tab domain            │
│ - Is it *.carespace.ai?             │
└──────────────┬──────────────────────┘
               │
               ▼ YES
┌─────────────────────────────────────┐
│ Content script checks auth          │
│ - Cookies, localStorage, etc.       │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    AUTHENTICATED   NOT AUTHENTICATED
         │           │
         ▼           ▼
    ┌────────┐  ┌──────────────────┐
    │ Show   │  │ Show login prompt│
    │ Form   │  │ with retry button│
    └────────┘  └──────────────────┘
         │
         ▼
    ┌────────────────────────────────┐
    │ Include auth token in submit   │
    └────────────────────────────────┘
```

## Example Configurations

### FusionAuth (Carespace Configuration)

**Current implementation** - The extension is pre-configured for FusionAuth:

```javascript
async function checkAuthentication() {
  const currentDomain = window.location.hostname;
  const currentUrl = window.location.origin;

  // Check for Carespace FusionAuth tokens in localStorage
  const token = localStorage.getItem('_auth_carespace_token');
  const userDataStr = localStorage.getItem('_auth_carespace_user');

  if (token && userDataStr) {
    const userData = JSON.parse(userDataStr);
    const clientDomain = userData.client?.domain;

    // Verify user is authenticated on THIS specific subdomain
    if (clientDomain === currentUrl || clientDomain === `https://${currentDomain}`) {
      return {
        authenticated: true,
        token: token,
        subdomain: currentDomain
      };
    } else {
      return {
        authenticated: false,
        token: null,
        subdomain: currentDomain,
        message: `Logged in to ${clientDomain}, not ${currentUrl}`
      };
    }
  }

  return { authenticated: false, token: null, subdomain: currentDomain };
}

function getUserInfo() {
  const userDataStr = localStorage.getItem('_auth_carespace_user');
  if (userDataStr) {
    const userData = JSON.parse(userDataStr);
    return {
      email: userData.profile?.email,
      name: userData.profile?.fullName,
      userId: userData.id
    };
  }
  return null;
}
```

**FusionAuth localStorage keys:**
- `_auth_carespace_token` - JWT access token
- `_auth_carespace_refresh_token` - Refresh token
- `_auth_carespace_user` - User object with profile and client info
- `_auth_carespace_credentials` - JWT payload
- `_auth_carespace_type` - Token type (Bearer)

**Subdomain verification:**
The user object contains `client.domain` which must match the current domain. This ensures users are authenticated on the specific subdomain they're visiting.

### Next.js + NextAuth

```javascript
function checkAuthentication() {
  const sessionToken = document.cookie.split('; ')
    .find(row => row.startsWith('next-auth.session-token='));

  if (sessionToken) {
    return { authenticated: true, token: sessionToken.split('=')[1] };
  }

  return { authenticated: false, token: null };
}
```

### Firebase Auth

```javascript
function checkAuthentication() {
  const firebaseToken = localStorage.getItem('firebase:authUser');

  if (firebaseToken) {
    const user = JSON.parse(firebaseToken);
    return { authenticated: true, token: user.stsTokenManager.accessToken };
  }

  return { authenticated: false, token: null };
}
```

### Auth0

```javascript
function checkAuthentication() {
  const auth0Token = localStorage.getItem('@@auth0spajs@@::YOUR_CLIENT_ID::YOUR_AUDIENCE::openid profile email');

  if (auth0Token) {
    const tokenData = JSON.parse(auth0Token);
    return { authenticated: true, token: tokenData.body.access_token };
  }

  return { authenticated: false, token: null };
}
```

## Incognito Mode / Private Browsing

The extension works in incognito mode, but requires manual enablement:

### Enable in Chrome

1. Go to `chrome://extensions/`
2. Find "Carespace Bug Reporter"
3. Click "Details"
4. Enable "Allow in incognito"

### How Auth Works in Incognito

- Incognito mode has **separate cookies and storage** from normal browsing
- Users must log in to Carespace **in the incognito window**
- Auth checks work the same way (API call to verify session)
- Once logged in (in incognito), bug reporting works normally

### Manifest Configuration

```json
"incognito": "split"
```

This means the extension runs in "split" mode where incognito and normal sessions are completely separate, which is secure and expected behavior.

## Subdomain-Specific Authentication

Remember: Authentication is checked **per subdomain**.

| Logged in to | Can report bugs on | Reason |
|--------------|-------------------|---------|
| `app.carespace.ai` | `app.carespace.ai` ✅ | Same subdomain |
| `app.carespace.ai` | `moi.carespace.ai` ❌ | Different subdomain |
| `moi.carespace.ai` | `moi.carespace.ai` ✅ | Same subdomain |

This prevents confusion and ensures proper audit trails tied to specific applications.

## Need Help?

If you're having trouble configuring authentication:

1. Check browser DevTools console for error messages
2. Inspect `document.cookie` and `localStorage` on your app
3. Update `content.js` to match your auth pattern
4. Test with console.log to verify auth detection
5. Rebuild extension: `./build.sh`
6. Test on the actual subdomain where users will be authenticated
