# Tracking Query Remover

A Manifest V3 Chrome and Firefox extension that removes tracking parameters from URLs, making links cleaner and easier to share.

![image-not-found](readme.jpg)

The extension removes common campaign, click, email, and affiliate identifiers, including:

* Google, Microsoft, Meta, TikTok, LinkedIn, Pinterest, Reddit, Snapchat, X, and Yandex click IDs
* `utm_*`, `mtm_*`, `hsa_*`, and other campaign-attribution families
* HubSpot, Klaviyo, Mailchimp, Marketo, Matomo, Salesforce Marketing Cloud, and Vero identifiers
* Domain-specific share parameters from YouTube, Spotify, Instagram, Reddit, Facebook, and X
* Domain-specific affiliate parameters from Amazon and eBay

Generic parameter names are removed only on domains where their meaning is known. Functional parameters for videos, searches, authentication, and application state are preserved. Email identifiers are also preserved on unsubscribe, subscription-management, preference, and browser-view pages.

The extension cleans the address bar after the initial page request. It does not block the website from receiving parameters included in that first request. It does not collect, transmit, or store browsing data.

## Install

You can install the extension/add-on for the following browsers:

* [Google Chrome](https://chrome.google.com/webstore/detail/tracking-query-remover/cdhgohknmmkonojeajegbnkbmfkkhobb)
* [Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/tracking-query-remover/)

## Tests

Run the automated test suite with Node.js:

```shell
node --test test/content.test.js
```

Or test it manually by visiting `https://blog.marroquin.dev/tests/?fbclid=FBFBFB&couponCode=COCOCO&gclid=GCGCGC`. The tracking parameters should disappear while `couponCode` remains.

In order to test this extension:

For Chrome at `chrome://extensions`, enable **Developer mode** and click **Load unpacked**.

For Firefox at `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**.

## Links

Some links that may help you if you are also new to building extensions

* [Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest)
* [Migrate to Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate)

## Icon

The icon was created with **GIMP** on a 16x16 pixel canvas using a size 1 pencil. You can edit it by opening [icon.xcf](icon.xcf).

## Package extension

Create a ZIP containing `manifest.json`, `content.js`, and the PNG icons, then upload it from the **Package** tab in the Chrome Web Store Developer Dashboard.

Each Chrome Web Store update must use a version number higher than the currently published version.

As a reminder for me, I saved my key at **G2** on `KEYS` folder
