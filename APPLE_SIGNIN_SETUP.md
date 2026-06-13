# Sign in with Apple — setup

The code is already wired up. "Continue with Apple" appears on the login page
**only once** `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET` are set, so it's safe
to deploy before finishing the Apple side.

You need an **Apple Developer account** ($99/year).

## 1. Create the pieces in the Apple Developer portal

1. **App ID** (Identifiers → +): pick "App IDs", enable **Sign in with Apple**.
2. **Services ID** (Identifiers → + → "Services IDs"): this is your
   **`APPLE_CLIENT_ID`** (e.g. `ai.chordsheetmaker.web`). Enable "Sign in with
   Apple", click Configure:
   - **Primary App ID:** the App ID from step 1.
   - **Domains:** `chordsheetmaker.ai`
   - **Return URLs:** `https://chordsheetmaker.ai/api/auth/callback/apple`
3. **Key** (Keys → +): name it, enable **Sign in with Apple**, register, and
   **download the `.p8` file** (you only get it once). Note its **Key ID**.
4. Your **Team ID** is shown top-right of the developer portal (10 chars).

> Apple requires domain verification — it gives you an
> `apple-developer-domain-association.txt` to host. Apple does **not** allow
> `localhost` return URLs, so test on the production domain (or a tunnel).

## 2. Generate the client secret JWT

Apple's "client secret" is a signed JWT that expires in ≤6 months. Generate it:

```powershell
$env:APPLE_TEAM_ID="YOUR_TEAM_ID"
$env:APPLE_KEY_ID="YOUR_KEY_ID"
$env:APPLE_CLIENT_ID="ai.chordsheetmaker.web"
$env:APPLE_PRIVATE_KEY_PATH="C:\path\to\AuthKey_YOURKEYID.p8"
node scripts/generate-apple-secret.mjs
```

Copy the printed JWT.

## 3. Set the env vars

In **Vercel → Settings → Environment Variables** (and your local `.env.local`):

| Var | Value |
|-----|-------|
| `APPLE_CLIENT_ID` | the Services ID, e.g. `ai.chordsheetmaker.web` |
| `APPLE_CLIENT_SECRET` | the JWT from step 2 |

Redeploy. "Continue with Apple" now appears and works.

## 4. Renewal (important)

The `APPLE_CLIENT_SECRET` JWT expires in ~6 months. Re-run the script and update
`APPLE_CLIENT_SECRET` before then, or Apple sign-in will start failing. (Set a
calendar reminder, or automate it later.)
