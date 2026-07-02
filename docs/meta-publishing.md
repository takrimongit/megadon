# Meta (Facebook + Instagram) organic publishing

Publish an **approved** ad's creative + caption straight to a workspace's
Facebook Page and linked Instagram Business account via the Meta Graph API.
This is **organic** publishing (a normal Page post / IG media), not paid ads.

## Flow

```
approve ad → POST /v1/ads/:adId/publish { targets: [...] }
          → ad.publish.status = 'publishing'  (202)
          → Cloud Task → /internal/jobs/publish-ad
          → Graph API call per target (real in prod, fake in emulator)
          → ad.publish.status = published | partial | failed
```

- **Facebook**: image → `POST /{pageId}/photos`, video → `POST /{pageId}/videos`.
- **Instagram**: two-step container publish — `POST /{igId}/media` (image or
  `REELS` video) → poll container `status_code` until `FINISHED` →
  `POST /{igId}/media_publish`.
- Meta fetches the creative from a URL, so the worker hands it a **1-hour signed
  GCS read URL** for `ad.assetPath`.

Results are written back to `ad.publish.targets[]` with the remote post id and
permalink. The mobile/web client subscribes to the ad doc to watch progress.

## One-time Meta setup (per client / workspace)

You (the account owner) must provide these — the app can't create them for you:

1. **Meta developer app** — create at <https://developers.facebook.com>. Note the
   App ID + App Secret.
2. **Instagram must be Business or Creator** and **linked to the Facebook Page**
   (Page → Settings → Linked accounts). Personal IG accounts can't publish via API.
3. **Long-lived Page access token** with these permissions:
   - `pages_manage_posts`, `pages_read_engagement` (Facebook Page posting)
   - `instagram_basic`, `instagram_content_publish` (Instagram publishing)
   - `business_management` (if the Page is owned by a Business)
   Generate a User token in Graph API Explorer, exchange it for a long-lived
   token, then fetch the **Page** token from `GET /me/accounts`. Page tokens
   derived from a long-lived user token do not expire.
4. **App Review** — to publish for accounts you don't own, Meta requires App
   Review + Advanced Access for `pages_manage_posts` and
   `instagram_content_publish`, and the app must be in **Live** mode. During
   development, add testers under app Roles to use it without review.
5. Grab the **Page ID** and the **Instagram Business account id**
   (`GET /{pageId}?fields=instagram_business_account`).

## Connect a workspace

```http
PUT /v1/settings/meta
{
  "facebookPageId": "1234567890",
  "pageName": "My Page",
  "instagramUserId": "9876543210",
  "pageAccessToken": "EAAG...long-lived-page-token"
}
```

The token is stored in **Secret Manager** as `meta-page-token-{workspaceId}` —
never in Firestore and never returned by the API. `GET /v1/settings/meta` only
reports `tokenSet: true|false`.

## Publish

```http
POST /v1/ads/:adId/publish
{ "targets": ["facebook", "instagram"] }
```

Only **approved** ads with a generated asset can be published.

## Environment / deployment

- `META_GRAPH_VERSION` (default `v21.0`) — Graph API version.
- The **API** Cloud Run service account needs `roles/secretmanager.secretVersionAdder`
  + `roles/secretmanager.admin` (to create/rotate per-workspace token secrets on
  `PUT /settings/meta`).
- The **worker** service account needs `roles/secretmanager.secretAccessor` to
  read the token when publishing, plus Storage read access to sign asset URLs.

## Local dev / tests

In the emulator (`FIRESTORE_EMULATOR_HOST` set) the app uses a **fake Meta
provider** that returns synthetic post ids and never touches the network or
Secret Manager. Real Graph API calls only happen in staging/production.
