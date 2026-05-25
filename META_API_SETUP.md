# Meta / Instagram Graph API setup

The Supercar Content Engine uses the **official Meta Graph API** (no scraping)
for reading your Instagram Business Account's historical posts and insights,
and optionally publishing approved content.

This guide walks through the one-time setup. Total time: ~15 minutes.

---

## Prerequisites

You need:

1. An **Instagram Business** (or Creator) account.
2. A **Facebook Page** that the IG account is linked to. (IG settings →
   Account → Linked Accounts → Facebook.)
3. A **Meta Business Suite** account that controls the Page.
4. Admin access to the above.

---

## 1. Create a Meta app

1. Go to <https://developers.facebook.com/apps>.
2. Click **Create App** → choose the **Business** app type.
3. Name it `Supercar Content Engine` (or anything you like).
4. Once created, copy the **App ID** and **App Secret** from
   **App Settings → Basic** and put them in `.env.local`:

   ```env
   META_APP_ID=...
   META_APP_SECRET=...
   ```

---

## 2. Add the required products

In the app dashboard, add:

- **Facebook Login for Business**
- **Instagram Graph API**

For Facebook Login → Settings → set the **Valid OAuth Redirect URI** to:

```
http://localhost:3000/api/instagram/callback
```

(For production, add the deployed URL too.)

Set the matching value in `.env.local`:

```env
META_REDIRECT_URI=http://localhost:3000/api/instagram/callback
```

---

## 3. Request scopes

The engine needs these permissions:

| Scope                       | Why                                              |
| --------------------------- | ------------------------------------------------ |
| `instagram_basic`           | Read profile + media list                        |
| `instagram_manage_insights` | Read post-level insights (reach, saves, shares)  |
| `pages_show_list`           | Discover the linked FB Page                      |
| `pages_read_engagement`     | Read engagement metadata                         |
| `business_management`       | Operate in the context of your Business account  |

If you also want to publish via the engine, add:

| Scope                              | Why                                                       |
| ---------------------------------- | --------------------------------------------------------- |
| `instagram_content_publish`        | Publish images / Reels through the API                    |

You'll need to submit the app for **App Review** to use any of these in
production. In dev you can use yourself as a test user under
**Roles → Test Users** without review.

---

## 4. Get a long-lived access token

You have two options:

### Option A — Use the Settings page (recommended)

1. In `.env.local` set `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`.
2. Start the app (`npm run dev`) and visit `/settings`.
3. Click **Connect Instagram Business Account**.
4. Approve the requested scopes.
5. The callback exchanges your short-lived code for a **60-day long-lived
   user token** and redirects you back to `/settings` with a token preview.
6. Copy the full token from the server logs and store it as
   `INSTAGRAM_ACCESS_TOKEN`.

### Option B — Use the Graph API Explorer

1. <https://developers.facebook.com/tools/explorer/>
2. Select your app, generate a user token with the scopes above.
3. Exchange it for a long-lived token:

   ```bash
   curl -G "https://graph.facebook.com/v21.0/oauth/access_token" \
     --data-urlencode "grant_type=fb_exchange_token" \
     --data-urlencode "client_id=YOUR_APP_ID" \
     --data-urlencode "client_secret=YOUR_APP_SECRET" \
     --data-urlencode "fb_exchange_token=SHORT_LIVED_TOKEN"
   ```

4. Store the result as `INSTAGRAM_ACCESS_TOKEN`.

---

## 5. Find your IG Business Account ID

```bash
# List the FB pages this token can manage
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=$INSTAGRAM_ACCESS_TOKEN"

# Pick the relevant page ID, then:
curl "https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

Save the IDs:

```env
FACEBOOK_PAGE_ID=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
```

---

## 6. Verify

```bash
curl "https://graph.facebook.com/v21.0/$INSTAGRAM_BUSINESS_ACCOUNT_ID/media?fields=id,caption,media_type,timestamp,like_count,comments_count&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

You should see a JSON list of your recent posts. From the dashboard, click
**Sync IG** in the top bar.

---

## Token rotation

Long-lived tokens last 60 days. Two mitigations:

- The engine refreshes the token automatically on the next sync if you
  re-run the OAuth flow from `/settings`.
- For unattended deployments, schedule a cron job to call the
  `/oauth/access_token` refresh endpoint before expiry.

---

## Rate limits & safety

- The Instagram Graph API enforces a **200 calls/hour per user** ceiling on
  most endpoints. The engine batches reads conservatively.
- Auto-post is disabled by default and gated behind a settings flag — even
  with `instagram_content_publish` available, nothing publishes until you
  approve it.
- Every imported piece of content tracks attribution (`originalAuthor`,
  `authorUrl`) and a rights status (`unknown` / `requested` / `granted` /
  `denied`) so you can keep your account compliant.

---

## Troubleshooting

| Error                                                              | Fix                                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `(#10) Application does not have permission for this action`       | App needs review for the listed scope, or you're not added as a Test User.                          |
| `Tried accessing nonexistent field`                                | Some insight metrics differ for images vs. Reels — the engine already handles this.                 |
| `Error validating access token: Session has expired`               | Token aged out (60 days). Re-run the OAuth flow from `/settings`.                                   |
| `IG Business Account ID is not configured`                         | Set `INSTAGRAM_BUSINESS_ACCOUNT_ID` in `.env.local`.                                                 |
| `Sync IG` returns `usingMock: true` despite credentials being set  | Unset `USE_MOCK_DATA` or set it to `false`.                                                         |
