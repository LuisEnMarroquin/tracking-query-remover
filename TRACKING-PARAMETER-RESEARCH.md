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
- supports a simple Chrome Web Store privacy disclosure: no collection, storage, sale, or transmission of browsing data.

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
- LinkedIn: `trk`, `trackingId`, `refId`, `lipi`, email/ranking attribution fields, and related metadata.
- Pinterest: `pp` and `source_url`.
- Amazon and eBay: affiliate and listing-position attribution. Functional selection fields such as Amazon's `th` and `psc` remain intact.
- Google Search and Bing: search-session and UI-attribution metadata. Search terms, result modes, filters, languages, and pagination remain intact.

Domain checks use exact hostname-or-subdomain matching against reviewed domains. Do not use permissive expressions such as `amazon.*` or `google.*`; they can match attacker-controlled hosts such as `amazon.evil.example`.

### 4. Functional exceptions

Email tokens can identify a recipient, but they can also be required to unsubscribe or open a preference center. The extension therefore preserves the following on unsubscribe, subscription-management, preference, and “view in browser” routes:

`mkt_tok`, `_kx`, `mc_cid`, `mc_eid`, `mc_tc`, `_hsenc`, `hsenc`, `_hsmi`, `hsCtaTracking`, `ck_subscriber_id`, `ml_subscriber`, and `ml_subscriber_hash`.

Unrelated campaign parameters such as `utm_source` or `fbclid` are still removed from those routes.

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

The initial cleanup is not sufficient for YouTube, Instagram, X, and other SPAs because they can change the URL with the History API without reloading. The implementation listens for Navigation API success events plus `popstate` and `hashchange`. Browsers without the Navigation API use a DOM-mutation fallback that only performs cleanup when `location.href` changed. Continuous polling was rejected to avoid permanent timers on every page.

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

### Continuous location polling

Rejected because it would run a timer on every matching page for the full lifetime of the tab. Navigation events plus a conditional mutation fallback cover SPA changes with less ongoing work.

### Pre-request blocking in this release

Rejected because it changes the permission model, behavior, store disclosures, and risk profile. The current description accurately promises cleaner shareable links, not anonymous browsing or request blocking.

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
- 14 automated tests covering global rules, prefixes, encoded and duplicate values, raw signature preservation, fragments, domain matching, lookalike hosts, affiliate rules, email exceptions, OAuth/application parameters, and malformed URLs;
- a real Chrome 152 Manifest V3 load using the DevTools extension protocol;
- initial-navigation cleanup in Chrome;
- same-document SPA navigation cleanup in Chrome;
- ZIP integrity and exact comparison of packaged `manifest.json` and `content.js` against the working files.

Run the maintained suite with:

```sh
node --test test/content.test.js
```

The store ZIP intentionally excludes this research file and all test/development files.
