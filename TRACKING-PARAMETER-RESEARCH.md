# Tracking-parameter research and design record

Last reviewed: 2026-09-01

## Purpose

This document records the research behind Tracking Query Remover's aggressive cleanup rules and the design decisions used to avoid breaking legitimate links. It is intended to stop future maintainers and coding agents from rediscovering the same information or replacing reviewed rules with a flat, unsafe blocklist.

The executable source of truth is `content.js`. This document explains why the code is structured that way and how to evaluate future additions.

## Product boundary

Tracking Query Remover is a link cleaner, not a network blocker. A Manifest V3 content script runs after navigation has started, so the destination can receive the original query string in the initial HTTP request. The extension then uses `history.replaceState` to clean the address bar without reloading the page.

This boundary is intentional for the current release because it:

- keeps the extension free of broad request-interception permissions;
- avoids redirects or duplicate navigations;
- preserves the existing user-facing behavior;
- supports a simple Chrome Web Store privacy disclosure: no collection, sale, or transmission of browsing data. From 1.2.0 the extension stores one thing locally, the list of sites the user switched it off on; see the permission assessment below.

If pre-request removal is added later, treat it as a separate feature. Evaluate Manifest V3 `declarativeNetRequest`, required host permissions, redirect loops, signed URLs, first-navigation coverage, and updated store/privacy disclosures before implementation.

## Rule model and rationale

### 1. Global exact names

Use a global exact rule when the complete parameter name is strongly associated with advertising, analytics, email attribution, or an affiliate click identifier. Examples include `gclid`, `fbclid`, `msclkid`, `ttclid`, `li_fat_id`, `mkt_tok`, and `irclickid`.

Exact matching limits collisions with application parameters. Matching is case-insensitive because providers and copied links do not always preserve canonical casing; for example, Snapchat commonly appears as `ScCid` and is normalized to `sccid` for comparison.

### 2. Global prefixes

Prefixes are used only for established tracking namespaces:

- `utm_`: Google Analytics campaign tags and ecosystem extensions;
- `mtm_`: Matomo campaign tags;
- `hsa_`: HubSpot advertising attribution;
- `sfmc_`: Salesforce Marketing Cloud attribution;
- `oly_`: Olytics/email attribution;
- `vero_`: Vero email attribution.

Using a reviewed prefix covers documented fields and future additions without maintaining every suffix. Do not generalize this to short prefixes such as `ga`, `mc`, `af`, or `sc`; those have a much higher collision risk.

### 3. Domain-scoped names

Some names are tracking only in a specific product. They must not become global rules:

- YouTube: `si`, `feature`, `pp`, `kw`, and embed-referrer metadata. Keep `v`, `t`, `list`, `index`, and `start` because they select content or playback state.
- Spotify: `si`, `dlsi`, and `nd`.
- Instagram: `igsh` and `igshid`.
- Reddit: `share_id`, `correlation_id`, `ref_campaign`, `ref_source`, and `rdt`.
- X/Twitter: `s`, `t`, `src`, `ref_src`, `ref_url`, `cn`, `cxt`, and `mx`.
- Facebook/Messenger: sharing, notification, referral, and context metadata while retaining identifiers such as `story_fbid` and `id` that select the content.
- LinkedIn: `trk`, `trackingId`, `refId`, `lipi`, `ebp`, and `originalSubdomain`. Keep `eid`, `midToken`, and `midSig`: they carry attribution, but they also resolve the destination of LinkedIn email links, which arrive on `/comm/` routes that no email exception can detect.
- Pinterest: `pp` and `source_url`.
- Amazon and eBay: affiliate and listing-position attribution. Functional selection fields such as Amazon's `th` and `psc` remain intact, and so does eBay's `var`, which selects the variation of a multi-variation listing.
- Google Search and Bing: search-session and UI-attribution metadata. Search terms, result modes, filters, languages, and pagination remain intact.

Domain checks use exact hostname-or-subdomain matching against reviewed domains. Do not use permissive expressions such as `amazon.*` or `google.*`; they can match attacker-controlled hosts such as `amazon.evil.example`.

Hostname-or-subdomain matching is necessary but not sufficient. A registered domain can host unrelated products whose parameters collide with the storefront or search names, so every rule built on generic names also carries a `subdomains` allowlist:

| Rule | Allowed subdomains | Collision avoided |
| --- | --- | --- |
| Amazon | `www`, `smile`, `m` | `tag`, `ref`, `qid`, `sr`, `crid` on `aws.amazon.com`, `sellercentral.amazon.com`, `read.amazon.com` |
| eBay | `www`, `m` | partner names on sign-in and seller hosts |
| Google | `www`, `books`, `images`, `maps`, `news`, `scholar`, `shopping`, `video` | `client`, `sa`, `ei`, `oq`, `sourceid` on `docs.`, `drive.`, `accounts.`, `mail.`, `meet.`, `translate.` |
| Bing | `www`, `cn` | search-session names on `edgeservices.bing.com` |

Rules whose names are unambiguous within their own brand (YouTube, Spotify, Instagram, Reddit, X, Facebook, LinkedIn, Pinterest) stay unscoped, so mobile and regional hosts such as `m.facebook.com` and `music.youtube.com` keep being cleaned.

Link shorteners that only issue a redirect (`amzn.to`, `youtu.be`, `pin.it`, `fb.com`, `redd.it`) were dropped from the rules. No document loads on them, so the content script never runs; the redirect destination is cleaned instead.

### 4. Functional exceptions

Email tokens can identify a recipient, but they can also be required to unsubscribe or open a preference center. The extension therefore preserves the following on unsubscribe, subscription-management, preference, and “view in browser” routes:

`mkt_tok`, `_kx`, `mc_cid`, `mc_eid`, `mc_tc`, `_hsenc`, `hsenc`, `_hsmi`, `hsCtaTracking`, `ck_subscriber_id`, `ml_subscriber`, and `ml_subscriber_hash`.

Unrelated campaign parameters such as `utm_source` or `fbclid` are still removed from those routes.

Route detection matches compound names only: `unsubscribe`, `opt-out`, `email-preferences`, `manage-subscriptions`, `subscription-center`, `notification-preferences`, `view-in-browser`, `web-version`, and their `_`/`-` variants, in the path or in an `action`, `display`, `mode`, `page`, or `view` value. Bare `preferences` and `subscriptions` were removed from the pattern in 1.2.0: they matched ordinary application routes such as `youtube.com/feed/subscriptions` and `/settings/preferences`, keeping `mkt_tok` and `mc_eid` alive far outside any email flow.

The heuristic is deliberately incomplete. Many providers use opaque routes such as `/e/`, `/c/`, or `/u/` that cannot be told apart from ordinary pages, so an email token on one of those is still removed. Widening the pattern to reach them costs more false positives than it prevents breakage.

The extension deliberately does not remove generic authentication, routing, or application-state names globally. Important examples are:

`code`, `state`, `token`, `session`, `key`, `id`, `q`, `redirect`, `return_url`, `deep_link_value`, `deep_link_sub*`, `af_dp`, `af_web_dp`, `adj_deep_link`, `adj_fallback`, and `adj_redirect`.

### 5. Raw query preservation

`URL` is used to parse the scheme, host, path, and fragment, but retained query components are filtered from the original serialized query. This is more careful than deleting through `URLSearchParams` and serializing everything again.

The distinction matters for signed URLs and opaque values: normalizing `%20` to `+`, changing percent-escape casing, or otherwise re-encoding a retained value can invalidate a signature. The implementation therefore:

- decodes parameter names only for matching;
- preserves the original bytes of every retained name/value pair;
- removes every occurrence of a matching parameter, including duplicates;
- preserves order, empty values, functional flags, and `#fragments`;
- removes a trailing empty query marker when no query parameters remain.

### 6. Single-page applications

The initial cleanup is not sufficient for YouTube, Instagram, X, and other SPAs because they can change the URL with the History API without reloading. The implementation listens for Navigation API success events plus `popstate` and `hashchange`. Chrome therefore never runs a timer, because `navigatesuccess` also fires for `history.pushState` and `history.replaceState`.

Browsers without the Navigation API, which today means Firefox, fall back to a visibility-gated 500 ms comparison of `location.href`. This replaced the earlier DOM-mutation fallback; the reversal and its cost are recorded under "Deliberately rejected approaches".

`history.replaceState` is wrapped in `try`/`catch`, and so is the whole start-up path. A top-level document served with `Content-Security-Policy: sandbox` has an opaque origin and rejects history updates with a `SecurityError`; the page is now left alone instead of the content script throwing.

Cleaning stays off until the stored disabled-site list has been read, so a site the user switched off never has its address bar rewritten on the way in.

## Provider research and implemented treatment

The following table summarizes the main evidence. Official documentation is preferred. Brave and ClearURLs are used to corroborate domain-specific and long-tail rules that vendors do not consistently document.

| Provider/family | Relevant parameters | Treatment and reason | Source |
| --- | --- | --- | --- |
| Google Analytics campaigns | `utm_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_source_platform`, `utm_term`, `utm_content`, `utm_creative_format`, `utm_marketing_tactic` | Remove global `utm_*`; these describe campaign attribution rather than destination behavior. | [Google Analytics URL builder](https://support.google.com/analytics/answer/10917952?hl=en) |
| Google Ads and Campaign Manager | `gclid`, `dclid`, `gclsrc`, `gbraid`, `wbraid` | Remove globally as click/attribution identifiers. | [GCLID](https://support.google.com/google-ads/answer/1752125?hl=en), [DCLID](https://support.google.com/campaignmanager/answer/9182069), [GBRAID/WBRAID](https://support.google.com/google-ads/answer/16542291?hl=en) |
| Google Merchant Center | `srsltid` | Remove globally; it is added to product links for result attribution. | [Merchant Center auto-tagging](https://support.google.com/merchants/answer/15191080?hl=en) |
| Google aggregate campaign metadata | `gad_source`, `gad_campaignid` | Remove globally for aggressive link cleanup. Google describes these as aggregate rather than unique user/click identifiers, so the privacy benefit is smaller than removing GCLID. | [Google Ads](https://support.google.com/google-ads/answer/16193746?hl=en) |
| Microsoft Advertising | `msclkid` | Remove globally; Microsoft describes it as a unique ad-click identifier. | [Microsoft Advertising account settings](https://learn.microsoft.com/en-us/advertising/bulk-service/account?view=bingads-13) |
| TikTok Ads | `ttclid` | Remove globally as the TikTok click identifier added to landing pages. | [TikTok Click ID](https://ads.tiktok.com/help/article/tiktok-click-id) |
| Yandex | `yclid`, `ysclid` | Remove globally as advertising/search attribution identifiers. | [YCLID](https://www.yandex.com/support/metrica/en/data/yclid), [YSCLID](https://www.yandex.com/support/metrica/en/general/search-query-sup) |
| LinkedIn Ads | `li_fat_id` | Remove globally as LinkedIn's first-party click identifier. Other shorter LinkedIn names are domain-scoped. | [LinkedIn first-party cookies](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/enabling-first-party-cookies?view=li-lms-2025-09) |
| Pinterest | `_epik`, `pp` | Remove `_epik` globally; scope generic `pp` to Pinterest and YouTube. | [Pinterest tag parameters](https://help.pinterest.com/en/business/article/pinterest-tag-parameters-and-cookies), [Pinterest `pp`](https://help.pinterest.com/en/business/article/the-pp-query-string-parameter) |
| Klaviyo | `_kx` | Remove outside protected email-management routes; Klaviyo uses it to identify email/SMS link recipients. | [Klaviyo click tracking](https://help.klaviyo.com/hc/en-us/articles/115005076767) |
| HubSpot | `hsa_*`, `_hsenc`/`hsenc`, `_hsmi`, `hsCtaTracking`, `__hs*` | Remove campaign/click attribution globally, with email-management exceptions for potentially functional tokens. | [HubSpot email links](https://knowledge.hubspot.com/marketing-email/links-in-emails-or-ctas-lead-to-an-error-page), [HubSpot ad tracking](https://knowledge.hubspot.com/ads/track-facebook-ads-in-hubspot) |
| Marketo | `mkt_tok` | Remove on ordinary landing pages; preserve on unsubscribe and email-webview routes because it can associate a visit with a lead and can be functional in email flows. | [Adobe Marketo lead tracking](https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/javascriptapi/leadtracking/lead-tracking), [Brave conditional-removal rationale](https://github.com/brave/brave-browser/wiki/Query-String-Filter) |
| Matomo | `mtm_*`, `pk_*`, `piwik_*`, `matomo_*` campaign aliases | Remove the official `mtm_*` family and reviewed legacy campaign names. Do not remove every `pk_*` name globally. | [Matomo campaign URLs](https://matomo.org/faq/reports/advanced-how-to-manually-build-campaign-tracking-urls/), [legacy aliases](https://matomo.org/faq/how-to/faq_120/) |
| AppsFlyer | selected `af_*` attribution fields | Remove campaign, ad, cost, site, lookback, and `af_sub1-5` fields. Preserve `deep_link_value`, `deep_link_sub*`, destinations, and redirect parameters because they control routing. | [AppsFlyer OneLink Smart Script](https://dev.appsflyer.com/hc/docs/dl_smart_script_v2), [user-invite deep linking](https://dev.appsflyer.com/hc/docs/dl_android_user_invite) |
| Adjust | selected `adj_*` attribution fields | Remove tracker/campaign/ad group/creative/label/network fields. Preserve `adj_deep_link`, fallback, and redirect destinations. | [Adjust deep-link generator](https://dev.adjust.com/en/api/deep-link-generator-api) |
| Branch | `~campaign`, `~channel`, `~feature`, `~stage`, `~tags` | Remove reserved attribution metadata while preserving `$` routing keys and custom deep-link data. | [Branch deep-link reference](https://help.branch.io/marketer-hub/docs/deep-link-reference) |
| Impact | `irclickid` | Remove globally; Impact documents it as the click ID appended to landing pages. | [Impact tracking/ITP guidance](https://help.impact.com/brand/es/platform-features/tracking/set-up-tracking/determine-your-programs-itp-compliance) |
| Adobe Analytics | `s_cid`; sometimes configurable `cid` | Remove `s_cid`. Never remove generic `cid` globally because Adobe allows organizations to choose their own campaign parameter and other applications use `cid` functionally. | [Adobe campaign variable](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/campaign) |
| Long-tail tracking and domain rules | Mailchimp, Vero, Olytics, Reddit, Snapchat, Taboola, Outbrain, affiliate networks, social share metadata | Use reviewed exact or domain-scoped rules. These are corroborated against maintained browser privacy lists rather than treated as safe merely because their names look suspicious. | [ClearURLs rules](https://github.com/ClearURLs/Rules/blob/master/data.min.json), [Brave clean URLs](https://github.com/brave/adblock-lists/blob/master/brave-lists/clean-urls.json) |

## Deliberately rejected approaches

### Flat global blocklist

Rejected because names such as `t`, `s`, `ref`, `source`, `campaign`, `cid`, `id`, `tag`, `feature`, and `pp` have legitimate meanings on unrelated sites. These names require host-scoped evidence or must remain untouched.

### Regex over the full URL

Rejected because it can remove text from values or paths, mishandle encoded names, corrupt delimiters, miss duplicates, and discard fragments. Parameter-level parsing and raw-segment filtering are easier to reason about and test.

### Removing every provider prefix

Rejected when a provider mixes attribution and navigation in the same namespace. AppsFlyer and Adjust are the main examples: deep-link and fallback fields are functional, so only reviewed attribution names are removed.

### Continuous location polling — reversed on 2026-09-01

Originally rejected because it would run a timer on every matching page for the full lifetime of the tab. The DOM-mutation fallback that replaced it turned out to have two defects. A `MutationObserver` bound to `documentElement` with `subtree: true` runs its callback on *every* DOM mutation of every page in the fallback browser, which is not obviously cheaper than a timer on a busy page. More importantly it detects nothing at all when an SPA calls `history.pushState()` without touching the DOM, which is a correctness bug rather than a cost.

The current fallback is a 500 ms interval that returns immediately when `document.visibilityState === 'hidden'`, so background tabs do no work, and Chrome never reaches this path at all. The original objection still stands on its own terms — this is a timer, and it is permanent for the lifetime of the tab — so the change is recorded here as a deliberate trade of a bounded, constant cost for correctness, not as a finding that the old reasoning was wrong.

`AGENTS.md` still instructs agents that "SPA URL changes must continue to be cleaned without continuous polling". That instruction and the shipped code now disagree. The project owner has to settle it in one direction: either restore a mutation-based fallback and accept the missed `pushState` case, or update the instruction.

### Pre-request blocking in this release

Rejected because it changes the permission model, behavior, store disclosures, and risk profile. The current description accurately promises cleaner shareable links, not anonymous browsing or request blocking.

## Audit findings, 2026-09-01

A full review of the 1.2.0 release candidate found six defects that removed functional parameters or could break a page, plus one product gap. All are fixed in the current tree, and each has a regression test.

| Finding | Effect | Resolution |
| --- | --- | --- |
| eBay `var` treated as partner attribution | A shared link to one size or colour of a multi-variation listing opened the default variation instead | Dropped from the eBay rule |
| Amazon rule matched every `*.amazon.com` host | `tag`, `ref`, `qid`, `sr`, and `crid` were stripped on `aws.amazon.com`, `sellercentral.amazon.com`, and `read.amazon.com` | `subdomains` allowlist |
| Google rule matched every `*.google.<tld>` host | `client`, `sa`, `ei`, `oq`, and `sourceid` were stripped on `docs.`, `drive.`, `accounts.`, `mail.`, `meet.`, and `translate.` | `subdomains` allowlist |
| LinkedIn `eid`, `midToken`, `midSig` removed | Email deep links resolved to a generic page; their `/comm/` route is invisible to the email exception | Dropped from the LinkedIn rule |
| Email route pattern matched bare `preferences` and `subscriptions` | `mkt_tok` and `mc_eid` survived on ordinary application pages such as `youtube.com/feed/subscriptions` | Compound route names only |
| `history.replaceState` unguarded | A `SecurityError` on a sandboxed top-level document killed the content script | `try`/`catch` around the call and the start-up path |
| No way to switch the extension off for one site | A rule that breaks a site left uninstalling as the only remedy | Toolbar popup with a per-site toggle |

Smaller corrections made in the same pass:

- `cleanUrl` returned a normalized `url.href` for valid URLs but the raw input for invalid ones. It now always returns the input untouched when `changed` is `false`.
- `isEmailActionUrl` was recomputed once per parameter; it is now computed once per URL.
- A dead `lastSeenUrl` assignment was removed from the scheduler.
- Google gained `ru`, `com.ua`, `co.id`, `com.ph`, `gr`, `hu`, `ro`, `cz`, and `com.vn`; eBay gained `com.hk`, `com.my`, `com.sg`, and `ph`.
- The README no longer records where the extension signing key is kept.

## Permission change assessment, 2026-09-01

`AGENTS.md` requires a privacy and store-review assessment for any permission change. Version 1.2.0 makes three.

| Change | Justification | Review impact |
| --- | --- | --- |
| `<all_urls>` narrowed to `http://*/*` and `https://*/*` | Tracking parameters appear on any site, so broad access is unavoidable, but `<all_urls>` also covers `file://` and other schemes that `cleanUrl` rejects anyway | Strictly narrower than before, and aligned with the least-privilege policy |
| Added `storage` | The per-site toggle has to survive a restart | No install-time warning |
| Added `activeTab` | The popup needs the hostname of the current tab, and content-script matches do not grant `tabs` access | No install-time warning; scoped to the tab that is open when the icon is clicked |

`storage.local` is used rather than `storage.sync`. Syncing the list of sites where a privacy extension was switched off would place those hostnames in a browser sync account, and Firefox additionally requires `browser_specific_settings.gecko.id` before `storage.sync` works at all. Keeping the list on the device also keeps the privacy disclosure short.

## Chrome Web Store policy compliance

Assessed for 1.2.0 on 2026-09-01 against the current program policies. No violations found.

| Policy | Status | Basis |
| --- | --- | --- |
| Single Purpose | Pass | One narrow purpose: removing tracking parameters from the address bar |
| Remote Code | Pass | No `eval`, no external scripts, no CDN. Everything that executes ships inside the package |
| User Data Privacy | Pass | Nothing is collected or transmitted. The only stored value is the user's own disabled-site list, held locally |
| Minimum Functionality | Pass | A working utility, not a wrapper around a website |
| Affiliate Ads | Pass | The policy prohibits inserting or replacing affiliate codes. Removing them is not restricted |
| Deceptive Behavior | Pass | The listing description matches the implemented behavior |
| Use of Permissions | Pass | See the permission assessment above |

Review friction to expect. None of these is a violation, but each one is a plausible cause of a slow or bounced review:

- Broad host access triggers extended review. The Privacy practices tab needs a single-purpose statement and an explicit justification for the host permission.
- A privacy policy URL is effectively required alongside broad host access even when nothing is collected. Published at <https://query.marroquin.dev/>, served by GitHub Pages from `main` `/docs`, source in `docs/index.html`, custom domain declared in `docs/CNAME`.

The custom domain is a subdomain on purpose. A subdomain uses a `CNAME` record to `luisenmarroquin.github.io.`, so it follows GitHub's CDN addresses automatically, while an apex domain needs hardcoded `A`/`AAAA` records that break whenever those addresses change. The apex is also unavailable: `www.marroquin.dev` already resolves to `security-website-e8g.pages.dev`. DNS for `marroquin.dev` is hosted at Google Cloud DNS, not Cloudflare, but the record is still an owner action; agents must not create it.
- The listing description should state that Amazon and eBay affiliate parameters are stripped. It is accurate today but stated only in the README.
- Third-party brand names may be used descriptively. Do not put their logos in screenshots or imply endorsement.
- The uploaded version must be higher than the published one. Confirm what is actually live in each store before uploading; do not infer it from Git tags alone.

Firefox and AMO: `browser_specific_settings.gecko.id` and `strict_min_version` are still absent. The existing AMO listing already has an assigned ID, so pin that exact value rather than inventing one, or the upload is treated as a new add-on.

## Adding or changing a rule

Before modifying `content.js`, answer these questions:

1. Is the parameter documented by its provider, or corroborated by a maintained privacy list?
2. Does it identify a user/click, describe campaign attribution, or only add share/UI metadata?
3. Can the same name control content, authentication, routing, checkout, unsubscribe, video time, search, or deep linking elsewhere?
4. Should the rule be global exact, global prefix, domain-scoped, or conditional?
5. Are there paths or companion parameters that require an exception?
6. Does deletion preserve all remaining raw values and the fragment?
7. Is there a positive test and a false-positive/regression test?

When uncertain, prefer a domain-scoped exact rule. Do not remove a generic name globally based only on its appearance.

## Verification record for the aggressive 1.2.0 release candidate

The current implementation was checked with:

- Node syntax validation;
- 23 automated tests covering global rules, prefixes, encoded and duplicate values, raw signature preservation, fragments, domain matching, lookalike hosts, subdomain scoping, affiliate rules, the eBay variation, the LinkedIn email identifiers, email exceptions and their false positives, OAuth/application parameters, the `cleanUrl` return contract, disabled-host matching, and malformed URLs;
- a real Chrome 152 Manifest V3 load using the DevTools extension protocol;
- initial-navigation cleanup in Chrome;
- same-document SPA navigation cleanup in Chrome;
- ZIP integrity and exact comparison of packaged `manifest.json` and `content.js` against the working files.

The Chrome load and the two in-browser navigation checks above were performed before the 2026-09-01 audit fixes. The popup, the per-site toggle, the polling fallback, and the `replaceState` guard currently have unit coverage only. Repeat the browser load, and add a Firefox load for the polling path, before publishing.

Run the maintained suite with:

```sh
node --test test/content.test.js
```

The store ZIP intentionally excludes this research file and all test/development files. From 1.2.0 it must also contain `popup.html` and `popup.js`, which the manifest references; the file list in `AGENTS.md` predates them and needs updating.
